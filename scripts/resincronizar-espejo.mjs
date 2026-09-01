// ============================================================
// Repara el espejo de la Google Sheet contra Neon, que es la fuente
// de verdad. CORRECTIVO e idempotente: solo pisa las celdas que
// difieren, no borra filas y no toca Neon jamás.
//
// Hace falta porque el espejo es fire-and-forget: cuando una escritura
// falla, esa fila se queda con el dato viejo para siempre (el "se
// corrige en la siguiente escritura" de lib/pedidos.js solo vale si
// el pedido vuelve a cambiar). Así se acumularon 14 filas desviadas
// mientras la validación de la hoja rechazaba Empacado y Entregado.
//
// Escribe por lib/hoja.js, el mismo camino que usa la app: así hereda
// el escape de fórmulas (un teléfono "+57..." que se mande crudo lo
// evalúa la hoja y se pierde el +) y el chequeo de respuesta.
//
//   node --env-file=.env.local scripts/resincronizar-espejo.mjs            # solo reporta
//   node --env-file=.env.local scripts/resincronizar-espejo.mjs --aplicar  # escribe
//
// Node avisa MODULE_TYPELESS_PACKAGE_JSON al importar lib/hoja.js (el
// package.json no declara "type":"module" porque de eso se encarga Next).
// Es ruido, no un error.
// ============================================================
import { neon } from '@neondatabase/serverless';
import { leerHoja, actualizarFila } from '../lib/hoja.js';

const { DATABASE_URL, GOOGLE_SHEET_URL } = process.env;
if (!DATABASE_URL || !GOOGLE_SHEET_URL) {
  console.error('Faltan DATABASE_URL o GOOGLE_SHEET_URL en .env.local');
  process.exit(1);
}
const sql = neon(DATABASE_URL);
const aplicar = process.argv.includes('--aplicar');

// Las mismas columnas que espeja lib/pedidos.js. 'fecha' queda fuera a
// propósito: en la hoja es texto es-CO y en Neon timestamptz, y compararlas
// solo produciría diferencias falsas.
const COLUMNAS = [
  'estado', 'cantidad', 'total', 'nombre', 'cedula', 'telefono',
  'email', 'ciudad', 'direccion', 'notas', 'productos', 'guia',
];

const texto = (v) => String(v ?? '').trim();

const filasPorOrden = async () =>
  new Map(
    (await leerHoja(null, { fresco: true }))
      .filter((f) => texto(f.orden))
      .map((f) => [texto(f.orden), f])
  );

const compararContra = (hoja) =>
  pedidos.flatMap((p) => {
    const fila = hoja.get(texto(p.orden));
    if (!fila) return [];
    const campos = Object.fromEntries(
      COLUMNAS.filter((c) => texto(fila[c]) !== texto(p[c])).map((c) => [c, p[c] ?? ''])
    );
    return Object.keys(campos).length ? [{ orden: texto(p.orden), fila, campos }] : [];
  });

const pedidos = await sql`SELECT * FROM pedidos ORDER BY fecha`;
const hoja = await filasPorOrden();
console.log(`Neon: ${pedidos.length} pedidos | Sheet: ${hoja.size} filas con orden\n`);

const desviadas = compararContra(hoja);
for (const { orden, fila, campos } of desviadas) {
  const detalle = Object.keys(campos)
    .map((c) => `${c}: "${texto(fila[c])}" -> "${texto(campos[c])}"`)
    .join(', ');
  console.log(`  ${orden}  ${detalle}`);
}
console.log(`\nFilas desviadas: ${desviadas.length}`);

const sinFila = pedidos.filter((p) => !hoja.has(texto(p.orden))).map((p) => texto(p.orden));
if (sinFila.length) console.log(`Pedidos sin fila en la hoja (NO se crean aquí): ${sinFila.join(', ')}`);

if (!desviadas.length) { console.log('✅ El espejo ya coincide con Neon.'); process.exit(0); }
if (!aplicar) { console.log('\nSolo reporte. Repetir con --aplicar para escribir.'); process.exit(0); }

console.log('\nEscribiendo...');
const fallidas = [];
for (const { orden, campos } of desviadas) {
  try {
    await actualizarFila(orden, campos);
    console.log(`  ✓ ${orden}`);
  } catch (err) {
    fallidas.push(orden);
    console.error(`  ❌ ${orden}: ${err.message}`);
  }
}

// Verificación: releer la hoja y confirmar que ya no queda diferencia
const quedan = compararContra(await filasPorOrden());
console.log(`\nEscrituras fallidas: ${fallidas.length} | Filas aún desviadas: ${quedan.length}`);
if (fallidas.length || quedan.length) {
  console.error('❌ El espejo NO quedó al día:', quedan.map((d) => d.orden).join(', '));
  process.exit(1);
}
console.log('✅ VERIFICADO: la Sheet coincide con Neon en todas las columnas espejadas.');
