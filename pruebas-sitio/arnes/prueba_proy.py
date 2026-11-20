#!/usr/bin/env python3
"""Pruebas de «Proyección de crecimiento en Chile durante los próximos 4 años» en el sitio (arnés local + navegador real).
python3 prueba_proy.py <bundle.min.js> <puerto> [datos.json]"""
import json, os, re, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

W, P = sys.argv[1], int(sys.argv[2])
DATOS = sys.argv[3] if len(sys.argv) > 3 else "/tmp/titulos/proy/datos/prueba-sintetica.json"
B = f"http://localhost:{P}"
SOLO = set(filter(None, (os.environ.get("SOLO") or "").split(",")))
CAP = "/tmp/titulos/proy/cap"
os.makedirs(CAP, exist_ok=True)
oks, fallas, errores = [], [], []


def chk(c, nombre, det=""):
    (oks if c else fallas).append(nombre)
    print(("OK   " if c else "FALLA") + " " + nombre + ("" if c or det == "" else "  · " + str(det)[:400]), flush=True)


def toca(n): return not SOLO or n in SOLO


def servidor(extra=None):
    env = dict(os.environ, PUERTO=str(P), ED_EXTRA="/tmp/titulos/proy/ed", PROY_ARCHIVO=DATOS, PROY_FOTOS=os.environ.get("PROY_FOTOS", "/tmp/titulos/proy/sin-fotos"))
    env.update(extra or {})
    s = subprocess.Popen(["node", "servidor.mjs", W], cwd="/tmp/mf/prueba", env=env, stdout=open(f"/tmp/titulos/proy/srv{P}.log", "w"), stderr=subprocess.STDOUT)
    for _ in range(120):
        try:
            urllib.request.urlopen(B + "/manifest.webmanifest", timeout=2); break
        except Exception:
            time.sleep(0.5)
    return s


def abrir(nav, tel=False, ls=None, url="/edicion/2026-11-19"):
    c = nav.new_context(**(dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True) if tel else dict(viewport={"width": 1280, "height": 900})))
    c.add_init_script("try{localStorage.setItem('cn-voz', JSON.stringify({e:'no'}))}catch(e){}")
    if ls: c.add_init_script(ls)
    pg = c.new_page(); pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto(B + url, wait_until="load", timeout=180000)
    pg.wait_for_timeout(800)
    return c, pg


def ir_al_bloque(pg):
    pg.evaluate("() => document.getElementById('proyw').scrollIntoView({block: 'start'})")
    pg.wait_for_timeout(900)


