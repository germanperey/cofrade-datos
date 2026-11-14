"""Sonda de fuentes (diagnóstico, 14-11-2026): revisa robots.txt y prueba fuentes oficiales nuevas desde GitHub, donde la conexión
es normal. Solo lee lo que robots.txt permite. Deja cada respuesta en sonda/ y un resumen en sonda/resumen.json."""
import datetime as dt
import json
import os
import re
import urllib.parse
import urllib.robotparser

import requests

UA = "CofradeNews/1.0 (boletin gratuito sin fines de lucro de la Cofradia de oficiales navales de Chile; github.com/cofrade-datos)"
HOY = dt.date.today()
D0, D1 = HOY.strftime("%Y%m%d"), (HOY - dt.timedelta(days=1)).strftime("%Y%m%d")
OBJETIVOS = [
    ("espn_atp_sb", "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard"),
    ("espn_wta_sb", "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard"),
    ("marca_nba", "https://e00-marca.uecdn.es/rss/baloncesto/nba.xml"),
    ("as_nba", "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/baloncesto/subsection/nba/"),
    ("airechile_inicio", "https://airechile.mma.gob.cl/"),
    ("tabsa_inicio", "https://www.tabsa.cl/"),
    ("seia_busqueda", "https://seia.sea.gob.cl/busqueda/buscarProyecto.php"),
    ("senado_ws_18851", "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18851"),
    ("senado_ws_18883", "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18883"),
    ("camara_ws_indice", "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx"),
    ("camara_ws_proyecto", "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarProyectoLey?prmNumeroBoletin=18883-14"),
    ("dipres_funcional1", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional1.pdf"),
    ("dipres_funcional2", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional2.pdf"),
    ("dipres_funcional3", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional3.pdf"),
    ("dipres_series", "https://www.dipres.gob.cl/598/w3-propertyname-706.html"),
    ("directemar_puertos", "https://www.directemar.cl/directemar/site/tax/port/all/taxport_6_23__1.html"),
]
EXTRA_JS = {"airechile_inicio", "tabsa_inicio"}   # en estas páginas se buscan los scripts y las direcciones de su API
os.makedirs("sonda", exist_ok=True)
robots, resumen = {}, {}


def permitido(url):
    p = urllib.parse.urlsplit(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            r = requests.get(base + "/robots.txt", headers={"User-Agent": UA}, timeout=20)
            texto = r.text if r.status_code == 200 else ""
            open(f"sonda/robots_{p.netloc}.txt", "w", encoding="utf-8").write(f"HTTP {r.status_code}\n{texto[:20000]}")
            rp.parse(texto.splitlines()) if r.status_code == 200 else rp.parse([])
            robots[base] = (rp, r.status_code)
        except Exception as ex:
            rp.parse([])
            robots[base] = (rp, f"error {ex.__class__.__name__}")
    rp, st = robots[base]
    return rp.can_fetch(UA, url) and rp.can_fetch("*", url), st


for nombre, url in OBJETIVOS:
    ok, st_rob = permitido(url)
    fila = {"url": url, "robots_txt": st_rob, "permitido": ok}
    if ok:
        try:
            r = requests.get(url, headers={"User-Agent": UA, "Accept": "*/*"}, timeout=40)
            ct = r.headers.get("Content-Type", "")
            ext = "pdf" if "pdf" in ct or url.endswith(".pdf") else "json" if "json" in ct else "xml" if "xml" in ct else "html"
            cuerpo = r.content if ext == "pdf" else r.content[:3_000_000]
            open(f"sonda/{nombre}.{ext}", "wb").write(cuerpo)
            fila.update({"http": r.status_code, "tipo": ct, "bytes": len(r.content)})
            if ext != "pdf":
                t = r.text
                fila["inicio"] = re.sub(r"\s+", " ", t[:400])
                fechas = sorted(set(re.findall(r"20\d\d-\d\d-\d\d|\d\d/\d\d/20\d\d|\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d\d \w{3} 20\d\d", t)))
                fila["fechas_vistas"] = fechas[-6:]
        except Exception as ex:
            fila["error"] = f"{ex.__class__.__name__}: {str(ex)[:200]}"
    resumen[nombre] = fila
    print(nombre, json.dumps(fila, ensure_ascii=False)[:300])
for nombre in EXTRA_JS:
    f = f"sonda/{nombre}.html"
    if not os.path.exists(f):
        continue
    base = resumen[nombre]["url"]
    html = open(f, encoding="utf-8", errors="replace").read()
    apis = set()
    for i, src in enumerate(re.findall(r'<script[^>]+src="([^"]+)"', html)[:8]):
        u = urllib.parse.urljoin(base, src)
        ok, _ = permitido(u)
        if not ok:
            continue
        try:
            js = requests.get(u, headers={"User-Agent": UA}, timeout=40).text
            apis |= set(re.findall(r'https?://[a-zA-Z0-9.-]+(?:/[A-Za-z0-9_./?=&%-]*)?(?:api|json|itinerar|horario|ruta|tramo|estacion|calidad|medic)[A-Za-z0-9_./?=&%-]*', js))
            apis |= set("REL " + x for x in re.findall(r'["\'](/(?:api|v\d)[A-Za-z0-9_./-]{2,80})["\']', js))
        except Exception as ex:
            apis.add(f"error {u}: {ex.__class__.__name__}")
    resumen[nombre]["apis"] = sorted(apis)[:80]
    print(nombre, "APIS", json.dumps(sorted(apis)[:80], ensure_ascii=False)[:3000])
json.dump(resumen, open("sonda/resumen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
