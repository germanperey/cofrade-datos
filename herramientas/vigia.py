"""Vigía de Cofrade News (15-11-2026). Corre en GitHub cada 3 horas.

Germán: «agrega un auditor que todos los días revise al menos cada 6 horas si hay algún error en algún contenido y/o en el
funcionamiento de alguna aplicación (medios de pago, formularios, suscripción Socios, gráficos, etc.) para repararlo automáticamente»;
el mismo día, a las 07:21: «que el "auditor" revise, audite, repare y mejore todo cada 3 horas (en vez de cada 6 horas)».

Revisa el sitio como un lector (portada, edición del día, gráficos dibujados, que no falte ningún gráfico ni sección de la edición
anterior, sin errores de JavaScript, Buzón, Socios, Mercado Pago a
través de /salud, Mercados) y los datos de GitHub (frescura de los datos del día y del Pulso, corridas fallidas). Repara SOLO lo que es
seguro y reversible: vuelve a correr las bajadas de datos y del Pulso, vuelve a correr una vez los trabajos fallidos y rehace el índice
de ediciones. Nunca cobra, nunca completa captchas, nunca envía formularios reales. Lo que no se puede reparar aquí queda en
datos/salud-sitio.json (lo lee el auditor de Claude) y en un aviso (issue) del repositorio, que GitHub le manda a Germán por correo.

python3 herramientas/vigia.py [--sin-navegador] [--sin-reparar]
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time

import requests

SITIO = os.environ.get("VIGIA_SITIO", "https://www.cofrad.es")
REPO = os.environ.get("GITHUB_REPOSITORY", "germanperey/cofrade-datos")
API = f"https://api.github.com/repos/{REPO}"
UA = "CofradeNews-Vigia/1.0 (revision del propio sitio; github.com/germanperey/cofrade-datos)"
try:   # 15-11-2026 (auditoría, pendiente 13): hora de Chile real todo el año (UTC-3 en verano, UTC-4 de abril a septiembre)
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("America/Santiago")
except Exception:   # sin base de husos horarios en la máquina: horario de verano de Chile
    TZ = dt.timezone(dt.timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ahora():
    return dt.datetime.now(TZ)


class Informe:
    def __init__(self):
        self.revisiones, self.reparaciones = [], []

    def ok(self, nombre, bien, detalle="", grave=True):
        self.revisiones.append({"nombre": nombre, "ok": bool(bien), "detalle": "" if bien else str(detalle)[:400], "grave": grave})
        print(("OK    " if bien else ("FALLA " if grave else "AVISO ")) + nombre + ("" if bien else f" · {detalle}"))
        return bien

    def reparar(self, que, hecho, detalle=""):
        self.reparaciones.append({"que": que, "hecho": bool(hecho), "detalle": str(detalle)[:300]})
        print(("REPARADO " if hecho else "NO SE PUDO REPARAR ") + que + (f" · {detalle}" if detalle else ""))

    @property
    def graves(self):
        return [r for r in self.revisiones if not r["ok"] and r["grave"]]


def pedir(url, **kw):
    kw.setdefault("timeout", 40)
    kw.setdefault("headers", {"User-Agent": UA})
    return requests.request(kw.pop("metodo", "GET"), url, **kw)


def gh(metodo, ruta, **kw):
    tok = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not tok:
        return None
    h = {"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json", "User-Agent": UA}
    try:
        return requests.request(metodo, API + ruta, headers=h, timeout=30, **kw)
    except requests.RequestException:
        return None


def fecha_esperada(t=None):
    """La edición sale a las 07:30 y demora hasta ~1,5 h: desde las 10:00 se espera la de hoy; antes, la de ayer basta."""
    t = t or ahora()
    return t.date() if t.hour >= 10 else t.date() - dt.timedelta(days=1)


# 17-11-2026 (Germán: «En el Landing page de www.cofrad.es está incompleta la cantidad de Indicadores económicos»): el vigía solo
# miraba que el pulso fuera reciente, y desde el 16-11 salía reciente pero sin dólar, euro, UF, UTM ni cobre. Ahora revisa también que
# estén TODAS las cifras: en el pulso (datos/pulso.json) y en la portada publicada.
VIVO_REQUERIDAS = {"dolar": "Dólar observado", "euro": "Euro", "uf": "UF", "utm": "UTM", "tpm": "TPM", "libra_cobre": "Cobre (libra)"}
VIVO_MERCADOS = ("S&P 500", "Nasdaq", "Dow Jones", "Petróleo Brent")
VIVO_PORTADA = ("Dólar observado", "Euro", "UF", "UTM", "TPM", "IPSA (puntos)", "S&P 500", "Nasdaq", "Dow Jones", "Cobre", "Petróleo Brent", "Bitcoin")


def _es_cifra(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def faltan_en_pulso(pu):
    """Cifras que el pulso debería traer y no trae → lista de nombres."""
    pu = pu if isinstance(pu, dict) else {}
    hay = {x.get("clave") for x in pu.get("indicadores") or [] if isinstance(x, dict) and _es_cifra(x.get("valor"))}
    faltan = [n for k, n in VIVO_REQUERIDAS.items() if k not in hay]
    if not _es_cifra((pu.get("ipsa") or {}).get("valor")):
        faltan.append("IPSA")
    merc = {m.get("nombre") for m in pu.get("mercados") or [] if isinstance(m, dict) and _es_cifra(m.get("valor"))}
    faltan += [n for n in VIVO_MERCADOS if n not in merc]
    if not _es_cifra((pu.get("bitcoin") or {}).get("bitcoin_usd")):
        faltan.append("Bitcoin")
    return faltan


def faltan_en_portada(h):
    """Cifras que la portada publicada no muestra en «En vivo» (se compara el nombre, sin la fecha) → lista de nombres."""
    m = re.search(r'<section id="en-vivo".*?</section>', h or "", re.S)
    nombres = [html.unescape(x).split(" · ")[0].strip() for x in re.findall(r'<div class="cifra[^"]*"><small>([^<]*)</small>', m.group(0) if m else "")]
    return [n for n in VIVO_PORTADA if not any(x == n or (n == "Cobre" and x.startswith("Cobre")) for x in nombres)]


def revisar_sitio(inf):
    try:
        r = pedir(SITIO + "/")
        inf.ok("Portada responde", r.status_code == 200, f"HTTP {r.status_code}")
        inf.ok("Portada completa (galería y «En vivo»)", 'class="g-fila"' in r.text and 'id="en-vivo"' in r.text,
               "faltan la galería o el bloque «En vivo»")
        f = faltan_en_portada(r.text) if r.status_code == 200 else list(VIVO_PORTADA)
        inf.ok("«En vivo» de la portada con todos los indicadores", not f, "no se ven: " + ", ".join(f))
    except requests.RequestException as ex:
        inf.ok("Portada responde", False, type(ex).__name__)
    fecha = None
    try:
        r = pedir(SITIO + "/edicion", allow_redirects=False)
        loc = r.headers.get("Location", "")
        fecha = loc.rstrip("/").split("/")[-1] if "/edicion/" in loc else None
        esperada = fecha_esperada()
        inf.ok("La edición más nueva está publicada", bool(fecha) and fecha >= esperada.isoformat(),
               f"el sitio lleva a {fecha or 'ninguna'}; se espera {esperada.isoformat()} o más nueva")
    except requests.RequestException as ex:
        inf.ok("La edición más nueva está publicada", False, type(ex).__name__)
    for ruta, que in (("/mercados", "Mercados"), ("/socios", "Socios"), ("/socios/condiciones", "Condiciones de Socios")):
        try:
            r = pedir(SITIO + ruta)
            inf.ok(f"{que} responde", r.status_code == 200, f"HTTP {r.status_code}")
        except requests.RequestException as ex:
            inf.ok(f"{que} responde", False, type(ex).__name__)
    try:   # el Buzón rechaza bien un envío vacío (nunca se envía uno real)
        r = pedir(SITIO + "/buzon", metodo="POST", json={}, headers={"User-Agent": UA, "Content-Type": "application/json"})
        inf.ok("Buzón responde a un envío inválido sin caerse", r.status_code < 500, f"HTTP {r.status_code}")
    except requests.RequestException as ex:
        inf.ok("Buzón responde a un envío inválido sin caerse", False, type(ex).__name__)
    try:
        r = pedir(SITIO + "/salud")
        j = r.json() if r.status_code == 200 else {}
        inf.ok("Base de datos de Socios y Buzón (D1)", j.get("d1") is True, json.dumps(j)[:200] or f"HTTP {r.status_code}")
        if j.get("mp_configurado"):
            inf.ok("Mercado Pago acepta la llave del sitio", j.get("mp_api") is True, "la API de Mercado Pago no aceptó la consulta de prueba")
        inf.ok("Captcha del Buzón configurado", j.get("turnstile") is True, "falta el secreto de Turnstile", grave=False)
    except (requests.RequestException, ValueError) as ex:
        inf.ok("Base de datos de Socios y Buzón (D1)", False, type(ex).__name__)
    return fecha


def revisar_navegador(inf, fecha):
    """Edición y portada en Chromium: sin errores de JavaScript y con TODOS los gráficos dibujados (la capa LENTO los dibuja al
    llegar a ellos, por eso se recorre la página completa)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        inf.ok("Navegador de prueba disponible", False, "playwright no está instalado", grave=False)
        return
    with sync_playwright() as p:
        b = None
        try:
            b = p.chromium.launch()
            for ruta, que in ((f"/edicion/{fecha}", "Edición"), ("/", "Portada")):
                if not fecha and ruta.startswith("/edicion"):
                    continue
                pg = b.new_page(viewport={"width": 1280, "height": 900}, user_agent=UA)
                errores = []
                pg.on("pageerror", lambda e, L=errores: L.append(str(e)[:200]))
                pg.goto(SITIO + ruta, wait_until="load", timeout=120000)
                pg.wait_for_timeout(2500)
                if que == "Edición":
                    # 15-11-2026 (primera corrida: «195 de 245 sin dibujar»): la capa LENTO dibuja cada gráfico cuando el lector llega
                    # a él. Se lleva cada gráfico VISIBLE a la pantalla y se espera un momento; los de pestañas, páginas o ventanas
                    # cerradas (meses anteriores del Congreso, fichas de otra página) no cuentan: se dibujan al abrirlos.
                    r = pg.evaluate("""async()=>{const completa=!!document.querySelector('.hoja');
                        const oculto=c=>{if(!c.offsetParent||c.getBoundingClientRect().width<10)return true;
                          for(let p=c;p;p=p.parentElement){if(p.hidden||p.getAttribute&&p.getAttribute('aria-hidden')==='true')return true;
                            if(p.tagName==='DETAILS'&&!p.open)return true;if(p.tagName==='DIALOG'&&!p.open)return true;
                            const cs=getComputedStyle(p);if(cs.display==='none'||cs.visibility==='hidden'||cs.contentVisibility==='hidden')return true}return false};
                        const cs=[...document.querySelectorAll(completa?'.chart':'.graf')].filter(c=>!oculto(c));const vacios=[];
                        for(const c of cs){if(c.querySelector('canvas,svg'))continue;c.scrollIntoView({block:'center'});
                          for(let k=0;k<12&&!c.querySelector('canvas,svg');k++)await new Promise(r=>setTimeout(r,150));
                          if(!c.querySelector('canvas,svg'))vacios.push(c.id||c.getAttribute('aria-label')||'?')}
                        return {completa,total:cs.length,vacios,volver:!!document.getElementById('cnVolver'),subir:!!document.getElementById('cnSubir')}}""")
                    inf.ok(f"Edición {fecha}: se sirve la edición completa (no la liviana de respaldo)", r["completa"],
                           "el sitio está mostrando la edición liviana: falta la completa en GitHub", grave=False)
                    minimo = 10 if r["completa"] else 0
                    inf.ok(f"Edición {fecha}: gráficos dibujados", r["total"] >= minimo and not r["vacios"],
                           f"{len(r['vacios'])} de {r['total']} sin dibujar: {', '.join(r['vacios'][:6])}" if r["total"] >= minimo
                           else f"solo {r['total']} gráfico(s) en la página")
                    inf.ok(f"Edición {fecha}: flecha para volver y botón para subir", r["volver"] and r["subir"], r)
                inf.ok(f"{que}: sin errores de JavaScript", not errores, "; ".join(errores[:3]))
                pg.close()
        except Exception as ex:   # noqa: BLE001 — una falla del navegador de prueba no es una falla del sitio
            inf.ok("Revisión en el navegador", False, f"{type(ex).__name__}: {str(ex)[:160]}", grave=False)
        finally:
            if b:
                b.close()


