// ============================================================
// 1. poloatierra.co muestra la tienda directamente (rewrite, URL limpia)
// 2. Protege /gestion y /api/gestion con usuario y contraseña (Basic Auth).
//    Credenciales en ADMIN_USER / ADMIN_PASSWORD (Vercel → Environment Variables).
// ============================================================
import { NextResponse } from 'next/server';
import { verificarAcceso } from '@/lib/usuarios';

// Dos niveles de acceso, a propósito:
//
// 1. EL DUEÑO — ADMIN_USER / ADMIN_PASSWORD, que viven solo en Vercel.
//    Es el ÚNICO que puede crear, editar y eliminar usuarios. Como no está
//    en la base, nadie puede otorgarse ese poder desde el panel, ni por
//    error ni a propósito. Y si la base falla, este acceso sigue entrando.
//
// 2. EL EQUIPO — usuarios de la tabla `usuarios`, con contraseña cifrada.
//    Usan el panel de pedidos; jamás pueden tocar usuarios.
async function identificar(usuario, clave) {
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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Dominio de la tienda: poloatierra.co → /tienda
  const host = request.headers.get('host') || '';
  if (host.includes('poloatierra.co')) {
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/tienda';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // El resto del middleware solo aplica al panel de gestión
  // (el favicon de esa ruta debe cargar sin pedir credenciales)
  if (
    pathname === '/gestion/icon.png' ||
    (!pathname.startsWith('/gestion') && !pathname.startsWith('/api/gestion'))
  ) {
    return NextResponse.next();
  }

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return new NextResponse('Acceso no configurado (falta ADMIN_USER / ADMIN_PASSWORD)', { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const credenciales = atob(auth.slice(6));
    const i = credenciales.indexOf(':');
    const identidad = await identificar(credenciales.slice(0, i), credenciales.slice(i + 1));
    if (identidad) {
      // Quién entró viaja al servidor: las rutas de usuarios lo usan para
      // exigir permiso de administrador.
      const cabeceras = new Headers(request.headers);
      cabeceras.set('x-usuario', identidad.usuario);
      cabeceras.set('x-es-admin', identidad.es_admin ? '1' : '0');
      return NextResponse.next({ request: { headers: cabeceras } });
    }
  }

  return new NextResponse('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Gestión"' },
  });
}

export const config = {
  matcher: ['/', '/gestion/:path*', '/api/gestion/:path*'],
};
