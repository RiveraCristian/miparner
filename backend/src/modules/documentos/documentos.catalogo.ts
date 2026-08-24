/**
 * Qué documento tiene que subir cada quién para que el panel de administración
 * pueda validar su cuenta.
 *
 * Es la única fuente de verdad: la usan el backend (para saber si la solicitud
 * está completa) y las apps (para dibujar la lista de pendientes).
 */
export interface TipoDocumento {
  tipo: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
}

const CARNET_DISCAPACIDAD: TipoDocumento = {
  tipo: "carnet_discapacidad",
  titulo: "Credencial de discapacidad",
  descripcion:
    "Foto o PDF de tu credencial de discapacidad vigente (Registro Nacional de la Discapacidad).",
  obligatorio: true,
};

const CARNET_IDENTIDAD: TipoDocumento = {
  tipo: "carnet_identidad",
  titulo: "Cédula de identidad",
  descripcion: "Foto por ambos lados o PDF de tu cédula de identidad vigente.",
  obligatorio: true,
};

const CERTIFICADO_ESTUDIOS: TipoDocumento = {
  tipo: "certificado_estudios",
  titulo: "Certificado de alumno regular",
  descripcion:
    "Certificado de estudios o de alumno regular emitido por tu universidad, en PDF o foto legible.",
  obligatorio: true,
};

/** Documentos exigidos por rol. */
export const DOCUMENTOS_POR_ROL: Record<string, TipoDocumento[]> = {
  deportista: [CARNET_DISCAPACIDAD],
  voluntario: [CARNET_IDENTIDAD, CERTIFICADO_ESTUDIOS],
  admin: [],
};

export const TIPOS_VALIDOS = [
  CARNET_DISCAPACIDAD.tipo,
  CARNET_IDENTIDAD.tipo,
  CERTIFICADO_ESTUDIOS.tipo,
] as const;

export function documentosDelRol(rol: string): TipoDocumento[] {
  return DOCUMENTOS_POR_ROL[rol] ?? [];
}

/** Un tipo solo es válido si el rol de la persona lo exige. */
export function tipoPermitidoParaRol(rol: string, tipo: string): boolean {
  return documentosDelRol(rol).some((d) => d.tipo === tipo);
}
