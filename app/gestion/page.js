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

function formatoCOP(v) {
  return '$' + Number(v).toLocaleString('es-CO');
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
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

function TabPreparacion({ pedidos, onUpdateEstado }) {
  const pendientes = pedidos.filter(p => p.estado === 'Aprobado');

  if (!pendientes.length) {
    return <div className="g-empty">No hay pedidos pendientes de preparar.</div>;
  }

  return (
    <div className="g-cards">
      {pendientes.map(p => (
        <div key={p.orden} className="g-prep-card">
          <div className="g-prep-header">
            <span className="g-prep-orden">{p.orden}</span>
            <EstadoBadge estado={p.estado} />
          </div>
          <div className="g-prep-body">
            <div className="g-prep-row"><span className="g-prep-label">Cliente</span><span>{p.nombre}</span></div>
            <div className="g-prep-row"><span className="g-prep-label">Teléfono</span><span>{p.telefono}</span></div>
            <div className="g-prep-row"><span className="g-prep-label">Ciudad</span><span>{p.ciudad}</span></div>
            <div className="g-prep-row"><span className="g-prep-label">Dirección</span><span>{p.direccion}</span></div>
            <div className="g-prep-row"><span className="g-prep-label">Cantidad</span><span>{p.cantidad}</span></div>
            {p.notas && <div className="g-prep-row"><span className="g-prep-label">Notas</span><span>{p.notas}</span></div>}
          </div>
          <div className="g-prep-actions">
            <button className="g-btn g-btn-primary" onClick={() => onUpdateEstado(p.orden, 'Empacado')}>
              Marcar como empacado
            </button>
          </div>
        </div>
      ))}
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
                        → {next}
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
        <StatCard label="Disponibles" value={disponible} sub={disponible <= 5 ? '⚠ Stock bajo' : ''} />
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
  const [tab, setTab] = useState('preparacion');
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

  const updateEstado = async (orden, nuevoEstado) => {
    setUpdating(true);
    try {
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateEstado', orden, estado: nuevoEstado }),
      });
      setPedidos(prev => prev.map(p => p.orden === orden ? { ...p, estado: nuevoEstado } : p));
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
    { id: 'preparacion', label: 'Preparación', icon: '📦' },
    { id: 'pedidos', label: 'Pedidos', icon: '📋' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'inventario', label: 'Inventario', icon: '📊' },
  ];

  const pedidosAprobados = pedidos.filter(p => p.estado === 'Aprobado').length;

  return (
    <>
      <style>{`
        .g-layout { min-height: 100vh; background: #f5faf8; font-family: 'Assistant', system-ui, sans-serif; }

        .g-header { background: linear-gradient(135deg, #00ae84 0%, #005261 100%); padding: 16px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .g-header-title { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
        .g-header-sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-left: auto; }

        .g-nav { display: flex; gap: 4px; padding: 12px 24px; background: #fff; border-bottom: 1px solid rgba(0,82,97,0.1); overflow-x: auto; }
        .g-nav-btn { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border: none; background: none; font-size: 14px; font-weight: 600; color: #45564f; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; font-family: inherit; position: relative; }
        .g-nav-btn:hover { background: #f0f7f4; color: #005261; }
        .g-nav-btn.active { background: #e8f5f0; color: #005261; }
        .g-nav-badge { background: #00ae84; color: #fff; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px; min-width: 20px; text-align: center; }

        .g-main { max-width: 1200px; margin: 0 auto; padding: 24px; }

        .g-stat { background: #fff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(0,82,97,0.08); }
        .g-stat-value { font-size: 32px; font-weight: 700; color: #005261; font-variant-numeric: tabular-nums; }
        .g-stat-label { font-size: 13px; color: #45564f; margin-top: 4px; }
        .g-stat-sub { font-size: 12px; color: #e67700; margin-top: 4px; font-weight: 600; }

        .g-cards { display: grid; gap: 16px; }
        @media (min-width: 768px) { .g-cards { grid-template-columns: 1fr 1fr; } }

        .g-prep-card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); overflow: hidden; }
        .g-prep-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0,82,97,0.06); }
        .g-prep-orden { font-weight: 700; color: #00ae84; font-size: 15px; }
        .g-prep-body { padding: 16px 20px; }
        .g-prep-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        .g-prep-label { color: #45564f; }
        .g-prep-actions { padding: 12px 20px; border-top: 1px solid rgba(0,82,97,0.06); }

        .g-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 0.02em; text-transform: uppercase; }

        .g-filters { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
        .g-filter { padding: 6px 14px; border: 1px solid rgba(0,82,97,0.15); background: #fff; border-radius: 6px; font-size: 13px; cursor: pointer; color: #45564f; font-family: inherit; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
        .g-filter:hover { border-color: #00ae84; color: #005261; }
        .g-filter.active { background: #005261; color: #fff; border-color: #005261; }

        .g-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); background: #fff; }
        .g-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .g-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #45564f; background: #f8fbf9; border-bottom: 1px solid rgba(0,82,97,0.08); white-space: nowrap; }
        .g-table td { padding: 10px 16px; border-bottom: 1px solid rgba(0,82,97,0.05); white-space: nowrap; }
        .g-table tbody tr:hover { background: #f5faf8; }
        .g-orden-cell { font-weight: 700; color: #00ae84; }

        .g-btn { padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .g-btn-primary { background: linear-gradient(135deg, #00ae84, #005261); color: #fff; }
        .g-btn-primary:hover { opacity: 0.9; }
        .g-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .g-btn-small { padding: 5px 12px; font-size: 12px; background: #e8f5f0; color: #005261; }
        .g-btn-small:hover { background: #d0ece4; }

        .g-empty { text-align: center; padding: 48px 20px; color: #45564f; font-size: 15px; }

        .g-inventario { display: flex; flex-direction: column; gap: 24px; }
        .g-inv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 640px) { .g-inv-grid { grid-template-columns: 1fr; } }
        .g-inv-form { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); padding: 24px; }
        .g-inv-form h3 { font-size: 16px; color: #005261; margin-bottom: 4px; }
        .g-inv-form p { font-size: 13px; color: #45564f; margin-bottom: 16px; }
        .g-inv-input-row { display: flex; gap: 12px; }
        .g-input { padding: 10px 14px; border: 1px solid rgba(0,82,97,0.2); border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; width: 200px; }
        .g-input:focus { border-color: #00ae84; box-shadow: 0 0 0 3px rgba(0,174,132,0.1); }

        .g-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; font-size: 16px; color: #45564f; }
        .g-updating { position: fixed; top: 70px; right: 24px; background: #005261; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 200; animation: g-fade-in 0.2s; }
        @keyframes g-fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="g-layout">
        <header className="g-header">
          <Logo />
          <span className="g-header-title">POLO A TIERRA</span>
          <span className="g-header-sub">Gestión</span>
        </header>

        <nav className="g-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`g-nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
              {t.id === 'preparacion' && pedidosAprobados > 0 && (
                <span className="g-nav-badge">{pedidosAprobados}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="g-main">
          {updating && <div className="g-updating">Actualizando...</div>}

          {loading ? (
            <div className="g-loading">Cargando datos...</div>
          ) : (
            <>
              {tab === 'preparacion' && <TabPreparacion pedidos={pedidos} onUpdateEstado={updateEstado} />}
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
