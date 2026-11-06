#!/usr/bin/env python3
"""Arma worker.js desde worker.src.js con los logos de Cofrade News y la dirección del formulario de publicidad."""
import json, os, sys
aqui = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(aqui, "worker.src.js"), encoding="utf-8").read()
logos = json.load(open(os.path.join(aqui, "logos.json"), encoding="utf-8"))
for k, v in {"__LOGO_CLARO__": logos["claro"], "__LOGO_OSCURO__": logos["oscuro"], "__FORMULARIO__": logos["formulario"]}.items():
    assert src.count(k) == 1, k
    src = src.replace(k, v)
open(os.path.join(aqui, "worker.js"), "w", encoding="utf-8").write(src)
print("worker.js", len(src.encode()), "bytes")
