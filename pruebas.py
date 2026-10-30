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
    try:
        d = tempfile.mkdtemp()
        assert B.main(["--salida", d]) == 0
        import json
        e = json.load(open(os.path.join(d, "estado.json")))
        assert all(not v["ok"] for v in e["fuentes"].values()) and not os.path.exists(os.path.join(d, "uv.csv"))
    finally:
        B.time.sleep, B.requests.Session.get = dormir, get


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
