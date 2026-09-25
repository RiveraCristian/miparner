/**
 * Navegación · una sola app para los dos roles.
 *
 * Antes eran dos aplicaciones y cada una traía su propio navegador. Aquí el rol
 * de la cuenta decide qué pestañas se montan: el deportista pide y planifica,
 * el voluntario ve solicitudes y acepta. Nadie ve pantallas que no le sirven.
 *
 * Las pantallas comunes —chat, acreditación, privacidad, borrar cuenta— están
 * una sola vez en la pila, porque son idénticas para ambos.
 */
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CalendarDays, History, House, Inbox, Trophy, User } from "lucide-react-native";
import { colors, elevacion, fuente } from "../../shared/theme";
import { useAuth } from "../../shared/auth";

import { LoginScreen } from "./screens/comunes/LoginScreen";
import { ChatScreen } from "./screens/comunes/ChatScreen";
import { DocumentosScreen } from "./screens/comunes/DocumentosScreen";
import { PrivacidadScreen } from "./screens/comunes/PrivacidadScreen";
import { BorrarCuentaScreen } from "./screens/comunes/BorrarCuentaScreen";

import { InicioScreen as InicioDeportista } from "./screens/deportista/InicioScreen";
import { SolicitarScreen } from "./screens/deportista/SolicitarScreen";
import { EnViajeScreen } from "./screens/deportista/EnViajeScreen";
import { PlanificacionScreen } from "./screens/deportista/PlanificacionScreen";
import { LogrosScreen } from "./screens/deportista/LogrosScreen";
import { PerfilScreen as PerfilDeportista } from "./screens/deportista/PerfilScreen";

import { InicioScreen as InicioVoluntario } from "./screens/voluntario/InicioScreen";
import { SolicitudesScreen } from "./screens/voluntario/SolicitudesScreen";
import { ViajeActivoScreen } from "./screens/voluntario/ViajeActivoScreen";
import { HistorialScreen } from "./screens/voluntario/HistorialScreen";
import { RankingScreen } from "./screens/voluntario/RankingScreen";
import { PerfilScreen as PerfilVoluntario } from "./screens/voluntario/PerfilScreen";

/**
 * Rutas de la pila. Es la unión de las dos apps anteriores: una ruta que no
 * corresponde al rol simplemente nunca se navega, porque ninguna pantalla de
 * ese rol enlaza hacia ella.
 */
export type RootStackParams = {
  Tabs: undefined;
  // Deportista
  Solicitar: undefined;
  EnViaje: { viajeId: number };
  // Voluntario
  Solicitudes: undefined;
  ViajeActivo: { viajeId: number };
  Historial: undefined;
  // Comunes
  Chat: { viajeId: number };
  Documentos: undefined;
  Privacidad: undefined;
  BorrarCuenta: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator();

/**
 * Chrome de navegación en colores de marca.
 * Pestaña activa en índigo (11.4:1 sobre blanco, AAA) e inactiva en el gris
 * del manual (5.6:1, AA). La activa además va en negrita: el color no es el
 * único indicador del estado seleccionado.
 */
const opcionesTabs = {
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
} as const;

function TabsDeportista() {
  return (
    <Tab.Navigator screenOptions={opcionesTabs}>
      <Tab.Screen
        name="Inicio"
        component={InicioDeportista}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Mi plan"
        component={PlanificacionScreen}
        options={{ tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Logros"
        component={LogrosScreen}
        options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilDeportista}
        options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

function TabsVoluntario() {
  return (
    <Tab.Navigator screenOptions={opcionesTabs}>
      <Tab.Screen
        name="Inicio"
        component={InicioVoluntario}
        options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Solicitudes"
        component={SolicitudesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilVoluntario}
        options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
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

  const esVoluntario = user.rol === "voluntario";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...cabecera }}>
      <Stack.Screen name="Tabs" component={esVoluntario ? TabsVoluntario : TabsDeportista} />

      {esVoluntario ? (
        <>
          <Stack.Screen
            name="Solicitudes"
            component={SolicitudesScreen}
            options={{ headerShown: true, title: "Solicitudes cercanas" }}
          />
          <Stack.Screen
            name="ViajeActivo"
            component={ViajeActivoScreen}
            options={{ headerShown: true, title: "Acompañamiento activo" }}
          />
          <Stack.Screen
            name="Historial"
            component={HistorialScreen}
            options={{ headerShown: true, title: "Mi historial" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Solicitar"
            component={SolicitarScreen}
            options={{ headerShown: true, title: "Solicitar acompañamiento" }}
          />
          <Stack.Screen
            name="EnViaje"
            component={EnViajeScreen}
            options={{ headerShown: true, title: "Tu acompañamiento" }}
          />
        </>
      )}

      {/* Comunes a los dos roles */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, title: "Mensajes" }}
      />
      <Stack.Screen
        name="Documentos"
        component={DocumentosScreen}
        options={{ headerShown: true, title: "Acreditar mi cuenta" }}
      />
      <Stack.Screen
        name="Privacidad"
        component={PrivacidadScreen}
        options={{ headerShown: true, title: "Mis datos y privacidad" }}
      />
      <Stack.Screen
        name="BorrarCuenta"
        component={BorrarCuentaScreen}
        options={{ headerShown: true, title: "Borrar mi cuenta" }}
      />
    </Stack.Navigator>
  );
}
