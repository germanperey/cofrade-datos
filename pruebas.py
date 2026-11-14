#!/usr/bin/env python3
"""Pruebas de bajar.py con datos de ejemplo (sin red). python3 scripts/pruebas.py"""
import datetime as dt
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bajar as B  # noqa: E402
_LIGA_ES = B.liga_es

PRUEBAS = []


def prueba(f):
    PRUEBAS.append(f)
    return f


@prueba
def uv_nueve_ciudades_en_orden():
    j = [{"daily": {"time": ["2026-10-27", "2026-10-28"], "uv_index_clear_sky_max": [11.24, None]}} for _ in B.CIUDADES]
    t = B.uv_csv(j).splitlines()
    assert len(t) == 9 and t[0] == "arica,2026-10-27,11.2" and t[-1].startswith("punta-arenas,"), t
    assert B.uv_csv({"daily": {"time": ["2026-10-27"], "uv_index_clear_sky_max": [3]}}) == "arica,2026-10-27,3.0\n"


@prueba
def imacec_por_mes():
    j = {"serie": [{"fecha": "2026-08-01T04:00:00.000Z", "valor": 2.1}, {"fecha": "2026-01-01T03:00:00.000Z", "valor": 1.4},
                   {"fecha": "x", "valor": 9}]}
    assert B.imacec_csv(j) == "2026-01,1.4\n2026-08,2.1\n"


XML_MES = """<?xml version="1.0" encoding="utf-8"?>
<VotacionesColeccion xmlns="http://opendata.camara.cl/camaradiputados/v1">
 <Votacion><ID>90533</ID><Fecha>2026-10-21T12:41:00</Fecha><Descripcion>Boletín N° 17535-25 en general</Descripcion>
  <TotalAfirmativos>98</TotalAfirmativos><TotalNegativos>40</TotalNegativos><TotalAbstenciones>5</TotalAbstenciones>
  <Quorum Codigo="1">Quórum Simple</Quorum><Resultado Codigo="1">Aprobado</Resultado><Tipo Codigo="1">Proyecto de Ley</Tipo></Votacion>
 <Votacion><ID>90100</ID><Fecha>2026-09-30T10:00:00</Fecha><Descripcion>Otra</Descripcion></Votacion>
</VotacionesColeccion>"""

XML_DET = """<Votacion xmlns="http://opendata.camara.cl/camaradiputados/v1"><ID>90533</ID><Votos>
 <Voto><Diputado><Nombre>Ana</Nombre><ApellidoPaterno>Pérez</ApellidoPaterno><ApellidoMaterno>Soto</ApellidoMaterno></Diputado>
  <OpcionVoto Codigo="1">Afirmativo</OpcionVoto></Voto>
 <Voto><Diputado><Nombre>Luis</Nombre><ApellidoPaterno>Rojas</ApellidoPaterno></Diputado><OpcionVoto Codigo="0">En Contra</OpcionVoto></Voto>
 <Voto><Diputado><Nombre>Eva</Nombre><ApellidoPaterno>Díaz</ApellidoPaterno></Diputado><OpcionVoto Codigo="2">Abstención</OpcionVoto></Voto>
 <Voto><Diputado><Nombre>Raúl</Nombre><ApellidoPaterno>Mena</ApellidoPaterno></Diputado><OpcionVoto Codigo="4">No Vota</OpcionVoto></Voto>
</Votos></Votacion>"""


@prueba
def camara_mes_y_nominal():
    m = B.camara_votaciones(XML_MES, "2026-10")
    assert len(m) == 1 and m[0]["id"] == "90533" and (m[0]["si"], m[0]["no"], m[0]["abst"]) == (98, 40, 5), m
    assert m[0]["resultado"] == "Aprobado" and m[0]["fecha"] == "2026-10-21T12:41" and "prmIdVotacion=90533" in m[0]["url"]
    n = B.camara_nominal(XML_DET)
    assert [x["voto"] for x in n] == ["Sí", "No", "Abstención"], n   # «No Vota» no se incluye
    assert n[0]["nombre"] == "Pérez Soto, Ana" and n[1]["nombre"] == "Rojas, Luis"


HTML_LIGA = """<html><body><p>Updated to match(es) played on 2 October 2026. Source: ANFP</p><table>
<tr><th>Pos</th><th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Qualification</th></tr>
""" + "".join(f"<tr><td>{i}</td><td>Equipo {chr(64 + i)}{' (C)' if i == 1 else ''}</td><td>24</td><td>{20 - i}</td><td>2</td><td>{2 + i}</td>"
               f"<td>{40 - i}</td><td>{20 + i}</td><td>{'+' if 20 - 2 * i > 0 else '−'}{abs(20 - 2 * i)}</td><td>{62 - 3 * i}</td><td>x</td></tr>"
               for i in range(1, 17)) + "</table></body></html>"


@prueba
def liga_tabla_completa_con_fecha():
    t = B.liga_tabla(HTML_LIGA, "https://en.wikipedia.org/wiki/2026_Liga_de_Primera")
    assert t and t["tabla_fecha"] == "2026-10-02" and len(t["tabla"]) == 16, t
    f = t["tabla"][0]
    assert f["equipo"] == "Equipo A" and (f["pj"], f["pg"], f["pe"], f["pp"], f["gf"], f["gc"], f["pts"]) == (24, 19, 2, 3, 39, 21, 59), f
    assert t["tabla"][15]["dif"] == -12
    assert B.liga_tabla("<html><table><tr><th>A</th></tr><tr><td>1</td></tr></table></html>", "u") is None


HTML_ES = "<html><table><tr><th>Pos.</th><th>Equipo</th><th>Pts.</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>Dif.</th></tr>" + \
    "".join(f"<tr><td>{i}</td><td>Club {i}</td><td>{60 - i}</td><td>25</td><td>15</td><td>5</td><td>5</td><td>40</td><td>30</td><td>+10</td></tr>"
            for i in range(1, 17)) + "</table></html>"


@prueba
def liga_en_espanol_y_elige_la_mas_avanzada():
    t = B.liga_tabla(HTML_ES, "u", "Wikipedia (es)", "2026-10-25")
    assert t and t["tabla"][0] == {"pos": 1, "equipo": "Club 1", "pj": 25, "pg": 15, "pe": 5, "pp": 5, "gf": 40, "gc": 30, "dif": 10, "pts": 59}, t["tabla"][0]
    orig_pedir = B.pedir
    try:
        B.pedir = lambda *a, **k: HTML_LIGA
        B.liga_es = lambda e, h: t
        assert B.liga({}, dt.date(2026, 10, 26))["tabla_fuente"] == "Wikipedia (es)"   # 25 PJ > 24 PJ
        B.liga_es = lambda e, h: None
        assert B.liga({}, dt.date(2026, 10, 26))["tabla_fuente"] == "Wikipedia (en)"
    finally:
        B.pedir = orig_pedir
        B.liga_es = _LIGA_ES


@prueba
def partidos_terminados():
    j = {"events": [{"strHomeTeam": "Colo-Colo", "strAwayTeam": "Cobresal", "intHomeScore": "2", "intAwayScore": "0", "dateEvent": "2026-10-20", "dateEventLocal": "2026-10-19",
                     "strStatus": "Match Finished"},
                    {"strHomeTeam": "A", "strAwayTeam": "B", "intHomeScore": None, "intAwayScore": None, "dateEvent": "2026-10-27", "strStatus": "NS"}]}
    assert B.partidos_csv(j) == [{"local": "Colo-Colo", "visita": "Cobresal", "gl": 2, "gv": 0, "fecha": "2026-10-19",
                                  "competencia": "Liga de Primera", "fuente": "TheSportsDB"}]


@prueba
def camara_acumula_el_voto_de_todo_el_periodo():
    XML = """<Votaciones><Votacion><ID>3</ID><Fecha>2026-10-27T12:00:00</Fecha></Votacion>
<Votacion><ID>2</ID><Fecha>2026-10-21T12:00:00</Fecha></Votacion><Votacion><ID>1</ID><Fecha>2026-07-01T12:00:00</Fecha></Votacion></Votaciones>"""
    pedidos = []

    def falso(url, estado, clave, como="json", espera=None, sesion=None):
        pedidos.append(url)
        estado[clave] = {"ok": True}
        return XML if "XAnno" in url else XML_DET
    orig, dormir, pad = B.pedir, B.time.sleep, B._padron_apellidos
    B.pedir, B.time.sleep, B._padron_apellidos = falso, (lambda x: None), (lambda: set())
    try:
        e = {}
        cam, nom = B.camara(e, dt.date(2026, 10, 28), previo={"3": [{"nombre": "X", "partido": "", "voto": "Sí"}], "1": [{"nombre": "Y"}]})
        assert set(nom) == {"3", "2"} and nom["3"][0]["nombre"] == "X", nom          # la 1 tiene más de 62 días: sale
        assert sum("Detalle" in u for u in pedidos) == 1 and "prmVotacionId=2" in pedidos[-1]   # solo se pide la que faltaba
        assert len(cam["camara_mes"]) == 2 and e["camara"]["nominal"]["guardadas"] == 2 and e["camara"]["nominal"]["pendientes"] == 0
    finally:
        B.pedir, B.time.sleep, B._padron_apellidos = orig, dormir, pad


@prueba
def nominal_de_otro_periodo_no_se_guarda():
    """13-11-2026: la Cámara devolvió nombres de un período anterior (Auth, Boric…) en las votaciones desde la 91133."""
    pad = {B._norm_nombre("Alinco Bustos"), B._norm_nombre("Mulet Martínez"), B._norm_nombre("García García")}
    vig = [{"nombre": "ALINCO BUSTOS, RENÉ"}, {"nombre": "Mulet Martínez, Jaime"}, {"nombre": "García García, René Manuel"}]
    vieja = [{"nombre": "AUTH STEWART, PEPE"}, {"nombre": "BORIC FONT, GABRIEL"}, {"nombre": "Mulet Martínez, Jaime"}]
    assert B.lista_vigente(vig, pad) and not B.lista_vigente(vieja, pad)
    assert B.lista_vigente(vieja, set())          # sin padrón no se bloquea
    assert len(B._padron_apellidos()) == 155      # datos/padron-camara.json (2026-2030)


@prueba
def asistencia_sesiones_y_vuelos_de_ayer():
    xs = """<Sesiones><Sesion><ID>5001</ID><Fecha>2026-10-27T10:00:00</Fecha><Tipo>Ordinaria</Tipo></Sesion>
<Sesion><ID>4000</ID><Fecha>2026-06-01T10:00:00</Fecha></Sesion></Sesiones>"""
    assert B.sesiones_xml(xs, "2026-08-27", "2026-10-28") == [{"id": "5001", "fecha": "2026-10-27", "tipo": "Ordinaria"}]
    xa = """<Asistencias><Asistencia><Diputado><Nombre>Ana</Nombre><ApellidoPaterno>Pérez</ApellidoPaterno></Diputado><TipoAsistencia>Asiste</TipoAsistencia></Asistencia>
<Asistencia><Diputado><Nombre>Luis</Nombre><ApellidoPaterno>Rojas</ApellidoPaterno></Diputado><TipoAsistencia>No Asiste</TipoAsistencia>
<Justificacion>Permiso constitucional</Justificacion></Asistencia>
<Asistencia><Diputado><Nombre>Eva</Nombre><ApellidoPaterno>Díaz</ApellidoPaterno></Diputado><TipoAsistencia>Inasistente</TipoAsistencia></Asistencia></Asistencias>"""
    a = B.asistencia_xml(xa)
    assert [(x["nombre"], x["estado"]) for x in a] == [("Pérez, Ana", "asiste"), ("Rojas, Luis", "no_asiste"), ("Díaz, Eva", "no_asiste")], a
    r = B.asistencia_resumen({"sesiones": {"5001": {"fecha": "2026-10-27", "asistencia": a}}})
    assert r["sesiones"] == 1 and {d["nombre"]: (d["asiste"], d["justificada"], d["no_justificada"]) for d in r["diputados"]} == \
        {"Pérez, Ana": (1, 0, 0), "Rojas, Luis": (0, 1, 0), "Díaz, Eva": (0, 0, 1)}
    assert B.vuelo_iata("LAN533 ") == "LA533" and B.vuelo_iata("SKU0123") == "H2123" and B.vuelo_iata("N123AB") == "" and B.vuelo_iata("XYZ12") == ""


