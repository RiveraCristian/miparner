import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Trophy } from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { FondoConstelacion } from "../../../shared/FondoConstelacion";
import { Card, Etiqueta, PanelIndigo, Screen } from "../../../shared/ui";
import type { Progreso } from "../../../shared/types";

interface RankRow { pos: number; nombre: string; puntos: number }

export function RankingScreen() {
  const [prog, setProg] = useState<Progreso | null>(null);
  const [rank, setRank] = useState<RankRow[]>([]);

  useFocusEffect(useCallback(() => {
    api<Progreso>("/gamificacion/mi-progreso").then(setProg).catch(() => {});
    api<RankRow[]>("/gamificacion/ranking?tipo=voluntario").then(setRank).catch(() => {});
  }, []));

  return (
    <Screen>
      {/* Hero de marca: fondo azul con tus puntos destacados, como en el Inicio. */}
      <PanelIndigo style={{ marginBottom: 20, overflow: "hidden" }}>
        <FondoConstelacion />
        <Text style={styles.heroEyebrow}>Ranking</Text>
        <Text style={styles.heroTitulo}>Comunidad de voluntarios</Text>

        <View style={styles.heroLinea} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={styles.copa}>
            <Trophy color={colors.indigo} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Tus puntos</Text>
            <Text style={styles.heroPuntos}>
              {prog?.puntos ?? 0} · Nivel {prog?.nivel ?? 1}
            </Text>
          </View>
        </View>
      </PanelIndigo>

      <Etiqueta style={{ marginTop: 26, marginBottom: 12 }}>Top de la semana</Etiqueta>
      <Card style={{ paddingVertical: 6 }}>
        {rank.length === 0 ? (
          <Text style={[font.muted, { padding: 10 }]}>Todavía no hay posiciones esta semana.</Text>
        ) : null}
        {rank.slice(0, 10).map((r, i) => (
          <View
            key={r.pos}
            style={[styles.fila, i === Math.min(rank.length, 10) - 1 && { borderBottomWidth: 0 }]}
          >
            {r.pos <= 3 ? (
              <View
                style={[
                  styles.medalla,
                  { backgroundColor: r.pos === 1 ? colors.indigo : r.pos === 2 ? colors.lav300 : colors.lavanda },
                ]}
              >
                <Text style={[styles.medallaNum, { color: r.pos === 1 ? colors.white : colors.indigo }]}>{r.pos}</Text>
              </View>
            ) : (
              <Text style={styles.pos}>{r.pos}</Text>
            )}
            <Text style={[font.body, { flex: 1, fontFamily: fuente.fuerte }]} numberOfLines={1}>{r.nombre}</Text>
            <Text style={[font.body, { fontFamily: fuente.fuerte }]}>{r.puntos}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copa: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: { color: colors.lav300, fontSize: 12, fontFamily: fuente.medio, letterSpacing: 1.6, textTransform: "uppercase" },
  heroTitulo: { color: colors.white, fontSize: 24, fontFamily: fuente.fuerte, letterSpacing: -0.4, marginTop: 6 },
  heroLinea: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 16 },
  heroLabel: { color: colors.lav300, fontSize: 12, fontFamily: fuente.medio, letterSpacing: 1.4, textTransform: "uppercase" },
  heroPuntos: { color: colors.white, fontSize: 24, fontFamily: fuente.fuerte, letterSpacing: -0.3, marginTop: 3 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  pos: { width: 26, fontSize: 16, fontFamily: fuente.fuerte, color: colors.ink3, textAlign: "center" },
  // Podio: círculo para los tres primeros, en la escala de azules de la marca.
  medalla: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  medallaNum: { fontSize: 14, fontFamily: fuente.fuerte },
});
