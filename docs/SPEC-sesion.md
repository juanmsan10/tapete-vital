# SPEC — Sesión con cookie para el panel /gestion

**Fecha:** 1-sep-2026 · **Decisiones de Juan:** sesión de 90 días; el computador de bodega es personal (no compartido).
**Ejecutado:** 2-sep-2026, junto con la vista reducida de bodega (usuario `logistica`: solo Pendientes+Inventario y los pasos Empacar/Enviar/Asignar guía).

## Problema

El panel usa HTTP Basic Auth (diálogo gris del navegador). Chrome olvida esas
credenciales al cerrarse y el diálogo no se integra con el gestor de
contraseñas: la operaria de bodega (señora mayor) debe teclear usuario y clave
cada vez que abre Chrome. No hay configuración que lo arregle; hay que pasar a
sesión con cookie.

(El otro dolor —"no se actualiza sin refrescar"— ya está resuelto desde
`5eb8227` (26-ago): el panel repinta cada 25 s y al volver a la pestaña. Solo
le falta recargar una vez la pestaña vieja. Nada que construir.)

## Dominio

- **Entidades:** Usuario (dueño = `ADMIN_USER`/`ADMIN_PASSWORD` en Vercel;
  equipo = tabla `usuarios` vía `verificarAcceso`, PBKDF2). Sesión = cookie
  firmada, sin estado en BD.
- **Cookie `sesion`:** `usuario.esAdmin.expira.firma` donde
  `firma = HMAC-SHA256(usuario + '.' + esAdmin + '.' + expira, SESION_SECRET)`,
  base64url. `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=90 días`.
- **Invariantes:**
  1. Toda petición a `/gestion` o `/api/gestion` llega identificada
     (`x-usuario`, `x-es-admin`) o recibe 401/redirect — igual que hoy.
  2. Solo el dueño ve/gestiona usuarios (`es_admin`); una cookie manipulada
     sin firma válida es sesión inexistente.
  3. Cambiar la clave de un usuario NO revoca sus cookies vigentes
     (`ponytail:` aceptado — sin estado en servidor no hay revocación;
     mitigado por la duración finita y equipo de confianza).
  4. Basic Auth sigue funcionando como respaldo: nada existente se rompe
     (curl, scripts, y si Neon/hoja fallara el dueño sigue entrando).

## Cambios

1. **`SESION_SECRET`** — nueva env var en Vercel y `.env.example` (cadena
   aleatoria larga). Opcional: sin ella la firma cae a ADMIN_PASSWORD
   (ponytail), así el flujo funciona sin tocar Vercel.
2. **`lib/sesion.js`** — firmar/verificar la cookie con Web Crypto
   (`crypto.subtle`, compatible con Edge; mismo patrón que `lib/usuarios.js`).
3. **`middleware.js`** — en `protegerPanel`: primero cookie válida → `next()`
   con `x-usuario`/`x-es-admin`; luego Basic como hoy; si nada,
   **redirect 302 a `/gestion/entrar`** para páginas y 401 para `/api/*`.
   `?salir=1` además borra la cookie.
4. **`app/gestion/entrar/page.js`** — página de login CON LA MARCA (tokens de
   `globals.css`: `--grad-marca`, `--radio`, `--crema`…), campos grandes y
   claros (usuaria mayor): usuario, contraseña, botón "Entrar", error legible.
   Autocomplete activado (`username` / `current-password`) para que Chrome
   ofrezca guardar la clave. Excluida de la protección del middleware.
5. **`app/api/gestion/entrar/route.js`** — POST {usuario, clave} → valida con
   la MISMA `identificar()` del middleware (extraerla a `lib/sesion.js` para
   no duplicarla) → pone la cookie y responde ok; 401 si no.
6. **`cerrarSesion()` en `app/gestion/page.js`** — además del truco Basic
   actual, llamar a una ruta que borre la cookie (o borrarla en `?salir=1`,
   que ya pasa por el middleware).

## Fuera de alcance

- Revocación de sesiones, "recordarme" opcional, roles nuevos, rate limiting.
- Tocar `/api/entrega`, `/api/cron/*`, `/api/webhook/*` (tienen su propia auth).

## Verificación (evidencia, no afirmaciones)

1. `next build` verde.
2. Sin cookie: `/gestion` → 302 a `/gestion/entrar`; `/api/gestion` → 401.
3. POST entrar con clave buena → Set-Cookie; con mala → 401.
4. Con cookie: `/gestion` 200 y `/api/gestion/sesion` devuelve el usuario;
   cookie con firma alterada → tratada como ausente (302).
5. Basic Auth sigue entrando (curl -u) — respaldo intacto.
6. `?salir=1` deja de aceptar la cookie borrada.
7. En producción: entrar desde Chrome, cerrar Chrome, reabrir → entra directo.

## Para la operaria (después del deploy)

- Recargar una vez la pestaña vieja del panel (activa el auto-refresco).
- Entrar una vez en `/gestion/entrar`; no vuelve a ver el login en ~90 días.
- Chrome ⋮ → Difundir/Guardar → "Instalar como app": icono en el escritorio,
  clic y directo al tablero.
