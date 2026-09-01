// ============================================================
// CORREOS TRANSACCIONALES — Resend (https://resend.com)
// Requiere: RESEND_API_KEY, EMAIL_FROM, EMAIL_INTERNO
// Si las variables no existen, falla en silencio (log) para
// nunca bloquear un pago por un problema de correo.
// ============================================================
import { formatoCOP } from './pricing';

export async function enviarCorreo({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'POLO A TIERRA <pedidos@tapetevital.co>';
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurada. Correo omitido:', subject);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('[email] Error Resend:', res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] Excepción:', err);
    return { ok: false };
  }
}

// Confirmación de compra al cliente. Único punto de envío para los tres
// caminos por los que un pedido puede pasar a "Aprobado": webhook de Bold,
// conciliación del cron y aprobación manual en el dashboard.
export async function correoConfirmacionCompra({ orden, email, total }) {
  if (!email) return { ok: false, skipped: true };
  return enviarCorreo({
    to: email,
    subject: 'Acabas de comprar el Tapete Vital',
    html: htmlPedido({
      titulo: '¡Gracias por tu compra!',
      orden,
      datos: {
        Estado: 'Pago confirmado',
        'Siguiente paso': 'Prepararemos tu pedido y te enviaremos la guía de envío a este mismo correo.',
      },
      totales: formatoCOP(total),
      guiaUrl: 'https://drive.google.com/file/d/1yFV3aBrEuUjPDzpHI0YGOR1R6JAQHNHK/view?usp=sharing',
    }),
  });
}

// Confirmación de ENVÍO al cliente. Se dispara sola desde PUT /api/gestion
// cuando el panel guarda (o corrige) el número de guía: hasta ahora el bot le
// prometía la guía al cliente y nadie se la mandaba.
// Inter no publica un enlace de rastreo por guía —su rastreador pide el número
// a mano y está detrás de reCAPTCHA—, así que el número va destacado para copiarlo.
export async function correoEnvioDespachado({ orden, email, guia, ciudad }) {
  if (!email || !guia) return { ok: false, skipped: true };
  return enviarCorreo({
    to: email,
    subject: `Tu Tapete Vital va en camino — guía ${guia}`,
    html: htmlPedido({
      titulo: '¡Tu pedido va en camino!',
      orden,
      datos: {
        Estado: 'Despachado',
        Transportadora: 'Interrapidísimo',
        'Número de guía': `<strong style="font-size:15px;color:#00AE84;">${guia}</strong>`,
        ...(ciudad ? { Destino: ciudad } : {}),
        'Tiempo estimado': 'En Bogotá, normalmente 1 día hábil. En el resto del país, entre 2 y 3 días hábiles.',
      },
      guiaUrl: 'https://siguetuenvio.interrapidisimo.com/',
      ctaTexto: `Copia tu número de guía (${guia}) y consúltalo aquí:`,
      ctaBoton: 'Rastrear mi envío',
    }),
  });
}

// El segundo parámetro existe porque hay dos flujos de GHL con webhooks
// distintos: carritos abandonados y confirmación de entrega. Mandar el
// evento equivocado le escribe al cliente el mensaje equivocado.
export async function notificarGHL(datos, url = process.env.GHL_WEBHOOK_URL) {
  if (!url) {
    console.warn('[ghl] GHL_WEBHOOK_URL no configurada. Webhook omitido:', datos.orden);
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (!res.ok) console.error('[ghl] GHL respondió', res.status, 'para', datos.orden, await res.text());
    else console.log('[ghl] Notificado', datos.orden, '→', res.status);
  } catch (err) {
    console.error('[ghl] Error:', err);
  }
}

export function htmlPedido({
  titulo, orden, datos, totales, guiaUrl,
  ctaTexto = 'Tu guía gratuita está lista para descargar:',
  ctaBoton = 'Descargar guía',
}) {
  const filas = Object.entries(datos)
    .map(
      ([k, v]) =>
        `<tr><td class="etiqueta" style="padding:6px 12px;font-weight:700;color:#000;vertical-align:top;">${k}</td><td class="valor" style="padding:6px 12px;color:#5F5E5A;vertical-align:top;">${v}</td></tr>`
    )
    .join('');
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg, #00ae84 0%, #005261 100%);padding:20px 24px;">
      <p style="color:#ffffff;font-size:18px;margin:0;font-weight:700;text-align:center;">${titulo}</p>
    </div>
    <div style="padding:20px 24px;">
      <p style="font-size:16px;color:#333;"># de pedido: <strong style="color:#00AE84;">${orden}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">${filas}</table>
      ${totales ? `<p style="font-size:16px;margin-top:16px;">Total: <strong>${totales}</strong></p>` : ''}
      ${guiaUrl ? `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e5e5;text-align:center;">
        <p style="font-size:14px;color:#333;margin-bottom:12px;">${ctaTexto}</p>
        <a href="${guiaUrl}" style="display:inline-block;background:linear-gradient(135deg, #00ae84 0%, #005261 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">${ctaBoton}</a>
      </div>` : ''}
    </div>
  </div>`;
}
