import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Trophy } from "lucide-react-native";
import { colors, font, fuente } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, CardLavanda, Etiqueta, Screen } from "../../../shared/ui";
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
      <Text style={font.h1}>Ranking</Text>
      <Text style={[font.muted, { marginTop: 4, marginBottom: 20 }]}>Comunidad de voluntarios</Text>

      {/* Coral en el círculo (forma, icono blanco a 3.7:1) y texto en tinta. */}
      <CardLavanda style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={styles.copa}>
          <Trophy color={colors.white} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Etiqueta>Tus puntos</Etiqueta>
          <Text style={styles.puntos}>
            {prog?.puntos ?? 0} · Nivel {prog?.nivel ?? 1}
          </Text>
        </View>
      </CardLavanda>

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
            <Text style={styles.pos}>{r.pos}</Text>
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
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  puntos: { fontSize: 22, fontFamily: fuente.fuerte, color: colors.ink, letterSpacing: -0.3, marginTop: 3 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  pos: { width: 26, fontSize: 16, fontFamily: fuente.fuerte, color: colors.ink3 },
});
