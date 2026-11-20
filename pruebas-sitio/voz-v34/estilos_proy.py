import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO = sys.argv[1], sys.argv[2]; B = f"http://127.0.0.1:{PUERTO}"
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed', PROY_ARCHIVO=os.environ.get('PROY_ARCHIVO', '/tmp/titulos/proy/datos/proyecciones-chile.json'), PROY_FOTOS='/tmp/titulos/proy/fotos')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch(); c = nav.new_context(viewport={'width': 1440, 'height': 900}); pg = c.new_page()
        pg.goto(B + '/edicion/2026-11-19', wait_until='load', timeout=180000); pg.wait_for_timeout(1500)
        r = pg.evaluate("""() => {
          const cs = (el) => { if (!el) return null; const s = getComputedStyle(el); return {font: s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily.slice(0, 40), color: s.color, mt: s.marginTop, mb: s.marginBottom, pt: s.paddingTop, pb: s.paddingBottom, bt: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor}; };
          const pw = document.getElementById('proyw'), pj = document.getElementById('pjw');
          const res = pw && pw.querySelector('.pc-l[lang="es"] .pc-resumen b');
          const caps = pw ? [...pw.querySelectorAll('.pc-l[lang="es"] .pc-tabla caption')].map(cs) : [];
          const h4 = pw && pw.querySelector('.pc-l[lang="es"] .pc-h4');
          const fu = pw && [...pw.querySelectorAll('.pc-l[lang="es"] > .fuente')].pop();
          const rf = fu && fu.getBoundingClientRect(), rj = pj && pj.getBoundingClientRect(), k = pj && pj.querySelector('.bloque-kick');
          return {resumen: cs(res), captions: caps, h4: cs(h4), proyw: cs(pw), pjw: cs(pj), kick: cs(k), hueco: rf && rj ? Math.round(rj.top - rf.bottom) : null,
                  hueco_kick: rf && k ? Math.round(k.getBoundingClientRect().top - rf.bottom) : null};
        }""")
        print(json.dumps(r, ensure_ascii=False, indent=1))
        nav.close()
finally:
    srv.terminate()
