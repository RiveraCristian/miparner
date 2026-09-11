/**
 * Mi cuenta · el administrador edita sus propios datos y su contraseña.
 * Dos tarjetas independientes: cada una guarda por su lado y avisa el resultado.
 */
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";

interface Perfil {
  nombre: string;
  correo: string;
  telefono?: string | null;
  rol: string;
}

/** Aviso en línea (éxito o error), siempre con icono además del color. */
function Aviso({ tipo, msg }: { tipo: "exito" | "error"; msg: string }) {
  const exito = tipo === "exito";
  const Icon = exito ? CheckCircle2 : AlertCircle;
  return (
    <p
      role={exito ? "status" : "alert"}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        margin: 0,
        padding: "12px 14px",
        borderRadius: "var(--r-sm)",
        fontSize: 15,
        maxWidth: "none",
        background: exito ? "var(--exito-bg)" : "var(--coral-bg)",
        borderLeft: `3px solid ${exito ? "var(--exito)" : "var(--coral)"}`,
        color: "var(--ink)",
      }}
    >
      <Icon size={18} aria-hidden="true" style={{ flex: "none", marginTop: 1, color: exito ? "var(--exito)" : "var(--coral)" }} />
      <span>{msg}</span>
    </p>
  );
}

export function MiCuenta() {
  const { data, loading, error } = useFetch<Perfil>("/auth/me");
  if (loading) return <Loader texto="Cargando tu cuenta…" />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Mi cuenta" subtitle="Edita tus datos y tu contraseña." />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(19rem,1fr))",
          gap: 20,
          alignItems: "start",
          maxWidth: "58rem",
        }}
      >
        <DatosCuenta perfil={data} />
        <CambiarPassword />
      </div>
    </>
  );
}

function DatosCuenta({ perfil }: { perfil: Perfil }) {
  const { refrescar } = useAuth();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");
  const [aviso, setAviso] = useState<{ tipo: "exito" | "error"; msg: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    setGuardando(true);
    try {
      // El correo es el identificador de la cuenta: no se cambia desde aquí.
      await api("/auth/me", {
        method: "PATCH",
        body: { nombre, telefono: telefono.trim() || null },
      });
      await refrescar();
      setAviso({ tipo: "exito", msg: "Datos actualizados." });
    } catch (err) {
      setAviso({
        tipo: "error",
        msg: err instanceof Error && err.message ? err.message : "No pudimos guardar los cambios.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 18 }}>Datos de la cuenta</h2>
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}

      <div>
        <label className="campo" htmlFor="mc-nombre">Nombre</label>
        <input id="mc-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div>
        <label className="campo" htmlFor="mc-correo">Correo</label>
        <input
          id="mc-correo"
          className="input"
          type="email"
          value={perfil.correo}
          readOnly
          aria-describedby="mc-correo-ayuda"
          style={{ background: "var(--surface-2)", color: "var(--ink-2)", cursor: "not-allowed" }}
        />
        <p id="mc-correo-ayuda" className="ayuda">El correo es tu identificador de acceso y no se puede cambiar.</p>
      </div>
      <div>
        <label className="campo" htmlFor="mc-telefono">Teléfono</label>
        <input id="mc-telefono" className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primario" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "exito" | "error"; msg: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAviso(null);

    if (nueva.length < 8) {
      setAviso({ tipo: "error", msg: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (nueva !== confirmar) {
      setAviso({ tipo: "error", msg: "La confirmación no coincide con la nueva contraseña." });
      return;
    }

    setGuardando(true);
    try {
      await api("/auth/password", { method: "PATCH", body: { actual, nueva } });
      setActual("");
      setNueva("");
      setConfirmar("");
      setAviso({ tipo: "exito", msg: "Contraseña actualizada." });
    } catch (err) {
      setAviso({
        tipo: "error",
        msg: err instanceof Error && err.message ? err.message : "No pudimos cambiar la contraseña.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 18 }}>Cambiar contraseña</h2>
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}

      <div>
        <label className="campo" htmlFor="mc-actual">Contraseña actual</label>
        <input id="mc-actual" className="input" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
      </div>
      <div>
        <label className="campo" htmlFor="mc-nueva">Nueva contraseña</label>
        <input id="mc-nueva" className="input" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} required />
        <p className="ayuda">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label className="campo" htmlFor="mc-confirmar">Confirmar nueva contraseña</label>
        <input id="mc-confirmar" className="input" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primario" disabled={guardando}>
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
