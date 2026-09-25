import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { HeartHandshake } from "lucide-react-native";
import { colors, font, fuente } from "../../../../shared/theme";
import { api } from "../../../../shared/api";
import { Card, Loading, Screen, Vacio } from "../../../../shared/ui";

interface ViajeItem {
  viajeId: number;
  viajeEstado: string;
  viajeDestinoTexto: string | null;
  viajeOrigenTexto: string | null;
  viajeFinAt: string | null;
}

function esHoy(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function fecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Detalle de los acompañamientos que el voluntario ha completado. */
export function HistorialScreen() {
  const [viajes, setViajes] = useState<ViajeItem[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<ViajeItem[]>("/viajes")
        .then((vs) => setViajes(vs.filter((v) => v.viajeEstado === "finalizado")))
        .catch(() => setViajes([]));
    }, []),
  );

  if (!viajes) {
    return (
      <Screen>
        <Loading texto="Cargando tu historial…" />
      </Screen>
    );
  }

  const hoy = viajes.filter((v) => esHoy(v.viajeFinAt)).length;

  return (
    <Screen>
      <Text style={font.h1}>Acompañamientos</Text>
      <Text style={[font.muted, { marginTop: 4, marginBottom: 20 }]}>
        {viajes.length} {viajes.length === 1 ? "completado" : "completados"}
        {hoy > 0 ? ` · ${hoy} hoy` : ""}
      </Text>

      {viajes.length === 0 ? (
        <Vacio
          icon={HeartHandshake}
          titulo="Todavía no completas acompañamientos"
          detalle="Cuando finalices tu primer acompañamiento aparecerá aquí."
        />
      ) : (
        viajes.map((v) => (
          <Card key={v.viajeId} style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.chip}>
              <HeartHandshake color={colors.white} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font.body, { fontFamily: fuente.fuerte }]} numberOfLines={1}>
                {v.viajeDestinoTexto ?? "Destino"}
              </Text>
              <Text style={font.tiny}>
                {v.viajeOrigenTexto ? `Desde ${v.viajeOrigenTexto} · ` : ""}
                {fecha(v.viajeFinAt)}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
});
