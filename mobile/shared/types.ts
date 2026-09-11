export type EstadoValidacion = "pendiente" | "aprobado" | "rechazado";

export interface Usuario {
  usuarioId: number;
  correo: string;
  nombre: string;
  rol: "deportista" | "voluntario" | "admin";
  /** La cuenta nace activa pero pendiente de validación por el panel. */
  estadoValidacion: EstadoValidacion;
  motivoRechazo: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/* ----------------------------------------------------- Documentos y validación */

export interface Documento {
  documentoId: number;
  documentoTipo: string;
  documentoNombreOriginal: string;
  documentoMime: string;
  documentoTamano: number;
  documentoEstado: EstadoValidacion;
  documentoObservacion: string | null;
  documentoRevisadoAt: string | null;
  createdAt: string;
}

/** Un documento exigido por el rol, con el que la persona ya subió (o null). */
/** Una de las formas de cubrir un grupo de acreditación. */
export interface OpcionDocumento {
  tipo: string;
  titulo: string;
  descripcion: string;
}

/**
 * Grupo de acreditación: basta con UNA de sus opciones.
 *
 * El grupo del deportista admite además `alternativaVideollamada`, para quien
 * no tiene credencial ni certificado.
 */
export interface GrupoAcreditacion {
  grupo: string;
  titulo: string;
  descripcion: string;
  opciones: OpcionDocumento[];
  alternativaVideollamada?: { titulo: string; descripcion: string };
  tipoCubierto: string | null;
  cubiertoPorVideollamada: boolean;
  cubierto: boolean;
  documento: Documento | null;
}

export interface Validacion {
  estadoValidacion: EstadoValidacion;
  motivoRechazo: string | null;
  validadoAt: string | null;
  /** "documento" | "videollamada" | null si aún no eligió. */
  verificacionVia: string | null;
  verificacionDisponibilidad: string | null;
  verificacionNota: string | null;
  admiteVideollamada: boolean;
  grupos: GrupoAcreditacion[];
  faltantes: string[];
  listaParaRevision: boolean;
}

/* ------------------------------------------------- Catálogo de discapacidad */

export interface TipoDiscapacidad {
  clave: string;
  titulo: string;
  descripcion: string;
}

export interface Apoyo {
  clave: string;
  titulo: string;
  detalle: string;
  categoria: string;
}

export interface CatalogoDiscapacidad {
  tiposDiscapacidad: TipoDiscapacidad[];
  apoyos: Apoyo[];
  comunicacionPreferida: { clave: string; titulo: string }[];
  nivelAutonomia: { clave: string; titulo: string; detalle: string }[];
}

/* ------------------------------------------------------- Consentimientos */

export interface Finalidad {
  clave: string;
  titulo: string;
  texto: string;
  obligatorio: boolean;
  sensible: boolean;
  otorgado?: boolean;
  decididoAt?: string | null;
  requiereRenovar?: boolean;
}

export interface Derecho {
  clave: string;
  titulo: string;
  detalle: string;
}

export interface Consentimientos {
  version: string;
  finalidades: Finalidad[];
}

export interface DecisionConsentimiento {
  finalidad: string;
  otorgado: boolean;
}

/* ---------------------------------------------------------- Planificación */

export interface BloqueEntrenamiento {
  bloqueId: number;
  /** "AAAA-MM-DD" */
  fecha: string;
  /** "HH:MM" */
  horaInicio: string;
  duracionMin: number;
  disciplina: string | null;
  lugar: string | null;
  estado: "planificado" | "cumplido" | "omitido";
  notas: string | null;
}

export interface PlanMensual {
  anio: number;
  mes: number;
  existe: boolean;
  planId: number | null;
  objetivo: string | null;
  horasObjetivo: number;
  bloques: BloqueEntrenamiento[];
  avance: {
    horasCumplidas: number;
    horasPlanificadas: number;
    porcentaje: number | null;
    sesionesCumplidas: number;
    sesionesTotales: number;
  };
}

/* ------------------------------------------------------------------ Mensajería */

export interface Mensaje {
  mensajeId: number;
  mensajeViajeId: number;
  mensajeEmisorId: number;
  mensajeReceptorId: number;
  mensajeTexto: string;
  mensajeLeidoAt: string | null;
  createdAt: string;
}

export interface Conversacion {
  viajeId: number;
  estado: string;
  /** Con quién se habla. Nulo mientras no hay voluntario asignado. */
  contraparte: { usuarioId: number; nombre: string; rol: string } | null;
  mensajes: Mensaje[];
}

export interface NoLeidos {
  total: number;
  porViaje: Record<string, number>;
}

/* --------------------------------------------------------------------- Viajes */

export interface Viaje {
  viajeId: number;
  deportistaId: number;
  voluntarioId: number | null;
  estado: string;
  origen: { lat: number; lng: number; texto: string | null };
  destino: { lat: number; lng: number; texto: string | null };
  necesidades: string[];
  /** Lo que la persona escribió con sus palabras al pedir el acompañamiento. */
  comentario: string | null;
  solicitadoAt: string;
  eventos?: { tipo: string; at: string; lat: number | null; lng: number | null }[];
}

export interface Progreso {
  puntos: number;
  nivel: number;
  progresoNivel: number;
  puntosPorNivel: number;
  insignias: { codigo: string; nombre: string; icono: string | null; obtenidaAt: string }[];
}

export interface SolicitudCercana {
  viaje_id: number;
  deportista_nombre: string;
  viaje_necesidades: string[];
  origen_lat: number;
  origen_lng: number;
  viaje_origen_texto: string | null;
  destino_lat: number;
  destino_lng: number;
  viaje_destino_texto: string | null;
  viaje_comentario: string | null;
  distancia_m: number;
}
