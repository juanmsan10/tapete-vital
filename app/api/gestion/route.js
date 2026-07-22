const SHEET_URL = process.env.GOOGLE_SHEET_URL;

export async function GET() {
  if (!SHEET_URL) {
    return Response.json({ error: 'GOOGLE_SHEET_URL no configurada' }, { status: 500 });
  }
  try {
    const res = await fetch(`${SHEET_URL}?action=read`, { cache: 'no-store' });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('[gestion] Error leyendo sheet:', err);
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
    const res = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...body }),
    });
    const data = await res.text();
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error('[gestion] Error actualizando sheet:', err);
    return Response.json({ error: 'Error actualizando datos' }, { status: 500 });
  }
}
