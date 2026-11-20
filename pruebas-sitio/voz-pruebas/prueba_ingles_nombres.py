import json, os, sys, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO = sys.argv[1], sys.argv[2]
B = f"http://127.0.0.1:{PUERTO}"
V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
SIM = open('/tmp/titulos/voz/prueba/simulador.js', encoding='utf-8').read()
CASOS = [
  ("Finance Minister Mario Marcel said the economy grew.", "Mario Marcel"),
  ("Chilean President Gabriel Boric met investors.", "Gabriel Boric"),
  ("The Santiago Stock Exchange rose 2%.", "Santiago"),
  ("Welcome to Cofrade News, the newsletter for today.", None),
]
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ok = 0; tot = 0
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch(); c = nav.new_context()
        c.add_init_script('window.__simCfg = ' + json.dumps({'bilingue': True, 'voces': V}) + ';'); c.add_init_script(SIM)
        pg = c.new_page(); pg.goto(B + '/edicion/2026-11-19?voz=voces', wait_until='load', timeout=180000)
        pg.wait_for_function('() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)', timeout=30000)
        pg.evaluate("() => { document.documentElement.lang = 'en'; }")
        for t, esperado in CASOS:
            r = pg.evaluate("(t) => __cnVozAPI.idiomas(t)", t) or []
            es = [x['t'].strip(' ,.') for x in r if x['l'] == 'es']
            bien = (es == [esperado]) if esperado else (len(es) == 0)
            tot += 1; ok += bien
            print(('OK   ' if bien else 'FALLA'), repr(t), '→ castellano:', es)
        c.close(); nav.close()
finally:
    srv.terminate()
print(f"{ok}/{tot}")
