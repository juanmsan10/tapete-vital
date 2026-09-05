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

// Un solo request por lote: su endpoint acepta hasta 40 números, y mandar
// siete llamadas en paralelo hizo que cuatro volvieran vacías (3-sep-2026,
// límite de concurrencia de 17track). El barrido del cron llama aquí con
// todas las guías de una; el panel, con una sola.
const LOTE = 40;

export async function registrarGuias(guias) {
  const token = process.env.TRACK17_API_KEY;
  const numeros = [...new Set(guias.map((g) => String(g || '').trim()).filter(Boolean))];
  if (!numeros.length) return { registradas: 0 };
  if (!token) {
    console.warn('[17track] TRACK17_API_KEY no configurada. Guías sin registrar:', numeros.length);
    return { registradas: 0, skipped: true };
  }

  let registradas = 0;
  for (let i = 0; i < numeros.length; i += LOTE) {
    const trozo = numeros.slice(i, i + LOTE);
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { '17token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(trozo.map((number) => ({ number, carrier: INTERRAPIDISIMO }))),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        console.error('[17track] Registro fallido para', trozo.length, 'guías — HTTP', res.status);
        continue;
      }
      registradas += (data.data?.accepted || []).length;
      // Código -18019901 = ya registrada. Es el caso normal del barrido, no
      // un problema, y no descuenta cuota. Cualquier otro rechazo sí importa.
      for (const r of data.data?.rejected || []) {
        if (r.error?.code !== -18019901) {
          console.warn('[17track] Rechazada', r.number, '→', r.error?.message?.slice(0, 120));
        }
      }
    } catch (err) {
      console.error('[17track] Error registrando lote:', err.message);
    }
  }
  if (registradas) console.log('[17track] Guías nuevas vigiladas:', registradas);
  return { registradas };
}

export const registrarGuia = (guia) => registrarGuias([guia]);

// 17track no documenta el anidamiento exacto de su push ni lo firma, así que
// en vez de casarse con una forma concreta se recorre el objeto buscando
// (número, último estado). Se guarda además la descripción del último evento
// de Inter, que es lo único que distingue un problema real del ruido.
export function estadosPorGuia(payload) {
  const estados = new Map();
  const visitar = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) return nodo.forEach(visitar);
    const info = nodo.track_info ?? nodo;
    const ultimo = info?.latest_status ?? nodo.latest_status;
    if (nodo.number && ultimo?.status) {
      const evento =
        info?.latest_event?.description ??
        info?.tracking?.providers?.[0]?.events?.[0]?.description ??
        '';
      estados.set(String(nodo.number).trim(), {
        estado: String(ultimo.status),
        detalle: String(ultimo.sub_status || ''),
        evento: String(evento || '').trim(),
      });
    }
    Object.values(nodo).forEach(visitar);
  };
  visitar(payload);
  return estados;
}

// Inter mueve los paquetes entre centros y 17track traduce esos movimientos
// como "DeliveryFailure". El 4-sep-2026 dos envíos despachados ese mismo día,
// en tránsito normal, dispararon alarma por un "Retorno a Centro Logístico".
// Una alerta que grita en falso se deja de leer, así que estos se callan.
const MOVIMIENTOS_NORMALES = /centro log[íi]stico|en reparto|en bodega|viajando/i;

export function esRuido(evento) {
  return MOVIMIENTOS_NORMALES.test(evento || '');
}
