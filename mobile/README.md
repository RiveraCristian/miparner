# Miparner — apps móviles (React Native CLI)

Dos apps que comparten una capa común en [`shared/`](shared/):

| App | Carpeta | Para |
|-----|---------|------|
| Deportista | [`deportista/`](deportista/) | Solicitar acompañamiento, seguimiento, pánico, gamificación |
| Voluntario | [`voluntario/`](voluntario/) | En línea/fuera de línea, solicitudes cercanas, navegación con hitos |

```
mobile/
├── shared/        # tema, marca, api, socket, auth, tipos, componentes UI
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

## Proyecto nativo de Android

`android/` **ya está en el repo** para las dos apps, generado desde la plantilla
oficial de RN 0.76.5 y adaptado:

| | Deportista | Voluntario |
|---|---|---|
| `applicationId` | `cl.miparner.deportista` | `cl.miparner.voluntario` |
| Nombre en el launcher | Miparner | Miparner Voluntario |
| Icono | color sobre lavanda | blanco sobre índigo |

Los iconos de launcher salen del isotipo del manual, en las cinco densidades. Se
regeneran con `design/scripts/gen_mipmaps.py`.

`local.properties` (la ruta del SDK) no se versiona: es propia de cada equipo. Si no
existe, créalo dentro de `<app>/android/`:

```
sdk.dir=C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
```

### Rutas de Gradle en el monorepo

Como las dependencias se hoistean a `mobile/node_modules`, las rutas por defecto de
la plantilla apuntan un nivel más abajo de donde están. Ya viene corregido:

- `android/settings.gradle` → `../../node_modules/@react-native/gradle-plugin`
- `android/app/build.gradle`, bloque `react { }` → `root`, `reactNativeDir`,
  `codegenDir` y `cliFile` con un `../` extra.

### iOS

`ios/` sigue sin generarse: requiere macOS con Xcode. Mismo procedimiento —
`npx @react-native-community/cli@15.0.1 init Deportista --version 0.76.5`, copiar
`ios/` y renombrar bundle id y display name.

## Versiones de los módulos nativos: van fijas, sin caret

Los módulos con código nativo están acoplados a la versión de React Native. Con
rangos `^` entran versiones compiladas contra una RN más nueva y el build falla de
formas poco obvias:

| Módulo | Fijado | Qué pasa si deriva |
|---|---|---|
| `react-native-screens` | `4.4.0` | 4.27 declara props que el codegen de RN 0.76.5 no entiende |
| `react-native-svg` | `15.9.0` | 15.15 usa `yoga::StyleSizeLength`, que no existe hasta RN 0.77 |
| `react-native-safe-area-context` | `5.0.0` | — |
| `@react-native-async-storage/async-storage` | `2.1.0` | — |

Al subir de versión React Native, estas cuatro se suben **a la vez** y se comprueba
el build nativo, no solo el typecheck.

## Instalar y correr

```bash
cd mobile                   # el workspace: instala una sola vez, no por app
npm install

cd deportista               # o voluntario
npm start                   # Metro, en una terminal
npm run android             # en otra
```

Si el backend no está en el 4000 (por ejemplo porque el puerto está ocupado), se
cambia `PUERTO` en [`shared/config.ts`](shared/config.ts): es el único lugar donde vive.

## Integraciones pendientes de configuración nativa
- **Mapas**: hoy se usa un `MapPlaceholder`. Para mapas reales, instalar
  `react-native-maps` y configurar la API key de Google Maps (Android/iOS).
- **Geolocalización en segundo plano** (voluntario): `@react-native-community/geolocation`
  o `react-native-geolocation-service` + permisos de ubicación.
- **Íconos**: `lucide-react-native` requiere `react-native-svg` (ya en dependencias).

## Estado
UI y lógica completas y cableadas al backend real (auth, viajes, matchmaking,
tiempo real por Socket.io, pánico, gamificación). Android compila y corre en
emulador. iOS pendiente de generar en macOS.