@prueba
def opensky_con_cuenta_gratuita():
    e = {}
    os_env = dict(B.os.environ)
    try:
        B.os.environ.pop("OPENSKY_CLIENT_ID", None); B.os.environ.pop("OPENSKY_CLIENT_SECRET", None)
        assert B.opensky_token(e) is None and "sin secretos" in e["opensky_cuenta"]["error"]
        B.os.environ["OPENSKY_CLIENT_ID"], B.os.environ["OPENSKY_CLIENT_SECRET"] = "cliente", "secreto"
        vistos = []

        class R:
            status_code = 200

            def json(self):
                return {"access_token": "TOK"}
        post = B.requests.post
        B.requests.post = lambda url, data=None, **k: (vistos.append((url, data)), R())[1]
        try:
            assert B.opensky_token(e) == "TOK" and e["opensky_cuenta"]["ok"]
            assert vistos[0][0] == B.OPENSKY_TOKEN and vistos[0][1]["grant_type"] == "client_credentials" and vistos[0][1]["client_id"] == "cliente"
        finally:
            B.requests.post = post
        cab = []

        class S:
            def get(self, url, headers=None, **k):
                cab.append(headers)

                class Rr:
                    status_code, content, text = 200, b"[]", "[]"

                    def json(self):
                        return []
                return Rr()
        assert B.pedir("u", {}, "x", sesion=S(), cabeceras={"Authorization": "Bearer TOK"}) == [] and cab[0]["Authorization"] == "Bearer TOK"
    finally:
        B.os.environ.clear(); B.os.environ.update(os_env)


@prueba
def reintenta_con_pausa_y_anota_el_error():
    llamadas = []

    class R:
        def __init__(s, c):
            s.status_code, s.content, s.text = c, b"{}" if c == 200 else b"", "{}"

        def json(s):
            return {"ok": 1}

    class S:
        def __init__(s, codigos):
            s.c = list(codigos)

        def get(s, url, **k):
            llamadas.append(url)
            return R(s.c.pop(0))

    dormir, B.time.sleep = B.time.sleep, lambda x: None
    try:
        e = {}
        assert B.pedir("u", e, "x", sesion=S([500, 503, 200])) == {"ok": 1} and e["x"]["ok"] and e["x"]["intentos"] == 3
        e = {}
        assert B.pedir("u", e, "y", sesion=S([403, 200, 200])) is None and e["y"]["error"] == "HTTP 403" and e["y"]["intentos"] == 1
    finally:
        B.time.sleep = dormir


@prueba
def main_sin_red_no_se_cae():
    dormir, get = B.time.sleep, B.requests.Session.get
    B.time.sleep = lambda x: None

    def falla(self, url, **k):
        raise B.requests.ConnectionError("sin red")
    B.requests.Session.get = falla
    B._ROBOTS.clear()
    B._SIN_ROBOTS.clear()
    try:
        d = tempfile.mkdtemp()
        assert B.main(["--salida", d]) == 0
        import json
        e = json.load(open(os.path.join(d, "estado.json")))
        assert all(not v["ok"] for v in e["fuentes"].values()) and not os.path.exists(os.path.join(d, "uv.csv"))
    finally:
        B.time.sleep, B.requests.Session.get = dormir, get


# ---------- 31-10-2026: titulares por RSS, mercados y bitcoin ----------
RSS_GN = """<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Google News</title>
<item><title>Cámara aprueba el reajuste - La Tercera</title><link>https://news.google.com/rss/articles/abc</link>
<pubDate>Fri, 30 Oct 2026 22:15:00 GMT</pubDate><description>&lt;a href="x"&gt;Cámara aprueba&lt;/a&gt; el reajuste</description>
<source url="https://www.latercera.com">La Tercera</source></item>
<item><title>Nota vieja</title><link>https://ej.cl/vieja</link><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Sin enlace</title></item></channel></rss>"""
ATOM = """<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>ESO</title>
<entry><title>Un nuevo exoplaneta</title><link rel="alternate" href="https://www.eso.org/public/news/eso2620/"/>
<updated>2026-10-30T12:00:00Z</updated><summary type="html">El VLT detectó &lt;b&gt;un planeta&lt;/b&gt;.</summary></entry></feed>"""


@prueba
def rss_y_atom_con_medio_real_y_fecha_de_chile():
    n = B.leer_feed(RSS_GN, "Google News · Política")
    assert len(n) == 2, n
    assert n[0]["fuente"] == "La Tercera (vía Google News)" and n[0]["titulo"] == "Cámara aprueba el reajuste", n[0]
    assert n[0]["fecha"] == "2026-10-30 19:15" and n[0]["resumen"] == "Cámara aprueba el reajuste", n[0]   # UTC-3, sin HTML
    a = B.leer_feed(ATOM, "ESO · Comunicados (RSS)")
    assert a == [{"fuente": "ESO · Comunicados (RSS)", "titulo": "Un nuevo exoplaneta", "fecha": "2026-10-30 09:00",
                  "url": "https://www.eso.org/public/news/eso2620/", "resumen": "El VLT detectó un planeta."}], a
    assert B.leer_feed("<html>no</html", "x") is None and B.leer_feed("<rss><channel></channel></rss>", "x") == []
    j = {"articles": [{"headline": "Jarry avanza", "published": "2026-10-30T20:00:00Z", "description": "Ganó",
                       "links": {"web": {"href": "https://espn.com/t/1"}}}, {"headline": "sin enlace"}]}
    assert B.leer_espn([1, 2], "x") == [] and B.leer_espn({"articles": ["raro"]}, "x") == []
    e = {}
    r = B._un_feed(("deportes", "X", "https://x.cl/f", "rss", e, "rss_x"))   # sin red ni robots: no se cae
    assert r[1]["ok"] is False and not e["rss_x"]["ok"]
    assert B.leer_espn(j, "ESPN · Tenis") == [{"fuente": "ESPN · Tenis", "titulo": "Jarry avanza", "fecha": "2026-10-30 17:00",
                                              "url": "https://espn.com/t/1", "resumen": "Ganó"}]


@prueba
def robots_txt_se_respeta_y_sin_respuesta_no_se_lee():
    class R:
        def __init__(s, c, t=""):
            s.status_code, s.text = c, t
    resp = {"https://a.cl/robots.txt": R(200, "User-agent: *\nDisallow: /rss\n"), "https://b.cl/robots.txt": R(404),
            "https://c.cl/robots.txt": R(403)}

    def get(self, url, **k):
        if url in resp:
            return resp[url]
        raise B.requests.ConnectionError("x")
    viejo = B.requests.Session.get
    B.requests.Session.get = get
    B._ROBOTS.clear()
    try:
        e = {}
        assert not B.robots_permite("https://a.cl/rss/portada", e) and B.robots_permite("https://a.cl/feed/", e)
        assert B.robots_permite("https://b.cl/feed", e) and B.robots_permite("https://c.cl/feed", e)   # 4xx: se puede (RFC 9309)
        assert not B.robots_permite("https://d.cl/feed", e) and not e["robots_d.cl"]["ok"]
        assert B._motivo_robots("https://d.cl/x") == "robots.txt no respondió" and B._motivo_robots("https://a.cl/rss") == "robots.txt no lo permite"
        assert B.ROBOTS_VISTOS["a.cl"]["reglas"] == ["Disallow: /rss"] and B.ROBOTS_VISTOS["d.cl"]["estado"] == "ConnectionError"
    finally:
        B.requests.Session.get = viejo
        B._ROBOTS.clear()
        B._SIN_ROBOTS.clear()


@prueba
def titulares_por_seccion_con_ventana_sin_repetir_y_robots():
    feeds = {"politica/chile": [("GN", "https://news.google.com/rss/a", "rss"), ("GN2", "https://news.google.com/rss/b", "rss"),
                                ("Prohibido", "https://no.cl/feed", "rss"), ("Caído", "https://caido.cl/feed", "rss")],
             "astronomia": [("ESO", "https://www.eso.org/public/news/feed/", "rss")]}
    viejos = B.robots_permite, B.pedir, B.ahora

    def pedir(url, estado, clave, **k):
        if "caido" in url:
            estado[clave] = {"ok": False, "error": "HTTP 500"}
            return None
        estado[clave] = {"ok": True}
        return ATOM if "eso.org" in url else RSS_GN
    B.robots_permite = lambda url, e: "no.cl" not in url
    B.pedir = pedir
    B.ahora = lambda: dt.datetime(2026, 10, 31, 4, 17, tzinfo=B.TZ)
    try:
        e = {}
        t = B.titulares(e, feeds, hilos=2)
        pc = t["secciones"]["politica/chile"]
        assert [n["titulo"] for n in pc["notas"]] == ["Cámara aprueba el reajuste"], pc   # sin la vieja ni la repetida
        c = {x["fuente"]: x for x in pc["consultadas"]}
        assert c["GN"]["ok"] and c["GN"]["n"] == 2 and c["Prohibido"]["error"] == "robots.txt no lo permite" and c["Caído"]["error"] == "HTTP 500"
        assert t["secciones"]["astronomia"]["notas"][0]["url"].startswith("https://www.eso.org/")
        assert e["titulares"]["ok"] and e["titulares"]["feeds_ok"] == 3 and e["titulares"]["feeds"] == 5
    finally:
        B.robots_permite, B.pedir, B.ahora = viejos
    # la misma dirección en dos secciones se lee una vez; en «inmobiliario» de un diario general solo entra lo del tema
    pedidas = []
    def pedir2(url, estado, clave, **k):
        pedidas.append(url)
        estado[clave] = {"ok": True}
        return RSS_GN.replace("Cámara aprueba el reajuste", "Venta de viviendas sube 12%").replace("Nota vieja", "Fútbol: gana Colo-Colo")
    B.robots_permite, B.pedir, B.ahora = (lambda url, e: True), pedir2, (lambda: dt.datetime(2026, 10, 31, 4, 17, tzinfo=B.TZ))
    try:
        t2 = B.titulares({}, {"economia/chile": [("Pulso", "https://lt.cl/rss", "rss")], "inmobiliario": [("Pulso (inmobiliario)", "https://lt.cl/rss", "rss")]}, hilos=2)
    finally:
        B.robots_permite, B.pedir, B.ahora = viejos
    assert pedidas == ["https://lt.cl/rss"] and t2["secciones"]["inmobiliario"]["consultadas"][0]["fuente"] == "Pulso (inmobiliario)"
    assert [n["titulo"] for n in t2["secciones"]["inmobiliario"]["notas"]] == ["Venta de viviendas sube 12%"]
    assert all(len([1 for _, u, _ in v if "news.google" not in u and "site.api.espn" not in u]) >= 6 for v in B.FEEDS.values()), \
        "cada sección necesita al menos 6 fuentes que no dependan de Google News ni de la API de ESPN"
    assert all(len(v) >= 6 for v in B.FEEDS.values()) and set(B.FEEDS) >= {"economia/chile", "deportes", "ciencia", "astronomia"}
    assert all(u.startswith("https://") and t in ("rss", "json") for v in B.FEEDS.values() for _, u, t in v)


