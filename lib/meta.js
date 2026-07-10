// ============================================================
// META CONVERSIONS API — evento Purchase server-side
// Requiere: META_PIXEL_ID, META_CAPI_TOKEN
// event_id = orderId → deduplica con el pixel del navegador
// que dispara el mismo evento en /gracias.
// ============================================================
import crypto from 'crypto';

function sha256(valor) {
  return crypto.createHash('sha256').update(String(valor).trim().toLowerCase()).digest('hex');
}

export async function enviarPurchaseCAPI({ orderId, total, email, telefono }) {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) {
    console.warn('[meta] Pixel o token CAPI no configurados. Evento omitido.');
    return { ok: false, skipped: true };
  }
  const userData = {};
  if (email) userData.em = [sha256(email)];
  if (telefono) userData.ph = [sha256(telefono.replace(/\D/g, ''))];

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: orderId,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: 'COP',
          value: total,
          content_name: 'Tapete Vital',
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.error('[meta] Error CAPI:', res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[meta] Excepción CAPI:', err);
    return { ok: false };
  }
}
