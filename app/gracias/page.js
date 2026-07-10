'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Sections';

function ContenidoGracias() {
  const params = useSearchParams();
  const orderId = params.get('bold-order-id') || params.get('order-id') || '';
  const estado = (params.get('bold-tx-status') || '').toLowerCase();
  const aprobado = estado === 'approved' || estado === '';

  useEffect(() => {
    if (aprobado && orderId && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', { currency: 'COP', content_name: 'Tapete Vital' }, { eventID: orderId });
    }
  }, [aprobado, orderId]);

  if (!aprobado) {
    return (
      <div className="caja">
        <h1>Tu pago no pudo completarse</h1>
        <p>No te preocupes: no se realizó ningún cobro.</p>
        <p>
          Puedes intentarlo de nuevo, o escribirnos por WhatsApp y te ayudamos a completar tu
          pedido en un minuto.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <Link href="/comprar" className="boton boton--primario">Intentar de nuevo</Link>
          <a href="https://wa.me/573024019300" className="boton boton--claro" style={{ border: '1.5px solid var(--borde)' }}>
            Escribir por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="caja caja--sombra">
        <h1>¡Tu Tapete Vital está en camino!</h1>
        {orderId && <p>Número de pedido: <strong>{orderId}</strong></p>}
        <p>
          <strong>Lo estamos alistando para que llegue a ti lo más pronto posible.</strong>
        </p>
        <p>
          Te contactaremos para confirmarte que está en camino y entregarte el # de guía con el que podrás rastrear tu paquete.
        </p>
      </div>
      <div className="soporte-gracias">
        <h2>¿Necesitas soporte?</h2>
        <p>Escríbenos por whatsapp al <a href="https://wa.me/573024019300">(+57) 302 4019300</a>.</p>
      </div>
    </>
  );
}

export default function Gracias() {
  return (
    <>
      <Header />
      <main className="gracias">
        <Suspense fallback={<div className="caja"><p>Confirmando tu pago…</p></div>}>
          <ContenidoGracias />
        </Suspense>
      </main>
    </>
  );
}
