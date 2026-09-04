// ============================================================
// POST /api/webhook/track17 — 17track avisa que un envío cambió
//
// Entregado ("Delivered") → se dispara el flujo de GHL que le pregunta al
// cliente si ya lo tiene en sus manos; su respuesta cierra el pedido por
// /api/entrega. Se le PREGUNTA en vez de dar la entrega por hecha: Inter
// marca "entregado" lo que dejó en portería o con un vecino.
//
// Problema (DeliveryFailure / Exception / Expired) → correo interno al
// equipo con los datos del cliente, para resolverlo antes de que reclame.
//
// Configurar esta URL en https://api.17track.net/admin/settings
// (Package Webhook, V2.4, estados: Entregado, No entregado, Alerta, Caducado)
// ============================================================
import { after } from 'next/server';
import { buscarPorGuia, telefonoE164 } from '@/lib/pedidos';
import { notificarGHL, enviarCorreo, htmlPedido } from '@/lib/email';
import { estadosPorGuia } from '@/lib/track17';

// Nombres de estado de 17track v2.4 (los checkboxes del panel en español:
// No entregado = DeliveryFailure, Alerta = Exception, Caducado = Expired)
const PROBLEMAS = new Set(['deliveryfailure', 'exception', 'expired']);

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  if (!payload) return Response.json({ error: 'JSON inválido' }, { status: 400 });

  const estados = estadosPorGuia(payload);
  console.log(
    '[17track] Push:', payload?.event || 'sin evento', '—',
    estados.size ? [...estados].map(([g, e]) => `${g}:${e.estado}`).join(', ') : 'sin guías'
  );

  // Se responde de una y el trabajo sigue después: un webhook que tarda es
  // un webhook que el emisor reintenta.
  after(() => procesar(estados));
  return Response.json({ received: true });
}

// 17track no firma sus push, así que la defensa no es creerle al remitente
// sino al dato: solo se actúa sobre una guía que corresponda a un pedido
// nuestro y que además siga en "Enviado". Lo peor que consigue un push falso
// es una pregunta de más al cliente o un correo de más al equipo.
async function procesar(estados) {
  for (const [guia, { estado, detalle }] of estados) {
    const clave = estado.toLowerCase();
    const entregado = clave === 'delivered';
    if (!entregado && !PROBLEMAS.has(clave)) continue;

    const pedidos = await buscarPorGuia(guia);
    if (!pedidos.length) {
      console.warn(`[17track] La guía ${guia} no corresponde a ningún pedido.`);
      continue;
    }

    for (const pedido of pedidos) {
    if (pedido.estado !== 'Enviado') {
      console.log(`[17track] ${pedido.orden} está en "${pedido.estado}": se ignora ${estado}.`);
      continue;
    }

    if (entregado) {
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
    } else {
      await enviarCorreo({
        to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
        subject: `🔴 Problema con el envío ${pedido.orden} (${estado})`,
        html: htmlPedido({
          titulo: 'Interrapidísimo reporta un problema con este envío',
          orden: pedido.orden,
          datos: {
            Estado: detalle ? `${estado} (${detalle})` : estado,
            Cliente: pedido.nombre,
            Teléfono: pedido.telefono,
            Ciudad: pedido.ciudad,
            Guía: pedido.guia,
            'Qué hacer': 'Rastrear la guía con Inter y contactar al cliente hoy, antes de que tenga que reclamar.',
          },
        }),
      });
      console.log(`[17track] ${pedido.orden} con problema (${estado}) → correo interno enviado.`);
    }
    }
  }
}
