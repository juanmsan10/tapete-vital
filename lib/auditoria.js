// ============================================================
// REGISTRO DE ACTIVIDAD — quién hizo qué en el panel.
// Vive en la hoja "Auditoria" de la Sheet.
//
// Nunca debe tumbar ni frenar una operación: se escribe sin
// esperar respuesta, y si falla solo queda en los logs.
// ============================================================
import { leerHoja, agregarFila } from '@/lib/hoja';

const HOJA = 'Auditoria';

/** Quién está haciendo la petición, según lo que firmó el middleware. */
export function usuarioDe(request) {
  return request.headers.get('x-usuario') || 'desconocido';
}

export function registrar({ usuario, accion, objetivo = null, detalle = null }) {
  // Sin await a propósito: escribir en la Sheet tarda ~1s y el equipo no
  // debe esperar por el registro. Devuelve una promesa por si alguien
  // quiere encadenarla, pero nadie está obligado.
  return agregarFila(
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      usuario,
      accion,
      objetivo: objetivo || '',
      detalle: detalle ? JSON.stringify(detalle) : '',
    },
    HOJA
  ).catch((err) => console.error('[auditoria] No se pudo registrar:', err.message));
}

export async function leerActividad({ limite = 200, objetivo = null } = {}) {
  const filas = await leerHoja(HOJA);
  const normalizadas = filas
    .filter((f) => f.usuario)
    .map((f) => ({
      id: f.id,
      creado_en: f.fecha,
      usuario: f.usuario,
      accion: f.accion,
      objetivo: f.objetivo || null,
      detalle: (() => {
        try {
          return f.detalle ? JSON.parse(f.detalle) : null;
        } catch {
          return null;
        }
      })(),
    }));
  const filtradas = objetivo ? normalizadas.filter((a) => a.objetivo === objetivo) : normalizadas;
  return filtradas.reverse().slice(0, limite); // lo más reciente primero
}
