// ===== Banners de sección «Placa de honor» (16-11-2026) =====
// Germán, 16-11 15:17: «agregar algunas imágenes en algunas secciones... destacando el color dorado para las imágenes, un color oscuro de
// fondo y agregues en un extremo el escudo de Cofradía con alguna frase o leyenda que sea atractiva para los usuarios, tal como, "Reunimos
// toda la información que necesitas para tomar buenas decisiones de inversión y potenciar tu desarrollo profesional. Suscríbete!"... cada
// imagen o banner deberá tener la misma altura que tienen los banner publicitarios». Decisiones suyas: diseño «Placa de honor» (doble filete
// dorado y escudo como medalla); en modo oscuro con sus colores (imagen en penumbra, botón de contorno) y en modo día con los de la «Bitácora
// nocturna» (imagen viva, velo azul, botón lleno); título por sección + su frase; 8 imágenes, una por sección (16:11); mapa de Chile
// completo y más grande en teléfono (16:28); bordes del círculo del escudo más transparentes (16:44).
// Medidas: 180 px de alto en computador y tableta (el aviso mide 180) y ~512 en teléfono (tarjeta vertical, como el aviso). Imágenes en
// sitio/banners/<clave>-pc.webp (2112 × 360) y <clave>-tel.webp (732 × 460), servidas en /b/ con un año de caché: al cambiarlas, subir BANNERS_V.
// Los inserta el sitio al servir la edición (HTMLRewriter); si una edición no trae el lugar (p. ej., una antigua sin #crecw), ese banner no va.
const BANNERS_V = "1";
const BANNERS_FRASE = "Reunimos toda la información que necesitas para tomar buenas decisiones de inversión y potenciar tu desarrollo profesional.";
// 25-11-2026 (Germán, 04:19): ubicaciones definitivas. «1. Economía» inmediatamente debajo de «Monedas: variación en un mes» y «Mercados,
// variación diaria»; «2. Política» y «Votaciones» en carrusel después de «Perspectivas 2050» y antes de «2. Política y Actualidad»;
// «3. Emprendimiento» y «4. Tecnología» en carrusel justo antes de «3. Emprendimiento»; «13. Vuelos» antes de su título; «15. Inmobiliario»
// antes de «Subsidios y apoyos del Estado para tu vivienda»; «21. Deportes» antes de su título. «¡Suscríbete!» abre una ventana flotante.
// g = grupo: los banners de un mismo grupo forman un carrusel y van juntos en el lugar del primero.
const BANNERS = [
  { k: "economia", g: "eco", sel: "section#economia", inv: false, foco: "100% 50%",
    t: "¿Cuánto crecerá Chile? <em>Las cifras clave</em>", en: "How much will Chile grow? <0>The key figures</0>" },
  { k: "politica", g: "pol", sel: "section#politica", inv: true, foco: "0% 50%",
    t: "La política que mueve <em>tus inversiones</em>", en: "The politics that move <0>your investments</0>" },
  { k: "votaciones", g: "pol", inv: true, foco: "0% 50%",
    t: "Cómo votó cada parlamentario, <em>ley por ley</em>", en: "How each lawmaker voted, <0>bill by bill</0>" },
  { k: "emprendimiento", g: "emp", sel: "section#emprendimiento", inv: false, foco: "100% 50%",
    t: "Ideas que se convierten <em>en empresas</em>", en: "Ideas that become <0>companies</0>" },
  { k: "tecnologia", g: "emp", inv: false, foco: "100% 50%",
    t: "La tecnología que cambia <em>los negocios</em>", en: "The technology that is changing <0>business</0>" },
  { k: "vuelos", g: "vue", sel: "section#vuelos", inv: false, foco: "100% 50%",
    t: "Todo Chile conectado, <em>cada mañana</em>", en: "All of Chile connected, <0>every morning</0>" },
  { k: "inmobiliario", g: "inm", sel: "#subsidios", inv: false, foco: "100% 50%",
    t: "Dónde se construye <em>el Chile que viene</em>", en: "Where <0>tomorrow's Chile</0> is being built" },
  { k: "deportes", g: "dep", sel: "section#deportes", inv: false, foco: "100% 50%",
    t: "Los resultados que <em>todos comentan</em>", en: "The results <0>everyone is talking about</0>" },
];
// Inglés: el botón EN de la edición traduce con su propio diccionario (window.__EN), cuyas llaves son el texto de cada bloque con sus
// etiquetas numeradas (<0>…</0>), pasado por cyrb53. Se calculan aquí igual que en la edición y se suman al diccionario apenas se define.
function trHashBanner(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const BANNERS_EN = (() => {
  const o = {}, poner = (es, en) => { o[trHashBanner(es.replace(/\s+/g, " ").trim())] = en; };
  for (const b of BANNERS) poner(b.t.replace(/<em>/g, "<0>").replace(/<\/em>/g, "</0>"), b.en);
  poner(BANNERS_FRASE, "We gather all the information you need to make sound investment decisions and boost your professional growth.");
  poner("¡Suscríbete!", "Subscribe!");
  poner("Escudo de la Cofradía", "Cofradía crest");
  poner("Suscripción a Cofrade News", "Subscribe to Cofrade News");
  poner("Suscríbete a <0>Cofrade News</0>", "Subscribe to <0>Cofrade News</0>");
  poner("Abriendo el formulario…", "Opening the form…");
  return o;
})();
// Va al comienzo de <head>, antes que los guiones de la edición: cuando la edición asigna window.__EN, se le suman estas traducciones
const BANNERS_HEAD = `<script>(function(){var X=${JSON.stringify(BANNERS_EN)},v;function sumar(o){if(o&&typeof o==='object')for(var k in X)if(!(k in o))o[k]=X[k];return o}
try{v=sumar(window.__EN);Object.defineProperty(window,'__EN',{configurable:true,enumerable:true,get:function(){return v},set:function(o){v=sumar(o)}})}catch(e){}})();</script>`;
// Teléfono: la imagen se funde con el panel sin que se note la unión (Germán, 16-11 16:52: «la transición del fondo azul al color
// oscuro debe ser más tenue, que no se perciba»; 17:05: «aún más tenue o suave, que se confunda el azul con el color más opaco»).
// Antes: 20 px lineales del pie oscuro de la imagen al marino, que dejaban una franja. Ahora, tres capas con la misma curva suave
// (sin quiebres que el ojo lea como línea): 1) desde 40 px la imagen se acerca a un azul profundo igual al de su propio pie, con
// fusión «lighten», que solo sube los oscuros y deja intactos los trazos claros (el mapa de Chile, la ampolleta, los edificios);
// 2) los últimos 28 px de la imagen se desvanecen en ese mismo azul; 3) el panel parte en ese azul y recién llega al marino abajo,
// junto al botón. El cambio de color queda repartido en casi 500 px: el azul se confunde con el tono opaco de la imagen.
const BANNERS_CURVA = [[0, 0], [8.1, .013], [15.5, .049], [22.5, .104], [29, .175], [35.3, .259], [41.2, .352], [47.1, .45], [52.9, .55],
  [58.8, .648], [64.7, .741], [71, .825], [77.5, .896], [84.5, .951], [91.9, .987], [100, 1]];
const BANNERS_PROFUNDO = [7, 16, 32], BANNERS_MARINO = [11, 31, 58];
const bannerFundido = (rgb) => "linear-gradient(180deg," + BANNERS_CURVA.map(([p, a]) => `rgba(${rgb},${a}) ${p}%`).join(",") + ")";
const bannerPanel = () => {
  const c = (a) => BANNERS_PROFUNDO.map((v, i) => +(v + a * (BANNERS_MARINO[i] - v)).toFixed(1)).join(",");
  return `linear-gradient(180deg,rgb(${c(0)}) 0,rgb(${c(0)}) 232px,` +
    BANNERS_CURVA.slice(1).map(([p, a]) => `rgb(${c(a)}) calc(232px + (100% - 232px) * ${+(p / 100).toFixed(3)})`).join(",") + ")";
};
const bannerBorde = () => "linear-gradient(180deg,#000 0,#000 202px," +
  BANNERS_CURVA.slice(1).map(([p, a]) => `rgba(0,0,0,${+(1 - a).toFixed(3)}) ${+(202 + 28 * p / 100).toFixed(2)}px`).join(",") + ")";
const BANNERS_CSS = `<style id="cnBanners">
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-600-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
.cnb-caja{margin:26px 0;clear:both}
.cnb{--marino:#0B1F3A;--oro:#D9AE52;--marfil:#FFFDF8;--apoyo:#C9D3E0;position:relative;overflow:hidden;isolation:isolate;height:180px;border-radius:10px;
 background:var(--marino);color:var(--marfil);display:flex;align-items:center;gap:26px;padding:0 40px;text-align:left}
.cnb picture{display:contents}
.cnb-img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:var(--foco,50% 50%);z-index:-2;margin:0;border:0;border-radius:0}
.cnb::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
 background:linear-gradient(90deg,rgba(11,31,58,.97) 0%,rgba(11,31,58,.92) 36%,rgba(11,31,58,.55) 58%,rgba(11,31,58,.12) 78%,rgba(11,31,58,0) 92%)}
.cnb.inv::before{background:linear-gradient(270deg,rgba(11,31,58,.97) 0%,rgba(11,31,58,.92) 40%,rgba(11,31,58,.55) 60%,rgba(11,31,58,.12) 80%,rgba(11,31,58,0) 94%)}
.cnb-marco{position:absolute;inset:9px;border:1px solid rgba(217,174,82,.62);border-radius:5px;pointer-events:none;z-index:1}
.cnb-marco::after{content:"";position:absolute;inset:4px;border:1px solid rgba(217,174,82,.26);border-radius:3px}
.cnb-txt{position:relative;z-index:2;flex:1;max-width:460px;min-width:0}
.cnb.inv .cnb-txt{margin-left:auto}
.cnb .cnb-t{margin:0;padding:0;font:600 30px/1.08 'Cormorant Garamond','Iowan Old Style','Palatino Linotype',Georgia,serif;color:var(--marfil);letter-spacing:0;text-wrap:balance;border:0}
.cnb .cnb-t em{font-style:normal;color:var(--oro)}
.cnb .cnb-s{margin:8px 0 0;padding:0;font:400 15px/1.45 'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--apoyo);text-wrap:pretty}
.cnb .cnb-cta{position:relative;z-index:2;flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 26px;border-radius:999px;
 background:var(--oro);color:#1A1406;border:1.5px solid var(--oro);font:700 16px/1 'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;text-decoration:none;white-space:nowrap;
 box-shadow:0 6px 18px -8px rgba(184,137,43,.8);transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s,background-color .18s}
@media (hover:hover) and (pointer:fine){.cnb .cnb-cta:hover{transform:translateY(-1px);box-shadow:0 10px 22px -8px rgba(184,137,43,.9)}html[data-theme=dark] .cnb .cnb-cta:hover{background:rgba(217,174,82,.12)}}
.cnb .cnb-cta:active{transform:translateY(0)}
.cnb .cnb-cta:focus-visible{outline:2px solid var(--marfil);outline-offset:3px}
.cnb-medalla{position:relative;z-index:2;flex:none;width:136px;height:136px;border-radius:50%;display:grid;place-items:center;
 background:radial-gradient(circle closest-side,rgba(11,31,58,.92) 72%,rgba(11,31,58,.6) 92%,rgba(11,31,58,.35) 100%);box-shadow:0 0 0 1px rgba(217,174,82,.22)}
.cnb-medalla img{width:112px;height:112px;display:block;margin:0;border:0}
.cnb.inv .cnb-medalla{order:-1}
html[data-theme=dark] .cnb{background:#050C16}
html[data-theme=dark] .cnb .cnb-img{filter:brightness(.5) saturate(.85)}
html[data-theme=dark] .cnb::before{background:linear-gradient(90deg,rgba(5,12,22,.8) 0%,rgba(5,12,22,.58) 46%,rgba(5,12,22,.22) 100%)}
html[data-theme=dark] .cnb.inv::before{background:linear-gradient(270deg,rgba(5,12,22,.8) 0%,rgba(5,12,22,.58) 46%,rgba(5,12,22,.22) 100%)}
html[data-theme=dark] .cnb .cnb-cta{background:transparent;color:var(--oro);box-shadow:none}
html[data-theme=dark] .cnb-medalla{background:radial-gradient(circle closest-side,rgba(5,12,22,.9) 72%,rgba(5,12,22,.58) 92%,rgba(5,12,22,.32) 100%)}
@media (prefers-reduced-motion:reduce){.cnb .cnb-cta{transition:none}}
@media (min-width:641px) and (max-width:1100px){
 .cnb{gap:18px;padding:0 28px}
 .cnb .cnb-t{font-size:26px;line-height:1.1}
 .cnb .cnb-s{font-size:14px}
 .cnb .cnb-cta{padding:0 20px}
 .cnb-medalla{width:104px;height:104px}
 .cnb-medalla img{width:86px;height:86px}
}
@media (max-width:640px){
 .cnb{height:auto;min-height:512px;flex-direction:column;align-items:stretch;gap:0;padding:0 0 26px;text-align:center;background:${bannerPanel()}}
 .cnb-img{position:relative;inset:auto;height:230px;flex:none;order:0;object-position:50% 50%;-webkit-mask-image:${bannerBorde()};mask-image:${bannerBorde()}}
 .cnb::before,.cnb.inv::before{inset:auto 0 auto 0;top:40px;height:192px;z-index:0;mix-blend-mode:lighten;background:${bannerFundido(BANNERS_PROFUNDO.join(","))}}
 html[data-theme=dark] .cnb::before,html[data-theme=dark] .cnb.inv::before{background:${bannerFundido("5,12,22")}}
 .cnb-medalla,.cnb.inv .cnb-medalla{order:1;width:92px;height:92px;margin:-46px auto 0;
  background:radial-gradient(circle closest-side,rgba(${BANNERS_PROFUNDO},.92) 72%,rgba(${BANNERS_PROFUNDO},.6) 92%,rgba(${BANNERS_PROFUNDO},.35) 100%)}
 .cnb-medalla img{width:76px;height:76px}
 .cnb-txt,.cnb.inv .cnb-txt{order:2;max-width:none;margin:12px 26px 20px}
 .cnb .cnb-t{font-size:26px;line-height:1.1}
 .cnb .cnb-cta{order:3;margin:auto 26px 0;min-height:48px;display:flex}
}
/* 18-11-2026 (Germán: «para el modo noche quítale el círculo detrás del logo de Cofradía, para ver como queda»): de noche el escudo va
   suelto sobre la imagen, sin disco, sin filete y sin sombra (una sombra dejaba un halo redondo que volvía a parecer círculo). */
html[data-theme=dark] .cnb .cnb-medalla,html[data-theme=dark] .cnb.inv .cnb-medalla{background:none;box-shadow:none}
/* 25-11-2026 · carrusel de dos banners: se desliza con el dedo (scroll-snap), con flechas, puntos y pausa como el carrusel de avisos.
   Avanza solo cada 8 s mientras se ve en pantalla; se detiene con el mouse encima, con el foco o al tocarlo, y queda quieto con
   «reducir movimiento». */
.cnb-car{border-radius:10px;overflow:hidden;box-shadow:0 6px 22px rgba(11,31,58,.18)}
.cnb-pista{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;overscroll-behavior-x:contain}
.cnb-pista::-webkit-scrollbar{display:none}
.cnb-car .cnb{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always;border-radius:0}
.cnb-ctrl{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:6px 12px;background:var(--card,#fff);border-top:1px solid var(--linea,#E4DED2)}
.cnb-ctrl button{min-width:44px;min-height:44px;display:inline-grid;place-items:center;padding:0;margin:0;border:0;background:none;color:var(--tinta,#1B2433);font:600 20px/1 'Segoe UI',system-ui,sans-serif;cursor:pointer;border-radius:8px}
.cnb-ctrl .cnb-dot{min-width:28px}
.cnb-ctrl .cnb-dot::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--linea,#CFC7B8);transition:background-color .18s,transform .18s}
.cnb-ctrl .cnb-dot[aria-current=true]::before{background:var(--oro,#D9AE52);transform:scale(1.15)}
@media (hover:hover) and (pointer:fine){.cnb-ctrl button:hover{background:rgba(217,174,82,.14)}}
.cnb-ctrl button:active{transform:scale(.96)}
.cnb-ctrl button:focus-visible{outline:2px solid var(--oro,#D9AE52);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.cnb-pista{scroll-behavior:auto}.cnb-ctrl .cnb-dot::before{transition:none}}
/* Ventana flotante de la suscripción: centrada en computador; en teléfono, hoja que sube desde abajo, al alcance del pulgar. */
html.cnb-abierto{overflow:hidden}
.cnb-dlg{width:min(600px,calc(100vw - 32px));max-width:none;max-height:min(90vh,900px);padding:0;border:1px solid rgba(217,174,82,.55);border-radius:14px;
 background:var(--papel,#FBF8F2);color:var(--tinta,#1B2433);box-shadow:0 24px 60px -18px rgba(5,12,22,.55);overflow:hidden;display:none;flex-direction:column}
.cnb-dlg[open]{display:flex;animation:cnbEntra .22s cubic-bezier(.2,.8,.2,1)}
.cnb-dlg::backdrop{background:rgba(5,12,22,.62)}
@keyframes cnbEntra{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
.cnb-dlg-cab{flex:none;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 18px;background:#0B1F3A;color:#FFFDF8;border-bottom:1px solid rgba(217,174,82,.45)}
.cnb-dlg-cab img{width:40px;height:40px;display:block;margin:0;border:0}
.cnb-dlg .cnb-dlg-t{flex:1;margin:0;padding:0;font:600 22px/1.1 'Cormorant Garamond','Iowan Old Style',Georgia,serif;color:#FFFDF8;border:0}
.cnb-dlg .cnb-dlg-t em{font-style:normal;color:#D9AE52}
.cnb-dlg-x{flex:none;width:44px;height:44px;display:grid;place-items:center;padding:0;margin:0;border:0;border-radius:10px;background:none;color:#FFFDF8;font:400 22px/1 system-ui,sans-serif;cursor:pointer}
@media (hover:hover) and (pointer:fine){.cnb-dlg-x:hover{background:rgba(217,174,82,.16)}}
.cnb-dlg-x:active{transform:scale(.95)}
.cnb-dlg-x:focus-visible{outline:2px solid #D9AE52;outline-offset:2px}
.cnb-dlg-cuerpo{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;position:relative}
.cnb-dlg-f{display:block;width:100%;height:560px;border:0;background:transparent}
.cnb-dlg-carga{position:absolute;inset:0;display:grid;place-items:center;margin:0;font:400 15px/1.4 'Segoe UI',system-ui,sans-serif;color:var(--gris,#6B7585);pointer-events:none}
.cnb-dlg.listo .cnb-dlg-carga{display:none}
html[data-theme=dark] .cnb-dlg{background:var(--papel,#0E1522);color:var(--tinta,#E9EEF6);border-color:rgba(217,174,82,.4)}
html[data-theme=dark] .cnb-dlg-cab{background:#050C16}
@media (max-width:640px){
 .cnb-dlg{width:100%;max-height:92dvh;margin:auto 0 0;border-radius:16px 16px 0 0;border-width:1px 0 0}
 @keyframes cnbEntra{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
}
@media (prefers-reduced-motion:reduce){.cnb-dlg[open]{animation:cnbAparece .18s linear}@keyframes cnbAparece{from{opacity:0}to{opacity:1}}}
@media print{.cnb-caja,.cnb-dlg{display:none!important}}
</style>`;
function bannerHtml(b, i, n) {
  const g = n > 1 ? ` role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${n}"` : ` aria-label="Suscripción a Cofrade News"`;
  return `<aside class="cnb${b.inv ? " inv" : ""}" data-cnb="${b.k}"${g}>`
    + `<picture><source media="(max-width:640px)" srcset="/b/${b.k}-tel.webp?v=${BANNERS_V}" width="732" height="460">`
    + `<img class="cnb-img" src="/b/${b.k}-pc.webp?v=${BANNERS_V}" alt="" width="2112" height="360" loading="lazy" decoding="async" style="--foco:${b.foco}"></picture>`
    + `<span class="cnb-marco" aria-hidden="true"></span>`
    + `<div class="cnb-txt"><p class="cnb-t">${b.t}</p><p class="cnb-s">${BANNERS_FRASE}</p></div>`
    + `<a class="cnb-cta" href="/socios/fundador?plan=anual&amp;o=banner-${b.k}" aria-haspopup="dialog">¡Suscríbete!</a>`
    + `<span class="cnb-medalla"><img src="/marca-agua.webp" alt="Escudo de la Cofradía" width="480" height="480" loading="lazy" decoding="async"></span>`
    + `</aside>`;
}
function grupoHtml(lista) {
  const n = lista.length, bs = lista.map((b, i) => bannerHtml(b, i, n)).join("");
  if (n === 1) return `<div class="cnb-caja">${bs}</div>`;
  const puntos = lista.map((b, i) => `<button type="button" class="cnb-dot" data-i="${i}" aria-label="Ver banner ${i + 1}" aria-current="${i === 0}"></button>`).join("");
  return `<div class="cnb-caja cnb-car" role="region" aria-roledescription="carrusel" aria-label="Suscripción a Cofrade News" data-seg="8">`
    + `<div class="cnb-pista">${bs}</div><div class="cnb-ctrl" data-no-tr><button type="button" class="cnb-prev" aria-label="Banner anterior">‹</button>${puntos}`
    + `<button type="button" class="cnb-next" aria-label="Banner siguiente">›</button><button type="button" class="cnb-pausa" aria-label="Pausar el carrusel" aria-pressed="false">⏸</button></div></div>`;
}
// Ventana flotante: va una sola vez al final de la página. El formulario es el de /socios/fundador (modo embed), así que precio, plan,
// recuadro de seguridad, validaciones, estado de las inscripciones (abiertas, en prueba o cerradas con «Avísenme») y el paso a
// Mercado Pago salen del mismo lugar que la página de socios. Sin JavaScript, el botón abre esa página.
const BANNERS_DLG = `<dialog class="cnb-dlg" id="cnbDlg" aria-labelledby="cnbDlgT"><div class="cnb-dlg-cab"><img src="/marca-agua.webp" alt="" width="480" height="480" decoding="async">`
  + `<p class="cnb-dlg-t" id="cnbDlgT">Suscríbete a <em>Cofrade News</em></p><button type="button" class="cnb-dlg-x" aria-label="Cerrar">✕</button></div>`
  + `<div class="cnb-dlg-cuerpo"><p class="cnb-dlg-carga" role="status">Abriendo el formulario…</p><iframe class="cnb-dlg-f" title="Formulario de suscripción a Cofrade News"></iframe></div></dialog>`;
const BANNERS_JS = `<script>(function(){var d=document,R=d.documentElement,red=matchMedia('(prefers-reduced-motion: reduce)'),en=function(){return R.lang==='en'||/^en/.test(R.getAttribute('lang')||'')};
function rot(){var e=en();d.querySelectorAll('.cnb-car').forEach(function(c){var q=function(s){return c.querySelector(s)};q('.cnb-prev').setAttribute('aria-label',e?'Previous banner':'Banner anterior');
q('.cnb-next').setAttribute('aria-label',e?'Next banner':'Banner siguiente');var p=q('.cnb-pausa');p.setAttribute('aria-label',p.getAttribute('aria-pressed')==='true'?(e?'Play the carousel':'Reanudar el carrusel'):(e?'Pause the carousel':'Pausar el carrusel'));
c.querySelectorAll('.cnb-dot').forEach(function(b,i){b.setAttribute('aria-label',(e?'Show banner ':'Ver banner ')+(i+1))});c.querySelectorAll('.cnb').forEach(function(a,i,t){a.setAttribute('aria-label',(i+1)+(e?' of ':' de ')+t.length)})});
var x=d.querySelector('.cnb-dlg-x');if(x)x.setAttribute('aria-label',e?'Close':'Cerrar');var f=d.querySelector('.cnb-dlg-f');if(f)f.title=e?'Cofrade News subscription form':'Formulario de suscripción a Cofrade News'}
d.querySelectorAll('.cnb-car').forEach(function(c){var pista=c.querySelector('.cnb-pista'),sl=[].slice.call(pista.children),dots=[].slice.call(c.querySelectorAll('.cnb-dot')),pausa=c.querySelector('.cnb-pausa'),
seg=(+c.getAttribute('data-seg')||8)*1000,cur=0,manual=red.matches,encima=false,visible=false,tm=null;
function marcar(i){cur=i;dots.forEach(function(b,j){b.setAttribute('aria-current',j===i?'true':'false')});sl.forEach(function(a,j){if(j===i)a.removeAttribute('inert');else a.setAttribute('inert','')})}
function ir(i){i=(i+sl.length)%sl.length;pista.scrollTo({left:i*pista.clientWidth,behavior:red.matches?'auto':'smooth'});marcar(i)}
function ver(){var p=manual;pausa.setAttribute('aria-pressed',p?'true':'false');pausa.textContent=p?'\\u25B6':'\\u23F8';rot()}
function prog(){clearTimeout(tm);if(!manual&&!encima&&visible&&!d.hidden)tm=setTimeout(function(){ir(cur+1);prog()},seg)}
var tsc=null;pista.addEventListener('scroll',function(){clearTimeout(tsc);tsc=setTimeout(function(){var i=Math.round(pista.scrollLeft/Math.max(1,pista.clientWidth));if(i!==cur)marcar(i)},90)},{passive:true});
c.querySelector('.cnb-prev').addEventListener('click',function(){ir(cur-1);prog()});c.querySelector('.cnb-next').addEventListener('click',function(){ir(cur+1);prog()});
dots.forEach(function(b,i){b.addEventListener('click',function(){ir(i);prog()})});
pausa.addEventListener('click',function(){manual=!manual;ver();prog()});
c.addEventListener('mouseenter',function(){encima=true;clearTimeout(tm)});c.addEventListener('mouseleave',function(){encima=false;prog()});
c.addEventListener('focusin',function(){encima=true;clearTimeout(tm)});c.addEventListener('focusout',function(){encima=false;prog()});
pista.addEventListener('touchstart',function(){manual=true;ver();clearTimeout(tm)},{passive:true});
addEventListener('resize',function(){pista.scrollLeft=cur*pista.clientWidth});d.addEventListener('visibilitychange',prog);
if(window.IntersectionObserver)new IntersectionObserver(function(es){visible=es[0].isIntersecting;prog()},{threshold:.5}).observe(c);else{visible=true}
marcar(0);ver();prog()});
var dlg=d.getElementById('cnbDlg');if(dlg&&dlg.showModal){var fr=dlg.querySelector('.cnb-dlg-f'),origen=null,cargado='';
fr.addEventListener('load',function(){dlg.classList.add('listo')});
function cerrar(){if(dlg.open)dlg.close()}
dlg.addEventListener('close',function(){R.classList.remove('cnb-abierto');if(origen)try{origen.focus()}catch(e){}});
dlg.querySelector('.cnb-dlg-x').addEventListener('click',cerrar);dlg.addEventListener('click',function(ev){if(ev.target===dlg)cerrar()});
addEventListener('message',function(ev){if(ev.origin!==location.origin||!ev.data||ev.source!==fr.contentWindow)return;
if(ev.data.cnb==='alto'&&ev.data.h>0)fr.style.height=Math.min(4000,Math.max(320,ev.data.h))+'px';if(ev.data.cnb==='cerrar')cerrar()});
d.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('.cnb-cta');if(!a||ev.defaultPrevented||ev.button||ev.metaKey||ev.ctrlKey||ev.shiftKey)return;ev.preventDefault();origen=a;
var t=R.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),src='/socios/fundador?embed=1&plan=anual&t='+t+(en()?'&l=en':'');
if(cargado!==src){cargado=src;dlg.classList.remove('listo');fr.style.height='560px';fr.src=src}
R.classList.add('cnb-abierto');dlg.showModal();dlg.querySelector('.cnb-dlg-x').focus()})}
d.addEventListener('cofrade-idioma',function(){setTimeout(rot,0)});rot()})();</script>`;
// Suma al HTMLRewriter de la edición un manejador por grupo (antes del lugar del primer banner); cada grupo se pone una sola vez
function conBanners(rw) {
  const grupos = [];
  for (const b of BANNERS) { const g = grupos.find((x) => x.g === b.g); if (g) g.l.push(b); else grupos.push({ g: b.g, sel: b.sel, l: [b] }); }
  for (const g of grupos) {
    let puesto = false;
    rw = rw.on(g.sel, { element(e) { if (puesto) return; puesto = true; e.before(grupoHtml(g.l), { html: true }); } });
  }
  let fin = false;
  return rw.on("body", { element(e) { if (fin) return; fin = true; e.append(BANNERS_DLG + BANNERS_JS, { html: true }); } });
}
const BANNERS_ARCHIVO = /^\/b\/((?:economia|politica|votaciones|emprendimiento|tecnologia|vuelos|inmobiliario|deportes)-(?:pc|tel)\.webp)$/;
