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
    ("sinca_listado", "https://sinca.mma.gob.cl/index.php/json/listadomapa2k19/"),
    ("sinca_inicio", "https://sinca.mma.gob.cl/"),
    ("airechile", "https://airechile.mma.gob.cl/"),
    ("espn_atp_sb", "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard"),
    ("espn_wta_sb", "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard"),
    ("espn_atp_sb_hoy", f"https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates={D0}"),
    ("espn_wta_sb_ayer", f"https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates={D1}"),
    ("marca_nba", "https://e00-marca.uecdn.es/rss/baloncesto/nba.xml"),
    ("as_baloncesto", "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/baloncesto/portada/"),
    ("as_nba", "https://feeds.as.com/mrss-s/pages/as/site/as.com/section/baloncesto/subsection/nba/"),
    ("espndeportes_nba", "https://espndeportes.espn.com/espn/rss/nba/news"),
    ("fei_ranking", "https://data.fei.org/Ranking/Search.aspx?rankingCode=S_WR"),
    ("tabsa_inicio", "https://www.tabsa.cl/"),
    ("seia_busqueda", "https://seia.sea.gob.cl/busqueda/buscarProyecto.php"),
    ("senado_ws_18851", "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18851"),
    ("senado_ws_18883", "https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=18883"),
    ("senado_lista", "https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=18883-14"),
    ("camara_ws_indice", "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx"),
    ("camara_ws_proyecto", "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarProyectoLey?prmNumeroBoletin=18883-14"),
    ("dipres_funcional1", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional1.pdf"),
    ("dipres_funcional2", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional2.pdf"),
    ("dipres_funcional3", "https://www.dipres.gob.cl/598/articles-45401_doc_pdf_Funcional3.pdf"),
    ("dipres_series", "https://www.dipres.gob.cl/598/w3-propertyname-706.html"),
]
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
json.dump(resumen, open("sonda/resumen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
