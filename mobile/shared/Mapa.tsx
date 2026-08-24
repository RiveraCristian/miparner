/**
 * Mapa de la aplicación · MapLibre + OpenFreeMap.
 *
 * Por qué MapLibre y no Google Maps: es open source, no pide clave de API ni
 * tarjeta, y el estilo vectorial de OpenFreeMap (datos de OpenStreetMap) es
 * gratuito y sin cuota. Si algún día hace falta otro proveedor —MapTiler,
 * Protomaps, un servidor propio— se cambia `MAPA_ESTILO_URL` y nada más.
 *
 * Accesibilidad: el mapa es una ayuda visual, no la fuente de la información.
 * Se oculta a los lectores de pantalla y la pantalla que lo usa siempre da el
 * mismo dato en texto (origen, destino, estado). Debajo del mapa se imprime
 * `descripcion` para quien navegue por voz.
 *
 * Si el módulo nativo todavía no está compilado en el APK (falta un
 * `npm run android` después de instalar la dependencia), la vista cae al mapa
 * vectorial de relleno en lugar de tumbar la pantalla.
 */
import { Component, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Camera, LineLayer, MapView, MarkerView, ShapeSource, UserLocation } from "@maplibre/maplibre-react-native";
import { MAPA_CENTRO_DEFECTO, MAPA_ESTILO_URL, MAPA_ZOOM_DEFECTO } from "./config";
import { colors, elevacion, font, radius } from "./theme";
import { MapPlaceholder } from "./ui";
import type { LatLng } from "./types";

export interface MapaProps {
  alto?: number;
  /** Punto de partida. Se dibuja en índigo. */
  origen?: LatLng | null;
  /** Punto de llegada. Se dibuja en coral. */
  destino?: LatLng | null;
  /** Posición en vivo del voluntario durante el acompañamiento. */
  movil?: LatLng | null;
  /** Traza recorrida o ruta prevista. */
  ruta?: LatLng[];
  /** Permite tocar el mapa para elegir un punto. */
  interactivo?: boolean;
  onElegirPunto?: (punto: LatLng) => void;
  /** Muestra el punto azul del dispositivo (requiere permiso de ubicación). */
  miUbicacion?: boolean;
  /**
   * Centra la cámara en `movil` en vez de encuadrar origen y destino. Para la
   * vista de navegación, donde interesa dónde estoy ahora, no el recorrido.
   */
  seguir?: boolean;
  /** Resumen en texto de lo que muestra el mapa, para lectores de pantalla. */
  descripcion?: string;
}

const ZOOM_UN_PUNTO = 14.5;

export function Mapa(props: MapaProps) {
  return (
    <LimiteDeFallo alto={props.alto ?? 210}>
      <MapaMapLibre {...props} />
    </LimiteDeFallo>
  );
}

