import re
"""Pruebas de uso de la lectura por voz (19-11-2026). Uso: python3 prueba_voz.py <bundle> <puerto>
Voz y oído simulados (simulador.js): se registran las frases dichas y se inyectan respuestas habladas."""
import os, sys, time, json, re, subprocess, urllib.request
from playwright.sync_api import sync_playwright
W, P = sys.argv[1], int(sys.argv[2]); B = f"http://localhost:{P}"; ED = "/edicion/2026-11-18"
SOLO = set(filter(None, (os.environ.get("SOLO") or "").split(",")))
SIM = open("/tmp/titulos/voz/prueba/simulador.js", encoding="utf-8").read()
CONT = os.environ.get("CONTINUO") == "1"   # por defecto se prueba la escucha por turnos (teléfonos, Safari); CONTINUO=1 prueba la de computador
env = dict(os.environ, PUERTO=str(P), CON_GITHUB="1", ED_EXTRA="/tmp/titulos/ed2", LOCAL_REDIR="1")
srv = subprocess.Popen(["node", "servidor.mjs", W], cwd="/tmp/mf/prueba", env=env, stdout=open(f"/tmp/titulos/voz/srv{P}.log", "w"), stderr=subprocess.STDOUT)
ok, malos = 0, []
def chk(c, n, extra=""):
    global ok
    if c: ok += 1
    else: malos.append(n)
    print(("OK   " if c else "FALLA ") + n + (("  · " + str(extra)[:300]) if (extra and not c) else ""), flush=True)
for _ in range(90):
    time.sleep(1)
    try: urllib.request.urlopen(B + "/__despachos", timeout=3); break
    except Exception: pass
def toca(n): return not SOLO or n in SOLO
errores = []
def abrir(nav, sim=None, ls=None, url=ED, tel=False, robot_sin_forzar=False):
    c = nav.new_context(**(dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True) if tel else dict(viewport={"width": 1280, "height": 900})))
    sim = dict(sim or {}); sim["voz"] = dict(sim.get("voz") or {}); sim["voz"].setdefault("continuo", CONT)
    if os.environ.get("BILINGUE"): sim.setdefault("bilingue", True)
    if robot_sin_forzar: sim.setdefault("voz", {})["forzar"] = False
    c.add_init_script("window.__simCfg = " + json.dumps(sim) + ";")
    if ls: c.add_init_script("if (!sessionStorage.getItem('__ls')) { " + "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(v if isinstance(v, str) else json.dumps(v))});" for k, v in ls.items()) + " sessionStorage.setItem('__ls','1'); }")
    c.add_init_script(SIM)
    pg = c.new_page(); pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto(B + url, wait_until="load", timeout=180000)
    return c, pg
def esperar(pg, js, tope=15000, paso=100):
    t0 = time.time()
    while (time.time() - t0) * 1000 < tope:
        try:
            if pg.evaluate(js): return True
        except Exception: pass
        pg.wait_for_timeout(paso)
    return False
def dicho(pg): return pg.evaluate("() => __dicho.map(d => d.t)")
def todo(pg): return "\n".join(dicho(pg))
def hay(pg, rx, tope=15000): return esperar(pg, "() => new RegExp(" + json.dumps(rx) + ", 'im').test(__dicho.map(d => d.t).join('\\n'))", tope)
def pausas(pg): return re.findall(r"Una pausa para agradecer.*?Seguimos\.", todo(pg), re.S)
def oir(pg, *frases): pg.evaluate("(f) => { __oidos.push(...f); }", list(frases))
def escuchando(pg): return esperar(pg, "() => !!(window.__cnVozAPI && __cnVozAPI.estado().espera)")
def pref(pg): return pg.evaluate("() => JSON.parse(localStorage.getItem('cn-voz') || '{}')")
VENTANA = "() => !!document.querySelector('.cn-voz-velo')"
def ventana(pg, tope=6000):   # la ventana aparece y pasa el resguardo contra clics que venían en camino
    r = esperar(pg, VENTANA, tope)
    if r: pg.wait_for_timeout(450)
    return r
