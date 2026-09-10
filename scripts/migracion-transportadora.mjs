// ============================================================
// Añade pedidos.transportadora ('inter' | 'mensajero').
//
// Hasta ahora el número de guía era lo único que distinguía un pedido
// "por despachar" de uno "por confirmar". Con mensajero propio no hay guía,
// así que hacía falta un dato explícito que diga cómo salió el pedido.
//
// Los pedidos anteriores salieron todos por Interrapidísimo: se rellenan como
// 'inter' para que no queden atascados en "Asignar guía" ni cambien de pestaña.
//
// Aditiva y repetible.  node --env-file=.env.local scripts/migracion-transportadora.mjs
// ============================================================
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const [{ n: antes }] = await sql`SELECT count(*)::int n FROM pedidos`;
console.log('Filas antes:', antes);

await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS transportadora text`;
const rellenados = await sql`UPDATE pedidos SET transportadora = 'inter'
  WHERE transportadora IS NULL RETURNING orden`;

const [col] = await sql`SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'pedidos' AND column_name = 'transportadora'`;
const [{ n: despues }] = await sql`SELECT count(*)::int n FROM pedidos`;
const reparto = await sql`SELECT coalesce(transportadora,'(nulo)') t, count(*)::int n
  FROM pedidos GROUP BY 1 ORDER BY 2 DESC`;

console.log('Columna:', col ? `${col.column_name} (${col.data_type})` : 'NO SE CREÓ');
console.log('Rellenados como inter:', rellenados.length);
console.table(reparto);
console.log('Filas después:', despues, antes === despues ? '— sin pérdida ✓' : '— ¡CAMBIÓ!');
if (!col || antes !== despues) process.exit(1);
