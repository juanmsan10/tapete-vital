// ============================================================
// POST /api/bold — crea la orden de pago
// 1. Recalcula el total EN EL SERVIDOR (nunca confía en el cliente)
// 2. Genera orderId único y firma de integridad SHA-256 de Bold
//    hash = SHA256(orderId + monto + moneda + BOLD_SECRET_KEY)
// 3. Envía correo interno "pedido iniciado" con los datos de envío
//    (sirve además para recuperar checkouts abandonados por WhatsApp)
// ============================================================
import crypto from 'crypto';
import { calcularTotal, calcularTotalCarrito, resumenProductos, formatoCOP } from '@/lib/pricing';
import { enviarCorreo, htmlPedido, registrarSheet } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { cantidad, zona, items, nombre, cedula, telefono, email, ciudad, direccion, notas } = body;

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

    // Total calculado server-side con la matriz oficial.
    // `items` (tienda multi-producto) tiene prioridad; sin items es el embudo clásico.
    const esCarrito = items && typeof items === 'object';
    const totales = esCarrito ? calcularTotalCarrito(items, zona) : calcularTotal(cantidad, zona);
    if (esCarrito && totales.unidades === 0) {
      return Response.json({ error: 'El carrito está vacío.' }, { status: 400 });
    }
    const productos = esCarrito ? resumenProductos(totales.items) : '';
    const unidades = esCarrito ? totales.unidades : totales.cantidad;
    const descripcion = esCarrito ? productos : `${totales.cantidad} tapete(s)`;
    const orderId = `TV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const currency = 'COP';

    // Firma de integridad Bold: SHA256(orderId + amount + currency + secret)
    const integrity = crypto
      .createHash('sha256')
      .update(`${orderId}${totales.total}${currency}${secretKey}`)
      .digest('hex');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    // Registrar en Google Sheet
    await registrarSheet({
      fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      orden: orderId,
      estado: 'Iniciado',
      cantidad: unidades,
      total: totales.total,
      nombre,
      telefono,
      email: email || '',
      ciudad,
      direccion,
      notas: notas || '',
      productos,
    });

    // Correo interno: pedido iniciado (recuperación de abandonos incluida)
    await enviarCorreo({
      to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
      subject: `🟡 Pedido iniciado ${orderId} — ${descripcion} — ${formatoCOP(totales.total)}`,
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
          Productos: descripcion,
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