try:
    with sync_playwright() as p:
        nav = p.chromium.launch()
        # 1. primera visita: la ventana aparece, accesible, con el foco en «Escuchar»
        if toca("ventana"):
            c, pg = abrir(nav)
            chk(ventana(pg), "primera visita: aparece la ventana de voz")
            a = pg.evaluate("""() => { const d = document.querySelector('.cn-voz-caja'); return { rol: d.getAttribute('role'), modal: d.getAttribute('aria-modal'),
                 tit: document.getElementById(d.getAttribute('aria-labelledby')).textContent, foco: document.activeElement.className, x: document.querySelector('.cn-voz-x').getAttribute('aria-label') }; }""")
            chk(a["rol"] == "dialog" and a["modal"] == "true" and "leemos" in a["tit"], "ventana: rol de diálogo modal con título", a)
            chk(a["foco"] == "cn-voz-si", "ventana: el foco queda en «Escuchar el boletín»", a)
            chk("sin voz" in a["x"].lower(), "ventana: la X se anuncia como «Cerrar y leer sin voz»", a)
            pg.keyboard.press("Tab"); f1 = pg.evaluate("() => document.activeElement.className")
            pg.keyboard.press("Tab"); f2 = pg.evaluate("() => document.activeElement.className")
            chk({f1, f2} <= {"cn-voz-si", "cn-voz-x"}, "ventana: el foco no se escapa con Tab", (f1, f2))
            chk(pg.evaluate("() => __dicho.length") == 0, "ventana: no habla antes de que la persona toque")
            c.close()
        # 2. Escape: vidente, no vuelve a aparecer
        if toca("escape"):
            c, pg = abrir(nav); ventana(pg)
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            chk(not pg.evaluate(VENTANA) and pref(pg).get("e") == "no", "Escape: cierra y recuerda «sin voz»", pref(pg))
            chk(pg.evaluate("() => __dicho.length") == 0, "Escape: no se enciende la voz")
            pg.reload(wait_until="load"); pg.wait_for_timeout(1500)
            chk(not pg.evaluate(VENTANA), "Escape: al volver a abrir, la ventana no aparece")
            chk(pg.evaluate("() => !!document.getElementById('cnVozMenu')"), "Escape: el ícono del Índice sigue disponible")
            c.close()
        # 3. La X: igual que Escape
        if toca("x"):
            c, pg = abrir(nav); ventana(pg)
            pg.click(".cn-voz-x"); pg.wait_for_timeout(300)
            chk(not pg.evaluate(VENTANA) and pref(pg).get("e") == "no" and pg.evaluate("() => __dicho.length") == 0, "X: cierra, recuerda «sin voz» y no habla", pref(pg))
            pg.reload(wait_until="load"); pg.wait_for_timeout(1500)
            chk(not pg.evaluate(VENTANA), "X: al volver a abrir, la ventana no aparece")
            c.close()
        # 4. Un toque en cualquier parte (fuera de la caja) enciende la voz
        if toca("toque"):
            for donde, accion in (("esquina", lambda pg: pg.mouse.click(12, 12)), ("texto de la caja", lambda pg: pg.click("#cnVozTxt")), ("teléfono", None)):
                c, pg = abrir(nav, tel=(donde == "teléfono")); ventana(pg)
                if accion: accion(pg)
                else: pg.tap(".cn-voz-caja h2")
                chk(hay(pg, r"Hola, qué gusto tenerte aquí\.\s+Te doy la bienvenida a Cofrade News, el boletín del miércoles 18 de noviembre de 2026"), f"toque en {donde}: saluda con la fecha de la edición", dicho(pg)[:2])
                chk(pref(pg).get("e") == "si" and pg.evaluate("() => document.documentElement.classList.contains('cn-voz-on') && !!document.querySelector('.cn-voz-b')"), f"toque en {donde}: barra de voz visible y preferencia «con voz»")
                chk(pg.evaluate("() => __dicho[0] && /Catalina/.test(__dicho[0].v)"), f"toque en {donde}: elige la voz natural de Chile (Catalina)", pg.evaluate("() => __dicho[0] && __dicho[0].v"))
                chk(pg.evaluate("() => __dicho[0].r") == 0.92, f"toque en {donde}: velocidad cálida de IntelliBot (0,92)", pg.evaluate("() => __dicho[0].r"))
                c.close()
        if toca("apurado"):
            c, pg = abrir(nav); esperar(pg, VENTANA, 6000); pg.mouse.click(12, 12); pg.wait_for_timeout(300)
            chk(pg.evaluate("() => __dicho.length") == 0 and pg.evaluate(VENTANA), "clic apurado (menos de 0,4 s): no enciende la voz y la ventana sigue")
            pg.wait_for_timeout(300); pg.mouse.click(12, 12)
            chk(hay(pg, r"bienvenida"), "clic apurado: el clic siguiente sí enciende la voz")
            c.close()
            c, pg = abrir(nav); esperar(pg, VENTANA, 6000); pg.click(".cn-voz-si")
            chk(hay(pg, r"bienvenida"), "el botón «Escuchar» funciona aunque sea al instante"); c.close()
        # 5. Robots (vigía, capturas): sin ventana; ?voz=0 tampoco
        if toca("robots"):
            c, pg = abrir(nav, robot_sin_forzar=True); pg.wait_for_timeout(2000)
            chk(not pg.evaluate(VENTANA), "navegador automatizado: la ventana no aparece")
            chk(pg.evaluate("() => !!document.getElementById('cnVozMenu') && !!document.querySelector('.cn-voz-salto')"), "navegador automatizado: el ícono y el acceso siguen ahí")
            c.close()
            c, pg = abrir(nav, url=ED + "?voz=0"); pg.wait_for_timeout(2000)
            chk(not pg.evaluate(VENTANA), "?voz=0: la ventana no aparece"); c.close()
        # 6. Quien ya usó la voz: aviso corto; Escape cierra solo esta vez; «No volver a mostrar» lo apaga
        if toca("vuelve"):
            c, pg = abrir(nav, ls={"cn-voz": {"e": "si"}}); ventana(pg)
            chk("seguir escuchando" in pg.evaluate("() => document.getElementById('cnVozTit').textContent"), "visita siguiente: aviso corto «Toca en cualquier parte para seguir escuchando»")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            chk(not pg.evaluate(VENTANA) and pref(pg).get("e") == "si", "visita siguiente: Escape cierra solo esta vez")
            pg.reload(wait_until="load"); chk(ventana(pg), "visita siguiente: al volver, el aviso aparece de nuevo")
            pg.click(".cn-voz-nomas"); pg.wait_for_timeout(200)
            chk(pref(pg).get("e") == "no" and pg.evaluate("() => __dicho.length") == 0, "visita siguiente: «No volver a mostrar» apaga el aviso sin hablar", pref(pg))
            c.close()
            c, pg = abrir(nav, ls={"cn-voz": {"e": "si"}}); ventana(pg); pg.mouse.click(20, 400)
            chk(hay(pg, r"Hola de nuevo"), "visita siguiente: un toque retoma con «Hola de nuevo»", dicho(pg)[:1]); c.close()
        # 7. El ícono del Índice y el acceso oculto para lectores de pantalla
        if toca("icono"):
            c, pg = abrir(nav, ls={"cn-voz": {"e": "no"}}); pg.wait_for_timeout(1500)
            pos = pg.evaluate("() => { const m = document.getElementById('cnVozMenu'), cab = document.querySelector('#cnMenu .cn-cab'); return { tras: cab && cab.nextElementSibling && cab.nextElementSibling.contains(m), txt: m && m.textContent }; }")
            chk(pos["tras"] and "voz" in (pos["txt"] or ""), "Índice: el botón de voz va justo bajo la cabecera", pos)
            pg.click("#cnFab"); pg.wait_for_timeout(300); pg.click("#cnVozMenu")
            chk(hay(pg, r"bienvenida|Hola de nuevo"), "Índice: el botón enciende la voz")
            chk(pg.evaluate("() => { const m = document.getElementById('cnMenu'); return !m || m.hidden || getComputedStyle(m).display === 'none' || !m.classList.contains('abierto'); }"), "Índice: el menú se cierra al encender la voz")
            c.close()
            c, pg = abrir(nav, ls={"cn-voz": {"e": "no"}}); pg.wait_for_timeout(1200)
            pri = pg.evaluate("() => document.body.firstElementChild.className")
            chk(pri == "cn-voz-salto", "acceso oculto: es lo primero de la página", pri)
            pg.keyboard.press("Tab"); vis = pg.evaluate("() => { const r = document.activeElement.getBoundingClientRect(); return [document.activeElement.className, r.top >= 0]; }")
            chk(vis[0] == "cn-voz-salto" and vis[1], "acceso oculto: con Tab aparece en pantalla", vis)
            pg.keyboard.press("Enter"); chk(hay(pg, r"bienvenida|Hola de nuevo"), "acceso oculto: Enter enciende la voz"); c.close()
        # 8. Índice por voz: grupos de 6, «más», elegir por número y por nombre, «siguiente»
        if toca("indice"):
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12)
            chk(hay(pg, r"Las tres noticias del día") and hay(pg, r"Primera: Banco Central"), "inicio: lee las 3 del día")
            chk(hay(pg, r"Quieres que te lea los temas del índice"), "inicio: ofrece leer el índice")
            escuchando(pg); oir(pg, "índice")
            chk(hay(pg, r"tiene 22 secciones"), "índice: anuncia las 22 secciones")
            chk(hay(pg, r"^6, Efemérides del día\.") and hay(pg, r"Sigo con las demás"), "índice: lee de 6 en 6 y pregunta si sigue")
            escuchando(pg); oir(pg, "más")
            chk(hay(pg, r"^12, Sismos de las últimas 24 horas\."), "índice: «más» lee el siguiente grupo")
            escuchando(pg); oir(pg, "la cinco")
            chk(hay(pg, r"Sección 5: Conflictos bélicos vigentes"), "índice: «la cinco» abre Conflictos")
            chk(esperar(pg, "() => { const e = document.querySelector('.cn-voz-lee'); return e && e.closest('#conflictos'); }"), "lectura: marca en pantalla lo que se está leyendo")
            chk(hay(pg, r"Hasta aquí Conflictos bélicos vigentes"), "fin de sección: avisa y ofrece seguir", [x for x in dicho(pg) if "Hasta aquí" in x][:1])
            escuchando(pg); oir(pg, "siguiente")
            chk(hay(pg, r"Sección 6: Efemérides del día"), "«siguiente» pasa a la sección 6")
            escuchando(pg); oir(pg, "léeme el pronóstico del tiempo")
            chk(hay(pg, r"Sección 10: Pronóstico del tiempo"), "por nombre: «el pronóstico del tiempo» abre Clima")
            chk(hay(pg, r"^Santiago: .*mínima 13 grados, máxima 25 grados"), "clima: Santiago con mínima y máxima")
            chk(esperar(pg, "() => [...document.querySelectorAll('#clima .panel-ciudad')].some(p => p.checkVisibility() && /Santiago|Concepción|Temuco|Puerto Montt|Punta Arenas/.test(p.querySelector('.ciudad-tit').textContent))", 8000), "clima: la pantalla muestra la ciudad que se está leyendo")
            escuchando(pg); oir(pg, "veintiuno")
            chk(hay(pg, r"Sección 21: Deportes"), "por número en palabras: «veintiuno» abre Deportes")
            escuchando(pg); oir(pg, "repite")
            n0 = len([x for x in dicho(pg) if "Sección 21" in x])
            chk(esperar(pg, "() => __dicho.filter(d => /^Chad Ramey/.test(d.t)).length >= 2", 15000), "«repite» vuelve a leer", n0)
            c.close()
        # 9. Sin respuesta: modo radio, sigue solo de sección en sección
        if toca("radio"):
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12)
            chk(hay(pg, r"Como no escuché una respuesta, te leo el boletín completo"), "silencio: pasa a modo radio")
            chk(hay(pg, r"Sección 1: Economía") and hay(pg, r"Sección 2: Política", ) and hay(pg, r"Sección 3: Emprendimiento"), "modo radio: sigue solo con las secciones 1, 2 y 3")
            c.close()
        # 10. Auspicios cada «10 minutos» (aquí, cada 1,5 s de voz): 3 por pausa, en rueda, el llamado a avisar solo la primera vez
        if toca("auspicios"):
            c, pg = abrir(nav, sim={"voz": {"auspicioMin": 0.025, "pausaItem": 20, "pausaTit": 20}}); ventana(pg); pg.mouse.click(12, 12)   # 19-11: en el simulador cada frase dura 25 ms; las pausas reales de la voz cálida (0,3 s) no cuentan como voz
            chk(esperar(pg, "() => (__dicho.map(d => d.t).join('\\n').match(/Seguimos\\./g) || []).length >= 3", 60000), "auspicios: hay pausas periódicas")
            ps = pausas(pg)
            nombres = [[("Caddie Golf" if m == "Kádi Golf" else m) for m in re.findall(r"Caddie Golf|Kádi Golf|Megabots|Inbestu|100 Historias", x)] for x in ps]   # v34: Catalina dice «Kádi Golf» de corrido
            chk(all(len(n) == 3 for n in nombres[:3]), "auspicios: 3 marcas por pausa (hay 4 auspiciadores)", nombres[:3])
            chk(nombres[:3] == [["Caddie Golf", "Megabots", "Inbestu"], ["100 Historias", "Caddie Golf", "Megabots"], ["Inbestu", "100 Historias", "Caddie Golf"]], "auspicios: la rueda avanza (cada pausa empieza donde quedó la anterior)", nombres[:3])
            chk(todo(pg).count("tu marca suene aquí") == 1 and "tu marca suene aquí" in ps[0], "auspicios: el llamado a publicitar va solo en la primera pausa")
            chk(hay(pg, r"Seguimos\.$"), "auspicios: vuelve con «Seguimos»")
            chk(not any("Cofrade News, Publicite" in x or "Publicite su empresa" in x for x in ps), "auspicios: el aviso propio de Cofrade News no se cuenta como auspiciador")
            a1 = pref(pg).get("a")
            chk(isinstance(a1, int) and 0 <= a1 < 4, "auspicios: la rueda queda guardada para la próxima visita", a1)
            c.close()
            c, pg = abrir(nav, sim={"voz": {"auspicioMin": 0.025}}, ls={"cn-voz": {"e": "si", "a": 1}}); ventana(pg); pg.mouse.click(12, 12)
            esperar(pg, "() => /Seguimos\\./.test(__dicho.map(d => d.t).join('\\n'))", 30000)
            p1 = pausas(pg)[:1]
            chk(bool(p1) and [("Caddie Golf" if m == "Kádi Golf" else m) for m in re.findall(r"Caddie Golf|Kádi Golf|Megabots|Inbestu|100 Historias", p1[0])] == ["Megabots", "Inbestu", "100 Historias"], "auspicios: otra visita sigue la rueda donde quedó", p1)
            c.close()
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12); hay(pg, r"Sección 2: Política")
            chk("Una pausa para agradecer" not in todo(pg), "auspicios: con el intervalo real (10 min) no interrumpe al comienzo")
            c.close()
        # 11. Horóscopo: pregunta el signo, lo recuerda, y lo usa la vez siguiente
        if toca("horoscopo"):
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12)
            escuchando(pg); oir(pg, "horóscopo")
            chk(hay(pg, r"Cuál es tu signo"), "horóscopo: pregunta el signo")
            escuchando(pg); oir(pg, "soy escorpio")
            chk(hay(pg, r"Escorpio, 23 de octubre al 21 de noviembre"), "horóscopo: lee Escorpio completo", todo(pg)[-600:])
            chk(hay(pg, r"Salud, 4 de 5 estrellas"), "horóscopo: dice las estrellas de cada área")
            chk(pg.evaluate("() => JSON.parse(localStorage.getItem('cn-perfil') || '{}').s") == 7, "horóscopo: recuerda el signo en el aparato")
            c.close()
            c, pg = abrir(nav, ls={"cn-perfil": {"s": 4}}); ventana(pg); pg.mouse.click(12, 12)
            escuchando(pg); oir(pg, "horóscopo")
            chk(hay(pg, r"Tu signo, Leo") and not hay(pg, r"Cuál es tu signo"), "horóscopo: con signo guardado no vuelve a preguntar")
            c.close()
        # 12. Órdenes: pausa, sigue, más rápido, salir; teclado
        if toca("ordenes"):
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12)
            escuchando(pg); oir(pg, "pausa")
            chk(esperar(pg, "() => __cnVozAPI.estado().pausado"), "«pausa» detiene la lectura")
            n = pg.evaluate("() => __dicho.length"); pg.wait_for_timeout(800)
            chk(pg.evaluate("() => __dicho.length") == n, "en pausa no se dice nada más")
            pg.click('.cn-voz-b [data-a="pausa"]')
            chk(esperar(pg, f"() => __dicho.length > {n}") and not pg.evaluate("() => __cnVozAPI.estado().pausado"), "el botón Seguir retoma")
            pg.keyboard.press("+")
            chk(esperar(pg, "() => __cnVozAPI.estado().rate > 1.0") and pref(pg).get("r") and pref(pg)["r"] > 1.0, "tecla +: más rápido y lo recuerda", pref(pg))
            chk(hay(pg, r"Más rápido\."), "tecla +: lo confirma en voz alta")
            pg.keyboard.press("i"); chk(hay(pg, r"tiene 22 secciones"), "tecla I: lee el índice")
            pg.keyboard.press("n"); chk(hay(pg, r"^Sección \d+:"), "tecla N: pasa a una sección")
            chk(pg.evaluate("() => __candados.pedidos") >= 1, "pantalla: mientras lee, pide que la pantalla no se apague", pg.evaluate("() => __candados"))
            pg.keyboard.press("Escape")
            chk(esperar(pg, "() => !document.querySelector('.cn-voz-b') && !document.documentElement.classList.contains('cn-voz-on')"), "Esc: apaga la voz y quita la barra")
            chk(esperar(pg, "() => __candados.soltados >= 1", 3000), "pantalla: al apagar la voz, la pantalla vuelve a lo normal", pg.evaluate("() => __candados"))
            chk(hay(pg, r"Listo, apagué la voz"), "Esc: avisa que la voz se apagó")
            n2 = pg.evaluate("() => __dicho.length"); pg.wait_for_timeout(1200)
            chk(pg.evaluate("() => __dicho.length") == n2, "apagada: no sigue hablando")
            c.close()
            c, pg = abrir(nav); ventana(pg); pg.mouse.click(12, 12); escuchando(pg); oir(pg, "salir")
            chk(esperar(pg, "() => !document.querySelector('.cn-voz-b')") and hay(pg, r"apagué la voz"), "«salir» por voz apaga")
            c.close()
        # 13. Micrófono denegado y navegador sin oído: se lee igual, con teclado y barra
        if toca("sinmic"):
            c, pg = abrir(nav); ventana(pg); oir(pg, "__denegado"); pg.mouse.click(12, 12)
            chk(hay(pg, r"No logro escucharte por el micrófono"), "micrófono denegado: lo explica")
            chk(hay(pg, r"Sección 1: Economía"), "micrófono denegado: sigue en modo radio")
            c.close()
            # 19-11-2026: sin reconocedor el oído ahora usa la nube (prueba_nube.py); «sin forma de oír» es sin reconocedor y sin nube (?voz=nativo)
            c, pg = abrir(nav, sim={"sinOido": True}, url=ED + "?voz=nativo"); ventana(pg); pg.mouse.click(12, 12)
            chk(hay(pg, r"presiona la tecla I o toca el botón Índice"), "sin reconocimiento de voz: explica las teclas y la barra")
            chk(hay(pg, r"Sección 1: Economía", ) , "sin reconocimiento de voz: lee como radio")
            chk(pg.evaluate("() => __escuchas") == 0, "sin reconocimiento de voz: nunca intenta escuchar")
            c.close()
            c, pg = abrir(nav, sim={"sinVoz": True}); ventana(pg); pg.mouse.click(12, 12); pg.wait_for_timeout(500)
            chk(pg.evaluate("() => /no tiene una voz/.test((document.getElementById('cnVozSec') || {}).textContent || '')"), "sin voz en el navegador: lo avisa en la barra, sin ventanas de alerta")
            c.close()
        # 14. Inglés
        if toca("ingles"):
            c, pg = abrir(nav, ls={"cn-voz": {"e": "no"}}); pg.wait_for_timeout(1500)
            pg.click("#btnIdioma"); esperar(pg, "() => document.documentElement.lang === 'en'", 20000); pg.wait_for_timeout(6000)
            m = pg.evaluate("() => document.getElementById('cnVozMenu').textContent")
            chk("Listen" in m, "inglés: el botón del Índice cambia de idioma", m)
            pg.evaluate("() => document.getElementById('cnVozMenu').click()")
            chk(hay(pg, r"^Hello(, it is so nice to have you here\. Welcome to Cofrade News, the newsletter for| again, it is good to have you back\. This is the newsletter for) "), "inglés: saluda en inglés", dicho(pg)[:1])
            chk(pg.evaluate("() => /Ava/.test(__dicho[0].v)"), "inglés: usa una voz natural en inglés (Ava)", pg.evaluate("() => __dicho[0].v"))
            escuchando(pg)
            chk(pg.evaluate("() => __langOido.slice(-1)[0]") == "en-US", "inglés: el oído escucha en inglés", pg.evaluate("() => __langOido"))
            oir(pg, "index"); chk(hay(pg, r"Today's newsletter has 22 sections"), "inglés: «index» lee las secciones")
            ge = pg.evaluate("() => { const o = []; __cnVozAPI.secciones().forEach(s => o.push(...__cnVozAPI.guion(s[1]))); return o; }")
            raros = [x for x in ge if re.search(r"\$\s?\d|US\$|dollarsl|pesos\.\d|dollars\.\d|https?:|[☀◐★⚑⚓✓→]", x)]
            chk(len(ge) > 150 and not raros, "inglés: cifras y monedas bien dichas en todo el boletín", raros[:3])
            chk(any("1,569 million dollars" in x for x in ge), "inglés: «US$1,569 million» se oye «1,569 million dollars»")
            c.close()
        # 14b. Modo oscuro del sitio: botón y barra con buen contraste
        if toca("oscuro"):
            c, pg = abrir(nav); ventana(pg)
            pg.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')"); pg.wait_for_timeout(200)
            k = pg.evaluate("""() => { const f = (el) => { const s = getComputedStyle(el); return [s.color, s.backgroundColor]; };
                return { si: f(document.querySelector('.cn-voz-si')), ico: f(document.querySelector('.cn-voz-ico')) }; }""")
            def lum(rgb):
                v = [int(x) / 255 for x in re.findall(r"\d+", rgb)[:3]]; v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
                return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
            def con(a, b): la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
            chk(con(*k["si"]) >= 4.5, "modo oscuro: el botón «Escuchar» se lee bien (contraste 4,5 o más)", (k, round(con(*k["si"]), 2)))
            pg.mouse.click(12, 12); hay(pg, r"bienvenida")
            b = pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.cn-voz-b')), t = getComputedStyle(document.getElementById('cnVozSec')); return [t.color, s.backgroundColor]; }")
            chk(con(*b) >= 4.5, "modo oscuro: la barra de voz se lee bien", (b, round(con(*b), 2)))
            c.close()
        # 15. Diseño: teléfono sin desbordes, botones grandes, impresión limpia
        if toca("diseno"):
            c, pg = abrir(nav, tel=True); ventana(pg)
            d = pg.evaluate("() => { const b = document.querySelector('.cn-voz-caja').getBoundingClientRect(), x = document.querySelector('.cn-voz-x').getBoundingClientRect(), s = document.querySelector('.cn-voz-si').getBoundingClientRect(); return { ancho: b.width, izq: b.left, der: innerWidth - b.right, x: [x.width, x.height], si: s.height, sw: document.documentElement.scrollWidth, iw: innerWidth }; }")
            chk(d["izq"] >= 8 and d["der"] >= 8 and d["sw"] <= d["iw"], "teléfono: la ventana cabe con márgenes", d)
            chk(d["x"][0] >= 44 and d["x"][1] >= 44 and d["si"] >= 56, "teléfono: X de 44 px o más y botón principal grande", d)
            pg.tap(".cn-voz-caja h2"); hay(pg, r"bienvenida")
            b = pg.evaluate("() => { const r = document.querySelector('.cn-voz-b').getBoundingClientRect(), bs = [...document.querySelectorAll('.cn-voz-b button')].filter(x => x.offsetWidth).map(x => [x.offsetWidth, x.offsetHeight]); return { izq: r.left, der: innerWidth - r.right, abajo: innerHeight - r.bottom, bs, fab: getComputedStyle(document.getElementById('cnFab')).transform }; }")
            chk(b["izq"] >= 4 and b["der"] >= 4 and b["abajo"] >= 4, "teléfono: la barra de voz cabe en pantalla", b)
            chk(all(w >= 42 and h >= 42 for w, h in b["bs"]) and len(b["bs"]) >= 5, "teléfono: botones de la barra de 42 px o más", b["bs"])
            chk(b["fab"] not in ("none", ""), "teléfono: el botón del Índice sube para no quedar tapado", b["fab"])
            pg.emulate_media(media="print")
            chk(pg.evaluate("() => getComputedStyle(document.querySelector('.cn-voz-b')).display") == "none", "impresión: la barra de voz no se imprime")
            c.close()
            c, pg = abrir(nav); ventana(pg)
            r = pg.evaluate("() => { const m = matchMedia('(prefers-reduced-motion: reduce)'); return getComputedStyle(document.querySelector('.cn-voz-velo')).animationName; }")
            chk(r == "cnVozEntra", "computador: la ventana entra con una animación corta", r); c.close()
        # 16. Calidad de lo que se oye en las 22 secciones (castellano)
        if toca("guion"):
            c, pg = abrir(nav, ls={"cn-voz": {"e": "no"}}); pg.wait_for_timeout(1500)
            g = pg.evaluate("() => { const o = {}; __cnVozAPI.secciones().forEach(s => o[s[1]] = __cnVozAPI.guion(s[1])); return o; }")
            todo = [x for v in g.values() for x in v]
            chk(len(g) == 22 and all(len(v) >= 2 for v in g.values()), "guion: las 22 secciones tienen algo que leer", {k: len(v) for k, v in g.items()})
            malos_s = [x for x in todo if re.search(r"\$\s?\d|US\$|https?:|www\.|@\w|[☀◐↘↗≋◎★⚑⚓✓✔→←↑↓▲▼●◆⛏🗞]|\bN/D\b|—", x)]
            chk(not malos_s, "guion: sin signos que se lean mal ($, US$, enlaces, correos, íconos, rayas)", malos_s[:4])
            pegados = [x for x in todo if re.search(r"[a-záéíóúñ][A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}", x) and not re.search(r"IPoM|McL|DataMapper|LatamList|BioBio|TOCTOC|ChileConverge|EcoVera|PuttView|ElevenLabs|MediaMarkt|OpenAI|LinkedIn|YouTube|iPhone|TikTok|WhatsApp|JavaScript|SpaceX|AstroForge|CChC|MACh|ADNOC|NAHB|PNAS|WBFSH|Megabots|CNBC|SCMP", x)]
            chk(len(pegados) <= 2, "guion: palabras de bloques distintos no quedan pegadas", pegados[:5])
            dobles = [x for x in todo if re.search(r"\.\.|,,|, \.|\s[,.;:]", x)]
            chk(not dobles, "guion: sin puntuación doble", dobles[:4])
            chk(not any(re.search(r"^(Toca|Toque|Elige)\b", x) for x in todo), "guion: no lee instrucciones de pantalla")
            chk(any("cuarenta y un mil trescientos cincuenta y siete pesos con 30 centavos" in x for x in g["indicadores"]) and any("Dólar observado: 996 pesos con 68 centavos, y baja 0,45 por ciento" in x for x in g["indicadores"]), "guion: indicadores con pesos y variación bien dichos", g["indicadores"][:2])
            chk(any("mil quinientos sesenta y nueve millones de dólares" in x for x in g["economia"]) and not any(re.search(r"\d\.\d{3}", x) for k in g for x in g[k]), "guion: «US$1.569 millones» se oye «mil quinientos sesenta y nueve millones de dólares» y ninguna cifra con punto de miles llega a la voz")
            chk(any("168 kilómetros al este de Ollagüe" in x for x in g["sismos"]), "guion: «168 km al E» se oye «168 kilómetros al este»")
            chk(any("venció a Ben Shelton, 6 a 2, 7 a 6" in x for x in g["deportes"]), "guion: tenis «Zverev venció a Ben Shelton, 6 a 2, 7 a 6»", [x for x in g["deportes"] if "Shelton" in x][:1])
            chk(not any("Caddie Golf: la app de golf más completa" in x for x in g["deportes"]), "guion: el aviso de Caddie Golf dentro de Deportes no se lee como noticia")
            chk(sum("Para quién:" in x for x in g["emprendimiento"]) <= 3 and any(re.search(r"Quedan? \w+ más en la edición escrita", x) for x in g["emprendimiento"]), "guion: de los fondos lee 3 y avisa cuántos más hay en pantalla", sum("Para quién:" in x for x in g["emprendimiento"]))
            chk(not any(x.startswith("Altura máxima de ola") for x in g["mar"]), "guion: la explicación de un gráfico no se lee", [x for x in g["mar"] if "ola" in x][:1])
            chk(any("Ranking A T P" in x for x in g["deportes"]), "guion: el título de una tabla sí se lee (Ranking A T P, deletreado)")
            chk(sum(len(x) for x in todo) < 60000, "guion: el boletín completo dura menos de una hora a velocidad normal", sum(len(x) for x in todo))
            chk(not any("(" in x or ")" in x for x in todo), "guion natural: los paréntesis se oyen como pausas, nunca como signos", [x for x in todo if "(" in x][:2])
            chk(any("de 10 a 17:30" in x for x in g["entretenimiento"]) and any("de 9 a 18 horas" in x for x in g["entretenimiento"]), "guion natural: horarios «de 10 a 17:30» y «de 9 a 18 horas»", [x for x in g["entretenimiento"] if "Horario" in x][:2])
            chk(any("6 millones de pesos" in x and "1 millón 500 mil pesos" in x for x in g["emprendimiento"]), "guion natural: «6.000.000 pesos» se oye «6 millones de pesos»", [x for x in g["emprendimiento"] if "Monto" in x][:1])
            chk(any("Cepal y Cenia" in x for x in g["tecnologia"]), "guion natural: «Cepal/Cenia» se oye «Cepal y Cenia»")
            chk(any("Pleamar a las 5:36" in x for x in g["mar"]) and not any(re.search(r"\b0\d:\d\d", x) for x in todo), "guion natural: horas sin cero adelante («5:36», no «05:36»)")
            fuentes = " ".join(todo)
            chk(all(k in fuentes for k in ("Según ", "Lo informa ", "Lo publica ")), "guion natural: la fuente se dice de tres maneras que se alternan")
            chk(not re.search(r"(Según|Lo informa|Lo publica) [^.]{0,40}\b(Mundo|portada|English|en inglés|Inglés)\.", fuentes), "guion natural: el nombre del medio sin rótulos del sitio («Mundo», «portada», «Inglés»)")
            chk("Imacec" in fuentes and "IMACEC" not in fuentes, "guion natural: siglas que se leen como palabra («Imacec»), no deletreadas")
            chk(not re.search(r"\d,\d+ (pesos|dólares)\b", fuentes), "guion natural: los decimales de dinero se dicen en centavos", re.findall(r".{20}\d,\d+ (?:pesos|dólares).{10}", fuentes)[:2])
            c.close()
        nav.close()
finally:
    srv.terminate()
chk(not errores, "sin errores de JavaScript en ninguna prueba", errores[:3])
print(f"\n{ok} OK, {len(malos)} fallas" + (": " + "; ".join(malos) if malos else ""))
sys.exit(1 if malos else 0)
