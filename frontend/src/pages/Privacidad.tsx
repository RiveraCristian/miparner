/**
 * Política de privacidad pública.
 *
 * Se publica antes del registro a propósito: quien todavía no tiene cuenta
 * tiene derecho a leer qué se hará con sus datos antes de entregarlos, así que
 * esta página no pide sesión.
 *
 * Las finalidades no están escritas aquí: se leen de
 * `/api/v1/consentimientos/finalidades`, que es la misma fuente que ven las
 * apps al registrarse. Tenerlas en dos sitios garantizaría que un día digan
 * cosas distintas.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useFetch } from "../lib/useFetch";
import { Logo } from "../brand/Logo";
import { Estado } from "../components/ui";

interface Finalidad {
  clave: string;
  titulo: string;
  texto: string;
  obligatorio: boolean;
  sensible: boolean;
}

interface Derecho {
  clave: string;
  titulo: string;
  detalle: string;
}

interface Datos {
  version: string;
  derechos: Derecho[];
  finalidades: Finalidad[];
}

export function Privacidad() {
  const { data, loading } = useFetch<Datos>("/consentimientos/finalidades?rol=deportista");

  return (
    <div className="privacidad">
      <header className="privacidad__cabecera">
        <Link to="/" className="logo-enlace" aria-label="Miparner, ir al inicio">
          <Logo alto={30} version="color" sinRegistro />
        </Link>
        <Link to="/" className="btn btn-fantasma btn-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver
        </Link>
      </header>

      <main className="privacidad__cuerpo">
        <h1>Privacidad y datos personales</h1>
        <p className="tenue">
          Qué datos te pedimos, para qué los usamos y qué puedes hacer con ellos.
        </p>

        <div className="aviso-borrador" role="note">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>
            <strong>Documento en revisión legal.</strong> Este texto describe cómo funciona hoy
            la plataforma. La versión definitiva será validada por un abogado antes de la
            puesta en marcha.
          </span>
        </div>

        <section>
          <h2>Lo que te pedimos autorizar</h2>
          <p>
            Nada de esto va en una sola casilla de “acepto los términos”. Cada finalidad se
            autoriza por separado, y puedes aceptar unas y rechazar otras.
          </p>

          {loading ? (
            <p className="tenue">Cargando…</p>
          ) : (
            <div className="finalidades">
              {(data?.finalidades ?? []).map((f) => (
                <article key={f.clave} className="card finalidad">
                  <div className="finalidad__cabecera">
                    <h3>{f.titulo}</h3>
                    <span className="finalidad__marcas">
                      <Estado tipo={f.obligatorio ? "indigo" : "neutro"}>
                        {f.obligatorio ? "Imprescindible" : "Opcional"}
                      </Estado>
                      {f.sensible && <Estado tipo="atencion">Dato sensible</Estado>}
                    </span>
                  </div>
                  <p>{f.texto}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2>Datos de salud y discapacidad</h2>
          <p>
            Son <strong>datos sensibles</strong> y los tratamos solo con tu autorización
            expresa. Tres compromisos concretos:
          </p>
          <ul>
            <li>
              El voluntario <strong>nunca ve tu tipo de discapacidad</strong>, tus
              observaciones de salud ni tus documentos. Solo ve los apoyos que necesitas
              durante el trayecto, porque sin eso no puede ayudarte.
            </li>
            <li>
              Tus documentos de acreditación <strong>solo los ve el equipo de
              administración</strong>, y únicamente para validar tu cuenta.
            </li>
            <li>
              Puedes usar Miparner <strong>sin declarar tu tipo de discapacidad</strong>:
              existe la opción “prefiero no decirlo”.
            </li>
          </ul>
          <p>
            Y si no tienes credencial de discapacidad ni certificado médico, no te quedas
            fuera: puedes pedir una videollamada con el equipo y te acreditamos sin ningún
            documento.
          </p>
        </section>

        <section>
          <h2>Tus derechos</h2>
          <div className="derechos">
            {(data?.derechos ?? []).map((d) => (
              <div key={d.clave} className="card derecho">
                <strong>{d.titulo}</strong>
                <p className="tenue">{d.detalle}</p>
              </div>
            ))}
          </div>
          <p>
            Puedes ejercerlos desde la propia aplicación, en <em>Perfil → Mis datos y
            privacidad</em>: ahí ves qué autorizaste, lo cambias, lo revocas y descargas una
            copia completa de tus datos. También puedes escribirnos.
          </p>
          <p className="tenue">
            Si revocas una autorización imprescindible, tu cuenta queda desactivada: sin ella
            no tenemos base para seguir tratando tus datos. No se borra, y puedes reactivarla
            volviendo a otorgarla.
          </p>
        </section>

        <footer className="privacidad__pie">
          <p className="tenue">
            Versión de la política: {data?.version ?? "—"}. El documento completo está en{" "}
            <code>POLITICA_PRIVACIDAD.md</code> del repositorio del proyecto.
          </p>
        </footer>
      </main>

      <style>{`
        .privacidad{min-height:100vh;background:var(--bg)}
        .privacidad__cabecera{
          display:flex;align-items:center;justify-content:space-between;
          padding:20px clamp(20px,5vw,48px);background:var(--surface);
          border-bottom:1px solid var(--line);
        }
        .privacidad__cuerpo{
          max-width:52rem;margin:0 auto;padding:40px clamp(20px,5vw,48px) 72px;
        }
        .privacidad__cuerpo h1{font-size:clamp(28px,4vw,36px);font-weight:600;letter-spacing:-.02em}
        .privacidad__cuerpo h2{font-size:22px;font-weight:600;margin:40px 0 12px}
        .privacidad__cuerpo h3{font-size:17px;font-weight:600}
        .privacidad__cuerpo p{line-height:1.6;margin:12px 0}
        .privacidad__cuerpo ul{display:grid;gap:10px;margin:12px 0 12px 20px;line-height:1.6}
        .aviso-borrador{
          display:flex;gap:12px;align-items:flex-start;margin-top:24px;
          background:var(--lavanda);border-left:3px solid var(--indigo);
          border-radius:var(--r-sm);padding:14px 16px;font-size:15px;line-height:1.5;
        }
        .aviso-borrador svg{flex:none;margin-top:2px;color:var(--indigo)}
        .finalidades{display:grid;gap:14px}
        .finalidad__cabecera{
          display:flex;align-items:flex-start;justify-content:space-between;
          gap:14px;flex-wrap:wrap;margin-bottom:6px;
        }
        .finalidad__marcas{display:flex;gap:6px;flex-wrap:wrap}
        .derechos{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:14px}
        .derecho{display:grid;gap:4px}
        .privacidad__pie{margin-top:48px;border-top:1px solid var(--line);padding-top:20px}
      `}</style>
    </div>
  );
}
