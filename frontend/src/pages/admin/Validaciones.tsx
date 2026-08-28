/**
 * Cola de validación de cuentas.
 *
 * Deportistas y voluntarios entran a la plataforma con la cuenta activa pero
 * en estado 'pendiente': pueden entrar y subir sus documentos, no pueden
 * operar. Aquí el equipo revisa el respaldo y aprueba o rechaza.
 *
 * El rechazo siempre lleva motivo: la persona lo lee en su app y puede volver
 * a subir el documento, lo que devuelve la cuenta a esta cola.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, apiBlobUrl } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useToast } from "../../lib/toast";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, Vacio, type ClaseEstado } from "../../components/ui";

interface Documento {
  documentoId: number;
  documentoTipo: string;
  documentoNombreOriginal: string;
  documentoMime: string;
  documentoTamano: number;
  documentoEstado: string;
  documentoObservacion: string | null;
  createdAt: string;
}

interface Requerido {
  tipo: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
}

interface Solicitud {
  usuarioId: number;
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioTelefono: string | null;
  usuarioRol: string;
  usuarioEstadoValidacion: string;
  usuarioMotivoRechazo: string | null;
  usuarioFechaCreacion: string;
  deportistaPerfil: { deportistaDisciplina: string | null; deportistaNecesidades: string[] } | null;
  voluntarioPerfil: { voluntarioVehiculo: string | null; voluntarioPatente: string | null } | null;
  documentos: Documento[];
  requeridos: Requerido[];
  faltantes: string[];
  listaParaRevision: boolean;
}

type Filtro = "pendiente" | "aprobado" | "rechazado";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "pendiente", label: "Pendientes" },
  { valor: "aprobado", label: "Aprobadas" },
  { valor: "rechazado", label: "Rechazadas" },
];

const tonoDocumento: Record<string, ClaseEstado> = {
  pendiente: "atencion",
  aprobado: "exito",
  rechazado: "critico",
};

const kb = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export function Validaciones() {
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const { data, loading, error, reload } = useFetch<Solicitud[]>(`/admin/validaciones?estado=${filtro}`);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [fallo, setFallo] = useState("");
  const toast = useToast();

  const filas = data ?? [];
  const nombreDe = (id: number) => filas.find((f) => f.usuarioId === id)?.usuarioNombre ?? "la cuenta";

  async function aprobar(usuarioId: number) {
    setOcupado(usuarioId);
    setFallo("");
    const nombre = nombreDe(usuarioId);
    try {
      await api(`/admin/usuarios/${usuarioId}/validacion`, {
        method: "PATCH",
        body: { estado: "aprobado" },
      });
      reload();
      toast.exito(`Se aprobó la cuenta de ${nombre}.`);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo aprobar la cuenta");
    } finally {
      setOcupado(null);
    }
  }

  async function rechazar(usuarioId: number, motivo: string) {
    setOcupado(usuarioId);
    setFallo("");
    const nombre = nombreDe(usuarioId);
    try {
      await api(`/admin/usuarios/${usuarioId}/validacion`, {
        method: "PATCH",
        body: { estado: "rechazado", motivo },
      });
      reload();
      toast.exito(`Se rechazó la cuenta de ${nombre}.`);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo rechazar la cuenta");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Verificación de cuentas"
        title="Validaciones"
        subtitle={
          filtro === "pendiente"
            ? `${filas.length} ${filas.length === 1 ? "cuenta espera" : "cuentas esperan"} revisión`
            : `${filas.length} ${filas.length === 1 ? "cuenta" : "cuentas"} en este estado`
        }
      />

      <div className="filtros" role="group" aria-label="Filtrar por estado de validación">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`btn btn-sm ${filtro === f.valor ? "btn-primario" : "btn-fantasma"}`}
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {fallo && <ErrorMsg msg={fallo} />}

      {loading ? (
        <Loader texto="Cargando solicitudes…" />
      ) : error ? (
        <ErrorMsg msg={error} />
      ) : filas.length === 0 ? (
        <div className="card">
          <Vacio
            icon={ShieldCheck}
            titulo={filtro === "pendiente" ? "No hay nada por revisar" : "Sin cuentas en este estado"}
            detalle={
              filtro === "pendiente"
                ? "Cuando alguien termine de subir sus documentos, su solicitud aparecerá aquí."
                : undefined
            }
          />
        </div>
      ) : (
        <div className="pila">
          {filas.map((s) => (
            <FichaSolicitud
              key={s.usuarioId}
              solicitud={s}
              ocupado={ocupado === s.usuarioId}
              onAprobar={() => aprobar(s.usuarioId)}
              onRechazar={(motivo) => rechazar(s.usuarioId, motivo)}
            />
          ))}
        </div>
      )}

      <style>{`
        .filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .pila{display:grid;gap:18px}
      `}</style>
    </>
  );
}

/* ------------------------------------------------------------ Ficha */

