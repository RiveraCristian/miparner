import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Trophy } from "lucide-react-native";
import { colors } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, Screen } from "../../../shared/ui";
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
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>Ranking</Text>
      <Text style={{ color: colors.ink2, marginBottom: 16 }}>Comunidad de voluntarios</Text>

      <Card style={{ backgroundColor: colors.goldSoft, borderColor: colors.goldSoft, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
          <Trophy color="#3a2405" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, color: colors.goldInk, fontWeight: "600" }}>Tus puntos</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.goldInk }}>{prog?.puntos ?? 0} · Nivel {prog?.nivel ?? 1}</Text>
        </View>
      </Card>

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 20, marginBottom: 10 }}>Top de la semana</Text>
      <Card style={{ paddingVertical: 4 }}>
        {rank.length === 0 && <Text style={{ color: colors.ink3, padding: 12 }}>Sin datos aún.</Text>}
        {rank.slice(0, 10).map((r) => (
          <View key={r.pos} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
            <Text style={{ width: 24, fontWeight: "800", color: colors.ink3 }}>{r.pos}</Text>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink }}>{r.nombre}</Text>
            <Text style={{ fontWeight: "700", color: colors.ink }}>{r.puntos}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
