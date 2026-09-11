/**
 * Página 404. Una ruta desconocida no debe expulsar en silencio: se explica qué
 * pasó y se ofrece la vuelta. Marca en azul/blanco, coherente con el resto.
 */
import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { useAuth } from "../lib/auth";

export function NoEncontrado() {
  const { user } = useAuth();

  return (
    <div className="nf">
      <Link to="/" className="logo-enlace" aria-label="Miparner, ir al inicio">
        <Logo alto={40} />
      </Link>

      <p className="eyebrow nf__eyebrow">Error 404</p>
      <h1 className="nf__titulo">Esta página no existe</h1>
      <p className="nf__texto">
        La dirección que abriste no está o cambió de lugar. Volvamos a un lugar conocido.
      </p>

      <div className="nf__acciones">
        <Link to="/" className="btn btn-primario">Volver al inicio</Link>
        {user?.rol === "admin" && (
          <Link to="/admin" className="btn btn-secundario">Ir al panel</Link>
        )}
      </div>

      <style>{`
        .nf{
          min-height:100vh;display:flex;flex-direction:column;align-items:center;
          justify-content:center;text-align:center;gap:14px;
          padding:clamp(24px,6vw,64px);background:var(--surface);
        }
        .nf .logo-enlace{margin-bottom:18px}
        .nf__eyebrow{justify-content:center}
        .nf__titulo{font-size:clamp(28px,5vw,44px);font-weight:700;letter-spacing:-.03em}
        .nf__texto{max-width:44ch;color:var(--ink-2);font-size:17px}
        .nf__acciones{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:12px}
      `}</style>
    </div>
  );
}
