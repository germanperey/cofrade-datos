"""Capturas de la galería «Así se ve por dentro» de la portada, rehechas desde la edición más nueva (15-11-2026).

Germán: «verifica que todos los gráficos siempre se actualicen». La portada mostraba imágenes fijas del 13-11 (por ejemplo, mercados
con el DAX «cierre 23-10»). El vigía las rehace una vez por edición: abre la edición más nueva, lleva cada gráfico a la pantalla,
espera que se dibuje y lo fotografía. Cada imagen conserva el MISMO tamaño en píxeles de siempre (la portada ordena sus filas con esa
proporción), centrada sobre el color de fondo del propio gráfico. Una captura en blanco o fallida no reemplaza a la anterior.

python3 herramientas/capturas.py [--sitio https://www.cofrad.es] [--forzar]
"""
import argparse
import io
import os
import sys

import requests

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA = os.path.join(RAIZ, "sitio", "capturas")
UA = "CofradeNews-Vigia/1.0 (capturas de la propia portada; github.com/germanperey/cofrade-datos)"
# archivo → (id del gráfico en la edición, ancho, alto): los tamaños de siempre (la portada usa su proporción en --r)
OBJETIVOS = {
    "indicadores": ("gSeries", 1000, 426),
    "mercados": ("gMercados", 962, 886),
    "perspectivas-2050": ("gPjSector", 1000, 721),
    "estrecho": ("gEstrecho", 1000, 367),
    "industrias": ("gIndMapa", 700, 1242),
    "gobiernos": ("gGobMacro", 1000, 319),
}


def encajar(png, ancho, alto):
    """PNG → WebP de ancho×alto: la imagen entra completa (sin recortar ni deformar), centrada sobre el color de su esquina."""
    from PIL import Image, ImageStat
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if max(ImageStat.Stat(im.convert("L")).stddev) < 6:
        raise ValueError("captura en blanco")
    fondo = im.getpixel((2, 2))
    esc = min(ancho / im.width, alto / im.height)
    im = im.resize((max(1, round(im.width * esc)), max(1, round(im.height * esc))), Image.LANCZOS)
    lienzo = Image.new("RGB", (ancho, alto), fondo)
    lienzo.paste(im, ((ancho - im.width) // 2, (alto - im.height) // 2))
    out = io.BytesIO()
    lienzo.save(out, "WEBP", quality=82, method=6)
    return out.getvalue()


def main(argv=None):
    a = argparse.ArgumentParser()
    a.add_argument("--sitio", default=os.environ.get("VIGIA_SITIO", "https://www.cofrad.es"))
    a.add_argument("--forzar", action="store_true")
    a = a.parse_args(argv)
    r = requests.get(a.sitio + "/edicion", allow_redirects=False, timeout=40, headers={"User-Agent": UA})
    fecha = r.headers.get("Location", "").rstrip("/").split("/")[-1]
    if not fecha or len(fecha) != 10:
        print("Capturas: no se encontró la edición más nueva")
        return 0
    marca = os.path.join(CARPETA, "fecha.txt")
    previa = open(marca).read().strip() if os.path.exists(marca) else ""
    if previa == fecha and not a.forzar:
        print(f"Capturas: ya están hechas desde la edición del {fecha}")
        return 0
    from playwright.sync_api import sync_playwright
    hechas = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1100, "height": 1000}, device_scale_factor=1, user_agent=UA)
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)[:160]))
        pg.goto(f"{a.sitio}/edicion/{fecha}", wait_until="load", timeout=120000)
        pg.wait_for_timeout(2500)
        # los botones flotantes del sitio y de la edición no salen en las fotos
        pg.add_style_tag(content="#cnFab,#cnSubir,#cnVolver,.cn-menu,.cn-fab{display:none!important}")
        if errores:
            print("Capturas: la edición tiene errores de JavaScript; no se toca la portada:", errores[:2])
            b.close()
            return 0
        for archivo, (gid, ancho, alto) in OBJETIVOS.items():
            try:
                el = pg.query_selector(f"#{gid}")
                if not el:
                    print(f"Capturas: {archivo}: no está #{gid} en la edición")
                    continue
                el.scroll_into_view_if_needed()
                pg.wait_for_function("id => { const c = document.getElementById(id); return c && c.querySelector('canvas,svg'); }", arg=gid, timeout=15000)
                pg.wait_for_timeout(1200)   # termina la animación de entrada del gráfico
                webp = encajar(el.screenshot(type="png"), ancho, alto)
                open(os.path.join(CARPETA, archivo + ".webp"), "wb").write(webp)
                hechas.append(archivo)
            except Exception as ex:   # noqa: BLE001 — una captura fallida deja la anterior
                print(f"Capturas: {archivo}: {type(ex).__name__}: {str(ex)[:120]}")
        b.close()
    if len(hechas) == len(OBJETIVOS):
        open(marca, "w").write(fecha + "\n")
    print(f"Capturas desde la edición del {fecha}: {len(hechas)} de {len(OBJETIVOS)} ({', '.join(hechas)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
