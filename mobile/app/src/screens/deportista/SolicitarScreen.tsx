/**
 * Pedir un acompañamiento.
 *
 * Dos cosas que cambiaron tras las primeras pruebas con usuarios:
 *
 *  · El destino era una lista de tres direcciones escritas en el código. Quien
 *    entrenaba en cualquier otro sitio no podía pedir nada. Ahora se escribe y
 *    el buscador propone direcciones reales, con el mapa siguiendo lo elegido.
 *  · Todo era inmediato, y por eso el voluntario no veía día ni hora al
 *    aceptar: el "cuándo" era siempre ahora. Ahora se puede agendar, y quien
 *    tiene una urgencia sigue teniendo "lo antes posible" a un toque.
 *
 * El mapa y el buscador son dos caminos al mismo sitio, no alternativas
 * excluyentes: se escribe la dirección y el mapa la muestra, o se toca el mapa
 * y el campo dice qué se marcó. Quien no puede escribir una dirección exacta
 * puede señalarla, y quien no ve el mapa puede escribirla.
 */
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LocateFixed, MapPin, Send } from "lucide-react-native";
import { colors, font, fuente, radius } from "../../../../shared/theme";
import { api, apiUpload } from "../../../../shared/api";
import { GrabadorVoz, type GrabacionVoz } from "../../../../shared/GrabadorVoz";
import { archivoVoz } from "../../../../shared/voz";
import { Mapa } from "../../../../shared/Mapa";
import { MAPA_CENTRO_DEFECTO } from "../../../../shared/config";
import { useMiUbicacion } from "../../../../shared/ubicacion";
import { BuscadorDireccion, PistaBuscar, type Lugar } from "../../../../shared/BuscadorDireccion";
import { CuandoLoQuiero, type Cuando } from "../../../../shared/CuandoLoQuiero";
import { anunciar } from "../../../../shared/anuncios";
import { Card, Etiqueta, Pill, PrimaryButton, Screen } from "../../../../shared/ui";
import type { LatLng, Viaje } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

/** Si el GPS no responde (permiso denegado, interior sin señal), se parte de aquí. */
const ORIGEN_RESPALDO = { ...MAPA_CENTRO_DEFECTO, texto: "Centro de Santiago" };

const NECESIDADES = [
  { key: "silla_ruedas", label: "Silla de ruedas" },
  { key: "guia_visual", label: "Guía visual" },
  { key: "rampa", label: "Rampa" },
  { key: "acompanante", label: "Acompañante" },
];

const MAX_COMENTARIO = 1000;

interface Punto extends LatLng {
  texto: string;
}

