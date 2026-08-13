import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 27, fontWeight: 800 }}>{title}</h1>
        {subtitle && <p className="muted" style={{ margin: "5px 0 0", fontSize: 14.5 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loader() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
      <div className="spin" />
    </div>
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger-strong)" }}>
      {msg}
    </div>
  );
}
