"""Directorio vivo de fuentes de Cofrade News (15-11-2026).

Germán: «sigue reforzando la cantidad de fuentes de datos, buscando centenares de nuevas fuentes, para que tengamos un Diario muy
completo, donde siempre encuentres sitios que estén habilitados para obtener la información noticiosa actualizada».

Revisa desde GitHub (donde la conexión es normal) cada candidata de herramientas/fuentes-candidatas.json y las que ya están en el
directorio: (1) que su robots.txt permita leerla (si no, NO se lee: nunca se salta un bloqueo); (2) que responda; (3) que sea un
RSS/Atom (o el JSON de ESPN) válido; (4) que traiga notas recientes. Las sanas quedan en datos/fuentes-directorio.json, que bajar.py
suma a sus fuentes en cada corrida. Una fuente del directorio que falla 3 revisiones seguidas sale; vuelve sola si se recupera.
El informe completo (incluidas las descartadas y el motivo) queda en datos/fuentes-salud.json.

python3 herramientas/verificar_fuentes.py [--salida datos]
"""
import argparse
import datetime as dt
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
import bajar as B  # noqa: E402

FRESCA_H = {"ciencia": 240, "astronomia": 240, "industrias": 168, "inmobiliario": 168, "emprendimiento": 168,
            "entretenimiento": 240, "chilenos-mundo": 336, "perspectivas": 168}   # el resto: 96 horas
FALLAS_PARA_SALIR = 3
_LOCKS, _ULTIMO, _MUTEX = {}, {}, threading.Lock()
PAUSA_HOST = {"api.gdeltproject.org": 6.0}   # GDELT pide no más de una consulta cada 5 segundos


def _turno(url):
    """Cortesía por sitio: una consulta a la vez por sitio y, en los que lo piden, con pausa entre consultas."""
    host = urlsplit(url).netloc
    with _MUTEX:
        lk = _LOCKS.setdefault(host, threading.Lock())
    lk.acquire()
    espera = PAUSA_HOST.get(host, 0.5) - (time.time() - _ULTIMO.get(host, 0))
    if espera > 0:
        time.sleep(espera)
    return host, lk


def revisar(c, estado):
    """→ dict con el resultado de una candidata: estado «sana», «vieja», «vacia», «invalida», «robots» o «http»."""
    url, tipo = c["url"], c.get("tipo", "rss")
    r = {"seccion": c["seccion"], "fuente": c["fuente"], "url": url, "tipo": tipo}
    host, lk = _turno(url)
    try:
        if not B.robots_permite(url, estado):
            return dict(r, estado="robots", motivo=B._motivo_robots(url))
        clave = "verif_" + str(abs(hash(url)))
        x = B.pedir(url, estado, clave, como="json" if tipo == "json" else "texto", espera=(0,), limite=25,
                    cabeceras={"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json"})
        if x is None:
            return dict(r, estado="http", motivo=(estado.get(clave) or {}).get("error", "sin respuesta"))
        notas = B.leer_espn(x, c["fuente"]) if tipo == "json" else B.leer_feed(x, c["fuente"])
        if notas is None:
            return dict(r, estado="invalida", motivo="no es un RSS/Atom válido")
        if not notas:
            return dict(r, estado="vacia", motivo="sin notas")
        fechas = sorted(n["fecha"] for n in notas if n.get("fecha"))
        if not fechas:
            return dict(r, estado="sana", n=len(notas), ultima=None, motivo="notas sin fecha")
        ultima = dt.datetime.strptime(fechas[-1], "%Y-%m-%d %H:%M").replace(tzinfo=B.TZ)
        horas = (B.ahora() - ultima).total_seconds() / 3600
        tope = FRESCA_H.get(c["seccion"], 96)
        return dict(r, estado="sana" if horas <= tope else "vieja", n=len(notas), ultima=fechas[-1], horas=round(horas, 1),
                    motivo="" if horas <= tope else f"última nota hace {round(horas / 24, 1)} días (tope {round(tope / 24, 1)})")
    except Exception as ex:   # noqa: BLE001 — una candidata rara nunca bota la revisión
        return dict(r, estado="invalida", motivo=type(ex).__name__)
    finally:
        _ULTIMO[host] = time.time()
        lk.release()


def main(argv=None):
    a = argparse.ArgumentParser()
    a.add_argument("--salida", default=os.path.join(os.path.dirname(AQUI), "datos"))
    a.add_argument("--hilos", type=int, default=12)
    a = a.parse_args(argv)
    cand = json.load(open(os.path.join(AQUI, "fuentes-candidatas.json"), encoding="utf-8"))["candidatas"]
    ruta_dir = os.path.join(a.salida, "fuentes-directorio.json")
    try:
        previo = json.load(open(ruta_dir, encoding="utf-8"))
    except (OSError, ValueError):
        previo = {}
    fallas_prev = previo.get("fallas") or {}
    actuales = {x[1]: {"seccion": sec, "fuente": x[0], "url": x[1], "tipo": x[2]} for sec, L in (previo.get("secciones") or {}).items() for x in L}
    todas = {c["url"]: c for c in cand}
    todas.update({u: c for u, c in actuales.items() if u not in todas})
    estado = {}
    with ThreadPoolExecutor(max_workers=a.hilos) as ex:
        res = list(ex.map(lambda c: revisar(c, estado), todas.values()))
    secciones, fallas, resumen = {}, {}, {}
    for r in res:
        resumen.setdefault(r["seccion"], {}).setdefault(r["estado"], 0)
        resumen[r["seccion"]][r["estado"]] += 1
        sana = r["estado"] == "sana"
        if sana:
            secciones.setdefault(r["seccion"], []).append([r["fuente"], r["url"], r["tipo"]])
        elif r["url"] in actuales and r["estado"] != "robots":   # una del directorio que hoy falla: 3 veces seguidas y sale
            n = int(fallas_prev.get(r["url"], 0)) + 1
            if n < FALLAS_PARA_SALIR:
                fallas[r["url"]] = n
                secciones.setdefault(r["seccion"], []).append([r["fuente"], r["url"], r["tipo"]])
    for L in secciones.values():
        L.sort(key=lambda x: x[0].lower())
    hoy = B.ahora().isoformat(timespec="seconds")
    total = sum(len(L) for L in secciones.values())
    B.escribir(ruta_dir, {"generado": hoy, "total": total, "secciones": secciones, "fallas": fallas,
                          "nota": "Fuentes verificadas desde GitHub (robots.txt, RSS válido y notas recientes). Las lee bajar.py."})
    B.escribir(os.path.join(a.salida, "fuentes-salud.json"), {"generado": hoy, "revisadas": len(res), "resumen": resumen,
                                                              "detalle": sorted(res, key=lambda r: (r["seccion"], r["estado"], r["fuente"]))})
    print(f"Revisadas {len(res)} · sanas en el directorio {total} · por sección: "
          + ", ".join(f"{s} {len(L)}" for s, L in sorted(secciones.items())))
    malas = {}
    for r in res:
        if r["estado"] != "sana":
            malas[r["estado"]] = malas.get(r["estado"], 0) + 1
    print("Descartadas: " + ", ".join(f"{k} {v}" for k, v in sorted(malas.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
