"""Genera las tres estaticas de Outfit que usan las apps moviles.

Outfit se distribuye como fuente variable. Android resuelve `fontFamily` por el
NOMBRE DEL ARCHIVO, no por peso, asi que hace falta un archivo por variante.
Se instancian los tres pesos que define el manual: 400 cuerpo, 500 etiqueta,
600 titulos.

Uso:  py -3 design/scripts/gen_fuentes.py
Requiere:  py -3 -m pip install fonttools
"""
import os
import urllib.request

from fontTools import ttLib
from fontTools.varLib import instancer

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VARIABLE = "https://github.com/google/fonts/raw/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
PESOS = {400: "Regular", 500: "Medium", 600: "SemiBold"}
APPS = ("deportista", "voluntario")

cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_OutfitVF.ttf")
if not os.path.exists(cache):
    print("descargando la variable de Outfit…")
    urllib.request.urlretrieve(VARIABLE, cache)

with open(cache, "rb") as f:
    assert f.read(4) == b"\x00\x01\x00\x00", "el archivo descargado no es un TTF"

destinos = [
    os.path.join(RAIZ, "mobile", app, "android", "app", "src", "main", "assets", "fonts")
    for app in APPS
]
for d in destinos:
    os.makedirs(d, exist_ok=True)

for peso, nombre in PESOS.items():
    f = ttLib.TTFont(cache)
    instancer.instantiateVariableFont(f, {"wght": peso}, inplace=True, updateFontNames=True)
    archivo = f"Outfit-{nombre}.ttf"
    primero = os.path.join(destinos[0], archivo)
    f.save(primero)
    datos = open(primero, "rb").read()
    for d in destinos[1:]:
        open(os.path.join(d, archivo), "wb").write(datos)
    print(f"  {archivo:22} {len(datos) // 1024:>3} kB  ->  {len(destinos)} apps")

print("\nlisto. Los nombres de archivo deben coincidir con `fuente.*` en mobile/shared/theme.ts")
