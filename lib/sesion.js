// ============================================================
// Sesión del panel /gestion: cookie firmada (HMAC-SHA256) de 90 días,
// para que el equipo no teclee la clave en cada apertura de Chrome
// (la auth Basic se olvida al cerrar el navegador y su diálogo ni
// siquiera habla con el gestor de contraseñas).
//
// Sin estado en el servidor: la firma ES la sesión. Cambiar la clave
// de un usuario no revoca sus cookies vigentes (aceptado: equipo de
// confianza y duración finita). Solo Web Crypto, para correr igual
// en Edge (middleware) y Node (rutas API).
// ============================================================
import { verificarAcceso } from '@/lib/usuarios';

const DIAS_SESION = 90;
const SEGUNDOS_SESION = DIAS_SESION * 24 * 60 * 60;

// ponytail: sin SESION_SECRET la llave cae a ADMIN_PASSWORD, así el flujo
// funciona sin tocar Vercel. Rotar cualquiera de las dos cierra todas las
// sesiones a la vez, que es justo lo que uno quiere al rotarlas.
const secreto = () => process.env.SESION_SECRET || process.env.ADMIN_PASSWORD || '';

const codificador = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function firmar(texto) {
  const llave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(secreto()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', llave, codificador.encode(texto)));
}

// Comparación sin cortocircuito (mismo criterio que lib/usuarios.js)
function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

// El mismo doble nivel de siempre: el dueño vive en las env vars de Vercel
// y es el único admin; el equipo vive en la tabla de usuarios. Lo usan el
// middleware (Basic de respaldo) y POST /api/gestion/entrar.
export async function identificar(usuario, clave) {
  if (
    process.env.ADMIN_USER &&
    usuario === process.env.ADMIN_USER &&
    clave === process.env.ADMIN_PASSWORD
  ) {
    return { usuario, es_admin: true };
  }
  const acceso = await verificarAcceso(usuario, clave);
  return acceso ? { usuario: acceso.usuario, es_admin: false } : null;
}

/** Valor y atributos de la Set-Cookie de una sesión nueva. */
export async function crearCookieSesion({ usuario, es_admin }) {
  const carga = `${encodeURIComponent(usuario)}.${es_admin ? 1 : 0}.${Date.now() + SEGUNDOS_SESION * 1000}`;
  return {
    valor: `${carga}.${await firmar(carga)}`,
    atributos: `Path=/; Max-Age=${SEGUNDOS_SESION}; HttpOnly; Secure; SameSite=Lax`,
  };
}

/** { usuario, es_admin } si la cookie es válida y vigente; null si no. */
export async function leerCookieSesion(valor) {
  if (!valor || !secreto()) return null;
  const partes = valor.split('.');
  if (partes.length !== 4) return null;
  const [usuario, admin, expira, firma] = partes;
  if (!Number(expira) || Number(expira) < Date.now()) return null;
  if (!igualSeguro(firma, await firmar(`${usuario}.${admin}.${expira}`))) return null;
  return { usuario: decodeURIComponent(usuario), es_admin: admin === '1' };
}
