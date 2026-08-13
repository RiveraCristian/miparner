import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Award, Clock, Flame, Medal } from "lucide-react-native";
import { colors, font, radius } from "../../../shared/theme";
import { api } from "../../../shared/api";
import { Card, Etiqueta, PanelIndigo, ProgressBar, Screen, Vacio } from "../../../shared/ui";
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
      <Text style={font.h1}>Tus logros</Text>
      <Text style={[font.muted, { marginTop: 4, marginBottom: 20 }]}>Nivel {prog?.nivel ?? 1}</Text>

      {/* Índigo plano con texto en blanco y lavanda: 11.4:1 y 8.1:1, ambos AAA. */}
      <PanelIndigo>
        <Text style={styles.etiquetaPanel}>PUNTOS MIPARNER</Text>
        <Text style={styles.puntos}>{prog?.puntos ?? 0}</Text>
        {/* El coral es forma: aquí es la barra, no texto. */}
        <ProgressBar pct={pct} color={colors.coral} />
        <Text style={styles.piePanel}>
          {prog
            ? `${prog.puntosPorNivel - prog.progresoNivel} puntos para el siguiente nivel`
            : "Cargando tu progreso…"}
        </Text>
      </PanelIndigo>

      <Etiqueta style={{ marginTop: 26, marginBottom: 12 }}>Insignias</Etiqueta>
      {prog && prog.insignias.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {prog.insignias.map((ins) => {
            const Icono = ICONO[ins.icono ?? "medal"] ?? Medal;
            return (
              <View key={ins.codigo} style={styles.insignia}>
                <Icono color={colors.coral} size={26} />
                <Text style={styles.insigniaNombre}>{ins.nombre}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Vacio
          icon={Medal}
          titulo="Aún no tienes insignias"
          detalle="Completa tu primer viaje para ganar la primera."
        />
      )}

      <Etiqueta style={{ marginTop: 26, marginBottom: 12 }}>Ranking semanal</Etiqueta>
      <Card style={{ paddingVertical: 6 }}>
        {rank.length === 0 ? (
          <Text style={[font.muted, { padding: 10 }]}>Todavía no hay posiciones esta semana.</Text>
        ) : null}
        {rank.slice(0, 10).map((r, i) => (
          <View
            key={r.pos}
            style={[styles.filaRank, i === Math.min(rank.length, 10) - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.rankPos}>{r.pos}</Text>
            <Text style={[font.body, { flex: 1, fontWeight: "600" }]} numberOfLines={1}>{r.nombre}</Text>
            <Text style={[font.body, { fontWeight: "600" }]}>{r.puntos}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // lavanda-300 sobre índigo · 6.7:1 AA
  etiquetaPanel: {
    color: colors.lav300,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1.6,
  },
  puntos: {
    color: colors.white,
    fontSize: 40,
    fontWeight: "600",
    letterSpacing: -1,
    marginTop: 6,
    marginBottom: 14,
  },
  // lavanda-200 sobre índigo · 8.1:1 AAA
  piePanel: { color: colors.lav200, fontSize: 14, lineHeight: 20, marginTop: 10 },

  insignia: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
  },
  insigniaNombre: { fontSize: 13, fontWeight: "600", color: colors.ink2, textAlign: "center" },

  filaRank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  rankPos: { width: 26, fontSize: 16, fontWeight: "600", color: colors.ink3 },
});
