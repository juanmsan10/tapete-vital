import Link from 'next/link';
import { Header, Footer } from '@/components/Sections';
import CheckoutForm from '@/components/CheckoutForm';

export const metadata = {
  title: 'Consigue tu Tapete Vital — Polo a Tierra',
  description: 'Elige tu paquete, completa tus datos de envío y paga de forma segura con Bold.',
};

export default function Comprar() {
  return (
    <>
      <Header />
      <main className="checkout">
        <div className="contenedor">
          <div className="centro">
            <span className="eyebrow">Estás a un paso</span>
            <h1 className="titulo-seccion">Consigue tu Tapete Vital</h1>
            <p className="texto-grande" style={{ maxWidth: 560, margin: '12px auto 0' }}>
              Elige tu paquete, dinos a dónde lo enviamos y paga de forma segura.
            </p>
          </div>
          <CheckoutForm />
          <p className="centro" style={{ marginTop: 28, fontSize: 14 }}>
            <Link href="/" style={{ color: 'var(--teal-oscuro)' }}>← Volver a la página principal</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