# ---------------------------------------------------------------- que nunca falte nada (15-11-2026)
# Germán: «en la publicación de hoy faltó el gráfico» (Crecimiento anual del PIB) y «este tipo de detalles son importantísimos de verificar
# en los LOOP y la auditoría, para que nunca falte nada de los contenidos». Misma regla que el control de calidad de la Skill
# (scripts/inventario.py): un gráfico fijo o una sección que salió en la edición anterior y hoy no está es GRAVE. No cuentan los gráficos
# numerados (gLey31, gTab9: cambian con las noticias), el mapa de sismos cuando la edición dice que no hubo, ni los del Congreso de una
# cámara al empezar un mes (el mes nuevo parte vacío).
_LEYES = re.compile(r"^gLeyes(?:Ap|Re)_[cs]$")


def inventario_html(h):
    """HTML de la edición completa → {"graficos": {id: nombre}, "secciones": [títulos], "sin_sismos": bool}."""
    h = re.sub(r"<script\b.*?</script>|<style\b.*?</style>|<template\b.*?</template>", " ", h or "", flags=re.S | re.I)
    graficos = {}
    for m in re.finditer(r'<div\s+class="chart[^"]*"([^>]*)>', h):
        i = re.search(r'\bid="([^"]+)"', m.group(1))
        if not i or re.search(r"\d+$", i.group(1)):
            continue
        n = re.search(r'\baria-label="([^"]*)"', m.group(1))
        graficos[i.group(1)] = html.unescape(n.group(1)).strip() if n and n.group(1).strip() else i.group(1)
    secciones = [t for t in (re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip()
                             for x in re.findall(r"<h2\b[^>]*>(.*?)</h2>", h, flags=re.S | re.I)) if t]
    return {"graficos": graficos, "secciones": secciones, "sin_sismos": "No hubo sismos registrados" in h}


