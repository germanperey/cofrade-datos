#!/usr/bin/env python3
"""Arma worker.js desde worker.src.js: logos, dirección del formulario de publicidad, marcas auspiciadoras,
la capa rápida de gráficos de la edición (modulos/lento.js), el Buzón + Panel de Control (modulos/buzon_panel.js) y los
socios fundadores con Mercado Pago (modulos/suscripciones.js), el tablero con la publicidad pagada (modulos/tablero.js) y la difusión
(botón Compartir, concurso «Comparte Cofrade News» y menciones en medios, modulos/difusion.js)."""
import hashlib, json, os
aqui = os.path.dirname(os.path.abspath(__file__))
leer = lambda *r: open(os.path.join(aqui, *r), encoding="utf-8").read()
src = leer("worker.src.js")
logos = json.load(open(os.path.join(aqui, "logos.json"), encoding="utf-8"))
marcas = json.load(open(os.path.join(aqui, "marcas.json"), encoding="utf-8"))
lento = leer("modulos", "lento.js").strip()
assert "</script" not in lento.lower()
navegar = leer("modulos", "navegar.js").strip()   # 18-11-2026: el Índice llega exacto al tema
assert "</script" not in navegar.lower()
def compacto_js(codigo):
    """19-11-2026: un script que va al navegador sale sin comentarios ni espacios (más liviano y más difícil de copiar).
    Usa esbuild si está a mano; si no, queda tal cual (funciona igual)."""
    import shutil, subprocess
    esb = shutil.which("esbuild") or "/tmp/esb/node_modules/.bin/esbuild"
    if not os.path.exists(esb): return codigo
    r = subprocess.run([esb, "--minify", "--loader=js", "--log-level=error"], input=codigo.encode("utf-8"), capture_output=True)
    return r.stdout.decode("utf-8").strip() if r.returncode == 0 and r.stdout.strip() else codigo
