import Link from 'next/link';
import { Header } from '@/components/Sections';
import TiendaCheckout from '@/components/TiendaCheckout';

export const metadata = {
  title: 'Tienda — Polo a Tierra',
  description:
    'Tapete Vital, Pad Portátil y Parches Esenciales. Arma tu pedido y paga de forma segura con Bold.',
};

export default function Tienda() {
  return (
    <>
      <Header />
      <main className="checkout">
        <div className="contenedor">
          <div className="centro">
            <span className="eyebrow">Tienda</span>
            <h1 className="titulo-seccion">Arma tu pedido</h1>
            <p className="texto-grande tienda-subtitulo" style={{ maxWidth: 560, margin: '12px auto 0' }}>
              Elige tus productos, dinos a dónde los enviamos y paga de forma segura.
            </p>
          </div>
          <TiendaCheckout />
          <p className="centro" style={{ marginTop: 28, fontSize: 14 }}>
            <Link href="/" style={{ color: 'var(--teal-oscuro)' }}>← Volver a la página principal</Link>
          </p>
        </div>
      </main>
    </>
  );
}