@prueba
def mercados_solo_cierres_definitivos_y_bitcoin():
    hoy = dt.date(2026, 10, 31)
    t0 = int(dt.datetime(2026, 10, 29, 13, 0, tzinfo=dt.timezone.utc).timestamp())
    j = {"chart": {"result": [{"meta": {"gmtoffset": -10800}, "timestamp": [t0, t0 + 86400, t0 + 2 * 86400],
                               "indicators": {"quote": [{"close": [9000.0, 9090.0, 9500.0]}]}}]}}
    assert B.cierres_yahoo(j, hoy) == [("2026-10-29", 9000.0), ("2026-10-30", 9090.0)]   # el 31 (hoy, abierto) no es cierre
    assert B.cierres_stooq("Date,Open,High,Low,Close\n2026-10-29,1,1,1,10\n2026-10-30,1,1,1,11\n2026-10-31,1,1,1,99\n", hoy) == \
        [("2026-10-29", 10.0), ("2026-10-30", 11.0)]
    viejos = B.robots_permite, B.pedir

    def pedir(url, estado, clave, **k):
        estado[clave] = {"ok": True}
        if "coinbase" in url:
            return {"data": {"amount": "71234.567"}}
        if "stooq" in url:
            return "Date,Open,High,Low,Close\n2026-10-29,1,1,1,100\n2026-10-30,1,1,1,102\n"
        return j if "IPSA" in url else None
    B.robots_permite, B.pedir = (lambda url, e: True), pedir
    try:
        e = {}
        m = B.mercados(e, hoy)
        ipsa = next(x for x in m if x["nombre"] == "IPSA")
        assert ipsa == {"nombre": "IPSA", "valor": 9090.0, "variacion_pct": 1.0, "fecha": "2026-10-30", "fuente": "Yahoo Finance"}, ipsa
        assert next(x for x in m if x["nombre"] == "S&P 500")["fuente"] == "Stooq" and len(m) == 7 and e["mercados"]["ok"]
        assert B.bitcoin(e, hoy) == {"bitcoin_usd": 71234.57, "bitcoin_fecha": "2026-10-31", "bitcoin_fuente": "Coinbase"}
        B.pedir = lambda url, estado, clave, **k: ({"bitcoin": {"usd": 70000, "last_updated_at": 1793420000}} if "coingecko" in url else None)
        assert B.bitcoin(e, hoy)["bitcoin_fuente"] == "CoinGecko"
        B.pedir = lambda url, estado, clave, **k: None
        assert B.bitcoin(e, hoy) is None and B.mercados(e, hoy) == [] and not e["mercados"]["ok"]
    finally:
        B.robots_permite, B.pedir = viejos


@prueba
def mercados_con_fuentes_oficiales_y_claves_ocultas():
    """01-11-2026: Yahoo, Stooq y CNBC prohíben por robots.txt la lectura automática. Se suman FRED (Reserva Federal de St. Louis),
    el Banco Central de Chile (cuenta gratuita) y mindicador.cl para el cobre; las claves nunca quedan escritas."""
    hoy = dt.date(2026, 11, 2)
    assert B.ocultar("https://x?user=german&pass=s3cr3t&function=GetSeries&api_key=abc") == "https://x?user=***&pass=***&function=GetSeries&api_key=***"
    class _R:
        status_code, content = 200, b"{}"

        def json(self):
            return {}

    class _S:
        def __init__(self, falla):
            self.falla = falla

        def get(self, url, **k):
            if self.falla:
                raise B.requests.ConnectionError("fallo al conectar con " + url)
            return _R()
    for falla in (False, True):   # el pedido real (bien o mal) nunca deja la clave escrita
        e = {}
        B.pedir("https://si3.bcentral.cl/x?user=german&pass=s3cr3t&f=1", e, "k", espera=(0,), sesion=_S(falla))
        assert "s3cr3t" not in json.dumps(e) and "german" not in json.dumps(e), e
    assert B.cierres_fred_api({"observations": [{"date": "2026-10-29", "value": "6800.1"}, {"date": "2026-10-30", "value": "."},
                                                {"date": "2026-10-31", "value": "6850.5"}, {"date": "2026-11-02", "value": "1"}]}, hoy) == \
        [("2026-10-29", 6800.1), ("2026-10-31", 6850.5)]
    assert B.cierres_fred_csv("observation_date,SP500\n2026-10-30,6800\n2026-10-31,\n2026-11-02,1\n", hoy) == [("2026-10-30", 6800.0)]
    bc = {"Series": {"Obs": [{"indexDateString": "30-10-2026", "value": "9010.5", "statusCode": "OK"},
                             {"indexDateString": "31-10-2026", "value": "NaN", "statusCode": "ND"},
                             {"indexDateString": "31-10-2026", "value": "9100", "statusCode": "OK"}]}}
    assert B.cierres_bcch(bc, hoy) == [("2026-10-30", 9010.5), ("2026-10-31", 9100.0)]
    cat = [{"seriesId": "V1", "spanishTitle": "IPSA, variación diaria (%)"}, {"seriesId": "A1", "spanishTitle": "Índice IPSA"},
           {"seriesId": "E1", "spanishTitle": "Evolución encuesta de operadores financieros (EOF), Factores de incidencia en Tipo de Cambio: Cobre"},
           {"seriesId": "D1", "spanishTitle": "Índice Dow Jones Industrial"}, {"seriesId": "C1", "spanishTitle": "Precio del cobre refinado BML (US$/lb)"}]
    el = B.bcch_elegir(cat)
    assert el["^IPSA"][0] == "A1" and el["^DJI"][0] == "D1" and el["HG=F"][0] == "C1" and "^IXIC" not in el, el
    assert B.cierres_mindicador({"serie": [{"fecha": "2026-11-02T03:00:00.000Z", "valor": 5.0}, {"fecha": "2026-10-31T03:00:00.000Z", "valor": 4.9},
                                           {"fecha": "2026-10-30T03:00:00.000Z", "valor": 4.8}]}, hoy) == [("2026-10-30", 4.8), ("2026-10-31", 4.9)]
    viejos = B.robots_permite, B.pedir, dict(os.environ), dict(B._BCCH)

    def pedir(url, estado, clave, **k):
        estado[clave] = {"ok": True, "url": B.ocultar(url)}
        if "function=SearchSeries" in url:
            return {"SeriesInfos": cat}
        if "function=GetSeries" in url and "A1" in url:
            return bc
        if "api.stlouisfed.org" in url and "SP500" in url:
            return {"observations": [{"date": "2026-10-29", "value": "6800"}, {"date": "2026-10-30", "value": "6868"}]}
        if "libra_cobre" in url:
            return {"serie": [{"fecha": "2026-10-30T03:00:00.000Z", "valor": 4.8}, {"fecha": "2026-10-31T03:00:00.000Z", "valor": 4.9}]}
        return None
    prohibidos = ("yahoo.com", "stooq.com", "cnbc.com")
    B.robots_permite, B.pedir = (lambda url, e: not any(p in url for p in prohibidos)), pedir
    os.environ.update({"FRED_API_KEY": "clave-fred", "BCCH_TOKEN": "tok3n-bcch"})
    B._BCCH.clear()
    try:
        e = {}
        m = {x["nombre"]: x for x in B.mercados(e, hoy)}
        assert m["IPSA"]["fuente"] == "Banco Central de Chile" and m["IPSA"]["fecha"] == "2026-10-31" and m["IPSA"]["valor"] == 9100.0, m
        assert m["S&P 500"]["fuente"].startswith("FRED") and m["S&P 500"]["variacion_pct"] == 1.0
        assert m["Cobre (Bolsa de Metales de Londres)"]["fuente"] == "Banco Central de Chile (vía mindicador.cl)"
        assert e["bcch_series"]["elegidas"]["^IPSA"][0] == "A1"
        assert "Cobre Comex" not in m   # el cobre del Banco Central se llama por su bolsa real (Londres)
        todo = json.dumps(e, ensure_ascii=False)
        assert "tok3n-bcch" not in todo and "clave-fred" not in todo, todo[:400]   # nada secreto en estado.json
        # cuenta antigua (usuario y clave) también sirve
        os.environ.pop("BCCH_TOKEN")
        os.environ.update({"BCCH_USER": "german", "BCCH_PASS": "s3cr3t"})
        B._BCCH.clear()
        e = {}
        assert {x["nombre"]: x for x in B.mercados(e, hoy)}["IPSA"]["fuente"] == "Banco Central de Chile"
        assert "s3cr3t" not in json.dumps(e) and "user=german" not in json.dumps(e)
        assert e["mercados"]["ok"] and "Banco Central de Chile" in e["mercados"]["fuentes_usadas"]
        # sin cuentas: igual llega el cobre (mindicador) y no se cae nada
        for k in ("FRED_API_KEY", "BCCH_USER", "BCCH_PASS", "BCCH_TOKEN"):
            os.environ.pop(k, None)
        B._BCCH.clear()
        m2 = {x["nombre"]: x for x in B.mercados({}, hoy)}
        assert list(m2) == ["Cobre (Bolsa de Metales de Londres)"], m2
    finally:
        B.robots_permite, B.pedir = viejos[0], viejos[1]
        os.environ.clear()
        os.environ.update(viejos[2])
        B._BCCH.clear()
        B._BCCH.update(viejos[3])


@prueba
def bing_noticias_y_redes_oficiales():
    """01-11-2026: Bing Noticias trae el enlace del medio dentro del suyo: se publica con el medio real y su enlace directo.
    Las redes sociales entran solo por su RSS público (YouTube, Bluesky, Mastodon) desde redes.json."""
    rss = ('<rss xmlns:News="https://www.bing.com/news/search?q=x&amp;format=rss"><channel><item><title>Ventas de viviendas suben 12%</title>'
           '<link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;tid=1&amp;url=https%3a%2f%2fwww.df.cl%2fnota-1&amp;c=1</link>'
           '<pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate><News:Source>Diario Financiero</News:Source></item></channel></rss>')
    n = B.leer_feed(rss, "Bing Noticias · X")
    assert n[0]["url"] == "https://www.df.cl/nota-1" and n[0]["fuente"] == "Diario Financiero", n
    F = B.todas_las_fuentes("/no/existe.json")
    assert all(len(F[s]) >= len(B.FEEDS.get(s, [])) for s in F) and any("bing.com" in u for _, u, _ in F["inmobiliario"])
    for sec, L in F.items():
        us = [u for _, u, _ in L]
        assert len(us) == len(set(us)), sec
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump({"youtube": [{"nombre": "Canal", "channel_id": "UC" + "a" * 22, "seccion": "politica/chile"}, {"channel_id": "malo"}],
                   "bluesky": [{"nombre": "Perfil", "handle": "ejemplo.bsky.social", "seccion": "deportes"}],
                   "mastodon": [{"rss": "https://mastodon.social/tags/chile.rss"}, {"rss": "javascript:alert(1)"}]}, fh)
    R = B.redes(fh.name)
    assert [u for _, u, _ in R["politica/chile"]] == ["https://www.youtube.com/feeds/videos.xml?channel_id=UC" + "a" * 22,
                                                     "https://mastodon.social/tags/chile.rss"]
    assert R["deportes"][0][1] == "https://bsky.app/profile/ejemplo.bsky.social/rss"


URLS_RECOLECTAR = {
"2026-11-06": [
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-18.48&lon=-70.31",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-23.65&lon=-70.40",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-29.90&lon=-71.25",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-33.05&lon=-71.61",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-33.45&lon=-70.67",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-36.83&lon=-73.05",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-38.74&lon=-72.59",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-41.47&lon=-72.94",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-53.16&lon=-70.92",
"https://mindicador.cl/api/dolar/2026",
"https://mindicador.cl/api/euro/2026",
"https://mindicador.cl/api/uf/2026",
"https://mindicador.cl/api/utm/2026",
"https://mindicador.cl/api",
"https://api.frankfurter.dev/v1/2026-09-24..2026-11-06?base=USD&symbols=CNY",
"https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/11/06",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EIPSA?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/HG%3DF?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=5d&interval=1d",
"https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/liv/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings",
"https://site.api.espn.com/apis/site/v2/sports/tennis/wta/rankings",
"https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
"https://site.api.espn.com/apis/v2/sports/basketball/nba/standings", "https://site.api.espn.com/apis/v2/sports/football/nfl/standings", "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings",
"https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.copa_chi/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.conmebol/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=20261104-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.copa_chi/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.conmebol/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=20261030-20261106",
"https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=20261030-20261106"
],
"2026-11-09": [
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-18.48&lon=-70.31",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-23.65&lon=-70.40",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-29.90&lon=-71.25",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-33.05&lon=-71.61",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-33.45&lon=-70.67",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-36.83&lon=-73.05",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-38.74&lon=-72.59",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-41.47&lon=-72.94",
"https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-53.16&lon=-70.92",
"https://mindicador.cl/api/dolar/2026",
"https://mindicador.cl/api/euro/2026",
"https://mindicador.cl/api/uf/2026",
"https://mindicador.cl/api/utm/2026",
"https://mindicador.cl/api",
"https://api.frankfurter.dev/v1/2026-09-24..2026-11-09?base=USD&symbols=CNY",
"https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/11/09",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EIPSA?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/HG%3DF?range=5d&interval=1d",
"https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=5d&interval=1d",
"https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/liv/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings",
"https://site.api.espn.com/apis/site/v2/sports/tennis/wta/rankings",
"https://site.api.espn.com/apis/v2/sports/racing/f1/standings",
"https://site.api.espn.com/apis/v2/sports/basketball/nba/standings", "https://site.api.espn.com/apis/v2/sports/football/nfl/standings", "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings",
"https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.copa_chi/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.conmebol/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=20261106-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/chi.copa_chi/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.conmebol/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=20261102-20261109",
"https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=20261102-20261109"
]
}


