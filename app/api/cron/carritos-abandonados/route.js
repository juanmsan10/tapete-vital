// ============================================================
// GET /api/cron/carritos-abandonados — el barrendero de cada 30 min.
// Un pinger externo lo llama. Hace TRES cosas:
//
// 1. CONCILIACIÓN con Bold (red de seguridad del webhook):
//    para cada pedido "Iniciado" de las últimas 24h consulta
//    GET payments.api.bold.co/v2/payment-voucher/<orden>.
//    Si Bold dice APPROVED, marca el pedido como "Aprobado"
//    (correo interno + Purchase a Meta CAPI incluidos). Así un
//    pago jamás queda volando si el webhook de Bold falla
//    (incidente 2026-08-08: URL sin www → 2 pagos perdidos).
//
// 2. NOTIFICA a GHL los pedidos que llevan 30–45 min en
//    "Iniciado" (checkout sin pagar). La VENTANA de edad:
//    - Cada carrito cae en ella una sola vez → sin reenvíos.
//    - Los carritos viejos quedan fuera → no spamea leads.
//    La conciliación corre ANTES, así un pago con webhook
//    caído nunca recibe el mensaje de carrito abandonado.
// ============================================================
import { notificarGHL, enviarCorreo, htmlPedido, correoConfirmacionCompra } from '@/lib/email';
import { leerPedidos, actualizarPedido, telefonoE164 } from '@/lib/pedidos';
import { registrarGuias } from '@/lib/track17';
import { enviarPurchaseCAPI } from '@/lib/meta';
import { formatoCOP } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const MIN_MIN = 30; // no escribir antes de 30 min
const MAX_MIN = 60; // ancho de ventana = intervalo del cron (30 min desde sep-2026,
                    // espaciado para cuidar las horas de cómputo del plan Free de Neon)

// Parsea "24/7/2026, 11:26:32 a. m." (es-CO, America/Bogota, UTC-5 sin DST)
function edadMinutos(fecha) {
  const m = String(fecha).match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i
  );
  if (!m) return null;
  const [, d, mon, y, hh, min, s, ap] = m;
  let h = Number(hh) % 12;
  if (/p/i.test(ap)) h += 12;
  const epoch = Date.UTC(+y, +mon - 1, +d, h + 5, +min, +s); // +5h → UTC
  return (Date.now() - epoch) / 60000;
}

// Consulta el estado real de una venta en Bold (llave de identidad).
// La venta es consultable desde ~10 min hasta 24h después del intento.
async function estadoBold(orden) {
  const apiKey = process.env.BOLD_IDENTITY_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${orden}`, {
      headers: { Authorization: `x-api-key ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.payment_status || null;
  } catch (err) {
    console.error(`[cron/abandonados] Error consultando Bold ${orden}:`, err);
    return null;
  }
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pedidos = await leerPedidos();

  // 1. CONCILIACIÓN: pedidos "Iniciado" de las últimas 24h → preguntar a Bold.
  //    Desde los 10 min (antes la venta puede no estar consultable) para
  //    cubrir la ventana de GHL (30–45) sin mensajes a gente que ya pagó.
  const porConciliar = pedidos.filter((p) => {
    if (!['Iniciado', 'Rechazado'].includes(p.estado)) return false;
    const edad = edadMinutos(p.fecha);
    return edad !== null && edad >= 10 && edad < 24 * 60;
  });
  const recuperados = [];
  await Promise.all(
    porConciliar.map(async (p) => {
      const status = await estadoBold(p.orden);
      if (status !== 'APPROVED') return; // REJECTED/FAILED/etc. siguen siendo abandono genuino
      p.estado = 'Aprobado'; // excluirlo de la ventana de GHL en este mismo pase
      recuperados.push(p.orden);
      await actualizarPedido(p.orden, { estado: 'Aprobado' });
      await enviarCorreo({
        to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
        subject: `✅ Pago confirmado ${p.orden} (recuperado por conciliación)`,
        html: htmlPedido({
          titulo: 'Pago confirmado por conciliación con Bold → Preparar envío',
          orden: p.orden,
          datos: {
            Estado: 'APROBADO',
            Nota: 'El webhook de Bold no reportó este pago; la conciliación del cron lo detectó.',
            Cliente: p.nombre,
            Total: formatoCOP(p.total),
          },
          totales: formatoCOP(p.total),
        }),
      });
      await correoConfirmacionCompra({ orden: p.orden, email: p.email, total: p.total });
      await enviarPurchaseCAPI({ orderId: p.orden, total: Number(p.total), email: p.email || null });
    })
  );

  // 2. CARRITOS ABANDONADOS: ventana 30–45 min → notificar a GHL
  //    (incluye Rechazado: intentó pagar y falló, el mensaje aplica igual)
  const telNorm = (t) => String(t || '').replace(/\D/g, '').slice(-10);
  // Clientes que YA lograron pagar en algún intento: jamás escribirles por abandono
  const compradores = new Set(
    pedidos
      .filter((p) => ['Aprobado', 'Empacado', 'Enviado', 'Entregado'].includes(p.estado))
      .map((p) => telNorm(p.telefono))
      .filter(Boolean)
  );
  // Varios intentos del mismo cliente → un solo webhook (el más reciente)
  const porCliente = new Map();
  pedidos.forEach((p) => {
    if (!['Iniciado', 'Rechazado'].includes(p.estado)) return;
    const edad = edadMinutos(p.fecha);
    if (edad === null || edad < MIN_MIN || edad >= MAX_MIN) return;
    if (compradores.has(telNorm(p.telefono))) return;
    porCliente.set(telNorm(p.telefono) || p.orden, p);
  });
  const abandonados = [...porCliente.values()];

  await Promise.all(
    abandonados.map((p) =>
      notificarGHL({
        // Los Inbound Webhook de GHL no filtran por sí solos: este campo es
        // lo que deja al workflow reconocer lo suyo y descartar el resto.
        evento: 'carrito_abandonado',
        // Campos estándar que GHL usa para crear/asociar el contacto
        phone: telefonoE164(p.telefono),
        first_name: String(p.nombre || '').trim().split(/\s+/)[0] || '',
        full_name: String(p.nombre || '').trim(),
        email: p.email || '',
        // Datos del pedido para las variables del template
        orden: p.orden,
        nombre: p.nombre,
        telefono: p.telefono,
        ciudad: p.ciudad,
        productos: p.productos,
        total: p.total,
      }, process.env.GHL_WEBHOOK_URL)
    )
  );

  // 3. VIGILANCIA DE ENVÍOS: toda guía despachada tiene que estar registrada
  //    en 17track. Registrar solo en el instante de guardar la guía era un
  //    intento único sin red: el 3-sep-2026 aparecieron 8 pedidos invisibles
  //    porque cuando les pusieron la guía la llave de 17track aún no estaba
  //    en Vercel, y nadie se enteró hasta que Juan preguntó.
  //    Reintentar es gratis: una guía ya registrada responde -18019901 sin
  //    descontar cuota, así que el barrido no necesita recordar qué hizo.
  const guias = [
    ...new Set(
      pedidos.filter((p) => p.estado === 'Enviado').map((p) => String(p.guia || '').trim()).filter(Boolean)
    ),
  ];
  await registrarGuias(guias);

  console.log(
    `[cron/abandonados] revisados=${pedidos.length} recuperados=${recuperados.length} notificados=${abandonados.length} vigiladas=${guias.length}`
  );
  return Response.json({
    revisados: pedidos.length,
    recuperados: recuperados.length,
    notificados: abandonados.length,
    vigiladas: guias.length,
  });
}
