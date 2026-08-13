import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Award, Clock, Flame, Medal } from "lucide-react-native";
import { colors, radius } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, ProgressBar, Screen } from "../../../shared/ui";
import type { Progreso } from "../../../shared/types";

interface RankRow {
  pos: number;
  nombre: string;
  puntos: number;
}

const ICONO: Record<string, typeof Medal> = { medal: Medal, clock: Clock, flame: Flame, flag: Award };

export function LogrosScreen() {
  const [prog, setProg] = useState<Progreso | null>(null);
  const [rank, setRank] = useState<RankRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      api<Progreso>("/gamificacion/mi-progreso").then(setProg).catch(() => {});
      api<RankRow[]>("/gamificacion/ranking?tipo=deportista").then(setRank).catch(() => {});
    }, []),
  );

  const pct = prog ? (prog.progresoNivel / prog.puntosPorNivel) * 100 : 0;

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>Tus logros</Text>
      <Text style={{ color: colors.ink2, marginBottom: 16 }}>Nivel {prog?.nivel ?? 1}</Text>

      <Card style={{ backgroundColor: colors.brand, borderColor: colors.brand }}>
        <Text style={{ color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 }}>PUNTOS RUMBO</Text>
        <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginVertical: 4 }}>{prog?.puntos ?? 0}</Text>
        <ProgressBar pct={pct} color={colors.gold} />
        <Text style={{ color: "rgba(255,255,255,.85)", fontSize: 12, marginTop: 6 }}>
          {prog ? `${prog.puntosPorNivel - prog.progresoNivel} pts para el siguiente nivel` : ""}
        </Text>
      </Card>

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 20, marginBottom: 10 }}>Insignias</Text>
      {prog && prog.insignias.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {prog.insignias.map((ins) => {
            const Icon = ICONO[ins.icono ?? "medal"] ?? Medal;
            return (
              <View key={ins.codigo} style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.surface2, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, gap: 6 }}>
                <Icon color={colors.goldInk} size={24} />
                <Text style={{ fontSize: 10, fontWeight: "600", color: colors.ink2, textAlign: "center", paddingHorizontal: 4 }}>{ins.nombre}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.ink3 }}>Completa tu primer viaje para ganar tu primera insignia.</Text>
      )}

      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink2, marginTop: 20, marginBottom: 10 }}>Ranking semanal</Text>
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
