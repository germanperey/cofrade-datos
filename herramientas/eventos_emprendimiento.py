#!/usr/bin/env python3
"""Cofrade News · Ferias, eventos y concursos de emprendimiento (24-11-2026).

Germán, 24-11-2026 18:09: «Debemos agregar dentro de la sección de "Emprendimiento" un subtitulo respecto a varios temas relacionados con
"Ferias, Eventos y Concursos de Emprendimiento" (justo antes del subtitulo de "Fondos Concursables")».

Corre en el robot de datos de GitHub cada mañana y arma datos/eventos-emprendimiento.json:
  · las fichas verificadas de herramientas/eventos-base.json que aún no terminan (las que ya pasaron se quitan solas);
  · las noticias de los últimos 21 días sobre ferias, eventos y concursos de emprendimiento en Chile (Bing Noticias por RSS, solo si su
    robots.txt lo permite), sin repetir y con su medio y fecha.
El sitio (sitio/modulos/eventos_empr.js) lo dibuja justo antes de «Fondos concursables». Si algo falla, queda el archivo anterior.
"""
import datetime as dt, html, json, os, re, sys
from urllib.parse import urlparse

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
import bajar as B  # noqa: E402

CONSULTAS = ['feria emprendedores Chile', 'concurso emprendimiento Chile postulaciones', 'evento startups Chile',
             'premio emprendedores Chile', 'feria pymes Chile', 'rueda de negocios pymes Chile']
CLAVES = re.compile(r"feria|expo|concurso|premio|desaf[ií]o|convocatoria|postulaci|evento|encuentro|cumbre|summit|demo ?day|pitch|rueda de negocio|hackat", re.I)
TEMA = re.compile(r"emprend|pyme|startup|innovaci|negocio|empresari", re.I)
FUERA = re.compile(r"\b(muere|muerte|asesin|detenid|crimen|robo|robaron|accidente|incendio|baleo|balacera)", re.I)


def hoy_chile():
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo("America/Santiago")).date()


