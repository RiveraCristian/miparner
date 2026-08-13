import { useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/PageHeader";

interface PanicoRow {
  panicoId: number;
  panicoEstado: string;
  panicoViajeId: number | null;
  createdAt: string;
  usuario: { usuarioNombre: string; usuarioTelefono: string | null };
}

const estadoBadge: Record<string, string> = { activa: "badge-d", atendida: "badge-s", falsa: "badge-n" };

export function Panicos() {
  const { data, loading, error, reload } = useFetch<PanicoRow[]>("/admin/panicos");
  const [busy, setBusy] = useState<number | null>(null);

  async function marcar(id: number, estado: string) {
    setBusy(id);
    try { await api(`/admin/panicos/${id}`, { method: "PATCH", body: { estado } }); reload(); } finally { setBusy(null); }
  }

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <PageHeader title="Log de pánico" subtitle={`${data?.length ?? 0} alertas registradas`} />
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>#</th><th>Persona</th><th>Teléfono</th><th>Viaje</th><th>Estado</th><th>Fecha</th><th style={{ textAlign: "right" }}>Acciones</th></tr>
          </thead>
          <tbody>
            {data?.length === 0 && (
              <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 28 }}>Sin alertas registradas.</td></tr>
            )}
            {data?.map((p) => (
              <tr key={p.panicoId}>
                <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{p.panicoId}</td>
                <td style={{ fontWeight: 600 }}>{p.usuario.usuarioNombre}</td>
                <td className="muted">{p.usuario.usuarioTelefono ?? "—"}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.panicoViajeId ? `#${p.panicoViajeId}` : <span className="muted">—</span>}</td>
                <td><span className={`badge ${estadoBadge[p.panicoEstado] ?? "badge-n"}`} style={{ textTransform: "capitalize" }}>{p.panicoEstado}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{new Date(p.createdAt).toLocaleString("es-CL")}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {p.panicoEstado === "activa" && (
                    <>
                      <button className="btn btn-ghost btn-sm" disabled={busy === p.panicoId} style={{ marginRight: 8 }} onClick={() => marcar(p.panicoId, "atendida")}>Atender</button>
                      <button className="btn btn-ghost btn-sm" disabled={busy === p.panicoId} onClick={() => marcar(p.panicoId, "falsa")}>Falsa</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
