/**
 * Página pública.
 *
 * Marca aplicada según el manual: índigo plano en las portadas, coral solo como
 * forma (círculos de icono, subrayados de cifra), lavanda para bloques
 * destacados, tinta para el cuerpo de texto. Sin degradados de marca.
 *
 * Tipografía: texto alineado a la izquierda, nunca justificado ni centrado en
 * bloques de párrafo; medida máxima de 80 caracteres por línea.
 */
import { Link } from "react-router-dom";
import {
  Accessibility,
  Award,
  Check,
  MapPin,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Logo } from "../brand/Logo";

const capacidades = [
  {
    icon: Radio,
    t: "El voluntario más cercano",
    d: "Miparner busca por geolocalización a quien está disponible y más cerca de ti. Sin llamadas ni esperas largas.",
  },
  {
    icon: MapPin,
    t: "El acompañamiento, en vivo",
    d: "Sigues el recorrido en el mapa de principio a fin, con los tiempos de llegada a la vista de tu familia.",
  },
  {
    icon: ShieldAlert,
    t: "Botón de pánico",
    d: "Un toque avisa al equipo con tu ubicación exacta. La alerta queda registrada y alguien responde.",
  },
  {
    icon: Accessibility,
    t: "Accesible de verdad",
    d: "Funciona con VoiceOver y TalkBack, con alto contraste y texto que puedes ampliar al 200 % sin perder nada.",
  },
  {
    icon: Users,
    t: "Voluntarios validados",
    d: "Cada persona que acompaña pasa por una validación del equipo antes de tomar su primer acompañamiento.",
  },
  {
    icon: Award,
    t: "Se reconoce quien ayuda",
    d: "Puntos, niveles e insignias para los voluntarios. Acompañar suma, y se nota.",
  },
];

const ventajasVoluntario = [
  "Eliges cuándo estás disponible con un solo interruptor",
  "Recibes solo las solicitudes cercanas a tu ubicación",
  "Navegación con los hitos del acompañamiento, paso a paso",
  "Reconocimiento y premios por tu aporte",
];

export function Landing() {
  return (
    <div className="publica">
      <a href="#contenido" className="salto-contenido">Saltar al contenido</a>

      {/* ---------------------------------------------------------- Cabecera */}
      <header className="publica__cabecera">
        <Link to="/" className="logo-enlace" aria-label="Miparner, ir al inicio">
          <Logo alto={34} />
        </Link>
        <Link to="/login" className="btn btn-secundario btn-sm">
          Acceso del equipo
        </Link>
      </header>

      <main id="contenido">
        {/* ------------------------------------------------------------ Hero */}
        {/* Índigo plano, logotipo y texto en blanco: 11.4:1 AAA. */}
        <section className="hero sobre-indigo">
          <div className="hero__texto">
            <p className="hero__etiqueta">Disponible en tu comuna</p>
            <h1 className="hero__titulo">Encuentra tu lugar</h1>
            <p className="hero__bajada">
              Dos personas, un mismo lugar. Miparner conecta a cada deportista con
              un voluntario que lo acompaña hasta su entrenamiento, con el recorrido a
              la vista y ayuda a un toque de distancia.
            </p>
            <div className="hero__acciones">
              <a href="#voluntarios" className="btn btn-blanco">Quiero acompañar</a>
              <a href="#descarga" className="btn btn-contorno-blanco">Descargar la app</a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- Capacidades */}
        <section className="bloque">
          <h2>Pensado para que llegar no sea el problema</h2>
          <p className="bloque__intro">
            Dos aplicaciones —una para el deportista y otra para el voluntario—
            coordinadas en tiempo real, con la seguridad y la accesibilidad en el
            centro.
          </p>

          <ul className="rejilla-tarjetas">
            {capacidades.map((c) => (
              <li key={c.t} className="card tarjeta">
                {/* El círculo coral es forma; el texto de al lado va en tinta. */}
                <span className="tarjeta__icono" aria-hidden="true">
                  <c.icon size={24} />
                </span>
                <h3 className="tarjeta__titulo">{c.t}</h3>
                <p className="sutil">{c.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ Voluntarios */}
        <section id="voluntarios" className="bloque">
          <div className="card card-lavanda voluntarios">
            <div>
              <h2>Regala tiempo y kilómetros</h2>
              <p className="voluntarios__texto">
                Acompaña a deportistas a sus entrenamientos y competencias. Tú
                decides cuándo, la app hace el resto y la comunidad lo reconoce.
              </p>
              <ul className="lista-check">
                {ventajasVoluntario.map((v) => (
                  <li key={v}>
                    <span className="lista-check__marca" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {v}
                  </li>
                ))}
              </ul>
              <a href="#descarga" className="btn btn-primario">Quiero ser voluntario</a>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- Descarga */}
        <section id="descarga" className="bloque">
          <h2>Descarga Miparner</h2>
          <p className="bloque__intro">Muy pronto en App Store y Google Play.</p>
          <div className="descarga__botones">
            <span className="btn btn-fantasma" aria-disabled="true">App Store</span>
            <span className="btn btn-fantasma" aria-disabled="true">Google Play</span>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------- Pie */}
      <footer className="publica__pie">
        {/* El nombre no está en texto al lado, así que el logo lo describe. */}
        <Logo alto={26} version="negro" alt="Miparner" />
        <p className="tenue">Movilidad acompañada para el deporte · Chile</p>
      </footer>

      <style>{`
        .publica{max-width:72rem;margin:0 auto;padding:0 clamp(18px,4vw,32px)}

        .publica__cabecera{
          display:flex;align-items:center;justify-content:space-between;
          gap:16px;padding:20px 0;
        }

        /* Índigo plano. El manual no admite el color aclarado ni en degradado. */
        .hero{
          background:var(--indigo);color:#fff;border-radius:24px;
          padding:clamp(36px,6vw,72px) clamp(24px,5vw,60px);
        }
        .hero__texto{max-width:38rem}
        .hero__etiqueta{
          font-size:12px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;
          color:var(--lav-300);margin-bottom:18px;
        }
        .hero__titulo{font-size:clamp(34px,6vw,56px);margin-bottom:18px}
        .hero__bajada{font-size:clamp(16px,1.6vw,19px);line-height:1.6;color:var(--lav-200)}
        .hero__acciones{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}

        .bloque{padding:clamp(48px,7vw,88px) 0 0}
        .bloque__intro{margin-top:14px;font-size:17px;color:var(--ink-2)}

        .rejilla-tarjetas{
          list-style:none;padding:0;margin:36px 0 0;
          display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:18px;
        }
        .tarjeta{display:grid;gap:10px;align-content:start}
        .tarjeta__icono{
          width:46px;height:46px;border-radius:var(--r);margin-bottom:4px;
          background:var(--coral);color:#fff;display:grid;place-items:center;
        }
        .tarjeta__titulo{font-size:18px}

        .voluntarios{padding:clamp(28px,4vw,48px)}
        .voluntarios__texto{margin:14px 0 22px;font-size:17px;color:var(--ink-2)}
        .lista-check{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:12px}
        .lista-check li{display:flex;gap:11px;align-items:flex-start;font-size:16px;line-height:1.5}
        .lista-check__marca{
          flex:none;width:24px;height:24px;border-radius:50%;margin-top:1px;
          background:var(--indigo);color:#fff;display:grid;place-items:center;
        }

        .descarga__botones{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}

        .publica__pie{
          display:flex;align-items:center;gap:16px;flex-wrap:wrap;
          border-top:1px solid var(--line);
          margin-top:clamp(56px,8vw,96px);padding:28px 0;
        }
      `}</style>
    </div>
  );
}
