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
from urllib.parse import parse_qs, quote, urlsplit

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


_SECRETO = re.compile(r"(?i)\b(api_key|apikey|key|pass|password|user|token|client_secret)=([^&\s'\"]+)")


def ocultar(t):
    """01-11-2026: las claves de las cuentas gratuitas (FRED, Banco Central) viajan en la dirección: nunca quedan escritas."""
    return _SECRETO.sub(lambda m: m.group(1) + "=***", str(t or ""))


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
                estado[clave] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": ocultar(url), "intentos": i + 1}
                return r.json() if como == "json" else r.text
            error = f"HTTP {r.status_code}"
            if r.status_code in (401, 403, 404, 451):
                break   # rechazo explícito: insistir no cambia nada
        except (requests.RequestException, ValueError) as ex:
            error = ocultar(f"{type(ex).__name__}: {str(ex)[:160]}")[:160]
    estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": ocultar(url), "error": error, "intentos": i + 1}
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
        ("Diario Financiero (RSS)", "https://www.df.cl/noticias/site/list/port/rss.xml", "rss"),
        ("Revista Capital (RSS)", "https://www.capital.cl/feed/", "rss"),
        ("El Dínamo · Negocios (RSS)", "https://www.eldinamo.cl/feed/", "rss"),
        ("Chócale (RSS)", "https://chocale.cl/feed/", "rss"),
        ("El Mostrador (RSS)", "https://www.elmostrador.cl/feed/", "rss"),
        ("Infobae · Economía (RSS)", "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/", "rss"),
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
        ("BBC News · Business (RSS, inglés)", "https://feeds.bbci.co.uk/news/business/rss.xml", "rss"),
        ("France 24 · Economía (RSS)", "https://www.france24.com/es/econom%C3%ADa/rss", "rss"),
        ("Al Jazeera · Economía (RSS, inglés)", "https://www.aljazeera.com/xml/rss/all.xml", "rss"),
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
        ("La Tercera · Nacional (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/nacional/?outputType=xml", "rss"),
        ("El Desconcierto (RSS)", "https://www.eldesconcierto.cl/feed/", "rss"),
        ("The Clinic (RSS)", "https://www.theclinic.cl/feed/", "rss"),
        ("Interferencia (RSS)", "https://interferencia.cl/rss.xml", "rss"),
        ("Cooperativa · País (RSS)", "https://www.cooperativa.cl/noticias/site/tax/port/all/rss_3_1__1.xml", "rss"),
        ("Google News · Política Chile", "https://news.google.com/rss/search?q=pol%C3%ADtica+Chile+(gobierno+OR+Congreso+OR+Senado+OR+C%C3%A1mara)+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("La Tercera · Política (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/politica/?outputType=xml", "rss"),
        ("El Mostrador · País (RSS)", "https://www.elmostrador.cl/noticias/pais/feed/", "rss"),
        ("CIPER (RSS)", "https://www.ciperchile.cl/feed/", "rss"),
        ("Ex-Ante (RSS)", "https://www.ex-ante.cl/feed/", "rss"),
        ("Radio U. de Chile (RSS)", "https://radio.uchile.cl/feed/", "rss"),
        ("Google News · Congreso y Gobierno", "https://news.google.com/rss/search?q=(Kast+OR+%22La+Moneda%22+OR+ministro)+Chile+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "politica/mundo": [
        ("BBC News · World (RSS, inglés)", "https://feeds.bbci.co.uk/news/world/rss.xml", "rss"),
        ("DW · América Latina (RSS)", "https://rss.dw.com/xml/rss-sp-al", "rss"),
        ("La Tercera · Mundo (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/mundo/?outputType=xml", "rss"),
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
        ("El Mostrador · Emprendedor (RSS)", "https://www.elmostrador.cl/categoria/emprendedor/feed/", "rss"),
        ("Ecosistema Startup (RSS)", "https://ecosistemastartup.com/feed/", "rss"),
        ("Emprende Pyme (RSS)", "https://www.emprendepyme.net/feed", "rss"),
        ("Chócale · Emprendimiento (RSS)", "https://chocale.cl/categoria/emprendimiento/feed/", "rss"),
        ("TechCrunch · Venture (RSS)", "https://techcrunch.com/category/venture/feed/", "rss"),
        ("El Dínamo (RSS)", "https://www.eldinamo.cl/feed/", "rss"),
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
        ("FayerWayer (RSS)", "https://www.fayerwayer.com/arc/outboundfeeds/rss/?outputType=xml", "rss"),
        ("Wired (RSS, inglés)", "https://www.wired.com/feed/rss", "rss"),
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
        ("Plataforma Urbana (RSS)", "https://www.plataformaurbana.cl/feed/", "rss"),
        ("Chócale · Vivienda (RSS)", "https://chocale.cl/categoria/vivienda/feed/", "rss"),
        ("Revista Capital · Inmobiliario (RSS)", "https://www.capital.cl/category/inmobiliario/feed/", "rss"),
        ("La Tercera · Pulso (RSS, inmobiliario)", "https://www.latercera.com/arc/outboundfeeds/rss/category/pulso/?outputType=xml", "rss"),
        ("El Mostrador · Mercados (RSS)", "https://www.elmostrador.cl/categoria/mercados/feed/", "rss"),
        ("Diario Financiero (RSS, inmobiliario)", "https://www.df.cl/noticias/site/list/port/rss.xml", "rss"),
        ("Google News · Inmobiliario Chile", "https://news.google.com/rss/search?q=(inmobiliario+OR+viviendas+OR+%22cr%C3%A9dito+hipotecario%22)+Chile+when:3d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Construcción", "https://news.google.com/rss/search?q=construcci%C3%B3n+CChC+OR+inmobiliarias+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Tasas hipotecarias", "https://news.google.com/rss/search?q=%22tasa+hipotecaria%22+OR+%22cr%C3%A9ditos+hipotecarios%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Permisos y viviendas", "https://news.google.com/rss/search?q=%22permisos+de+edificaci%C3%B3n%22+OR+%22venta+de+viviendas%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Mercado inmobiliario", "https://news.google.com/rss/search?q=%22mercado+inmobiliario%22+OR+%22venta+de+viviendas%22+OR+%22subsidio+habitacional%22+Chile+when:5d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · IVA viviendas y DFL 2", "https://news.google.com/rss/search?q=(IVA+viviendas+OR+DFL2+OR+contribuciones)+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
    ],
    "deportes": [
        ("ESPN · Golf (RSS)", "https://www.espn.com/espn/rss/golf/news", "rss"),
        ("ESPN · Tenis (RSS)", "https://www.espn.com/espn/rss/tennis/news", "rss"),
        ("ESPN · Fórmula 1 (RSS)", "https://www.espn.com/espn/rss/f1/news", "rss"),
        ("ESPN · NBA (RSS)", "https://www.espn.com/espn/rss/nba/news", "rss"),
        ("La Tercera · El Deportivo (RSS)", "https://www.latercera.com/arc/outboundfeeds/rss/category/el-deportivo/?outputType=xml", "rss"),
        ("BBC Sport · Fútbol (RSS, inglés)", "https://feeds.bbci.co.uk/sport/football/rss.xml", "rss"),
        ("Golf Digest (RSS, inglés)", "https://www.golfdigest.com/feed/rss", "rss"),
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

def _bing(q):
    return "https://www.bing.com/news/search?q=" + quote(q) + "&format=rss&cc=CL&setlang=es"


FEEDS_EXTRA = {   # 01-11-2026 (Germán: «al menos 3 fuentes y más formas de conectarse»): Bing Noticias (enlace directo al medio)
    # y más diarios con RSS propio. Cada dirección pasa por el robots.txt de su sitio: la que no lo permita queda anotada en robots.json.
    "economia/chile": [("Bing Noticias · Economía Chile", _bing("economía Chile"), "rss"),
                       ("Bing Noticias · IPSA y Bolsa de Santiago", _bing("IPSA Bolsa de Santiago"), "rss"),
                       ("Ex-Ante (RSS)", "https://www.ex-ante.cl/feed/", "rss"),
                       ("CNN Chile (RSS)", "https://www.cnnchile.com/feed/", "rss")],
    "economia/mundo": [("Bing Noticias · Economía mundial", _bing("economía mundial mercados"), "rss")],
    "politica/chile": [("Bing Noticias · Política Chile", _bing("política Chile Gobierno Congreso"), "rss"),
                       ("Radio Universidad de Chile (RSS)", "https://radio.uchile.cl/feed/", "rss"),
                       ("El Líbero (RSS)", "https://ellibero.cl/feed/", "rss"),
                       ("Ex-Ante (RSS)", "https://www.ex-ante.cl/feed/", "rss"),
                       ("CNN Chile (RSS)", "https://www.cnnchile.com/feed/", "rss")],
    "politica/mundo": [("Bing Noticias · Internacional", _bing("internacional noticias mundo"), "rss")],
    "inmobiliario": [("Bing Noticias · Mercado inmobiliario", _bing("mercado inmobiliario Chile"), "rss"),
                     ("Bing Noticias · Vivienda y CChC", _bing("viviendas Chile CChC"), "rss"),
                     ("Bing Noticias · Créditos hipotecarios", _bing("crédito hipotecario Chile"), "rss")],
    "emprendimiento": [("Bing Noticias · Emprendimiento Chile", _bing("emprendimiento Chile"), "rss"),
                       ("Bing Noticias · Startups Chile", _bing("startup Chile inversión"), "rss"),
                       ("Bing Noticias · Pymes y Corfo", _bing("pymes Corfo Chile"), "rss"),
                       ("Start-Up Chile (RSS)", "https://startupchile.org/feed/", "rss")],
    "tecnologia": [("Bing Noticias · Tecnología", _bing("tecnología inteligencia artificial"), "rss")],
    "deportes": [("Bing Noticias · Fútbol chileno", _bing("fútbol chileno Liga de Primera"), "rss"),
                 ("Bing Noticias · Tenis chileno", _bing("tenis chileno ATP"), "rss"),
                 ("Bing Noticias · Golf", _bing("golf PGA Tour"), "rss"),
                 ("Bing Noticias · Equitación", _bing("equitación salto Chile"), "rss")],
    "ciencia": [("Bing Noticias · Avances médicos", _bing("avance científico medicina estudio"), "rss")],
    "astronomia": [("Bing Noticias · Astronomía", _bing("astronomía telescopio Chile"), "rss")],
}


def redes(ruta="redes.json"):
    """Cuentas OFICIALES de redes sociales que Germán elija (archivo redes.json del repositorio), leídas por su RSS público:
    YouTube (canal), Bluesky (perfil) y Mastodon (perfil o etiqueta). Sin cuentas, sin claves y sin saltarse nada."""
    try:
        R = json.load(open(ruta, encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out = {}
    for x in R.get("youtube") or []:
        if isinstance(x, dict) and re.fullmatch(r"UC[A-Za-z0-9_-]{22}", str(x.get("channel_id") or "")):
            out.setdefault(x.get("seccion") or "politica/chile", []).append(
                (f"YouTube · {x.get('nombre') or x['channel_id']}", f"https://www.youtube.com/feeds/videos.xml?channel_id={x['channel_id']}", "rss"))
    for x in R.get("bluesky") or []:
        if isinstance(x, dict) and re.fullmatch(r"[A-Za-z0-9.-]+\.[A-Za-z]{2,}", str(x.get("handle") or "")):
            out.setdefault(x.get("seccion") or "politica/chile", []).append(
                (f"Bluesky · {x.get('nombre') or x['handle']}", f"https://bsky.app/profile/{x['handle']}/rss", "rss"))
    for x in R.get("mastodon") or []:
        if isinstance(x, dict) and re.match(r"^https://[^\s]+\.rss$", str(x.get("rss") or "")):
            out.setdefault(x.get("seccion") or "politica/chile", []).append((f"Mastodon · {x.get('nombre') or x['rss']}", x["rss"], "rss"))
    return out


def todas_las_fuentes(ruta_redes="redes.json"):
    """FEEDS + FEEDS_EXTRA + redes.json, sin repetir una dirección dentro de la misma sección."""
    out = {k: list(v) for k, v in FEEDS.items()}
    for extra in (FEEDS_EXTRA, redes(ruta_redes)):
        for sec, L in extra.items():
            vistas = {u for _, u, _ in out.setdefault(sec, [])}
            out[sec] += [x for x in L if x[1] not in vistas]
    return out


VENTANA_H = {"ciencia": 240, "astronomia": 240, "emprendimiento": 120, "inmobiliario": 120}   # el resto: 72 horas
TOPE_SECCION = 90
FILTRO = {   # 01-11-2026: en secciones temáticas, de un diario general solo entran las notas del tema
    "inmobiliario": re.compile(r"inmobiliari|vivienda|departament|hipotecari|arriendo|construcci|CChC|propiedad|subsidio habitacional|"
                               r"DFL ?2|contribuciones|permisos de edificaci|urban", re.I),
    "emprendimiento": re.compile(r"emprend|startup|pyme|Corfo|capital de riesgo|venture|fintech|ronda de inversi|financiamiento|"
                                 r"unicornio|aceleradora|incubadora|innovaci", re.I)}
_ROBOTS = {}
_SIN_ROBOTS = set()   # sitios cuyo robots.txt no respondió (no se leen: no se sabe si lo permiten)


AGENTE_ROBOTS = "cofradenews"
ROBOTS_VISTOS = {}   # sitio → {"estado", "reglas"}: queda en datos/robots.json para revisar qué permite cada sitio


class Robots:
    """robots.txt según el estándar RFC 9309 (01-11-2026): manda la regla más larga que calce y, si empatan, «Allow»; entiende «*» y
    «$»; un grupo con nuestro nombre manda sobre «*». El 31-10 Google News (/rss/search) y la API de ESPN prohibían la lectura
    automática en su robots.txt: no se leen, y cada sección tiene ahora al menos 6 fuentes directas de los medios."""

    def __init__(self, texto=None, todo=None):
        self.todo, self.reglas = todo, []
        if texto is not None:
            self.reglas = self._grupo(texto)

    @staticmethod
    def _grupo(texto):
        grupos, agentes, reglas, en_reglas = [], [], [], False
        for linea in str(texto).splitlines():
            linea = linea.split("#", 1)[0].strip()
            if ":" not in linea:
                continue
            k, v = (x.strip() for x in linea.split(":", 1))
            k = k.lower()
            if k == "user-agent":
                if en_reglas:
                    grupos.append((agentes, reglas))
                    agentes, reglas, en_reglas = [], [], False
                agentes.append(v.lower())
            elif k in ("allow", "disallow") and agentes:
                en_reglas = True
                if v or k == "allow":
                    reglas.append((k == "allow", v))
        if agentes:
            grupos.append((agentes, reglas))
        propios = [r for a, r in grupos if any(x != "*" and x and AGENTE_ROBOTS.startswith(x) for x in a)]
        elegidos = propios or [r for a, r in grupos if "*" in a]
        return [x for r in elegidos for x in r if x[1]]

    @staticmethod
    def _calza(patron, ruta):
        fin = patron.endswith("$")
        rx = "".join(".*" if c == "*" else re.escape(c) for c in (patron[:-1] if fin else patron))
        return re.match(rx + ("$" if fin else ""), ruta) is not None

    def permite(self, url):
        if self.todo is not None:
            return self.todo
        u = urlsplit(url)
        ruta = (u.path or "/") + (("?" + u.query) if u.query else "")
        if ruta == "/robots.txt":
            return True
        mejor = None
        for permitir, patron in self.reglas:
            if self._calza(patron, ruta):
                largo = len(patron)
                if mejor is None or largo > mejor[0] or (largo == mejor[0] and permitir):
                    mejor = (largo, permitir)
        return True if mejor is None else mejor[1]


def robots_permite(url, estado):
    """True si el robots.txt del sitio permite leer esa dirección (RFC 9309). Se lee una vez por sitio. 200: se aplican sus reglas;
    4xx (no existe o no se publica): se puede leer, como dice el estándar; 5xx o sin respuesta: no se lee."""
    u = urlsplit(url)
    sitio = f"{u.scheme}://{u.netloc}"
    if sitio not in _ROBOTS:
        try:
            r = requests.Session().get(sitio + "/robots.txt", headers={"User-Agent": UA}, timeout=20)
            if r.status_code == 200:
                rb = Robots(r.text)
            elif 400 <= r.status_code < 500:
                rb = Robots(todo=True)
            else:
                rb = Robots(todo=False)
                _SIN_ROBOTS.add(sitio)
            ROBOTS_VISTOS[u.netloc] = {"estado": r.status_code, "reglas": [("Allow: " if a else "Disallow: ") + p for a, p in rb.reglas][:60]}
        except requests.RequestException as ex:
            rb = Robots(todo=False)
            _SIN_ROBOTS.add(sitio)
            ROBOTS_VISTOS[u.netloc] = {"estado": type(ex).__name__, "reglas": []}
            estado["robots_" + u.netloc] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": sitio + "/robots.txt",
                                           "error": f"{type(ex).__name__}"}
        _ROBOTS[sitio] = rb
    return _ROBOTS[sitio].permite(url)


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
            elif ct.lower() == "source":
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
        directo = False
        if "bing.com/news/apiclick" in url:   # 01-11-2026: Bing Noticias trae el enlace del medio dentro del suyo
            real = (parse_qs(urlsplit(url).query).get("url") or [""])[0]
            if real.startswith("http"):
                url, directo = real, True
        f = _fecha_feed(h.get("pubdate") or h.get("published") or h.get("updated") or h.get("date"))
        out.append({"fuente": (medio if (medio and directo) else f"{medio} (vía Google News)" if medio else fuente), "titulo": titulo,
                    "fecha": f.strftime("%Y-%m-%d %H:%M") if f else "", "url": url,
                    "resumen": _limpio(h.get("description") or h.get("summary") or h.get("encoded") or h.get("content"))})
    return out


def leer_espn(j, fuente):
    """API pública de noticias de ESPN (site.api.espn.com/apis/site/v2/.../news) → mismas notas que un RSS."""
    out = []
    for a in (j.get("articles") if isinstance(j, dict) else None) or []:
        if not isinstance(a, dict):
            continue
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
    """Nunca se cae: un feed raro (formato inesperado) queda anotado como falla y se sigue con los demás."""
    try:
        return _un_feed_(args)
    except Exception as ex:   # noqa: BLE001
        sec, fuente, url, tipo, estado, clave = args
        estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": f"{type(ex).__name__}"}
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": type(ex).__name__}, []


def _un_feed_(args):
    sec, fuente, url, tipo, estado, clave = args
    if not robots_permite(url, estado):
        m = _motivo_robots(url)
        estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": m}
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": m}, []
    x = pedir(url, estado, clave, como="json" if tipo == "json" else "texto", espera=(0,), limite=20,
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


def titulares(estado, feeds=None, hilos=8):
    """{"generado", "secciones": {sec: {"consultadas": [...], "notas": [...]}}} en el formato candidatos/<sección>.json de la Skill."""
    feeds = feeds or todas_las_fuentes()
    tareas, secs, unicas_url = [], {}, {}
    for sec, lista in feeds.items():
        secs[sec] = {"consultadas": [], "notas": []}
        for i, (fuente, url, tipo) in enumerate(lista):
            if url not in unicas_url:   # 01-11-2026: una dirección que sirve a dos secciones se lee UNA vez
                unicas_url[url] = len(tareas)
                tareas.append((sec, fuente, url, tipo, estado, f"rss_{sec.replace('/', '_')}_{i}"))
    with ThreadPoolExecutor(max_workers=hilos) as ex:
        leidas = list(ex.map(_un_feed, tareas))
    res = []
    for sec, lista in feeds.items():
        for fuente, url, tipo in lista:
            _, cons, notas = leidas[unicas_url[url]]
            res.append((sec, dict(cons, fuente=fuente), [dict(n, fuente=fuente) if n["fuente"] == leidas[unicas_url[url]][1]["fuente"] else n for n in notas]))
    limite = ahora()
    for sec, cons, notas in res:
        secs[sec]["consultadas"].append(cons)
        h = VENTANA_H.get(sec, 72)
        filtro = FILTRO.get(sec)
        for n in notas:
            if filtro and not filtro.search(n["titulo"] + " " + n["resumen"]):
                continue
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
    ok = sum(1 for _, c, _ in leidas if c["ok"])
    estado["titulares"] = {"ok": ok > 0, "hora": ahora().isoformat(timespec="seconds"), "url": "RSS públicos de los medios",
                           "error": "" if ok else "ningún RSS respondió", "intentos": 1, "feeds_ok": ok, "feeds": len(leidas)}
    return {"generado": ahora().isoformat(timespec="seconds"), "secciones": secs}


# ---------- mercados y bitcoin (31-10-2026: el IPSA salía atrasado y el bitcoin faltaba) ----------
MERCADOS = [("^IPSA", "IPSA"), ("^GSPC", "S&P 500"), ("^IXIC", "Nasdaq"), ("^DJI", "Dow Jones"),
            ("BZ=F", "Petróleo Brent"), ("HG=F", "Cobre Comex"), ("BTC-USD", "Bitcoin")]
STOOQ = {"^IPSA": "^ipsa", "^GSPC": "^spx", "^IXIC": "^ndq", "^DJI": "^dji", "BZ=F": "cb.f", "HG=F": "hg.f", "BTC-USD": "btcusd"}
CNBC = {"^IPSA": ".IPSA", "^GSPC": ".SPX", "^IXIC": ".IXIC", "^DJI": ".DJI", "BZ=F": "@LCO.1", "HG=F": "@HG.1", "BTC-USD": "BTC.CM="}   # 3.ª fuente


def cierre_cnbc(j, hoy):
    """Servicio público de cotizaciones de CNBC → [(fecha, cierre)] con el último valor SOLO si es de un día anterior a hoy
    (fuera de horario es el cierre); con su variación del día como cierre previo calculado."""
    try:
        q = j["FormattedQuoteResult"]["FormattedQuote"][0]
        v = float(str(q.get("last") or "").replace(",", ""))
        f = dt.datetime.fromisoformat(str(q.get("last_time"))[:19]).date()
        pct = float(str(q.get("change_pct") or "0").replace("%", "").replace("+", "").replace(",", "") or 0)
    except (KeyError, IndexError, TypeError, ValueError):
        return []
    if f >= hoy or v <= 0:
        return []
    return [((f - dt.timedelta(days=1)).isoformat(), v / (1 + pct / 100.0)), (f.isoformat(), v)]


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


# 01-11-2026 · Yahoo, Stooq y CNBC prohíben por robots.txt la lectura automática: se suman fuentes OFICIALES hechas para programas.
FRED = {"^GSPC": "SP500", "^IXIC": "NASDAQCOM", "^DJI": "DJIA", "BZ=F": "DCOILBRENTEU"}   # Reserva Federal de St. Louis
BCCH_URL = "https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx"   # Banco Central de Chile (cuenta gratuita)
BCCH_BUSCAR = {"^IPSA": r"\bIPSA\b", "^GSPC": r"S\s*&\s*P\s*500|Standard\s*(&|and|y)\s*Poor", "^IXIC": r"nasdaq",
               "^DJI": r"dow\s*jones", "BZ=F": r"brent", "HG=F": r"cobre"}
BCCH_FUERA = re.compile(r"variaci|var\.|%|promedio|mensual|trimestral|anual|tasa|futuro|exporta|import|volumen|monto", re.I)
_BCCH = {}


def cierres_fred_api(j, hoy):
    """API de FRED → [(fecha, valor)] de días anteriores a hoy (los días sin dato vienen con «.»)."""
    out = []
    for o in (j or {}).get("observations") or []:
        try:
            f, v = str(o.get("date"))[:10], float(o.get("value"))
        except (TypeError, ValueError):
            continue
        if re.match(r"\d{4}-\d{2}-\d{2}$", f) and f < hoy.isoformat():
            out.append((f, v))
    return sorted(out)


def cierres_fred_csv(txt, hoy):
    out = []
    for ln in (txt or "").strip().splitlines()[1:]:
        p = ln.split(",")
        if len(p) >= 2 and re.match(r"\d{4}-\d{2}-\d{2}$", p[0]) and p[0] < hoy.isoformat():
            try:
                out.append((p[0], float(p[1])))
            except ValueError:
                pass
    return sorted(out)


def cierres_bcch(j, hoy):
    """Servicio del Banco Central (SIETE) → [(fecha, valor)]; fechas «dd-mm-aaaa», solo observaciones con estado OK."""
    out = []
    for o in (((j or {}).get("Series") or {}).get("Obs") or []):
        m = re.match(r"(\d{2})-(\d{2})-(\d{4})$", str(o.get("indexDateString") or ""))
        if not m or str(o.get("statusCode", "OK")).upper() != "OK":
            continue
        try:
            v = float(str(o.get("value")).replace(",", "."))
        except (TypeError, ValueError):
            continue
        f = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        if f < hoy.isoformat() and v > 0:
            out.append((f, v))
    return sorted(out)


def bcch_elegir(infos):
    """Catálogo de series DIARIAS del Banco Central → {símbolo: (id, título)}: la primera serie cuyo título calza y no es una
    variación, un promedio ni un monto. Lo elegido queda en estado.json para revisarlo."""
    out = {}
    for sym, patron in BCCH_BUSCAR.items():
        for x in infos or []:
            t = f"{x.get('spanishTitle') or ''} {x.get('englishTitle') or ''}"
            if re.search(patron, t, re.I) and not BCCH_FUERA.search(t) and x.get("seriesId"):
                out[sym] = (x["seriesId"], (x.get("spanishTitle") or x.get("englishTitle") or "")[:120])
                break
    return out


def _bcch_cred():
    return os.environ.get("BCCH_USER", "").strip(), os.environ.get("BCCH_PASS", "").strip()


def bcch_series(estado):
    if "mapa" in _BCCH:
        return _BCCH["mapa"]
    u, pw = _bcch_cred()
    mapa = {}
    if u and pw:
        url = f"{BCCH_URL}?user={quote(u)}&pass={quote(pw)}&function=SearchSeries&frequency=DAILY"
        if robots_permite(url, estado):
            mapa = bcch_elegir((pedir(url, estado, "bcch_catalogo", espera=(0, 30), limite=60) or {}).get("SeriesInfos"))
        estado["bcch_series"] = {"ok": bool(mapa), "hora": ahora().isoformat(timespec="seconds"), "url": "Banco Central (catálogo)",
                                 "error": "" if mapa else "sin series que calcen", "elegidas": {k: list(v) for k, v in mapa.items()}}
    _BCCH["mapa"] = mapa
    return mapa


def cierres_mindicador(j, hoy):
    out = []
    for o in (j or {}).get("serie") or []:
        f = str(o.get("fecha") or "")[:10]
        try:
            v = float(o.get("valor"))
        except (TypeError, ValueError):
            continue
        if re.match(r"\d{4}-\d{2}-\d{2}$", f) and f < hoy.isoformat():
            out.append((f, v))
    return sorted(out)


def _fuentes_mercado(sym, hoy, estado, clave):
    """La cascada de cada índice, en orden: (nombre de la fuente, función que trae los cierres). Las cuentas gratuitas solo
    se usan si su secreto está guardado en GitHub; todas pasan por el robots.txt del sitio."""
    L = [("Yahoo Finance", lambda u: cierres_yahoo(pedir(u, estado, clave, espera=(0, 30), limite=30), hoy),
          f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(sym)}?range=10d&interval=1d")]
    if sym in STOOQ:
        L.append(("Stooq", lambda u: cierres_stooq(pedir(u, estado, clave + "_stooq", como="texto", espera=(0, 30), limite=45), hoy),
                  f"https://stooq.com/q/d/l/?s={quote(STOOQ[sym])}&i=d"))
    if sym in CNBC:
        L.append(("CNBC", lambda u: cierre_cnbc(pedir(u, estado, clave + "_cnbc", espera=(0, 30), limite=30), hoy),
                  f"https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols={quote(CNBC[sym])}"
                  "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1"))
    desde = (hoy - dt.timedelta(days=15)).isoformat()
    k = os.environ.get("FRED_API_KEY", "").strip()
    if sym in FRED and k:
        L.append(("FRED (Reserva Federal de St. Louis)", lambda u: cierres_fred_api(pedir(u, estado, clave + "_fred", espera=(0, 30), limite=30), hoy),
                  f"https://api.stlouisfed.org/fred/series/observations?series_id={FRED[sym]}&api_key={quote(k)}&file_type=json"
                  f"&observation_start={desde}"))
    if sym in FRED:
        L.append(("FRED (Reserva Federal de St. Louis)", lambda u: cierres_fred_csv(pedir(u, estado, clave + "_fredcsv", como="texto", espera=(0, 30), limite=30), hoy),
                  f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={FRED[sym]}&cosd={desde}"))
    usr, pw = _bcch_cred()
    if sym in BCCH_BUSCAR and usr and pw:
        def _bc(u=None):
            sid = (bcch_series(estado).get(sym) or ("", ""))[0]
            if not sid:
                return []
            return cierres_bcch(pedir(f"{BCCH_URL}?user={quote(usr)}&pass={quote(pw)}&function=GetSeries&timeseries={quote(sid)}"
                                      f"&firstdate={desde}&lastdate={hoy.isoformat()}", estado, clave + "_bcch", espera=(0, 30), limite=45), hoy)
        L.append(("Banco Central de Chile", _bc, f"{BCCH_URL}?function=GetSeries"))
    if sym == "HG=F":
        L.append(("Banco Central de Chile (vía mindicador.cl)",
                  lambda u: cierres_mindicador(pedir(u, estado, clave + "_mindicador", espera=(0, 30), limite=30), hoy),
                  "https://mindicador.cl/api/libra_cobre"))
    return L


def mercados(estado, hoy):
    """[{nombre, valor, variacion_pct, fecha (último CIERRE), fuente}]. Cada índice recorre su cascada (hasta 7 fuentes) y se
    queda con la primera que trae dos cierres; si dos fuentes traen fechas distintas, gana la más reciente."""
    out, usadas, intentadas = [], set(), []
    for sym, nom in MERCADOS:
        clave = "mercado_" + re.sub(r"[^a-z0-9]", "", sym.lower())
        mejor = None
        for fuente, traer, u0 in _fuentes_mercado(sym, hoy, estado, clave):
            intentadas.append(fuente)
            if not robots_permite(u0, estado):
                estado.setdefault(clave, {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": ocultar(u0), "error": _motivo_robots(u0)})
                continue
            try:
                c = traer(u0)
            except Exception as ex:   # noqa: BLE001 — una fuente rota pasa a la siguiente
                estado[clave + "_error"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": fuente, "error": type(ex).__name__}
                c = []
            if len(c) >= 2 and (not mejor or c[-1][0] > mejor[1][-1][0]):
                mejor = (fuente, c)
                if c[-1][0] >= (hoy - dt.timedelta(days=1)).isoformat():
                    break   # ya es el cierre de ayer: no hace falta seguir
        if mejor:
            fuente, c = mejor
            (f0, v0), (f1, v1) = c[-2], c[-1]
            nombre = "Cobre (Bolsa de Metales de Londres)" if (sym == "HG=F" and "mindicador" in fuente) else nom
            out.append({"nombre": nombre, "valor": round(v1, 2), "variacion_pct": round((v1 / v0 - 1) * 100, 2), "fecha": f1, "fuente": fuente})
            usadas.add(fuente)
    estado["mercados"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": " / ".join(dict.fromkeys(intentadas)) or "mercados",
                          "error": "" if out else "sin cierres", "intentos": 1, "n": len(out), "fuentes_usadas": sorted(usadas)}
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
    try:
        escribir(os.path.join(a.salida, "titulares.json"), titulares(estado))
    except Exception as ex:   # noqa: BLE001 — los titulares nunca impiden guardar lo demás
        estado["titulares"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "RSS", "error": type(ex).__name__}
    try:
        mer = mercados(estado, hoy)
    except Exception as ex:   # noqa: BLE001
        mer = []
        estado["mercados"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "mercados", "error": type(ex).__name__}
    try:
        btc = bitcoin(estado, hoy)
    except Exception as ex:   # noqa: BLE001
        btc = None
        estado["bitcoin"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "bitcoin", "error": type(ex).__name__}
    escribir(os.path.join(a.salida, "mercados.json"), {"fecha": hoy.isoformat(), "mercados": mer, "bitcoin": btc} if (mer or btc) else None)
    escribir(os.path.join(a.salida, "robots.json"), {"fecha": hoy.isoformat(), "sitios": ROBOTS_VISTOS} if ROBOTS_VISTOS else None)
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
