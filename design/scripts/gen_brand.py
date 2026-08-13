"""Genera los assets de marca Miparner a partir de los vectores del manual de identidad.

Los trazados provienen del PDF original (miparner-logo.pdf, pagina 02) y no se
redibujan: se preservan punto por punto. El ojo del globo es un calado (subtrazado
de bobinado inverso), por lo que toma el color del fondo tal como exige el manual.
"""
# Uso:  py -3 design/scripts/gen_brand.py
# Requiere:  py -3 -m pip install pymupdf
# Las rutas se resuelven desde la raiz del repo, no desde el directorio actual.
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json, re
import pymupdf

SRC = os.path.join(RAIZ, 'miparner-logo.pdf')
WEB = os.path.join(RAIZ, 'frontend', 'public', 'brand')
INDIGO, CORAL, TINTA, LAVANDA = '#2E1BA8', '#E8511F', '#1A1720', '#EDE9FB'

doc = pymupdf.open(SRC)
page = doc[1]
svg = page.get_svg_image()
raw = [(m.group(1), m.group(2), m.group(3)) for m in re.finditer(
    r'<path transform="matrix\(([^)]*)\)" d="([^"]*)" fill="(#e8511f|#2e1ba8|#1a1720)"/>', svg)]
mtx = raw[0][0].split(',')
sx, sy, tx, ty = float(mtx[0]), float(mtx[3]), float(mtx[4]), float(mtx[5])
inv = lambda x, y: ((x - tx) / sx, (y - ty) / sy)

CORAL_PIN, INDIGO_PIN = raw[0][1], raw[1][1]
WORD = [d for _, d, _ in raw[2:11]]            # m i p a r n e r (R)

drs = page.get_drawings()


def box(idxs):
    b = [1e9, 1e9, -1e9, -1e9]
    for i in idxs:
        r = drs[i]['rect']
        b = [min(b[0], r.x0), min(b[1], r.y0), max(b[2], r.x1), max(b[3], r.y1)]
    x0, y0 = inv(b[0], b[1]); x1, y1 = inv(b[2], b[3])
    return [round(x0, 2), round(y0, 2), round(x1 - x0, 2), round(y1 - y0, 2)]


VB_FULL = box(range(2, 13))     # logotipo completo (simbolo + nombre)
VB_ISO = box([2, 3])            # isotipo (los dos globos)
VB_PIN = box([3])               # un solo globo, para 16 px


def build(vb, groups, bg=None, radius=0, pad=0.0, square=False):
    """groups: lista de (fill, [d, ...]). pad en fraccion del lado mayor."""
    x, y, w, h = vb
    if pad:
        m = max(w, h) * pad
        x, y, w, h = x - m, y - m, w + 2 * m, h + 2 * m
    if square:                       # centra el dibujo en un lienzo cuadrado
        s = max(w, h)
        x, y = x - (s - w) / 2, y - (s - h) / 2
        w = h = s
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {round(w,2)} {round(h,2)}"'
           f' width="{round(w,2)}" height="{round(h,2)}" role="img">']
    if bg:
        r = f' rx="{round(radius,2)}"' if radius else ''
        out.append(f'<rect width="{round(w,2)}" height="{round(h,2)}"{r} fill="{bg}"/>')
    out.append(f'<g transform="translate({round(-x,2)} {round(-y,2)})">')
    for fill, ds in groups:
        out.append(f'<path fill="{fill}" d="{"".join(ds)}"/>')
    out.append('</g></svg>\n')
    return '\n'.join(out)


COLOR_ISO = [(INDIGO, [INDIGO_PIN]), (CORAL, [CORAL_PIN])]
MONO_ISO = lambda c: [(c, [INDIGO_PIN, CORAL_PIN])]
COLOR_FULL = COLOR_ISO + [(TINTA, WORD)]
MONO_FULL = lambda c: [(c, [INDIGO_PIN, CORAL_PIN] + WORD)]

