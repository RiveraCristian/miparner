/**
 * Barra lateral de navegación.
 *
 * Fondo índigo plano (el manual no admite versiones aclaradas del color).
 * Sobre índigo el logotipo va en blanco: en color, un globo desaparecería.
 * Contrastes: blanco/índigo 11.4:1 AAA · lavanda-200/índigo 8.1:1 AAA ·
 * índigo sobre lavanda (item activo) 9.6:1 AAA.
 */
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Isotipo, Logo } from "../../brand/Logo";

export interface ItemNav {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
}

interface Props {
  items: ItemNav[];
  submodulo: string;
  colapsada: boolean;
  onColapsar: () => void;
  usuario?: { nombre?: string; rol?: string };
  onSalir: () => void;
}

export function Sidebar({ items, submodulo, colapsada, onColapsar, usuario, onSalir }: Props) {
  const iniciales = (usuario?.nombre ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <aside className={`lateral sobre-indigo${colapsada ? " lateral--min" : ""}`}>
      {/* Cabecera: logotipo + submódulo */}
      <div className="lateral__cabecera">
        <NavLink to="/" className="lateral__logo logo-enlace" aria-label="Miparner, ir al inicio">
          {colapsada ? (
            <Isotipo alto={30} version="blanco" />
          ) : (
            <Logo alto={30} version="blanco" sinRegistro />
          )}
        </NavLink>
        {!colapsada && <p className="lateral__submodulo">{submodulo}</p>}
      </div>

      {/* Navegación */}
      <nav className="lateral__nav" aria-label="Secciones de administración">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => `lateral__item${isActive ? " lateral__item--activo" : ""}`}
            title={colapsada ? it.label : undefined}
          >
            <it.icon size={24} aria-hidden="true" />
            {colapsada ? <span className="solo-lectores">{it.label}</span> : <span>{it.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Pie: usuario y salida */}
      <div className="lateral__pie">
        <span className="lateral__avatar" aria-hidden="true">{iniciales || "—"}</span>
        {!colapsada && (
          <span className="lateral__usuario">
            <span className="lateral__nombre">{usuario?.nombre ?? "Sesión activa"}</span>
            <span className="lateral__rol">{usuario?.rol ?? ""}</span>
          </span>
        )}
        <button type="button" onClick={onSalir} className="lateral__salir" aria-label="Cerrar sesión">
          <LogOut size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Colapsar / expandir */}
      <button
        type="button"
        onClick={onColapsar}
        className="lateral__pliegue"
        aria-label={colapsada ? "Expandir el menú" : "Colapsar el menú"}
        aria-expanded={!colapsada}
      >
        {colapsada ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
      </button>

      <style>{`
        .lateral{
          position:relative;background:var(--indigo);color:#fff;
          display:flex;flex-direction:column;gap:8px;
          padding:22px 14px 18px;
        }
        .lateral__cabecera{padding:0 8px 20px}
        .lateral__logo{padding:2px 0}
        .lateral__submodulo{
          font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;
          color:var(--lav-300);margin-top:12px;
        }

        .lateral__nav{display:grid;gap:4px;flex:1;align-content:start}
        .lateral__item{
          display:flex;align-items:center;gap:12px;
          min-height:44px;padding:10px 12px;border-radius:var(--r);
          font-size:15px;font-weight:500;color:var(--lav-200);
        }
        .lateral__item:hover{background:rgba(255,255,255,.12);color:#fff;text-decoration:none}
        /* Activo: no solo color — fondo lavanda sólido y peso mayor. */
        .lateral__item--activo,
        .lateral__item--activo:hover{
          background:var(--lavanda);color:var(--indigo);font-weight:600;
        }
        .lateral--min .lateral__item{justify-content:center;padding:10px}

        .lateral__pie{
          display:flex;align-items:center;gap:10px;
          border-top:1px solid rgba(255,255,255,.22);padding-top:14px;
        }
        .lateral__avatar{
          flex:none;width:38px;height:38px;border-radius:50%;
          background:var(--lavanda);color:var(--indigo);
          display:grid;place-items:center;font-size:14px;font-weight:600;
        }
        .lateral__usuario{flex:1;min-width:0;display:grid}
        .lateral__nombre{
          font-size:14px;font-weight:600;color:#fff;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .lateral__rol{font-size:12px;color:var(--lav-300);text-transform:capitalize}
        .lateral__salir{
          flex:none;display:grid;place-items:center;
          width:44px;height:44px;border:0;border-radius:var(--r-sm);
          background:transparent;color:var(--lav-200);cursor:pointer;
        }
        .lateral__salir:hover{background:rgba(255,255,255,.14);color:#fff}
        .lateral--min .lateral__pie{flex-direction:column}

        .lateral__pliegue{
          position:absolute;top:26px;right:-13px;z-index:2;
          width:26px;height:26px;border-radius:50%;
          background:var(--surface);color:var(--indigo);
          border:1px solid var(--line);cursor:pointer;
          display:grid;place-items:center;box-shadow:var(--sombra-sm);
        }
        .lateral__pliegue:hover{background:var(--lavanda)}

        @media (max-width:767px){
          .lateral{flex-direction:row;align-items:center;gap:14px;padding:12px 16px;flex-wrap:wrap}
          .lateral__cabecera{padding:0}
          .lateral__submodulo{display:none}
          .lateral__nav{display:flex;overflow-x:auto;flex:1 1 100%;order:3}
          .lateral__item{white-space:nowrap}
          .lateral__pie{border:0;padding:0;margin-left:auto}
          .lateral__usuario{display:none}
          .lateral__pliegue{display:none}
        }
      `}</style>
    </aside>
  );
}