srv = servidor()
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(args=["--no-sandbox"])
        if toca("lugar"):
            r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60)
            et = r.headers.get("ETag") or ""
            chk(r.status == 200 and "-p" in et, "la etiqueta de la edición lleva la versión de las cifras", et)
            c, pg = abrir(nav)
            pos = pg.evaluate("""() => { const b = document.getElementById('proyw'); if (!b) return null;
              return { n: document.querySelectorAll('#proyw').length, antes: b.previousElementSibling && b.previousElementSibling.id, despues: b.nextElementSibling && b.nextElementSibling.id,
                sec: b.closest('section.sec') && b.closest('section.sec').id }; }""")
            chk(pos == {"n": 1, "antes": "crecw", "despues": "pjw", "sec": "economia"}, "va una sola vez, después de «Crecimiento de Chile» y antes de «Perspectivas 2050»", pos)
            tit = pg.evaluate("() => [...document.querySelectorAll('#proyw > .pc-l')].map(w => [w.lang, w.checkVisibility(), w.querySelector('h3').textContent])")
            chk(tit == [["es", True, "Proyección de crecimiento en Chile durante los próximos 4 años"], ["en", False, "Chile's growth outlook for the next 4 years"]],
                "título exacto de Germán en español; el inglés queda oculto", tit)
            hz = pg.evaluate("() => [!!document.getElementById('horoAnual'), !!document.querySelector('#horoAnual.ha-js'), !!window.__cnVozAPI]")
            chk(hz == [True, True, True], "con el tema nuevo, el horóscopo del año y la voz siguen funcionando", hz)
            ix = pg.evaluate("""() => { const a = document.querySelector('#cnIdx a[data-id="proyw"]'); if (!a) return null; const li = a.closest('li');
              const ant = li.previousElementSibling && li.previousElementSibling.querySelector('a'), sig = li.nextElementSibling && li.nextElementSibling.querySelector('a');
              return [a.textContent, li.className, ant && ant.dataset.id, sig && sig.dataset.id]; }""")
            chk(ix == ["Proyección de crecimiento: próximos 4 años", "cn-sub", "crecw", "pjw"], "el Índice lo muestra entre «Crecimiento de Chile» y «Perspectivas 2050»", ix)
            # el Índice lleva exacto al tema (con la página recién abierta)
            pg.evaluate("() => window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
            pg.click("#cnFab"); pg.wait_for_timeout(400)
            pg.click('#cnIdx a[data-id="proyw"]'); pg.wait_for_timeout(3500)
            top = pg.evaluate("() => Math.round(document.getElementById('proyw').getBoundingClientRect().top)")
            chk(-5 <= top <= 220, "el Índice lleva exacto al tema nuevo", top)
            pg.wait_for_timeout(600)
            g = pg.evaluate("() => [...document.querySelectorAll('#proyw > .pc-l[lang=es] .pc-graf')].map(x => [x.dataset.g, !!x.querySelector('svg'), x.clientWidth])")
            chk(len(g) == 2 and all(x[1] for x in g), "los dos gráficos se dibujan al llegar", g)
            et = pg.evaluate("() => [...document.querySelectorAll('#proyw .pc-l[lang=es] .pc-graf[data-g=pib] text.pc-v')].map(t => t.textContent)")
            d = json.load(open(DATOS, encoding="utf-8"))
            esperado = [("%.1f" % d["promedio"][a]["valor"]).replace(".", ",") + " %" for a in [str(d["anio_base"])] + d["anios"]]
            chk(et == esperado, "cada año muestra el promedio de las instituciones, igual al de los datos", [et, esperado])
            kp = pg.evaluate("() => [...document.querySelectorAll('#proyw .pc-l[lang=es] .kpi')].map(k => k.querySelector('.kn').textContent + ' = ' + k.querySelector('.kv').textContent)")
            chk(len(kp) == 4 and kp[0].startswith("Crecimiento del PIB " + d["anios"][0]) and esperado[1] in kp[0], "4 cifras clave, la primera es el PIB del próximo año", kp)
            filas = pg.evaluate("() => [...document.querySelectorAll('#proyw .pc-l[lang=es] .pc-tabla')[0].querySelectorAll('tbody tr')].length")
            chk(filas == len([x for x in d["instituciones"] if x.get("pib")]), "la tabla trae todas las instituciones", filas)
            ipom = pg.evaluate("() => { const t = [...document.querySelectorAll('#proyw .pc-l[lang=es] .pc-tabla')[0].querySelectorAll('tbody tr')].find(r => /Banco Central \\(IPoM\\)/.test(r.textContent)); return t ? [...t.cells].map(c => c.textContent) : null; }")
            chk(ipom and "0,25–0,75" in ipom and "2–3" in ipom, "el Banco Central muestra sus rangos tal como los publicó", ipom)
            enl = pg.evaluate("() => [...document.querySelectorAll('#proyw .pc-l[lang=es] .fuente a')].map(a => a.href)")
            chk(len(enl) >= len(d["instituciones"]) and all(u.startswith("https://") for u in enl), "cada institución con su enlace a la fuente", enl[:3])
            txt = pg.evaluate("() => [...document.querySelectorAll('#proyw > .pc-l')].map(w => w.textContent).join(' ')")
            chk(not re.search(r"\bN/D\b|—|undefined|NaN|null", txt), "sin «N/D», rayas largas, undefined ni NaN", re.findall(r".{20}(?:N/D|—|undefined|NaN|null).{20}", txt)[:3])
            # ayuda flotante
            pg.hover("#proyw .pc-l[lang=es] .pc-graf[data-g=pib] circle[tabindex]"); pg.wait_for_timeout(300)
            tt = pg.evaluate("() => { const t = document.querySelector('#proyw .pc-l[lang=es] .pc-graf[data-g=pib] .pc-tt'); return t && t.classList.contains('pc-ver') ? t.textContent : ''; }")
            chk("Promedio" in tt and "instituciones" in tt, "al pasar por un punto del promedio aparece su ayuda", tt)
            box = pg.evaluate("() => { const r = document.querySelector('#proyw .pc-l[lang=es] .pc-graf[data-g=fmi] svg').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }")
            pg.mouse.move(box[0] + box[2] * 0.6, box[1] + box[3] * 0.5); pg.wait_for_timeout(300)
            tt2 = pg.evaluate("() => { const t = document.querySelector('#proyw .pc-l[lang=es] .pc-graf[data-g=fmi] .pc-tt'); return t && t.classList.contains('pc-ver') ? t.textContent : ''; }")
            chk("Inflación" in tt2 and "Desempleo" in tt2, "en el gráfico del FMI, la cruz muestra las dos cifras del año", tt2)
            pg.screenshot(path=f"{CAP}/escritorio-claro.png", clip={"x": 0, "y": max(0, pg.evaluate("() => document.getElementById('proyw').getBoundingClientRect().top + scrollY") - pg.evaluate("() => scrollY")), "width": 1280, "height": 900})
            pg.evaluate("() => document.getElementById('proyw').querySelector('.pc-dos').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
            pg.screenshot(path=f"{CAP}/escritorio-graficos.png")
            # modo oscuro
            pg.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')"); pg.wait_for_timeout(400)
            pg.screenshot(path=f"{CAP}/escritorio-oscuro.png")
            pg.evaluate("() => document.documentElement.removeAttribute('data-theme')")
            # inglés
            pg.evaluate("() => document.dispatchEvent(new CustomEvent('cofrade-idioma', { detail: 'en' }))"); pg.wait_for_timeout(700)
            v = pg.evaluate("() => [...document.querySelectorAll('#proyw > .pc-l')].map(w => [w.lang, w.checkVisibility(), w.getAttribute('aria-hidden')])")
            chk(v == [["es", False, "true"], ["en", True, None]], "botón EN: se ve el bloque en inglés y el español queda oculto", v)
            gi = pg.evaluate("() => [...document.querySelectorAll('#proyw > .pc-l[lang=en] .pc-graf svg')].length")
            chk(gi == 2, "en inglés también se dibujan los dos gráficos", gi)
            ei = pg.evaluate("() => [...document.querySelectorAll('#proyw .pc-l[lang=en] .pc-graf[data-g=pib] text.pc-v')].map(t => t.textContent)")
            chk(ei and all(re.match(r"^−?\d+\.\d%$", x) for x in ei), "en inglés las cifras van con punto y sin espacio (2.5%)", ei)
            ixe = pg.evaluate("() => (document.querySelector('#cnIdx a[data-id=\"proyw\"]') || {}).textContent")
            chk(ixe == "Growth outlook: next 4 years", "el Índice cambia el nombre del tema a inglés", ixe)
            pg.screenshot(path=f"{CAP}/escritorio-ingles.png")
            pg.evaluate("() => document.dispatchEvent(new CustomEvent('cofrade-idioma', { detail: 'es' }))"); pg.wait_for_timeout(400)
            chk(pg.evaluate("() => document.querySelector('#proyw > .pc-l[lang=es]').checkVisibility()"), "vuelve al español")
            c.close()
        if toca("voz"):
            c, pg = abrir(nav)
            g = pg.evaluate("() => __cnVozAPI.guion('economia')")
            i = next((k for k, x in enumerate(g) if x.startswith("Proyección de crecimiento en Chile durante los próximos 4 años")), -1)
            chk(i > 0, "la voz lee el título del tema nuevo", g[-12:])
            res = g[i + 1] if i >= 0 and i + 1 < len(g) else ""
            chk(res.startswith("En resumen") and "por ciento" in res or "%" in res, "la voz lee el resumen con las cifras", res)
            chk(not any(re.search(r"Institución e informe|Fuentes:|Cómo leer|cada punto es una institución", x) for x in g), "la voz no lee tablas, fuentes ni explicación de gráficos", [x for x in g if re.search(r"Institución|Fuentes|Cómo leer", x)][:3])
            pj = next((k for k, x in enumerate(g) if x.startswith("Perspectivas de Desarrollo para Chile 2050")), -1)
            chk(pj > i, "después sigue «Perspectivas 2050» (no se corta)", [len(g), i, pj])
            chk(len(g) <= 35, "la sección 1 no llega al máximo de la voz (36): nada queda cortado", [len(g), g[-1]])
            c.close()
        if toca("telefono"):
            c, pg = abrir(nav, tel=True)
            ir_al_bloque(pg)
            pg.evaluate("() => document.querySelector('#proyw .pc-dos').scrollIntoView({block:'start'})"); pg.wait_for_timeout(900)
            m = pg.evaluate("""() => { const se = document.scrollingElement; const g = [...document.querySelectorAll('#proyw > .pc-l[lang=es] .pc-graf')].map(x => {
                const s = x.querySelector('svg'); return s ? [Math.round(s.getBoundingClientRect().width), x.clientWidth] : null; });
              const tt = [...document.querySelectorAll('#proyw > .pc-l[lang=es] .pc-graf text')].map(t => parseFloat(getComputedStyle(t).fontSize) * (t.ownerSVGElement.getBoundingClientRect().width / t.ownerSVGElement.viewBox.baseVal.width));
              return { ancho: se.scrollWidth, vista: innerWidth, g, minTxt: Math.min.apply(null, tt) }; }""")
            chk(m["ancho"] <= m["vista"] + 1, "en el teléfono nada se sale por el lado", m)
            chk(all(x and abs(x[0] - x[1]) <= 2 for x in m["g"]), "los gráficos ocupan justo el ancho del teléfono", m["g"])
            chk(m["minTxt"] >= 10.9, "en el teléfono el texto de los gráficos se lee (11 px o más)", m["minTxt"])
            pg.screenshot(path=f"{CAP}/telefono-graficos.png")
            # con el dedo: la ayuda queda hasta tocar fuera
            pg.tap("#proyw .pc-l[lang=es] .pc-graf[data-g=pib] circle[tabindex]"); pg.wait_for_timeout(400)
            v1 = pg.evaluate("() => !!document.querySelector('#proyw .pc-l[lang=es] .pc-graf[data-g=pib] .pc-tt.pc-ver')")
            pg.tap("#proyw .pc-l[lang=es] h3.bloque-tit"); pg.wait_for_timeout(300)
            v2 = pg.evaluate("() => !!document.querySelector('#proyw .pc-l[lang=es] .pc-graf[data-g=pib] .pc-tt.pc-ver')")
            chk(v1 and not v2, "con el dedo, la ayuda aparece y se cierra al tocar fuera", [v1, v2])
            ir_al_bloque(pg)
            pg.screenshot(path=f"{CAP}/telefono-inicio.png")
            pg.evaluate("() => document.querySelector('#proyw .pc-l[lang=es] .pc-tabla').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
            pg.screenshot(path=f"{CAP}/telefono-tabla.png")
            c.close()
        if toca("bordes"):
            c, pg = abrir(nav, url="/edicion/2026-11-18")
            chk(pg.evaluate("() => !document.getElementById('proyw') && !!document.getElementById('crecw')"), "una edición anterior al 19-11 queda tal como salió")
            c.close()
        nav.close()
    if toca("bordes"):
        srv.terminate(); srv.wait(); srv = servidor({"PROY_ARCHIVO": "no"})
        r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60); h = r.read().decode("utf-8")
        chk(r.status == 200 and 'id="proyw"' not in h and 'id="crecw"' in h and "-p" not in (r.headers.get("ETag") or ""), "sin el archivo de cifras, la edición sale igual (sin bloque vacío)")
        srv.terminate(); srv.wait(); srv = servidor({"PROY_FOTOS": "/tmp/titulos/proy/fotos"})
        r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60); h = r.read().decode("utf-8")
        blq = h[h.find('id="proyw"'):h.find('id="pjw"')]
        kv = re.search(r'Crecimiento del PIB 2027</span><span class="kv">([^<]+)<', blq)
        chk(kv is not None and kv.group(1).startswith("2,9"), "la edición muestra la foto de su fecha (no el archivo del día)", kv and kv.group(1))
        srv.terminate(); srv.wait(); srv = servidor({"PROY_ARCHIVO": "/tmp/titulos/proy/datos/raro.json"})
        r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60); h = r.read().decode("utf-8")
        blq = h[h.find('id="proyw"'):h.find('id="pjw"')]
        chk(r.status == 200 and 'id="proyw"' in h and "javascript:" not in blq and "undefined" not in blq, "datos raros (mes 13, enlace javascript:, informe faltante): la sección sale limpia", [r.status, "javascript:" in blq, "undefined" in blq])
        srv.terminate(); srv.wait(); srv = servidor({"PROY_ARCHIVO": "/tmp/titulos/proy/datos/sin-anio.json"})
        r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60); h = r.read().decode("utf-8")
        chk(r.status == 200 and 'id="proyw"' not in h and 'id="crecw"' in h, "sin año base: no se muestra nada a medias y la edición carga")
        malo = "/tmp/titulos/proy/datos/malo.json"
        json.dump({"anios": ["2027"], "instituciones": []}, open(malo, "w"))
        srv.terminate(); srv.wait(); srv = servidor({"PROY_ARCHIVO": malo})
        r = urllib.request.urlopen(B + "/edicion/2026-11-19", timeout=60); h = r.read().decode("utf-8")
        chk(r.status == 200 and 'id="proyw"' not in h, "con cifras incompletas, no se muestra nada a medias")
finally:
    srv.terminate()
chk(not errores, "sin errores de JavaScript", errores[:3])
print(f"\n{len(oks)} OK, {len(fallas)} fallas" + (": " + "; ".join(fallas) if fallas else ""))
sys.exit(1 if fallas else 0)
