import os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; B = f"http://127.0.0.1:{PUERTO}"
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed', PROY_ARCHIVO='/tmp/titulos/proy/datos/prueba-real.json', PROY_FOTOS='/tmp/titulos/proy/fotos')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
os.makedirs(OUT, exist_ok=True)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/manifest.webmanifest', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nombre, vp, tema, mov in [('escritorio', {'width': 1440, 'height': 1000}, 'light', False), ('oscuro', {'width': 1440, 'height': 1000}, 'dark', False), ('telefono', {'width': 390, 'height': 844}, 'light', True)]:
            c = nav.new_context(viewport=vp, device_scale_factor=1, is_mobile=mov, has_touch=mov)
            c.add_init_script("try{localStorage.setItem('cn-voz', JSON.stringify({e:'no'}))}catch(e){}")
            pg = c.new_page(); pg.goto(B + '/edicion/2026-11-19', wait_until='load', timeout=180000); pg.wait_for_timeout(1200)
            if tema == 'dark': pg.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
            pg.evaluate("() => { const t = document.querySelector('#proyw .pc-l[lang=\"es\"] .pc-st'); t.scrollIntoView({block: 'start'}); window.scrollBy(0, -140); }"); pg.wait_for_timeout(900)
            pg.screenshot(path=f'{OUT}/{nombre}-tablas.png')
            pg.evaluate("() => { const f = [...document.querySelectorAll('#proyw .pc-l[lang=\"es\"] > .fuente')].pop(); f.scrollIntoView({block: 'center'}); }"); pg.wait_for_timeout(900)
            pg.screenshot(path=f'{OUT}/{nombre}-final.png')
            c.close()
        nav.close()
finally:
    srv.terminate()
print('listo')