voz = compacto_js(leer("modulos", "voz.js").strip())   # 19-11-2026: el boletín con voz
assert "</script" not in voz.lower()
proy_js = compacto_js(leer("modulos", "proyeccion_cliente.js").strip())   # 19-11-2026: gráficos de la proyección de crecimiento a 4 años
assert "</script" not in proy_js.lower()
compartir_js = compacto_js(leer("modulos", "compartir_cliente.js").strip())   # 20-11-2026: botón Compartir (portada y ediciones)
assert "</script" not in compartir_js.lower()
concurso_js = compacto_js(leer("modulos", "concurso_cliente.js").strip())   # 20-11-2026: inscripción al concurso desde el Buzón
assert "</script" not in concurso_js.lower()
# 20-11-2026: Panel «Podcast»: copiar, portada fija y conversor de audio a video (con webm-muxer, licencia MIT, en sitio/vendor/)
podcast_js = compacto_js(leer("vendor", "webm-muxer.js").strip() + "\n" + leer("modulos", "podcast_cliente.js").strip())
assert "</script" not in podcast_js.lower() and "Vanilagy" in podcast_js
for k, v in {
    "__FORMULARIO__": logos["formulario"],
    "__MARCAS__": json.dumps({"marcas": marcas["marcas"]}, ensure_ascii=False),
    "__LENTO__": json.dumps("<script>" + lento + "</script>", ensure_ascii=False),
    "__NAVEGAR__": json.dumps("<script>" + navegar + "</script>", ensure_ascii=False),
    "__VOZ__": json.dumps("<script>" + voz + "</script>", ensure_ascii=False),
    "__PROY_JS__": json.dumps("<script>" + proy_js + "</script>", ensure_ascii=False),
    "/*__BUZON_PANEL__*/": leer("modulos", "buzon_panel.js"),
    "/*__SUSCRIPCIONES__*/": leer("modulos", "suscripciones.js"),   # 14-11-2026: socios fundadores con Mercado Pago
    "/*__TABLERO__*/": leer("modulos", "tablero.js"),   # 16-11-2026: Panel con filtros, ayudas y gráficos + publicidad pagada
    "/*__COMPACTO__*/": leer("modulos", "compacto.js"),   # 18-11-2026: títulos de bloque más grandes y Congreso en barra compacta
    "/*__HOROSCOPO_ANUAL__*/": leer("modulos", "horoscopo_anual.js"),
    "/*__PROYECCION__*/": leer("modulos", "proyeccion.js"),   # 19-11-2026: «Proyección de crecimiento en Chile durante los próximos 4 años»   # 18-11-2026: horóscopo del año, chino y personalizado (contenido hasta 2031)
    "/*__ICONO__*/": leer("modulos", "icono.js"),   # 16-11-2026: ícono de Cofrade News (acceso directo, lectura sin señal)
    "/*__DIFUSION__*/": leer("modulos", "difusion.js"),   # 20-11-2026: botón Compartir, concurso y menciones en medios
    "__COMPARTIR_JS__": json.dumps("<script>" + compartir_js + "</script>", ensure_ascii=False),   # van después del módulo que los nombra
    "__CONCURSO_JS__": json.dumps("<script>" + concurso_js + "</script>", ensure_ascii=False),
    "/*__PODCAST__*/": leer("modulos", "podcast.js"),   # 20-11-2026: podcast diario (fuente, episodios, /podcast y Panel)
    "/*__SESENTA__*/": leer("modulos", "sesenta.js"),   # 20-11-2026: fichas de «Hoy en 60 segundos» resumidas
    "/*__INDICADOR_GRAF__*/": leer("modulos", "indicador_graf.js"),   # 20-11-2026: gráfico emergente de cada indicador (sección 9)
    "/*__SENADO_BANCADAS__*/": leer("modulos", "senado_bancadas.js"),   # 20-11-2026: «Cómo votan las bancadas» del Senado
    "/*__PILARES_DESGLOSE__*/": leer("modulos", "pilares_desglose.js"),   # 20-11-2026: desglose de Familia y Conectividad
    "/*__HOROSCOPO_COMPAT__*/": leer("modulos", "horoscopo_compat.js"),   # 20-11-2026: compatibilidad con otra persona
    "/*__IDIOMA_RAPIDO__*/": leer("modulos", "idioma_rapido.js"),   # 21-11-2026: botón EN/ES más rápido en la edición
    "/*__REPUBLICA__*/": leer("modulos", "republica.js"),   # 23-11-2026: republicar, RSS, fichas e IndexNow
    "/*__EVENTOS_EMPR__*/": leer("modulos", "eventos_empr.js"),   # 24-11-2026: ferias, eventos y concursos de emprendimiento
    "/*__VUELOS_VIVO__*/": leer("modulos", "vuelos_vivo.js"),   # 25-11-2026: estado y hora confirmada de cada vuelo, al momento
    "/*__BANNERS__*/": leer("modulos", "banners.js"),   # 25-11-2026: 8 banners de suscripción con ventana flotante (Mercado Pago)
    "/*__CURADURIA__*/": leer("modulos", "curaduria.js"),   # 26-11-2026: curaduría con IA de los titulares «En vivo»
    "/*__LECTORES__*/": leer("modulos", "lectores.js"),   # 26-11-2026: «Recíbelo a las 7:00» en la portada (Kit + Telegram)
    "/*__METRICAS__*/": leer("modulos", "metricas.js"),   # 26-11-2026: eventos anónimos sin cookies
    "/*__EDICION_EXTRA__*/": leer("modulos", "edicion_extra.js"),   # 26-11-2026: aguja, secciones favoritas y compartir gráfico
    "/*__SENADO_SALA__*/": leer("modulos", "senado_sala.js"),
    "/*__AUDIO_DIA__*/": leer("modulos", "audio_dia.js"),
    "/*__POSICIONAMIENTO__*/": leer("modulos", "posicionamiento.js"),
    "/*__GOBIERNO_ACTUAL__*/": leer("modulos", "gobierno_actual.js"),   # 27-11-2026: avance del gobierno revisado lunes y jueves   # 27-11-2026: buscadores, IAs que citan (sin entrenar) e IndexNow   # 27-11-2026: resumen en audio del día (voz de Workers AI)   # 26-11-2026: decisiones de Sala del Senado desde la fuente oficial
    "__PODCAST_JS__": json.dumps("<script>" + podcast_js + "</script>", ensure_ascii=False),
}.items():
    assert src.count(k) == 1, k
    src = src.replace(k, v)
# 18-11-2026: huella de esta versión del sitio (va en la etiqueta de cada edición; ver VERSION_SITIO en worker.src.js)
assert src.count("__VERSION_SITIO__") == 1
src = src.replace("__VERSION_SITIO__", hashlib.sha256(src.encode()).hexdigest()[:12])
open(os.path.join(aqui, "worker.js"), "w", encoding="utf-8").write(src)
print("worker.js", len(src.encode()), "bytes")
