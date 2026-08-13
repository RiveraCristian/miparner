import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Título de página + contexto + acción primaria a la derecha. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="encabezado">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="tenue encabezado__sub">{subtitle}</p>}
      </div>
      {action}
      <style>{`
        .encabezado{
          display:flex;align-items:flex-end;justify-content:space-between;
          gap:18px;flex-wrap:wrap;margin-bottom:28px;
        }
        .encabezado__sub{margin-top:7px}
      `}</style>
    </header>
  );
}

export function Loader({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 14, padding: 64 }} role="status">
      <div className="spin" />
      <span className="tenue">{texto}</span>
    </div>
  );
}

/** El error lleva icono y texto: el color nunca informa por sí solo. */
export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div
      className="card"
      role="alert"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "var(--coral-bg)",
        borderColor: "var(--coral)",
      }}
    >
      <AlertCircle size={20} aria-hidden="true" style={{ color: "var(--coral)", flex: "none", marginTop: 2 }} />
      <span>{msg}</span>
    </div>
  );
}