@prueba
def autores_de_cada_boletin_desde_el_senado():
    """06-11-2026: 83 fichas automáticas del 05-11 decían «Presentado por: —». El servicio público del Senado trae autores y título
    de todo boletín (de ambas cámaras)."""
    xml = ("<proyectos><proyecto><descripcion><boletin>18282-07</boletin><titulo>Modifica el Código Penal en materia de robo</titulo>"
           "<iniciativa>Moción</iniciativa></descripcion><autores><autor><PARLAMENTARIO>Pérez Olea, Joanna</PARLAMENTARIO></autor>"
           "<autor><PARLAMENTARIO>Longton Herrera, Andrés</PARLAMENTARIO></autor></autores></proyecto></proyectos>")
    f = B.leer_tramitacion(xml)
    assert f["autores"] == ["Pérez Olea, Joanna", "Longton Herrera, Andrés"] and f["titulo"].startswith("Modifica el Código Penal"), f
    assert B.leer_tramitacion("<x><iniciativa>Mensaje</iniciativa><titulo>Presupuesto</titulo></x>")["autores"] == ["Mensaje presidencial"]
    assert B.leer_tramitacion("") is None and B.leer_tramitacion("<html>error</html>") is None
    viejos = B.pedir, B.robots_permite, B.time.sleep, B.MEMORIA_DIR
    pedidas = []
    xml2 = xml.replace("</iniciativa>", "</iniciativa><fecha_ingreso>04/11/2026</fecha_ingreso><etapa>Primer trámite constitucional (Cámara)</etapa>"
                       "<estado>En tramitación </estado><link_mensaje_mocion>http://www.senado.cl/x?iddocto=1</link_mensaje_mocion>")
    B.pedir = lambda url, est, cl, **k: pedidas.append(url) or xml2
    B.robots_permite = lambda url, est: True
    B.time.sleep = lambda s: None
    import tempfile
    B.MEMORIA_DIR = tempfile.mkdtemp()   # sin copias de la memoria: la prueba no depende de lo que haya en el repositorio
    try:
        # 14-11-2026: también «boletines 18590-07 y 18591-07» (plural, varios en una frase) y en minúsculas
        cam = {"camara_mes": [{"descripcion": "Boletín N° 18282-07 Proyecto de ley"}, {"descripcion": "Boletín N°18282-07 otra"},
                              {"descripcion": "Boletín N° 17000-05"}, {"descripcion": "sin boletín"},
                              {"descripcion": "Cierre del debate de los boletines 18590-07 y 18591-07"}]}
        e = {}
        out = B.autores_boletines(e, cam, {"17000": {"autores": ["Ya leído"]}})
        assert pedidas == ["https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18282",
                           "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18590",
                           "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18591"], pedidas   # Senado primero (ficha completa); el ya leído no se repite
        assert out["17000"]["autores"] == ["Ya leído"] and out["18282"]["autores"][0] == "Pérez Olea, Joanna" and e["autores_boletines"]["nuevos"] == 3
        assert out["18282"]["etapa"].startswith("Primer trámite") and out["18282"]["estado"] == "En tramitación" and out["18282"]["url_mocion"].startswith("http")
    finally:
        B.pedir, B.robots_permite, B.time.sleep, B.MEMORIA_DIR = viejos


@prueba
def oleaje_conflictos_efemeride_y_autores_camara():
    """08-11-2026 (informes del 04 al 08-11): sin oleaje para 4 puertos con aviso, efeméride naval sin leer, conflictos con 1 indicador,
    autores sin servicio del Senado. Datos de PRUEBA."""
    import tempfile
    viejos = B.pedir, B.robots_permite, B.time.sleep
    B.robots_permite = lambda u, e: True
    B.time.sleep = lambda x: None
    try:
        # NOAA WaveWatch III por ERDDAP (Open-Meteo marino no se lee: su robots.txt lo prohíbe). La celda más cercana a la costa
        # puede ser tierra (null): se usa la de mar más al este.
        tabla = {"table": {"columnNames": ["time", "depth", "latitude", "longitude", "Thgt", "Tper", "Tdir"], "rows": [
            ["2026-11-08T15:00:00Z", 0.0, -33.5, 280.5, 2.4, 11.2, 225], ["2026-11-08T15:00:00Z", 0.0, -33.5, 281.0, None, None, None],
            ["2026-11-09T15:00:00Z", 0.0, -33.5, 280.0, 2.0, 10.0, 200], ["2026-11-09T15:00:00Z", 0.0, -33.5, 280.5, 3.1, 12.0, 230],
            ["2026-11-09T21:00:00Z", 0.0, -33.5, 280.5, 2.7, 11.0, 228]]}}
        B.pedir = lambda url, est, cl, **k: tabla if "erddap" in url else None
        ol = B.oleaje_costa({})
        assert len(ol["puertos"]) == 30 and ol["puertos"]["juan-fernandez"][1] == {"fecha": "2026-11-09", "ola_max_m": 3.1, "periodo_s": 12.0, "direccion_grados": 230}, ol["puertos"]["juan-fernandez"]
        assert "NOAA" in ol["fuente"]
        B.pedir = lambda url, est, cl, **k: None
        est = {}
        assert B.oleaje_costa(est) is None and est["oleaje"]["ok"] is False   # sin servidor: no se insiste con los 30 puertos
        # el modelo marino está prohibido por robots.txt: el oleaje sale de las páginas de tablademareas del espejo (texto real del 08-11)
        txt = (" PREDICCIÓN DEL OLEAJE VALPARAÍSO \n 07 NOV \n Sábado Previsión del oleaje \n OLEAJE MÁXIMO | 1,7 m \n"
               " 08 NOV \n Domingo Previsión del oleaje en Valparaíso \n OLEAJE MÁXIMO | 2,1 m \n | \n OLEAJE MÍNIMO | 1,9 m \n | \n 0 h\n SW\n 2,1 m \n"
               " 1 h\n SW\n 2,1 m \n 2 h\n WNW\n 2,0 m \n + INFO \n 09 NOV \n Lunes Previsión \n OLEAJE MÁXIMO | 2,0 m \n 0 h\n W\n 1,9 m \n")
        assert B.oleaje_de_texto(txt, dt.date(2026, 11, 8)) == [{"fecha": "2026-11-08", "ola_max_m": 2.1, "direccion": "SW", "direccion_grados": 225},
                                                               {"fecha": "2026-11-09", "ola_max_m": 2.0, "direccion": "W", "direccion_grados": 270}]
        assert B.oleaje_de_texto(" 02 ENE \n Viernes \n OLEAJE MÁXIMO | 1,5 m \n", dt.date(2026, 12, 30))[0]["fecha"] == "2027-01-02"   # cambio de año
        import gzip
        with tempfile.TemporaryDirectory() as dd:
            os.makedirs(os.path.join(dd, "paginas"))
            with gzip.open(os.path.join(dd, "paginas", "oleaje-valparaiso.txt.gz"), "wt", encoding="utf-8") as fz:
                fz.write(txt)
            est = {}
            o = B.oleaje_desde_espejo(est, dd, dt.date(2026, 11, 8))
            assert list(o["puertos"]) == ["valparaiso"] and est["oleaje"]["ok"] and "tablademareas" in o["fuente"]
        xml = ("<ProyectoLey><Nombre>Modifica la ley de tránsito para sancionar la conducción temeraria</Nombre><TipoIniciativa>Moción</TipoIniciativa>"
               "<Autores><ParlamentarioAutor><Diputado><Nombre>Joanna</Nombre><ApellidoPaterno>Pérez</ApellidoPaterno><ApellidoMaterno>Olea</ApellidoMaterno>"
               "</Diputado></ParlamentarioAutor></Autores></ProyectoLey>")
        f = B.leer_proyecto_camara(xml)
        assert f["autores"] == ["Joanna Pérez Olea"] and f["titulo"].startswith("Modifica la ley"), f
        assert B.leer_proyecto_camara("<x><TipoIniciativa>Mensaje</TipoIniciativa><Nombre>Ley de presupuestos del sector público 2027</Nombre></x>")["autores"] == ["Mensaje presidencial"]

        def pedir(url, est, cl, **k):
            if "unhcr" in url:
                return {"items": [{"year": 2024, "refugees": 6000000, "idps": 3700000}, {"year": 2025, "refugees": "5900000", "idps": "-"}]}
            if "stlouisfed" in url:
                return {"observations": [{"date": "2026-09-01", "value": "231.5"}, {"date": "2026-10-01", "value": "."}]}
            if "techforpalestine" in url:
                return {"gaza": {"killed": {"total": 68000}, "injured": {"total": 170000}, "last_update": "2026-11-07"}}
            return None
        B.pedir = pedir
        os.environ["FRED_API_KEY"] = "x"
        b2 = B.pedir   # ACNUR por país de asilo: se suma el año (antes salía UNA fila: «4.959 refugiados» de Ucrania)
        B.pedir = lambda url, est, cl, **k: {"items": [{"year": 2025, "refugees": 4959}, {"year": 2025, "refugees": 1000000}, {"year": 2024, "refugees": 7}]} if "unhcr" in url else b2(url, est, cl, **k)
        assert B._unhcr({}, "UKR")[0]["valor"] == 1004959
        B.pedir = b2
        ind = B.indicadores_conflictos({})
        assert [i["valor"] for i in ind["rusia-ucrania"]] == [5900000, 231.5] and ind["rusia-ucrania"][0]["fecha"] == "2025-12-31"
        assert len(ind["israel-gaza"]) == 2 and ind["israel-gaza"][0]["fecha"] == "2026-11-07" and ind["iran-regional"][0]["valor"] == 231.5
        assert all(i["fuente"] and i["url"].startswith("https://") for v in ind.values() for i in v)
        idx = '<a href="/tradicion-e-historia/efemerides-navales/noviembre/8-de-noviembre-de-1879">8 de noviembre de 1879: <b>Combate</b></a>'
        pagina = "<html><body>" + "<p>Texto de la efeméride naval con detalle suficiente para publicar.</p>" * 6 + "</body></html>"
        B.pedir = lambda url, est, cl, **k: idx if url.endswith("/noviembre") else (pagina if "8-de-noviembre" in url else None)
        with tempfile.TemporaryDirectory() as d:
            ef = B.efemeride_naval({}, dt.date(2026, 11, 8), d)
            assert ef["listas"][0]["url"].endswith("/noviembre/8-de-noviembre-de-1979"), ef   # índice de direcciones conocidas
            assert ef["listas"][0]["titulo"] == "8 de noviembre de 1979" and os.path.exists(os.path.join(d, "paginas", "armada-efemeride-1.txt.gz"))
            idx_v = B.json.load   # día sin dirección conocida: se lee el índice del mes
            B.json.load = lambda f, **k: {"urls": {}}
            try:
                B.pedir = lambda url, est, cl, **k: idx if url.endswith("/noviembre") else (pagina if "8-de-noviembre-de-1879" in url else None)
                ef2 = B.efemeride_naval({}, dt.date(2026, 11, 8), d)
            finally:
                B.json.load = idx_v
            assert ef2["listas"][0]["titulo"] == "8 de noviembre de 1879: Combate", ef2
    finally:
        B.pedir, B.robots_permite, B.time.sleep = viejos
        os.environ.pop("FRED_API_KEY", None)


