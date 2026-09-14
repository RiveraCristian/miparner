/**
 * Catálogo de discapacidad y apoyos · fuente de verdad de la plataforma.
 *
 * Lo consumen el registro del deportista, la solicitud de acompañamiento, el
 * perfil y el panel de administración. El backend valida contra estas claves,
 * así que una clave que no esté aquí se rechaza.
 *
 * Dos listas distintas, a propósito:
 *
 *  · TIPOS_DISCAPACIDAD — qué discapacidad tiene la persona. Sigue las
 *    categorías del Registro Nacional de la Discapacidad. Es un DATO SENSIBLE
 *    de salud: solo se pide con consentimiento explícito y separado, y nunca
 *    se muestra al voluntario.
 *
 *  · APOYOS — qué necesita en la práctica durante el acompañamiento. Esto sí
 *    lo ve el voluntario, porque sin ello no puede ayudar bien. Un apoyo no
 *    revela el diagnóstico: "necesito que me hables de frente" es accionable
 *    sin decir cuánta audición queda.
 *
 * La separación no es burocrática: permite que el voluntario reciba lo que
 * necesita para acompañar sin acceder al historial de salud de nadie.
 */

export interface TipoDiscapacidad {
  clave: string;
  titulo: string;
  descripcion: string;
}

export interface Apoyo {
  clave: string;
  titulo: string;
  /** Redactado en primera persona: es lo que la persona dice de sí misma. */
  detalle: string;
  /** Categoría donde se ofrece primero. "transversal" se ofrece siempre. */
  categoria: string;
}

/* ------------------------------------------------------ Tipos de discapacidad */

export const TIPOS_DISCAPACIDAD: TipoDiscapacidad[] = [
  {
    clave: "fisica_motora",
    titulo: "Física o motora",
    descripcion: "Dificultad para moverse, desplazarse o manipular objetos.",
  },
  {
    clave: "visual",
    titulo: "Visual",
    descripcion: "Ceguera o baja visión que no se corrige con lentes.",
  },
  {
    clave: "auditiva",
    titulo: "Auditiva",
    descripcion: "Sordera o pérdida auditiva.",
  },
  {
    clave: "sordoceguera",
    titulo: "Sordoceguera",
    descripcion: "Pérdida visual y auditiva combinadas.",
  },
  {
    clave: "intelectual",
    titulo: "Intelectual",
    descripcion: "Afecta el aprendizaje, la comprensión o la toma de decisiones.",
  },
  {
    clave: "psicosocial",
    titulo: "Psíquica o psicosocial",
    descripcion: "De origen en la salud mental, como ansiedad o esquizofrenia.",
  },
  {
    clave: "visceral",
    titulo: "Visceral",
    descripcion: "De órganos internos: cardiaca, respiratoria, renal, metabólica.",
  },
  {
    clave: "multiple",
    titulo: "Múltiple",
    descripcion: "Dos o más de las anteriores a la vez.",
  },
  {
    clave: "prefiero_no_decir",
    titulo: "Prefiero no decirlo",
    descripcion: "Puedes usar Miparner sin declarar tu tipo de discapacidad.",
  },
];

/* --------------------------------------------------------------------- Apoyos */

