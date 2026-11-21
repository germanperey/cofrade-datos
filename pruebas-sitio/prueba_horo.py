"""Prueba del horóscopo anual, chino y personalizado (18-11-2026). Uso: python3 prueba_horo.py <bundle> <puerto> [corto]"""
import os, sys, time, json, subprocess, urllib.request
from playwright.sync_api import sync_playwright
W, P = sys.argv[1], int(sys.argv[2]); CORTO = len(sys.argv) > 3; B = f"http://localhost:{P}"
env = dict(os.environ, PUERTO=str(P), CON_GITHUB="1", ED_EXTRA="/tmp/titulos/ed2", LOCAL_REDIR="1")
s = subprocess.Popen(["node", "servidor.mjs", W], cwd="/tmp/mf/prueba", env=env, stdout=open(f"/tmp/titulos/srv{P}.log", "w"), stderr=subprocess.STDOUT)
ok, malos = 0, []
def chk(c, n):
    global ok
    if c: ok += 1
    else: malos.append(n)
    print(("OK   " if c else "FALLA ") + n, flush=True)
for _ in range(60):
    time.sleep(1)
    try: urllib.request.urlopen(B + "/__despachos", timeout=3); break
    except Exception: pass
try:
    with sync_playwright() as p:
        nav = p.chromium.launch()
        cx = nav.new_context(viewport={"width": 1280, "height": 900}); pg = cx.new_page(); errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.goto(B + "/edicion/2026-11-17", wait_until="load", timeout=180000); pg.wait_for_timeout(1200)
        H = ".horo"
        pg.evaluate("() => document.querySelector('.horo').scrollIntoView({block:'start'})"); pg.wait_for_timeout(400)
        info = pg.evaluate("""() => { const v = document.querySelector('.horo .vista-horo'); const bs = [...v.querySelectorAll('.horo-btn:not([data-v=compat])')];
          const r = bs.map(b => { const rb = b.getBoundingClientRect(), mn = b.querySelector('.mn'), sp = [...mn.querySelectorAll('span')].find(x => x.offsetParent !== null) || mn, rs = sp.getBoundingClientRect();
            return { t: b.innerText.trim(), fs: parseFloat(getComputedStyle(mn).fontSize), ta: getComputedStyle(b).textAlign, top: Math.round(rb.top), dx: Math.abs((rb.left + rb.width / 2) - (rs.left + rs.width / 2)), h: rb.height, w: rb.width } });
          return { n: bs.length, r, clase: v.className }; }""")
        chk(info["n"] == 4, f"4 botones ({info['n']})")
        chk([x["t"] for x in info["r"]] == ["Horóscopo de hoy", "Horóscopo de noviembre", "Horóscopo año 2027", "Horóscopo chino 2027"], f"etiquetas {[x['t'] for x in info['r']]}")
        chk(all(x["fs"] >= 17 for x in info["r"]), f"letra >= 17 px {[x['fs'] for x in info['r']]}")
        chk(all(x["ta"] == "center" and x["dx"] <= 2 for x in info["r"]), f"texto centrado {[round(x['dx'],1) for x in info['r']]}")
        chk(len({x["top"] for x in info["r"]}) == 1, "los 4 en una fila (escritorio)")
        chk(all(x["h"] >= 44 for x in info["r"]), "botones de al menos 44 px de alto")
        pg.click(".horo-btn[data-v=anio]"); pg.wait_for_timeout(300)
        st = pg.evaluate("""() => { const h = document.querySelector('.horo'), P = document.getElementById('horoAnual'), bl = P.querySelector('.ha-b-es');
          const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
          return { v: h.dataset.vista, signos: vis(h.querySelector('.signos')), panel: vis(P), zod: vis(bl.querySelector('.ha-zod')), chi: vis(bl.querySelector('.ha-chi')),
            perfil: vis(bl.querySelector('.ha-perfil')), en: vis(P.querySelector('.ha-b-en')), pres: [...h.querySelectorAll('.horo-btn:not([data-v=compat])')].map(b => b.getAttribute('aria-pressed')),
            svg: bl.querySelectorAll('.ha-zod .ha-chip svg').length, lect: [...bl.querySelectorAll('.ha-signo')].filter(vis).length, pide: vis(bl.querySelector('.ha-zod .ha-pide')) }; }""")
        chk(st["v"] == "anio" and not st["signos"] and st["panel"] and st["zod"] and not st["chi"] and st["perfil"] and not st["en"], f"vista año {st}")
        chk(st["pres"] == ["false", "false", "true", "false"], f"aria-pressed {st['pres']}")
        chk(st["svg"] == 12, f"medallones copiados en las 12 fichas ({st['svg']})")
        chk(st["lect"] == 0 and st["pide"], "sin signo elegido: ninguna lectura abierta y aparece la invitación")
        pg.click(".ha-b-es .ha-zod .ha-chip[data-i='0']"); pg.wait_for_timeout(250)
        st = pg.evaluate("""() => { const bl = document.querySelector('.ha-b-es'), vis = e => !!e && e.getClientRects().length > 0;
          return { lect: [...bl.querySelectorAll('.ha-signo')].filter(vis).map(a => a.id), res: bl.querySelector('.hp-res').innerText, sel: bl.querySelector('.hp-s').value }; }""")
        chk(st["lect"] == ["anio-es-0"], f"Aries abierto ({st['lect']})")
        chk("Aries" in st["res"] and st["sel"] == "0", "la ficha también llena el perfil y el resumen")
        # fecha de nacimiento: 15-03-1967 → Piscis, Cabra de Fuego (año nuevo chino 1967: 9 de febrero), año personal 2, número de vida 5
        pg.select_option(".ha-b-es .hp-d", "15"); pg.select_option(".ha-b-es .hp-m", "3"); pg.select_option(".ha-b-es .hp-y", "1967"); pg.wait_for_timeout(250)
        st = pg.evaluate("""() => { const bl = document.querySelector('.ha-b-es'), en = document.querySelector('.ha-b-en');
          return { s: bl.querySelector('.hp-s').value, a: bl.querySelector('.hp-a').value, e: bl.querySelector('.hp-e').value, res: bl.querySelector('.hp-res').innerText,
            sEn: en.querySelector('.hp-s').value, dEn: en.querySelector('.hp-d').value, ls: localStorage.getItem('cn-perfil'), cards: bl.querySelectorAll('.hp-i').length }; }""")
        chk(st["s"] == "11" and st["a"] == "7" and st["e"] == "1", f"15-03-1967: Piscis, Cabra, Fuego ({st['s']}, {st['a']}, {st['e']})")
        chk("Año personal 2 en 2027" in st["res"] and "Número de vida 5" in st["res"], "numerología: año personal 2 y número de vida 5")
        chk(st["cards"] == 4, f"resumen con 4 recuadros ({st['cards']})")
        chk(st["sEn"] == "11" and st["dEn"] == "15", "el bloque en inglés queda sincronizado")
        chk('"d":15' in (st["ls"] or "") and '"y":1967' in (st["ls"] or ""), "el perfil se guarda en este navegador")
        # 01-02-1967 es antes del año nuevo chino (9-02-1967): Caballo de Fuego (1966)
        pg.select_option(".ha-b-es .hp-d", "1"); pg.select_option(".ha-b-es .hp-m", "2"); pg.wait_for_timeout(200)
        st = pg.evaluate("() => [document.querySelector('.ha-b-es .hp-s').value, document.querySelector('.ha-b-es .hp-a').value, document.querySelector('.ha-b-es .hp-e').value]")
        chk(st == ["10", "6", "1"], f"01-02-1967: Acuario, Caballo (año chino 1966), Fuego ({st})")
        # cúspide: 19-02-1980 (primer día de Piscis)
        pg.select_option(".ha-b-es .hp-d", "19"); pg.select_option(".ha-b-es .hp-y", "1980"); pg.wait_for_timeout(200)
        r = pg.evaluate("() => document.querySelector('.ha-b-es .hp-res').innerText")
        chk("límite entre Piscis y Acuario" in r, "aviso de cúspide (19-02: Piscis y Acuario)")
        a1980 = pg.evaluate("() => [document.querySelector('.ha-b-es .hp-a').value, document.querySelector('.ha-b-es .hp-e').value]")
        chk(a1980 == ["8", "3"], f"19-02-1980: Mono de Metal (año nuevo chino 1980: 16-02) {a1980}")
        # fecha imposible: 31-02 no calcula nada nuevo
        pg.select_option(".ha-b-es .hp-d", "31"); pg.wait_for_timeout(150)
        r2 = pg.evaluate("() => document.querySelector('.ha-b-es .hp-res').innerText")
        chk("Número de vida" not in r2, "31 de febrero no se acepta como fecha")
        pg.select_option(".ha-b-es .hp-d", "15"); pg.select_option(".ha-b-es .hp-m", "3"); pg.select_option(".ha-b-es .hp-y", "1967"); pg.wait_for_timeout(200)
        # vista china
        pg.click(".horo-btn[data-v=chino]"); pg.wait_for_timeout(250)
        st = pg.evaluate("""() => { const bl = document.querySelector('.ha-b-es'), vis = e => !!e && e.getClientRects().length > 0;
          return { zod: vis(bl.querySelector('.ha-zod')), chi: vis(bl.querySelector('.ha-chi')), lect: [...bl.querySelectorAll('.hc-animal')].filter(vis).map(a => a.id),
            tit: bl.querySelector('.ha-chi .ha-intro h3').innerText, signos: vis(document.querySelector('.horo .signos')) }; }""")
        chk(not st["zod"] and st["chi"] and not st["signos"], "vista china: solo el horóscopo chino")
        chk(st["lect"] == ["chino-es-7"], f"la Cabra abierta por la fecha ({st['lect']})")
        chk("Cabra de Fuego" in st["tit"] and "丁未" in st["tit"], f"título del año chino ({st['tit']})")
        tai = pg.evaluate("() => document.querySelector('.ha-b-es .ha-chi .ha-cielo').innerText")
        chk("Buey (choque con el año)" in tai and "Perro (castigo y ruptura)" in tai and "Rata (daño)" in tai and "Cabra (tu propio año)" in tai, "Tai Sui 2027 como las fuentes: Cabra, Buey, Rata y Perro")
        pg.click(".ha-b-es .hp-ir[data-ir=anio]"); pg.wait_for_timeout(300)
        st = pg.evaluate("() => [document.querySelector('.horo').dataset.vista, [...document.querySelectorAll('.ha-b-es .ha-signo')].filter(e => e.getClientRects().length).map(a => a.id)]")
        chk(st == ["anio", ["anio-es-11"]], f"«Ver tu lectura completa» lleva a Piscis ({st})")
        # inglés
        tiene_btn = pg.evaluate("() => !!document.getElementById('btnIdioma')")
        if tiene_btn:
            pg.click("#btnIdioma"); pg.wait_for_timeout(2500)
            pg.evaluate("() => document.querySelector('.horo').scrollIntoView({block:'start'})"); pg.wait_for_timeout(400)
            st = pg.evaluate("""() => { const h = document.querySelector('.horo'), vis = e => !!e && e.getClientRects().length > 0, P = document.getElementById('horoAnual');
              return { lang: document.documentElement.lang, en: h.classList.contains('cn-en'), es: vis(P.querySelector('.ha-b-es')), enb: vis(P.querySelector('.ha-b-en')),
                lbl: [...h.querySelectorAll('.horo-btn:not([data-v=compat])')].map(b => b.innerText.trim()), esTxt: P.querySelector('.ha-b-es .ha-zod .ha-intro h3').textContent,
                ariaEs: P.querySelector('.ha-b-es').getAttribute('aria-hidden'), res: P.querySelector('.ha-b-en .hp-res').innerText }; }""")
            chk(st["en"] and not st["es"] and st["enb"], f"inglés: se ve el bloque en inglés (lang={st['lang']})")
            chk(st["lbl"][2:] == ["2027 Horoscope", "2027 Chinese Horoscope"], f"botones en inglés {st['lbl']}")
            chk(st["esTxt"] == "El cielo de 2027", "el traductor de la edición no tocó el bloque en español")
            chk(st["ariaEs"] == "true", "el bloque que no se lee queda fuera del buscador")
            chk("Pisces" in st["res"] and "Life path number 5" in st["res"], "resumen personal en inglés")
            pg.click("#btnIdioma"); pg.wait_for_timeout(1500)
            st = pg.evaluate("() => [document.querySelector('.horo').classList.contains('cn-en'), document.querySelector('.ha-b-es').getAttribute('aria-hidden')]")
            chk(st == [False, None], "vuelta al español")
        else:
            chk(False, "botón EN de la edición no encontrado")
        # recarga: el perfil vuelve
        pg.reload(wait_until="load"); pg.wait_for_timeout(1200)
        st = pg.evaluate("() => [document.querySelector('.ha-b-es .hp-d').value, document.querySelector('.ha-b-es .hp-s').value, document.querySelector('.ha-b-es .hp-a').value]")
        chk(st == ["15", "11", "7"], f"al volver, el perfil sigue ahí {st}")
        # buscador de la edición: un resultado dentro del horóscopo chino abre su vista
        n = pg.evaluate("() => window.__cnBuscar ? window.__cnBuscar('Futaleufú') : -1")
        chk(n >= 1, f"el buscador encuentra Futaleufú ({n})")
        if n >= 1:
            pg.evaluate("() => { const b = document.querySelector('.cn-r'); if (b) b.click(); }"); pg.wait_for_timeout(600)
            st = pg.evaluate("() => [document.querySelector('.horo').dataset.vista, (()=>{const m=document.querySelector('.cn-flash'); return m ? m.getClientRects().length > 0 : null})()]")
            chk(st[0] == "anio" and st[1] is not False, f"tocar el resultado abre la vista del año ({st})")
        n2 = pg.evaluate("() => window.__cnBuscar ? window.__cnBuscar('trío de armonía') : -1")
        if n2 >= 1:
            pg.click(".horo-btn[data-v=hoy]"); pg.wait_for_timeout(200)
            pg.evaluate("() => { const b = document.querySelector('.cn-r'); if (b) b.click(); }"); pg.wait_for_timeout(600)
            st = pg.evaluate("() => document.querySelector('.horo').dataset.vista")
            chk(st == "chino", f"un resultado del horóscopo chino abre su vista ({st})")
        # borrar mis datos
        pg.click(".horo-btn[data-v=anio]"); pg.wait_for_timeout(200)
        pg.click(".ha-b-es .hp-borrar"); pg.wait_for_timeout(200)
        st = pg.evaluate("() => [document.querySelector('.ha-b-es .hp-d').value, document.querySelector('.ha-b-es .hp-s').value, localStorage.getItem('cn-perfil'), document.querySelector('.ha-b-es .hp-res').innerText]")
        chk(st[0] == "" and st[1] == "" and st[2] is None and "Completa uno o más datos" in st[3], "«Borrar mis datos» deja todo en blanco")
        # impresión: la vista del año imprime lo que se ve
        pg.click(".ha-b-es .ha-zod .ha-chip[data-i='4']"); pg.wait_for_timeout(200)
        pg.emulate_media(media="print"); pg.wait_for_timeout(200)
        st = pg.evaluate("""() => { const vis = e => !!e && e.getClientRects().length > 0, bl = document.querySelector('.ha-b-es');
          return { signos: vis(document.querySelector('.horo .signos')), leo: vis(bl.querySelector('#anio-es-4')), otros: [...bl.querySelectorAll('.ha-signo')].filter(vis).length,
            chips: vis(bl.querySelector('.ha-zod .ha-chips')), filas: vis(bl.querySelector('.hp-filas')) }; }""")
        chk(not st["signos"] and st["leo"] and st["otros"] == 1 and not st["chips"] and not st["filas"], f"impresión en vista del año {st}")
        pg.emulate_media(media="screen"); pg.click(".horo-btn[data-v=hoy]"); pg.emulate_media(media="print"); pg.wait_for_timeout(200)
        st = pg.evaluate("() => [document.getElementById('horoAnual').getClientRects().length, document.querySelector('.horo .signos').getClientRects().length]")
        chk(st[0] == 0 and st[1] > 0, "impresión en vista de hoy: igual que antes")
        pg.emulate_media(media="screen")
        chk(not errores, f"sin errores de JavaScript {errores[:3]}")
        cx.close()
        # teléfono
        cx = nav.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True); pg = cx.new_page(); errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.goto(B + "/edicion/2026-11-17", wait_until="load", timeout=180000); pg.wait_for_timeout(1200)
        info = pg.evaluate("""() => { const bs = [...document.querySelectorAll('.horo .vista-horo .horo-btn')];
          return { tops: bs.map(b => Math.round(b.getBoundingClientRect().top)), fs: bs.map(b => parseFloat(getComputedStyle(b.querySelector('.mn')).fontSize)),
            w: bs.map(b => Math.round(b.getBoundingClientRect().width)), ancho: document.scrollingElement.scrollWidth }; }""")
        chk(len(set(info["tops"])) == 2, f"teléfono: botones en 2 filas de 2 ({info['tops']})")
        chk(all(f >= 15.5 for f in info["fs"]), f"teléfono: letra {info['fs']}")
        chk(info["ancho"] <= 390, f"teléfono: sin desborde horizontal ({info['ancho']})")
        pg.tap(".horo-btn[data-v=chino]"); pg.wait_for_timeout(300)
        info = pg.evaluate("""() => { const c = [...document.querySelectorAll('.ha-b-es .ha-chi .ha-chip')]; return { cols: new Set(c.map(x => Math.round(x.getBoundingClientRect().top))).size,
          ancho: document.scrollingElement.scrollWidth, sel: [...document.querySelectorAll('.ha-b-es .hp-f select')].map(s => Math.round(s.getBoundingClientRect().height)) }; }""")
        chk(info["cols"] == 4, f"teléfono: 12 animales en 4 filas de 3 ({info['cols']} filas)")
        chk(info["ancho"] <= 390 and min(info["sel"]) >= 44, f"teléfono: listas de 44 px y sin desborde ({info})")
        pg.screenshot(path="/tmp/titulos/horo_tel_chino.png", full_page=False)
        chk(not errores, f"teléfono: sin errores de JavaScript {errores[:3]}")
        cx.close()
        # cambio de año según la fecha de la edición
        cx = nav.new_context(viewport={"width": 1280, "height": 900}); pg = cx.new_page()
        for fecha, espera in (("2026-10-31", None), ("2027-10-31", "2027"), ("2027-11-01", "2028"), ("2031-11-01", None)):
            pg.goto(B + f"/edicion/{fecha}", wait_until="load", timeout=180000); pg.wait_for_timeout(600)
            pg.evaluate("() => document.querySelector('.horo').scrollIntoView({block:'start'})"); pg.wait_for_timeout(400)
            st = pg.evaluate("() => [[...document.querySelectorAll('.horo .vista-horo .horo-btn')].map(b => b.innerText.trim()), (document.getElementById('horoAnual')||{}).getAttribute ? document.getElementById('horoAnual').getAttribute('data-anio') : null, parseFloat(getComputedStyle(document.querySelector('.horo .vista-horo .mn')).fontSize)]")
            if espera: chk(st[0][2:] == [f"Horóscopo año {espera}", f"Horóscopo chino {espera}"] and st[1] == espera, f"edición {fecha} → {espera} ({st[0][2:]}, {st[1]})")
            else: chk(len(st[0]) == 2 and st[1] is None and st[2] >= 17, f"edición {fecha} → sin año guardado: 2 botones grandes ({st})")
        cx.close(); nav.close()
finally:
    s.terminate()
print(f"\n{ok} OK, {len(malos)} fallas"); [print("  -", m) for m in malos]
