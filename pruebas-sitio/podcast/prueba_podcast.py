# 20-11-2026 · Pruebas del podcast: portada, /podcast, fuente del día, Panel (lista, alta manual, ocultar, sincronizar con YouTube
# simulado) y conversor de audio a video con portada fija en un navegador real.
# Uso: python3 prueba_podcast.py PUERTO MODO   (MODO: sinclave | conclave)
import base64, json, os, re, struct, sys, time, urllib.error, urllib.parse, urllib.request
from playwright.sync_api import sync_playwright
PUERTO = sys.argv[1] if len(sys.argv) > 1 else '8897'
MODO = sys.argv[2] if len(sys.argv) > 2 else 'sinclave'
B = f'http://127.0.0.1:{PUERTO}'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
res = []
def ok(n, c, extra=''):
    res.append((n, bool(c))); print(('OK   ' if c else 'FALLA'), n, '' if c and not extra else str(extra)[:300])
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
ADM = {}
def entrar():
    s, h, b = pedir('/panel/entrar', 'POST', b'clave=clave-de-prueba-123', {'Content-Type': 'application/x-www-form-urlencoded', 'x-ip-prueba': '192.0.2.201'})
    m = re.search(r'cn_adm=([^;]+)', h.get('set-cookie', '')); ADM['Cookie'] = 'cn_adm=' + m.group(1) if m else ''
def panel_post(campos):
    s, h, b = pedir('/panel/podcast', 'POST', urllib.parse.urlencode(campos).encode(), {'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://www.cofrad.es', **ADM})
    return s, urllib.parse.unquote(h.get('location', ''))
def panel_html(): return pedir('/panel', cab=ADM)[2].decode()
def portada(): return pedir('/')[2].decode()
INDIC = "Podcast breve de 5 a 8 minutos, en español de Chile"

