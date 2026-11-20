"""Fuentes nuevas cada día, desde la ronda profunda del Auditor (15-11-2026).

Germán, 15-11-2026: «en la primera Auditoría diaria, que es la más completa del día, debe sumar más fuentes de datos nuevas, para ir
robusteciendo las fuentes de contenidos de nuestro Newsletter».

La ronda de la 01:17 busca en la web el RSS de medios e instituciones confiables para las secciones con menos fuentes sanas y los
suma aquí como CANDIDATAS. Apenas llegan a GitHub, el «Directorio de fuentes» las verifica (robots.txt, RSS válido y notas
recientes): solo las sanas pasan a datos/fuentes-directorio.json, que bajar.py lee en cada corrida. Este script no lee la web:
ordena, filtra y guarda.

  python3 herramientas/proponer_fuentes.py faltan                   secciones más débiles y sitios que ya están (para no repetir)
  python3 herramientas/proponer_fuentes.py agregar propuestas.json  valida y suma (máx. 12 al día y 2 por sitio); nunca toca lo que había
  python3 herramientas/proponer_fuentes.py subir                    sube a GitHub SOLO herramientas/fuentes-candidatas.json

20-11-2026 (Germán, 04:50: «la "Tarea Programada" ... debe realizar en conjunto con esa tarea la búsqueda de más y nuevas fuentes de
datos, para ir ampliando y robusteciendo las fuentes de conocimiento y verificación de cada noticia e información»): la tarea del
boletín también propone fuentes, con «--origen boletin» y su propio tope (8 al día), sin gastar el cupo de la ronda del Auditor.

«subir» termina con 0 (subido, o nada que subir), 3 (sin permiso para subir) o 4 (el resguardo encontró otro cambio: no sube nada).
"""
import argparse
import datetime as dt
import ipaddress
import json
import os
import re
import subprocess
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
REL = "herramientas/fuentes-candidatas.json"
REPO = "germanperey/cofrade-datos"
ORIGEN_RE = re.compile(r"github\.com[/:]germanperey/cofrade-datos(\.git)?/?$")
SECCIONES = ("politica/chile", "politica/mundo", "economia/chile", "economia/mundo", "emprendimiento", "inmobiliario", "industrias",
             "perspectivas", "conflictos", "tecnologia", "ciencia", "astronomia", "deportes", "entretenimiento", "chilenos-mundo")
META, META_SECCION = 12, {"deportes": 30, "politica/chile": 20}   # fuentes sanas que se buscan por sección
MAX_DIA, MAX_SITIO = 12, 2
ORIGENES = {"auditor": MAX_DIA, "boletin": 8}   # quién propone y cuántas fuentes nuevas al día puede sumar cada uno
IDIOMAS = ("es", "en", "pt", "fr", "de", "it")
# Nunca: buscadores y portales que prohíben la lectura automática, redes sociales, archivos y cachés de páginas ajenas, y generadores
# de RSS de sitios que no publican RSS (saltarían la decisión de ese sitio).
PROHIBIDOS = ("bing.com", "msn.com", "facebook.com", "fb.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "t.me",
              "telegram.org", "whatsapp.com", "youtube.com", "youtu.be", "linkedin.com", "reddit.com", "threads.net", "rss.app",
              "fetchrss.com", "rsshub.app", "feed43.com", "politepol.com", "morss.it", "fivefilters.org", "feedity.com", "archive.org",
              "archive.ph", "archive.today", "googleusercontent.com", "brightdata.com")
PROHIBIDO_RE = re.compile(r"(^|\.)(google|yahoo)\.[a-z.]+$|rss-?bridge|feedcreator|createfeed")
SECRETO_RE = re.compile(r"token|secret|passw|apikey|api_key|signature|credential|^(key|sig|auth|session|sid|access_key)$", re.I)
RASTREO_RE = re.compile(r"^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$)", re.I)


def _cargar(ruta, defecto):
    try:
        return json.load(open(ruta, encoding="utf-8"))
    except (OSError, ValueError):
        return defecto


def _sitio(url):
    h = (urlsplit(url).hostname or "").lower()
    return h[4:] if h.startswith("www.") else h


