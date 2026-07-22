// ============================================================
// POST /api/webhook/bold — notificaciones de pago de Bold
// 1. Verifica la firma HMAC del webhook (BOLD_WEBHOOK_SECRET)
// 2. Responde 200 de inmediato (Bold exige <2s) y procesa después
// 3. En SALE_APPROVED: correo interno "PAGO CONFIRMADO"
//    + correo al cliente si hay email + Purchase a Meta CAPI
// Configurar la URL de este webhook en el panel de Bold:
// https://TU-DOMINIO/api/webhook/bold
// ============================================================
import crypto from 'crypto';
import { after } from 'next/server';
import { enviarCorreo, htmlPedido, registrarSheet, leerPedidos } from '@/lib/email';
import { enviarPurchaseCAPI } from '@/lib/meta';
import { formatoCOP } from '@/lib/pricing';

function verificarFirma(rawBody, firmaRecibida, secret) {
  if (!secret) return true; // sin secreto configurado no se bloquea (se registra)
  if (!firmaRecibida) return false;
  // Bold firma el body en base64 (no el body crudo) y entrega el resultado en hex.
  // https://developers.bold.co/webhook
  const bodyBase64 = Buffer.from(rawBody).toString('base64');
  const esperado = crypto.createHmac('sha256', secret).update(bodyBase64).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(firmaRecibida));
  } catch {
    return false;
  }
}

async function procesarEvento(tipo, orderId, total, emailCliente, data) {
  console.log(`[webhook/bold] Evento ${tipo} — orden ${orderId} — total ${total}`);

  if (tipo === 'SALE_APPROVED') {
    // Bold puede reenviar el mismo evento varias veces (reintentos): evita correos duplicados
    const pedidos = await leerPedidos();
    const pedido = pedidos.find((p) => p.orden === orderId);
    if (pedido?.estado === 'Aprobado') {
      console.log(`[webhook/bold] Orden ${orderId} ya estaba aprobada, evento duplicado ignorado.`);
      return;
    }

    // Actualizar estado de la fila existente (no crear duplicado)
    await registrarSheet({ action: 'update', orden: orderId, estado: 'Aprobado' });

    // 1. Correo interno de confirmación
    await enviarCorreo({
      to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
      subject: `✅ Pago confirmado ${orderId}`,
      html: htmlPedido({
        titulo: 'Pago confirmado → Preparar envío',
        orden: orderId,
        datos: {
          Estado: 'APROBADO',
          Total: formatoCOP(total),
          Correo: emailCliente || 'No disponible (ver correo de pedido iniciado)',
          'ID transacción Bold': data?.payment_id || '—',
        },
        totales: formatoCOP(total),
      }),
    });

    // 2. Correo al cliente (si Bold entrega su email)
    if (emailCliente) {
      await enviarCorreo({
        to: emailCliente,
        subject: 'Acabas de comprar el Tapete Vital',
        html: htmlPedido({
          titulo: '¡Gracias por tu compra!',
          orden: orderId,
          datos: {
            Estado: 'Pago confirmado',
            'Siguiente paso': 'Prepararemos tu pedido y te contactaremos por WhatsApp con la guía de envío.',
          },
          totales: formatoCOP(total),
          guiaUrl: 'https://drive.google.com/file/d/1yFV3aBrEuUjPDzpHI0YGOR1R6JAQHNHK/view?usp=sharing',
        }),
      });
    }

    // 3. Purchase server-side a Meta (event_id = orderId para deduplicar)
    await enviarPurchaseCAPI({ orderId, total: Number(total), email: emailCliente });
  }

  if (tipo === 'SALE_REJECTED') {
    await enviarCorreo({
      to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
      subject: `🔴 Pago rechazado ${orderId}`,
      html: htmlPedido({
        titulo: 'Pago rechazado — oportunidad de recuperación por WhatsApp',
        orden: orderId,
        datos: { Estado: 'RECHAZADO', Total: formatoCOP(total) },
      }),
    });
  }
}

export async function POST(request) {
  const rawBody = await request.text();
  const firma =
    request.headers.get('x-bold-signature') || request.headers.get('signature') || '';

  // Para integración "Botón de pagos", Bold firma el webhook con la misma
  // llave secreta del botón (BOLD_SECRET_KEY) — no hay un secreto de webhook aparte.
  // https://developers.bold.co/webhook
  const secret = process.env.BOLD_SECRET_KEY;
  if (secret && !verificarFirma(rawBody, firma, secret)) {
    console.warn('[webhook/bold] Firma inválida. Evento descartado.');
    return Response.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let evento;
  try {
    evento = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const tipo = evento?.type || '';
  const data = evento?.data || {};
  const orderId =
    data?.metadata?.reference || data?.reference || data?.payment_id || 'SIN-REFERENCIA';
  const total = data?.amount?.total ?? data?.amount ?? 0;
  const emailCliente = data?.payer_email || data?.customer_email || null;

  // Bold exige un 200 en menos de 2s; el resto (Sheet + correos + CAPI) sigue después de responder
  after(() => procesarEvento(tipo, orderId, total, emailCliente, data));

  return Response.json({ received: true });
}
