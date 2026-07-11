// ============================================================
// POST /api/webhook/bold — notificaciones de pago de Bold
// 1. Verifica la firma HMAC del webhook (BOLD_WEBHOOK_SECRET)
// 2. En SALE_APPROVED: correo interno "PAGO CONFIRMADO"
//    + correo al cliente si hay email + Purchase a Meta CAPI
// Configurar la URL de este webhook en el panel de Bold:
// https://TU-DOMINIO/api/webhook/bold
// ============================================================
import crypto from 'crypto';
import { enviarCorreo, htmlPedido, registrarSheet } from '@/lib/email';
import { enviarPurchaseCAPI } from '@/lib/meta';
import { formatoCOP } from '@/lib/pricing';

function verificarFirma(rawBody, firmaRecibida, secret) {
  if (!secret) return true; // sin secreto configurado no se bloquea (se registra)
  if (!firmaRecibida) return false;
  const esperado = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(firmaRecibida));
  } catch {
    return false;
  }
}

export async function POST(request) {
  const rawBody = await request.text();
  const firma =
    request.headers.get('x-bold-signature') || request.headers.get('signature') || '';

  const secret = process.env.BOLD_WEBHOOK_SECRET;
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

  console.log(`[webhook/bold] Evento ${tipo} — orden ${orderId} — total ${total}`);

  if (tipo === 'SALE_APPROVED') {
    // Actualizar estado en Google Sheet
    await registrarSheet({
      fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      orden: orderId,
      estado: 'Aprobado',
      cantidad: '',
      total,
      nombre: '',
      telefono: '',
      email: emailCliente || '',
      ciudad: '',
      direccion: '',
      notas: '',
    });

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

  return Response.json({ received: true });
}
