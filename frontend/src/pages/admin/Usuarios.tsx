import { useState } from "react";
import { Users } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, Vacio } from "../../components/ui";

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
  const [ocupado, setOcupado] = useState<number | null>(null);

  async function accion(fn: () => Promise<unknown>, id: number) {
    setOcupado(id);
    try {
      await fn();
      reload();
    } finally {
      setOcupado(null);
    }
  }

  if (loading) return <Loader texto="Cargando personas…" />;
  if (error) return <ErrorMsg msg={error} />;

  const filas = data ?? [];

  return (
    <>
      <PageHeader
        title="Personas"
        subtitle={`${filas.length} ${filas.length === 1 ? "persona" : "personas"} en la comunidad`}
      />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {filas.length === 0 ? (
          <Vacio
            icon={Users}
            titulo="Sin personas registradas"
            detalle="Las cuentas se crean desde el equipo de administración."
          />
        ) : (
          <table>
            <caption className="solo-lectores">
              Personas registradas, con su rol, estado de cuenta y validación
            </caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Cuenta</th>
                <th scope="col">Validación</th>
                <th scope="col" style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((u) => {
                const esVoluntario = u.usuarioRol === "voluntario";
                const validado = u.voluntarioPerfil?.voluntarioValidado ?? false;
                return (
                  <tr key={u.usuarioId}>
                    <td style={{ fontWeight: 600 }}>{u.usuarioNombre}</td>
                    <td className="sutil">{u.usuarioCorreo}</td>
                    <td style={{ textTransform: "capitalize" }}>{u.usuarioRol}</td>
                    <td>
                      <Estado tipo={u.usuarioActivo ? "exito" : "neutro"}>
                        {u.usuarioActivo ? "Activa" : "Desactivada"}
                      </Estado>
                    </td>
                    <td>
                      {!esVoluntario ? (
                        <span className="tenue">No aplica</span>
                      ) : validado ? (
                        <Estado tipo="indigo">Validado</Estado>
                      ) : (
                        <Estado tipo="atencion">Pendiente</Estado>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {esVoluntario && !validado && (
                        <button
                          className="btn btn-secundario btn-sm"
                          disabled={ocupado === u.usuarioId}
                          style={{ marginRight: 8 }}
                          onClick={() =>
                            accion(
                              () =>
                                api(`/admin/voluntarios/${u.usuarioId}/validar`, {
                                  method: "PATCH",
                                  body: { validado: true },
                                }),
                              u.usuarioId,
                            )
                          }
                        >
                          Validar
                        </button>
                      )}
                      <button
                        className={`btn btn-sm ${u.usuarioActivo ? "btn-critico" : "btn-fantasma"}`}
                        disabled={ocupado === u.usuarioId}
                        onClick={() =>
                          accion(
                            () =>
                              api(`/admin/usuarios/${u.usuarioId}/activo`, {
                                method: "PATCH",
                                body: { activo: !u.usuarioActivo },
                              }),
                            u.usuarioId,
                          )
                        }
                      >
                        {u.usuarioActivo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="tenue" style={{ marginTop: 14 }}>
        Las cuentas no se eliminan: se desactivan y quedan en el historial.
      </p>
    </>
  );
}
