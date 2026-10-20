/**
 * Lista de espera · panel de administración.
 *
 * Gente que dejó su contacto en la web porque Miparner todavía no está en su
 * comuna o no hay cupos de voluntariado. Aquí el equipo las contacta y marca
 * en qué quedó cada conversación.
 *
 * El desglose por comuna es lo más útil de la pantalla: dice dónde hay demanda
 * real y, por tanto, a qué comuna conviene llevar el servicio después.
 */
import { useState } from "react";
import { Check, Inbox, Mail, MapPin, Phone, X } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { ErrorMsg, Loader, PageHeader } from "../../components/layout/PageHeader";
import { Estado, StatCard, Vacio, type ClaseEstado } from "../../components/ui";

interface Fila {
  esperaId: number;
  esperaNombre: string;
  esperaCorreo: string;
  esperaTelefono: string | null;
  esperaComuna: string | null;
  esperaInteres: string;
  esperaMensaje: string | null;
  esperaEstado: string;
  esperaNota: string | null;
  esperaContactadoAt: string | null;
  createdAt: string;
}

interface Resumen {
  total: number;
  porEstado: Record<string, number>;
  porInteres: Record<string, number>;
  porComuna: { comuna: string; n: number }[];
}

type Filtro = "" | "nuevo" | "contactado" | "convertido" | "descartado";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "", label: "Todos" },
  { valor: "nuevo", label: "Sin contactar" },
  { valor: "contactado", label: "Contactados" },
  { valor: "convertido", label: "Ya usan Miparner" },
  { valor: "descartado", label: "Descartados" },
];

const tonoEstado: Record<string, ClaseEstado> = {
  nuevo: "atencion",
  contactado: "indigo",
  convertido: "exito",
  descartado: "neutro",
};

const ETIQUETA_INTERES: Record<string, string> = {
  deportista: "Busca acompañamiento",
  voluntario: "Quiere acompañar",
  organizacion: "Organización",
  otro: "Otro",
};

