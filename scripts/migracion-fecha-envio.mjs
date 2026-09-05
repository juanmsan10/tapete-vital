// Agrega pedidos.fecha_envio (aditivo, no toca datos existentes) y la rellena
// para los pedidos ya despachados leyendo la auditoría, que sí guarda cuándo
// cada pedido pasó a "Enviado".
//
// Uso:  node --env-file=.env.local <este archivo>          → solo reporta
//       node --env-file=.env.local <este archivo> --aplicar → escribe
import { neon } from '@neondatabase/serverless';

const APLICAR = process.argv.includes('--aplicar');
const sql = neon(process.env.DATABASE_URL);

// "1/9/2026, 4:22:54 p. m." (es-CO, America/Bogota, UTC-5 sin horario de verano)
function aFecha(texto) {
  const m = String(texto).match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i);
  if (!m) return null;
  const [, d, mon, y, hh, min, s, ap] = m;
  let h = Number(hh) % 12;
  if (/p/i.test(ap)) h += 12;
  return new Date(Date.UTC(+y, +mon - 1, +d, h + 5, +min, +s));
}

const res = await fetch(`${process.env.GOOGLE_SHEET_URL}?action=read&hoja=Auditoria`);
const filas = (await res.json()).filas || [];

// El paso a "Enviado" más reciente de cada pedido
const despachos = new Map();
for (const f of filas) {
  if (f.accion !== 'estado' || !f.objetivo) continue;
  let d;
  try { d = JSON.parse(f.detalle || '{}'); } catch { continue; }
  if (d.a !== 'Enviado') continue;
  const cuando = aFecha(f.fecha);
  if (cuando) despachos.set(f.objetivo, cuando);
}

const pedidos = await sql`SELECT orden, estado, fecha FROM pedidos
  WHERE estado IN ('Enviado','Entregado') ORDER BY fecha`;

const plan = pedidos.map((p) => ({
  orden: p.orden,
  estado: p.estado,
  fecha_envio: despachos.get(p.orden) || null,
  origen: despachos.get(p.orden) ? 'auditoría' : 'SIN DATO',
}));

console.log(`Despachados en la base: ${pedidos.length}`);
console.log(`Con fecha en la auditoría: ${plan.filter((x) => x.fecha_envio).length}`);
console.log(`Sin dato (quedan en null): ${plan.filter((x) => !x.fecha_envio).length}`);
console.table(
  plan.map((x) => ({
    pedido: x.orden,
    estado: x.estado,
    despacho: x.fecha_envio
      ? x.fecha_envio.toLocaleString('es-CO', { timeZone: 'America/Bogota' })
      : '—',
    origen: x.origen,
  }))
);

if (!APLICAR) {
  console.log('\nSolo reporte. Con --aplicar se crea la columna y se escribe.');
  process.exit(0);
}

await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_envio timestamptz`;
console.log('\nColumna fecha_envio lista.');

let escritos = 0;
for (const x of plan) {
  if (!x.fecha_envio) continue;
  await sql`UPDATE pedidos SET fecha_envio = ${x.fecha_envio.toISOString()}
            WHERE orden = ${x.orden} AND fecha_envio IS NULL`;
  escritos++;
}
console.log(`Rellenados: ${escritos}`);

const check = await sql`SELECT count(*) FILTER (WHERE fecha_envio IS NOT NULL) con,
                               count(*) total FROM pedidos WHERE estado IN ('Enviado','Entregado')`;
console.log('Verificación →', check[0]);
