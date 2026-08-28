/**
 * Avisos flotantes (toasts) para todo el panel.
 *
 * Un único proveedor expone `useToast()` con `exito(msg)` y `error(msg)`. Los
 * avisos aparecen abajo a la derecha, se apilan y se desvanecen solos. Cada uno
 * lleva icono además del color (WCAG 1.4.1) y la región es `aria-live`.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Tipo = "exito" | "error";
interface Aviso {
  id: number;
  tipo: Tipo;
  msg: string;
}
interface ToastCtx {
  exito: (msg: string) => void;
  error: (msg: string) => void;
}

const Ctx = createContext<ToastCtx>({ exito: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const quitar = useCallback((id: number) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const agregar = useCallback(
    (tipo: Tipo, msg: string) => {
      const id = ++seq;
      setAvisos((prev) => [...prev, { id, tipo, msg }]);
      window.setTimeout(() => quitar(id), 4500);
    },
    [quitar],
  );

  const valor: ToastCtx = {
    exito: (msg) => agregar("exito", msg),
    error: (msg) => agregar("error", msg),
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="toasts" role="region" aria-live="polite" aria-label="Notificaciones">
        {avisos.map((a) => {
          const Icon = a.tipo === "exito" ? CheckCircle2 : AlertCircle;
          return (
            <div key={a.id} className={`toast toast--${a.tipo}`} role="status">
              <Icon size={18} aria-hidden="true" className="toast__icono" />
              <span className="toast__msg">{a.msg}</span>
              <button className="toast__cerrar" onClick={() => quitar(a.id)} aria-label="Cerrar aviso">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .toasts{
          position:fixed;right:20px;bottom:20px;z-index:200;
          display:flex;flex-direction:column;gap:10px;
          max-width:min(92vw,26rem);pointer-events:none;
        }
        .toast{
          pointer-events:auto;display:flex;align-items:flex-start;gap:10px;
          background:var(--surface);border:1px solid var(--line);border-left-width:3px;
          border-radius:var(--r);box-shadow:var(--sombra);
          padding:13px 14px;font-size:15px;line-height:1.4;color:var(--ink);
          animation:toast-in .18s ease-out;
        }
        .toast--exito{border-left-color:var(--exito)}
        .toast--exito .toast__icono{color:var(--exito)}
        .toast--error{border-left-color:var(--coral)}
        .toast--error .toast__icono{color:var(--coral)}
        .toast__icono{flex:none;margin-top:1px}
        .toast__msg{flex:1}
        .toast__cerrar{
          flex:none;display:grid;place-items:center;width:24px;height:24px;border:0;
          background:transparent;color:var(--ink-3);cursor:pointer;border-radius:6px;
        }
        .toast__cerrar:hover{background:var(--surface-2);color:var(--ink)}
        @keyframes toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @media (prefers-reduced-motion:reduce){.toast{animation:none}}
      `}</style>
    </Ctx.Provider>
  );
}
