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

const alFormatoDeSiempre = (fila) => ({
  ...fila,
  fecha: textoBogota(fila.fecha),
  fecha_envio: fila.fecha_envio ? textoBogota(fila.fecha_envio) : '',
});

// Normaliza a E.164 (+...) para que GHL asocie el contacto correcto y el
// WhatsApp llegue de verdad.
//
// No todos los clientes son colombianos: a un número de Estados Unidos
// ("19178684470") anteponerle +57 lo convierte en un número inexistente y el
// mensaje se pierde sin que nadie se entere (pasó con un pedido el 3-sep-2026).
// Un número suelto de 10 dígitos es local; cualquier cosa más larga ya trae su
// indicativo y se respeta tal cual.
export function telefonoE164(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.length > 10) return `+${digitos}`;
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

// Devuelve TODOS los pedidos de una guía: dos pedidos pueden salir en un
// mismo paquete, y quedarse con el primero dejaba al otro sin confirmar
// para siempre, en silencio.
export async function buscarPorGuia(guia) {
  try {
    const filas = await sql`SELECT * FROM pedidos WHERE guia = ${String(guia)} ORDER BY fecha`;
    return filas.map(alFormatoDeSiempre);
  } catch (err) {
    console.error('[pedidos] Error buscando por guía:', err.message);
    return [];
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

  // La fecha de despacho se sella la primera vez que el pedido llega a
  // "Enviado" y no se vuelve a tocar: si alguien lo devuelve y lo reenvía, la
  // que importa para el cliente es la primera.
  const sets = columnas.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const sello = limpio.estado === 'Enviado' ? ', fecha_envio = COALESCE(fecha_envio, now())' : '';
  const filas = await sql.query(
    `UPDATE pedidos SET ${sets}${sello} WHERE orden = $${columnas.length + 1} RETURNING orden`,
    [...Object.values(limpio), orden]
  );
  if (!filas.length) throw new Error(`No encontrado: ${orden}`);
  espejo(actualizarFila(orden, limpio));
  return { orden, ...limpio };
}
