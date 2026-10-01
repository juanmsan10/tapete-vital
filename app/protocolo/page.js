// El Protocolo de 7 Días: micromagnet que entrega ManyChat por DM a quien
// comenta TIERRA en los carruseles orgánicos de IG. Página regalo, fuera del
// índice de buscadores; su único CTA lleva al landing principal.
// Diseño: la serie "documental nocturno PAT" de los carruseles (teal + verde).

export const metadata = {
  title: 'El Protocolo de 7 Días | Polo a Tierra',
  description:
    'Reconecta tu cuerpo con la energía de la Tierra en 7 días, gratis y desde hoy.',
  robots: { index: false, follow: false },
};

const css = `
  .pr{--verde:#00AE84;--noche1:#073F3D;--noche2:#021D21;
    font-family:'Assistant',Helvetica,Arial,sans-serif;color:#fff;
    background:#021D21;position:relative;overflow:hidden;min-height:100vh}
  .pr::before{content:"";position:absolute;inset:0;
    background:radial-gradient(640px at 85% -4%,rgba(0,174,132,.26),transparent 66%),
    linear-gradient(140deg,var(--noche1) 0%,var(--noche2) 100%)}
  .pr-col{position:relative;max-width:560px;margin:0 auto;padding:48px 24px 72px}
  .pr-logo{height:44px;margin-bottom:36px}
  .pr-kicker{color:var(--verde);font-weight:700;font-size:13px;
    letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
  .pr h1{font-family:'Oswald',sans-serif;font-weight:600;text-transform:uppercase;
    font-size:clamp(34px,9vw,46px);line-height:1.12;margin:0}
  .pr h1 span{color:var(--verde)}
  .pr-barra{width:72px;height:6px;background:var(--verde);margin:18px 0}
  .pr h2{font-family:'Oswald',sans-serif;font-weight:600;text-transform:uppercase;
    font-size:clamp(22px,6vw,28px);line-height:1.15;margin:52px 0 0}
  .pr h2+.pr-barra{width:52px;height:5px;margin:14px 0 16px}
  .pr p,.pr li{font-size:17px;line-height:1.55;margin:0 0 12px}
  .pr b{font-weight:700}
  .pr .v{color:var(--verde);font-weight:700}
  .pr-card{background:rgba(255,255,255,.05);border:1px solid rgba(0,174,132,.3);
    border-radius:14px;padding:18px 20px;margin:14px 0}
  .pr-card p:last-child{margin-bottom:0}
  .pr-est{display:grid;grid-template-columns:128px 1fr;gap:16px;
    align-items:center;padding:14px 0}
  .pr-est+.pr-est{border-top:1px solid rgba(255,255,255,.1)}
  .pr-est .n{font-family:'Oswald',sans-serif;font-weight:600;font-size:28px;
    color:var(--verde);line-height:1.1;white-space:nowrap}
  .pr-est .t{font-size:15.5px;line-height:1.45;color:rgba(255,255,255,.85)}
  .pr-paso{display:flex;gap:14px;margin:14px 0;align-items:flex-start}
  .pr-paso .b{flex:none;width:34px;height:34px;border-radius:50%;
    background:rgba(0,174,132,.15);border:1px solid rgba(0,174,132,.45);
    color:var(--verde);font-weight:700;display:flex;align-items:center;
    justify-content:center;font-size:16px}
  .pr-sino{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
  .pr-sino .si,.pr-sino .no{border-radius:14px;padding:16px}
  .pr-sino .si{background:rgba(0,174,132,.1);border:1px solid rgba(0,174,132,.4)}
  .pr-sino .no{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14)}
  .pr-sino h3{font-family:'Oswald',sans-serif;font-weight:500;text-transform:uppercase;
    font-size:15px;letter-spacing:.06em;margin:0 0 8px}
  .pr-sino .si h3{color:var(--verde)}
  .pr-sino .no h3{color:rgba(255,255,255,.6)}
  .pr-sino ul{margin:0;padding-left:18px}
  .pr-sino li{font-size:15px;margin-bottom:6px}
  .pr table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14.5px}
  .pr th{font-family:'Oswald',sans-serif;font-weight:500;text-transform:uppercase;
    font-size:12px;letter-spacing:.06em;color:var(--verde);text-align:left;
    padding:8px 6px;border-bottom:2px solid rgba(0,174,132,.45)}
  .pr td{padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.12);
    color:rgba(255,255,255,.85)}
  .pr-cita{font-size:13.5px;line-height:1.4;color:rgba(255,255,255,.55);
    border-top:1px solid rgba(0,174,132,.4);padding-top:10px;margin-top:18px}
  .pr-cierre{margin-top:56px;background:rgba(0,174,132,.08);
    border:1px solid rgba(0,174,132,.4);border-radius:16px;padding:26px 22px}
  .pr-cta{display:block;text-align:center;background:var(--verde);color:#fff;
    font-weight:700;font-size:18px;text-decoration:none;border-radius:999px;
    padding:16px 24px;margin-top:18px}
  .pr-pie{margin-top:48px;display:flex;justify-content:space-between;
    font-size:13.5px;color:rgba(255,255,255,.6);font-weight:600;letter-spacing:.08em}
`;

