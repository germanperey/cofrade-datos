// 18-11-2026 · Germán: «Amplía de tamaño los siguientes títulos (Congreso: leyes votadas en el Mes; Fondos concursables y
// financiamiento para emprender; Estrecho de Magallanes; Proyección de tasas a 12 meses: hipotecaria y consumo; Subsidios y apoyos
// del Estado para tu vivienda)... Y los gráficos [Todos los aprobados / Todos los rechazados del Congreso] compactarlo, pero pudiendo
// expandirlo al clickear encima para que muestre todo el detalle actual» (en su dibujo: «mostrar barra compacta pero expandible»).
// (a) Los cinco títulos pasan de 15 px a la letra de los otros títulos de bloque de la edición (la misma escala que «Avances logrados
//     a igual período»): 24 px en computador y 20 px en teléfono, con su línea dorada de siempre. Cuatro traen id en su bloque; el del
//     Estrecho no, y se reconoce porque va justo antes de la leyenda de naves (:has; un navegador muy antiguo lo deja como estaba).
// (b) En cada mes y cámara, los dos gráficos quedan dentro de una barra compacta: una franja verde y roja con cuántos proyectos se
//     aprobaron y rechazaron (las cifras de los recuadros de arriba, leídas mientras pasa la página) y «Ver todo el detalle». Al tocarla
//     se abren los dos gráficos tal como estaban; al cerrarla se pliegan. Es un <details> del navegador: funciona sin script, con
//     teclado y con lector de pantalla. Abrir o cerrar uno hace lo mismo en los otros meses y cámaras. Los gráficos se dibujan recién
//     al abrirse (la capa LENTO espera a que se vean) y al imprimir se abren todos. Un mes sin proyectos queda como estaba.
const COMPACTO_CSS = `<style id="cnCompacto">
#cgw>h3,#fondos>h3,#eventos>.ev-l>h3,#tasw>h3,#subsidios>h3{font-family:var(--serif,Georgia,serif);font-size:clamp(20px,2.6vw,24px);line-height:1.2;color:var(--tinta);margin:6px 0 10px;padding-bottom:5px}
#mar>h3.tabtit:has(+p.sub+.leyenda-naves),#mar>h3.tabtit:has(+.leyenda-naves){font-family:var(--serif,Georgia,serif);font-size:clamp(20px,2.6vw,24px);line-height:1.2;color:var(--tinta);margin:28px 0 10px;padding-bottom:5px}
details.cn-cmp{margin:12px 0 6px}
details.cn-cmp>summary{list-style:none;display:flex;flex-direction:column;gap:9px;padding:12px 14px;min-height:44px;box-sizing:border-box;background:var(--card,#fff);border:1px solid var(--linea,#DDD3BF);border-radius:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:border-color .15s ease-out,box-shadow .15s ease-out}
details.cn-cmp>summary::-webkit-details-marker{display:none}
details.cn-cmp>summary::marker{content:""}
details.cn-cmp>summary:hover,details.cn-cmp[open]>summary{border-color:var(--oro,#B8892B)}
details.cn-cmp>summary:hover{box-shadow:0 2px 10px rgba(11,31,58,.08)}
details.cn-cmp>summary:focus-visible{outline:3px solid var(--oro,#B8892B);outline-offset:2px}
.cn-cmp-barra{display:flex;gap:2px;height:12px;border-radius:999px;overflow:hidden}
.cn-cmp-barra i{display:block;min-width:8px}
.cn-cmp-barra .cn-ap{background:#1E7B4F}.cn-cmp-barra .cn-re{background:#B3261E}
.cn-cmp-fila{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 18px;font:500 14.5px/1.35 var(--sans,system-ui,sans-serif);color:var(--tinta,#0B1F3A)}
.cn-cmp-n{display:flex;flex-wrap:wrap;gap:4px 18px}
.cn-cmp-n b{font-weight:700;font-variant-numeric:tabular-nums}
.cn-cmp-n .cn-ap b{color:#1E7B4F}.cn-cmp-n .cn-re b{color:#B3261E}
.cn-cmp-v{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--oro-texto,var(--oro,#8A6514))}
.cn-cmp-v svg{flex:none;transition:transform .2s cubic-bezier(.2,.8,.2,1)}
details.cn-cmp[open] .cn-cmp-v svg{transform:rotate(180deg)}
.cn-cmp-ocu,details.cn-cmp[open] .cn-cmp-ver{display:none}
details.cn-cmp[open] .cn-cmp-ocu{display:inline}
details.cn-cmp>.dos{margin-top:14px}
:root[data-theme=dark] .cn-cmp-barra .cn-ap{background:#2E9E6A}:root[data-theme=dark] .cn-cmp-barra .cn-re{background:#E5534B}
:root[data-theme=dark] .cn-cmp-n .cn-ap b{color:#5BC793}:root[data-theme=dark] .cn-cmp-n .cn-re b{color:#FF8A80}
:root[data-theme=dark] details.cn-cmp>summary:hover{box-shadow:none}
@media (prefers-reduced-motion:reduce){details.cn-cmp>summary,.cn-cmp-v svg{transition:none}}
@media print{details.cn-cmp>summary{display:none}details.cn-cmp>.dos{margin-top:0}}
</style>`;
// 18-11-2026 03:06 · Germán (20 capturas con «=» en rojo): «son espacios que debes ampliar entre un contenido y otro, para que los textos
// no estén tan amontonados, oxigenando un poco más la lectura y todo se vea más armónico y equilibrado»; en Industrias: «agrandar letras»
// (el título de cada industria, «⛏ Minería»). La edición fija .ciudad-tit con !important: por eso estas dos reglas también lo llevan. Regla: más aire ENTRE grupos (texto → tabla, gráfico → tabla, tabla → gráfico, nota →
// título, recuadros → botones) y nada dentro de un grupo (un título sigue pegado a lo suyo). Solo en pantalla: el PDF queda igual.
// 20-11-2026 19:17 · Germán (capturas con «=» en rojo): más aire entre Cámara/Senado y sus recuadros, en «Perspectivas 2050»
// (texto → recuadros → «Inversión por sector») y en «Avances»: cabecera → Elección (Servel/TRICEL) → Programa.
const AIRE_CSS = `<style id="cnAire">@media screen{
#crecw .dos+.dos{margin-top:16px}#crecw p.leer{margin-top:16px}.sec p.leer+.tabla{margin-top:20px}
#cgw .cga{margin-top:30px}
#cgw .cg-mes>.cg-panel{padding-top:12px}
#pjw>.sub+.kpis,#pjw>p.sub~.kpis{margin-top:24px!important}#pjw>.kpis+.dos{margin-top:32px!important}
.gob-cab+.gob-servel,.gob-servel{margin-top:26px!important}.gob-servel+.gob-grid,.gob-grid{margin-top:28px!important}
#gobiernos .gob-kpis{margin-top:22px}#gobiernos .gob-kpis+.pg-wrap{margin-top:24px}#gobiernos .gob-panel{margin-top:26px}#gobiernos .gob-servel{margin-top:18px}#gobiernos .gob-grid+.tabla{margin-top:22px}
#fondos .fz-filtros{margin-top:18px}#fondos .fz-cuenta{margin-top:14px}
.sec h3.ciudad-tit{margin-top:24px!important}
.sec .panel-ciudad+p.tabtit{margin-top:28px}.sec>h3.tabtit{margin-top:28px}.sec>h2+h3.tabtit{margin-top:6px}
#vw{margin-top:18px}#vw h4.h-vuelo{margin-top:24px}
#tasw p.ts-inm-tit{margin-top:24px}#tasw .ts-inm+.ts-bs{margin-top:22px}
.sec .fz,.sec .ts-bloque{margin-top:clamp(30px,3.5vw,40px)}
#industrias h3.ind-tit{margin-top:40px!important;font-size:clamp(20px,2.6vw,24px)!important;line-height:1.2!important}
.dep .tabbloque+.tabla,.dep .chart+.tabla{margin-top:18px}.dep .tabla+.tabbloque{margin-top:30px}.dep .tabla+.notas{margin-top:22px}.disciplinas>.disc+.disc{margin-top:28px}
.horo .vista-horo{margin-top:16px}.horo .vista-horo+.signos{margin-top:22px}
}</style>`;
const COMPACTO_JS = `<script>(function(){var D=[].slice.call(document.querySelectorAll('details.cn-cmp'));if(!D.length)return;var R=document.documentElement,E=[].slice.call(document.querySelectorAll('details.cn-cmp [data-en]'));
E.forEach(function(e){e.setAttribute('data-es',e.textContent)});
function idioma(l){var en=/^en/i.test(String(l||''));E.forEach(function(e){var t=e.getAttribute(en?'data-en':'data-es');if(t!=null&&e.textContent!==t)e.textContent=t})}
function dibujar(d){if(!window.echarts||!echarts.getInstanceByDom)return;[].forEach.call(d.querySelectorAll('.chart'),function(el){try{var g=echarts.getInstanceByDom(el);if(g&&g.resize)g.resize()}catch(e){}})}
D.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)dibujar(d);D.forEach(function(o){if(o!==d&&o.open!==d.open)o.open=d.open})})});
var antes=null;function abrir(){if(antes===null)antes=D.map(function(d){return d.open});D.forEach(function(d){d.open=true})}
addEventListener('beforeprint',function(){abrir();D.forEach(dibujar)},true);var pr=window.print;if(typeof pr==='function')window.print=function(){abrir();return pr.apply(window,arguments)};
addEventListener('afterprint',function(){if(antes)D.forEach(function(d,i){d.open=antes[i]});antes=null});
idioma(R.lang);document.addEventListener('cofrade-idioma',function(e){idioma(e.detail)})})();<\/script>`;
// Las cifras de cada mes y cámara salen de sus recuadros («Aprobados», «Rechazados»), que la página trae justo antes de los gráficos.
// Solo se pliega si ambas cifras se leyeron como números enteros; si la Skill cambia esos recuadros, los gráficos quedan como antes.
// Al imprimir, las barras se abren ANTES que la capa LENTO arme los gráficos (escucha en captura y envuelve window.print), para que
// cada gráfico nazca con su ancho real y no con los ajustes de pantalla angosta.
function compacto() {
  let rot = "", val = "", ap = null, re = null;
  const cifra = (s) => { const t = String(s).trim(); return /^(?:\d{1,3}(?:\.\d{3})+|\d{1,5})$/.test(t) ? parseInt(t.replace(/\./g, ""), 10) : null; };
  const plural = (n, uno, varios) => (n === 1 ? uno : varios);
  return {
    cabeza: { element(e) { e.append(COMPACTO_CSS + AIRE_CSS, { html: true }); } },
    cuerpo: { element(e) { e.append(COMPACTO_JS, { html: true }); } },
    kpis: { element() { ap = null; re = null; } },
    kn: { element() { rot = ""; }, text(t) { rot += t.text; } },
    kv: { element() { val = ""; }, text(t) {
      val += t.text;
      if (!t.lastInTextNode) return;
      const k = rot.replace(/\s+/g, " ").trim();
      if (k === "Aprobados") ap = cifra(val); else if (k === "Rechazados") re = cifra(val);
    } },
    dos: { element(e) {
      const hay = ap !== null && re !== null;
      if (!hay || ap + re === 0) return;   // sin cifras legibles o sin proyectos, los gráficos quedan como estaban (nunca una barra muda)
      const barra = hay ? `<span class="cn-cmp-barra" aria-hidden="true">${ap ? `<i class="cn-ap" style="flex-grow:${ap}"></i>` : ""}${re ? `<i class="cn-re" style="flex-grow:${re}"></i>` : ""}</span>` : "";
      const cifras = hay ? `<span class="cn-cmp-n"><span class="cn-ap"><b>${ap}</b> <span data-en="approved">${plural(ap, "aprobado", "aprobados")}</span></span> `
        + `<span class="cn-re"><b>${re}</b> <span data-en="rejected">${plural(re, "rechazado", "rechazados")}</span></span></span>` : "";
      e.before(`<details class="cn-cmp"><summary data-no-tr translate="no">${barra}<span class="cn-cmp-fila">${cifras} <span class="cn-cmp-v">`
        + `<span class="cn-cmp-ver" data-en="Show full detail">Ver todo el detalle</span><span class="cn-cmp-ocu" data-en="Hide detail">Ocultar el detalle</span>`
        + `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        + `</span></span></summary>`, { html: true });
      e.after("</details>", { html: true });
      ap = null; re = null;
    } },
  };
}
