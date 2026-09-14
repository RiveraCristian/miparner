/**
 * Qué tiene que acreditar cada quién para que el panel valide su cuenta.
 *
 * Fuente de verdad única: la usan el backend (para saber si una solicitud está
 * completa) y las apps (para dibujar la lista de pendientes).
 *
 * La acreditación se organiza en GRUPOS, no en documentos sueltos. Dentro de un
 * grupo basta con una de las opciones: pedir a la vez el carnet y el
 * certificado médico sería pedir dos pruebas de lo mismo, y deja fuera a quien
 * solo tiene una.
 *
 * El grupo del deportista admite además una vía SIN documento: mucha gente con
 * discapacidad no tiene credencial vigente —el trámite es lento y se vence— y
 * negarle el servicio por un papel sería exactamente la barrera que Miparner
 * intenta quitar. En ese caso el equipo agenda una videollamada y acredita a
 * mano.
 */
export interface OpcionDocumento {
  tipo: string;
  titulo: string;
  descripcion: string;
}

export interface GrupoAcreditacion {
  grupo: string;
  titulo: string;
  descripcion: string;
  /** Basta con UNA de estas. */
  opciones: OpcionDocumento[];
  /** Si existe, la persona puede acreditarse sin subir ningún documento. */
  alternativaVideollamada?: { titulo: string; descripcion: string };
}

/* ----------------------------------------------------------------- Opciones */

const CARNET_DISCAPACIDAD: OpcionDocumento = {
  tipo: "carnet_discapacidad",
  titulo: "Credencial de discapacidad",
  descripcion: "Foto o PDF de tu credencial del Registro Nacional de la Discapacidad.",
};

const CERTIFICADO_MEDICO: OpcionDocumento = {
  tipo: "certificado_medico",
  titulo: "Certificado médico",
  descripcion:
    "Un certificado o informe de tu médico o del centro de salud que describa tu situación.",
};

const CARNET_IDENTIDAD: OpcionDocumento = {
  tipo: "carnet_identidad",
  titulo: "Cédula de identidad",
  descripcion: "Foto por ambos lados o PDF de tu cédula vigente.",
};

const CERTIFICADO_ESTUDIOS: OpcionDocumento = {
  tipo: "certificado_estudios",
  titulo: "Certificado de alumno regular",
  descripcion: "Certificado de estudios emitido por tu universidad, en PDF o foto legible.",
};

/* ------------------------------------------------------------------ Grupos */

const ACREDITACION_DEPORTISTA: GrupoAcreditacion = {
  grupo: "acreditacion_discapacidad",
  titulo: "Acreditación de tu situación",
  descripcion: "Con una de estas basta. Si no tienes ninguna, podemos hablar por videollamada.",
  opciones: [CARNET_DISCAPACIDAD, CERTIFICADO_MEDICO],
  alternativaVideollamada: {
    titulo: "No tengo ninguno de los dos",
    descripcion:
      "Pide una videollamada con el equipo. Conversamos contigo, acreditamos tu cuenta a mano " +
      "y no necesitas subir ningún documento.",
  },
};

const IDENTIDAD_VOLUNTARIO: GrupoAcreditacion = {
  grupo: "identidad",
  titulo: "Tu identidad",
  descripcion: "Necesitamos confirmar quién eres antes de que acompañes a alguien.",
  opciones: [CARNET_IDENTIDAD],
};

const ESTUDIOS_VOLUNTARIO: GrupoAcreditacion = {
  grupo: "estudios",
  titulo: "Tu calidad de estudiante",
  descripcion: "El programa de voluntariado es para estudiantes universitarios.",
  opciones: [CERTIFICADO_ESTUDIOS],
};

export const ACREDITACION_POR_ROL: Record<string, GrupoAcreditacion[]> = {
  deportista: [ACREDITACION_DEPORTISTA],
  voluntario: [IDENTIDAD_VOLUNTARIO, ESTUDIOS_VOLUNTARIO],
  admin: [],
};

export function gruposDelRol(rol: string): GrupoAcreditacion[] {
  return ACREDITACION_POR_ROL[rol] ?? [];
}

/** Todos los tipos de documento válidos, en cualquier rol. */
export const TIPOS_VALIDOS = [
  CARNET_DISCAPACIDAD.tipo,
  CERTIFICADO_MEDICO.tipo,
  CARNET_IDENTIDAD.tipo,
  CERTIFICADO_ESTUDIOS.tipo,
] as const;

/** Un tipo solo es válido si algún grupo del rol lo ofrece. */
export function tipoPermitidoParaRol(rol: string, tipo: string): boolean {
  return gruposDelRol(rol).some((g) => g.opciones.some((o) => o.tipo === tipo));
}

/** El rol admite acreditarse por videollamada en alguno de sus grupos. */
export function admiteVideollamada(rol: string): boolean {
  return gruposDelRol(rol).some((g) => !!g.alternativaVideollamada);
}

/**
 * Estado de cada grupo dado lo que la persona ya subió y su vía de
 * verificación. Un grupo queda cubierto si tiene un documento de cualquiera de
 * sus opciones, o si pidió la videollamada y el grupo la admite.
 */
export function evaluarGrupos(
  rol: string,
  tiposSubidos: string[],
  viaVerificacion?: string | null,
) {
  const subidos = new Set(tiposSubidos);
  const porVideollamada = viaVerificacion === "videollamada";

  const grupos = gruposDelRol(rol).map((g) => {
    const tipoCubierto = g.opciones.find((o) => subidos.has(o.tipo))?.tipo ?? null;
    const cubiertoPorVideollamada = porVideollamada && !!g.alternativaVideollamada;
    return {
      ...g,
      tipoCubierto,
      cubiertoPorVideollamada,
      cubierto: !!tipoCubierto || cubiertoPorVideollamada,
    };
  });

  return {
    grupos,
    faltantes: grupos.filter((g) => !g.cubierto).map((g) => g.grupo),
    completo: grupos.every((g) => g.cubierto),
  };
}
