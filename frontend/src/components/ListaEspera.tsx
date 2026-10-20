/**
 * Lista de espera de la web.
 *
 * Miparner todavía no está en todas las comunas ni tiene cupos abiertos de
 * voluntariado siempre. Esto recoge el contacto de quien se interesa para
 * escribirle cuando sí lo esté, en vez de perder a esa persona porque la app
 * aún no le sirve.
 *
 * Es un formulario público en internet, así que:
 *  · La casilla de autorización es obligatoria y no viene marcada. Dejar aquí
 *    nombre y correo es entregar datos personales, y la única finalidad es
 *    escribirle: se dice con esas palabras, no con un enlace a un reglamento.
 *  · El backend limita a cinco envíos por hora y por IP.
 *  · Quien ya está apuntado recibe la misma respuesta que quien se apunta por
 *    primera vez: decirle "ya estabas" revelaría que ese correo está en la
 *    lista a cualquiera que lo pruebe.
 *
 * Accesibilidad: cada campo tiene etiqueta visible —el marcador de posición
 * nunca es la única pista—, los errores se anuncian con `role="alert"` y el
 * estado de envío se refleja en el texto del botón, no solo en su color.
 */
import { useId, useState } from "react";
import { CircleAlert, CircleCheck, Send } from "lucide-react";

type Interes = "deportista" | "voluntario" | "organizacion" | "otro";

const INTERESES: { valor: Interes; label: string; detalle: string }[] = [
  { valor: "deportista", label: "Busco acompañamiento", detalle: "Soy deportista con discapacidad" },
  { valor: "voluntario", label: "Quiero acompañar", detalle: "Soy estudiante y quiero ser voluntario" },
  { valor: "organizacion", label: "Represento a una organización", detalle: "Club, fundación, universidad" },
  { valor: "otro", label: "Otra cosa", detalle: "Cuéntanos en el mensaje" },
];

interface Respuesta {
  ok: true;
  yaEstaba: boolean;
  mensaje: string;
}

