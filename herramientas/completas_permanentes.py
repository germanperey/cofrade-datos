# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).
"""Ediciones completas para siempre (14-11-2026, Germán: «verificar los respaldos de cada Newsletter»).

La rama «ediciones» guarda solo las 16 ediciones completas más recientes (con gráficos interactivos): la Skill la reescribe cada
día y borra la más antigua. Este programa copia cada edición completa, antes de que se borre, a un «release» mensual del
repositorio (completas-AAAA-MM). Los archivos de un release no engordan el repositorio y quedan para siempre.

Deja archivo/manifiesto/completas.json con la huella y la dirección de cada una, para que el script de Google Drive
(assets/google/cofrade-respaldo-drive.gs de la Skill) también las copie a Cofrade-News-Archivo/completas/AAAA-MM/.
www.cofrad.es las lee de ahí cuando ya no están en la rama.

Uso (lo corre GitHub Actions con GH_TOKEN; también a mano):
    python3 herramientas/completas_permanentes.py [--ref origin/ediciones] [--seco]"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

REPO = "germanperey/cofrade-datos"
BASE = f"https://github.com/{REPO}/releases/download"
RX = re.compile(r"^Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$")
MANIFIESTO = "archivo/manifiesto/completas.json"
MESES = "archivo/manifiesto/meses.json"


def _run(args, binario=False):
    return subprocess.run(args, capture_output=True, text=not binario)


def en_rama(ref):
    """Nombres de las ediciones completas de la rama (vacío si no se pudo leer)."""
    r = _run(["git", "ls-tree", "--name-only", ref])
    return sorted(n for n in r.stdout.split() if RX.match(n)) if r.returncode == 0 else []


def contenido(ref, nombre):
    r = _run(["git", "show", f"{ref}:{nombre}"], binario=True)
    return r.stdout if r.returncode == 0 else None


def huella(b):
    return hashlib.sha256(b).hexdigest()[:16]


def assets(tag):
    """{nombre: tamaño} del release, o None si el release no existe."""
    r = _run(["gh", "release", "view", tag, "--repo", REPO, "--json", "assets"])
    if r.returncode != 0:
        return None
    return {a["name"]: a.get("size") for a in json.loads(r.stdout or "{}").get("assets") or []}


def crear_release(tag, mes):
    r = _run(["gh", "release", "create", tag, "--repo", REPO, "--title", f"Ediciones completas de Cofrade News · {mes}",
              "--notes", f"Ediciones completas de {mes}, con todos sus gráficos interactivos. Se agregan solas cada día y no se borran.",
              "--latest=false"])
    return r.returncode == 0, (r.stderr or r.stdout)[-200:]


def subir(tag, ruta, reemplazar=False):
    r = _run(["gh", "release", "upload", tag, ruta, "--repo", REPO] + (["--clobber"] if reemplazar else []))
    return r.returncode == 0, (r.stderr or r.stdout)[-200:]


def leer(ruta, defecto):
    try:
        return json.load(open(ruta, encoding="utf-8"))
    except (OSError, ValueError):
        return defecto


def escribir_si_cambia(ruta, obj):
    texto = json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    try:
        if open(ruta, encoding="utf-8").read() == texto:
            return False
    except OSError:
        pass
    os.makedirs(os.path.dirname(ruta) or ".", exist_ok=True)
    open(ruta, "w", encoding="utf-8").write(texto)
    return True


def main(argv=None, hoy=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="origin/ediciones")
    ap.add_argument("--seco", action="store_true", help="solo muestra lo que haría")
    a = ap.parse_args(argv)
    hoy = hoy or dt.datetime.now(dt.timezone.utc).date().isoformat()
    nombres = en_rama(a.ref)
    if not nombres:
        print("No se pudo leer la rama de ediciones: no se toca nada.")
        return 0
    man = leer(MANIFIESTO, {})
    archivos = dict(man.get("archivos") or {})   # nunca se quitan entradas: lo copiado queda copiado
    releases, subidas, fallas, avisos = {}, 0, [], []
    for n in nombres:
        f = RX.match(n).group(1)
        mes, tag = f[:7], f"completas-{f[:7]}"
        clave = f"completas/{mes}/{n}"
        b = contenido(a.ref, n)
        if not b:   # 14-11-2026 (auditoría): una edición vacía en la rama se salta con aviso; no traba las demás ni el índice
            avisos.append(f"{n}: vacía o ilegible en la rama (se salta)")
            continue
        h = huella(b)
        if tag not in releases:
            releases[tag] = assets(tag)
        ya = releases[tag]
        if ya is not None and n in ya and (archivos.get(clave) or {}).get("h") == h:
            continue   # ya está, igual
        if a.seco:
            print(f"subiría {n} ({len(b):,} bytes) a {tag}")
            continue
        if ya is None:
            # No se sabe si el release no existe o si «gh» falló una vez: se intenta crearlo y se vuelve a leer la lista REAL.
            # Antes se suponía vacío y lo ya subido daba «already exists».
            ok, msg = crear_release(tag, mes)
            ya = assets(tag)
            if ya is None:
                fallas.append(f"{tag}: no se pudo crear ni leer el release ({msg})")
                continue
            releases[tag] = ya
            if n in ya and (archivos.get(clave) or {}).get("h") == h:
                continue
        tmp = os.path.join(tempfile.mkdtemp(), n)
        with open(tmp, "wb") as fh:
            fh.write(b)
        ok, msg = subir(tag, tmp, reemplazar=n in ya)
        if not ok:
            fallas.append(f"{n}: no se pudo subir ({msg})")
            continue
        ya[n] = len(b)
        archivos[clave] = {"h": h, "b": len(b), "u": f"{BASE}/{tag}/{n}"}
        subidas += 1
    if not a.seco:
        cambio = escribir_si_cambia(MANIFIESTO, {"mes": "completas", "actualizado": hoy, "archivos": dict(sorted(archivos.items()))}) \
            if subidas or not man else False
        meses = leer(MESES, {})
        lista = sorted(set((meses.get("meses") or []) + ["completas"]))
        if lista != meses.get("meses"):
            escribir_si_cambia(MESES, dict(meses, meses=lista))
        print(f"Ediciones completas permanentes: {subidas} nuevas; {len(archivos)} en total; manifiesto {'actualizado' if cambio else 'sin cambios'}.")
    for x in avisos + fallas:
        print("AVISO:", x)
    return 1 if fallas else 0


if __name__ == "__main__":
    sys.exit(main())