def normalizar(url):
    """Misma dirección escrita distinto → misma clave (www, mayúsculas, barra final, puerto 443, #, marcas de rastreo)."""
    p = urlsplit(url.strip())
    ruta = p.path.rstrip("/") or "/"
    q = urlencode(sorted((k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if not RASTREO_RE.match(k)))
    return urlunsplit(("https", _sitio(url), ruta, q, ""))


def revisar(p):
    """→ (propuesta limpia, None) o (None, motivo del rechazo)."""
    if not isinstance(p, dict):
        return None, "no es una ficha {seccion, fuente, url}"
    sec, fuente, url = p.get("seccion"), p.get("fuente"), p.get("url")
    if sec not in SECCIONES:
        return None, f"sección desconocida: {sec!r}"
    if not isinstance(url, str) or not url or len(url) > 300 or re.search(r"[\s\x00-\x1f<>\"']", url):
        return None, "dirección vacía, muy larga o con caracteres raros"
    u = urlsplit(url)
    host = (u.hostname or "").lower()
    if u.scheme != "https":
        return None, "solo direcciones https"
    if u.username or u.password or "@" in u.netloc:
        return None, "la dirección trae usuario o clave"
    if u.port not in (None, 443):
        return None, "puerto no estándar"
    if "." not in host or host.endswith((".local", ".internal", ".localhost")) or host == "localhost":
        return None, "sitio no válido"
    try:
        ipaddress.ip_address(host.strip("[]"))
        return None, "dirección IP en vez de un sitio"
    except ValueError:
        pass
    sitio = _sitio(url)
    if any(sitio == d or sitio.endswith("." + d) for d in PROHIBIDOS) or PROHIBIDO_RE.search(sitio):
        return None, "sitio no permitido (buscador, red social, caché o generador de RSS ajeno)"
    if any(SECRETO_RE.search(k) for k, _ in parse_qsl(u.query, keep_blank_values=True)):
        return None, "la dirección parece llevar una clave"
    tipo = p.get("tipo") or "rss"
    if tipo not in ("rss", "json") or (tipo == "json" and host != "site.api.espn.com"):
        return None, "tipo no válido (rss, o json solo para la API pública de ESPN)"
    if not isinstance(fuente, str) or not 3 <= len(fuente.strip()) <= 80 or re.search(r"[\x00-\x1f<>]", fuente):
        return None, "nombre de la fuente vacío, muy largo o con caracteres raros"
    fuente = re.sub(r"\s+", " ", fuente.strip())
    if tipo == "rss" and not fuente.endswith("(RSS)"):
        fuente += " (RSS)"
    idioma = p.get("idioma") or "es"
    if idioma not in IDIOMAS:
        return None, f"idioma no válido: {idioma!r}"
    ficha = {"seccion": sec, "fuente": fuente, "url": url.strip(), "tipo": tipo, "idioma": idioma}
    motivo = p.get("motivo")
    if isinstance(motivo, str) and motivo.strip():
        ficha["motivo"] = re.sub(r"[\x00-\x1f]", " ", motivo.strip())[:160]
    return ficha, None


def _existentes(raiz):
    cand = _cargar(os.path.join(raiz, REL), {}).get("candidatas") or []
    dire = _cargar(os.path.join(raiz, "datos", "fuentes-directorio.json"), {}).get("secciones") or {}
    urls = {normalizar(c["url"]) for c in cand if isinstance(c, dict) and c.get("url")}
    urls |= {normalizar(x[1]) for L in dire.values() if isinstance(L, list) for x in L if isinstance(x, list) and len(x) >= 2}
    return cand, urls


def faltan(raiz=RAIZ, fecha=None, origen="auditor"):
    """Texto para el Auditor (o el boletín): secciones de la más débil a la más fuerte y los sitios que ya están en las más débiles."""
    fecha = fecha or dt.date.today().isoformat()
    salud = _cargar(os.path.join(raiz, "datos", "fuentes-salud.json"), {})
    res = salud.get("resumen") or {}
    cand, _ = _existentes(raiz)
    hoy = sum(1 for c in cand if str(c.get("origen", "")).startswith(f"auditor {fecha}"))
    hoy_b = sum(1 for c in cand if str(c.get("origen", "")).startswith(f"boletin {fecha}"))
    filas = []
    for s in SECCIONES:
        sanas = int((res.get(s) or {}).get("sana", 0))
        meta = META_SECCION.get(s, META)
        filas.append((sanas / meta, s, sanas, meta, sum(1 for c in cand if c.get("seccion") == s)))
    filas.sort()
    out = [f"Directorio revisado: {salud.get('generado', 'sin informe')} · candidatas: {len(cand)} · sumadas hoy por el Auditor: {hoy} "
           f"(tope {MAX_DIA} al día, {MAX_SITIO} por sitio) · sumadas hoy por el boletín: {hoy_b} (tope {ORIGENES['boletin']} al día)"]
    for _, s, sanas, meta, n in filas:
        out.append(f"- {s}: {sanas} {'sana' if sanas == 1 else 'sanas'} de {meta} buscadas · {n} {'candidata' if n == 1 else 'candidatas'}" + (" · DÉBIL" if sanas < meta / 2 else ""))
    for _, s, sanas, meta, _ in [f for f in filas if f[2] < f[3] / 2][:5] or filas[:3]:
        sitios = sorted({_sitio(c["url"]) for c in cand if c.get("seccion") == s and c.get("url")})
        out.append(f"Ya están en {s} (no repetir): " + (", ".join(sitios) if sitios else "ninguno"))
    # Lo que GitHub dijo de lo que el Auditor propuso los últimos 7 días: para aprender qué clase de fuente sirve y no repetir errores
    desde = (dt.date.fromisoformat(fecha) - dt.timedelta(days=7)).isoformat()
    pre = origen + " "
    suyas = {normalizar(c["url"]): c for c in cand if str(c.get("origen", "")).startswith(pre) and str(c.get("origen", ""))[len(pre):len(pre) + 10] >= desde}
    if suyas:
        vistos = {normalizar(r["url"]): r for r in salud.get("detalle") or [] if isinstance(r, dict) and r.get("url")}
        res7 = {}
        for k, c in suyas.items():
            r = vistos.get(k)
            res7.setdefault(r["estado"] if r else "sin revisar todavía", []).append((c, r))
        out.append("Lo que propusiste los últimos 7 días: " + ", ".join(f"{len(v)} {k}" for k, v in sorted(res7.items())))
        for k, v in sorted(res7.items()):
            if k not in ("sana", "sin revisar todavía"):
                out.extend(f"  descartada ({k}): {c['fuente']} · {c['url'][:90]} · {(r or {}).get('motivo', '')[:80]}" for c, r in v[:8])
    out.append("Agrega con: python3 herramientas/proponer_fuentes.py agregar /tmp/propuestas.json" + ("" if origen == "auditor" else f" --origen {origen}") + "  (y luego «subir»)")
    return "\n".join(out)


def agregar(propuestas, raiz=RAIZ, fecha=None, origen="auditor"):
    """→ (sumadas, rechazadas[(url, motivo)]). Escribe solo si sumó algo; las candidatas que ya estaban quedan tal cual, en su orden."""
    fecha = fecha or dt.date.today().isoformat()
    if origen not in ORIGENES:
        raise SystemExit(f"origen desconocido: {origen} (usa {' o '.join(ORIGENES)})")
    ruta = os.path.join(raiz, REL)
    doc = _cargar(ruta, None)
    if not isinstance(doc, dict) or not isinstance(doc.get("candidatas"), list):
        raise SystemExit(f"no pude leer {REL}")
    cand, vistas = _existentes(raiz)
    del_dia = [c for c in cand if any(str(c.get("origen", "")).startswith(f"{o} {fecha}") for o in ORIGENES)]
    hoy = [c for c in del_dia if str(c.get("origen", "")).startswith(f"{origen} {fecha}")]
    tope = ORIGENES[origen]
    cupo = tope - len(hoy)
    por_sitio = {}
    for c in del_dia:
        por_sitio[_sitio(c["url"])] = por_sitio.get(_sitio(c["url"]), 0) + 1
    sumadas, rechazadas = [], []
    for p in propuestas if isinstance(propuestas, list) else []:
        ficha, motivo = revisar(p)
        url = p.get("url") if isinstance(p, dict) else None
        if motivo:
            rechazadas.append((url, motivo))
            continue
        clave, sitio = normalizar(ficha["url"]), _sitio(ficha["url"])
        if clave in vistas:
            rechazadas.append((url, "ya está entre las candidatas o en el directorio"))
        elif len(sumadas) >= cupo:
            rechazadas.append((url, f"tope de {tope} fuentes nuevas al día"))
        elif por_sitio.get(sitio, 0) >= MAX_SITIO:
            rechazadas.append((url, f"tope de {MAX_SITIO} fuentes nuevas por sitio al día"))
        else:
            ficha["origen"] = f"{origen} {fecha}"
            sumadas.append(ficha)
            vistas.add(clave)
            por_sitio[sitio] = por_sitio.get(sitio, 0) + 1
    if sumadas:
        doc["candidatas"] = doc["candidatas"] + sumadas
        tmp = ruta + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(json.dumps(doc, ensure_ascii=False, indent=1))
        os.replace(tmp, ruta)
    return sumadas, rechazadas


def _git(args, cwd):
    r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=180)
    return r.returncode, (r.stdout + r.stderr).strip()


