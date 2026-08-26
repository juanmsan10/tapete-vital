// ============================================================
// USUARIOS del panel de gestión
//
// Las contraseñas se guardan cifradas (PBKDF2-SHA256, 100k
// iteraciones, salt por usuario). Nadie —ni con acceso a la base—
// puede leer la clave de otra persona: solo se puede verificar.
//
// Usa Web Crypto para poder correr también en el middleware (Edge).
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

const aHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export function nuevoSalt() {
  return aHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashearClave(clave, salt) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    material,
    256
  );
  return aHex(bits);
}

// Comparación en tiempo constante: no revela nada por cuánto tarda
function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: cabeceras(opciones.headers),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return res;
}

/** Devuelve { usuario, es_admin } si las credenciales son válidas, o null. */
export async function verificarAcceso(usuario, clave) {
  if (!BASE || !KEY || !usuario || !clave) return null;
  try {
    const res = await pedir(
      `usuarios?usuario=eq.${encodeURIComponent(usuario)}&select=usuario,clave_hash,salt,es_admin&limit=1`
    );
    const [fila] = await res.json();
    if (!fila) return null;
    const hash = await hashearClave(clave, fila.salt);
    if (!igualSeguro(hash, fila.clave_hash)) return null;
    return { usuario: fila.usuario, es_admin: fila.es_admin };
  } catch (err) {
    console.error('[usuarios] Error verificando acceso:', err.message);
    return null;
  }
}

export async function listarUsuarios() {
  const res = await pedir('usuarios?select=usuario,es_admin,creado_en,ultimo_acceso&order=creado_en.asc');
  return res.json();
}

export async function crearUsuario({ usuario, clave, es_admin = false }) {
  const salt = nuevoSalt();
  const clave_hash = await hashearClave(clave, salt);
  await pedir('usuarios', {
    method: 'POST',
    body: JSON.stringify({ usuario, clave_hash, salt, es_admin }),
  });
  return { usuario, es_admin };
}

export async function cambiarClave(usuario, clave) {
  const salt = nuevoSalt();
  const clave_hash = await hashearClave(clave, salt);
  await pedir(`usuarios?usuario=eq.${encodeURIComponent(usuario)}`, {
    method: 'PATCH',
    body: JSON.stringify({ clave_hash, salt }),
  });
}

export async function cambiarRol(usuario, es_admin) {
  await pedir(`usuarios?usuario=eq.${encodeURIComponent(usuario)}`, {
    method: 'PATCH',
    body: JSON.stringify({ es_admin }),
  });
}

export async function borrarUsuario(usuario) {
  await pedir(`usuarios?usuario=eq.${encodeURIComponent(usuario)}`, { method: 'DELETE' });
}

export async function marcarAcceso(usuario) {
  try {
    await pedir(`usuarios?usuario=eq.${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      body: JSON.stringify({ ultimo_acceso: new Date().toISOString() }),
    });
  } catch {
    /* no bloquear el acceso por no poder registrar la fecha */
  }
}
