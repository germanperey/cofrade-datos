"""Pruebas del oído continuo: interrumpir a la voz hablando mientras lee (19-11-2026).
Uso: python3 prueba_oido.py <bundle> <puerto>   ·   SOLO=grupo1,grupo2 para correr solo algunos.
El simulador (simulador.js) hace de voz y de micrófono: registra lo dicho, puede «oír» a la propia voz (eco de parlantes)
y recibe lo que dice la persona por __oidos."""
import os, sys, time, json, re, subprocess, urllib.request
from playwright.sync_api import sync_playwright
W, P = sys.argv[1], int(sys.argv[2]); B = f"http://localhost:{P}"; ED = "/edicion/2026-11-18"
SOLO = set(filter(None, (os.environ.get("SOLO") or "").split(",")))
SIM = open("/tmp/titulos/voz/prueba/simulador.js", encoding="utf-8").read()
UA_EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"
UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"
UA_ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"
env = dict(os.environ, PUERTO=str(P), CON_GITHUB="1", ED_EXTRA="/tmp/titulos/ed2", LOCAL_REDIR="1")
srv = subprocess.Popen(["node", "servidor.mjs", W], cwd="/tmp/mf/prueba", env=env, stdout=open(f"/tmp/titulos/voz/srv{P}.log", "w"), stderr=subprocess.STDOUT)
ok, malos, errores = 0, [], []
def chk(c, n, extra=""):
    global ok
    if c: ok += 1
    else: malos.append(n)
    print(("OK   " if c else "FALLA ") + n + (("  · " + str(extra)[:400]) if (extra and not c) else ""), flush=True)
for _ in range(90):
    time.sleep(1)
    try: urllib.request.urlopen(B + "/__despachos", timeout=3); break
    except Exception: pass
def toca(n): return not SOLO or n in SOLO
CASO = os.environ.get("CASO")
def caso(n): return not CASO or CASO == n
def abrir(nav, sim=None, ua=None, tel=False, q=""):
    o = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True) if tel else dict(viewport={"width": 1280, "height": 900})
    if ua: o["user_agent"] = ua
    c = nav.new_context(**o)
    sim = dict(sim or {}); v = dict(sim.get("voz") or {}); v.setdefault("espera", 2500); v.setdefault("entre", 300)
    v.setdefault("spsMax", 80)   # el simulador habla 3 a 6 veces más rápido que una voz real: se permite calibrar a esa velocidad
    sim["voz"] = v
    sim.setdefault("msPorCaracter", 20)
    if os.environ.get("BILINGUE"): sim.setdefault("bilingue", True)
    c.add_init_script("window.__simCfg = " + json.dumps(sim) + ";")
    c.add_init_script(SIM)
    pg = c.new_page(); pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto(B + ED + q, wait_until="load", timeout=180000)
    return c, pg
def esperar(pg, js, tope=15000, paso=40, arg=None):
    t0 = time.time()
    while (time.time() - t0) * 1000 < tope:
        try:
            if (pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)): return True
        except Exception: pass
        pg.wait_for_timeout(paso)
    return False
def dicho(pg): return pg.evaluate("() => __dicho.map(d => d.t)")
def n_dicho(pg): return pg.evaluate("() => __dicho.length")
def dicho_desde(pg, k): return dicho(pg)[k:]
def llega(pg, rx, desde=0, tope=20000):   # alguna frase (desde la posición «desde») calza con rx
    return esperar(pg, "([rx, k]) => __dicho.slice(k).some(d => new RegExp(rx, 'm').test(d.t))", tope, arg=[rx, desde])
def diciendo(pg, rx, tope=30000):   # la voz está diciendo AHORA una frase que calza con rx
    return esperar(pg, "(rx) => { const d = __dicho[__dicho.length - 1]; return !!d && !d.fin && speechSynthesis.speaking && new RegExp(rx, 'm').test(d.t); }", tope, paso=10, arg=rx)
def habla(pg, texto): pg.evaluate("(t) => { __oidos.push(t); }", texto)
def est(pg): return pg.evaluate("() => __cnVozAPI.estado()")
def escuchando(pg, tope=20000): return esperar(pg, "() => !!(window.__cnVozAPI && __cnVozAPI.estado().espera)", tope)
def encender(pg):
    esperar(pg, "() => !!document.querySelector('.cn-voz-velo')", 8000); pg.wait_for_timeout(450); pg.mouse.click(12, 12)
