# Miparner · aplicación de la marca

Cómo está implementado el **Manual de Identidad v1.0** (`miparner-logo.pdf`) en este
repositorio. Ante cualquier duda de color, logotipo o tipografía, **manda el manual**.

---

## 1. El logotipo no se redibuja

Los trazados del símbolo y del nombre se **extrajeron del arte vectorial del PDF**,
punto por punto. No hay ninguna reconstrucción a mano: el manual lo prohíbe
explícitamente («el símbolo nunca se redibuja ni se sustituye por un pin genérico»,
«el nombre en el logo es arte vectorial, no texto»).

Fuente única de verdad, idéntica en web y móvil:

| Archivo | Uso |
|---|---|
| `frontend/src/brand/paths.ts` | Trazados + cajas + proporciones (web) |
| `mobile/shared/brand/paths.ts` | Copia idéntica para React Native |
| `frontend/src/brand/Logo.tsx` | `<Logo>`, `<Isotipo>`, `<Globo>` |
| `mobile/shared/brand/Logo.tsx` | `<Logo>`, `<Isotipo>` con `react-native-svg` |

### El ojo del globo es un calado

El ojo **no** es un círculo blanco encima: es un subtrazado de bobinado inverso
dentro del mismo `path`. Con `fill-rule: nonzero` (el valor por defecto en SVG y en
`react-native-svg`) queda transparente y **toma el color del fondo**, como exige el
manual. Por eso el logotipo funciona igual sobre blanco, sobre lavanda y sobre tinta
sin tocar el arte.

### Versiones y cuándo usarlas

| Versión | Fondo permitido |
|---|---|
| `color` | Blanco o lavanda |
| `blanco` | Tinta, índigo, coral, o foto sobre zona lisa |
| `negro` | Una sola tinta: grabado, bordado, sello, fax |

**Sobre índigo o coral nunca va en color**: uno de los dos globos desaparecería
contra el fondo. En la app eso significa que la barra lateral, el hero y la cabecera
del Login llevan siempre la versión en blanco.

### Tamaños mínimos

- Logotipo completo: **140 px** de ancho · isotipo: **24 px** · impreso: 35 mm / 8 mm.
- Bajo **120 px** de ancho, el ® puede eliminarse: `<Logo sinRegistro />`.
- A **16 px** se usa **un solo globo**, no los dos: `<Globo />` y `favicon-16.svg`.
- Cuando el logotipo es enlace, su área activa mide **44 × 44 px** como mínimo
  (clase `.logo-enlace`), aunque el dibujo sea menor.

### Espacio libre

`x` = diámetro del ojo del globo. Se reserva `x` por los cuatro lados, libre de
texto, bordes, fotos y otros logos. En CSS está como `--logo-x`.

---

## 2. Color

### Paleta de marca (fija: no se aclara, no se oscurece, no se mezcla)

| | Hex | Pantone | Rol en la interfaz |
|---|---|---|---|
| Índigo | `#2E1BA8` | 2735 C | Texto de acento, enlaces, botón primario, portadas, barra lateral |
| Coral | `#E8511F` | 1665 C | **Solo forma**: iconos, barras, puntos de mapa, cifras ≥ 24 px |
| Tinta | `#1A1720` | Neutral Black C | Cuerpo de texto |
| Lavanda | `#EDE9FB` | 663 C | Tarjetas y bloques destacados |

### La regla del coral

> El coral es color de forma: **nunca lleva texto pequeño encima** ni es el único
> indicador de un estado. Para texto de acento se usa índigo o tinta.

Blanco sobre coral mide **3.7:1**, que no alcanza el 4.5:1 que pide WCAG AA para
texto normal. Por eso, en toda la aplicación:

- El **botón crítico** (pánico, desactivar) es fondo coral tenue + **borde e icono
  coral** + **texto en tinta** (15.1:1, AAA). No es coral sólido con texto blanco.
- Los **estados** usan coral solo en el icono; la palabra va en tinta.
- El coral sí puede ser un círculo sólido con un icono blanco dentro: un icono es un
  objeto gráfico y le basta 3:1 (WCAG 1.4.11).

### Neutros y escala lavanda

Tomados del propio documento del manual, no inventados:

| Token | Hex | Sobre blanco | Uso |
|---|---|---|---|
| `--ink` | `#1A1720` | 17.7:1 AAA | Cuerpo |
| `--ink-2` | `#3F3A50` | 10.9:1 AAA | Secundario |
| `--ink-3` | `#6B6480` | 5.6:1 AA | Etiquetas y texto sutil |
| `--ink-4` | `#8A83A0` | 3.6:1 | **Solo iconos y trazos, nunca texto** |
| `--lav-200` | `#DBD4FF` | 8.1:1 sobre índigo | Texto secundario sobre índigo |
| `--lav-300` | `#C9BFFF` | 6.7:1 sobre índigo | Etiquetas sobre índigo |

### Un único color funcional añadido

Un panel de gestión necesita señalar estados y el manual solo fija cuatro colores.
La solución mantiene la marca casi intacta:

- **Info / en proceso** → índigo sobre lavanda (9.6:1, combinación ya aprobada).
- **Atención / pendiente** → coral como forma + texto en tinta.
- **Crítico** → coral como forma + texto en tinta.
- **Neutro** → tinta o gris sobre superficie lavanda clara.
- **Éxito** → `#146B3A`, **el único color nuevo**, y está tomado del propio
  documento del manual. 6.6:1 sobre blanco (AA).

Todo par nuevo se midió antes de usarse, como pide la sección 04 del manual.

### Sin tema oscuro

El manual no define versiones oscuras de la marca y prohíbe aclarar u oscurecer los
cuatro colores. Construir un tema oscuro exigiría inventar un índigo más claro, así
que **se sirve un solo tema claro** y se usa tinta como fondo deliberado allí donde
el manual lo aprueba (blanco sobre tinta, 17.7:1). Se retiró el tema oscuro que
existía antes en la web y en el prototipo.

---

## 3. Tipografía

**Outfit** para todo, en tres pesos: 400 cuerpo, 500 etiqueta, 600 títulos.
El nombre del logotipo **no** se recompone con la fuente: es arte vectorial.

| Estilo | Peso / tamaño |
|---|---|
| Display | 600 / 40 px |
| Título | 600 / 24 px |
| Cuerpo | 400 / 16 px |
| Etiqueta | 500 / 12 px, versalitas espaciadas |

Reglas de legibilidad aplicadas:

- Cuerpo **mínimo 16 px**. El móvil también: se subieron los 11–14 px que había.
- Interlineado **≥ 1.5** en párrafos y **1.2** en títulos.
- **Máximo 80 caracteres** por línea (`--medida: 72ch` en los `<p>`).
- Alineación **a la izquierda, nunca justificada**. Los bloques de párrafo centrados
  de la landing se pasaron a la izquierda.
- **Sin mayúsculas en párrafos completos**: solo en etiquetas cortas.

**Tono de voz**: cercano, en español de Chile, se habla de tú. Los mensajes de error
dicen qué pasó y qué hacer, nunca solo «error».

---

## 4. Accesibilidad (WCAG 2.1 AA)

| Criterio | Cómo se cumple |
|---|---|
| 1.1.1 Texto alt | El logo enlazado: `aria-label="Miparner, ir al inicio"`. Si el nombre ya está en texto al lado, `alt=""`. Nunca «logo» ni «imagen». |
| 1.4.1 Uso del color | Ningún estado se comunica solo con color: `<Estado>` y `<Badge>` **siempre** llevan icono + texto. La pestaña activa además cambia de peso. Los enlaces dentro de párrafos van subrayados. |
| 1.4.3 Contraste | Todos los pares usados están medidos y anotados en `index.css` y `theme.ts`. |
| 1.4.11 Gráficos | El isotipo mantiene 3:1 contra su fondo; por eso no se usa en color sobre coral ni sobre índigo. |
| 2.4.7 Foco | Contorno de 2 px en índigo con 2 px de separación; blanco sobre fondo oscuro (`.sobre-indigo`). |
| 2.5.5 Táctil | Botones, pills y el logo enlazado miden 44 × 44 px como mínimo. |
| Zoom 200 % | Medidas en `rem`/`ch` y rejillas `auto-fit`: no hay corte de contenido. |
| Movimiento | `prefers-reduced-motion: reduce` desactiva transiciones y **no monta** el fondo 3D. |

Antes de publicar, el manual pide revisar: alt correcto, contraste medido, foco
visible, zoom al 200 % sin cortes y la pieza legible **en escala de grises**.

---

## 5. Three.js: solo en el Login

`frontend/src/brand/FondoConstelacion.tsx` anima el panel de marca del Login.
Puntos a la deriva que trazan un vínculo cuando dos se acercan: el símbolo puesto en
movimiento, «dos personas, un mismo lugar», sin tocar el logotipo.