export const APOYOS: Apoyo[] = [
  // --- Física o motora ---
  { clave: "silla_ruedas_manual", titulo: "Silla de ruedas manual", detalle: "Uso silla manual; necesito espacio para guardarla.", categoria: "fisica_motora" },
  { clave: "silla_ruedas_electrica", titulo: "Silla de ruedas eléctrica", detalle: "Mi silla es eléctrica y pesada: necesito vehículo adaptado o rampa.", categoria: "fisica_motora" },
  { clave: "baston_apoyo", titulo: "Bastón o muletas", detalle: "Camino con apoyo; necesito ir despacio y sin apuro.", categoria: "fisica_motora" },
  { clave: "andador", titulo: "Andador", detalle: "Uso andador; necesito espacio para guardarlo.", categoria: "fisica_motora" },
  { clave: "protesis_ortesis", titulo: "Prótesis u órtesis", detalle: "Uso prótesis u órtesis.", categoria: "fisica_motora" },
  { clave: "rampa", titulo: "Rampa", detalle: "Necesito rampa para subir y bajar.", categoria: "fisica_motora" },
  { clave: "transferencia_asistida", titulo: "Ayuda para trasladarme", detalle: "Necesito apoyo físico para pasar de la silla al asiento.", categoria: "fisica_motora" },
  { clave: "vehiculo_adaptado", titulo: "Vehículo adaptado", detalle: "Necesito un vehículo con adaptación para silla de ruedas.", categoria: "fisica_motora" },
  { clave: "maletero_amplio", titulo: "Maletero amplio", detalle: "Llevo equipo o ayudas técnicas que ocupan espacio.", categoria: "fisica_motora" },

  // --- Visual ---
  { clave: "guia_visual", titulo: "Guía vidente", detalle: "Necesito que me guíen del brazo al caminar.", categoria: "visual" },
  { clave: "baston_blanco", titulo: "Bastón blanco", detalle: "Uso bastón blanco para orientarme.", categoria: "visual" },
  { clave: "perro_guia", titulo: "Perro guía", detalle: "Viajo con mi perro guía; debe ir conmigo siempre.", categoria: "visual" },
  { clave: "descripcion_verbal", titulo: "Que me describan el entorno", detalle: "Dime en voz alta dónde estamos y qué hay alrededor.", categoria: "visual" },
  { clave: "avisar_obstaculos", titulo: "Avisar escalones y obstáculos", detalle: "Avísame antes de un escalón, desnivel u obstáculo.", categoria: "visual" },
  { clave: "guiar_a_la_puerta", titulo: "Acompañar hasta la puerta", detalle: "Llévame hasta la entrada, no me dejes en la vereda.", categoria: "visual" },

  // --- Auditiva ---
  { clave: "lengua_senas", titulo: "Lengua de señas chilena", detalle: "Me comunico en lengua de señas.", categoria: "auditiva" },
  { clave: "comunicacion_escrita", titulo: "Comunicación por escrito", detalle: "Escríbeme por el chat de la app en vez de hablarme.", categoria: "auditiva" },
  { clave: "hablar_de_frente", titulo: "Hablarme de frente", detalle: "Leo los labios: mírame al hablar y no te tapes la boca.", categoria: "auditiva" },
  { clave: "aviso_visual", titulo: "Avisos visuales", detalle: "Avísame con un gesto o por el chat, no llamando.", categoria: "auditiva" },
  { clave: "audifono", titulo: "Uso audífono o implante", detalle: "Uso audífono; el ruido fuerte me dificulta entender.", categoria: "auditiva" },
  { clave: "sin_ruido_de_fondo", titulo: "Bajar el ruido de fondo", detalle: "Apaga la radio para que pueda entenderte.", categoria: "auditiva" },

  // --- Intelectual ---
  { clave: "lectura_facil", titulo: "Lenguaje sencillo", detalle: "Háblame con frases cortas y claras.", categoria: "intelectual" },
  { clave: "instrucciones_una_a_una", titulo: "Instrucciones de a una", detalle: "Dime una cosa a la vez, no varias juntas.", categoria: "intelectual" },
  { clave: "pictogramas", titulo: "Apoyo con pictogramas", detalle: "Entiendo mejor con imágenes que con texto.", categoria: "intelectual" },
  { clave: "anticipar_cambios", titulo: "Avisarme los cambios", detalle: "Si algo cambia en la ruta o la hora, avísame antes.", categoria: "intelectual" },
  { clave: "persona_de_apoyo", titulo: "Viajo con persona de apoyo", detalle: "Me acompaña otra persona en el trayecto.", categoria: "intelectual" },
  { clave: "confirmar_comprension", titulo: "Confirmar que entendí", detalle: "Pregúntame si entendí en vez de darlo por hecho.", categoria: "intelectual" },

  // --- Psicosocial ---
  { clave: "entorno_tranquilo", titulo: "Ambiente tranquilo", detalle: "Necesito silencio y calma durante el viaje.", categoria: "psicosocial" },
  { clave: "evitar_multitudes", titulo: "Evitar aglomeraciones", detalle: "Las multitudes me angustian; evita zonas concurridas.", categoria: "psicosocial" },
  { clave: "tiempo_sin_apuro", titulo: "Tiempo sin apuro", detalle: "Necesito que no me apuren para subir o bajar.", categoria: "psicosocial" },
  { clave: "avisar_con_antelacion", titulo: "Avisar antes de llegar", detalle: "Escríbeme unos minutos antes de llegar.", categoria: "psicosocial" },
  { clave: "poca_conversacion", titulo: "Poca conversación", detalle: "Prefiero un viaje en silencio.", categoria: "psicosocial" },
  { clave: "voluntario_conocido", titulo: "Preferir voluntario conocido", detalle: "Me cuesta la gente nueva: prefiero a quien ya me acompañó.", categoria: "psicosocial" },

  // --- Visceral ---
  { clave: "pausas_frecuentes", titulo: "Pausas en el trayecto", detalle: "Necesito parar a descansar si el viaje es largo.", categoria: "visceral" },
  { clave: "cercania_bano", titulo: "Acceso a baño", detalle: "Necesito poder llegar rápido a un baño.", categoria: "visceral" },
  { clave: "oxigeno_portatil", titulo: "Oxígeno portátil", detalle: "Viajo con equipo de oxígeno.", categoria: "visceral" },
  { clave: "control_temperatura", titulo: "Controlar la temperatura", detalle: "El calor o el frío me afectan; regula la climatización.", categoria: "visceral" },
  { clave: "medicacion_a_mano", titulo: "Medicación a mano", detalle: "Llevo medicamentos que debo tener accesibles.", categoria: "visceral" },
  { clave: "conduccion_suave", titulo: "Conducción suave", detalle: "Los frenazos y curvas bruscas me hacen mal.", categoria: "visceral" },

  // --- Transversales: se ofrecen a todo el mundo ---
  { clave: "acompanante", titulo: "Viajo con acompañante", detalle: "Va otra persona conmigo.", categoria: "transversal" },
  { clave: "asiento_delantero", titulo: "Asiento delantero", detalle: "Necesito ir adelante.", categoria: "transversal" },
  { clave: "sin_perfume", titulo: "Sin perfumes ni aromatizantes", detalle: "Los olores fuertes me afectan.", categoria: "transversal" },
  { clave: "ayuda_con_equipaje", titulo: "Ayuda con el equipo", detalle: "Necesito ayuda para cargar mi equipo deportivo.", categoria: "transversal" },
  { clave: "esperar_a_que_entre", titulo: "Esperar a que entre", detalle: "No te vayas hasta que haya entrado.", categoria: "transversal" },
];

