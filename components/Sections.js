import Link from 'next/link';

const CDN = 'https://assets.cdn.filesafe.space/TfH7DWHmeMH26MxEDE8t/media';

/* ---------- Iconos SVG inline (trazo limpio, estilo del manual) ---------- */
const Icono = {
  luna: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ae84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  gota: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ae84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  corazon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ae84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.5-1.5 2-3.2 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.8.5 3.5 2 5l7 7z" />
    </svg>
  ),
  sol: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ae84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  ),
  candado: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
  ),
  escudo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  camion: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="14" height="11" rx="1" /><path d="M15 10h4l3 3v4h-7" /><circle cx="6" cy="19" r="1.6" /><circle cx="18" cy="19" r="1.6" /></svg>
  ),
  whatsapp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" /></svg>
  ),
};

/* ---------- Divisor raíz: elemento firma de la marca ---------- */
export function RaizDivisor({ claro = false }) {
  const color = claro ? 'rgba(255,255,255,0.6)' : '#00AE84';
  return (
    <div className="raiz-divisor" aria-hidden="true">
      <svg width="64" height="34" viewBox="0 0 64 34" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <line x1="32" y1="0" x2="32" y2="16" />
        <path d="M32 16 C 22 18, 14 22, 6 30" />
        <path d="M32 16 C 42 18, 50 22, 58 30" />
        <path d="M32 16 C 27 22, 24 27, 22 33" />
        <path d="M32 16 C 37 22, 40 27, 42 33" />
        <ellipse cx="27" cy="4" rx="3.4" ry="2" fill={color} stroke="none" transform="rotate(-30 27 4)" />
        <ellipse cx="37" cy="3" rx="3.4" ry="2" fill={color} stroke="none" transform="rotate(30 37 3)" />
      </svg>
    </div>
  );
}

export function Header() {
  return (
    <header className="header">
      <div className="contenedor">
        <img src={`${CDN}/690bcc277b2dc5de3341eb16.png`} alt="Polo a Tierra" style={{ height: 54 }} />
      </div>
    </header>
  );
}

