'use client';

import { useState, useEffect, useCallback } from 'react';
import { PRODUCTOS, resumenProductos } from '@/lib/pricing';

const ESTADOS = ['Iniciado', 'Aprobado', 'Empacado', 'Enviado', 'Entregado'];
const ESTADO_COLOR = {
  Iniciado: '#FFC272',
  Aprobado: '#00AE84',
  Empacado: '#27798F',
  Enviado: '#005261',
  Entregado: '#5B3623',
  Descartado: '#999999',
};

// Desglose de productos, un renglón por producto
function ListaProductos({ pedido }) {
  const texto = pedido.productos || `${pedido.cantidad || '—'}× Tapete Vital`;
  return (
    <span className="g-prods">
      {texto.split(', ').map((linea, i) => <span key={i}>{linea}</span>)}
    </span>
  );
}

const SUB_TABS = [
  { estado: 'Iniciado', label: 'Abandonado', next: 'Aprobado', accion: 'Marcar como aprobado', color: '#FFC272', whatsapp: true },
  { estado: 'Aprobado', label: 'Empacar', next: 'Empacado', accion: 'Marcar como empacado', color: '#00AE84' },
  { estado: 'Empacado', label: 'Enviar', next: 'Enviado', accion: 'Enviado', color: '#27798F', pideGuia: true },
  { estado: 'Enviado', label: 'Confirmar entrega', next: 'Entregado', accion: 'Entrega confirmada', color: '#005261', compacto: true },
];