export function ListaEspera() {
  const id = useId();
  const [f, setF] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    comuna: "",
    interes: "" as Interes | "",
    mensaje: "",
    acepta: false,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState<Respuesta | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const completo = f.nombre.trim().length >= 2 && f.correo.includes("@") && f.interes && f.acepta;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!completo || enviando) return;
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/v1/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.nombre.trim(),
          correo: f.correo.trim(),
          telefono: f.telefono.trim() || undefined,
          comuna: f.comuna.trim() || undefined,
          interes: f.interes,
          mensaje: f.mensaje.trim() || undefined,
          aceptaContacto: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | Respuesta
        | { error?: { message?: string } }
        | null;

      if (!res.ok) {
        const msg = (json as { error?: { message?: string } })?.error?.message;
        throw new Error(msg ?? "No pudimos guardar tus datos. Vuelve a intentar en un momento.");
      }
      setListo(json as Respuesta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Vuelve a intentar.");
    } finally {
      setEnviando(false);
    }
  }

  /* ------------------------------------------------------------ Enviado */

  if (listo) {
    return (
      <section className="espera" id="lista-espera">
        <div className="container espera__inner">
          <div className="espera__hecho" role="status">
            <span className="espera__hechoIcono" aria-hidden="true">
              <CircleCheck size={30} />
            </span>
            <h2 className="espera__titulo">Quedaste en la lista</h2>
            <p className="espera__texto">
              Te escribiremos a <strong>{f.correo.trim()}</strong> en cuanto Miparner esté
              disponible para ti. No usaremos tu correo para nada más.
            </p>
          </div>
        </div>
        <Estilos />
      </section>
    );
  }

  /* ----------------------------------------------------------- Formulario */

  return (
    <section className="espera" id="lista-espera">
      <div className="container espera__inner">
        <div className="espera__intro">
          <h2 className="espera__titulo">¿Todavía no estamos en tu comuna?</h2>
          <p className="espera__texto">
            Déjanos tu contacto y te avisamos en cuanto Miparner llegue a tu zona o se abran
            cupos de voluntariado. Sin compromiso.
          </p>
        </div>

        <form className="espera__form" onSubmit={enviar} noValidate>
          {error && (
            <p className="espera__error" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="espera__fila">
            <div className="espera__campo">
              <label className="campo" htmlFor={`${id}-nombre`}>
                Tu nombre <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${id}-nombre`}
                className="input"
                value={f.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                required
                autoComplete="name"
                maxLength={255}
              />
            </div>
            <div className="espera__campo">
              <label className="campo" htmlFor={`${id}-correo`}>
                Tu correo <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${id}-correo`}
                className="input"
                type="email"
                value={f.correo}
                onChange={(e) => set("correo", e.target.value)}
                required
                autoComplete="email"
                maxLength={255}
              />
            </div>
          </div>

          <div className="espera__fila">
            <div className="espera__campo">
              <label className="campo" htmlFor={`${id}-comuna`}>
                Tu comuna
              </label>
              <input
                id={`${id}-comuna`}
                className="input"
                value={f.comuna}
                onChange={(e) => set("comuna", e.target.value)}
                autoComplete="address-level2"
                maxLength={120}
              />
              <p className="espera__ayuda">Nos dice a qué comuna llevar el servicio primero.</p>
            </div>
            <div className="espera__campo">
              <label className="campo" htmlFor={`${id}-telefono`}>
                Tu teléfono
              </label>
              <input
                id={`${id}-telefono`}
                className="input"
                type="tel"
                value={f.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                autoComplete="tel"
                maxLength={30}
              />
              <p className="espera__ayuda">Opcional, por si prefieres que te llamemos.</p>
            </div>
          </div>

          {/* Grupo de opciones, no un desplegable: la elección define todo lo
              demás y así se lee entera sin desplegar nada. */}
          <fieldset className="espera__grupo">
            <legend className="campo">
              ¿Qué te interesa? <span aria-hidden="true">*</span>
            </legend>
            <div className="espera__opciones">
              {INTERESES.map((o) => (
                <label
                  key={o.valor}
                  className={`espera__opcion${f.interes === o.valor ? " espera__opcion--activa" : ""}`}
                >
                  <input
                    type="radio"
                    name={`${id}-interes`}
                    value={o.valor}
                    checked={f.interes === o.valor}
                    onChange={() => set("interes", o.valor)}
                    required
                  />
                  <span className="espera__opcionTexto">
                    <strong>{o.label}</strong>
                    <span>{o.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="espera__campo">
            <label className="campo" htmlFor={`${id}-mensaje`}>
              ¿Algo que quieras contarnos?
            </label>
            <textarea
              id={`${id}-mensaje`}
              className="input"
              rows={3}
              value={f.mensaje}
              onChange={(e) => set("mensaje", e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Consentimiento explícito, sin marcar por omisión y con la
              finalidad escrita en la propia casilla. */}
          <label className="espera__acepta">
            <input
              type="checkbox"
              checked={f.acepta}
              onChange={(e) => set("acepta", e.target.checked)}
              required
            />
            <span>
              Autorizo a Miparner a guardar estos datos con el único fin de contactarme sobre
              el servicio. Puedo pedir que los borren cuando quiera escribiendo al correo de
              contacto. <a href="/privacidad">Política de privacidad</a>
            </span>
          </label>

          <button type="submit" className="btn btn-primario espera__enviar" disabled={!completo || enviando}>
            <Send size={18} aria-hidden="true" />
            {enviando ? "Enviando…" : "Apuntarme a la lista"}
          </button>
        </form>
      </div>
      <Estilos />
    </section>
  );
}

function Estilos() {
  return (
    <style>{`
      .espera{background:var(--surface-2);padding:72px 0}
      .espera__inner{display:grid;gap:34px;max-width:52rem}
      .espera__intro{text-align:center;display:grid;gap:10px}
      .espera__titulo{font-size:clamp(24px,3.4vw,32px);font-weight:600;letter-spacing:-.02em}
      .espera__texto{color:var(--ink-2);font-size:17px;line-height:1.6;max-width:44ch;margin:0 auto}

      .espera__form{
        display:grid;gap:18px;background:var(--surface);
        border:1px solid var(--line);border-radius:var(--r-lg);padding:28px;
      }
      .espera__fila{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .espera__campo{display:grid;gap:6px}
      .espera__ayuda{font-size:13px;color:var(--ink-3)}
      .espera__form textarea.input{resize:vertical;font:inherit}

      .espera__grupo{border:0;padding:0;margin:0;display:grid;gap:10px}
      .espera__opciones{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .espera__opcion{
        display:flex;gap:11px;align-items:flex-start;cursor:pointer;
        border:1.5px solid var(--line);border-radius:var(--r);padding:13px 15px;
      }
      .espera__opcion:hover{border-color:var(--indigo)}
      /* Seleccionado: no solo color — fondo lavanda y borde índigo. */
      .espera__opcion--activa{border-color:var(--indigo);background:var(--lavanda)}
      .espera__opcion input{margin-top:3px;accent-color:var(--indigo);flex:none}
      .espera__opcionTexto{display:grid;gap:2px;font-size:15px}
      .espera__opcionTexto span{font-size:13px;color:var(--ink-2)}

      .espera__acepta{
        display:flex;gap:11px;align-items:flex-start;
        font-size:14px;line-height:1.55;color:var(--ink-2);cursor:pointer;
      }
      .espera__acepta input{margin-top:3px;accent-color:var(--indigo);flex:none;width:18px;height:18px}

      /* Coral como forma: barra e icono. El texto va en tinta. */
      .espera__error{
        display:flex;gap:10px;align-items:flex-start;
        background:var(--coral-bg);color:var(--ink);
        border-left:3px solid var(--coral);border-radius:var(--r-sm);
        padding:13px 15px;font-size:15px;line-height:1.5;
      }
      .espera__error svg{flex:none;margin-top:2px;color:var(--coral)}

      .espera__enviar{justify-self:start;min-height:48px}

      .espera__hecho{
        display:grid;justify-items:center;gap:12px;text-align:center;
        background:var(--surface);border:1px solid var(--line);
        border-radius:var(--r-lg);padding:48px 28px;
      }
      .espera__hechoIcono{
        width:60px;height:60px;border-radius:50%;
        background:var(--exito-bg);color:var(--exito);
        display:grid;place-items:center;
      }

      @media (max-width:719px){
        .espera{padding:52px 0}
        .espera__fila,.espera__opciones{grid-template-columns:1fr}
        .espera__form{padding:20px}
        .espera__enviar{justify-self:stretch}
      }
    `}</style>
  );
}