export function SolicitarScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [destino, setDestino] = useState<Punto | null>(null);
  const [necesidades, setNecesidades] = useState<string[]>(["silla_ruedas"]);
  const [comentario, setComentario] = useState("");
  const [notaVoz, setNotaVoz] = useState<GrabacionVoz | null>(null);
  const [cuando, setCuando] = useState<Cuando>(null);
  const [busy, setBusy] = useState(false);
  /** Origen movido a mano sobre el mapa; mientras sea null, manda el GPS. */
  const [origenManual, setOrigenManual] = useState<Punto | null>(null);
  /** Qué mueve el próximo toque en el mapa. */
  const [moviendo, setMoviendo] = useState<"origen" | "destino">("destino");

  const { punto: gps, error: errorGps } = useMiUbicacion(true, 25);

  const origen: Punto = origenManual ?? (gps
    ? { lat: gps.lat, lng: gps.lng, texto: "Tu ubicación actual" }
    : ORIGEN_RESPALDO);

  const toggle = (k: string) =>
    setNecesidades((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  function elegirEnMapa(p: LatLng) {
    const punto = { ...p, texto: "Punto marcado en el mapa" };
    if (moviendo === "origen") {
      setOrigenManual(punto);
      void anunciar("Origen marcado en el mapa.");
    } else {
      setDestino(punto);
      void anunciar("Destino marcado en el mapa.");
    }
  }

  function elegirDestinoBuscado(l: Lugar) {
    setDestino({ lat: l.lat, lng: l.lng, texto: l.nombre });
  }

  function elegirOrigenBuscado(l: Lugar) {
    setOrigenManual({ lat: l.lat, lng: l.lng, texto: l.nombre });
  }

  const puedePedir = !!destino && !busy;

  async function solicitar() {
    if (!destino) return;
    setBusy(true);
    try {
      const viaje = await api<Viaje>("/viajes", {
        method: "POST",
        body: {
          origen: { lat: origen.lat, lng: origen.lng },
          destino: { lat: destino.lat, lng: destino.lng },
          origenTexto: origen.texto,
          destinoTexto: destino.texto,
          necesidades,
          comentario: comentario.trim() || undefined,
          // Ausente significa "lo antes posible".
          programadoAt: cuando ? cuando.toISOString() : undefined,
        },
      });
      // La nota de voz es opcional y va aparte: el viaje ya existe, así que si
      // la subida falla la solicitud igual queda hecha (con su texto).
      if (notaVoz) {
        try {
          await apiUpload(
            `/viajes/${viaje.viajeId}/comentario-voz`,
            archivoVoz(notaVoz.uri),
            { duracion: String(notaVoz.duracion) },
            "audio",
          );
        } catch {
          /* la solicitud ya está creada; la nota de voz es un extra */
        }
      }
      nav.replace("EnViaje", { viajeId: viaje.viajeId });
    } catch (e) {
      Alert.alert("No se pudo solicitar", e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Mapa
        alto={220}
        origen={origen}
        destino={destino}
        miUbicacion
        interactivo
        onElegirPunto={elegirEnMapa}
        descripcion={
          destino
            ? `Recorrido de ${origen.texto} a ${destino.texto}.`
            : `Tu origen es ${origen.texto}. Todavía no elegiste destino.`
        }
      />

      {/* Qué mueve el toque en el mapa: sin esto, el gesto es ambiguo. */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Pill label="Mover origen" active={moviendo === "origen"} onPress={() => setMoviendo("origen")} />
        <Pill label="Mover destino" active={moviendo === "destino"} onPress={() => setMoviendo("destino")} />
      </View>
      <PistaBuscar />

      {/* ------------------------------------------------------- Origen */}
      <Card style={{ marginTop: 16, gap: 12 }}>
        <View style={styles.cabecera}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.lavanda }]}>
            {origenManual ? (
              <MapPin color={colors.indigo} size={19} />
            ) : (
              <LocateFixed color={colors.indigo} size={19} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Desde</Etiqueta>
            <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>
              {origen.texto}
            </Text>
            {origenManual ? (
              <Text
                style={[font.tiny, { color: colors.indigo }]}
                onPress={() => setOrigenManual(null)}
                accessibilityRole="button"
                accessibilityLabel="Volver a mi ubicación actual"
              >
                Volver a mi ubicación actual
              </Text>
            ) : errorGps ? (
              <Text style={font.tiny}>{errorGps}</Text>
            ) : !gps ? (
              <Text style={font.tiny}>Buscando tu ubicación…</Text>
            ) : null}
          </View>
        </View>

        <BuscadorDireccion
          label="O escribe desde dónde sales"
          valor={origenManual?.texto ?? ""}
          onElegir={elegirOrigenBuscado}
          cerca={gps}
        />
      </Card>

      {/* ------------------------------------------------------ Destino */}
      <Card style={{ marginTop: 12, gap: 12 }}>
        <View style={styles.cabecera}>
          <View style={[styles.puntoIcono, { backgroundColor: colors.coralBg }]}>
            <MapPin color={colors.coral} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Etiqueta>Hasta</Etiqueta>
            <Text style={[font.body, { fontFamily: fuente.fuerte, marginTop: 2 }]}>
              {destino?.texto ?? "Todavía sin elegir"}
            </Text>
          </View>
        </View>

        <BuscadorDireccion
          label="¿A dónde vas?"
          ayuda="Escribe la calle y el número, o el nombre del lugar."
          valor={destino?.texto ?? ""}
          onElegir={elegirDestinoBuscado}
          cerca={gps}
          obligatorio
        />
      </Card>

      {/* ------------------------------------------------------- Cuándo */}
      <View style={{ marginTop: 22 }}>
        <CuandoLoQuiero valor={cuando} onCambiar={setCuando} />
      </View>

      {/* ------------------------------------------------------- Apoyos */}
      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Apoyo que necesito</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {NECESIDADES.map((n) => (
          <Pill key={n.key} label={n.label} active={necesidades.includes(n.key)} onPress={() => toggle(n.key)} />
        ))}
      </View>

      {/*
        Las etiquetas de arriba nunca cubren todos los casos. Este campo libre
        es lo que el voluntario lee antes de aceptar, así que va con la
        solicitud y no en un mensaje posterior.
      */}
      <Etiqueta style={{ marginTop: 22, marginBottom: 8 }}>Cuéntanos qué necesitas</Etiqueta>
      <TextInput
        style={styles.comentario}
        value={comentario}
        onChangeText={setComentario}
        placeholder="Por ejemplo: voy con silla plegable y necesito ayuda para subirla al auto. El portón de mi edificio es el de Los Leones."
        placeholderTextColor={colors.ink3}
        multiline
        maxLength={MAX_COMENTARIO}
        accessibilityLabel="Comentario sobre lo que necesitas"
      />
      <Text style={[font.tiny, { marginTop: 6 }]}>
        Opcional. Lo lee el voluntario antes de aceptar. {comentario.length}/{MAX_COMENTARIO}
      </Text>

      {/* Alternativa a escribir: contarlo con la voz. El voluntario la escucha
          antes de aceptar, igual que el texto. */}
      <Text style={[font.tiny, { marginTop: 14, marginBottom: 8 }]}>
        O cuéntalo con tu voz:
      </Text>
      <GrabadorVoz value={notaVoz} onChange={setNotaVoz} disabled={busy} />

      <View style={{ height: 28 }} />
      {!destino && (
        <Text style={[font.muted, { marginBottom: 10 }]}>
          Falta elegir a dónde vas: escríbelo arriba o tócalo en el mapa.
        </Text>
      )}
      <PrimaryButton
        title={busy ? "Enviando tu solicitud…" : cuando ? "Agendar acompañamiento" : "Buscar voluntario ahora"}
        icon={<Send color={colors.white} size={18} />}
        disabled={!puedePedir}
        onPress={solicitar}
      />
      <View style={{ height: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  puntoIcono: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  comentario: {
    minHeight: 104,
    textAlignVertical: "top",
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
});
