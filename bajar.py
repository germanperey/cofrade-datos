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
  camara-asistencia.json  asistencia de cada diputado a las sesiones de Sala de los últimos 62 días (resumen)
  vuelos-ayer.json    salidas y llegadas de AYER en los 5 aeropuertos (OpenSky Network, gratis)
  liga-primera.json   tabla completa del Campeonato Nacional (API de Wikipedia, inglés o español) y los últimos
                      partidos jugados (TheSportsDB, API gratuita)
  titulares.json      31-10-2026: titulares de las últimas horas de cada sección, leídos de los RSS PÚBLICOS de los medios
                      (BBC, El País, DW, France 24, La Tercera, Xataka, NASA, ESA, ESO, ScienceDaily…) y de Google News,
                      solo donde el robots.txt del sitio lo permite
  mercados.json       31-10-2026: último CIERRE del IPSA, S&P 500, Nasdaq, Dow Jones, Brent, cobre Comex y bitcoin (con su fecha)
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
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime
from html import unescape
from urllib import robotparser
from urllib.parse import quote, urlsplit

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


def pedir(url, estado, clave, como="json", espera=PAUSAS, sesion=None, cabeceras=None, limite=60):
    """GET con hasta 3 intentos y pausas. Anota el resultado en estado[clave]. → contenido o None."""
    s = sesion or requests.Session()
    error = ""
    for i, p in enumerate(espera):
        if p:
            time.sleep(p)
        try:
            r = s.get(url, headers=dict({"User-Agent": UA, "Accept": "application/json, text/xml, text/html"}, **(cabeceras or {})), timeout=limite)
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


def camara(estado, hoy, previo=None, maximo=110):
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
    params = {}
    for sv, op in (("WSSala", "retornarSesionesXAnno"), ("WSSala", "retornarSesionAsistencia"), ("WSDiputado", "retornarDiputadosPeriodoActual")):
        t = pedir(f"https://opendata.camara.cl/camaradiputados/WServices/{sv}.asmx?op={op}", estado, f"servicio_{op}", como="texto", espera=(0,))
        if t:
            params[op] = sorted(set(re.findall(r"\b(prm\w+)", t)))
    if params:
        out["_parametros"] = params
    return out


# ---------- Asistencia oficial a las sesiones de Sala (WSSala: retornarSesionesXAnno + retornarSesionAsistencia) ----------
def _nombre_diputado(el):
    d = _hijo(el, r"^diputado$")
    d = el if d is None else d
    nom = _texto(_hijo(d, r"^nombre$"))
    ap = " ".join(x for x in (_texto(_hijo(d, r"apellidopaterno")), _texto(_hijo(d, r"apellidomaterno"))) if x)
    return f"{ap}, {nom}" if ap and nom else (ap or nom)


def sesiones_xml(xml_txt, desde, hasta):
    """[{id, fecha, tipo}] de las sesiones de Sala entre dos fechas (AAAA-MM-DD)."""
    out = []
    for v in ET.fromstring(xml_txt).iter():
        if _sin_ns(v.tag) != "sesion":
            continue
        idv, f = _texto(_hijo(v, r"^id$")), _texto(_hijo(v, r"^fecha"))
        if idv and f and desde <= f[:10] <= hasta:
            out.append({"id": idv, "fecha": f[:10], "tipo": _texto(_hijo(v, r"^tipo"))})
    return out


def asistencia_xml(xml_txt):
    """[{nombre, estado: asiste|no_asiste, justificacion}] de una sesión."""
    out = []
    for el in ET.fromstring(xml_txt).iter():
        if _hijo(el, r"^diputado$") is None:
            continue
        nombre = _nombre_diputado(el)
        tipo = _texto(_hijo(el, r"asistencia$", r"^tipoasistencia", r"^asistencia"))
        just = _texto(_hijo(el, r"justificaci"))
        if not nombre or not tipo:
            continue
        t = tipo.lower()
        no = bool(re.search(r"no\s*asist|inasist|ausen|no\s*presente", t))
        out.append({"nombre": nombre, "estado": "no_asiste" if no else "asiste", "justificacion": just})
    return out


def asistencia(estado, hoy, previo=None, maximo=25):
    """Asistencia de cada diputado a las sesiones de Sala de los últimos 62 días, acumulada entre corridas (solo se piden las
    sesiones que faltan). → {"sesiones": {id: {fecha, tipo, asistencia: [...]}}}"""
    base = "https://opendata.camara.cl/camaradiputados/WServices/WSSala.asmx"
    txt = pedir(f"{base}/retornarSesionesXAnno?prmAnno={hoy.year}", estado, "asistencia", como="texto")
    if not txt:
        return None
    desde = (hoy - dt.timedelta(days=62)).isoformat()
    try:
        ses = sesiones_xml(txt, desde, hoy.isoformat())
    except ET.ParseError as ex:
        estado["asistencia"].update(ok=False, error=f"XML ilegible: {ex}")
        return None
    prev = (previo or {}).get("sesiones") or {}
    out = {i: v for i, v in prev.items() if v.get("fecha", "") >= desde and v.get("asistencia")}
    faltan = [x for x in sorted(ses, key=lambda x: x["fecha"], reverse=True) if x["id"] not in out]
    for x in faltan[:maximo]:
        time.sleep(3)
        t = pedir(f"{base}/retornarSesionAsistencia?prmSesionId={x['id']}", estado, f"asistencia_{x['id']}", como="texto", espera=(0, 30))
        if t:
            try:
                filas = asistencia_xml(t)
            except ET.ParseError:
                filas = []
            if filas:
                out[x["id"]] = {"fecha": x["fecha"], "tipo": x["tipo"], "asistencia": filas}
    estado["asistencia"]["sesiones"] = {"con_asistencia": len(out), "del_periodo": len(ses)}
    return {"desde": desde, "hasta": hoy.isoformat(), "sesiones": out}