function MapaMapLibre({
  alto = 210,
  origen,
  destino,
  movil,
  ruta,
  interactivo = false,
  onElegirPunto,
  miUbicacion = false,
  seguir = false,
  descripcion,
}: MapaProps) {
  /*
   * El encuadre se calcula solo con origen y destino, que no cambian durante el
   * acompañamiento. Si entrara el punto móvil, la cámara se recalcularía en
   * cada lectura del GPS y el mapa daría saltos mientras la persona lo mira.
   */
  const anclas = useMemo(
    () => [origen, destino].filter((p): p is LatLng => !!p),
    [origen, destino],
  );

  const camara = useMemo(() => {
    if (seguir && movil) {
      return { centerCoordinate: [movil.lng, movil.lat], zoomLevel: ZOOM_UN_PUNTO };
    }
    if (anclas.length >= 2) {
      const lats = anclas.map((p) => p.lat);
      const lngs = anclas.map((p) => p.lng);
      return {
        bounds: {
          ne: [Math.max(...lngs), Math.max(...lats)],
          sw: [Math.min(...lngs), Math.min(...lats)],
        },
        padding: { paddingTop: 56, paddingBottom: 56, paddingLeft: 48, paddingRight: 48 },
      };
    }
    const centro = anclas[0] ?? movil ?? MAPA_CENTRO_DEFECTO;
    return {
      centerCoordinate: [centro.lng, centro.lat],
      zoomLevel: anclas.length || movil ? ZOOM_UN_PUNTO : MAPA_ZOOM_DEFECTO,
    };
  }, [anclas, movil, seguir]);

  const linea = useMemo(() => {
    if (!ruta || ruta.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: ruta.map((p) => [p.lng, p.lat]),
      },
    };
  }, [ruta]);

  return (
    <View>
      <View
        style={[styles.marco, { height: alto }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MapView
          style={StyleSheet.absoluteFillObject}
          mapStyle={MAPA_ESTILO_URL}
          logoEnabled={false}
          attributionPosition={{ bottom: 8, right: 8 }}
          rotateEnabled={false}
          pitchEnabled={false}
          onPress={
            interactivo && onElegirPunto
              ? (feature) => {
                  const coords = (feature.geometry as { coordinates?: number[] })?.coordinates;
                  if (coords?.length === 2) onElegirPunto({ lng: coords[0], lat: coords[1] });
                }
              : undefined
          }
        >
          <Camera animationDuration={600} {...camara} />

          {linea && (
            <ShapeSource id="ruta" shape={linea}>
              <LineLayer
                id="ruta-linea"
                style={{
                  lineColor: colors.indigo,
                  lineWidth: 4.5,
                  lineCap: "round",
                  lineJoin: "round",
                  lineOpacity: 0.9,
                }}
              />
            </ShapeSource>
          )}

          {origen && <Chincheta punto={origen} color={colors.indigo} />}
          {destino && <Chincheta punto={destino} color={colors.coral} tamano={20} />}
          {movil && <Chincheta punto={movil} color={colors.exito} tamano={18} pulso />}

          {miUbicacion && <UserLocation visible />}
        </MapView>
      </View>

      {/* El dato también en texto: el mapa nunca es el único canal. */}
      {descripcion ? (
        <Text style={[font.tiny, styles.pie]} accessibilityRole="text">
          {descripcion}
        </Text>
      ) : null}

      {interactivo ? (
        <Text style={[font.tiny, styles.pie]}>
          Toca el mapa para mover el punto, o elige un destino de la lista.
        </Text>
      ) : null}
    </View>
  );
}

/** Punto sobre el mapa. Aro blanco para que se lea sobre cualquier fondo. */
function Chincheta({
  punto,
  color,
  tamano = 18,
  pulso = false,
}: {
  punto: LatLng;
  color: string;
  tamano?: number;
  pulso?: boolean;
}) {
  return (
    <MarkerView coordinate={[punto.lng, punto.lat]} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={pulso ? styles.halo : undefined}>
        <View
          style={[
            elevacion.suave,
            {
              width: tamano,
              height: tamano,
              borderRadius: tamano / 2,
              backgroundColor: color,
              borderWidth: 3,
              borderColor: colors.white,
            },
          ]}
        />
      </View>
    </MarkerView>
  );
}

/**
 * Si el módulo nativo del mapa no está en el binario, la pantalla no se cae:
 * se muestra el mapa vectorial de relleno con una nota.
 */
class LimiteDeFallo extends Component<{ alto: number; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      "El mapa nativo no está disponible. Instala las dependencias y vuelve a compilar la app (npm run android).",
      error,
    );
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <View>
        <MapPlaceholder height={this.props.alto} />
        <Text style={[font.tiny, styles.pie]}>
          Mapa no disponible en esta compilación. Vuelve a compilar la app para verlo.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  marco: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.lavanda,
    ...elevacion.suave,
  },
  halo: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(20,107,58,0.16)",
  },
  pie: { marginTop: 8 },
});
