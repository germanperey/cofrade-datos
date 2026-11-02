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
    orig, dormir = B.pedir, B.time.sleep
    B.pedir, B.time.sleep = falso, (lambda x: None)
    try:
        e = {}
        cam, nom = B.camara(e, dt.date(2026, 10, 28), previo={"3": [{"nombre": "X", "partido": "", "voto": "Sí"}], "1": [{"nombre": "Y"}]})
        assert set(nom) == {"3", "2"} and nom["3"][0]["nombre"] == "X", nom          # la 1 tiene más de 62 días: sale
        assert sum("Detalle" in u for u in pedidos) == 1 and "prmVotacionId=2" in pedidos[-1]   # solo se pide la que faltaba
        assert len(cam["camara_mes"]) == 2 and e["camara"]["nominal"] == {"guardadas": 2, "pendientes": 0}
    finally:
        B.pedir, B.time.sleep = orig, dormir


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
