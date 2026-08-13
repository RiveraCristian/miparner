import { Route as RouteIcon, Radio, ShieldAlert, Users } from "lucide-react";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/PageHeader";

interface Metricas {
  usuariosPorRol: Record<string, number>;
  viajesPorEstado: Record<string, number>;
  voluntariosEnLinea: number;
  panicosActivos: number;
  totalViajes: number;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `var(--${tone}-soft)`, color: `var(--${tone})`, display: "grid", placeItems: "center" }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
        <div className="muted" style={{ fontSize: 13 }}>{label}</div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data, loading, error } = useFetch<Metricas>("/admin/metricas");
  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  const roles = data.usuariosPorRol;
  const totalUsuarios = Object.values(roles).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Estado general de la plataforma" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <Metric icon={RouteIcon} label="Viajes totales" value={data.totalViajes} tone="brand" />
        <Metric icon={Radio} label="Voluntarios en línea" value={data.voluntariosEnLinea} tone="success" />
        <Metric icon={ShieldAlert} label="Pánicos activos" value={data.panicosActivos} tone="danger" />
        <Metric icon={Users} label="Usuarios" value={totalUsuarios} tone="brand" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Viajes por estado</h3>
          {Object.keys(data.viajesPorEstado).length === 0 && <p className="muted" style={{ fontSize: 14 }}>Sin viajes aún.</p>}
          {Object.entries(data.viajesPorEstado).map(([estado, n]) => (
            <div key={estado} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span style={{ textTransform: "capitalize" }}>{estado.replace("_", " ")}</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{n}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Usuarios por rol</h3>
          {Object.entries(roles).map(([rol, n]) => (
            <div key={rol} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span style={{ textTransform: "capitalize" }}>{rol}</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{n}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
