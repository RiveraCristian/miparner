import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { House, Trophy, User } from "lucide-react-native";
import { colors } from "../../shared/theme";
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
      <Tab.Screen name="Logros" component={LogrosScreen} options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
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
      <Stack.Screen name="Solicitar" component={SolicitarScreen} options={{ headerShown: true, title: "Solicitar acompañamiento" }} />
      <Stack.Screen name="EnViaje" component={EnViajeScreen} options={{ headerShown: true, title: "Tu viaje" }} />
    </Stack.Navigator>
  );
}
