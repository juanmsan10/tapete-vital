'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { PRODUCTOS, calcularTotalCarrito, resumenProductos, formatoCOP, CANTIDAD_MAXIMA } from '@/lib/pricing';

const DESCRIPCIONES = {
  tapete: 'El original. Terapia de grounding en casa mientras duermes o descansas.',
  pad: 'Llévalo contigo: para el escritorio, el sofá o de viaje.',
  parches: 'Aplicación localizada para zonas de molestia puntual.',
};

export default function TiendaCheckout() {
  const [items, setItems] = useState({ tapete: 0, pad: 0, parches: 0 });
  const [zona, setZona] = useState('bogota');
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    ciudad: '',
    direccion: '',
    notas: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ordenLista, setOrdenLista] = useState(null);
  const boldRef = useRef(null);

  const totales = useMemo(() => calcularTotalCarrito(items, zona), [items, zona]);

  // Cambios en carrito/zona/datos invalidan la orden generada (el monto cambió)
  useEffect(() => {
    setOrdenLista(null);
    if (boldRef.current) boldRef.current.innerHTML = '';
  }, [items, zona]);

  function setItem(key, delta) {
    setItems((prev) => ({
      ...prev,
      [key]: Math.min(Math.max((prev[key] || 0) + delta, 0), CANTIDAD_MAXIMA),
    }));
  }

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setOrdenLista(null);
    if (boldRef.current) boldRef.current.innerHTML = '';
  }

  function montarBotonBold({ apiKey, orderId, amount, currency, integrity, redirectUrl }) {
    if (!boldRef.current) return;
    boldRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    script.setAttribute('data-bold-button', 'dark-L');
    script.setAttribute('data-api-key', apiKey);
    script.setAttribute('data-order-id', orderId);
    script.setAttribute('data-amount', amount);
    script.setAttribute('data-currency', currency);
    script.setAttribute('data-integrity-signature', integrity);
    script.setAttribute('data-redirection-url', redirectUrl);
    script.setAttribute('data-description', `${resumenProductos(items)} — Polo a Tierra`);
    script.setAttribute(
      'data-customer-data',
      JSON.stringify({
        email: form.email || undefined,
        fullName: form.nombre,
        phone: form.telefono,
      })
    );
    boldRef.current.appendChild(script);
  }

  async function continuarAlPago(e) {
    e.preventDefault();
    setError('');

    if (totales.unidades === 0) {
      setError('Agrega al menos un producto al carrito.');
      return;
    }
    if (!form.nombre.trim() || !form.cedula.trim() || !form.telefono.trim() || !form.ciudad.trim() || !form.direccion.trim()) {
      setError('Completa los campos obligatorios: nombre, cédula/NIT, teléfono, ciudad y dirección.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/bold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, zona, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No pudimos generar tu orden.');
      setOrdenLista(data.orderId);
      montarBotonBold(data);
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Inténtalo de nuevo o escríbenos por WhatsApp.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="checkout-grid">
      {/* -------- Columna izquierda: productos + datos -------- */}
      <div>
        <div className="tarjeta">
          <h3>1. Elige tus productos</h3>
          <div className="tienda-productos">
            {Object.entries(PRODUCTOS).map(([key, prod]) => (
              <div key={key} className={`tienda-prod ${items[key] > 0 ? 'activo' : ''}`}>
                <div className="tienda-prod-info">
                  <div className="tienda-prod-nombre">{prod.nombre}</div>
                  <div className="tienda-prod-desc">{DESCRIPCIONES[key]}</div>
                  <div className="tienda-prod-precio">{formatoCOP(prod.precio)}</div>
                </div>
                <div className="tienda-prod-qty" role="group" aria-label={`Cantidad de ${prod.nombre}`}>
                  <button type="button" aria-label={`Quitar ${prod.nombre}`} onClick={() => setItem(key, -1)} disabled={!items[key]}>−</button>
                  <span aria-live="polite">{items[key]}</span>
                  <button type="button" aria-label={`Agregar ${prod.nombre}`} onClick={() => setItem(key, 1)} disabled={items[key] >= CANTIDAD_MAXIMA}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form className="tarjeta" style={{ marginTop: 20 }} onSubmit={continuarAlPago}>
          <h3>2. Datos de envío</h3>
          {error && <div className="error-msg" role="alert">{error}</div>}
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="nombre">Nombre completo *</label>
              <input id="nombre" value={form.nombre} onChange={(e) => actualizar('nombre', e.target.value)} autoComplete="name" />
            </div>
            <div className="campo">
              <label htmlFor="cedula">Cédula / NIT *</label>
              <input id="cedula" value={form.cedula} onChange={(e) => actualizar('cedula', e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="telefono">Teléfono / WhatsApp *</label>
              <input id="telefono" type="tel" value={form.telefono} onChange={(e) => actualizar('telefono', e.target.value)} autoComplete="tel" placeholder="300 000 0000" />
            </div>
            <div className="campo">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" value={form.email} onChange={(e) => actualizar('email', e.target.value)} autoComplete="email" />
              <p className="ayuda">Te enviaremos la confirmación de tu pedido.</p>
            </div>
          </div>
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="zona">Destino del envío *</label>
              <select id="zona" value={zona} onChange={(e) => setZona(e.target.value)}>
                <option value="bogota">Bogotá</option>
                <option value="resto">Resto del país</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="ciudad">Ciudad *</label>
              <input id="ciudad" value={form.ciudad} onChange={(e) => actualizar('ciudad', e.target.value)} autoComplete="address-level2" />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="direccion">Dirección completa *</label>
            <input id="direccion" value={form.direccion} onChange={(e) => actualizar('direccion', e.target.value)} autoComplete="street-address" placeholder="Calle, número, apto, barrio" />
          </div>
          <div className="campo">
            <label htmlFor="notas">Notas para la entrega (opcional)</label>
            <textarea id="notas" rows={2} value={form.notas} onChange={(e) => actualizar('notas', e.target.value)} />
          </div>

          {!ordenLista && (
            <button type="submit" className="boton boton--primario boton--bloque" disabled={cargando || totales.unidades === 0}>
              {cargando
                ? 'Generando tu orden…'
                : totales.unidades === 0
                  ? 'Agrega productos al carrito'
                  : `Continuar al pago seguro — ${formatoCOP(totales.total)}`}
            </button>
          )}
          <div id="bold-boton-contenedor" ref={boldRef} />
          {ordenLista && (
            <p className="ayuda" style={{ textAlign: 'center', marginTop: 10, fontSize: 13.5, color: 'var(--gris-texto)' }}>
              Orden {ordenLista} lista. Pulsa el botón de Bold para pagar de forma segura.
            </p>
          )}
        </form>
      </div>

      {/* -------- Columna derecha: resumen -------- */}
      <aside className="resumen">
        <div className="tarjeta">
          <h3>Tu pedido</h3>
          {totales.unidades === 0 && (
            <p className="ayuda">Aún no has agregado productos.</p>
          )}
          {Object.entries(totales.items).map(([key, qty]) => (
            <div className="resumen-linea" key={key}>
              <span>{PRODUCTOS[key].nombre} × {qty}</span>
              <span>{formatoCOP(PRODUCTOS[key].precio * qty)}</span>
            </div>
          ))}
          {totales.unidades > 0 && (
            <div className="resumen-linea">
              <span>Envío ({zona === 'bogota' ? 'Bogotá' : 'Resto del país'})</span>
              <span>{formatoCOP(totales.envio)}</span>
            </div>
          )}
          <div className="resumen-linea total">
            <span>Total</span>
            <span>{formatoCOP(totales.total)}</span>
          </div>

          <div className="pago-seguro">
            <div className="fila">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--verde)' }}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Pago 100% seguro procesado por Bold
            </div>
            <div className="fila">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--verde)' }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              Tarjetas de crédito y débito, PSE y Nequi
            </div>
            <div className="fila">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--verde)' }}><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
              Garantía de 60 días o te devolvemos tu dinero
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
