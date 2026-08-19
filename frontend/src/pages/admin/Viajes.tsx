import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, Vacio, type ClaseEstado } from "../../components/ui";

interface ViajeRow {
  viajeId: number;
  viajeEstado: string;
  viajeDeportistaId: number;
  viajeVoluntarioId: number | null;
  viajeOrigenTexto: string | null;
  viajeDestinoTexto: string | null;
  viajeSolicitadoAt: string;
  isDeleted: boolean;
}

/** Cada estado tiene su propio icono a través de <Estado>, no solo un color. */
const tonoEstado: Record<string, ClaseEstado> = {
  solicitado: "atencion",
  asignado: "indigo",
  en_camino: "indigo",
  a_bordo: "indigo",
  finalizado: "exito",
  cancelado: "critico",
};

export function Viajes() {
  const { data, loading, error } = useFetch<ViajeRow[]>("/admin/viajes");
  if (loading) return <Loader texto="Cargando acompañamientos…" />;
  if (error) return <ErrorMsg msg={error} />;

  const filas = data ?? [];

  return (
    <>
      <PageHeader
        title="Acompañamientos"
        subtitle={`${filas.length} ${filas.length === 1 ? "registro" : "registros"} recientes`}
      />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {filas.length === 0 ? (
          <Vacio
            icon={RouteIcon}
            titulo="Todavía no hay acompañamientos"
            detalle="Cuando un deportista pida su primer acompañamiento, aparecerá en esta auditoría."
          />
        ) : (
          <table>
            <caption className="solo-lectores">
              Auditoría de acompañamientos con estado, recorrido y personas involucradas
            </caption>
            <thead>
              <tr>
                <th scope="col">Acompañamiento</th>
                <th scope="col">Estado</th>
                <th scope="col">Recorrido</th>
                <th scope="col">Deportista</th>
                <th scope="col">Voluntario</th>
                <th scope="col">Solicitado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((v) => (
                <tr key={v.viajeId}>
                  <td className="num" style={{ fontWeight: 600 }}>#{v.viajeId}</td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                      <Estado tipo={tonoEstado[v.viajeEstado] ?? "neutro"}>
                        {v.viajeEstado.replace(/_/g, " ")}
                      </Estado>
                      {v.isDeleted && <Estado tipo="neutro">Eliminado</Estado>}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{v.viajeOrigenTexto ?? "Origen sin registrar"}</span>
                      <ArrowRight size={15} aria-hidden="true" style={{ color: "var(--ink-4)", flex: "none" }} />
                      <span className="solo-lectores">hacia</span>
                      <span>{v.viajeDestinoTexto ?? "Destino sin registrar"}</span>
                    </span>
                  </td>
                  <td className="num">#{v.viajeDeportistaId}</td>
                  <td className="num">
                    {v.viajeVoluntarioId ? `#${v.viajeVoluntarioId}` : <span className="tenue">Sin asignar</span>}
                  </td>
                  <td className="sutil" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                    {new Date(v.viajeSolicitadoAt).toLocaleString("es-CL", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
