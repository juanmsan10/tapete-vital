// Registro de actividad del panel. Solo el administrador puede consultarlo:
// contiene quién tocó qué y datos de pedidos.
import { leerActividad } from '@/lib/auditoria';

export async function GET(request) {
  if (request.headers.get('x-es-admin') !== '1') {
    return Response.json({ error: 'Solo el administrador puede ver la actividad' }, { status: 403 });
  }
  try {
    const objetivo = new URL(request.url).searchParams.get('objetivo');
    return Response.json({ actividad: await leerActividad({ objetivo, limite: 300 }) });
  } catch (err) {
    console.error('[actividad] Error leyendo:', err);
    return Response.json({ error: 'Error leyendo la actividad' }, { status: 500 });
  }
}
