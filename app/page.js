import Script from 'next/script';
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

export default function Landing() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FranjaConfianza />
        <Beneficios />
        <ComoFunciona />
        <Medicos />
        <Testimonios />
        <Oferta />
        <Garantia />
        <FAQ />
        <CTAFinal />
      </main>
      <Script id="evento-viewcontent" strategy="afterInteractive">
        {`if (window.fbq) fbq('track', 'ViewContent', { content_name: 'Tapete Vital', currency: 'COP', value: 299000 });`}
      </Script>
    </>
  );
}
