// ============================================================
// PRECIOS Y ENVÍOS — FUENTE ÚNICA DE VERDAD
// El servidor SIEMPRE recalcula el total con esta tabla.
// Nunca se confía en montos enviados desde el navegador.
// ============================================================

export const PRECIO_LISTA = 449000;
export const PRECIO_UNITARIO = 299000;
export const PRECIO_UNITARIO_DESCUENTO = 269000;
export const CANTIDAD_MAXIMA = 5;

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
