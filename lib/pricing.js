// ============================================================
// PRECIOS Y ENVÍOS — FUENTE ÚNICA DE VERDAD
// El servidor SIEMPRE recalcula el total con esta tabla.
// Nunca se confía en montos enviados desde el navegador.
// ============================================================

export const PRECIO_LISTA = 449000;
export const PRECIO_UNITARIO = 299000;
export const PRECIO_UNITARIO_DESCUENTO = 269000;
export const CANTIDAD_MAXIMA = 5;

// Catálogo completo (tienda y pedidos manuales).
// El descuento por 2+ unidades aplica SOLO al tapete vía embudo.
export const PRODUCTOS = {
  tapete: { nombre: 'Tapete Vital', precio: PRECIO_UNITARIO },
  pad: { nombre: 'Pad Portátil', precio: 199000 },
  parches: { nombre: 'Parches Esenciales', precio: 249000 },
};

// Resumen legible de un carrito: { tapete: 2, pad: 1 } → "2× Tapete Vital, 1× Pad Portátil"
export function resumenProductos(items) {
  return Object.entries(items)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => `${qty}× ${PRODUCTOS[key].nombre}`)
    .join(', ');
}

// Total de un carrito multi-producto (tienda). El envío se cobra por número
// total de unidades sin importar el tipo, con la misma tabla del embudo.
// ponytail: más de 5 unidades paga el envío de 5 (la tabla no llega más lejos).
export function calcularTotalCarrito(items, zona) {
  const zonaValida = zona === 'bogota' ? 'bogota' : 'resto';
  const detalle = {};
  let unidades = 0;
  let subtotal = 0;
  for (const [key, qty] of Object.entries(items || {})) {
    const prod = PRODUCTOS[key];
    const q = Math.min(Math.max(parseInt(qty, 10) || 0, 0), CANTIDAD_MAXIMA);
    if (!prod || q === 0) continue;
    detalle[key] = q;
    unidades += q;
    subtotal += prod.precio * q;
  }
  const envio = unidades > 0 ? ENVIOS[zonaValida][Math.min(unidades, CANTIDAD_MAXIMA)] : 0;
  return { items: detalle, unidades, zona: zonaValida, subtotal, envio, total: subtotal + envio };
}

export const ENVIOS = {
  bogota: { 1: 11000, 2: 14000, 3: 17000, 4: 21000, 5: 24000 },
  resto: { 1: 20000, 2: 27000, 3: 34000, 4: 41000, 5: 48000 },
};

export function precioUnitario(cantidad) {
  return cantidad >= 2 ? PRECIO_UNITARIO_DESCUENTO : PRECIO_UNITARIO;
}

export function calcularTotal(cantidad, zona) {
  const qty = Math.min(Math.max(parseInt(cantidad, 10) || 1, 1), CANTIDAD_MAXIMA);
  const zonaValida = zona === 'bogota' ? 'bogota' : 'resto';
  const subtotal = precioUnitario(qty) * qty;
  const envio = ENVIOS[zonaValida][qty];
  return {
    cantidad: qty,
    zona: zonaValida,
    unitario: precioUnitario(qty),
    subtotal,
    envio,
    total: subtotal + envio,
    ahorro: qty >= 2 ? (PRECIO_UNITARIO - PRECIO_UNITARIO_DESCUENTO) * qty : 0,
  };
}

export function formatoCOP(valor) {
  return '$' + Number(valor).toLocaleString('es-CO');
}
