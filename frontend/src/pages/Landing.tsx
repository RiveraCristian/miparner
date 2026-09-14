/**
 * Landing público · índice del sitio (/).
 *
 * Port de la landing de marketing de Miparner al panel. Mantiene la identidad
 * del manual (índigo del logo, coral solo como forma, tinta para el cuerpo) y
 * la "firma" visual del landing: botones tinta tipo píldora, eyebrow con barra
 * coral, glow del hero, tarjetas que se elevan y sección oscura de pasos.
 *
 * Todo el CSS va ACOTADO bajo `.mp-home` para no tocar los estilos globales del
 * panel de administración (que comparten nombres como .btn y .card).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo, Isotipo } from "../brand/Logo";

const enlaces = [
  { href: "#servicios", label: "La app" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

const capacidades = [
  {
    title: "Acompañamiento de confianza",
    text: "Un voluntario verificado que te apoya de forma constante, no un desconocido distinto cada vez.",
    path: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Zm-1 11 4-4-1.4-1.4L11 11.2 9.4 9.6 8 11l3 3Z",
  },
  {
    title: "Traslado cuando lo necesitas",
    text: "Llega a tus entrenamientos y competencias junto a quien te acompaña, cerca de tu comuna.",
    path: "M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  },
  {
    title: "Comunidad que suma",
    text: "Conecta con deportistas y voluntarios que se apoyan entre sí: el deporte también se vive en equipo.",
    path: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M17 14a5 5 0 0 1 4 5v1",
  },
  {
    title: "Accesible por diseño",
    text: "App pensada para todos: alto contraste, texto ampliable y compatible con lectores de pantalla.",
    path: "M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-8 2 8 1 8-1M12 8v6m0 0-3 7m3-7 3 7",
  },
];

const pasos = [
  {
    title: "Cuéntanos tu meta",
    text: "Dinos qué deporte practicas, cuándo entrenas y qué tipo de apoyo necesitas.",
  },
  {
    title: "Te presentamos a tu acompañante",
    text: "Un voluntario verificado y cercano, disponible para apoyarte de verdad, no solo para llevarte.",
  },
  {
    title: "Entrena y avanza",
    text: "Cuenta con su compañía en cada salida, entrenamiento y competencia. Nunca solo.",
  },
];

const cifras = [
  { value: "1.200+", label: "Deportistas acompañados" },
  { value: "850", label: "Voluntarios activos" },
  { value: "9.400", label: "Apoyos realizados" },
  { value: "48", label: "Comunas con cobertura" },
];

function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`badges ${className}`}>
      <a href="#descargar" className="badge" aria-label="Descárgala en el App Store">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.28-1.33-1.95-3.4-2.21-4.13-2.24-1.76-.18-3.43 1.04-4.32 1.04-.89 0-2.26-1.02-3.72-.99-1.91.03-3.68 1.11-4.66 2.82-1.99 3.45-.51 8.55 1.42 11.35.94 1.37 2.06 2.9 3.53 2.85 1.42-.06 1.96-.92 3.67-.92 1.71 0 2.2.92 3.7.89 1.53-.03 2.5-1.39 3.43-2.77 1.08-1.58 1.53-3.12 1.55-3.2-.03-.01-2.98-1.14-3.01-4.53M14.15 4.5c.78-.95 1.31-2.27 1.16-3.58-1.13.05-2.49.75-3.3 1.7-.72.84-1.36 2.18-1.19 3.47 1.26.1 2.55-.64 3.33-1.59" />
        </svg>
        <span>
          <small>Descárgala en el</small>
          <strong>App Store</strong>
        </span>
      </a>
      <a href="#descargar" className="badge" aria-label="Disponible en Google Play">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#00d3ff" d="M3.9 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l.1.1 9.5-9.5v-.2L3.9 2.3z" />
          <path fill="#ffce00" d="M17 15.3l-3.2-3.2v-.2l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.9 2.1z" />
          <path fill="#00f076" d="M17.1 15.2 13.8 12 3.9 21.9c.4.4 1 .4 1.7.1l11.5-6.8" />
          <path fill="#ff3131" d="M17.1 8.8 5.6 2.1C4.9 1.7 4.3 1.8 3.9 2.2L13.8 12l3.3-3.2z" />
        </svg>
        <span>
          <small>Disponible en</small>
          <strong>Google Play</strong>
        </span>
      </a>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      className="phone"
      role="img"
      aria-label="Pantalla de la app Miparner mostrando la próxima actividad deportiva y el voluntario que acompaña"
    >
      <div className="phone__notch" />
      <div className="phone__screen">
        <div className="phone__topbar">
          <Isotipo alto={22} className="phone__logo" />
          <span className="phone__place">
            <span className="phone__dot" /> Providencia
          </span>
        </div>

        <p className="phone__greeting">Hola, Camila 👋</p>
        <p className="phone__lead">Esta es tu próxima actividad.</p>

        <div className="phone__activity">
          <span className="phone__activity-icon" aria-hidden="true">🏃‍♀️</span>
          <div className="phone__activity-info">
            <strong>Entrenamiento de atletismo</strong>
            <small>Sábado 12 · 10:00 · Estadio Nacional</small>
          </div>
        </div>

        <p className="phone__section">Te acompaña</p>
        <div className="phone__match">
          <span className="phone__avatar" aria-hidden="true">CM</span>
          <div className="phone__info">
            <strong>Carlos M.</strong>
            <small>Voluntario verificado · 3 salidas juntos</small>
          </div>
          <span className="phone__verified" aria-hidden="true">✓</span>
        </div>

        <div className="phone__chat">
          <span className="phone__chat-name">Carlos</span>
          <p className="phone__chat-bubble">¡Nos vemos el sábado! Paso por ti a las 9:30 👋</p>
        </div>

        <button className="phone__cta" type="button" tabIndex={-1}>
          Coordinar con Carlos
        </button>
      </div>
    </div>
  );
}

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mp-home">
      {/* --------------------------------------------------------- Navbar */}
      <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
        <div className="container navbar__inner">
          <a href="#top" aria-label="Miparner, ir al inicio" className="navbar__brand">
            <Logo alto={44} />
          </a>

          <nav className={`navbar__links ${open ? "is-open" : ""}`}>
            {enlaces.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link to="/login" className="navbar__acceso" onClick={() => setOpen(false)}>
              Acceso equipo
            </Link>
            <a href="#descargar" className="btn btn--primary" onClick={() => setOpen(false)}>
              Descargar
            </a>
          </nav>

          <button
            className="navbar__toggle"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main id="top">
        {/* ----------------------------------------------------------- Hero */}
        <section className="hero">
          <div className="hero__glow" aria-hidden="true" />
          <div className="container hero__inner">
            <div className="hero__content">
              <span className="hero__badge">Apoyo para el deporte inclusivo</span>
              <h1 className="hero__title">
                Que llegar al deporte no dependa de{" "}
                <span className="text-coral">tener quién te lleve</span>.
              </h1>
              <p className="hero__subtitle">
                Miparner conecta personas para que el deporte sea para todos.
              </p>
              <div className="hero__actions">
                <a href="#descargar" className="btn btn--primary">Quiero acompañar</a>
                <a href="#servicios" className="btn btn--ghost">Conocer la app</a>
              </div>
              <StoreBadges className="hero__badges" />
              <div className="hero__meta">
                <span>Voluntarios verificados</span>
                <span>Apoyo cercano y constante</span>
                <span>Gratis para deportistas</span>
              </div>
            </div>

            <div className="hero__media">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- Servicios */}
        <section className="services" id="servicios">
          <div className="container">
            <header className="section-head">
              <span className="section-head__eyebrow">Cómo apoyamos</span>
              <h2 className="section-head__title">Mucho más que un traslado</h2>
            </header>
            <div className="services__grid">
              {capacidades.map((s) => (
                <article key={s.title} className="card">
                  <div className="card__icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={s.path} />
                    </svg>
                  </div>
                  <h3 className="card__title">{s.title}</h3>
                  <p className="card__text">{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- Cómo funciona */}
        <section className="how" id="como-funciona">
          <div className="container">
            <header className="section-head">
              <span className="section-head__eyebrow">Cómo funciona Miparner</span>
              <h2 className="section-head__title">Tres pasos para no entrenar solo</h2>
            </header>
            <ol className="steps">
              {pasos.map((s, i) => (
                <li className="step" key={s.title}>
                  <span className="step__marker">{i + 1}</span>
                  <h3 className="step__title">{s.title}</h3>
                  <p className="step__text">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------------- Cifras */}
        <section className="stats">
          <div className="container stats__inner">
            {cifras.map((s) => (
              <div key={s.label} className="stats__item">
                <span className="stats__value">{s.value}</span>
                <span className="stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="cta" id="descargar">
          <div className="container cta__inner">
            <h2 className="cta__title">Súmate y hagamos deporte con apoyo</h2>
            <p className="cta__text">
              Si eres deportista, encuentra el acompañamiento que necesitas. Si
              quieres ayudar, hazte voluntario y apoya a alguien a lograr su meta.
            </p>
            <StoreBadges className="cta__badges" />
            <p className="cta__note">Gratis para deportistas · Disponible en iOS y Android</p>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- Footer */}
      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__brand">
            <a href="#top" aria-label="Miparner, ir al inicio">
              <Logo version="blanco" alto={34} />
            </a>
            <p className="footer__tagline">
              Apoyo y acompañamiento para el deporte inclusivo. Conectamos
              deportistas y voluntarios para que nadie entrene solo.
            </p>
          </div>
          <div className="footer__cols">
            <div className="footer__col">
              <h4>La app</h4>
              <a href="#servicios">Qué hace</a>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#descargar">Descargar</a>
            </div>
            <div className="footer__col">
              <h4>Participa</h4>
              <a href="#descargar">Soy deportista</a>
              <a href="#descargar">Quiero ser voluntario</a>
            </div>
            <div className="footer__col">
              <h4>Equipo</h4>
              <Link to="/login">Acceso al panel</Link>
              <a href="#top">Términos</a>
              <Link to="/privacidad">Privacidad y datos</Link>
            </div>
          </div>
        </div>
        <div className="container footer__bottom">
          <span>© {year} Miparner. Todos los derechos reservados.</span>
          <span>Hecho en Chile 🇨🇱</span>
        </div>
      </footer>

      <style>{`
        /* ====================================================================
           Landing · estilos acotados bajo .mp-home (no afectan al panel).
           ==================================================================== */
        .mp-home{
          --white:#ffffff;
          /* Negro ligero, próximo a gris: títulos y textos suaves pero legibles. */
          --text:#4a4653;
          --muted:#5a5566;
          --border:rgba(26,24,33,.12);
          --radius:16px;
          --container:1120px;
          background:var(--white);
          color:var(--text);
          line-height:1.6;
          min-height:100vh;
        }
        .mp-home a{color:inherit;text-decoration:none}
        .mp-home h1,.mp-home h2,.mp-home h3,.mp-home h4{
          margin:0;line-height:1.2;letter-spacing:-.01em;font-weight:600;
        }
        .mp-home .container{width:100%;max-width:var(--container);margin:0 auto;padding:0 24px}
        .mp-home .text-coral{color:var(--indigo)}

        /* --- Botones --- */
        .mp-home .btn{
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          padding:13px 26px;min-height:44px;border-radius:999px;
          font-family:inherit;font-weight:600;font-size:1rem;cursor:pointer;
          border:1.5px solid transparent;text-decoration:none;
          transition:transform .15s ease,box-shadow .2s ease,background .2s ease;
        }
        .mp-home .btn--primary{background:var(--indigo);color:#fff;box-shadow:0 8px 22px rgba(58,57,150,.3)}
        .mp-home .btn--primary:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(58,57,150,.4)}
        .mp-home .btn--ghost{background:transparent;color:var(--indigo);border-color:var(--indigo)}
        .mp-home .btn--ghost:hover{background:var(--lavanda);transform:translateY(-2px)}

        /* El header fijo no debe tapar el título al saltar por ancla. */
        .mp-home section[id]{scroll-margin-top:88px}

        /* --- Navbar --- */
        .mp-home .navbar{
          position:fixed;inset:0 0 auto 0;z-index:50;padding:18px 0;
          border-bottom:1px solid transparent;
          transition:background .3s ease,padding .3s ease,border-color .3s ease,box-shadow .3s ease;
        }
        .mp-home .navbar.is-scrolled{
          background:rgba(255,255,255,.88);backdrop-filter:blur(14px);
          border-bottom-color:var(--border);box-shadow:0 4px 24px rgba(26,23,32,.05);padding:12px 0;
        }
        .mp-home .navbar__inner{display:flex;align-items:center;justify-content:space-between}
        .mp-home .navbar__brand{display:inline-flex;align-items:center}
        .mp-home .navbar__links{display:flex;align-items:center;gap:28px}
        .mp-home .navbar__links a:not(.btn){color:var(--text);font-size:1rem;font-weight:500;transition:color .2s ease}
        .mp-home .navbar__links a:not(.btn):hover{color:var(--indigo);text-decoration:underline;text-underline-offset:4px}
        .mp-home .navbar__acceso{color:var(--indigo)!important;font-weight:600!important}
        .mp-home .navbar__toggle{display:none;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:6px}
        .mp-home .navbar__toggle span{width:24px;height:2px;background:var(--tinta);border-radius:2px}

        /* --- Hero --- */
        .mp-home .hero{position:relative;padding:180px 0 90px;overflow:hidden;background:var(--white)}
        .mp-home .hero__glow{
          position:absolute;top:-260px;left:50%;transform:translateX(-50%);
          width:820px;height:620px;pointer-events:none;
          background:radial-gradient(circle at center,rgba(58,57,150,.1),rgba(58,57,150,0) 68%);
        }
        .mp-home .hero__inner{position:relative;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:48px}
        .mp-home .hero__content{max-width:560px}
        .mp-home .hero__badge{
          display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;
          background:rgba(58,57,150,.1);color:var(--indigo);font-size:.9rem;font-weight:600;margin-bottom:26px;
        }
        .mp-home .hero__badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--indigo)}
        .mp-home .hero__title{font-size:clamp(2.3rem,6vw,4rem);font-weight:800;letter-spacing:-.03em;color:var(--text)}
        .mp-home .hero__subtitle{margin:22px 0 0;max-width:600px;color:var(--muted);font-size:1.2rem}
        .mp-home .hero__actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}
        .mp-home .hero__badges{margin-top:20px}
        .mp-home .hero__meta{display:flex;gap:24px;margin-top:34px;color:var(--muted);font-size:.95rem;flex-wrap:wrap}
        .mp-home .hero__meta span::before{content:"✓ ";color:var(--indigo);font-weight:700}
        .mp-home .hero__media{display:flex;justify-content:center}

        /* --- Store badges --- */
        .mp-home .badges{display:flex;gap:12px;flex-wrap:wrap}
        .mp-home .badge{
          display:inline-flex;align-items:center;gap:10px;padding:9px 16px;min-height:44px;
          border-radius:12px;background:var(--indigo);color:#fff;border:1px solid var(--indigo);transition:transform .15s ease;
        }
        .mp-home .badge:hover{transform:translateY(-2px)}
        .mp-home .badge svg{width:22px;height:22px;flex-shrink:0}
        .mp-home .badge span{display:flex;flex-direction:column;line-height:1.15;text-align:left}
        .mp-home .badge small{font-size:.62rem;opacity:.85;letter-spacing:.02em}
        .mp-home .badge strong{font-size:1.02rem;font-weight:600}

        /* --- Phone mockup --- */
        .mp-home .phone{position:relative;width:290px;max-width:100%;background:var(--indigo);border-radius:40px;padding:12px;box-shadow:0 30px 70px rgba(58,57,150,.32)}
        .mp-home .phone__notch{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:120px;height:22px;background:var(--indigo);border-radius:0 0 16px 16px;z-index:2}
        .mp-home .phone__screen{background:#fff;border-radius:30px;padding:40px 18px 22px;overflow:hidden;min-height:580px;display:flex;flex-direction:column}
        .mp-home .phone__topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .mp-home .phone__logo{height:22px;width:auto}
        .mp-home .phone__place{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;font-weight:600;color:var(--text)}
        .mp-home .phone__dot{width:7px;height:7px;border-radius:50%;background:var(--indigo)}
        .mp-home .phone__greeting{margin:0;font-weight:700;font-size:1.05rem}
        .mp-home .phone__lead{margin:2px 0 16px;color:var(--muted);font-size:.85rem}
        .mp-home .phone__activity{display:flex;align-items:center;gap:12px;background:var(--lavanda);border-radius:16px;padding:14px;margin-bottom:20px}
        .mp-home .phone__activity-icon{width:44px;height:44px;flex-shrink:0;display:grid;place-items:center;border-radius:12px;background:#fff;font-size:1.4rem}
        .mp-home .phone__activity-info{display:flex;flex-direction:column}
        .mp-home .phone__activity-info strong{font-size:.95rem}
        .mp-home .phone__activity-info small{font-size:.78rem;color:var(--muted);margin-top:2px}
        .mp-home .phone__section{margin:0 0 8px;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
        .mp-home .phone__match{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:16px;padding:10px 12px;margin-bottom:16px}
        .mp-home .phone__avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--indigo);color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0}
        .mp-home .phone__info{display:flex;flex-direction:column;flex:1;min-width:0}
        .mp-home .phone__info strong{font-size:.92rem}
        .mp-home .phone__info small{font-size:.75rem;color:var(--muted)}
        .mp-home .phone__verified{display:grid;place-items:center;width:24px;height:24px;flex-shrink:0;border-radius:50%;background:var(--indigo);color:#fff;font-size:.8rem;font-weight:800}
        .mp-home .phone__chat{margin:4px 0 18px}
        .mp-home .phone__chat-name{font-size:.72rem;font-weight:700;color:var(--muted);margin-left:4px}
        .mp-home .phone__chat-bubble{margin:6px 0 0;padding:11px 14px;background:var(--lavanda);border-radius:4px 16px 16px 16px;font-size:.82rem;color:var(--text)}
        .mp-home .phone__cta{width:100%;margin-top:auto;border:0;border-radius:14px;padding:15px;background:var(--indigo);color:#fff;font-family:inherit;font-weight:600;font-size:.95rem}

        /* --- Section head --- */
        .mp-home .section-head{max-width:640px;margin:0 0 52px}
        .mp-home .section-head__eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--text);font-weight:600;font-size:.9rem;letter-spacing:.04em;text-transform:uppercase}
        .mp-home .section-head__eyebrow::before{content:"";width:22px;height:3px;border-radius:2px;background:var(--indigo)}
        .mp-home .section-head__title{font-size:clamp(1.9rem,4vw,2.7rem);font-weight:800;letter-spacing:-.02em;margin-top:12px}

        /* --- Services --- */
        .mp-home .services{padding:104px 0;background:var(--white)}
        .mp-home .services__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
        .mp-home .card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
        .mp-home .card:hover{transform:translateY(-4px);border-color:var(--indigo);box-shadow:0 16px 40px rgba(58,57,150,.12)}
        .mp-home .card__icon{width:48px;height:48px;display:grid;place-items:center;border-radius:12px;background:rgba(58,57,150,.12);color:var(--indigo);margin-bottom:18px}
        .mp-home .card__icon svg{width:24px;height:24px}
        .mp-home .card__title{font-size:1.2rem;margin-bottom:10px}
        .mp-home .card__text{color:var(--muted);font-size:1rem;margin:0}

        /* --- How it works (sección tinta) --- */
        .mp-home .how{padding:104px 0;background:var(--indigo);color:#fff}
        .mp-home .how .section-head__eyebrow,.mp-home .how .section-head__title{color:#fff}
        .mp-home .steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .mp-home .step{position:relative;padding-top:12px}
        .mp-home .step:not(:last-child)::after{content:"";position:absolute;top:40px;left:40px;width:calc(100% + 24px - 40px);height:2px;background:repeating-linear-gradient(to right,rgba(255,255,255,.28) 0 8px,transparent 8px 16px)}
        .mp-home .step__marker{position:relative;z-index:1;display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#fff;color:var(--indigo);font-size:1.4rem;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.2)}
        .mp-home .step__title{font-size:1.3rem;margin:22px 0 8px;color:#fff}
        .mp-home .step__text{color:rgba(255,255,255,.72);margin:0;max-width:30ch}

        /* --- Stats --- */
        .mp-home .stats{padding:84px 0;background:var(--white)}
        .mp-home .stats__inner{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
        .mp-home .stats__item{padding:24px;border-left:3px solid var(--indigo)}
        .mp-home .stats__value{display:block;font-size:clamp(2.1rem,4vw,3rem);font-weight:800;color:var(--indigo);letter-spacing:-.02em}
        .mp-home .stats__label{color:var(--muted);font-size:1rem}

        /* --- CTA --- */
        .mp-home .cta{padding:40px 0 104px;background:var(--white)}
        .mp-home .cta__inner{position:relative;text-align:center;max-width:760px;margin:0 auto;padding:64px 32px;border-radius:28px;background:var(--indigo);color:var(--white);overflow:hidden}
        .mp-home .cta__inner::after{content:"";position:absolute;right:-80px;bottom:-80px;width:260px;height:260px;border-radius:50%;background:#fff;opacity:.1;pointer-events:none}
        .mp-home .cta__title{position:relative;font-size:clamp(1.9rem,4vw,2.7rem);font-weight:800;letter-spacing:-.02em}
        .mp-home .cta__text{position:relative;color:rgba(255,255,255,.85);margin:16px auto 32px;max-width:460px;font-size:1.1rem}
        .mp-home .cta__badges{position:relative;justify-content:center}
        .mp-home .cta__badges .badge{background:#fff;color:var(--tinta);border-color:#fff}
        .mp-home .cta__note{position:relative;color:rgba(255,255,255,.75);font-size:.9rem;margin-top:18px}

        /* --- Footer --- */
        .mp-home .footer{padding:64px 0 32px;background:var(--indigo);color:rgba(255,255,255,.7)}
        .mp-home .footer__inner{display:flex;justify-content:space-between;gap:48px;flex-wrap:wrap}
        .mp-home .footer__tagline{color:rgba(255,255,255,.7);max-width:260px;margin-top:14px;font-size:1rem}
        .mp-home .footer__cols{display:flex;gap:64px;flex-wrap:wrap}
        .mp-home .footer__col{display:flex;flex-direction:column;gap:10px}
        .mp-home .footer__col h4{font-size:.9rem;letter-spacing:.04em;color:var(--white);margin-bottom:4px}
        .mp-home .footer__col a{color:rgba(255,255,255,.7);font-size:1rem;transition:color .2s ease}
        .mp-home .footer__col a:hover{color:var(--white)}
        .mp-home .footer__bottom{display:flex;justify-content:space-between;align-items:center;margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);font-size:.9rem;flex-wrap:wrap;gap:12px}

        /* --- Responsive --- */
        @media (max-width:940px){
          .mp-home .hero{padding-top:150px}
          .mp-home .hero__inner{grid-template-columns:1fr;text-align:center;gap:40px}
          .mp-home .hero__content{max-width:620px;margin:0 auto}
          .mp-home .hero__subtitle{margin-left:auto;margin-right:auto}
          .mp-home .hero__actions,.mp-home .hero__badges,.mp-home .hero__meta{justify-content:center}
          .mp-home .hero__media{order:-1}
        }
        @media (max-width:900px){
          .mp-home .services__grid{grid-template-columns:repeat(2,1fr)}
          .mp-home .stats__inner{grid-template-columns:repeat(2,1fr)}
        }
        @media (max-width:760px){
          .mp-home .navbar__toggle{display:flex}
          .mp-home .navbar__links{
            position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:flex-start;gap:18px;padding:24px;
            background:rgba(255,255,255,.98);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);
            transform:translateY(-12px);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;
          }
          .mp-home .navbar__links.is-open{opacity:1;transform:translateY(0);pointer-events:auto}
          .mp-home .steps{grid-template-columns:1fr;gap:32px}
          .mp-home .step:not(:last-child)::after{top:56px;left:27px;width:2px;height:calc(100% + 32px - 56px);background:repeating-linear-gradient(to bottom,rgba(255,255,255,.28) 0 8px,transparent 8px 16px)}
        }
        @media (max-width:520px){
          .mp-home .services__grid,.mp-home .stats__inner{grid-template-columns:1fr}
          .mp-home .hero{padding-top:140px}
        }
      `}</style>
    </div>
  );
}
