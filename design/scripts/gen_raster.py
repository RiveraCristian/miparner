"""Rasteriza los SVG de marca a los PNG/ICO que piden los sistemas que no aceptan SVG."""
# Uso:  py -3 design/scripts/gen_raster.py
# Requiere:  py -3 -m pip install pymupdf
# Las rutas se resuelven desde la raiz del repo, no desde el directorio actual.
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import struct
import pymupdf

BR = os.path.join(RAIZ, 'frontend', 'public', 'brand') + '/'
PUB = os.path.join(RAIZ, 'frontend', 'public') + '/'
MOB = os.path.join(RAIZ, 'mobile') + '/'
INDIGO = (46 / 255, 27 / 255, 168 / 255)
LAVANDA = (237 / 255, 233 / 255, 251 / 255)


def render(svg, px, out=None):
    d = pymupdf.open(BR + svg)
    p = d[0]
    z = px / p.rect.width
    pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=True)
    if out:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        pix.save(out)
        print('png ', out.split('/miparner/')[-1], pix.width, 'x', pix.height)
    return pix


def canvas(w, h, bg, svg, frac, out, dy=0.0):
    """Compone un SVG centrado sobre un fondo solido."""
    doc = pymupdf.open()
    pg = doc.new_page(width=w, height=h)
    pg.draw_rect(pymupdf.Rect(0, 0, w, h), color=None, fill=bg)
    art = pymupdf.open(BR + svg)
    ar = art[0].rect.width / art[0].rect.height
    aw = w * frac
    ah = aw / ar
    if ah > h * frac:
        ah = h * frac
        aw = ah * ar
    x, y = (w - aw) / 2, (h - ah) / 2 + dy * h
    pg.show_pdf_page(pymupdf.Rect(x, y, x + aw, y + ah), pymupdf.open('pdf', art.convert_to_pdf()), 0)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    pg.get_pixmap(dpi=72).save(out)
    print('png ', out.split('/miparner/')[-1], w, 'x', h)


def ico(path, sizes):
    """ICO con payloads PNG (soportado desde Vista)."""
    blobs = []
    for s in sizes:
        svg = 'favicon-16.svg' if s <= 16 else 'favicon.svg'   # a 16 px, un solo globo
        blobs.append((s, render(svg, s).tobytes('png')))
    head = struct.pack('<HHH', 0, 1, len(blobs))
    off = 6 + 16 * len(blobs)
    dirs, data = b'', b''
    for s, b in blobs:
        dirs += struct.pack('<BBBBHHII', s if s < 256 else 0, s if s < 256 else 0, 0, 0, 1, 32, len(b), off)
        off += len(b)
        data += b
    open(path, 'wb').write(head + dirs + data)
    print('ico ', path.split('/miparner/')[-1], sizes)


# ---------- web ----------
render('favicon.svg', 32, PUB + 'favicon-32.png')
render('favicon-16.svg', 16, PUB + 'favicon-16.png')
render('app-icon.svg', 180, PUB + 'apple-touch-icon.png')
render('app-icon.svg', 192, PUB + 'icon-192.png')
render('app-icon.svg', 512, PUB + 'icon-512.png')
render('isotipo.svg', 512, PUB + 'brand/isotipo-512.png')
render('logo.svg', 1200, PUB + 'brand/logo-1200.png')
ico(PUB + 'favicon.ico', [16, 32, 48])
# tarjeta social: blanco sobre indigo (11.4:1, AAA)
canvas(1200, 630, INDIGO, 'logo-white.svg', 0.60, PUB + 'og-image.png')

# ---------- mobile ----------
# Ambas variantes estan aprobadas por el manual (color sobre lavanda / blanco sobre indigo);
# usar una por app las hace distinguibles en el launcher sin salirse de la marca.
apps = {
    'deportista': ('app-icon.svg', LAVANDA, 'isotipo.svg'),
    'voluntario': ('app-icon-indigo.svg', INDIGO, 'isotipo-white.svg'),
}
for app, (icon, bg, iso) in apps.items():
    a = f'{MOB}{app}/assets/'
    render(icon, 1024, a + 'icon.png')
    render(icon, 512, a + 'icon-512.png')
    render('favicon.svg', 48, a + 'favicon.png')
    # Android adaptive: el arte vive en el 66 % central del lienzo
    canvas(1024, 1024, bg, iso, 0.52, a + 'adaptive-icon.png')
    # splash: isotipo centrado sobre fondo de marca
    canvas(1284, 2778, bg, iso, 0.42, a + 'splash.png')
    canvas(1024, 1024, bg, iso, 0.46, a + 'splash-icon.png')
print('listo')
