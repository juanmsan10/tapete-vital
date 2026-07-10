import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Tapete Vital — Terapia en casa que restaura tu equilibrio | Polo a Tierra',
  description:
    'Conecta tu cuerpo con la energía de la tierra sin cambiar tu rutina. Mejora tu sueño, reduce la inflamación y recupera tu energía. Garantía de 60 días.',
  openGraph: {
    title: 'Tapete Vital — Polo a Tierra',
    description: 'Terapia en casa que restaura tu equilibrio. Garantía de satisfacción de 60 días.',
    locale: 'es_CO',
    type: 'website',
  },
};

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {PIXEL_ID && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');`}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
