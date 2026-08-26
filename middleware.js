// ============================================================
// 1. poloatierra.co muestra la tienda directamente (rewrite, URL limpia)
// 2. Protege /gestion y /api/gestion con usuario y contraseña (Basic Auth).
//    Credenciales en ADMIN_USER / ADMIN_PASSWORD (Vercel → Environment Variables).
// ============================================================
import { NextResponse } from 'next/server';

// Cada persona entra con su propio usuario, para saber quién hace qué y poder
// revocar a uno solo sin cambiarle la clave a todo el equipo.
//   ADMIN_USER / ADMIN_PASSWORD  -> el acceso de Juan
//   ACCESOS_EXTRA                -> "usuario:clave,otro:clave" para el resto
function accesoValido(usuario, clave) {
  if (usuario === process.env.ADMIN_USER && clave === process.env.ADMIN_PASSWORD) return true;
  return (process.env.ACCESOS_EXTRA || '')
    .split(',')
    .some((par) => {
      const i = par.indexOf(':');
      if (i < 1) return false;
      return par.slice(0, i).trim() === usuario && par.slice(i + 1).trim() === clave;
    });
}

export function middleware(request) {
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
    const usuario = credenciales.slice(0, i);
    const clave = credenciales.slice(i + 1);
    if (accesoValido(usuario, clave)) {
      return NextResponse.next();
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
