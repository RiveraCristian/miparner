/**
 * Fondo animado del panel de marca (solo Login).
 *
 * Concepto: puntos a la deriva; cuando dos se acercan, se traza el vínculo.
 * Es el símbolo puesto en movimiento —«dos personas, un mismo lugar»— sin
 * redibujar el logotipo, que el manual prohíbe alterar.
 *
 * Se usa Three.js únicamente aquí: el Login es vista pre-login y es la primera
 * impresión del sistema. Las vistas internas de gestión no llevan 3D.
 *
 * Accesibilidad y rendimiento:
 *  · `prefers-reduced-motion: reduce` → no se monta nada.
 *  · Equipos modestos (pocos núcleos, poca RAM, pantalla chica) → estático.
 *  · Se detiene con la pestaña en segundo plano; no hay bucle invisible.
 *  · `aria-hidden` y sin captura de puntero: es decoración, no contenido.
 *  · Sobre el índigo plano del manual; los puntos van en blanco y lavanda.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";

const PUNTOS = 62;
const DIST_VINCULO = 24;      // distancia a la que dos puntos se reconocen
const MAX_VINCULOS = 180;

/**
 * El texto manda: la decoración se desvanece sobre la columna de contenido y
 * solo toma cuerpo en el lado libre. Así el logotipo y los titulares quedan
 * sobre zona lisa, como pide el manual.
 */
const DESVANECIDO =
  "linear-gradient(100deg, transparent 0%, transparent 34%, rgba(0,0,0,.28) 55%, rgba(0,0,0,.85) 82%, #000 100%)";

function equipoModesto() {
  const n = navigator as Navigator & { deviceMemory?: number };
  if ((n.hardwareConcurrency ?? 8) < 4) return true;
  if ((n.deviceMemory ?? 8) < 4) return true;
  return window.matchMedia("(max-width: 767px)").matches;
}

/** Textura de punto redondo, generada en canvas: evita pedir un archivo. */
function texturaPunto() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.arc(32, 32, 30, 0, Math.PI * 2);
  g.fillStyle = "#fff";
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function FondoConstelacion() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = host.current;
    if (!nodo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (equipoModesto()) return;

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(60, 1, 1, 500);
    camara.position.z = 105;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return; // sin WebGL, el panel queda en índigo plano
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearAlpha(0);
    nodo.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });

    // --- puntos ---
    const pos = new Float32Array(PUNTOS * 3);
    const vel = new Float32Array(PUNTOS * 3);
    const col = new Float32Array(PUNTOS * 3);
    const blanco = new THREE.Color("#FFFFFF");
    const lavanda = new THREE.Color("#C9BFFF");
    const coral = new THREE.Color("#E8511F");
    for (let i = 0; i < PUNTOS; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 110;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      vel[i * 3] = (Math.random() - 0.5) * 0.075;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.075;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      // El coral es color de forma: unos pocos acentos, nunca la mayoría.
      const c = i % 11 === 0 ? coral : i % 3 === 0 ? lavanda : blanco;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    const geoPuntos = new THREE.BufferGeometry();
    geoPuntos.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geoPuntos.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mapa = texturaPunto();
    const matPuntos = new THREE.PointsMaterial({
      size: 2.2, map: mapa, vertexColors: true, transparent: true,
      opacity: 0.85, depthWrite: false, sizeAttenuation: true,
    });
    const puntos = new THREE.Points(geoPuntos, matPuntos);

    // --- vínculos ---
    const posLinea = new Float32Array(MAX_VINCULOS * 6);
    const geoLineas = new THREE.BufferGeometry();
    geoLineas.setAttribute("position", new THREE.BufferAttribute(posLinea, 3));
    const matLineas = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false,
    });
    const lineas = new THREE.LineSegments(geoLineas, matLineas);

    const grupo = new THREE.Group();
    grupo.add(puntos, lineas);
    escena.add(grupo);

    // --- parallax con el puntero ---
    const objetivo = { x: 0, y: 0 };
    const suave = { x: 0, y: 0 };
    const onPuntero = (e: PointerEvent) => {
      const r = nodo.getBoundingClientRect();
      objetivo.x = ((e.clientX - r.left) / r.width - 0.5) * 0.22;
      objetivo.y = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
    };
    window.addEventListener("pointermove", onPuntero, { passive: true });

    // --- tamaño ---
    const medir = () => {
      const { width, height } = nodo.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camara.aspect = width / height;
      camara.updateProjectionMatrix();
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(nodo);

    // --- bucle ---
    let cuadro = 0;
    let vivo = true;
    const animar = () => {
      if (!vivo) return;
      cuadro = requestAnimationFrame(animar);

      const p = geoPuntos.attributes.position.array as Float32Array;
      for (let i = 0; i < PUNTOS; i++) {
        for (let e = 0; e < 3; e++) {
          const k = i * 3 + e;
          p[k] += vel[k];
          const lim = e === 0 ? 75 : e === 1 ? 55 : 35;
          if (p[k] > lim || p[k] < -lim) vel[k] *= -1;
        }
      }
      geoPuntos.attributes.position.needsUpdate = true;

      // Traza el vínculo entre los pares que se han encontrado.
      let v = 0;
      for (let i = 0; i < PUNTOS && v < MAX_VINCULOS; i++) {
        for (let j = i + 1; j < PUNTOS && v < MAX_VINCULOS; j++) {
          const dx = p[i * 3] - p[j * 3];
          const dy = p[i * 3 + 1] - p[j * 3 + 1];
          const dz = p[i * 3 + 2] - p[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < DIST_VINCULO * DIST_VINCULO) {
            posLinea[v * 6] = p[i * 3];
            posLinea[v * 6 + 1] = p[i * 3 + 1];
            posLinea[v * 6 + 2] = p[i * 3 + 2];
            posLinea[v * 6 + 3] = p[j * 3];
            posLinea[v * 6 + 4] = p[j * 3 + 1];
            posLinea[v * 6 + 5] = p[j * 3 + 2];
            v++;
          }
        }
      }
      geoLineas.setDrawRange(0, v * 2);
      geoLineas.attributes.position.needsUpdate = true;

      suave.x += (objetivo.x - suave.x) * 0.045;
      suave.y += (objetivo.y - suave.y) * 0.045;
      grupo.rotation.y = suave.x;
      grupo.rotation.x = suave.y;
      grupo.rotation.z += 0.0006;

      renderer.render(escena, camara);
    };
    animar();

    // Con la pestaña oculta no se anima nada.
    const onVisibilidad = () => {
      if (document.hidden) {
        vivo = false;
        cancelAnimationFrame(cuadro);
      } else if (!vivo) {
        vivo = true;
        animar();
      }
    };
    document.addEventListener("visibilitychange", onVisibilidad);

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      document.removeEventListener("visibilitychange", onVisibilidad);
      window.removeEventListener("pointermove", onPuntero);
      ro.disconnect();
      geoPuntos.dispose();
      geoLineas.dispose();
      matPuntos.dispose();
      matLineas.dispose();
      mapa.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        maskImage: DESVANECIDO,
        WebkitMaskImage: DESVANECIDO,
      }}
    />
  );
}
