import { Radio, Route as RouteIcon, ShieldAlert, Users } from "lucide-react";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, FilaDato, SectionBanner, StatCard, Vacio } from "../../components/ui";

interface Metricas {
  usuariosPorRol: Record<string, number>;
  viajesPorEstado: Record<string, number>;
  voluntariosEnLinea: number;
  panicosActivos: number;
  totalViajes: number;
}

/** Estados del acompañamiento, ordenados como ocurren en la realidad. */
const ORDEN_VIAJE = ["solicitado", "asignado", "en_camino", "a_bordo", "finalizado", "cancelado"];

const legible = (s: string) => s.replace(/_/g, " ");

export function Dashboard() {
  const { data, loading, error } = useFetch<Metricas>("/admin/metricas");
  if (loading) return <Loader texto="Cargando el panel…" />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  const roles = Object.entries(data.usuariosPorRol);
  const totalPersonas = roles.reduce((a, [, n]) => a + n, 0);
  const viajes = Object.entries(data.viajesPorEstado).sort(
    (a, b) => ORDEN_VIAJE.indexOf(a[0]) - ORDEN_VIAJE.indexOf(b[0]),
  );
  const hayAlertas = data.panicosActivos > 0;

  return (
    <>
      <PageHeader
        title="Panel"
        subtitle={
          `${data.totalViajes} ${data.totalViajes === 1 ? "acompañamiento registrado" : "acompañamientos registrados"}` +
          ` · ${totalPersonas} ${totalPersonas === 1 ? "persona" : "personas"} en la comunidad`
        }
      />

      <div className="rejilla-metricas">
        <StatCard icon={RouteIcon} value={data.totalViajes} label="Acompañamientos registrados" tono="indigo" />
        <StatCard icon={Radio} value={data.voluntariosEnLinea} label="Voluntarios en línea" tono="exito" />
        <StatCard
          icon={ShieldAlert}
          value={data.panicosActivos}
          label="Alertas activas"
          tono={hayAlertas ? "coral" : "neutro"}
        />
        <StatCard icon={Users} value={totalPersonas} label="Personas registradas" tono="indigo" />
      </div>

      {/* Una alerta activa no se comunica solo con color: título, icono y texto. */}
      {hayAlertas && (
        <div className="aviso-critico" role="status">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>
            <strong>
              Hay {data.panicosActivos} {data.panicosActivos === 1 ? "alerta" : "alertas"} sin atender.
            </strong>{" "}
            Revísalas en la sección Alertas.
          </span>
        </div>
      )}

      <div className="rejilla-secciones">
        <SectionBanner
          icon={RouteIcon}
          title="Acompañamientos por estado"
          subtitle="Cómo se reparten los acompañamientos ahora mismo"
          total={data.totalViajes}
          tono="indigo"
        >
          {viajes.length === 0 ? (
            <Vacio
              icon={RouteIcon}
              titulo="Todavía no hay acompañamientos"
              detalle="Cuando un deportista pida su primer acompañamiento, aparecerá aquí."
            />
          ) : (
            viajes.map(([estado, n]) => (
              <FilaDato
                key={estado}
                label={legible(estado)}
                value={n}
              />
            ))
          )}
        </SectionBanner>

        <SectionBanner
          icon={Users}
          title="Personas por rol"
          subtitle="Deportistas, voluntarios y equipo"
          total={totalPersonas}
          tono="neutro"
        >
          {roles.length === 0 ? (
            <Vacio icon={Users} titulo="Sin personas registradas" />
          ) : (
            roles.map(([rol, n]) => <FilaDato key={rol} label={rol} value={n} />)
          )}
        </SectionBanner>
      </div>

      <div className="pie-panel">
        <Estado tipo="exito">{data.voluntariosEnLinea} en línea</Estado>
        <Estado tipo={hayAlertas ? "critico" : "neutro"}>
          {hayAlertas
            ? `${data.panicosActivos} ${data.panicosActivos === 1 ? "alerta activa" : "alertas activas"}`
            : "Sin alertas activas"}
        </Estado>
      </div>

      <style>{`
        .rejilla-metricas{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));
          gap:16px;margin-bottom:22px;
        }
        .rejilla-secciones{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:20px;
        }
        /* Coral como forma: barra e icono. El texto va en tinta (15.1:1 AAA). */
        .aviso-critico{
          display:flex;gap:12px;align-items:flex-start;
          background:var(--coral-bg);color:var(--ink);
          border-left:3px solid var(--coral);border-radius:var(--r-sm);
          padding:14px 16px;margin-bottom:22px;font-size:15px;line-height:1.5;
        }
        .aviso-critico svg{flex:none;margin-top:2px;color:var(--coral)}
        .pie-panel{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
      `}</style>
    </>
  );
}
