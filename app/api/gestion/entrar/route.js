// ============================================================
// POST /api/gestion/entrar — valida usuario y clave, y deja la
// cookie de sesión de 90 días. Es la única ruta de /api/gestion
// que el middleware deja pasar sin autenticar: es la puerta.
// ============================================================
import { identificar, crearCookieSesion } from '@/lib/sesion';

export async function POST(request) {
  const { usuario, clave } = await request.json().catch(() => ({}));
  const identidad = await identificar(String(usuario || '').trim(), String(clave || ''));
  if (!identidad) {
    return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }
  const { valor, atributos } = await crearCookieSesion(identidad);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `sesion=${valor}; ${atributos}`,
    },
  });
}
