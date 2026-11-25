#!/usr/bin/env python3
"""Pulso del día de Cofrade News (06-11-2026; Germán: «optimizar las actualizaciones de las noticias en varias instancias a lo
largo de cada día»).

En peras y manzanas: la edición completa sale una vez al día (07:30). Entre medio, cada 2 horas, GitHub arma este «pulso»:
dólar, euro, UF, UTM y cobre (Banco Central vía mindicador.cl), IPSA en puntos (LarrainVial), bolsas del mundo y bitcoin,
los sismos de las últimas 24 horas, la calidad del aire medida y los titulares de las últimas horas de los medios (solo los que
están en español). Lo deja en datos/pulso.json y la portada de www.cofrad.es lo muestra en la franja «En vivo».
Gratis: no usa Claude ni ninguna cuenta de pago. Respeta el robots.txt de cada sitio (las mismas reglas de bajar.py).

  python pulso.py --salida datos
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bajar as B  # noqa: E402

SECCIONES = (("politica/chile", "Chile"), ("economia/chile", "Economía"), ("politica/mundo", "Mundo"),
             ("economia/mundo", "Economía mundial"), ("tecnologia", "Tecnología"), ("deportes", "Deportes"),
             ("ciencia", "Ciencia"), ("emprendimiento", "Emprendimiento"))
POR_SECCION = 5
HORAS_TITULARES = 12
# 17-11-2026 (Germán: «En el Landing page de www.cofrad.es está incompleta la cantidad de Indicadores económicos»): desde el 16-11
# mindicador.cl falla de día cuando lo pide GitHub (13 de 18 pulsos entre el 16-11 09:07 y el 17-11 17:07 salieron sin dólar, euro,
# UF, UTM ni cobre) y la franja «En vivo» quedaba sin ellos. Ahora cada indicador recorre una cascada y solo falta si no hay ningún
# dato confiable de sus últimos días: (1) mindicador.cl, (2) la API oficial del Banco Central (cuenta gratuita de GitHub), (3) lo que
# GitHub bajó en la mañana (datos/indicadores.json y datos/historia.json) y (4) el último pulso bueno. Cada cifra lleva su fecha.
INDICADORES = (   # clave, nombre, prefijo, sufijo, decimales, serie del Banco Central, días que vale el dato
    ("dolar", "Dólar observado", "$", "", 2, "F073.TCO.PRE.Z.D", 6),
    ("euro", "Euro", "$", "", 2, "F072.CLP.EUR.N.O.D", 6),
    ("yuan", "Yuan chino", "$", "", 2, "F072.CLP.CNY.N.O.D", 6),   # 21-11-2026: lo publica el Banco Central junto al dólar
    ("uf", "UF", "$", "", 2, "F073.UFF.PRE.Z.D", 3),
    ("utm", "UTM", "$", "", 0, "F073.UTR.PRE.Z.M", 40),
    ("tpm", "TPM", "", " %", 2, "F022.TPM.TIN.D001.NO.Z.D", 10),
    ("libra_cobre", "Cobre (libra)", "US$", "", 2, "F019.PPB.PRE.100.D", 6),
)
HISTORIA_CLAVE = {"dolar": "dolar", "euro": "euro", "yuan": "yuan", "uf": "uf", "tpm": "tpm", "libra_cobre": "cobre"}   # datos/historia.json
LUGARES = (("Arica", -18.48, -70.31), ("Iquique", -20.21, -70.15), ("Calama", -22.46, -68.93), ("Antofagasta", -23.65, -70.40),
           ("Copiapó", -27.37, -70.33), ("La Serena", -29.90, -71.25), ("Valparaíso", -33.05, -71.61), ("Santiago", -33.45, -70.67),
           ("Rancagua", -34.17, -70.74), ("Talca", -35.43, -71.66), ("Concepción", -36.83, -73.05), ("Temuco", -38.74, -72.59),
           ("Valdivia", -39.81, -73.25), ("Puerto Montt", -41.47, -72.94), ("Coyhaique", -45.57, -72.07), ("Punta Arenas", -53.16, -70.92),
           ("Ollagüe", -21.22, -68.25), ("San Pedro de Atacama", -22.91, -68.20), ("Ovalle", -30.60, -71.20), ("Chillán", -36.61, -72.10))


def _km(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(x))


def referencia(lat, lon):
    """«45 km al O de Iquique», con la ciudad más cercana de la lista y el rumbo en 8 direcciones."""
    nom, la, lo = min(LUGARES, key=lambda c: _km(lat, lon, c[1], c[2]))
    d = _km(la, lo, lat, lon)
    if d < 8:
        return f"cerca de {nom}"
    ang = (math.degrees(math.atan2((lon - lo) * math.cos(math.radians(la)), lat - la)) + 360) % 360
    rumbo = ("N", "NE", "E", "SE", "S", "SO", "O", "NO")[int((ang + 22.5) // 45) % 8]
    return f"{round(d)} km al {rumbo} de {nom}"


def _vigente(fecha, hoy, dias):
    """¿El dato es de hoy o de los `dias` anteriores? (nunca del futuro: la UF se publica con semanas de anticipación)."""
    try:
        f = dt.date.fromisoformat(str(fecha)[:10])
    except ValueError:
        return False
    return 0 <= (hoy - f).days <= dias


def _leer(carpeta, nombre):
    try:
        return json.load(open(os.path.join(carpeta, nombre), encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return None


def indicadores(estado, carpeta=None):
    """→ lista de indicadores en el orden de INDICADORES. `carpeta` (datos/) habilita los respaldos guardados por GitHub."""
    hoy = B.ahora().date()
    out, origen = {}, {}

    def poner(k, valor, fecha, fuente, de):
        t = next(x for x in INDICADORES if x[0] == k)
        if k in out or not isinstance(valor, (int, float)) or isinstance(valor, bool) or valor <= 0 or not _vigente(fecha, hoy, t[6]):
            return
        out[k] = {"clave": k, "nombre": t[1], "valor": valor, "prefijo": t[2], "sufijo": t[3], "decimales": t[4],
                  "fecha": str(fecha)[:10], "fuente": fuente}
        origen[k] = de

    j = B.pedir("https://mindicador.cl/api", estado, "indicadores", espera=(0, 20))   # 1) mindicador.cl
    for t in INDICADORES:
        x = (j or {}).get(t[0]) or {}
        poner(t[0], x.get("valor"), x.get("fecha"), "Banco Central de Chile (vía mindicador.cl)", "mindicador")
    auth = B._bcch_auth()   # 2) API oficial del Banco Central, solo para lo que falta
    if auth and len(out) < len(INDICADORES) and B.robots_permite(B.BCCH_URL, estado):
        for t in INDICADORES:
            if t[0] in out:
                continue
            desde = (hoy - dt.timedelta(days=t[6] + 3)).isoformat()
            url = f"{B.BCCH_URL}?{auth}&function=GetSeries&timeseries={t[5]}&firstdate={desde}&lastdate={hoy.isoformat()}"
            obs = B.cierres_bcch(B.pedir(url, estado, f"pulso_bcch_{t[0]}", espera=(0, 10), limite=40), hoy + dt.timedelta(days=1))
            if obs:
                poner(t[0], round(obs[-1][1], 4), obs[-1][0], "Banco Central de Chile", "banco_central")
    if carpeta:   # 3) lo que GitHub bajó en la mañana y 4) el último pulso bueno
        m = _leer(carpeta, "indicadores.json") or {}
        for t in INDICADORES:
            x = m.get(t[0]) if isinstance(m.get(t[0]), dict) else {}
            poner(t[0], x.get("valor"), x.get("fecha"), "Banco Central de Chile (vía mindicador.cl, lectura de la mañana)", "manana")
        h = ((_leer(carpeta, "historia.json") or {}).get("series")) or {}
        for k, hk in HISTORIA_CLAVE.items():
            d = (h.get(hk) or {}).get("datos") if isinstance(h.get(hk), dict) else None
            if isinstance(d, list) and d and isinstance(d[-1], list) and len(d[-1]) == 2:
                poner(k, d[-1][1], d[-1][0], "Banco Central de Chile", "manana")
        for x in (_leer(carpeta, "pulso.json") or {}).get("indicadores") or []:
            if isinstance(x, dict) and x.get("clave") in {t[0] for t in INDICADORES}:
                poner(x["clave"], x.get("valor"), x.get("fecha"), x.get("fuente") or "Banco Central de Chile", "pulso_anterior")
    # 21-11-2026 (Germán: «Hoy no se actualizaron los valores del Dólar, Euro y Yuan... Es importantísimo»): el Banco Central publica
    # cada tarde el valor que rige el día hábil siguiente; el sábado ya está el del lunes, calculado con el mercado del viernes.
    # mindicador.cl y el filtro «nunca del futuro» lo dejaban fuera. Para el dólar, el euro y el yuan se pide siempre al Banco Central
    # hasta 6 días adelante y, si trae una fecha más nueva que la elegida, gana esa, marcada con «rige» (la fecha en que rige).
    if auth and B.robots_permite(B.BCCH_URL, estado):
        for t in INDICADORES:
            if t[0] not in ("dolar", "euro", "yuan"):
                continue
            desde = (hoy - dt.timedelta(days=t[6] + 3)).isoformat()
            url = (f"{B.BCCH_URL}?{auth}&function=GetSeries&timeseries={t[5]}&firstdate={desde}"
                   f"&lastdate={(hoy + dt.timedelta(days=6)).isoformat()}")
            obs = B.cierres_bcch(B.pedir(url, estado, f"pulso_bcch_rige_{t[0]}", espera=(0, 10), limite=40), hoy + dt.timedelta(days=7))
            if obs and obs[-1][1] > 0 and (t[0] not in out or obs[-1][0] > out[t[0]]["fecha"]):
                out[t[0]] = {"clave": t[0], "nombre": t[1], "valor": round(obs[-1][1], 4), "prefijo": t[2], "sufijo": t[3], "decimales": t[4],
                             "fecha": obs[-1][0], "fuente": "Banco Central de Chile"}
                if obs[-1][0] > hoy.isoformat():
                    out[t[0]]["rige"] = obs[-1][0]
                    out[t[0]]["publicado"] = (obs[-2][0] if len(obs) > 1 else hoy.isoformat())
                origen[t[0]] = "banco_central_rige"
    faltan = [t[1] for t in INDICADORES if t[0] not in out]
    estado["indicadores_cascada"] = {"ok": not faltan, "hora": B.ahora().isoformat(timespec="seconds"), "origen": origen,
                                     "error": ("sin dato: " + ", ".join(faltan)) if faltan else ""}
    return [out[t[0]] for t in INDICADORES if t[0] in out]


def ipsa(estado):
    """Puntos y variación del IPSA desde la página de mercados de LarrainVial (su robots.txt lo permite)."""
    url = "https://mercados.larrainvial.com/"
    if not B.robots_permite(url, estado):
        return None
    h = B.pedir(url, estado, "ipsa", como="text", espera=(0, 15), limite=40)
    if not h:
        return None
    t = B.html_a_texto(h)
    m = re.search(r"\bIPSA\b(.{0,160})", t, re.S)
    nums = re.findall(r"[+\-−]?\d{1,3}(?:\.\d{3})*,\d{1,2}", m.group(1)) if m else []
    if not nums:
        return None
    valor = float(nums[0].replace(".", "").replace(",", "."))
    if not 1000 <= valor <= 100000:
        return None
    out = {"nombre": "IPSA", "valor": valor, "fuente": "LarrainVial (Bolsa de Santiago)", "url": url,
           "hora": B.ahora().isoformat(timespec="minutes")}
    if len(nums) > 1:
        v = float(nums[1].replace("−", "-").replace(".", "").replace(",", "."))
        if abs(v) < 25:   # variación del día en %, nunca otra cifra de la página
            out["variacion_pct"] = v
    return out


# 23-11-2026 · Germán: «Los mercados (o bolsas mundiales) no se actualizaron hoy, tienen datos del 20 de Noviembre (este error es
# gravísimo...)». La edición de las 07:00 trae el último cierre (lunes = viernes), y FRED publica con un día de atraso (S&P 500 y
# Nasdaq salieron con el cierre del 19-11). LarrainVial (su robots.txt lo permite) publica todas las bolsas al instante: el pulso las
# lee cada 2 horas y la edición del día las actualiza en el gráfico «Mercados, variación diaria».
BOLSAS = [("IPSA", "IPSA"), ("IGPA", "IGPA"), ("S&P 500", "S&P 500"), ("NASDAQ COMP", "Nasdaq"), ("NASDAQ 100", "Nasdaq 100"),
          ("BOVESPA", "Bovespa"), ("MERVAL", "Merval"), ("FTSE 100", "FTSE 100"), ("DAX", "DAX"), ("IBEX 35", "IBEX 35"),
          ("NIKKEI 225", "Nikkei 225"), ("HANG SENG", "Hang Seng"), ("CSI 300", "CSI 300")]


def bolsas_de_texto(t):
    """Texto de la página de LarrainVial → [{nombre, valor, variacion_pct}] (solo cifras con forma de índice y variación creíble)."""
    t = re.sub(r"\s+", " ", str(t or "").replace("&amp;", "&"))
    out = []
    for clave, nombre in BOLSAS:
        m = re.search(r"(?<![A-Z&])" + re.escape(clave) + r"[\s|]+(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)[\s|%]+([+\-−]?\s?\d{1,2},\d{1,2})(?!\d)", t)
        if not m:
            continue
        try:
            v = float(m.group(1).replace(".", "").replace(",", "."))
            pct = float(m.group(2).replace("−", "-").replace(" ", "").replace(",", "."))
        except ValueError:
            continue
        if 100 <= v <= 10_000_000 and abs(pct) < 25:
            out.append({"nombre": nombre, "valor": v, "variacion_pct": pct})
    return out


def bolsas(estado):
    url = "https://mercados.larrainvial.com/"
    if not B.robots_permite(url, estado):
        return None
    h = B.pedir(url, estado, "bolsas", como="text", espera=(0, 15), limite=40)
    if not h:
        return None
    t = B.html_a_texto(h)
    lista = bolsas_de_texto(t)
    if len(lista) < 5:   # la página cambió de forma: mejor nada que cifras dudosas (se guarda un trozo del texto para revisar)
        i = max(0, t.find("IGPA") - 120)
        estado["bolsas"] = {"ok": False, "hora": B.ahora().isoformat(timespec="seconds"), "url": url, "error": f"solo {len(lista)} bolsas",
                            "muestra": t[i:i + 500]}
        return None
    estado["bolsas"] = {"ok": True, "hora": B.ahora().isoformat(timespec="seconds"), "url": url, "n": len(lista), "error": ""}
    return {"lista": lista, "hora": B.ahora().isoformat(timespec="minutes"), "fuente": "LarrainVial", "url": url}


def sismos(estado, horas=24, maximo=5):
    csv = B.sismos(estado)
    out = []
    for fila in (csv or "").splitlines()[1:]:
        p = fila.split(",")
        try:
            f = dt.datetime.fromisoformat(p[0]).replace(tzinfo=B.TZ)
            lat, lon, prof, mag = float(p[1]), float(p[2]), float(p[3]), float(p[4])
        except (ValueError, IndexError):
            continue
        if B.ahora() - f <= dt.timedelta(hours=horas):
            out.append({"hora": f.isoformat(timespec="minutes"), "magnitud": mag, "profundidad_km": prof,
                        "referencia": referencia(lat, lon)})
    out.sort(key=lambda x: (-x["magnitud"], x["hora"]))
    return {"n": len(out), "mayores": out[:maximo], "fuente": "Servicio Geológico de EE. UU. (USGS)",
            "url": "https://earthquake.usgs.gov/earthquakes/map/"}


ES = set("de la el en los las del que por con para una un se su al y es más tras sobre sus ante entre como pero sin desde hasta este esta "
         "año años chile gobierno nuevo nueva".split())
EN = set("the of and to in for on with as by is are after how new from at its an be has have will why what who this that".split())


def arreglar(t):
    """«IrÃ¡n» → «Irán»: algunos RSS (Europa Press) llegan con la codificación doble."""
    t = str(t or "")
    if re.search(r"Ã[\x80-\xBF¡-ÿ]|Â[\xA0-\xBF]", t):
        try:
            return t.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return t


def es_espanol(titulo):
    """06-11-2026: todo título que ve el lector va en español (regla de Germán). Las notas en inglés se dejan fuera del pulso."""
    w = re.findall(r"[a-záéíóúñü]+", str(titulo or "").lower())
    es, en = sum(x in ES for x in w), sum(x in EN for x in w)
    return es > en or (en == 0 and bool(re.search(r"[áéíóúñ¿¡]", str(titulo or "").lower())))


def _en_espanol(n):
    f = str(n.get("fuente") or "").lower()
    return "inglés" not in f and "english" not in f and es_espanol(arreglar(n.get("titulo")))


def titulares(estado, horas=HORAS_TITULARES):
    t = B.titulares(estado, feeds=B.todas_las_fuentes(radar=False)) or {}   # 14-11-2026: sin las 54 búsquedas del radar (solo «Datos oficiales»)
    sec = t.get("secciones") or {}
    limite = (B.ahora() - dt.timedelta(hours=horas)).strftime("%Y-%m-%d %H:%M")
    out = []
    for clave, nombre in SECCIONES:
        notas = [n for n in (sec.get(clave) or {}).get("notas") or [] if isinstance(n, dict) and _en_espanol(n)
                 and str(n.get("fecha") or "") >= limite and re.match(r"^https?://", str(n.get("url") or "")) and n.get("titulo")]
        notas.sort(key=lambda n: n.get("fecha") or "", reverse=True)
        vistos, elegidas, medios = set(), [], {}
        for n in notas:
            k = re.sub(r"\W+", " ", arreglar(n["titulo"]).lower())[:70]
            medio = re.sub(r"\s*\(.*?\)\s*$", "", str(n.get("fuente") or "")).strip()
            if k in vistos or medios.get(medio, 0) >= 2:   # sin repetir y sin que un medio llene la sección
                continue
            vistos.add(k)
            medios[medio] = medios.get(medio, 0) + 1
            elegidas.append({"titulo": arreglar(n["titulo"])[:220], "medio": arreglar(medio), "url": n["url"], "hora": str(n.get("fecha") or "")[11:16]})
            if len(elegidas) >= POR_SECCION:
                break
        if elegidas:
            out.append({"seccion": nombre, "notas": elegidas})
    return out


def aire(estado):
    r = B.aire_waqi(estado) or {}
    out = []
    for x in (r.get("ciudades") if isinstance(r, dict) else None) or []:
        if isinstance(x, dict) and isinstance(x.get("aqi_us"), (int, float)):
            out.append({"ciudad": x.get("nombre"), "aqi": x["aqi_us"], "estado": x.get("categoria"), "estacion": x.get("estacion"),
                        "hora": x.get("hora"), "url": x.get("url")})
    return {"ciudades": out, "fuente": r.get("fuente")} if out else None


# 25-11-2026 (Germán, 00:40: «el Auditor que revisa cada 3 horas debe también actualizar los vuelos aéreos (Salidas y Llegadas)
# colocando el status actualizado de cada vuelo y el horario confirmado»). La edición sale a las 07:00 con el estado de esa hora; el
# pulso relee cada 2 horas el tablero público de Flight-Status de los 5 aeropuertos (su robots.txt lo permite; las mismas 10 páginas
# que bajar.py ya lee de madrugada) y deja datos/vuelos-vivo.json: por vuelo y hora programada, la hora confirmada y el estado. El
# sitio lo aplica sobre la tabla de la edición del día (sitio/modulos/vuelos_vivo.js) y el vigía revisa que esté al día.
VUELOS_AEROP = ("scl", "anf", "ccp", "pmc", "puq")
RX_VUELO = re.compile(r"^[A-Z0-9]{2}\d{1,4}[A-Z]?$")
RX_HORA = re.compile(r"^\d{2}:\d{2}$")


def vuelos_de_texto(t, hoy_iso):
    """Texto de una página de Flight-Status (salidas o llegadas) → {«VUELO|HH:MM»: {"c": hora confirmada, "e": estado}} solo de hoy."""
    toks = [x.strip() for x in (t or "").split("|")]
    out = {}
    for i, x in enumerate(toks):
        x = x.split("\n")[-1].strip()
        if not RX_VUELO.match(x) or i + 5 >= len(toks):
            continue
        prog, est, _lugar, _term, st = (z.split("\n")[0].strip() for z in toks[i + 1:i + 6])
        if not RX_HORA.match(prog) or not st:
            continue
        m = re.match(r"(.*?)\s+on\s+(\d{4}-\d{2}-\d{2})$", st)
        if m:
            if m.group(2) != hoy_iso:   # «Scheduled on <mañana>» o «Arrived on <ayer>»: no es el vuelo de hoy
                continue
            st = m.group(1)
        lu = re.match(r"\(\s*([A-Z]{3})\s*\)\s*(.*)$", _lugar)   # «( IAH ) Houston, TX»: el otro aeropuerto del vuelo
        out[f"{x}|{prog}"] = {"c": est if RX_HORA.match(est) else "", "e": st[:40], **({"i": lu.group(1), "l": lu.group(2)[:40]} if lu else {})}
    return out


def vuelos_vivo(estado):
    hoy = B.ahora().date().isoformat()
    aer, n, fallas = {}, 0, []
    for c in VUELOS_AEROP:
        for tipo, k in (("departures", "salidas"), ("arrivals", "llegadas")):
            url = f"https://flight-status.com/airport/{c}-{tipo}/"
            if not B.robots_permite(url, estado):
                fallas.append(f"{c}-{tipo}: robots.txt")
                continue
            h = B.pedir(url, estado, f"vuelos_vivo_{c}_{tipo}", como="text", espera=(0, 10), limite=40)
            filas = vuelos_de_texto(B.html_a_texto(h, limite=3_000_000), hoy) if h else {}
            if filas:
                aer.setdefault(c, {})[k] = filas
                n += len(filas)
            else:
                fallas.append(f"{c}-{tipo}: sin filas")
            time.sleep(2)   # una página cada 2 segundos: trato amable al sitio
    estado["vuelos_vivo"] = {"ok": n > 0, "hora": B.ahora().isoformat(timespec="seconds"), "n": n, "error": "; ".join(fallas[:10])}
    if not n:
        return None
    return {"generado": B.ahora().isoformat(timespec="minutes"), "fecha": hoy, "fuente": "Flight-Status (flight-status.com)",
            "aeropuertos": aer}


def armar(estado, carpeta=None):
    """`carpeta`: la de datos/ (respaldos de los indicadores). Sin ella, el pulso solo usa lo que responde ahora."""
    p = {"generado": B.ahora().isoformat(timespec="minutes"), "proxima": None}
    for nombre, fn in (("indicadores", lambda e: indicadores(e, carpeta)), ("ipsa", ipsa), ("bolsas", bolsas), ("sismos", sismos), ("titulares", titulares),
                       ("aire", aire)):
        try:
            p[nombre] = fn(estado)
        except Exception as ex:   # noqa: BLE001 — un bloque roto no detiene a los demás
            estado[nombre] = {"ok": False, "error": f"{type(ex).__name__}: {str(ex)[:120]}"}
            p[nombre] = None
    try:
        hoy = B.ahora().date()
        p["mercados"] = [m for m in (B.mercados(estado, hoy) or []) if isinstance(m, dict)]
        p["bitcoin"] = B.bitcoin(estado, hoy)
    except Exception as ex:   # noqa: BLE001
        estado["mercados"] = {"ok": False, "error": type(ex).__name__}
    h = B.ahora()
    siguiente = h.replace(minute=17, second=0, microsecond=0) + dt.timedelta(hours=2 - h.hour % 2)
    p["proxima"] = siguiente.strftime("%H:%M") if 7 <= siguiente.hour <= 23 else "07:17"
    if not p.get("bolsas") and isinstance(estado.get("bolsas"), dict):
        p["bolsas_estado"] = estado["bolsas"]   # 23-11-2026: diagnóstico visible si LarrainVial cambia de forma
    p["fuentes_ok"] = sum(1 for v in estado.values() if isinstance(v, dict) and v.get("ok"))
    p["indicadores_origen"] = (estado.get("indicadores_cascada") or {}).get("origen") or {}   # 17-11-2026: de dónde salió cada cifra
    return p


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default="datos")
    a = ap.parse_args(argv)
    estado = {}
    p = armar(estado, a.salida)
    os.makedirs(a.salida, exist_ok=True)
    json.dump(p, open(os.path.join(a.salida, "pulso.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    try:   # 25-11-2026: vuelos con su estado y hora confirmada (archivo aparte; si falla, queda el anterior)
        vv = vuelos_vivo(estado)
        if vv:
            json.dump(vv, open(os.path.join(a.salida, "vuelos-vivo.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"VUELOS EN VIVO: {(estado.get('vuelos_vivo') or {}).get('n', 0)} vuelos · {(estado.get('vuelos_vivo') or {}).get('error', '')}")
    except Exception as ex:   # noqa: BLE001 — los vuelos nunca botan el pulso
        print("VUELOS EN VIVO: falla", type(ex).__name__, ex)
    n_tit = sum(len(s["notas"]) for s in p.get("titulares") or [])
    cas = estado.get("indicadores_cascada") or {}
    print(f"PULSO {p['generado']}: {len(p.get('indicadores') or [])} de {len(INDICADORES)} indicadores "
          f"({', '.join(f'{k}: {v}' for k, v in (cas.get('origen') or {}).items())}{'; ' + cas['error'] if cas.get('error') else ''}), IPSA {'sí' if p.get('ipsa') else 'no'}, "
          f"{len(p.get('mercados') or [])} mercados, {(p.get('sismos') or {}).get('n', 0)} sismos, {n_tit} titulares, "
          f"{len((p.get('aire') or {}).get('ciudades') or [])} ciudades con aire")
    return 0


if __name__ == "__main__":
    sys.exit(main())
