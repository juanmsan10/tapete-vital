// ============================================================
// POST /api/bold — crea la orden de pago
// 1. Recalcula el total EN EL SERVIDOR (nunca confía en el cliente)
// 2. Genera orderId único y firma de integridad SHA-256 de Bold
//    hash = SHA256(orderId + monto + moneda + BOLD_SECRET_KEY)
// 3. Envía correo interno "pedido iniciado" con los datos de envío
//    (sirve además para recuperar checkouts abandonados por WhatsApp)
// ============================================================
import crypto from 'crypto';
import { calcularTotal, formatoCOP } from '@/lib/pricing';
import { enviarCorreo, htmlPedido } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { cantidad, zona, nombre, cedula, telefono, email, ciudad, direccion, notas } = body;

    if (!nombre || !cedula || !telefono || !direccion || !ciudad) {
      return Response.json({ error: 'Faltan datos de envío obligatorios.' }, { status: 400 });
    }

    const apiKey = process.env.BOLD_IDENTITY_KEY;
    const secretKey = process.env.BOLD_SECRET_KEY;
    if (!apiKey || !secretKey) {
      return Response.json(
        { error: 'Pasarela de pago no configurada. Contacta a soporte.' },
        { status: 500 }
      );
    }

    // Total calculado server-side con la matriz oficial
    const totales = calcularTotal(cantidad, zona);
    const orderId = `PAT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const currency = 'COP';

    // Firma de integridad Bold: SHA256(orderId + amount + currency + secret)
    const integrity = crypto
      .createHash('sha256')
      .update(`${orderId}${totales.total}${currency}${secretKey}`)
      .digest('hex');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    // Correo interno: pedido iniciado (recuperación de abandonos incluida)
    await enviarCorreo({
      to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
      subject: `🟡 Pedido iniciado ${orderId} — ${totales.cantidad} tapete(s) — ${formatoCOP(totales.total)}`,
      html: htmlPedido({
        titulo: 'Pedido iniciado (esperando pago)',
        orden: orderId,
        datos: {
          Nombre: nombre,
          'Cédula / NIT': cedula,
          'Teléfono / WhatsApp': telefono,
          Email: email || 'No indicado',
          Ciudad: ciudad,
          Dirección: direccion,
          Cantidad: `${totales.cantidad} tapete(s)`,
          Envío: `${totales.zona === 'bogota' ? 'Bogotá' : 'Resto del país'} — ${formatoCOP(totales.envio)}`,
          Notas: notas || '—',
        },
        totales: formatoCOP(totales.total),
      }),
    });

    return Response.json({
      orderId,
      amount: String(totales.total),
      currency,
      integrity,
      apiKey,
      redirectUrl: `${baseUrl}/gracias`,
      resumen: totales,
    });
  } catch (err) {
    console.error('[api/bold] Error:', err);
    return Response.json({ error: 'Error procesando la orden.' }, { status: 500 });
  }
}
