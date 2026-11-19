# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).
"""Gráficos vacíos o sin sentido en una edición de Cofrade News (19-11-2026).

Germán, 19-11 18:00 (captura): «falta el gráfico de Golf... No puede ser que te tenga que supervisar diariamente». El gráfico salió
vacío porque el torneo aún no empezaba (todos en E) y nadie revisaba si un gráfico trae datos. Este programa abre la edición en un
navegador sin pantalla, espera que se dibujen los gráficos y revisa CADA uno:
  · que exista y tenga alto (un contenedor sin gráfico ni mensaje de «sin datos» es FALLA);
  · que alguna serie traiga números (todas vacías o nulas es FALLA);
  · que no sean todos cero (barras, líneas o tortas en cero no muestran nada: FALLA);
  · golf: que el marcador no sea de un torneo sin empezar (todos en E) ni «Programado».
Sin dependencias raras: Playwright con Chromium (el mismo que usan las pruebas del sitio). Sale con código 1 si hay FALLA.

Uso:  python3 herramientas/graficos_vacios.py <edición.html | https://www.cofrad.es/edicion/AAAA-MM-DD> [--json salida.json]"""
import argparse
import asyncio
import json
import os
import sys

JS = r"""() => {
  const out = [];
  const E = window.echarts;
  for (const el of document.querySelectorAll('.chart, [id^="g"][role="img"]')) {
    if (!el.id || out.some(o => o.id === el.id)) continue;
    const sec = el.closest('section');
    const h = el.closest('.dep, .bloque, section');
    const titulo = ((h && h.querySelector('h3, h4, h2')) || {}).textContent || '';
    const vis = el.checkVisibility ? el.checkVisibility() : !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const r = { id: el.id, seccion: (sec && sec.id) || '', titulo: titulo.trim().slice(0, 80), alto: el.getBoundingClientRect().height, visible: vis };
    const inst = E && E.getInstanceByDom ? E.getInstanceByDom(el) : null;
    if (!inst) {   // en una pestaña o filtro que no está a la vista se dibuja al abrirlo: eso no es falla
      const msg = (el.textContent || '').trim();
      r.estado = msg ? 'mensaje' : (vis ? 'sin_grafico' : 'oculto'); r.mensaje = msg.slice(0, 120);
      out.push(r); continue;
    }
    const op = inst.getOption() || {};
    const nums = [];
    let nSeries = 0;
    const tomar = (v) => {
      if (v == null) return;
      if (typeof v === 'number') { if (isFinite(v)) nums.push(v); return; }
      if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) { nums.push(+v); return; }
      if (Array.isArray(v)) { v.forEach(tomar); return; }
      if (typeof v === 'object' && 'value' in v) tomar(v.value);
    };
    for (const s of op.series || []) {
      nSeries++;
      const d = s.data || (s.type === 'map' ? [] : []);
      if (Array.isArray(d)) d.forEach(tomar);
      if (Array.isArray(s.markLine && s.markLine.data)) { /* las líneas de referencia no cuentan como datos */ }
    }
    if (op.dataset && op.dataset.length) {
      for (const ds of op.dataset) (ds.source || []).forEach(f => Array.isArray(f) ? f.forEach(tomar) : (typeof f === 'object' && f && Object.values(f).forEach(tomar)));
    }
    r.series = nSeries; r.numeros = nums.length;
    r.distintos_de_cero = nums.filter(x => x !== 0).length;
    r.tipos = [...new Set((op.series || []).map(s => s.type))].join(',');
    r.estado = 'ok';
    if (!nSeries) r.estado = 'sin_series';
    else if (!nums.length && !/graph|tree|sankey|map|custom|lines|scatter|effectScatter|heatmap|parallel|themeRiver|sunburst|treemap|gauge/.test(r.tipos)) r.estado = 'sin_numeros';
    else if (nums.length && !r.distintos_de_cero && /bar|line|pie/.test(r.tipos)) r.estado = 'todo_cero';
    if (r.alto < 40 && r.estado === 'ok') r.estado = vis ? 'sin_alto' : 'ok';   // oculto en una pestaña: sus datos ya se revisaron
    out.push(r);
  }
  // golf: el marcador de un torneo sin empezar (todos en E) o «Programado» no es noticia
  const g = document.querySelector('#dep-golf');
  if (g) {
    const sub = (g.querySelector('.sub') || {}).textContent || '';
    const sc = [...g.querySelectorAll('tbody tr')].map(tr => (tr.lastElementChild || {}).textContent.trim());
    const golf = { id: 'dep-golf', seccion: 'deportes', titulo: 'Golf', estado: 'ok', mensaje: sub.trim().slice(0, 120) };
    if (/program|scheduled|por jugar|no ha comenzado/i.test(sub)) golf.estado = 'golf_programado';
    else if (sc.length >= 3 && sc.every(x => /^(E|PAR|0)$/i.test(x))) golf.estado = 'golf_todos_en_E';
    out.push(golf);
  }
  return out;
}"""

MOTIVO = {
    "sin_grafico": "el contenedor quedó vacío: no se dibujó el gráfico ni hay un mensaje de «sin datos»",
    "sin_series": "el gráfico no tiene series",
    "sin_numeros": "ninguna serie trae números",
    "todo_cero": "todos los valores son cero: el gráfico se ve vacío",
    "sin_alto": "el gráfico tiene menos de 40 px de alto: no se ve",
    "golf_programado": "el marcador de golf es de un torneo programado (sin empezar): publicar el resultado FINAL del último torneo terminado",
    "golf_todos_en_E": "el marcador de golf tiene a todos en E (nadie ha jugado): publicar el resultado FINAL del último torneo terminado",
}


async def revisar(destino, salida=None):
    from playwright.async_api import async_playwright
    url = destino if destino.startswith(("http://", "https://")) else "file://" + os.path.abspath(destino)
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={"width": 1280, "height": 900})
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
        # nada de afuera: la edición completa trae su librería de gráficos adentro (las imágenes y fuentes no importan aquí)
        await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith(("file://", url.split("/edicion")[0])) else r.abort())
        await pg.goto(url, wait_until="load", timeout=120000)
        alto = await pg.evaluate("() => document.body.scrollHeight")
        y = 0
        while y < alto:   # los gráficos se dibujan al acercarse a la pantalla
            y += 700
            await pg.evaluate(f"window.scrollTo(0, {y})")
            await pg.wait_for_timeout(120)
            alto = await pg.evaluate("() => document.body.scrollHeight")
        await pg.wait_for_timeout(1500)
        res = await pg.evaluate(JS)
        await br.close()
    fallas = [r for r in res if r["estado"] in MOTIVO]
    for r in fallas:
        print(f"FALLA Gráfico {r['id']} ({r['seccion']} · {r['titulo'] or 'sin título'}): {MOTIVO[r['estado']]}")
    ocultos = sum(1 for r in res if r["estado"] == "oculto")
    print(f"{'OK' if not fallas else 'REVISAR'}: {len(res)} gráficos revisados, {len(fallas)} con falla"
          + (f", {ocultos} en pestañas cerradas (se dibujan al abrirlas)" if ocultos else "") + (f"; errores de la página: {len(errores)}" if errores else ""))
    if salida:
        json.dump({"graficos": res, "errores": errores}, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 1 if fallas else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("destino")
    ap.add_argument("--json")
    a = ap.parse_args()
    sys.exit(asyncio.run(revisar(a.destino, a.json)))
