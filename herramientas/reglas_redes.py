"""Reglas de YouTube y de las redes sociales, revisadas cada mes (20-11-2026).

Germán, 20-11-2026, 04:51: «Es importante que las reglas de cada Red Social y de Youtube las revises cada mes en forma
automática, para verificar cuando hayan cambiado y anticiparnos de manera automática para realizar esos ajustes y mejoras».

datos/reglas-redes.json guarda, red por red, lo que dicen HOY sus páginas oficiales sobre cómo se puede saber, gratis y sin
romper sus reglas, quién menciona a Cofrade News: el método, los cupos, los requisitos, lo prohibido, los cambios y los
anuncios con fecha, cada cosa con su fuente oficial y el día en que se vio. También guarda los AJUSTES que el recolector de
menciones del sitio aplica solo (si una red está activa y cuántas búsquedas hace al día). La tarea programada mensual revisa
las páginas oficiales, escribe la versión nueva y la sube con este script, que valida todo antes de subir:

  python3 herramientas/reglas_redes.py ver                  lo vigente, red por red, y los anuncios que se vienen
  python3 herramientas/reglas_redes.py guardar nuevo.json   valida y guarda (con copia del mes en datos/reglas-redes/)
  python3 herramientas/reglas_redes.py subir                sube a GitHub SOLO esos archivos

«guardar» y «subir» terminan con 0 (listo, o nada que subir), 3 (sin permiso para subir) o 4 (no pasa la revisión: no guarda
ni sube nada).
"""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from urllib.parse import urlsplit

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
REL = "datos/reglas-redes.json"
HIST = "datos/reglas-redes"
ORIGEN_RE = re.compile(r"github\.com[/:]germanperey/cofrade-datos(\.git)?/?$")
REDES = ("youtube", "instagram", "facebook", "x", "tiktok", "linkedin")
LECTURA = ("si", "no", "con_aprobacion", "solo_correo")   # cómo se pueden leer las menciones sin pagar
# Solo valen como fuente las páginas oficiales de cada plataforma (nunca un blog que las resume).
OFICIALES = {
    "youtube": ("developers.google.com", "support.google.com", "www.youtube.com", "blog.youtube"),
    "instagram": ("developers.facebook.com", "help.instagram.com", "transparency.meta.com", "www.facebook.com"),
    "facebook": ("developers.facebook.com", "www.facebook.com", "transparency.meta.com"),
    "x": ("docs.x.com", "developer.x.com", "x.com", "help.x.com", "legal.x.com"),
    "tiktok": ("developers.tiktok.com", "ads.tiktok.com", "business-api.tiktok.com", "www.tiktok.com"),
    "linkedin": ("learn.microsoft.com", "developer.linkedin.com", "www.linkedin.com"),
}
# Tope de búsquedas al día que el recolector puede hacer en cada red (dejando margen dentro del cupo gratuito de cada una).
TOPE_BUSQUEDAS = {"youtube": 40, "instagram": 48, "facebook": 48, "x": 0, "tiktok": 24, "linkedin": 24}
SECRETO_RE = re.compile(r"(AIza[0-9A-Za-z_\-]{20,}|EAA[0-9A-Za-z]{20,}|IG[A-Z]{2}[0-9A-Za-z]{20,}|\bBearer\s+\S{12,}|"
                        r"(?:token|secret|clave|password|apikey|api_key)\s*[=:]\s*\S{8,})", re.I)
FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _fecha(x):
    return isinstance(x, str) and bool(FECHA_RE.match(x)) and _valida(x)


def _valida(x):
    try:
        dt.date.fromisoformat(x)
        return True
    except ValueError:
        return False


def _texto(x, largo=600):
    return isinstance(x, str) and 0 < len(x.strip()) <= largo and not SECRETO_RE.search(x) and "\x00" not in x


