import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/PageHeader";

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

const estadoBadge: Record<string, string> = {
  solicitado: "badge-g",
  asignado: "badge-b",
  en_camino: "badge-b",
  a_bordo: "badge-b",
  finalizado: "badge-s",
  cancelado: "badge-d",
};

export function Viajes() {
  const { data, loading, error } = useFetch<ViajeRow[]>("/admin/viajes");
  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <PageHeader title="Auditoría de viajes" subtitle={`${data?.length ?? 0} registros recientes`} />
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>#</th><th>Estado</th><th>Origen → destino</th><th>Deportista</th><th>Voluntario</th><th>Solicitado</th></tr>
          </thead>
          <tbody>
            {data?.map((v) => (
              <tr key={v.viajeId} style={{ opacity: v.isDeleted ? 0.55 : 1 }}>
                <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{v.viajeId}</td>
                <td>
                  <span className={`badge ${estadoBadge[v.viajeEstado] ?? "badge-n"}`} style={{ textTransform: "capitalize" }}>
                    {v.viajeEstado.replace("_", " ")}
                  </span>
                  {v.isDeleted && <span className="badge badge-n" style={{ marginLeft: 6 }}>eliminado</span>}
                </td>
                <td style={{ fontSize: 13.5 }}>
                  {(v.viajeOrigenTexto ?? "—")} <span className="muted">→</span> {(v.viajeDestinoTexto ?? "—")}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>#{v.viajeDeportistaId}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{v.viajeVoluntarioId ? `#${v.viajeVoluntarioId}` : <span className="muted">—</span>}</td>
                <td className="muted" style={{ fontSize: 13 }}>{new Date(v.viajeSolicitadoAt).toLocaleString("es-CL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
