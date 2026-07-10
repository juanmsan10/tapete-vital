# Tapete Vital — Embudo de ventas (Next.js + Vercel)

Embudo completo en un solo dominio: landing → checkout con selector de cantidad →
pago con Bold → página de gracias → correos automáticos + Meta Pixel & Conversions API.

## Estructura

| Ruta | Qué hace |
|---|---|
| `/` | Landing (copy auditado, médicos separados, 6 testimonios, FAQ transaccional) |
| `/comprar` | Selector de paquete (10% dcto en 2+), datos de envío, total en vivo, pago Bold |
| `/gracias` | Confirmación + evento Purchase (navegador, deduplicado con CAPI) |
| `POST /api/bold` | Calcula total server-side, genera firma de integridad, correo "pedido iniciado" |
| `POST /api/webhook/bold` | Confirma pago → correos + Purchase server-side a Meta |

## Setup

1. `npm install`
2. Copia `.env.example` a `.env.local` y llena las variables (ver comentarios en el archivo).
3. `npm run dev` para desarrollo local.

## Checklist de lanzamiento

- [ ] Llaves de Bold (identity + secret) en variables de entorno de Vercel
- [ ] Registrar webhook en el panel de Bold: `https://TU-DOMINIO/api/webhook/bold`
- [ ] Pixel ID + token de Conversions API de Meta
- [ ] Cuenta Resend + dominio verificado (para que los correos no caigan en spam)
- [ ] ID del video VSL de YouTube (`NEXT_PUBLIC_VSL_YOUTUBE_ID`)
- [ ] Compra de prueba real de $1.000 (Bold permite montos de prueba) de punta a punta
- [ ] Verificar en Meta Events Manager que Purchase llega deduplicado (browser + server)
- [ ] Apuntar dominio en Vercel

## Puntos de copy POR CONFIRMAR (Juan)

- Tiempos de entrega reales por transportadora (el FAQ evita prometer días exactos;
  si tienes tiempos confiables, agrégalos en `components/Sections.js` → FAQ).
- Qué incluye exactamente la caja (tapete + cable + ¿algo más?) para agregar
  una pregunta "¿Qué incluye mi pedido?" al FAQ.
- Confirmar medios de pago activos en tu cuenta Bold (el copy dice tarjetas, PSE y Nequi).
- Número de WhatsApp: está el del manual de marca (+57 302 401 9300). Confirmar.

## Notas técnicas

- **Precios y envíos**: única fuente de verdad en `lib/pricing.js`. El servidor SIEMPRE
  recalcula; el navegador solo muestra.
- **Imágenes**: por ahora se usan las del CDN de HighLevel (funcionan públicamente).
  Migrarlas a `/public` cuando se apague GHL.
- **Sin base de datos (v1)**: los datos del pedido viajan en el correo interno
  "pedido iniciado" (que además sirve para recuperar checkouts abandonados por WhatsApp).
  El webhook confirma el pago con el mismo orderId. Cuando el volumen lo pida,
  migrar a Vercel Postgres/KV.
- **Firma Bold**: SHA256(orderId + monto + moneda + secretKey). Verificar contra la
  documentación vigente de Bold antes de lanzar (https://developers.bold.co).
