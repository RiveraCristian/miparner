"""Iconos de launcher de las dos apps, desde el isotipo del manual.

Cada app usa una version aprobada distinta (color sobre lavanda / blanco sobre
indigo) para distinguirse en el launcher sin salirse de la marca.
"""
# Uso:  py -3 design/scripts/gen_mipmaps.py
# Requiere:  py -3 -m pip install pymupdf
# Las rutas se resuelven desde la raiz del repo, no desde el directorio actual.
import os
import pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BR = os.path.join(RAIZ, 'frontend', 'public', 'brand') + '/'
REPO = os.path.join(RAIZ, 'mobile')
INDIGO = (46 / 255, 27 / 255, 168 / 255)
LAVANDA = (237 / 255, 233 / 255, 251 / 255)

# densidad -> lado en px
DENSIDADES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}

APPS = [
    ('deportista', LAVANDA, 'isotipo.svg'),
    ('voluntario', INDIGO, 'isotipo-white.svg'),
]


def icono(lado, fondo, svg, redondo):
    """Compone el isotipo centrado sobre el fondo, en un lienzo cuadrado."""
    doc = pymupdf.open()
    pg = doc.new_page(width=lado, height=lado)
    caja = pymupdf.Rect(0, 0, lado, lado)
    if redondo:
        # Circulo inscrito: el launcher recorta igual, pero asi el PNG ya es redondo.
        pg.draw_circle((lado / 2, lado / 2), lado / 2, color=None, fill=fondo)
    else:
        pg.draw_rect(caja, color=None, fill=fondo)

    art = pymupdf.open(BR + svg)
    razon = art[0].rect.width / art[0].rect.height
    # El arte ocupa el 58 % del lado: deja aire suficiente para el recorte.
    ancho = lado * 0.58
    alto = ancho / razon
    x, y = (lado - ancho) / 2, (lado - alto) / 2
    pg.show_pdf_page(pymupdf.Rect(x, y, x + ancho, y + alto),
                     pymupdf.open('pdf', art.convert_to_pdf()), 0)
    # dpi=72 sobre un lienzo en puntos da 1 px por punto
    return pg.get_pixmap(dpi=72, alpha=True)


for carpeta, fondo, svg in APPS:
    res = os.path.join(REPO, carpeta, 'android', 'app', 'src', 'main', 'res')
    for densidad, lado in DENSIDADES.items():
        d = os.path.join(res, f'mipmap-{densidad}')
        os.makedirs(d, exist_ok=True)
        icono(lado, fondo, svg, False).save(os.path.join(d, 'ic_launcher.png'))
        icono(lado, fondo, svg, True).save(os.path.join(d, 'ic_launcher_round.png'))
    print(f'  {carpeta}: 10 iconos ({", ".join(f"{k} {v}px" for k, v in DENSIDADES.items())})')

print('listo')
