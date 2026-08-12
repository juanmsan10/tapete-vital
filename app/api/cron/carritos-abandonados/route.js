// ============================================================
// GET /api/cron/carritos-abandonados — recuperación de carritos
// Un pinger externo lo llama cada 15 min. Hace DOS cosas:
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
import { leerPedidos, notificarGHL, registrarSheet, enviarCorreo, htmlPedido, correoConfirmacionCompra } from '@/lib/email';
import { enviarPurchaseCAPI } from '@/lib/meta';
import { formatoCOP } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const MIN_MIN = 30; // no escribir antes de 30 min
const MAX_MIN = 45; // ancho de ventana = intervalo del cron (15 min)

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

// Normaliza teléfonos colombianos a E.164 (+57...) para que GHL
// asocie el contacto correcto y el WhatsApp llegue de verdad.
function telefonoE164(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('57') && digitos.length > 10) return `+${digitos}`;
  return `+57${digitos}`;
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
    if (p.estado !== 'Iniciado') return false;
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
      await registrarSheet({ action: 'update', orden: p.orden, estado: 'Aprobado' });
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
  const abandonados = pedidos.filter((p) => {
    if (p.estado !== 'Iniciado') return false;
    const edad = edadMinutos(p.fecha);
    return edad !== null && edad >= MIN_MIN && edad < MAX_MIN;
  });

  await Promise.all(
    abandonados.map((p) =>
      notificarGHL({
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
      })
    )
  );

  console.log(
    `[cron/abandonados] revisados=${pedidos.length} recuperados=${recuperados.length} notificados=${abandonados.length}`
  );
  return Response.json({
    revisados: pedidos.length,
    recuperados: recuperados.length,
    notificados: abandonados.length,
  });
}
