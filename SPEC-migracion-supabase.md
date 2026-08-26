# SPEC — Migrar Tapete Vital de Google Sheets a Supabase

**Estado:** listo para ejecutar en sesión fresca
**Escrito:** 2026-08-25 · **Autor de la decisión:** Juan

---

## Por qué

Google Sheets llegó a su techo como base de datos del sistema:

| Síntoma | Medición real |
|---|---|
| Lectura lenta | ~2s por lectura contra el Apps Script |
| Cold starts de Vercel encima | picos de 10–34s, con 500 intermitentes |
| Dashboard en blanco | el fallo se tragaba y renderizaba vacío |
| Equipo desincronizado | 2-3 personas viendo estados distintos |

Los parches aplicados (caché de 20s, reintentos, polling de 25s, avisos) sostienen la operación pero no eliminan la causa: cada lectura sale de una hoja de cálculo a través de un script.

Con Supabase: lecturas ~50ms, sin cuotas de Apps Script, y **Realtime** — cuando alguien mueve un pedido, las pantallas del resto se actualizan solas. Se elimina el caché y el polling.

## Contexto operativo (respondido por Juan)

- **Nadie usa la Sheet como interfaz.** Todo el trabajo pasa por `/gestion`. Juan solo la abre cuando se le pide una acción puntual (añadir columna, borrar fila).
- **2-3 personas** en simultáneo: una gestiona pedidos, otra reactiva carritos abandonados, Juan supervisa.
- **Nada colgando de la Sheet**: sin fórmulas, gráficas, hojas adicionales ni reportes externos.
- Volumen actual: 33 pedidos, ~6 ventas/día en los mejores días.

## Alcance

### Entra
1. Tabla `pedidos` en Supabase (Postgres) con los campos actuales de la Sheet.
2. Reescribir las lecturas/escrituras de `lib/email.js` y `app/api/gestion/route.js`.
3. Migración de los 33 pedidos históricos.
4. Realtime en `/gestion`: quitar polling y caché.
5. Los tres escritores actuales apuntando a Supabase: `/api/bold` (checkout), `/api/webhook/bold` (pago), `/api/cron/carritos-abandonados` (conciliación + recuperación).

### No entra
- Rediseño del dashboard (misma UI).
- Cambios en el flujo de estados o en la lógica de negocio.
- Migrar inventarios si viven fuera de la hoja principal — **verificar en la sesión**.

## Dominio

**Entidad `pedidos`**

| Campo | Tipo | Notas |
|---|---|---|
| `orden` | text, **PK** | `TV-XXXXXX`; hoy se repite por accidente, aquí queda único por constraint |
| `fecha` | timestamptz | hoy es texto es-CO; migrar a timestamp real elimina el parser de fechas |
| `estado` | enum | ver estados cerrados abajo |
| `cantidad` | int | |
| `total` | int | COP, sin decimales |
| `nombre`, `cedula`, `telefono`, `email`, `ciudad`, `direccion`, `notas`, `guia`, `productos` | text | |
| `creado_en` / `actualizado_en` | timestamptz | nuevos; hoy no existe rastro de cuándo cambió un estado |

**Estados (cerrados):** `Iniciado · Rechazado · Aprobado · Empacado · Enviado · Entregado · Descartado`

**Invariantes (como constraints de BD, no como prosa):**
1. `orden` única — hoy hubo duplicados por filas fantasma del Apps Script.
2. `estado` restringido al enum — hoy una fila llegó a tener estado vacío.
3. `total >= 0`, `cantidad >= 1`.
4. `cedula`, si viene, solo dígitos/puntos/guiones (ya validado en el checkout; reforzar en BD).

## Riesgos y guardas

⚠️ **Regla suprema del usuario: nunca operación destructiva sobre producción sin backup verificado.**

1. **Backup primero.** Exportar la Sheet completa a un archivo local con timestamp y **verificar contando filas y estados** antes de tocar nada.
2. **Migración aditiva.** Insertar en Supabase; jamás borrar de la Sheet en esta fase.
3. **La Sheet queda congelada como archivo histórico** (no sincronizada). Recomendación: no mantener espejo con doble escritura — duplica los puntos de fallo y fue justamente la desincronización lo que causó el incidente del 25-ago. Como nadie la usa de interfaz, no aporta nada vivo.
4. **Ventana de corte:** hacerlo en horario de bajo tráfico y con la pauta corriendo, verificar que un checkout de prueba escriba en Supabase antes de dar por cerrada la migración.
5. **Rollback:** si algo falla, revertir el deploy en Vercel devuelve el sistema a la Sheet, que sigue intacta.

## Plan de ejecución

1. Crear proyecto Supabase (plan gratuito; sobra para este volumen).
2. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel y en `.env.local`.
3. Crear tabla + constraints + índice por `estado` y por `fecha`.
4. **Backup verificado** de la Sheet.
5. Script de migración de los 33 pedidos → verificar conteos por estado contra el origen.
6. Reescribir `leerPedidos()` y las rutas de escritura.
7. Realtime en `/gestion`; quitar caché, polling y el parámetro `?fresh=1`.
8. Prueba end-to-end: checkout real de prueba → aparece en el dashboard → avanzar estados → verificar en Supabase.
9. Dejar la Sheet congelada y anotar en memoria que Supabase es la fuente de verdad.

## Criterios de aceptación

- [ ] Carga del dashboard < 300ms
- [ ] Dos navegadores abiertos: un cambio en uno aparece en el otro **sin recargar**
- [ ] Un checkout de prueba escribe en Supabase y se ve en `/gestion`
- [ ] El cron de carritos abandonados lee y concilia contra Supabase
- [ ] Los 33 pedidos migrados, con conteos por estado idénticos al origen
- [ ] Insertar un `orden` duplicado o un estado inválido **falla** por constraint
