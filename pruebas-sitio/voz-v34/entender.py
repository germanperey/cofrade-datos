import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO = sys.argv[1], sys.argv[2]; B = f"http://127.0.0.1:{PUERTO}"
SIM = open('/tmp/titulos/voz/prueba/simulador.js', encoding='utf-8').read()
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch(); c = nav.new_context(); c.add_init_script('window.__simCfg = {};'); c.add_init_script(SIM)
        pg = c.new_page(); pg.goto(B + '/edicion/2026-11-19', wait_until='load', timeout=180000)
        pg.wait_for_function('() => !!(window.__cnVozAPI && __cnVozAPI.entender)', timeout=30000)
        for f in sys.argv[3:]:
            print(f, '→', json.dumps(pg.evaluate("(t) => { try { return __cnVozAPI.entender(t, 'lee'); } catch (e) { return 'ERROR ' + e.message; } }", f), ensure_ascii=False)[:200])
        nav.close()
finally:
    srv.terminate()
