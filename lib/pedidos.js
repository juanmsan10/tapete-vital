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
  'email', 'ciudad', 'direccion', 'notas', 'productos', 'guia',
];

const espejo = (promesa) =>
  promesa.catch((err) => console.error('[pedidos] Espejo a la Sheet falló:', err.message));

// La ciudad la escribe el cliente a mano y llegaba de todas las formas:
// "BOGOTA", "Bogota", "BogotÁ" y "Bogotá" eran cuatro ciudades distintas al
// contar o filtrar. Se guarda en una sola forma, con la tilde puesta cuando
// es una ciudad conocida; el resto solo se capitaliza, sin inventar nombres.
const CIUDADES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta',
  'Bucaramanga', 'Ibagué', 'Pereira', 'Manizales', 'Santa Marta', 'Villavicencio',
  'Neiva', 'Popayán', 'Montería', 'Sincelejo', 'Armenia', 'Pasto', 'Valledupar',
  'Tunja', 'Fusagasugá', 'Barrancabermeja', 'Soacha', 'Chía', 'Envigado',
];
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CANONICAS = new Map(CIUDADES.map((c) => [sinTildes(c), c]));
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

export function normalizarCiudad(valor) {
  const limpio = String(valor || '').trim().replace(/\s+/g, ' ');
  if (!limpio) return '';
  const conocida = CANONICAS.get(sinTildes(limpio));
  if (conocida) return conocida;
  return limpio
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && CONECTORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

const alFormatoDeSiempre = (fila) => ({ ...fila, fecha: textoBogota(fila.fecha) });

// Normaliza teléfonos colombianos a E.164 (+57...) para que GHL asocie el
// contacto correcto y el WhatsApp llegue de verdad.
export function telefonoE164(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('57') && digitos.length > 10) return `+${digitos}`;
  return `+57${digitos}`;
}

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

export async function buscarPorGuia(guia) {
  try {
    const [fila] = await sql`SELECT * FROM pedidos WHERE guia = ${String(guia)}`;
    return fila ? alFormatoDeSiempre(fila) : null;
  } catch (err) {
    console.error('[pedidos] Error buscando por guía:', err.message);
    return null;
  }
}

export async function crearPedido(entrada) {
  const datos = { ...entrada, ciudad: normalizarCiudad(entrada.ciudad) };
  const fecha = datos.fecha ? new Date(datos.fecha) : new Date();
  await sql`INSERT INTO pedidos
    (orden, fecha, estado, cantidad, total, nombre, cedula, telefono, email, ciudad, direccion, notas, productos)
    VALUES (${datos.orden}, ${fecha.toISOString()}, ${datos.estado || 'Iniciado'},
            ${datos.cantidad || 1}, ${datos.total}, ${datos.nombre || ''},
            ${String(datos.cedula || '')}, ${String(datos.telefono || '')}, ${datos.email || ''},
            ${datos.ciudad}, ${datos.direccion || ''}, ${datos.notas || ''},
            ${datos.productos || ''})`;
  const pedido = { ...datos, fecha: textoBogota(fecha) };
  espejo(agregarFila(pedido));
  return pedido;
}

export async function actualizarPedido(orden, campos) {
  const limpio = Object.fromEntries(
    Object.entries(campos)
      .filter(([c]) => COLUMNAS.includes(c))
      .map(([c, v]) => [c, c === 'ciudad' ? normalizarCiudad(v) : v])
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
