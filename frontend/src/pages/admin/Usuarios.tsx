import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useToast } from "../../lib/toast";
import { ErrorMsg, PageHeader } from "../../components/layout/PageHeader";
import { Estado, SkeletonTabla, Vacio, type ClaseEstado } from "../../components/ui";

interface UsuarioRow {
  usuarioId: number;
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioTelefono?: string | null;
  usuarioRol: string;
  usuarioActivo: boolean;
  usuarioEstadoValidacion: string;
  voluntarioPerfil?: { voluntarioValidado: boolean } | null;
  _count?: { documentos: number };
}

/** Cada estado de validación lleva su propio icono a través de <Estado>. */
const tonoValidacion: Record<string, ClaseEstado> = {
  pendiente: "atencion",
  aprobado: "exito",
  rechazado: "critico",
};

export function Usuarios() {
  const { data, loading, error, reload } = useFetch<UsuarioRow[]>("/admin/usuarios");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [editar, setEditar] = useState<UsuarioRow | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const toast = useToast();

  async function accion(fn: () => Promise<unknown>, id: number, exito: string) {
    setOcupado(id);
    try {
      await fn();
      reload();
      toast.exito(exito);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setOcupado(null);
    }
  }

  if (loading) return <SkeletonTabla />;
  if (error) return <ErrorMsg msg={error} />;

  const filas = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Comunidad"
        title="Personas"
        subtitle={`${filas.length} ${filas.length === 1 ? "persona" : "personas"} en la comunidad`}
        action={
          <button className="btn btn-primario btn-sm" onClick={() => setNuevo(true)}>
            <UserPlus size={16} aria-hidden="true" /> Nueva persona
          </button>
        }
      />


      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {filas.length === 0 ? (
          <Vacio
            icon={Users}
            titulo="Sin personas registradas"
            detalle="Las cuentas se crean desde el equipo de administración."
          />
        ) : (
          <table className="tabla-apilada">
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
                <th scope="col">Documentos</th>
                <th scope="col" style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((u) => {
                const esAdmin = u.usuarioRol === "admin";
                const estado = u.usuarioEstadoValidacion;
                const pendiente = !esAdmin && estado !== "aprobado";
                return (
                  <tr key={u.usuarioId}>
                    <td data-label="Nombre" style={{ fontWeight: 600 }}>{u.usuarioNombre}</td>
                    <td data-label="Correo" className="sutil">{u.usuarioCorreo}</td>
                    <td data-label="Rol" style={{ textTransform: "capitalize" }}>{u.usuarioRol}</td>
                    <td data-label="Cuenta">
                      <Estado tipo={u.usuarioActivo ? "exito" : "neutro"}>
                        {u.usuarioActivo ? "Activa" : "Desactivada"}
                      </Estado>
                    </td>
                    <td data-label="Validación">
                      {esAdmin ? (
                        <span className="tenue">No aplica</span>
                      ) : (
                        <Estado tipo={tonoValidacion[estado] ?? "neutro"}>{estado}</Estado>
                      )}
                    </td>
                    <td data-label="Documentos" className="num">
                      {esAdmin ? (
                        <span className="tenue">—</span>
                      ) : (
                        `${u._count?.documentos ?? 0}`
                      )}
                    </td>
                    <td data-label="Acciones" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {pendiente && (
                        <Link
                          to="/admin/validaciones"
                          className="btn btn-secundario btn-sm"
                          style={{ marginRight: 8 }}
                        >
                          Revisar documentos
                        </Link>
                      )}
                      <button
                        className="btn btn-fantasma btn-sm"
                        style={{ marginRight: 8 }}
                        onClick={() => setEditar(u)}
                      >
                        <Pencil size={15} aria-hidden="true" /> Editar
                      </button>
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
                            u.usuarioActivo
                              ? `Se desactivó la cuenta de ${u.usuarioNombre}.`
                              : `Se activó la cuenta de ${u.usuarioNombre}.`,
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
        Desde <strong>Editar</strong> puedes eliminar la cuenta de forma permanente. Las
        cuentas con historial de acompañamientos o alertas no se pueden eliminar: se
        desactivan para conservar los registros. La aprobación se hace en Validaciones.
      </p>

      {nuevo && (
        <ModalNuevoUsuario
          onCerrar={() => setNuevo(false)}
          onCreado={(nombre) => {
            toast.exito(`Se creó la cuenta de ${nombre}.`);
            setNuevo(false);
            reload();
          }}
        />
      )}

      {editar && (
        <ModalEditarUsuario
          usuario={editar}
          onCerrar={() => setEditar(null)}
          onGuardado={() => {
            toast.exito(`Se guardaron los cambios de ${editar.usuarioNombre}.`);
            setEditar(null);
            reload();
          }}
          onEliminado={() => {
            toast.exito(`Se eliminó la cuenta de ${editar.usuarioNombre}.`);
            setEditar(null);
            reload();
          }}
        />
      )}
    </>
  );
}

/** Modal de alta de una cuenta: nombre, correo, teléfono, rol y contraseña. */
function ModalNuevoUsuario({
  onCerrar,
  onCreado,
}: {
  onCerrar: () => void;
  onCreado: (nombre: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("deportista");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setGuardando(true);
    try {
      await api("/admin/usuarios", {
        method: "POST",
        body: { nombre, correo, telefono: telefono.trim() || undefined, rol, password },
      });
      onCreado(nombre);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="modal-fondo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nuevo-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal-tarjeta">
        <div className="modal-cabecera">
          <h2 id="modal-nuevo-titulo" style={{ fontSize: 20 }}>Nueva persona</h2>
          <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="modal-cuerpo" noValidate>
          {error && (
            <p className="modal-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <div>
            <label className="campo" htmlFor="nv-nombre">Nombre</label>
            <input id="nv-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          <div>
            <label className="campo" htmlFor="nv-correo">Correo</label>
            <input id="nv-correo" className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </div>

          <div>
            <label className="campo" htmlFor="nv-telefono">Teléfono</label>
            <input id="nv-telefono" className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>

          <div>
            <label className="campo" htmlFor="nv-rol">Rol</label>
            <select id="nv-rol" className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="deportista">Deportista</option>
              <option value="voluntario">Voluntario</option>
              <option value="admin">Administración</option>
            </select>
          </div>

          <div>
            <label className="campo" htmlFor="nv-password">Contraseña</label>
            <input
              id="nv-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="ayuda">Mínimo 8 caracteres. La persona podrá cambiarla luego.</p>
          </div>

          <div className="modal-acciones">
            <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </div>

      <ModalEstilos />
    </div>
  );
}

/** Modal de edición de una cuenta: nombre, correo, teléfono, rol y zona de peligro
 *  para eliminarla de forma permanente. */
function ModalEditarUsuario({
  usuario,
  onCerrar,
  onGuardado,
  onEliminado,
}: {
  usuario: UsuarioRow;
  onCerrar: () => void;
  onGuardado: () => void;
  onEliminado: () => void;
}) {
  const [nombre, setNombre] = useState(usuario.usuarioNombre);
  const [correo, setCorreo] = useState(usuario.usuarioCorreo);
  const [telefono, setTelefono] = useState(usuario.usuarioTelefono ?? "");
  const [rol, setRol] = useState(usuario.usuarioRol);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Zona de peligro (eliminar): confirmación en dos pasos dentro del mismo modal.
  const [confirmar, setConfirmar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await api(`/admin/usuarios/${usuario.usuarioId}`, {
        method: "PATCH",
        body: { nombre, correo, telefono: telefono.trim() || null, rol },
      });
      onGuardado();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos guardar los cambios. Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCuenta() {
    setErrorEliminar("");
    setEliminando(true);
    try {
      await api(`/admin/usuarios/${usuario.usuarioId}`, { method: "DELETE" });
      onEliminado();
    } catch (err) {
      setErrorEliminar(
        err instanceof Error && err.message ? err.message : "No se pudo eliminar la cuenta.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div
      className="modal-fondo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal-tarjeta">
        <div className="modal-cabecera">
          <h2 id="modal-titulo" style={{ fontSize: 20 }}>Editar cuenta</h2>
          <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="modal-cuerpo" noValidate>
          {error && (
            <p className="modal-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <div>
            <label className="campo" htmlFor="ed-nombre">Nombre</label>
            <input id="ed-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          <div>
            <label className="campo" htmlFor="ed-correo">Correo</label>
            <input id="ed-correo" className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </div>

          <div>
            <label className="campo" htmlFor="ed-telefono">Teléfono</label>
            <input id="ed-telefono" className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>

          <div>
            <label className="campo" htmlFor="ed-rol">Rol</label>
            <select id="ed-rol" className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="deportista">Deportista</option>
              <option value="voluntario">Voluntario</option>
              <option value="admin">Administración</option>
            </select>
            <p className="ayuda">Cambiar el rol crea el perfil correspondiente si aún no existe.</p>
          </div>

          <div className="modal-acciones">
            <button type="button" className="btn btn-fantasma" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>

          {/* Zona de peligro: eliminar la cuenta de forma permanente */}
          <div className="zona-peligro">
            {!confirmar ? (
              <button
                type="button"
                className="btn btn-critico btn-sm"
                onClick={() => {
                  setErrorEliminar("");
                  setConfirmar(true);
                }}
              >
                <Trash2 size={15} aria-hidden="true" /> Eliminar cuenta
              </button>
            ) : (
              <div className="confirmar-elim" role="alertdialog" aria-labelledby="elim-alerta">
                {errorEliminar && (
                  <p className="modal-error" role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{errorEliminar}</span>
                  </p>
                )}
                <p id="elim-alerta" className="confirmar-elim__alerta">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <strong>Cuidado: acción permanente</strong>
                </p>
                <p style={{ margin: 0 }}>
                  ¿Eliminar de forma permanente a <strong>{usuario.usuarioNombre}</strong>? No se
                  puede deshacer. Se borrarán sus datos, documentos y mensajes.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setConfirmar(false)}>
                    No, volver
                  </button>
                  <button type="button" className="btn btn-critico btn-sm" onClick={eliminarCuenta} disabled={eliminando}>
                    {eliminando ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      <ModalEstilos />
    </div>
  );
}

/** Estilos compartidos por los modales de esta página. */
function ModalEstilos() {
  return (
    <style>{`
        /* Flex + margin:auto centra el modal cuando cabe y, cuando es más alto
           que la pantalla, el overlay hace scroll sin cortar la parte de arriba. */
        .modal-fondo{
          position:fixed;inset:0;z-index:100;display:flex;overflow-y:auto;
          background:rgba(26,23,32,.5);padding:20px;
        }
        .modal-tarjeta{
          margin:auto;width:100%;max-width:30rem;background:var(--surface);
          border-radius:var(--r-lg);box-shadow:var(--sombra);overflow:hidden;
        }
        .modal-cabecera{
          display:flex;align-items:center;justify-content:space-between;
          padding:18px 22px;border-bottom:1px solid var(--line);
        }
        .modal-cerrar{
          display:grid;place-items:center;width:36px;height:36px;border:0;
          border-radius:var(--r-sm);background:transparent;color:var(--ink-3);cursor:pointer;
        }
        .modal-cerrar:hover{background:var(--surface-2);color:var(--ink)}
        .modal-cuerpo{display:grid;gap:16px;padding:22px}
        .modal-acciones{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
        .zona-peligro{border-top:1px solid var(--line);padding-top:16px;margin-top:4px}
        .confirmar-elim{
          display:grid;gap:12px;background:var(--coral-bg);
          border-radius:var(--r-sm);padding:14px 16px;
        }
        .confirmar-elim__alerta{
          display:flex;align-items:center;gap:8px;margin:0;
          font-size:15px;color:var(--ink);
        }
        .confirmar-elim__alerta svg{flex:none;color:var(--coral)}
        .modal-error{
          display:flex;gap:10px;align-items:flex-start;margin:0;
          background:var(--coral-bg);color:var(--ink);border-left:3px solid var(--coral);
          border-radius:var(--r-sm);padding:12px 14px;font-size:15px;max-width:none;
        }
        .modal-error svg{flex:none;margin-top:1px;color:var(--coral)}
      `}</style>
  );
}
