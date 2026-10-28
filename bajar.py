#!/usr/bin/env python3
"""Cofrade News · datos oficiales del día.

Pide los datos por las puertas OFICIALES para programas (API y servicios de datos abiertos), una vez al día,
con un nombre que se identifica y con pausas entre intentos. No imita a una persona ni salta ningún bloqueo:
si una fuente responde con error, se anota en datos/estado.json y la Skill usa su fuente de respaldo.

Archivos que deja en datos/:
  uv.csv              índice UV de 8 días por ciudad (Open-Meteo, uso no comercial, CC BY 4.0)   ciudad,fecha,uv
  imacec.csv          IMACEC del año (mindicador.cl, datos del Banco Central)                    mes,var
  indicadores.json    respuesta completa de https://mindicador.cl/api
  camara-mes.json     votaciones de la Sala de la Cámara del mes (datos abiertos de la Cámara)
  camara-nominal.json voto de cada diputado en TODAS las votaciones de los últimos 62 días (acumulado)
  descubrimiento.json operaciones que publica cada servicio oficial de la Cámara
  liga-primera.json   tabla completa del Campeonato Nacional (API de Wikipedia, inglés o español) y los últimos
                      partidos jugados (TheSportsDB, API gratuita)
  estado.json         qué respondió, a qué hora y con qué error
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET

import requests

TZ = dt.timezone(dt.timedelta(hours=-3))
UA = "CofradeNews/1.0 (boletin gratuito sin fines de lucro de la Cofradia de oficiales navales de Chile; github.com/cofrade-datos)"
PAUSAS = (0, 60, 180)   # tres intentos: de inmediato, al minuto y a los 3 minutos

CIUDADES = [   # las mismas coordenadas del Paso 2 de la Skill
    ("arica", -18.48, -70.31), ("antofagasta", -23.65, -70.40), ("la-serena", -29.90, -71.25),
    ("valparaiso-y-vina-del-mar", -33.05, -71.61), ("santiago", -33.45, -70.67), ("concepcion", -36.83, -73.05),
    ("temuco", -38.74, -72.59), ("puerto-montt", -41.47, -72.94), ("punta-arenas", -53.16, -70.92),
]
CAMARA = "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx"
CAMARA_FICHA = "https://camara.cl/legislacion/sala_sesiones/votacion_detalle.aspx?prmIdVotacion={}"


def ahora():
    return dt.datetime.now(TZ)


def pedir(url, estado, clave, como="json", espera=PAUSAS, sesion=None):
    """GET con hasta 3 intentos y pausas. Anota el resultado en estado[clave]. → contenido o None."""
    s = sesion or requests.Session()
    error = ""
    for i, p in enumerate(espera):
        if p:
            time.sleep(p)
        try:
            r = s.get(url, headers={"User-Agent": UA, "Accept": "application/json, text/xml, text/html"}, timeout=60)
            if r.status_code == 200 and r.content:
                estado[clave] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": url, "intentos": i + 1}
                return r.json() if como == "json" else r.text
            error = f"HTTP {r.status_code}"
            if r.status_code in (401, 403, 404, 451):
                break   # rechazo explícito: insistir no cambia nada
        except (requests.RequestException, ValueError) as ex:
            error = f"{type(ex).__name__}: {str(ex)[:120]}"
    estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": error, "intentos": i + 1}
    return None


# ---------- UV (Open-Meteo) ----------
def uv(estado):
    lat = ",".join(str(c[1]) for c in CIUDADES)
    lon = ",".join(str(c[2]) for c in CIUDADES)
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
           "&daily=uv_index_clear_sky_max&timezone=America%2FSantiago&forecast_days=8")
    j = pedir(url, estado, "uv")
    if j is None:
        return ""
    return uv_csv(j)


def uv_csv(j):
    lista = j if isinstance(j, list) else [j]
    filas = []
    for (nombre, _, _), x in zip(CIUDADES, lista):
        d = (x or {}).get("daily") or {}
        for f, v in zip(d.get("time") or [], d.get("uv_index_clear_sky_max") or []):
            if v is not None:
                filas.append(f"{nombre},{f},{round(float(v), 1)}")
    return "\n".join(filas) + ("\n" if filas else "")


# ---------- IMACEC e indicadores (mindicador.cl) ----------
def imacec(estado, anio):
    j = pedir(f"https://mindicador.cl/api/imacec/{anio}", estado, "imacec")
    return imacec_csv(j) if j else ""


def imacec_csv(j):
    meses = {}
    for p in (j or {}).get("serie") or []:
        f, v = str(p.get("fecha") or "")[:7], p.get("valor")
        if re.match(r"^\d{4}-\d{2}$", f) and isinstance(v, (int, float)):
            meses[f] = v
    return "".join(f"{m},{meses[m]}\n" for m in sorted(meses))


# ---------- Cámara de Diputadas y Diputados (datos abiertos) ----------
def _sin_ns(t):
    return t.rsplit("}", 1)[-1].lower()


def _texto(el):
    if el is None:
        return ""
    t = (el.text or "").strip()
    if not t:   # <Resultado Codigo="1"><Nombre>Aprobado</Nombre></Resultado>
        for h in el.iter():
            if h is not el and (h.text or "").strip():
                return h.text.strip()
    return t


def _hijo(el, *patrones):
    for h in el:
        n = _sin_ns(h.tag)
        if any(re.search(p, n) for p in patrones):
            return h
    return None


def _entero(t):
    m = re.search(r"-?\d+", str(t or ""))
    return int(m.group(0)) if m else None


def camara_votaciones(xml_txt, mes):
    """Votaciones de la Sala del mes «AAAA-MM» en el formato de congreso.camara_mes de la Skill."""
    raiz = ET.fromstring(xml_txt)
    out = []
    for v in raiz.iter():
        if _sin_ns(v.tag) != "votacion":
            continue
        idv = _texto(_hijo(v, r"^id$"))
        fecha = _texto(_hijo(v, r"^fecha"))
        if not idv or not fecha.startswith(mes):
            continue
        out.append({
            "id": idv, "fecha": fecha[:16],
            "descripcion": _texto(_hijo(v, r"^descripcion")),
            "tipo": _texto(_hijo(v, r"^tipo")),
            "resultado": _texto(_hijo(v, r"^resultado")),
            "si": _entero(_texto(_hijo(v, r"afirmativ", r"^totalsi$", r"^si$"))),
            "no": _entero(_texto(_hijo(v, r"negativ", r"^totalno$", r"^no$"))),
            "abst": _entero(_texto(_hijo(v, r"abstenc"))),
            "quorum": _texto(_hijo(v, r"^quorum")),
            "url": CAMARA_FICHA.format(idv),
        })
    return sorted(out, key=lambda x: x["fecha"], reverse=True)


VOTO = {"afirmativo": "Sí", "si": "Sí", "en contra": "No", "negativo": "No", "no": "No", "abstencion": "Abstención",
        "abstención": "Abstención", "pareo": "Pareo"}


def camara_nominal(xml_txt):
    """[{nombre «Apellido Apellido, Nombre», partido "", voto Sí/No/Abstención/Pareo}] (sin «No vota» ni dispensados)."""
    raiz = ET.fromstring(xml_txt)
    out = []
    for v in raiz.iter():
        op = _hijo(v, r"^opcionvoto$")
        if op is None:
            continue
        voto = VOTO.get(_texto(op).strip().lower())
        if not voto:
            continue
        d = _hijo(v, r"^diputado$")
        d = v if d is None else d   # ojo: un elemento XML sin hijos es «falso»
        nom = _texto(_hijo(d, r"^nombre$"))
        ap = " ".join(x for x in (_texto(_hijo(d, r"apellidopaterno")), _texto(_hijo(d, r"apellidomaterno"))) if x)
        nombre = f"{ap}, {nom}" if ap and nom else (ap or nom)
        if nombre:
            out.append({"nombre": nombre, "partido": "", "voto": voto})
    return out


def camara_votaciones_todas(xml_txt):
    """Todas las votaciones del año {id: fecha AAAA-MM-DD} (para saber cuáles son de los últimos 62 días)."""
    raiz = ET.fromstring(xml_txt)
    out = {}
    for v in raiz.iter():
        if _sin_ns(v.tag) == "votacion":
            idv, f = _texto(_hijo(v, r"^id$")), _texto(_hijo(v, r"^fecha"))
            if idv and f:
                out[idv] = f[:10]
    return out


def camara(estado, hoy, previo=None, maximo=60):
    """Votaciones del mes + voto de cada diputado de TODAS las votaciones de los últimos 62 días (28-10-2026, Germán: «las 4 leyes
    del 21-10 sin votación por diputado»). Lo ya bajado en corridas anteriores se conserva y solo se piden las que faltan
    (máximo `maximo` por corrida, de a una y con 3 segundos entre cada una)."""
    s = requests.Session()
    txt = pedir(f"{CAMARA}/retornarVotacionesXAnno?prmAnno={hoy.year}", estado, "camara", como="texto", sesion=s)
    if not txt:
        return None, None
    try:
        mes = camara_votaciones(txt, hoy.strftime("%Y-%m"))
        todas = camara_votaciones_todas(txt)
    except ET.ParseError as ex:
        estado["camara"].update(ok=False, error=f"XML ilegible: {ex}")
        return None, None
    if hoy.month == 1:   # en enero, las de diciembre vienen en el año anterior
        t2 = pedir(f"{CAMARA}/retornarVotacionesXAnno?prmAnno={hoy.year - 1}", estado, "camara_anterior", como="texto", sesion=s)
        try:
            todas.update(camara_votaciones_todas(t2) if t2 else {})
        except ET.ParseError:
            pass
    desde = (hoy - dt.timedelta(days=62)).isoformat()
    vigentes = {i for i, f in todas.items() if f >= desde}
    nominal = {i: v for i, v in (previo or {}).items() if i in vigentes and v}
    faltan = sorted((i for i in vigentes if i not in nominal), key=lambda i: todas[i], reverse=True)
    for idv in faltan[:maximo]:
        time.sleep(3)   # de a una, con calma
        t = pedir(f"{CAMARA}/retornarVotacionDetalle?prmVotacionId={idv}", estado, f"camara_detalle_{idv}",
                  como="texto", espera=(0, 30), sesion=s)
        if t:
            try:
                filas = camara_nominal(t)
                if filas:
                    nominal[idv] = filas
            except ET.ParseError:
                pass
    estado["camara"]["nominal"] = {"guardadas": len(nominal), "pendientes": max(0, len(faltan) - maximo)}
    control = {"total_mes": len(mes), "fuente": f"{CAMARA}/retornarVotacionesXAnno?prmAnno={hoy.year}",
               "ultima_oficial": mes[0]["fecha"][:10] if mes else ""}
    return {"mes": hoy.strftime("%Y-%m"), "camara_mes": mes, "control": control}, nominal


# ---------- Qué ofrecen los servicios oficiales (para sumar asistencia y otros datos con nombres verificados) ----------
SERVICIOS = ("WSLegislativo", "WSSala", "WSDiputado", "WSComun")


def descubrir(estado):
    """Lista las operaciones que publica cada servicio de datos abiertos de la Cámara (su página de ayuda): así el próximo
    ajuste usa solo nombres verificados (asistencia, sesiones, diputados con su partido), nunca supuestos."""
    out = {}
    for sv in SERVICIOS:
        t = pedir(f"https://opendata.camara.cl/camaradiputados/WServices/{sv}.asmx", estado, f"servicio_{sv}", como="texto", espera=(0,))
        if t:
            out[sv] = sorted(set(re.findall(r"\?op=(\w+)", t)))
    return out


# ---------- Campeonato Nacional (Wikipedia, API oficial; en inglés y en español) ----------
def _num(x):
    m = re.search(r"-?\d+", str(x).replace("\u2212", "-").replace("\u2013", "-"))
    return int(m.group(0)) if m else None


COLS = {   # columna de la Skill → nombres posibles en Wikipedia (inglés / español)
    "pos": ("pos", "pos.", "posición"), "equipo": ("team", "equipo", "club"), "pj": ("pld", "pj", "pts.j"),
    "pg": ("w", "pg", "g"), "pe": ("d", "pe", "e"), "pp": ("l", "pp", "p"), "gf": ("gf",), "gc": ("ga", "gc"),
    "dif": ("gd", "dif", "dif.", "+/-", "dg"), "pts": ("pts", "pts."),
}


def liga_tabla(html, url_pagina, fuente="Wikipedia (en)", fecha=""):
    import pandas as pd
    try:
        tablas = pd.read_html(io.StringIO(html))
    except ValueError:
        return None
    for t in tablas:
        cols = [str(c[-1] if isinstance(c, tuple) else c).strip() for c in t.columns]
        bajo = [c.lower() for c in cols]
        mapa = {}
        for k, nombres in COLS.items():
            for idx, c in enumerate(bajo):
                if c in nombres or (k == "equipo" and c.startswith(nombres)):
                    mapa.setdefault(k, idx)
        if not {"equipo", "pj", "pg", "pe", "pp", "gf", "gc", "pts"} <= set(mapa) or not 12 <= len(t) <= 20:
            continue
        filas = []
        for i in range(len(t)):
            r = t.iloc[i]
            nombre = re.sub(r"\[.*?\]", "", str(r.iloc[mapa["equipo"]]))
            nombre = re.sub(r"\s*\((?:[A-Z]{1,2})\)\s*$", "", nombre).strip()
            f = {k: _num(r.iloc[mapa[k]]) for k in ("pj", "pg", "pe", "pp", "gf", "gc", "pts")}
            if None in f.values():
                return None
            f["pos"] = (_num(r.iloc[mapa["pos"]]) if "pos" in mapa else None) or i + 1
            f["equipo"] = nombre
            f["dif"] = f["gf"] - f["gc"]
            filas.append({k: f[k] for k in ("pos", "equipo", "pj", "pg", "pe", "pp", "gf", "gc", "dif", "pts")})
        if not fecha:
            m = re.search(r"[Uu]pdated to match(?:\(es\)|es)? played on (\d{1,2} \w+ \d{4})", html)
            if m:
                try:
                    fecha = dt.datetime.strptime(m.group(1), "%d %B %Y").date().isoformat()
                except ValueError:
                    fecha = ""
        return {"tabla": filas, "tabla_fecha": fecha, "tabla_fuente": fuente, "tabla_url": url_pagina}
    return None


def liga_es(estado, hoy):
    """Respaldo en español: se busca el artículo de la temporada con la API de búsqueda de Wikipedia (el nombre cambia
    de un año a otro) y su fecha es la de la última edición del artículo."""
    api = "https://es.wikipedia.org/w/api.php"
    j = pedir(f"{api}?action=query&list=search&format=json&srlimit=5&srsearch=" +
              requests.utils.quote(f"Primera División Chile {hoy.year} campeonato"), estado, "liga_es_busqueda")
    titulos = [x.get("title", "") for x in (((j or {}).get("query") or {}).get("search") or [])]
    titulo = next((t for t in titulos if str(hoy.year) in t and re.search(r"Primera|Liga", t)), "")
    if not titulo:
        return None
    t_url = titulo.replace(" ", "_")
    rev = pedir(f"{api}?action=query&prop=revisions&rvprop=timestamp&format=json&titles=" + requests.utils.quote(titulo),
                estado, "liga_es_fecha")
    fecha = ""
    for p in (((rev or {}).get("query") or {}).get("pages") or {}).values():
        fecha = str(((p.get("revisions") or [{}])[0]).get("timestamp") or "")[:10]
    html = pedir("https://es.wikipedia.org/api/rest_v1/page/html/" + requests.utils.quote(t_url, safe=""), estado, "liga_es", como="texto")
    if not html or not fecha:
        return None
    return liga_tabla(html, "https://es.wikipedia.org/wiki/" + requests.utils.quote(t_url, safe="()_"), "Wikipedia (es)", fecha)


def partidos_liga(estado):
    """Últimos partidos jugados de la Liga de Primera (TheSportsDB, API gratuita con su clave pública de prueba): sirven
    para sumar a la tabla completa los resultados posteriores a su fecha (la Skill lo hace sola)."""
    for clave in ("123", "3"):
        j = pedir(f"https://www.thesportsdb.com/api/v1/json/{clave}/eventspastleague.php?id=4627", estado, "partidos", espera=(0, 30))
        if j and j.get("events"):
            return partidos_csv(j)
    return None


def partidos_csv(j):
    out = []
    for e in (j or {}).get("events") or []:
        gl, gv = _num(e.get("intHomeScore")), _num(e.get("intAwayScore"))
        if gl is None or gv is None or not e.get("dateEvent"):
            continue
        if str(e.get("strStatus") or "Match Finished").lower() not in ("match finished", "ft", "aet", "pen", "finished"):
            continue
        out.append({"local": e.get("strHomeTeam"), "visita": e.get("strAwayTeam"), "gl": gl, "gv": gv,
                    "fecha": str(e.get("dateEventLocal") or e["dateEvent"])[:10],   # fecha de Chile, no la UTC
                    "competencia": "Liga de Primera", "fuente": "TheSportsDB"})
    return sorted(out, key=lambda x: x["fecha"])


def liga(estado, hoy):
    titulo = f"{hoy.year}_Liga_de_Primera"
    html = pedir(f"https://en.wikipedia.org/api/rest_v1/page/html/{titulo}", estado, "liga", como="texto")
    en = liga_tabla(html, f"https://en.wikipedia.org/wiki/{titulo}") if html else None
    es = liga_es(estado, hoy)
    pj = lambda t: max((f["pj"] for f in t["tabla"]), default=0) if t and t.get("tabla_fecha") else -1   # noqa: E731
    return es if pj(es) > pj(en) else (en if pj(en) >= 0 else None)   # la más avanzada en partidos jugados


def escribir(ruta, contenido):
    if contenido is None or contenido == "":
        return False
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(contenido if isinstance(contenido, str) else json.dumps(contenido, ensure_ascii=False, indent=1))
    return True


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default="datos")
    a = ap.parse_args(argv)
    os.makedirs(a.salida, exist_ok=True)
    hoy = ahora().date()
    estado = {}
    escribir(os.path.join(a.salida, "uv.csv"), uv(estado))
    escribir(os.path.join(a.salida, "imacec.csv"), imacec(estado, hoy.year))
    escribir(os.path.join(a.salida, "indicadores.json"), pedir("https://mindicador.cl/api", estado, "indicadores"))
    try:   # lo bajado en corridas anteriores (queda en el repositorio)
        previo = json.load(open(os.path.join(a.salida, "camara-nominal.json"), encoding="utf-8"))
    except (OSError, ValueError):
        previo = {}
    cam, nom = camara(estado, hoy, previo if isinstance(previo, dict) else {})
    escribir(os.path.join(a.salida, "camara-mes.json"), cam)
    escribir(os.path.join(a.salida, "camara-nominal.json"), nom or None)
    escribir(os.path.join(a.salida, "descubrimiento.json"), descubrir(estado) or None)
    tabla = liga(estado, hoy)
    if tabla:
        tabla["partidos"] = partidos_liga(estado) or []
    escribir(os.path.join(a.salida, "liga-primera.json"), tabla)
    resumen = {"fecha": hoy.isoformat(), "generado": ahora().isoformat(timespec="seconds"), "fuentes": estado}
    escribir(os.path.join(a.salida, "estado.json"), resumen)
    for k, v in estado.items():
        if not k.startswith(("camara_detalle_", "servicio_")):
            print(("OK   " if v["ok"] else "FALLA"), k, v.get("error", ""))
    return 0   # una fuente caída no detiene a las demás


if __name__ == "__main__":
    sys.exit(main())