function FichaSolicitud({
  solicitud: s,
  ocupado,
  onAprobar,
  onRechazar,
}: {
  solicitud: Solicitud;
  ocupado: boolean;
  onAprobar: () => void;
  onRechazar: (motivo: string) => void;
}) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const porTipo = new Map(s.documentos.map((d) => [d.documentoTipo, d]));
  const pendiente = s.usuarioEstadoValidacion === "pendiente";

  return (
    <article className="card ficha">
      <header className="ficha__cabecera">
        <span className="ficha__avatar" aria-hidden="true">
          {s.usuarioNombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
        </span>
        <div className="ficha__quien">
          <h2 className="ficha__nombre">{s.usuarioNombre}</h2>
          <p className="tenue">
            {s.usuarioCorreo}
            {s.usuarioTelefono ? ` · ${s.usuarioTelefono}` : ""}
          </p>
          <p className="tenue" style={{ fontSize: 14 }}>
            {s.usuarioRol === "voluntario"
              ? [s.voluntarioPerfil?.voluntarioVehiculo, s.voluntarioPerfil?.voluntarioPatente]
                  .filter(Boolean)
                  .join(" · ") || "Voluntario sin vehículo registrado"
              : s.deportistaPerfil?.deportistaDisciplina ?? "Deportista"}
          </p>
        </div>
        <div className="ficha__estados">
          <Estado tipo={s.usuarioRol === "voluntario" ? "indigo" : "neutro"}>{s.usuarioRol}</Estado>
          <Estado tipo={tonoDocumento[s.usuarioEstadoValidacion] ?? "neutro"}>
            {s.usuarioEstadoValidacion}
          </Estado>
          <span className="tenue" style={{ fontSize: 13 }}>
            Registro:{" "}
            {new Date(s.usuarioFechaCreacion).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </header>

      {s.usuarioMotivoRechazo && (
        <p className="ficha__motivo">
          <strong>Motivo del rechazo anterior:</strong> {s.usuarioMotivoRechazo}
        </p>
      )}

      <div className="ficha__docs">
        {s.requeridos.map((r) => (
          <Requisito key={r.tipo} requerido={r} documento={porTipo.get(r.tipo) ?? null} />
        ))}
      </div>

      {!s.listaParaRevision && (
        <p className="ficha__aviso">
          Faltan documentos por subir. La persona ya los tiene pedidos en su aplicación.
        </p>
      )}

      {rechazando ? (
        <div className="ficha__rechazo">
          <label className="campo" htmlFor={`motivo-${s.usuarioId}`}>
            Motivo del rechazo (lo lee la persona en su aplicación)
          </label>
          <textarea
            id={`motivo-${s.usuarioId}`}
            className="input"
            rows={3}
            value={motivo}
            maxLength={500}
            placeholder="Por ejemplo: la foto de la credencial está cortada, vuelve a subirla completa."
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="ficha__acciones">
            <button
              type="button"
              className="btn btn-critico btn-sm"
              disabled={ocupado || motivo.trim().length < 5}
              onClick={() => onRechazar(motivo.trim())}
            >
              <X size={16} aria-hidden="true" />
              Confirmar rechazo
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setRechazando(false)}>
              Volver
            </button>
          </div>
        </div>
      ) : (
        <div className="ficha__acciones">
          <button
            type="button"
            className="btn btn-primario btn-sm"
            disabled={ocupado || !s.listaParaRevision || s.usuarioEstadoValidacion === "aprobado"}
            onClick={onAprobar}
          >
            <BadgeCheck size={16} aria-hidden="true" />
            {s.usuarioEstadoValidacion === "aprobado" ? "Cuenta aprobada" : "Aprobar cuenta"}
          </button>
          {s.usuarioEstadoValidacion !== "rechazado" && (
            <button
              type="button"
              className="btn btn-critico btn-sm"
              disabled={ocupado}
              onClick={() => setRechazando(true)}
            >
              <X size={16} aria-hidden="true" />
              Rechazar
            </button>
          )}
          {!pendiente && <span className="tenue" style={{ fontSize: 14 }}>Ya resuelta</span>}
        </div>
      )}

      <style>{`
        .ficha{display:grid;gap:16px}
        .ficha__cabecera{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
        .ficha__avatar{
          flex:none;width:46px;height:46px;border-radius:50%;
          background:var(--lavanda);color:var(--indigo);
          display:grid;place-items:center;font-weight:600;
        }
        .ficha__quien{flex:1;min-width:14rem}
        .ficha__nombre{font-size:18px;font-weight:600;line-height:1.3}
        .ficha__estados{display:grid;gap:6px;justify-items:end;text-align:right}
        .ficha__motivo{
          background:var(--coral-bg);border-left:3px solid var(--coral);
          border-radius:var(--r-sm);padding:12px 14px;font-size:15px;line-height:1.5;
        }
        .ficha__docs{display:grid;gap:12px}
        .ficha__aviso{font-size:14px;color:var(--ink-2)}
        .ficha__acciones{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .ficha__rechazo{display:grid;gap:10px}
        .ficha__rechazo textarea{resize:vertical;font:inherit}
      `}</style>
    </article>
  );
}

