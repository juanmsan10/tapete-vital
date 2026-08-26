// ============================================================
// Administración de usuarios del panel. SOLO para administradores:
// el middleware ya validó las credenciales y firma quién entró en
// las cabeceras x-usuario / x-es-admin.
// ============================================================
import { listarUsuarios, crearUsuario, cambiarClave, borrarUsuario } from '@/lib/usuarios';
import { registrar } from '@/lib/auditoria';

const CLAVE_MINIMA = 8;

function quien(request) {
  return {
    usuario: request.headers.get('x-usuario') || '',
    esAdmin: request.headers.get('x-es-admin') === '1',
  };
}

// Solo el dueño (credenciales de Vercel) administra usuarios
const noAutorizado = () =>
  Response.json({ error: 'Solo el administrador del sistema puede gestionar usuarios' }, { status: 403 });

export async function GET(request) {
  const { esAdmin } = quien(request);
  if (!esAdmin) return noAutorizado();
  try {
    return Response.json({ usuarios: await listarUsuarios() });
  } catch (err) {
    console.error('[usuarios] Error listando:', err);
    return Response.json({ error: 'Error leyendo usuarios' }, { status: 500 });
  }
}

export async function POST(request) {
  const { esAdmin } = quien(request);
  if (!esAdmin) return noAutorizado();
  try {
    const { usuario, clave } = await request.json();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario || '')) {
      return Response.json(
        { error: 'El usuario debe tener 3-30 caracteres: minúsculas, números, punto, guion o guion bajo.' },
        { status: 400 }
      );
    }
    if (!clave || clave.length < CLAVE_MINIMA) {
      return Response.json(
        { error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` },
        { status: 400 }
      );
    }
    await crearUsuario({ usuario, clave });
    await registrar({ usuario: quien(request).usuario, accion: 'usuario_crear', objetivo: usuario });
    return Response.json({ ok: true, usuario });
  } catch (err) {
    const duplicado = /duplicate key|23505/.test(err.message);
    console.error('[usuarios] Error creando:', err.message);
    return Response.json(
      { error: duplicado ? 'Ya existe un usuario con ese nombre' : 'Error creando el usuario' },
      { status: duplicado ? 409 : 500 }
    );
  }
}

export async function PUT(request) {
  const { esAdmin } = quien(request);
  if (!esAdmin) return noAutorizado();
  try {
    const { usuario, clave } = await request.json();
    if (!usuario) return Response.json({ error: 'Falta el usuario' }, { status: 400 });

    if (clave !== undefined) {
      if (!clave || clave.length < CLAVE_MINIMA) {
        return Response.json(
          { error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` },
          { status: 400 }
        );
      }
      await cambiarClave(usuario, clave);
      await registrar({ usuario: quien(request).usuario, accion: 'usuario_clave', objetivo: usuario });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[usuarios] Error actualizando:', err);
    return Response.json({ error: 'Error actualizando el usuario' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { esAdmin, usuario: yo } = quien(request);
  if (!esAdmin) return noAutorizado();
  try {
    const { usuario } = await request.json();
    if (!usuario) return Response.json({ error: 'Falta el usuario' }, { status: 400 });
    if (usuario === yo) {
      return Response.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
    }
    await borrarUsuario(usuario);
    await registrar({ usuario: yo, accion: 'usuario_eliminar', objetivo: usuario });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[usuarios] Error borrando:', err);
    return Response.json({ error: 'Error eliminando el usuario' }, { status: 500 });
  }
}
