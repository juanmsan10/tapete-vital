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
  // Falta el secreto y token equivocado son fallas distintas: verlas iguales
  // costó una tarde de "¿es Vercel o es GHL?".
  const secret = process.env.ENTREGA_SECRET;
  if (!secret) {
    console.error('[entrega] ENTREGA_SECRET no está configurado en este entorno.');
    return Response.json({ error: 'Endpoint sin configurar' }, { status: 503 });
  }
  const cuerpo = await request.json().catch(() => ({}));

  // El secreto vale en el header o en el cuerpo, con o sin el prefijo Bearer:
  // quien configura esto pega el valor en un campo de GHL, y un prefijo de más
  // o de menos no es motivo para dejar un pedido sin cerrar.
  const enviado = (
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    cuerpo.secreto ||
    ''
  ).trim();

  if (enviado !== secret) {
    console.warn(
      '[entrega] Rechazado — llegaron %d caracteres, esperaba %d.',
      enviado.length,
      secret.length
    );
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const { orden } = cuerpo;
  // GHL manda sus propios campos del contacto junto a los nuestros y no
  // documenta bien dónde caen: si falta la orden, el error dice qué llegó
  // de verdad, que es lo único que hace falta para arreglar el mapeo.
  if (!orden) {
    return Response.json(
      { error: 'Falta la orden', recibido: Object.keys(cuerpo) },
      { status: 400 }
    );
  }

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
