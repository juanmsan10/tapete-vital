// ============================================================
// 17TRACK — https://api.17track.net
// Sustituye a la API de Interrapidísimo mientras la cuenta empresarial
// existe (en trámite desde el 1-sep-2026, ~10 días): cubre a Inter y
// avisa por webhook cuando el paquete llega, sin contrato con ellos.
//
// Requiere TRACK17_API_KEY. Sin la variable no registra nada y lo dice
// en el log: nunca bloquea el guardado de una guía en el panel.
// ============================================================
const API = 'https://api.17track.net/track/v2.4';

// Código de Inter Rapidísimo en el catálogo de 17track
// (https://res.17track.net/asset/carrier/info/apicarrier.all.json)
const INTERRAPIDISIMO = 100491;

export async function registrarGuia(guia) {
  const token = process.env.TRACK17_API_KEY;
  const numero = String(guia || '').trim();
  if (!token) {
    console.warn('[17track] TRACK17_API_KEY no configurada. Guía sin registrar:', numero);
    return { ok: false, skipped: true };
  }
  if (!numero) return { ok: false, skipped: true };

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { '17token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ number: numero, carrier: INTERRAPIDISIMO }]),
    });
    const data = await res.json().catch(() => null);
    // Una guía ya registrada vuelve en "rejected" y NO es un problema:
    // pasa cada vez que se corrige un número de guía en el panel.
    const rechazo = data?.data?.rejected?.[0];
    if (!res.ok || rechazo) {
      console.warn('[17track] No aceptada', numero, '→', JSON.stringify(rechazo ?? data).slice(0, 200));
      return { ok: false };
    }
    console.log('[17track] Guía registrada:', numero);
    return { ok: true };
  } catch (err) {
    console.error('[17track] Error registrando', numero, err.message);
    return { ok: false };
  }
}

// 17track no documenta el anidamiento exacto de su push ni lo firma, así que
// en vez de casarse con una forma concreta se recorre el objeto buscando
// pares (número, último estado). Cuando llegue el primer push real, el log
// dirá la forma verdadera y esto se podrá apretar.
export function estadosPorGuia(payload) {
  const estados = new Map();
  const visitar = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) return nodo.forEach(visitar);
    const ultimo = nodo.track_info?.latest_status ?? nodo.latest_status;
    if (nodo.number && ultimo?.status) {
      estados.set(String(nodo.number).trim(), {
        estado: String(ultimo.status),
        detalle: String(ultimo.sub_status || ''),
      });
    }
    Object.values(nodo).forEach(visitar);
  };
  visitar(payload);
  return estados;
}
