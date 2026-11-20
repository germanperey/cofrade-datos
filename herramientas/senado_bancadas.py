#!/usr/bin/env python3
"""20-11-2026 · Germán: «Estos gráficos aparecen para la configuración de la "Cámara de Diputados", pero falta agregar los mismos
gráficos de esta sección para el "Senado" (para tener todo el panorama de cómo están configuradas las bancadas políticas, sus
votaciones, etc.)».

La edición arma «Cómo votan las bancadas» con las votaciones del mes que traen el voto de cada parlamentario; del Senado casi no
llegan (su sitio rechaza a los servidores en la nube y la copia pública se actualiza cada pocos días), y con menos de 3 votaciones
el bloque no sale. Aquí se calcula el mismo análisis, con el mismo método y el mismo código de la Skill (senado/, copia), sobre las
votaciones de Sala del Senado con voto nominal oficial de los últimos 62 días (datos/senado-votaciones.json) y el padrón 2026-2030.
El sitio lo pone en el panel del Senado de cada edición que no lo traiga, con el rango de fechas a la vista.
Uso: python3 herramientas/senado_bancadas.py datos/senado-votaciones.json datos/senado-bancadas.json"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "senado"))
import parlamentarios as PL  # noqa: E402
import congreso_analisis as CA  # noqa: E402

PARTIDO_CORTO = {
    "Partido Republicano": "Republicanos", "Renovación Nacional": "RN", "Unión Demócrata Independiente": "UDI",
    "Frente Amplio": "Frente Amplio", "Partido Socialista": "PS", "Partido Comunista": "PC",
    "Partido Demócrata Cristiano": "DC", "Partido Por la Democracia": "PPD", "Partido de la Gente": "PDG",
    "Partido Nacional Libertario": "Libertarios", "Evolución Política": "Evópoli", "Partido Liberal de Chile": "Liberales",
    "Independientes": "Independientes", "Federación Regionalista Verde Social": "FRVS", "Partido Demócratas Chile": "Demócratas",
    "Partido Acción Humanista": "A. Humanista", "Partido Radical de Chile": "Radicales", "Partido Cristiano de Chile": "P. Cristiano",
    "Sin partido informado": "Sin partido",
}




def partido_corto(nombre):
    t = str(nombre or "")
    return PARTIDO_CORTO.get(t) or (t if len(t) <= 16 else t[:15] + "…")


def fecha_cl(f):
    return f"{f[8:10]}-{f[5:7]}-{f[:4]}"


def calcular(sv):
    vs = []
    for v in (sv or {}).get("votaciones") or []:
        nom = []
        for x in v.get("nominal") or []:
            _, largo = PL.partido_de(x.get("nombre"), "senado")
            nom.append({"nombre": x.get("nombre"), "partido": largo or CA.SIN[0], "voto": x.get("voto")})
        if nom:
            vs.append({"fecha": v.get("fecha"), "nominal": nom})
    if len(vs) < CA.MIN_VOTACIONES:
        return None
    a = CA.analizar(vs, "s")
    if not a:
        return None
    desde, hasta = min(v["fecha"] for v in vs), max(v["fecha"] for v in vs)
    cruzados = sum(1 for v in vs for x in v["nominal"] if x["partido"] != CA.SIN[0])
    total = sum(len(v["nominal"]) for v in vs)
    html = CA.html_analisis(a, "Senado", partido_corto)
    rango = f"del {fecha_cl(desde)} al {fecha_cl(hasta)}"
    html = html.replace("votaciones del período que tienen registro nominal oficial",
                        f"votaciones de Sala {rango}, las últimas publicadas con el voto de cada senador", 1)
    return {"generado": dt.datetime.now().isoformat(timespec="seconds"), "fuente": sv.get("fuente"), "desde": desde, "hasta": hasta,
            "votaciones": len(vs), "votos_con_partido_pct": round(100 * cruzados / total, 1) if total else 0, "html": html}


if __name__ == "__main__":
    ent, sal = sys.argv[1], sys.argv[2]
    try:
        sv = json.load(open(ent, encoding="utf-8"))
    except Exception as ex:   # noqa: BLE001
        print("sin votaciones del Senado:", ex); sys.exit(0)
    r = calcular(sv)
    if not r:
        print("menos de 3 votaciones con voto nominal: no se escribe"); sys.exit(0)
    if r["votos_con_partido_pct"] < 80:   # el cruce con el padrón falló: mejor nada que un análisis sin partidos
        print("cruce con el padrón bajo:", r["votos_con_partido_pct"]); sys.exit(0)
    json.dump(r, open(sal, "w", encoding="utf-8"), ensure_ascii=False)
    print("senado-bancadas:", r["votaciones"], "votaciones", r["desde"], "a", r["hasta"], "· cruce", r["votos_con_partido_pct"], "%")