export function Hero() {
  const videoId = 'YqL-kYW0FXA';
  return (
    <section className="hero">
      <div className="contenedor">
        <h1>
          ¿Estás cansado, con insomnio y dolores que tu médico <em>no puede explicar</em>?
        </h1>
        <p className="subtitulo">
          La ciencia aclara por qué tu casa te está inflamando<br className="salto-desktop" /> y qué hacer para revertirlo.
        </p>
        <div className="video-marco">
          <div className="video-inner">
            {videoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3`}
                title="Tapete Vital — mira el video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64C9A7', fontSize: 15 }}>
                [Configura NEXT_PUBLIC_VSL_YOUTUBE_ID]
              </div>
            )}
          </div>
          <div className="video-banda">🔊 Activa el sonido y mira el video</div>
        </div>
      </div>
    </section>
  );
}

export function FranjaConfianza() {
  return (
    <div className="franja-confianza">
      <div className="contenedor items">
        <span className="item">{Icono.escudo} Garantía de 60 días o te devolvemos tu dinero</span>
        <span className="item">{Icono.candado} Pago seguro con Bold — tarjetas, PSE y Nequi</span>
        <span className="item">{Icono.camion} Envíos a toda Colombia</span>
      </div>
    </div>
  );
}

export function Beneficios() {
  const items = [
    { icono: Icono.luna, titulo: 'Duerme profundo', texto: 'Mejora tu sueño y despierta con más energía.' },
    { icono: Icono.gota, titulo: 'Menos inflamación', texto: 'Descongestiona tu cuerpo y alivia tus dolores crónicos.' },
    { icono: Icono.corazon, titulo: 'Mejor circulación', texto: 'Revitaliza tu sangre y controla tu presión arterial.' },
    { icono: Icono.sol, titulo: 'Más tranquilidad', texto: 'Disminuye el estrés y calma tu ansiedad.' },
  ];
  return (
    <section id="beneficios" className="seccion seccion--crema centro">
      <div className="contenedor">
        <span className="eyebrow">Rápidamente verás cómo</span>
        <h2 className="titulo-seccion">Tu cuerpo empieza<br className="salto-movil" /> a regularse</h2>
        <div className="beneficios-grid">
          {items.map((b) => (
            <div className="beneficio" key={b.titulo}>
              <div className="icono">{b.icono}</div>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </div>
          ))}
        </div>
        <div className="mt-44">
          <Link href="/comprar" className="boton boton--primario">Quiero mi Tapete Vital</Link>
          <p className="nota-boton">{Icono.escudo} 60 días de garantía. Sin riesgo.</p>
        </div>
      </div>
    </section>
  );
}

export function ComoFunciona() {
  const pasos = [
    { titulo: 'Conéctalo', texto: 'Conecta el cable al tercer orificio del tomacorriente: el polo a tierra.' },
    { titulo: 'Ubícalo', texto: <>Ponlo sobre tu cama o sobre tu escritorio.<br className="salto-movil" /> Donde pasas más horas.</> },
    { titulo: 'Tócalo', texto: 'Tu cuerpo empieza a descargarse de inmediato, sin cambiar tu rutina.' },
  ];
  return (
    <section className="seccion centro">
      <div className="contenedor">
        <h2 className="titulo-seccion">Cómo funciona el<br className="salto-movil" /> Tapete Vital</h2>
        <div className="pasos">
          {pasos.map((p, i) => (
            <div className="paso" key={p.titulo}>
              <div className="num">{i + 1}</div>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Medicos() {
  const medicos = [
    {
      foto: `${CDN}/6a21e17f83cb7337aa16bb7c.jpg`,
      nombre: 'Dr. Santiago Rojas',
      cita: '”Tenemos una enfermedad por haber perdido el contacto que ancestralmente habíamos tenido de manera permanente con la tierra.”',
    },
    {
      foto: `${CDN}/6a21e2c8fc95b24549777307.jpg`,
      nombre: 'Dr. Jorge Carvajal',
      cita: '“Cuando hago polo a tierra me estoy nutriendo de la madre. La tierra está recibiendo las cargas que me fatigan y me está renovando la energía.”',
    },
    {
      foto: `${CDN}/6a21e2e0bca3eb667377516f.png`,
      nombre: 'Dr. Javier Galvis',
      cita: <>”Preguntar si nuestros pacientes hacen polo a tierra debería ser el quinto signo vital que les busquemos.<br /> ¡Así de importante es!”</>,
    },
  ];
  return (
    <section className="seccion seccion--grad centro">
      <div className="contenedor">
        <span className="eyebrow eyebrow--claro">Respaldo médico</span>
        <h2 className="titulo-seccion titulo-seccion--claro">Los expertos en salud nos recomiendan</h2>
        <div className="medicos-grid">
          {medicos.map((m) => (
            <div className="medico" key={m.nombre}>
              <img src={m.foto} alt={m.nombre} loading="lazy" />
              <h3>{m.nombre}</h3>
              <blockquote>{m.cita}</blockquote>
            </div>
          ))}
        </div>
        <div className="medicos-nota-caja">
          <p className="medicos-nota">
            Decenas de artículos en las principales revistas científicas del mundo explican cómo la
            terapia de polo a tierra está transformando la vida de millones de pacientes.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Testimonios() {
  const lista = [
    { texto: 'Mi doctora me recomendó el tapete para el insomnio, los dolores lumbares y el exceso de carga electromagnética. Usándolo he logrado un sueño reparador y mis dolores han disminuido un 80%.', autor: 'Lola Carvajal' },
    { texto: 'Duermo mucho mejor y ya no me siento tan cansada. Ya no me duele la espalda. A mi esposo le dolía una mano, lo ensayó y en 3 días sintió una mejoría impresionante.', autor: 'Tatiana Gallego' },
    { texto: 'Soy maratonista, y el tapete cambió mi proceso de recuperación. Con solo dormir una noche en él, mi siguiente día fue como si nada.', autor: 'Mónica Agudelo' },
    { texto: 'El tapete me ha ayudado a mejorar la calidad del sueño y el descanso. Duermo con él todas las noches y no volví a presentar episodios de insomnio.', autor: 'Adriana Osorio' },
    { texto: 'Conocí el tapete por recomendación de varios médicos funcionales. Ha marcado la diferencia en mi calidad de vida. Acabo de comprar otro para mis suegros.', autor: 'Magda Riascos' },
    { texto: 'Uso el tapete hace más de un año: descanso profundo al dormir y recuperé la capacidad de soñar. Hacer polo a tierra me permitió volver a tener sueños.', autor: 'Glemis Mogollón' },
  ];
  return (
    <section className="seccion seccion--crema centro">
      <div className="contenedor">
        <h2 className="titulo-seccion">Lo que sienten quienes ya hacen polo a tierra</h2>
        <div className="testimonios-grid">
          {lista.map((t) => (
            <figure className="testimonio" key={t.autor}>
              <span className="estrellas" aria-label="5 estrellas">★★★★★</span>
              <p>“{t.texto}”</p>
              <cite>{t.autor}</cite>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Oferta() {
  return (
    <section className="seccion centro" id="oferta">
      <div className="contenedor">
        <span className="eyebrow">Consigue el tuyo</span>
        <h2 className="titulo-seccion">El insomnio y la fatiga no aparecen de un día para otro</h2>
        <p className="texto-grande mt-32" style={{ maxWidth: 620, margin: '18px auto 0' }}>
          Se acumulan silenciosamente hasta que el cuerpo no aguanta más. El Tapete Vital le
          devuelve a tu cuerpo lo que tanto necesita. Sin esfuerzo, sin cambiar tu rutina.
        </p>
        <div className="oferta-caja mt-44">
          <div className="cabeza">
            <h3>Tapete Vital</h3>
          </div>
          <div className="cuerpo">
            <img
              src={`${CDN}/5c73b7dc-5fb2-49cc-a3a4-c92d1f5d58be.png`}
              alt="Tapete Vital — Polo a Tierra"
              style={{ maxWidth: 320, margin: '0 auto 20px' }}
              loading="lazy"
            />
            <div className="precio-antes">$449.000</div>
            <div className="precio-ahora"><strong>$299.000</strong></div>
            <p style={{ color: 'var(--gris-texto)', fontSize: 18 }}>
              Y llevando 2 o más, cada tapete queda en $269.000
            </p>
            <div className="regalo">
              🎁 Incluye <strong>gratis</strong> la Guía Esencial Frente a la Contaminación
              Electromagnética (valor $49.000)
            </div>
            <Link href="/comprar" className="boton boton--primario boton--bloque">
              Quiero mi Tapete Vital
            </Link>
            <p className="nota-boton">{Icono.candado} Pago seguro con Bold · Garantía de 60 días</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Garantia() {
  return (
    <section className="seccion">
      <div className="contenedor">
        <div className="garantia">
          <div className="sello" aria-hidden="true">
            <svg width="84" height="84" viewBox="0 0 96 96" fill="none">
              <circle cx="48" cy="48" r="44" stroke="#00AE84" strokeWidth="3" />
              <circle cx="48" cy="48" r="36" stroke="#64C9A7" strokeWidth="1.5" strokeDasharray="4 5" />
              <text x="48" y="45" textAnchor="middle" dominantBaseline="middle" fontSize="30" fontWeight="700" fill="#005261" fontFamily="inherit">60</text>
              <text x="48" y="63" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#00AE84" letterSpacing="1">DÍAS</text>
            </svg>
          </div>
          <div>
            <h3>Garantía de satisfacción</h3>
            <p>
              Si en 60 días no sientes ninguna diferencia en tu sueño, tu energía o tus dolores,
              te devolvemos tu dinero. Sin preguntas incómodas, sin letra pequeña.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const preguntas = [
    {
      q: '¿Cómo funciona el Tapete Vital?',
      a: 'Conecta tu cuerpo con el campo electromagnético de la tierra a través del polo a tierra de cualquier tomacorriente. Cuando pones tus pies sobre el tapete, es como si los pusieras directamente sobre el césped.',
    },
    {
      q: '¿El Tapete Vital consume energía?',
      a: '¡No! Va conectado únicamente al polo a tierra del tomacorriente, por donde no circula energía eléctrica. No consume ni un peso de luz.',
    },
    {
      q: '¿Cuánto cuesta y cuánto tarda el envío?',
      a: 'El envío cuesta desde $11.000 en Bogotá y desde $20.000 al resto del país (el valor exacto lo ves antes de pagar). Despachamos tu pedido y te contactamos por WhatsApp con la guía de seguimiento.',
    },
    {
      q: '¿Qué formas de pago aceptan?',
      a: 'Pagas de forma 100% segura a través de Bold, la pasarela colombiana: tarjetas de crédito y débito, PSE y Nequi. Nunca vemos ni guardamos los datos de tu tarjeta.',
    },
    {
      q: '¿Cuánto tiempo debo usarlo cada día?',
      a: 'Evolucionamos 24/7 en contacto con la tierra, así que entre más tiempo, mejor. Te recomendamos dormir y trabajar en contacto con tu Tapete Vital: así haces polo a tierra muchas horas al día sin cambiar tu rutina.',
    },
    {
      q: '¿Por qué no simplemente hacer polo a tierra al aire libre?',
      a: 'Porque 15 minutos en el parque no compensan las horas que pasas rodeado de radiación en casa y oficina — justo donde eres más vulnerable. El tapete te conecta de forma conveniente y segura donde más lo necesitas.',
    },
    {
      q: '¿Puedo llevarlo de viaje?',
      a: '¡Sí! El Tapete Vital es portátil. Úsalo en casa, en la oficina o de viaje: solo necesitas un tomacorriente con polo a tierra.',
    },
  ];
  return (
    <section id="faq" className="seccion seccion--crema">
      <div className="contenedor centro">
        <span className="eyebrow">Resolvemos tus dudas</span>
        <h2 className="titulo-seccion">Preguntas frecuentes</h2>
      </div>
      <div className="contenedor">
        <div className="faq-lista">
          {preguntas.map((p) => (
            <details className="faq-item" key={p.q}>
              <summary>{p.q}</summary>
              <div className="respuesta">{p.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTAFinal() {
  return (
    <section className="seccion seccion--grad">
      <div className="contenedor cta-final">
        <h2>Tu cuerpo lleva años<br className="salto-movil" /> pidiendo tierra</h2>
        <p>
          Comienza ahora mismo. Si en 60 días no sientes la diferencia, te devolvemos tu dinero.
        </p>
        <Link href="/comprar" className="boton boton--claro">Quiero mi Tapete Vital</Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor">
        <p className="marca">POLO A TIERRA</p>
        <p>Terapia en casa que restaura tu equilibrio.</p>
        <p style={{ marginTop: 10 }}>
          ¿Dudas? Escríbenos por WhatsApp: <a href="https://wa.me/573024019300">+57 302 401 9300</a>
        </p>
        <p style={{ marginTop: 14, opacity: 0.6 }}>
          © {new Date().getFullYear()} Polo a Tierra · poloatierra.co
        </p>
      </div>
    </footer>
  );
}
