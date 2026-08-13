import { Link } from "react-router-dom";
import {
  Accessibility,
  Award,
  Compass,
  HeartHandshake,
  MapPin,
  Radio,
  ShieldAlert,
  Check,
} from "lucide-react";

const features = [
  { icon: Accessibility, t: "Accesibilidad universal", d: "Compatible con VoiceOver y TalkBack, alto contraste y texto grande desde el primer toque." },
  { icon: MapPin, t: "Seguimiento en vivo", d: "Mapa en tiempo real del viaje, con estados y tiempos de llegada para el deportista y su red de apoyo." },
  { icon: ShieldAlert, t: "Botón de pánico", d: "Alerta crítica inmediata con ubicación, verificación por OTP y aviso a los administradores." },
  { icon: HeartHandshake, t: "Comunidad de voluntarios", d: "Personas validadas que acompañan a entrenamientos y competencias, con reconocimiento por su aporte." },
  { icon: Radio, t: "Emparejamiento cercano", d: "Encuentra al voluntario disponible más cercano usando geolocalización precisa." },
  { icon: Award, t: "Gamificación", d: "Puntos, niveles, insignias, ranking y premios canjeables que motivan a seguir activos." },
];

export function Landing() {
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 6vw", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brand)", display: "grid", placeItems: "center", color: "#fff" }}>
            <Compass size={22} />
          </div>
          <strong style={{ fontSize: 19, letterSpacing: "-.02em" }}>Rumbo</strong>
        </div>
        <Link to="/login" className="btn btn-ghost btn-sm">Acceso administración</Link>
      </header>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--brand-strong), var(--brand))",
          color: "#fff",
          borderRadius: 28,
          margin: "8px 4vw 0",
          maxWidth: 1200,
          marginInline: "auto",
          padding: "clamp(40px, 6vw, 76px) clamp(24px, 5vw, 64px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -80, bottom: -120, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <span style={{ display: "inline-block", background: "rgba(255,255,255,.16)", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            Movilidad accesible para el deporte
          </span>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, fontWeight: 800, marginBottom: 18 }}>
            Cada deportista llega a su entrenamiento, acompañado.
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", opacity: 0.9, lineHeight: 1.55, marginBottom: 30 }}>
            Rumbo conecta a deportistas con voluntarios validados para un traslado seguro,
            con seguimiento en vivo, botón de pánico y una comunidad que reconoce a quienes ayudan.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#voluntarios" className="btn" style={{ background: "#fff", color: "var(--brand-strong)" }}>Súmate como voluntario</a>
            <a href="#descarga" className="btn" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }}>Descargar la app</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px, 7vw, 88px) 4vw" }}>
        <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, textAlign: "center", marginBottom: 10 }}>Una plataforma pensada para la inclusión</h2>
        <p className="muted" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px", fontSize: 16, lineHeight: 1.6 }}>
          Dos apps móviles — deportista y voluntario — coordinadas en tiempo real, con seguridad y accesibilidad en el centro.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {features.map((f) => (
            <div key={f.t} className="card" style={{ padding: "22px 22px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center", marginBottom: 14 }}>
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 7 }}>{f.t}</h3>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Captación voluntarios */}
      <section id="voluntarios" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4vw 72px" }}>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, padding: "clamp(28px, 4vw, 48px)", background: "var(--surface-2)" }}>
          <div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, marginBottom: 12 }}>Conviértete en voluntario</h2>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20, maxWidth: 620 }}>
              Regala tiempo y kilómetros. Acompaña a deportistas a sus entrenamientos y competencias,
              suma puntos, gana insignias y sé parte de una comunidad que transforma vidas.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10, maxWidth: 520 }}>
              {["Eliges cuándo estás disponible con un solo interruptor", "Recibes solicitudes cercanas a tu ubicación", "Navegación con hitos del viaje paso a paso", "Reconocimiento y premios por tu aporte"].map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center", flex: "none", marginTop: 1 }}>
                    <Check size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <a href="#descarga" className="btn btn-primary">Quiero ser voluntario</a>
          </div>
        </div>
      </section>

      {/* Descarga */}
      <section id="descarga" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4vw 88px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, marginBottom: 12 }}>Descarga Rumbo</h2>
        <p className="muted" style={{ marginBottom: 26, fontSize: 16 }}>Disponible próximamente para iOS y Android.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <span className="btn btn-ghost" style={{ cursor: "default" }}>App Store</span>
          <span className="btn btn-ghost" style={{ cursor: "default" }}>Google Play</span>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "28px 4vw", textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Rumbo · movilidad accesible para el deporte · nombre y logo son placeholder.
        </p>
      </footer>
    </div>
  );
}
