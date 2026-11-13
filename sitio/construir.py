#!/usr/bin/env python3
"""Arma worker.js desde worker.src.js: logos, dirección del formulario de publicidad, marcas auspiciadoras,
la capa rápida de gráficos de la edición (modulos/lento.js) y el Buzón + Panel de Control (modulos/buzon_panel.js)."""
import json, os
aqui = os.path.dirname(os.path.abspath(__file__))
leer = lambda *r: open(os.path.join(aqui, *r), encoding="utf-8").read()
src = leer("worker.src.js")
logos = json.load(open(os.path.join(aqui, "logos.json"), encoding="utf-8"))
marcas = json.load(open(os.path.join(aqui, "marcas.json"), encoding="utf-8"))
lento = leer("modulos", "lento.js").strip()
assert "</script" not in lento.lower()
for k, v in {
    "__FORMULARIO__": logos["formulario"],
    "__MARCAS__": json.dumps({"marcas": marcas["marcas"]}, ensure_ascii=False),
    "__LENTO__": json.dumps("<script>" + lento + "</script>", ensure_ascii=False),
    "/*__BUZON_PANEL__*/": leer("modulos", "buzon_panel.js"),
}.items():
    assert src.count(k) == 1, k
    src = src.replace(k, v)
open(os.path.join(aqui, "worker.js"), "w", encoding="utf-8").write(src)
print("worker.js", len(src.encode()), "bytes")
