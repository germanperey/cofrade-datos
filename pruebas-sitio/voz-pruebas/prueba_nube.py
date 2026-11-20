"""Oído en la nube (19-11-2026): el lector habla, el micrófono (falso de Chromium, con un WAV) detecta la frase, la manda a /oido y la
voz obedece. También: Edge usa la nube desde el comienzo, un navegador sin reconocedor también, y si el del navegador falla por su red se
pasa a la nube. Y el punto /oido rechaza lo que no es WAV, lo enorme, otros sitios y el abuso.
Uso: python3 prueba_nube.py <bundle> <puerto>"""
import json, os, re, struct, subprocess, sys, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
W, P = sys.argv[1], int(sys.argv[2]); B = f"http://127.0.0.1:{P}"; ED = "/edicion/2026-11-19"
SIM = open("/tmp/titulos/voz/prueba/simulador.js", encoding="utf-8").read()
UA_EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"
WAV = "/tmp/titulos/vozp/rafaga.wav"
ok, malos = 0, []
def chk(c, n, extra=""):
    global ok
    ok += bool(c)
    if not c: malos.append(n)
    print(("OK   " if c else "FALLA ") + n + (("  · " + str(extra)[:300]) if extra and not c else ""), flush=True)

def servidor(**extra):
    env = dict(os.environ, PUERTO=str(P), ED_EXTRA="/tmp/titulos/proy/ed", **extra)
    s = subprocess.Popen(["node", "servidor.mjs", W], cwd="/tmp/mf/prueba", env=env, stdout=open(f"/tmp/titulos/vozp/srv_nube{P}.log", "w"), stderr=subprocess.STDOUT)
    for _ in range(120):
        time.sleep(0.5)
        try: urllib.request.urlopen(B + "/__despachos", timeout=3); return s
        except Exception: pass
    return s

