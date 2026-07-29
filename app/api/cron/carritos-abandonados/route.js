// ============================================================
// GET /api/cron/carritos-abandonados — recuperación de carritos
// Vercel Cron lo llama cada 15 min. Notifica a GHL los pedidos
// que llevan 30–45 min en estado "Iniciado" (checkout sin pagar).
//
// La VENTANA de edad (30–45 min) hace dos cosas a la vez:
//   1. Cada carrito cae en la ventana una sola vez → sin reenvíos,
//      sin marcar estado ni depender de GHL para deduplicar.
//   2. Los carritos viejos (horas/días) quedan fuera → no se
//      escribe a leads antiguos al activar esto.
// Si el cliente paga antes de 30 min, el webhook de Bold ya movió
// el estado a "Aprobado" y el cron nunca lo toca.
// ============================================================
import { leerPedidos, notificarGHL } from '@/lib/email';

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

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pedidos = await leerPedidos();
  const abandonados = pedidos.filter((p) => {
    if (p.estado !== 'Iniciado') return false;
    const edad = edadMinutos(p.fecha);
    return edad !== null && edad >= MIN_MIN && edad < MAX_MIN;
  });

  await Promise.all(
    abandonados.map((p) =>
      notificarGHL({
        orden: p.orden,
        nombre: p.nombre,
        telefono: p.telefono,
        email: p.email || '',
        ciudad: p.ciudad,
        productos: p.productos,
        total: p.total,
      })
    )
  );

  console.log(`[cron/abandonados] revisados=${pedidos.length} notificados=${abandonados.length}`);
  return Response.json({ revisados: pedidos.length, notificados: abandonados.length });
}