@prueba
def pulso_del_dia():
    """06-11-2026: franja «En vivo» de www.cofrad.es cada 2 horas: solo titulares en español, de las últimas horas, sin repetir y
    con máximo 2 por medio; sismos con referencia legible; sin red no se cae."""
    import pulso as P
    ahora = B.ahora().strftime("%Y-%m-%d %H:%M")
    viejo = (B.ahora() - dt.timedelta(hours=30)).strftime("%Y-%m-%d %H:%M")
    notas = [{"fuente": "La Tercera (RSS)", "titulo": f"La nota {i} del día", "fecha": ahora, "url": f"https://latercera.com/{i}"} for i in range(4)]
    notas += [{"fuente": "BBC (RSS, inglés)", "titulo": "La nota en inglés", "fecha": ahora, "url": "https://bbc.co.uk/x"},
              {"fuente": "ESPN (RSS)", "titulo": "Lampard looks for progress as belief grows", "fecha": ahora, "url": "https://espn.com/x"},
              {"fuente": "Europa Press (RSS)", "titulo": "IrÃ¡n afirma que dos petroleros se incendiaron", "fecha": ahora, "url": "https://europapress.es/x"},
              {"fuente": "Emol (RSS)", "titulo": "La nota 0 del día", "fecha": ahora, "url": "https://emol.com/0"},
              {"fuente": "Emol (RSS)", "titulo": "La nota vieja del día", "fecha": viejo, "url": "https://emol.com/v"}]
    tit = B.titulares
    B.titulares = lambda estado, **k: {"secciones": {"politica/chile": {"notas": notas}}}   # 14-11: pulso.py pasa feeds= (radar=False)
    try:
        t = P.titulares({})
    finally:
        B.titulares = tit
    n = t[0]["notas"]
    assert t[0]["seccion"] == "Chile" and [x["titulo"] for x in n][:2] == ["La nota 0 del día", "La nota 1 del día"], n   # 2 por medio
    assert "Irán afirma que dos petroleros se incendiaron" in [x["titulo"] for x in n]   # codificación doble reparada
    assert not any("inglés" in x["titulo"] or "Lampard" in x["titulo"] or "vieja" in x["titulo"] for x in n)   # inglés y viejas fuera
    assert P.referencia(-20.364, -70.623) == "52 km al O de Iquique" and P.referencia(-33.45, -70.67) == "cerca de Santiago"
    dormir, get = B.time.sleep, B.requests.Session.get
    B.time.sleep = lambda x: None

    def falla(self, url, **k):
        raise B.requests.ConnectionError("sin red")
    B.requests.Session.get = falla
    try:
        p = P.armar({})
        assert p["generado"] and p["indicadores"] == [] and not p.get("ipsa") and p["proxima"]
    finally:
        B.time.sleep, B.requests.Session.get = dormir, get


@prueba
def espejo_respeta_el_429():
    """06-11-2026: IQAir respondió 429 a 9 lecturas seguidas y la corrida se alargó más de 20 minutos (tope: 30). Al primer 429
    de un sitio lento, no se le pide nada más en esa corrida."""
    import tempfile
    viejos = B.pedir, B.robots_permite, B.LENTOS_PAUSA, B.ESPEJO, B.efemeride_naval, B.paginas_oleaje, B.time.sleep
    B.efemeride_naval = lambda *a, **k: None
    B.time.sleep = lambda x: None
    B.paginas_oleaje = lambda: [(f"oleaje-p{i}", f"https://tablademareas.com/cl/x/p{i}/prevision/oleaje", "oleaje") for i in range(3)]
    pedidas = []

    def pedir(url, est, cl, **k):
        pedidas.append(url)
        est[cl] = {"ok": False, "error": "HTTP 429"}
        return None
    B.pedir, B.robots_permite, B.LENTOS_PAUSA = pedir, (lambda u, e: True), 0
    B.ESPEJO = [("iqair-a", "https://www.iqair.com/chile/a", "a"), ("iqair-b", "https://www.iqair.com/chile/b", "b"),
                ("iqair-c", "https://www.iqair.com/chile/c", "c")]
    try:
        with tempfile.TemporaryDirectory() as d:
            pag = B.espejo({}, d, [])
        assert pedidas == ["https://www.iqair.com/chile/a", "https://tablademareas.com/cl/x/p0/prevision/oleaje"], pedidas   # un 429 por sitio
        assert len(pag["fallidas"]) == 6 and "429" in pag["fallidas"][2]["error"] and "tablademareas" in pag["fallidas"][5]["error"]
    finally:
        B.pedir, B.robots_permite, B.LENTOS_PAUSA, B.ESPEJO, B.efemeride_naval, B.paginas_oleaje, B.time.sleep = viejos


@prueba
def espejo_de_lecturas_para_la_tarea():
    """05-11-2026 (Germán: «LOOP… e itera con varias páginas alternativas»): en la tarea web_fetch rechaza las direcciones fijas
    (PROVENANCE_REQUIRED). GitHub las lee (respetando robots.txt) y las deja: fixtures/ con el nombre exacto que usa
    `recolectar.py --fixtures` y paginas/ con el texto de cada página fija o pedida por la tarea el día anterior."""
    import gzip
    import tempfile
    for f, L in URLS_RECOLECTAR.items():   # letra por letra: recolectar.py busca el archivo por el hash de la dirección
        assert B.urls_recolectar(dt.date.fromisoformat(f)) == L, f
    assert B.nombre_fixture("https://mindicador.cl/api") == __import__("hashlib").sha256(b"https://mindicador.cl/api").hexdigest()[:16] + ".json"
    t = B.html_a_texto('<html><head><title>x</title></head><body><script>var a=1</script><table><tr><td>LA 271</td><td>Puerto Montt</td>'
                       '<td>19:10</td></tr></table><p>Aviso <a href="https://x.cl/a.pdf">Marejadas N° 33</a></p></body></html>')
    assert "LA 271 | Puerto Montt | 19:10 |" in t and "Marejadas N° 33 [https://x.cl/a.pdf]" in t and "var a" not in t, t
    vistos = []
    viejos = B.pedir, B.robots_permite

    def pedir(url, estado, clave, **k):
        vistos.append(url)
        estado[clave] = {"ok": True}
        if "meteoarmada" in url:
            return "<html><body>" + "<p>Aviso especial de marejadas N° 33 vigente desde el 05-11-2026</p>" * 10 + "</body></html>"
        if "nba/news" in url or "mindicador" in url or "espn" in url:
            return json.dumps({"articles": [{"headline": "Lakers ganan"}] * 20})
        return None
    B.pedir = pedir
    B.robots_permite = lambda url, estado: "iqair" not in url
    dormir = B.time.sleep
    B.time.sleep = lambda x: None
    try:
        with tempfile.TemporaryDirectory() as d:
            e = {}
            idx = B.fixtures(e, dt.date(2026, 11, 6), d)
            assert idx["listas"] and all(os.path.exists(os.path.join(d, "fixtures", x["archivo"] + ".gz")) for x in idx["listas"])
            assert any(x["url"].startswith("https://api.met.no") for x in idx["fallidas"])   # sin respuesta JSON: queda anotada
            e = {}
            pag = B.espejo(e, d, [{"url": "https://tramitacion.senado.cl/wspublico/votaciones.php?boletin=18259", "que": "Senado"}, "no es url"])
            arch = {x["url"]: x["archivo"] for x in pag["listas"]}
            assert arch["https://meteoarmada.directemar.cl/"] == "armada-avisos.txt"
            txt = gzip.open(os.path.join(d, "paginas", "armada-avisos.txt.gz"), "rt", encoding="utf-8").read()
            assert "Aviso especial de marejadas N° 33" in txt
            assert arch["https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news"].endswith(".json")
            mal = {x["url"]: x["error"] for x in pag["fallidas"]}
            assert mal["https://www.iqair.com/chile/santiago-metropolitan/santiago"] == "robots.txt no lo permite"
            assert "https://tramitacion.senado.cl/wspublico/votaciones.php?boletin=18259" in vistos   # lo que la tarea pidió ayer
            assert "https://tablademareas.com/cl/valparaiso/bahia-cumberland/prevision/oleaje" in vistos   # 08-11-2026: oleaje de los 30 puertos
            assert len([u for u in vistos if "/prevision/oleaje" in u]) == 30
            assert e["espejo"]["n"] == len(pag["listas"]) and pag["fecha"]
            json.dump(pag, open(os.path.join(d, "paginas.json"), "w"))
            hoy = dt.date.fromisoformat(pag["fecha"])
            os.environ.pop("GITHUB_EVENT_NAME", None)
            assert not B.toca_espejo(d, hoy, hora=12) and B.toca_espejo(d, hoy, hora=6)   # ya hecho hoy: solo se refresca de 05 a 08
            assert B.toca_espejo(d, hoy + dt.timedelta(days=1), hora=12)                 # primera corrida del día siguiente
            B._gz(os.path.join(d, "a.gz"), "igual")
            B._gz(os.path.join(d, "b.gz"), "igual")
            assert open(os.path.join(d, "a.gz"), "rb").read() == open(os.path.join(d, "b.gz"), "rb").read()   # git no repite copias
    finally:
        B.pedir, B.robots_permite = viejos
        B.time.sleep = dormir


@prueba
def tasas_mensuales_oficiales_y_tpm_esperada():
    """03-11-2026 (Germán: «Créditos hipotecarios: septiembre 2026 · ¿noviembre?»): la hipotecaria y el consumo son promedios
    MENSUALES del Banco Central; se leen solos cada día con la cuenta gratuita, junto con la TPM esperada de la Encuesta de Expectativas."""
    hoy = dt.date(2026, 11, 3)

    def serie(*pares):
        return {"Series": {"Obs": [{"indexDateString": f, "value": v, "statusCode": "OK"} for f, v in pares]}}
    resp = {"F022.VIV.TIP.MA03.UF.Z.M": serie(("01-08-2026", "4.04"), ("01-09-2026", "4.07")),
            "F022.CON.TIP.Z.NO.Z.M": serie(("01-09-2026", "25.86")),
            "F089.TPM.TAS.11.M": serie(("01-10-2026", "4.5")), "F089.TPM.TAS.26.M": serie(("01-10-2026", "4.25")),
            "F089.TPM.TAS.14.M": serie(("01-10-2026", "4")), "F089.TPM.TAS.15.M": serie(("01-09-2026", "4"))}
    viejos, env = B.pedir, dict(os.environ)

    def pedir(url, estado, clave, **k):
        estado[clave] = {"ok": True, "url": B.ocultar(url)}
        return next((v for sid, v in resp.items() if sid in url), None)
    B.pedir = pedir
    try:
        os.environ.pop("BCCH_TOKEN", None); os.environ.pop("BCCH_USER", None); os.environ.pop("BCCH_PASS", None)
        assert B.tasas_bcch({}, hoy) is None   # sin cuenta del Banco Central: nada
        os.environ["BCCH_TOKEN"] = "clave-bcch"
        e = {}
        t = B.tasas_bcch(e, hoy)
        assert t["series"]["hipotecaria"]["datos"] == [["2026-08", 4.04], ["2026-09", 4.07]] and t["series"]["consumo"]["datos"][-1] == ["2026-09", 25.86]
        assert t["tpm_esperada"]["encuesta"] == "2026-10" and t["tpm_esperada"]["trayectoria"] == [["2026-10", 4.5], ["2027-03", 4.25], ["2027-09", 4.0]]
        assert "clave-bcch" not in json.dumps(e)   # la encuesta a 23 meses era de septiembre: no se mezcla con la de octubre
    finally:
        B.pedir = viejos
        os.environ.clear()
        os.environ.update(env)


