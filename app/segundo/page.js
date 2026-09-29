// Checkout de "segundo tapete" para clientes que ya compraron: el precio de
// cliente ($269.000) aplica desde 1 unidad. Llega solo por el correo de
// upsell de 24h (ver cron de carritos abandonados), por eso va sin indexar.
import Script from 'next/script';
import Link from 'next/link';
import { Header } from '@/components/Sections';
import CheckoutForm from '@/components/CheckoutForm';
import { formatoCOP, PRECIO_UNITARIO, PRECIO_UNITARIO_DESCUENTO } from '@/lib/pricing';

export const metadata = {
  title: 'Tu segundo tapete, a precio de cliente — Polo a Tierra',
  description: 'Por ser cliente de Polo a Tierra, tu siguiente Tapete Vital queda a precio de cliente.',
  robots: { index: false, follow: false },
};

export default function Segundo() {
  return (
    <>
      <Header />
      <main className="checkout">
        <div className="contenedor">
          <div className="centro">
            <span className="eyebrow">Solo para clientes</span>
            <h1 className="titulo-seccion">Tu segundo tapete, a precio de cliente</h1>
            <p className="texto-grande" style={{ maxWidth: 560, margin: '12px auto 0' }}>
              Ya tienes el tuyo. El siguiente — para la otra cama, el escritorio o tus papás —
              queda en {formatoCOP(PRECIO_UNITARIO_DESCUENTO)} en vez de {formatoCOP(PRECIO_UNITARIO)},
              con la misma garantía de 60 días.
            </p>
          </div>
          <CheckoutForm segundo />
          <p className="centro" style={{ marginTop: 28, fontSize: 14 }}>
            <Link href="/" style={{ color: 'var(--teal-oscuro)' }}>← Volver a la página principal</Link>
          </p>
        </div>
      </main>
      {/* La cookie marca el origen del pedido como "segundo" (misma mecánica de /[angulo]) */}
      <Script id="origen-segundo" strategy="afterInteractive">
        {`document.cookie='angulo=segundo;path=/;max-age=2592000';`}
      </Script>
    </>
  );
}
