// ============================================================
// 1. El panel /gestion y /api/gestion SIEMPRE piden credenciales,
//    desde cualquier dominio. Esto va PRIMERO a propósito: antes,
//    la regla de poloatierra.co dejaba pasar todo sin autenticar y
//    exponía los datos de clientes.
// 2. poloatierra.co muestra la tienda en su raíz (rewrite, URL limpia).
// ============================================================
import { NextResponse } from 'next/server';
import { identificar, leerCookieSesion } from '@/lib/sesion';

// La identidad (dueño por env vars, equipo por tabla de usuarios) vive en
// lib/sesion.js: la comparten este middleware y POST /api/gestion/entrar.

// Quién entró viaja al servidor: las rutas de usuarios lo usan para
// exigir permiso de administrador.
const conIdentidad = (request, identidad) => {
  const cabeceras = new Headers(request.headers);
  cabeceras.set('x-usuario', identidad.usuario);
  cabeceras.set('x-es-admin', identidad.es_admin ? '1' : '0');
  return NextResponse.next({ request: { headers: cabeceras } });
};

async function protegerPanel(request) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return new NextResponse('Acceso no configurado (falta ADMIN_USER / ADMIN_PASSWORD)', {
      status: 500,
    });
  }

  // 1. La cookie de sesión (el camino normal desde la página de entrada)
  const sesion = await leerCookieSesion(request.cookies.get('sesion')?.value);
  if (sesion) return conIdentidad(request, sesion);

  // 2. Basic de respaldo: curl, scripts, y si Neon/hoja fallara el dueño
  //    sigue entrando con -u. Solo se acepta si viene; ya no se solicita
  //    (sin WWW-Authenticate no existe el diálogo gris del navegador).
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    let credenciales = '';
    try {
      credenciales = atob(auth.slice(6));
    } catch {}
    const i = credenciales.indexOf(':');
    if (i > 0) {
      const identidad = await identificar(credenciales.slice(0, i), credenciales.slice(i + 1));
      if (identidad) return conIdentidad(request, identidad);
    }
  }

  // 3. Nada válido: las páginas van a la puerta; la API responde 401 pelado
  //    (si saliera el diálogo gris aquí, el polling del panel lo dispararía).
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/gestion/entrar', request.url));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // --- El panel va primero y sin excepciones por dominio ---
  const esPanel = pathname.startsWith('/gestion') || pathname.startsWith('/api/gestion');
  if (esPanel) {
    // el favicon del panel debe cargar sin pedir credenciales
    if (pathname === '/gestion/icon.png') return NextResponse.next();
    // La puerta queda fuera de la protección; con sesión vigente, sobra.
    if (pathname === '/gestion/entrar' || pathname === '/api/gestion/entrar') {
      if (
        pathname === '/gestion/entrar' &&
        (await leerCookieSesion(request.cookies.get('sesion')?.value))
      ) {
        return NextResponse.redirect(new URL('/gestion', request.url));
      }
      return NextResponse.next();
    }
    // "Cerrar sesión": borrar la cookie y volver a la puerta.
    if (request.nextUrl.searchParams.get('salir') === '1') {
      const res = NextResponse.redirect(new URL('/gestion/entrar', request.url));
      res.cookies.delete('sesion');
      return res;
    }
    return protegerPanel(request);
  }

  // --- Dominio de la tienda: poloatierra.co → /tienda ---
  const host = request.headers.get('host') || '';
  if (host.includes('poloatierra.co') && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/tienda';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/gestion/:path*', '/api/gestion/:path*'],
};