@prueba
def aire_medido_de_las_9_ciudades_con_waqi():
    """03-11-2026 (Germán marcó «Aire: sin medición publicada» en Arica, Antofagasta y La Serena): estaciones del SINCA vía aqicn.org
    con la clave gratuita (WAQI_TOKEN). Sin clave no se pide nada; estación a más de 25 km o medición vieja: no se usa; la clave nunca queda escrita."""
    hoy = B.ahora().date().isoformat()
    ok = {"status": "ok", "data": {"aqi": 57, "time": {"s": hoy + " 05:00:00"},
                                   "city": {"name": "Antofagasta, Chile", "geo": [-23.63, -70.39], "url": "https://aqicn.org/city/chile/antofagasta"}}}
    x = B.waqi_ciudad(ok, "antofagasta", -23.65, -70.40)
    assert x == {"nombre": "Antofagasta", "aqi_us": 57, "categoria": "Moderada", "pm25": None, "hora": "05:00", "medido": hoy + " 05:00",
                 "estacion": "Antofagasta, Chile", "url": "https://aqicn.org/city/chile/antofagasta"}, x   # 14-11: «medido» = fecha y hora de la medición
    lejos = {"status": "ok", "data": dict(ok["data"], city={"name": "Calama", "geo": [-22.46, -68.93]})}
    assert B.waqi_ciudad(lejos, "antofagasta", -23.65, -70.40) is None                          # 180 km: no es Antofagasta
    assert B.waqi_ciudad({"status": "ok", "data": dict(ok["data"], time={"s": "2026-01-01 05:00:00"})}, "antofagasta", -23.65, -70.40) is None
    assert B.waqi_ciudad({"status": "error", "data": "Invalid key"}, "antofagasta", -23.65, -70.40) is None
    assert len(B.AIRE_CIUDADES) == 9
    viejos, env = B.pedir, dict(os.environ)
    vistos = []

    def pedir(url, estado, clave, **k):
        vistos.append(url)
        estado[clave] = {"ok": True, "url": B.ocultar(url)}
        return ok if "-23.65" in url else {"status": "ok", "data": {"aqi": "-"}}
    B.pedir = pedir
    try:
        os.environ.pop("WAQI_TOKEN", None)
        e = {}
        assert B.aire_waqi(e) is None and not vistos and "WAQI_TOKEN" in e["aire_waqi"]["error"]
        os.environ["WAQI_TOKEN"] = "clave-waqi"
        e = {}
        a = B.aire_waqi(e)
        assert sum("/feed/geo:" in u for u in vistos) == 9 and [c["nombre"] for c in a["ciudades"]] == ["Antofagasta"] and "SINCA" in a["fuente"]
        assert sum("/search/?keyword=" in u for u in vistos) == 8   # las que no sirvieron se buscan por nombre
        assert "clave-waqi" not in json.dumps(e) and "Arica" in e["aire_waqi"]["error"]
        assert "aqi='-'" in e["aire_waqi_arica"]["motivo"], e["aire_waqi_arica"]
        vistos.clear()   # pegada con la dirección completa: se usa solo la clave
        os.environ["WAQI_TOKEN"] = "https://api.waqi.info/feed/here/?token=clave-waqi"
        B.aire_waqi({})
        assert all(u.endswith("token=clave-waqi") for u in vistos), vistos[0]
        assert B.waqi_motivo({"status": "error", "data": "Invalid key"}, 0, 0) == "estado error: Invalid key"
    finally:
        B.pedir = viejos
        os.environ.clear()
        os.environ.update(env)


@prueba
def vuelos_regionales_de_tarde_desde_el_tablero_de_santiago():
    """03-11-2026 (Germán: mejorar los vuelos). Los regionales se leen de 06:00 a 17:59 (cupo gratis); la tarde y la noche salen del
    tablero de Santiago leído con su tramo (withLeg=true), sin gastar cupo. Solo vuelos de hoy, sin repetir los ya leídos."""
    hoy = dt.date(2026, 11, 3)
    j = {"departures": [{"number": "LA 271", "status": "Expected", "airline": {"name": "LATAM"},
                         "departure": {"airport": {"iata": "SCL"}, "scheduledTime": {"local": "2026-11-03 19:10-03:00"}},
                         "arrival": {"airport": {"iata": "PMC", "municipalityName": "Puerto Montt"}, "scheduledTime": {"local": "2026-11-03 20:55-03:00"}}},
                        {"number": "LA 255", "airline": {"name": "LATAM"},   # llega a PMC a las 09:40: ya está en el tablero de PMC
                         "departure": {"airport": {"iata": "SCL"}, "scheduledTime": {"local": "2026-11-03 08:00-03:00"}},
                         "arrival": {"airport": {"iata": "PMC"}, "scheduledTime": {"local": "2026-11-03 09:40-03:00"}}},
                        {"number": "LA 299", "airline": {"name": "LATAM"},   # llega mañana: no es de hoy
                         "departure": {"airport": {"iata": "SCL"}, "scheduledTime": {"local": "2026-11-03 23:30-03:00"}},
                         "arrival": {"airport": {"iata": "PMC"}, "scheduledTime": {"local": "2026-11-04 01:15-03:00"}}}],
         "arrivals": [{"number": "H2 22", "status": "Expected", "airline": {"name": "SKY"},
                       "departure": {"airport": {"iata": "PMC"}, "scheduledTime": {"local": "2026-11-03 21:30-03:00"}},
                       "arrival": {"airport": {"iata": "SCL"}, "scheduledTime": {"local": "2026-11-03 23:20-03:00"}}}]}
    # con tramo, la fila de Santiago lleva la hora de Santiago y el aeropuerto del otro extremo
    f = B.adb_filas(j, "departures")[0]
    assert (f["iata"], f["lugar"], f["hora_programada"]) == ("PMC", "Puerto Montt", "19:10"), f
    assert B.adb_filas(j, "arrivals")[0]["hora_programada"] == "23:20"
    x = B.adb_desde_santiago(j, "PMC", hoy)
    assert [(r["vuelo"], r["hora_programada"], r["iata"]) for r in x["llegadas"]] == [("LA271", "20:55", "SCL")], x
    assert [(r["vuelo"], r["hora_programada"]) for r in x["salidas"]] == [("H222", "21:30")], x
    assert B.adb_desde_santiago(j, "CCP", hoy) == {"salidas": [], "llegadas": []}
    assert B.adb_desde_santiago({"departures": [{"number": "LA 1", "movement": {"airport": {"iata": "PMC"}}}]}, "PMC", hoy) == {"salidas": [], "llegadas": []}
    viejos = B.pedir, dict(os.environ)
    vistos = []

    def pedir(url, estado, clave, cabeceras=None, **k):
        vistos.append(url)
        estado[clave] = {"ok": True, "url": url}
        return j if "/SCL/" in url else {"departures": [], "arrivals": []}
    B.pedir = pedir
    try:
        os.environ["AERODATABOX_KEY"] = "clave-adb"
        v, uso = B.vuelos_hoy({}, hoy)
        assert uso["llamadas"] == 6 and all(("withLeg=true" in u) == ("/SCL/" in u) for u in vistos), vistos
        p = v["aeropuertos"]["PMC"]
        assert [r["vuelo"] for r in p["llegadas"]] == ["LA271"] and [r["vuelo"] for r in p["salidas"]] == ["H222"], p   # sin repetir (2 ventanas de SCL)
        assert "Santiago" in p["ventana"]
    finally:
        B.pedir = viejos[0]
        os.environ.clear()
        os.environ.update(viejos[1])


@prueba
def vuelos_de_hoy_con_aerodatabox_y_cupo():
    """01-11-2026: Flightradar24 rechaza la lectura automática. AeroDataBox (cuenta gratuita, secreto AERODATABOX_KEY) entrega el día
    completo de los 5 aeropuertos: una lectura al día y con tope mensual, para no pasarse del cupo gratis. La clave va en la cabecera."""
    hoy = dt.date(2026, 11, 1)
    j = {"departures": [{"number": "LA 330", "status": "Departed", "airline": {"name": "LATAM"},
                         "movement": {"airport": {"iata": "LIM", "name": "Lima"}, "scheduledTime": {"local": "2026-11-01 07:30-03:00"},
                                      "revisedTime": {"local": "2026-11-01 07:42-03:00"}}},
                        {"number": "LA 9999", "isCargo": True, "movement": {"airport": {"iata": "MIA"}, "scheduledTime": {"local": "2026-11-01 08:00-03:00"}}}],
         "arrivals": [{"number": "H2 21", "status": "Expected", "airline": {"name": "SKY"},
                       "movement": {"airport": {"iata": "PMC", "municipalityName": "Puerto Montt", "name": "El Tepual"},
                                    "scheduledTime": {"local": "2026-11-01 13:05-03:00"}}}]}
    assert B.adb_filas(j, "departures") == [{"vuelo": "LA330", "aerolinea": "LATAM", "iata": "LIM", "lugar": "Lima", "fecha": "2026-11-01",
                                             "hora_programada": "07:30", "hora_estimada": "07:42", "estado": "Departed"}]
    assert B.adb_filas(j, "arrivals")[0]["lugar"] == "Puerto Montt" and B.adb_filas({}, "arrivals") == []
    viejos = B.robots_permite, B.pedir, dict(os.environ)
    vistos = []

    def pedir(url, estado, clave, cabeceras=None, **k):
        vistos.append((url, cabeceras))
        estado[clave] = {"ok": True, "url": url}
        return j
    B.robots_permite, B.pedir = (lambda url, e: False), pedir   # API con contrato y clave: su robots.txt (para robots de páginas) no aplica
    try:
        os.environ.pop("AERODATABOX_KEY", None)
        e = {}
        assert B.vuelos_hoy(e, hoy)[0] is None and "AERODATABOX_KEY" in e["vuelos_hoy"]["error"] and not vistos   # sin cuenta: nada
        os.environ["AERODATABOX_KEY"] = "clave-adb"
        e = {}
        v, uso = B.vuelos_hoy(e, hoy)
        assert len(vistos) == 6 and uso == {"mes": "2026-11", "unidades": 12, "llamadas": 6}, uso   # plan Basic: 400 unidades/mes → 6 consultas/día
        assert 31 * uso["unidades"] <= 400   # un mes completo cabe en el plan gratuito
        assert all(c["X-RapidAPI-Key"] == "clave-adb" and "clave-adb" not in u for u, c in vistos)    # la clave nunca en la dirección
        assert "/iata/SCL/2026-11-01T00:00/2026-11-01T11:59" in vistos[0][0] and v["aeropuertos"]["SCL"]["salidas"][0]["vuelo"] == "LA330"
        assert "clave-adb" not in json.dumps(e)
        vistos.clear()   # misma fecha: no se vuelve a gastar cupo
        assert B.vuelos_hoy({}, hoy, previo=v, uso=uso)[0] is v and not vistos
        vistos.clear()   # cupo casi agotado: Santiago primero y el resto se anota como pendiente
        e = {}
        v2, uso2 = B.vuelos_hoy(e, hoy, uso={"mes": "2026-11", "unidades": 386, "llamadas": 193})
        assert len(vistos) == 2 and set(v2["aeropuertos"]) == {"SCL"} and "cupo del mes" in e["vuelos_hoy"]["error"], (len(vistos), e)
        vistos.clear()   # mes nuevo: el contador parte de cero
        assert B.vuelos_hoy({}, dt.date(2026, 12, 1), uso={"mes": "2026-11", "unidades": 390})[1]["unidades"] == 12
    finally:
        B.robots_permite, B.pedir = viejos[0], viejos[1]
        os.environ.clear()
        os.environ.update(viejos[2])


@prueba
def mercados_no_se_pierden_si_una_fuente_cae():
    hoy = dt.date(2026, 11, 1)
    previo = {"mercados": [{"nombre": "S&P 500", "valor": 7743.98, "fecha": "2026-10-28", "fuente": "FRED"},
                           {"nombre": "Viejo", "valor": 1, "fecha": "2026-10-01", "fuente": "X"},
                           {"nombre": "Cobre (Bolsa de Metales de Londres)", "valor": 6.0, "fecha": "2026-10-29", "fuente": "BC"}]}
    nuevos = [{"nombre": "Cobre (Bolsa de Metales de Londres)", "valor": 6.66, "fecha": "2026-10-30", "fuente": "BC"}]
    r = B.con_anteriores(nuevos, previo, hoy)
    assert [x["nombre"] for x in r] == ["Cobre (Bolsa de Metales de Londres)", "S&P 500"] and r[0]["valor"] == 6.66 and r[1]["conservado"]
    assert B.con_anteriores([], None, hoy) == []