def revisar(doc, hoy=None):
    """→ lista de problemas (vacía si el documento sirve). No cambia nada."""
    hoy = hoy or dt.date.today().isoformat()
    p = []
    if not isinstance(doc, dict):
        return ["el archivo no es un objeto JSON"]
    if not _fecha(doc.get("revisado")) or doc["revisado"] > hoy:
        p.append("«revisado» debe ser una fecha AAAA-MM-DD que no esté en el futuro")
    if not _fecha(doc.get("proxima")) or (_fecha(doc.get("revisado")) and doc["proxima"] <= doc["revisado"]):
        p.append("«proxima» debe ser una fecha AAAA-MM-DD posterior a «revisado»")
    redes = doc.get("redes")
    if not isinstance(redes, dict) or sorted(redes) != sorted(REDES):
        return p + [f"«redes» debe traer exactamente: {', '.join(REDES)}"]
    for r in REDES:
        x = redes[r]
        if not isinstance(x, dict):
            p.append(f"{r}: no es un objeto")
            continue
        if x.get("lectura_gratis") not in LECTURA:
            p.append(f"{r}: «lectura_gratis» debe ser {', '.join(LECTURA)}")
        for k in ("metodo", "cupo", "requisitos", "prohibido"):
            if not _texto(x.get(k)):
                p.append(f"{r}: falta «{k}» (texto de hasta 600 letras, sin claves)")
        fu = x.get("fuentes")
        if not isinstance(fu, list) or not fu:
            p.append(f"{r}: debe traer al menos una fuente oficial")
            fu = []
        for f in fu:
            u = f.get("url") if isinstance(f, dict) else None
            host = urlsplit(u).hostname if isinstance(u, str) else None
            if not (isinstance(u, str) and u.startswith("https://") and host and any(host == h or host.endswith("." + h) for h in OFICIALES[r])):
                p.append(f"{r}: fuente que no es una página oficial de esa red: {str(u)[:90]}")
            elif not _fecha(f.get("visto")) or f["visto"] > hoy:
                p.append(f"{r}: la fuente {u[:70]} no dice cuándo se vio (AAAA-MM-DD)")
            elif not _texto(f.get("dice"), 400):
                p.append(f"{r}: la fuente {u[:70]} no dice qué se leyó en ella")
        for k in ("cambios", "anuncios"):
            for c in x.get(k) or []:
                if not (isinstance(c, dict) and _fecha(c.get("fecha")) and _texto(c.get("que"), 400)):
                    p.append(f"{r}: cada línea de «{k}» lleva fecha AAAA-MM-DD y «que»")
        if not isinstance(x.get("cambios", []), list) or not isinstance(x.get("anuncios", []), list):
            p.append(f"{r}: «cambios» y «anuncios» son listas")
        a = x.get("ajustes")
        if not isinstance(a, dict) or not isinstance(a.get("activo"), bool) or not isinstance(a.get("busquedas_dia"), int) or isinstance(a.get("busquedas_dia"), bool):
            p.append(f"{r}: «ajustes» necesita activo (true o false) y busquedas_dia (número entero)")
        elif not 0 <= a["busquedas_dia"] <= TOPE_BUSQUEDAS[r]:
            p.append(f"{r}: busquedas_dia debe estar entre 0 y {TOPE_BUSQUEDAS[r]} (margen dentro del cupo gratuito)")
        elif a["activo"] and x.get("lectura_gratis") == "no":
            p.append(f"{r}: no puede quedar activo si la lectura gratuita es «no»")
        elif set(a) - {"activo", "busquedas_dia", "nota"} or ("nota" in a and not _texto(a["nota"], 300)):
            p.append(f"{r}: «ajustes» solo admite activo, busquedas_dia y nota")
    return p


def ver(raiz=RAIZ, hoy=None):
    hoy = hoy or dt.date.today().isoformat()
    try:
        doc = json.load(open(os.path.join(raiz, REL), encoding="utf-8"))
    except (OSError, ValueError):
        return "SIN ARCHIVO DE REGLAS (datos/reglas-redes.json no existe o no es JSON): arma la primera versión"
    out = [f"Reglas revisadas el {doc.get('revisado')} · próxima revisión: {doc.get('proxima')}"]
    hasta = (dt.date.fromisoformat(hoy) + dt.timedelta(days=45)).isoformat()
    for r in REDES:
        x = (doc.get("redes") or {}).get(r) or {}
        a = x.get("ajustes") or {}
        out.append(f"- {r}: lectura gratis = {x.get('lectura_gratis')} · {x.get('metodo')} · cupo: {x.get('cupo')} · "
                   f"recolector: {'activo' if a.get('activo') else 'apagado'}, {a.get('busquedas_dia')} búsquedas al día")
        for f in x.get("fuentes") or []:
            out.append(f"    fuente: {f.get('url')} (vista {f.get('visto')})")
        for c in x.get("anuncios") or []:
            if hoy <= c.get("fecha", "") <= hasta:
                out.append(f"    ANUNCIO PRÓXIMO {c['fecha']}: {c['que']}")
    return "\n".join(out)


def guardar(nuevo, raiz=RAIZ, hoy=None):
    """Valida y escribe datos/reglas-redes.json y la copia del mes. → (código, mensaje)."""
    hoy = hoy or dt.date.today().isoformat()
    prob = revisar(nuevo, hoy)
    if prob:
        return 4, "NO GUARDÉ NADA: " + " | ".join(prob[:8])
    texto = json.dumps(nuevo, ensure_ascii=False, indent=1) + "\n"
    os.makedirs(os.path.join(raiz, HIST), exist_ok=True)
    for rel in (REL, f"{HIST}/{nuevo['revisado'][:7]}.json"):
        ruta = os.path.join(raiz, rel)
        tmp = ruta + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(texto)
        os.replace(tmp, ruta)
    return 0, f"GUARDADO: reglas del {nuevo['revisado']} (copia en {HIST}/{nuevo['revisado'][:7]}.json)"