export default function Protocolo() {
  return (
    <div className="pr">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pr-col">
        <img className="pr-logo" src="/logo-blanco.png" alt="Polo a Tierra" />

        <div className="pr-kicker">Gratis · Se lee en 3 minutos</div>
        <h1>
          El protocolo de <span>7 días</span>
        </h1>
        <div className="pr-barra" />
        <p>
          Reconecta tu cuerpo con la energía de la Tierra, empezando hoy, sin
          comprar nada. Al final sabrás si tu cuerpo responde. Casi siempre
          responde.
        </p>

        <h2>Por qué funciona</h2>
        <div className="pr-barra" />
        <p>
          La superficie del planeta guarda una reserva infinita de{' '}
          <span className="v">electrones libres</span>. Al hacer contacto directo
          con ella, entran al cuerpo y neutralizan el estrés oxidativo. Esto es lo
          que han medido los estudios:
        </p>
        <div className="pr-card">
          <div className="pr-est">
            <div className="n">4 noches</div>
            <div className="t">
              bastaron para resolver una inflamación de 9 meses, documentado con
              termografía médica.
            </div>
          </div>
          <div className="pr-est">
            <div className="n">30 min</div>
            <div className="t">
              de contacto enfriaron visiblemente zonas inflamadas en 20 casos
              clínicos con cámara térmica.
            </div>
          </div>
          <div className="pr-est">
            <div className="n">+11%</div>
            <div className="t">
              más energía (ATP) produjeron mitocondrias conectadas a tierra en
              laboratorio.
            </div>
          </div>
          <p className="pr-cita">
            Amalu, International Academy of Clinical Thermography, 2004-2005.
            Giulivi &amp; Kotz, FEBS Open Bio, 2025.
          </p>
        </div>

        <h2>El protocolo</h2>
        <div className="pr-barra" />
        <div className="pr-paso">
          <div className="b">1</div>
          <p>
            <b>20 a 30 minutos al día</b> con los pies descalzos sobre pasto,
            tierra o arena. Idealmente en la mañana, pero sirve a cualquier hora
            con luz.
          </p>
        </div>
        <div className="pr-paso">
          <div className="b">2</div>
          <p>
            <b>Durante 7 días seguidos.</b> La constancia importa más que la
            duración: mejor 20 minutos diarios que 2 horas un solo día.
          </p>
        </div>
        <div className="pr-paso">
          <div className="b">3</div>
          <p>
            <b>Sin pantallas mientras tanto.</b> Camina, estírate o simplemente
            quédate de pie. Tu única tarea es tocar el suelo.
          </p>
        </div>

        <h2>Dónde sí y dónde no</h2>
        <div className="pr-barra" />
        <p>No toda superficie conecta. La electricidad no negocia:</p>
        <div className="pr-sino">
          <div className="si">
            <h3>Sí conectan</h3>
            <ul>
              <li>Pasto (mejor si está húmedo)</li>
              <li>Tierra</li>
              <li>Arena de playa</li>
              <li>Cemento sin pintar</li>
            </ul>
          </div>
          <div className="no">
            <h3>No conectan</h3>
            <ul>
              <li>Asfalto</li>
              <li>Madera</li>
              <li>Caucho y plástico</li>
              <li>Baldosa y tapete</li>
            </ul>
          </div>
        </div>

        <h2>Mídete cada mañana</h2>
        <div className="pr-barra" />
        <p>
          Al despertar, antes de pararte, califica de 1 a 10 estas tres cosas.
          Anótalas en el celular o en papel:
        </p>
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Dolor</th>
              <th>Rigidez</th>
              <th>¿Cómo dormiste?</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <tr key={d}>
                <td>Día {d}</td>
                <td>__</td>
                <td>__</td>
                <td>__</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          El día 7 compara con el día 1. No nos creas a nosotros:{' '}
          <b>créele a tu tabla.</b>
        </p>

        <div className="pr-cierre">
          <div className="pr-kicker">La pregunta del día 7</div>
          <h2 style={{ marginTop: 6 }}>¿Y las 8 horas de la noche?</h2>
          <div className="pr-barra" />
          <p>
            El día ya lo tienes gratis con este protocolo. Pero la ventana de
            máxima regeneración es la noche: mientras duermes profundo, tu cuerpo
            repara colágeno, tejidos y articulaciones.
          </p>
          <p>
            Para dormir conectado a la energía del planeta, sin cambiar nada de tu
            rutina, existe el <b>Tapete Vital</b>: se conecta al polo a tierra de
            tu casa y trabaja mientras tú descansas.
          </p>
          <a className="pr-cta" href="/?utm_source=protocolo&utm_medium=ig">
            Conocer el Tapete Vital
          </a>
        </div>

        <div className="pr-pie">
          <span>@poloatierra_co</span>
          <span>Polo a Tierra</span>
        </div>
      </div>
    </div>
  );
}
