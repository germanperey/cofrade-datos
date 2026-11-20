# Vuelca el guion hablado (después de hablable) de cada sección de una edición, para auditar puntuación, tildes y palabras extranjeras
import json, os, sys, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO, FECHA, SALIDA = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
B = f"http://127.0.0.1:{PUERTO}"
V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
SIM = open('/tmp/titulos/voz/prueba/simulador.js', encoding='utf-8').read()
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch(); c = nav.new_context()
        c.add_init_script('window.__simCfg = ' + json.dumps({'bilingue': True, 'voces': V}) + ';'); c.add_init_script(SIM)
        pg = c.new_page(); pg.goto(B + '/edicion/' + FECHA, wait_until='load', timeout=180000)
        pg.wait_for_function('() => !!(window.__cnVozAPI && __cnVozAPI.guion)', timeout=30000)
        secs = pg.evaluate("() => __cnVozAPI.secciones()")
        out = []
        for n, sid, t in secs:
            g = pg.evaluate("(id) => __cnVozAPI.guion(id)", sid) or []
            out.append({'n': n, 'id': sid, 't': t, 'guion': g})
        json.dump(out, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('secciones', len(out), 'frases', sum(len(x['guion']) for x in out), 'caracteres', sum(len(' '.join(x['guion'])) for x in out))
        c.close(); nav.close()
finally:
    srv.terminate()