def asistencia_resumen(a):
    """Resumen chico para la Skill: por diputado, sesiones a las que asistió, faltó con y sin justificación."""
    if not a or not a.get("sesiones"):
        return None
    por = {}
    for s in a["sesiones"].values():
        for x in s.get("asistencia") or []:
            r = por.setdefault(x["nombre"], {"nombre": x["nombre"], "asiste": 0, "justificada": 0, "no_justificada": 0})
            if x["estado"] == "asiste":
                r["asiste"] += 1
            elif x.get("justificacion"):
                r["justificada"] += 1
            else:
                r["no_justificada"] += 1
    fechas = sorted(s["fecha"] for s in a["sesiones"].values())
    return {"sesiones": len(a["sesiones"]), "desde": fechas[0], "hasta": fechas[-1], "diputados": sorted(por.values(), key=lambda r: r["nombre"])}


# ---------- Vuelos realizados ayer (OpenSky Network, red abierta de receptores ADS-B; gratis y sin clave) ----------
AEROPUERTOS_ICAO = {"SCL": "SCEL", "ANF": "SCFA", "CCP": "SCIE", "PMC": "SCTE", "PUQ": "SCCI"}
ICAO_IATA = {   # aerolíneas que operan en los 5 aeropuertos (código OACI del indicativo → código IATA del vuelo)
    "LAN": "LA", "LXP": "LU", "LPE": "LP", "TAM": "JJ", "LNE": "XL", "SKU": "H2", "SKX": "H2", "JAT": "JA", "JES": "WJ", "JAP": "JZ",
    "ARG": "AR", "AAL": "AA", "DAL": "DL", "UAL": "UA", "IBE": "IB", "AFR": "AF", "KLM": "KL", "CMP": "CM", "AVA": "AV", "ACA": "AC",
    "QFA": "QF", "AMX": "AM", "BAW": "BA", "DLH": "LH", "UAE": "EK", "QTR": "QR", "AZU": "AD", "GLO": "G3", "DAP": "V5", "BOV": "OB",
    "AEA": "UX", "ITY": "AZ", "FBZ": "FO", "ANZ": "NZ", "CPA": "CX", "THY": "TK", "LAP": "PZ", "TPU": "T0"}


def vuelo_iata(callsign):
    c = re.sub(r"\s+", "", str(callsign or "")).upper()
    m = re.match(r"^([A-Z]{3})(\d{1,4}[A-Z]?)$", c)
    if not m or m.group(1) not in ICAO_IATA:
        return ""
    return ICAO_IATA[m.group(1)] + m.group(2).lstrip("0")


OPENSKY_TOKEN = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"


def opensky_token(estado):
    """Desde el 18-03-2026 OpenSky pide una cuenta (gratuita) con «API client» (OAuth2, client credentials). Sin cuenta rechaza a los
    servidores de GitHub (HTTP 403, visto el 29-10-2026). Los dos datos van como secretos del repositorio: OPENSKY_CLIENT_ID y
    OPENSKY_CLIENT_SECRET. → token o None (si no hay secretos, se intenta igual sin cuenta)."""
    cid, sec = os.environ.get("OPENSKY_CLIENT_ID", "").strip(), os.environ.get("OPENSKY_CLIENT_SECRET", "").strip()
    if not cid or not sec:
        estado["opensky_cuenta"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "error": "sin secretos OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET (cuenta gratuita)"}
        return None
    try:
        r = requests.post(OPENSKY_TOKEN, data={"grant_type": "client_credentials", "client_id": cid, "client_secret": sec},
                          headers={"User-Agent": UA}, timeout=60)
        tok = r.json().get("access_token") if r.status_code == 200 else None
    except (requests.RequestException, ValueError) as ex:
        tok, r = None, None
        estado["opensky_cuenta"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "error": f"{type(ex).__name__}"}
        return None
    estado["opensky_cuenta"] = {"ok": bool(tok), "hora": ahora().isoformat(timespec="seconds")} | ({} if tok else {"error": f"HTTP {r.status_code}"})
    return tok


