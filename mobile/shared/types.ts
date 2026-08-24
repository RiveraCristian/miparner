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
export interface Requisito {
  tipo: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  documento: Documento | null;
}

export interface Validacion {
  estadoValidacion: EstadoValidacion;
  motivoRechazo: string | null;
  validadoAt: string | null;
  requeridos: Requisito[];
  faltantes: string[];
  listaParaRevision: boolean;
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