def _sin_numero(t):
    return re.sub(r"^\s*\d+\s*[.)]\s*", "", str(t or "")).strip().lower()


def faltantes_edicion(hoy, previa, fecha_hoy, fecha_previa):
    """Inventarios de dos ediciones → lista de lo que falta hoy (vacía si no falta nada)."""
    faltan = []
    for gid, nombre in sorted(previa["graficos"].items()):
        if gid in hoy["graficos"] or (gid == "gSismos" and hoy["sin_sismos"]) or (_LEYES.match(gid) and fecha_hoy[:7] != fecha_previa[:7]):
            continue
        faltan.append(f"gráfico «{nombre}» ({gid})")
    hs = {_sin_numero(t) for t in hoy["secciones"]}
    faltan += [f"sección «{t}»" for t in previa["secciones"] if _sin_numero(t) not in hs]
    return faltan


# 15-11-2026 · el sitio corrige al vuelo 5 puntos del script de la edición para que cargue más rápido (sitio/worker.src.js, PARCHES_APP).
# Si la Skill cambia ese código, el sitio no toca nada y la edición sigue igual, pero más lenta: es un AVISO para actualizar los parches.
MARCAS_RAPIDEZ = {
    "altos del Congreso en tanda": "(window.__cnDiferir?__cnDiferir(el,'height',h+'px')",
    "mínimos de los gráficos en tanda": "(window.__cnAlto?__cnAlto(el,min)",
    "altos de los consolidados en tanda": "__cnDiferir(el,'height',Math.max(140,34*lista.length+40)+'px')",
    "gráficos del Congreso al abrir": "if(window.__cnLeyEspera&&__cnLeyEspera(el,l,li))return;",
    "pestañas tras medir": "new ResizeObserver(upd).observe(g);else upd();",
}


