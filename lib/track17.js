// ============================================================
// 17TRACK — https://api.17track.net
// Sustituye a la API de Interrapidísimo mientras la cuenta empresarial
// existe (en trámite desde el 1-sep-2026, ~10 días): cubre a Inter y
// avisa por webhook cuando el paquete llega, sin contrato con ellos.
//
// Requiere TRACK17_API_KEY. Sin la variable no registra nada y lo dice
// en el log: nunca bloquea el guardado de una guía en el panel.
// ============================================================
import { buscarPorGuia, telefonoE164, marcarPreguntado } from '@/lib/pedidos';
import { notificarGHL, enviarCorreo, htmlPedido } from '@/lib/email';

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
      // Inter emite eventos con descripción nula de forma rutinaria (tres en un
      // solo historial el 8-sep-2026), así que se busca el más reciente que sí
      // diga algo en vez de quedarse con el último a secas.
      const eventos = info?.tracking?.providers?.[0]?.events ?? [];
      const evento =
        [info?.latest_event, ...eventos]
          .map((e) => String(e?.description ?? '').trim())
          .find(Boolean) ?? '';
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

// 17track marca "DeliveryFailure" ante cualquier movimiento de Inter que no
// entiende, y NO lo revierte: el 6-sep-2026 la guía 700204512900 seguía en
// DeliveryFailure con su último evento en "En camino hacia ti" y el rastreador
// de Inter diciendo "En reparto".
//
// Listar las frases normales para ignorarlas fue perder: el jueves eran
// "Retorno a Centro Logístico", el domingo "En camino hacia ti", y cada semana
// aparece una nueva. Inter sí tiene una lista CERRADA de desenlaces —la de su
// acta de entrega: Entrega Exitosa, Desconocido, Dirección Errada, No Reclamo,
// Rehusado, No Reside, Otros—, así que se reconoce el problema en vez de
// perseguir lo normal.
const PROBLEMA_REAL =
  /direcci[óo]n\s*errada|rehusad|no\s*reclam|no\s*reside|desconocid|devoluci[óo]n|siniestr|no\s*fue\s*posible/i;

// Un evento sin descripción NO es señal de nada: Inter los emite a diario y
// tratarlos como sospechosos costó la tercera alarma falsa (8-sep-2026, un
// paquete que se entregó cinco horas después). Solo habla el texto que
// describe un desenlace; el silencio se queda callado.
export function esProblemaReal(evento) {
  return PROBLEMA_REAL.test(String(evento || ''));
}

// Consultar el estado NO descuenta cuota (verificado 6-sep-2026: 11 antes y 11
// después de dos consultas). Por eso el cron puede preguntar cada media hora en
// vez de depender de que 17track empuje, que es lo que nos dejó tres días sin
// enterarnos de una entrega en septiembre.
export async function consultarGuias(guias) {
  const token = process.env.TRACK17_API_KEY;
  const numeros = [...new Set(guias.map((g) => String(g || '').trim()).filter(Boolean))];
  if (!token || !numeros.length) return [];

  const salida = [];
  for (let i = 0; i < numeros.length; i += LOTE) {
    try {
      const res = await fetch(`${API}/gettrackinfo`, {
        method: 'POST',
        headers: { '17token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          numeros.slice(i, i + LOTE).map((number) => ({ number, carrier: INTERRAPIDISIMO }))
        ),
      });
      const data = await res.json().catch(() => null);
      if (data) salida.push(data);
    } catch (err) {
      console.error('[17track] Error consultando estados:', err.message);
    }
  }
  return salida;
}

// Qué hacer con lo que 17track reporta, venga de su push o de nuestra consulta.
// Vive aquí y no en la ruta del webhook porque ahora tiene dos llamadores.
//
// La defensa no es creerle al remitente sino al dato: solo se actúa sobre una
// guía que corresponda a un pedido nuestro que siga en "Enviado". Lo peor que
// consigue un push falso es una pregunta de más o un correo de más.
export async function procesarEstados(estados) {
  for (const [guia, { estado, detalle, evento }] of estados) {
    const clave = estado.toLowerCase();
    const entregado = clave === 'delivered';
    if (!entregado && !PROBLEMAS.has(clave)) continue;
    // El estado de 17track no basta: solo se avisa si el último evento de Inter
    // describe un desenlace de verdad. Una alerta que grita en falso se deja de
    // leer, y entonces no sirve el día que sea real.
    if (!entregado && !esProblemaReal(evento)) {
      console.log(`[17track] ${guia}: ${estado} pero el último evento es "${evento}" — no se avisa.`);
      continue;
    }

    const pedidos = await buscarPorGuia(guia);
    if (!pedidos.length) {
      console.warn(`[17track] La guía ${guia} no corresponde a ningún pedido.`);
      continue;
    }

    for (const pedido of pedidos) {
      if (pedido.estado !== 'Enviado') {
        console.log(`[17track] ${pedido.orden} está en "${pedido.estado}": se ignora ${estado}.`);
        continue;
      }

      if (entregado) {
        // Preguntado una sola vez: quien no toca el botón sigue en "Enviado",
        // y sin esta marca la consulta de cada media hora se lo repetiría.
        if (pedido.preguntado) {
          console.log(`[17track] ${pedido.orden} ya tiene su pregunta desde ${pedido.preguntado}.`);
          continue;
        }
        const nombre = String(pedido.nombre || '').trim();
        await notificarGHL(
          {
            // Ver el comentario del cron: sin esto los dos flujos de GHL son
            // indistinguibles para quien los recibe.
            evento: 'entrega',
            phone: telefonoE164(pedido.telefono),
            first_name: nombre.split(/\s+/)[0] || '',
            full_name: nombre,
            email: pedido.email || '',
            orden: pedido.orden,
            nombre,
            telefono: pedido.telefono,
            ciudad: pedido.ciudad,
            guia: pedido.guia,
            productos: pedido.productos || `${pedido.cantidad || 1}× Tapete Vital`,
          },
          process.env.GHL_WEBHOOK_ENTREGA_URL
        );
        await marcarPreguntado(pedido.orden);
        console.log(`[17track] ${pedido.orden} entregado según Inter → preguntando al cliente.`);
      } else {
        await enviarCorreo({
          to: process.env.EMAIL_INTERNO || 'pedidos@tapetevital.co',
          subject: `🔴 Problema con el envío ${pedido.orden} (${estado})`,
          html: htmlPedido({
            titulo: 'Interrapidísimo reporta un problema con este envío',
            orden: pedido.orden,
            datos: {
              Estado: detalle ? `${estado} (${detalle})` : estado,
              'Último movimiento': evento || 'no reportado',
              Cliente: pedido.nombre,
              Teléfono: pedido.telefono,
              Ciudad: pedido.ciudad,
              Guía: pedido.guia,
              'Qué hacer': 'Rastrear la guía con Inter y contactar al cliente hoy, antes de que tenga que reclamar.',
            },
          }),
        });
        console.log(`[17track] ${pedido.orden} con problema (${estado}) → correo interno enviado.`);
      }
    }
  }
}

// Nombres de estado de 17track v2.4 (los checkboxes de su panel en español:
// No entregado = DeliveryFailure, Alerta = Exception, Caducado = Expired)
const PROBLEMAS = new Set(['deliveryfailure', 'exception', 'expired']);
