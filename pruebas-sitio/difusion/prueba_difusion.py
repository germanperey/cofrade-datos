# 20-11-2026 · Pruebas de la difusión: botón Compartir (portada y edición), visitas por enlace compartido, Panel «Difusión y menciones»,
# recolector de menciones (fuentes simuladas, sin red real) y concurso «Comparte Cofrade News».
# Uso: python3 prueba_difusion.py PUERTO MODO   (MODO: principal | sorteo | auto | vencido | cerrado | antes | youtube). SOLO=grupo1,grupo2 para una parte.
import json, os, sys, re, io, time, random, hashlib, string, urllib.request, urllib.parse, urllib.error
from playwright.sync_api import sync_playwright
PUERTO = sys.argv[1] if len(sys.argv) > 1 else '8891'
MODO = sys.argv[2] if len(sys.argv) > 2 else 'principal'
B = f'http://127.0.0.1:{PUERTO}'
SOLO = set(x for x in os.environ.get('SOLO', '').split(',') if x)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
res = []
def corre(g): return not SOLO or g in SOLO
def ok(n, c, extra=''):
    res.append((n, bool(c))); print(('OK   ' if c else 'FALLA'), n, '' if c and not extra else str(extra)[:260])
class SinRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
ab = urllib.request.build_opener(SinRedir)
def pedir(ruta, metodo='GET', datos=None, cab=None):
    h = {'User-Agent': UA}; h.update(cab or {})
    r = urllib.request.Request(B + ruta, data=datos, method=metodo, headers=h)
    try:
        with ab.open(r, timeout=90) as x: return x.status, {k.lower(): v for k, v in x.headers.items()}, x.read()
    except urllib.error.HTTPError as e: return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()
def sql(q):
    s, h, b = pedir('/__sql?q=' + urllib.parse.quote(q))
    if s != 200: raise RuntimeError('SQL: ' + b.decode()[:300])
    return json.loads(b)
def salida(): return json.loads(pedir('/__salida')[2])
def correos(): return json.loads(pedir('/__correos')[2])
def b36(n):
    a = '0123456789abcdefghijklmnopqrstuvwxyz'; s = ''
    while True:
        s = a[n % 36] + s; n //= 36
        if not n: return s
def codigo_de(sec): return b36(int.from_bytes(hashlib.sha256(('cn-ref|' + sec).encode()).digest()[:5], 'big')).rjust(8, '0')
def secreto(): return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(24))
def jpeg(w=640, h=480, semilla=1, q=70):
    from PIL import Image
    rnd = random.Random(semilla); im = Image.new('RGB', (w, h), (rnd.randint(0, 255), rnd.randint(0, 255), rnd.randint(0, 255)))
    px = im.load()
    for _ in range(600): px[rnd.randrange(w), rnd.randrange(h)] = (rnd.randint(0, 255), rnd.randint(0, 255), rnd.randint(0, 255))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q); return b.getvalue()
