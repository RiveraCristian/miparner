/**
 * Consentimientos · Ley 21.719 de protección de datos personales.
 *
 * BORRADOR PENDIENTE DE REVISIÓN LEGAL. El mecanismo es correcto; los textos
 * los tiene que validar un abogado antes de salir a producción.
 *
 * Tres decisiones de diseño que conviene no deshacer sin pensarlo:
 *
 * 1. Cada finalidad se consiente POR SEPARADO. Una sola casilla de "acepto los
 *    términos" no vale como consentimiento: la ley pide que sea específico
 *    para cada finalidad, y que el titular pueda aceptar unas y rechazar otras.
 *
 * 2. Los datos de discapacidad y salud son DATOS SENSIBLES. Su consentimiento
 *    va aparte, escrito sin ambigüedad y nunca marcado por omisión.
 *
 * 3. Se guarda QUÉ texto aceptó cada persona, no solo que aceptó. Por eso cada
 *    finalidad tiene versión y del texto se guarda un hash: si mañana cambia la
 *    redacción, se puede demostrar cuál estaba vigente cuando alguien aceptó, y
 *    detectar a quién hay que volver a preguntar.
 */
import { createHash } from "node:crypto";

/** Versión de la política. Subirla obliga a volver a pedir el consentimiento. */
export const VERSION_POLITICA = "1.0-borrador";

export interface Finalidad {
  clave: string;
  titulo: string;
  /** Texto exacto que se muestra y que queda registrado. */
  texto: string;
  /** Sin esto no se puede prestar el servicio. */
  obligatorio: boolean;
  /** Dato sensible según la ley: exige consentimiento explícito y separado. */
  sensible: boolean;
  /** Roles a los que se les pide. */
  roles: ("deportista" | "voluntario")[];
}

export const FINALIDADES: Finalidad[] = [
  {
    clave: "datos_personales",
    titulo: "Uso de tus datos para prestarte el servicio",
    texto:
      "Autorizo a Miparner a tratar mi nombre, correo, teléfono y comuna con el " +
      "fin de crear mi cuenta, coordinar acompañamientos y comunicarse conmigo " +
      "sobre ellos. Sin esta autorización no es posible usar la plataforma.",
    obligatorio: true,
    sensible: false,
    roles: ["deportista", "voluntario"],
  },
  {
    clave: "datos_sensibles_salud",
    titulo: "Uso de tus datos de discapacidad y salud",
    texto:
      "Autorizo de forma expresa a Miparner a tratar los datos sobre mi " +
      "discapacidad, los apoyos que necesito y la información de salud que yo " +
      "decida entregar, con el único fin de asignarme un voluntario que pueda " +
      "acompañarme de manera adecuada y segura. Entiendo que son datos " +
      "sensibles, que el voluntario solo verá los apoyos que necesito durante " +
      "el trayecto y nunca mi diagnóstico ni mis documentos, y que puedo " +
      "revocar esta autorización en cualquier momento.",
    obligatorio: true,
    sensible: true,
    roles: ["deportista"],
  },
  {
    clave: "documentos_acreditacion",
    titulo: "Revisión de tus documentos de acreditación",
    texto:
      "Autorizo a Miparner a recibir y revisar los documentos que suba para " +
      "acreditar mi situación. Entiendo que solo los verá el equipo de " +
      "administración, que se conservan mientras mi cuenta esté activa y que " +
      "puedo pedir su eliminación.",
    obligatorio: false,
    sensible: true,
    roles: ["deportista", "voluntario"],
  },
  {
    clave: "geolocalizacion",
    titulo: "Uso de tu ubicación durante el acompañamiento",
    texto:
      "Autorizo a Miparner a usar la ubicación de mi teléfono mientras un " +
      "acompañamiento está en curso, para mostrar el trayecto a la otra persona " +
      "y para atender una alerta si activo el botón de pánico. Entiendo que la " +
      "ubicación deja de registrarse cuando el acompañamiento termina.",
    obligatorio: true,
    sensible: false,
    roles: ["deportista", "voluntario"],
  },
  {
    clave: "comunicaciones",
    titulo: "Avisos que no son imprescindibles",
    texto:
      "Quiero recibir novedades de Miparner, invitaciones a actividades y " +
      "encuestas. Puedo desactivarlo cuando quiera sin perder el servicio.",
    obligatorio: false,
    sensible: false,
    roles: ["deportista", "voluntario"],
  },
];

/** Huella del texto aceptado, para probar qué redacción estaba vigente. */
export function hashTexto(texto: string): string {
  return createHash("sha256").update(texto.trim()).digest("hex");
}

export function finalidadesDeRol(rol: string): Finalidad[] {
  return FINALIDADES.filter((f) => (f.roles as string[]).includes(rol));
}

export function obligatoriasDeRol(rol: string): string[] {
  return finalidadesDeRol(rol)
    .filter((f) => f.obligatorio)
    .map((f) => f.clave);
}

const PORCLAVE = new Map(FINALIDADES.map((f) => [f.clave, f]));
export const buscarFinalidad = (clave: string) => PORCLAVE.get(clave);

/**
 * Derechos del titular (acceso, rectificación, cancelación, oposición y
 * portabilidad). Se publican en la app y en la web, con la vía para ejercerlos.
 */
export const DERECHOS_TITULAR = [
  {
    clave: "acceso",
    titulo: "Acceso",
    detalle: "Saber qué datos tuyos tenemos y para qué los usamos.",
  },
  {
    clave: "rectificacion",
    titulo: "Rectificación",
    detalle: "Corregir un dato equivocado o incompleto.",
  },
  {
    clave: "cancelacion",
    titulo: "Supresión",
    detalle: "Pedir que borremos tus datos cuando ya no sean necesarios.",
  },
  {
    clave: "oposicion",
    titulo: "Oposición",
    detalle: "Oponerte a que usemos tus datos para una finalidad concreta.",
  },
  {
    clave: "portabilidad",
    titulo: "Portabilidad",
    detalle: "Llevarte tus datos en un archivo que puedas reutilizar.",
  },
] as const;
