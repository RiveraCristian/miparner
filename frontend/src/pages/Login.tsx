import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Check } from "lucide-react";
import { useAuth } from "../lib/auth";

const features = ["Gestión de usuarios y voluntarios", "Auditoría de viajes en tiempo real", "Monitoreo del botón de pánico", "Métricas de la flota y la comunidad"];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(correo, password);
      nav(u.rol === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }} className="login-grid">
      {/* Panel izquierdo (branding) */}
      <div
        style={{
          background: "linear-gradient(150deg, var(--brand-strong), var(--brand))",
          color: "#fff",
          padding: "clamp(32px, 5vw, 64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -100, bottom: -140, width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "relative", maxWidth: 420 }}>
          <div style={{ background: "#fff", width: 200, height: 68, borderRadius: 16, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", marginBottom: 30, boxShadow: "0 12px 30px -12px rgba(0,0,0,.4)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--brand)", display: "grid", placeItems: "center", color: "#fff" }}>
              <Compass size={22} />
            </div>
            <strong style={{ color: "var(--brand-strong)", fontSize: 20 }}>Rumbo</strong>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 3.4vw, 38px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
            Panel de administración
          </h1>
          <p style={{ opacity: 0.8, fontSize: 16, lineHeight: 1.55, marginBottom: 28 }}>
            Gestión centralizada de la comunidad, los viajes y la seguridad de la plataforma.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {features.map((f) => (
              <li key={f} style={{ display: "flex", gap: 11, alignItems: "center", fontSize: 15 }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(228,146,42,.9)", color: "#3a2405", display: "grid", placeItems: "center", flex: "none" }}>
                  <Check size={15} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Panel derecho (formulario) */}
      <div style={{ display: "grid", placeItems: "center", padding: "clamp(28px, 5vw, 56px)", background: "var(--bg)" }}>
        <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Bienvenido</h2>
          <p className="muted" style={{ marginBottom: 28, fontSize: 15 }}>Ingresa con tu correo y contraseña.</p>

          {error && (
            <div className="badge-d" style={{ display: "block", padding: "11px 13px", borderRadius: 10, marginBottom: 16, fontSize: 13.5 }}>
              {error}
            </div>
          )}

          <label className="label" htmlFor="correo">Correo</label>
          <input id="correo" className="input" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="admin@rumbo.cl" required style={{ marginBottom: 16 }} />

          <label className="label" htmlFor="pass">Contraseña</label>
          <input id="pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ marginBottom: 24 }} />

          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>

      <style>{`@media (max-width: 860px){.login-grid{grid-template-columns:1fr !important}.login-grid > div:first-child{min-height:220px}}`}</style>
    </div>
  );
}
