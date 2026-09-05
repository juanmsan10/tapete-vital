'use client';

import { useState, useEffect, useCallback } from 'react';
import { PRODUCTOS, resumenProductos } from '@/lib/pricing';

const ESTADOS = ['Iniciado', 'Aprobado', 'Empacado', 'Enviado', 'Entregado'];

function estadoAnterior(estado) {
  const idx = ESTADOS.indexOf(estado);
  return idx > 0 ? ESTADOS[idx - 1] : null;
}
const ESTADO_COLOR = {
  Iniciado: '#FFC272',
  Rechazado: '#D64541',
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

// La guía llega después de despachar: la transportadora la entrega cuando ya
// recogió. Por eso "Enviar" no la pide, y los enviados esperan en "Asignar
// guía" hasta que se registra. El número es el que separa las dos pestañas,
// así que no hace falta un estado extra para saber en cuál va cada pedido.
const SUB_TABS = [
  // Rojo (el mismo de Rechazado) y con la burbuja SIEMPRE roja: son ventas escapándose
  { id: 'abandonado', estado: 'Iniciado', label: 'Abandonado', next: 'Aprobado', accion: 'Marcar como aprobado', color: '#D64541', urgente: true, whatsapp: true, wa: 'abandono' },
  { id: 'empacar', estado: 'Aprobado', label: 'Empacar', next: 'Empacado', accion: 'Marcar como empacado', color: '#00AE84' },
  { id: 'enviar', estado: 'Empacado', label: 'Enviar', next: 'Enviado', accion: 'Marcar como enviado', color: '#27798F' },
  { id: 'guia', estado: 'Enviado', label: 'Asignar guía', accion: 'Guardar guía', color: '#7A4EAB', pideGuia: true, sinGuia: true },
  { id: 'entrega', estado: 'Enviado', label: 'Confirmar entrega', next: 'Entregado', accion: 'Entrega confirmada', color: '#005261', compacto: true, conGuia: true, wa: 'entrega' },
];

// La operaria de bodega solo ve su trabajo: empacar, enviar y registrar la
// guía. Ni los abandonados (eso es ventas) ni confirmar entrega (la cierra
// el cliente por WhatsApp o un admin). Aplica también a la burbuja de arriba.
const USUARIOS_BODEGA = new Set(['logistica']);
const PASOS_BODEGA = new Set(['empacar', 'enviar', 'guia']);

// La pestaña Abandonado agrupa Iniciado + Rechazado (pago intentado y fallido)
function perteneceATab(p, st) {
  if (st.estado === 'Iniciado') return p.estado === 'Iniciado' || p.estado === 'Rechazado';
  if (p.estado !== st.estado) return false;
  const tieneGuia = Boolean(String(p.guia || '').trim());
  if (st.sinGuia) return !tieneGuia;
  if (st.conGuia) return tieneGuia;
  return true;
}

// Mismo cliente = mismo teléfono (últimos 10 dígitos)
function telNorm(t) {
  return String(t || '').replace(/\D/g, '').slice(-10);
}

// Varios intentos de compra del mismo cliente → una sola tarjeta.
// La tarjeta muestra el intento más reciente; si algún intento fue
// Rechazado, toda la tarjeta hereda la urgencia.
function agruparPorCliente(lista) {
  const grupos = new Map();
  lista.forEach(p => {
    const k = telNorm(p.telefono) || p.orden;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(p);
  });
  return [...grupos.values()].map(g => ({
    ...g[g.length - 1],
    estado: g.some(o => o.estado === 'Rechazado') ? 'Rechazado' : g[g.length - 1].estado,
    intentos: g.length,
    grupo: g,
  }));
}

// "hace 20 min" / "hace 5 h" / "hace 3 días" desde la fecha es-CO de la Sheet
function haceCuanto(fecha) {
  const m = String(fecha || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i);
  if (!m) return null;
  const [, d, mon, y, hh, min, s, ap] = m;
  let h = Number(hh) % 12;
  if (/p/i.test(ap)) h += 12;
  const mins = (Date.now() - Date.UTC(+y, +mon - 1, +d, h + 5, +min, +s)) / 60000;
  if (mins < 60) return `hace ${Math.max(1, Math.round(mins))} min`;
  if (mins < 24 * 60) return `hace ${Math.round(mins / 60)} h`;
  return `hace ${Math.round(mins / 60 / 24)} días`;
}

// web.whatsapp.com en vez de wa.me: wa.me mete una página intermedia de
// "Continuar al chat" que en escritorio sobra. Un número de más de 10 dígitos
// ya trae indicativo de país y se respeta (hay clientes fuera de Colombia).
const MENSAJES = {
  abandono: (p) =>
    `Hola ${p.nombre || ''}, vimos que estabas por completar tu compra del Tapete Vital (pedido ${p.orden}) pero no logramos confirmar el pago. ¿Te ayudamos a terminarla?`,
  entrega: (p) =>
    `Hola ${String(p.nombre || '').trim().split(/\s+/)[0]}, te escribimos de POLO A TIERRA. Tu pedido salió con Interrapidísimo, guía ${p.guia}. ¿Ya lo tienes en tus manos?`,
};

function whatsappHref(p, tipo = 'abandono') {
  const digitos = String(p.telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = digitos.length > 10 ? digitos : `57${digitos}`;
  return `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(MENSAJES[tipo](p))}`;
}

// "1/9/2026, 4:22:54 p. m." → "1/9/2026"
function soloFecha(f) {
  return String(f || '').split(',')[0] || '';
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
      <div class="et-campo"><span class="et-label">CC/NIT:</span> ${p.cedula || '—'}</div>
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
  const [form, setForm] = useState({ nombre: '', cedula: '', telefono: '', email: '', ciudad: '', direccion: '', notas: '', estado: 'Aprobado' });
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
        <input className="g-input" placeholder="Cédula / NIT" value={form.cedula} onChange={e => setCampo('cedula', e.target.value)} />
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

// Editar datos de un pedido (cliente reporta un error en dirección, teléfono, etc.)
const CAMPOS_EDITABLES = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'cedula', label: 'Cédula / NIT' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'notas', label: 'Notas' },
];

function ModalEditar({ pedido, onGuardar, onCerrar, guardando }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(CAMPOS_EDITABLES.map(c => [c.key, pedido[c.key] || '']))
  );
  const setCampo = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="g-modal-overlay" onClick={onCerrar}>
      <div className="g-modal" onClick={e => e.stopPropagation()}>
        <h3>Editar pedido {pedido.orden}</h3>
        <p className="g-modal-sub">Corrige los datos que el cliente reportó con error.</p>
        {CAMPOS_EDITABLES.map(c => (
          <label key={c.key} className="g-modal-campo">
            <span>{c.label}</span>
            <input
              className="g-input"
              type="text"
              value={form[c.key]}
              onChange={e => setCampo(c.key, e.target.value)}
            />
          </label>
        ))}
        <div className="g-modal-actions">
          <button className="g-btn g-btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="g-btn g-btn-primary" disabled={guardando} onClick={() => onGuardar(pedido.orden, form)}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cómo se lee cada acción del registro, en lenguaje de negocio
function describirActividad(a) {
  const d = a.detalle || {};
  switch (a.accion) {
    case 'estado':
      return `movió ${a.objetivo} de "${d.de}" a "${d.a}"${d.cliente ? ` · ${d.cliente}` : ''}`;
    case 'editar': {
      const campos = Object.keys(d);
      const detalle = campos
        .map((c) => `${c}: "${d[c].antes || '—'}" → "${d[c].ahora || '—'}"`)
        .join(' · ');
      return `editó ${a.objetivo} — ${detalle}`;
    }
    case 'crear_pedido':
      return `creó el pedido manual ${a.objetivo}${d.nombre ? ` para ${d.nombre}` : ''}`;
    case 'usuario_crear':
      return `creó al usuario "${a.objetivo}"`;
    case 'usuario_clave':
      return `cambió la contraseña de "${a.objetivo}"`;
    case 'usuario_eliminar':
      return `eliminó al usuario "${a.objetivo}"`;
    default:
      return `${a.accion} ${a.objetivo || ''}`;
  }
}

function TabActividad() {
  const [actividad, setActividad] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    fetch('/api/gestion/actividad')
      .then((r) => r.json())
      .then((d) => (d.actividad ? setActividad(d.actividad) : setError(d.error || 'No se pudo cargar')))
      .catch(() => setError('No se pudo cargar la actividad'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="g-loading">Cargando actividad...</div>;
  if (error) return <div className="g-empty">{error}</div>;

  const texto = filtro.trim().toLowerCase();
  const lista = texto
    ? actividad.filter((a) =>
        `${a.usuario} ${a.objetivo || ''} ${describirActividad(a)}`.toLowerCase().includes(texto)
      )
    : actividad;

  return (
    <>
      <div className="g-filters">
        <input
          className="g-input" style={{ width: 320 }}
          placeholder="Buscar por pedido, usuario o acción…"
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
        />
        <span className="g-nota" style={{ padding: 0 }}>{lista.length} de {actividad.length} registros</span>
      </div>
      <div className="g-table-wrap">
        <table className="g-table">
          <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th></tr></thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{a.creado_en}</td>
                <td><strong>{a.usuario}</strong></td>
                <td>{describirActividad(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <div className="g-empty">Sin actividad registrada todavía.</div>}
      </div>
    </>
  );
}

function TabUsuarios({ yo, mostrarAviso }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ usuario: '', clave: '' });
  const [claveNueva, setClaveNueva] = useState({});

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/gestion/usuarios');
      const data = await res.json();
      if (data.usuarios) setUsuarios(data.usuarios);
      else setError(data.error || 'No se pudieron cargar los usuarios');
    } catch {
      setError('No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const llamar = async (metodo, cuerpo, exito) => {
    setError('');
    const res = await fetch('/api/gestion/usuarios', {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Algo salió mal'); return false; }
    mostrarAviso(exito);
    await cargar();
    return true;
  };

  const crear = async (e) => {
    e.preventDefault();
    if (await llamar('POST', nuevo, `Usuario "${nuevo.usuario}" creado · puede tardar unos segundos en poder entrar`)) {
      setNuevo({ usuario: '', clave: '' });
    }
  };

  if (cargando) return <div className="g-loading">Cargando usuarios...</div>;

  return (
    <div className="g-usuarios">
      {error && <div className="error-msg" role="alert">{error}</div>}

      <div className="g-prep-card">
        <div className="g-prep-header"><span className="g-prep-orden">Crear usuario</span></div>
        <form className="g-prep-body g-form-usuario" onSubmit={crear}>
          <input
            className="g-input" placeholder="Usuario (ej: logistica)" value={nuevo.usuario}
            onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
          />
          <input
            className="g-input" type="text" placeholder="Contraseña (mínimo 8)" value={nuevo.clave}
            onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })}
          />
          <button className="g-btn g-btn-primary" type="submit">Crear</button>
        </form>
        <p className="g-nota">Estos usuarios entran al panel de pedidos. Solo tú, desde tu acceso de administrador, puedes crearlos o cambiarles la contraseña.</p>
      </div>

      <div className="g-table-wrap">
        <table className="g-table">
          <thead>
            <tr><th>Usuario</th><th>Creado</th><th>Cambiar contraseña</th><th></th></tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.usuario}>
                <td><strong>{u.usuario}</strong>{u.usuario === yo && <span className="g-yo"> (tú)</span>}</td>
                <td>{u.creado_en ? String(u.creado_en).split(',')[0] : '—'}</td>
                <td>
                  <div className="g-guia-row">
                    <input
                      className="g-input" style={{ width: 170 }} placeholder="Nueva contraseña"
                      value={claveNueva[u.usuario] || ''}
                      onChange={(e) => setClaveNueva({ ...claveNueva, [u.usuario]: e.target.value })}
                    />
                    <button
                      className="g-btn g-btn-small"
                      onClick={async () => {
                        if (await llamar('PUT', { usuario: u.usuario, clave: claveNueva[u.usuario] }, `Contraseña de "${u.usuario}" actualizada · puede tardar unos segundos en aplicarse`)) {
                          setClaveNueva({ ...claveNueva, [u.usuario]: '' });
                        }
                      }}
                    >Guardar</button>
                  </div>
                </td>
                <td>
                  {u.usuario !== yo && (
                    <button
                      className="g-btn g-btn-descartar g-btn-small"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar al usuario "${u.usuario}"? Perderá el acceso al sistema.`)) {
                          llamar('DELETE', { usuario: u.usuario }, `Usuario "${u.usuario}" eliminado`);
                        }
                      }}
                    >Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!usuarios.length && <div className="g-empty">Todavía no hay usuarios creados.</div>}
      </div>
    </div>
  );
}

function TabPendientes({ pedidos, pasos, historico, onUpdateEstado, onEditar }) {
  const [subTab, setSubTab] = useState(0);
  const [guias, setGuias] = useState({});

  const counts = pasos.map(st => {
    const l = pedidos.filter(p => perteneceATab(p, st));
    // En Abandonado se cuentan clientes, no intentos
    return st.whatsapp ? new Set(l.map(p => telNorm(p.telefono) || p.orden)).size : l.length;
  });

  // El histórico (la tabla completa de siempre) vive como último paso
  const esHistorico = historico && subTab >= pasos.length;
  const current = esHistorico ? null : pasos[subTab];
  const filtrada = current ? pedidos.filter(p => perteneceATab(p, current)) : [];
  // Rechazados primero: pago intentado y fallido = contacto urgente
  const lista = (current?.whatsapp ? agruparPorCliente(filtrada) : filtrada)
    .sort((a, b) => (b.estado === 'Rechazado' ? 1 : 0) - (a.estado === 'Rechazado' ? 1 : 0));

  return (
    <div className="g-pendientes">
      <div className="g-sub-tabs">
        {pasos.map((st, i) => (
          <button
            key={st.id}
            className={`g-sub-tab ${subTab === i ? 'active' : ''}`}
            style={subTab === i ? { borderColor: st.color, color: st.color } : {}}
            onClick={() => setSubTab(i)}
          >
            {st.label}
            {counts[i] > 0 && <span className="g-sub-count" style={subTab === i || st.urgente ? { background: st.color } : {}}>{counts[i]}</span>}
          </button>
        ))}
        {historico && (
          <button
            className={`g-sub-tab ${esHistorico ? 'active' : ''}`}
            style={esHistorico ? { borderColor: '#5B3623', color: '#5B3623' } : {}}
            onClick={() => setSubTab(pasos.length)}
          >
            Histórico
          </button>
        )}
      </div>

      {current?.estado === 'Aprobado' && lista.length > 0 && (
        <div className="g-print-bar">
          <button className="g-btn g-btn-outline" onClick={() => imprimirEtiquetas(lista)}>
            Imprimir etiquetas ({lista.length})
          </button>
        </div>
      )}

      {esHistorico ? (
        <TabPedidos pedidos={pedidos} onUpdateEstado={onUpdateEstado} onEditar={onEditar} />
      ) : (
      <div className="g-seccion-list">
        {lista.length ? lista.map(p => (
          <div key={p.orden} className="g-prep-card">
            <div className="g-prep-header">
              <span className="g-prep-orden">{p.orden}</span>
              <span className="g-prep-header-right">
                <button className="g-btn-editar" title="Editar datos del pedido" onClick={() => onEditar(p)}>✎</button>
                <EstadoBadge estado={p.estado} />
              </span>
            </div>
            <div className="g-prep-body">
              {(p.intentos > 1 || p.estado === 'Rechazado') && (
                <div className="g-prep-row" style={{ color: '#D64541', fontWeight: 700 }}>
                  <span className="g-prep-label" style={{ color: '#D64541' }}>⚠ Urgente</span>
                  <span>
                    {p.intentos > 1
                      ? `${p.intentos} intentos de compra sin lograr pagar — contactar ya`
                      : 'Intentó pagar y el pago fue rechazado — contactar ya'}
                  </span>
                </div>
              )}
              {p.intentos > 1 && (
                <div className="g-prep-row">
                  <span className="g-prep-label">Intentos</span>
                  <span>{p.grupo.map(o => o.orden).join(', ')}</span>
                </div>
              )}
              {current.whatsapp && p.fecha && (
                <div className="g-prep-row">
                  <span className="g-prep-label">Inició</span>
                  <span>{p.fecha}{haceCuanto(p.fecha) ? ` (${haceCuanto(p.fecha)})` : ''}</span>
                </div>
              )}
              {!current.compacto && (
                <div className="g-prep-row g-prep-qty"><span className="g-prep-label">Productos</span><strong><ListaProductos pedido={p} /></strong></div>
              )}
              <div className="g-prep-row"><span className="g-prep-label">Cliente</span><span>{p.nombre || '—'}</span></div>
              {!current.compacto && (
                <div className="g-prep-row"><span className="g-prep-label">Cédula</span><span>{p.cedula || '—'}</span></div>
              )}
              <div className="g-prep-row"><span className="g-prep-label">Teléfono</span><span>{p.telefono || '—'}</span></div>
              <div className="g-prep-row"><span className="g-prep-label">Ciudad</span><span>{p.ciudad || '—'}</span></div>
              {!current.compacto && (
                <div className="g-prep-row"><span className="g-prep-label">Dirección</span><span>{p.direccion || '—'}</span></div>
              )}
              {!current.compacto && p.notas && <div className="g-prep-row"><span className="g-prep-label">Notas</span><span>{p.notas}</span></div>}
              {current.compacto && p.guia && <div className="g-prep-row"><span className="g-prep-label">Guía #</span><span className="g-guia-value">{p.guia}</span></div>}
              {current.compacto && (
                <div className="g-prep-row">
                  <span className="g-prep-label">Fecha envío</span>
                  <span>{p.fecha_envio ? `${soloFecha(p.fecha_envio)}${haceCuanto(p.fecha_envio) ? ` (${haceCuanto(p.fecha_envio)})` : ''}` : '—'}</span>
                </div>
              )}
            </div>
            <div className="g-prep-actions">
              {current.wa && whatsappHref(p, current.wa) && (
                <a className="g-btn g-btn-whatsapp" href={whatsappHref(p, current.wa)} target="_blank" rel="noopener noreferrer">
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
              <button
                className="g-btn g-btn-primary"
                disabled={current.pideGuia && !String(guias[p.orden] || '').trim()}
                onClick={async () => {
                  await onUpdateEstado(p.orden, current.next, current.pideGuia ? guias[p.orden] : undefined);
                  // Al aprobar un intento, los demás intentos del cliente se descartan solos
                  if (p.grupo?.length > 1) {
                    for (const o of p.grupo) {
                      if (o.orden !== p.orden) await onUpdateEstado(o.orden, 'Descartado');
                    }
                  }
                }}
              >
                {current.accion}
              </button>
              {estadoAnterior(current.estado) && (
                <span
                  className="g-volver"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (window.confirm(`¿Regresar el pedido ${p.orden} a "${estadoAnterior(current.estado)}"?`)) {
                      onUpdateEstado(p.orden, estadoAnterior(current.estado));
                    }
                  }}
                >
                  ← Regresar a {estadoAnterior(current.estado)}
                </span>
              )}
              {current.whatsapp && (
                <span
                  className="g-volver g-volver-rojo"
                  role="button"
                  tabIndex={0}
                  onClick={async () => {
                    const n = p.grupo?.length || 1;
                    const msg = n > 1
                      ? `¿Descartar los ${n} intentos de ${p.nombre || 'este cliente'}? Salen de los pasos de trabajo (quedan en el Histórico).`
                      : `¿Descartar el pedido ${p.orden}? Sale de los pasos de trabajo (queda en el Histórico).`;
                    if (window.confirm(msg)) {
                      for (const o of (p.grupo || [p])) await onUpdateEstado(o.orden, 'Descartado');
                    }
                  }}
                >
                  Descartar — no va a comprar
                </span>
              )}
            </div>
          </div>
        )) : (
          <div className="g-empty">No hay pedidos en este paso.</div>
        )}
      </div>
      )}
    </div>
  );
}

function TabPedidos({ pedidos, onUpdateEstado, onEditar }) {
  const [filtro, setFiltro] = useState('');

  const filtrados = pedidos.filter(p =>
    !filtro || p.estado === filtro
  );

  return (
    <>
      <div className="g-filters">
        <button className={`g-filter ${!filtro ? 'active' : ''}`} onClick={() => setFiltro('')}>Todos</button>
        {[...ESTADOS, 'Rechazado', 'Descartado'].map(e => (
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
                    <button className="g-btn-editar" title="Editar datos del pedido" style={{ marginRight: 6 }} onClick={() => onEditar(p)}>✎</button>
                    {estadoAnterior(p.estado) && (
                      <button
                        className="g-btn g-btn-small"
                        style={{ marginRight: 6 }}
                        onClick={() => {
                          if (window.confirm(`¿Regresar el pedido ${p.orden} a "${estadoAnterior(p.estado)}"?`)) {
                            onUpdateEstado(p.orden, estadoAnterior(p.estado));
                          }
                        }}
                      >
                        &larr; {estadoAnterior(p.estado)}
                      </button>
                    )}
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
  pedidos.filter(p => !['Iniciado', 'Rechazado', 'Descartado'].includes(p.estado)).forEach(p => {
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

  const [errorCarga, setErrorCarga] = useState('');
  const [sesion, setSesion] = useState({ usuario: '', esAdmin: false });
  useEffect(() => {
    fetch('/api/gestion/sesion')
      .then((r) => r.json())
      .then(setSesion)
      .catch(() => {});
  }, []);

  // El middleware borra la cookie de sesión y devuelve a la puerta.
  const cerrarSesion = () => window.location.replace('/gestion?salir=1');

  const [aviso, setAviso] = useState('');
  const mostrarAviso = useCallback((texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(''), 4000);
  }, []);

  // La lectura puede fallar por un arranque en frío de Vercel: reintentar
  // antes de rendirse, y si no hay datos avisarlo en pantalla (antes se
  // quedaba en blanco sin explicación).
  const cargarDatos = useCallback(async (fresh = false) => {
    setErrorCarga('');
    for (let intento = 1; intento <= 3; intento++) {
      try {
        const res = await fetch(`/api/gestion${fresh ? '?fresh=1' : ''}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.pedidos) setPedidos(data.pedidos);
        if (data.inventarios) setInventarios(data.inventarios);
        else if (data.inventario != null) setInventarios(prev => ({ ...prev, tapete: data.inventario }));
        setLoading(false);
        return;
      } catch (err) {
        console.error(`Error cargando datos (intento ${intento}/3):`, err);
        if (intento < 3) await new Promise(r => setTimeout(r, intento * 800));
      }
    }
    setErrorCarga('No pudimos cargar los pedidos. Revisa tu conexión e inténtalo de nuevo.');
    setLoading(false);
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Varias personas trabajan el mismo tablero a la vez: refrescar solo
  // mientras la pestaña está visible. 7s para que un cambio hecho en otro
  // PC se sienta inmediato en bodega (los pedidos salen de Neon, una
  // consulta barata; push real por WebSockets no cuadra con serverless).
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) cargarDatos(); }, 7000);
    const alVolver = () => { if (!document.hidden) cargarDatos(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargarDatos]);

  const [editando, setEditando] = useState(null);

  const editarPedido = async (orden, campos) => {
    setUpdating(true);
    try {
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden, ...campos }),
      });
      setPedidos(prev => prev.map(p => p.orden === orden ? { ...p, ...campos } : p));
      setEditando(null);
    } catch (err) {
      console.error('Error editando pedido:', err);
    } finally {
      setUpdating(false);
    }
  };

  const updateEstado = async (orden, nuevoEstado, guia) => {
    setUpdating(true);
    try {
      // Asignar guía no mueve de estado: solo guarda el número
      const payload = { orden, ...(nuevoEstado ? { estado: nuevoEstado } : {}) };
      if (guia) payload.guia = guia;
      await fetch('/api/gestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setPedidos(prev => prev.map(p => p.orden === orden
        ? { ...p, ...(nuevoEstado ? { estado: nuevoEstado } : {}), ...(guia ? { guia } : {}) }
        : p));
      // El pedido sale de la pestaña actual: decir a dónde fue, si no
      // parece que se hubiera borrado
      const estadoFinal = nuevoEstado || pedidos.find(p => p.orden === orden)?.estado;
      const destino = SUB_TABS.find(t => t.estado === estadoFinal
        && (t.conGuia ? Boolean(guia) : t.sinGuia ? !guia : true));
      mostrarAviso(
        nuevoEstado === 'Descartado'
          ? `${orden} descartado — queda en el Histórico`
          : destino
            ? `${orden} → ahora está en "${destino.label}"`
            : `${orden} actualizado`
      );
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

  const esBodega = USUARIOS_BODEGA.has(sesion.usuario);
  const pasosVisibles = esBodega ? SUB_TABS.filter(st => PASOS_BODEGA.has(st.id)) : SUB_TABS;

  // La pestaña de trabajo se llama "Pedidos" para todos; el historial (la
  // tabla completa de siempre) vive adentro como último paso, "Histórico" —
  // salvo en bodega, que solo ve sus tres pasos. El id no cambia.
  const tabs = esBodega
    ? [{ id: 'pendientes', label: 'Pedidos' }, { id: 'inventario', label: 'Inventario' }]
    : [
        { id: 'pendientes', label: 'Pedidos' },
        { id: 'clientes', label: 'Clientes' },
        { id: 'inventario', label: 'Inventario' },
        // La gestión de usuarios solo existe para administradores
        ...(sesion.esAdmin ? [{ id: 'usuarios', label: 'Usuarios' }, { id: 'actividad', label: 'Actividad' }] : []),
      ];

  // La burbuja suma solo los pasos que ese usuario ve
  const totalPendientes = pedidos.filter(p => pasosVisibles.some(st => perteneceATab(p, st))).length;

  return (
    <>
      <style>{`
        .g-layout { min-height: 100vh; background: #f5faf8; font-family: 'Assistant', system-ui, sans-serif; }

        .g-header { background: linear-gradient(135deg, #00ae84 0%, #005261 100%); padding: 16px 0; position: sticky; top: 0; z-index: 100; }
        .g-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 12px; }
        .g-header-title { color: #fff; font-size: 19px; font-weight: 700; letter-spacing: 0.02em; }
        .g-header-sub { color: rgba(255,255,255,0.7); font-size: 14px; margin-left: auto; }
        .g-salir { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 13px; font-weight: 600; font-family: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .g-salir:hover { background: rgba(255,255,255,0.28); }

        .g-nav { background: #fff; border-bottom: 1px solid rgba(0,82,97,0.1); padding: 6px 0; }
        .g-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; gap: 4px; overflow-x: auto; }
        .g-nav-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; background: none; font-size: 15px; font-weight: 600; color: #45564f; cursor: pointer; border-radius: 8px; transition: all 0.2s; white-space: nowrap; font-family: inherit; position: relative; }
        .g-nav-btn:hover { background: #f0f7f4; color: #005261; }
        .g-nav-btn.active { background: #e8f5f0; color: #005261; }
        .g-nav-badge { background: #00ae84; color: #fff; font-size: 12px; font-weight: 700; padding: 1px 7px; border-radius: 10px; min-width: 20px; text-align: center; }

        .g-main { max-width: 1200px; margin: 0 auto; padding: 14px 24px; line-height: 1.35; }

        .g-stat { background: #fff; border-radius: 12px; padding: 11px 14px; text-align: center; border: 1px solid rgba(0,82,97,0.08); }
        .g-stat-value { font-size: 25px; font-weight: 700; color: #005261; font-variant-numeric: tabular-nums; }
        .g-stat-label { font-size: 13px; color: #45564f; margin-top: 1px; }
        .g-stat-sub { font-size: 12px; color: #e67700; margin-top: 1px; font-weight: 600; }

        .g-pendientes { display: flex; flex-direction: column; gap: 12px; }

        .g-sub-tabs { display: flex; gap: 4px; }
        .g-sub-tab { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; border-bottom: 3px solid transparent; background: none; font-size: 15px; font-weight: 600; color: #45564f; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .g-sub-tab:hover { color: #005261; }
        .g-sub-tab.active { border-bottom-color: #005261; }
        .g-sub-count { font-size: 11px; font-weight: 700; color: #fff; background: #999; padding: 1px 7px; border-radius: 10px; min-width: 18px; text-align: center; }

        .g-print-bar { display: flex; justify-content: flex-end; }

        .g-seccion-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 10px; }

        .g-prep-card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); overflow: hidden; }
        .g-prep-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid rgba(0,82,97,0.06); }
        .g-prep-header-right { display: flex; align-items: center; gap: 8px; }
        .g-btn-editar { border: 1px solid rgba(0,82,97,0.2); background: #fff; color: #005261; border-radius: 6px; padding: 2px 8px; font-size: 14px; cursor: pointer; line-height: 1.4; transition: all 0.2s; }
        .g-btn-editar:hover { background: #e8f5f0; }
        .g-modal-campo { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #45564f; font-weight: 600; }
        .g-prep-orden { font-weight: 700; color: #00ae84; font-size: 16px; }
        .g-prep-body { padding: 4px 14px 6px; }
        /* Sin franjas: en una tarjeta angosta el ojo no viaja lo suficiente como
           para necesitar riel, y al pintar el fondo se hacía evidente que los
           renglones miden distinto (Dirección parte en dos líneas, Productos
           ocupa una por producto). Lo que sí ordena a esta escala es que todos
           arranquen a la misma altura y que etiqueta y valor contrasten. */
        .g-prep-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; min-height: 25px; padding: 3px 0; font-size: 14px; line-height: 1.35; border-bottom: 1px solid rgba(0,82,97,0.05); }
        .g-prep-row:last-child { border-bottom: none; }
        .g-prep-qty { font-size: 14px; }
        .g-prep-label { color: #7b8884; flex-shrink: 0; }
        .g-prep-row > span:last-child, .g-prep-row > strong { text-align: right; min-width: 0; overflow-wrap: break-word; }
        .g-prep-actions { padding: 8px 14px; border-top: 1px solid rgba(0,82,97,0.06); display: flex; flex-direction: column; gap: 7px; }
        .g-guia-row { display: flex; align-items: center; gap: 10px; }
        .g-guia-label { font-size: 14px; font-weight: 700; color: #005261; white-space: nowrap; }
        .g-guia-input { flex: 1; width: auto; }
        .g-guia-value { font-weight: 700; color: #005261; font-family: monospace; }

        .g-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.02em; text-transform: uppercase; }

        .g-filters { display: flex; gap: 6px; margin-bottom: 10px; overflow-x: auto; padding-bottom: 4px; }
        .g-filter { padding: 4px 12px; border: 1px solid rgba(0,82,97,0.15); background: #fff; border-radius: 6px; font-size: 14px; cursor: pointer; color: #45564f; font-family: inherit; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
        .g-filter:hover { border-color: #00ae84; color: #005261; }
        .g-filter.active { background: #005261; color: #fff; border-color: #005261; }

        .g-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); background: #fff; }
        .g-table { width: 100%; border-collapse: collapse; font-size: 15px; }
        .g-table th { text-align: left; padding: 7px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #45564f; background: #f8fbf9; border-bottom: 1px solid rgba(0,82,97,0.08); white-space: nowrap; }
        .g-table td { padding: 6px 12px; border-bottom: 1px solid rgba(0,82,97,0.05); white-space: nowrap; }
        .g-table tbody tr:nth-child(even) { background: #f1f5f3; }
        .g-table tbody tr:hover { background: #ddeee7; }
        .g-orden-cell { font-weight: 700; color: #00ae84; }

        .g-btn { padding: 6px 14px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
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
        .g-volver { align-self: center; font-size: 13px; color: #45564f; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .g-volver:hover { color: #005261; }
        .g-volver-rojo { color: #b3423a; }
        .g-volver-rojo:hover { color: #8f322b; }
        .g-btn-small { padding: 5px 12px; font-size: 13px; background: #e8f5f0; color: #005261; }
        .g-btn-small:hover { background: #d0ece4; }

        .g-empty { text-align: center; padding: 26px 16px; color: #45564f; font-size: 16px; }

        .g-inventario { display: flex; flex-direction: column; gap: 14px; }
        .g-inv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 640px) { .g-inv-grid { grid-template-columns: 1fr; } }
        .g-inv-form { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); padding: 14px 16px; }
        .g-inv-form h3 { font-size: 17px; color: #005261; margin-bottom: 4px; }
        .g-inv-form p { font-size: 14px; color: #45564f; margin-bottom: 10px; }
        .g-inv-input-row { display: flex; gap: 12px; }
        .g-input { padding: 7px 12px; border: 1px solid rgba(0,82,97,0.2); border-radius: 8px; font-size: 15px; font-family: inherit; outline: none; width: 200px; }
        .g-input:focus { border-color: #00ae84; box-shadow: 0 0 0 3px rgba(0,174,132,0.1); }

        .g-nav-crear { margin-left: auto; white-space: nowrap; align-self: center; }
        .g-inv-producto { background: #fff; border-radius: 12px; border: 1px solid rgba(0,82,97,0.08); padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
        .g-inv-producto h3 { font-size: 17px; color: #005261; }

        .g-modal-overlay { position: fixed; inset: 0; background: rgba(0,40,45,0.5); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 20px; }
        .g-modal { background: #fff; border-radius: 16px; padding: 20px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
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

        .g-loading { display: flex; align-items: center; justify-content: center; min-height: 40vh; font-size: 17px; color: #45564f; }
        .g-usuarios { display: flex; flex-direction: column; gap: 12px; }
        .g-form-usuario { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
        .g-form-usuario .g-input { width: 230px; }
        .g-check { display: flex; align-items: center; gap: 7px; font-size: 14px; color: #45564f; font-weight: 600; cursor: pointer; }
        .g-nota { padding: 0 20px 16px; font-size: 13.5px; color: #45564f; }
        .g-yo { color: #00ae84; font-weight: 700; font-size: 13px; }
        .g-btn-small { padding: 6px 12px; font-size: 13px; }
        .g-aviso { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 400; background: #005261; color: #fff; padding: 12px 22px; border-radius: 10px; font-size: 15px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,0.18); max-width: 90vw; text-align: center; }
        .g-updating { position: fixed; top: 70px; right: 24px; background: #005261; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; z-index: 200; animation: g-fade-in 0.2s; }
        @keyframes g-fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="g-layout">
        <header className="g-header">
          <div className="g-header-inner">
            <span className="g-header-title">POLO A TIERRA</span>
            <span className="g-header-sub">
              {sesion.usuario ? `Gestión · ${sesion.usuario}` : 'Gestión'}
            </span>
            {sesion.usuario && (
              <button className="g-salir" onClick={cerrarSesion}>Cerrar sesión</button>
            )}
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
            {!esBodega && (
              <button className="g-btn g-btn-outline g-nav-crear" onClick={() => setShowCrear(true)}>
                + Pedido manual
              </button>
            )}
          </div>
        </nav>

        <main className="g-main">
          {updating && <div className="g-updating">Actualizando...</div>}
          {aviso && <div className="g-aviso" role="status">{aviso}</div>}

          {loading ? (
            <div className="g-loading">Cargando datos...</div>
          ) : errorCarga ? (
            <div className="g-loading" style={{ flexDirection: 'column', gap: 14 }}>
              <span style={{ color: '#D64541', fontWeight: 600 }}>{errorCarga}</span>
              <button className="g-btn g-btn-primary" onClick={() => { setLoading(true); cargarDatos(true); }}>
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {tab === 'pendientes' && <TabPendientes pedidos={pedidos} pasos={pasosVisibles} historico={!esBodega} onUpdateEstado={updateEstado} onEditar={setEditando} />}
              {tab === 'clientes' && <TabClientes pedidos={pedidos} />}
              {tab === 'inventario' && <TabInventario pedidos={pedidos} inventarios={inventarios} onUpdateInventario={updateInventario} />}
              {tab === 'usuarios' && sesion.esAdmin && <TabUsuarios yo={sesion.usuario} mostrarAviso={mostrarAviso} />}
              {tab === 'actividad' && sesion.esAdmin && <TabActividad />}
            </>
          )}
        </main>

        {showCrear && (
          <FormPedidoManual onCrear={crearPedido} onCerrar={() => setShowCrear(false)} creando={creando} />
        )}
        {editando && (
          <ModalEditar pedido={editando} onGuardar={editarPedido} onCerrar={() => setEditando(null)} guardando={updating} />
        )}
      </div>
    </>
  );
}
