// ============================================================
// 1. El panel /gestion y /api/gestion SIEMPRE piden credenciales,
//    desde cualquier dominio. Esto va PRIMERO a propósito: antes,
//    la regla de poloatierra.co dejaba pasar todo sin autenticar y
//    exponía los datos de clientes.
// 2. poloatierra.co muestra la tienda en su raíz (rewrite, URL limpia).
// ============================================================
import { NextResponse } from 'next/server';
import { verificarAcceso } from '@/lib/usuarios';

// Dos niveles de acceso, a propósito:
//
// 1. EL DUEÑO — ADMIN_USER / ADMIN_PASSWORD, que viven solo en Vercel.
//    Es el ÚNICO que puede crear, editar y eliminar usuarios. Como no está
//    en la base, nadie puede otorgarse ese poder desde el panel. Y si la
//    base falla, este acceso sigue entrando.
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

const pedirCredenciales = () =>
  new NextResponse('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Gestión"' },
  });

async function protegerPanel(request) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    return new NextResponse('Acceso no configurado (falta ADMIN_USER / ADMIN_PASSWORD)', {
      status: 500,
    });
  }

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    let credenciales;
    try {
      credenciales = atob(auth.slice(6));
    } catch {
      return pedirCredenciales();
    }
    const i = credenciales.indexOf(':');
    if (i > 0) {
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
  }
  return pedirCredenciales();
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // --- El panel va primero y sin excepciones por dominio ---
  const esPanel = pathname.startsWith('/gestion') || pathname.startsWith('/api/gestion');
  if (esPanel) {
    // el favicon del panel debe cargar sin pedir credenciales
    if (pathname === '/gestion/icon.png') return NextResponse.next();
    // "Cerrar sesión": pedir credenciales aunque el navegador reenvíe las
    // que tiene guardadas. Es la única forma de forzar el diálogo de acceso.
    if (request.nextUrl.searchParams.get('salir') === '1') return pedirCredenciales();
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