def _git(args, cwd):
    r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=180)
    return r.returncode, (r.stdout + r.stderr).strip()


def resguardo(raiz=RAIZ, hoy=None):
    """→ None si lo único cambiado son las reglas (y su copia del mes) y pasan la revisión; si no, el motivo."""
    c1, a = _git(["diff", "--name-only", "HEAD"], raiz)
    c2, b = _git(["ls-files", "--others", "--exclude-standard"], raiz)
    if c1 or c2:
        return "no es una copia de git del repositorio"
    cambiados = sorted({x.strip() for x in (a + "\n" + b).splitlines() if x.strip()})
    if any(not (x == REL or re.fullmatch(re.escape(HIST) + r"/\d{4}-\d{2}\.json", x)) for x in cambiados):
        return "hay otros archivos cambiados: " + ", ".join(x for x in cambiados if x != REL)[:200]
    c, origen = _git(["remote", "get-url", "origin"], raiz)
    if c or not ORIGEN_RE.search(origen):
        return "la copia no es del repositorio germanperey/cofrade-datos"
    try:
        prob = revisar(json.load(open(os.path.join(raiz, REL), encoding="utf-8")), hoy)
    except (OSError, ValueError):
        return "datos/reglas-redes.json no es un JSON válido"
    return ("no pasa la revisión: " + " | ".join(prob[:4])) if prob else None


def subir(raiz=RAIZ, hoy=None):
    c, cambios = _git(["status", "--porcelain"], raiz)
    if not c and not cambios.strip():
        return 0, "nada que subir (las reglas no cambiaron)"
    motivo = resguardo(raiz, hoy)
    if motivo:
        return 4, "NO SUBÍ NADA: " + motivo
    doc = json.load(open(os.path.join(raiz, REL), encoding="utf-8"))
    _git(["config", "user.name", "reglas-redes-cofrade"], raiz)
    _git(["config", "user.email", "reglas-redes-cofrade@users.noreply.github.com"], raiz)
    _git(["add", "--", REL, HIST], raiz)
    c, out = _git(["commit", "-m", f"Reglas de redes y YouTube revisadas el {doc['revisado']}"], raiz)
    if c:
        return 4, "NO SUBÍ NADA: no se pudo preparar el cambio: " + out[-160:]
    for _ in range(3):
        c, out = _git(["pull", "-q", "--rebase", "origin", "main"], raiz)
        if c:
            _git(["rebase", "--abort"], raiz)
            continue
        c, out = _git(["push", "-q", "origin", "HEAD:main"], raiz)
        if not c:
            return 0, f"SUBIDAS las reglas del {doc['revisado']} a GitHub: el recolector de menciones aplica sus ajustes desde ahora"
    if any(x in out for x in ("403", "denied", "Permission", "not allowed", "Authentication", "could not read Username")):
        return 3, "SIN PERMISO PARA SUBIR a GitHub: " + out[-160:]
    return 3, "NO SE PUDO SUBIR a GitHub: " + out[-160:]


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("accion", choices=("ver", "guardar", "subir"))
    a.add_argument("archivo", nargs="?")
    a.add_argument("--fecha", help="fecha de hoy en Chile, AAAA-MM-DD")
    a.add_argument("--raiz", default=RAIZ)
    a = a.parse_args(argv)
    try:
        from zoneinfo import ZoneInfo
        hoy = dt.datetime.now(ZoneInfo("America/Santiago")).date().isoformat()
    except Exception:   # noqa: BLE001 — sin tzdata: UTC-3
        hoy = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    hoy = a.fecha or hoy
    if a.accion == "ver":
        print(ver(a.raiz, hoy))
        return 0
    if a.accion == "guardar":
        if not a.archivo:
            print("falta el archivo con las reglas nuevas")
            return 2
        try:
            nuevo = json.load(open(a.archivo, encoding="utf-8"))
        except (OSError, ValueError) as ex:
            print("NO GUARDÉ NADA: el archivo no es un JSON válido:", type(ex).__name__)
            return 4
        codigo, mensaje = guardar(nuevo, a.raiz, hoy)
        print(mensaje)
        return codigo
    codigo, mensaje = subir(a.raiz, hoy)
    print(mensaje)
    return codigo


if __name__ == "__main__":
    sys.exit(main())
