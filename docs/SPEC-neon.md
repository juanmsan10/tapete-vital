# SPEC — Pedidos a Neon (Postgres), Sheet como espejo

**Objetivo:** bajar la espera del checkout de ~3,5 s a ~1,5 s moviendo la escritura
del pedido de la Google Sheet (~2 s, falla a veces) a Postgres (~50 ms), sin perder
la Sheet como vista del equipo ni la recuperación de carritos.

**Decisiones (con Juan, 31-ago-2026):**
- Motor: **Neon** (Postgres serverless, capa gratis, misma región que Vercel).
  Supabase quedó descartado (el cupo gratis se necesita en otro proyecto); Turso
  vetado (incidente BLUUM).
- **Solo la hoja Pedidos migra.** Usuarios y Auditoria siguen en la Sheet
  (poco tráfico, el middleware Edge ya tiene su caché).
- **La Sheet no muere:** queda como espejo de solo lectura (formato rojo de
  Descartados, vistazo rápido del equipo). Cada write a Neon se refleja en la
  Sheet fuera del camino crítico, fire-and-forget con log de error — igual que
  la auditoría. Si la Sheet falla, nada se bloquea.

## Dominio

- Entidad: pedido. Clave: `orden` (texto, único, `TV-XXXXXX` / `TV-MXXXXX`).
- Estados cerrados: Iniciado, Rechazado, Aprobado, Empacado, Enviado, Entregado,
  Descartado. Transiciones libres (el panel las maneja); el webhook solo
  promueve Iniciado→Rechazado y a Aprobado.
- Invariantes como constraints: estado en el enum, total > 0, cantidad > 0,
  orden única. (Regla de la casa: el esquema dispone.)
- `fecha` se guarda `timestamptz`; **la API sigue entregando texto es-CO**
  ("31/8/2026, 10:12:54 a. m.") porque el cron lo parsea y el panel lo imprime.

## Cambios

1. `lib/db.js` — cliente Neon (`@neondatabase/serverless`), única dependencia nueva.
2. `lib/pedidos.js` — misma interfaz (leerPedidos, buscarPedido, crearPedido,
   actualizarPedido), internamente SQL. Espejo a la Sheet tras cada write.
   Campos permitidos en update: lista blanca (columnas de la tabla).
3. `scripts/migrar-pedidos.mjs` — one-shot: DDL + INSERT de las filas de la Sheet
   (parseando fecha es-CO→timestamptz) + verificación de conteos y suma de
   totales en ambos lados. Aditivo e idempotente (ON CONFLICT DO NOTHING).
   La Sheet no se toca.
4. Los 4 consumidores (checkout, webhook, cron, panel) no cambian.

## Verificación (sin pagar nada)

1. Migración: mismo conteo (42) y misma suma de totales Sheet vs Neon.
2. Prod: orden de prueba → aparece en Neon Y en la Sheet (espejo), pasarela abre,
   tiempo medido < 2 s; borrar prueba en ambos lados, verificar conteos.
3. Panel /gestion carga y muestra lo mismo que antes.
4. Cron: GET responde con revisados=42.

## Paso manual de Juan (crear la BD, ~3 min)

Vercel dashboard → proyecto tapete-vital → **Storage** → Create Database →
**Neon** (plan Free) → Connect. Eso deja `DATABASE_URL` en las env del proyecto.
Luego copiar esa misma URL a `.env.local` (archivo, no chat).

## Rollback

`git revert` del commit y todo vuelve a leer/escribir la Sheet, que nunca dejó
de estar al día (espejo). Sin datos que devolver.
