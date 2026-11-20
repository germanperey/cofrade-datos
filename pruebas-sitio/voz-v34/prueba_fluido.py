# v34: palabras de otro idioma sin pausas, pronunciación del léxico, puntuación y tildes (sobre la API de la voz)
import json, os, sys, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
BUN, PUERTO = sys.argv[1], sys.argv[2]
B = f"http://127.0.0.1:{PUERTO}"
V = json.load(open('/tmp/titulos/vozp/voces_mock.json'))
SIM = open('/tmp/titulos/voz/prueba/simulador.js', encoding='utf-8').read()
ok = 0; malos = []
def chk(c, n, extra=''):
    global ok
    if c: ok += 1
    else: malos.append(n)
    print(('OK   ' if c else 'FALLA ') + n + (('  · ' + str(extra)[:300]) if not c else ''), flush=True)
env = dict(os.environ, PUERTO=PUERTO, ED_EXTRA='/tmp/titulos/proy/ed')
srv = subprocess.Popen(['node', 'servidor.mjs', BUN], cwd='/tmp/mf/prueba', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for i in range(120):
        try: urllib.request.urlopen(B + '/__despachos', timeout=2); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        def pagina(q=''):
            c = nav.new_context(); c.add_init_script('window.__simCfg = ' + json.dumps({'bilingue': True, 'voces': V}) + ';'); c.add_init_script(SIM)
            pg = c.new_page(); pg.goto(B + '/edicion/2026-11-19' + q, wait_until='load', timeout=180000)
            pg.wait_for_function('() => !!(window.__cnVozAPI && __cnVozAPI.idiomas)', timeout=30000); return c, pg
        c, pg = pagina()
        idi = lambda t: pg.evaluate("(t) => __cnVozAPI.idiomas(t)", t)
        hab = lambda t: pg.evaluate("(t) => __cnVozAPI.hablable(t)", t)
        def uno(t):   # un solo pedazo con la voz de la página
            r = idi(t); return r and len(r) == 1 and not r[0]['l'], (r[0]['t'] if r else hab(t)), r
        a, t, r = uno('La cadena Walmart Chile anunció nuevas inversiones.'); chk(a and 'Uólmart Chile' in t, 'Walmart Chile va de corrido, con la voz de siempre y su pronunciación', r)
        a, t, r = uno('En Wall Street, el Dow Jones subió 1%.'); chk(a and 'Uol Strit' in t and 'Dau Yóuns' in t, 'Wall Street y Dow Jones sin cambiar de voz', r)
        a, t, r = uno('Scottie Scheffler ganó el torneo en Texas.'); chk(a and t.startswith('Skóti Shéfler ganó'), 'un nombre al comienzo de la frase tampoco corta', r)
        a, t, r = uno('El presidente Donald Trump dijo que habrá aranceles.'); chk(a and 'Dónald Tramp' in t, 'Donald Trump dentro de la frase', r)
        a, t, r = uno('Iga Świątek venció a Coco Gauff en las WTA Finals.'); chk(a and 'Swiatek' in t and 'Kóko Gof' in t and 'Fáinals' in t, 'letras de otros idiomas y siglas dentro de la frase', r)
        a, t, r = uno('Las startups chilenas crecen y el marketing digital también.'); chk(a and 'stártaps' in t and 'márketing' in t, 'plurales y palabras de uso común', r)
        a, t, r = uno('1. Chad Ramey. Estados Unidos. Menos 20. 2. Ben Shelton. Estados Unidos.'); chk(a and 'Chad Ramey' in t and 'Sh' in t, 'en una tabla de deportes los nombres también van con Catalina: una sola voz, sin alternar', r)
        a, t, r = uno('Fuentes: Caddie Golf, The Golf News Net.'); chk(a and 'Kádi Golf' in t, 'la marca Caddie Golf la dice Catalina, también en la línea de fuentes', r)
        r = idi('Habló de machine learning deep learning big data cloud y más.'); chk(r and any(x['l'] == 'en' for x in r), 'una frase entera en inglés cambia de voz', r)
        # puntuación y ortografía
        chk(hab('El Sr. Pérez visitó la Av. Providencia.') == 'El señor Pérez visitó la avenida Providencia.', 'Sr. y Av. no son fin de frase', hab('El Sr. Pérez visitó la Av. Providencia.'))
        h = hab('Lo anunció Falabella S.A. La empresa crece.'); chk('Falabella S A. La empresa' in h, 'S.A. al final de la frase deja su punto', h)
        h = hab('Cencosud S.A. anunció resultados.'); chk('Cencosud S A anunció' in h, 'S.A. en medio de la frase no corta', h)
        h = hab('Se votó el boletín 18282-07 en la Sala.'); chk('18282 guion 07' in h, 'número de boletín con «guion»', h)
        h = hab('Lluvia en Valparaiso, Concepcion y Nunoa.'); chk('Valparaíso' in h and 'Concepción' in h and 'Ñuñoa' in h, 'tildes que faltan', h)
        h = hab('LA ECONOMÍA CRECE EN CHILE'); chk(h.startswith('la Economía') and 'L A' not in h, 'un título en mayúsculas no se deletrea', h)
        h = hab('Visita cofrad.es o www.sii.cl hoy.'); chk('cofrad punto es' in h and 'sii punto cl' in h, 'dominios con «punto»', h)
        h = hab('Terminó la sesión.Luego habló el ministro,sin pausa.'); chk('sesión. Luego' in h and 'ministro, sin' in h, 'espacios que faltan después de la puntuación', h)
        h = hab('Etc. La lista sigue.'); chk(h.startswith('etcétera. La'), 'etc. con su punto', h)
        h = hab('Ganó 2,5% y la tasa es 1,25.'); chk('2,5' in h and '1,25' in h and ', 5' not in h, 'los decimales no se separan', h)
        h = hab('El océano Pacífico y la paris de Troya'); chk('paris' in h, 'palabras con otra lectura no se tocan', h)
        # 20-11-2026 04:38 (Germán: «el micrófono debe estar más sensible a escuchar cuando ... mencionan la palabra "Indice"»): lo que el reconocedor
        # escribe a veces en vez de «índice» cuenta como «índice» solo con una sección o tema detrás
        ent = lambda t: pg.evaluate("(t) => __cnVozAPI.entender(t, 'lee')", t)
        for f, k in [('indique cinco', 4), ('in dice golf', 20), ('hindi deportes', 20), ('endice quince', 14)]:
            o = ent(f); chk(o and o.get('tipo') == 'sec' and o.get('k') == k and o.get('indice') is True, f'oído: «{f}» se entiende como «índice» + destino', o)
        for f in ['indique usted lo que quiera', 'hindi es un idioma']:
            o = ent(f); chk(o and o.get('tipo') == 'nada', f'oído: «{f}» sin destino válido no es orden', o)
        c.close()
        # 20-11-2026 05:10 (Germán: «cuando la "voz" pronuncia todas las noticias en idioma inglés y aparece una palabra en español,
        # actualmente se genera una pausa antes y después de pronunciarla»): en la lectura en inglés, lo mismo al revés
        c, pg = pagina()
        pg.evaluate("() => { document.documentElement.lang = 'en'; }")
        ide = lambda t: pg.evaluate("(t) => __cnVozAPI.idiomas(t)", t)
        for f in ['President Gabriel Boric met the mayor of Ñuñoa in Valparaíso on Tuesday.', 'Copper exports from Antofagasta rose, according to Codelco and the Banco Central de Chile.',
                  'Universidad de Chile beat Colo-Colo at the Estadio Nacional.', 'Senator Evelyn Matthei and José Antonio Kast spoke in Viña del Mar.']:
            r = ide(f)
            chk(not r or (len(r) == 1 and not r[0]['l']), f'inglés de corrido: «{f[:48]}» va entero con la voz inglesa, sin pausas por los nombres en castellano', r)
        r = ide('The minister said that «vamos a seguir trabajando por todos los chilenos» before leaving.')
        chk(not r or len(r) == 1, 'inglés: una frase en castellano sin nombres tampoco corta la lectura', r)
        c.close()
        c, pg = pagina('?voz=voces')
        r = pg.evaluate("(t) => __cnVozAPI.idiomas(t)", 'La cadena Walmart Chile anunció nuevas inversiones.')
        chk(r and any(x['l'] == 'en' and 'Walmart' in x['t'] for x in r), '?voz=voces vuelve al cambio de voz de la v33', r)
        c.close(); nav.close()
finally:
    srv.terminate()
print(f"{ok} OK, {len(malos)} fallas")
