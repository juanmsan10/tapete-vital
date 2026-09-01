// ============================================================
// POST /api/entrega — el cliente confirma que su pedido llegó
//
// Lo llama el workflow "Confirmación de entrega" de GHL cuando el
// cliente responde que sí al WhatsApp de Eva. Es el único camino
// por el que un pedido llega a "Entregado" sin que nadie abra el
// panel: hasta ahora esa pestaña no la tocaba nadie y los pedidos
// se quedaban en "Enviado" para siempre.
//
// Autenticación: Authorization: Bearer ENTREGA_SECRET. A diferencia
// del cron, si el secreto NO está configurado el endpoint queda
// cerrado: es público y escribe en pedidos.
// ============================================================
import { after } from 'next/server';
import { buscarPedido, actualizarPedido } from '@/lib/pedidos';
import { registrar } from '@/lib/auditoria';

export async function POST(request) {
  const secret = process.env.ENTREGA_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { orden } = await request.json().catch(() => ({}));
  if (!orden) return Response.json({ error: 'Falta la orden' }, { status: 400 });

  const pedido = await buscarPedido(orden);
  if (!pedido) return Response.json({ error: `No encontrado: ${orden}` }, { status: 404 });

  // El cliente que responde dos veces, o un reintento de GHL, no es un error.
  if (pedido.estado === 'Entregado') return Response.json({ ok: true, yaEstaba: true });

  // Solo desde "Enviado": si el pedido se devolvió o se descartó, una
  // respuesta tardía del cliente no debe resucitarlo.
  if (pedido.estado !== 'Enviado') {
    console.warn(`[entrega] ${pedido.orden} está en "${pedido.estado}": no se marca como entregado.`);
    return Response.json({ ok: false, estado: pedido.estado }, { status: 409 });
  }

  await actualizarPedido(pedido.orden, { estado: 'Entregado' });
  after(() => registrar({
    usuario: 'Eva (bot)',
    accion: 'estado',
    objetivo: pedido.orden,
    detalle: {
      de: 'Enviado',
      a: 'Entregado',
      cliente: pedido.nombre,
      via: 'el cliente confirmó por WhatsApp',
    },
  }));

  console.log(`[entrega] ${pedido.orden} confirmado por el cliente.`);
  return Response.json({ ok: true });
}
