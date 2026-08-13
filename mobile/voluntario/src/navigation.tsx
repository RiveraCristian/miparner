import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { House, Trophy, User } from "lucide-react-native";
import { colors } from "../../shared/theme";
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

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: { borderTopColor: colors.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tab.Screen name="Ranking" component={RankingScreen} options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Solicitudes" component={SolicitudesScreen} options={{ headerShown: true, title: "Solicitudes cercanas" }} />
      <Stack.Screen name="ViajeActivo" component={ViajeActivoScreen} options={{ headerShown: true, title: "Viaje activo" }} />
    </Stack.Navigator>
  );
}
