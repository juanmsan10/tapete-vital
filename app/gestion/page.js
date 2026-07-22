'use client';

import { useState, useEffect, useCallback } from 'react';

const ESTADOS = ['Iniciado', 'Aprobado', 'Empacado', 'Enviado', 'Entregado'];
const ESTADO_COLOR = {
  Iniciado: '#FFC272',
  Aprobado: '#00AE84',
  Empacado: '#27798F',
  Enviado: '#005261',
  Entregado: '#5B3623',
};

const SUB_TABS = [
  { estado: 'Iniciado', label: 'Abandonado', next: 'Aprobado', accion: 'Marcar como aprobado', color: '#FFC272' },
  { estado: 'Aprobado', label: 'Empacar', next: 'Empacado', accion: 'Marcar como empacado', color: '#00AE84' },
  { estado: 'Empacado', label: 'Enviar', next: 'Enviado', accion: 'Enviado', color: '#27798F', pideGuia: true },
  { estado: 'Enviado', label: 'Confirmar entrega', next: 'Entregado', accion: 'Entrega confirmada', color: '#005261', compacto: true },
];

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
      <div class="et-marca">POLO A TIERRA</div>
      <div class="et-orden">${p.orden}</div>
      <div class="et-campo"><span class="et-label">Para:</span> ${p.nombre || '—'}</div>
      <div class="et-campo"><span class="et-label">Tel:</span> ${p.telefono || '—'}</div>
      <div class="et-campo"><span class="et-label">Ciudad:</span> ${p.ciudad || '—'}</div>
      <div class="et-campo"><span class="et-label">Dirección:</span> ${p.direccion || '—'}</div>
      <div class="et-campo"><span class="et-label">Cantidad:</span> <strong>${p.cantidad || '—'}</strong></div>
      ${p.notas ? `<div class="et-campo"><span class="et-label">Notas:</span> ${p.notas}</div>` : ''}
    </div>
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Etiquetas de envío</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; }
      .etiqueta { border: 2px solid #333; border-radius: 8px; padding: 20px; margin: 16px; page-break-inside: avoid; max-width: 400px; }
      .et-marca { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #005261; text-transform: uppercase; margin-bottom: 4px; }
      .et-orden { font-size: 18px; font-weight: 700; color: #00ae84; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
      .et-campo { font-size: 14px; padding: 3px 0; }
      .et-label { font-weight: 700; color: #333; }
      @media print {
        .etiqueta { margin: 12px 0; border-width: 1.5px; }
      }
    </style></head><body>${etiquetas}</body></html>`);
  win.document.close();
  win.print();
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
                <div className="g-prep-row g-prep-qty"><span className="g-prep-label">Cantidad</span><strong>{p.cantidad || '—'}</strong></div>
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
        {ESTADOS.map(e => (
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
              <th>Cantidad</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const idx = ESTADOS.indexOf(p.estado);
              const next = idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null;
              return (
                <tr key={p.orden + p.fecha}>
                  <td>{p.fecha}</td>
                  <td className="g-orden-cell">{p.orden}</td>
                  <td>{p.nombre}</td>
                  <td>{p.cantidad}</td>
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

function TabInventario({ pedidos, inventario, onUpdateInventario }) {
  const vendidos = pedidos
    .filter(p => p.estado !== 'Iniciado')
    .reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);

  const disponible = inventario - vendidos;

  const [nuevoStock, setNuevoStock] = useState('');

  return (
    <div className="g-inventario">
      <div className="g-inv-grid">
        <StatCard label="Stock total registrado" value={inventario} />
        <StatCard label="Unidades vendidas" value={vendidos} />
        <StatCard label="Disponibles" value={disponible} sub={disponible <= 5 ? 'Stock bajo' : ''} />
      </div>
      <div className="g-inv-form">
        <h3>Ajustar inventario</h3>
        <p>Registra el stock total actual (ej: recibiste nueva mercancía).</p>
        <div className="g-inv-input-row">
          <input
            type="number"
            placeholder="Nuevo stock total"
            value={nuevoStock}
            onChange={e => setNuevoStock(e.target.value)}
            className="g-input"
          />
          <button
            className="g-btn g-btn-primary"
            disabled={!nuevoStock}
            onClick={() => {
              onUpdateInventario(Number(nuevoStock));
              setNuevoStock('');
            }}
          >
            Actualizar stock
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Gestion() {
  const [tab, setTab] = useState('pendientes');
  const [pedidos, setPedidos] = useState([]);
  const [inventario, setInventario] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/gestion');
      const data = await res.json();
      if (data.pedidos) setPedidos(data.pedidos);
      if (data.inventario != null) setInventario(data.inventario);
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

  const updateInventario = async (stock) => {
    setUpdating(true);
    try {
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateInventario', stock }),
      });
      setInventario(stock);
    } catch (err) {
      console.error('Error actualizando inventario:', err);
    } finally {
      setUpdating(false);
    }
  };

  const tabs = [
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'inventario', label: 'Inventario' },
  ];

  const totalPendientes = pedidos.filter(p => ['Aprobado', 'Empacado', 'Enviado'].includes(p.estado)).length;

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
        .g-prep-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 15px; }
        .g-prep-qty { font-size: 16px; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid rgba(0,82,97,0.06); }
        .g-prep-label { color: #45564f; }
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
              {tab === 'inventario' && <TabInventario pedidos={pedidos} inventario={inventario} onUpdateInventario={updateInventario} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