def vuelos_ayer(estado, hoy):
    """Salidas y llegadas de AYER en los 5 aeropuertos (hora de despegue o aterrizaje observada, en hora de Chile)."""
    tok = opensky_token(estado)
    cab = {"Authorization": f"Bearer {tok}"} if tok else None
    ayer = hoy - dt.timedelta(days=1)
    ini = int(dt.datetime.combine(ayer, dt.time(0, 0), tzinfo=TZ).timestamp())
    fin = ini + 86400
    out = {"fecha": ayer.isoformat(), "fuente": "OpenSky Network", "aeropuertos": {}}
    for iata, icao in AEROPUERTOS_ICAO.items():
        for tipo, ep, clave_t, otro in (("salidas", "departure", "firstSeen", "estArrivalAirport"), ("llegadas", "arrival", "lastSeen", "estDepartureAirport")):
            j = pedir(f"https://opensky-network.org/api/flights/{ep}?airport={icao}&begin={ini}&end={fin}", estado, f"vuelos_{iata}_{tipo}",
                      espera=(0, 30), cabeceras=cab)
            filas = []
            for v in j if isinstance(j, list) else []:
                cod = vuelo_iata(v.get("callsign"))
                t = v.get(clave_t)
                if not cod or not isinstance(t, (int, float)):
                    continue
                filas.append({"vuelo": cod, "hora": dt.datetime.fromtimestamp(t, TZ).strftime("%H:%M"), "otro_icao": v.get(otro) or ""})
            out["aeropuertos"].setdefault(iata, {})[tipo] = sorted({f["vuelo"]: f for f in filas}.values(), key=lambda f: f["hora"])
            time.sleep(2)
    return out if any(x for a in out["aeropuertos"].values() for x in a.values()) else None


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