def secciones_dichas(pg, desde=0): return [int(m.group(1)) for x in dicho_desde(pg, desde) for m in [re.match(r"^Sección (\d+): ", x)] if m]
try:
    with sync_playwright() as p:
        nav = p.chromium.launch()
        # 1. Transparencia: en computador la ventana avisa que el micrófono queda abierto; en el teléfono, no (allí se escucha por turnos)
        if toca("nota"):
            c, pg = abrir(nav); esperar(pg, "() => !!document.querySelector('.cn-voz-nota')", 8000)
            nota = pg.evaluate("() => document.querySelector('.cn-voz-nota').textContent")
            chk("el micrófono queda abierto" in nota and est(pg)["continuo"], "computador: la ventana avisa que el micrófono queda abierto mientras lee", nota)
            c.close()
            c, pg = abrir(nav, ua=UA_IPHONE, tel=True); esperar(pg, "() => !!document.querySelector('.cn-voz-nota')", 8000)
            nota = pg.evaluate("() => document.querySelector('.cn-voz-nota').textContent")
            chk("micrófono queda abierto" not in nota and not est(pg)["continuo"], "iPhone: escucha por turnos y no promete micrófono abierto", nota)
            c.close()
            c, pg = abrir(nav, ua=UA_ANDROID, tel=True)
            chk(not est(pg)["continuo"], "Android: escucha por turnos (cada escucha suena con un pitido)")
            c.close()
        # 2. Con audífonos (sin eco): mientras lee el índice, la persona dice el número del ítem que está oyendo
        if toca("numero"):
            c, pg = abrir(nav); encender(pg)
            chk(llega(pg, r"puedes interrumpirme cuando quieras"), "pregunta inicial: avisa que se le puede interrumpir")
            chk(esperar(pg, "() => __cnVozAPI.estado().oido", 8000), "el micrófono queda abierto mientras lee (oído continuo)")
            chk(pg.evaluate("() => __sesiones.length >= 1 && __sesiones.every(s => s.continuo)"), "la escucha es continua (una sola sesión abierta, sin turnos)", pg.evaluate("() => __sesiones"))
            escuchando(pg); habla(pg, "índice")
            chk(esperar(pg, "() => /Te escuché: «índice»/.test(document.getElementById('cnVozEst').textContent)", 4000), "la barra muestra «Te escuché: «índice»»", pg.evaluate("() => (document.getElementById('cnVozEst')||{}).textContent"))
            chk(llega(pg, r"dime índice y el número o el nombre, aunque yo esté hablando"), "índice: explica que se le puede interrumpir con «índice» y el número o el nombre")
            chk(diciendo(pg, r"^6, Efemérides"), "índice: va leyendo los ítems")
            pg.wait_for_timeout(500); k = n_dicho(pg); habla(pg, "cinco")
            chk(llega(pg, r"^Sección 5: Conflictos bélicos vigentes\.", k, 8000), "interrumpe: «cinco» dicho después del ítem 5 abre Conflictos", dicho_desde(pg, k - 1)[:4])
            chk(pg.evaluate("(k) => !__dicho[k - 1].fin", k), "interrumpe: la voz se calla al instante (corta lo que estaba diciendo)", pg.evaluate("(k) => __dicho[k - 1]", k))
            pg.wait_for_timeout(2000)
            chk(not any(re.match(r"^(6|7), ", x) for x in dicho_desde(pg, k)), "interrumpe: no sigue enumerando el índice por detrás", dicho_desde(pg, k)[:5])
            chk(est(pg)["eco"] == 0, "con audífonos no detecta eco y confía en lo que dice la persona", est(pg))
            c.close()
        # 3. Por nombre, en medio de una sección (modo radio)
        if toca("nombre"):
            c, pg = abrir(nav); encender(pg)
            chk(llega(pg, r"^Sección 1: Economía", 0, 40000), "sin respuesta: empieza el modo radio")
            llega(pg, r"^Utilidad de SQM", 0, 20000); k = n_dicho(pg); habla(pg, "deportes")
            chk(llega(pg, r"^Sección 21: Deportes\.", k, 30000) and any(x.startswith("Favor, permíteme terminar") for x in dicho_desde(pg, k)), "interrumpe por nombre: «deportes» en medio de Economía: avisa, termina la noticia y abre Deportes", dicho_desde(pg, k - 1)[:4])
            llega(pg, r"^(Además|Por otra parte|En otra noticia|También), ", n_dicho(pg) - 1, 20000); k = n_dicho(pg); pg.wait_for_timeout(600); habla(pg, "léeme el pronóstico del tiempo")
            chk(llega(pg, r"^Sección 10: Pronóstico del tiempo", k, 30000), "interrumpe con una frase: «léeme el pronóstico del tiempo»", dicho_desde(pg, k)[:3])
            c.close()
        # 3b. Conversación con otra persona en la sala: no cambia la lectura
        if toca("conversa"):
            c, pg = abrir(nav); encender(pg)
            llega(pg, r"^Sección 1: Economía", 0, 40000); llega(pg, r"^Utilidad de SQM", 0, 20000)
            k = n_dicho(pg)
            for frase in ("oye viste las noticias de deportes de ayer", "tengo 5 hijos y dos nietos", "chao mamá"):
                habla(pg, frase); pg.wait_for_timeout(1700)
            s2 = secciones_dichas(pg, k)
            chk(not s2 and est(pg)["on"] and not est(pg)["pausado"], "una conversación ajena (deportes, un número, un «chao») no cambia ni apaga la lectura", (s2, dicho_desde(pg, k)[:3]))
            habla(pg, "apaga la voz")
            chk(esperar(pg, "() => !__cnVozAPI.estado().on", 5000), "«apaga la voz» sí la apaga")
            c.close()
        # 3c. Frases con «un», «una» o «segundo» no son números; «sigue» a «¿Sigo con las demás?» lee el grupo siguiente
        if toca("frases"):
            c, pg = abrir(nav, sim={"voz": {"espera": 6000}}); encender(pg)
            escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
            llega(pg, r"Sigo con las demás", 0, 15000); escuchando(pg, 8000); k = n_dicho(pg); habla(pg, "sí, sigue")
            chk(llega(pg, r"^7, Historia Naval", k, 8000) and not any(re.match(r"^1, ", x) for x in dicho_desde(pg, k)), "«sí, sigue» ante «¿Sigo con las demás?» lee el grupo siguiente", dicho_desde(pg, k)[:3])
            llega(pg, r"Sigo con las demás", k + 1, 15000); escuchando(pg, 8000); k = n_dicho(pg)
            habla(pg, "un momento"); pg.wait_for_timeout(1600); habla(pg, "dame un segundo"); pg.wait_for_timeout(1600)
            chk(not secciones_dichas(pg, k), "«un momento» y «dame un segundo» no abren las secciones 1 ni 2", dicho_desde(pg, k)[:4])
            escuchando(pg, 15000); k = n_dicho(pg); habla(pg, "léeme una noticia de deportes")
            chk(llega(pg, r"^Sección 21: Deportes", k, 8000), "«léeme una noticia de deportes» abre Deportes (no la sección 1)", dicho_desde(pg, k)[:3])
            c.close()
        # 3d. Cómo se dicen horas, montos y barras (pruebas directas del texto hablado)
        if toca("hablable"):
            c, pg = abrir(nav)
            casos = [("De 09:00 a 13:00", "De 9 a 13 horas"), ("a partir de las 10:00 a 12:00", "a partir de las 10 a 12 horas"), ("Abre 09:00 a 18:00 hrs.", "Abre de 9 a 18 horas"),
                     ("Cierra a la 1:00", "Cierra a la una"), ("Tiempo: 2:00:35", "Tiempo: 2:00:35"), ("Pleamar 05:36", "Pleamar 5:36"), ("Lluvia de 20 mm/h", "Lluvia de 20 milímetros por hora"),
                     ("Cada usuario/a recibe", "Cada usuario recibe"), ("Fuente: Cepal/Cenia", "Fuente: Cepal y Cenia"), ("Premio de 6.000.000 pesos", "Premio de 6 millones de pesos"),
                     ("Total 1.500.000", "Total 1 millón 500 mil"), ("El dólar cerró en $996,68 (baja 0,45%)", "El dólar cerró en 996 pesos con 68 centavos, baja 0,45%")]
            out = pg.evaluate("(xs) => xs.map(x => __cnVozAPI.hablable(x))", [a for a, _ in casos])
            malos_h = [(a, o, b) for (a, b), o in zip(casos, out) if o != b]
            chk(not malos_h, f"texto hablado: {len(casos) - len(malos_h)} de {len(casos)} frases quedan como las diría una persona", malos_h)
            barril = pg.evaluate("() => __cnVozAPI.hablable('Petróleo a 78 US$/barril')")
            chk("por barril" in barril and "y barril" not in barril, "texto hablado: «US$/barril» se oye «dólares por barril»", barril)
            c.close()
        # 3e. Si la escucha continua no sirve en el navegador, se escucha por turnos sin que la persona haga nada
        if toca("fallas"):
            c, pg = abrir(nav, sim={"continuoRoto": True, "voz": {"diag": True}}); encender(pg)
            chk(esperar(pg, "() => __cnVozAPI.estado().turnos === 'se-corta' && !__cnVozAPI.estado().continuo", 8000), "escucha que se corta al empezar: pasa sola a escuchar por turnos", est(pg))
            chk(esperar(pg, "() => /paso a escuchar por turnos/.test((document.getElementById('cnVozDiag')||{}).textContent || '')", 3000), "el diagnóstico en pantalla muestra el cambio a turnos")
            escuchando(pg, 40000); habla(pg, "índice")
            chk(llega(pg, r"tiene 22 secciones", 0, 10000), "escucha que se corta: por turnos, «índice» sí funciona")
            c.close()
            c, pg = abrir(nav, sim={"sinFinales": True}); encender(pg)
            escuchando(pg, 40000); habla(pg, "índice")
            chk(llega(pg, r"tiene 22 secciones", 0, 10000), "solo resultados provisorios (sin final): «índice» funciona igual")
            chk(diciendo(pg, r"^6, Efemérides"), "solo provisorios: va leyendo el índice"); pg.wait_for_timeout(500); k = n_dicho(pg); habla(pg, "cinco")
            chk(llega(pg, r"^Sección 5: Conflictos", k, 6000), "solo provisorios: interrumpir con «cinco» funciona", dicho_desde(pg, k)[:3])
            c.close()
            c, pg = abrir(nav, sim={"mudo": True, "voz": {"espera": 9000}}); encender(pg)
            pg.wait_for_timeout(800); habla(pg, "hola"); pg.wait_for_timeout(1500); habla(pg, "hola")
            chk(esperar(pg, "() => __cnVozAPI.estado().turnos === 'sin-texto'", 12000), "oye voz pero no entrega texto: pasa sola a escuchar por turnos", est(pg))
            escuchando(pg, 40000); pg.wait_for_timeout(200); habla(pg, "índice")
            chk(llega(pg, r"tiene 22 secciones", 0, 12000), "tras el cambio a turnos, «índice» funciona", dicho(pg)[-3:])
            c.close()
        # 4. Pausa y sigue, por voz
        if toca("pausa"):
            c, pg = abrir(nav); encender(pg)
            llega(pg, r"^Sección 1: Economía", 0, 40000); llega(pg, r"^Utilidad de SQM", 0, 20000)
            habla(pg, "pausa")
            chk(esperar(pg, "() => __cnVozAPI.estado().pausado", 5000), "«pausa» por voz detiene la lectura")
            k = n_dicho(pg); pg.wait_for_timeout(1800)
            chk(n_dicho(pg) == k and not pg.evaluate("() => speechSynthesis.speaking"), "en pausa no sigue hablando", dicho_desde(pg, k))
            chk(est(pg)["oido"], "en pausa el micrófono sigue escuchando (para decir «sigue»)")
            habla(pg, "sigue")
            chk(esperar(pg, "(k) => __dicho.length > k && !__cnVozAPI.estado().pausado", 6000, arg=k), "«sigue» por voz retoma donde quedó", dicho_desde(pg, k)[:2])
            c.close()
        # 5. Con parlantes (el micrófono oye a la voz): el eco nunca da órdenes y la lectura sigue su orden
        VUELTAS = ((False, False), (True, False), (False, True))
        if os.environ.get('SOLO_RECORTE'): VUELTAS = ((False, True),)
        if os.environ.get('ECO_VUELTAS'): VUELTAS = tuple(VUELTAS[int(x)] for x in os.environ['ECO_VUELTAS'].split(','))
        for limites, recorte in VUELTAS:
            if not toca("eco"): break
            nombre = "con frases recortadas" if recorte else "con avisos de palabra (Edge)" if limites else "sin avisos de palabra (Chrome)"
            sim = {"eco": True, "limites": limites, "msPorCaracter": 10}
            if recorte: sim.update({"ecoInicio": True, "ecoSinRuido": True})
            c, pg = abrir(nav, sim=sim)
            encender(pg)
            chk(llega(pg, r"^Sección 2: Política", 0, 150000), f"eco {nombre}: el modo radio llega a la sección 2", secciones_dichas(pg))
            llega(pg, r"^Sección 2: Política", 0, 1000); pg.wait_for_timeout(4000)
            s = secciones_dichas(pg)
            chk(s[:2] == [1, 2] and s == sorted(s), f"eco {nombre}: el eco no hace saltar de sección", s)
            t = "\n".join(dicho(pg))
            chk("No te entendí" not in t, f"eco {nombre}: nunca responde «no te entendí» a su propio eco")
            chk("tiene 22 secciones" not in t, f"eco {nombre}: la palabra «índice» dicha por la voz no abre el índice")
            chk(est(pg)["eco"] > 0, f"eco {nombre}: detecta que el micrófono oye a la voz (filtro estricto)", est(pg))
            chk(pg.evaluate("() => __oido.length") >= 15, f"eco {nombre}: el micrófono sí recibió el eco (la prueba es real)", pg.evaluate("() => __oido.length"))
            chk(est(pg)["sps"] > 0, f"eco {nombre}: calibra la velocidad de la voz con las frases que terminan", est(pg))
            if recorte: chk(est(pg)["ajenas"] <= 2, f"eco {nombre}: a lo más 2 frases del eco quedan atribuidas a la persona (y ninguna da una orden)", est(pg))
            c.close()
        # 6. Con parlantes: una palabra suelta que la voz está diciendo es eco; dicha después, es la persona
        if toca("estricto"):
            EST = {"eco": True, "ecoFiel": True, "voz": {"espera": 8000}}
            if caso("suelto"):
                c, pg = abrir(nav, sim=EST); encender(pg)
                escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
                chk(llega(pg, r"tiene 22 secciones", 0, 10000), "parlantes: la persona pide el índice durante la espera")
                chk(est(pg)["eco"] > 0, "parlantes: a esta altura ya detectó el eco", est(pg))
                chk(llega(pg, r"dime índice y el número o el nombre, aunque yo esté hablando; por ejemplo, índice cinco", 0, 8000), "parlantes: enseña a interrumpir empezando con «índice»")
                chk(diciendo(pg, r"^5, Conflictos"), "parlantes: la voz está diciendo el ítem 5"); k = n_dicho(pg); habla(pg, "cinco")
                chk(llega(pg, r"^6, Efemérides", k, 6000) and not any(x.startswith("Sección 5") for x in dicho_desde(pg, k)), "parlantes: «cinco» suelto justo cuando la voz dice «5» se toma como eco", dicho_desde(pg, k)[:3])
                escuchando(pg, 10000); pg.wait_for_timeout(4500); k = n_dicho(pg); habla(pg, "cinco")
                chk(llega(pg, r"^Sección 5: Conflictos", k, 6000), "parlantes: «cinco» dicho segundos después (en la espera) sí abre la sección 5", dicho_desde(pg, k)[:3])
                c.close()
            if caso("ruido"):   # sala ruidosa: ningún eco llega limpio; igual detecta el eco por las palabras seguidas de la voz
                c, pg = abrir(nav, sim={"eco": True, "ecoFiel": True, "ecoSiempreRuido": True, "voz": {"espera": 8000}}); encender(pg)
                escuchando(pg, 40000)
                chk(est(pg)["eco"] > 0, "sala ruidosa: detecta el eco aunque ninguna frase llegue limpia", est(pg))
                t = "\n".join(dicho(pg))
                chk("No te entendí" not in t, "sala ruidosa: el ruido pegado al eco no provoca «no te entendí»")
                c.close()
            if caso("pregunta"):   # con parlantes, «índice» dicho MIENTRAS la voz pregunta «¿Te leo el índice?» es la respuesta
                c, pg = abrir(nav, sim=EST); encender(pg)
                chk(diciendo(pg, r"Quieres que te lea los temas del índice", 40000), "parlantes: la voz está haciendo la pregunta del índice")
                chk(est(pg)["eco"] > 0, "parlantes: ya detectó el eco antes de la pregunta", est(pg))
                pg.wait_for_timeout(300); habla(pg, "índice")
                chk(llega(pg, r"tiene 22 secciones", 0, 10000), "parlantes: «índice» dicho mientras pregunta abre el índice", dicho(pg)[-3:])
                c.close()
            if caso("numero"):
                c, pg = abrir(nav, sim=EST); encender(pg)
                escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
                chk(diciendo(pg, r"^5, Conflictos"), "parlantes: la voz está diciendo el ítem 5"); k = n_dicho(pg); habla(pg, "número cinco")
                chk(llega(pg, r"^Sección 5: Conflictos", k, 6000), "parlantes: «número cinco» mientras la voz dice «5» sí abre la sección", dicho_desde(pg, k)[:3])
                c.close()
            if caso("lee"):
                c, pg = abrir(nav, sim=EST); encender(pg)
                escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
                chk(diciendo(pg, r"^5, Conflictos"), "parlantes: la voz está diciendo el ítem 5"); k = n_dicho(pg); habla(pg, "lee la cinco")
                chk(llega(pg, r"^Sección 5: Conflictos", k, 6000), "parlantes: «lee la cinco» mientras la voz dice «5» sí abre la sección", dicho_desde(pg, k)[:3])
                c.close()
            if caso("mixto"):
                c, pg = abrir(nav, sim=EST); encender(pg)
                escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
                chk(diciendo(pg, r"^6, Efemérides"), "parlantes: la voz está diciendo el ítem 6"); k = n_dicho(pg); habla(pg, "seis efemérides del día deportes")
                chk(llega(pg, r"^Sección 21: Deportes", k, 6000), "parlantes: eco y persona mezclados («seis efemérides del día» + «deportes») abre Deportes", dicho_desde(pg, k)[:3])
                c.close()
        # 7. Chrome cierra la escucha cada tanto: se vuelve a abrir sola y las órdenes siguen funcionando
        if toca("reinicio"):
            c, pg = abrir(nav, sim={"finSesionMs": 2500}); encender(pg)
            chk(esperar(pg, "() => __sesiones.length >= 4", 15000), "la escucha se reabre sola cada vez que el navegador la cierra", pg.evaluate("() => __sesiones.length"))
            k = n_dicho(pg); habla(pg, "deportes")
            chk(llega(pg, r"^Sección 21: Deportes", k, 10000), "después de varios reinicios, «deportes» sigue funcionando")
            c.close()
        # 8. Teléfono: por turnos, con el aviso del micrófono dorado
        if toca("movil"):
            c, pg = abrir(nav, ua=UA_IPHONE, tel=True)
            esperar(pg, "() => !!document.querySelector('.cn-voz-velo')", 8000); pg.wait_for_timeout(450); pg.tap(".cn-voz-caja h2")
            chk(llega(pg, r"toca el micrófono dorado de abajo", 0, 40000), "iPhone: la pregunta inicial explica cómo interrumpir (micrófono dorado)")
            escuchando(pg); habla(pg, "índice")
            chk(llega(pg, r"tiene 22 secciones", 0, 10000), "iPhone: responde por turnos")
            chk(pg.evaluate("() => __sesiones.length >= 1 && __sesiones.every(s => !s.continuo)"), "iPhone: nunca deja el micrófono abierto mientras habla", pg.evaluate("() => __sesiones"))
            c.close()
        # 9. Apagar la voz cierra el micrófono
        if toca("apagar"):
            c, pg = abrir(nav); encender(pg); llega(pg, r"Las tres noticias del día", 0, 15000)
            chk(est(pg)["oido"], "con la voz encendida el micrófono escucha")
            pg.click('.cn-voz-b [data-a="salir"]')
            chk(esperar(pg, "() => !__cnVozAPI.estado().on && !__cnVozAPI.estado().oido && !window.__recContinuo", 4000), "al apagar la voz se cierra el micrófono", est(pg))
            n = pg.evaluate("() => __sesiones.length"); pg.wait_for_timeout(1500)
            chk(pg.evaluate("() => __sesiones.length") == n, "apagada, la escucha no se vuelve a abrir sola")
            c.close()
        # 10. Edge: las voces naturales llegan tarde; se despiertan con una frase muda y se lee con Catalina desde la primera frase
        if toca("edge"):
            c, pg = abrir(nav, sim={"vocesTarde": True}, ua=UA_EDGE); encender(pg); llega(pg, r"bienvenida", 0, 10000)
            d0 = pg.evaluate("() => __dicho[0]")
            chk("Catalina" in (d0.get("v") or ""), "Edge: la primera frase ya sale con Catalina", d0)
            chk(pg.evaluate("() => __mudas") >= 1, "Edge: usa una frase muda para despertar las voces naturales")
            c.close()
        # 11. Edge 150 a veces entrega voces «undefined»: nunca se eligen
        if toca("indefinidas"):
            c, pg = abrir(nav, sim={"vocesIndefinidas": True}); encender(pg); llega(pg, r"bienvenida", 0, 10000)
            v = pg.evaluate("() => __dicho.map(d => d.v)")
            chk(v and all(x == "Microsoft Helena - Spanish (Spain)" for x in v[:3]), "voces «undefined» de Edge: se descartan y se usa una voz real", v[:3])
            c.close()
        # 12. Largo de cada tramo según la voz: las de Google se cortan solas pasados ~15 s
        if toca("tramos"):
            g_voces = [{"name": "Google español", "lang": "es-ES", "localService": False}, {"name": "Google US English", "lang": "en-US", "localService": False}]
            for voces, nombre, tope, minimo in ((g_voces, "Google", 230, 0), (None, "Catalina", 640, 300)):
                sim = {"voces": voces} if voces else {}
                sim["msPorCaracter"] = 5
                c, pg = abrir(nav, sim=sim); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "inmobiliario")
                llega(pg, r"^Sección 15: Crecimiento inmobiliario", 0, 10000); llega(pg, r"^Hasta aquí Crecimiento inmobiliario", 0, 60000)
                largos = [len(x) for x in dicho(pg)]
                chk(max(largos) <= tope and max(largos) >= minimo, f"tramos con {nombre}: el más largo mide {max(largos)} caracteres (tope {tope})", sorted(largos)[-5:])
                c.close()
        # 13. Cambio de idioma: el oído pasa a escuchar en inglés
        if toca("idioma"):
            c, pg = abrir(nav); encender(pg); llega(pg, r"Las tres noticias del día", 0, 15000)
            pg.click("#btnIdioma")
            chk(esperar(pg, "() => __langOido.includes('en-US')", 20000), "al pasar a inglés, el micrófono escucha en inglés", pg.evaluate("() => __langOido"))
            c.close()
        # 14. 19-11-2026 · el micrófono se pide UNA sola vez, al encender con un toque, aunque el oído se reabra muchas veces
        if toca("permiso"):
            c, pg = abrir(nav, sim={"finSesionMs": 900}); encender(pg)
            esperar(pg, "() => __sesiones.length >= 4", 15000)
            chk(pg.evaluate("() => __gum") == 1, "permiso: el micrófono se pide una sola vez aunque el oído se reabra muchas veces", pg.evaluate("() => [__gum, __sesiones.length]"))
            chk(pg.evaluate("() => __gumStop") >= 1, "permiso: el pedido no deja el micrófono tomado (se suelta al tiro)")
            c.close()
            c, pg = abrir(nav, sim={"mic": "granted"}); encender(pg); esperar(pg, "() => __cnVozAPI.estado().oido", 8000)
            chk(pg.evaluate("() => __gum") == 0, "permiso ya concedido: no se vuelve a pedir")
            c.close()
            c, pg = abrir(nav, sim={"mic": "denied", "finSesionMs": 900}); encender(pg)
            llega(pg, r"bienvenida", 0, 10000); pg.wait_for_timeout(2500)
            s0 = pg.evaluate("() => __sesiones.length"); pg.wait_for_timeout(3000); s1 = pg.evaluate("() => __sesiones.length")
            chk(s1 == s0 and s1 <= 1, "micrófono bloqueado: no se insiste (sin reaperturas)", [s0, s1, pg.evaluate("() => __gum")])
            chk(llega(pg, r"No logro escucharte por el micrófono", 0, 40000), "micrófono bloqueado: lo dice y sigue leyendo")
            pg.wait_for_timeout(1500)
            chk(len([x for x in dicho(pg) if "No logro escucharte" in x]) == 1, "micrófono bloqueado: el aviso no se repite", [x for x in dicho(pg) if "No logro" in x])
            c.close()
            c, pg = abrir(nav, sim={"finSesionMs": 900}); encender(pg); esperar(pg, "() => __sesiones.length >= 2", 10000)
            pg.evaluate("() => __micCambia('denied')"); pg.wait_for_timeout(600); s0 = pg.evaluate("() => __sesiones.length"); pg.wait_for_timeout(3000)
            chk(pg.evaluate("() => __sesiones.length") == s0 and not est(pg)["oido"], "permiso quitado a mitad de la lectura: el oído se cierra y no reintenta", [s0, pg.evaluate("() => __sesiones.length")])
            c.close()
            c, pg = abrir(nav, ua=UA_IPHONE, tel=True); encender(pg); llega(pg, r"bienvenida", 0, 10000)
            chk(pg.evaluate("() => __gum") == 0, "iPhone: no abre el micrófono aparte (bajaría el volumen de la voz)")
            c.close()
            # navegador sin consulta de permisos: si la persona bloquea en la ventana, el oído se cierra y no se insiste
            c, pg = abrir(nav, sim={"sinConsulta": True, "alPedir": "bloquea", "sinAvisoCambio": True, "finSesionMs": 900}); encender(pg)
            llega(pg, r"bienvenida", 0, 10000); pg.wait_for_timeout(2500)
            s0 = pg.evaluate("() => __sesiones.length"); pg.wait_for_timeout(3000); s1 = pg.evaluate("() => __sesiones.length")
            chk(pg.evaluate("() => __gum") == 1 and s1 == s0 and not est(pg)["oido"], "bloqueado en la ventana (sin consulta de permisos): el oído se cierra y no se insiste", [pg.evaluate("() => __gum"), s0, s1])
            c.close()
            # la ventana de permiso aún abierta: apagar y volver a encender no abre una segunda ventana
            c, pg = abrir(nav, sim={"gumDemoraMs": 2500}); encender(pg); pg.wait_for_timeout(400)
            pg.evaluate("() => { __cnVozAPI.apagar(); __cnVozAPI.encender(); }"); pg.wait_for_timeout(3500)
            chk(pg.evaluate("() => __gum") == 1, "con la ventana del micrófono abierta, apagar y encender no la pide otra vez", pg.evaluate("() => __gum"))
            c.close()
        # 15. 19-11-2026 · cambiar de sección hablando en cualquier momento, con frases naturales (Germán: «interrumpir por voz en cualquier momento»)
        if toca("navega"):
            casos = [("pasa a conflictos", r"^Sección 5: Conflictos"), ("sigue con inmobiliario", r"^Sección 15: Crecimiento inmobiliario"),
                     ("vamos a la cinco", r"^Sección 5: "), ("continúa con la quince", r"^Sección 15: "), ("salta a efemérides", r"^Sección 6: Efemérides"),
                     ("quiero escuchar inmobiliario", r"^Sección 15: ")]
            for frase, rx in casos:
                c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "todo")
                llega(pg, r"^Sección 1: ", 0, 15000); pg.wait_for_timeout(900)
                k = n_dicho(pg); habla(pg, frase)
                chk(llega(pg, rx, k, 30000), f"en plena lectura, «{frase}» cambia de sección", dicho_desde(pg, k)[:3])
                c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "todo")
            llega(pg, r"^Sección 1: ", 0, 15000); pg.wait_for_timeout(900); k = n_dicho(pg); habla(pg, "otra sección")
            chk(llega(pg, r"secciones, y algunas traen temas propios\. Te las digo", k, 30000), "«otra sección» lee el índice para elegir", dicho_desde(pg, k)[:3])
            c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "todo")
            llega(pg, r"^Sección 1: ", 0, 15000); pg.wait_for_timeout(900); i0 = est(pg)["i"]; k = n_dicho(pg)
            habla(pg, "la inflación sigue muy alta en el país")
            pg.wait_for_timeout(2500)
            chk(est(pg)["i"] == i0 and not any(re.match(r"^Sección \d+: ", x) for x in dicho_desde(pg, k)), "una conversación en la sala con «sigue» no cambia de sección", dicho_desde(pg, k)[:3])
            c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "conflictos")
            llega(pg, r"^Sección 5: Conflictos", 0, 10000); pg.wait_for_timeout(900); k = n_dicho(pg); habla(pg, "sáltate conflictos")
            chk(llega(pg, r"^Sección 6: ", k, 30000), "«sáltate conflictos» mientras lee Conflictos pasa a la siguiente", dicho_desde(pg, k)[:3])
            c.close()
        # 16. 19-11-2026 · voz más cálida: tono algo más grave, títulos más pausados, respiros entre noticias y uniones como las de una persona
        if toca("calida"):
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); llega(pg, r"^(Además|Por otra parte|En otra noticia|También), ", 0, 40000)
            esperar(pg, "() => { const j = __dicho.findIndex(d => /^Sección 1: /.test(d.t)); return j >= 0 && __dicho.length >= j + 9; }", 30000)   # varias noticias seguidas
            D = pg.evaluate("() => __dicho.map(d => ({t: d.t, p: d.p, r: d.r, at: d.at, fin: d.fin || 0}))"); rt = est(pg)["rate"]
            tit = [d for d in D if d["t"].startswith("Sección 1:")]
            chk(tit and abs(tit[0]["p"] - 0.93) < 1e-6 and abs(tit[0]["r"] - rt * 0.95) < 1e-6, "voz cálida: el título de la sección va un poco más grave y pausado", tit[:1])
            otros = sorted(set(round(d["p"], 3) for d in D if not d["t"].startswith("Sección ")))
            chk(otros == [0.95], "voz cálida: tono 0,95 en el resto de las frases", otros)
            j = next((i for i, d in enumerate(D) if d["t"].startswith("Sección 1:")), -1)
            gap = (D[j + 1]["at"] - D[j]["fin"]) if j >= 0 and j + 1 < len(D) and D[j]["fin"] else -1
            chk(gap >= 330, "voz cálida: respira después del título antes de la primera noticia", gap)
            gaps = [D[i + 1]["at"] - D[i]["fin"] for i in range(j + 1, len(D) - 1) if D[i]["fin"]]
            chk(gaps and max(gaps) >= 260, "voz cálida: un respiro corto entre noticias", gaps[:8])
            con = [d["t"][:30] for d in D if re.match(r"^(Además|Por otra parte|En otra noticia|También), ", d["t"])]
            chk(con and not any(re.match(r"^(Además|Por otra parte|En otra noticia|También), (Quedan|Queda) ", d["t"]) for d in D), "voz cálida: une las noticias como una persona («Además, …»), nunca antes de «Quedan…»", con[:4])
            seguidos = [i for i in range(1, len(D)) if re.match(r"^(Además|Por otra parte|En otra noticia|También), ", D[i]["t"]) and re.match(r"^(Además|Por otra parte|En otra noticia|También), ", D[i - 1]["t"])]
            chk(not seguidos, "voz cálida: no usa uniones en dos frases seguidas (una sí y otra no)", seguidos[:3])
            chk(llega(pg, r"qué gusto tenerte aquí", 0, 1000), "voz cálida: saludo cercano")
            c.close()
        # 17. 19-11-2026 · otra sección a media noticia: la voz avisa con cortesía, termina la noticia y cambia (Germán, 18:48)
        if toca("cortesia"):
            NOTICIA = r"^(?!Sección \d|Favor, )\S.{80,}"
            def cortada_y_resto(pg, k, rx_dest):
                llega(pg, rx_dest, k, 30000); D = dicho_desde(pg, k - 1)
                j = next((i for i, x in enumerate(D) if x.startswith("Favor, permíteme")), -1); jd = next((i for i, x in enumerate(D) if re.match(rx_dest, x)), -1)
                return D, j, jd
            c, pg = abrir(nav, {"bilingue": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000)
            chk(diciendo(pg, NOTICIA), "cortesía: la voz está leyendo una noticia")
            k = n_dicho(pg); habla(pg, "índice deportes")
            chk(llega(pg, r"^Favor, permíteme terminar de informarte esta noticia y a continuación yo continuaré con Deportes, la sección del Menú que me solicitas\.", k, 8000), "cortesía: «índice deportes» a media noticia: avisa con la frase de Germán y el nombre de la sección", dicho_desde(pg, k)[:3])
            D, j, jd = cortada_y_resto(pg, k, r"^Sección 21: Deportes\.")
            chk(jd > j, "cortesía: después cambia a Deportes", D[:6])
            entre = D[j + 1:jd] if j >= 1 and jd > j else []
            chk(len(entre) == 1 and D[j - 1].endswith(entre[0]), "cortesía: antes de cambiar, termina la noticia que estaba leyendo (solo esa)", [D[j - 1][:90] if j >= 1 else None, entre])
            chk(not any("Una pausa para agradecer" in x for x in entre), "cortesía: no mete auspicios entre medio")
            c.close()
            c, pg = abrir(nav, {"bilingue": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); diciendo(pg, NOTICIA); k = n_dicho(pg); habla(pg, "índice cinco")
            chk(llega(pg, r"^Favor, permíteme terminar.*con Conflictos bélicos vigentes, la sección del Menú", k, 8000), "cortesía: «índice cinco» nombra la sección pedida", dicho_desde(pg, k)[:2])
            pg.wait_for_timeout(1700); k2 = n_dicho(pg); habla(pg, "ahora")
            chk(llega(pg, r"^Sección 5: Conflictos", k2, 6000), "cortesía: si la persona dice «ahora», cambia de inmediato", dicho_desde(pg, k2)[:3])
            c.close()
            c, pg = abrir(nav, {"bilingue": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); diciendo(pg, NOTICIA); k = n_dicho(pg); habla(pg, "índice deportes")
            llega(pg, r"^Favor, permíteme", k, 8000); pg.wait_for_timeout(1700); k2 = n_dicho(pg); habla(pg, "índice horóscopo")
            chk(llega(pg, r"^Sección \d+: Horóscopo", k2, 8000) and not llega(pg, r"^Sección 21: Deportes", k2, 1500), "cortesía: si insiste con otra sección, va de inmediato a la nueva", dicho_desde(pg, k2)[:3])
            c.close()
            c, pg = abrir(nav, {"bilingue": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); diciendo(pg, NOTICIA); k = n_dicho(pg); habla(pg, "pausa")
            chk(esperar(pg, "() => __cnVozAPI.estado().pausado", 4000) and not llega(pg, r"^Favor, permíteme", k, 1500), "cortesía: «pausa» sigue siendo instantánea (sin la frase)")
            c.close()
            c, pg = abrir(nav, {"bilingue": True, "limites": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000)
            listo = esperar(pg, "() => { const d = __dicho[__dicho.length - 1]; return !!d && !d.fin && /^(?!Sección \\d|Favor, )\\S.{60,}?\\. \\S.{60,}/.test(d.t) && Date.now() - d.at > 0.55 * d.dur; }", 60000, paso=20)
            k = n_dicho(pg); habla(pg, "índice deportes")
            D, j, jd = cortada_y_resto(pg, k, r"^Sección 21: Deportes\.")
            cort, res = (D[j - 1], D[j + 1]) if j >= 1 and jd > j + 1 else ("", "")
            chk(listo and res and cort.endswith(res) and len(res) < len(cort), "cortesía: retoma la noticia desde la frase que cortó (no desde el comienzo)", [cort[:90], res[:90]])
            c.close()
        # 17b. 20-11-2026 · hallazgos de la revisión independiente de la v33
        if toca("revision"):
            NOTICIA = r"^(?!Sección \d|Favor, )\S.{80,}"
            # (1) en Chrome real el provisorio queda quieto 700 ms antes del texto final: el final no debe cortar la frase de cortesía
            c, pg = abrir(nav, {"bilingue": True, "finalTarde": 1300}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 12000); diciendo(pg, NOTICIA); k = n_dicho(pg); habla(pg, "índice deportes")
            vio = llega(pg, r"^Favor, permíteme terminar", k, 8000)
            llega(pg, r"^Sección 21: Deportes\.", k, 40000); D = dicho_desde(pg, k - 1)
            j = next((i for i, x in enumerate(D) if x.startswith("Favor, permíteme")), -1); jd = next((i for i, x in enumerate(D) if x.startswith("Sección 21: Deportes")), -1)
            fav = pg.evaluate("() => { const d = __dicho.find(x => /^Favor, permíteme/.test(x.t)); return d ? !!d.fin : null; }")
            chk(vio and fav and jd > j + 1, "revisión: con el texto final atrasado (Chrome real), la frase de cortesía no se corta y termina la noticia antes de cambiar", [fav, D[j:jd + 1][:4] if j >= 0 else D[:4]])
            c.close()
            # (2) frases de noticias con «índice» mientras lee no son órdenes; «índice cinco» sí
            c, pg = abrir(nav, {"bilingue": True}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 12000); diciendo(pg, NOTICIA)
            for f in ["el índice cayó 2 por ciento", "el índice IPSA cayó 1,5 %", "el índice de desempleo en Chile subió"]:
                k = n_dicho(pg); habla(pg, f); pg.wait_for_timeout(1800)
                chk(not any(re.match(r"^(Sección \d+|Favor, permíteme)", x) for x in dicho_desde(pg, k)), f"revisión: «{f}» mientras lee no cambia de sección", dicho_desde(pg, k)[:2])
            k = n_dicho(pg); habla(pg, "índice cinco")
            chk(llega(pg, r"^Favor, permíteme terminar.*Conflictos bélicos vigentes", k, 8000), "revisión: «índice cinco» sigue siendo una orden", dicho_desde(pg, k)[:2])
            c.close()
            # (3) si la voz en inglés falla, la frase igual se dice completa con la voz de siempre (nada se salta en silencio)
            V = json.load(open("/tmp/titulos/vozp/voces_mock.json"))
            c, pg = abrir(nav, {"bilingue": True, "voces": V, "fallaVoz": "English"}, q="?voz=voces"); esperar(pg, "() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)", 20000)
            encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "deportes")
            llega(pg, r"^Sección 21: Deportes", 0, 15000)
            dijo = esperar(pg, "() => __dicho.some(d => /ganó|gana|ganador/.test(d.t) && d.fin) && (window.__fallas || 0) > 0", 40000)
            seg = pg.evaluate("() => { const i = __dicho.findIndex(d => /^Chad Ramey/.test(d.t)); return i < 0 ? [] : __dicho.slice(i, i + 3).map(d => [d.t.slice(0, 40), (d.v || '').slice(0, 30), !!d.fin]); }")
            chk(dijo and len(seg) >= 2 and seg[0][2] and "English" not in seg[0][1], "revisión: si la voz en inglés falla, el nombre y el resto de la frase se dicen con la voz de siempre", seg)
            c.close()
        # 18. 19-11-2026 · «Índice» + número o título, también para los temas sin número (Germán, 18:45)
        if toca("indice2"):
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice")
            chk(llega(pg, r"algunas traen temas propios", 0, 10000), "índice: avisa que algunas secciones traen temas propios")
            chk(llega(pg, r"dime índice y el número o el nombre, aunque yo esté hablando; por ejemplo, índice cinco o índice fondos concursables", 0, 10000), "índice: enseña «índice» + número o nombre, con un tema de hoy de ejemplo", [x for x in dicho(pg) if "ejemplo" in x][:1])
            chk(llega(pg, r"^1, Economía.*Incluye: Crecimiento de Chile", 0, 10000), "índice: al nombrar Economía dice sus temas", [x for x in dicho(pg) if x.startswith("1, ")][:1])
            escuchando(pg, 30000); k = n_dicho(pg); habla(pg, "índice cinco")
            chk(llega(pg, r"^Sección 5: Conflictos", k, 8000), "«índice cinco» abre la sección 5 (antes volvía a leer el índice)", dicho_desde(pg, k)[:3])
            c.close()
            for frase, rx in [("índice fondos concursables", r"^Emprendimiento.*: Fondos concursables\."), ("índice golf", r"^Deportes: Golf\."),
                              ("índice subsidios habitacionales", r": Subsidios habitacionales\."), ("índice congreso", r": Congreso: votaciones de la semana\."),
                              ("índice proyección de tasas", r": Proyección de tasas a 12 meses\.")]:
                c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); k = n_dicho(pg); habla(pg, frase)
                chk(llega(pg, rx, k, 8000), f"«{frase}» lee ese tema (submenú sin número)", dicho_desde(pg, k)[:3])
                if frase == "índice golf":
                    chk(llega(pg, r"Chad Ramey", k, 15000), "el tema Golf lee el torneo", dicho_desde(pg, k)[:4])
                    chk(llega(pg, r"^Hasta aquí Golf\.", k, 60000), "al terminar un tema, avisa con su nombre", [x for x in dicho_desde(pg, k) if x.startswith("Hasta aquí")][:1])
                c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "todo")
            llega(pg, r"^Sección 1: ", 0, 15000); pg.wait_for_timeout(900); k = n_dicho(pg); habla(pg, "índice quince")
            chk(llega(pg, r"^Sección 15: ", k, 30000), "en plena lectura, «índice quince» lleva a la sección 15 (antes se ignoraba)", dicho_desde(pg, k)[:4])
            c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "todo")
            llega(pg, r"^Sección 1: ", 0, 15000); pg.wait_for_timeout(900); i0 = est(pg)["i"]; k = n_dicho(pg); habla(pg, "el índice de precios subió harto")
            pg.wait_for_timeout(2500)
            chk(est(pg)["i"] == i0 and not any(re.match(r"^(Sección \d+: |Favor, permíteme|El boletín de hoy)", x) for x in dicho_desde(pg, k)), "«el índice de precios subió…» dicho en la sala no cambia la lectura", dicho_desde(pg, k)[:3])
            c.close()
        # 19. 19-11-2026 · pronunciación bilingüe: términos y nombres en inglés (y otros idiomas) con una voz nativa (Germán, 18:14 y 18:57)
        if toca("bilingue"):
            V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
            c, pg = abrir(nav, {"bilingue": True, "voces": V}, q="?voz=voces"); esperar(pg, "() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)", 20000)
            def partes(t): return pg.evaluate("(t) => __cnVozAPI.idiomas(t)", t) or []
            r = partes("Según Goldman Sachs, el peso chileno se apreciará en 2027.")
            chk([(x["l"], x["t"]) for x in r] == [("", "Según"), ("en", "Goldman Sachs,"), ("", "el peso chileno se apreciará en 2027.")] and "Ava" in (r[1]["v"] or ""), "bilingüe: «Goldman Sachs» con voz inglesa natural y femenina, como Catalina", r)
            r = partes("1, Chad Ramey, de Estados Unidos, menos 20.")
            chk([x["l"] for x in r] == ["", "en", ""] and r[1]["t"] == "Chad Ramey,", "bilingüe: golfista del PGA Tour en inglés", r)
            for f in ["Evelyn Matthei y José Antonio Kast debatieron en el Congreso.", "Michelle Bachelet visitó O'Higgins y Valparaíso.", "Juan Williams Rebolledo y Lord Cochrane en la Historia Naval.",
                      "Cofrade News, el boletín del jueves.", "La meta de inflación es 3 %.", "El índice de precios subió según el INE.", "Radio Cooperativa informó que la Coordinadora se reunió.",
                      "Thiago Agustín Tirante ganó en Buenos Aires.", "Los gremios piden más leasing habitacional.", "El signo de hoy es Géminis."]:
                rr = partes(f); otros = [x["t"] for x in rr if x["l"] and x["t"] != "leasing"]
                chk(not otros, f"bilingüe: «{f[:44]}» queda en castellano", rr)
            r = partes("Iga Świątek ganó en Roland Garros y Lula da Silva habló en São Paulo; el Bayern ganó la Bundesliga.")
            ls = [(x["l"], x["t"]) for x in r if x["l"]]
            chk(ls == [("pl", "Iga Świątek"), ("fr", "Roland Garros"), ("pt", "Lula da Silva"), ("pt", "São Paulo;"), ("de", "Bayern"), ("de", "Bundesliga.")], "bilingüe: polaco, francés, portugués y alemán, cada uno con su voz", ls)
            r = partes("Hoy el Cyber Day trae descuentos y Black Friday llega el viernes.")
            chk([x["t"] for x in r if x["l"]] == ["Cyber Day", "Black Friday"] and r[0]["t"] == "Hoy el", "bilingüe: «Hoy» al comienzo sigue en castellano; Cyber Day y Black Friday en inglés", r)
            c.close()
            c, pg = abrir(nav, {"bilingue": True, "voces": [V[0]]}); esperar(pg, "() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)", 20000)
            chk(pg.evaluate("() => __cnVozAPI.idiomas('Según Goldman Sachs, el peso sube.')") is None, "bilingüe: si el aparato no tiene voz inglesa, todo con la voz de siempre")
            c.close()
            c, pg = abrir(nav, {"bilingue": True, "voces": V}, q="?voz=voces"); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice golf")
            chk(llega(pg, r"^Deportes: Golf\.", 0, 10000), "bilingüe: abre el tema Golf")
            ok_ = esperar(pg, "() => __dicho.some(d => /^Chad Ramey/.test(d.t) && /Ava/.test(d.v || ''))", 20000)
            D = pg.evaluate("() => __dicho.map(d => [d.t, d.v || ''])")
            chk(ok_, "bilingüe: en la lectura, «Chad Ramey» lo dice la voz inglesa", [d for d in D if 'Ramey' in d[0]][:2])
            resto = [d for d in D if re.search(r"bajo el par|Estados Unidos", d[0])]
            chk(resto and all("Catalina" in d[1] for d in resto), "bilingüe: el resto de la frase sigue con Catalina", resto[:2])
            c.close()
        # 19b. 20-11-2026 · inglés de corrido (Germán, 04:24: «hace una pausa previo a su mención y después de mencionarla»)
        if toca("fluido"):
            V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
            c, pg = abrir(nav, {"bilingue": True, "voces": V}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "índice golf")
            chk(llega(pg, r"^Deportes: Golf\.", 0, 10000), "de corrido: abre el tema Golf")
            vio = esperar(pg, "() => __dicho.some(d => /Ramey/.test(d.t) && d.fin)", 25000)
            D = pg.evaluate("() => __dicho.map(d => [d.t, d.v || ''])")
            ram = [d for d in D if 'Ramey' in d[0]]
            chk(vio and ram and all("Catalina" in d[1] for d in ram) and not any("Ava" in d[1] for d in D), "de corrido: «Chad Ramey» lo dice Catalina dentro de su frase, sin cambiar de voz", ram[:2])
            chk(ram and any(re.search(r"Ramey.{8,}", d[0]) or re.search(r".{8,}Ramey", d[0]) for d in ram), "de corrido: el nombre no queda solo en un pedazo (sin pausa antes ni después)", ram[:2])
            c.close()
            c, pg = abrir(nav, {"bilingue": True, "voces": V}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 12000); diciendo(pg, r"^(?!Sección \d|Favor, )\S.{80,}"); k = n_dicho(pg); habla(pg, "indique cinco")
            chk(llega(pg, r"^Favor, permíteme terminar.*Conflictos bélicos vigentes", k, 8000), "oído: «indique cinco» (así oye el reconocedor «índice cinco») también cambia a la sección 5", dicho_desde(pg, k)[:2])
            c.close()
            c, pg = abrir(nav, {"bilingue": True, "voces": V}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 12000); diciendo(pg, r"^(?!Sección \d|Favor, )\S.{80,}")
            for f in ["indique usted lo que quiera", "dice que el dólar bajó", "hindi es un idioma de la India"]:
                k = n_dicho(pg); habla(pg, f); pg.wait_for_timeout(1800)
                chk(not any(re.match(r"^(Sección \d+|Favor, permíteme)", x) for x in dicho_desde(pg, k)), f"oído: «{f}» sin una sección válida detrás no es orden", dicho_desde(pg, k)[:2])
            c.close()
        # 20. 19-11-2026 · voz natural en el teléfono: tono propio en las voces que no son de Microsoft y «otra voz» (Germán, 22:40)
        if toca("otravoz"):
            V = [{"name": "Google español de Estados Unidos", "lang": "es-US", "localService": False}, {"name": "Google español", "lang": "es-ES", "localService": False}]
            c, pg = abrir(nav, {"voces": V}); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); pg.wait_for_timeout(1500)
            D = pg.evaluate("() => __dicho.map(d => ({t: d.t, p: d.p, v: d.v}))")
            chk(D and all(abs(d["p"] - 1) < 1e-6 for d in D), "voz de Google: tono propio de la voz (1), sin el filtro que la vuelve metálica", sorted(set(round(d["p"], 3) for d in D)))
            v0 = est(pg)["voz"]; k = n_dicho(pg); habla(pg, "otra voz")
            chk(llega(pg, r"^Esta es otra voz\.", k, 8000), "«otra voz» lo confirma en voz alta", dicho_desde(pg, k)[:2])
            v1 = est(pg)["voz"]; gv = pg.evaluate("() => JSON.parse(localStorage.getItem('cn-voz') || '{}').v")
            chk(v1 and v1 != v0 and gv == v1, "«otra voz» cambia de voz y la recuerda en este aparato", [v0, v1, gv])
            chk(esperar(pg, "(v) => __dicho.some(d => d.v === v && !/^Esta es otra voz/.test(d.t))", 15000, arg=v1), "después sigue leyendo con la voz nueva")
            c.close()
            c, pg = abrir(nav); encender(pg); escuchando(pg, 40000); pg.wait_for_timeout(300); habla(pg, "economía")
            llega(pg, r"^Sección 1: ", 0, 10000); pg.wait_for_timeout(800)
            tit = pg.evaluate("() => __dicho.filter(d => /^Sección 1:/.test(d.t)).map(d => d.p)")
            chk(tit and abs(tit[0] - 0.93) < 1e-6, "Catalina (Microsoft natural) mantiene la voz cálida (0,93 en los títulos)", tit)
            c.close()
        nav.close()
finally:
    srv.terminate()
chk(not errores, "sin errores de JavaScript en ninguna prueba", errores[:3])
print(f"\n{ok} OK, {len(malos)} fallas" + (": " + "; ".join(malos) if malos else ""))
sys.exit(1 if malos else 0)
