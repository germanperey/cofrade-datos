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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bajar as B  # noqa: E402

SECCIONES = (("politica/chile", "Chile"), ("economia/chile", "Economía"), ("politica/mundo", "Mundo"),
             ("economia/mundo", "Economía mundial"), ("tecnologia", "Tecnología"), ("deportes", "Deportes"),
             ("ciencia", "Ciencia"), ("emprendimiento", "Emprendimiento"))
POR_SECCION = 5
HORAS_TITULARES = 12
INDICADORES = (("dolar", "Dólar", "$", 2), ("euro", "Euro", "$", 2), ("uf", "UF", "$", 2), ("utm", "UTM", "$", 0),
               ("libra_cobre", "Cobre (libra)", "US$", 2))
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


def indicadores(estado):
    j = B.pedir("https://mindicador.cl/api", estado, "indicadores", espera=(0, 20))
    out = []
    for k, nom, pre, dec in INDICADORES:
        x = (j or {}).get(k) or {}
        if isinstance(x.get("valor"), (int, float)):
            out.append({"clave": k, "nombre": nom, "valor": x["valor"], "prefijo": pre, "decimales": dec,
                        "fecha": str(x.get("fecha") or "")[:10], "fuente": "Banco Central de Chile (vía mindicador.cl)"})
    return out


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


def armar(estado):
    p = {"generado": B.ahora().isoformat(timespec="minutes"), "proxima": None}
    for nombre, fn in (("indicadores", indicadores), ("ipsa", ipsa), ("sismos", sismos), ("titulares", titulares), ("aire", aire)):
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
    p["fuentes_ok"] = sum(1 for v in estado.values() if isinstance(v, dict) and v.get("ok"))
    return p


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default="datos")
    a = ap.parse_args(argv)
    estado = {}
    p = armar(estado)
    os.makedirs(a.salida, exist_ok=True)
    json.dump(p, open(os.path.join(a.salida, "pulso.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_tit = sum(len(s["notas"]) for s in p.get("titulares") or [])
    print(f"PULSO {p['generado']}: {len(p.get('indicadores') or [])} indicadores, IPSA {'sí' if p.get('ipsa') else 'no'}, "
          f"{len(p.get('mercados') or [])} mercados, {(p.get('sismos') or {}).get('n', 0)} sismos, {n_tit} titulares, "
          f"{len((p.get('aire') or {}).get('ciudades') or [])} ciudades con aire")
    return 0


if __name__ == "__main__":
    sys.exit(main())
