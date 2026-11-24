import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, MapPin, MessageSquare, Navigation, Plus } from "lucide-react-native";
import { colors, elevacion, font, fuente, radius, TOQUE_MIN } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { Logo } from "../../../../shared/brand/Logo";
import { useAuth } from "../../../../shared/auth";
import { AvisoValidacion } from "../../../../shared/Documentos";
import { FondoConstelacion } from "../../../../shared/FondoConstelacion";
import { Mapa } from "../../../../shared/Mapa";
import {
  CardLavanda,
  Estado,
  Etiqueta,
  GhostButton,
  PanelIndigo,
  PrimaryButton,
  Screen,
} from "../../../../shared/ui";
import type { DestinoFrecuente, NoLeidos } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

interface ViajeItem {
  viajeId: number;
  viajeEstado: string;
  viajeOrigenTexto: string | null;
  viajeDestinoTexto: string | null;
}

const ACTIVOS = ["solicitado", "asignado", "en_camino", "en_accion"];

export function InicioScreen() {
  const { user, aprobado } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [activo, setActivo] = useState<ViajeItem | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  /** null mientras carga o si falló: entonces la sección no se muestra. */
  const [destinos, setDestinos] = useState<DestinoFrecuente[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<ViajeItem[]>("/viajes")
        .then((vs) => setActivo(vs.find((v) => ACTIVOS.includes(v.viajeEstado)) ?? null))
        .catch(() => {});
      api<DestinoFrecuente[]>("/viajes/destinos-frecuentes")
        .then(setDestinos)
        .catch(() => setDestinos(null));
      api<NoLeidos>("/mensajes/no-leidos")
        .then((n) => setNoLeidos(n.total))
        .catch(() => {});
    }, []),
  );

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <Screen>
      {/* Hero de marca: saludo por hora sobre fondo azul con constelación. */}
      <PanelIndigo style={{ marginBottom: 20, overflow: "hidden" }}>
        <FondoConstelacion />
        {/* El logotipo estaba solo en el acceso: dentro de la app nada
            recordaba dónde estabas. Sobre índigo va en blanco. */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Logo alto={22} version="blanco" alt="Miparner" />
        </View>
        <Text style={{ color: colors.lav300, fontSize: 12, fontFamily: fuente.medio, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" }}>
          {saludo}
        </Text>
        <Text style={{ color: colors.white, fontSize: 26, fontFamily: fuente.fuerte, letterSpacing: -0.4, marginTop: 6, textAlign: "center" }}>
          {user?.nombre}
        </Text>
      </PanelIndigo>

      {/* Mientras el panel no valide la cuenta, esto explica qué falta. */}
      <AvisoValidacion onIr={() => nav.navigate("Documentos")} />

      {activo && (
        <CardLavanda style={{ marginBottom: 16 }}>
          <Estado text="Acompañamiento en curso" tipo="indigo" />
          <Text style={[font.h3, { marginTop: 10 }]} numberOfLines={1}>
            {activo.viajeDestinoTexto ?? "Destino"}
          </Text>
          <Text style={[font.muted, { marginBottom: 14 }]}>
            {activo.viajeEstado.replace(/_/g, " ")}
          </Text>
          <PrimaryButton
            title="Ver seguimiento"
            icon={<Navigation color={colors.white} size={18} />}
            onPress={() => nav.navigate("EnViaje", { viajeId: activo.viajeId })}
          />
          <View style={{ height: 10 }} />
          <GhostButton
            title={noLeidos > 0 ? `Mensajes (${noLeidos} sin leer)` : "Mensajes"}
            icon={<MessageSquare color={colors.indigo} size={18} />}
            onPress={() => nav.navigate("Chat", { viajeId: activo.viajeId })}
          />
        </CardLavanda>
      )}

      <Mapa
        alto={200}
        miUbicacion
        descripcion="Mapa de tu zona. Toda la información del acompañamiento está también en texto."
      />

      {/*
        Destinos frecuentes. Eran tres botones fijos ("Entrenamiento", "Estadio",
        "Centro médico") que no decían qué lugar eran y sólo abrían el formulario
        vacío. Ahora salen de los viajes anteriores de la persona: cada uno es un
        lugar concreto con su dirección, y tocarlo abre Solicitar con ese destino
        ya puesto. Sin viajes todavía no se inventan opciones: se explica que
        aparecerán. Si la carga falla, la sección simplemente no está.
      */}
      {destinos ? (
        <>
          <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Destinos frecuentes</Etiqueta>
          {destinos.length ? (
            <View style={{ gap: 8 }}>
              {destinos.map((d) => (
                <BotonDestino
                  key={`${d.nombre}|${d.lat}|${d.lng}`}
                  destino={d}
                  // Igual que el botón principal: sin cuenta validada no se
                  // pide, y un atajo no puede saltarse eso.
                  disabled={!aprobado}
                  onPress={() =>
                    nav.navigate("Solicitar", {
                      destino: { lat: d.lat, lng: d.lng, texto: d.nombre, direccion: d.direccion },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={font.muted}>
              Tus destinos frecuentes aparecerán aquí después de tu primer acompañamiento.
            </Text>
          )}
        </>
      ) : null}
      <View style={{ height: 24 }} />

      <PrimaryButton
        title={aprobado ? "Solicitar acompañamiento" : "Disponible al validar tu cuenta"}
        icon={<Plus color={colors.white} size={19} />}
        disabled={!aprobado}
        onPress={() => nav.navigate("Solicitar")}
      />
      {!aprobado ? (
        <Text style={[font.tiny, { marginTop: 8, textAlign: "center" }]}>
          Podrás pedir acompañamiento en cuanto el equipo valide tus documentos.
        </Text>
      ) : null}
    </Screen>
  );
}

/**
 * Un destino frecuente: nombre en negrita y la dirección debajo, que es lo que
 * distingue un "Estadio" de otro. Lector de pantalla: lee las dos cosas juntas
 * y la pista dice qué pasa al tocar.
 */
function BotonDestino({
  destino,
  disabled,
  onPress,
}: {
  destino: DestinoFrecuente;
  disabled?: boolean;
  onPress: () => void;
}) {
  const etiqueta = destino.direccion ? `${destino.nombre}, ${destino.direccion}` : destino.nombre;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={
        disabled ? "Disponible al validar tu cuenta" : "Abre la solicitud con este destino"
      }
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.destino,
        pressed && !disabled && { backgroundColor: colors.lavanda, borderColor: colors.lav300 },
        disabled && { opacity: 0.55 },
      ]}
    >
      <View style={styles.destinoIcono}>
        <MapPin color={colors.coral} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[font.body, { fontFamily: fuente.fuerte }]} numberOfLines={1}>
          {destino.nombre}
        </Text>
        {destino.direccion ? (
          <Text style={font.tiny} numberOfLines={1}>
            {destino.direccion}
          </Text>
        ) : null}
      </View>
      <ChevronRight color={colors.ink3} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  destino: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: TOQUE_MIN + 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...elevacion.suave,
  },
  destinoIcono: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.coralBg,
  },
});
