# Cuenta cuántos pedazos (y cambios de voz) arma idiomas() con textos reales de una edición, en un bundle dado
import json, os, sys, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
B_BUNDLE, PUERTO = sys.argv[1], sys.argv[2]
B = f"http://127.0.0.1:{PUERTO}"
V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
SIM = open('/tmp/titulos/voz/prueba/simulador.js', encoding='utf-8').read()
T = json.load(open('/tmp/review_harness/textos.json'))
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed')
srv = subprocess.Popen(['node', 'servidor.mjs', B_BUNDLE], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for lang in ('es', 'en'):
            c = nav.new_context(viewport={'width': 1280, 'height': 900})
            c.add_init_script('window.__simCfg = ' + json.dumps({'bilingue': True, 'voces': V, 'voz': {'espera': 2500, 'entre': 300}}) + ';')
            c.add_init_script(SIM)
            if lang == 'en': c.add_init_script("document.addEventListener('DOMContentLoaded', () => { document.documentElement.lang = 'en'; });")
            pg = c.new_page(); pg.goto(B + '/edicion/2026-11-19', wait_until='load', timeout=180000)
            pg.wait_for_function('() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)', timeout=30000)
            if lang == 'en': pg.evaluate("() => { document.documentElement.lang = 'en'; }")
            for k, txt in T.items():
                r = pg.evaluate("""(t) => { const out = { tramos: 0, pedazos: 0, otros: 0, ej: [] }; const f = t.match(/[^.!?]+[.!?]*/g) || [t];
                  let buf = ''; const tr = []; for (const x of f) { if ((buf + x).length > 560) { tr.push(buf); buf = ''; } buf += x; } if (buf) tr.push(buf);
                  for (const x of tr) { out.tramos++; const p = __cnVozAPI.idiomas(x); if (!p) { out.pedazos++; continue; } out.pedazos += p.length; for (const q of p) if (q.l) { out.otros++; if (out.ej.length < 14) out.ej.push(q.l + ':' + q.t.slice(0, 40)); } }
                  return out; }""", txt)
                print(lang, k, 'tramos', r['tramos'], 'pedazos', r['pedazos'], 'en otro idioma', r['otros'], '|', '; '.join(r['ej'][:14]))
            c.close()
        nav.close()
finally:
    srv.terminate()
