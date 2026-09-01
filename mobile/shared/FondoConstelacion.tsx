/**
 * Fondo de constelación en movimiento para paneles índigo (decoración).
 *
 * Mismo espíritu que el fondo animado de la web (dashboard/landing): puntos
 * enlazados que se mueven. Aquí, en React Native, se dibuja en SVG y todo el
 * grupo se desplaza con una animación suave por el driver nativo (fluida y
 * barata). Es decoración: sin captura de puntero, oculto a lectores y se
 * detiene si el sistema pide menos movimiento.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

// Puntos (x, y, radio) y enlaces (índices) sobre un lienzo 320 × 200.
const PUNTOS: [number, number, number][] = [
  [24, 36, 2.4], [78, 22, 1.6], [128, 50, 2.8], [64, 84, 1.8], [18, 120, 2.0],
  [112, 116, 1.6], [168, 86, 2.4], [214, 44, 2.8], [262, 74, 1.8], [300, 118, 2.2],
  [248, 150, 1.6], [150, 158, 2.0], [58, 164, 1.7], [206, 150, 2.6], [292, 30, 1.8],
  [96, 150, 1.5], [176, 124, 1.9],
];
const ENLACES: [number, number][] = [
  [0, 1], [1, 2], [2, 6], [6, 7], [7, 8], [8, 9], [3, 5], [5, 16], [16, 6],
  [8, 10], [10, 13], [2, 3], [4, 12], [3, 15], [7, 14], [9, 10], [11, 13], [5, 11],
];

export function FondoConstelacion() {
  const t = useRef(new Animated.Value(0)).current;
  const [animar, setAnimar] = useState(true);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (vivo) setAnimar(!reduce);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!animar) return;
    const bucle = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 16000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    bucle.start();
    return () => bucle.stop();
  }, [animar, t]);

  // Ida y vuelta suave: el valor 0 y 1 comparten posición, así el bucle no salta.
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-8, 8, -8] });
  const translateY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, -6, 6] });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { translateY }] }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        {ENLACES.map(([a, b], i) => (
          <Line
            key={`l${i}`}
            x1={PUNTOS[a][0]}
            y1={PUNTOS[a][1]}
            x2={PUNTOS[b][0]}
            y2={PUNTOS[b][1]}
            stroke="#FFFFFF"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}
        {PUNTOS.map(([x, y, r], i) => (
          <Circle key={`c${i}`} cx={x} cy={y} r={r} fill="#FFFFFF" fillOpacity={0.55} />
        ))}
      </Svg>
    </Animated.View>
  );
}