entrar()
if MODO == 'sinclave':
    t = portada()
    ok('portada: sin episodios no hay sección del podcast (nada se promete antes de existir)', 'id="podcast"' not in t and 'muy pronto' not in t.split('id="t-secc"')[0].split('cc-cinta')[-1])
    s, h, b = pedir('/podcast/fuente/2026-11-19'); f = b.decode()
    ok('fuente del día: página con las 7 secciones y sin indexar', s == 200 and len(re.findall(r'<h2>\d\. ', f)) == 7 and 'noindex' in h.get('x-robots-tag', '') and 'La Tercera, 18-11' in f, (s, len(re.findall(r'<h2>', f))))
    s, h, b = pedir('/podcast/fuente/2026-11-19.txt'); tx = b.decode()
    ok('fuente del día en texto: sin «#» ni «**», con las 7 secciones', s == 200 and h.get('content-type', '').startswith('text/plain') and '#' not in tx and tx.startswith('Cofrade News · Noticias del jueves 19 de noviembre de 2026') and tx.count('\n7. Crecimiento inmobiliario en Chile') == 1, tx[:80])
    ok('fuente que no existe: 404; fecha inválida: 400', pedir('/podcast/fuente/2026-01-01')[0] == 404 and pedir('/podcast/fuente/2026-13-45')[0] == 400)
    hp = panel_html()
    ok('Panel: sección Podcast con el estado (sin clave ni lista)', 'id="podcast"' in hp and 'falta el secreto YOUTUBE_API_KEY' in hp and 'Lista de reproducción: <b>falta</b>' in hp and 'href="#podcast"' in hp)
    ok('Panel: fuente de hoy lista con abrir, copiar texto y copiar enlace', '/podcast/fuente/2026-11-20' in hp and 'data-copiar-url="/podcast/fuente/2026-11-20.txt"' in hp)
    ok('Panel: indicaciones del audio (menos de 500 caracteres) y título sugerido', INDIC in hp and 'Podcast Cofrade News · Viernes 20 de noviembre de 2026' in hp)
    s, loc = panel_post({'accion': 'lista', 'lista': 'https://www.youtube.com/watch?v=abc'})
    ok('lista: un enlace sin «list=» se rechaza', 'pod=error:lista' in loc, loc)
    s, loc = panel_post({'accion': 'lista', 'lista': 'https://www.youtube.com/playlist?list=PLcofradePodcast123'})
    ok('lista: se guarda el identificador (sin clave no se lee todavía)', 'pod=lista' in loc and sql("SELECT valor FROM config WHERE clave='podcast_lista'")[0]['valor'] == 'PLcofradePodcast123', loc)
    s, loc = panel_post({'accion': 'agregar', 'video': 'https://example.com/x', 'fecha': '2026-11-19'})
    ok('alta manual: un enlace que no es de YouTube se rechaza', 'pod=error:video' in loc, loc)
    s, loc = panel_post({'accion': 'agregar', 'video': 'https://youtu.be/manual00001', 'fecha': '2030-01-01'})
    ok('alta manual: fecha futura se rechaza', 'pod=error:fecha' in loc, loc)
    s, loc = panel_post({'accion': 'agregar', 'video': 'https://www.youtube.com/watch?v=manual00001&t=4', 'fecha': '2026-11-19'})
    e = sql("SELECT * FROM podcast_episodios")
    ok('alta manual: guarda id, fecha y título por defecto', 'pod=agregado' in loc and len(e) == 1 and e[0]['video'] == 'manual00001' and e[0]['titulo'] == 'Podcast Cofrade News · Jueves 19 de noviembre de 2026' and e[0]['origen'] == 'manual', e)
    s, loc = panel_post({'accion': 'agregar', 'video': 'https://youtu.be/manual00002', 'fecha': '2026-11-20', 'titulo': 'Episodio <script>alert(1)</script> de hoy'})
    t = portada()
    ok('portada: episodios en orden por fecha (el de hoy primero) con «Último episodio»', t.index('watch?v=manual00002') < t.index('watch?v=manual00001') and 'Último episodio' in t and 'Podcast diario · gratis' in t, t.count('pod-ep'))
    ok('portada: el título se escapa (sin código)', '<script>alert(1)' not in t and 'Episodio &lt;script&gt;' in t)
    ok('portada: el podcast va después de la cinta del concurso y antes de «Doce secciones»', 0 < t.index('class="cc-cinta"') < t.index('id="podcast"') < t.index('id="t-secc"'))
    s, loc = panel_post({'accion': 'agregar', 'video': 'https://youtu.be/manual00003', 'fecha': '2026-11-18', 'titulo': "Precio $& y $` y $' final"})
    t = portada()
    ok("portada: un título con «$&», «$`» y «$'» sale tal cual (el reemplazo no los interpreta)", ("Precio $&amp; y $` y $&#39; final" in t or "Precio $&amp; y $` y $' final" in t) and t.count('id="t-pod"') == 1 and t.count('class="cc-cinta"') == 1, re.findall(r'Precio[^<]{0,40}', t))
    panel_post({'accion': 'ocultar', 'video': 'manual00003'})
    s, h, b = pedir('/podcast'); pg = b.decode()
    ok('/podcast: lista completa con reproductor liviano y su política de seguridad', s == 200 and pg.count('class="pod-lite"') == 2 and 'https://www.youtube-nocookie.com' in h.get('content-security-policy', ''), h.get('content-security-policy', '')[:120])
    s, loc = panel_post({'accion': 'ocultar', 'video': 'manual00002'})
    ok('ocultar: sale de la portada', 'pod=oculto' in loc and 'manual00002' not in portada(), loc)
    s, loc = panel_post({'accion': 'mostrar', 'video': 'manual00002'})
    ok('mostrar: vuelve a la portada', 'pod=visible' in loc and 'manual00002' in portada(), loc)
    # --- navegador: copiar, /podcast con YouTube al tocar, portada fija y conversor ---
    with sync_playwright() as p:
        br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        cx = br.new_context(user_agent=UA, viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        cx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=B)
        cx.add_cookies([{'name': 'cn_adm', 'value': ADM['Cookie'].split('=', 1)[1], 'url': B}])
        pg = cx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('https://www.youtube-nocookie.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<p>reproductor</p>'))
        pg.route('https://i.ytimg.com/**', lambda r: r.fulfill(status=200, content_type='image/jpeg', body=b'\xff\xd8\xff'))
        pg.goto(B + '/podcast'); pg.click('.pod-lite >> nth=0'); pg.wait_for_timeout(500)
        src = pg.evaluate("(document.querySelector('iframe.pod-frame')||{}).src || ''")
        ok('/podcast: al tocar, aparece el reproductor de youtube-nocookie', src.startswith('https://www.youtube-nocookie.com/embed/manual00002'), src)
        ok('/podcast: el foco pasa al reproductor', pg.evaluate("document.activeElement && document.activeElement.tagName") == 'IFRAME')
        pg.goto(B + '/panel#podcast'); pg.wait_for_timeout(1200)
        pg.click('#podcast [data-copiar-id="podIndicaciones"]'); pg.wait_for_timeout(300)
        cb = pg.evaluate('navigator.clipboard.readText()')
        ok('copiar las indicaciones (menos de 500 caracteres)', cb.startswith(INDIC) and len(cb) < 500, len(cb))
        pg.click('#podcast [data-copiar-url="/podcast/fuente/2026-11-20.txt"]'); pg.wait_for_timeout(800)
        ok('copiar el texto de la fuente', pg.evaluate('navigator.clipboard.readText()').startswith('Cofrade News · Noticias del viernes 20 de noviembre de 2026'))
        pix = pg.evaluate("(()=>{const c=document.getElementById('podPortada'),d=c.getContext('2d').getImageData(0,0,1280,720).data;let claros=0;for(let i=0;i<d.length;i+=4*97){if(d[i]+d[i+1]+d[i+2]>600)claros++}return claros})()")
        ok('portada fija dibujada (texto claro sobre azul)', pix > 50, pix)
        pg.locator('#podPortada').screenshot(path='/tmp/mf/prueba_wt3/portada_podcast.png')
        href = pg.get_attribute('#podBajarPortada', 'href') or ''
        ok('portada descargable en PNG (y el botón se habilita recién con el archivo listo)', href.startswith('blob:') and pg.get_attribute('#podBajarPortada', 'download') == 'Portada-Podcast-Cofrade-News-2026-11-20.png' and pg.get_attribute('#podBajarPortada', 'aria-disabled') == 'false', href[:30])
        pg.fill('#podFecha', '2026-11-19'); pg.dispatch_event('#podFecha', 'change'); pg.wait_for_timeout(300)
        ok('al cambiar la fecha cambian el título y la descripción', pg.inner_text('#podTitulo') == 'Podcast Cofrade News · Jueves 19 de noviembre de 2026' and 'https://www.cofrad.es/edicion/2026-11-19' in pg.inner_text('#podDesc'))
        ok('«Crear el video» espera un audio', pg.is_disabled('#podCrear'))
        pg.set_input_files('#podAudio', '/tmp/mf/prueba_wt3/audio12.wav'); pg.wait_for_timeout(300)
        pg.click('#podCrear')
        for _ in range(360):   # wait_for_function usa eval, que la política de seguridad del sitio no permite
            st_ = pg.evaluate("() => [document.getElementById('podEstado').textContent, document.getElementById('podEstado').style.color]")
            if st_[0].startswith('Listo') or st_[1]: break
            pg.wait_for_timeout(500)
        msg = pg.inner_text('#podEstado')
        ok('conversor: video listo', msg.startswith('Listo: video de 0 min 12 s'), msg)
        with pg.expect_download() as dl: pg.click('#podBajar')
        d = dl.value; ruta = '/tmp/mf/prueba_wt3/podcast_prueba.webm'; d.save_as(ruta); datos = open(ruta, 'rb').read()
        ok('conversor: archivo WebM con nombre de la fecha', d.suggested_filename == 'Podcast-Cofrade-News-2026-11-19.webm' and datos[:4] == b'\x1a\x45\xdf\xa3' and len(datos) > 20000, (d.suggested_filename, len(datos)))
        p2 = cx.new_page(); p2.goto('about:blank')
        info = p2.evaluate("""async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(new Blob([bin], {type: 'video/webm'}));
            await new Promise((ok, mal) => { v.onloadedmetadata = ok; v.onerror = () => mal(new Error('no carga')); setTimeout(() => mal(new Error('tiempo')), 15000) });
            let dur = v.duration; if (!isFinite(dur)) { v.currentTime = 1e6; await new Promise(r => v.ontimeupdate = r); dur = v.duration }
            const ac = new OfflineAudioContext(1, 48000, 48000); const a = await ac.decodeAudioData(bin.buffer.slice(0));
            return { dur, w: v.videoWidth, h: v.videoHeight, audio: a.duration }; }""", base64.b64encode(datos).decode())
        ok('conversor: el video dura lo mismo que el audio, 1280×720, con pista de audio Opus', abs(info['dur'] - 12) < 1.6 and info['w'] == 1280 and info['h'] == 720 and abs(info['audio'] - 12) < 1.6, info)
        # Audio de 21 minutos: se rechaza ANTES de decodificarlo (leer la duración no carga el audio en memoria)
        largo = '/tmp/mf/prueba_wt3/audio21min.wav'
        if not os.path.exists(largo):
            n = 21 * 60 * 8000
            open(largo, 'wb').write(b'RIFF' + struct.pack('<I', 36 + n) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, 8000, 8000, 1, 8) + b'data' + struct.pack('<I', n) + b'\x80' * n)
        pg.set_input_files('#podAudio', largo); pg.wait_for_timeout(300); pg.click('#podCrear')
        for _ in range(60):
            st_ = pg.evaluate("() => [document.getElementById('podEstado').textContent, document.getElementById('podEstado').style.color]")
            if st_[1]: break
            pg.wait_for_timeout(250)
        ok('conversor: un audio de más de 20 minutos se rechaza con un aviso claro', 'más de 20 minutos' in st_[0] and 'Más corto' in st_[0], st_)
        ok('Panel del podcast sin errores de JavaScript', not errs, errs[:3])
        cx.close(); br.close()