def rapidez_faltante(html):
    """Nombres de las correcciones de rapidez que no se aplicaron a la edición servida (vacío si están todas)."""
    if "const D=" not in html:
        return []
    return [n for n, m in MARCAS_RAPIDEZ.items() if m not in html]


def revisar_contenido(inf, fecha):
    """La edición más nueva contra la anterior publicada (hasta 6 días atrás), tal como las sirve el sitio."""
    if not fecha:
        return
    try:
        r = pedir(f"{SITIO}/edicion/{fecha}")
        if r.status_code == 200:
            falta = rapidez_faltante(r.text)
            inf.ok(f"Edición {fecha}: el sitio aplica sus 5 correcciones de rapidez", not falta,
                   "la Skill cambió ese código; la edición se ve igual pero carga más lenta. Falta: " + ", ".join(falta), grave=False)
        hoy = inventario_html(r.text) if r.status_code == 200 else None
        if not hoy or len(hoy["graficos"]) < 10:
            return   # sin la edición completa no se compara (eso ya lo dice la revisión «se sirve la edición completa»)
        f0 = dt.date.fromisoformat(fecha)
        for k in range(1, 7):
            fp = (f0 - dt.timedelta(days=k)).isoformat()
            rp = pedir(f"{SITIO}/edicion/{fp}", allow_redirects=False)
            previa = inventario_html(rp.text) if rp.status_code == 200 else None
            if previa and len(previa["graficos"]) >= 10:
                faltan = faltantes_edicion(hoy, previa, fecha, fp)
                inf.ok(f"Edición {fecha}: no falta nada de lo que salió el {fp}", not faltan,
                       f"falta(n) {len(faltan)}: " + "; ".join(faltan[:8]))
                return
    except (requests.RequestException, ValueError) as ex:
        inf.ok(f"Edición {fecha}: comparación con la edición anterior", False, type(ex).__name__, grave=False)


