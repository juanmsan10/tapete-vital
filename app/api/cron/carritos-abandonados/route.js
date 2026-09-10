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
import { notificarGHL, enviarCorreo, htmlPedido, correoConfirmacionCompra, correoDemorados, preguntarPorEntrega } from '@/lib/email';
import { leerPedidos, actualizarPedido, telefonoE164, marcarPreguntado } from '@/lib/pedidos';
import { registrarGuias, consultarGuias, estadosPorGuia, procesarEstados } from '@/lib/track17';
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

// "10/9/2026, 3:20:15 p. m." → "2026-09-10". Comparar días calendario evita
// las trampas de contar horas: un despacho de ayer a las 11 p. m. y otro de
// ayer a las 8 a. m. son los dos "de ayer".
function diaDe(fechaTexto) {
  const m = String(fechaTexto || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mes, anio] = m;
  return `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Días hábiles entre dos fechas. Inter no reparte sábados ni domingos, así que
// contarlos como corridos haría ver demorado todo lo despachado un viernes.
// ponytail: no conoce festivos colombianos — solo alarga un día el margen.
function diasHabiles(desde, hasta) {
  // new Date(null) es 1970, no una fecha inválida: sin este guardia un despacho
  // sin fecha reportaba un paquete con 14.789 días de demora.
  if (!desde) return 0;
  const d = new Date(desde);
  const fin = new Date(hasta);
  if (Number.isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  let n = 0;
  while (d < fin) {
    d.setDate(d.getDate() + 1);
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) n++;
  }
  return n;
}

// Cuántos días hábiles se le conceden a un envío antes de considerarlo demorado.
// La promesa es 1 día hábil en Bogotá y 2-3 en el resto; estos son el doble
// largo, para que solo suene lo que de verdad se salió de lo normal.
const LIMITE_BOGOTA = 3;
const LIMITE_RESTO = 5;

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

  //    Y se les pregunta el estado en vez de esperar a que 17track lo empuje:
  //    consultar no descuenta cuota, y su push ya nos dejó sin enterarnos de
  //    una entrega. Solo se atienden las ENTREGAS; los problemas siguen
  //    llegando por push, que dispara al cambiar y no se repite cada media
  //    hora. La marca `preguntado` evita reenviarle el WhatsApp a quien ya lo
  //    recibió y no ha contestado.
  const reportes = await consultarGuias(guias);
  const entregadas = new Map(
    reportes
      .flatMap((r) => [...estadosPorGuia(r)])
      .filter(([, e]) => e.estado.toLowerCase() === 'delivered')
  );
  if (entregadas.size) await procesarEstados(entregadas);

  // 4. ENVÍOS DEMORADOS: un solo correo al día con la lista completa. Se manda
  //    en la pasada de las 8 a. m. de Bogotá —el cron corre cada 30 min, así que
  //    cae exactamente una vez— y así no hace falta llevar registro de a quién
  //    ya se avisó. Mientras el paquete siga sin entregar vuelve a aparecer al
  //    día siguiente; cuando llega, desaparece solo.
  const horaBogota = Number(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false })
  );
  let demorados = [];
  let preguntadosMensajero = 0;
  if (horaBogota === 8) {
    const porGuia = new Map(reportes.flatMap((r) => [...estadosPorGuia(r)]));
    demorados = pedidos
      .filter((p) => p.estado === 'Enviado' && String(p.guia || '').trim())
      .map((p) => {
        const info = porGuia.get(String(p.guia).trim());
        if (!info || info.estado.toLowerCase() === 'delivered' || !info.despachado) return null;
        const dias = diasHabiles(info.despachado, new Date());
        const limite = /^bogot/i.test(p.ciudad || '') ? LIMITE_BOGOTA : LIMITE_RESTO;
        return dias > limite
          ? { orden: p.orden, nombre: String(p.nombre || '').trim(), ciudad: p.ciudad,
              telefono: p.telefono, guia: p.guia, dias, evento: info.evento }
          : null;
      })
      .filter(Boolean);
    if (demorados.length) await correoDemorados(demorados);

    //    Y los que salieron con mensajero propio: 17track no los ve, así que
    //    nadie avisaría que llegaron. Se le pregunta al cliente a la mañana
    //    siguiente del despacho —no el mismo día, que el mensajero puede ir en
    //    camino— y una sola vez, que de eso se encarga `preguntado`.
    const hoyBogota = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const conMensajero = pedidos.filter((p) => {
      if (p.estado !== 'Enviado' || p.transportadora !== 'mensajero' || p.preguntado) return false;
      const dia = diaDe(p.fecha_envio);
      return Boolean(dia) && dia < hoyBogota;
    });
    for (const p of conMensajero) {
      await preguntarPorEntrega(p);
      await marcarPreguntado(p.orden);
      console.log(`[mensajero] ${p.orden} despachado el ${diaDe(p.fecha_envio)} → preguntando al cliente.`);
    }
    if (conMensajero.length) preguntadosMensajero = conMensajero.length;
  }

  console.log(
    `[cron/abandonados] revisados=${pedidos.length} recuperados=${recuperados.length} notificados=${abandonados.length} vigiladas=${guias.length} entregadas=${entregadas.size} demorados=${demorados.length} mensajero=${preguntadosMensajero}`
  );
  return Response.json({
    revisados: pedidos.length,
    recuperados: recuperados.length,
    notificados: abandonados.length,
    vigiladas: guias.length,
    entregadas: entregadas.size,
    demorados: demorados.length,
    mensajero: preguntadosMensajero,
  });
}
