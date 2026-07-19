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
