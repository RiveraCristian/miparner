/**
 * Conversación del acompañamiento · compartida por las dos apps.
 *
 * Hablan solo el deportista y el voluntario asignado, y solo dentro de ese
 * acompañamiento: no hay directorio de personas ni mensajes sueltos. El
 * historial queda en la base (auditable desde el panel) y la entrega en vivo
 * va por la sala de Socket.io del viaje.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageSquare, SendHorizontal } from "lucide-react-native";
import { api } from "./api";
import { connectSocket, joinRide, leaveRide } from "./socket";
import { TOQUE_MIN, colors, elevacion, font, fuente, radius } from "./theme";
import { Estado, Vacio } from "./ui";
import type { Conversacion, Mensaje } from "./types";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export function Chat({ viajeId, yoId }: { viajeId: number; yoId: number }) {
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const lista = useRef<FlatList<Mensaje>>(null);

  const alFinal = useCallback(() => {
    // El salto al final espera al layout de la fila recién añadida.
    requestAnimationFrame(() => lista.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    let vivo = true;
    let socket: Awaited<ReturnType<typeof connectSocket>> | undefined;

    const alLlegar = (m: Mensaje) => {
      if (m.mensajeViajeId !== viajeId) return;
      setConv((c) =>
        c && !c.mensajes.some((x) => x.mensajeId === m.mensajeId)
          ? { ...c, mensajes: [...c.mensajes, m] }
          : c,
      );
      alFinal();
    };

    api<Conversacion>(`/viajes/${viajeId}/mensajes`)
      .then((c) => {
        if (!vivo) return;
        setConv(c);
        alFinal();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No pudimos abrir el chat"));

    (async () => {
      socket = await connectSocket();
      joinRide(viajeId);
      socket.on("mensaje_nuevo", alLlegar);
    })();

    return () => {
      vivo = false;
      leaveRide(viajeId);
      socket?.off("mensaje_nuevo", alLlegar);
    };
  }, [viajeId, alFinal]);

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const m = await api<Mensaje>(`/viajes/${viajeId}/mensajes`, {
        method: "POST",
        body: { texto: limpio },
      });
      setTexto("");
      setConv((c) =>
        c && !c.mensajes.some((x) => x.mensajeId === m.mensajeId)
          ? { ...c, mensajes: [...c.mensajes, m] }
          : c,
      );
      alFinal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  }

  const sinContraparte = conv !== null && conv.contraparte === null;
  const puedeEnviar = texto.trim().length > 0 && !enviando && !sinContraparte;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Con quién se habla, siempre visible. */}
        <View style={estilos.cabecera}>
          <View style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>
              {(conv?.contraparte?.nombre ?? "··").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontFamily: fuente.fuerte }]} numberOfLines={1}>
              {conv?.contraparte?.nombre ?? "Sin voluntario asignado"}
            </Text>
            <Text style={font.tiny}>
              {conv?.contraparte
                ? conv.contraparte.rol === "voluntario"
                  ? "Tu voluntario"
                  : "Deportista"
                : "La conversación se abre al asignarse un voluntario"}
            </Text>
          </View>
          {conv ? <Estado text={conv.estado.replace(/_/g, " ")} tipo="indigo" /> : null}
        </View>

        {error ? (
          <View style={estilos.error} accessibilityRole="alert">
            <Text style={font.body}>{error}</Text>
          </View>
        ) : null}

        {!conv ? (
          <View style={{ padding: 40, alignItems: "center", gap: 12 }} accessibilityRole="progressbar">
            <ActivityIndicator color={colors.indigo} />
            <Text style={font.tiny}>Abriendo la conversación…</Text>
          </View>
        ) : (
          <FlatList
            ref={lista}
            data={conv.mensajes}
            keyExtractor={(m) => String(m.mensajeId)}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
            onContentSizeChange={alFinal}
            ListEmptyComponent={
              <Vacio
                icon={MessageSquare}
                titulo={sinContraparte ? "Todavía no hay con quién hablar" : "Aún no hay mensajes"}
                detalle={
                  sinContraparte
                    ? "En cuanto un voluntario acepte tu acompañamiento podrán escribirse aquí."
                    : "Escribe el primero: cuenta dónde estás o cualquier detalle útil."
                }
              />
            }
            renderItem={({ item }) => <Burbuja mensaje={item} mio={item.mensajeEmisorId === yoId} />}
          />
        )}

        <View style={estilos.barra}>
          <TextInput
            style={estilos.entrada}
            value={texto}
            onChangeText={setTexto}
            placeholder={sinContraparte ? "Sin voluntario asignado" : "Escribe un mensaje…"}
            placeholderTextColor={colors.ink3}
            editable={!sinContraparte}
            multiline
            maxLength={1000}
            accessibilityLabel="Mensaje"
            onSubmitEditing={enviar}
          />
          <Pressable
            onPress={enviar}
            disabled={!puedeEnviar}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityState={{ disabled: !puedeEnviar }}
            style={({ pressed }) => [
              estilos.enviar,
              { backgroundColor: !puedeEnviar ? colors.surface2 : pressed ? colors.tinta : colors.indigo },
            ]}
          >
            <SendHorizontal size={20} color={puedeEnviar ? colors.white : colors.ink3} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Burbuja de mensaje. Lo propio va en índigo a la derecha y lo recibido en
 * blanco a la izquierda: además del color, cambia el lado y el aviso de
 * lectura, así que el estado no depende solo del matiz.
 */
function Burbuja({ mensaje, mio }: { mensaje: Mensaje; mio: boolean }) {
  return (
    <View style={[estilos.fila, { justifyContent: mio ? "flex-end" : "flex-start" }]}>
      <View style={[estilos.burbuja, mio ? estilos.burbujaMia : estilos.burbujaSuya]}>
        <Text style={[font.body, mio && { color: colors.white }]}>{mensaje.mensajeTexto}</Text>
        <Text style={[font.tiny, { marginTop: 4 }, mio && { color: colors.lav200 }]}>
          {hora(mensaje.createdAt)}
          {mio ? (mensaje.mensajeLeidoAt ? " · leído" : " · enviado") : ""}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: { color: colors.white, fontSize: 15, fontFamily: fuente.fuerte },

  fila: { flexDirection: "row", marginBottom: 10 },
  burbuja: { maxWidth: "82%", borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  burbujaMia: { backgroundColor: colors.indigo, borderBottomRightRadius: radius.sm },
  burbujaSuya: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    ...elevacion.suave,
  },

  error: {
    backgroundColor: colors.coralBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding: 12,
    margin: 16,
    borderRadius: radius.sm,
  },

  barra: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  entrada: {
    flex: 1,
    minHeight: TOQUE_MIN,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  enviar: {
    width: TOQUE_MIN + 4,
    height: TOQUE_MIN + 4,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
