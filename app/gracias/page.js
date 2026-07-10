'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer, RaizDivisor } from '@/components/Sections';

function ContenidoGracias() {
  const params = useSearchParams();
  const orderId = params.get('bold-order-id') || params.get('order-id') || '';
  const estado = (params.get('bold-tx-status') || '').toLowerCase();
  const aprobado = estado === 'approved' || estado === '';

  useEffect(() => {
    if (aprobado && orderId && typeof window !== 'undefined' && window.fbq) {
      // event_id = orderId → Meta deduplica con el Purchase del webhook (CAPI)
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
    <div className="caja">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#00AE84" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5l2.5 2.5L16 9" />
      </svg>
      <h1>¡Tu Tapete Vital está en camino!</h1>
      {orderId && <p>Número de pedido: <strong>{orderId}</strong></p>}
      <p>
        Recibimos tu pago con éxito. Prepararemos tu pedido y te contactaremos por WhatsApp con la
        guía de envío.
      </p>
      <p>
        Desde esta noche, tu cuerpo empieza a recuperar lo que la vida moderna le quitó. 🌿
      </p>
      <RaizDivisor />
    </div>
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
      <Footer />
    </>
  );
}