if MODO == 'conclave':
    hp = panel_html()
    ok('con clave: el Panel la da por lista', 'Clave de YouTube: lista' in hp)
    s, loc = panel_post({'accion': 'agregar', 'video': 'manual00009', 'fecha': '2026-11-16'})
    s, loc = panel_post({'accion': 'lista', 'lista': 'PLcofradePodcast123'})
    e = {x['video']: x for x in sql("SELECT * FROM podcast_episodios")}
    yt = json.loads(pedir('/__youtube')[2])
    ok('guardar la lista la lee al tiro: 3 públicos, el privado no', 'pod=ok:3' in loc and set(e) == {'podAAAAAAA1', 'podBBBBBBB2', 'podDDDDDDD4', 'manual00009'}, (loc, list(e)))
    ok('la clave va en la cabecera X-Goog-Api-Key, nunca en la dirección', yt and all('_clave=cabecera' in u and 'key=' not in u.replace('_clave=', '') for u in yt), yt)
    ok('fecha de la edición leída del título; sin fecha, la de publicación en Chile', e['podAAAAAAA1']['fecha'] == '2026-11-19' and e['podDDDDDDD4']['fecha'] == '2026-11-17', (e['podAAAAAAA1']['fecha'], e['podDDDDDDD4']['fecha']))
    ok('miniatura solo de i.ytimg.com (otra dirección se reemplaza)', e['podBBBBBBB2']['miniatura'] == 'https://i.ytimg.com/vi/podBBBBBBB2/mqdefault.jpg' and e['podAAAAAAA1']['miniatura'].startswith('https://i.ytimg.com/'), e['podBBBBBBB2']['miniatura'])
    t = pedir('/')[2].decode()
    ok('portada: los 3 más nuevos por fecha de edición', [m for m in re.findall(r'watch\?v=([\w-]{11})', t)][:3] == ['podAAAAAAA1', 'podBBBBBBB2', 'podDDDDDDD4'], re.findall(r'watch\?v=([\w-]{11})', t)[:4])
    ok('portada: el título con etiquetas sale como texto', 'Episodio sin fecha en el título &lt;b&gt;negrita&lt;/b&gt;' in t)
    lista = json.load(open('/tmp/mf/prueba_wt3/fx/youtube_lista.json'))
    respaldo = json.dumps(lista)
    lista['items'] = lista['items'][:1]
    json.dump(lista, open('/tmp/mf/prueba_wt3/fx/youtube_lista.json', 'w'))
    try:
        s, loc = panel_post({'accion': 'sincronizar'})
        e2 = sorted(x['video'] for x in sql("SELECT video FROM podcast_episodios"))
        ok('lo que sale de la lista sale del sitio; lo agregado a mano se queda', 'pod=ok:1' in loc and e2 == ['manual00009', 'podAAAAAAA1'], (loc, e2))
    finally:
        open('/tmp/mf/prueba_wt3/fx/youtube_lista.json', 'w').write(respaldo)
    # «Leer la lista ahora»: el botón manda accion=sincronizar después del campo oculto accion=lista
    s, h, b = pedir('/panel/podcast', 'POST', urllib.parse.urlencode([('accion', 'lista'), ('accion', 'sincronizar')]).encode(), {'Content-Type': 'application/x-www-form-urlencoded', 'Origin': 'https://www.cofrad.es', **ADM})
    ok('«Leer la lista ahora» lee la lista (no la confunde con «Guardar la lista»)', 'pod=ok:3' in urllib.parse.unquote(h.get('location', '')), h.get('location'))
    base = json.loads(respaldo)
    def con_lista(items, **extra):
        d = dict(base); d['items'] = items; d.update(extra)
        json.dump(d, open('/tmp/mf/prueba_wt3/fx/youtube_lista.json', 'w'))
        s, loc = panel_post({'accion': 'sincronizar'}); return loc
    def it(v, titulo, pub='2026-11-18T12:00:00Z', dueno='UCcofradia', canal='UCcofradia'):
        return {'snippet': {'title': titulo, 'publishedAt': pub, 'channelId': canal, 'videoOwnerChannelId': dueno, 'resourceId': {'videoId': v}, 'thumbnails': {}},
                'contentDetails': {'videoId': v, 'videoPublishedAt': pub}, 'status': {'privacyStatus': 'public'}}
    try:
        # 120 videos: el borrado de lo que salió usa un solo parámetro (D1 acepta hasta 100 por consulta)
        muchos = [it('cien%07d' % i, 'Podcast Cofrade News · episodio %d' % i) for i in range(120)]
        loc = con_lista(muchos, pageInfo={'totalResults': 120})
        n = sql("SELECT COUNT(*) AS n FROM podcast_episodios WHERE origen='lista'")[0]['n']
        ok('lista de 120 videos: se guardan todos y el borrado no choca con el tope de parámetros', 'pod=ok:120' in loc and n == 120, (loc, n))
        loc = con_lista(muchos[:110], pageInfo={'totalResults': 110})
        n = sql("SELECT COUNT(*) AS n FROM podcast_episodios WHERE origen='lista'")[0]['n']
        ok('…y si salen 10, salen 10', 'pod=ok:110' in loc and n == 110, (loc, n))
        loc = con_lista([], pageInfo={'totalResults': 110})
        n = sql("SELECT COUNT(*) AS n FROM podcast_episodios WHERE origen='lista'")[0]['n']
        ok('respuesta vacía mientras YouTube dice que hay videos: no se borra nada', n == 110, (loc, n))
        loc = con_lista([it('propioAAAA1', 'Podcast · 19 de noviembre de 2026'), it('ajenoBBBBB2', 'Video de otro canal', dueno='UCotro'),
                         it('futuroCCCC3', 'Rumbo a las elecciones del 14 de diciembre de 2027', pub='2026-11-18T12:00:00Z'),
                         it('raraDDDDDD4', 'Edición 45-13-2026', pub='2026-11-17T12:00:00Z'), it('malaEEEEEE5', 'Sin fecha', pub='no-es-fecha')], pageInfo={'totalResults': 5})
        e = {x['video']: x for x in sql("SELECT video, fecha, publicado FROM podcast_episodios WHERE origen='lista'")}
        ok('solo videos del dueño de la lista (uno de otro canal no entra)', set(e) == {'propioAAAA1', 'futuroCCCC3', 'raraDDDDDD4', 'malaEEEEEE5'}, sorted(e))
        ok('fecha del título solo si es real y cercana a la publicación', e['propioAAAA1']['fecha'] == '2026-11-19' and e['futuroCCCC3']['fecha'] == '2026-11-18' and e['raraDDDDDD4']['fecha'] == '2026-11-17', {k: v['fecha'] for k, v in e.items()})
        ok('una fecha de publicación defectuosa no aborta la lectura', 'malaEEEEEE5' in e and e['malaEEEEEE5']['publicado'][:2] == '20', e.get('malaEEEEEE5'))
        sql("UPDATE config SET valor='PLlistaNoExiste123' WHERE clave='podcast_lista'")
        s, loc = panel_post({'accion': 'sincronizar'})
        ok('lista que YouTube no encuentra: aviso claro (404) y queda en el estado', 'pod=error:404' in loc and 'YouTube no encuentra esa lista' in pedir('/panel?pod=error%3A404', cab=ADM)[2].decode() and 'falló (HTTP 404)' in panel_html(), loc)
        sql("UPDATE config SET valor='PLcofradePodcast123' WHERE clave='podcast_lista'")
        con_lista(base['items'][:1])
    finally:
        open('/tmp/mf/prueba_wt3/fx/youtube_lista.json', 'w').write(respaldo)
    n0 = len(json.loads(pedir('/__youtube')[2]))
    pedir('/'); time.sleep(1.5); pedir('/'); time.sleep(1.5)
    ok('desde la portada respeta su turno de 2 horas (no vuelve a consultar)', len(json.loads(pedir('/__youtube')[2])) == n0)
    ok('la clave no queda guardada en la base', not any('yt-clave-prueba' in (x['valor'] or '') for x in sql("SELECT valor FROM config")))
    st = json.loads(sql("SELECT valor FROM config WHERE clave='podcast_estado'")[0]['valor'])
    ok('estado de la última lectura en el Panel', st.get('n') == 1 and not st.get('error') and 'Última lectura:' in panel_html(), st)

print(f"\n{sum(1 for _, c in res if c)}/{len(res)} pruebas OK ({MODO})")
