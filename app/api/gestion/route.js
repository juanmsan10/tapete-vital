import { leerPedidos, correoConfirmacionCompra } from '@/lib/email';

const SHEET_URL = process.env.GOOGLE_SHEET_URL;

// La Sheet tarda ~2s por lectura. Caché en memoria para que abrir el dashboard
// o cambiar de pestaña no dispare una lectura nueva cada vez.
const CACHE_MS = 20_000;
let cache = { data: null, ts: 0 };
const invalidarCache = () => { cache = { data: null, ts: 0 }; };

// Un intento suele bastar; el reintento cubre el fallo transitorio del
// Apps Script que dejaba el dashboard en blanco.
async function leerSheet(intentos = 2) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const res = await fetch(`${SHEET_URL}?action=read`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[gestion] Lectura fallida (intento ${i}/${intentos}):`, err.message);
      if (i === intentos) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}

export async function GET(request) {
  if (!SHEET_URL) {
    return Response.json({ error: 'GOOGLE_SHEET_URL no configurada' }, { status: 500 });
  }
  const forzar = new URL(request.url).searchParams.get('fresh') === '1';
  if (!forzar && cache.data && Date.now() - cache.ts < CACHE_MS) {
    return Response.json(cache.data);
  }
  try {
    const data = await leerSheet();
    cache = { data, ts: Date.now() };
    return Response.json(data);
  } catch (err) {
    // Antes que dejar el dashboard vacío, servir lo último bueno que tengamos
    if (cache.data) {
      console.warn('[gestion] Sirviendo caché tras fallo de lectura');
      return Response.json({ ...cache.data, _cacheado: true });
    }
    return Response.json({ error: 'Error leyendo datos' }, { status: 500 });
  }
}

// Crear pedido manual (ventas cerradas por chat / fuera del embudo)
export async function POST(request) {
  if (!SHEET_URL) {
    return Response.json({ error: 'GOOGLE_SHEET_URL no configurada' }, { status: 500 });
  }
  try {
    const body = await request.json();
    if (!body.nombre || !body.total) {
      return Response.json({ error: 'Faltan nombre o total' }, { status: 400 });
    }
    const orden = 'TV-M' + crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase();
    const fila = {
      fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      orden,
      estado: body.estado || 'Aprobado',
      cantidad: body.cantidad || 1,
      total: body.total,
      nombre: body.nombre,
      telefono: body.telefono || '',
      email: body.email || '',
      ciudad: body.ciudad || '',
      direccion: body.direccion || '',
      notas: body.notas || '',
      productos: body.productos || '',
    };
    const res = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fila),
    });
    const data = await res.text();
    invalidarCache();
    return Response.json({ ok: true, orden, data });
  } catch (err) {
    console.error('[gestion] Error creando pedido:', err);
    return Response.json({ error: 'Error creando pedido' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!SHEET_URL) {
    return Response.json({ error: 'GOOGLE_SHEET_URL no configurada' }, { status: 500 });
  }
  try {
    const res = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteAll' }),
    });
    const data = await res.text();
    invalidarCache();
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error('[gestion] Error borrando datos:', err);
    return Response.json({ error: 'Error borrando datos' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!SHEET_URL) {
    return Response.json({ error: 'GOOGLE_SHEET_URL no configurada' }, { status: 500 });
  }
  try {
    const body = await request.json();

    // "Marcar como aprobado" manual sobre un pedido Iniciado = pago confirmado
    // por fuera del webhook → el cliente aún no tiene su correo de confirmación.
    // Solo en la transición Iniciado→Aprobado (no al "regresar" desde Empacado).
    let confirmarA = null;
    if (body.estado === 'Aprobado' && body.orden) {
      const pedido = (await leerPedidos()).find((p) => p.orden === body.orden);
      if (['Iniciado', 'Rechazado'].includes(pedido?.estado) && pedido.email) confirmarA = pedido;
    }

    const res = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...body }),
    });
    const data = await res.text();
    invalidarCache();

    if (confirmarA) {
      await correoConfirmacionCompra({
        orden: confirmarA.orden,
        email: confirmarA.email,
        total: confirmarA.total,
      });
    }

    return Response.json({ ok: true, data });
  } catch (err) {
    console.error('[gestion] Error actualizando sheet:', err);
    return Response.json({ error: 'Error actualizando datos' }, { status: 500 });
  }
}
