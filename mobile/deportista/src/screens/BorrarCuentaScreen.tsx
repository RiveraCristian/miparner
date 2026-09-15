/**
 * Borrar mi cuenta. La pantalla es idéntica en las dos apps: vive en
 * `shared/BorrarCuenta.tsx` y aquí solo se expone con el nombre de la ruta.
 */
import { useNavigation } from "@react-navigation/native";
import { PantallaBorrarCuenta } from "../../../shared/BorrarCuenta";

export function BorrarCuentaScreen() {
  const nav = useNavigation();
  return <PantallaBorrarCuenta onListo={() => nav.goBack()} />;
}
