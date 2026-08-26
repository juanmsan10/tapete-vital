// ============================================================
// REGISTRO DE ACTIVIDAD — quién hizo qué en el panel.
// Pensado para investigar después ("¿quién descartó este pedido?").
//
// Nunca debe tumbar una operación: si el registro falla, la acción
// del usuario sigue adelante y el error solo queda en los logs.
// ============================================================

const BASE = (process.env.SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

const cabeceras = (extra = {}) => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

/** Quién está haciendo la petición, según lo que firmó el middleware. */
export function usuarioDe(request) {
  return request.headers.get('x-usuario') || 'desconocido';
}

export async function registrar({ usuario, accion, objetivo = null, detalle = null }) {
  if (!BASE || !KEY) return;
  try {
    await fetch(`${BASE}/rest/v1/auditoria`, {
      method: 'POST',
      headers: cabeceras({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ usuario, accion, objetivo, detalle }),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[auditoria] No se pudo registrar:', err.message);
  }
}

export async function leerActividad({ limite = 200, objetivo = null } = {}) {
  if (!BASE || !KEY) return [];
  const filtro = objetivo ? `&objetivo=eq.${encodeURIComponent(objetivo)}` : '';
  const res = await fetch(
    `${BASE}/rest/v1/auditoria?select=*&order=creado_en.desc&limit=${limite}${filtro}`,
    { headers: cabeceras(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}
