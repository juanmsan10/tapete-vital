// ============================================================
// CORREOS TRANSACCIONALES — Resend (https://resend.com)
// Requiere: RESEND_API_KEY, EMAIL_FROM, EMAIL_INTERNO
// Si las variables no existen, falla en silencio (log) para
// nunca bloquear un pago por un problema de correo.
// ============================================================

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

export async function registrarSheet(datos) {
  const url = process.env.GOOGLE_SHEET_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
  } catch (err) {
    console.error('[sheet] Error:', err);
  }
}

export function htmlPedido({ titulo, orden, datos, totales, guiaUrl }) {
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
        <p style="font-size:14px;color:#333;margin-bottom:12px;">Tu guía gratuita está lista para descargar:</p>
        <a href="${guiaUrl}" style="display:inline-block;background:linear-gradient(135deg, #00ae84 0%, #005261 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;">Descargar guía</a>
      </div>` : ''}
    </div>
  </div>`;
}
