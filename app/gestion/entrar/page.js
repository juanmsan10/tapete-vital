'use client';
// ============================================================
// /gestion/entrar — la puerta del panel, con la marca.
// Reemplaza el diálogo gris de auth Basic del navegador. Al entrar
// queda la cookie de sesión de 90 días; el middleware manda aquí a
// quien llegue a /gestion sin sesión, y salta directo al panel a
// quien ya la tenga. Campos grandes a propósito: la usa gente
// mayor en bodega. El autocomplete deja que Chrome guarde la clave.
// ============================================================
import { useState } from 'react';

export default function Entrar() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setEntrando(true);
    try {
      const res = await fetch('/api/gestion/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      if (res.ok) {
        window.location.replace('/gestion');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No pudimos verificar el acceso. Inténtalo de nuevo.');
    } catch {
      setError('Sin conexión. Revisa el internet e inténtalo de nuevo.');
    }
    setEntrando(false);
  };

  return (
    <>
      <style>{`
        .e-fondo { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(135deg, #00ae84 0%, #005261 100%); font-family: 'Assistant', system-ui, sans-serif; }
        .e-tarjeta { background: #fff; border-radius: 18px; padding: 40px 36px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0, 40, 48, 0.35); }
        .e-logo { display: block; width: 72px; height: 72px; margin: 0 auto 16px; border-radius: 16px; }
        .e-titulo { text-align: center; color: #005261; font-size: 24px; font-weight: 700; letter-spacing: 0.02em; }
        .e-sub { text-align: center; color: #45564f; font-size: 16px; margin: 6px 0 28px; }
        .e-campo { display: block; margin-bottom: 18px; }
        .e-etiqueta { display: block; font-size: 16px; font-weight: 600; color: #16302a; margin-bottom: 8px; }
        .e-input { width: 100%; box-sizing: border-box; font-family: inherit; font-size: 18px; padding: 14px 16px; border: 2px solid rgba(0, 82, 97, 0.18); border-radius: 12px; color: #16302a; background: #f5faf8; outline: none; transition: border-color 0.2s; }
        .e-input:focus { border-color: #00ae84; background: #fff; }
        .e-boton { width: 100%; margin-top: 8px; font-family: inherit; font-size: 18px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #00ae84 0%, #005261 100%); border: none; border-radius: 12px; padding: 15px; cursor: pointer; transition: opacity 0.2s; }
        .e-boton:hover { opacity: 0.92; }
        .e-boton:disabled { opacity: 0.6; cursor: default; }
        .e-error { background: #fdf0ef; color: #d64541; border: 1px solid rgba(214, 69, 65, 0.3); border-radius: 10px; padding: 12px 14px; font-size: 15px; font-weight: 600; margin-bottom: 18px; text-align: center; }
      `}</style>
      <div className="e-fondo">
        <form className="e-tarjeta" onSubmit={entrar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="e-logo" src="/gestion/icon.png" alt="" />
          <div className="e-titulo">POLO A TIERRA</div>
          <p className="e-sub">Panel de gestión de pedidos</p>

          {error && <div className="e-error" role="alert">{error}</div>}

          <label className="e-campo">
            <span className="e-etiqueta">Usuario</span>
            <input
              className="e-input"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </label>
          <label className="e-campo">
            <span className="e-etiqueta">Contraseña</span>
            <input
              className="e-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </label>

          <button className="e-boton" type="submit" disabled={entrando || !usuario || !clave}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </>
  );
}
