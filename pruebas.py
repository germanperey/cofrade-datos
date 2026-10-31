#!/usr/bin/env python3
"""Pruebas de bajar.py con datos de ejemplo (sin red). python3 scripts/pruebas.py"""
import datetime as dt
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
        assert B.robots_permite("https://b.cl/feed", e) and not B.robots_permite("https://c.cl/feed", e)
        assert not B.robots_permite("https://d.cl/feed", e) and not e["robots_d.cl"]["ok"]
        assert B._motivo_robots("https://d.cl/x") == "robots.txt no respondió" and B._motivo_robots("https://a.cl/rss") == "robots.txt no lo permite"
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