def wav(seg=1.0, sr=16000):
    n = int(seg * sr); datos = b"".join(struct.pack("<h", int(3000 * ((i // 40) % 2 * 2 - 1))) for i in range(n))
    return b"RIFF" + struct.pack("<I", 36 + len(datos)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", len(datos)) + datos

def post(cuerpo, tipo="audio/wav", origen=None, l="es"):
    h = {"Content-Type": tipo}
    if origen: h["Origin"] = origen
    try:
        r = urllib.request.urlopen(urllib.request.Request(B + "/oido?l=" + l, data=cuerpo, headers=h, method="POST"), timeout=20)
        return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

def esperar(pg, js, tope=15000, paso=60):
    t0 = time.time()
    while (time.time() - t0) * 1000 < tope:
        try:
            if pg.evaluate(js): return True
        except Exception: pass
        pg.wait_for_timeout(paso)
    return False

def abrir(br, sim, ua=None):
    o = dict(viewport={"width": 1280, "height": 900}, permissions=["microphone"])
    if ua: o["user_agent"] = ua
    c = br.new_context(**o)
    v = dict(sim.get("voz") or {}); v.setdefault("espera", 2500); v.setdefault("entre", 300); v.setdefault("spsMax", 80); sim["voz"] = v
    sim.setdefault("msPorCaracter", 20)
    c.add_init_script("window.__simCfg = " + json.dumps(sim) + ";")
    c.add_init_script(SIM)
    c.add_init_script("Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false});")
    pg = c.new_page(); errores = []
    pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
    pg.goto(B + ED, wait_until="load", timeout=180000)
    return c, pg, errores

def encender(pg):
    esperar(pg, "() => !!document.querySelector('.cn-voz-velo')", 8000); pg.wait_for_timeout(450); pg.mouse.click(12, 12)

srv = servidor()
try:
    # ---------- el punto /oido ----------
    s, j = post(wav(1.0)); chk(s == 200 and j.get("t") == "índice", "un WAV de 1 s se transcribe", (s, j))
    s, j = post(wav(1.0), l="en"); chk(s == 200, "en inglés también", (s, j))
    s, j = post(wav(1.0), tipo="audio/webm"); chk(s == 415, "otro tipo de audio: 415", (s, j))
    s, j = post(b"RIFF" + b"\0" * 4000, tipo="audio/wav"); chk(s == 415, "no es WAVE: 415", (s, j))
    s, j = post(wav(0.05)); chk(s == 413, "demasiado corto: 413", (s, j))
    s, j = post(wav(12.0)); chk(s == 413, "más de ~11 s: 413", (s, j))
    s, j = post(wav(1.0), origen="https://otro-sitio.cl")
    try:   # Miniflare no entrega la cabecera Origin al Worker: el Buzón (que ya la revisa en producción) sirve de control
        ctl = urllib.request.urlopen(urllib.request.Request(B + "/buzon", data=b"{}", headers={"Content-Type": "application/json", "Origin": "https://otro-sitio.cl"}, method="POST"), timeout=20).status
    except urllib.error.HTTPError as e:
        ctl = e.code
    if ctl == 403: chk(s == 403, "desde otro sitio: 403", (s, j))
    else: print("NOTA  desde otro sitio: no se puede probar en el arnés (Miniflare no pasa la cabecera Origin; el Buzón tampoco la recibe)")
    s, j = post(wav(1.0), origen="https://www.cofrad.es"); chk(s == 200, "desde www.cofrad.es: 200", (s, j))
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", f"--use-file-for-fake-audio-capture={WAV}", "--autoplay-policy=no-user-gesture-required"])
        # ---------- sin reconocedor en el navegador: la nube desde el comienzo, y la voz obedece lo que oye ----------
        c, pg, err = abrir(br, {"sinOido": True, "micReal": True})
        nb = pg.evaluate("() => __cnVozAPI.nube()")
        chk(nb["activa"] and nb["motivo"] == "sin-reconocedor", "navegador sin reconocedor: oído en la nube", nb)
        antes = len(json.loads(urllib.request.urlopen(B + "/__oidos").read()))
        encender(pg)
        llego = esperar(pg, f"() => fetch('/__oidos').then(r => r.json()).then(a => a.length > {antes})", 25000, 400)
        chk(llego, "la frase del micrófono llegó a /oido")
        indice = esperar(pg, "() => __dicho.some(d => /secciones(, y algunas traen temas propios)?\\. Te las digo/.test(d.t))", 25000, 200)
        chk(indice, "la voz obedeció: leyó el índice", pg.evaluate("() => __dicho.slice(-4).map(d => d.t)"))
        chk(not err, "sin errores de JavaScript", err)
        pg.evaluate("() => __cnVozAPI.apagar()"); pg.wait_for_timeout(5000)
        libre = pg.evaluate("() => !document.querySelector('.cn-voz-b.cn-voz-oido')")
        chk(libre, "al apagar la voz se cierra el oído")
        c.close()
        # ---------- Edge: la nube desde el comienzo aunque traiga reconocedor ----------
        c, pg, err = abrir(br, {"micReal": True}, ua=UA_EDGE)
        nb = pg.evaluate("() => __cnVozAPI.nube()")
        chk(nb["activa"] and nb["motivo"] == "edge", "Microsoft Edge: oído en la nube", nb)
        c.close()
        # ---------- Chrome con reconocedor sano: se queda con el del navegador ----------
        c, pg, err = abrir(br, {"micReal": True})
        nb = pg.evaluate("() => __cnVozAPI.nube()")
        chk(not nb["activa"], "Chrome sano: usa el reconocedor del navegador", nb)
        c.close()
        # ---------- el reconocedor del navegador falla por su red: pasa a la nube y obedece ----------
        c, pg, err = abrir(br, {"micReal": True, "redCaida": True})
        encender(pg)
        cambio = esperar(pg, "() => __cnVozAPI.nube().activa && __cnVozAPI.nube().motivo === 'red-del-navegador'", 25000, 200)
        chk(cambio, "falla de red del navegador: pasa a la nube", pg.evaluate("() => [__cnVozAPI.nube(), window.__redCaidas]"))
        indice = esperar(pg, "() => __dicho.some(d => /secciones(, y algunas traen temas propios)?\\. Te las digo/.test(d.t))", 30000, 200)
        chk(indice, "después del cambio, la voz obedece por la nube")
        chk(not err, "sin errores de JavaScript (red caída)", err)
        c.close()
        # ---------- ?voz=nativo deja el del navegador aunque sea Edge ----------
        c = br.new_context(user_agent=UA_EDGE); c.add_init_script("window.__simCfg = {micReal:true};"); c.add_init_script(SIM)
        pg = c.new_page(); pg.goto(B + ED + "?voz=nativo", wait_until="load", timeout=180000)
        chk(not pg.evaluate("() => __cnVozAPI.nube().activa"), "?voz=nativo: Edge sin nube")
        c.close()
        br.close()
    # ---------- el freno: más de 30 frases por minuto desde la misma conexión ----------
    cods = [post(wav(0.5))[0] for _ in range(32)]
    chk(429 in cods, "freno de abuso: 429 pasado el tope", cods[-5:])
finally:
    srv.terminate(); srv.wait()
# ---------- lo que Whisper inventa en el silencio no se entrega; y si la IA falla, 502 ----------
srv = servidor(OIDO_TEXTO="Subtítulos realizados por la comunidad de Amara.org")
try:
    s, j = post(wav(1.0)); chk(s == 200 and j.get("t") == "", "frase inventada en el silencio: vacío", (s, j))
finally:
    srv.terminate(); srv.wait()
srv = servidor(OIDO_FALLA="1")
try:
    s, j = post(wav(1.0)); chk(s == 502, "la IA falla: 502", (s, j))
finally:
    srv.terminate(); srv.wait()
print(f"\nRESULTADO: {ok}/{ok + len(malos)}" + (f" · FALLAS: {malos}" if malos else ""))
sys.exit(1 if malos else 0)
