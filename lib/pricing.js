// ============================================================
// PRECIOS Y ENVÍOS — FUENTE ÚNICA DE VERDAD
// El servidor SIEMPRE recalcula el total con esta tabla.
// Nunca se confía en montos enviados desde el navegador.
// ============================================================

// ponytail: precios temporales para prueba de pago — revertir después
export const PRECIO_LISTA = 3000;
export const PRECIO_UNITARIO = 1500;
export const PRECIO_UNITARIO_DESCUENTO = 1350;
export const CANTIDAD_MAXIMA = 5;

export const ENVIOS = {
  bogota: { 1: 500, 2: 500, 3: 500, 4: 500, 5: 500 },
  resto: { 1: 500, 2: 500, 3: 500, 4: 500, 5: 500 },
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
