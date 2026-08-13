import { useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/PageHeader";

interface UsuarioRow {
  usuarioId: number;
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioRol: string;
  usuarioActivo: boolean;
  voluntarioPerfil?: { voluntarioValidado: boolean; voluntarioEnLinea: boolean } | null;
}

export function Usuarios() {
  const { data, loading, error, reload } = useFetch<UsuarioRow[]>("/admin/usuarios");
  const [busy, setBusy] = useState<number | null>(null);

  async function act(fn: () => Promise<unknown>, id: number) {
    setBusy(id);
    try { await fn(); reload(); } finally { setBusy(null); }
  }

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <PageHeader title="Usuarios" subtitle={`${data?.length ?? 0} en total`} />
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Validación</th><th style={{ textAlign: "right" }}>Acciones</th></tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.usuarioId}>
                <td style={{ fontWeight: 600 }}>{u.usuarioNombre}</td>
                <td className="muted">{u.usuarioCorreo}</td>
                <td><span className="badge badge-n" style={{ textTransform: "capitalize" }}>{u.usuarioRol}</span></td>
                <td>
                  {u.usuarioActivo
                    ? <span className="badge badge-s">Activo</span>
                    : <span className="badge badge-d">Inactivo</span>}
                </td>
                <td>
                  {u.usuarioRol !== "voluntario"
                    ? <span className="muted">—</span>
                    : u.voluntarioPerfil?.voluntarioValidado
                      ? <span className="badge badge-b">Validado</span>
                      : <span className="badge badge-g">Pendiente</span>}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {u.usuarioRol === "voluntario" && !u.voluntarioPerfil?.voluntarioValidado && (
                    <button className="btn btn-ghost btn-sm" disabled={busy === u.usuarioId} style={{ marginRight: 8 }}
                      onClick={() => act(() => api(`/admin/voluntarios/${u.usuarioId}/validar`, { method: "PATCH", body: { validado: true } }), u.usuarioId)}>
                      Validar
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" disabled={busy === u.usuarioId}
                    onClick={() => act(() => api(`/admin/usuarios/${u.usuarioId}/activo`, { method: "PATCH", body: { activo: !u.usuarioActivo } }), u.usuarioId)}>
                    {u.usuarioActivo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