Es la **única** vista con 3D. Las vistas internas de gestión priorizan rendimiento.
Salvaguardas:

- Carga diferida (`lazy` + `Suspense`): sale en su propio *chunk* y no bloquea el
  formulario.
- No se monta con `prefers-reduced-motion: reduce`.
- No se monta en equipos modestos (menos de 4 núcleos o 4 GB, o pantalla < 768 px).
- Se detiene con la pestaña en segundo plano; libera geometrías, materiales y
  contexto WebGL al desmontar.
- `aria-hidden` y sin captura de puntero: es decoración.
- Una máscara lo desvanece sobre la columna de texto, para que el logotipo y los
  titulares queden sobre **zona lisa**.

Si no hay WebGL, el panel queda en índigo plano y no se pierde nada.

---

## 6. Tipografía en las apps móviles

Android resuelve `fontFamily` por el **nombre del archivo** en
`android/app/src/main/assets/fonts/`, no por peso: no vale poner `fontWeight`
sobre una familia personalizada, hay que nombrar la variante exacta. Por eso en
todo el código móvil se usa el token `fuente.*` de `mobile/shared/theme.ts` y no
queda ni un `fontWeight` suelto:

| Token | Archivo | Peso del manual |
|---|---|---|
| `fuente.normal` | `Outfit-Regular.ttf` | 400 · cuerpo |
| `fuente.medio` | `Outfit-Medium.ttf` | 500 · etiquetas |
| `fuente.fuerte` | `Outfit-SemiBold.ttf` | 600 · títulos |

Outfit se publica como fuente variable. Las tres estáticas se instancian con
`design/scripts/gen_fuentes.py`, que descarga la variable y la corta en los tres
pesos. Si cambian los pesos del manual, se cambia ahí.

> iOS todavía no está generado. Cuando lo esté, las mismas tres fuentes se
> añaden al target y se referencian por su nombre PostScript.

## 7. Profundidad y movimiento

El manual prohíbe sombras **sobre el logotipo**; no dice nada de la interfaz. Las
sombras de `elevacion.*` son de profundidad de interfaz: muy suaves, teñidas de
tinta y nunca de negro puro. Tres niveles: `suave` para tarjetas en reposo,
`media` para paneles de marca, `alta` para la barra de pestañas.

El movimiento es corto y funcional, nunca decorativo: los botones se hunden un 3 %
al pulsarse, la barra de progreso crece en 650 ms y los esqueletos de carga laten
mientras llega el dato. En web, todo esto queda anulado por
`prefers-reduced-motion`.

## 8. Archivos de marca

`frontend/public/brand/` — SVG, que es el formato para pantalla y web. Nunca JPG del logo.

```
logo.svg  logo-white.svg  logo-black.svg
isotipo.svg  isotipo-white.svg  isotipo-black.svg
favicon.svg        · isotipo cuadrado
favicon-16.svg     · un solo globo, para 16 px
app-icon.svg       · color sobre lavanda
app-icon-indigo.svg· blanco sobre índigo
```

Rasters, solo donde el sistema no acepta SVG:

```
frontend/public/  favicon.ico (16/32/48) · favicon-16.png · favicon-32.png
                  apple-touch-icon.png · icon-192.png · icon-512.png
                  og-image.png (blanco sobre índigo, 11.4:1)
mobile/<app>/assets/  icon.png (1024) · adaptive-icon.png · splash.png · favicon.png
```

Los iconos de las dos apps usan **dos versiones aprobadas distintas** —color sobre
lavanda para Deportista, blanco sobre índigo para Voluntario— para que se distingan
en el launcher sin salirse de la marca.

### Regenerar los assets

Los SVG y PNG **se generan desde el PDF**, no se editan a mano:

```bash
py -3 -m pip install pymupdf
py -3 design/scripts/gen_brand.py    # SVG + frontend/src/brand/paths.ts
py -3 design/scripts/gen_raster.py   # PNG e ICO para web y las dos apps
```

Son idempotentes: con el mismo PDF producen archivos byte a byte idénticos. Si el
manual cambia, se vuelve a extraer desde el PDF nuevo en lugar de retocar los
archivos generados.

> `gen_brand.py` también reescribe `paths.ts`. La copia de `mobile/shared/brand/`
> debe quedar idéntica a la de `frontend/src/brand/`.
