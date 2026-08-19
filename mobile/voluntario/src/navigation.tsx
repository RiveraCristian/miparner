import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { House, Trophy, User } from "lucide-react-native";
import { colors, elevacion, fuente } from "../../shared/theme";
import { useAuth } from "../../shared/auth";
import { LoginScreen } from "./screens/LoginScreen";
import { InicioScreen } from "./screens/InicioScreen";
import { SolicitudesScreen } from "./screens/SolicitudesScreen";
import { ViajeActivoScreen } from "./screens/ViajeActivoScreen";
import { RankingScreen } from "./screens/RankingScreen";
import { PerfilScreen } from "./screens/PerfilScreen";

export type RootStackParams = {
  Tabs: undefined;
  Solicitudes: undefined;
  ViajeActivo: { viajeId: number };
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator();

/**
 * Chrome de navegación en colores de marca.
 * Pestaña activa en índigo (11.4:1 sobre blanco, AAA) e inactiva en el gris
 * del manual (5.6:1, AA), con negrita en la activa para no depender del color.
 */
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 10,
          ...elevacion.alta,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: fuente.fuerte },
        tabBarItemStyle: { borderRadius: 14 },
      }}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tab.Screen name="Ranking" component={RankingScreen} options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

/** Cabecera de pila: índigo plano con título en blanco (11.4:1, AAA). */
const cabecera = {
  headerStyle: { backgroundColor: colors.indigo },
  headerTintColor: colors.white,
  headerTitleStyle: { fontFamily: fuente.fuerte, fontSize: 17 },
  headerShadowVisible: false,
};

export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...cabecera }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Solicitudes" component={SolicitudesScreen} options={{ headerShown: true, title: "Solicitudes cercanas" }} />
      <Stack.Screen name="ViajeActivo" component={ViajeActivoScreen} options={{ headerShown: true, title: "Acompañamiento activo" }} />
    </Stack.Navigator>
  );
}
