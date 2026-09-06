// ============================================================
// Añade pedidos.preguntado (timestamptz): cuándo se le preguntó al cliente
// si recibió su envío.
//
// Sin esta marca, consultar el estado en 17track cada 30 minutos le
// reenviaría el WhatsApp a todo el que no haya tocado el botón, porque su
// pedido sigue en "Enviado". También hace idempotente el webhook si 17track
// reenvía un push.
//
// Aditiva y repetible (IF NOT EXISTS). Verifica que no se pierda ninguna fila.
//   node --env-file=.env.local scripts/migracion-preguntado.mjs
// ============================================================
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const [{ n: antes }] = await sql`SELECT count(*)::int n FROM pedidos`;
console.log('Filas antes:', antes);

await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS preguntado timestamptz`;

const [col] = await sql`SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'pedidos' AND column_name = 'preguntado'`;
const [{ n: despues }] = await sql`SELECT count(*)::int n FROM pedidos`;

// Relleno: los pedidos que ya estaban en "Enviado" con su paquete entregado
// son anteriores a esta marca. Se dan por preguntados para que la primera
// consulta del cron no le reenvíe el WhatsApp a gente que Juan ya venía
// atendiendo a mano. Los que aún van en camino se quedan sin marca, que es lo
// correcto: su pregunta todavía no ha salido.
const YA_ATENDIDOS = ['TV-7B6CE9', 'TV-B0CC1E']; // Lisa y Juliana, entregados según Inter
const marcados = await sql`UPDATE pedidos SET preguntado = now()
  WHERE orden = ANY(${YA_ATENDIDOS}) AND preguntado IS NULL
  RETURNING orden, nombre`;
console.log('Marcados como ya preguntados:', marcados.length ? marcados.map((m) => m.orden).join(', ') : 'ninguno (ya lo estaban)');

console.log('Columna:', col ? `${col.column_name} (${col.data_type})` : 'NO SE CREÓ');
console.log('Filas después:', despues, antes === despues ? '— sin pérdida ✓' : '— ¡CAMBIÓ!');
if (!col || antes !== despues) process.exit(1);