export function ListaEsperaAdmin() {
  const [filtro, setFiltro] = useState<Filtro>("nuevo");
  const { data, loading, error, reload } = useFetch<Fila[]>(
    `/admin/lista-espera${filtro ? `?estado=${filtro}` : ""}`,
  );
  const resumen = useFetch<Resumen>("/admin/lista-espera/resumen");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [fallo, setFallo] = useState("");

  const filas = data ?? [];

  async function marcar(id: number, estado: string) {
    setOcupado(id);
    setFallo("");
    try {
      await api(`/admin/lista-espera/${id}`, { method: "PATCH", body: { estado } });
      reload();
      resumen.reload();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setOcupado(null);
    }
  }

  const r = resumen.data;

  return (
    <>
      <PageHeader
        title="Lista de espera"
        subtitle={
          r
            ? `${r.total} ${r.total === 1 ? "persona interesada" : "personas interesadas"}`
            : "Personas que dejaron su contacto en la web"
        }
      />

      {r && (
        <div className="rejilla-metricas">
          <StatCard
            icon={Inbox}
            value={r.porEstado.nuevo ?? 0}
            label="Sin contactar"
            tono={(r.porEstado.nuevo ?? 0) > 0 ? "coral" : "neutro"}
          />
          <StatCard icon={Mail} value={r.porEstado.contactado ?? 0} label="Contactados" tono="indigo" />
          <StatCard icon={Check} value={r.porEstado.convertido ?? 0} label="Ya usan Miparner" tono="exito" />
          <StatCard icon={MapPin} value={r.porComuna.length} label="Comunas distintas" tono="neutro" />
        </div>
      )}

      {/* Dónde hay demanda: la señal más accionable de esta pantalla. */}
      {r && r.porComuna.length > 0 && (
        <div className="card comunas">
          <h2 className="comunas__titulo">Dónde está la demanda</h2>
          <p className="tenue comunas__sub">
            Comunas con más personas esperando. Útil para decidir dónde abrir el servicio.
          </p>
          <ol className="comunas__lista">
            {r.porComuna.map((c) => (
              <li key={c.comuna}>
                <span>{c.comuna}</span>
                <strong className="num">{c.n}</strong>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="filtros" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button
            key={f.valor || "todos"}
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
        <Loader texto="Cargando la lista…" />
      ) : error ? (
        <ErrorMsg msg={error} />
      ) : filas.length === 0 ? (
        <div className="card">
          <Vacio
            icon={Inbox}
            titulo={filtro === "nuevo" ? "Nadie esperando respuesta" : "Sin resultados"}
            detalle={
              filtro === "nuevo"
                ? "Cuando alguien deje su contacto en la web, aparecerá aquí."
                : undefined
            }
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <caption className="solo-lectores">
              Personas en lista de espera, con su contacto, interés y estado de la gestión
            </caption>
            <thead>
              <tr>
                <th scope="col">Persona</th>
                <th scope="col">Contacto</th>
                <th scope="col">Comuna</th>
                <th scope="col">Interés</th>
                <th scope="col">Estado</th>
                <th scope="col" style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.esperaId}>
                  <td>
                    <strong>{p.esperaNombre}</strong>
                    {p.esperaMensaje && (
                      <p className="tenue" style={{ fontSize: 14, marginTop: 4, maxWidth: "34ch" }}>
                        “{p.esperaMensaje}”
                      </p>
                    )}
                  </td>
                  <td className="sutil" style={{ fontSize: 14 }}>
                    <a href={`mailto:${p.esperaCorreo}`}>{p.esperaCorreo}</a>
                    {p.esperaTelefono && (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 3 }}>
                        <Phone size={13} aria-hidden="true" />
                        <a href={`tel:${p.esperaTelefono}`}>{p.esperaTelefono}</a>
                      </div>
                    )}
                  </td>
                  <td>{p.esperaComuna ?? <span className="tenue">No dijo</span>}</td>
                  <td style={{ fontSize: 14 }}>
                    {ETIQUETA_INTERES[p.esperaInteres] ?? p.esperaInteres}
                  </td>
                  <td>
                    <Estado tipo={tonoEstado[p.esperaEstado] ?? "neutro"}>{p.esperaEstado}</Estado>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.esperaEstado === "nuevo" && (
                      <button
                        className="btn btn-secundario btn-sm"
                        disabled={ocupado === p.esperaId}
                        style={{ marginRight: 7 }}
                        onClick={() => marcar(p.esperaId, "contactado")}
                      >
                        <Mail size={15} aria-hidden="true" />
                        Marcar contactado
                      </button>
                    )}
                    {p.esperaEstado === "contactado" && (
                      <button
                        className="btn btn-secundario btn-sm"
                        disabled={ocupado === p.esperaId}
                        style={{ marginRight: 7 }}
                        onClick={() => marcar(p.esperaId, "convertido")}
                      >
                        <Check size={15} aria-hidden="true" />
                        Ya usa Miparner
                      </button>
                    )}
                    {p.esperaEstado !== "descartado" && (
                      <button
                        className="btn btn-fantasma btn-sm"
                        disabled={ocupado === p.esperaId}
                        onClick={() => marcar(p.esperaId, "descartado")}
                      >
                        <X size={15} aria-hidden="true" />
                        Descartar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="tenue" style={{ marginTop: 14 }}>
        Estas personas autorizaron que les escribiéramos sobre Miparner, y solo para eso.
        Si alguien pide que borremos sus datos, descártalo y elimina la fila.
      </p>

      <style>{`
        .rejilla-metricas{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));
          gap:16px;margin-bottom:22px;
        }
        .comunas{margin-bottom:22px}
        .comunas__titulo{font-size:17px;font-weight:600}
        .comunas__sub{margin-top:3px;margin-bottom:14px;font-size:14px}
        .comunas__lista{display:grid;gap:0;list-style:none;margin:0;padding:0}
        .comunas__lista li{
          display:flex;justify-content:space-between;gap:16px;
          padding:9px 0;border-bottom:1px solid var(--line-2);font-size:15px;
        }
        .comunas__lista li:last-child{border-bottom:0;padding-bottom:0}
        .filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
      `}</style>
    </>
  );
}
