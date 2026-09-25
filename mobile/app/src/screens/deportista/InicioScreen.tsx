import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MessageSquare, Navigation, Plus } from "lucide-react-native";
import { colors, font, fuente } from "../../../../shared/theme";
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
  Pill,
  PrimaryButton,
  Screen,
} from "../../../../shared/ui";
import type { NoLeidos } from "../../../../shared/types";
import type { RootStackParams } from "../../navigation";

interface ViajeItem {
  viajeId: number;
  viajeEstado: string;
  viajeOrigenTexto: string | null;
  viajeDestinoTexto: string | null;
}

const ACTIVOS = ["solicitado", "asignado", "en_camino", "a_bordo"];

export function InicioScreen() {
  const { user, aprobado } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [activo, setActivo] = useState<ViajeItem | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api<ViajeItem[]>("/viajes")
        .then((vs) => setActivo(vs.find((v) => ACTIVOS.includes(v.viajeEstado)) ?? null))
        .catch(() => {});
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

      <Etiqueta style={{ marginTop: 22, marginBottom: 10 }}>Destinos frecuentes</Etiqueta>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <Pill label="Entrenamiento" active onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Estadio" onPress={() => nav.navigate("Solicitar")} />
        <Pill label="Centro médico" onPress={() => nav.navigate("Solicitar")} />
      </View>

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