/* -------------------------------------------------- Requisito + visor */

function Requisito({ requerido, documento }: { requerido: Requerido; documento: Documento | null }) {
  const esImagen = documento?.documentoMime.startsWith("image/") ?? false;

  return (
    <div className="req">
      <span className="req__icono" aria-hidden="true">
        {esImagen ? <ImageIcon size={20} /> : <FileText size={20} />}
      </span>
      <div className="req__texto">
        <strong className="req__titulo">{requerido.titulo}</strong>
        {documento ? (
          <p className="tenue" style={{ fontSize: 14 }}>
            {documento.documentoNombreOriginal} · {kb(documento.documentoTamano)} ·{" "}
            {new Date(documento.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
          </p>
        ) : (
          <p className="tenue" style={{ fontSize: 14 }}>{requerido.descripcion}</p>
        )}
        {documento?.documentoObservacion && (
          <p className="tenue" style={{ fontSize: 14 }}>Nota: {documento.documentoObservacion}</p>
        )}
      </div>
      {documento ? (
        <div className="req__lado">
          <Estado tipo={tonoDocumento[documento.documentoEstado] ?? "neutro"}>
            {documento.documentoEstado}
          </Estado>
          <VisorDocumento documento={documento} />
        </div>
      ) : (
        <Estado tipo="neutro">Sin subir</Estado>
      )}

      <style>{`
        .req{
          display:flex;gap:12px;align-items:flex-start;
          border:1px solid var(--line);border-radius:var(--r);padding:14px;
        }
        .req__icono{
          flex:none;width:40px;height:40px;border-radius:var(--r-sm);
          background:var(--surface-2);color:var(--ink-2);display:grid;place-items:center;
        }
        .req__texto{flex:1;min-width:12rem;display:grid;gap:3px}
        .req__titulo{font-size:15px;font-weight:600}
        .req__lado{display:grid;gap:8px;justify-items:end}
      `}</style>
    </div>
  );
}

/**
 * Previsualiza el documento. El binario está protegido por Bearer token, así
 * que no puede ir en un `src` directo: se pide con fetch y se muestra como
 * object URL, que se libera al desmontar.
 */
function VisorDocumento({ documento }: { documento: Documento }) {
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");
  const [fallo, setFallo] = useState("");
  const urlRef = useRef("");

  const esImagen = documento.documentoMime.startsWith("image/");

  const liberar = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
  }, []);

  useEffect(() => liberar, [liberar]);

  async function abrir() {
    if (abierto) {
      setAbierto(false);
      return;
    }
    setAbierto(true);
    if (url) return;
    try {
      const nueva = await apiBlobUrl(`/documentos/${documento.documentoId}/archivo`);
      urlRef.current = nueva;
      setUrl(nueva);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo abrir el documento");
    }
  }

  return (
    <div className="visor">
      <button type="button" className="btn btn-secundario btn-sm" onClick={abrir} aria-expanded={abierto}>
        <ExternalLink size={15} aria-hidden="true" />
        {abierto ? "Ocultar" : "Ver documento"}
      </button>

      {abierto && (
        <div className="visor__cuerpo">
          {fallo ? (
            <p className="tenue">{fallo}</p>
          ) : !url ? (
            <p className="tenue">Abriendo…</p>
          ) : esImagen ? (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`Documento: ${documento.documentoNombreOriginal}`} />
            </a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-fantasma btn-sm">
              <FileText size={15} aria-hidden="true" />
              Abrir PDF en una pestaña
            </a>
          )}
        </div>
      )}

      <style>{`
        .visor{display:grid;gap:8px;justify-items:end}
        .visor__cuerpo{
          border:1px solid var(--line);border-radius:var(--r-sm);
          padding:10px;background:var(--surface-2);max-width:22rem;
        }
        .visor__cuerpo img{max-width:100%;border-radius:var(--r-sm);display:block}
      `}</style>
    </div>
  );
}
