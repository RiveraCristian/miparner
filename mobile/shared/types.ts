export interface Usuario {
  usuarioId: number;
  correo: string;
  nombre: string;
  rol: "deportista" | "voluntario" | "admin";
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Viaje {
  viajeId: number;
  deportistaId: number;
  voluntarioId: number | null;
  estado: string;
  origen: { lat: number; lng: number; texto: string | null };
  destino: { lat: number; lng: number; texto: string | null };
  necesidades: string[];
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
  distancia_m: number;
}