def limpiar(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()


def noticias(estado, hoy):
    vistos, out, leidas = set(), [], 0
    for q in CONSULTAS:
        url = B._bing(q)
        if not B.robots_permite(url, estado):
            continue
        x = B.pedir(url, estado, "eventos_empr", como="text", espera=(0, 15), limite=40)
        if not x:
            continue
        leidas += 1
        for n in B.leer_feed(x, "Bing Noticias") or []:   # el mismo lector que ya usa el robot (enlace directo al medio)
            t, u = n["titulo"], n["url"]
            src = n["fuente"] if not str(n["fuente"]).startswith("Bing") else urlparse(u).hostname.replace("www.", "")
            try:
                f = dt.date.fromisoformat(n["fecha"][:10])
            except Exception:
                continue
            if not t or not u.startswith("http") or (hoy - f).days > 21 or f > hoy:
                continue
            if not (CLAVES.search(t) and TEMA.search(t)) or FUERA.search(t):
                continue
            k = re.sub(r"[^a-z0-9]", "", t.lower())[:60]
            if k in vistos:
                continue
            vistos.add(k)
            out.append({"titulo": t, "url": u, "fecha": f.isoformat(), "medio": src})
    if not leidas:   # sin conexión con las fuentes (p. ej., fuera de GitHub): se conservan las noticias anteriores
        return None
    out.sort(key=lambda z: z["fecha"], reverse=True)
    return out[:8]


def fin_efectivo(e):
    """25-11-2026 (Germán: «las actividades que se hayan realizado y pasada la fecha las eliminas del Newsletter»). Último día vigente:
    el término; si solo se sabe el mes, el último día de ese mes; un concurso sin cierre, 60 días desde que abre; un evento sin término,
    su mismo día. Lo mismo hace el sitio (evFinEf en sitio/modulos/eventos_empr.js)."""
    if e.get("fin"):
        return e["fin"]
    i = e.get("inicio") or "0000-01-01"
    if e.get("solo_mes"):
        a, m = int(i[:4]), int(i[5:7])
        return (dt.date(a + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)).isoformat()
    if e.get("tipo") == "concurso":
        return (dt.date.fromisoformat(i) + dt.timedelta(days=60)).isoformat()
    return i


TIPOS = {"feria", "evento", "concurso"}
OBLIG = ("id", "tipo", "nombre", "inicio", "lugar", "desc", "url", "fuente")


def revisar(e, hoy, ids):
    """Motivo por el que una ficha propuesta no entra, o "" si está bien."""
    for k in OBLIG:
        if not str(e.get(k) or "").strip():
            return f"falta {k}"
    if e["tipo"] not in TIPOS:
        return "tipo debe ser feria, evento o concurso"
    for k in ("inicio", "fin"):
        v = e.get(k) or ""
        if v and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            return f"{k} no es AAAA-MM-DD"
    if e.get("fin") and e["fin"] < e["inicio"]:
        return "fin antes que inicio"
    if fin_efectivo(e) < hoy.isoformat():
        return "ya pasó"
    if not re.match(r"https://[^\s\"'<>]+$", e["url"]):
        return "url debe ser https"
    # 25-11-2026 (Germán): botón «Ver» para ingresar e inscribirse, y el valor y los requisitos cuando la actividad se paga
    if not re.match(r"https://[^\s\"'<>]+$", str(e.get("inscripcion") or "")):
        return "falta inscripcion (https de la página oficial para ver e inscribirse)"
    if e.get("costo") != "gratis" and not str(e.get("valor") or "").strip():
        return "si no es gratis, falta valor (cuánto se paga, o «Sin valor publicado» con dónde se buscó)"
    if len(e.get("valor") or "") > 140 or len(e.get("requisitos") or "") > 200:
        return "valor de más de 140 o requisitos de más de 200 caracteres"
    if e["id"] in ids:
        return "ya está"
    if len(e["desc"]) > 260 or len(e.get("desc_en") or "") > 260:
        return "descripción de más de 260 caracteres"
    return ""


def _clave(t):
    return re.sub(r"[^a-z0-9]", "", (t or "").lower().translate(str.maketrans("áéíóúñü", "aeiounu")))


def pendientes(hoy, base, dias=120):
    """25-11-2026 (Germán: «falta incluir la Exponaval, entre muchas otras actividades»). Recurrentes cuyo mes llega dentro de `dias`
    y que no tienen ficha vigente: la tarea diaria y el Guardián deben buscar su fecha oficial y agregarlas. La clave se busca en el id
    y el nombre de las fichas; «minimo» exige varias fichas (por ejemplo, ferias navideñas de distintas comunas)."""
    try:
        rec = json.load(open(os.path.join(AQUI, "eventos-recurrentes.json"), encoding="utf-8"))["eventos"]
    except Exception:
        return []
    vig = [e for e in base.get("eventos", []) if (e.get("fin") or e.get("inicio") or "") >= hoy.isoformat()]
    out = []
    for r in rec:
        prox = None
        for k in range(0, dias + 1, 7):   # semana a semana: ¿cae su mes en la ventana y en el año que corresponde?
            f = hoy + dt.timedelta(days=k)
            if f.strftime("%Y-%m") <= (r.get("hecho") or ""):   # esa edición ya se cubrió o ya pasó
                continue
            if f.month in r["meses"] and (r.get("cada", 1) == 1 or (f.year % 2 == 0) == (r.get("paridad") == "par")):
                prox = f
                break
        if not prox:
            continue
        hay = sum(1 for e in vig if r["clave"] in _clave(e.get("id")) + _clave(e.get("nombre")))
        if hay < r.get("minimo", 1):
            out.append({"nombre": r["nombre"], "mes": prox.strftime("%Y-%m"), "sitio": r["sitio"], "fichas": hay, "minimo": r.get("minimo", 1)})
    return out


def agregar(archivo):
    """La tarea diaria propone fichas verificadas (rule 42): solo entran las completas, futuras y nuevas."""
    ruta = os.path.join(AQUI, "eventos-base.json")
    base = json.load(open(ruta, encoding="utf-8"))
    hoy = hoy_chile()
    ids = {e["id"] for e in base["eventos"]} | {re.sub(r"[^a-z0-9]", "", e["nombre"].lower()) for e in base["eventos"]}
    nuevas = json.load(open(archivo, encoding="utf-8"))
    entran = 0
    for e in nuevas if isinstance(nuevas, list) else []:
        e = {k: (v.strip() if isinstance(v, str) else v) for k, v in e.items()}
        m = revisar(e, hoy, ids) or ("ya está" if re.sub(r"[^a-z0-9]", "", e.get("nombre", "").lower()) in ids else "")
        print(("ENTRA " if not m else "NO ENTRA ") + e.get("nombre", "?") + ("" if not m else f" ({m})"))
        if not m:
            e["agregado"] = hoy.isoformat()
            base["eventos"].append(e)
            ids |= {e["id"], re.sub(r"[^a-z0-9]", "", e["nombre"].lower())}
            entran += 1
    if entran:
        base["verificado"] = hoy.isoformat()
        json.dump(base, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"entraron {entran}")


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "agregar":
        return agregar(sys.argv[2])
    if len(sys.argv) > 1 and sys.argv[1] == "pendientes":   # lo que falta investigar hoy (tarea diaria y Guardián)
        p = pendientes(hoy_chile(), json.load(open(os.path.join(AQUI, "eventos-base.json"), encoding="utf-8")))
        for r in p:
            print(f"POR INVESTIGAR {r['nombre']} · mes {r['mes']} · fichas {r['fichas']} de {r['minimo']} · {r['sitio']}")
        print(f"pendientes {len(p)}")
        return
    salida = os.path.join(os.path.dirname(AQUI), "datos", "eventos-emprendimiento.json")
    hoy = hoy_chile()
    base = json.load(open(os.path.join(AQUI, "eventos-base.json"), encoding="utf-8"))
    vigentes = [e for e in base.get("eventos", []) if fin_efectivo(e) >= hoy.isoformat()]   # lo que ya pasó sale solo (25-11-2026)
    vigentes.sort(key=lambda e: (e.get("inicio") or "9999", e.get("nombre", "")))
    estado = {}
    try:
        nots = noticias(estado, hoy)
    except Exception as ex:   # las noticias son un extra: nunca botan las fichas
        print("noticias: falla", type(ex).__name__, ex)
        nots = None
    if nots is None:
        try:
            nots = json.load(open(salida, encoding="utf-8")).get("noticias", [])
        except Exception:
            nots = []
    datos = {"generado": dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).isoformat(timespec="minutes"), "verificado": base.get("verificado"),
             "eventos": vigentes, "noticias": nots, "por_investigar": pendientes(hoy, base)}
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    json.dump(datos, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    foto = os.path.join(os.path.dirname(salida), "eventos", hoy.isoformat() + ".json")   # la edición de cada día lee su foto
    os.makedirs(os.path.dirname(foto), exist_ok=True)
    json.dump(datos, open(foto, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"eventos-emprendimiento.json: {len(vigentes)} fichas, {len(nots)} noticias")


if __name__ == "__main__":
    main()
