#!/usr/bin/env python3
"""Estado de los modelos de Claude, leído desde GitHub (19-11-2026).

Germán (15-11-2026): «los Agentes Auditores ... deben verificar también que los modelos de Claude estén vigentes y activos».
Las tareas programadas de Claude no pueden abrir platform.claude.com de madrugada (la herramienta de lectura pide un permiso que
nadie aprueba a esa hora), así que el 19-11 la ronda del auditor quedó sin revisar los modelos. Ahora el Vigía de GitHub baja cada
3 horas la tabla oficial de Anthropic y la deja en datos/modelos-claude.json; los auditores la leen con curl desde GitHub.
Respeta el robots.txt del sitio. Nunca falla la corrida: si no responde, deja el archivo anterior.

  python herramientas/modelos_claude.py
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.robotparser
from zoneinfo import ZoneInfo

import requests

URL = "https://platform.claude.com/docs/en/about-claude/model-deprecations.md"
AGENTE = "cofrade-datos-vigia/1.0 (+https://github.com/germanperey/cofrade-datos)"
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datos", "modelos-claude.json")


def tablas(md):
    """Cada tabla Markdown precedida por su título (## …) → {titulo: [ {columna: valor} ]}."""
    out, titulo, cab = {}, "", None
    for linea in md.splitlines():
        s = linea.strip()
        if s.startswith("#"):
            titulo, cab = s.lstrip("#").strip(), None
            continue
        if not s.startswith("|"):
            cab = None
            continue
        celdas = [c.strip().strip("`*") for c in s.strip("|").split("|")]
        if cab is None:
            cab = celdas
            out.setdefault(titulo or "tabla", [])
        elif all(re.fullmatch(r":?-{2,}:?", c) for c in celdas if c):
            continue
        else:
            out[titulo or "tabla"].append(dict(zip(cab, celdas)))
    return {k: v for k, v in out.items() if v}


def main():
    try:
        rp = urllib.robotparser.RobotFileParser("https://platform.claude.com/robots.txt")
        rp.read()
        if not rp.can_fetch(AGENTE, URL):
            print("modelos-claude: el robots.txt no permite leer la tabla; se deja el archivo anterior")
            return 0
        r = requests.get(URL, headers={"User-Agent": AGENTE}, timeout=60)
        r.raise_for_status()
        t = tablas(r.text)
        if not t:
            print("modelos-claude: la página no trajo tablas; se deja el archivo anterior")
            return 0
        datos = {"generado": dt.datetime.now(ZoneInfo("America/Santiago")).isoformat(timespec="minutes"), "url": URL, "tablas": t}
        json.dump(datos, open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"modelos-claude: {sum(len(v) for v in t.values())} filas en {len(t)} tablas → datos/modelos-claude.json")
    except Exception as ex:   # nunca bota al Vigía
        print("modelos-claude: no se pudo leer la tabla oficial:", type(ex).__name__, ex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
