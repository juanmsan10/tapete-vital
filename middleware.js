// ============================================================
// 1. poloatierra.co muestra la tienda directamente (rewrite, URL limpia)
// 2. Protege /gestion y /api/gestion con usuario y contraseña (Basic Auth).
//    Credenciales en ADMIN_USER / ADMIN_PASSWORD (Vercel → Environment Variables).
// ============================================================
import { NextResponse } from 'next/server';

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
  if (!pathname.startsWith('/gestion') && !pathname.startsWith('/api/gestion')) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse('Acceso no configurado (falta ADMIN_USER / ADMIN_PASSWORD)', { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const [u, p] = atob(auth.slice(6)).split(':');
    if (u === user && p === pass) {
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
