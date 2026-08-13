/**
 * Login · patrón split-screen.
 *
 * Panel de marca en índigo plano con el logotipo en blanco, tal como la portada
 * del manual: sobre índigo el logotipo va en blanco, nunca en color (un globo
 * desaparecería). Blanco sobre índigo mide 11.4:1 → AAA.
 *
 * La estructura del panel izquierdo no cambia entre Fase 1 (correo y contraseña)
 * y Fase 2 (Google SSO): solo cambia el contenido del panel derecho.
 */
import { Suspense, lazy, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Logo } from "../brand/Logo";

// Three.js va aparte y se carga tarde: no bloquea el formulario.
const FondoConstelacion = lazy(() => import("../brand/FondoConstelacion"));

const claves = [
  "Encuentra al voluntario disponible más cerca de ti",
  "Sigue el viaje en vivo, de principio a fin",
  "Botón de pánico con aviso inmediato",
  "Reconocimiento para quienes acompañan",
];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const u = await login(correo, password);
      nav(u.rol === "admin" ? "/admin" : "/");
    } catch (err) {
      // Tono de voz: el error dice qué pasó y qué hacer, nunca solo «error».
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos iniciar tu sesión. Revisa tu correo y contraseña, y vuelve a intentar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      {/* ---------- Panel de marca ---------- */}
      <section className="login__marca sobre-indigo">
        <Suspense fallback={null}>
          <FondoConstelacion />
        </Suspense>

        <div className="login__marca-contenido">
          {/* El nombre está en el arte del logotipo, así que el alt va vacío. */}
          <Logo alto={64} version="blanco" alt="" className="login__logo" />

          <h1 className="login__titulo">Encuentra tu lugar</h1>
          <p className="login__bajada">
            Dos personas, un mismo lugar. Miparner acompaña a cada deportista
            hasta su entrenamiento.
          </p>

          <ul className="login__claves">
            {claves.map((c) => (
              <li key={c}>
                <span className="login__check" aria-hidden="true">
                  <Check size={15} strokeWidth={3} />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Panel de acceso ---------- */}
      <section className="login__acceso">
        <form onSubmit={onSubmit} className="login__form" noValidate>
          <p className="etiqueta">Panel de administración</p>
          <h2 className="login__bienvenido">Bienvenido</h2>
          <p className="tenue login__intro">Ingresa con tu correo y contraseña.</p>

          {/* El estado de error lleva icono y texto: el color no informa solo. */}
          {error && (
            <p className="login__error" role="alert">
              <AlertCircle size={19} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <div className="login__campo">
            <label className="campo" htmlFor="correo">Correo</label>
            <input
              id="correo"
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu.correo@miparner.cl"
              aria-invalid={error ? true : undefined}
              required
            />
          </div>

          <div className="login__campo">
            <label className="campo" htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              aria-invalid={error ? true : undefined}
              required
            />
          </div>

          <button className="btn btn-primario login__enviar" disabled={enviando}>
            {enviando ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </section>

      <style>{`
        .login{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}

        /* Índigo plano: el manual no admite versiones aclaradas del color. */
        .login__marca{
          position:relative;overflow:hidden;background:var(--indigo);color:#fff;
          display:flex;align-items:center;
          padding:clamp(32px,5vw,72px);
        }
        .login__marca-contenido{position:relative;max-width:30rem}
        .login__logo{
          display:block;height:clamp(44px,5vw,64px);width:auto;
          /* Espacio libre reservado alrededor del logotipo: x por los 4 lados. */
          margin-bottom:calc(28px + var(--logo-x));
        }
        .login__titulo{font-size:clamp(30px,3.6vw,40px);margin-bottom:14px}
        .login__bajada{font-size:17px;line-height:1.6;color:var(--lav-200);margin-bottom:34px}

        .login__claves{list-style:none;padding:0;margin:0;display:grid;gap:15px}
        .login__claves li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.5}
        /* El coral es color de forma. El texto de al lado va en blanco. */
        .login__check{
          flex:none;width:26px;height:26px;border-radius:50%;margin-top:1px;
          background:var(--coral);color:#fff;display:grid;place-items:center;
        }

        /* Flex, no grid: en una pista «auto» el width:100% del formulario se
           resolvería contra su max-width y desbordaría en pantallas angostas. */
        .login__acceso{
          display:flex;align-items:center;justify-content:center;
          background:var(--surface);padding:clamp(24px,5vw,56px);
        }
        .login__form{flex:1 1 auto;min-width:0;max-width:26rem}
        .login__bienvenido{font-size:clamp(26px,3vw,32px);margin:10px 0 8px}
        .login__intro{margin-bottom:28px}
        .login__campo{margin-bottom:18px}
        .login__enviar{width:100%;margin-top:6px}

        .login__error{
          display:flex;gap:10px;align-items:flex-start;
          background:var(--coral-bg);color:var(--ink);
          border-left:3px solid var(--coral);
          border-radius:var(--r-sm);padding:13px 15px;margin-bottom:22px;
          font-size:15px;line-height:1.5;max-width:none;
        }
        .login__error svg{flex:none;margin-top:1px;color:var(--coral)}

        /* Tablet: el panel de marca se comprime. */
        @media (max-width:1023px){.login{grid-template-columns:2fr 3fr}}

        /* Móvil: el panel de marca pasa a cabecera y las claves se ocultan. */
        @media (max-width:767px){
          .login{grid-template-columns:1fr}
          .login__marca{min-height:200px;padding:28px 24px}
          .login__claves{display:none}
          .login__titulo{font-size:26px;margin-bottom:8px}
          .login__bajada{font-size:15px;margin-bottom:0}
          .login__logo{margin-bottom:20px;height:38px}
        }
      `}</style>
    </div>
  );
}
