// ============================================================
// CORREOS TRANSACCIONALES — Resend (https://resend.com)
// Requiere: RESEND_API_KEY, EMAIL_FROM, EMAIL_INTERNO
// Si las variables no existen, falla en silencio (log) para
// nunca bloquear un pago por un problema de correo.
// ============================================================

export async function enviarCorreo({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Polo a Tierra <pedidos@tapetevital.co>';
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

export function htmlPedido({ titulo, orden, datos, totales }) {
  const filas = Object.entries(datos)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#5F5E5A;">${k}</td><td style="padding:6px 12px;font-weight:600;">${v}</td></tr>`
    )
    .join('');
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
    <div style="background:#005261;padding:20px 24px;">
      <p style="color:#ffffff;font-size:18px;margin:0;font-weight:700;">POLO A TIERRA</p>
      <p style="color:#64C9A7;font-size:14px;margin:4px 0 0;">${titulo}</p>
    </div>
    <div style="padding:20px 24px;">
      <p style="font-size:14px;color:#333;">Pedido: <strong>${orden}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${filas}</table>
      ${totales ? `<p style="font-size:16px;margin-top:16px;">Total: <strong>${totales}</strong></p>` : ''}
    </div>
  </div>`;
}
