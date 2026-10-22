/**
 * Cola de reportes de audio inapropiado.
 *
 * Los usuarios denuncian un mensaje de voz del chat o la nota de voz de una
 * solicitud. El equipo revisa aquí: escucha el audio (binario protegido por
 * Bearer, se pide con apiBlobUrl) y decide "retirar" el audio (se borra y la
 * app muestra "audio retirado") o "desestimar" el reporte.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Play, VolumeX } from "lucide-react";
import { api, apiBlobUrl } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useToast } from "../../lib/toast";
import { ErrorMsg, PageHeader } from "../../components/layout/PageHeader";
import { Estado, SkeletonTabla, Vacio, type ClaseEstado } from "../../components/ui";

interface Persona {
  usuarioId: number;
  usuarioNombre: string;
  usuarioRol: string;
}

interface ReporteRow {
  reporteId: number;
  origen: "mensaje" | "solicitud";
  estado: string;
  motivo: string | null;
  resolucion: string | null;
  resueltoAt: string | null;
  createdAt: string;
  viajeId: number | null;
  reportante: Persona;
  autor: Persona | null;
  duracion: number | null;
  audioUrl: string | null;
  audioDisponible: boolean;
  moderadoAt: string | null;
}

type Filtro = "pendiente" | "retirado" | "desestimado";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "pendiente", label: "Pendientes" },
  { valor: "retirado", label: "Retirados" },
  { valor: "desestimado", label: "Desestimados" },
];

const tonoEstado: Record<string, ClaseEstado> = {
  pendiente: "critico",
  retirado: "exito",
  desestimado: "neutro",
};

const mmss = (secs: number | null) => {
  const s = Math.max(0, Math.floor(secs ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function Reportes() {
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const { data, loading, error, reload } = useFetch<ReporteRow[]>(`/admin/reportes?estado=${filtro}`);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const toast = useToast();

  async function resolver(id: number, accion: "retirar" | "desestimar") {
    setOcupado(id);
    try {
      await api(`/admin/reportes/${id}`, { method: "PATCH", body: { accion } });
      reload();
      toast.exito(
        accion === "retirar"
          ? `Audio del reporte #${id} retirado.`
          : `Reporte #${id} desestimado.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo resolver el reporte.");
    } finally {
      setOcupado(null);
    }
  }

  if (loading) return <SkeletonTabla />;
  if (error) return <ErrorMsg msg={error} />;

  const filas = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Moderación"
        title="Reportes de audio"
        subtitle={
          filtro === "pendiente"
            ? `${filas.length} ${filas.length === 1 ? "reporte por revisar" : "reportes por revisar"}`
            : `${filas.length} en este estado`
        }
      />

      <div className="filtros" role="group" aria-label="Filtrar reportes por estado">
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

      {filas.length === 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <Vacio
            icon={Flag}
            titulo={filtro === "pendiente" ? "No hay reportes por revisar" : "Sin reportes en este estado"}
            detalle={
              filtro === "pendiente"
                ? "Cuando alguien denuncie un audio por lenguaje inapropiado, aparecerá aquí para que lo revises."
                : "Prueba con otro filtro para ver los reportes ya resueltos."
            }
          />
        </div>
      ) : (
        <div className="reportes">
          {filas.map((r) => (
            <article key={r.reporteId} className="card reporte">
              <div className="reporte__cab">
                <div>
                  <span className="reporte__id">Reporte #{r.reporteId}</span>
                  <span className="reporte__origen">
                    {r.origen === "mensaje" ? "Mensaje de voz del chat" : "Nota de voz de la solicitud"}
                    {r.viajeId ? ` · Acompañamiento #${r.viajeId}` : ""}
                  </span>
                </div>
                <Estado tipo={tonoEstado[r.estado] ?? "neutro"}>{r.estado}</Estado>
              </div>

              <dl className="reporte__datos">
                <div>
                  <dt>Audio de</dt>
                  <dd>{r.autor ? r.autor.usuarioNombre : <span className="tenue">Desconocido</span>}</dd>
                </div>
                <div>
                  <dt>Reportado por</dt>
                  <dd>{r.reportante.usuarioNombre}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd className="sutil">{fecha(r.createdAt)}</dd>
                </div>
                <div>
                  <dt>Duración</dt>
                  <dd className="sutil">{r.duracion ? mmss(r.duracion) : "—"}</dd>
                </div>
              </dl>

              {r.motivo ? <p className="reporte__motivo">“{r.motivo}”</p> : null}

              <ReproductorAudio url={r.audioUrl} disponible={r.audioDisponible} />

              {r.resolucion ? <p className="tenue reporte__resolucion">Nota: {r.resolucion}</p> : null}

              {r.estado === "pendiente" ? (
                <div className="reporte__acciones">
                  <button
                    className="btn btn-primario btn-sm"
                    disabled={ocupado === r.reporteId}
                    onClick={() => resolver(r.reporteId, "retirar")}
                  >
                    Retirar audio
                  </button>
                  <button
                    className="btn btn-fantasma btn-sm"
                    disabled={ocupado === r.reporteId}
                    onClick={() => resolver(r.reporteId, "desestimar")}
                  >
                    Desestimar
                  </button>
                </div>
              ) : (
                <p className="tenue" style={{ margin: 0 }}>
                  Resuelto{r.resueltoAt ? ` · ${fecha(r.resueltoAt)}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <style>{`
        .filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
        .reportes{display:flex;flex-direction:column;gap:16px}
        .reporte{display:flex;flex-direction:column;gap:14px}
        .reporte__cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .reporte__id{display:block;font-weight:700}
        .reporte__origen{display:block;font-size:14px;color:var(--muted)}
        .reporte__datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 20px;margin:0}
        .reporte__datos dt{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
        .reporte__datos dd{margin:2px 0 0;font-weight:600}
        .reporte__motivo{margin:0;font-style:italic}
        .reporte__resolucion{margin:0}
        .reporte__acciones{display:flex;gap:10px;flex-wrap:wrap}
        .reporte__retirado{display:flex;align-items:center;gap:8px;margin:0;color:var(--muted);font-style:italic}
      `}</style>
    </>
  );
}

/**
 * Reproductor del audio reportado. El binario está protegido por Bearer, así
 * que no puede ir en un `src` directo: se pide con apiBlobUrl y se reproduce
 * como object URL, que se libera al desmontar. Si ya se retiró, se avisa.
 */
function ReproductorAudio({ url, disponible }: { url: string | null; disponible: boolean }) {
  const [src, setSrc] = useState("");
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState("");
  const urlRef = useRef("");

  const liberar = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = "";
    }
  }, []);

  useEffect(() => liberar, [liberar]);

  if (!disponible || !url) {
    return (
      <p className="reporte__retirado">
        <VolumeX size={16} aria-hidden="true" />
        Audio retirado
      </p>
    );
  }

  async function cargar() {
    if (src || cargando) return;
    setCargando(true);
    try {
      const nueva = await apiBlobUrl(url!);
      urlRef.current = nueva;
      setSrc(nueva);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo cargar el audio");
    } finally {
      setCargando(false);
    }
  }

  if (src) {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio controls src={src} style={{ width: "100%", maxWidth: 360 }} />;
  }

  return (
    <div>
      <button type="button" className="btn btn-secundario btn-sm" onClick={cargar} disabled={cargando}>
        <Play size={15} aria-hidden="true" />
        {cargando ? "Cargando…" : "Escuchar audio"}
      </button>
      {fallo ? <p className="tenue" style={{ marginTop: 6 }}>{fallo}</p> : null}
    </div>
  );
}