@prueba
def robots_segun_el_estandar_rfc_9309():
    """01-11-2026: precedencia del estándar (la regla más larga manda; empate, Allow), comodines «*» y «$», grupo propio y 4xx."""
    g = "User-agent: *\nDisallow: /\nAllow: /rss/*\nAllow: /$\nDisallow: /rss/foo$\n\nUser-agent: OtroBot\nAllow: /\n"
    r = B.Robots(g)
    assert r.permite("https://news.google.com/rss/search?q=chile&hl=es-419") and r.permite("https://news.google.com/")
    assert not r.permite("https://news.google.com/topics/x") and not r.permite("https://news.google.com/rss/foo")
    assert r.permite("https://news.google.com/rss/foo2") and r.permite("https://x.cl/robots.txt")
    p = B.Robots("User-agent: cofradenews\nDisallow: /privado\nUser-agent: *\nDisallow: /\n")
    assert p.permite("https://a.cl/noticias") and not p.permite("https://a.cl/privado/1")   # el grupo propio manda sobre «*»
    assert B.Robots("User-agent: *\nAllow: /a\nDisallow: /a\n").permite("https://x.cl/a")   # empate: gana Allow
    assert not B.Robots("User-agent: *\nDisallow: /*.json$\n").permite("https://x.cl/api/datos.json")
    assert B.Robots("User-agent: *\nDisallow:\n").permite("https://x.cl/todo") and B.Robots(todo=True).permite("https://x")
    hoy = dt.date(2026, 10, 31)
    j = {"FormattedQuoteResult": {"FormattedQuote": [{"last": "9,090.00", "change_pct": "+1.00%", "last_time": "2026-10-30T16:00:00.000-0300"}]}}
    c = B.cierre_cnbc(j, hoy)
    assert c[-1] == ("2026-10-30", 9090.0) and abs(c[0][1] - 9000.0) < 0.01
    j["FormattedQuoteResult"]["FormattedQuote"][0]["last_time"] = "2026-10-31T10:00:00.000-0300"
    assert B.cierre_cnbc(j, hoy) == [] and B.cierre_cnbc({}, hoy) == []   # el valor de hoy (bolsa abierta) no es cierre


@prueba
def clima_open_meteo_y_medio_que_no_es_imagen():
    """01-11-2026: pronóstico por hora de Open-Meteo (tercera fuente del clima) y <source> con una imagen no es el medio."""
    hoy = dt.date(2026, 11, 1)
    una = {"hourly": {"time": ["2026-11-01T00:00", "2026-11-01T01:00"], "temperature_2m": [21.3, None],
                      "relative_humidity_2m": [72, 70], "wind_speed_10m": [3.1, 2.0], "wind_direction_10m": [200, 210],
                      "weather_code": [0, 61]}}
    c = B.clima_json([una] * len(B.CIUDADES), hoy)
    assert c["fecha"] == "2026-11-01" and set(c["ciudades"]) == {n for n, _, _ in B.CIUDADES}
    f = c["ciudades"]["arica"]
    assert len(f) == 1 and f[0] == {"time": "2026-11-01T00:00:00Z", "temp": 21.3, "hr": 72, "viento": 3.1, "dir": 200, "simbolo": "clearsky"}
    assert B.clima_json([{}], hoy) is None and B.clima_json({}, hoy) is None
    rss = ('<rss><channel><item><title>Planets in November</title><link>https://www.space.com/x</link>'
           '<source>https://cdn.mos.cms.futurecdn.net/abc-320-70.jpg</source></item></channel></rss>')
    n = B.leer_feed(rss, "Space.com (RSS)")
    assert n and n[0]["fuente"] == "Space.com (RSS)", n
    n = B.leer_feed(rss.replace("https://cdn.mos.cms.futurecdn.net/abc-320-70.jpg", "0?ds=true&amp;seed=1793488595"), "SpaceNews (RSS)")
    assert n[0]["fuente"] == "SpaceNews (RSS)", n
    gn = (rss.replace("https://cdn.mos.cms.futurecdn.net/abc-320-70.jpg", "La Tercera").replace("Planets in November", "Planetas - La Tercera")
          .replace("https://www.space.com/x", "https://news.google.com/rss/articles/x"))
    n = B.leer_feed(gn, "Google News · Astronomía Chile")
    assert n[0]["fuente"] == "La Tercera (vía Google News)" and n[0]["titulo"] == "Planetas", n


@prueba
def sismos_aire_y_f1_desde_apis_abiertas():
    """02-11-2026: la tarea no pudo leer la web; GitHub trae sismos (USGS), calidad del aire (Open-Meteo/CAMS) y la tabla de la F1."""
    j = {"features": [{"properties": {"time": 1793600000000, "mag": 3.4}, "geometry": {"coordinates": [-70.123, -23.4567, 45.2]}},
                      {"properties": {"time": None, "mag": 2.9}, "geometry": {"coordinates": [-70, -20, 10]}}]}
    c = B.sismos_csv(j).splitlines()
    assert c[0] == "fecha_local,lat,lon,profundidad_km,magnitud,referencia" and len(c) == 2, c
    assert c[1].endswith(",-23.457,-70.123,45.2,3.4,") and c[1][:4] == "2026", c
    assert B.sismos_csv({}).strip() == "fecha_local,lat,lon,profundidad_km,magnitud,referencia"
    sel = [x for x in B.CIUDADES if x[0] in ("santiago", "temuco")]
    a = B.aire_json([{"current": {"time": "2026-11-02T07:00", "us_aqi": 57.4, "pm2_5": 14.26}}, {"current": {"us_aqi": None}}], sel)
    assert a["ciudades"] == [{"nombre": "Santiago", "aqi_us": 57, "categoria": "Moderada", "pm25": 14.3, "hora": "07:00",
                              "url": "https://open-meteo.com/en/docs/air-quality-api"}] and "CAMS" in a["fuente"], a
    assert B._categoria_aqi(30) == "Buena" and B._categoria_aqi(160) == "Dañina" and B._categoria_aqi(400) == "Peligrosa"
    assert B.aire_json([{}], sel[:1]) is None
    resp = {"driverstandings": {"MRData": {"StandingsTable": {"StandingsLists": [{"round": "20", "DriverStandings": [
        {"position": str(i), "points": str(400 - i), "Driver": {"givenName": "P", "familyName": f"N{i}"}, "Constructors": [{"name": "Equipo"}]}
        for i in range(1, 12)]}]}}}, "races": {"MRData": {"RaceTable": {"Races": [{"date": "2026-10-25", "raceName": "Mexico City Grand Prix"}]}}}}
    p0, r0 = B.pedir, B.robots_permite
    try:
        B.pedir = lambda url, estado, clave, **k: (estado.__setitem__(clave, {"ok": True}) or resp["races" if "races" in url else "driverstandings"])
        B.robots_permite = lambda url, estado: True
        t = B.f1({}, dt.date(2026, 11, 2))["tablas"][0]
        assert t["fecha"] == "2026-10-25" and len(t["filas"]) == 10 and t["filas"][0] == ["1", "P N1", "Equipo", "399"] and "ronda 20" in t["nombre"], t
        B.robots_permite = lambda url, estado: False
        e = {}
        assert B.f1(e, dt.date(2026, 11, 2)) is None and e["f1"]["error"] == "robots.txt no lo permite"
    finally:
        B.pedir, B.robots_permite = p0, r0



@prueba
def senado_votos_y_feeds_filtrados():
    """13-11-2026: (1) votaciones de Sala del Senado con el voto de cada senador: API del sitio del Senado y, si rechaza a la nube, la
    copia pública de esos datos (con su fecha); (2) un feed general de un medio se filtra por las palabras de la sección."""
    viejos = B.pedir, B.robots_permite
    copia = [{"id": 11435, "fecha": "2026-11-04", "tema": "En votación general el proyecto…", "quorum": "Q.C.", "boletin": "17535-25",
              "si": [1, 2, 3], "no": [4], "abstencion": [], "pareo": []},
             {"id": 900, "fecha": "2026-08-01", "tema": "antigua", "boletin": "1-1", "si": [1], "no": [], "abstencion": [], "pareo": []}]
    sen = [{"id": 1, "nombre": "Ana Uno"}, {"id": 2, "nombre": "Beto Dos"}, {"id": 3, "nombre": "Ceci Tres"}, {"id": 4, "nombre": "Dani Cuatro"}]
    try:
        B.robots_permite = lambda u, e: True
        B.pedir = lambda u, e, c, **k: None if "web-back" in u else (copia if "votaciones" in u else sen)
        e = {}
        r = B.senado_votaciones(e, dt.date(2026, 11, 13))
        assert e["senado_votos"]["ok"] and "copia pública" in r["fuente"] and r["actualizado"] == "2026-11-04"
        v = r["votaciones"]
        assert len(v) == 1 and v[0]["resultado"] == "Aprobado" and (v[0]["si"], v[0]["no"]) == (3, 1)
        assert {"nombre": "Dani Cuatro", "voto": "No"} in v[0]["nominal"]
        api = {"data": {"data": [{"ID_VOTACION": 5, "FECHA_VOTACION": "2026-11-12 11:00", "TEMA": "Se rechaza", "BOLETIN": "2-2",
                                  "VOTACIONES": {"SI": [{"PARLID": 1}], "NO": [{"PARLID": 2}, {"PARLID": 3}]}}]}}
        B.pedir = lambda u, e, c, **k: api if "/votes" in u else ({"data": {"data": [{"PARLID": 1, "NOMBRE": "Ana", "APELLIDO_PATERNO": "Uno"}]}}
                                                                  if "parliamentarians" in u else None)
        r = B.senado_votaciones({}, dt.date(2026, 11, 13))
        assert "web-back" in r["fuente"] and r["votaciones"][0]["resultado"] == "Rechazado" and r["votaciones"][0]["nominal"] == [{"nombre": "Ana Uno", "voto": "Sí"}]
        B.pedir = lambda u, e, c, **k: None
        e = {}
        assert B.senado_votaciones(e, dt.date(2026, 11, 13)) is None and e["senado_votos"]["ok"] is False
        rss = ('<rss><channel><item><title>Venta de viviendas cae 10%</title><link>https://x.cl/1</link><pubDate>Fri, 13 Nov 2026 10:00:00 -0300</pubDate></item>'
               '<item><title>Colo-Colo gana el clásico</title><link>https://x.cl/2</link><pubDate>Fri, 13 Nov 2026 10:00:00 -0300</pubDate></item></channel></rss>')
        B.pedir = lambda u, e, c, **k: rss
        _, info, notas = B._un_feed(("inmobiliario", "La Tercera", "https://www.latercera.com/x", B.INMO, {}, "k"))
        assert info["ok"] and [n["titulo"] for n in notas] == ["Venta de viviendas cae 10%"], notas
    finally:
        B.pedir, B.robots_permite = viejos


@prueba
def perspectivas_megaproyectos_de_la_semana():
    """14-11-2026 (informe: Perspectivas 2050 con 1 proyecto nuevo de 4 o 5; Google News y DF rechazan a la tarea): GitHub lee las
    noticias de megaproyectos de los últimos 7 días y las deja en titulares.json → titulares-perspectivas.json para el modelo."""
    v = B.FEEDS["perspectivas"]
    assert len(v) >= 8 and B.VENTANA_H["perspectivas"] == 168
    assert len({u for _, u, _ in v}) == len(v)   # sin direcciones repetidas
    # 14-11-2026: sin Google Noticias (robots.txt «Disallow: /»); Bing Noticias y los RSS propios de Minería Chilena y Revista Electricidad
    assert not any("news.google.com" in u for _, u, _ in v) and sum("bing.com" in u for _, u, _ in v) >= 6
    # una nota de hace 6 días entra (168 h), una de hace 9 días no
    viejos = B.robots_permite, B.pedir, B.ahora
    ahora = dt.datetime(2026, 11, 14, 4, 17, tzinfo=B.TZ)
    def rss(*fechas):
        items = "".join(f"<item><title>Proyecto {i} US$ {100 + i} millones</title><link>https://ejemplo.cl/{i}</link>"
                        f"<pubDate>{f}</pubDate><description>Inversión</description></item>" for i, f in enumerate(fechas))
        return f"<rss><channel>{items}</channel></rss>"
    B.robots_permite = lambda url, e: True
    B.pedir = lambda url, estado, clave, **k: rss("Sun, 08 Nov 2026 10:00:00 -0300", "Thu, 05 Nov 2026 10:00:00 -0300")
    B.ahora = lambda: ahora
    try:
        t2 = B.titulares({}, {"perspectivas": [("Prueba", "https://ejemplo.cl/rss", "rss")]}, hilos=1)
    finally:
        B.robots_permite, B.pedir, B.ahora = viejos
    assert [n["titulo"] for n in t2["secciones"]["perspectivas"]["notas"]] == ["Proyecto 0 US$ 100 millones"], t2["secciones"]["perspectivas"]

