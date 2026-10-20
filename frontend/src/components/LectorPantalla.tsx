/**
 * Lector de pantalla "pincha y escucha" para personas con baja visión o
 * dificultad de lectura.
 *
 * Usa la Web Speech API nativa del navegador (`speechSynthesis`): sin librerías
 * ni servicios externos, lee en español. Al activarlo, cualquier clic sobre un
 * texto de la página lo lee en voz alta (y consume el clic para no navegar por
 * error mientras se explora; para navegar, se desactiva el modo lectura).
 *
 * Nota: a las personas ciegas totales les sirve más su propio lector del
 * sistema (NVDA/VoiceOver/TalkBack) sobre un HTML bien etiquetado; esto es un
 * apoyo visible y complementario, no un reemplazo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const LANG = "es-CL";

export default function LectorPantalla() {
  const soportado =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [activo, setActivo] = useState(false);
  const vozRef = useRef<SpeechSynthesisVoice | null>(null);

  // Elige una voz en español en cuanto el navegador las tenga cargadas.
  useEffect(() => {
    if (!soportado) return;
    const elegirVoz = () => {
      const voces = window.speechSynthesis.getVoices();
      vozRef.current =
        voces.find((v) => v.lang === LANG) ??
        voces.find((v) => v.lang.toLowerCase().startsWith("es")) ??
        voces[0] ??
        null;
    };
    elegirVoz();
    window.speechSynthesis.addEventListener("voiceschanged", elegirVoz);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", elegirVoz);
  }, [soportado]);

  const leer = useCallback((texto: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = LANG;
    if (vozRef.current) u.voice = vozRef.current;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }, []);

  // Mientras el modo está activo, interceptamos los clics para leer el texto.
  useEffect(() => {
    if (!activo) return;

    const onClick = (e: MouseEvent) => {
      const destino = e.target as HTMLElement | null;
      if (!destino) return;
      // No interceptar los controles del propio lector.
      if (destino.closest("[data-lector-ui]")) return;

      const texto = (destino.innerText || destino.textContent || "")
        .trim()
        .replace(/\s+/g, " ");
      if (!texto) return;

      // Consumimos el clic: se lee en vez de navegar/activar.
      e.preventDefault();
      e.stopPropagation();

      leer(texto.slice(0, 600));

      destino.setAttribute("data-leyendo", "true");
      window.setTimeout(() => destino.removeAttribute("data-leyendo"), 1500);
    };

    document.addEventListener("click", onClick, true);
    document.body.classList.add("lector-activo");
    return () => {
      document.removeEventListener("click", onClick, true);
      document.body.classList.remove("lector-activo");
      window.speechSynthesis.cancel();
    };
  }, [activo, leer]);

  if (!soportado) return null;

  const alternar = () => {
    window.speechSynthesis.cancel();
    setActivo((a) => !a);
  };

  return (
    <div data-lector-ui>
      {activo && (
        <div className="lector-aviso" role="status">
          Modo lectura activo · toca cualquier texto para escucharlo
        </div>
      )}

      <button
        type="button"
        className={`lector-btn ${activo ? "is-on" : ""}`}
        aria-pressed={activo}
        aria-label={
          activo
            ? "Desactivar lectura en voz alta"
            : "Activar lectura en voz alta"
        }
        onClick={alternar}
      >
        {activo ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        <span>{activo ? "Lectura activa" : "Leer en voz alta"}</span>
      </button>

      <style>{`
        .lector-btn{
          position:fixed; left:20px; bottom:20px; z-index:1000;
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 18px; border:none; border-radius:999px;
          background:#3a3996; color:#fff; cursor:pointer;
          font:600 15px/1 'Outfit', system-ui, sans-serif;
          box-shadow:0 6px 20px rgba(0,0,0,.25);
          transition:background .2s ease, transform .1s ease;
        }
        .lector-btn:hover{ background:#2f2e7a; }
        .lector-btn:active{ transform:translateY(1px); }
        .lector-btn:focus-visible{ outline:3px solid #e75225; outline-offset:2px; }
        .lector-btn.is-on{ background:#e75225; }
        .lector-aviso{
          position:fixed; left:20px; bottom:74px; z-index:1000;
          max-width:250px; padding:9px 14px; border-radius:12px;
          background:#1a1821; color:#fff;
          font:500 14px/1.35 'Outfit', system-ui, sans-serif;
          box-shadow:0 6px 20px rgba(0,0,0,.25);
        }
        body.lector-activo, body.lector-activo *{ cursor:pointer; }
        body.lector-activo [data-leyendo]{
          outline:3px solid #e75225 !important; outline-offset:2px;
          background:rgba(231,82,37,.08) !important; border-radius:4px;
        }
        @media (prefers-reduced-motion: reduce){
          .lector-btn{ transition:none; }
        }
      `}</style>
    </div>
  );
}
