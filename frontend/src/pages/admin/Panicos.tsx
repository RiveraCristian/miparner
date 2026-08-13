import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, Vacio, type ClaseEstado } from "../../components/ui";

interface PanicoRow {
  panicoId: number;
  panicoEstado: string;
  panicoViajeId: number | null;
  createdAt: string;
  usuario: { usuarioNombre: string; usuarioTelefono: string | null };
}

const tonoEstado: Record<string, ClaseEstado> = {
  activa: "critico",
  atendida: "exito",
  falsa: "neutro",
};

export function Panicos() {
  const { data, loading, error, reload } = useFetch<PanicoRow[]>("/admin/panicos");
  const [ocupado, setOcupado] = useState<number | null>(null);

  async function marcar(id: number, estado: string) {
    setOcupado(id);
    try {
      await api(`/admin/panicos/${id}`, { method: "PATCH", body: { estado } });
      reload();
    } finally {
      setOcupado(null);
    }
  }

  if (loading) return <Loader texto="Cargando alertas…" />;
  if (error) return <ErrorMsg msg={error} />;

  const filas = data ?? [];
  const activas = filas.filter((p) => p.panicoEstado === "activa").length;

  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle={
          activas > 0
            ? `${activas} sin atender de ${filas.length} registradas`
            : `${filas.length} ${filas.length === 1 ? "alerta registrada" : "alertas registradas"}`
        }
      />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {filas.length === 0 ? (
          <Vacio
            icon={ShieldCheck}
            titulo="Sin alertas registradas"
            detalle="Aquí quedará el registro de cada botón de pánico, con su hora y quién lo activó."
          />
        ) : (
          <table>
            <caption className="solo-lectores">
              Registro de alertas de pánico, con la persona que la activó y su estado
            </caption>
            <thead>
              <tr>
                <th scope="col">Alerta</th>
                <th scope="col">Persona</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Viaje</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha</th>
                <th scope="col" style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.panicoId}>
                  <td className="num" style={{ fontWeight: 600 }}>#{p.panicoId}</td>
                  <td style={{ fontWeight: 600 }}>{p.usuario.usuarioNombre}</td>
                  <td className="sutil">
                    {p.usuario.usuarioTelefono ? (
                      <a href={`tel:${p.usuario.usuarioTelefono}`}>{p.usuario.usuarioTelefono}</a>
                    ) : (
                      <span className="tenue">Sin teléfono</span>
                    )}
                  </td>
                  <td className="num">
                    {p.panicoViajeId ? `#${p.panicoViajeId}` : <span className="tenue">Fuera de viaje</span>}
                  </td>
                  <td>
                    <Estado tipo={tonoEstado[p.panicoEstado] ?? "neutro"}>{p.panicoEstado}</Estado>
                  </td>
                  <td className="sutil" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                    {new Date(p.createdAt).toLocaleString("es-CL", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.panicoEstado === "activa" ? (
                      <>
                        <button
                          className="btn btn-primario btn-sm"
                          disabled={ocupado === p.panicoId}
                          style={{ marginRight: 8 }}
                          onClick={() => marcar(p.panicoId, "atendida")}
                        >
                          Atender
                        </button>
                        <button
                          className="btn btn-fantasma btn-sm"
                          disabled={ocupado === p.panicoId}
                          onClick={() => marcar(p.panicoId, "falsa")}
                        >
                          Marcar falsa
                        </button>
                      </>
                    ) : (
                      <span className="tenue">Cerrada</span>
                    )}
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
