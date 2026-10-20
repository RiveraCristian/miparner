/**
 * Buscador de direcciones.
 *
 * Sustituye a la lista de destinos fijos que venía escrita en el código: con
 * tres opciones, quien entrenaba en cualquier otro sitio no podía pedir nada.
 *
 * Cómo se comporta, y por qué:
 *
 *  · Se busca al dejar de escribir, no en cada tecla. Medio segundo de pausa
 *    basta para distinguir "escribiendo" de "terminé", y evita lanzar ocho
 *    consultas para una sola dirección.
 *  · Los resultados se sesgan hacia dónde está la persona: escribir "estadio"
 *    en Santiago debe proponer el de Santiago, no uno de Arica.
 *  · Si el buscador no responde, se dice y se ofrece marcar el punto en el
 *    mapa. Quedarse sin buscador no puede dejar a nadie sin pedir ayuda.
 *
 * Accesibilidad: el campo tiene etiqueta visible, la lista se anuncia cuando
 * llegan resultados —quien no ve la pantalla no sabría que aparecieron— y cada
 * sugerencia es un botón con su dirección completa como etiqueta.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MapPin, Search, X } from "lucide-react-native";
import { api } from "./api";
import { anunciar } from "./anuncios";
import { colors, elevacion, font, fuente, radius, TOQUE_MIN } from "./theme";
import { CampoTexto } from "./ui";
import type { LatLng } from "./types";

export interface Lugar {
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  tipo: string | null;
}

/** Pausa tras la última tecla antes de consultar. */
const ESPERA_MS = 500;
const MINIMO_LETRAS = 3;

interface Props {
  label: string;
  ayuda?: string;
  /** Lo que hay elegido ahora, para mostrarlo en el campo. */
  valor: string;
  onElegir: (lugar: Lugar) => void;
  /** Dónde está la persona, para sesgar los resultados. */
  cerca?: LatLng | null;
  obligatorio?: boolean;
}

export function BuscadorDireccion({ label, ayuda, valor, onElegir, cerca, obligatorio }: Props) {
  const [texto, setTexto] = useState(valor);
  const [resultados, setResultados] = useState<Lugar[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  /** Al elegir una sugerencia no debe dispararse otra búsqueda con ese texto. */
  const recienElegido = useRef(false);

  // El valor puede cambiar desde fuera (por ejemplo, al marcar en el mapa).
  useEffect(() => {
    if (valor !== texto) {
      recienElegido.current = true;
      setTexto(valor);
      setResultados(null);
    }
    // Solo cuando cambia el valor externo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const buscar = useCallback(
    async (q: string) => {
      setBuscando(true);
      setError("");
      try {
        const params = new URLSearchParams({ q });
        if (cerca) {
          params.set("lat", String(cerca.lat));
          params.set("lng", String(cerca.lng));
        }
        const r = await api<Lugar[]>(`/geo/buscar?${params}`);
        setResultados(r);
        // Quien no ve la pantalla no sabe que aparecieron sugerencias.
        void anunciar(
          r.length
            ? `${r.length} ${r.length === 1 ? "dirección encontrada" : "direcciones encontradas"}.`
            : "No encontramos esa dirección.",
        );
      } catch (e) {
        setResultados(null);
        setError(
          e instanceof Error && e.message
            ? e.message
            : "No pudimos buscar. Puedes marcar el punto en el mapa.",
        );
      } finally {
        setBuscando(false);
      }
    },
    [cerca],
  );

  // Buscar al dejar de escribir.
  useEffect(() => {
    if (recienElegido.current) {
      recienElegido.current = false;
      return;
    }
    const q = texto.trim();
    if (q.length < MINIMO_LETRAS) {
      setResultados(null);
      setError("");
      return;
    }
    const t = setTimeout(() => void buscar(q), ESPERA_MS);
    return () => clearTimeout(t);
  }, [texto, buscar]);

  function elegir(l: Lugar) {
    recienElegido.current = true;
    setTexto(l.nombre);
    setResultados(null);
    onElegir(l);
    void anunciar(`Elegiste ${l.nombre}.`);
  }

  return (
    <View style={{ gap: 6 }}>
      <CampoTexto
        label={label}
        ayuda={ayuda}
        value={texto}
        onChangeText={setTexto}
        placeholder="Escribe una calle, un lugar o una dirección"
        obligatorio={obligatorio}
        autoCorrect={false}
      />

      {buscando && (
        <View style={styles.cargando}>
          <ActivityIndicator size="small" color={colors.indigo} />
          <Text style={font.tiny}>Buscando…</Text>
        </View>
      )}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={[font.tiny, { color: colors.ink, flex: 1 }]}>{error}</Text>
        </View>
      ) : null}

      {resultados !== null && !buscando && (
        <View style={styles.lista}>
          {resultados.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={font.muted}>
                No encontramos esa dirección. Prueba con otras palabras o marca el punto en el
                mapa.
              </Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 230 }}>
              {resultados.map((l, i) => (
                <Pressable
                  key={`${l.lat},${l.lng},${i}`}
                  onPress={() => elegir(l)}
                  accessibilityRole="button"
                  accessibilityLabel={l.nombre}
                  accessibilityHint={l.direccion}
                  style={({ pressed }) => [
                    styles.fila,
                    i === resultados.length - 1 && { borderBottomWidth: 0 },
                    pressed && { backgroundColor: colors.lavanda },
                  ]}
                >
                  <View style={styles.filaIcono}>
                    <MapPin color={colors.indigo} size={17} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font.body, { fontFamily: fuente.fuerte }]} numberOfLines={1}>
                      {l.nombre}
                    </Text>
                    <Text style={font.tiny} numberOfLines={2}>
                      {l.direccion}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {texto.length > 0 && resultados === null && !buscando && (
        <Pressable
          onPress={() => {
            setTexto("");
            setResultados(null);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Borrar ${label.toLowerCase()}`}
          style={styles.limpiar}
        >
          <X color={colors.ink3} size={14} />
          <Text style={font.tiny}>Borrar</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Pista de que se puede buscar, para usar junto al mapa. */
export function PistaBuscar() {
  return (
    <View style={styles.pista}>
      <Search color={colors.ink4} size={14} />
      <Text style={font.tiny}>
        Escribe la dirección, o toca el mapa para marcar el punto exacto.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cargando: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  lista: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...elevacion.suave,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    minHeight: TOQUE_MIN,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  filaIcono: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  vacio: { padding: 14 },
  // Coral como forma: la barra. El texto va en tinta.
  error: {
    backgroundColor: colors.coralBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    borderRadius: radius.sm,
    padding: 11,
  },
  limpiar: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 4 },
  pista: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 2 },
});
