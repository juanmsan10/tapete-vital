// Landing por ángulo de pauta: /insomnio, /piernas, /dolor, /presion,
// /estres, /radiacion, /recuperacion, /mama. Misma página que la raíz,
// con titular, beneficios, oferta, testimonios y FAQ ajustados al ángulo
// del anuncio que trae a la persona (ver lib/angulos.js).
import Script from 'next/script';
import { ANGULOS } from '@/lib/angulos';
import {
  Header,
  Hero,
  FranjaConfianza,
  Beneficios,
  ComoFunciona,
  Medicos,
  Testimonios,
  Oferta,
  Garantia,
  FAQ,
  CTAFinal,
} from '@/components/Sections';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ANGULOS).map((angulo) => ({ angulo }));
}

export async function generateMetadata({ params }) {
  const { angulo } = await params;
  return { title: ANGULOS[angulo].meta };
}

export default async function LandingAngulo({ params }) {
  const { angulo } = await params;
  const a = ANGULOS[angulo];
  return (
    <>
      <Header />
      <main>
        <Hero h1={a.h1} subtitulo={a.subtitulo} />
        <FranjaConfianza />
        <Beneficios items={a.beneficios} />
        <ComoFunciona />
        <Medicos />
        <Testimonios primero={a.testimoniosPrimero} />
        <Oferta titulo={a.oferta.titulo} texto={a.oferta.texto} />
        <Garantia />
        <FAQ extra={a.faqExtra} />
        <CTAFinal />
      </main>
      <Script id="evento-viewcontent" strategy="afterInteractive">
        {`document.cookie='angulo=${angulo};path=/;max-age=2592000';if (window.fbq) fbq('track', 'ViewContent', { content_name: 'Tapete Vital', content_category: '${angulo}', currency: 'COP', value: 299000 });`}
      </Script>
    </>
  );
}