def multipart(campos, archivo=None):
    lim = '----cnprueba' + str(random.randint(1, 10 ** 9)); partes = []
    for k, v in campos.items(): partes.append(f'--{lim}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    if archivo:
        nombre, datos, tipo = archivo
        partes.append(f'--{lim}\r\nContent-Disposition: form-data; name="captura"; filename="{nombre}"\r\nContent-Type: {tipo}\r\n\r\n'.encode() + datos + b'\r\n')
    partes.append(f'--{lim}--\r\n'.encode()); return b''.join(partes), 'multipart/form-data; boundary=' + lim
def concurso(campos, archivo=None, ip=None):
    base = {'mayor': 'si', 'bases': 'si', 'cf-turnstile-response': 'token-bueno'}; base.update(campos)
    cuerpo, ct = multipart({k: v for k, v in base.items() if v is not None}, archivo)
    s, h, b = pedir('/concurso', 'POST', cuerpo, {'Content-Type': ct, 'x-ip-prueba': ip or f'198.51.100.{random.randint(2, 250)}', 'Origin': 'https://www.cofrad.es'})
    try: return s, json.loads(b)
    except Exception: return s, {'crudo': b[:200]}
ADM = {}
def entrar():
    s, h, b = pedir('/panel/entrar', 'POST', b'clave=clave-de-prueba-123', {'Content-Type': 'application/x-www-form-urlencoded', 'x-ip-prueba': '192.0.2.200'})
    m = re.search(r'cn_adm=([^;]+)', h.get('set-cookie', ''))
    ADM['Cookie'] = 'cn_adm=' + m.group(1) if m else ''
    return s, bool(m)
def panel_post(ruta, campos):
    s, h, b = pedir(ruta, 'POST', urllib.parse.urlencode(campos).encode(), {'Content-Type': 'application/x-www-form-urlencoded', **ADM})
    return s, urllib.parse.unquote(h.get('location', ''))
def panel_html(q=''): return pedir('/panel' + q, cab=ADM)[2].decode()
def jget(ruta): s, h, b = pedir(ruta, cab=ADM); return s, json.loads(b or b'null')
def azar48(sem, i): return int.from_bytes(hashlib.sha256(f'{sem}:{i}'.encode()).digest()[:6], 'big')
def elegir(pesos, sem, k=5):
    pesos = list(pesos); sal = []; total = sum(pesos); i = 0
    while len(sal) < k and total > 0:
        lim = 2 ** 48 - (2 ** 48 % total)
        while True:
            r = azar48(sem, i); i += 1
            if r < lim: break
        t = r % total; j = 0
        while t >= pesos[j]: t -= pesos[j]; j += 1
        sal.append(j); total -= pesos[j]; pesos[j] = 0
    return sal
RUTAS_EXT = ['https://wa.me/**', 'https://t.me/**', 'https://www.linkedin.com/**', 'https://www.facebook.com/**', 'https://twitter.com/**', 'https://x.com/**']
FAKE_TS = r"""window.turnstile={render:function(el,o){var d=document.querySelector(el);if(d)d.innerHTML='<div class="ts-falso" style="height:65px;border:1px dashed #999">Turnstile (prueba)</div>';window.__tsCb=o.callback;setTimeout(function(){o.callback('token-bueno')},120);return 'w'+Math.random()},
reset:function(){setTimeout(function(){if(window.__tsCb)window.__tsCb('token-bueno')},120)},remove:function(){}};
(function(){var s=(document.currentScript&&document.currentScript.src)||'';var m=s.match(/onload=([^&]+)/);if(m&&window[m[1]])window[m[1]]()})();"""
def contexto(br, **k):
    cx = br.new_context(user_agent=UA, **k)
    cx.route('https://challenges.cloudflare.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FAKE_TS))
    for x in RUTAS_EXT: cx.route(x, lambda r: r.fulfill(status=200, content_type='text/html', body='<p>externo</p>'))
    return cx
def caja(pg, sel): return pg.evaluate("s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).display] }", sel)

# ============================================================== PRINCIPAL ==============================================================
if MODO == 'principal':
    with sync_playwright() as p:
        br = p.chromium.launch()
        if corre('compartir'):
            # --- portada, modo claro, sin navigator.share (menú propio) ---
            cx = contexto(br, viewport={'width': 1280, 'height': 900}, color_scheme='light')
            cx.add_init_script("try{delete Navigator.prototype.share}catch(e){}")
            cx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=B)
            pg = cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/?r=zzzz9999&utm_source=compartir'); pg.wait_for_timeout(700)
            ok('portada: el enlace recibido se limpia de la barra (r y utm_source=compartir)', pg.evaluate('location.search') == '', pg.evaluate('location.href'))
            c = caja(pg, '#cmpBoton')
            ok('portada: botón Compartir visible en la cabecera, 44x44 o más', c and c[0] >= 44 and c[1] >= 44 and c[2] != 'none', c)
            ok('portada: nombre accesible del botón', pg.get_attribute('#cmpBoton', 'aria-label') == 'Compartir Cofrade News')
            ok('portada: sin navigator.share', pg.evaluate('typeof navigator.share') == 'undefined')
            pg.click('#cmpBoton'); pg.wait_for_timeout(300)
            ok('menú propio se abre (sin navigator.share)', pg.is_visible('#cmpPo') and pg.get_attribute('#cmpBoton', 'aria-expanded') == 'true')
            ref = pg.evaluate("localStorage.getItem('cn-ref')"); sec = pg.evaluate("localStorage.getItem('cn-ref-s')")
            ok('código de 8 letras/números guardado en cn-ref', bool(re.fullmatch(r'[a-z0-9]{8}', ref or '')), ref)
            ok('el código sale del secreto del navegador (igual al cálculo del servidor)', bool(sec) and codigo_de(sec) == ref, (sec, ref))
            enl = f'https://www.cofrad.es/?r={ref}&utm_source=compartir'
            hrefs = pg.evaluate("[...document.querySelectorAll('#cmpPo [data-canal]')].map(a => [a.dataset.canal, a.getAttribute('href'), a.textContent.trim()])")
            H = {k: (h, t) for k, h, t in hrefs}
            texto = 'Te comparto Cofrade News, el boletín diario con las noticias de Chile y el mundo, cada dato con su fuente:'
            ok('WhatsApp: wa.me con el texto pedido y el enlace', H['whatsapp'][0] == 'https://wa.me/?text=' + urllib.parse.quote(texto + ' ' + enl, safe="-_.!~*'()"), H['whatsapp'][0][:160])
            ok('Telegram, LinkedIn, Facebook y X con el enlace personal', all(urllib.parse.quote(enl, safe="-_.!~*'()") in H[k][0] for k in ('telegram', 'linkedin', 'facebook', 'x'))
               and H['telegram'][0].startswith('https://t.me/share/url?url=') and H['x'][0].startswith('https://twitter.com/intent/tweet?'), [H[k][0][:60] for k in H])
            ok('Correo: mailto con asunto y cuerpo', H['correo'][0].startswith('mailto:?subject=') and urllib.parse.quote(enl, safe="-_.!~*'()") in H['correo'][0])
            ok('7 opciones: WhatsApp, Telegram, Correo, LinkedIn, Facebook, X y Copiar enlace', [k for k, _, _ in hrefs] == ['whatsapp', 'telegram', 'correo', 'linkedin', 'facebook', 'x'] and pg.is_visible('#cmpPo .cmp-copiar'))
            ok('el menú enlaza a las bases del concurso', pg.locator('#cmpPo .cmp-cc a[href="/bases-concurso"]').count() == 1)
            ok('el foco entra al menú', pg.evaluate("document.activeElement && document.activeElement.dataset.canal") == 'whatsapp')
            pg.click('#cmpPo .cmp-copiar'); pg.wait_for_timeout(500)
            ok('Copiar enlace: aviso visible', pg.inner_text('#cmpPo .cmp-ok') == '¡Enlace copiado!', pg.inner_text('#cmpPo .cmp-ok'))
            ok('Copiar enlace: el portapapeles tiene el enlace personal', pg.evaluate('navigator.clipboard.readText()') == enl)
            pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
            ok('Escape cierra y devuelve el foco al botón', not pg.is_visible('#cmpPo') and pg.evaluate('document.activeElement.id') == 'cmpBoton')
            pg.click('#cmpBoton'); pg.wait_for_timeout(250)
            with cx.expect_page() as nueva: pg.click('#cmpPo [data-canal="whatsapp"]')
            nueva.value.close(); pg.wait_for_timeout(600)
            pg.reload(); pg.wait_for_timeout(500); pg.click('#cmpBoton'); pg.wait_for_timeout(250)
            ok('el código persiste al recargar', pg.evaluate("localStorage.getItem('cn-ref')") == ref and ref in pg.get_attribute('#cmpPo [data-canal="whatsapp"]', 'href'))
            pg.mouse.click(5, 880); pg.wait_for_timeout(200)
            ok('clic fuera cierra el menú', not pg.is_visible('#cmpPo'))
            fila = {x['canal']: x['n'] for x in sql("SELECT canal, n FROM compartidos")}
            ok('se cuentan las formas de compartir (copiar, whatsapp)', fila.get('copiar', 0) >= 1 and fila.get('whatsapp', 0) >= 1, fila)
            # --- inglés ---
            pg.click('#idioma'); pg.wait_for_timeout(500)
            ok('EN: botón en inglés', pg.get_attribute('#cmpBoton', 'aria-label') == 'Share Cofrade News')
            pg.click('#cmpBoton'); pg.wait_for_timeout(250)
            ok('EN: menú en inglés (título, Email, Copy link)', pg.inner_text('#cmpPo .cmp-tit') == 'Share Cofrade News' and pg.inner_text('#cmpPo [data-canal="correo"]') == 'Email' and pg.inner_text('#cmpPo .cmp-copiar') == 'Copy link')
            ok('EN: el texto compartido va en inglés', 'sharing%20Cofrade%20News' in pg.get_attribute('#cmpPo [data-canal="whatsapp"]', 'href'))
            pg.keyboard.press('Escape'); pg.click('#idioma'); pg.wait_for_timeout(300)
            ok('ES de nuevo: botón en español', pg.get_attribute('#cmpBoton', 'aria-label') == 'Compartir Cofrade News')
            ok('portada sin errores de JavaScript', not errs, errs[:3])
            cx.close()
            # --- navigator.share disponible ---
            cx = contexto(br, viewport={'width': 390, 'height': 844}, color_scheme='light', is_mobile=True, has_touch=True)
            cx.add_init_script("window.__compartido=null;window.__modoShare='ok';navigator.share=function(d){window.__compartido=d;return window.__modoShare==='ok'?Promise.resolve():Promise.reject(Object.assign(new Error('x'),{name:window.__modoShare}))}")
            pg = cx.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(600)
            ok('celular: sin desborde horizontal con el botón nuevo', pg.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            c = caja(pg, '#cmpBoton'); ok('celular: botón 44x44 o más', c and c[0] >= 44 and c[1] >= 44, c)
            pg.tap('#cmpBoton'); pg.wait_for_timeout(400)
            d = pg.evaluate('window.__compartido'); r2 = pg.evaluate("localStorage.getItem('cn-ref')")
            ok('navigator.share recibe el enlace personal y el texto', d and d['url'] == f'https://www.cofrad.es/?r={r2}&utm_source=compartir' and d['text'] == texto, d)
            ok('con navigator.share no se abre el menú propio', not pg.is_visible('#cmpPo'))
            pg.evaluate("window.__modoShare='AbortError'"); pg.tap('#cmpBoton'); pg.wait_for_timeout(300)
            ok('si la persona cancela el menú del teléfono, no pasa nada', not pg.is_visible('#cmpPo'))
            pg.evaluate("window.__modoShare='NotAllowedError'"); pg.tap('#cmpBoton'); pg.wait_for_timeout(400)
            ok('si el menú del teléfono falla, se abre el menú propio', pg.is_visible('#cmpPo'))
            pg.wait_for_timeout(300)
            ok('se cuenta el uso del menú del teléfono', sql("SELECT COALESCE(SUM(n),0) AS n FROM compartidos WHERE canal='nativo'")[0]['n'] >= 1)
            cx.close()
            # --- modo oscuro ---
            cx = contexto(br, viewport={'width': 1280, 'height': 900}, color_scheme='dark'); cx.add_init_script("try{delete Navigator.prototype.share}catch(e){}")
            pg = cx.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(500); pg.click('#cmpBoton'); pg.wait_for_timeout(250)
            ok('modo oscuro del sistema: menú oscuro', pg.evaluate("getComputedStyle(document.getElementById('cmpPo')).backgroundColor") == 'rgb(21, 32, 51)')
            c = caja(pg, '#cmpBoton'); ok('modo oscuro: botón 44x44 o más', c and c[0] >= 44 and c[1] >= 44, c)
            pg.keyboard.press('Escape'); pg.click('#tema'); pg.wait_for_timeout(200); pg.click('#cmpBoton'); pg.wait_for_timeout(250)
            ok('modo claro elegido a mano: menú claro', pg.evaluate("getComputedStyle(document.getElementById('cmpPo')).backgroundColor") == 'rgb(255, 255, 255)')
            cx.close()
            # --- edición ---
            cx = contexto(br, viewport={'width': 1280, 'height': 900}, color_scheme='light'); cx.add_init_script("try{delete Navigator.prototype.share}catch(e){}")
            pg = cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/edicion/2026-11-19?r=zzzz9999&utm_source=compartir'); pg.wait_for_timeout(1500)
            ok('edición: botón en la cabecera (.acciones), 44x44 o más', pg.locator('header.cabecera .acciones #cnCompartir').count() == 1 and (lambda c: c and c[0] >= 44 and c[1] >= 44)(caja(pg, '#cnCompartir')), caja(pg, '#cnCompartir'))
            ok('edición: texto visible «Compartir»', pg.inner_text('#cnCompartir').strip() == 'Compartir')
            ok('edición: el enlace recibido se limpia de la barra', pg.evaluate('location.search') == '')
            pg.click('#cnCompartir'); pg.wait_for_timeout(300)
            r3 = pg.evaluate("localStorage.getItem('cn-ref')")
            ok('edición: el enlace lleva la fecha de la edición y el código', urllib.parse.quote(f'https://www.cofrad.es/edicion/2026-11-19?r={r3}&utm_source=compartir', safe="-_.!~*'()") in pg.get_attribute('#cmpEd [data-canal="whatsapp"]', 'href'))
            pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
            if pg.locator('#btnIdioma').count():
                pg.click('#btnIdioma'); pg.wait_for_timeout(1200)
                ok('edición EN: botón «Share» y nombre accesible en inglés', pg.inner_text('#cnCompartir').strip() == 'Share' and pg.get_attribute('#cnCompartir', 'aria-label') == 'Share this edition', pg.inner_text('#cnCompartir'))
                pg.click('#btnIdioma'); pg.wait_for_timeout(800)
            pg.click('#btnTema'); pg.wait_for_timeout(300); pg.click('#cnCompartir'); pg.wait_for_timeout(250)
            ok('edición en modo oscuro: menú oscuro', pg.evaluate("getComputedStyle(document.getElementById('cmpEd')).backgroundColor") == 'rgb(21, 32, 51)')
            ok('edición sin errores de JavaScript nuevos', not [e for e in errs if 'cmp' in e or 'Compart' in e], errs[:3])
            cx.close()

        if corre('referidos'):
            NAV = {'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'}
            def nav(ip, extra=None): d = dict(NAV); d['x-ip-prueba'] = ip; d.update(extra or {}); return d
            def cuenta(c): f = sql(f"SELECT (SELECT COALESCE(SUM(n),0) FROM referidos WHERE codigo='{c}') AS n, (SELECT COUNT(*) FROM referidos_unicos WHERE codigo='{c}') AS u"); return f[0]['n'], f[0]['u']
            C = 'ab12cd34'
            pedir(f'/?r={C}&utm_source=compartir', cab=nav('203.0.113.1')); time.sleep(0.5)
            ok('visita por enlace compartido: suma 1 visita y 1 persona', cuenta(C) == (1, 1), cuenta(C))
            pedir(f'/?r={C}&utm_source=compartir', cab=nav('203.0.113.1')); time.sleep(0.5)
            ok('la misma persona el mismo día: 2 visitas, 1 persona', cuenta(C) == (2, 1), cuenta(C))
            pedir(f'/?r={C}&utm_source=compartir', cab=nav('203.0.113.2')); time.sleep(0.5)
            ok('otra conexión: 2 personas', cuenta(C) == (3, 2), cuenta(C))
            pedir(f'/?r={C}', cab=nav('203.0.113.3', {'User-Agent': 'WhatsApp/2.23.20.0 A'})); time.sleep(0.4)
            pedir(f'/?r={C}', cab=nav('203.0.113.4', {'User-Agent': 'TelegramBot (like TwitterBot)'})); time.sleep(0.4)
            ok('vistas previas de WhatsApp y Telegram no cuentan', cuenta(C) == (3, 2), cuenta(C))
            pedir(f'/?r={C}', cab=nav('203.0.113.5', {'Sec-Purpose': 'prefetch'})); time.sleep(0.4)
            ok('precargas del navegador no cuentan', cuenta(C) == (3, 2), cuenta(C))
            pedir(f'/?r={C}', cab={'x-ip-prueba': '203.0.113.8', 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'image'})
            pedir(f'/?r={C}', cab={'x-ip-prueba': '203.0.113.9', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'iframe'})
            pedir(f'/?r={C}', cab={'x-ip-prueba': '203.0.113.10'}); time.sleep(0.6)
            ok('imagen o marco escondidos en otra web y pedidos sin cabeceras de navegación (curl) no cuentan', cuenta(C) == (3, 2), cuenta(C))
            for malo in ['AB12', 'ab12cd34ef567', 'ab-12cd3', '']: pedir('/?r=' + urllib.parse.quote(malo), cab=nav('203.0.113.6'))
            time.sleep(0.5)
            ok('códigos inválidos no se cuentan', sql("SELECT COUNT(*) AS n FROM referidos WHERE codigo NOT IN ('ab12cd34','zzzz9999','abcd1234')")[0]['n'] == 0, sql("SELECT codigo FROM referidos"))
            pedir(f'/edicion/2026-11-19?r={C}&utm_source=compartir', cab=nav('203.0.113.7')); time.sleep(0.6)
            ok('en una edición también se cuenta', cuenta(C) == (4, 3), cuenta(C))
            D = 'cd34ef56'
            for ua in ['Mozilla/5.0 (A) Chrome/131', 'Mozilla/5.0 (B) Chrome/131', 'Mozilla/5.0 (C) Chrome/131', 'Mozilla/5.0 (D) Chrome/131']:
                pedir(f'/?r={D}', cab=nav('198.51.100.40', {'User-Agent': ua})); time.sleep(0.3)
            ok('la misma conexión con 4 navegadores distintos: 4 visitas y solo 2 personas', cuenta(D) == (4, 2), cuenta(D))
            for ip6 in ['2001:db8:1:2::1', '2001:db8:1:2:aaaa::7', '2001:0db8:0001:0002:ffff:ffff:ffff:fff0']:
                pedir(f'/?r={D}', cab=nav(ip6)); time.sleep(0.3)
            ok('IPv6: direcciones del mismo /64 son una sola red (2 personas como máximo)', cuenta(D) == (7, 4), cuenta(D))
            pedir(f'/?r={D}', cab=nav('2001:db8:1:3::1')); time.sleep(0.4)
            ok('IPv6: otro /64 es otra red', cuenta(D) == (8, 5), cuenta(D))
            cols = [x['name'] for x in sql("SELECT name FROM pragma_table_info('referidos_unicos')")]
            filas_u = sql("SELECT visitante, red FROM referidos_unicos")
            ok('sin IP guardada: solo fecha, código, huella HMAC de 24 caracteres y huella de la red', cols == ['fecha', 'codigo', 'visitante', 'red'] and all(re.fullmatch(r'[0-9a-f]{24}', x['visitante']) and re.fullmatch(r'[0-9a-f]{24}', x['red'] or '') for x in filas_u), (cols, filas_u[:2]))
            ok('ninguna tabla nueva guarda IP en claro', not any(ipx in json.dumps(sql(f"SELECT * FROM {t}")) for t in ['referidos', 'referidos_unicos', 'compartidos'] for ipx in ['203.0.113', '198.51.100', '2001:db8']))
            ok('origen de la visita: «compartido» en el panel de orígenes', sql("SELECT COALESCE(SUM(n),0) AS n FROM dimensiones WHERE origen='compartido'")[0]['n'] >= 3)

        if corre('panel'):
            s, h, b = pedir('/panel')
            ok('Panel sin clave: pide la clave y no muestra las secciones', s == 200 and 'Acceso de administración' in b.decode() and 'id="difusion"' not in b.decode())
            for ruta in ['/panel/menciones', '/panel/concurso']:
                s, h, b = pedir(ruta, 'POST', b'accion=barrer', {'Content-Type': 'application/x-www-form-urlencoded'})
                ok(f'Panel sin clave: POST {ruta} rechazado (403)', s == 403, s)
            for ruta in ['/panel/concurso/captura/1', '/panel/concurso/vista.json', '/panel/concurso/sorteo.json', '/panel/cupon?codigo=CN25-AAAAA-BBBBB-CCCCC']:
                ok(f'Panel sin clave: GET {ruta} rechazado (403)', pedir(ruta)[0] == 403)
            s, okc = entrar(); ok('entrar al Panel con la clave', s == 303 and okc, s)
            hp = panel_html()
            ok('Panel: secciones «Difusión y menciones» y «Concurso» con sus anclas', 'id="difusion"' in hp and 'id="concurso"' in hp and 'href="#difusion"' in hp and 'href="#concurso"' in hp)
            ok('Panel: KPIs de compartidos, visitas por enlace y menciones', all(t in hp for t in ['Veces que tocaron «Compartir»', 'Visitas por enlaces compartidos', 'Menciones confirmadas', 'Sitios que envían lectores (dominio, 30 días)']))
            ok('Panel: el código con visitas aparece en «Enlaces personales»', 'ab12cd34' in hp or not corre('referidos'))

        if corre('menciones'):
            if not ADM: entrar()
            # las visitas de los grupos anteriores ya dieron pasos del recolector: se parte de cero para que el conteo sea exacto
            sql("DELETE FROM menciones"); sql("DELETE FROM config WHERE clave LIKE 'menciones_%'")
            s, loc = panel_post('/panel/menciones', {'accion': 'agregar', 'fecha': '2026-11-18', 'medio': 'Radio', 'programa': 'Mañaneros', 'persona': 'Juan Pérez', 'enlace': 'https://www.radio.cl/programa/123?utm_source=x#min5', 'alcance': '25.000', 'nota': 'entrevista', 'titulo': 'Entrevista'})
            f = sql("SELECT * FROM menciones WHERE origen='manual'")
            ok('mención manual: se guarda confirmada, con enlace limpio y alcance', s == 303 and 'men=agregada' in loc and len(f) == 1 and f[0]['estado'] == 'confirmada' and f[0]['enlace'] == 'https://www.radio.cl/programa/123' and f[0]['alcance'] == 25000 and f[0]['persona'] == 'Juan Pérez', (loc, f))
            s, loc = panel_post('/panel/menciones', {'accion': 'agregar', 'fecha': '2026-11-18', 'medio': 'TV', 'programa': 'Otro', 'enlace': 'https://www.radio.cl/programa/123'})
            ok('mención repetida (mismo enlace): rechazada', 'error:repetida' in loc, loc)
            casos = [({'fecha': '2099-01-01', 'medio': 'Radio', 'programa': 'x'}, 'error:fecha'), ({'fecha': '2026-11-18', 'medio': 'Diario', 'programa': 'x'}, 'error:medio'),
                     ({'fecha': '2026-11-18', 'medio': 'Radio', 'programa': 'x', 'enlace': 'javascript:alert(1)'}, 'error:enlace'), ({'fecha': '2026-11-18', 'medio': 'Radio', 'programa': 'x', 'enlace': 'https://www.cofrad.es/x'}, 'error:propio'),
                     ({'fecha': '2026-11-18', 'medio': 'Radio'}, 'error:quien'), ({'fecha': '2026-11-18', 'medio': 'Radio', 'programa': 'x', 'alcance': 'mucho'}, 'error:alcance')]
            ok('validaciones del formulario manual', all(c in panel_post('/panel/menciones', {'accion': 'agregar', **d})[1] for d, c in casos), [panel_post('/panel/menciones', {'accion': 'agregar', **d})[1] for d, c in casos])
            antes = len(salida())
            s, loc = panel_post('/panel/menciones', {'accion': 'barrer'})
            auto = sql("SELECT enlace, medio, programa, persona, fuente, estado, titulo FROM menciones WHERE origen='automática' ORDER BY id")
            E = [a['enlace'] for a in auto]
            ok('recolector: Google Noticias, Apple Podcasts y GDELT simulados', 'barrido:5' in loc and len(auto) == 5, (loc, E))
            ok('recolector: excluye lo publicado por cofrad.es', not any('cofrad.es' in e for e in E) and not any('CBMiBBB222' in e for e in E))
            ok('recolector: Apple Podcasts filtra lo que no nos nombra y limpia utm', 'https://podcasts.apple.com/cl/podcast/cafe-con-datos/id100?i=1000' in E and not any('id200' in e for e in E))
            ok('recolector: título repetido entre fuentes se guarda una sola vez', sum(1 for a in auto if (a['titulo'] or '').startswith('Emprendedores lanzan')) == 1)
            ok('recolector: todas quedan «por confirmar» y con medio', all(a['estado'] == 'por confirmar' and a['medio'] in ('Prensa digital', 'Podcast') for a in auto))
            nuevas_sal = [x for x in salida()[antes:] if any(h in x for h in ['news.google.com', 'itunes.apple.com', 'api.gdeltproject.org', 'reglas-redes'])]
            ok('recolector: revisa el robots.txt de Google Noticias antes de leerlo', 'GET news.google.com/robots.txt' in nuevas_sal and nuevas_sal.index('GET news.google.com/robots.txt') < nuevas_sal.index('GET news.google.com/rss/search'), nuevas_sal)
            s, loc = panel_post('/panel/menciones', {'accion': 'barrer'})
            ok('recolector: segunda búsqueda no repite (mismo enlace)', 'barrido:0' in loc and sql("SELECT COUNT(*) AS n FROM menciones WHERE origen='automática'")[0]['n'] == 5, loc)
            ids = [x['id'] for x in sql("SELECT id FROM menciones WHERE origen='automática' ORDER BY id")]
            panel_post('/panel/menciones', {'accion': 'confirmar', 'id': ids[0]}); panel_post('/panel/menciones', {'accion': 'descartar', 'id': ids[1]})
            est = {x['id']: x['estado'] for x in sql("SELECT id, estado FROM menciones")}
            ok('confirmar y descartar desde el Panel', est[ids[0]] == 'confirmada' and est[ids[1]] == 'descartada', est)
            panel_post('/panel/menciones', {'accion': 'pendiente', 'id': ids[1]})
            ok('reabrir una descartada', sql(f"SELECT estado FROM menciones WHERE id={ids[1]}")[0]['estado'] == 'por confirmar')
            hp = panel_html()
            ok('Panel: tabla de menciones con fecha, medio, programa, persona, enlace, alcance, origen, estado y nota', all(t in hp for t in ['<th>Programa o cuenta</th>', '<th>Persona</th>', '<th>Alcance</th>', '<th>Origen</th>', 'Juan Pérez', 'Mañaneros', 'entrevista', '25.000']))
            ok('Panel: contadores por medio y por mes', 'Confirmadas por medio' in hp and 'Confirmadas por mes' in hp and re.search(r'<span class="be">Radio</span>', hp) and 'noviembre 2026' in hp)
            ok('Panel: estado de YouTube sin el secreto', 'falta el secreto YOUTUBE_API_KEY' in hp)
            # --- alertas RSS ---
            tw, ga = 'https://alerts.talkwalker.com/alerts/rss/ABC123DEF', 'https://www.google.com/alerts/feeds/123456/789012'
            ok('alertas RSS: rechaza http, claves en la dirección y más de 5', all(c in panel_post('/panel/menciones', {'accion': 'rss', 'rss': x})[1] for x, c in [('http://alerts.talkwalker.com/x', 'error:rss'), ('https://a.cl/feed?api_key=123', 'error:rss'), ('https://a.cl/feed?token=1', 'error:rss'), ('\n'.join(f'https://a{i}.cl/f' for i in range(6)), 'error:rss-tope')]))
            s, loc = panel_post('/panel/menciones', {'accion': 'rss', 'rss': tw + '\n' + ga})
            ok('alertas RSS: guarda 2 direcciones', 'rss:2' in loc and json.loads(sql("SELECT valor FROM config WHERE clave='menciones_rss'")[0]['valor']) == [tw, ga], loc)
            s, loc = panel_post('/panel/menciones', {'accion': 'barrer'})
            st = json.loads(sql("SELECT valor FROM config WHERE clave='menciones_estado'")[0]['valor'])
            ok('alertas RSS: la que su robots.txt prohíbe queda «bloqueado» y no se lee', st['ultima']['fuentes'].get('alerta1') == 'bloqueado' and 'GET alerts.talkwalker.com/alerts/rss/ABC123DEF' not in salida(), st['ultima']['fuentes'])
            coop = sql("SELECT enlace, medio FROM menciones WHERE enlace LIKE '%cooperativa%'")
            ok('alertas RSS: la de Google Alertas (Atom) se lee y el enlace real sale de google.com/url', coop == [{'enlace': 'https://www.cooperativa.cl/noticias/cofrade-news-radio/', 'medio': 'Prensa digital'}], coop)
            hp = panel_html()
            ok('Panel: muestra «bloqueado por sus reglas» para la alerta prohibida', 'bloqueado por sus reglas' in hp)
            # --- paso del recolector desde las visitas: como mucho 1 descarga externa por visita ---
            sql("DELETE FROM config WHERE clave IN ('menciones_estado','menciones_reglas','menciones_robots','menciones_turno','menciones_paso')")
            ext = lambda l: [x for x in l if any(h in x for h in ['news.google.com', 'itunes.apple.com', 'api.gdeltproject.org', 'reglas-redes', 'talkwalker', 'www.google.com', 'googleapis'])]
            pasos = []
            for i in range(9):
                n0 = len(salida()); pedir('/', cab={'x-ip-prueba': f'192.0.2.{50 + i}'}); time.sleep(0.8); pasos.append(ext(salida()[n0:]))
            ok('cada visita a la portada hace como mucho 1 descarga del recolector', all(len(x) <= 1 for x in pasos) and sum(len(x) for x in pasos) >= 6, pasos)
            ok('el orden de los pasos: reglas, robots de Google, Google, Apple, GDELT', [x[0] if x else '' for x in pasos[:5]] == ['GET raw.githubusercontent.com/germanperey/cofrade-datos/main/datos/reglas-redes.json', 'GET news.google.com/robots.txt', 'GET news.google.com/rss/search', 'GET itunes.apple.com/search', 'GET api.gdeltproject.org/api/v2/doc/doc'], pasos[:5])

        if corre('concurso'):
            if not ADM: entrar()
            hp = pedir('/')[2].decode()
            ok('portada: cinta del concurso con Compartir, Participar y bases', 'class="cc-cinta"' in hp and 'cmp-abrir' in hp and 'href="/bases-concurso"' in hp)
            ok('portada: la cinta y el diálogo anuncian los 5 premios por lugar', 'Comparte Cofrade News y gana hasta un año gratis' in hp and 'Participa por 5 premios en el plan anual del Dashboard Financiero (válidos el primer año): 1.er lugar, plan anual gratis; 2.º lugar, 75 % de descuento' in hp and 'Gana hasta un año gratis' in hp and '25 % de descuento en el primer año del plan anual del Dashboard Financiero.' not in hp)
            ok('Buzón: opción «Participar en el concurso» y enlace a las bases', 'class="buzon-cc"' in hp and 'Participar en el concurso' in hp)
            # --- flujo por la interfaz ---
            from PIL import Image
            im = Image.new('RGB', (2400, 1600), (240, 240, 240)); px = im.load(); rnd = random.Random(7)
            for y in range(0, 1600, 2):
                for x in range(0, 2400, 3): px[x, y] = (rnd.randint(0, 255), (x * 7) % 255, (y * 3) % 255)
            im.save('/tmp/mf/prueba_wt2/captura_grande.png'); open('/tmp/mf/prueba_wt2/no_imagen.txt', 'w').write('hola')
            cx = contexto(br, viewport={'width': 1280, 'height': 900}); cx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=B)
            pg = cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/'); pg.wait_for_timeout(600)
            pg.click('nav .buzon-abrir'); pg.wait_for_timeout(300)
            pg.click('#dlgBuzon .concurso-abrir'); pg.wait_for_timeout(400)
            ok('desde el Buzón se abre el concurso en el paso 1 (y se cierra el Buzón)', pg.is_visible('#dlgConcurso .paso[data-paso="1"]') and not pg.evaluate("document.getElementById('dlgBuzon').open"))
            pg.click('#dlgConcurso .cc-sig'); pg.wait_for_timeout(150)
            ok('paso 1 exige 18+ en Chile y aceptar las bases', '18 años' in pg.inner_text('#dlgConcurso .pub-estado') and pg.is_visible('#dlgConcurso .paso[data-paso="1"]'))
            ok('paso 1 enlaza las bases', pg.locator('#dlgConcurso a[href="/bases-concurso"]').count() == 1)
            pg.check('#dlgConcurso input[name=mayor]'); pg.check('#dlgConcurso input[name=bases]'); pg.click('#dlgConcurso .cc-sig'); pg.wait_for_timeout(200)
            ok('paso 2: captura opcional con el aviso de tapar datos de otras personas', pg.is_visible('#dlgConcurso .paso[data-paso="2"]') and 'tapa los nombres' in pg.inner_text('#dlgConcurso .cc-aviso'))
            pg.set_input_files('#dlgConcurso input[type=file]', '/tmp/mf/prueba_wt2/no_imagen.txt'); pg.wait_for_timeout(300)
            ok('un archivo que no es imagen se rechaza en el navegador', 'no es una imagen' in pg.inner_text('#dlgConcurso .pub-estado'))
            pg.set_input_files('#dlgConcurso input[type=file]', '/tmp/mf/prueba_wt2/captura_grande.png'); pg.wait_for_selector('#dlgConcurso .cc-vista:not([hidden])', timeout=20000)
            peso = pg.inner_text('#dlgConcurso .cc-peso')
            kb, dims = int(peso.split(' KB')[0]), peso.split('· ')[1]
            ok('la captura se achica a 1280 px y bajo 300 KB en el navegador', dims == '1280×853' and kb <= 292, peso)
            pg.click('#dlgConcurso .cc-sig'); pg.wait_for_timeout(700)
            ok('paso 3 con el recuadro de seguridad', pg.is_visible('#dlgConcurso .paso[data-paso="3"]') and pg.locator('#tsConcurso .ts-falso').count() == 1)
            pg.fill('#dlgConcurso input[name=email]', 'lectora.concurso@gmail.com'); pg.click('#dlgConcurso .cc-enviar')
            pg.wait_for_selector('#dlgConcurso .buzon-ok:not([hidden])', timeout=15000)
            msg = pg.inner_text('#dlgConcurso .buzon-msg'); ref = pg.evaluate("localStorage.getItem('cn-ref')")
            ok('inscripción por la interfaz: correo de confirmación; la captura espera a que confirme su email', 'Te enviamos un correo' in msg and 'súbela de nuevo' in msg and not sql("SELECT id FROM concurso_capturas"), msg)
            ok('muestra el enlace personal del mismo navegador', pg.input_value('#dlgConcurso .cc-enlace') == f'https://www.cofrad.es/?r={ref}&utm_source=compartir')
            p1 = sql("SELECT * FROM concurso_participantes WHERE email='lectoraconcurso@gmail.com'")
            ok('participante sin confirmar, unido al código del navegador', len(p1) == 1 and p1[0]['verificado'] == 0 and p1[0]['codigo'] == ref and p1[0]['mayor'] == 1 and p1[0]['bases'] == 1, p1)
            ml = [m for m in correos() if m.get('to') == ['lectoraconcurso@gmail.com']]
            tok = re.search(r'/concurso/verificar\?t=([0-9a-f]{40})', ml[-1]['text']).group(1) if ml else ''
            ok('correo de confirmación con el enlace y el enlace personal', bool(tok) and f'?r={ref}' in ml[-1]['text'] and 'hola@cofrad.es' in ml[-1]['text'], [m.get('subject') for m in ml])
            pg.click('#dlgConcurso .cc-copiar'); pg.wait_for_timeout(300)
            ok('copiar mi enlace (portapapeles)', pg.evaluate('navigator.clipboard.readText()') == f'https://www.cofrad.es/?r={ref}&utm_source=compartir')
            g = pg.goto(B + '/concurso/verificar?t=' + tok)
            ok('el enlace del correo muestra un botón (no confirma solo)', g.status == 200 and pg.locator('form[action="/concurso/verificar"] button').count() == 1 and sql("SELECT verificado FROM concurso_participantes WHERE email='lectoraconcurso@gmail.com'")[0]['verificado'] == 0)
            pg.click('form[action="/concurso/verificar"] button'); pg.wait_for_load_state()
            ok('el botón confirma y muestra el enlace personal', 'Ya estás participando' in pg.inner_text('h1') and pg.input_value('.cc-enlace') == f'https://www.cofrad.es/?r={ref}&utm_source=compartir' and sql("SELECT verificado FROM concurso_participantes WHERE email='lectoraconcurso@gmail.com'")[0]['verificado'] == 1)
            ok('el enlace ya usado vence (410)', pg.goto(B + '/concurso/verificar?t=' + tok).status == 410)
            pg.goto(B + '/'); pg.wait_for_timeout(600)
            pg.click('nav .buzon-abrir'); pg.wait_for_timeout(300); pg.click('#dlgBuzon .concurso-abrir'); pg.wait_for_timeout(400)
            pg.check('#dlgConcurso input[name=mayor]'); pg.check('#dlgConcurso input[name=bases]'); pg.click('#dlgConcurso .cc-sig'); pg.wait_for_timeout(200)
            pg.set_input_files('#dlgConcurso input[type=file]', '/tmp/mf/prueba_wt2/captura_grande.png'); pg.wait_for_selector('#dlgConcurso .cc-vista:not([hidden])', timeout=20000)
            pg.click('#dlgConcurso .cc-sig'); pg.wait_for_timeout(700)
            pg.fill('#dlgConcurso input[name=email]', 'lectora.concurso@gmail.com'); pg.click('#dlgConcurso .cc-enviar')
            pg.wait_for_selector('#dlgConcurso .buzon-ok:not([hidden])', timeout=15000)
            msg2 = pg.inner_text('#dlgConcurso .buzon-msg')
            ok('ya confirmada, desde su navegador: la captura se recibe', 'Ya estás participando' in msg2 and 'Recibimos tu captura' in msg2, msg2)
            c1 = sql("SELECT id, email, bytes, ancho, alto, sha, estado, fecha, length(datos) AS largo, typeof(datos) AS tipo FROM concurso_capturas")
            ok('captura privada en D1 en texto base64 (no BLOB) con su SHA-256, por revisar', len(c1) == 1 and c1[0]['tipo'] == 'text' and c1[0]['estado'] == 'por revisar' and c1[0]['ancho'] == 1280 and c1[0]['largo'] == 4 * ((c1[0]['bytes'] + 2) // 3) and c1[0]['bytes'] <= 300000 and re.fullmatch(r'[0-9a-f]{64}', c1[0]['sha']), c1)
            ok('concurso sin errores de JavaScript', not errs, errs[:3])
            cx.close()
            # --- casos por la API ---
            s0 = secreto()
            casos = [({'email': 'a1@gmail.com', 'secreto': s0, 'mayor': None}, 400, '18 años'), ({'email': 'a1@gmail.com', 'secreto': s0, 'bases': None}, 400, 'bases'),
                     ({'email': 'a1@gmail.com', 'secreto': 'corto'}, 400, 'Recarga'), ({'email': 'no-es-email', 'secreto': s0}, 400, 'no parece válido'),
                     ({'email': 'a1@gmail.com', 'secreto': s0, 'cf-turnstile-response': 'token-malo'}, 400, 'persona'), ({'email': 'a1@fakemailx.cl', 'secreto': s0}, 400, 'desechables')]
            for d, st_, frase in casos:
                s, j = concurso(d); ok(f'API rechaza: {frase}', s == st_ and frase in (j.get('error') or ''), (s, j))
            s, j = concurso({'email': 'robot@gmail.com', 'secreto': s0, 'pagina_web': 'http://spam'})
            ok('trampa de robots: finge éxito y no guarda', s == 200 and j.get('ok') and not sql("SELECT email FROM concurso_participantes WHERE email='robot@gmail.com'"))
            s, j = concurso({'email': 'a1@gmail.com', 'secreto': s0}, ('c.png', b'\x89PNG\r\n\x1a\n' + b'0' * 400, 'image/png'))
            ok('API rechaza una captura que no es JPEG', s == 400 and 'imagen' in j.get('error', ''), (s, j))
            img1 = jpeg(800, 600, 11)
            s, j = concurso({'email': 'a1@gmail.com', 'secreto': s0}, ('c.jpg', img1, 'image/jpeg'))
            ok('API inscribe; la captura de quien no confirmó su email no se guarda', s == 200 and j.get('ok') and j.get('codigo') == codigo_de(s0) and 'súbela de nuevo' in j.get('mensaje', '') and not sql("SELECT id FROM concurso_capturas WHERE email='a1@gmail.com'"), (s, j))
            sql("UPDATE concurso_participantes SET verificado = 1 WHERE email = 'a1@gmail.com'")
            s, j = concurso({'email': 'a1@gmail.com', 'secreto': s0}, ('c.jpg', img1, 'image/jpeg'))
            ok('API: ya confirmada, desde su navegador, la captura se recibe', s == 200 and 'Recibimos tu captura' in j.get('mensaje', ''), (s, j))
            s2 = secreto(); concurso({'email': 'a2@gmail.com', 'secreto': s2}); sql("UPDATE concurso_participantes SET verificado = 1 WHERE email = 'a2@gmail.com'")
            s, j = concurso({'email': 'a2@gmail.com', 'secreto': s2}, ('c.jpg', img1, 'image/jpeg'))
            ok('imagen idéntica (mismo SHA-256) se rechaza aunque sea otra persona', s == 409 and 'ya fue enviada' in j.get('error', ''), (s, j))
            s, j = concurso({'email': 'a1@gmail.com', 'secreto': s0}, ('c.jpg', jpeg(800, 600, 12), 'image/jpeg'))
            ok('tope de 1 captura por persona y día', s == 429 and 'mañana' in j.get('error', ''), (s, j))
            s, j = concurso({'email': 'a3@gmail.com', 'secreto': s0})
            ok('el mismo navegador no inscribe un segundo email', s == 409 and 'otro email' in j.get('error', ''), (s, j))
            n0 = len(correos())
            s, j = concurso({'email': 'a1@gmail.com', 'secreto': secreto()}, ('c.jpg', jpeg(800, 600, 13), 'image/jpeg'))
            ok('el mismo email desde otro navegador: respuesta neutra, sin código, sin captura y sin correo', s == 200 and 'codigo' not in j and 'enlace' not in j and 'Si ese email está bien escrito' in j.get('mensaje', '') and sql("SELECT COUNT(*) AS n FROM concurso_capturas WHERE email='a1@gmail.com'")[0]['n'] == 1 and len(correos()) == n0, j)
            s, j = concurso({'email': 'grande@gmail.com', 'secreto': secreto()}, ('c.jpg', b'\xff\xd8\xff' + os.urandom(610000), 'image/jpeg'))
            ok('captura sobre 600 KB rechazada', s == 413, s)
            s, j = concurso({'email': 'mediana@gmail.com', 'secreto': secreto()}, ('c.jpg', b'\xff\xd8\xff' + os.urandom(320000), 'image/jpeg'))
            ok('captura sobre 300 KB rechazada', s == 413 and '300 KB' in j.get('error', ''), (s, j))
            s3 = secreto(); concurso({'email': 'juan.perez.typo@gmail.com', 'secreto': s3})
            s, j = concurso({'email': 'juanperez.bien@gmail.com', 'secreto': s3})
            filas = sql(f"SELECT email FROM concurso_participantes WHERE codigo = '{codigo_de(s3)}'")
            ok('email mal escrito: el mismo navegador lo corrige mientras no confirma', s == 200 and filas == [{'email': 'juanperezbien@gmail.com'}] and 'Te enviamos un correo' in j.get('mensaje', ''), (s, j, filas))
            s4 = secreto(); s, j = concurso({'email': 'Lector.Uno+concurso@gmail.com', 'secreto': s4})
            ok('alias de Gmail: se guarda la casilla canónica (sin puntos ni +etiqueta)', s == 200 and sql("SELECT email FROM concurso_participantes WHERE codigo = '" + codigo_de(s4) + "'") == [{'email': 'lectoruno@gmail.com'}], (s, j))
            s, j = concurso({'email': 'lectoruno@gmail.com', 'secreto': secreto()})
            ok('alias de Gmail: la misma casilla desde otro navegador recibe la respuesta neutra', s == 200 and 'codigo' not in j, j)
            res5 = [concurso({'email': f'tope.correo{i}@gmail.com', 'secreto': secreto()}, ip='198.51.100.77') for i in range(6)]
            ok('tope de 5 correos de confirmación por conexión y día', [x[0] for x in res5[:5]] == [200] * 5 and res5[5][0] == 429 and 'esta conexión' in res5[5][1].get('error', ''), [(x[0], x[1].get('error', '')[:50]) for x in res5])
            pc = []
            for i in range(4):
                sc = secreto(); concurso({'email': f'cap.red{i}@gmail.com', 'secreto': sc}); sql(f"UPDATE concurso_participantes SET verificado = 1 WHERE email = 'capred{i}@gmail.com'")
                pc.append(concurso({'email': f'cap.red{i}@gmail.com', 'secreto': sc}, ('c.jpg', jpeg(640, 480, 40 + i), 'image/jpeg'), ip='198.51.100.88'))
            ok('tope de 3 capturas por conexión y día', [x[0] for x in pc] == [200, 200, 200, 429] and 'más capturas' in pc[3][1].get('error', ''), [(x[0], (x[1].get('error') or x[1].get('mensaje', ''))[:40]) for x in pc])
            hoyc = sql("SELECT fecha FROM concurso_capturas ORDER BY id DESC LIMIT 1")[0]['fecha']
            sql("INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, datos, estado) VALUES " + ",".join(f"('relleno@example.com','{hoyc}','{hoyc}T10:00:00Z','{i:064x}',3,'/9j/','por revisar')" for i in range(1, 61)))
            sg = secreto(); concurso({'email': 'cap.global@gmail.com', 'secreto': sg}); sql("UPDATE concurso_participantes SET verificado = 1 WHERE email = 'capglobal@gmail.com'")
            s, j = concurso({'email': 'cap.global@gmail.com', 'secreto': sg}, ('c.jpg', jpeg(640, 480, 77), 'image/jpeg'))
            ok('tope de 60 capturas al día en todo el sitio (la base no se llena)', s == 429 and 'más capturas' in j.get('error', ''), (s, j))
            sql("DELETE FROM concurso_capturas WHERE email = 'relleno@example.com'")
            # --- conteo: topes diarios y fechas del concurso ---
            def ins_participante(email, cod, ver=1): sql(f"INSERT INTO concurso_participantes (email, codigo, creado, verificado, mayor, bases) VALUES ('{email}', '{cod}', '2026-11-20T10:00:00Z', {ver}, 1, 1)")
            def visitas(cod, fecha, n, pref='v'):
                if n: sql("INSERT OR IGNORE INTO referidos_unicos (fecha, codigo, visitante) VALUES " + ",".join(f"('{fecha}','{cod}','{pref}{fecha}{i:04d}')" for i in range(n)))
            ins_participante('tope@gmail.com', 'tope0001')
            visitas('tope0001', '2026-11-21', 15); visitas('tope0001', '2026-11-22', 3); visitas('tope0001', '2026-11-19', 5); visitas('tope0001', '2026-12-25', 4)
            sql("INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, datos, estado) VALUES ('tope@gmail.com','2026-11-21','2026-11-21T10:00:00Z','" + 'a' * 64 + "',3,X'FFD8FF','aceptada')")
            sql("INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, datos, estado) VALUES ('tope@gmail.com','2026-11-22','2026-11-22T10:00:00Z','" + 'b' * 64 + "',3,X'FFD8FF','rechazada')")
            sql("INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, datos, estado) VALUES ('tope@gmail.com','2026-12-25','2026-12-25T10:00:00Z','" + 'c' * 64 + "',3,X'FFD8FF','aceptada')")
            ins_participante('sinconfirmar@gmail.com', 'nover001', 0); visitas('nover001', '2026-11-21', 6)
            hp = panel_html()
            fila = re.search(r'<tr><td>tope@gmail\.com</td><td><code>tope0001</code></td><td>sí</td><td>([\d.]+)</td><td>([\d.]+)</td><td><b>([\d.]+)</b>', hp)
            ok('enlace: tope de 10 por día y solo dentro de las fechas (10 + 3)', fila and fila.group(1) == '13', fila and fila.groups())
            ok('captura: solo las aceptadas y dentro de las fechas (1); total 14', fila and fila.group(2) == '1' and fila.group(3) == '14', fila and fila.groups())
            fila2 = re.search(r'<tr><td>sinconfirmar@gmail\.com</td><td><code>nover001</code></td><td>no</td><td>0</td><td>0</td><td><b>0</b>', hp)
            ok('sin email confirmado no suma', bool(fila2))
            # --- revisión de capturas en el Panel ---
            cid = sql("SELECT id FROM concurso_capturas WHERE email='lectoraconcurso@gmail.com'")[0]['id']
            ok('Panel: la captura por revisar aparece con su miniatura', f'/panel/concurso/captura/{cid}' in hp)
            s, h, b = pedir(f'/panel/concurso/captura/{cid}', cab=ADM)
            ok('Panel: la captura se ve (JPEG privado, sin caché)', s == 200 and h.get('content-type') == 'image/jpeg' and b[:3] == b'\xff\xd8\xff' and 'no-store' in h.get('cache-control', '') and len(b) == c1[0]['bytes'], (s, h.get('content-type'), len(b)))
            s, loc = panel_post('/panel/concurso', {'accion': 'aceptar', 'id': cid})
            ok('aceptar captura', 'cc=aceptar' in loc and sql(f"SELECT estado FROM concurso_capturas WHERE id={cid}")[0]['estado'] == 'aceptada', loc)
            cid2 = sql("SELECT id FROM concurso_capturas WHERE email='a1@gmail.com'")[0]['id']
            s, loc = panel_post('/panel/concurso', {'accion': 'rechazar', 'id': cid2})
            ok('rechazar captura', 'cc=rechazar' in loc and sql(f"SELECT estado FROM concurso_capturas WHERE id={cid2}")[0]['estado'] == 'rechazada', loc)
            s, loc = panel_post('/panel/concurso', {'accion': 'excluir', 'email': 'tope@gmail.com'})
            ok('excluir: queda fuera del sorteo (0 participaciones) y marcado', 'cc=excluir' in loc and re.search(r'<tr class="men-desc"><td>tope@gmail\.com</td><td><code>tope0001</code></td><td>sí</td><td>0</td><td>0</td><td><b>0</b>', panel_html()) is not None, loc)
            s, loc = panel_post('/panel/concurso', {'accion': 'reincorporar', 'email': 'tope@gmail.com'})
            hp = panel_html()
            ok('reincorporar: vuelve con sus 14 participaciones', 'cc=reincorporar' in loc and re.search(r'<tr><td>tope@gmail\.com</td><td><code>tope0001</code></td><td>sí</td><td>13</td><td>1</td><td><b>14</b>', hp) is not None, loc)
            ok('Panel: muestra el último mantenimiento de los borrados de las bases', re.search(r'último mantenimiento \d{2}[-/]\d{2}', hp) is not None, re.findall(r'último mantenimiento [^<]{0,40}', hp))
            s, loc = panel_post('/panel/concurso', {'accion': 'borrar-datos', 'email': 'sinconfirmar@gmail.com'})
            ok('borrar los datos de un participante exige confirmar', 'error:confirmar-borrado' in loc and bool(sql("SELECT 1 FROM concurso_participantes WHERE email='sinconfirmar@gmail.com'")), loc)
            s, loc = panel_post('/panel/concurso', {'accion': 'borrar-datos', 'email': 'sinconfirmar@gmail.com', 'confirmo': 'si'})
            ok('borrar datos: inscripción y visitas de su enlace eliminadas', 'cc=borrado' in loc and not sql("SELECT 1 FROM concurso_participantes WHERE email='sinconfirmar@gmail.com'") and not sql("SELECT 1 FROM referidos_unicos WHERE codigo='nover001'"), loc)
            # --- sorteo: antes del 26-12 no se puede; vista previa con semilla fija ---
            s, loc = panel_post('/panel/concurso', {'accion': 'sortear'})
            ok('sortear exige marcar la confirmación', 'error:confirmar' in loc, loc)
            s, loc = panel_post('/panel/concurso', {'accion': 'sortear', 'revisado': 'si'})
            ok('sortear antes del 26-12-2026: rechazado y sin registro', 'cc=antes' in loc and not sql("SELECT id FROM concurso_sorteos"), loc)
            for i in range(10):
                cod = f'pes{i:05d}'; ins_participante(f'peso{i}@gmail.com', cod); visitas(cod, '2026-11-23', i + 1, 'w'); visitas(cod, '2026-11-24', min(10, 2 * i), 'x')
            s, j = jget('/panel/concurso/vista.json?semilla=prueba-fija-1')
            aud = j['audit']; gan = [g['id'] for g in j['ganadores']]
            esperado = [aud[i][0] for i in elegir([x[1] for x in aud], 'prueba-fija-1')]
            ok('vista previa: semilla fija → mismos ganadores que el cálculo independiente', s == 200 and gan == esperado, (gan, esperado))
            ok('vista previa: 5 ganadores distintos', len(gan) == 5 and len(set(gan)) == 5)
            ok('vista previa: huella = SHA-256 de la lista ordenada', j['huella'] == hashlib.sha256(json.dumps(aud, separators=(',', ':')).encode()).hexdigest() and [x[0] for x in aud] == sorted(x[0] for x in aud))
            ok('vista previa: lista con los pesos esperados', sorted(x[1] for x in aud) == sorted([14, 1] + [(i + 1) + min(10, 2 * i) for i in range(10)]) and j['total'] == sum(x[1] for x in aud), sorted(x[1] for x in aud))
            iguales = all(jget(f'/panel/concurso/vista.json?semilla=s{k}')[1]['ganadores'] == jget(f'/panel/concurso/vista.json?semilla=s{k}')[1]['ganadores'] for k in range(2))
            otras = [[g['id'] for g in jget(f'/panel/concurso/vista.json?semilla=semilla-{k}')[1]['ganadores']] == [aud[i][0] for i in elegir([x[1] for x in aud], f'semilla-{k}')] for k in range(4)]
            ok('vista previa: repetible y coincide con el cálculo independiente en 4 semillas más', iguales and all(otras), otras)
            pesos = [x[1] for x in aud]; gana = [0] * len(pesos)
            for k in range(1500):
                for i in elegir(pesos, f'sim{k}'): gana[i] += 1
            orden_p = sorted(range(len(pesos)), key=lambda i: pesos[i]); top, bajo = orden_p[-1], orden_p[0]
            ok('ponderado: quien tiene más participaciones gana más seguido', gana[top] > gana[bajo] * 3, (pesos[top], gana[top], pesos[bajo], gana[bajo]))
            s, j = jget('/panel/cupon?codigo=CN25-AAAAA-BBBBB-CCCCC&email=x@gmail.com&plan=anual')
            ok('cupón inexistente: no válido', j == {'ok': False, 'motivo': 'no existe'}, j)
            ok('cupón con formato malo: no válido', jget('/panel/cupon?codigo=CN25-AAAA-BBBB')[1]['motivo'] == 'formato' and jget('/panel/cupon?codigo=CN99-AAAAA-BBBBB-CCCCC')[1]['motivo'] == 'formato')
        if corre('bases'):
            s, h, b = pedir('/bases-concurso'); t = b.decode()
            es = ['Destak', 'Concurso «Comparte Cofrade News»', 'Desde el 20 de noviembre de 2026 hasta el 24 de diciembre de 2026 a las 23:59 (hora de Santiago de Chile)', '18 años o más que vivan en Chile',
                  'Una sola inscripción por persona y por email', 'No se necesita comprar ni pagar nada', 'máximo de 10 por día', 'máximo de 1 por día', 'idénticas', '5 ganadores', '1.er lugar, plan anual gratis; 2.º lugar, 75 % de descuento; 3.er lugar, 50 % de descuento; 4.º y 5.º lugares, 25 % de descuento', 'valen solo para el primer año del plan anual', '($55.000): $13.750 (2.º lugar), $27.500 (3.er lugar) o $41.250 (4.º y 5.º lugares)', 'los que sobran quedan desiertos', 'el plan sigue solo si tú lo contratas', 'se aplica a tu siguiente período anual', 'código personal de un solo uso, que solo vale junto con el email ganador', 'www.cofrad.es/socios/canjear', 'el primero que sale gana el 1.er lugar', 'lo organiza Destak (el «Organizador»)', 'Responsable: Destak EIRL.', 'y de 2 por conexión a internet',
                  'a más tardar a las 18:00', 'acrediten su edad y su residencia', 'el código se anula', 'portabilidad o bloqueo', 'Resend', 'huellas seudónimas',
                  'incluido el 20 % de los socios de la Cofradía', 'coordinando con hola@cofrad.es desde el email ganador, a más tardar el 31 de marzo de 2027', 'El 26 de diciembre de 2026', '5 ganadores distintos', 'SHA-256', 'la semilla aleatoria',
                  'Avisamos a los ganadores por email', 'hasta el 31 de enero de 2027', 'se borran 30 días después del sorteo', 'hola@cofrad.es', 'Ley 19.628', 'Ley 21.719', 'artículos 35 y 36 de la Ley 19.496', 'tapa los nombres']
            en = ['Organized by Destak'.split(' by ')[1], 'From November 20, 2026 until December 24, 2026 at 23:59 (Santiago, Chile time)', '18 or older who live in Chile', 'No purchase or payment',
                  'up to 10 per day', 'up to 1 per day', '1st place, free annual plan; 2nd place, 75% off; 3rd place, 50% off; 4th and 5th places, 25% off', 'valid only for the first year of the annual plan', '(CLP 55,000): CLP 13,750 (2nd place), CLP 27,500 (3rd place) or CLP 41,250 (4th and 5th places)', 'the rest are void', 'continues only if you choose to subscribe', 'personal single-use code that only works together with the winning email', 'the first person drawn wins 1st place', 'is organized by Destak (the “Organizer”)', 'Controller: Destak EIRL.', 'no later than 18:00', 'portability or blocking', 'pseudonymous daily fingerprints', 'by arranging it with hola@cofrad.es from the winning email, no later than March 31, 2027', 'On December 26, 2026', 'until January 31, 2027',
                  'deleted 30 days after the draw', 'Law 19,628 and Law 21,719', 'articles 35 and 36 of Chilean Law 19,496', "cover other people's names"]
            ok('bases en español: organizador, fechas, requisitos, participaciones, premio, sorteo, reclamo y datos personales', s == 200 and all(x in t for x in es), [x for x in es if x not in t])
            ok('bases en inglés: el mismo contenido', all(x in t for x in en), [x for x in en if x not in t])
            ok('bases: el organizador es «Destak»; «Destak EIRL» solo en Datos personales (ES y EN); el cambio de premios queda informado', 'E.I.R.L' not in t and t.count('EIRL') == 2 and 'Cambio del 20 de noviembre de 2026: se mejoraron los premios' in t and 'Change of November 20, 2026' in t)
            ok('bases: botón para participar mientras está abierto', 'class="btn oro concurso-abrir"' in t and 'id="dlgConcurso"' in t)
            cx = contexto(br, viewport={'width': 320, 'height': 760}); pg = cx.new_page(); pg.goto(B + '/bases-concurso'); pg.wait_for_timeout(500)
            ok('bases: abre en español (inglés oculto)', pg.is_visible('.b-es h1') and not pg.is_visible('.b-en h1'))
            pg.click('#idioma'); pg.wait_for_timeout(500)
            ok('bases: el botón EN muestra el bloque en inglés', pg.is_visible('.b-en h1') and not pg.is_visible('.b-es h1') and pg.title().startswith('“Share Cofrade News” contest rules'), pg.title())
            ok('bases a 320 px: sin desborde horizontal', pg.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            pg.click('#idioma'); pg.wait_for_timeout(300); pg.click('.b-es .concurso-abrir'); pg.wait_for_timeout(400)
            ok('bases: «Participar en el concurso» abre la inscripción', pg.is_visible('#dlgConcurso .paso[data-paso="1"]'))
            pg.goto(B + '/'); pg.wait_for_timeout(500)
            ok('portada a 320 px: sin desborde con el botón y la cinta', pg.evaluate('document.documentElement.scrollWidth <= innerWidth') and (lambda c: c and c[0] >= 44 and c[1] >= 44)(caja(pg, '#cmpBoton')))
            cx.close()
        br.close()

# ============================================================== SORTEO (hoy = 26-12-2026) ==============================================
if MODO == 'sorteo':
    entrar()
    def ins(email, cod, ver=1): sql(f"INSERT INTO concurso_participantes (email, codigo, creado, verificado, mayor, bases) VALUES ('{email}', '{cod}', '2026-11-20T10:00:00Z', {ver}, 1, 1)")
    def vis(cod, fecha, n, pref): sql("INSERT OR IGNORE INTO referidos_unicos (fecha, codigo, visitante) VALUES " + ",".join(f"('{fecha}','{cod}','{pref}{i:04d}')" for i in range(n)))
    pesos = {}
    for i in range(8):
        cod = f'gan{i:05d}'; ins(f'{chr(97 + i)}{chr(106 + i)}persona{i}@gmail.com', cod); vis(cod, '2026-12-01', 1 + i, f'a{i}'); pesos[f'{chr(97 + i)}{chr(106 + i)}persona{i}@gmail.com'] = 1 + i
    ins('cero@gmail.com', 'cero0001')
    ins('noconf@gmail.com', 'noconf01', 0); vis('noconf01', '2026-12-01', 9, 'n')
    s, j = concurso({'email': 'tarde@gmail.com', 'secreto': secreto()})
    ok('después del 24-12 no se inscribe nadie', s == 400 and 'cerró' in j.get('error', ''), (s, j))
    hp = pedir('/')[2].decode()
    ok('portada después del cierre: cinta de resultados, sin diálogo del concurso ni opción en el Buzón', 'Resultados del concurso' in hp and 'id="dlgConcurso"' not in hp and 'class="buzon-cc"' not in hp and 'class="cmp-cc"' not in hp)
    time.sleep(2)
    ok('26-12 antes de las 18:00: la visita a la portada no sortea sola', not sql("SELECT id FROM concurso_sorteos"))
    s, loc = panel_post('/panel/concurso', {'accion': 'sortear', 'revisado': 'si'})
    ok('sorteo oficial el 26-12-2026: 5 ganadores y 5 correos', 'cc=ok:5:5' in loc, loc)
    s, j = jget('/panel/concurso/sorteo.json'); so = j['sorteo']
    aud = so['lista']; gan = [g['id'] for g in so['ganadores']]
    ok('registro: semilla aleatoria de 64 hex y huella SHA-256 de la lista', re.fullmatch(r'[0-9a-f]{64}', so['semilla']) and so['huella'] == hashlib.sha256(json.dumps(aud, separators=(',', ':')).encode()).hexdigest())
    ok('registro: la lista no tiene emails (solo huellas) y excluye a quien no tiene chances', all(re.fullmatch(r'[0-9a-f]{16}', x[0]) for x in aud) and sorted(x[1] for x in aud) == list(range(1, 9)) and '@' not in json.dumps(aud))
    ok('registro: repetir el sorteo con la semilla da los mismos ganadores', gan == [aud[i][0] for i in elegir([x[1] for x in aud], so['semilla'])], gan)
    cup = j['cupones']
    vj = jget(f"/panel/concurso/vista.json?semilla={so['semilla']}")[1]
    orden = [g['email'] for g in vj['ganadores']]   # la vista previa con la misma semilla repite el sorteo y trae los emails
    ok('el orden del sorteo define el lugar: 1.º gratis, 2.º 75 %, 3.º 50 %, 4.º y 5.º 25 %', [g['id'] for g in vj['ganadores']] == gan and [(g.get('lugar'), g.get('pct')) for g in so['ganadores']] == [(1, 100), (2, 75), (3, 50), (4, 25), (5, 25)], so['ganadores'])
    pct_de = {c['email']: c['pct'] for c in cup}
    ok('cada ganador recibe el cupón de su lugar', [pct_de.get(e) for e in orden] == [100, 75, 50, 25, 25], [pct_de.get(e) for e in orden])
    ok('5 cupones de un solo uso, plan anual, vencen el 31-03-2027, con el descuento en el código (CN100, CN75, CN50, CN25)', len(cup) == 5 and all(re.fullmatch(r'CN%d(?:-[0-9A-HJKMNP-TV-Z]{5}){3}' % c['pct'], c['codigo']) and c['plan'] == 'anual' and c['vence'] == '2027-03-31' and not c['usado'] for c in cup) and len({c['email'] for c in cup}) == 5 and [c['pct'] for c in cup] == [100, 75, 50, 25, 25], cup)
    ok('los ganadores tienen chances y están confirmados', all(c['email'] in pesos for c in cup))
    mails = [m for m in correos() if 'Ganaste' in m.get('subject', '')]
    ok('correo a cada ganador con su cupón', len(mails) == 5 and all(any(c['codigo'] in m['text'] for m in mails if m['to'] == [c['email']]) for c in cup), len(mails))
    m1 = [m for m in mails if m['to'] == [orden[0]]]; m2 = [m for m in mails if m['to'] == [orden[1]]]; m5 = [m for m in mails if m['to'] == [orden[4]]]
    ok('correo del 1.er lugar: año gratis; del 2.º: 75 %; del 5.º: 25 %; todos dicen que vale solo el primer año',
       m1 and '1.er lugar' in m1[0]['subject'] and 'gratis (100 % de descuento)' in m1[0]['text'] and m2 and '2.º lugar' in m2[0]['subject'] and '75 % de descuento en el primer año' in m2[0]['text']
       and m5 and '5.º lugar' in m5[0]['subject'] and '25 % de descuento' in m5[0]['text'] and all('desde el segundo año rige el precio normal' in m['text'] for m in mails), [m['subject'] for m in mails])
    s, loc = panel_post('/panel/concurso', {'accion': 'sortear', 'revisado': 'si'})
    ok('no se puede sortear dos veces', 'cc=hecho' in loc and len(sql("SELECT id FROM concurso_sorteos")) == 1 and len(sql("SELECT codigo FROM cupones")) == 5, loc)
    b = pedir('/bases-concurso')[2].decode()
    masc = [g['mascara'] for g in so['ganadores']]
    ok('bases: resultados publicados con el email oculto (ES y EN)', 'Resultados del sorteo' in b and 'Results of the draw' in b and all(m in b for m in masc) and not any(c['email'] in b for c in cup) and so['huella'] in b)
    def masca(e): u, d = e.split('@'); return f"{u[:1 if len(u) <= 2 else 2]}***@{d}"
    pr_es = {100: 'primer año gratis', 75: '75 % de descuento en el primer año', 50: '50 % de descuento en el primer año', 25: '25 % de descuento en el primer año'}
    pr_en = {100: 'first year free', 75: '75% off the first year', 50: '50% off the first year', 25: '25% off the first year'}
    li_es = re.findall(r'<li>([^<]*)</li>', b.split('Resultados del sorteo')[1].split('</ol>')[0]); li_en = re.findall(r'<li>([^<]*)</li>', b.split('Results of the draw')[1].split('</ol>')[0])
    ok('bases: los 5 resultados en orden, cada máscara con el premio de SU cupón (ES y EN)', len({masca(e) for e in orden}) == 5 and li_es == [f"{masca(e)} · {pr_es[pct_de[e]]}" for e in orden] and li_en == [f"{masca(e)} · {pr_en[pct_de[e]]}" for e in orden], (li_es, li_en))
    c0 = cup[0]
    ok('cupón del 1.er lugar válido en el plan anual: 100 %, $0, no combinable', jget(f"/panel/cupon?codigo={c0['codigo']}&email={c0['email']}&plan=anual")[1] == {'ok': True, 'codigo': c0['codigo'], 'pct': 100, 'plan': 'anual', 'vence': '2027-03-31', 'combinable': False, 'monto': 0})
    pz = panel_html()
    ok('Panel: organiza Destak, premios por lugar y cupón del 1.º como año gratis', 'Organiza Destak. Premios: 1.er lugar, plan anual gratis;' in pz and 'Ganadores en orden de lugar' in pz and '100 % (año gratis)' in pz and 'E.I.R.L' not in pz.split('id="concurso"')[1].split('</section>')[0])
    ok('cupones del 2.º, 3.º y 4.º lugar: $13.750, $27.500 y $41.250', [jget(f"/panel/cupon?codigo={c['codigo']}&email={c['email']}&plan=anual")[1].get('monto') for c in cup[1:4]] == [13750, 27500, 41250])
    ok('cupón: otro email no sirve', jget(f"/panel/cupon?codigo={c0['codigo']}&email=otro@gmail.com&plan=anual")[1]['motivo'] == 'otro email')
    ok('cupón: plan mensual no sirve', jget(f"/panel/cupon?codigo={c0['codigo']}&email={c0['email']}&plan=mensual")[1]['motivo'] == 'solo plan anual')
    # --- canje del 1.er lugar en /socios/canjear (código + email + enlace a la bandeja del ganador) ---
    def canje(campos, origen='https://www.cofrad.es', ip='192.0.2.77'):
        s, h, b = pedir('/socios/canjear', 'POST', urllib.parse.urlencode(campos).encode(), {'Content-Type': 'application/x-www-form-urlencoded', 'Origin': origen, 'x-ip-prueba': ip}); return s, b.decode()
    c75 = cup[1]
    ok('canje: la página abre con el formulario', pedir('/socios/canjear')[0] == 200 and 'Activa tu plan anual gratis' in pedir('/socios/canjear')[2].decode())
    # (el cliente HTTP del arnés no envía la cabecera Origin; el bloqueo de otras webs lo cubre ORIGEN_OK, igual que en el Panel)
    ok('canje: el código del 1.er lugar con otro email no sirve', 'no coinciden' in canje({'email': c75['email'], 'codigo': c0['codigo']})[1])
    t75 = canje({'email': c75['email'], 'codigo': c75['codigo']})[1]
    ok('canje: un código de descuento no activa nada y explica qué hacer', 'Tu premio es un 75 % de descuento' in t75 and not sql("SELECT 1 FROM canjes"), re.findall(r'class="aviso"[^<]*', t75))
    ok('canje: el código se acepta escrito sin guiones y con O en vez de 0', 'no coinciden' not in canje({'email': c75['email'], 'codigo': c75['codigo'].replace('-', '').replace('0', 'o')})[1])
    antes = len(correos())
    s, t = canje({'email': c0['email'].upper(), 'codigo': ' ' + c0['codigo'].lower().replace('-', ' - ') + ' '})
    act = [m for m in correos()[antes:] if 'Activa tu plan anual gratis' in m.get('subject', '')]
    lk = re.search(r'https://www\.cofrad\.es/socios/canjear\?t=([a-f0-9]{64})', act[0]['text']).group(1) if act else ''
    ok('canje: email y código correctos (con mayúsculas y espacios) → enlace solo al email ganador', 'Te enviamos un enlace' in t and len(act) == 1 and act[0]['to'] == [c0['email']] and lk, (t[-300:], [m.get('subject') for m in correos()[antes:]]))
    ok('canje: la base guarda solo la huella del enlace, nunca el enlace', lk and not sql(f"SELECT 1 FROM canjes WHERE token = '{lk}'") and sql(f"SELECT 1 FROM canjes WHERE token = '{hashlib.sha256(lk.encode()).hexdigest()}'"))
    g = pedir('/socios/canjear?t=' + lk)[2].decode()
    ok('canje: abrir el enlace solo muestra el botón (no activa)', 'Activar mi plan anual' in g and not sql(f"SELECT usado FROM cupones WHERE codigo = '{c0['codigo']}'")[0]['usado'])
    ok('canje: un enlace inventado no sirve', 'ya se usó o venció' in canje({'t': 'a' * 64})[1])
    s, t = canje({'t': lk})
    us = sql(f"SELECT estado, plan, vence FROM usuarios WHERE email = '{c0['email']}'")
    cu = sql(f"SELECT usado, ref, reclamado FROM cupones WHERE codigo = '{c0['codigo']}'")[0]
    ok('canje: el botón activa el plan anual por un año, sin pago', 'quedó activo hasta' in t and us and us[0]['estado'] == 'activo' and us[0]['plan'] == 'anual' and us[0]['vence'] > '2027-11-01' and cu['usado'] and cu['ref'] == 'activacion' and cu['reclamado'], (t[-200:], us, cu))
    ok('canje: el mismo enlace no sirve dos veces', 'ya se usó o venció' in canje({'t': lk})[1])
    ok('canje: el mismo código no se activa dos veces', 'ya está activado' in canje({'email': c0['email'], 'codigo': c0['codigo']})[1])
    c2 = cup[2]
    s, loc = panel_post('/panel/concurso', {'accion': 'cupon-usado', 'codigo': c2['codigo']})
    ok('marcar cupón como usado; después ya no vale', 'cc=cupon-usado' in loc and jget(f"/panel/cupon?codigo={c2['codigo']}&email={c2['email']}&plan=anual")[1]['motivo'] == 'ya usado', loc)
    s, loc = panel_post('/panel/concurso', {'accion': 'cupon-reclamado', 'codigo': cup[1]['codigo']})
    ok('marcar cupón como reclamado', 'cc=cupon-reclamado' in loc and sql(f"SELECT reclamado FROM cupones WHERE codigo='{cup[1]['codigo']}'")[0]['reclamado'], loc)
    hp = panel_html()
    ok('Panel: registro de auditoría y aviso de fecha de prueba', 'registro de auditoría' in hp and so['semilla'] in hp and 'CONCURSO_HOY_PRUEBA' in hp)

# ============================================================== SORTEO DE RESPALDO (26-12-2026, 19:00) ==================================
if MODO == 'auto':
    def ins(email, cod, ver=1): sql(f"INSERT INTO concurso_participantes (email, codigo, creado, verificado, mayor, bases) VALUES ('{email}', '{cod}', '2026-11-20T10:00:00Z', {ver}, 1, 1)")
    def vis(cod, fecha, n, pref): sql("INSERT OR IGNORE INTO referidos_unicos (fecha, codigo, visitante) VALUES " + ",".join(f"('{fecha}','{cod}','{pref}{i:04d}')" for i in range(n)))
    for i in range(7):
        cod = f'aut{i:05d}'; ins(f'auto{i}@gmail.com', cod); vis(cod, '2026-12-02', 2 + i, f'b{i}')
    pedir('/'); time.sleep(5)
    so = sql("SELECT tipo, participantes, avisos FROM concurso_sorteos")
    ok('sorteo de respaldo: el 26-12 desde las 18:00 la primera visita a la portada hace el sorteo oficial', len(so) == 1 and so[0]['tipo'] == 'oficial' and so[0]['participantes'] == 7, so)
    ok('sorteo de respaldo: 5 cupones y 5 correos a los ganadores', len(sql("SELECT codigo FROM cupones")) == 5 and len([m for m in correos() if 'Ganaste' in m.get('subject', '')]) == 5 and so and so[0]['avisos'] == 5, so)
    pedir('/'); time.sleep(2)
    ok('sorteo de respaldo: otra visita no sortea de nuevo', len(sql("SELECT id FROM concurso_sorteos")) == 1 and len(sql("SELECT codigo FROM cupones")) == 5)

if MODO == 'pocos':   # 20-11-2026: 2 personas con chances y 5 premios → 1.er y 2.º lugar; los demás quedan desiertos
    entrar()
    def ins(email, cod, ver=1): sql(f"INSERT INTO concurso_participantes (email, codigo, creado, verificado, mayor, bases) VALUES ('{email}', '{cod}', '2026-11-20T10:00:00Z', {ver}, 1, 1)")
    def vis(cod, fecha, n, pref): sql("INSERT OR IGNORE INTO referidos_unicos (fecha, codigo, visitante) VALUES " + ",".join(f"('{fecha}','{cod}','{pref}{i:04d}')" for i in range(n)))
    ins('uno.pocos@gmail.com', 'poc00001'); vis('poc00001', '2026-12-03', 3, 'p'); ins('dos.pocos@gmail.com', 'poc00002'); vis('poc00002', '2026-12-03', 5, 'q')
    s, loc = panel_post('/panel/concurso', {'accion': 'sortear', 'revisado': 'si'})
    cup = sorted((c['pct'], c['email']) for c in sql("SELECT pct, email FROM cupones"))
    so = json.loads(sql("SELECT ganadores FROM concurso_sorteos")[0]['ganadores'])
    ok('pocos: 2 personas → 2 premios (100 % y 75 %), en el orden del sorteo', 'cc=ok:2:2' in loc and [c[0] for c in cup] == [75, 100] and [(g['lugar'], g['pct']) for g in so] == [(1, 100), (2, 75)], (loc, cup, so))
    b = pedir('/bases-concurso')[2].decode()
    ok('pocos: los resultados muestran 2 ganadores', len(re.findall(r'<li>[^<]*· primer año gratis</li>', b)) == 1 and len(re.findall(r'<li>[^<]*· 75 % de descuento en el primer año</li>', b)) == 1 and '50 % de descuento en el primer año</li>' not in b)
    g1 = sql("SELECT codigo, email FROM cupones WHERE pct = 100")[0]
    sql(f"INSERT INTO usuarios (email, estado, plan, mp_id) VALUES ('{g1['email']}', 'cancelado', 'mensual', 'mp-123')")
    s2, h2, b2 = pedir('/socios/canjear', 'POST', urllib.parse.urlencode({'email': g1['email'], 'codigo': g1['codigo']}).encode(), {'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://www.cofrad.es'})
    u1 = sql(f"SELECT estado, plan FROM usuarios WHERE email = '{g1['email']}'")[0]
    ok('pocos: a un socio con plan de Mercado Pago el canje no le pisa nada (se aplica a mano)', 'Ya eres socio' in b2.decode() and u1 == {'estado': 'cancelado', 'plan': 'mensual'} and not sql("SELECT 1 FROM canjes"), u1)
    ok('pocos: un código con prefijo que no calza con su porcentaje no vale', jget('/panel/cupon?codigo=CN50-' + sql("SELECT codigo FROM cupones WHERE pct = 100")[0]['codigo'][6:] + '&email=x@gmail.com&plan=anual')[1]['motivo'] in ('no existe', 'formato'))

# ============================================================== BORRADOS (02-02-2027) ================================================
if MODO == 'vencido':
    for em, cod in [('nogano@gmail.com', 'nog00001'), ('gano.reclama@gmail.com', 'gre00001'), ('gano.olvida@gmail.com', 'gol00001')]:
        sql(f"INSERT INTO concurso_participantes (email, codigo, creado, verificado, mayor, bases) VALUES ('{em}', '{cod}', '2026-11-20T10:00:00Z', 1, 1, 1)")
    sql("INSERT INTO cupones (codigo, email, origen, pct, plan, vence, creado, reclamado) VALUES ('CN25-AAAAA-AAAAA-AAAAA','gano.reclama@gmail.com','concurso',25,'anual','2027-03-31','2026-12-26T21:00:00Z','2027-01-10T10:00:00Z')")
    sql("INSERT INTO cupones (codigo, email, origen, pct, plan, vence, creado) VALUES ('CN25-BBBBB-BBBBB-BBBBB','gano.olvida@gmail.com','concurso',25,'anual','2027-03-31','2026-12-26T21:00:00Z')")
    sql("INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, datos, estado) VALUES ('nogano@gmail.com','2026-12-01','2026-12-01T10:00:00Z','" + 'd' * 64 + "',3,'/9j/','aceptada')")
    entrar(); hp = panel_html()
    ok('desde el 01-02-2027: se borran las capturas y los datos de quienes no ganaron', not sql("SELECT 1 FROM concurso_capturas") and not sql("SELECT 1 FROM concurso_participantes WHERE email='nogano@gmail.com'"))
    ok('desde el 01-02-2027: el cupón no reclamado se anula y el reclamado sigue', [x['codigo'] for x in sql("SELECT codigo FROM cupones ORDER BY codigo")] == ['CN25-AAAAA-AAAAA-AAAAA'] and not sql("SELECT 1 FROM concurso_participantes WHERE email='gano.olvida@gmail.com'"))
    ok('cupón reclamado: sigue válido hasta su vencimiento', jget("/panel/cupon?codigo=CN25-AAAAA-AAAAA-AAAAA&email=gano.reclama@gmail.com&plan=anual")[1].get('ok') is True)
    ok('Panel: último mantenimiento con fecha', re.search(r'último mantenimiento \d{2}[-/]\d{2}', hp) is not None, re.findall(r'último mantenimiento [^<]{0,40}', hp))

# ============================================================== CERRADO / ANTES ======================================================
if MODO in ('cerrado', 'antes'):
    s, j = concurso({'email': 'fuera@gmail.com', 'secreto': secreto()})
    frase = 'cerró' if MODO == 'cerrado' else 'todavía no empieza'
    ok(f'fuera de las fechas ({MODO}): la inscripción se rechaza', s == 400 and frase in j.get('error', ''), (s, j))
    hp = pedir('/')[2].decode()
    ok(f'{MODO}: la portada no muestra el diálogo ni la opción del Buzón', 'id="dlgConcurso"' not in hp and 'class="buzon-cc"' not in hp and 'class="cmp-cc"' not in hp)
    if MODO == 'antes': ok('antes: sin cinta del concurso', 'class="cc-cinta"' not in hp)
    else: ok('cerrado: cinta de resultados', 'Resultados del concurso' in hp)
    if MODO == 'cerrado':   # robots.txt con un grupo propio para nuestro robot (ROBOTS_GOOGLE=propio)
        entrar(); s, loc = panel_post('/panel/menciones', {'accion': 'barrer'})
        st = json.loads(sql("SELECT valor FROM config WHERE clave='menciones_estado'")[0]['valor'])
        ok('robots.txt: el grupo propio «CofradeNews-Menciones» manda sobre «*»', st['ultima']['fuentes'].get('google') == 2, st['ultima']['fuentes'])

# ============================================================== YOUTUBE ================================================================
if MODO == 'youtube':
    entrar()
    s, loc = panel_post('/panel/menciones', {'accion': 'barrer'})
    yt = json.loads(pedir('/__youtube')[2])
    ok('YouTube: una sola búsqueda con q="Cofrade News"|cofrad.es', len(yt) == 1 and urllib.parse.parse_qs(urllib.parse.urlparse(yt[0]).query)['q'] == ['"Cofrade News"|cofrad.es'], yt)
    m = sql("SELECT enlace, medio, programa FROM menciones WHERE fuente='YouTube'")
    ok('YouTube: la clave va en la cabecera X-Goog-Api-Key, no en la dirección', urllib.parse.parse_qs(urllib.parse.urlparse(yt[0]).query).get('_clave') == ['cabecera'], yt)
    ok('YouTube: guarda solo los videos que nos nombran en título o descripción', m == [{'enlace': 'https://www.youtube.com/watch?v=abcDEF12345', 'medio': 'YouTube', 'programa': 'Canal Economía Simple'}], m)
    st = json.loads(sql("SELECT valor FROM config WHERE clave='menciones_estado'")[0]['valor'])
    ok('Google Noticias bloqueado por su robots.txt: no se lee', st['ultima']['fuentes'].get('google') == 'bloqueado' and 'GET news.google.com/rss/search' not in salida(), st['ultima']['fuentes'])
    panel_post('/panel/menciones', {'accion': 'barrer'})
    ok('YouTube: respeta su turno (16 al día = cada 90 min): no repite enseguida', len(json.loads(pedir('/__youtube')[2])) == 1)
    ok('YouTube: cuenta las búsquedas del día', json.loads(sql("SELECT valor FROM config WHERE clave='menciones_yt_dia'")[0]['valor'])['n'] == 1)
    ok('la clave de YouTube no queda guardada en la base', not any('yt-clave-prueba' in (x['valor'] or '') for x in sql("SELECT valor FROM config")))
    hp = panel_html()
    ok('Panel: YouTube activo con 16 búsquedas al día (reglas-redes.json)', 'YouTube: activo, hasta 16 búsquedas al día' in hp and 'bloqueado por sus reglas' in hp)

# ============================================================== esquema ================================================================
if MODO == 'principal' and corre('esquema'):
    mod = open('/tmp/titulos/wt2/sitio/modulos/difusion.js', encoding='utf-8').read(); esq = open('/tmp/titulos/wt2/sitio/esquema-d1.sql', encoding='utf-8').read()
    lineas = re.findall(r'"(CREATE (?:TABLE|INDEX|UNIQUE INDEX) IF NOT EXISTS [^"]+)"', mod)
    ok('esquema-d1.sql tiene exactamente las mismas tablas que crea el Worker', len(lineas) == 18 and all(l + ';' in esq for l in lineas), len(lineas))

print(f"\n{sum(1 for _, c in res if c)}/{len(res)} pruebas OK ({MODO})")
