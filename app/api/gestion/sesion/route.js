// Quién está usando el panel: el dashboard lo consulta para saber si
// mostrar la pestaña Usuarios (solo administradores).
export async function GET(request) {
  return Response.json({
    usuario: request.headers.get('x-usuario') || '',
    esAdmin: request.headers.get('x-es-admin') === '1',
  });
}
