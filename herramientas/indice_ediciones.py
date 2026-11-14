# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).
"""Índice de ediciones publicadas (14-11-2026, Germán: botón «Ver más» en el Archivo de www.cofrad.es).

La portada leía el archivo preguntando a GitHub día por día (hasta 120 lecturas por visita). Con el plan gratuito de Cloudflare
solo valen 50 por visita: las demás fallaban y la edición del 11-11 (que solo existía en su versión liviana) no aparecía.
Este programa deja en datos/ediciones.json la lista de TODAS las ediciones: la portada la lee de una vez.

Uso (lo corre GitHub Actions; también a mano):  python3 herramientas/indice_ediciones.py [--salida datos/ediciones.json]
Lee la rama «ediciones» (edición completa) y la carpeta ediciones/ de main (edición liviana)."""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys

RX = re.compile(r"(?:^|/)Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$")


def archivos(ref, carpeta=""):
    """Nombres de archivo de `ref` (rama o commit) dentro de `carpeta`; [] si la rama no existe."""
    try:
        r = subprocess.run(["git", "ls-tree", "-r", "--name-only", ref] + ([carpeta] if carpeta else []),
                           capture_output=True, text=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []
    return [x.strip() for x in r.stdout.splitlines() if x.strip()]


def fechas(nombres):
    out = set()
    for n in nombres:
        m = RX.search(n)
        if m:
            try:
                dt.date.fromisoformat(m.group(1))
            except ValueError:
                continue
            out.add(m.group(1))
    return out


def armar(completas, livianas, ahora=None):
    ahora = ahora or dt.datetime.now(dt.timezone.utc)
    todas = sorted(completas | livianas, reverse=True)
    return {"actualizado": ahora.strftime("%Y-%m-%dT%H:%M:%SZ"), "total": len(todas),
            "ediciones": [{"f": f, "c": int(f in completas), "l": int(f in livianas)} for f in todas]}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default="datos/ediciones.json")
    ap.add_argument("--rama-completa", default="origin/ediciones")
    ap.add_argument("--rama-liviana", default="HEAD")
    a = ap.parse_args(argv)
    completas = fechas(archivos(a.rama_completa))
    livianas = fechas(archivos(a.rama_liviana, "ediciones"))
    if not (completas or livianas):
        print("Sin ediciones: no se escribe el índice (la portada usa su respaldo).")
        return 0
    nuevo = armar(completas, livianas)
    try:
        viejo = json.load(open(a.salida, encoding="utf-8"))
    except (OSError, ValueError):
        viejo = {}
    if viejo.get("ediciones") == nuevo["ediciones"]:
        print(f"Índice sin cambios: {nuevo['total']} ediciones.")
        return 0
    os.makedirs(os.path.dirname(a.salida) or ".", exist_ok=True)
    with open(a.salida, "w", encoding="utf-8") as fh:
        json.dump(nuevo, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"Índice: {nuevo['total']} ediciones ({len(completas)} completas, {len(livianas)} livianas) → {a.salida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
