// ============================================================
// Variantes de la landing por ángulo de pauta (13-sep-2026).
// Cada anuncio aterriza en /<slug>. Lo que una variante no define
// usa el contenido de la landing base (app/page.js).
// Los datos citados salen del banco de estudios en Drive
// (carpeta "Estudios clínicos PAT" y "Artículos").
// ============================================================

export const ANGULOS = {
  insomnio: {
    meta: 'Dormir profundo otra vez | Tapete Vital',
    h1: 'Despertarse a las 3 de la mañana con la cabeza acelerada tiene una causa que casi nadie revisa',
    subtitulo:
      'Un estudio de 8 semanas muestra por qué el cuerpo aislado de la tierra no logra bajar el cortisol de noche, y cómo revertirlo desde tu propia cama.',
    beneficios: [
      { icono: 'luna', titulo: 'Te duermes más rápido', texto: '11 de 12 personas del estudio se durmieron antes.' },
      { icono: 'sol', titulo: 'Te despiertas menos', texto: 'Las 12 reportaron menos despertares en la noche.' },
      { icono: 'gota', titulo: 'Menos dolor de noche', texto: 'El dolor que interrumpe el sueño baja al descargarte.' },
      { icono: 'corazon', titulo: 'Más energía de día', texto: 'El cortisol vuelve a su ritmo: alto en la mañana, bajo en la noche.' },
    ],
    oferta: {
      titulo: 'El insomnio no aparece de un día para otro',
      texto:
        'Se acumula noche tras noche hasta que el cuerpo olvida cómo apagarse. El Tapete Vital le devuelve a tu cuerpo la señal que necesita para descansar. Sin pastillas, sin cambiar tu rutina.',
    },
    testimoniosPrimero: ['Adriana Osorio', 'Glemis Mogollón', 'Lola Carvajal'],
    faqExtra: [
      {
        q: '¿En cuánto tiempo se nota en el sueño?',
        a: 'La mayoría lo siente en las primeras noches. En el estudio de cortisol, los ritmos día-noche se normalizaron a las 6 semanas de dormir conectado. Por eso la garantía es de 60 días: tiempo de sobra para comprobarlo.',
      },
    ],
  },

  piernas: {
    meta: 'Piernas pesadas y pies fríos | Tapete Vital',
    h1: 'Piernas pesadas, pies fríos y hormigueo al final del día: la causa que nadie revisa',
    subtitulo:
      'Dos horas de contacto con la tierra hacen que los glóbulos rojos dejen de apelotonarse y la sangre fluya mejor. Un estudio lo midió; el tapete lo hace mientras duermes.',
    beneficios: [
      { icono: 'corazon', titulo: 'Sangre más fluida', texto: 'Los glóbulos rojos se repelen entre sí y circulan mejor.' },
      { icono: 'gota', titulo: 'Menos hinchazón', texto: 'Descarga la inflamación acumulada en piernas y pies.' },
      { icono: 'sol', titulo: 'Pies tibios', texto: 'Mejor riego en manos y pies.' },
      { icono: 'luna', titulo: 'Descanso real', texto: 'Duermes sin calambres ni inquietud en las piernas.' },
    ],
    oferta: {
      titulo: 'Las piernas cansadas no se arreglan con subirlas un rato',
      texto:
        'La sangre espesa y la inflamación se acumulan cada día que pasas aislado de la tierra. El Tapete Vital te reconecta desde la cama y el escritorio. Sin esfuerzo, sin cambiar tu rutina.',
    },
    testimoniosPrimero: ['Tatiana Gallego', 'Lola Carvajal', 'Mónica Agudelo'],
    faqExtra: [
      {
        q: '¿Sirve si ya tengo un diagnóstico de mala circulación o várices?',
        a: 'El tapete no reemplaza tu tratamiento. Lo que muestran los estudios es que la sangre se vuelve menos viscosa y la inflamación baja, y eso le ayuda a cualquier tratamiento. Si tomas anticoagulantes, cuéntale a tu médico que empezaste a hacer polo a tierra.',
      },
    ],
  },

  dolor: {
    meta: 'Dolor e inflamación crónica | Tapete Vital',
    h1: 'Dolor de rodillas, espalda o articulaciones que no cede con nada',
    subtitulo:
      'En 20 casos con termografía médica, la inflamación se vio bajar en la primera media hora conectado a la tierra. Así es como el tapete descarga el dolor, todos los días.',
    beneficios: [
      { icono: 'gota', titulo: 'Menos inflamación', texto: '82% mejoró la rigidez y el dolor muscular en un mes.' },
      { icono: 'luna', titulo: 'Menos dolor crónico', texto: '74% mejoró el dolor de espalda y articulaciones.' },
      { icono: 'sol', titulo: 'Recuperación más rápida', texto: 'El cuerpo repara antes después del esfuerzo.' },
      { icono: 'corazon', titulo: 'Mejor sueño', texto: 'Dormir sin dolor cambia el día siguiente.' },
    ],
    oferta: {
      titulo: 'El dolor crónico es inflamación que nunca termina de apagarse',
      texto:
        'Cada noche conectado a la tierra es una noche en la que tu cuerpo recibe los electrones que apagan la inflamación. Sin pastillas, sin esfuerzo, sin cambiar tu rutina.',
    },
    testimoniosPrimero: ['Lola Carvajal', 'Tatiana Gallego', 'Mónica Agudelo'],
    faqExtra: [
      {
        q: '¿Reemplaza los antiinflamatorios?',
        a: 'No, y no suspendas nada sin hablar con tu médico. Muchos usuarios notan que necesitan menos; ese es un tema para conversar con quien te trata.',
      },
    ],
  },

  presion: {
    meta: 'Presión arterial y polo a tierra | Tapete Vital',
    h1: 'La presión alta tiene un aliado que no viene en pastilla',
    subtitulo:
      'En un estudio cardiológico, 10 pacientes que durmieron conectados a la tierra bajaron su presión sistólica entre 8,6% y 22,7% en tres meses. Sin efectos adversos.',
    beneficios: [
      { icono: 'corazon', titulo: 'Presión más estable', texto: 'Promedio del estudio: 14,3% menos presión sistólica.' },
      { icono: 'gota', titulo: 'Sangre más fluida', texto: 'Menos viscosidad: el corazón trabaja menos.' },
      { icono: 'sol', titulo: 'Menos estrés', texto: 'El sistema nervioso pasa de alerta a descanso.' },
      { icono: 'luna', titulo: 'Mejor sueño', texto: 'Todos los pacientes reportaron dormir mejor.' },
    ],
    oferta: {
      titulo: 'Cuidar la presión es un trabajo de todos los días',
      texto:
        'Diez a doce horas diarias de contacto con la tierra fueron la dosis del estudio. Durmiendo y trabajando sobre el Tapete Vital la cumples sin pensar en ello.',
    },
    testimoniosPrimero: ['Magda Riascos', 'Lola Carvajal', 'Adriana Osorio'],
    faqExtra: [
      {
        q: '¿Puedo usarlo si tomo medicamentos para la presión o anticoagulantes?',
        a: 'Sí, pero avísale a tu médico. El polo a tierra fluidifica la sangre y varios pacientes del estudio pudieron reducir su dosis bajo supervisión. Nunca cambies tu medicación por tu cuenta.',
      },
    ],
  },

  estres: {
    meta: 'Estrés y agotamiento | Tapete Vital',
    h1: 'Agotamiento de día y mente acelerada de noche: un sistema nervioso atascado en alerta',
    subtitulo:
      'A los pocos segundos de tocar la tierra, el cuerpo pasa de modo alerta a modo descanso. Los estudios lo midieron en la piel y en el corazón; el tapete lo hace en tu casa.',
    beneficios: [
      { icono: 'sol', titulo: 'Calma en segundos', texto: 'La conductancia de la piel cae al instante al conectarse.' },
      { icono: 'corazon', titulo: 'Corazón más resiliente', texto: 'Mejora la variabilidad cardiaca más que solo relajarse.' },
      { icono: 'luna', titulo: 'Cortisol en orden', texto: 'El ritmo día-noche del cortisol se normaliza.' },
      { icono: 'gota', titulo: 'Mejor ánimo', texto: 'Una hora conectado mejoró el estado de ánimo frente a placebo.' },
    ],
    oferta: {
      titulo: 'El estrés no se apaga con fuerza de voluntad',
      texto:
        'Se apaga cuando el sistema nervioso recibe la señal de que está a salvo. La tierra es esa señal. El Tapete Vital te la da mientras duermes y trabajas.',
    },
    testimoniosPrimero: ['Tatiana Gallego', 'Glemis Mogollón', 'Adriana Osorio'],
    faqExtra: [
      {
        q: '¿Sirve para la ansiedad?',
        a: 'Los estudios muestran un cambio rápido del sistema nervioso hacia el modo de descanso y un mejor estado de ánimo. No es un tratamiento psiquiátrico ni reemplaza el tuyo; es una base que le ayuda a todo lo demás.',
      },
    ],
  },

  radiacion: {
    meta: 'Tu casa te está cargando | Tapete Vital',
    h1: 'Tu casa te está cargando de electricidad, y tu cuerpo lo paga de noche',
    subtitulo:
      'Un ingeniero midió el voltaje que la red eléctrica induce sobre el cuerpo: al conectarse a la tierra cayó unas 70 veces. Así de simple es descargarse.',
    beneficios: [
      { icono: 'sol', titulo: 'Descarga inmediata', texto: 'El voltaje inducido sobre tu cuerpo cae al conectarte.' },
      { icono: 'luna', titulo: 'Sueño sin interferencia', texto: 'Duermes con el cuerpo al potencial de la tierra.' },
      { icono: 'gota', titulo: 'Menos inflamación', texto: 'Los electrones de la tierra neutralizan radicales libres.' },
      { icono: 'corazon', titulo: 'Sistema nervioso en calma', texto: 'De alerta a descanso en segundos.' },
    ],
    oferta: {
      titulo: 'Ir al parque cinco minutos ya no es suficiente',
      texto:
        'Pasas 20 horas al día entre paredes, wifi, cargadores y pantallas. Es ahí donde necesitas hacer polo a tierra. El Tapete Vital trae el césped a tu cama y a tu escritorio.',
    },
    testimoniosPrimero: ['Lola Carvajal', 'Glemis Mogollón', 'Magda Riascos'],
    faqExtra: [
      {
        q: '¿Cómo sé si en mi casa hay mucha carga?',
        a: 'La guía que viene gratis con tu tapete te enseña a identificar las fuentes y a ordenar tu espacio. Con un multímetro sencillo puedes medir el voltaje sobre tu cuerpo antes y después de tocar el tapete.',
      },
    ],
  },

  recuperacion: {
    meta: 'Recuperación deportiva | Tapete Vital',
    h1: 'Entrenas duro, pero te recuperas lento',
    subtitulo:
      'En el estudio de dolor muscular tardío, quienes durmieron conectados a la tierra tuvieron menos dolor y menos inflamación en sangre. Se recuperaron antes.',
    beneficios: [
      { icono: 'gota', titulo: 'Menos inflamación post-esfuerzo', texto: 'Los glóbulos blancos bajaron en vez de dispararse.' },
      { icono: 'sol', titulo: 'Menos dolor al día siguiente', texto: 'Escala de dolor muy por debajo del grupo placebo.' },
      { icono: 'corazon', titulo: 'Sangre más fluida', texto: 'Mejor riego, mejor recuperación.' },
      { icono: 'luna', titulo: 'Sueño reparador', texto: 'Las hormonas del descanso en su ritmo.' },
    ],
    oferta: {
      titulo: 'La recuperación es donde se gana el siguiente entrenamiento',
      texto:
        'Un ciclista del Tour de Francia se conectó a la tierra tras una herida y siguió compitiendo al día siguiente. Tú no necesitas tanto: solo dormir sobre el tapete.',
    },
    testimoniosPrimero: ['Mónica Agudelo', 'Tatiana Gallego', 'Lola Carvajal'],
    faqExtra: [
      {
        q: '¿Cuándo lo uso: antes o después de entrenar?',
        a: 'Las horas que más pesan son las de sueño. Duerme sobre él cada noche; si además trabajas sentado, ponlo bajo los pies o las manos en el escritorio.',
      },
    ],
  },

  mama: {
    meta: 'El regalo para tus papás | Tapete Vital',
    h1: 'El regalo que tus papás van a usar todas las noches',
    subtitulo:
      'Duermen mejor, les duele menos y la presión se estabiliza. Es lo que muestran los estudios de polo a tierra en personas mayores, y lo que ellos van a sentir sin aprender nada nuevo.',
    beneficios: [
      { icono: 'luna', titulo: 'Duermen profundo', texto: '100% despertó descansado en el estudio de un mes.' },
      { icono: 'gota', titulo: 'Menos dolores', texto: '74% mejoró el dolor crónico de espalda y articulaciones.' },
      { icono: 'corazon', titulo: 'Presión más estable', texto: '14% menos presión sistólica en el estudio cardiológico.' },
      { icono: 'sol', titulo: 'Huesos que retienen calcio', texto: 'Una noche conectado redujo la pérdida de calcio en orina.' },
    ],
    oferta: {
      titulo: 'Uno para ellos y uno para ti',
      texto:
        'Llevando 2 o más, cada tapete queda en $269.000. Lo conectas en el tomacorriente de su cuarto, lo pones sobre la cama y no tienen que hacer nada más.',
    },
    testimoniosPrimero: ['Magda Riascos', 'Tatiana Gallego', 'Lola Carvajal'],
    faqExtra: [
      {
        q: '¿Es difícil de usar para una persona mayor?',
        a: 'No. Se conecta una vez al tomacorriente y se deja sobre la cama, debajo o encima de la sábana. No tiene botones, no consume luz y no hay que acordarse de nada.',
      },
    ],
  },
};
