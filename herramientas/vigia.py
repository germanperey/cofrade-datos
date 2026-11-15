"""Vigía de Cofrade News (15-11-2026). Corre en GitHub cada 6 horas.

Germán: «agrega un auditor que todos los días revise al menos cada 6 horas si hay algún error en algún contenido y/o en el
funcionamiento de alguna aplicación (medios de pago, formularios, suscripción Socios, gráficos, etc.) para repararlo automáticamente».

Revisa el sitio como un lector (portada, edición del día, gráficos dibujados, sin errores de JavaScript, Buzón, Socios, Mercado Pago a
través de /salud, Mercados) y los datos de GitHub (frescura de los datos del día y del Pulso, corridas fallidas). Repara SOLO lo que es
seguro y reversible: vuelve a correr las bajadas de datos y del Pulso, vuelve a correr una vez los trabajos fallidos y rehace el índice
de ediciones. Nunca cobra, nunca completa captchas, nunca envía formularios reales. Lo que no se puede reparar aquí queda en
datos/salud-sitio.json (lo lee el auditor de Claude) y en un aviso (issue) del repositorio, que GitHub le manda a Germán por correo.

python3 herramientas/vigia.py [--sin-navegador] [--sin-reparar]
"""
import argparse
import datetime as dt
import json
import os
import sys
import time

import requests

SITIO = os.environ.get("VIGIA_SITIO", "https://www.cofrad.es")
REPO = os.environ.get("GITHUB_REPOSITORY", "germanperey/cofrade-datos")
API = f"https://api.github.com/repos/{REPO}"
UA = "CofradeNews-Vigia/1.0 (revision del propio sitio; github.com/germanperey/cofrade-datos)"
TZ = dt.timezone(dt.timedelta(hours=-3))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ahora():
    return dt.datetime.now(TZ)


class Informe:
    def __init__(self):
        self.revisiones, self.reparaciones = [], []

    def ok(self, nombre, bien, detalle="", grave=True):
        self.revisiones.append({"nombre": nombre, "ok": bool(bien), "detalle": str(detalle)[:400], "grave": grave})
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


def revisar_sitio(inf):
    try:
        r = pedir(SITIO + "/")
        inf.ok("Portada responde", r.status_code == 200, f"HTTP {r.status_code}")
        inf.ok("Portada completa (galería y «En vivo»)", 'class="g-fila"' in r.text and 'id="en-vivo"' in r.text,
               "faltan la galería o el bloque «En vivo»")
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
        b = p.chromium.launch()
        try:
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
                    minimo = 10 if r["completa"] else 1
                    inf.ok(f"Edición {fecha}: gráficos dibujados", r["total"] >= minimo and not r["vacios"],
                           f"{len(r['vacios'])} de {r['total']} sin dibujar: {', '.join(r['vacios'][:6])}" if r["total"] >= minimo
                           else f"solo {r['total']} gráfico(s) en la página")
                    inf.ok(f"Edición {fecha}: flecha para volver y botón para subir", r["volver"] and r["subir"], r)
                inf.ok(f"{que}: sin errores de JavaScript", not errores, "; ".join(errores[:3]))
                pg.close()
        except Exception as ex:   # noqa: BLE001 — una falla del navegador de prueba no es una falla del sitio
            inf.ok("Revisión en el navegador", False, f"{type(ex).__name__}: {str(ex)[:160]}", grave=False)
        finally:
            b.close()


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
        viejo = ult is None or (t - ult).total_seconds() > 8 * 3600
        if not inf.ok("Datos del día al día (bajada de GitHub)", not viejo or not (6 <= t.hour <= 23),
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
        if not inf.ok("«En vivo» de la portada al día (Pulso)", not viejo or not (8 <= t.hour <= 23),
                      f"generado {pu.get('generado')}"):
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


def avisar(inf):
    """Un aviso (issue) abierto mientras haya fallas graves; se cierra solo cuando todo vuelve a estar bien."""
    r = gh("GET", "/issues?state=open&labels=vigia&per_page=5")
    abiertos = r.json() if r is not None and r.status_code == 200 else []
    if inf.graves:
        cuerpo = ("El vigía de las " + ahora().strftime("%H:%M del %d-%m-%Y") + " encontró:\n\n"
                  + "\n".join(f"- {g['nombre']}: {g['detalle']}" for g in inf.graves)
                  + ("\n\nReparaciones intentadas:\n" + "\n".join(f"- {x['que']}: {'hecho' if x['hecho'] else 'no se pudo'}" for x in inf.reparaciones)
                     if inf.reparaciones else "")
                  + "\n\nEl auditor de Claude lee este informe (datos/salud-sitio.json) y sigue con la reparación.")
        if abiertos:
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
    fecha = revisar_sitio(inf)
    if not a.sin_navegador:
        revisar_navegador(inf, fecha)
    revisar_datos(inf, not a.sin_reparar)
    revisar_corridas(inf, not a.sin_reparar)
    salida = {"generado": ahora().isoformat(timespec="seconds"), "ok": not inf.graves, "graves": len(inf.graves),
              "revisiones": inf.revisiones, "reparaciones": inf.reparaciones}
    os.makedirs(os.path.dirname(a.salida), exist_ok=True)
    json.dump(salida, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not a.sin_reparar:
        avisar(inf)
    print(f"\n{'TODO BIEN' if not inf.graves else str(len(inf.graves)) + ' FALLA(S) GRAVE(S)'} · {len(inf.revisiones)} revisiones · "
          f"{len(inf.reparaciones)} reparaciones")
    return 0   # el vigía informa; nunca deja la corrida en rojo por una falla del sitio (eso lo dice el informe)


if __name__ == "__main__":
    sys.exit(main())
