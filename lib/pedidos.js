// ============================================================
// PEDIDOS — acceso a datos (Postgres en Neon; la Sheet queda
// como espejo de solo lectura para el equipo).
//
// La fecha se guarda timestamptz pero la API sigue entregando
// texto es-CO ("24/8/2026, 6:08:54 a. m."): el panel lo imprime
// y el cron de carritos abandonados lo parsea así.
//
// Cada escritura se refleja en la Sheet fuera del camino crítico
// (fire-and-forget, como la auditoría): si la Sheet falla, nada
// se bloquea y el espejo se corrige en la siguiente escritura.
// ============================================================
import sql from '@/lib/db';
import { agregarFila, actualizarFila } from '@/lib/hoja';

const textoBogota = (valor) =>
  new Date(valor).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

// Columnas editables — lista blanca para el UPDATE dinámico del panel
const COLUMNAS = [
  'estado', 'cantidad', 'total', 'nombre', 'cedula', 'telefono',
  'email', 'ciudad', 'direccion', 'notas', 'productos',
];

const espejo = (promesa) =>
  promesa.catch((err) => console.error('[pedidos] Espejo a la Sheet falló:', err.message));

const alFormatoDeSiempre = (fila) => ({ ...fila, fecha: textoBogota(fila.fecha) });

export async function leerPedidos() {
  try {
    const filas = await sql`SELECT * FROM pedidos ORDER BY fecha`;
    return filas.map(alFormatoDeSiempre);
  } catch (err) {
    console.error('[pedidos] Error leyendo:', err.message);
    return [];
  }
}

export async function buscarPedido(orden) {
  try {
    const [fila] = await sql`SELECT * FROM pedidos WHERE orden = ${orden}`;
    return fila ? alFormatoDeSiempre(fila) : null;
  } catch (err) {
    console.error('[pedidos] Error buscando:', err.message);
    return null;
  }
}

export async function crearPedido(datos) {
  const fecha = datos.fecha ? new Date(datos.fecha) : new Date();
  await sql`INSERT INTO pedidos
    (orden, fecha, estado, cantidad, total, nombre, cedula, telefono, email, ciudad, direccion, notas, productos)
    VALUES (${datos.orden}, ${fecha.toISOString()}, ${datos.estado || 'Iniciado'},
            ${datos.cantidad || 1}, ${datos.total}, ${datos.nombre || ''},
            ${String(datos.cedula || '')}, ${String(datos.telefono || '')}, ${datos.email || ''},
            ${datos.ciudad || ''}, ${datos.direccion || ''}, ${datos.notas || ''},
            ${datos.productos || ''})`;
  const pedido = { ...datos, fecha: textoBogota(fecha) };
  espejo(agregarFila(pedido));
  return pedido;
}

export async function actualizarPedido(orden, campos) {
  const limpio = Object.fromEntries(
    Object.entries(campos).filter(([c]) => COLUMNAS.includes(c))
  );
  const columnas = Object.keys(limpio);
  if (!columnas.length) return { orden };

  const sets = columnas.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const filas = await sql.query(
    `UPDATE pedidos SET ${sets} WHERE orden = $${columnas.length + 1} RETURNING orden`,
    [...Object.values(limpio), orden]
  );
  if (!filas.length) throw new Error(`No encontrado: ${orden}`);
  espejo(actualizarFila(orden, limpio));
  return { orden, ...limpio };
}