files = {
    # logotipo completo
    'logo.svg':            build(VB_FULL, COLOR_FULL),
    'logo-white.svg':      build(VB_FULL, MONO_FULL('#FFFFFF')),
    'logo-black.svg':      build(VB_FULL, MONO_FULL(TINTA)),
    # isotipo
    'isotipo.svg':         build(VB_ISO, COLOR_ISO),
    'isotipo-white.svg':   build(VB_ISO, MONO_ISO('#FFFFFF')),
    'isotipo-black.svg':   build(VB_ISO, MONO_ISO(TINTA)),
    # favicon y app icon
    'favicon.svg':         build(VB_ISO, COLOR_ISO, pad=0.04, square=True),
    'favicon-16.svg':      build(VB_PIN, [(INDIGO, [INDIGO_PIN])], pad=0.05, square=True),
    'app-icon.svg':        build(VB_ISO, COLOR_ISO, bg=LAVANDA, radius=112, pad=0.26, square=True),
    'app-icon-indigo.svg': build(VB_ISO, MONO_ISO('#FFFFFF'), bg=INDIGO, radius=112, pad=0.26, square=True),
}
os.makedirs(WEB, exist_ok=True)
for name, body in files.items():
    open(os.path.join(WEB, name), 'w', encoding='utf8').write(body)
    print('svg ', name, len(body))

# Volcado intermedio, util para depurar. Fuera de public/: no se despliega.
json.dump({'VB_FULL': VB_FULL, 'VB_ISO': VB_ISO, 'VB_PIN': VB_PIN,
           'INDIGO_PIN': INDIGO_PIN, 'CORAL_PIN': CORAL_PIN, 'WORD': WORD},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_paths.json'), 'w'), indent=1)

# ---------------------------------------------------------------------------
# Modulo TypeScript con los trazados, consumido por los componentes <Logo>.
# Se escribe la misma copia en web y en movil.
# ---------------------------------------------------------------------------
assert len(WORD) == 9, f'se esperaban 9 glifos en el nombre, hay {len(WORD)}'
TS = f'''// Trazados del logotipo Miparner.
// Extraídos del arte vectorial del Manual de Identidad v1.0 (miparner-logo.pdf).
// NO se redibujan ni se sustituyen: el manual prohíbe reconstruir el símbolo.
// El ojo del globo es un calado (subtrazado de bobinado inverso): con fill-rule
// "nonzero" queda transparente y toma el color del fondo, como exige el manual.
//
// GENERADO por design/scripts/gen_brand.py · no editar a mano.

/** Caja del logotipo completo: símbolo + nombre + ®. */
export const VB_LOGO = {{ x: {VB_FULL[0]}, y: {VB_FULL[1]}, w: {VB_FULL[2]}, h: {VB_FULL[3]} }} as const;
/** Caja del isotipo: los dos globos. */
export const VB_ISOTIPO = {{ x: {VB_ISO[0]}, y: {VB_ISO[1]}, w: {VB_ISO[2]}, h: {VB_ISO[3]} }} as const;
/** Caja de un solo globo: la versión de 16 px. */
export const VB_GLOBO = {{ x: {VB_PIN[0]}, y: {VB_PIN[1]}, w: {VB_PIN[2]}, h: {VB_PIN[3]} }} as const;

/** Globo índigo (izquierda). */
export const D_GLOBO_INDIGO = "{INDIGO_PIN}";
/** Globo coral (derecha). */
export const D_GLOBO_CORAL = "{CORAL_PIN}";
/** Nombre «miparner» como arte vectorial. No se recompone con la fuente. */
export const D_NOMBRE = "{''.join(WORD[:8])}";
/** Registro ®. Parte del arte; bajo 120 px de ancho puede eliminarse. */
export const D_REGISTRO = "{WORD[8]}";

/** Colores fijos del manual. */
export const MARCA = {{ indigo: "{INDIGO}", coral: "{CORAL}", tinta: "{TINTA}", lavanda: "{LAVANDA}" }} as const;

/** Proporciones, para reservar espacio sin salto de layout. */
export const RATIO_LOGO = {round(VB_FULL[2] / VB_FULL[3], 6)};
export const RATIO_ISOTIPO = {round(VB_ISO[2] / VB_ISO[3], 6)};
export const RATIO_GLOBO = {round(VB_PIN[2] / VB_PIN[3], 6)};
'''
for destino in (os.path.join(RAIZ, 'frontend', 'src', 'brand', 'paths.ts'),
                os.path.join(RAIZ, 'mobile', 'shared', 'brand', 'paths.ts')):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    open(destino, 'w', encoding='utf8').write(TS)
    print('ts  ', os.path.relpath(destino, RAIZ), len(TS))

print('viewBox full', VB_FULL, 'iso', VB_ISO, 'pin', VB_PIN)
