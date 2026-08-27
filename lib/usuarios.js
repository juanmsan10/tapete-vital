// ============================================================
// USUARIOS del panel de gestión (hoja "Usuarios" de la Sheet)
//
// Las contraseñas se guardan cifradas (PBKDF2-SHA256, 100k
// iteraciones, salt por usuario). Ni con la hoja abierta se puede
// leer la clave de alguien: solo verificarla.
//
// Usa Web Crypto para poder correr también en el middleware (Edge).
// ============================================================
import { leerHoja, agregarFila, actualizarFila, borrarFila } from '@/lib/hoja';

const HOJA = 'Usuarios';
const opciones = { hoja: HOJA, clave: 'usuario' };

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

const normalizar = (f) => ({
  usuario: String(f.usuario || '').trim(),
  clave_hash: String(f['clave hash'] ?? f.clave_hash ?? '').trim(),
  salt: String(f.salt || '').trim(),
  creado_en: f['creado en'] ?? f.creado_en ?? '',
  ultimo_acceso: f['ultimo acceso'] ?? f.ultimo_acceso ?? '',
});

async function filas() {
  const datos = await leerHoja(HOJA);
  return datos.map(normalizar).filter((u) => u.usuario);
}

/** Devuelve { usuario } si las credenciales son válidas, o null. */
export async function verificarAcceso(usuario, clave) {
  if (!usuario || !clave) return null;
  try {
    const fila = (await filas()).find((u) => u.usuario === usuario);
    if (!fila || !fila.salt || !fila.clave_hash) return null;
    const hash = await hashearClave(clave, fila.salt);
    if (!igualSeguro(hash, fila.clave_hash)) return null;
    return { usuario: fila.usuario };
  } catch (err) {
    console.error('[usuarios] Error verificando acceso:', err.message);
    return null;
  }
}

export async function listarUsuarios() {
  return (await filas()).map(({ usuario, creado_en, ultimo_acceso }) => ({
    usuario,
    creado_en,
    ultimo_acceso,
  }));
}

export async function crearUsuario({ usuario, clave }) {
  if ((await filas()).some((u) => u.usuario === usuario)) {
    throw new Error('duplicate key: el usuario ya existe');
  }
  const salt = nuevoSalt();
  const clave_hash = await hashearClave(clave, salt);
  await agregarFila(
    {
      usuario,
      'clave hash': clave_hash,
      salt,
      'creado en': new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      'ultimo acceso': '',
    },
    HOJA
  );
  return { usuario };
}

export async function cambiarClave(usuario, clave) {
  const salt = nuevoSalt();
  const clave_hash = await hashearClave(clave, salt);
  await actualizarFila(usuario, { 'clave hash': clave_hash, salt }, opciones);
}

export async function borrarUsuario(usuario) {
  await borrarFila(usuario, opciones);
}

// ponytail: no se registra el último acceso. El navegador reenvía las
// credenciales en cada petición, así que marcarlo costaría una escritura
// en la Sheet por request. Quién entró y qué hizo vive en la hoja Auditoria.
