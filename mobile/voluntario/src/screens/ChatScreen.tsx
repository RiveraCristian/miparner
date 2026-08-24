import { useRoute, type RouteProp } from "@react-navigation/native";
import { Chat } from "../../../shared/Chat";
import { useAuth } from "../../../shared/auth";
import type { RootStackParams } from "../navigation";

/** Conversación con el deportista del acompañamiento. */
export function ChatScreen() {
  const route = useRoute<RouteProp<RootStackParams, "Chat">>();
  const { user } = useAuth();
  return <Chat viajeId={route.params.viajeId} yoId={user?.usuarioId ?? 0} />;
}