/* ------------------------------------------------------------ Otras opciones */

/** Cómo prefiere que le hablen. Gobierna avisos y mensajes de la app. */
export const COMUNICACION_PREFERIDA = [
  { clave: "texto", titulo: "Mensajes de texto" },
  { clave: "voz", titulo: "Llamada de voz" },
  { clave: "lengua_senas", titulo: "Videollamada en lengua de señas" },
  { clave: "lectura_facil", titulo: "Texto en lenguaje sencillo" },
  { clave: "pictogramas", titulo: "Pictogramas" },
] as const;

/** Cuánta ayuda necesita en el trayecto. Ayuda al voluntario a prepararse. */
export const NIVEL_AUTONOMIA = [
  { clave: "autonomo", titulo: "Me desplazo solo", detalle: "No necesito ayuda física." },
  { clave: "apoyo_puntual", titulo: "Ayuda en momentos puntuales", detalle: "Subir, bajar o cruzar." },
  { clave: "apoyo_constante", titulo: "Ayuda durante todo el trayecto", detalle: "Necesito apoyo permanente." },
  { clave: "con_acompanante", titulo: "Viajo siempre con acompañante", detalle: "Otra persona me asiste." },
] as const;

/* ------------------------------------------------------------ Validación */

const CLAVES_TIPOS = new Set(TIPOS_DISCAPACIDAD.map((t) => t.clave));
const CLAVES_APOYOS = new Set(APOYOS.map((a) => a.clave));
const CLAVES_COMUNICACION = new Set(COMUNICACION_PREFERIDA.map((c) => c.clave as string));
const CLAVES_AUTONOMIA = new Set(NIVEL_AUTONOMIA.map((n) => n.clave as string));

export const esTipoDiscapacidad = (v: string) => CLAVES_TIPOS.has(v);
export const esApoyo = (v: string) => CLAVES_APOYOS.has(v);
export const esComunicacion = (v: string) => CLAVES_COMUNICACION.has(v);
export const esAutonomia = (v: string) => CLAVES_AUTONOMIA.has(v);

/** El catálogo completo, como lo consumen las apps y el panel. */
export function catalogoCompleto() {
  return {
    tiposDiscapacidad: TIPOS_DISCAPACIDAD,
    apoyos: APOYOS,
    comunicacionPreferida: COMUNICACION_PREFERIDA,
    nivelAutonomia: NIVEL_AUTONOMIA,
  };
}
