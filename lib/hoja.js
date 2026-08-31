// ============================================================
// Acceso a la Google Sheet (vía Apps Script).
// Punto único por donde pasan las tres hojas del sistema:
// Pedidos, Usuarios y Auditoria.
//
// La Sheet tarda ~2s por lectura y falla de vez en cuando, así que
// aquí viven el reintento y el caché corto que el resto del código
// da por sentados.
// ============================================================

const URL_HOJA = process.env.GOOGLE_SHEET_URL || '';

// El caché es lo que hace viable autenticar contra la Sheet: el navegador
// reenvía las credenciales en cada petición, y sin él cada una costaría ~2s.
// A cambio, crear un usuario o cambiar una contraseña tarda hasta 15s en
// aplicarse (el middleware corre en Edge, con su propia copia del caché, así
// que invalidar desde las rutas API no lo alcanza). El panel lo avisa.
const CACHE_MS = 15_000;
const cache = new Map(); // hoja -> { filas, ts }

export function invalidarCache(hoja = null) {
  if (hoja) cache.delete(hoja || '');
  else cache.clear();
}

export async function leerHoja(hoja = null, { fresco = false } = {}) {
  if (!URL_HOJA) return [];
  const llave = hoja || '';
  const guardado = cache.get(llave);
  if (!fresco && guardado && Date.now() - guardado.ts < CACHE_MS) return guardado.filas;

  const url = `${URL_HOJA}?action=read${hoja ? `&hoja=${encodeURIComponent(hoja)}` : ''}`;
  let ultimoError;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const filas = data.filas || data.pedidos || [];
      cache.set(llave, { filas, ts: Date.now() });
      return filas;
    } catch (err) {
      ultimoError = err;
      console.error(`[hoja] Lectura fallida (${llave || 'Pedidos'}, intento ${intento}/2):`, err.message);
      if (intento < 2) await new Promise((r) => setTimeout(r, 600));
    }
  }
  // Antes que devolver vacío (que en el panel se ve como "no hay nada"),
  // servir lo último bueno que tengamos.
  if (guardado) {
    console.warn('[hoja] Sirviendo caché tras fallo de lectura');
    return guardado.filas;
  }
  throw ultimoError;
}

// La Sheet evalúa como fórmula todo texto que empiece por = + - @, y lo rompe:
// un teléfono E.164 ("+57 319 3111598") aterrizaba como #ERROR! y el dato se
// perdía. El apóstrofo inicial le dice "esto es texto" y no forma parte del
// valor cuando se lee de vuelta.
const CONTROL = new Set(['action', 'clave', 'valor', 'hoja']);
const escaparFormulas = (cuerpo) =>
  Object.fromEntries(
    Object.entries(cuerpo).map(([k, v]) => [
      k,
      !CONTROL.has(k) && typeof v === 'string' && /^\s*[=+\-@]/.test(v) ? `'${v}` : v,
    ])
  );

async function escribir(cuerpo, hoja = null) {
  if (!URL_HOJA) return null;
  const res = await fetch(URL_HOJA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(escaparFormulas(hoja ? { ...cuerpo, hoja } : cuerpo)),
    cache: 'no-store',
  });
  invalidarCache(hoja);
  const texto = await res.text();
  // El Apps Script responde {"ok":true,...} en todo éxito y {"error":...} si no;
  // cualquier otra cosa (HTML de error de Google, non-200) es escritura fallida.
  // Sin esto un pedido podía quedar sin fila —invisible para el cron de
  // recuperación— mientras el resto del flujo seguía como si nada.
  let data = null;
  try {
    data = JSON.parse(texto);
  } catch {}
  if (!res.ok || !data?.ok) {
    throw new Error(`Escritura a la Sheet falló (HTTP ${res.status}): ${texto.slice(0, 120)}`);
  }
  return texto;
}

export const agregarFila = (datos, hoja = null) => escribir(datos, hoja);

export const actualizarFila = (valor, campos, { hoja = null, clave = 'orden' } = {}) =>
  escribir({ action: 'update', clave, valor, ...campos }, hoja);

export const borrarFila = (valor, { hoja = null, clave = 'orden' } = {}) =>
  escribir({ action: 'delete', clave, valor }, hoja);
