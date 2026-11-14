#!/usr/bin/env python3
"""Cofrade News · datos oficiales del día.

Pide los datos por las puertas OFICIALES para programas (API y servicios de datos abiertos), una vez al día,
con un nombre que se identifica y con pausas entre intentos. No imita a una persona ni salta ningún bloqueo:
si una fuente responde con error, se anota en datos/estado.json y la Skill usa su fuente de respaldo.

Archivos que deja en datos/:
  uv.csv              índice UV de 8 días por ciudad (Open-Meteo, uso no comercial, CC BY 4.0)   ciudad,fecha,uv
  clima-openmeteo.json  01-11-2026: pronóstico por hora de 8 días de las 9 ciudades (Open-Meteo): tercera fuente del clima
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
import html
import glob
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


# ---------- Pronóstico de 8 días por hora (Open-Meteo) ----------
# 01-11-2026 (Germán: «Arica solo muestra 2 días»): tercera fuente del pronóstico, leída aquí en GitHub y no por el modelo, para que
# ninguna ciudad salga con menos de 7 días. Mismas columnas que la lectura de MET Norway: time (UTC), temp, hr, viento (m/s), dir, simbolo.
WMO_SIMBOLO = {0: "clearsky", 1: "fair", 2: "partlycloudy", 3: "cloudy", 45: "fog", 48: "fog", 51: "lightrain", 53: "lightrain",
               55: "rain", 56: "sleet", 57: "sleet", 61: "lightrain", 63: "rain", 65: "heavyrain", 66: "sleet", 67: "sleet",
               71: "snow", 73: "snow", 75: "snow", 77: "snow", 80: "rainshowers", 81: "rainshowers", 82: "heavyrainshowers",
               85: "snow", 86: "snow", 95: "thunder", 96: "thunder", 99: "thunder"}


def clima(estado, hoy):
    lat = ",".join(str(c[1]) for c in CIUDADES)
    lon = ",".join(str(c[2]) for c in CIUDADES)
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
           "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code"
           "&wind_speed_unit=ms&timezone=GMT&forecast_days=8")
    j = pedir(url, estado, "clima")
    return clima_json(j, hoy) if j is not None else None


def clima_json(j, hoy):
    lista = j if isinstance(j, list) else [j]
    ciudades = {}
    for (nombre, _, _), x in zip(CIUDADES, lista):
        h = (x or {}).get("hourly") or {}
        filas = []
        for i, t in enumerate(h.get("time") or []):
            def v(k):
                L = h.get(k) or []
                return L[i] if i < len(L) else None
            if v("temperature_2m") is None:
                continue
            filas.append({"time": str(t) + ":00Z" if len(str(t)) == 16 else str(t), "temp": v("temperature_2m"),
                          "hr": v("relative_humidity_2m"), "viento": v("wind_speed_10m"), "dir": v("wind_direction_10m"),
                          "simbolo": WMO_SIMBOLO.get(v("weather_code"), "")})
        if filas:
            ciudades[nombre] = filas
    if not ciudades:
        return None
    return {"fecha": hoy.isoformat(), "fuente": "Open-Meteo (open-meteo.com, CC BY 4.0)", "ciudades": ciudades}


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


# ---------- 13-11-2026: control del padrón (la Cámara empezó a devolver nombres de un período anterior) ----------
def _norm_nombre(t):
    import unicodedata
    t = unicodedata.normalize("NFD", (t or "").lower())
    return " ".join("".join(c for c in t if unicodedata.category(c) != "Mn").replace("-", " ").split())


def _padron_apellidos():
    """Apellidos normalizados de los 155 diputados del período vigente (datos/padron-camara.json)."""
    for ruta in (os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "padron-camara.json"),
                 os.path.join("datos", "padron-camara.json")):
        try:
            return {_norm_nombre(d["apellidos"]) for d in json.load(open(ruta, encoding="utf-8"))["camara"]}
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return set()


def lista_vigente(filas, padron=None, minimo=0.6):
    """True si al menos `minimo` de los nombres («Apellido Apellido, Nombre») son diputados del período vigente.
    Sin padrón no se bloquea nada (no hay con qué comparar)."""
    padron = _padron_apellidos() if padron is None else padron
    if not padron or not filas:
        return True
    ok = sum(1 for x in filas if _norm_nombre((x.get("nombre") or "").split(",")[0]) in padron)
    return ok >= minimo * len(filas)


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
    padron = _padron_apellidos()
    nominal = {i: v for i, v in (previo or {}).items() if i in vigentes and v and lista_vigente(v, padron)}
    descartadas = []
    faltan = sorted((i for i in vigentes if i not in nominal), key=lambda i: todas[i], reverse=True)
    for idv in faltan[:maximo]:
        time.sleep(3)   # de a una, con calma
        t = pedir(f"{CAMARA}/retornarVotacionDetalle?prmVotacionId={idv}", estado, f"camara_detalle_{idv}",
                  como="texto", espera=(0, 30), sesion=s)
        if t:
            try:
                filas = camara_nominal(t)
                if filas and lista_vigente(filas, padron):
                    nominal[idv] = filas
                elif filas:   # nombres de otro período: no se guarda y se vuelve a pedir en la próxima corrida
                    descartadas.append(idv)
            except ET.ParseError:
                pass
    estado["camara"]["nominal"] = {"guardadas": len(nominal), "pendientes": max(0, len(faltan) - maximo),
                                   "descartadas_otro_periodo": len(descartadas),
                                   "ejemplo_descartada": descartadas[0] if descartadas else ""}
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
    padron = _padron_apellidos()
    out = {i: v for i, v in prev.items() if v.get("fecha", "") >= desde and v.get("asistencia")
           and lista_vigente(v["asistencia"], padron)}
    faltan = [x for x in sorted(ses, key=lambda x: x["fecha"], reverse=True) if x["id"] not in out]
    for x in faltan[:maximo]:
        time.sleep(3)
        t = pedir(f"{base}/retornarSesionAsistencia?prmSesionId={x['id']}", estado, f"asistencia_{x['id']}", como="texto", espera=(0, 30))
        if t:
            try:
                filas = asistencia_xml(t)
            except ET.ParseError:
                filas = []
            if filas and lista_vigente(filas, padron):
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
    # 14-11-2026 (informe: Perspectivas 2050 con 1 proyecto nuevo; Google News y DF rechazan a la tarea): megaproyectos de los últimos
    # 7 días, leídos aquí, con enlace y fecha → titulares-perspectivas.json
    "perspectivas": [
        ("Google News · SEA y Comité de Ministros aprueban proyectos", "https://news.google.com/rss/search?q=(SEA+OR+%22Comit%C3%A9+de+Ministros%22+OR+%22Comisi%C3%B3n+de+Evaluaci%C3%B3n%22)+aprueba+proyecto+Chile+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Licitaciones y concesiones MOP", "https://news.google.com/rss/search?q=(licitaci%C3%B3n+OR+concesi%C3%B3n+OR+adjudica)+(MOP+OR+%22Obras+P%C3%BAblicas%22)+Chile+millones+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Proyectos mineros con inversión", "https://news.google.com/rss/search?q=proyecto+minero+Chile+inversi%C3%B3n+(%22US%24%22+OR+%22millones+de+d%C3%B3lares%22)+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Energía, hidrógeno verde y almacenamiento", "https://news.google.com/rss/search?q=(%22hidr%C3%B3geno+verde%22+OR+e%C3%B3lico+OR+solar+OR+almacenamiento+OR+transmisi%C3%B3n)+Chile+proyecto+inversi%C3%B3n+millones+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Puertos, aeropuertos, trenes y Metro", "https://news.google.com/rss/search?q=(puerto+OR+aeropuerto+OR+tren+OR+%22Metro%22+OR+autopista)+Chile+proyecto+inversi%C3%B3n+millones+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Centros de datos, desaladoras e inmobiliarios grandes", "https://news.google.com/rss/search?q=(%22centro+de+datos%22+OR+%22data+center%22+OR+desaladora+OR+hospital)+Chile+inversi%C3%B3n+millones+proyecto+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Google News · Megaproyectos en Chile", "https://news.google.com/rss/search?q=megaproyecto+Chile+OR+%22proyecto+de+inversi%C3%B3n%22+Chile+%22millones+de+d%C3%B3lares%22+when:7d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
        ("Bing Noticias · SEA aprueba proyectos", "https://www.bing.com/news/search?q=SEA%20aprueba%20proyecto%20inversi%C3%B3n%20Chile&format=rss&cc=CL&setlang=es", "rss"),
        ("Bing Noticias · Comité de Ministros", "https://www.bing.com/news/search?q=Comit%C3%A9%20de%20Ministros%20aprueba%20proyecto%20Chile&format=rss&cc=CL&setlang=es", "rss"),
        ("Bing Noticias · Licitaciones MOP", "https://www.bing.com/news/search?q=licitaci%C3%B3n%20concesi%C3%B3n%20MOP%20Chile%20millones&format=rss&cc=CL&setlang=es", "rss"),
        ("Bing Noticias · Inversión minera", "https://www.bing.com/news/search?q=proyecto%20minero%20Chile%20inversi%C3%B3n%20millones%20de%20d%C3%B3lares&format=rss&cc=CL&setlang=es", "rss"),
        ("Bing Noticias · Energía e hidrógeno verde", "https://www.bing.com/news/search?q=proyecto%20energ%C3%ADa%20hidr%C3%B3geno%20verde%20Chile%20inversi%C3%B3n&format=rss&cc=CL&setlang=es", "rss"),
        ("Bing Noticias · Infraestructura y puertos", "https://www.bing.com/news/search?q=proyecto%20puerto%20aeropuerto%20tren%20Chile%20inversi%C3%B3n&format=rss&cc=CL&setlang=es", "rss"),
        ("Minería Chilena (RSS)", "https://www.mch.cl/feed/", "rss"),
        ("Revista Electricidad (RSS)", "https://www.revistaei.cl/feed/", "rss"),
    ],
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
        # 14-11-2026 (informe del 14-11: la NBA salió con 2 notas porque ESPN solo traía previas): NBA en español, con fecha (sonda: al día)
        ("AS · NBA en español (RSS)", "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/baloncesto/subsection/nba/", "rss"),
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
        # 13-11-2026: tercera disciplina de «Otros deportes» con tabla (NFL y NHL en temporada)
        ("ESPN · NFL (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news", "json"),
        ("ESPN · NHL (noticias con fecha)", "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news", "json"),
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


INMO = "rss|inmobiliari|vivienda|arriendo|hipotecari|construcción de viviendas|permisos de edificación|subsidio habitacional|departamentos en|venta de departamentos|minvu|cchc|plusvalía|bienes raíces|vacancia"
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
    "politica/mundo": [("Bing Noticias · Internacional", _bing("internacional noticias mundo"), "rss"),
                       # 03-11-2026 (informe de la tarea: Sudán solo con Al Jazeera): más fuentes para los conflictos de África
                       ("Bing Noticias · Sudán", _bing("Sudán guerra El Fasher RSF"), "rss"),
                       ("Bing Noticias · Conflictos en África", _bing("conflicto armado África Sahel Congo"), "rss"),
                       ("Noticias ONU · África (RSS)", "https://news.un.org/feed/subscribe/es/news/region/africa/feed/rss.xml", "rss"),
                       ("France 24 · África (RSS)", "https://www.france24.com/es/%C3%A1frica/rss", "rss"),
                       ("Sudan Tribune (RSS, inglés)", "https://sudantribune.com/feed/", "rss"),
                       ("Europa Press · Internacional (RSS)", "https://www.europapress.es/rss/rss.aspx?ch=00069", "rss"),
                       # 08-11-2026: Gaza, Ucrania e Irán también con varias fuentes cada día
                       ("Google News · Gaza", "https://news.google.com/rss/search?q=Gaza+(Israel+OR+Ham%C3%A1s)+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                       ("Google News · Ucrania", "https://news.google.com/rss/search?q=Ucrania+Rusia+guerra+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                       ("Google News · Irán", "https://news.google.com/rss/search?q=Ir%C3%A1n+(Israel+OR+Ormuz+OR+Hezbol%C3%A1+OR+hut%C3%ADes)+when:1d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                       ("Google News · Sudán", "https://news.google.com/rss/search?q=Sud%C3%A1n+guerra+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                       ("Noticias ONU · Oriente Medio (RSS)", "https://news.un.org/feed/subscribe/es/news/region/middle-east/feed/rss.xml", "rss"),
                       ("Noticias ONU · Europa (RSS)", "https://news.un.org/feed/subscribe/es/news/region/europe/feed/rss.xml", "rss")],
    "inmobiliario": [  # 13-11-2026 (control: «Inmobiliario quedó con 2 notas»; Google Noticias prohíbe la lectura automática)
                     ("La Tercera (RSS general, filtrado: vivienda e inmobiliario)", "https://www.latercera.com/arc/outboundfeeds/rss/?outputType=xml", INMO),
                     ("BioBioChile (RSS general, filtrado: vivienda e inmobiliario)", "https://www.biobiochile.cl/static/feed-rss", INMO),
                     ("Ex-Ante (RSS, filtrado: vivienda e inmobiliario)", "https://www.ex-ante.cl/feed/", INMO),
                     ("Bing Noticias · Arriendos", _bing("arriendo departamentos Chile"), "rss"),
                     ("Bing Noticias · Permisos de edificación", _bing("permisos de edificación INE Chile"), "rss"),
                     ("Bing Noticias · Cámara Chilena de la Construcción", _bing("Cámara Chilena de la Construcción viviendas"), "rss"),
                     ("Bing Noticias · Subsidio habitacional", _bing("subsidio habitacional Minvu"), "rss"),
                     ("Bing Noticias · Oficinas y vacancia", _bing("oficinas vacancia Santiago arriendo comercial"), "rss"),
                     ("Bing Noticias · Mercado inmobiliario", _bing("mercado inmobiliario Chile"), "rss"),
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
                 ("Bing Noticias · Equitación", _bing("equitación salto Chile"), "rss"),
                 # 13-11-2026 (control: «equitación con 2 notas»): más fuentes directas de salto ecuestre
                 ("Jumper News (RSS, salto ecuestre latinoamericano)", "https://jumpernews.com/category/news/feed/", "rss"),
                 ("World of Showjumping (RSS)", "https://www.worldofshowjumping.com/documents.rdf?idz=32&cid=9664", "rss"),
                 ("The Plaid Horse (RSS)", "https://www.theplaidhorse.com/feed/", "rss"),
                 ("Bing Noticias · Global Champions Tour", _bing("Longines Global Champions Tour salto"), "rss"),
                 ("Bing Noticias · Copa de Naciones ecuestre", _bing("Copa de Naciones salto ecuestre FEI"), "rss"),
                 # 08-11-2026 (equitación con 2 de 3 notas; NBA con 1): más búsquedas de noticias
                 ("Bing Noticias · Equitación internacional", _bing("salto ecuestre FEI Longines Global Champions"), "rss"),
                 ("Bing Noticias · Hípica y polo Chile", _bing("Federación Ecuestre de Chile concurso salto Club Hípico"), "rss"),
                 ("Google News · Equitación", "https://news.google.com/rss/search?q=(equitaci%C3%B3n+OR+%22salto+ecuestre%22+OR+FEI+OR+%22Global+Champions%22)+when:30d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                 # 08-11-2026: Google Noticias y Bing Noticias prohíben las búsquedas automáticas en su robots.txt (se saltan solas):
                 # fuentes directas que sí lo permiten
                 ("FEI · Federación Ecuestre Internacional (RSS, inglés)", "https://inside.fei.org/rss.xml", "rss"),
                 ("Ecuestre.es · Revista Ecuestre (RSS)", "https://www.ecuestre.es/feed/", "rss"),
                 ("Bing Noticias · NBA", _bing("NBA resultados partido"), "rss"),
                 ("Google News · NBA", "https://news.google.com/rss/search?q=NBA+when:2d&hl=es-419&gl=CL&ceid=CL:es-419", "rss"),
                 # 03-11-2026 (informe de la tarea: rugby con solo 2 notas)
                 ("BBC Sport · Rugby (RSS, inglés)", "https://feeds.bbci.co.uk/sport/rugby-union/rss.xml", "rss"),
                 ("Bing Noticias · Rugby Chile", _bing("rugby Chile Cóndores"), "rss"),
                 ("Bing Noticias · Rugby internacional", _bing("rugby test match Pumas All Blacks Springboks"), "rss")],
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


VENTANA_H = { "perspectivas": 168,   # 14-11-2026: megaproyectos de los últimos 7 días
   "ciencia": 240, "astronomia": 240, "emprendimiento": 120, "inmobiliario": 120}   # el resto: 72 horas
TOPE_SECCION = 90
# 13-11-2026 (Germán: equitación 2/3): en «deportes» el fútbol llenaba el tope y la equitación (que publica menos) quedaba fuera.
# Cada disciplina con reserva tiene su propia ventana y un mínimo de cupos dentro del tope.
RESERVA = {"deportes": [(re.compile(r"equitaci|ecuestre|salto ecuestre|show ?jumping|jumper|horse|\bFEI\b|Global Champions|"
                                    r"Copa de Naciones|Nations Cup|Club H[íi]pico|polo\b", re.I), 10, 240),
                        (re.compile(r"\bNFL\b|\bNHL\b", re.I), 6, 72)]}
FILTRO = {   # 01-11-2026: en secciones temáticas, de un diario general solo entran las notas del tema
    # 13-11-2026: «departament», «construcci», «propiedad» y «urban» dejaban pasar el Departamento de Estado, antenas y autos robados
    "inmobiliario": re.compile(r"inmobiliari|vivienda|(?<!el )(?<!del )departamentos? (?:en venta|en arriendo|nuevos|usados|se (?:vende|arrienda|renta))|venta de departamentos|arriendo|"
                               r"hipotecari|CChC|C[áa]mara Chilena de la Construcci|sector construcci|construcci[óo]n de viviendas|"
                               r"subsidio habitacional|subsidio DS|\bDS ?(?:1|19|49)\b|DFL ?2|contribuciones|permisos de edificaci|"
                               r"Minvu|plusval|oficinas (?:premium|clase)|vacancia|suelo urbano|plan regulador|bienes ra[íi]ces|"
                               r"corredora? de propiedades|precio de (?:las )?propiedades|ordenanza general de urbanismo|loteo|condominio", re.I),
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


# ---------- 08-11-2026 · oleaje de toda la costa (Open-Meteo Marine, gratis, sin clave) ----------
PUERTOS_OLEAJE = (("arica", -18.4694, -70.3247), ("iquique", -20.2161, -70.16), ("tocopilla", -22.0872, -70.1997),
                  ("mejillones", -23.0975, -70.4478), ("antofagasta", -23.6436, -70.4075), ("taltal", -25.4014, -70.4828),
                  ("chanaral", -26.3397, -70.6231), ("caldera", -27.0722, -70.8603), ("huasco", -28.4631, -71.2194),
                  ("coquimbo", -29.9342, -71.3428), ("los-vilos", -31.9089, -71.5108), ("quintero", -32.7806, -71.5358),
                  ("valparaiso", -33.0347, -71.6231), ("san-antonio", -33.5881, -71.6244), ("pichilemu", -34.3861, -72.0231),
                  ("constitucion", -35.3183, -72.4286), ("talcahuano", -36.7361, -73.1625), ("coronel", -37.0383, -73.1481),
                  ("lebu", -37.6031, -73.6575), ("corral", -39.8881, -73.4317), ("puerto-montt", -41.4808, -72.9525),
                  ("ancud", -41.8494, -73.8231), ("castro", -42.4828, -73.7581), ("quellon", -43.1219, -73.6194),
                  ("puerto-chacabuco", -45.4694, -72.8197), ("puerto-natales", -51.7328, -72.5147), ("punta-arenas", -53.1625, -70.8525),
                  ("puerto-williams", -54.9325, -67.6067), ("rapa-nui", -27.1492, -109.4344), ("juan-fernandez", -33.6306, -78.8064))
# 08-11-2026: marine-api.open-meteo.com publica «Disallow: /» en su robots.txt: no se usa (ver oleaje_costa).


ERDDAP_OLAS = "https://upwell.pfeg.noaa.gov/erddap/griddap/NWW3_Global_Best.json"


def _olas_punto(estado, slug, lat, lon, t1, t2):
    """WaveWatch III (NOAA) en la celda de mar más cercana al puerto, hacia el oeste (la grilla es de 0,5°: la celda del puerto
    puede caer en tierra). → [(hora_utc, ola_m, periodo_s, direccion)]"""
    la = round(lat * 2) / 2
    lo = (lon % 360)
    lo1, lo2 = (round(lo * 2) / 2) - 1.0, round(lo * 2) / 2
    rango = f"[({t1}):3:({t2})][(0.0)][({la})][({lo1}):({lo2})]"
    url = ERDDAP_OLAS + "?" + ",".join(v + rango for v in ("Thgt", "Tper", "Tdir"))
    j = pedir(url, estado, f"oleaje_{slug}", espera=(0, 15), limite=60) or {}
    tabla = j.get("table") or {}
    cols, filas = tabla.get("columnNames") or [], tabla.get("rows") or []
    if not cols or not filas:
        return []
    ix = {c: k for k, c in enumerate(cols)}
    mejor = {}   # hora → (longitud, ola, per, dir): la celda de mar más al este (más cerca de la costa)
    for r in filas:
        h, lon_r = r[ix["time"]], r[ix["longitude"]]
        ola = r[ix["Thgt"]]
        if not isinstance(ola, (int, float)) or ola != ola:   # NaN: tierra
            continue
        if h not in mejor or lon_r > mejor[h][0]:
            mejor[h] = (lon_r, ola, r[ix["Tper"]], r[ix["Tdir"]])
    return [(h, v[1], v[2], v[3]) for h, v in sorted(mejor.items())]


def oleaje_costa(estado, dias=6):
    """Ola máxima del día, su período y dirección en los 30 puertos (los mismos de assets/puertos-costa.json de la Skill).
    08-11-2026: Open-Meteo marino tiene «Disallow: /» en su robots.txt (no se lee); se usa el modelo WaveWatch III de NOAA
    (dominio público de EE.UU.) por su servidor ERDDAP, que sí lo permite.
    → {"fuente", "url", "generado", "puertos": {slug: [{fecha, ola_max_m, periodo_s, direccion_grados}]}} o None."""
    if not robots_permite(ERDDAP_OLAS, estado):
        estado["oleaje"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": ERDDAP_OLAS, "error": "robots.txt no lo permite"}
        return None
    from zoneinfo import ZoneInfo
    cl = ZoneInfo("America/Santiago")
    t0 = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0) - dt.timedelta(hours=3)
    t1, t2 = t0.strftime("%Y-%m-%dT%H:00:00Z"), (t0 + dt.timedelta(days=dias)).strftime("%Y-%m-%dT%H:00:00Z")
    out, fallas = {}, 0
    for slug, lat, lon in PUERTOS_OLEAJE:
        if fallas >= 4:   # el servidor no responde: no insistir con los 30 puertos
            break
        try:
            serie = _olas_punto(estado, slug, lat, lon, t1, t2)
        except Exception:   # noqa: BLE001
            serie = []
        if not serie:
            fallas += 1
            continue
        dia = {}
        for h, ola, per, dire in serie:
            try:
                f = dt.datetime.fromisoformat(str(h).replace("Z", "+00:00")).astimezone(cl).date().isoformat()
            except ValueError:
                continue
            if f not in dia or ola > dia[f][0]:
                dia[f] = (ola, per, dire)
        filas = [{"fecha": f, "ola_max_m": round(v[0], 1),
                  "periodo_s": round(v[1], 1) if isinstance(v[1], (int, float)) and v[1] == v[1] else None,
                  "direccion_grados": round(v[2]) if isinstance(v[2], (int, float)) and v[2] == v[2] else None}
                 for f, v in sorted(dia.items())]
        if filas:
            out[slug] = filas
        time.sleep(0.4)   # cortesía con el servidor público
    estado["oleaje"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": ERDDAP_OLAS, "n": len(out),
                        "error": "" if out else "sin datos"}
    if not out:
        return None
    return {"fuente": "NOAA, modelo WaveWatch III (ola significativa máxima del día)",
            "url": "https://upwell.pfeg.noaa.gov/erddap/griddap/NWW3_Global_Best.html",
            "generado": ahora().isoformat(timespec="minutes"), "puertos": out}


# ---------- 08-11-2026 · efeméride naval del día (Armada de Chile) ----------
MESES_ES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")


def efemeride_naval(estado, hoy, salida):
    """Lee el índice del mes de las efemérides navales de la Armada, busca la(s) del día y guarda su texto en paginas/armada-efemeride-*.txt.
    → {"fecha", "listas": [{url, titulo, archivo}]} o None."""
    mes = MESES_ES[hoy.month - 1]
    base = f"https://www.armada.cl/tradicion-e-historia/efemerides-navales/{mes}"
    if not robots_permite(base, estado):
        return None
    # 08-11-2026: el índice del mes da 404; primero las direcciones conocidas del día (scripts/armada-efemerides.json, copiado de la
    # Skill) y, si no hay, el índice del mes (por si la Armada lo repone).
    try:
        idx = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "armada-efemerides.json"), encoding="utf-8")).get("urls") or {}
    except (OSError, ValueError):
        idx = {}
    candidatos = [(u, "") for u in (idx.get(f"{hoy.month:02d}-{hoy.day:02d}") or [])]
    if not candidatos:
        h = pedir(base, estado, "efemeride_naval_indice", como="text", espera=(0, 10), limite=40) or ""
        patron = re.compile(rf'href="([^"]*/efemerides-navales/{mes}/{hoy.day}-de-{mes}[^"]*)"[^>]*>(.*?)</a>', re.I | re.S)
        candidatos = [(m.group(1) if m.group(1).startswith("http") else "https://www.armada.cl" + m.group(1), m.group(2)) for m in patron.finditer(h)]
    out, vistos = [], set()
    os.makedirs(os.path.join(salida, "paginas"), exist_ok=True)
    for u, tit in candidatos:
        if u in vistos or len(out) >= 3:
            continue
        vistos.add(u)
        t = pedir(u, estado, "efemeride_naval", como="text", espera=(0, 10), limite=40)
        texto = html_a_texto(t or "")
        if len(texto) < 200:
            continue
        nombre = f"armada-efemeride-{len(out) + 1}.txt"
        _gz(os.path.join(salida, "paginas", nombre + ".gz"), texto)
        if not tit:
            m_t = re.search(r"<title>(.*?)</title>", t or "", re.I | re.S)
            tit = m_t.group(1) if m_t else u.rsplit("/", 1)[-1].replace("-", " ")
        out.append({"url": u, "titulo": re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", tit))).strip()[:160], "archivo": nombre})
    return {"fecha": hoy.isoformat(), "listas": out} if out else None


# ---------- 08-11-2026 · indicadores oficiales de los conflictos (mínimo 2 por conflicto, con fuente y fecha) ----------
def _unhcr(estado, iso3):
    # 08-11-2026: sin coa_all (que lista UN país de asilo por fila: salía «4.959 refugiados» de Ucrania). Sin él, ACNUR entrega el
    # total del país de origen por año; igual se suman las filas de cada año por si vinieran separadas.
    url = f"https://api.unhcr.org/population/v1/population/?limit=100&yearFrom=2022&yearTo={ahora().year}&coo={iso3}"
    if not robots_permite(url, estado):
        return []
    j = pedir(url, estado, f"unhcr_{iso3}", espera=(0, 20), limite=40) or {}
    num = lambda v: int(str(v).replace(",", "").strip()) if str(v or "").replace(",", "").strip().isdigit() else None   # noqa: E731
    por_ano = {}
    for it in (j.get("items") or []):
        if isinstance(it, dict) and str(it.get("year") or "").isdigit():
            acc = por_ano.setdefault(int(it["year"]), {"refugees": 0, "idps": 0})
            for k in acc:
                acc[k] += num(it.get(k)) or 0
    if not por_ano:
        return []
    y = max(por_ano)
    x = por_ano[y]
    fecha = f"{y}-12-31" if y < ahora().year else f"{y}-06-30"
    out = []
    if num(x.get("refugees")):
        out.append({"nombre": "Refugiados fuera del país (ACNUR)", "valor": num(x.get("refugees")), "unidad": "personas",
                    "fuente": "ACNUR (Agencia de la ONU para los Refugiados)", "url": "https://www.unhcr.org/refugee-statistics/", "fecha": fecha})
    if num(x.get("idps")):
        out.append({"nombre": "Desplazados internos (ACNUR)", "valor": num(x.get("idps")), "unidad": "personas",
                    "fuente": "ACNUR (Agencia de la ONU para los Refugiados)", "url": "https://www.unhcr.org/refugee-statistics/", "fecha": fecha})
    return out


def _fred_ultimo(estado, serie, nombre, unidad, url_pub):
    k = os.environ.get("FRED_API_KEY", "").strip()
    desde = (ahora().date() - dt.timedelta(days=120)).isoformat()
    if k:
        j = pedir(f"https://api.stlouisfed.org/fred/series/observations?series_id={serie}&api_key={quote(k)}&file_type=json"
                  f"&observation_start={desde}", estado, f"fred_{serie}", espera=(0, 20), limite=30) or {}
        obs = [o for o in (j.get("observations") or []) if re.match(r"^-?\d", str(o.get("value") or ""))]
    else:
        obs = []
    if not obs:
        return []
    o = obs[-1]
    return [{"nombre": nombre, "valor": round(float(o["value"]), 2), "unidad": unidad,
             "fuente": "FRED (Reserva Federal de St. Louis)", "url": url_pub, "fecha": str(o["date"])[:10]}]


def _gaza(estado):
    for v in ("v3", "v2"):
        url = f"https://data.techforpalestine.org/api/{v}/summary.json"
        if not robots_permite(url, estado):
            return []
        j = pedir(url, estado, f"gaza_{v}", espera=(0, 15), limite=30)
        g = (j or {}).get("gaza") if isinstance(j, dict) else None
        if isinstance(g, dict):
            f = str(g.get("last_update") or (j or {}).get("last_update") or "")[:10]
            out = []
            for k, nom in (("killed", "Muertos en Gaza (Ministerio de Salud de Gaza)"), ("injured", "Heridos en Gaza (Ministerio de Salud de Gaza)")):
                x = g.get(k)
                val = x.get("total") if isinstance(x, dict) else x
                if isinstance(val, (int, float)) and re.match(r"^\d{4}-\d{2}-\d{2}$", f):
                    out.append({"nombre": nom, "valor": int(val), "unidad": "personas", "fuente": "Ministerio de Salud de Gaza (compilado por Tech for Palestine)",
                                "url": "https://data.techforpalestine.org/docs/summary/", "fecha": f})
            if out:
                return out
    return []


def indicadores_conflictos(estado):
    """→ {clave de assets/conflictos-base.json: [indicadores]} con datos oficiales y su fecha. Lo que no responde, simplemente no está."""
    out = {"rusia-ucrania": _unhcr(estado, "UKR") + _fred_ultimo(estado, "PWHEAMTUSDM", "Precio mundial del trigo (efecto de la guerra)",
                                                                   "US$ por tonelada", "https://fred.stlouisfed.org/series/PWHEAMTUSDM"),
           "israel-gaza": _gaza(estado),
           "iran-regional": _fred_ultimo(estado, "DCOILBRENTEU", "Petróleo Brent (riesgo en Ormuz)", "US$ por barril",
                                         "https://fred.stlouisfed.org/series/DCOILBRENTEU"),
           "sudan": _unhcr(estado, "SUD")}   # 08-11-2026: ACNUR usa su propio código para Sudán (SUD, no SDN)
    out = {k: v for k, v in out.items() if v}
    estado["conflictos_indicadores"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": "ACNUR · FRED · Tech for Palestine",
                                        "n": sum(len(v) for v in out.values())}
    return out or None


# ---------- 08-11-2026 · autores desde la Cámara (opendata) cuando el Senado no responde ----------
CAMARA_PROYECTO = CAMARA + "/retornarProyectoLey?prmNumeroBoletin={b}"


def leer_proyecto_camara(txt):
    """XML de WSLegislativo.retornarProyectoLey → {titulo, iniciativa, autores} o None (formato tolerante)."""
    if not txt or "<" not in txt:
        return None
    tit = next((t for t in _xml_textos(txt, "Nombre") + _xml_textos(txt, "Titulo") if len(t) > 20), "")
    ini = next((t for t in _xml_textos(txt, "TipoIniciativa") + _xml_textos(txt, "Iniciativa") if t), "")
    bloque = re.search(r"<Autores\b[^>]*>(.*?)</Autores>", txt, re.S | re.I)
    aut = []
    if bloque:
        for b in re.findall(r"<(?:Autor|ParlamentarioAutor|Diputado|Senador|Parlamentario)\b[^>]*>(.*?)</(?:Autor|ParlamentarioAutor|Diputado|Senador|Parlamentario)>",
                            bloque.group(1), re.S | re.I):
            partes = [(_xml_textos(b, k) or [""])[0] for k in ("Nombre", "ApellidoPaterno", "ApellidoMaterno")]
            n = re.sub(r"\s+", " ", " ".join(p for p in partes if p)).strip()
            if n and n not in aut:
                aut.append(n)
    if not aut and re.search(r"mensaje", ini, re.I):
        aut = ["Mensaje presidencial"]
    if not (tit or aut):
        return None
    return {"titulo": re.sub(r"\s+", " ", tit)[:400], "iniciativa": ini, "autores": aut[:40]}


SENADO_TRAM = "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin={n}"


def _xml_textos(txt, etiqueta):
    return [html.unescape(re.sub(r"<[^>]+>", " ", m)).strip() for m in re.findall(rf"<{etiqueta}\b[^>]*>(.*?)</{etiqueta}>", txt or "", re.S | re.I)]


def leer_tramitacion(txt):
    """XML del servicio público del Senado (tramitacion.php?boletin=N) → {titulo, iniciativa, autores[]} o None.
    Vale para proyectos de ambas cámaras: el Senado publica la ficha de todo boletín."""
    if not txt or "<" not in txt:
        return None
    tit = next((t for t in _xml_textos(txt, "titulo") if t), "")
    ini = next((t for t in _xml_textos(txt, "iniciativa") if t), "")
    aut = [re.sub(r"\s+", " ", a) for a in _xml_textos(txt, "PARLAMENTARIO") if a.strip()]
    if not aut:
        aut = [re.sub(r"\s+", " ", a) for a in _xml_textos(txt, "autor") if a.strip() and len(a) < 120]
    if not aut and re.match(r"mensaje", ini, re.I):
        aut = ["Mensaje presidencial"]
    if not (tit or aut):
        return None
    out = {"titulo": re.sub(r"\s+", " ", tit)[:400], "iniciativa": ini, "autores": aut[:40]}
    # 14-11-2026 (Germán: cada votación debe explicar de qué trata el proyecto): etapa, estado y documento de origen
    for k, et in (("fecha_ingreso", "fecha_ingreso"), ("camara_origen", "camara_origen"), ("etapa", "etapa"), ("subetapa", "subetapa"),
                  ("estado", "estado"), ("ley", "leynro"), ("urgencia", "urgencia_actual"), ("url_mocion", "link_mensaje_mocion")):
        v = next((re.sub(r"\s+", " ", t).strip() for t in _xml_textos(txt, et) if t.strip()), "")
        if v:
            out[k] = v[:300]
    return out


# ---------- 13-11-2026 · votaciones de Sala del Senado (el servicio tramitacion.senado.cl no responde fuera de Chile) ----------
SENADO_API = "https://web-back.senado.cl/api"
SENADO_COPIA = "https://raw.githubusercontent.com/tres-ases/open-data-scraping/master/senado/data/normalized"


def _senado_resultado(tema, si, no):
    t = (tema or "").lower()
    if re.search(r"\baprobad|\bse aprob", t):
        return "Aprobado"
    if re.search(r"\brechazad|\bse rechaz", t):
        return "Rechazado"
    return "Aprobado" if si > no else "Rechazado" if no > si else ""


def senado_votaciones(estado, hoy, dias=62):
    """Votaciones de Sala del Senado de los últimos `dias`, con el voto de cada senador. Primero la API oficial del sitio nuevo
    del Senado (web-back.senado.cl); si no responde (suele rechazar a los servidores en la nube), la copia pública de esos mismos
    datos oficiales que mantiene el proyecto abierto tres-ases/open-data-scraping (se actualiza cada pocos días; se dice su fecha).
    → {"fuente", "url", "actualizado", "votaciones": [{id, fecha, descripcion, boletin, quorum, resultado, si, no, abst, nominal}]} o None."""
    desde = (hoy - dt.timedelta(days=dias)).isoformat()
    votos, nombres, fuente, url_f = None, {}, "", ""
    u = f"{SENADO_API}/votes?id_legislatura=507&limit=100&offset=0"
    if robots_permite(u, estado):
        j = pedir(u, estado, "senado_api_votos", espera=(0, 10), limite=40)
        L = ((j or {}).get("data") or {}).get("data") if isinstance(j, dict) else None
        if isinstance(L, list) and L:
            pj = pedir(f"{SENADO_API}/parliamentarians?id_legislatura=507&limit=1000", estado, "senado_api_senadores", espera=(0, 10), limite=40) or {}
            for x in ((pj.get("data") or {}).get("data") or []) if isinstance(pj, dict) else []:
                if isinstance(x, dict) and x.get("PARLID"):
                    nombres[x["PARLID"]] = " ".join(str(x.get(k) or "").strip() for k in ("NOMBRE", "APELLIDO_PATERNO", "APELLIDO_MATERNO")).strip()
            votos = [{"id": x.get("ID_VOTACION"), "fecha": str(x.get("FECHA_VOTACION") or "")[:10], "tema": x.get("TEMA"), "quorum": x.get("QUORUM"),
                      "boletin": x.get("BOLETIN"), **{k.lower(): [v.get("PARLID") for v in ((x.get("VOTACIONES") or {}).get(k) or []) if isinstance(v, dict)]
                                                    for k in ("SI", "NO", "ABSTENCION", "PAREO")}} for x in L if isinstance(x, dict)]
            fuente, url_f = "Senado de Chile (web-back.senado.cl, datos oficiales)", "https://www.senado.cl/actividad-legislativa/sala"
    if votos is None:
        uc = f"{SENADO_COPIA}/votaciones.json"
        if robots_permite(uc, estado):
            L = pedir(uc, estado, "senado_copia_votos", espera=(0, 10), limite=60)
            S = pedir(f"{SENADO_COPIA}/senadores.json", estado, "senado_copia_senadores", espera=(0, 10), limite=40) or []
            if isinstance(L, list):
                nombres = {x.get("id"): x.get("nombre") for x in S if isinstance(x, dict)} if isinstance(S, list) else {}
                votos = [{"id": x.get("id"), "fecha": str(x.get("fecha") or "")[:10], "tema": x.get("tema"), "quorum": x.get("quorum"),
                          "boletin": x.get("boletin"), "si": x.get("si") or [], "no": x.get("no") or [], "abstencion": x.get("abstencion") or [],
                          "pareo": x.get("pareo") or []} for x in L if isinstance(x, dict)]
                fuente = "Senado de Chile (datos oficiales; copia pública de tres-ases/open-data-scraping)"
                url_f = "https://github.com/tres-ases/open-data-scraping"
    if not votos:
        estado["senado_votos"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": u, "error": "ni la API del Senado ni la copia respondieron"}
        return None
    out = []
    for x in votos:
        if not x["fecha"] or x["fecha"] < desde:
            continue
        si, no, ab = len(x.get("si") or []), len(x.get("no") or []), len(x.get("abstencion") or [])
        nominal = [{"nombre": nombres.get(pid) or "", "voto": voto} for k, voto in (("si", "Sí"), ("no", "No"), ("abstencion", "Abstención"),
                                                                                    ("pareo", "Pareo")) for pid in (x.get(k) or [])]
        out.append({"id": f"S{x['id']}", "fecha": x["fecha"], "descripcion": re.sub(r"\s+", " ", str(x.get("tema") or "")).strip(" -")[:400],
                    "boletin": str(x.get("boletin") or ""), "quorum": str(x.get("quorum") or ""), "resultado": _senado_resultado(x.get("tema"), si, no),
                    "si": si, "no": no, "abst": ab, "nominal": [n for n in nominal if n["nombre"]]})
    out.sort(key=lambda v: v["fecha"], reverse=True)
    ult = max((v["fecha"] for v in votos if v.get("fecha")), default="")
    estado["senado_votos"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": url_f, "n": len(out), "ultima": ult, "fuente": fuente}
    return {"fuente": fuente, "url": url_f, "actualizado": ult, "votaciones": out}


MEMORIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memoria")   # copias diarias de la memoria del diario


def autores_boletines(estado, cam, previo, maximo=40):
    """Boletines votados este mes en la Cámara → autores y título oficiales (Senado, servicio público). Lo ya leído se conserva
    (no cambia); solo se piden los nuevos, de a uno con 2 s entre cada uno, máximo `maximo` por corrida."""
    out = {k: v for k, v in (previo or {}).items() if isinstance(v, dict) and (v.get("autores") or v.get("titulo"))}
    bols, completos = [], {}
    # 14-11-2026: también «boletines 18282-07 y 18590-07», minúsculas y los boletines que el diario ya guardó en su memoria (memoria/)
    textos = [str(v.get("descripcion") or "") + " " + str(v.get("materia") or "") for v in (cam or {}).get("camara_mes") or []]
    try:
        mems = sorted(glob.glob(os.path.join(MEMORIA_DIR, "cofrade-cache-*.json")))[-2:]
        textos += [open(f, encoding="utf-8").read() for f in mems]
    except Exception:   # noqa: BLE001
        pass
    for t in textos:
        for m in re.finditer(r"(?i)bolet[ií]n(?:es)?\b[^0-9]{0,12}((?:\d{3,6}-\d{1,2}(?:[\s,y]+)?)+)|\"boletin\"\s*:\s*\"(\d{3,6}-\d{1,2})\"", t):
            for n_, s_ in re.findall(r"(\d{3,6})-(\d{1,2})", m.group(1) or m.group(2) or ""):
                if n_ not in out and n_ not in bols:
                    bols.append(n_)
                    completos[n_] = f"{n_}-{s_}"
    hechos, fallas, seguidas, t0, muestras, senado_caido = 0, 0, 0, time.monotonic(), [], False
    for n in bols[:maximo]:
        if seguidas >= 3 or time.monotonic() - t0 > 300:   # el Senado no responde: no se gasta la corrida (tope de 5 min)
            break
        url = SENADO_TRAM.format(n=n)
        if not robots_permite(url, estado):
            estado["autores_boletines"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": "robots.txt no lo permite"}
            return out or None
        tmp = {}
        f, txt = None, ""
        bol_completo = completos.get(n, n)
        tc = ""
        if not senado_caido:   # 14-11-2026: el Senado trae la ficha completa (título, etapa, estado y moción); la sonda confirmó que responde
            txt = pedir(url, tmp, "x", como="text", espera=(0, 5), limite=30)
            f = leer_tramitacion(txt)
            if not txt and "imeout" in str((tmp.get("x") or {}).get("error")):
                senado_caido = True   # el Senado no responde: no se le insiste en esta corrida
        if not (f and f.get("titulo")):
            tc = pedir(CAMARA_PROYECTO.format(b=bol_completo), tmp, "c", como="text", espera=(0, 5), limite=30)
            fc = leer_proyecto_camara(tc)
            if fc:
                f, url = fc, CAMARA_PROYECTO.format(b=bol_completo)
        if not f and tc and len(muestras) < 2:
            muestras.append({"url": CAMARA_PROYECTO.format(b=bol_completo), "error": (tmp.get("c") or {}).get("error", ""),
                             "inicio": re.sub(r"\s+", " ", str(tc))[:300]})
        if not f and len(muestras) < 2:   # para diagnosticar un cambio de formato del servicio del Senado
            muestras.append({"url": url, "error": (tmp.get("x") or {}).get("error", ""), "inicio": re.sub(r"\s+", " ", str(txt or ""))[:300]})
        if f:
            out[n] = dict(f, fecha=ahora().date().isoformat(), url=url)
            hechos, seguidas = hechos + 1, 0
        else:
            fallas, seguidas = fallas + 1, seguidas + 1
        time.sleep(2)
    estado["autores_boletines"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": SENADO_TRAM.format(n="N"),
                                   "nuevos": hechos, "sin_ficha": fallas, "total": len(out), "pendientes": max(0, len(bols) - maximo),
                                   "muestras": muestras}
    return out or None


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
        agregador = "news.google.com" in url or "bing.com/news" in url or str(fuente).startswith(("Google News", "Bing"))
        if not agregador or re.match(r"(?i)https?://|www\.", medio) or re.search(r"[/?=]", medio):
            medio = ""   # 01-11-2026: Space.com y SpaceNews traen una imagen o un código en <source>: en un medio directo, el medio es el feed
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
    x = pedir(url, estado, clave, como="json" if tipo.split("|")[0] == "json" else "texto", espera=(0,), limite=20,
              cabeceras={"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json"})
    if x is None:
        return sec, {"fuente": fuente, "url": url, "ok": False, "n": 0, "error": estado[clave].get("error", "")}, []
    notas = leer_espn(x, fuente) if tipo.split("|")[0] == "json" else leer_feed(x, fuente)
    if notas is not None and "|" in tipo:   # 13-11-2026: feed general de un medio grande, filtrado por palabras de la sección
        claves = [k for k in tipo.split("|")[1:] if k]
        notas = [n for n in notas if any(k in (str(n.get("titulo") or "") + " " + str(n.get("resumen") or n.get("texto") or "")).lower()
                                         for k in claves)]
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
        h0 = VENTANA_H.get(sec, 72)
        filtro = FILTRO.get(sec)
        for n in notas:
            if filtro and not filtro.search(n["titulo"] + " " + n["resumen"]):
                continue
            h = max([h0] + [hr for rx, _, hr in RESERVA.get(sec, []) if rx.search(n["titulo"] + " " + n["resumen"] + " " + n["fuente"])])
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
        elegidas = []
        for rx, cupo, _ in RESERVA.get(sec, []):
            elegidas += [n for n in unicas if n not in elegidas and rx.search(n["titulo"] + " " + n["resumen"] + " " + n["fuente"])][:cupo]
        elegidas += [n for n in unicas if n not in elegidas][:max(0, TOPE_SECCION - len(elegidas))]
        v["notas"] = sorted(elegidas, key=lambda n: n["fecha"], reverse=True)
    ok = sum(1 for _, c, _ in leidas if c["ok"])
    estado["titulares"] = {"ok": ok > 0, "hora": ahora().isoformat(timespec="seconds"), "url": "RSS públicos de los medios",
                           "error": "" if ok else "ningún RSS respondió", "intentos": 1, "feeds_ok": ok, "feeds": len(leidas)}
    return {"generado": ahora().isoformat(timespec="seconds"), "secciones": secs}


# ---------- vuelos de HOY con AeroDataBox (01-11-2026; cuenta gratuita de RapidAPI, secreto AERODATABOX_KEY) ----------
# Flightradar24 rechaza la lectura automática; AeroDataBox es un servicio hecho para programas. Plan gratuito: cupo mensual
# limitado → una sola lectura al día (la primera corrida), con tope mensual que se cuida solo (datos/aerodatabox-uso.json).
ADB_HOST = "aerodatabox.p.rapidapi.com"
# 01-11-2026: plan Basic gratuito = 400 unidades al mes y la consulta FIDS cuesta 2 → 6 consultas al día (12 unidades; 372 en un mes
# de 31 días). Santiago el día completo (2 ventanas de 12 h, el máximo por consulta); los 4 regionales, de 06:00 a 17:59 (el resto del día
# lo completan las demás fuentes y el itinerario habitual).
ADB_PLAN = [("SCL", "00:00", "11:59"), ("SCL", "12:00", "23:59"), ("PMC", "06:00", "17:59"), ("CCP", "06:00", "17:59"),
            ("ANF", "06:00", "17:59"), ("PUQ", "06:00", "17:59")]


def _adb_hora(t):
    m = re.search(r"(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})", str(t or ""))
    return (m.group(1), m.group(2)) if m else ("", "")


ADB_LUGAR = {"MHC": "Mocopulli (Dalcahue, Chiloé)"}   # 03-11-2026 (Germán): AeroDataBox la rotula «Makmakhon-Kemp»


def _adb_tramos(x, sentido):
    """→ (aquí, allá): el movimiento en el aeropuerto consultado (su hora) y el del otro extremo (su aeropuerto).
    Sin tramo (withLeg=false) AeroDataBox entrega «movement»: el aeropuerto del otro extremo con la hora de aquí.
    Con tramo (withLeg=true) entrega «departure» y «arrival» completos (03-11-2026)."""
    if isinstance(x.get("movement"), dict):
        return x["movement"], x["movement"]
    dep, arr = x.get("departure") or {}, x.get("arrival") or {}
    return (dep, arr) if sentido == "departures" else (arr, dep)


def adb_filas(j, sentido):
    """Respuesta de AeroDataBox (departures / arrivals) → filas {vuelo, aerolinea, iata, lugar, fecha, hora_programada,
    hora_estimada, estado} en hora local, sin vuelos de carga."""
    out = []
    for x in (j or {}).get(sentido) or []:
        if not isinstance(x, dict) or x.get("isCargo"):
            continue
        mv, otro = _adb_tramos(x, sentido)
        ap = otro.get("airport") or {}
        fe, hp = _adb_hora((mv.get("scheduledTime") or {}).get("local"))
        _, he = _adb_hora((mv.get("revisedTime") or mv.get("runwayTime") or {}).get("local"))
        num = re.sub(r"\s+", "", str(x.get("number") or ""))
        if not (num and fe and hp):
            continue
        out.append({"vuelo": num, "aerolinea": str((x.get("airline") or {}).get("name") or ""),
                    "iata": str(ap.get("iata") or "")[:3], "lugar": ADB_LUGAR.get(str(ap.get("iata") or "")[:3], str(ap.get("municipalityName") or ap.get("name") or "")),
                    "fecha": fe, "hora_programada": hp, "hora_estimada": he if he != hp else "", "estado": str(x.get("status") or "")})
    return out


ADB_NOMBRE = {"SCL": "Santiago"}


def adb_desde_santiago(j, regional, hoy, desde="06:00", hasta="17:59"):
    """03-11-2026 (Germán: mejorar los vuelos). El cupo gratuito alcanza para leer los aeropuertos regionales de 06:00 a 17:59; los
    vuelos de la tarde y la noche quedaban fuera. Casi todos van o vienen de Santiago, y Santiago se lee el día completo con su tramo
    (withLeg=true): una salida de Santiago a Puerto Montt ES una llegada a Puerto Montt, con su hora allá. Sin costo extra de cupo.
    → {"salidas": [...], "llegadas": [...]} del aeropuerto `regional`, solo de hoy y fuera de la ventana ya leída."""
    out = {"salidas": [], "llegadas": []}
    for sentido, destino in (("departures", "llegadas"), ("arrivals", "salidas")):
        for x in (j or {}).get(sentido) or []:
            if not isinstance(x, dict) or x.get("isCargo") or isinstance(x.get("movement"), dict):
                continue
            aqui, alla = _adb_tramos(x, sentido)
            if str((alla.get("airport") or {}).get("iata") or "")[:3] != regional:
                continue
            fe, hp = _adb_hora((alla.get("scheduledTime") or {}).get("local"))
            _, he = _adb_hora((alla.get("revisedTime") or alla.get("runwayTime") or {}).get("local"))
            num = re.sub(r"\s+", "", str(x.get("number") or ""))
            if not (num and fe == hoy.isoformat() and hp) or desde <= hp <= hasta:
                continue
            out[destino].append({"vuelo": num, "aerolinea": str((x.get("airline") or {}).get("name") or ""), "iata": "SCL", "lugar": "Santiago",
                                 "fecha": fe, "hora_programada": hp, "hora_estimada": he if he != hp else "", "estado": str(x.get("status") or ""),
                                 "via": "tablero de Santiago"})
    return out


def vuelos_hoy(estado, hoy, previo=None, uso=None):
    """→ ({fecha, fuente, aeropuertos: {IATA: {salidas, llegadas}}} o None, uso del mes actualizado)."""
    k = os.environ.get("AERODATABOX_KEY", "").strip()
    mes = hoy.strftime("%Y-%m")
    uso = uso if isinstance(uso, dict) and uso.get("mes") == mes else {"mes": mes, "unidades": 0, "llamadas": 0}
    if not k:
        estado["vuelos_hoy"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "AeroDataBox",
                                "error": "sin secreto AERODATABOX_KEY (cuenta gratuita de RapidAPI)"}
        return None, uso
    if isinstance(previo, dict) and previo.get("fecha") == hoy.isoformat() and previo.get("aeropuertos"):
        estado["vuelos_hoy"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": "AeroDataBox",
                                "nota": "ya leído hoy (una lectura al día para cuidar el cupo gratuito)"}
        return previo, uso
    unidades = int(os.environ.get("AERODATABOX_UNIDADES", "2") or 2)   # costo de cada consulta en el plan
    tope = int(os.environ.get("AERODATABOX_TOPE_MES", "390") or 390)   # plan Basic: 400 (tope duro), con margen
    aer, faltan, scl = {}, [], []
    cab = {"X-RapidAPI-Key": k, "X-RapidAPI-Host": ADB_HOST}
    for c, d, h in ADB_PLAN:
        if uso["unidades"] + unidades > tope:
            faltan.append(f"{c} {d}-{h} (cupo del mes)")
            continue
        url = (f"https://{ADB_HOST}/flights/airports/iata/{c}/{hoy.isoformat()}T{d}/{hoy.isoformat()}T{h}"
               f"?withLeg={'true' if c == 'SCL' else 'false'}&direction=Both&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false")
        # 01-11-2026: aquí NO se consulta el robots.txt. Ese archivo es para los robots que recorren páginas públicas; esta es una
        # API con contrato: Germán se suscribió al plan gratuito y cada consulta va con su clave personal (RapidAPI pone
        # «Disallow: /» a todos sus servidores de API, lo que dejaría la API pagada o gratuita inservible).
        j = pedir(url, estado, f"adb_{c}_{d[:2]}", espera=(0,), cabeceras=cab, limite=40)   # un solo intento: cada intento gasta cupo
        uso["unidades"] += unidades
        uso["llamadas"] += 1
        if j is None:
            faltan.append(f"{c} {d}-{h}: {estado.get(f'adb_{c}_{d[:2]}', {}).get('error', '')}")
            continue
        a = aer.setdefault(c, {"salidas": [], "llegadas": []})
        a["salidas"] += adb_filas(j, "departures")
        a["llegadas"] += adb_filas(j, "arrivals")
        if c == "SCL":
            scl.append(j)
    # la tarde y la noche de los regionales, desde el tablero de Santiago (sin gastar cupo)
    for c, d, h in ADB_PLAN:
        if c == "SCL" or c not in aer:
            continue
        for j in scl:
            extra = adb_desde_santiago(j, c, hoy, d, h)
            for k in ("salidas", "llegadas"):
                ya = {(f["vuelo"], f["hora_programada"]) for f in aer[c][k]}
                aer[c][k] += [f for f in extra[k] if (f["vuelo"], f["hora_programada"]) not in ya]
                aer[c][k].sort(key=lambda f: f["hora_programada"])
        aer[c]["ventana"] = f"{d} a {h} (tablero propio) y el resto del día con los vuelos desde y hacia Santiago"
    n = sum(len(v) for a in aer.values() for v in a.values() if isinstance(v, list))
    estado["vuelos_hoy"] = {"ok": n > 0, "hora": ahora().isoformat(timespec="seconds"), "url": "AeroDataBox", "n": n,
                            "error": "; ".join(faltan[:6]), "cupo_mes": f"{uso['unidades']} de {tope}"}
    return ({"fecha": hoy.isoformat(), "fuente": "AeroDataBox", "aeropuertos": aer} if n else None), uso


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
BCCH_BUSCAR = {"^IPSA": r"\bIPSA\b|selectivo de acciones", "^GSPC": r"S\s*&\s*P\s*500|Standard\s*(&|and|y)\s*Poor", "^IXIC": r"nasdaq",
               "^DJI": r"dow\s*jones", "BZ=F": r"brent",
               "HG=F": r"precio.{0,40}cobre|cobre.{0,40}(BML|Londres|LME|refinado|US\$|d[oó]lar|libra)"}
BCCH_FUERA = re.compile(r"variaci|var\.|%|promedio|mensual|trimestral|anual|tasa|futuro|exporta|import|volumen|monto|"
                        r"encuesta|expectativ|factor|incidencia|operadores|proyecci", re.I)   # 01-11: «encuesta… factores: cobre» no es un precio
BCCH_DIAG = re.compile(r"ipsa|acciones|burs[aá]til|bolsa|dow|nasdaq|s\s*&\s*p|standard|brent|petr[oó]leo|wti|cobre", re.I)
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


def _bcch_auth():
    """El servicio REST del Banco Central pide el «API Key Token» de «Mi Cuenta» (vale un año); usuario y clave quedan como
    respaldo para cuentas antiguas. → texto para la dirección, o "" si no hay cuenta."""
    t = os.environ.get("BCCH_TOKEN", "").strip()
    if t:
        return "token=" + quote(t)
    u, pw = os.environ.get("BCCH_USER", "").strip(), os.environ.get("BCCH_PASS", "").strip()
    return f"user={quote(u)}&pass={quote(pw)}" if (u and pw) else ""


def bcch_series(estado):
    if "mapa" in _BCCH:
        return _BCCH["mapa"]
    auth = _bcch_auth()
    mapa = {}
    if auth:
        url = f"{BCCH_URL}?{auth}&function=SearchSeries&frequency=DAILY"
        if robots_permite(url, estado):
            infos = (pedir(url, estado, "bcch_catalogo", espera=(0, 30), limite=60) or {}).get("SeriesInfos") or []
            mapa = bcch_elegir(infos)
            _BCCH["infos"] = infos
            _BCCH["catalogo"] = [{"id": x.get("seriesId"), "titulo": x.get("spanishTitle"), "ultima": x.get("lastObservation")}
                                 for x in infos if isinstance(x, dict) and BCCH_DIAG.search(f"{x.get('spanishTitle')} {x.get('englishTitle')}")][:400]
        estado["bcch_series"] = {"ok": bool(mapa), "hora": ahora().isoformat(timespec="seconds"), "url": "Banco Central (catálogo)",
                                 "error": "" if mapa else "sin series que calcen", "elegidas": {k: list(v) for k, v in mapa.items()}}
    _BCCH["mapa"] = mapa
    return mapa


# ---------- historia diaria del Banco Central para los gráficos de www.cofrad.es (13-11-2026) ----------
# Germán: «agrega gráficos a la portada» y Dashboard Financiero de socios. Fuente: Base de Datos Estadísticos del Banco Central
# (sus términos permiten «consultar, reproducir, difundir, publicar o adaptar» la BDE citando la fuente). Cada serie trae su id
# conocido y, si ese id no responde, se busca en el catálogo diario por su título.
HISTORIA_BCCH = [
    ("dolar", "Dólar observado", "$", 2, "F073.TCO.PRE.Z.D", r"d[oó]lar observado"),
    ("uf", "Unidad de Fomento", "$", 2, "F073.UFF.PRE.Z.D", r"unidad de fomento"),
    ("euro", "Euro", "$", 2, "F072.CLP.EUR.N.O.D", r"\beuro\b"),
    ("cobre", "Cobre (US$/libra)", "US$", 2, "F019.PPB.PRE.100.D", r"precio del cobre refinado"),
    ("tpm", "Tasa de Política Monetaria", "", 2, "F022.TPM.TIN.D001.NO.Z.D", r"tasa de pol[ií]tica monetaria"),
]


def historia_bcch(estado, hoy, dias=400):
    """→ {"fecha", "fuente", "series": {clave: {"nombre", "prefijo", "decimales", "id", "datos": [[fecha, valor], ...]}}}"""
    auth = _bcch_auth()
    if not auth:
        estado["historia_bcch"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "Banco Central", "error": "sin BCCH_TOKEN"}
        return None
    desde = (hoy - dt.timedelta(days=dias)).isoformat()
    infos = None
    out = {}
    for clave, nombre, pre, dec, sid, patron in HISTORIA_BCCH:
        datos = []
        for intento in (sid, None):
            if intento is None:
                if infos is None:
                    bcch_series(estado)
                    infos = _BCCH.get("infos") or []
                cand = [x for x in infos if re.search(patron, f"{x.get('spanishTitle') or ''}", re.I) and not BCCH_FUERA.search(x.get("spanishTitle") or "")
                        and x.get("seriesId") and x.get("seriesId") != sid]
                if not cand:
                    break
                intento = cand[0]["seriesId"]
            url = f"{BCCH_URL}?{auth}&function=GetSeries&timeseries={quote(intento)}&firstdate={desde}&lastdate={hoy.isoformat()}"
            datos = cierres_bcch(pedir(url, estado, f"historia_{clave}", espera=(0, 30), limite=45), hoy + dt.timedelta(days=1))
            if datos:
                sid = intento
                break
        if datos:
            out[clave] = {"nombre": nombre, "prefijo": pre, "decimales": dec, "id": sid, "datos": [[f, round(v, 4)] for f, v in datos]}
    estado["historia_bcch"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": "Banco Central (historia diaria)",
                               "error": "" if out else "ninguna serie respondió", "series": {k: len(v["datos"]) for k, v in out.items()}}
    return {"fecha": hoy.isoformat(), "fuente": "Banco Central de Chile (Base de Datos Estadísticos)", "series": out} if out else None


# ---------- tasas mensuales del Banco Central (03-11-2026; Germán: «Créditos hipotecarios: septiembre 2026 · ¿noviembre?») ----------
# La hipotecaria, el consumo, el BCU-10 y la TPM son promedios MENSUALES que el Banco Central publica ~6 semanas después. Con la
# cuenta gratuita (BCCH_TOKEN) se leen solas cada día: el mes nuevo aparece el mismo día que se publica, sin depender de la tarea.
TASAS_BUSCAR = {
    "hipotecaria": re.compile(r"vivienda.*(UF|reajustable)|(UF|reajustable).*vivienda|hipotecari", re.I),
    "consumo": re.compile(r"consumo", re.I),
    "bcu10": re.compile(r"(BCU|BTU).{0,40}10|10.{0,10}a[nñ]os.*(UF|BCU|BTU)", re.I),
    "tpm": re.compile(r"pol[ií]tica monetaria|\bTPM\b", re.I),
}
TASAS_DIAG = re.compile(r"vivienda|hipotec|consumo|pol[ií]tica monetaria|\bTPM\b|BCU|BTU|tasa", re.I)


TASAS_SERIES = {   # elegidas del catálogo oficial el 03-11-2026 (datos/tasas-bcch-catalogo.json)
    "hipotecaria": ("F022.VIV.TIP.MA03.UF.Z.M", "Tasa de interés promedio créditos de vivienda, más de 3 años (UF)"),
    "consumo": ("F022.CON.TIP.Z.NO.Z.M", "Tasa de interés promedio créditos de consumo, total (en pesos)"),
}
EEE_TPM = {0: "F089.TPM.TAS.11.M", 5: "F089.TPM.TAS.26.M", 11: "F089.TPM.TAS.14.M", 23: "F089.TPM.TAS.15.M"}   # Encuesta de Expectativas


def _mas_meses(ym, n):
    y, m = int(ym[:4]), int(ym[5:7]) + n
    y, m = y + (m - 1) // 12, (m - 1) % 12 + 1
    return f"{y:04d}-{m:02d}"


def tasas_bcch(estado, hoy):
    """Promedios MENSUALES oficiales (hipotecaria UF y consumo, últimos 24 meses) y la TPM esperada de la Encuesta de Expectativas
    Económicas (en el mes y a 5, 11 y 23 meses), con la cuenta gratuita del Banco Central. → dict o None."""
    auth = _bcch_auth()
    if not auth:
        return None
    desde = f"{hoy.year - 2}-01-01"
    out = {"fecha": hoy.isoformat(), "fuente": "Banco Central de Chile (Base de Datos Estadísticos)", "series": {}}
    for k, (sid, nombre) in TASAS_SERIES.items():
        url = f"{BCCH_URL}?{auth}&function=GetSeries&timeseries={sid}&firstdate={desde}&lastdate={hoy.isoformat()}"
        obs = cierres_bcch(pedir(url, estado, f"tasas_{k}", espera=(0, 30), limite=60), hoy + dt.timedelta(days=1))
        if obs:
            out["series"][k] = {"id": sid, "nombre": nombre, "datos": [[f[:7], round(v, 2)] for f, v in obs]}
    eee = {}
    for h, sid in EEE_TPM.items():
        url = f"{BCCH_URL}?{auth}&function=GetSeries&timeseries={sid}&firstdate={hoy.year - 1}-01-01&lastdate={hoy.isoformat()}"
        obs = cierres_bcch(pedir(url, estado, f"tasas_eee_{h}", espera=(0, 30), limite=60), hoy + dt.timedelta(days=1))
        if obs:
            eee[h] = obs[-1]
    if eee:
        mes = max(f for f, _ in eee.values())[:7]
        out["tpm_esperada"] = {"encuesta": mes, "trayectoria": [[_mas_meses(mes, h), round(v, 2)] for h, (f, v) in sorted(eee.items()) if f[:7] == mes],
                               "fuente": "Encuesta de Expectativas Económicas (Banco Central de Chile)",
                               "url": "https://www.bcentral.cl/web/banco-central/areas/encuestas-economicas/encuesta-expectativas-economicas"}
    return out if (out["series"] or eee) else None


def tasas_catalogo(estado):
    """Catálogo MENSUAL del Banco Central → las series candidatas de cada tasa (diagnóstico en datos/tasas-bcch-catalogo.json)."""
    auth = _bcch_auth()
    if not auth:
        return []
    url = f"{BCCH_URL}?{auth}&function=SearchSeries&frequency=MONTHLY"
    if not robots_permite(url, estado):
        return []
    infos = (pedir(url, estado, "bcch_catalogo_mensual", espera=(0, 30), limite=90) or {}).get("SeriesInfos") or []
    return [{"id": x.get("seriesId"), "titulo": x.get("spanishTitle"), "ultima": x.get("lastObservation")}
            for x in infos if isinstance(x, dict) and TASAS_DIAG.search(f"{x.get('spanishTitle')}")]


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
    auth = _bcch_auth()
    if sym in BCCH_BUSCAR and auth:
        def _bc(u=None):
            sid = (bcch_series(estado).get(sym) or ("", ""))[0]
            if not sid:
                return []
            return cierres_bcch(pedir(f"{BCCH_URL}?{auth}&function=GetSeries&timeseries={quote(sid)}"
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
            # 01-11-2026: el cobre del Banco Central (directo o vía mindicador) es el de Londres, no el de Comex
            nombre = "Cobre (Bolsa de Metales de Londres)" if (sym == "HG=F" and "Banco Central" in fuente) else nom
            out.append({"nombre": nombre, "valor": round(v1, 2), "variacion_pct": round((v1 / v0 - 1) * 100, 2), "fecha": f1, "fuente": fuente})
            usadas.add(fuente)
    estado["mercados"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": " / ".join(dict.fromkeys(intentadas)) or "mercados",
                          "error": "" if out else "sin cierres", "intentos": 1, "n": len(out), "fuentes_usadas": sorted(usadas)}
    return out


def con_anteriores(nuevos, previo, hoy, dias=6):
    """01-11-2026: si una fuente se cae en esta corrida (FRED respondió HTTP 500 de madrugada), no se pierde el cierre que trajo una
    corrida anterior: se conserva con SU fecha (el diario muestra la fecha de cada cierre), si no tiene más de «dias» días."""
    nuevos = list(nuevos or [])
    tengo = {x.get("nombre") for x in nuevos}
    for x in ((previo or {}).get("mercados") or []):
        if isinstance(x, dict) and x.get("nombre") not in tengo and str(x.get("fecha") or "") >= (hoy - dt.timedelta(days=dias)).isoformat():
            nuevos.append(dict(x, conservado=True))
    return nuevos


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




# ---------- 02-11-2026: sismos, calidad del aire y Fórmula 1 ----------
# Ese día la tarea programada no pudo leer NINGUNA página (web_fetch pedía un permiso que nadie aprueba de madrugada): estas
# tres quedaron sin dato. GitHub las lee de APIs abiertas y gratuitas, respetando el robots.txt de cada sitio.
AIRE_CIUDADES = (("santiago", "Santiago"), ("concepcion", "Concepción"), ("temuco", "Temuco"), ("puerto-montt", "Puerto Montt"),
                 # 03-11-2026 (Germán marcó «Aire: sin medición publicada» en Arica, Antofagasta y La Serena): las 9 ciudades del pronóstico
                 ("arica", "Arica"), ("antofagasta", "Antofagasta"), ("la-serena", "La Serena"), ("valparaiso-y-vina-del-mar", "Valparaíso"),
                 ("punta-arenas", "Punta Arenas"))


def _km(a, b, c, d):
    import math
    r = math.radians
    x = math.sin(r(c - a) / 2) ** 2 + math.cos(r(a)) * math.cos(r(c)) * math.sin(r(d - b) / 2) ** 2
    return 12742 * math.asin(min(1.0, math.sqrt(x)))


def aire_waqi(estado, token=None):
    """03-11-2026: calidad del aire MEDIDA (estaciones del SINCA del Ministerio del Medio Ambiente, publicadas por el Índice Mundial
    de Calidad del Aire, aqicn.org) con la clave gratuita de Germán (secreto WAQI_TOKEN). Sin clave, nada. Solo una estación a
    menos de 25 km de la ciudad. Es una API con contrato y clave personal (como AeroDataBox): su robots.txt no aplica."""
    token = (token if token is not None else os.environ.get("WAQI_TOKEN", "")).strip()
    if "token=" in token:   # 03-11-2026: si se pegó la dirección completa, se usa solo lo que va después de «token=»
        token = token.split("token=", 1)[1]
    token = re.split(r"[&\s/]", token)[0]
    if not token:
        estado["aire_waqi"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "api.waqi.info",
                               "error": "sin secreto WAQI_TOKEN (clave gratuita de aqicn.org)"}
        return None
    out, malas = [], []
    for slug, la, lo in [c for c in CIUDADES if c[0] in dict(AIRE_CIUDADES)]:
        j = pedir(f"https://api.waqi.info/feed/geo:{la};{lo}/?token={token}", estado, f"aire_waqi_{slug}", espera=(0, 5))
        estado.get(f"aire_waqi_{slug}", {}).pop("url", None)   # la dirección lleva la clave: no se guarda
        x = waqi_ciudad(j, slug, la, lo)
        if not x:   # 03-11-2026: la búsqueda «más cercana» devolvió Lima para Santiago; se busca por nombre y se exige < 25 km
            nom = dict(AIRE_CIUDADES)[slug]
            js = pedir(f"https://api.waqi.info/search/?keyword={quote(nom.split(' ')[0] if slug != 'punta-arenas' else nom)}&token={token}",
                       estado, f"aire_waqi_busca_{slug}", espera=(0, 5))
            estado.get(f"aire_waqi_busca_{slug}", {}).pop("url", None)
            cand = []
            for r in ((js or {}).get("data") or []) if isinstance(js, dict) and js.get("status") == "ok" else []:
                uid = r.get("uid") if isinstance(r, dict) else None
                st = (r.get("station") or {}) if isinstance(r, dict) else {}
                try:
                    km = _km(la, lo, float(st["geo"][0]), float(st["geo"][1]))
                except (KeyError, TypeError, ValueError, IndexError):
                    continue
                if uid and km <= 25:
                    cand.append((km, uid))
            estado.setdefault(f"aire_waqi_busca_{slug}", {})["cerca"] = len(cand)
            for _, uid in sorted(cand)[:3]:
                ju = pedir(f"https://api.waqi.info/feed/@{uid}/?token={token}", estado, f"aire_waqi_uid_{slug}", espera=(0,))
                x = waqi_ciudad(ju, slug, la, lo)
                estado.get(f"aire_waqi_uid_{slug}", {}).pop("url", None)
                if not x:
                    estado.setdefault(f"aire_waqi_uid_{slug}", {}).setdefault("motivos", []).append(waqi_motivo(ju, la, lo))
                if x:
                    break
        (out.append(x) if x else malas.append(dict(AIRE_CIUDADES)[slug]))
        if not x and f"aire_waqi_{slug}" in estado:   # 03-11-2026: por qué no sirvió (sin la clave), para revisarlo en estado.json
            estado[f"aire_waqi_{slug}"]["motivo"] = waqi_motivo(j, la, lo)
    estado["aire_waqi"] = {"ok": bool(out), "hora": ahora().isoformat(timespec="seconds"), "url": "api.waqi.info",
                           "n": len(out), "error": ("sin estación cercana o sin dato: " + ", ".join(malas)) if malas else ""}
    if not out:
        return None
    return {"fecha": ahora().date().isoformat(), "fuente": "SINCA (Ministerio del Medio Ambiente) vía Índice Mundial de Calidad del Aire (aqicn.org)",
            "ciudades": out}


def waqi_motivo(j, la, lo):
    """Explicación corta de por qué una respuesta de aqicn.org no se usó (la clave nunca aparece)."""
    if not isinstance(j, dict):
        return "sin respuesta"
    if j.get("status") != "ok":
        return ocultar(f"estado {j.get('status')}: {str(j.get('data') or j.get('message') or '')[:80]}")
    d = j.get("data") if isinstance(j.get("data"), dict) else {}
    geo = (d.get("city") or {}).get("geo")
    try:
        km = round(_km(la, lo, float(geo[0]), float(geo[1])))
    except (TypeError, ValueError, IndexError):
        km = None
    return f"aqi={d.get('aqi')!r} · estación «{(d.get('city') or {}).get('name')}» a {km} km · medición {(d.get('time') or {}).get('s')}"


def waqi_ciudad(j, slug, la, lo):
    d = (j or {}).get("data") if isinstance(j, dict) and j.get("status") == "ok" else None
    if not isinstance(d, dict) or not isinstance(d.get("aqi"), (int, float)):
        return None
    geo = ((d.get("city") or {}).get("geo") or [None, None])
    try:
        if _km(la, lo, float(geo[0]), float(geo[1])) > 25:
            return None
    except (TypeError, ValueError, IndexError):
        return None
    hora = str((d.get("time") or {}).get("s") or "")
    if hora[:10] and hora[:10] < (ahora().date() - dt.timedelta(days=1)).isoformat():   # medición vieja: no sirve como «hoy»
        return None
    aqi = int(round(d["aqi"]))
    return {"nombre": dict(AIRE_CIUDADES)[slug], "aqi_us": aqi, "categoria": _categoria_aqi(aqi), "pm25": None,
            "hora": hora[11:16], "medido": hora[:16], "estacion": str((d.get("city") or {}).get("name") or ""),
            "url": str((d.get("city") or {}).get("url") or "https://aqicn.org/")}


def _no_permitido(url, estado, clave):
    if robots_permite(url, estado):
        return False
    estado[clave] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": url, "error": "robots.txt no lo permite"}
    return True


def sismos(estado, momento=None):
    """Catálogo del USGS (red mundial; incluye lo que informa la red chilena) de las últimas 30 horas en Chile y su mar,
    magnitud 2,5 o más. → CSV con las columnas del catálogo del CSN (la referencia la calcula el generador)."""
    momento = momento or ahora()
    desde = (momento.astimezone(dt.timezone.utc) - dt.timedelta(hours=30)).strftime("%Y-%m-%dT%H:%M:%S")
    url = ("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&minmagnitude=2.5"
           f"&minlatitude=-57&maxlatitude=-17&minlongitude=-80&maxlongitude=-65&starttime={desde}")
    if _no_permitido(url, estado, "sismos"):
        return None
    j = pedir(url, estado, "sismos")
    return sismos_csv(j) if j is not None else None


def sismos_csv(j):
    filas = ["fecha_local,lat,lon,profundidad_km,magnitud,referencia"]
    for f in (j or {}).get("features") or []:
        p, c = f.get("properties") or {}, (f.get("geometry") or {}).get("coordinates") or []
        if len(c) < 3 or not isinstance(p.get("time"), (int, float)) or not isinstance(p.get("mag"), (int, float)):
            continue
        t = dt.datetime.fromtimestamp(p["time"] / 1000, dt.timezone.utc).astimezone(TZ)
        filas.append(f"{t:%Y-%m-%d %H:%M:%S},{c[1]:.3f},{c[0]:.3f},{float(c[2] or 0):.1f},{p['mag']:.1f},")
    return "\n".join(filas) + "\n"


def _categoria_aqi(v):
    for tope, nombre in ((50, "Buena"), (100, "Moderada"), (150, "Dañina para grupos sensibles"), (200, "Dañina"), (300, "Muy dañina")):
        if v <= tope:
            return nombre
    return "Peligrosa"


def aire(estado):
    """Índice de calidad del aire (escala US) y PM2,5 de ahora, del modelo europeo CAMS vía Open-Meteo (gratis, sin clave)."""
    sel = [c for c in CIUDADES if c[0] in dict(AIRE_CIUDADES)]
    url = ("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + ",".join(str(c[1]) for c in sel)
           + "&longitude=" + ",".join(str(c[2]) for c in sel) + "&current=us_aqi,pm2_5&timezone=America%2FSantiago")
    if _no_permitido(url, estado, "aire"):
        return None
    j = pedir(url, estado, "aire")
    return aire_json(j, sel) if j is not None else None


def aire_json(j, sel):
    lista = j if isinstance(j, list) else [j]
    out = []
    for (slug, _, _), x in zip(sel, lista):
        cur = (x or {}).get("current") or {}
        aqi, pm = cur.get("us_aqi"), cur.get("pm2_5")
        if not isinstance(aqi, (int, float)):
            continue
        out.append({"nombre": dict(AIRE_CIUDADES)[slug], "aqi_us": int(round(aqi)), "categoria": _categoria_aqi(aqi),
                    "pm25": round(pm, 1) if isinstance(pm, (int, float)) else None, "hora": str(cur.get("time") or "")[11:16],
                    "url": "https://open-meteo.com/en/docs/air-quality-api"})
    if not out:
        return None
    return {"fecha": ahora().date().isoformat(), "fuente": "Open-Meteo (modelo CAMS de Copernicus, estimación)", "ciudades": out}


def f1(estado, hoy):
    """Campeonato de pilotos (top 10) con la fecha de la última carrera, de Jolpica (continuación abierta de la base Ergast)."""
    base = f"https://api.jolpi.ca/ergast/f1/{hoy.year}"
    if _no_permitido(base + "/driverstandings.json", estado, "f1"):
        return None
    j = pedir(base + "/driverstandings.json", estado, "f1")
    try:
        L = j["MRData"]["StandingsTable"]["StandingsLists"][0]
        ronda, ds = L["round"], L["DriverStandings"]
    except (TypeError, KeyError, IndexError):
        if j is not None:
            estado["f1"].update(ok=False, error="sin tabla en la respuesta")
        return None
    fecha = ""
    r = pedir(f"{base}/{ronda}/races.json", estado, "f1_carrera")
    try:
        carrera = r["MRData"]["RaceTable"]["Races"][0]
        fecha, gp = carrera["date"], carrera.get("raceName", "")
    except (TypeError, KeyError, IndexError):
        gp = ""
    filas = []
    for x in ds[:10]:
        d = x.get("Driver") or {}
        eq = ((x.get("Constructors") or [{}])[0] or {}).get("name", "")
        filas.append([str(x.get("position", "")), f"{d.get('givenName', '')} {d.get('familyName', '')}".strip(), eq, str(x.get("points", ""))])
    if len(filas) < 3 or not fecha:
        return None
    return {"nombre": "Fórmula 1", "tablas": [{"nombre": f"Campeonato de pilotos · top 10 (tras la ronda {ronda})", "columnas": ["Pos", "Piloto", "Equipo", "Puntos"],
            "valor_col": 3, "fuente": "Jolpica F1 (base de datos abierta Ergast)", "url": base + "/driverstandings/", "fecha": fecha,
            "gp": gp, "filas": filas}]}

# ---------- 14-11-2026 · «7 pilares»: gasto del Gobierno Central por función (DIPRES, pesos de 2025), una vez al mes ----------
DIPRES_FUNCIONAL = "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional2.pdf"


def gasto_funcional(estado, salida, hoy):
    """PDF oficial de la DIPRES (no publica planilla) → datos/gasto-funcional.json {anios: {año: {código: millones}}, nombres}.
    Se lee una vez al mes (la DIPRES suma un año a mediados de año). Si algo falla, queda el archivo anterior."""
    ruta = os.path.join(salida, "gasto-funcional.json")
    try:
        prev = json.load(open(ruta, encoding="utf-8"))
        if str(prev.get("consultado") or "")[:7] == hoy.isoformat()[:7]:
            estado["gasto_funcional"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": DIPRES_FUNCIONAL, "nota": "ya leído este mes"}
            return None
    except Exception:   # noqa: BLE001
        prev = None
    if _no_permitido(DIPRES_FUNCIONAL, estado, "gasto_funcional"):
        return None
    try:
        import io
        import pdfplumber
        r = requests.get(DIPRES_FUNCIONAL, headers={"User-Agent": UA}, timeout=60)
        r.raise_for_status()
        anios, nombres = {}, {}
        fila = re.compile(r"^(7\d{0,3})\s+(.+?)\s+((?:-?[\d.]+\s+){5,}-?[\d.]+)\s*$")
        with pdfplumber.open(io.BytesIO(r.content)) as pdf:
            for pg in pdf.pages:
                cols = []
                for ln in (pg.extract_text() or "").split("\n"):
                    ln = ln.strip()
                    if re.fullmatch(r"(?:(?:19|20)\d\d\s+){3,}(?:19|20)\d\d", ln):
                        cols = [int(x) for x in ln.split()]
                        continue
                    m = fila.match(ln)
                    if not (m and cols):
                        continue
                    vals = [int(x.replace(".", "")) if re.fullmatch(r"-?\d{1,3}(?:\.\d{3})*|-?\d+", x) else None for x in m.group(3).split()]
                    if len(vals) != len(cols) or None in vals:
                        continue
                    nombres.setdefault(m.group(1), re.sub(r"\s+", " ", m.group(2)).strip())
                    for a_, v in zip(cols, vals):
                        anios.setdefault(str(a_), {})[m.group(1)] = v
        clave = ("7", "707", "709", "7102", "7045", "7104", "706", "7106", "7105", "7041")
        if len(anios) < 30 or not all(all(c in v for c in clave) for v in anios.values()):
            raise ValueError(f"PDF con {len(anios)} años o sin las partidas de los 7 pilares")
        estado["gasto_funcional"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": DIPRES_FUNCIONAL,
                                     "desde": min(anios), "hasta": max(anios)}
        return {"fuente": "Dirección de Presupuestos (DIPRES), Clasificación funcional de erogaciones del Gobierno Central Total, millones de pesos de 2025",
                "url": DIPRES_FUNCIONAL, "unidad": "millones de pesos de 2025", "desde": min(anios), "hasta": max(anios),
                "consultado": hoy.isoformat(), "anios": dict(sorted(anios.items())), "nombres": nombres}
    except Exception as ex:   # noqa: BLE001
        estado["gasto_funcional"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": DIPRES_FUNCIONAL,
                                     "error": f"{type(ex).__name__}: {str(ex)[:160]}"}
        return None


def escribir(ruta, contenido):
    if contenido is None or contenido == "":
        return False
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(contenido if isinstance(contenido, str) else json.dumps(contenido, ensure_ascii=False, indent=1))
    return True


# ---------- ESPEJO DE LECTURAS (05-11-2026; Germán: «agrega un LOOP… e itera con varias páginas alternativas») ----------
# En la tarea programada, web_fetch rechaza casi todas las direcciones fijas (PROVENANCE_REQUIRED) y el código de la tarea no tiene
# red. GitHub sí la tiene: lee aquí, respetando el robots.txt de cada sitio, lo mismo que la tarea necesita y lo deja en datos/:
#   · fixtures/: las respuestas JSON que `recolectar.py --fixtures` ya sabe interpretar (ESPN golf/tenis/F1/NBA/fútbol, MET Norway,
#     Wikipedia «un día como hoy», mindicador, Yahoo Finanzas del IPSA…): mismo nombre que usa recolectar (sha256 de la dirección).
#   · paginas/: el TEXTO de las páginas fijas (Armada, IQAir, Flight-Status, Banco Central, Senado…) y de las que la tarea anotó como
#     fallidas el día anterior (pedidos/ultimo.json): la tarea las lee con Read en vez de web_fetch.
import gzip
import hashlib

ESPN_S = "https://site.api.espn.com/apis/site/v2/sports"
LIGAS = ("chi.1", "chi.copa_chi", "conmebol.libertadores", "conmebol.sudamericana", "fifa.worldq.conmebol", "uefa.champions", "eng.1", "esp.1", "ita.1")
MET = ((-18.48, -70.31), (-23.65, -70.40), (-29.90, -71.25), (-33.05, -71.61), (-33.45, -70.67), (-36.83, -73.05), (-38.74, -72.59), (-41.47, -72.94),
       (-53.16, -70.92))


def urls_recolectar(f):
    """Las direcciones exactas que pide `recolectar.py` para la fecha f (deben calzar letra por letra: el nombre del archivo es su hash)."""
    u = [f"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat={la:.2f}&lon={lo:.2f}" for la, lo in MET]
    u += [f"https://mindicador.cl/api/{x}/{f.year}" for x in ("dolar", "euro", "uf", "utm")] + ["https://mindicador.cl/api"]
    ini = (f.replace(day=1) - dt.timedelta(days=1)).replace(day=1)   # 06-11-2026: yuan (serie_cny), primer día del mes anterior
    u.append(f"https://api.frankfurter.dev/v1/{ini - dt.timedelta(days=7)}..{f}?base=USD&symbols=CNY")
    u.append(f"https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/{f:%m}/{f:%d}")
    u += [f"https://query1.finance.yahoo.com/v8/finance/chart/{s}?range=5d&interval=1d"
          for s in ("%5EIPSA", "%5EGSPC", "%5EIXIC", "%5EDJI", "BZ%3DF", "HG%3DF", "BTC-USD")]
    u += [f"{ESPN_S}/golf/{t}/scoreboard" for t in ("pga", "eur", "liv", "lpga")]
    u += [f"{ESPN_S}/tennis/{t}/rankings" for t in ("atp", "wta")]
    u += ["https://site.api.espn.com/apis/v2/sports/racing/f1/standings", "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings",
          # 13-11-2026: tercera disciplina con tabla (NFL de septiembre a enero, NHL de octubre a abril)
          "https://site.api.espn.com/apis/v2/sports/football/nfl/standings", "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings"]
    u += [f"{ESPN_S}/tennis/{t}/scoreboard" for t in ("atp", "wta")]
    for d in (f - dt.timedelta(days=3 if f.weekday() == 0 else 2), f - dt.timedelta(days=7)):
        u += [f"{ESPN_S}/soccer/{l}/scoreboard?dates={d:%Y%m%d}-{f:%Y%m%d}" for l in LIGAS]
    return list(dict.fromkeys(u))


def nombre_fixture(url):
    return hashlib.sha256(url.encode()).hexdigest()[:16] + ".json"


ESPEJO = [   # (archivo, dirección, qué es) · las direcciones fijas que Germán autorizó y que web_fetch rechaza en la tarea
    ("armada-avisos", "https://meteoarmada.directemar.cl/", "Avisos de marejadas y temporales de la Armada"),
    ("bcentral-inicio", "https://www.bcentral.cl/inicio", "Banco Central: portada (TPM, indicadores, publicaciones)"),
    ("larrainvial-mercados", "https://mercados.larrainvial.com/", "IPSA y mercados (LarrainVial)"),
    ("fmi-pib-chile", "https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH/CHL", "FMI: crecimiento del PIB de Chile"),
    ("espn-nba-noticias", "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news", "NBA: noticias (ESPN)"),
    ("espn-tenis-noticias", "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/news", "Tenis: noticias (ESPN)"),
    ("espn-golf-noticias", "https://site.api.espn.com/apis/site/v2/sports/golf/pga/news", "Golf: noticias (ESPN, PGA Tour)"),
    ("espn-rugby-noticias", "https://site.api.espn.com/apis/site/v2/sports/rugby/164205/news", "Rugby: noticias (ESPN, Mundial)"),
    ("espn-wta-noticias", "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/news", "Tenis femenino: noticias (ESPN)"),
] + [(f"iqair-{s}", u, f"Calidad del aire: {n}") for s, n, u in (
    ("arica", "Arica", "https://www.iqair.com/chile/arica-y-parinacota/arica"),
    ("antofagasta", "Antofagasta", "https://www.iqair.com/chile/antofagasta/antofagasta"),
    ("la-serena", "La Serena", "https://www.iqair.com/chile/coquimbo/la-serena"),
    ("valparaiso", "Valparaíso y Viña del Mar", "https://www.iqair.com/chile/valparaiso/vina-del-mar"),
    ("santiago", "Santiago", "https://www.iqair.com/chile/santiago-metropolitan/santiago"),
    ("concepcion", "Concepción", "https://www.iqair.com/chile/biobio/concepcion"),
    ("temuco", "Temuco", "https://www.iqair.com/chile/araucania/temuco"),
    ("puerto-montt", "Puerto Montt", "https://www.iqair.com/chile/los-lagos/puerto-montt"),
    ("punta-arenas", "Punta Arenas", "https://www.iqair.com/chile/magallanes/punta-arenas"))
] + [(f"flight-status-{c}-{t}", f"https://flight-status.com/airport/{c}-{t}/", f"Vuelos {c.upper()} ({'salidas' if t == 'departures' else 'llegadas'})")
     for c in ("scl", "anf", "ccp", "pmc", "puq") for t in ("departures", "arrivals")]
PEDIDOS_MAX = 40
LENTOS = ("iqair.com",)
LENTOS_PAUSA = 15
PAUSA_SITIO = {"tablademareas.com": 2}   # 08-11-2026: 30 páginas de oleaje seguidas: una cada 2 s


MESES_CORTOS = {"ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12}
RUMBOS = {"N": 0, "NNE": 22, "NE": 45, "ENE": 68, "E": 90, "ESE": 112, "SE": 135, "SSE": 158, "S": 180, "SSW": 202, "SW": 225, "WSW": 248,
          "W": 270, "WNW": 292, "NW": 315, "NNW": 338}


def oleaje_de_texto(texto, hoy):
    """Del texto de la página de oleaje de tablademareas (bloques «08 NOV · Domingo … OLEAJE MÁXIMO | 2,1 m … 0 h SW 2,1 m …»)
    → [{fecha, ola_max_m, direccion, direccion_grados}] desde hoy, o []."""
    out = []
    partes = re.split(r"\n\s*(\d{1,2}) (ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*\n", "\n" + str(texto or ""))
    for i in range(1, len(partes) - 2, 3):
        dia, mes, cuerpo = int(partes[i]), MESES_CORTOS[partes[i + 1]], partes[i + 2]
        m = re.search(r"OLEAJE M[ÁA]XIMO\s*\|\s*(\d+(?:[.,]\d+)?)\s*m", cuerpo)
        if not m:
            continue
        anio = hoy.year + (1 if mes < hoy.month - 6 else 0) - (1 if mes > hoy.month + 6 else 0)
        try:
            f = dt.date(anio, mes, dia)
        except ValueError:
            continue
        if f < hoy:
            continue
        rumbos = re.findall(r"\n\s*\d{1,2} h\s*\n\s*([NSEW]{1,3})\s*\n", cuerpo)
        dom = max(set(rumbos), key=rumbos.count) if rumbos else None
        fila = {"fecha": f.isoformat(), "ola_max_m": round(float(m.group(1).replace(",", ".")), 1)}
        if dom in RUMBOS:
            fila.update(direccion=dom, direccion_grados=RUMBOS[dom])
        if 0 < fila["ola_max_m"] < 20 and all(x["fecha"] != fila["fecha"] for x in out):
            out.append(fila)
    return out


def oleaje_desde_espejo(estado, salida, hoy):
    """08-11-2026: con las páginas de oleaje del espejo arma oleaje.json (los 30 puertos), si el modelo marino no se pudo leer."""
    carpeta = os.path.join(salida, "paginas")
    out = {}
    for n in sorted(os.listdir(carpeta)) if os.path.isdir(carpeta) else []:
        mm = re.match(r"^oleaje-([a-z0-9-]+)\.txt\.gz$", n)
        if not mm:
            continue
        try:
            import gzip
            filas = oleaje_de_texto(gzip.open(os.path.join(carpeta, n), "rt", encoding="utf-8").read(), hoy)
        except (OSError, ValueError):
            filas = []
        if filas:
            out[mm.group(1)] = filas
    if not out:
        return None
    estado["oleaje"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": "https://tablademareas.com (páginas de oleaje)",
                        "n": len(out), "nota": "modelo marino no permitido por robots.txt: se usan las páginas de tablademareas"}
    return {"fuente": "tablademareas.com (pronóstico de oleaje, leído por GitHub)", "url": "https://tablademareas.com/cl",
            "generado": ahora().isoformat(timespec="minutes"), "puertos": out}


def paginas_oleaje():
    """08-11-2026 (controles del 07 y 08-11: sin oleaje de Arica, Valparaíso, San Antonio y Juan Fernández con aviso de marejadas;
    Open-Meteo marino y NOAA ERDDAP prohíben la lectura automática en su robots.txt): el pronóstico de oleaje de tablademareas de los
    30 puertos (si su robots.txt lo permite) → [(archivo, dirección, qué es)]."""
    try:
        P = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "puertos-oleaje.json"), encoding="utf-8")).get("puertos") or {}
    except (OSError, ValueError):
        return []
    return [(f"oleaje-{k}", v["oleaje"], f"Pronóstico de oleaje de {v.get('nombre') or k} (tablademareas)") for k, v in P.items()
            if isinstance(v, dict) and str(v.get("oleaje") or "").startswith("https://")]


class _SinEspejo(Exception):
    pass


def toca_espejo(salida, hoy, hora=None):
    """El espejo corre en la primera corrida del día y de nuevo entre las 05:00 y las 08:00 de Santiago (lo más fresco para la
    tarea de las 07:30). Así no se repiten ~120 lecturas en cada una de las 16 corridas, ni se carga a los sitios. A mano, siempre."""
    if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
        return True
    try:
        if json.load(open(os.path.join(salida, "paginas.json"), encoding="utf-8")).get("fecha") != hoy.isoformat():
            return True
    except (OSError, ValueError, AttributeError):
        return True
    h = ahora().hour if hora is None else hora
    return 5 <= h < 8


def html_a_texto(h, limite=180_000):
    """Texto legible de una página: sin scripts ni estilos, filas de tabla con « | », enlaces como «texto [dirección]»."""
    h = re.sub(r"(?is)<(script|style|noscript|svg|head)\b.*?</\1>", " ", h or "")
    h = re.sub(r'(?is)<a\b[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>', lambda m: f"{m.group(2)} [{m.group(1)}]" if re.sub(r"<[^>]+>", "", m.group(2)).strip() else " ", h)
    h = re.sub(r"(?i)</t[dh]>", " | ", h)
    h = re.sub(r"(?i)<(br|/p|/tr|/li|/h[1-6]|/div|/section|/article)\b[^>]*>", "\n", h)
    t = unescape(re.sub(r"<[^>]+>", " ", h))
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()[:limite]


def _gz(ruta, texto):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    # mtime=0 y sin nombre: el mismo texto da los mismos bytes, así git no guarda copias repetidas (el repo no engorda)
    with open(ruta, "wb") as fh, gzip.GzipFile(filename="", mode="wb", fileobj=fh, compresslevel=9, mtime=0) as g:
        g.write(texto.encode("utf-8"))


def fixtures(estado, f, salida):
    """Baja las respuestas que usa recolectar.py y las deja comprimidas en <salida>/fixtures/. → índice."""
    carpeta = os.path.join(salida, "fixtures")
    if os.path.isdir(carpeta):
        for n in os.listdir(carpeta):
            os.remove(os.path.join(carpeta, n))
    ok, mal, tmp = [], [], {}
    for url in urls_recolectar(f):
        if not robots_permite(url, estado):
            mal.append({"url": url, "error": "robots.txt no lo permite"})
            continue
        txt = pedir(url, tmp, "x", como="text", espera=(0, 8), limite=40)
        try:
            json.loads(txt or "")
        except ValueError:
            mal.append({"url": url, "error": tmp.get("x", {}).get("error") or "respuesta que no es JSON"})
            continue
        _gz(os.path.join(carpeta, nombre_fixture(url) + ".gz"), txt)
        ok.append({"url": url, "archivo": nombre_fixture(url)})
    estado["fixtures"] = {"ok": bool(ok), "hora": ahora().isoformat(timespec="seconds"), "url": "recolectar.py --fixtures",
                          "n": len(ok), "error": f"{len(mal)} sin respuesta" if mal else ""}
    return {"fecha": f.isoformat(), "listas": ok, "fallidas": mal}


def espejo(estado, salida, pedidos=()):
    """Texto de las páginas fijas y de las pedidas por la tarea (máximo 40), comprimido en <salida>/paginas/. → índice."""
    carpeta = os.path.join(salida, "paginas")
    if os.path.isdir(carpeta):
        for n in os.listdir(carpeta):
            os.remove(os.path.join(carpeta, n))
    lista = list(ESPEJO) + paginas_oleaje()
    vistos = {u for _, u, _ in lista}
    for p in list(pedidos)[:PEDIDOS_MAX]:
        u = str((p or {}).get("url") if isinstance(p, dict) else p or "").strip()
        if re.match(r"^https?://", u) and u not in vistos and len(u) < 400:
            vistos.add(u)
            lista.append(("pedido-" + hashlib.sha256(u.encode()).hexdigest()[:12], u, str((p or {}).get("que") if isinstance(p, dict) else "") or "pedida por la tarea"))
    ok, mal, tmp, ok_lento, frenados = [], [], {}, [False], set()
    for nombre, url, que in lista:
        if not robots_permite(url, estado):
            mal.append({"url": url, "que": que, "error": "robots.txt no lo permite"})
            continue
        lento = next((d for d in LENTOS if d in url), "")
        if lento and lento in frenados:   # el sitio ya pidió bajar el ritmo (429): no se insiste hoy con ese sitio
            mal.append({"url": url, "que": que, "error": f"{lento} pidió esperar (HTTP 429): se deja para la próxima corrida"})
            continue
        if lento and ok_lento[0]:
            time.sleep(LENTOS_PAUSA)   # 06-11-2026: IQAir respondió 429 (demasiadas seguidas): una cada 15 s, como un lector humano
        ok_lento[0] = ok_lento[0] or lento
        pausado = next((k for k in PAUSA_SITIO if k in url), "")
        if pausado and pausado in frenados:   # 08-11-2026: el mismo freno al 429 para los sitios con muchas páginas (tablademareas)
            mal.append({"url": url, "que": que, "error": f"{pausado} pidió esperar (HTTP 429): se deja para la próxima corrida"})
            continue
        if pausado:
            time.sleep(PAUSA_SITIO[pausado])
        txt = pedir(url, tmp, "x", como="text", espera=(0, 20) if lento else (0, 8), limite=30 if lento else 40)
        if not txt:
            err = tmp.get("x", {}).get("error") or "sin respuesta"
            if (lento or pausado) and "429" in err:
                frenados.add(lento or pausado)
            mal.append({"url": url, "que": que, "error": err})
            continue
        es_json = txt.lstrip()[:1] in "{["
        cuerpo = txt[:400_000] if es_json else html_a_texto(txt)
        if len(cuerpo) < 200:
            mal.append({"url": url, "que": que, "error": "página casi vacía (se arma con JavaScript)"})
            continue
        _gz(os.path.join(carpeta, nombre + (".json" if es_json else ".txt") + ".gz"), cuerpo)
        ok.append({"url": url, "que": que, "archivo": nombre + (".json" if es_json else ".txt"), "hora": ahora().isoformat(timespec="minutes")})
    estado["espejo"] = {"ok": bool(ok), "hora": ahora().isoformat(timespec="seconds"), "url": "páginas leídas por GitHub",
                        "n": len(ok), "error": f"{len(mal)} sin texto" if mal else ""}
    try:   # 08-11-2026: la efeméride naval del día (la tarea no pudo leerla el 07 y el 08-11)
        ef = efemeride_naval(estado, ahora().date(), salida)
        for x in (ef or {}).get("listas") or []:
            ok.append({"url": x["url"], "que": "Efeméride naval del día (Armada de Chile): " + x["titulo"], "archivo": x["archivo"],
                       "hora": ahora().isoformat(timespec="minutes")})
    except Exception as ex:   # noqa: BLE001
        mal.append({"url": "armada.cl/efemerides-navales", "que": "efeméride naval", "error": f"{type(ex).__name__}"})
    return {"fecha": ahora().date().isoformat(), "listas": ok, "fallidas": mal}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default="datos")
    a = ap.parse_args(argv)
    os.makedirs(a.salida, exist_ok=True)
    hoy = ahora().date()
    estado = {}
    escribir(os.path.join(a.salida, "uv.csv"), uv(estado))
    cl = clima(estado, hoy)   # compacto: ~1.700 horas de 9 ciudades
    escribir(os.path.join(a.salida, "clima-openmeteo.json"), json.dumps(cl, ensure_ascii=False, separators=(",", ":")) if cl else None)
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
    for nombre, fn in (("oleaje.json", lambda: oleaje_costa(estado)), ("conflictos-oficiales.json", lambda: indicadores_conflictos(estado))):
        try:   # 08-11-2026: oleaje de toda la costa e indicadores oficiales de los conflictos
            escribir(os.path.join(a.salida, nombre), fn())
        except Exception as ex:   # noqa: BLE001
            estado[nombre] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": nombre, "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
    try:   # 06-11-2026: autores y título de cada boletín votado (fichas automáticas decían «Presentado por: —»)
        try:
            prev_b = json.load(open(os.path.join(a.salida, "autores-boletines.json"), encoding="utf-8"))
        except (OSError, ValueError):
            prev_b = {}
        escribir(os.path.join(a.salida, "autores-boletines.json"), autores_boletines(estado, cam, prev_b if isinstance(prev_b, dict) else {}))
        try:   # 13-11-2026: votaciones de Sala del Senado con el voto de cada senador
            escribir(os.path.join(a.salida, "senado-votaciones.json"), senado_votaciones(estado, hoy))
        except Exception as ex:   # noqa: BLE001
            estado["senado_votos"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
    except Exception as ex:   # noqa: BLE001
        estado["autores_boletines"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "senado", "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
    try:
        previo_a = json.load(open(os.path.join(a.salida, "camara-asistencia-sesiones.json"), encoding="utf-8"))
    except (OSError, ValueError):
        previo_a = {}
    asis = asistencia(estado, hoy, previo_a if isinstance(previo_a, dict) else {})
    escribir(os.path.join(a.salida, "camara-asistencia-sesiones.json"), asis)
    escribir(os.path.join(a.salida, "camara-asistencia.json"), asistencia_resumen(asis))
    escribir(os.path.join(a.salida, "vuelos-ayer.json"), vuelos_ayer(estado, hoy))
    try:   # 01-11-2026: vuelos de HOY (AeroDataBox, opcional)
        try:
            pv = json.load(open(os.path.join(a.salida, "vuelos-hoy.json"), encoding="utf-8"))
        except (OSError, ValueError):
            pv = None
        try:
            us = json.load(open(os.path.join(a.salida, "aerodatabox-uso.json"), encoding="utf-8"))
        except (OSError, ValueError):
            us = None
        vh, us = vuelos_hoy(estado, hoy, pv, us)
        escribir(os.path.join(a.salida, "vuelos-hoy.json"), vh)
        escribir(os.path.join(a.salida, "aerodatabox-uso.json"), us)
    except Exception as ex:   # noqa: BLE001
        estado["vuelos_hoy"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "AeroDataBox", "error": type(ex).__name__}
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
    try:
        mer = con_anteriores(mer, json.load(open(os.path.join(a.salida, "mercados.json"), encoding="utf-8")), hoy)
    except (OSError, ValueError):
        pass
    if mer and isinstance(estado.get("mercados"), dict):
        estado["mercados"].update(ok=True, n=len(mer), error="")
    escribir(os.path.join(a.salida, "mercados.json"), {"fecha": hoy.isoformat(), "mercados": mer, "bitcoin": btc} if (mer or btc) else None)
    try:   # 03-11-2026: tasas mensuales oficiales + TPM esperada (Encuesta de Expectativas); el catálogo, solo los lunes (diagnóstico)
        escribir(os.path.join(a.salida, "tasas-bcch.json"), tasas_bcch(estado, hoy))
        escribir(os.path.join(a.salida, "historia.json"), historia_bcch(estado, hoy))
        escribir(os.path.join(a.salida, "gasto-funcional.json"), gasto_funcional(estado, a.salida, hoy))   # 14-11-2026: «7 pilares»
        if hoy.weekday() == 0:
            cat = tasas_catalogo(estado)
            if cat:
                escribir(os.path.join(a.salida, "tasas-bcch-catalogo.json"), {"fecha": hoy.isoformat(), "series": cat[:1500]})
    except Exception as ex:   # noqa: BLE001
        estado["bcch_catalogo_mensual"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "Banco Central",
                                           "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
    escribir(os.path.join(a.salida, "bcch-catalogo.json"), {"fecha": hoy.isoformat(), "series": _BCCH["catalogo"]} if _BCCH.get("catalogo") else None)
    try:   # 05-11-2026: lo que la tarea no puede leer, lo lee GitHub (fixtures de recolectar.py y texto de páginas)
        if not toca_espejo(a.salida, hoy):
            raise _SinEspejo
        escribir(os.path.join(a.salida, "fixtures.json"), fixtures(estado, hoy, a.salida))
        try:
            ped = json.load(open(os.path.join(os.path.dirname(os.path.abspath(a.salida)), "pedidos", "ultimo.json"), encoding="utf-8"))
            ped = ped.get("pedidos") if isinstance(ped, dict) else ped
        except (OSError, ValueError):
            ped = []
        escribir(os.path.join(a.salida, "paginas.json"), espejo(estado, a.salida, ped if isinstance(ped, list) else []))
        if not (estado.get("oleaje") or {}).get("ok"):   # 08-11-2026: oleaje de los 30 puertos desde las páginas recién leídas
            escribir(os.path.join(a.salida, "oleaje.json"), oleaje_desde_espejo(estado, a.salida, hoy))
    except _SinEspejo:
        estado["espejo"] = {"ok": True, "hora": ahora().isoformat(timespec="seconds"), "url": "espejo",
                            "nota": "ya hecho hoy; se refresca entre las 05:00 y las 08:00 de Santiago"}
    except Exception as ex:   # noqa: BLE001
        estado["espejo"] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": "espejo", "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
    escribir(os.path.join(a.salida, "robots.json"), {"fecha": hoy.isoformat(), "sitios": ROBOTS_VISTOS} if ROBOTS_VISTOS else None)
    for nombre, fn in (("sismos.csv", lambda: sismos(estado)), ("aire.json", lambda: aire_waqi(estado) or aire(estado)), ("f1.json", lambda: f1(estado, hoy))):
        try:   # 02-11-2026: ninguna de estas tres detiene a las demás
            escribir(os.path.join(a.salida, nombre), fn())
        except Exception as ex:   # noqa: BLE001
            estado[nombre.split(".")[0]] = {"ok": False, "hora": ahora().isoformat(timespec="seconds"), "url": nombre, "error": type(ex).__name__}
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
