# Miparner — apps móviles (React Native CLI)

Dos apps que comparten una capa común en [`shared/`](shared/):

| App | Carpeta | Para |
|-----|---------|------|
| Deportista | [`deportista/`](deportista/) | Solicitar acompañamiento, seguimiento, pánico, gamificación |
| Voluntario | [`voluntario/`](voluntario/) | En línea/fuera de línea, solicitudes cercanas, navegación con hitos |

```
mobile/
├── shared/        # tema (azul), api, socket, auth, tipos, componentes UI
├── deportista/    # RN CLI: config + src/ (App, navegación, pantallas)
└── voluntario/    # RN CLI: config + src/
```

`mobile/` es un **workspace npm**: las dependencias se hoistean a `mobile/node_modules`
y `shared/` se resuelve vía `watchFolders` en cada `metro.config.js`. Instala una sola
vez desde `mobile/` (`npm install`), no por app.

## Requisitos
- Node 20+, JDK 17, Android Studio (SDK) y/o Xcode (macOS).
- El backend corriendo (`../backend`). En el emulador Android el host es `10.0.2.2`
  (ya configurado en `shared/config.ts`); en simulador iOS es `localhost`.

## Generar los shells nativos (una vez por app)

Estas carpetas traen el código JS/TS y la configuración, pero **no** los proyectos
nativos `android/` e `ios/` (se generan en tu equipo con las herramientas nativas).
Para cada app (ejemplo con Deportista):

```bash
# 1) Genera un proyecto RN temporal con el MISMO nombre de app
npx @react-native-community/cli@latest init Deportista --version 0.76.5

# 2) Copia SOLO las carpetas nativas al proyecto de este repo
cp -r Deportista/android mobile/deportista/android
cp -r Deportista/ios     mobile/deportista/ios
# (repetir con "Voluntario" → mobile/voluntario)
```

> El `app.json` de cada carpeta ya define el nombre (`Deportista` / `Voluntario`)
> para que coincida con `AppRegistry.registerComponent`.

## Instalar y correr

```bash
cd mobile/deportista        # o mobile/voluntario
npm install
npm run android             # o: npm run ios
# En otra terminal, si hace falta: npm start
```

## Integraciones pendientes de configuración nativa
- **Mapas**: hoy se usa un `MapPlaceholder`. Para mapas reales, instalar
  `react-native-maps` y configurar la API key de Google Maps (Android/iOS).
- **Geolocalización en segundo plano** (voluntario): `@react-native-community/geolocation`
  o `react-native-geolocation-service` + permisos de ubicación.
- **Íconos**: `lucide-react-native` requiere `react-native-svg` (ya en dependencias).

## Estado
Código de UI y lógica completo y cableado al backend real (auth, viajes,
matchmaking, tiempo real por Socket.io, pánico, gamificación). La compilación
nativa y ejecución en dispositivo/emulador se realizan en tu entorno.