def _cambiados(raiz):
    """→ archivos cambiados respecto del último commit (con los nuevos sin registrar), o None si no es una copia de git."""
    c1, a = _git(["diff", "--name-only", "HEAD"], raiz)
    c2, b = _git(["ls-files", "--others", "--exclude-standard"], raiz)
    return None if c1 or c2 else sorted({x.strip() for x in (a + "\n" + b).splitlines() if x.strip()})


def resguardo(raiz=RAIZ):
    """→ None si lo único cambiado es la lista de candidatas, solo con fichas NUEVAS al final y todas válidas; si no, el motivo."""
    cambiados = _cambiados(raiz)
    if cambiados is None:
        return "no es una copia de git del repositorio"
    if cambiados and cambiados != [REL]:
        return "hay otros archivos cambiados: " + ", ".join(cambiados[:5])
    c, origen = _git(["remote", "get-url", "origin"], raiz)
    if c or not ORIGEN_RE.search(origen):
        return "la copia no es del repositorio " + REPO
    c, antes = _git(["show", "HEAD:" + REL], raiz)
    try:
        viejas = json.loads(antes)["candidatas"] if not c else None
        nuevas = json.load(open(os.path.join(raiz, REL), encoding="utf-8"))["candidatas"]
    except (OSError, ValueError, KeyError, TypeError):
        return "la lista de candidatas no es un JSON válido"
    if viejas is None:
        return "no pude leer la versión anterior de la lista"
    if nuevas[:len(viejas)] != viejas:
        return "se cambió o se borró una candidata que ya estaba"
    agregadas = nuevas[len(viejas):]
    if len(agregadas) > MAX_DIA:
        return f"más de {MAX_DIA} candidatas nuevas de una vez"
    for x in agregadas:
        ficha, motivo = revisar(x)
        if motivo or not any(str(x.get("origen", "")).startswith(o + " ") for o in ORIGENES) or {k: v for k, v in x.items() if k != "origen"} != ficha:
            return "una candidata nueva no pasa la revisión: " + str(x.get("url"))[:120]
    return None