function whatsappHref(p) {
  const digitos = String(p.telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = digitos.length === 10 ? `57${digitos}` : digitos;
  const mensaje = `Hola ${p.nombre || ''}, vimos que estabas por completar tu compra del Tapete Vital (pedido ${p.orden}) pero no logramos confirmar el pago. ¿Te ayudamos a terminarla?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function formatoCOP(v) {
  return '$' + Number(v).toLocaleString('es-CO');
}

function StatCard({ label, value, sub }) {
  return (
    <div className="g-stat">
      <div className="g-stat-value">{value}</div>
      <div className="g-stat-label">{label}</div>
      {sub && <div className="g-stat-sub">{sub}</div>}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const bg = ESTADO_COLOR[estado] || '#999';
  return <span className="g-badge" style={{ background: bg }}>{estado}</span>;
}

function imprimirEtiquetas(pedidos) {
  const etiquetas = pedidos.map(p => `
    <div class="etiqueta">
      <div class="et-brand"><span class="et-brand-name">Polo a Tierra</span></div>
      <div class="et-orden">${p.orden}</div>
      ${p.productos ? `<div class="et-campo"><span class="et-label">Contiene:</span> ${p.productos}</div>` : ''}
      <div class="et-campo"><span class="et-label">Para:</span> ${p.nombre || '—'}</div>
      <div class="et-campo"><span class="et-label">Tel:</span> ${p.telefono || '—'}</div>
      <div class="et-direccion">
        <div class="et-ciudad">${p.ciudad || '—'}</div>
        <div class="et-dir-texto">${p.direccion || '—'}</div>
      </div>
      <div class="et-notas">${p.notas ? `<span class="et-notas-label">Nota:</span> ${p.notas}` : ''}</div>
    </div>
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Etiquetas de envío</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700&display=swap');
      @page { size: 50mm 50mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Assistant', -apple-system, Arial, sans-serif; }
      .etiqueta { width: 50mm; height: 50mm; padding: 2.5mm 3mm; font-size: 7pt; line-height: 1.35; color: #000; display: flex; flex-direction: column; page-break-after: always; }
      .etiqueta:last-child { page-break-after: auto; }
      .et-brand { border-bottom: 0.5px solid #000; padding-bottom: 1.2mm; margin-bottom: 1.5mm; }
      .et-brand-name { font-size: 5.5pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
      .et-orden { font-size: 10pt; font-weight: 700; margin-bottom: 1.2mm; }
      .et-campo { font-size: 7pt; padding: 0.2mm 0; }
      .et-label { font-weight: 700; }
      .et-direccion { margin-top: 1.2mm; padding-top: 1.2mm; border-top: 0.5px dashed #000; }
      .et-direccion .et-ciudad { font-weight: 700; font-size: 7.5pt; margin-bottom: 0.3mm; }
      .et-direccion .et-dir-texto { font-size: 7pt; line-height: 1.4; }
      .et-notas { margin-top: auto; padding-top: 1mm; border-top: 0.5px dotted #000; font-size: 6.5pt; font-style: italic; min-height: 4mm; }
      .et-notas-label { font-weight: 700; font-style: normal; font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
    </style></head><body>${etiquetas}</body></html>`);
  win.document.close();
  win.document.fonts.ready.then(() => win.print());
}

function FormPedidoManual({ onCrear, onCerrar, creando }) {
  const [items, setItems] = useState({ tapete: 0, pad: 0, parches: 0 });
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', ciudad: '', direccion: '', notas: '', estado: 'Aprobado' });
  const [totalManual, setTotalManual] = useState('');

  const subtotal = Object.entries(items).reduce((sum, [key, qty]) => sum + PRODUCTOS[key].precio * qty, 0);
  const totalUnidades = Object.values(items).reduce((a, b) => a + b, 0);
  const total = totalManual !== '' ? Number(totalManual) : subtotal;
  const setItem = (key, val) => setItems(prev => ({ ...prev, [key]: Math.max(0, parseInt(val, 10) || 0) }));
  const setCampo = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const guardar = () => onCrear({
    ...form,
    cantidad: totalUnidades,
    total,
    productos: resumenProductos(items),
  });

  return (
    <div className="g-modal-overlay" onClick={onCerrar}>
      <div className="g-modal" onClick={e => e.stopPropagation()}>
        <h3>Crear pedido manual</h3>
        <p className="g-modal-sub">Para ventas cerradas por chat o pagadas por fuera del sistema.</p>

        {Object.entries(PRODUCTOS).map(([key, prod]) => (
          <div key={key} className="g-modal-prod">
            <span>{prod.nombre} <small>({formatoCOP(prod.precio)})</small></span>
            <input type="number" min="0" className="g-input g-modal-qty" value={items[key]} onChange={e => setItem(key, e.target.value)} />
          </div>
        ))}

        <div className="g-modal-total">
          <span>Total cobrado</span>
          <input
            type="number"
            className="g-input"
            value={totalManual !== '' ? totalManual : (subtotal || '')}
            placeholder="0"
            onChange={e => setTotalManual(e.target.value)}
          />
        </div>
        <p className="g-modal-hint">Prellenado con la suma de productos ({formatoCOP(subtotal)}) — ajústalo si cobraste distinto (envío, descuento).</p>

        <input className="g-input" placeholder="Nombre *" value={form.nombre} onChange={e => setCampo('nombre', e.target.value)} />
        <input className="g-input" placeholder="Teléfono" value={form.telefono} onChange={e => setCampo('telefono', e.target.value)} />
        <input className="g-input" placeholder="Email" value={form.email} onChange={e => setCampo('email', e.target.value)} />
        <input className="g-input" placeholder="Ciudad" value={form.ciudad} onChange={e => setCampo('ciudad', e.target.value)} />
        <input className="g-input" placeholder="Dirección" value={form.direccion} onChange={e => setCampo('direccion', e.target.value)} />
        <input className="g-input" placeholder="Notas" value={form.notas} onChange={e => setCampo('notas', e.target.value)} />
        <select className="g-input" value={form.estado} onChange={e => setCampo('estado', e.target.value)}>
          {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
        </select>

        <div className="g-modal-actions">
          <button className="g-btn g-btn-outline" onClick={onCerrar}>Cancelar</button>
          <button
            className="g-btn g-btn-primary"
            disabled={creando || !form.nombre || totalUnidades === 0 || !total}
            onClick={guardar}
          >
            {creando ? 'Guardando…' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabPendientes({ pedidos, onUpdateEstado }) {
  const [subTab, setSubTab] = useState(0);
  const [guias, setGuias] = useState({});

  const counts = SUB_TABS.map(st => pedidos.filter(p => p.estado === st.estado).length);

  const current = SUB_TABS[subTab];
  const lista = pedidos.filter(p => p.estado === current.estado);

  return (
    <div className="g-pendientes">
      <div className="g-sub-tabs">
        {SUB_TABS.map((st, i) => (
          <button
            key={st.estado}
            className={`g-sub-tab ${subTab === i ? 'active' : ''}`}
            style={subTab === i ? { borderColor: st.color, color: st.color } : {}}
            onClick={() => setSubTab(i)}
          >
            {st.label}
            {counts[i] > 0 && <span className="g-sub-count" style={subTab === i ? { background: st.color } : {}}>{counts[i]}</span>}
          </button>
        ))}
      </div>

      {current.estado === 'Aprobado' && lista.length > 0 && (
        <div className="g-print-bar">
          <button className="g-btn g-btn-outline" onClick={() => imprimirEtiquetas(lista)}>
            Imprimir etiquetas ({lista.length})
          </button>
        </div>
      )}

      <div className="g-seccion-list">
        {lista.length ? lista.map(p => (
          <div key={p.orden} className="g-prep-card">
            <div className="g-prep-header">
              <span className="g-prep-orden">{p.orden}</span>
              <EstadoBadge estado={p.estado} />
            </div>
            <div className="g-prep-body">
              {!current.compacto && (
                <div className="g-prep-row g-prep-qty"><span className="g-prep-label">Productos</span><strong><ListaProductos pedido={p} /></strong></div>
              )}
              <div className="g-prep-row"><span className="g-prep-label">Cliente</span><span>{p.nombre || '—'}</span></div>
              <div className="g-prep-row"><span className="g-prep-label">Teléfono</span><span>{p.telefono || '—'}</span></div>
              <div className="g-prep-row"><span className="g-prep-label">Ciudad</span><span>{p.ciudad || '—'}</span></div>
              {!current.compacto && (
                <div className="g-prep-row"><span className="g-prep-label">Dirección</span><span>{p.direccion || '—'}</span></div>
              )}
              {!current.compacto && p.notas && <div className="g-prep-row"><span className="g-prep-label">Notas</span><span>{p.notas}</span></div>}
              {current.compacto && p.guia && <div className="g-prep-row"><span className="g-prep-label">Guía #</span><span className="g-guia-value">{p.guia}</span></div>}
            </div>
            <div className="g-prep-actions">
              {current.whatsapp && whatsappHref(p) && (
                <a className="g-btn g-btn-whatsapp" href={whatsappHref(p)} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp
                </a>
              )}
              {current.pideGuia && (
                <div className="g-guia-row">
                  <label className="g-guia-label">Guía #</label>
                  <input
                    className="g-input g-guia-input"
                    type="text"
                    placeholder="Número de guía"
                    value={guias[p.orden] || ''}
                    onChange={e => setGuias(prev => ({ ...prev, [p.orden]: e.target.value }))}
                  />
                </div>
              )}
              <button className="g-btn g-btn-primary" onClick={() => onUpdateEstado(p.orden, current.next, current.pideGuia ? guias[p.orden] : undefined)}>
                {current.accion}
              </button>
              {current.whatsapp && (
                <button
                  className="g-btn g-btn-descartar"
                  onClick={() => {
                    if (window.confirm(`¿Descartar el pedido ${p.orden}? Saldrá de Pendientes (queda en el historial de Pedidos).`)) {
                      onUpdateEstado(p.orden, 'Descartado');
                    }
                  }}
                >
                  Descartar — no va a comprar
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="g-empty">No hay pedidos en este paso.</div>
        )}
      </div>
    </div>
  );
}

function TabPedidos({ pedidos, onUpdateEstado }) {
  const [filtro, setFiltro] = useState('');

  const filtrados = pedidos.filter(p =>
    !filtro || p.estado === filtro
  );

  return (
    <>
      <div className="g-filters">
        <button className={`g-filter ${!filtro ? 'active' : ''}`} onClick={() => setFiltro('')}>Todos</button>
        {[...ESTADOS, 'Descartado'].map(e => (
          <button key={e} className={`g-filter ${filtro === e ? 'active' : ''}`} onClick={() => setFiltro(e)}>{e}</button>
        ))}
      </div>
      <div className="g-table-wrap">
        <table className="g-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const idx = ESTADOS.indexOf(p.estado);
              const next = idx >= 0 && idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null;
              return (
                <tr key={p.orden + p.fecha}>
                  <td>{p.fecha}</td>
                  <td className="g-orden-cell">{p.orden}</td>
                  <td>{p.nombre}</td>
                  <td><ListaProductos pedido={p} /></td>
                  <td>{p.total ? formatoCOP(p.total) : '—'}</td>
                  <td><EstadoBadge estado={p.estado} /></td>
                  <td>
                    {next && (
                      <button className="g-btn g-btn-small" onClick={() => onUpdateEstado(p.orden, next)}>
                        &rarr; {next}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filtrados.length && <div className="g-empty">No hay pedidos con este filtro.</div>}
    </>
  );
}

function TabClientes({ pedidos }) {
  const clientesMap = {};
  pedidos.forEach(p => {
    if (!p.nombre) return;
    const key = p.telefono || p.nombre;
    if (!clientesMap[key]) {
      clientesMap[key] = { nombre: p.nombre, telefono: p.telefono, email: p.email, ciudad: p.ciudad, pedidos: 0, totalGastado: 0 };
    }
    clientesMap[key].pedidos++;
    clientesMap[key].totalGastado += Number(p.total) || 0;
  });
  const clientes = Object.values(clientesMap).sort((a, b) => b.totalGastado - a.totalGastado);

  return (
    <div className="g-table-wrap">
      <table className="g-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Ciudad</th>
            <th>Pedidos</th>
            <th>Total gastado</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map(c => (
            <tr key={c.telefono || c.nombre}>
              <td>{c.nombre}</td>
              <td>{c.telefono}</td>
              <td>{c.email || '—'}</td>
              <td>{c.ciudad || '—'}</td>
              <td>{c.pedidos}</td>
              <td>{formatoCOP(c.totalGastado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!clientes.length && <div className="g-empty">No hay clientes registrados.</div>}
    </div>
  );
}

// Unidades vendidas por producto. Pedidos sin desglose (embudo) cuentan como tapetes.
function vendidosPorProducto(pedidos) {
  const vendidos = { tapete: 0, pad: 0, parches: 0 };
  pedidos.filter(p => !['Iniciado', 'Descartado'].includes(p.estado)).forEach(p => {
    if (p.productos) {
      Object.entries(PRODUCTOS).forEach(([key, prod]) => {
        const m = String(p.productos).match(new RegExp(`(\\d+)×\\s*${prod.nombre}`));
        if (m) vendidos[key] += Number(m[1]);
      });
    } else {
      vendidos.tapete += Number(p.cantidad) || 0;
    }
  });
  return vendidos;
}

function TabInventario({ pedidos, inventarios, onUpdateInventario }) {
  const vendidos = vendidosPorProducto(pedidos);
  const [nuevoStock, setNuevoStock] = useState({ tapete: '', pad: '', parches: '' });

  return (
    <div className="g-inventario">
      {Object.entries(PRODUCTOS).map(([key, prod]) => {
        const stock = Number(inventarios[key]) || 0;
        const disponible = stock - vendidos[key];
        return (
          <div key={key} className="g-inv-producto">
            <h3>{prod.nombre}</h3>
            <div className="g-inv-grid">
              <StatCard label="Stock registrado" value={stock} />
              <StatCard label="Vendidas" value={vendidos[key]} />
              <StatCard label="Disponibles" value={disponible} sub={disponible <= 5 ? 'Stock bajo' : ''} />
            </div>
            <div className="g-inv-input-row">
              <input
                type="number"
                placeholder="Nuevo stock total"
                value={nuevoStock[key]}
                onChange={e => setNuevoStock(prev => ({ ...prev, [key]: e.target.value }))}
                className="g-input"
              />
              <button
                className="g-btn g-btn-primary"
                disabled={nuevoStock[key] === ''}
                onClick={() => {
                  onUpdateInventario(key, Number(nuevoStock[key]));
                  setNuevoStock(prev => ({ ...prev, [key]: '' }));
                }}
              >
                Actualizar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Gestion() {
  const [tab, setTab] = useState('pendientes');
  const [pedidos, setPedidos] = useState([]);
  const [inventarios, setInventarios] = useState({ tapete: 0, pad: 0, parches: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/gestion');
      const data = await res.json();
      if (data.pedidos) setPedidos(data.pedidos);
      if (data.inventarios) setInventarios(data.inventarios);
      else if (data.inventario != null) setInventarios(prev => ({ ...prev, tapete: data.inventario }));
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const updateEstado = async (orden, nuevoEstado, guia) => {
    setUpdating(true);
    try {
      const payload = { orden, estado: nuevoEstado };
      if (guia) payload.guia = guia;
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setPedidos(prev => prev.map(p => p.orden === orden ? { ...p, estado: nuevoEstado, ...(guia ? { guia } : {}) } : p));
    } catch (err) {
      console.error('Error actualizando estado:', err);
    } finally {
      setUpdating(false);
    }
  };

  const updateInventario = async (producto, stock) => {
    setUpdating(true);
    try {
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateInventario', producto, stock }),
      });
      setInventarios(prev => ({ ...prev, [producto]: stock }));
    } catch (err) {
      console.error('Error actualizando inventario:', err);
    } finally {
      setUpdating(false);
    }
  };

  const crearPedido = async (pedido) => {
    setCreando(true);
    try {
      const res = await fetch('/api/gestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCrear(false);
        await cargarDatos();
      } else {
        console.error('Error creando pedido:', data.error);
      }
    } catch (err) {
      console.error('Error creando pedido:', err);
    } finally {
      setCreando(false);
    }
  };

  const tabs = [
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'inventario', label: 'Inventario' },
  ];

  const totalPendientes = pedidos.filter(p => ['Iniciado', 'Aprobado', 'Empacado', 'Enviado'].includes(p.estado)).length;

  return (
    <>
      <style>{`
        .g-layout { min-height: 100vh; background: #f5faf8; font-family: 'Assistant', system-ui, sans-serif; }

        .g-header { background: linear-gradient(135deg, #00ae84 0%, #005261 100%); padding: 16px 0; position: sticky; top: 0; z-index: 100; }
        .g-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 12px; }
        .g-header-title { color: #fff; font-size: 19px; font-weight: 700; letter-spacing: 0.02em; }
        .g-header-sub { color: rgba(255,255,255,0.7); font-size: 14px; margin-left: auto; }

        .g-nav { background: #fff; border-bottom: 1px solid rgba(0,82,97,0.1); padding: 12px 0; }
        .g-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; gap: 4px; overflow-x: auto; }
        .g-nav-btn { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border: none; background: none; font-size: 15px; font-weight: 600; color: #45564f; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; font-family: inherit; position: relative; }
        .g-nav-btn:hover { background: #f0f7f4; color: #005261; }
        .g-nav-btn.active { background: #e8f5f0; color: #005261; }
        .g-nav-badge { background: #00ae84; color: #fff; font-size: 12px; font-weight: 700; padding: 1px 7px; border-radius: 10px; min-width: 20px; text-align: center; }

        .g-main { max-width: 1200px; margin: 0 auto; padding: 24px; }

        .g-stat { background: #fff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(0,82,97,0.08); }
        .g-stat-value { font-size: 32px; font-weight: 700; color: #005261; font-variant-numeric: tabular-nums; }
        .g-stat-label { font-size: 14px; color: #45564f; margin-top: 4px; }
        .g-stat-sub { font-size: 13px; color: #e67700; margin-top: 4px; font-weight: 600; }

        .g-pendientes { display: flex; flex-direction: column; gap: 20px; }

        .g-sub-tabs { display: flex; gap: 4px; }
        .g-sub-tab { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border: none; border-bottom: 3px solid transparent; background: none; font-size: 15px; font-weight: 600; color: #45564f; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .g-sub-tab:hover { color: #005261; }
        .g-sub-tab.active { border-bottom-color: #005261; }
        .g-sub-count { font-size: 11px; font-weight: 700; color: #fff; background: #999; padding: 1px 7px; border-radius: 10px; min-width: 18px; text-align: center; }

        .g-print-bar { display: flex; justify-content: flex-end; }

        .g-seccion-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }

        .g-prep-card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); overflow: hidden; }
        .g-prep-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0,82,97,0.06); }
        .g-prep-orden { font-weight: 700; color: #00ae84; font-size: 16px; }
        .g-prep-body { padding: 16px 20px; }
        .g-prep-row { display: flex; justify-content: space-between; gap: 20px; padding: 4px 0; font-size: 15px; }
        .g-prep-qty { font-size: 16px; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid rgba(0,82,97,0.06); }
        .g-prep-label { color: #45564f; flex-shrink: 0; }
        .g-prep-row > span:last-child, .g-prep-row > strong { text-align: right; min-width: 0; overflow-wrap: break-word; }
        .g-prep-actions { padding: 12px 20px; border-top: 1px solid rgba(0,82,97,0.06); display: flex; flex-direction: column; gap: 10px; }
        .g-guia-row { display: flex; align-items: center; gap: 10px; }
        .g-guia-label { font-size: 14px; font-weight: 700; color: #005261; white-space: nowrap; }
        .g-guia-input { flex: 1; width: auto; }
        .g-guia-value { font-weight: 700; color: #005261; font-family: monospace; }

        .g-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.02em; text-transform: uppercase; }

        .g-filters { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
        .g-filter { padding: 6px 14px; border: 1px solid rgba(0,82,97,0.15); background: #fff; border-radius: 6px; font-size: 14px; cursor: pointer; color: #45564f; font-family: inherit; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
        .g-filter:hover { border-color: #00ae84; color: #005261; }
        .g-filter.active { background: #005261; color: #fff; border-color: #005261; }

        .g-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); background: #fff; }
        .g-table { width: 100%; border-collapse: collapse; font-size: 15px; }
        .g-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #45564f; background: #f8fbf9; border-bottom: 1px solid rgba(0,82,97,0.08); white-space: nowrap; }
        .g-table td { padding: 10px 16px; border-bottom: 1px solid rgba(0,82,97,0.05); white-space: nowrap; }
        .g-table tbody tr:hover { background: #f5faf8; }
        .g-orden-cell { font-weight: 700; color: #00ae84; }

        .g-btn { padding: 8px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .g-btn-primary { background: linear-gradient(135deg, #00ae84, #005261); color: #fff; }
        .g-btn-primary:hover { opacity: 0.9; }
        .g-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .g-btn-outline { background: #fff; color: #005261; border: 1.5px solid #005261; }
        .g-btn-outline:hover { background: #f0f7f4; }
        .g-btn-whatsapp { background: #25D366; color: #fff; text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; }
        .g-btn-whatsapp:hover { opacity: 0.9; }
        .g-btn-descartar { background: none; color: #b3423a; border: 1.5px solid rgba(179,66,58,0.4); }
        .g-btn-descartar:hover { background: #fdf1f0; border-color: #b3423a; }
        .g-prods { display: inline-flex; flex-direction: column; gap: 2px; text-align: right; }
        .g-table .g-prods { text-align: left; }
        .g-btn-small { padding: 5px 12px; font-size: 13px; background: #e8f5f0; color: #005261; }
        .g-btn-small:hover { background: #d0ece4; }

        .g-empty { text-align: center; padding: 48px 20px; color: #45564f; font-size: 16px; }

        .g-inventario { display: flex; flex-direction: column; gap: 24px; }
        .g-inv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 640px) { .g-inv-grid { grid-template-columns: 1fr; } }
        .g-inv-form { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); padding: 24px; }
        .g-inv-form h3 { font-size: 17px; color: #005261; margin-bottom: 4px; }
        .g-inv-form p { font-size: 14px; color: #45564f; margin-bottom: 16px; }
        .g-inv-input-row { display: flex; gap: 12px; }
        .g-input { padding: 10px 14px; border: 1px solid rgba(0,82,97,0.2); border-radius: 8px; font-size: 15px; font-family: inherit; outline: none; width: 200px; }
        .g-input:focus { border-color: #00ae84; box-shadow: 0 0 0 3px rgba(0,174,132,0.1); }

        .g-nav-crear { margin-left: auto; white-space: nowrap; align-self: center; }
        .g-inv-producto { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .g-inv-producto h3 { font-size: 17px; color: #005261; }

        .g-modal-overlay { position: fixed; inset: 0; background: rgba(0,40,45,0.5); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 20px; }
        .g-modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .g-modal h3 { font-size: 19px; color: #005261; }
        .g-modal-sub { font-size: 14px; color: #45564f; margin-bottom: 6px; }
        .g-modal .g-input { width: 100%; }
        .g-modal-prod { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 15px; }
        .g-modal-prod small { color: #45564f; }
        .g-modal-qty { width: 80px !important; text-align: center; }
        .g-modal-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 700; color: #005261; margin-top: 6px; }
        .g-modal-total .g-input { width: 160px; }
        .g-modal-hint { font-size: 12px; color: #77857f; margin-bottom: 8px; }
        .g-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

        .g-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; font-size: 17px; color: #45564f; }
        .g-updating { position: fixed; top: 70px; right: 24px; background: #005261; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; z-index: 200; animation: g-fade-in 0.2s; }
        @keyframes g-fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="g-layout">
        <header className="g-header">
          <div className="g-header-inner">
            <span className="g-header-title">POLO A TIERRA</span>
            <span className="g-header-sub">Gestión</span>
          </div>
        </header>

        <nav className="g-nav">
          <div className="g-nav-inner">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`g-nav-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'pendientes' && totalPendientes > 0 && (
                  <span className="g-nav-badge">{totalPendientes}</span>
                )}
              </button>
            ))}
            <button className="g-btn g-btn-outline g-nav-crear" onClick={() => setShowCrear(true)}>
              + Pedido manual
            </button>
          </div>
        </nav>

        <main className="g-main">
          {updating && <div className="g-updating">Actualizando...</div>}

          {loading ? (
            <div className="g-loading">Cargando datos...</div>
          ) : (
            <>
              {tab === 'pendientes' && <TabPendientes pedidos={pedidos} onUpdateEstado={updateEstado} />}
              {tab === 'pedidos' && <TabPedidos pedidos={pedidos} onUpdateEstado={updateEstado} />}
              {tab === 'clientes' && <TabClientes pedidos={pedidos} />}
              {tab === 'inventario' && <TabInventario pedidos={pedidos} inventarios={inventarios} onUpdateInventario={updateInventario} />}
            </>
          )}
        </main>

        {showCrear && (
          <FormPedidoManual onCrear={crearPedido} onCerrar={() => setShowCrear(false)} creando={creando} />
        )}
      </div>
    </>
  );
}
