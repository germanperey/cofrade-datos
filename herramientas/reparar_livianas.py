# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).
"""Repara las ediciones livianas ya publicadas en ediciones/ (14-11-2026, revisión de los respaldos).

Hasta el 14-11 la edición liviana (la que va a Drive) perdía los títulos de las secciones que venían después de una sección
recortada: quedaba «… y 5 más en la edición completa.## 4. Tecnología» dentro de una viñeta (58 títulos en 10 ediciones).
La Skill ya lo corrige al armarla (edicion_drive.py); este programa arregla las que ya estaban publicadas, sin tocar nada más,
y actualiza su huella en el manifiesto del mes para que el respaldo de Drive copie la versión arreglada.

A la edición de un día SIN edición completa guardada (no está en archivo/manifiesto/completas.json) le agrega un aviso arriba,
porque sus listas dicen «… y N más en la edición completa» y esa completa no existe (pasó el 11-11-2026). Solo a días de hace
3 o más días (auditoría del 14-11: la liviana de hoy llega antes que su completa) y el aviso se quita si la completa aparece.
Se puede correr las veces que se quiera: lo ya arreglado no cambia. Un archivo que no se pueda leer se salta con aviso.

Uso:  python3 herramientas/reparar_livianas.py [--carpeta ediciones] [--seco]"""
import argparse
import datetime as dt
import glob
import hashlib
import json
import os
import re
import sys

PEGADO = re.compile(r"<li>(… y \d+ más en la edición completa\.)##\s*([^<]+?)\s*</li>")
AVISO = ('<p class="sin-completa" style="border:1px solid #c9a227;border-radius:8px;padding:8px 12px;margin:10px 0 14px">'
         "De este día solo se conserva esta edición liviana: la edición completa no llegó a guardarse. Donde una lista dice "
         "«… y N más en la edición completa», esas notas no quedaron en ningún respaldo.</p>")
RX_FECHA = re.compile(r"Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$")
RX_AVISO = re.compile(r'<p class="sin-completa"[^>]*>.*?</p>', re.S)


def reparar(h, sin_completa=None):
    """→ (html arreglado, títulos recuperados). Solo toca los títulos pegados y el aviso: sin_completa=True lo agrega (una vez),
    False lo quita (la completa ya está), None no lo toca."""
    titulos = []

    def poner(m):
        t = m.group(2)
        titulos.append(t)
        clase = ' class="aviso"' if "AVISO" in t else ""
        return f"<li>{m.group(1)}</li></ul><h2{clase}>{t}</h2><ul>"

    h2 = PEGADO.sub(poner, h)
    h2 = re.sub(r"(</h2>)<ul>\s*</ul>", r"\1", h2)   # la lista vacía que queda cuando al título le seguía un subtítulo
    if sin_completa is False:   # la completa ya existe: el aviso, si estaba, se quita
        h2 = RX_AVISO.sub("", h2)
    if sin_completa and 'class="sin-completa"' not in h2:
        i = h2.find("</h1>")
        if i >= 0:
            j = h2.find("</p>", i)   # después de la línea de la fecha
            k = (j + 4) if 0 <= j - i < 600 else (i + 5)
            h2 = h2[:k] + AVISO + h2[k:]
    return h2, titulos


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--carpeta", default="ediciones")
    ap.add_argument("--seco", action="store_true", help="solo contar, sin escribir")
    a = ap.parse_args(argv)
    hace3 = (dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date() - dt.timedelta(days=3)).isoformat()
    try:
        completas = {RX_FECHA.search(k).group(1) for k in json.load(open("archivo/manifiesto/completas.json", encoding="utf-8"))["archivos"]
                     if RX_FECHA.search(k)}
    except (OSError, ValueError, KeyError):
        completas = None   # sin la lista no se agrega ningún aviso (no se adivina)
    manifiestos, total, cambiados = {}, 0, []
    for ruta in sorted(glob.glob(os.path.join(a.carpeta, "Cofrade-News-*.html"))):
        f = RX_FECHA.search(ruta)
        if not f:
            continue
        fecha = f.group(1)
        try:
            h = open(ruta, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError) as ex:
            print(f"AVISO {ruta}: no se pudo leer ({type(ex).__name__}); se salta")
            continue
        sin = None if completas is None else (False if fecha in completas else (True if fecha <= hace3 else None))
        nuevo, tit = reparar(h, sin_completa=sin)
        if nuevo == h:
            continue
        total += len(tit)
        cambiados.append((fecha, len(tit), nuevo.count('class="sin-completa"') > h.count('class="sin-completa"')))
        if a.seco:
            continue
        open(ruta, "w", encoding="utf-8").write(nuevo)
        mes = fecha[:7]
        if mes not in manifiestos:
            p = os.path.join("archivo", "manifiesto", f"{mes}.json")
            try:
                manifiestos[mes] = (p, json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None)
            except (OSError, ValueError):
                print(f"AVISO {p}: manifiesto ilegible; la huella la pone al día la Skill en su próxima corrida")
                manifiestos[mes] = (p, None)
        man = manifiestos[mes][1]
        clave = ruta.replace(os.sep, "/")
        if man is not None and clave in man.get("archivos", {}):
            b = nuevo.encode("utf-8")
            man["archivos"][clave] = {"h": hashlib.sha256(b).hexdigest()[:16], "b": len(b)}
    for p, man in manifiestos.values():
        if man is not None:
            open(p, "w", encoding="utf-8").write(json.dumps(man, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    for fecha, n, aviso in cambiados:
        print(f"{fecha}: {n} títulos recuperados" + (" · aviso de «solo edición liviana»" if aviso else ""))
    print(f"Ediciones livianas reparadas: {len(cambiados)} ({total} títulos){' (en seco)' if a.seco else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