def _hora(x):
    try:
        t = dt.datetime.fromisoformat(str(x))
        return t if t.tzinfo else t.replace(tzinfo=TZ)
    except (TypeError, ValueError):
        return None


def revisar_datos(inf, reparar):
    t = ahora()
    try:
        est = json.load(open(os.path.join(RAIZ, "datos", "estado.json"), encoding="utf-8"))
        horas = [_hora(v.get("hora")) for v in (est.get("fuentes") or {}).values() if isinstance(v, dict)]
        ult = max([h for h in horas if h] or [None], key=lambda h: h or dt.datetime.min.replace(tzinfo=TZ))
        # auditoría del 15-11: la bajada corre de madrugada (hasta ~08:20); a las 16:23 eso NO es «viejo». Viejo = sin corrida de hoy,
        # o pasadas las 09:00 sin una corrida de las 05:00 en adelante.
        u = ult.astimezone(TZ) if ult else None
        viejo = u is None or u.date() < t.date() or (t.hour >= 9 and u.hour < 5)
        if not inf.ok("Datos del día al día (bajada de GitHub)", not viejo or t.hour < 6,
                      f"última bajada {ult.isoformat(timespec='minutes') if ult else 'desconocida'}"):
            if reparar:
                r = gh("POST", "/actions/workflows/cofrade-datos.yml/dispatches", json={"ref": "main"})
                inf.reparar("Volver a bajar los datos del día", r is not None and r.status_code == 204, f"HTTP {getattr(r, 'status_code', 'sin token')}")
    except (OSError, ValueError) as ex:
        inf.ok("Datos del día al día (bajada de GitHub)", False, type(ex).__name__)
    try:
        pu = json.load(open(os.path.join(RAIZ, "datos", "pulso.json"), encoding="utf-8"))
        g = _hora(pu.get("generado"))
        viejo = g is None or (t - g).total_seconds() > 3 * 3600
        al_dia = inf.ok("«En vivo» de la portada al día (Pulso)", not viejo or not (8 <= t.hour <= 23), f"generado {pu.get('generado')}")
        faltan = faltan_en_pulso(pu)
        completo = inf.ok("«En vivo» con todos los indicadores (Pulso)", not faltan, "faltan: " + ", ".join(faltan))
        if not (al_dia and completo):
            if reparar:
                r = gh("POST", "/actions/workflows/pulso.yml/dispatches", json={"ref": "main"})
                inf.reparar("Volver a generar el Pulso", r is not None and r.status_code == 204, f"HTTP {getattr(r, 'status_code', 'sin token')}")
    except (OSError, ValueError) as ex:
        inf.ok("«En vivo» de la portada al día (Pulso)", False, type(ex).__name__)


def revisar_corridas(inf, reparar):
    """Corridas de GitHub fallidas en las últimas 24 h: se vuelve a correr UNA vez cada una (solo sus trabajos fallidos)."""
    r = gh("GET", "/actions/runs?per_page=40")
    if r is None or r.status_code != 200:
        inf.ok("Corridas de GitHub revisadas", False, "sin acceso a la API de GitHub", grave=False)
        return
    desde = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    fallidas = []
    for w in r.json().get("workflow_runs") or []:
        creada = dt.datetime.fromisoformat(w["created_at"].replace("Z", "+00:00"))
        if creada >= desde and w.get("conclusion") == "failure" and w.get("name") != "Vigía del sitio":
            fallidas.append(w)
    vistas = set()
    for w in fallidas:
        if w["name"] in vistas:
            continue
        vistas.add(w["name"])
        inf.ok(f"Corrida «{w['name']}» sin fallas", False, f"falló el {w['created_at']}", grave=False)
        if reparar and int(w.get("run_attempt") or 1) < 2:
            x = gh("POST", f"/actions/runs/{w['id']}/rerun-failed-jobs")
            inf.reparar(f"Volver a correr «{w['name']}»", x is not None and x.status_code in (201, 204), f"HTTP {getattr(x, 'status_code', '?')}")
    if not fallidas:
        inf.ok("Corridas de GitHub de las últimas 24 h sin fallas", True)


