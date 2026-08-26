// ============================================================
// PEDIDOS — acceso a datos (Supabase / Postgres)
// Reemplaza las lecturas y escrituras que antes iban contra la
// Google Sheet vía Apps Script (~2s por lectura, con cuotas).
// Todo pasa por el servidor con la llave secreta: el navegador
// nunca habla con Supabase, así que los datos de clientes
// (cédula, teléfono, dirección) no quedan expuestos.
// ============================================================

const BASE = (process.env.SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, ''); // tolera que la URL venga con el sufijo
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

const cabeceras = (extra = {}) => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

function configurado() {
  return Boolean(BASE && KEY);
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: cabeceras(opciones.headers),
    cache: 'no-store',
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Supabase ${res.status}: ${detalle.slice(0, 200)}`);
  }
  return res;
}

// La app siempre trabajó con la fecha como texto es-CO ("24/8/2026, 6:08:54 a. m.").
// En la BD vive como timestamptz; se traduce en la frontera para no tocar la UI.
export function aTextoBogota(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}

function salida(fila) {
  const { fecha, creado_en, actualizado_en, ...resto } = fila;
  return { ...resto, fecha: aTextoBogota(fecha) };
}

export async function leerPedidos() {
  if (!configurado()) return [];
  try {
    const res = await pedir('pedidos?select=*&order=fecha.asc');
    return (await res.json()).map(salida);
  } catch (err) {
    console.error('[pedidos] Error leyendo:', err.message);
    return [];
  }
}

export async function crearPedido(datos) {
  if (!configurado()) return null;
  const fila = { ...datos, fecha: datos.fecha || new Date().toISOString() };
  const res = await pedir('pedidos', {
    method: 'POST',
    body: JSON.stringify(fila),
    headers: { Prefer: 'return=representation' },
  });
  const [creado] = await res.json();
  return creado ? salida(creado) : null;
}

export async function actualizarPedido(orden, campos) {
  if (!configurado()) return null;
  const { orden: _ignorar, fecha: _f, ...limpio } = campos;
  const res = await pedir(`pedidos?orden=eq.${encodeURIComponent(orden)}`, {
    method: 'PATCH',
    body: JSON.stringify(limpio),
    headers: { Prefer: 'return=representation' },
  });
  const [actualizado] = await res.json();
  return actualizado ? salida(actualizado) : null;
}

export async function buscarPedido(orden) {
  if (!configurado()) return null;
  try {
    const res = await pedir(`pedidos?orden=eq.${encodeURIComponent(orden)}&select=*&limit=1`);
    const [fila] = await res.json();
    return fila ? salida(fila) : null;
  } catch (err) {
    console.error('[pedidos] Error buscando:', err.message);
    return null;
  }
}
