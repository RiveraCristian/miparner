import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { House, Trophy, User } from "lucide-react-native";
import { colors, elevacion, fuente } from "../../shared/theme";
import { useAuth } from "../../shared/auth";
import { LoginScreen } from "./screens/LoginScreen";
import { InicioScreen } from "./screens/InicioScreen";
import { SolicitarScreen } from "./screens/SolicitarScreen";
import { EnViajeScreen } from "./screens/EnViajeScreen";
import { LogrosScreen } from "./screens/LogrosScreen";
import { PerfilScreen } from "./screens/PerfilScreen";

export type RootStackParams = {
  Tabs: undefined;
  Solicitar: undefined;
  EnViaje: { viajeId: number };
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator();

/**
 * Chrome de navegación en colores de marca.
 * Pestaña activa en índigo (11.4:1 sobre blanco, AAA) e inactiva en el gris
 * del manual (5.6:1, AA). La pestaña activa además va en negrita: el color no
 * es el único indicador del estado seleccionado.
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
      <Tab.Screen name="Logros" component={LogrosScreen} options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
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
      <Stack.Screen name="Solicitar" component={SolicitarScreen} options={{ headerShown: true, title: "Solicitar acompañamiento" }} />
      <Stack.Screen name="EnViaje" component={EnViajeScreen} options={{ headerShown: true, title: "Tu acompañamiento" }} />
    </Stack.Navigator>
  );
}
