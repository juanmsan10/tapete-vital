// ============================================================
// POST /api/webhook/track17 — 17track avisa que un envío cambió
//
// Cuando el paquete queda "Delivered", se dispara el flujo de GHL que le
// pregunta al cliente si ya lo tiene en sus manos. La respuesta del cliente
// cierra el pedido por /api/entrega.
//
// Se le PREGUNTA al cliente en vez de dar la entrega por hecha: Inter marca
// "entregado" cuando el paquete quedó en portería o con un vecino, y afirmar
// que ya lo recibió a alguien que no lo tiene en la mano genera más problema
// del que resuelve.
//
// Configurar esta URL en https://api.17track.net/admin/settings
// ============================================================
import { after } from 'next/server';
import { buscarPorGuia, telefonoE164 } from '@/lib/pedidos';
import { notificarGHL } from '@/lib/email';
import { guiasEntregadas } from '@/lib/track17';

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  if (!payload) return Response.json({ error: 'JSON inválido' }, { status: 400 });

  const guias = guiasEntregadas(payload);
  console.log(
    '[17track] Push:', payload?.event || 'sin evento',
    '— guías entregadas:', guias.length ? guias.join(', ') : 'ninguna'
  );

  // Se responde de una y el trabajo sigue después: un webhook que tarda es
  // un webhook que el emisor reintenta.
  after(() => preguntarAlCliente(guias));
  return Response.json({ received: true });
}

// 17track no firma sus push, así que la defensa no es creerle al remitente
// sino al dato: solo se actúa sobre una guía que corresponda a un pedido
// nuestro y que además siga en "Enviado". Lo peor que consigue un push falso
// es que a un cliente con un pedido realmente en tránsito le preguntemos si
// ya le llegó — que es justo lo que el sistema hace de todos modos.
async function preguntarAlCliente(guias) {
  for (const guia of guias) {
    const pedido = await buscarPorGuia(guia);
    if (!pedido) {
      console.warn(`[17track] La guía ${guia} no corresponde a ningún pedido.`);
      continue;
    }
    if (pedido.estado !== 'Enviado') {
      console.log(`[17track] ${pedido.orden} está en "${pedido.estado}": no se pregunta.`);
      continue;
    }

    const nombre = String(pedido.nombre || '').trim();
    await notificarGHL(
      {
        phone: telefonoE164(pedido.telefono),
        first_name: nombre.split(/\s+/)[0] || '',
        full_name: nombre,
        email: pedido.email || '',
        orden: pedido.orden,
        nombre,
        telefono: pedido.telefono,
        ciudad: pedido.ciudad,
        guia: pedido.guia,
        productos: pedido.productos || `${pedido.cantidad || 1}× Tapete Vital`,
      },
      process.env.GHL_WEBHOOK_ENTREGA_URL
    );
    console.log(`[17track] ${pedido.orden} entregado según Inter → preguntando al cliente.`);
  }
}
