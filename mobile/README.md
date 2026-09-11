# Miparner — apps móviles (React Native CLI)

Dos apps que comparten una capa común en [`shared/`](shared/):

| App | Carpeta | Para |
|-----|---------|------|
| Deportista | [`deportista/`](deportista/) | Solicitar acompañamiento, seguimiento, chat, pánico, gamificación |
| Voluntario | [`voluntario/`](voluntario/) | En línea/fuera de línea, solicitudes cercanas, chat, navegación con hitos |

Las dos comparten, además del tema y la marca, tres pantallas completas
—[`Mapa.tsx`](shared/Mapa.tsx), [`Chat.tsx`](shared/Chat.tsx) y
[`Documentos.tsx`](shared/Documentos.tsx)— y toda la capa de GPS
([`ubicacion.ts`](shared/ubicacion.ts)).

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
| `@maplibre/maplibre-react-native` | `^10.4.2` | la 11.x exige RN ≥ 0.80 y React ≥ 19.1 |
| `react-native-image-picker` | `^7.2.3` | la 8.x es de 2025, posterior a RN 0.76.5 |
| `@react-native-documents/picker` | `^10.1.7` | la 11.x y la 12.x exigen RN ≥ 0.79 |

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

## Mapas: MapLibre + OpenFreeMap

[`shared/Mapa.tsx`](shared/Mapa.tsx) dibuja el mapa con
`@maplibre/maplibre-react-native` y el estilo vectorial de **OpenFreeMap**
(OpenStreetMap): open source, sin clave de API, sin cuota y sin registro. Se
eligió sobre Google Maps precisamente por eso: `react-native-maps` habría exigido
una cuenta de facturación de Google Cloud y una API key por plataforma.

El proveedor vive en `MAPA_ESTILO_URL` de [`shared/config.ts`](shared/config.ts).
Cambiar a MapTiler, Protomaps o un servidor propio es cambiar esa URL.

El mapa es ayuda visual, nunca el único canal: se oculta a los lectores de
pantalla y el mismo dato va siempre en texto al lado (prop `descripcion`).

> **Hay que recompilar.** MapLibre, la cámara y el selector de archivos son
> módulos nativos: después de `npm install` no basta con reiniciar Metro, hay que
> volver a compilar (`npm run android`). Si el binario todavía no los trae, el
> mapa cae solo al dibujo vectorial de relleno en vez de tumbar la pantalla.

## Seguimiento en vivo

[`shared/ubicacion.ts`](shared/ubicacion.ts) es la **única** puerta al GPS. El
proveedor es el `LocationManager` de MapLibre: ya viene con el módulo nativo del
mapa (no suma otra dependencia), trae el permiso de Android y filtra por
desplazamiento, que es lo que cuida la batería. Cambiarlo por
`@react-native-community/geolocation` es reescribir solo ese archivo.

| Hook | Para qué |
|---|---|
| `useMiUbicacion(activo, metros)` | Posición propia en vivo |
| `useCompartirPosicion(viajeId, …)` | La comparte en el acompañamiento: socket en cada lectura, REST cada 30 s o 120 m |
| `usePosicionDe(viajeId, usuarioId)` | Sigue a la otra persona y acumula su recorrido |
| `usePublicarUbicacionVoluntario(activo)` | Mantiene fresca la posición del voluntario en línea, para el matchmaking |

El sensor se comparte por conteo de suscriptores: dos pantallas abiertas no lo
encienden dos veces, y se apaga cuando se va la última. La cámara del mapa se
encuadra solo con origen y destino —nunca con el punto que se mueve— para que no
dé saltos en cada lectura.

## Permisos de Android

Ya declarados en los dos `AndroidManifest.xml`:

| Permiso | Para qué |
|---|---|
| `CAMERA` | Foto del carnet o del certificado en la pantalla de validación |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Punto azul del mapa y seguimiento |

## Pendientes

- **Seguimiento con la app en segundo plano.** Hoy el GPS reporta mientras la
  app está en primer plano. Que siga con la pantalla apagada exige un
  *foreground service* de Android (servicio declarado en el manifiesto, canal de
  notificación y notificación persistente) y, en iOS, el modo de fondo de
  ubicación. Es trabajo nativo, no de JavaScript.
- **Ruta trazada sobre calles**: la línea del mapa une las posiciones
  reportadas. Para la ruta real por calle hace falta un servicio de routing
  gratuito (OSRM o Valhalla).
- **Íconos**: `lucide-react-native` requiere `react-native-svg` (ya en dependencias).

## Estado
UI y lógica completas y cableadas al backend real (auth, viajes, matchmaking,
seguimiento en vivo por GPS, tiempo real por Socket.io, mensajería, documentos
de validación, pánico, gamificación). Android compila y corre en emulador. iOS
pendiente de generar en macOS.