def graves_previos(ruta):
    """Fallas graves del informe anterior y su hora: con 8 vueltas al día, para no repetir el mismo aviso en cada vuelta."""
    try:
        p = json.load(open(ruta, encoding="utf-8"))
        return {x["nombre"] for x in p.get("revisiones") or [] if not x.get("ok") and x.get("grave")}, _hora(p.get("generado"))
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return None, None


def avisar(inf, previos=(None, None)):
    """Un aviso (issue) abierto mientras haya fallas graves; se cierra solo cuando todo vuelve a estar bien.
    15-11-2026 (vigía cada 3 horas): cada comentario le llega a Germán como correo de GitHub. Con las mismas fallas que la vuelta
    anterior no se comenta de nuevo, salvo un recordatorio al día (la primera vuelta desde las 09:00)."""
    r = gh("GET", "/issues?state=open&labels=vigia&per_page=5")
    abiertos = r.json() if r is not None and r.status_code == 200 else []
    if inf.graves:
        cuerpo = ("El vigía de las " + ahora().strftime("%H:%M del %d-%m-%Y") + " encontró:\n\n"
                  + "\n".join(f"- {g['nombre']}: {g['detalle']}" for g in inf.graves)
                  + ("\n\nReparaciones intentadas:\n" + "\n".join(f"- {x['que']}: {'hecho' if x['hecho'] else 'no se pudo'}" for x in inf.reparaciones)
                     if inf.reparaciones else "")
                  + "\n\nEl auditor de Claude lee este informe (datos/salud-sitio.json) y sigue con la reparación.")
        if abiertos:
            antes, cuando = previos
            t = ahora()
            recordatorio = t.hour >= 9 and (cuando is None or cuando.astimezone(TZ) < t.replace(hour=9, minute=0, second=0, microsecond=0))
            if antes == {g["nombre"] for g in inf.graves} and not recordatorio:
                print("Aviso abierto con las mismas fallas de la vuelta anterior: no se repite el comentario")
            else:
                gh("POST", f"/issues/{abiertos[0]['number']}/comments", json={"body": cuerpo})
        else:
            gh("POST", "/issues", json={"title": "Vigía de Cofrade News: algo necesita atención", "body": cuerpo, "labels": ["vigia"]})
    else:
        for x in abiertos:
            gh("POST", f"/issues/{x['number']}/comments", json={"body": "Todo volvió a estar bien (vigía de las " + ahora().strftime("%H:%M del %d-%m") + ")."})
            gh("PATCH", f"/issues/{x['number']}", json={"state": "closed"})


def main(argv=None):
    a = argparse.ArgumentParser()
    a.add_argument("--sin-navegador", action="store_true")
    a.add_argument("--sin-reparar", action="store_true")
    a.add_argument("--salida", default=os.path.join(RAIZ, "datos", "salud-sitio.json"))
    a = a.parse_args(argv)
    inf = Informe()
    previos = graves_previos(a.salida)   # el informe de la vuelta anterior, antes de reemplazarlo
    fecha = revisar_sitio(inf)
    if not a.sin_navegador:
        revisar_navegador(inf, fecha)
    revisar_contenido(inf, fecha)
    revisar_datos(inf, not a.sin_reparar)
    revisar_corridas(inf, not a.sin_reparar)
    salida = {"generado": ahora().isoformat(timespec="seconds"), "ok": not inf.graves, "graves": len(inf.graves),
              "revisiones": inf.revisiones, "reparaciones": inf.reparaciones}
    os.makedirs(os.path.dirname(a.salida), exist_ok=True)
    json.dump(salida, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not a.sin_reparar:
        avisar(inf, previos)
    print(f"\n{'TODO BIEN' if not inf.graves else str(len(inf.graves)) + ' FALLA(S) GRAVE(S)'} · {len(inf.revisiones)} revisiones · "
          f"{len(inf.reparaciones)} reparaciones")
    return 0   # el vigía informa; nunca deja la corrida en rojo por una falla del sitio (eso lo dice el informe)


if __name__ == "__main__":
    sys.exit(main())
