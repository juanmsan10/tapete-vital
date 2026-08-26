import { leerPedidos, crearPedido, actualizarPedido, buscarPedido } from '@/lib/pedidos';
import { correoConfirmacionCompra } from '@/lib/email';

// Postgres responde en ~50ms: ya no hace falta caché ni reintentos como
// con la Google Sheet, y el equipo ve siempre el estado real.
export async function GET() {
  try {
    const pedidos = await leerPedidos();
    return Response.json({ pedidos });
  } catch (err) {
    console.error('[gestion] Error leyendo pedidos:', err);
    return Response.json({ error: 'Error leyendo datos' }, { status: 500 });
  }
}

// Crear pedido manual (ventas cerradas por chat / fuera del embudo)
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.nombre || !body.total) {
      return Response.json({ error: 'Faltan nombre o total' }, { status: 400 });
    }
    const orden = 'TV-M' + crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase();
    await crearPedido({
      orden,
      fecha: new Date().toISOString(),
      estado: body.estado || 'Aprobado',
      cantidad: body.cantidad || 1,
      total: body.total,
      nombre: body.nombre,
      cedula: body.cedula || '',
      telefono: body.telefono || '',
      email: body.email || '',
      ciudad: body.ciudad || '',
      direccion: body.direccion || '',
      notas: body.notas || '',
      productos: body.productos || '',
    });
    return Response.json({ ok: true, orden });
  } catch (err) {
    console.error('[gestion] Error creando pedido:', err);
    return Response.json({ error: 'Error creando pedido' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { orden, ...campos } = await request.json();
    if (!orden) return Response.json({ error: 'Falta la orden' }, { status: 400 });

    // "Marcar como aprobado" manual sobre un pedido Iniciado/Rechazado = pago
    // confirmado por fuera del webhook → el cliente aún no tiene su correo.
    // Solo en esa transición (no al "regresar" desde Empacado).
    let confirmarA = null;
    if (campos.estado === 'Aprobado') {
      const previo = await buscarPedido(orden);
      if (['Iniciado', 'Rechazado'].includes(previo?.estado) && previo.email) confirmarA = previo;
    }

    await actualizarPedido(orden, campos);

    if (confirmarA) {
      await correoConfirmacionCompra({
        orden: confirmarA.orden,
        email: confirmarA.email,
        total: confirmarA.total,
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[gestion] Error actualizando pedido:', err);
    return Response.json({ error: 'Error actualizando datos' }, { status: 500 });
  }
}
