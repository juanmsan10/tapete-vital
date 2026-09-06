// ============================================================
// POST /api/webhook/track17 — 17track avisa que un envío cambió
//
// Entregado ("Delivered") → se dispara el flujo de GHL que le pregunta al
// cliente si ya lo tiene en sus manos; su respuesta cierra el pedido por
// /api/entrega. Se le PREGUNTA en vez de dar la entrega por hecha: Inter
// marca "entregado" lo que dejó en portería o con un vecino.
//
// Problema real (dirección errada, rehusado, no reclamado...) → correo interno
// al equipo, para resolverlo antes de que el cliente reclame.
//
// Qué se hace con cada estado vive en lib/track17.js, porque el cron consulta
// lo mismo cada media hora y no debe haber dos versiones de esa decisión.
//
// Configurar esta URL en https://api.17track.net/admin/settings
// (Package Webhook, V2.4, estados: Entregado, No entregado, Alerta, Caducado)
// ============================================================
import { after } from 'next/server';
import { estadosPorGuia, procesarEstados } from '@/lib/track17';

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  if (!payload) return Response.json({ error: 'JSON inválido' }, { status: 400 });

  const estados = estadosPorGuia(payload);
  console.log(
    '[17track] Push:', payload?.event || 'sin evento', '—',
    estados.size ? [...estados].map(([g, e]) => `${g}:${e.estado}`).join(', ') : 'sin guías'
  );

  // Se responde de una y el trabajo sigue después: un webhook que tarda es
  // un webhook que el emisor reintenta.
  after(() => procesarEstados(estados));
  return Response.json({ received: true });
}