def subir(raiz=RAIZ, fecha=None):
    """Sube SOLO la lista de candidatas (commit propio + push con reintentos). → (código de salida, mensaje)."""
    fecha = fecha or dt.date.today().isoformat()
    motivo = resguardo(raiz)
    if motivo:
        return 4, "NO SUBÍ NADA: " + motivo
    if not _cambiados(raiz):
        return 0, "nada que subir (no había fuentes nuevas)"
    n = len(json.load(open(os.path.join(raiz, REL), encoding="utf-8"))["candidatas"]) - len(json.loads(_git(["show", "HEAD:" + REL], raiz)[1])["candidatas"])
    _git(["config", "user.name", "auditor-cofrade"], raiz)
    _git(["config", "user.email", "auditor-cofrade@users.noreply.github.com"], raiz)
    c, out = _git(["add", "--", REL], raiz)
    c, out = _git(["commit", "-m", f"Auditor: {n} fuentes candidatas nuevas {fecha}"], raiz)
    if c:
        return 4, "NO SUBÍ NADA: no se pudo preparar el cambio: " + out[-160:]
    for _ in range(3):
        c, out = _git(["pull", "-q", "--rebase", "origin", "main"], raiz)
        if c:
            _git(["rebase", "--abort"], raiz)
            continue
        c, out = _git(["push", "-q", "origin", "HEAD:main"], raiz)
        if not c:
            return 0, f"SUBIDAS {n} fuentes candidatas a GitHub: el Directorio de fuentes las verifica ahora mismo"
    if any(x in out for x in ("403", "denied", "Permission", "not allowed", "Authentication", "could not read Username")):
        return 3, "SIN PERMISO PARA SUBIR a GitHub: " + out[-160:]
    return 3, "NO SE PUDO SUBIR a GitHub: " + out[-160:]


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("accion", choices=("faltan", "agregar", "subir"))
    a.add_argument("archivo", nargs="?")
    a.add_argument("--fecha")
    a.add_argument("--origen", choices=tuple(ORIGENES), default="auditor", help="quién propone: la ronda del Auditor o la tarea del boletín")
    a.add_argument("--raiz", default=RAIZ)
    a = a.parse_args(argv)
    try:   # la fecha de Chile (el Auditor la pasa con --fecha; esto es solo el respaldo)
        from zoneinfo import ZoneInfo
        hoy = dt.datetime.now(ZoneInfo("America/Santiago")).date().isoformat()
    except Exception:   # noqa: BLE001 — sin tzdata: UTC-3, que a la 01:17 da el mismo día todo el año
        hoy = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    fecha = a.fecha or hoy
    if a.accion == "faltan":
        print(faltan(a.raiz, fecha, a.origen))
        return 0
    if a.accion == "agregar":
        if not a.archivo:
            print("falta el archivo de propuestas")
            return 2
        sumadas, rechazadas = agregar(_cargar(a.archivo, []), a.raiz, fecha, a.origen)
        print(f"SUMADAS {len(sumadas)}: " + ("; ".join(f"{x['seccion']} · {x['fuente']}" for x in sumadas) or "ninguna"))
        for url, motivo in rechazadas:
            print(f"RECHAZADA {url} → {motivo}")
        return 0
    codigo, mensaje = subir(a.raiz, fecha)
    print(mensaje)
    return codigo


if __name__ == "__main__":
    sys.exit(main())