@prueba
def sin_fuentes_que_su_robots_prohibe():
    """14-11-2026: las 74 direcciones de Google Noticias nunca se leyeron (robots.txt «Disallow: /»). Que no vuelvan, y que ninguna
    sección quede corta al quitarlas."""
    F = B.todas_las_fuentes()
    urls = [u for L in F.values() for _, u, _ in L]
    prohibidos = ("news.google.com/rss", "query1.finance.yahoo.com/v7")
    assert not [u for u in urls if any(x in u for x in prohibidos)]
    assert all(len(L) >= 7 for L in F.values()), {k: len(v) for k, v in F.items()}

@prueba
def radar_de_bing_en_github_y_no_en_el_pulso():
    """14-11-2026 (auditoría): las 54 búsquedas de Bing del radar de la Skill se leen en «Datos oficiales» con la misma dirección
    (la tarea las salta en fuentes.py plan); el Pulso no las lee, para no multiplicar los pedidos a Bing."""
    import pulso as P
    from urllib.parse import quote
    radar = [(sec, u) for sec, L in B.FEEDS_RADAR.items() for _, u, _ in L]
    assert len(radar) == 54 and all(u.startswith("https://www.bing.com/news/search?q=") and u.endswith("&format=rss&cc=CL&setlang=es") for _, u in radar)
    assert B._bing("política Chile (gobierno OR Congreso)") == "https://www.bing.com/news/search?q=" + quote("política Chile (gobierno OR Congreso)") + "&format=rss&cc=CL&setlang=es"
    con, sin = B.todas_las_fuentes(), B.todas_las_fuentes(radar=False)
    assert all(u in {x[1] for x in con[sec]} for sec, u in radar)
    assert not any(u in {x[1] for x in sin.get(sec, [])} for sec, u in radar if u not in {x[1] for x in B.FEEDS_EXTRA.get(sec, [])})
    visto = {}
    viejo = B.titulares
    B.titulares = lambda estado, feeds=None, hilos=8: visto.setdefault("feeds", feeds) and {}
    try:
        P.titulares({})
    finally:
        B.titulares = viejo
    assert visto.get("feeds") is not None and sum(len(v) for v in visto["feeds"].values()) == sum(len(v) for v in sin.values())

@prueba
def respaldos_completas_y_noticias_reconstruidas():
    """14-11-2026 (Germán: «los respaldos de cada Newsletter»): las ediciones completas que salen de la rama quedan en releases y
    siguen en el índice; el archivo de noticias anterior al 13-11 se rehace desde las ediciones publicadas."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "herramientas"))
    import reconstruir_noticias as RN
    import indice_ediciones as IE
    h = ('<section class="tres"><h2>Las 3 del día</h2><ol><li>Uno.</li><li>Dos.</li></ol></section>'
         '<section class="sec" id="economia"><h2>1. Economía</h2><h3>Chile</h3><ul class="notas"><li><strong>Codelco &amp; Adani</strong> '
         '<span>Acuerdo de exploración.</span> <em class="fuente"><time class="fnota">31-12</time> <a href="https://df.cl/a">Diario Financiero</a></em> '
         '<span class="tambien">También en: <a href="https://latercera.com/b">La Tercera</a></span></li></ul><h3>Mundo</h3><ul class="notas">'
         '<li><strong>Fed</strong> <span>Tasas.</span> <em class="fuente"><time class="fnota">01-01</time> <a href="https://x.com/c">X</a></em></li></ul></section>'
         '<section class="sec" id="conflictos"><h3>Guerra de Gaza (Israel–Hamás)</h3><ul class="notas"><li><strong>Tregua</strong> <span>T.</span> '
         '<em class="fuente"><time class="fnota">01-01</time> <a href="https://y.com/d">Y</a></em></li></ul></section>'
         '<section class="sec" id="deportes"><div class="dep"><h3>Fútbol</h3><ul class="notas"><li><strong>Colo-Colo</strong> <span>Gana.</span> '
         '<em class="fuente"><time class="fnota">01-01</time> <a href="https://z.com/e">Z</a></em></li></ul></div><div class="dep"><h3>Otros deportes</h3>'
         '<div class="disc"><h4>Fórmula 1</h4><ul class="notas"><li><strong>GP</strong> <span>Carrera.</span> <em class="fuente">'
         '<time class="fnota">01-01</time> <a href="https://w.com/f">W</a></em></li></ul></div></div></section>')
    sec = RN.noticias(h, "2027-01-02")
    assert sorted(sec) == ["conflictos/israel-gaza", "deportes/Fórmula 1", "deportes/futbol", "economia/chile", "economia/mundo", "tres_del_dia"], sorted(sec)
    n = sec["economia/chile"][0]
    assert n == {"titulo": "Codelco & Adani", "texto": "Acuerdo de exploración.", "fuente": "Diario Financiero", "url": "https://df.cl/a", "fecha": "2026-12-31"}, n
    assert [x["titulo"] for x in sec["tres_del_dia"]] == ["Uno.", "Dos."] and sec["economia/mundo"][0]["fecha"] == "2027-01-01"
    tmp = tempfile.mkdtemp()
    man = os.path.join(tmp, "completas.json")
    json.dump({"archivos": {"completas/2026-10/Cofrade-News-2026-10-30.html": {"h": "x", "b": 1, "u": "https://github.com/r/releases/download/t/f"}}}, open(man, "w"))
    viejo = IE.archivos
    IE.archivos = lambda ref, carpeta="": (["Cofrade-News-2026-11-14.html"] if "ediciones" in ref else ["ediciones/Cofrade-News-2026-11-13.html"])
    try:
        sal = os.path.join(tmp, "ed.json")
        IE.main(["--salida", sal, "--permanentes", man])
    finally:
        IE.archivos = viejo
    e = {x["f"]: x for x in json.load(open(sal))["ediciones"]}
    assert e["2026-10-30"]["c"] == 1 and e["2026-11-14"]["c"] == 1 and e["2026-11-13"] == {"f": "2026-11-13", "c": 0, "l": 1}, e

@prueba
def livianas_recuperan_los_titulos_pegados():
    """14-11-2026: la edición liviana dejaba «… y 5 más en la edición completa.## 4. Tecnología» dentro de una viñeta; las ya
    publicadas se arreglan en ediciones/ y la del día sin edición completa lleva un aviso (una sola vez)."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "herramientas"))
    import reparar_livianas as RL
    h = ("<main><h1>Cofrade News</h1>\n<p><b>Miércoles 11</b> · Noticias</p><h2>1. Economía</h2><ul><li>a</li>"
         "<li>… y 5 más en la edición completa.## 4. Tecnología, Tendencias &amp; Innovación</li><li>b</li></ul>"
         "<ul><li>… y 2 más en la edición completa.## 21. Deportes</li></ul><h3>Golf</h3></main>")
    r, t = RL.reparar(h)
    assert t == ["4. Tecnología, Tendencias &amp; Innovación", "21. Deportes"], t
    assert "##" not in r and "<ul></ul>" not in r and r.count("<h2>") == 3, r
    assert "<li>… y 5 más en la edición completa.</li></ul><h2>4. Tecnología, Tendencias &amp; Innovación</h2><ul><li>b</li></ul>" in r, r
    assert "<h2>21. Deportes</h2><h3>Golf</h3>" in r and 'sin-completa' not in r, r
    r3, _ = RL.reparar("<ul><li>… y 3 más en la edición completa.## 21. Deportes</li> </ul> <h3>Golf</h3>")
    assert r3 == "<ul><li>… y 3 más en la edición completa.</li></ul><h2>21. Deportes</h2> <h3>Golf</h3>", r3
    assert RL.reparar(r) == (r, [])   # idempotente
    r2, _ = RL.reparar(h, sin_completa=True)
    assert r2.count('class="sin-completa"') == 1 and r2.index('sin-completa') > r2.index("Noticias</p>"), r2
    assert RL.reparar(r2, sin_completa=True)[0] == r2
    r4, _ = RL.reparar(r2, sin_completa=False)   # llegó la completa: el aviso se quita
    assert 'sin-completa' not in r4 and "<h2>4. Tecnología, Tendencias &amp; Innovación</h2>" in r4, r4
    assert RL.reparar(r2)[0] == r2   # sin saber (None) no se toca el aviso
    import reconstruir_noticias as RN
    liv = ("<h2>Las 3 del día</h2><p>1. Uno.</p><p>2. Dos.</p><h2>1. Economía, Negocios e Inversión</h2><h3>Chile</h3><ul>"
           "<li><b>Codelco &amp; Adani</b> — Acuerdo de …</li><li>… y 1 más en la edición completa.</li></ul><h3>Perspectivas 2050</h3>"
           "<ul><li><b>Puerto</b> — no es noticia</li></ul><h2>3. Emprendimiento</h2><ul><li><b>Fintech</b> — Crédito …</li></ul>"
           "<h3>Fondos con postulación abierta</h3><ul><li><b>Corfo</b> — fondo</li></ul><h2>21. Deportes</h2><h3>Otros deportes</h3>"
           "<h4>Rugby</h4><ul><li><b>Sudáfrica</b> — primera …</li></ul><h3>Tenis</h3><ul><li>Ronda 1: A a B 6-2</li></ul>")
    sl = RN.noticias_livianas(liv, "2026-11-11")
    assert sl == {"tres_del_dia": [{"titulo": "Uno."}, {"titulo": "Dos."}],
                  "economia/chile": [{"titulo": "Codelco & Adani", "texto": "Acuerdo de …"}],
                  "emprendimiento": [{"titulo": "Fintech", "texto": "Crédito …"}],
                  "deportes/Rugby": [{"titulo": "Sudáfrica", "texto": "primera …"}]}, sl

@prueba
def completas_permanentes_no_se_traban():
    """14-11-2026 (auditoría): si «gh release view» falla una vez, se vuelve a leer la lista real (antes se suponía vacía y lo ya
    subido daba «already exists»); una edición vacía en la rama se salta con aviso y no deja el código de salida en falla."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "herramientas"))
    import completas_permanentes as CP
    tmp = tempfile.mkdtemp()
    viejo = (CP.MANIFIESTO, CP.MESES, CP.en_rama, CP.contenido, CP.assets, CP.crear_release, CP.subir)
    b = b"<html>10</html>"
    CP.MANIFIESTO, CP.MESES = os.path.join(tmp, "completas.json"), os.path.join(tmp, "meses.json")
    json.dump({"archivos": {"completas/2026-11/Cofrade-News-2026-11-10.html": {"h": CP.huella(b), "b": len(b), "u": "x"}}}, open(CP.MANIFIESTO, "w"))
    llamadas = {"assets": 0, "subir": []}
    def assets(tag):
        llamadas["assets"] += 1
        return None if llamadas["assets"] == 1 else {"Cofrade-News-2026-11-10.html": len(b)}   # falla la primera vez
    CP.en_rama = lambda ref: ["Cofrade-News-2026-11-09.html", "Cofrade-News-2026-11-10.html"]
    CP.contenido = lambda ref, n: b"" if n.endswith("09.html") else b
    CP.assets, CP.crear_release = assets, lambda tag, mes: (False, "already exists")
    CP.subir = lambda tag, ruta, reemplazar=False: (llamadas["subir"].append((os.path.basename(ruta), reemplazar)) or (True, ""))
    try:
        rc = CP.main([], hoy="2026-11-14")
    finally:
        CP.MANIFIESTO, CP.MESES, CP.en_rama, CP.contenido, CP.assets, CP.crear_release, CP.subir = viejo
    assert rc == 0 and llamadas["subir"] == [] and llamadas["assets"] == 2, (rc, llamadas)

if __name__ == "__main__":
    malas = 0
    for f in PRUEBAS:
        try:
            f()
            print("OK   ", f.__name__)
        except Exception as ex:   # noqa: BLE001
            malas += 1
            print("FALLA", f.__name__, type(ex).__name__, ex)
    print(f"{len(PRUEBAS) - malas} de {len(PRUEBAS)}")
    sys.exit(1 if malas else 0)
