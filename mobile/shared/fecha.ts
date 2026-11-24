/**
 * Fechas escritas a mano · funciones puras, sin React.
 *
 * En Chile una fecha se dice y se escribe día-mes-año (23-04-1998). Pedirla
 * como AAAA-MM-DD, que es lo que guarda el backend, confunde a cualquiera y es
 * peor con TalkBack: quien no ve el campo tiene que acordarse del orden raro y,
 * además, teclear los guiones. Aquí la persona escribe solo los ocho dígitos en
 * su orden de siempre, los guiones aparecen solos, y la conversión a ISO pasa
 * por debajo justo antes de enviar. El contrato con la API no cambia.
 *
 * Se deja aparte de la pantalla porque cualquier otra que muestre o pida una
 * fecha debería hablar el mismo formato.
 */

/** Cuántos dígitos tiene una fecha completa: DD MM AAAA. */
const DIGITOS = 8;

/** Pone los guiones a una tira de hasta 8 dígitos: "2304199" → "23-04-199". */
function conGuiones(digitos: string): string {
  const d = digitos.slice(0, DIGITOS);
  // El guion aparece cuando llega el dígito siguiente, no antes. Así nunca
  // queda un guion suelto al final que la persona tenga que borrar aparte:
  // si borra el primer dígito del mes, el guion se va con él.
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

const dos = (n: string) => n.padStart(2, "0");

/** ¿Existe ese día en el calendario? Descarta 31-02, 29-02 de año no bisiesto… */
function esFechaReal(anio: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  // Date.UTC "arregla" las fechas imposibles pasándolas al mes siguiente;
  // si al volver no coincide el día, es que no existía.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/**
 * Máscara para el campo de fecha. Recibe lo que trae `onChangeText` y lo que
 * había antes, y devuelve el texto a mostrar en formato DD-MM-AAAA.
 *
 *  · Escribir: solo cuentan los dígitos; los guiones se insertan solos.
 *  · Borrar un guion (con el cursor justo después de él) borra también el
 *    dígito anterior. Si no, el guion volvería a aparecer al remaquetar y la
 *    persona quedaría atrapada pulsando borrar sin que pase nada.
 *  · Pegar: acepta "23/04/1998", "23.04.1998", "23 04 1998", "23041998",
 *    "23/4/1998" y también el ISO "1998-04-23", y los deja como DD-MM-AAAA.
 */
export function enmascararFecha(texto: string, anterior = ""): string {
  const limpio = texto.trim();

  // ISO pegado (o copiado de otra app): año de cuatro cifras al principio.
  const iso = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/.exec(limpio);
  if (iso) return `${dos(iso[3])}-${dos(iso[2])}-${iso[1]}`;

  // Día-mes-año con cualquier separador y día o mes de una cifra.
  const dma = /^(\d{1,2})[-/. ]+(\d{1,2})[-/. ]+(\d{4})$/.exec(limpio);
  if (dma) return `${dos(dma[1])}-${dos(dma[2])}-${dma[3]}`;

  let digitos = limpio.replace(/\D/g, "");
  const digitosAntes = anterior.replace(/\D/g, "");

  // Se borró un solo carácter y los dígitos no cambiaron: fue un guion.
  if (texto.length === anterior.length - 1 && digitos === digitosAntes) {
    let i = 0;
    while (i < texto.length && texto[i] === anterior[i]) i++;
    // Dígitos que había antes del guion borrado: el último de ellos se va.
    const antesDelGuion = anterior.slice(0, i).replace(/\D/g, "").length;
    if (antesDelGuion > 0) {
      digitos = digitos.slice(0, antesDelGuion - 1) + digitos.slice(antesDelGuion);
    }
  }

  // Ocho cifras de golpe y sin separadores (un pegado, no tecleo): si como
  // DDMMAAAA no existe pero como AAAAMMDD sí, era un ISO sin guiones.
  if (
    /^\d{8}$/.test(limpio) &&
    limpio.length - digitosAntes.length > 1 &&
    !esFechaReal(+limpio.slice(4), +limpio.slice(2, 4), +limpio.slice(0, 2)) &&
    esFechaReal(+limpio.slice(0, 4), +limpio.slice(4, 6), +limpio.slice(6))
  ) {
    return `${limpio.slice(6)}-${limpio.slice(4, 6)}-${limpio.slice(0, 4)}`;
  }

  return conGuiones(digitos);
}

/** "23-04-1998" → "1998-04-23". Devuelve null si no es una fecha real completa. */
export function fechaAIso(ddmmaaaa: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmaaaa.trim());
  if (!m) return null;
  const [, dia, mes, anio] = m;
  if (!esFechaReal(+anio, +mes, +dia)) return null;
  return `${anio}-${mes}-${dia}`;
}

/**
 * "1998-04-23" (o un ISO con hora, como lo devuelve la API) → "23-04-1998",
 * para mostrar. Si no se reconoce, devuelve el texto tal cual.
 */
export function isoAFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** Edad mínima y máxima que acepta el backend (auth.schemas.ts). */
const EDAD_MIN = 5;
const EDAD_MAX = 110;

export type FechaValidada = { ok: true; iso: string | undefined } | { ok: false; error: string };

/**
 * Valida la fecha de nacimiento tal como la escribe la persona (DD-MM-AAAA).
 *
 * Vacía es válida: el dato es opcional. Las reglas de edad son las mismas que
 * aplica el backend, para que el error salga aquí, junto al campo, y no al
 * final del registro cuando la API rechaza la cuenta.
 */
export function validarFechaNacimiento(texto: string, hoy: Date = new Date()): FechaValidada {
  const t = texto.trim();
  if (!t) return { ok: true, iso: undefined };

  if (!/^\d{2}-\d{2}-\d{4}$/.test(t)) {
    return { ok: false, error: "Falta completar la fecha: día, mes y año. Por ejemplo 23-04-1998." };
  }
  const iso = fechaAIso(t);
  if (!iso) {
    return { ok: false, error: "Esa fecha no existe. Revisa el día y el mes." };
  }
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (ms > hoy.getTime()) {
    return { ok: false, error: "La fecha de nacimiento no puede ser posterior a hoy." };
  }
  // Mismo cálculo que el backend, para no aceptar aquí algo que allá rechaza.
  const edad = (hoy.getTime() - ms) / (365.25 * 24 * 3600 * 1000);
  if (edad < EDAD_MIN || edad > EDAD_MAX) {
    return {
      ok: false,
      error: `Revisa el año: la edad tiene que estar entre ${EDAD_MIN} y ${EDAD_MAX} años.`,
    };
  }
  return { ok: true, iso };
}
