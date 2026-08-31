// ============================================================
// Cliente Postgres (Neon). Una sola conexión HTTP por consulta,
// pensado para funciones serverless: sin pool que administrar.
// ============================================================
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export default sql;
