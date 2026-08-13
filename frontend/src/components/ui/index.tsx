/**
 * Piezas de interfaz compartidas.
 *
 * Regla de color que gobierna todo este archivo: el coral es color de FORMA
 * (iconos, barras, círculos), nunca soporte de texto pequeño. El texto de acento
 * va en índigo o tinta, que ya cumplen AAA. Y ningún estado se comunica solo con
 * color: todos llevan icono además del texto (WCAG 1.4.1).
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleAlert, CircleDot, Info, MinusCircle } from "lucide-react";

/* ------------------------------------------------------------------ Sección */

export type Tono = "indigo" | "coral" | "exito" | "neutro";

const fondoTono: Record<Tono, string> = {
  indigo: "var(--lavanda)",
  coral: "var(--coral-bg)",
  exito: "var(--exito-bg)",
  neutro: "var(--surface-2)",
};
const formaTono: Record<Tono, string> = {
  indigo: "var(--indigo)",
  coral: "var(--coral)",
  exito: "var(--exito)",
  neutro: "var(--ink-3)",
};

/**
 * Banner de sección: círculo con icono + título + subtítulo + cifra a la derecha.
 * El círculo es la forma coloreada; los textos van en tinta y gris.
 */
export function SectionBanner({
  icon: Icon,
  title,
  subtitle,
  total,
  tono = "indigo",
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  total?: ReactNode;
  tono?: Tono;
  children?: ReactNode;
}) {
  return (
    <section className="seccion">
      <div className="seccion__banner" style={{ background: fondoTono[tono] }}>
        <span className="seccion__icono" style={{ background: formaTono[tono] }} aria-hidden="true">
          <Icon size={22} color="#fff" />
        </span>
        <div className="seccion__texto">
          <h2 className="seccion__titulo">{title}</h2>
          {subtitle && <p className="seccion__sub">{subtitle}</p>}
        </div>
        {total !== undefined && <span className="seccion__total num">{total}</span>}
      </div>
      {children && <div className="seccion__cuerpo">{children}</div>}

      <style>{`
        .seccion{
          background:var(--surface);border:1px solid var(--line);
          border-radius:var(--r-lg);overflow:hidden;
        }
        .seccion__banner{display:flex;align-items:center;gap:14px;padding:16px 20px}
        .seccion__icono{
          flex:none;width:42px;height:42px;border-radius:50%;
          display:grid;place-items:center;
        }
        .seccion__texto{flex:1;min-width:0}
        .seccion__titulo{font-size:18px;font-weight:600;line-height:1.25}
        .seccion__sub{font-size:14px;color:var(--ink-2);margin-top:3px}
        .seccion__total{font-size:26px;font-weight:600;color:var(--ink);letter-spacing:-.02em}
        .seccion__cuerpo{padding:20px}
      `}</style>
    </section>
  );
}

/* ----------------------------------------------------------------- Métricas */

/** Número grande + etiqueta. La cifra usa coral solo desde 24 px (AA grande). */
export function StatCard({
  icon: Icon,
  value,
  label,
  tono = "indigo",
}: {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  tono?: Tono;
}) {
  return (
    <div className="metrica">
      {Icon && (
        <span className="metrica__icono" style={{ background: fondoTono[tono], color: formaTono[tono] }} aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
      <div>
        <div className="metrica__valor num">{value}</div>
        <div className="metrica__label">{label}</div>
      </div>
      <style>{`
        .metrica{
          display:flex;align-items:center;gap:14px;
          background:var(--surface);border:1px solid var(--line);
          border-radius:var(--r-lg);padding:18px 20px;
        }
        .metrica__icono{flex:none;width:44px;height:44px;border-radius:var(--r);display:grid;place-items:center}
        .metrica__valor{font-size:28px;font-weight:600;line-height:1.15;letter-spacing:-.02em}
        .metrica__label{font-size:14px;color:var(--ink-2);margin-top:2px}
      `}</style>
    </div>
  );
}

/** Fila etiqueta / valor para desgloses. */
export function FilaDato({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fila-dato">
      <span>{label}</span>
      <strong className="num">{value}</strong>
      <style>{`
        .fila-dato{
          display:flex;justify-content:space-between;gap:16px;align-items:baseline;
          padding:11px 0;border-bottom:1px solid var(--line-2);font-size:15px;
        }
        .fila-dato:last-child{border-bottom:0;padding-bottom:0}
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------- Estados */

export type ClaseEstado = "indigo" | "exito" | "critico" | "atencion" | "neutro";

const iconoEstado: Record<ClaseEstado, LucideIcon> = {
  indigo: Info,
  exito: CheckCircle2,
  critico: CircleAlert,
  atencion: CircleDot,
  neutro: MinusCircle,
};

/** Indicador de estado: siempre icono + texto, el color solo acompaña. */
export function Estado({ tipo, children }: { tipo: ClaseEstado; children: ReactNode }) {
  const Icon = iconoEstado[tipo];
  return (
    <span className={`estado estado-${tipo}`}>
      <Icon size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Vacío con explicación: dice qué pasa, no solo «sin datos». */
export function Vacio({ icon: Icon, titulo, detalle }: { icon: LucideIcon; titulo: string; detalle?: string }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10, padding: "48px 24px", textAlign: "center" }}>
      <span
        aria-hidden="true"
        style={{
          width: 52, height: 52, borderRadius: "50%", background: "var(--lavanda)",
          color: "var(--indigo)", display: "grid", placeItems: "center",
        }}
      >
        <Icon size={24} />
      </span>
      <strong style={{ fontSize: 17, fontWeight: 600 }}>{titulo}</strong>
      {detalle && <p className="tenue" style={{ maxWidth: "38ch" }}>{detalle}</p>}
    </div>
  );
}