# ---------- titulares: RSS públicos de los medios (31-10-2026, Germán: «aplica absolutamente todos los medios existentes») ----------
# Desde la tarea de la mañana muchos medios rechazan la lectura (client_error). Desde GitHub se leen sus RSS PÚBLICOS: el formato que
# los medios publican justamente para que otros programas lean sus titulares. Antes de cada sitio se lee su robots.txt y se
# respeta: si el sitio no permite la lectura automática, NO se lee y queda anotado. Cada nota guarda su medio y su enlace.
FEEDS = {   # 31-10-2026: las mismas direcciones RSS/JSON de la Skill (assets/fuentes-noticias.json) + feeds públicos de los medios
    "economia/chile": [
        ("Google News · Economía Chile", "https://news.google.com/rss/search?q=econom%C3%ADa+Chile+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Bolsa de Santiago", "https://news.google.com/rss/search?q=IPSA+OR+%22Bolsa+de+Santiago%22+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Cobre y minería", "https://news.google.com/rss/search?q=cobre+OR+Codelco+OR+miner%C3%ADa+Chile+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Empresas Chile", "https://news.google.com/rss/search?q=empresas+Chile+(utilidades+OR+inversi%C3%B3n+OR+exportaciones)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Hacienda y presupuesto", "https://news.google.com/rss/search?q=Hacienda+OR+presupuesto+OR+%22Banco+Central%22+Chile+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Banco Central / IPC / dólar", "https://news.google.com/rss/search?q=(%22Banco+Central%22+OR+IPC+OR+d%C3%B3lar+OR+IMACEC)+Chile+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Inversiones y proyectos en Chile", "https://news.google.com/rss/search?q=inversi%C3%B3n+proyecto+Chile+%22millones+de+d%C3%B3lares%22+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("La Tercera · Pulso (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/pulso/?outputType=xml", "rss"),
        ("El Mostrador · Mercados (RSS)", "https://www.elmostrador.cl/mercados/feed/", "rss"),
        ("Cooperativa (RSS)", "https://www.cooperativa.cl/noticias/site/tax/port/all/rss_3___1.xml", "rss"),
    ],
    "economia/mundo": [
        ("Google News · Economía mundial", "https://news.google.com/rss/search?q=econom%C3%ADa+mundial+OR+Fed+OR+mercados+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Europa economía", "https://news.google.com/rss/search?q=BCE+OR+eurozona+econom%C3%ADa+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Petróleo", "https://news.google.com/rss/search?q=petr%C3%B3leo+OR+Brent+OR+OPEP+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · China y comercio", "https://news.google.com/rss/search?q=China+econom%C3%ADa+OR+aranceles+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Reserva Federal", "https://news.google.com/rss/search?q=%22Reserva+Federal%22+OR+Wall+Street+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Economía Estados Unidos", "https://news.google.com/rss/search?q=econom%C3%ADa+%22Estados+Unidos%22+(inflaci%C3%B3n+OR+empleo+OR+PIB)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · FMI y Banco Mundial", "https://news.google.com/rss/search?q=(FMI+OR+%22Banco+Mundial%22+OR+OCDE)+econom%C3%ADa+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Economía América Latina", "https://news.google.com/rss/search?q=econom%C3%ADa+(Argentina+OR+Brasil+OR+M%C3%A9xico+OR+Per%C3%BA+OR+Colombia)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Bolsas y mercados mundiales", "https://news.google.com/rss/search?q=(bolsas+OR+%22Wall+Street%22+OR+mercados)+cierre+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Comercio internacional", "https://news.google.com/rss/search?q=(comercio+internacional+OR+exportaciones+OR+aranceles)+econom%C3%ADa+mundial+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("BBC Mundo · Economía (RSS)", "https://feeds.bbci.co.uk/mundo/temas/economia/rss.xml", "rss"),
        ("El País · Economía (RSS)", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada", "rss"),
        ("DW en español (RSS)", "https://rss.dw.com/xml/rss-sp-all", "rss"),
    ],
    "politica/chile": [
        ("Google News · Política Chile", "https://news.google.com/rss/search?q=pol%C3%ADtica+Chile+(gobierno+OR+Congreso+OR+Senado+OR+C%C3%A1mara)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("La Tercera · Política (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/politica/?outputType=xml", "rss"),
        ("El Mostrador · País (RSS)", "https://www.elmostrador.cl/noticias/pais/feed/", "rss"),
        ("CIPER (RSS)", "https://www.ciperchile.cl/feed/", "rss"),
        ("Ex-Ante (RSS)", "https://www.ex-ante.cl/feed/", "rss"),
        ("Radio U. de Chile (RSS)", "https://radio.uchile.cl/feed/", "rss"),
        ("Google News · Congreso y Gobierno", "https://news.google.com/rss/search?q=(Kast+OR+%22La+Moneda%22+OR+ministro)+Chile+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "politica/mundo": [
        ("Google News · Internacional", "https://news.google.com/rss/search?q=internacional+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Medio Oriente", "https://news.google.com/rss/search?q=Israel+OR+Gaza+OR+Ir%C3%A1n+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Europa", "https://news.google.com/rss/search?q=Uni%C3%B3n+Europea+OR+Europa+gobierno+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · América Latina", "https://news.google.com/rss/search?q=Am%C3%A9rica+Latina+gobierno+OR+elecciones+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Mundo (EE. UU.)", "https://news.google.com/rss/search?q=Estados+Unidos+Casa+Blanca+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("BBC Mundo (RSS)", "https://feeds.bbci.co.uk/mundo/rss.xml", "rss"),
        ("France 24 en español (RSS)", "https://www.france24.com/es/rss", "rss"),
        ("El País · Internacional (RSS)", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", "rss"),
        ("Infobae (RSS)", "https://www.infobae.com/arc/outboundfeeds/rss/", "rss"),
        ("Al Jazeera (RSS, inglés)", "https://www.aljazeera.com/xml/rss/all.xml", "rss"),
        ("Google News · Sudán y África", "https://news.google.com/rss/search?q=Sud%C3%A1n+OR+%22El+Fasher%22+OR+Sahel+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "emprendimiento": [
        ("Google News · Emprendimiento Chile", "https://news.google.com/rss/search?q=(emprendimiento+OR+startup+OR+%22capital+de+riesgo%22)+Chile+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Innovación pymes", "https://news.google.com/rss/search?q=pymes+innovaci%C3%B3n+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Fintech Chile", "https://news.google.com/rss/search?q=fintech+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Corfo", "https://news.google.com/rss/search?q=Corfo+emprendimiento+OR+startups+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Startups Latinoamérica", "https://news.google.com/rss/search?q=startup+Latinoam%C3%A9rica+ronda+inversi%C3%B3n+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Startups Chile (semana)", "https://news.google.com/rss/search?q=startups+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Rondas de inversión Latinoamérica", "https://news.google.com/rss/search?q=(%22ronda+de+inversi%C3%B3n%22+OR+%22levant%C3%B3%22+OR+%22serie+A%22)+startup+Latinoam%C3%A9rica+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Emprendedores Chile", "https://news.google.com/rss/search?q=emprendedores+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Capital de riesgo Latinoamérica", "https://news.google.com/rss/search?q=(%22capital+de+riesgo%22+OR+%22venture+capital%22)+Latinoam%C3%A9rica+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Innovación y empresas Chile", "https://news.google.com/rss/search?q=innovaci%C3%B3n+empresas+Chile+(Corfo+OR+ANID+OR+%22Start-Up+Chile%22)+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Contxto (RSS)", "https://contxto.com/es/feed/", "rss"),
        ("LatamList (RSS)", "https://latamlist.com/feed/", "rss"),
        ("TechCrunch · Startups (RSS)", "https://techcrunch.com/category/startups/feed/", "rss"),
        ("Start-Up Chile (RSS)", "https://startupchile.org/feed/", "rss"),
    ],
    "tecnologia": [
        ("Google News · Tecnología", "https://news.google.com/rss/search?q=tecnolog%C3%ADa+(IA+OR+chips+OR+Apple+OR+Google+OR+Microsoft+OR+Nvidia)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Inteligencia artificial", "https://news.google.com/rss/search?q=%22inteligencia+artificial%22+(OpenAI+OR+Anthropic+OR+Google+OR+Meta+OR+Nvidia)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Ciberseguridad", "https://news.google.com/rss/search?q=ciberseguridad+OR+hackeo+OR+ciberataque+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Tecnología en Chile", "https://news.google.com/rss/search?q=tecnolog%C3%ADa+Chile+(startup+OR+innovaci%C3%B3n+OR+digital)+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Xataka (RSS)", "https://www.xataka.com/feedburner.xml", "rss"),
        ("Genbeta (RSS)", "https://www.genbeta.com/feedburner.xml", "rss"),
        ("Hipertextual (RSS)", "https://hipertextual.com/feed", "rss"),
        ("TechCrunch (RSS)", "https://techcrunch.com/feed/", "rss"),
        ("The Verge (RSS)", "https://www.theverge.com/rss/index.xml", "rss"),
        ("Ars Technica (RSS)", "https://feeds.arstechnica.com/arstechnica/index", "rss"),
    ],
    "inmobiliario": [
        ("Google News · Inmobiliario Chile", "https://news.google.com/rss/search?q=(inmobiliario+OR+viviendas+OR+%22cr%C3%A9dito+hipotecario%22)+Chile+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Construcción", "https://news.google.com/rss/search?q=construcci%C3%B3n+CChC+OR+inmobiliarias+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Tasas hipotecarias", "https://news.google.com/rss/search?q=%22tasa+hipotecaria%22+OR+%22cr%C3%A9ditos+hipotecarios%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Permisos y viviendas", "https://news.google.com/rss/search?q=%22permisos+de+edificaci%C3%B3n%22+OR+%22venta+de+viviendas%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Mercado inmobiliario", "https://news.google.com/rss/search?q=%22mercado+inmobiliario%22+OR+%22venta+de+viviendas%22+OR+%22subsidio+habitacional%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · IVA viviendas y DFL 2", "https://news.google.com/rss/search?q=(IVA+viviendas+OR+DFL2+OR+contribuciones)+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "deportes": [
        ("Google News · Deportes Chile", "https://news.google.com/rss/search?q=deportes+Chile+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Golf", "https://news.google.com/rss/search?q=golf+(Niemann+OR+Pereira+OR+PGA)+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Fútbol chileno", "https://news.google.com/rss/search?q=%22Liga+de+Primera%22+OR+%22Colo-Colo%22+OR+%22Universidad+de+Chile%22+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Equitación", "https://news.google.com/rss/search?q=equitaci%C3%B3n+OR+ecuestre+OR+%22salto+ecuestre%22+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("ESPN · Tenis ATP (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/news", "json"),
        ("ESPN · Tenis WTA (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/news", "json"),
        ("ESPN · Fórmula 1 (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/racing/f1/news", "json"),
        ("ESPN · NBA (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news", "json"),
        ("ESPN · Golf PGA (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/golf/pga/news", "json"),
        ("ESPN · Fútbol chileno (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/news", "json"),
        ("Google News · Tenis chileno", "https://news.google.com/rss/search?q=tenis+(Tabilo+OR+Jarry+OR+Garin+OR+Barrios)+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Fórmula 1", "https://news.google.com/rss/search?q=%22F%C3%B3rmula+1%22+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · NBA", "https://news.google.com/rss/search?q=NBA+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Equitación en Chile (Sudamericano, Federación Ecuestre)", "https://news.google.com/rss/search?q=%22Federaci%C3%B3n+Ecuestre+de+Chile%22+OR+%22Sudamericano+de+Salto%22+OR+%22salto+ecuestre%22+Chile+when:14d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Fórmula 1 (Gran Premio)", "https://news.google.com/rss/search?q=%22Gran+Premio%22+(F1+OR+%22F%C3%B3rmula+1%22)+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Fórmula 1 pilotos", "https://news.google.com/rss/search?q=(Colapinto+OR+Verstappen+OR+Antonelli+OR+Norris+OR+Piastri+OR+Leclerc)+F%C3%B3rmula+1+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · NBA resultados", "https://news.google.com/rss/search?q=NBA+(resultados+OR+triunfo+OR+derrota+OR+puntos)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · NBA figuras", "https://news.google.com/rss/search?q=NBA+(LeBron+OR+Curry+OR+Doncic+OR+Jokic+OR+Antetokounmpo+OR+Wembanyama)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Rally y automovilismo Chile", "https://news.google.com/rss/search?q=(rally+OR+RallyMobil+OR+WRC+OR+automovilismo)+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("BBC Sport · Golf (RSS, inglés)", "https://feeds.bbci.co.uk/sport/golf/rss.xml", "rss"),
        ("BBC Sport · Tenis (RSS, inglés)", "https://feeds.bbci.co.uk/sport/tennis/rss.xml", "rss"),
        ("BBC Sport · Fórmula 1 (RSS, inglés)", "https://feeds.bbci.co.uk/sport/formula1/rss.xml", "rss"),
        ("Google News · Sudamericano y Copa", "https://news.google.com/rss/search?q=(Libertadores+OR+Sudamericana+OR+%22La+Roja%22)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "ciencia": [
        ("ScienceDaily · Ciencia (RSS)", "https://www.sciencedaily.com/rss/top/science.xml", "rss"),
        ("ScienceDaily · Salud y medicina (RSS)", "https://www.sciencedaily.com/rss/top/health.xml", "rss"),
        ("phys.org · Biología (RSS)", "https://phys.org/rss-feed/biology-news/", "rss"),
        ("Medical Xpress (RSS)", "https://medicalxpress.com/rss-feed/", "rss"),
        ("NIH News (RSS)", "https://www.nih.gov/news-releases/feed.xml", "rss"),
        ("SINC · Ciencia (RSS)", "https://www.agenciasinc.es/var/ezwebin_site/storage/rss/rss_portada.xml", "rss"),
        ("New Scientist (RSS)", "https://www.newscientist.com/feed/home/", "rss"),
        ("MIT Technology Review (RSS)", "https://www.technologyreview.com/feed/", "rss"),
        ("Google News · Avances médicos", "https://news.google.com/rss/search?q=(ensayo+cl%C3%ADnico+OR+longevidad+OR+trasplante+OR+pr%C3%B3tesis+OR+neuronas)+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "astronomia": [
        ("NASA · Noticias (RSS)", "https://www.nasa.gov/news-release/feed/", "rss"),
        ("ESA · Noticias (RSS)", "https://www.esa.int/rssfeed/Our_Activities/Space_Science", "rss"),
        ("ESO · Comunicados (RSS)", "https://www.eso.org/public/news/feed/", "rss"),
        ("NOIRLab (RSS)", "https://noirlab.edu/public/news/feed/", "rss"),
        ("Space.com (RSS)", "https://www.space.com/feeds/all", "rss"),
        ("SpaceNews (RSS)", "https://spacenews.com/feed/", "rss"),
        ("Sky & Telescope (RSS)", "https://skyandtelescope.org/feed/", "rss"),
        ("phys.org · Espacio (RSS)", "https://phys.org/rss-feed/space-news/", "rss"),
        ("Google News · Astronomía Chile", "https://news.google.com/rss/search?q=(astronom%C3%ADa+OR+telescopio+OR+ALMA+OR+Rubin+OR+ESO)+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
}

VENTANA_H = {"ciencia": 240, "astronomia": 240, "emprendimiento": 120, "inmobiliario": 120}   # el resto: 72 horas
TOPE_SECCION = 90
_ROBOTS = {}
_SIN_ROBOTS = set()   # sitios cuyo robots.txt no respondió (no se leen: no se sabe si lo permiten)


def robots_permite(url, estado):
    """True si el robots.txt del sitio permite leer esa dirección a este programa. Se lee una vez por sitio.
    Sin robots.txt (404) se puede; con 401/403 o sin respuesta, no (se prefiere no leer antes que saltarse una regla)."""
    u = urlsplit(url)
    sitio = f"{u.scheme}://{u.netloc}"
    if sitio not in _ROBOTS:
        rp = robotparser.RobotFileParser()
        try:
            r = requests.Session().get(sitio + "/robots.txt", headers={"User-Agent": UA}, timeout=20)
            if r.status_code == 200:
                rp.parse(r.text.splitlines())
            elif r.status_code in (401, 403):
                rp.disallow_all = True
            else:
                rp.allow_all = True
        except requests.RequestException as ex:
            rp.disallow_all = True
            _SIN_ROBOTS.add(sitio)
            estado["robots_" + u.netloc] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": sitio + "/robots.txt",
                                           "error": f"{type(ex).__name__}"}
        _ROBOTS[sitio] = rp
    return _ROBOTS[sitio].can_fetch("CofradeNews", url)


def _limpio(t, n=320):
    t = re.sub(r"<[^>]+>", " ", unescape(str(t or "")))
    t = re.sub(r"\s+([,.;:!?)])", r"\1", re.sub(r"\s+", " ", unescape(t))).strip()
    if len(t) <= n:
        return t
    k = t.rfind(" ", 0, n - 1)
    return t[:k if k > n // 2 else n - 1].rstrip(" ,;:.") + "…"


def _fecha_feed(t):
    """Fecha de un ítem (RFC 822 de RSS o ISO 8601 de Atom) → datetime en hora de Chile, o None."""
    t = str(t or "").strip()
    if not t:
        return None
    try:
        f = parsedate_to_datetime(t)
    except (TypeError, ValueError, IndexError):
        try:
            f = dt.datetime.fromisoformat(t.replace("Z", "+00:00"))
        except ValueError:
            return None
    if f.tzinfo is None:
        f = f.replace(tzinfo=dt.timezone.utc)
    return f.astimezone(TZ)


def leer_feed(texto, fuente):
    """RSS 2.0, Atom o RDF → [{fuente, titulo, fecha "AAAA-MM-DD HH:MM", url, resumen, medio}]. En Google News el medio real va
    en <source> y el título trae « - Medio» al final: la nota se atribuye a ese medio (vía Google News)."""
    try:
        raiz = ET.fromstring(texto.encode("utf-8") if isinstance(texto, str) else texto)
    except ET.ParseError:
        return None
    out = []
    for it in raiz.iter():
        tag = _sin_ns(it.tag)
        if tag not in ("item", "entry"):
            continue
        h = {}
        for c in it:
            ct = _sin_ns(c.tag)
            if ct == "link":
                h.setdefault("link", (c.get("href") if c.get("rel") in (None, "alternate") else None) or (c.text or "").strip())
            elif ct == "source":
                h["medio"] = (c.text or "").strip()
            elif ct not in h:
                h[ct] = c.text or ""
        titulo = _limpio(h.get("title"), 220)
        url = (h.get("link") or h.get("guid") or "").strip()
        if not titulo or not url.startswith("http"):
            continue
        medio = h.get("medio") or ""
        if medio and titulo.endswith(" - " + medio):
            titulo = titulo[: -len(" - " + medio)].strip()
        f = _fecha_feed(h.get("pubdate") or h.get("published") or h.get("updated") or h.get("date"))
        out.append({"fuente": (f"{medio} (vía Google News)" if medio else fuente), "titulo": titulo,
                    "fecha": f.strftime("%Y-%m-%d %H:%M") if f else "", "url": url,
                    "resumen": _limpio(h.get("description") or h.get("summary") or h.get("encoded") or h.get("content"))})
    return out


def leer_espn(j, fuente):
    """API pública de noticias de ESPN (site.api.espn.com/apis/site/v2/.../news) → mismas notas que un RSS."""
    out = []
    for a in (j or {}).get("articles") or []:
        url = (((a.get("links") or {}).get("web") or {}).get("href") or "").strip()
        f = _fecha_feed(a.get("published") or a.get("lastModified"))
        if a.get("headline") and url.startswith("http"):
            out.append({"fuente": fuente, "titulo": _limpio(a["headline"], 220), "fecha": f.strftime("%Y-%m-%d %H:%M") if f else "",
                        "url": url, "resumen": _limpio(a.get("description"))})
    return out


def _motivo_robots(url):
    u = urlsplit(url)
    return "robots.txt no respondió" if f"{u.scheme}://{u.netloc}" in _SIN_ROBOTS else "robots.txt no lo permite"


def _un_feed(args):
    sec, fuente, url, tipo, estado, clave = args
    if not robots_permite(url, estado):
        m = _motivo_robots(url)
        estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": m}
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": m}, []
    x = pedir(url, estado, clave, como="json" if tipo == "json" else "texto", espera=(0, 20), limite=25,
              cabeceras={"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json"})
    if x is None:
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": estado[clave].get("error", "")}, []
    notas = leer_espn(x, fuente) if tipo == "json" else leer_feed(x, fuente)
    if notas is None:
        estado[clave] = dict(estado[clave], ok=False, error="no es un RSS válido")
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": "no es un RSS válido"}, []
    return sec, {"fuente": fuente, "url": url, "ok": True, "n": len(notas)}, notas


def _norm(t):
    return re.sub(r"[^a-z0-9áéíóúñü ]", "", str(t).lower())[:90]


def titulares(estado, feeds=None, hilos=6):
    """{"generado", "secciones": {sec: {"consultadas": [...], "notas": [...]}}} en el formato candidatos/<sección>.json de la Skill."""
    feeds = feeds or FEEDS
    tareas, secs = [], {}
    for sec, lista in feeds.items():
        secs[sec] = {"consultadas": [], "notas": []}
        for i, (fuente, url, tipo) in enumerate(lista):
            tareas.append((sec, fuente, url, tipo, estado, f"rss_{sec.replace('/', '_')}_{i}"))
    with ThreadPoolExecutor(max_workers=hilos) as ex:
        res = list(ex.map(_un_feed, tareas))
    limite = ahora()
    for sec, cons, notas in res:
        secs[sec]["consultadas"].append(cons)
        h = VENTANA_H.get(sec, 72)
        for n in notas:
            if n["fecha"]:
                f = dt.datetime.strptime(n["fecha"], "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
                if not (limite - dt.timedelta(hours=h) <= f <= limite + dt.timedelta(hours=2)):
                    continue
            secs[sec]["notas"].append(n)
    for sec, v in secs.items():
        vistos, unicas = set(), []
        for n in sorted(v["notas"], key=lambda n: n["fecha"], reverse=True):
            k1, k2 = n["url"], _norm(n["titulo"])
            if k1 in vistos or k2 in vistos:
                continue
            vistos.update((k1, k2))
            unicas.append(n)
        v["notas"] = unicas[:TOPE_SECCION]
    ok = sum(1 for _, c, _ in res if c["ok"])
    estado["titulares"] = {"ok": ok > 0, "hora": ahora().isoformat(timespec="seconds"), "url": "RSS públicos de los medios",
                           "error": "" if ok else "ningún RSS respondió", "intentos": 1, "feeds_ok": ok, "feeds": len(res)}
    return {"generado": ahora().isoformat(timespec="seconds"), "secciones": secs}


# ---------- mercados y bitcoin (31-10-2026: el IPSA salía atrasado y el bitcoin faltaba) ----------
MERCADOS = [("^IPSA", "IPSA"), ("^GSPC", "S&P 500"), ("^IXIC", "Nasdaq"), ("^DJI", "Dow Jones"),
            ("BZ=F", "Petróleo Brent"), ("HG=F", "Cobre Comex"), ("BTC-USD", "Bitcoin")]
STOOQ = {"^GSPC": "^spx", "^IXIC": "^ndq", "^DJI": "^dji", "BZ=F": "cb.f", "HG=F": "hg.f", "BTC-USD": "btcusd"}


def cierres_yahoo(j, hoy):
    """Respuesta de la API de gráficos → [(fecha, cierre)] de días ANTERIORES a hoy (el de hoy puede estar abierto: no es cierre)."""
    r = ((j or {}).get("chart") or {}).get("result") or []
    if not r:
        return []
    r = r[0]
    off = int((r.get("meta") or {}).get("gmtoffset") or 0)
    ts = r.get("timestamp") or []
    cl = (((r.get("indicators") or {}).get("quote") or [{}])[0].get("close")) or []
    out = []
    for t, c in zip(ts, cl):
        if c is None:
            continue
        f = (dt.datetime.fromtimestamp(t, dt.timezone.utc) + dt.timedelta(seconds=off)).date()
        if f < hoy:
            out.append((f.isoformat(), float(c)))
    return out


def cierres_stooq(csv_txt, hoy):
    out = []
    for ln in (csv_txt or "").strip().splitlines()[1:]:
        p = ln.split(",")
        if len(p) >= 5 and re.match(r"\d{4}-\d{2}-\d{2}$", p[0]) and p[0] < hoy.isoformat():
            try:
                out.append((p[0], float(p[4])))
            except ValueError:
                pass
    return out


def mercados(estado, hoy):
    """[{nombre, valor, variacion_pct, fecha (último CIERRE), fuente}] y el bitcoin para «indicadores_hoy»."""
    out = []
    for sym, nom in MERCADOS:
        clave = "mercado_" + re.sub(r"[^a-z0-9]", "", sym.lower())
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(sym)}?range=10d&interval=1d"
        c, fuente = [], "Yahoo Finance"
        if robots_permite(url, estado):
            c = cierres_yahoo(pedir(url, estado, clave, espera=(0, 30), limite=30), hoy)
        else:
            estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": _motivo_robots(url)}
        if len(c) < 2 and sym in STOOQ:
            u2 = f"https://stooq.com/q/d/l/?s={quote(STOOQ[sym])}&i=d"
            if robots_permite(u2, estado):
                c, fuente = cierres_stooq(pedir(u2, estado, clave + "_stooq", como="texto", espera=(0, 30), limite=30), hoy), "Stooq"
        if len(c) >= 2:
            (f0, v0), (f1, v1) = c[-2], c[-1]
            out.append({"nombre": nom, "valor": round(v1, 2), "variacion_pct": round((v1 / v0 - 1) * 100, 2), "fecha": f1, "fuente": fuente})
    estado["mercados"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": "Yahoo Finance / Stooq",
                          "error": "" if out else "sin cierres", "intentos": 1, "n": len(out)}
    return out


def bitcoin(estado, hoy):
    """Precio del bitcoin en dólares: Coinbase (precio spot) y, si falla, CoinGecko. → {bitcoin_usd, bitcoin_fecha, bitcoin_fuente}"""
    j = pedir("https://api.coinbase.com/v2/prices/BTC-USD/spot", estado, "bitcoin", espera=(0, 30), limite=30)
    try:
        v = float(((j or {}).get("data") or {}).get("amount"))
        return {"bitcoin_usd": round(v, 2), "bitcoin_fecha": hoy.isoformat(), "bitcoin_fuente": "Coinbase"}
    except (TypeError, ValueError):
        pass
    j = pedir("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true",
              estado, "bitcoin_coingecko", espera=(0, 30), limite=30)
    try:
        b = j["bitcoin"]
        f = dt.datetime.fromtimestamp(int(b["last_updated_at"]), TZ).date()
        return {"bitcoin_usd": round(float(b["usd"]), 2), "bitcoin_fecha": f.isoformat(), "bitcoin_fuente": "CoinGecko"}
    except (KeyError, TypeError, ValueError):
        return None



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
    try:
        previo_a = json.load(open(os.path.join(a.salida, "camara-asistencia-sesiones.json"), encoding="utf-8"))
    except (OSError, ValueError):
        previo_a = {}
    asis = asistencia(estado, hoy, previo_a if isinstance(previo_a, dict) else {})
    escribir(os.path.join(a.salida, "camara-asistencia-sesiones.json"), asis)
    escribir(os.path.join(a.salida, "camara-asistencia.json"), asistencia_resumen(asis))
    escribir(os.path.join(a.salida, "vuelos-ayer.json"), vuelos_ayer(estado, hoy))
    tabla = liga(estado, hoy)
    if tabla:
        tabla["partidos"] = partidos_liga(estado) or []
    escribir(os.path.join(a.salida, "liga-primera.json"), tabla)
    escribir(os.path.join(a.salida, "titulares.json"), titulares(estado))
    mer = mercados(estado, hoy)
    btc = bitcoin(estado, hoy)
    escribir(os.path.join(a.salida, "mercados.json"), {"fecha": hoy.isoformat(), "mercados": mer, "bitcoin": btc} if (mer or btc) else None)
    resumen = {"fecha": hoy.isoformat(), "generado": ahora().isoformat(timespec="seconds"), "fuentes": estado}
    escribir(os.path.join(a.salida, "estado.json"), resumen)
    for k, v in estado.items():
        if not k.startswith(("camara_detalle_", "servicio_", "asistencia_", "vuelos_", "rss_", "robots_")):
            print(("OK   " if v["ok"] else "FALLA"), k, v.get("error", ""))
    rss = [v for k, v in estado.items() if k.startswith("rss_")]
    print(f"RSS de los medios: {sum(1 for v in rss if v['ok'])} de {len(rss)} respondieron; "
          f"{sum(1 for v in rss if 'no lo permite' in str(v.get('error')))} no permitidos por su robots.txt")
    return 0   # una fuente caída no detiene a las demás


if __name__ == "__main__":
    sys.exit(main())
