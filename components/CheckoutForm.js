'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  calcularTotal,
  formatoCOP,
  PRECIO_UNITARIO,
  PRECIO_UNITARIO_DESCUENTO,
} from '@/lib/pricing';

const PAQUETES = [
  { qty: 1, etiqueta: '1 tapete' },
  { qty: 2, etiqueta: '2 tapetes', badge: 'El más elegido' },
  { qty: 3, etiqueta: '3 tapetes' },
];

export default function CheckoutForm() {
  const [cantidad, setCantidad] = useState(2);
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

  const totales = useMemo(() => calcularTotal(cantidad, zona), [cantidad, zona]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_name: 'Tapete Vital',
        currency: 'COP',
        value: totales.total,
        num_items: cantidad,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambios en cantidad/zona invalidan la orden generada (el monto cambió)
  useEffect(() => {
    setOrdenLista(null);
    if (boldRef.current) boldRef.current.innerHTML = '';
  }, [cantidad, zona]);

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
    script.setAttribute('data-description', `Tapete Vital x${cantidad} — Polo a Tierra`);
    script.setAttribute(
      'data-customer-data',
      JSON.stringify({
        email: form.email || undefined,
        fullName: form.nombre,
        phone: form.telefono,
      })
    );
    boldRef.current.appendChild(script);

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'AddPaymentInfo', {
        currency: 'COP',
        value: Number(amount),
      });
    }
  }

  async function continuarAlPago(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim() || !form.cedula.trim() || !form.telefono.trim() || !form.ciudad.trim() || !form.direccion.trim()) {
      setError('Completa los campos obligatorios: nombre, cédula/NIT, teléfono, ciudad y dirección.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/bold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad, zona, ...form }),
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
      {/* -------- Columna izquierda: paquete + datos -------- */}
      <div>
        <div className="tarjeta">
          <h3>1. Elige tu paquete</h3>
          <p style={{ fontSize: 14.5, color: 'var(--gris-texto)', marginBottom: 18 }}>
            Llevando 2 o más, cada tapete queda con 10% de descuento — para los tuyos.
          </p>
          <div className="paquetes" role="radiogroup" aria-label="Cantidad de tapetes">
            {PAQUETES.map((p) => {
              const unit = p.qty >= 2 ? PRECIO_UNITARIO_DESCUENTO : PRECIO_UNITARIO;
              const ahorro = p.qty >= 2 ? (PRECIO_UNITARIO - PRECIO_UNITARIO_DESCUENTO) * p.qty : 0;
              const activo = cantidad === p.qty;
              return (
                <button
                  type="button"
                  key={p.qty}
                  role="radio"
                  aria-checked={activo}
                  className={`paquete ${activo ? 'activo' : ''}`}
                  onClick={() => setCantidad(p.qty)}
                >
                  {p.badge && <span className="badge">{p.badge}</span>}
                  <div className="cant">{p.etiqueta}</div>
                  <div className="precio"><strong>{formatoCOP(unit)}</strong></div>
                  <div className="unidad">{p.qty > 1 ? 'cada uno' : 'precio normal'}</div>
                  {ahorro > 0 && <div className="ahorro">Ahorras {formatoCOP(ahorro)}</div>}
                </button>
              );
            })}
          </div>
          <div className="campo" style={{ marginTop: 16, marginBottom: 0 }}>
            <label htmlFor="qty-extra">¿Necesitas más? Elige la cantidad exacta</label>
            <select
              id="qty-extra"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} tapete{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
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
            <button type="submit" className="boton boton--primario boton--bloque" disabled={cargando}>
              {cargando ? 'Generando tu orden…' : `Continuar al pago seguro — ${formatoCOP(totales.total)}`}
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
          <div className="resumen-linea">
            <span>Tapete Vital × {totales.cantidad}</span>
            <span>{formatoCOP(totales.subtotal)}</span>
          </div>
          {totales.ahorro > 0 && (
            <div className="resumen-linea">
              <span>Descuento aplicado</span>
              <span className="verde">− {formatoCOP(totales.ahorro)}</span>
            </div>
          )}
          <div className="resumen-linea">
            <span>Envío ({zona === 'bogota' ? 'Bogotá' : 'Resto del país'})</span>
            <span>{formatoCOP(totales.envio)}</span>
          </div>
          <div className="resumen-linea">
            <span>🎁 Guía Esencial (valor $49.000)</span>
            <span className="verde">GRATIS</span>
          </div>
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

        <div className="testimonio-mini">
          <span className="estrellas" aria-label="5 estrellas">★★★★★</span>
          <p>
            “Compré 4 tapetes POLO A TIERRA como regalo de navidad para mis 2 hijos, mi yerno y
            para mí. Los hemos usado con frecuencia y nos sentimos energizados, con buen ánimo y
            muy buena salud.”
          </p>
          <cite>Consuelo Martínez</cite>
        </div>
      </aside>
    </div>
  );
}
