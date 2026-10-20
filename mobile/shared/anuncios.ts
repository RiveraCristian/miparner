/**
 * Avisos hablados para lectores de pantalla.
 *
 * El hueco que esto cierra: en una app donde esperas en la calle a que alguien
 * te recoja, los cambios importantes no los provoca quien mira la pantalla,
 * sino la otra persona. El voluntario acepta, sale, llega. Si eso solo repinta
 * la pantalla, quien usa TalkBack o VoiceOver no se entera hasta que vuelve a
 * tantear con el dedo, y mientras tanto no sabe si alguien viene o no.
 *
 * `announceForAccessibility` hace que el lector lo diga en voz alta sin robar
 * el foco: la persona sigue donde estaba, pero se ha enterado.
 *
 * Dos reglas al usar esto:
 *
 *  1. Se anuncia lo que CAMBIÓ, no lo que hay. "Tu voluntario va en camino",
 *     no "Estado: en camino". Lo segundo obliga a reconstruir qué pasó.
 *  2. No se anuncia lo que la propia persona acaba de hacer: ya lo sabe, y el
 *     lector ya lee el botón que pulsó. Solo lo que viene de fuera.
 */
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Dice algo en voz alta si hay un lector de pantalla activo.
 *
 * Si no lo hay, no hace nada: no es una notificación visible ni sustituye a lo
 * que se pinta en pantalla, que debe seguir contando lo mismo por su cuenta.
 */
export async function anunciar(texto: string) {
  if (!texto.trim()) return;
  try {
    const activo = await AccessibilityInfo.isScreenReaderEnabled();
    if (!activo) return;

    // En Android el anuncio puede pisarse con el repintado de la pantalla si
    // se lanza en el mismo ciclo; un respiro corto hace que se oiga entero.
    if (Platform.OS === "android") {
      setTimeout(() => AccessibilityInfo.announceForAccessibility(texto), 350);
    } else {
      AccessibilityInfo.announceForAccessibility(texto);
    }
  } catch {
    // Que falle el aviso no debe romper la pantalla: es un refuerzo, no el
    // único canal.
  }
}

/* ------------------------------------------- Textos de los cambios de estado */

/**
 * Qué se dice en cada cambio, visto desde cada lado.
 *
 * Están redactados en segunda persona y nombrando a la otra parte, porque es
 * la información que de verdad hace falta: no "estado asignado", sino que ya
 * hay alguien que viene.
 */
const PARA_DEPORTISTA: Record<string, string> = {
  asignado: "Un voluntario aceptó tu acompañamiento.",
  en_camino: "Tu voluntario va en camino.",
  en_accion: "Tu acompañamiento comenzó.",
  finalizado: "Llegaste. El acompañamiento terminó.",
  cancelado: "El acompañamiento fue cancelado.",
};

const PARA_VOLUNTARIO: Record<string, string> = {
  en_camino: "Vas en camino.",
  en_accion: "El acompañamiento comenzó.",
  finalizado: "Acompañamiento finalizado.",
  cancelado: "El acompañamiento fue cancelado.",
};

export function anunciarEstado(estado: string, rol: "deportista" | "voluntario") {
  const texto = (rol === "deportista" ? PARA_DEPORTISTA : PARA_VOLUNTARIO)[estado];
  if (texto) void anunciar(texto);
}

/** Mensaje nuevo en el chat. Se nombra a quien escribe, no "mensaje nuevo". */
export function anunciarMensaje(deQuien: string) {
  void anunciar(`Mensaje nuevo de ${deQuien}.`);
}

/** La otra persona se está acercando. Solo en hitos, no en cada metro. */
export function anunciarCercania(metros: number) {
  if (metros <= 50) void anunciar("Tu voluntario llegó.");
  else if (metros <= 200) void anunciar("Tu voluntario está a menos de 200 metros.");
}
