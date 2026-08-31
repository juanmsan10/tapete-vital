// ============================================================
// One-shot: crea la tabla pedidos en Neon y carga las filas de
// la Google Sheet. ADITIVO e idempotente: ON CONFLICT DO NOTHING,
// la Sheet no se toca. Verifica conteos y suma de totales.
//
//   node --env-file=.env.local scripts/migrar-pedidos.mjs
// ============================================================
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL, GOOGLE_SHEET_URL } = process.env;
if (!DATABASE_URL || !GOOGLE_SHEET_URL) {
  console.error('Faltan DATABASE_URL o GOOGLE_SHEET_URL en .env.local');
  process.exit(1);
}
const sql = neon(DATABASE_URL);

// "24/7/2026, 11:26:32 a. m." (es-CO, America/Bogota, UTC-5 sin DST) → Date
function fechaDesdeTexto(texto) {
  const m = String(texto).match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i
  );
  if (!m) return null;
  const [, d, mon, y, hh, min, s, ap] = m;
  let h = Number(hh) % 12;
  if (/p/i.test(ap)) h += 12;
  return new Date(Date.UTC(+y, +mon - 1, +d, h + 5, +min, +s));
}

const ESTADOS = ['Iniciado', 'Rechazado', 'Aprobado', 'Empacado', 'Enviado', 'Entregado', 'Descartado'];

await sql`CREATE TABLE IF NOT EXISTS pedidos (
  orden      text PRIMARY KEY,
  fecha      timestamptz NOT NULL DEFAULT now(),
  estado     text NOT NULL DEFAULT 'Iniciado'
             CHECK (estado IN ('Iniciado','Rechazado','Aprobado','Empacado','Enviado','Entregado','Descartado')),
  cantidad   integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  total      integer NOT NULL CHECK (total > 0),
  nombre     text NOT NULL DEFAULT '',
  cedula     text NOT NULL DEFAULT '',
  telefono   text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  ciudad     text NOT NULL DEFAULT '',
  direccion  text NOT NULL DEFAULT '',
  notas      text NOT NULL DEFAULT '',
  productos  text NOT NULL DEFAULT ''
)`;
console.log('Tabla lista.');

const res = await fetch(`${GOOGLE_SHEET_URL}?action=read`);
const filas = (await res.json()).filas.filter((p) => String(p.orden || '').trim());
console.log(`Sheet: ${filas.length} filas.`);

let insertadas = 0;
for (const p of filas) {
  const fecha = fechaDesdeTexto(p.fecha);
  const estado = ESTADOS.includes(p.estado) ? p.estado : 'Iniciado';
  if (!fecha) console.warn(`  ⚠ ${p.orden}: fecha ilegible "${p.fecha}", uso now()`);
  const [ins] = await sql`INSERT INTO pedidos
    (orden, fecha, estado, cantidad, total, nombre, cedula, telefono, email, ciudad, direccion, notas, productos)
    VALUES (${p.orden}, ${(fecha || new Date()).toISOString()}, ${estado},
            ${Number(p.cantidad) || 1}, ${Number(p.total)}, ${String(p.nombre || '')},
            ${String(p.cedula || '')}, ${String(p.telefono || '')}, ${String(p.email || '')},
            ${String(p.ciudad || '')}, ${String(p.direccion || '')}, ${String(p.notas || '')},
            ${String(p.productos || '')})
    ON CONFLICT (orden) DO NOTHING
    RETURNING orden`;
  if (ins) insertadas++;
}

// Verificación: conteo y suma de totales en ambos lados
const [{ n, suma }] = await sql`SELECT count(*)::int AS n, sum(total)::bigint AS suma FROM pedidos`;
const sumaSheet = filas.reduce((acc, p) => acc + Number(p.total), 0);
console.log(`Insertadas: ${insertadas}`);
console.log(`Neon:  ${n} filas, suma total ${suma}`);
console.log(`Sheet: ${filas.length} filas, suma total ${sumaSheet}`);
if (Number(n) === filas.length && Number(suma) === sumaSheet) {
  console.log('✅ VERIFICADO: Neon y la Sheet coinciden.');
} else {
  console.error('❌ NO COINCIDEN — revisar antes de apuntar el checkout a Neon.');
  process.exit(1);
}
