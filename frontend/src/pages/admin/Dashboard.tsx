import { BadgeCheck, HeartHandshake, Radio, Siren, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, PageHeader } from "../../components/layout/PageHeader";
import { Estado, FilaDato, SectionBanner, Skeleton, StatCard, Vacio } from "../../components/ui";

interface Metricas {
  usuariosPorRol: Record<string, number>;
  viajesPorEstado: Record<string, number>;
  voluntariosEnLinea: number;
  panicosActivos: number;
  totalViajes: number;
  validacionesPendientes: number;
}

/** Estados del acompañamiento, ordenados como ocurren en la realidad. */
const ORDEN_VIAJE = ["solicitado", "asignado", "en_camino", "a_bordo", "finalizado", "cancelado"];

const legible = (s: string) => s.replace(/_/g, " ");

export function Dashboard() {
  const { data, loading, error } = useFetch<Metricas>("/admin/metricas");
  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Resumen general" title="Panel" />
        <div
          role="status"
          aria-label="Cargando el panel…"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(15rem,1fr))", gap: 16 }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Skeleton w={44} h={44} r={12} />
              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                <Skeleton w={48} h={22} />
                <Skeleton w="80%" h={12} />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  const roles = Object.entries(data.usuariosPorRol);
  const totalPersonas = roles.reduce((a, [, n]) => a + n, 0);
  const viajes = Object.entries(data.viajesPorEstado).sort(
    (a, b) => ORDEN_VIAJE.indexOf(a[0]) - ORDEN_VIAJE.indexOf(b[0]),
  );
  const hayAlertas = data.panicosActivos > 0;
  const porValidar = data.validacionesPendientes;

  return (
    <>
      <PageHeader
        eyebrow="Resumen general"
        title="Panel"
        subtitle={
          `${data.totalViajes} ${data.totalViajes === 1 ? "acompañamiento registrado" : "acompañamientos registrados"}` +
          ` · ${totalPersonas} ${totalPersonas === 1 ? "persona" : "personas"} en la comunidad`
        }
      />

      <div className="rejilla-metricas">
        <StatCard icon={HeartHandshake} value={data.totalViajes} label="Acompañamientos registrados" tono="indigo" />
        <StatCard icon={Radio} value={data.voluntariosEnLinea} label="Voluntarios en línea" tono="indigo" />
        <StatCard
          icon={Siren}
          value={data.panicosActivos}
          label="Alertas activas"
          tono={hayAlertas ? "coral" : "indigo"}
        />
        <StatCard icon={UsersRound} value={totalPersonas} label="Personas registradas" tono="indigo" />
        <StatCard
          icon={BadgeCheck}
          value={porValidar}
          label="Cuentas por validar"
          tono={porValidar > 0 ? "coral" : "indigo"}
        />
      </div>

      {/* Una alerta activa no se comunica solo con color: título, icono y texto. */}
      {hayAlertas && (
        <div className="aviso-critico" role="status">
          <Siren size={20} aria-hidden="true" />
          <span>
            <strong>
              Hay {data.panicosActivos} {data.panicosActivos === 1 ? "alerta" : "alertas"} sin atender.
            </strong>{" "}
            Revísalas en la sección Alertas.
          </span>
        </div>
      )}

      {/* Cola de validación: la cuenta ya existe, pero no puede operar. */}
      {porValidar > 0 && (
        <div className="aviso-atencion" role="status">
          <BadgeCheck size={20} aria-hidden="true" />
          <span>
            <strong>
              {porValidar} {porValidar === 1 ? "cuenta espera" : "cuentas esperan"} validación.
            </strong>{" "}
            Hasta que se aprueben no pueden pedir ni aceptar acompañamientos.{" "}
            <Link to="/admin/validaciones">Revisar ahora</Link>
          </span>
        </div>
      )}

      <div className="rejilla-secciones">
        <SectionBanner
          icon={HeartHandshake}
          title="Acompañamientos por estado"
          subtitle="Cómo se reparten los acompañamientos ahora mismo"
          total={data.totalViajes}
          tono="indigo"
        >
          {viajes.length === 0 ? (
            <Vacio
              icon={HeartHandshake}
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
          icon={UsersRound}
          title="Personas por rol"
          subtitle="Deportistas, voluntarios y equipo"
          total={totalPersonas}
          tono="indigo"
        >
          {roles.length === 0 ? (
            <Vacio icon={UsersRound} titulo="Sin personas registradas" />
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
        .aviso-atencion{
          display:flex;gap:12px;align-items:flex-start;
          background:var(--lavanda);color:var(--ink);
          border-left:3px solid var(--indigo);border-radius:var(--r-sm);
          padding:14px 16px;margin-bottom:22px;font-size:15px;line-height:1.5;
        }
        .aviso-atencion svg{flex:none;margin-top:2px;color:var(--indigo)}
        .pie-panel{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
      `}</style>
    </>
  );
}
