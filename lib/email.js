// ============================================================
// CORREOS TRANSACCIONALES — Resend (https://resend.com)
// Requiere: RESEND_API_KEY, EMAIL_FROM, EMAIL_INTERNO
// Si las variables no existen, falla en silencio (log) para
// nunca bloquear un pago por un problema de correo.
// ============================================================
import { formatoCOP } from './pricing';
import { telefonoE164 } from './pedidos';

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
// "1× Pad Portátil" → "Pad Portátil". Con varios productos no hay un nombre
// que los cubra, así que se habla del pedido. Vacío es un pedido del landing,
// que solo vende Tapete Vital (misma convención que el resto del código).
function comoLlamarlo(productos) {
  const lista = String(productos || '1× Tapete Vital')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (lista.length !== 1) return 'pedido';
  return lista[0].replace(/^\s*\d+\s*[×x]\s*/i, '').trim() || 'pedido';
}

export async function correoEnvioDespachado({ orden, email, guia, ciudad, productos, transportadora }) {
  const conMensajero = transportadora === 'mensajero';
  // Con mensajero propio no hay guía que mandar; con Inter, sin guía no hay
  // nada que contarle al cliente todavía.
  if (!email || (!guia && !conMensajero)) return { ok: false, skipped: true };
  return enviarCorreo({
    to: email,
    // "Parches Esenciales" es plural y "Tu Parches va" se lee mal.
    subject: (() => {
      const nombre = comoLlamarlo(productos);
      const plural = /s$/i.test(nombre);
      const cola = conMensajero ? '' : ` — guía ${guia}`;
      return `${plural ? 'Tus' : 'Tu'} ${nombre} ${plural ? 'van' : 'va'} en camino${cola}`;
    })(),
    html: htmlPedido({
      titulo: '¡Tu pedido va en camino!',
      orden,
      datos: {
        Estado: 'Despachado',
        Entrega: conMensajero ? 'Mensajero propio' : 'Interrapidísimo',
        ...(conMensajero
          ? {}
          : { 'Número de guía': `<strong style="font-size:15px;color:#00AE84;">${guia}</strong>` }),
        ...(ciudad ? { Destino: ciudad } : {}),
        'Tiempo estimado': conMensajero
          ? 'Nuestro mensajero lo lleva directo a tu dirección. Te contactamos para coordinar la entrega.'
          : 'En Bogotá, normalmente 1 día hábil. En el resto del país, entre 2 y 3 días hábiles.',
      },
      // El rastreador es de Inter: con mensajero no hay nada que rastrear.
      ...(conMensajero
        ? {}
        : {
            guiaUrl: 'https://siguetuenvio.interrapidisimo.com/',
            ctaTexto: `Copia tu número de guía (${guia}) y consúltalo aquí:`,
            ctaBoton: 'Rastrear mi envío',
          }),
    }),
  });
}

// La URL va SIEMPRE explícita, sin valor por defecto. Hay dos flujos de GHL
// con webhooks distintos —carritos abandonados y confirmación de entrega— y
// tener uno de respaldo del otro no es una red: es la vía para mandar el
// mensaje equivocado. El 3-sep-2026, con GHL_WEBHOOK_ENTREGA_URL sin poner
// en Vercel, ocho clientes que ya tenían su pedido en la mano recibieron el
// "tu pedido quedó pendiente" de carritos abandonados.
// Sin URL no se manda nada y se grita en el log.
// Le pregunta al cliente si ya tiene su pedido en las manos, por el flujo de
// GHL con botones. Vive aquí porque tiene dos disparadores que no se parecen:
// la entrega que reporta Inter y el despacho con mensajero propio.
export async function preguntarPorEntrega(pedido) {
  const nombre = String(pedido.nombre || '').trim();
  return notificarGHL(
    {
      // Sin esto los dos flujos de GHL son indistinguibles para quien recibe.
      evento: 'entrega',
      phone: telefonoE164(pedido.telefono),
      first_name: nombre.split(/\s+/)[0] || '',
      full_name: nombre,
      email: pedido.email || '',
      orden: pedido.orden,
      nombre,
      telefono: pedido.telefono,
      ciudad: pedido.ciudad,
      guia: pedido.guia || '',
      productos: pedido.productos || `${pedido.cantidad || 1}× Tapete Vital`,
    },
    process.env.GHL_WEBHOOK_ENTREGA_URL
  );
}

// Resumen diario de envíos demorados. Uno solo con la lista completa, no uno
// por paquete: la alerta que llega de a una se vuelve ruido y se deja de leer.
export async function correoDemorados(demorados) {
  if (!demorados.length) return { ok: false, skipped: true };
  const filas = demorados
    .map(
      (d) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;"><strong>${d.orden}</strong><br>
          <span style="color:#5F5E5A;font-size:12px;">${d.nombre}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">${d.ciudad}<br>
          <span style="color:#5F5E5A;font-size:12px;">${d.telefono}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:monospace;">${d.guia}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">
          <strong style="color:#b3423a;font-size:16px;">${d.dias}</strong><br>
          <span style="color:#5F5E5A;font-size:12px;">días hábiles</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#5F5E5A;font-size:12px;">${d.evento || '—'}</td>
      </tr>`
    )
    .join('');
  return enviarCorreo({
    to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
    subject: `📦 ${demorados.length} envío${demorados.length > 1 ? 's' : ''} demorado${demorados.length > 1 ? 's' : ''}`,
    html: `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg, #00ae84 0%, #005261 100%);padding:20px 24px;">
      <p style="color:#fff;font-size:18px;margin:0;font-weight:700;text-align:center;">Envíos que llevan demasiado sin llegar</p>
    </div>
    <div style="padding:20px 24px;">
      <p style="font-size:14px;color:#333;margin-top:0;">Interrapidísimo todavía no los reporta entregados. Vale la pena rastrearlos y avisarle al cliente antes de que reclame.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="background:#f8fbf9;">
          <th style="padding:8px 10px;text-align:left;">Pedido</th>
          <th style="padding:8px 10px;text-align:left;">Destino</th>
          <th style="padding:8px 10px;text-align:left;">Guía</th>
          <th style="padding:8px 10px;text-align:center;">Lleva</th>
          <th style="padding:8px 10px;text-align:left;">Último movimiento</th>
        </tr>
        ${filas}
      </table>
    </div>
  </div>`,
  });
}

export async function notificarGHL(datos, url) {
  if (!url) {
    console.error('[ghl] SIN URL DE WEBHOOK — evento NO enviado para', datos.orden);
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    // GHL responde 200 tanto si ejecuta el workflow como si está en Draft y solo
    // registra la petición; la diferencia está en el texto ("request sent to
    // trigger execution server" vs "test request received"). Sin él, un workflow
    // despublicado se ve idéntico a uno funcionando.
    const cuerpo = (await res.text()).slice(0, 200);
    if (!res.ok) console.error('[ghl] GHL respondió', res.status, 'para', datos.orden, cuerpo);
    else console.log('[ghl] Notificado', datos.orden, '→', cuerpo);
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
