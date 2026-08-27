// ============================================================
// PEDIDOS — acceso a datos (Google Sheet, hoja principal)
//
// La fecha se guarda como texto es-CO ("24/8/2026, 6:08:54 a. m."),
// que es lo que el panel y el cron esperan; crearPedido acepta ISO
// y lo convierte al escribir.
// ============================================================
import { leerHoja, agregarFila, actualizarFila } from '@/lib/hoja';

const textoBogota = (valor) =>
  new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

export async function leerPedidos({ fresco = false } = {}) {
  try {
    const filas = await leerHoja(null, { fresco });
    return filas.filter((p) => String(p.orden || '').trim());
  } catch (err) {
    console.error('[pedidos] Error leyendo:', err.message);
    return [];
  }
}

export async function buscarPedido(orden) {
  const pedidos = await leerPedidos();
  return pedidos.find((p) => p.orden === orden) || null;
}

export async function crearPedido(datos) {
  const fecha = datos.fecha ? textoBogota(datos.fecha) : textoBogota(Date.now());
  await agregarFila({ ...datos, fecha });
  return { ...datos, fecha };
}

export async function actualizarPedido(orden, campos) {
  const { orden: _o, fecha: _f, ...limpio } = campos;
  await actualizarFila(orden, limpio);
  return { orden, ...limpio };
}
