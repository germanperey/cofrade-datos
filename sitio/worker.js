// Cofrade News · www.cofrad.es (Cloudflare Worker, plan gratuito). 06-11-2026.
// Portada con la edición del día, la franja «En vivo» (pulso de GitHub cada 2 horas), el archivo y el área de socios.
// Las ediciones y el pulso se leen del repositorio público germanperey/cofrade-datos: este programa no guarda datos propios.
// Secreto opcional SOCIOS_CLAVE (Cloudflare → Workers & Pages → cofrade-news-web → Settings → Variables and Secrets).
// © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).

const RAW = "https://raw.githubusercontent.com/germanperey/cofrade-datos/main/";
const RAW_ED = "https://raw.githubusercontent.com/germanperey/cofrade-datos/ediciones/";   // edición COMPLETA (gráficos interactivos), 14 días
const rutaEdicion = (f, completa) => (completa ? RAW_ED : RAW + "ediciones/") + `Cofrade-News-${f}.html`;
// 14-11-2026 (Germán: «los respaldos de cada Newsletter»): cuando una edición completa sale de la rama (guarda 16), queda para siempre en
// el release mensual completas-AAAA-MM del repositorio (herramientas/completas_permanentes.py) y se sigue leyendo de ahí.
const rutaPermanente = (f) => `https://github.com/germanperey/cofrade-datos/releases/download/completas-${f.slice(0, 7)}/Cofrade-News-${f}.html`;
const DOMINIO = "www.cofrad.es";
const FORMULARIO = "https://script.google.com/macros/s/AKfycbzruAvDDO14ZEP6wlA7UwFwFprOvT3516COFx7ZSaYys3qkLrnluO25ZnFnaAlTrlo/exec";
const LOGO_CLARO = "/logo-claro.webp";
const LOGO_OSCURO = "/logo-oscuro.webp";
const DIAS_ARCHIVO = 20;   // respaldo sin índice: 20 días hacia atrás (hasta 40 lecturas; el plan gratuito permite 50 por visita)
const MAX_ARCHIVO = 12;    // la portada muestra las 12 ediciones más recientes (Germán, 13-11-2026)…
const TOPE_ARCHIVO = 400;  // …y «Ver más» abre las anteriores de a 12 (Germán, 14-11-2026)
const MARCAS = {"marcas": [{"nombre": "Caddie Golf", "logo": "caddie-icono.webp", "texto": "Caddie Golf", "fondo": "#0A1410", "color": "#E9F5EC", "url": "https://www.caddiegolf.cl/?utm_source=cofrad.es&utm_medium=carrusel"}, {"nombre": "Inbestu", "logo": "inbestu.webp", "fondo": "#FFFFFF", "contacto": true}, {"nombre": "Megabots", "logo": "megabots-blanco.webp", "fondo": "#121418", "contacto": true}]};
const LENTO = "<script>(function(){if(window.__cnLento)return;window.__cnLento=1;\nvar E,realInit,realGet,porDom=new Map(),io=null,imprimiendo=false,\nCOLA={setOption:1,on:1,off:1,dispatchAction:1,showLoading:1,hideLoading:1,clear:1};\nfunction vivo(st){if(st.m||st.real)return st.real;st.real=realInit.apply(E,st.a);for(var i=0;i<st.q.length;i++){try{st.real[st.q[i][0]].apply(st.real,st.q[i][1])}catch(e){}}st.q.length=0;var z=null;for(var j=0;j<st.zq.length;j++){try{z=z||st.real.getZr();z[st.zq[j][0]].apply(z,st.zq[j][1])}catch(e){}}st.zq.length=0;if(io)io.unobserve(st.el);return st.real}\nfunction todos(){if(window.__cnLeyTodas){try{window.__cnLeyTodas()}catch(e){}}porDom.forEach(function(st){vivo(st)})}\nfunction lazyInit(dom){if(!dom||imprimiendo||!window.IntersectionObserver||!window.Proxy)return realInit.apply(E,arguments);\nvar prev=porDom.get(dom);if(prev&&!prev.m&&!(prev.real&&prev.real.isDisposed&&prev.real.isDisposed()))return prev.p;\nif(!io)io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){var st=porDom.get(x.target);if(st)vivo(st)}})},{rootMargin:'900px 0px'});\nvar st={el:dom,a:[].slice.call(arguments),q:[],zq:[],over:{},real:null,m:false};\nst.p=new Proxy(st,{set:function(t,k,v){t.over[k]=v;return true},get:function(t,k){\n if(Object.prototype.hasOwnProperty.call(t.over,k))return t.over[k];\n if(k==='dispose')return function(){if(t.real){try{t.real.dispose()}catch(e){}}t.m=true;t.q.length=0;if(io)io.unobserve(t.el);if(porDom.get(t.el)===t)porDom.delete(t.el)};\n if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};\n if(t.real){var v=t.real[k];return typeof v==='function'?v.bind(t.real):v}\n if(k==='getDom')return function(){return t.el};\n if(k==='getZr')return function(){return new Proxy({},{get:function(_,kk){if(t.real){var z=t.real.getZr();var v=z[kk];return typeof v==='function'?v.bind(z):v}if(kk==='on'||kk==='off')return function(){if(!t.m)t.zq.push([kk,[].slice.call(arguments)])};if(kk==='then'||typeof kk==='symbol')return undefined;var r=vivo(t);if(!r)return undefined;var z2=r.getZr();var v2=z2[kk];return typeof v2==='function'?v2.bind(z2):v2}})};\n if(k==='isDisposed')return function(){return t.m};\n if(k==='resize')return function(){};\n if(k==='getOption')return function(){for(var i=t.q.length-1;i>=0;i--)if(t.q[i][0]==='setOption')return t.q[i][1][0];return null};\n if(k==='then'||typeof k==='symbol')return undefined;\n if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};\n var r=vivo(t);if(!r)return undefined;var v2=r[k];return typeof v2==='function'?v2.bind(r):v2}});\nporDom.set(dom,st);io.observe(dom);return st.p}\nfunction lazyGet(dom){var st=porDom.get(dom);if(st&&!st.m)return st.p;return realGet?realGet.apply(E,arguments):undefined}\nfunction parchar(o){if(!o||o.__cnLento||typeof o.init!=='function')return;realInit=o.init;realGet=o.getInstanceByDom;\n try{o.init=lazyInit;o.getInstanceByDom=lazyGet}catch(e){}if(o.init!==lazyInit){try{Object.defineProperty(o,'init',{value:lazyInit,writable:true,configurable:true});Object.defineProperty(o,'getInstanceByDom',{value:lazyGet,writable:true,configurable:true})}catch(e){}}\n try{o.__cnLento=1}catch(e){}}\ntry{Object.defineProperty(window,'echarts',{configurable:true,enumerable:true,get:function(){parchar(E);return E},set:function(v){E=v}})}catch(e){}\naddEventListener('beforeprint',function(){imprimiendo=true;todos()});addEventListener('afterprint',function(){imprimiendo=false});\nvar pr=window.print;window.print=function(){imprimiendo=true;todos();try{return pr.apply(window,arguments)}finally{setTimeout(function(){imprimiendo=false},1500)}};\nwindow.__cnTodos=todos;})();\n// 15-11-2026 (Germán: «optimices bastante más el tiempo de carga»). Medido con una traza del navegador: al cargar, cada gráfico\n// por partido del Congreso escribía su alto y enseguida leía medidas (alto() y mk() de la edición), y eso obligaba al navegador a\n// rearmar la página completa unas 400 veces (4,1 s con CPU 4x). El sitio cambia esas escrituras por __cnDiferir/__cnAlto: se juntan\n// y se aplican de una vez al terminar el script, primero los altos, luego una sola lectura y al final los mínimos. Mismo resultado.\n(function(){var q=null,a=null;\nfunction f(){var Q=q,A=a,i,h=[];q=a=null;\n if(Q)for(i=0;i<Q.length;i++)Q[i][0].style[Q[i][1]]=Q[i][2];\n if(A){for(i=0;i<A.length;i++)h.push(A[i][0].clientHeight);for(i=0;i<A.length;i++)if(h[i]<A[i][1])A[i][0].style.minHeight=A[i][1]+'px'}}\nfunction prog(){if(!q&&!a){if(window.queueMicrotask)queueMicrotask(f);else Promise.resolve().then(f)}}\nwindow.__cnDiferir=function(el,p,v){prog();(q||(q=[])).push([el,p,v])};\nwindow.__cnAlto=function(el,min){prog();(a||(a=[])).push([el,min])};})();\n// 15-11-2026 · votaciones del Congreso plegadas («Ver la votación», cerrada al cargar): el navegador las armaba igual aunque no se\n// vieran (44 mil de los 80 mil elementos de la edición). Ahora se marcan content-visibility:hidden (CSS del sitio) y el gráfico de cada\n// ley se arma recién cuando el lector abre su votación. Al cargar se dejan puestos los altos finales (el mismo cálculo de la edición:\n// alto y mínimo dependen solo del número de partidos), así que nada se mueve al abrir. Al imprimir se arman todos antes.\n(function(){var esperan=null,forzar=false;\nfunction correr(lista){lista.forEach(function(x){try{window.__cnLeyF(x[1],x[2])}catch(e){}})}\nfunction vigilar(det){if(det.__cnVig||!window.MutationObserver)return;det.__cnVig=1;\n new MutationObserver(function(){if(det.classList.contains('cerrada')||!esperan)return;var ya=[],resto=[];\n  esperan.forEach(function(x){(x[3]===det?ya:resto).push(x)});esperan=resto.length?resto:null;correr(ya)}).observe(det,{attributes:true,attributeFilter:['class']})}\nwindow.__cnLeyEspera=function(el,l,li){if(forzar||window.__imp||!el.closest||!window.MutationObserver)return false;\n var det=el.closest('.cg-det.cerrada');if(!det)return false;\n var n=l.partidos.length,h=Math.max(160,28*n+60),dos=l.partidos.some(function(p){return String(p[0]).indexOf('\\n')>=0}),min=n*(dos?42:30)+64;\n el.style.height=h+'px';el.dataset.h=h;if(h<min)el.style.minHeight=min+'px';\n (esperan||(esperan=[])).push([el,l,li,det]);vigilar(det);return true};\nwindow.__cnLeyTodas=function(){if(!esperan)return;var t=esperan;esperan=null;forzar=true;try{correr(t)}finally{forzar=false}};})();</script>";   // 13-11-2026: capa que dibuja cada gráfico de la edición recién cuando el lector llega a él
// 15-11-2026 (Germán: «procura que la Landing Page y el Diario "Cofrade News" cargue mucho más rápido en la Web»): la librería de
// gráficos (ECharts 6.1.0, 1,1 MB y 367 KB comprimida) es idéntica en todas las ediciones desde el 06-11. Medido con un celular
// con 4G lento: servirla aparte en la PRIMERA visita era ~1 s más lento (el navegador se detiene en ella a mitad de la página), y en
// las visitas siguientes ~1 s más rápido. Por eso: la primera visita la recibe dentro de la página, como siempre, y después de cargar
// la deja guardada en el navegador (sin gastar datos si el lector activó el ahorro de datos) y marca la cookie cn_lib; con esa cookie
// las ediciones siguientes la piden aparte y el navegador la toma de su memoria, con la compilación ya hecha. Solo se cambia si los
// primeros 2.048 caracteres son exactamente los de esa versión (huella FNV-1a); si un día la edición trae otra versión, queda dentro.
const ECHARTS_ARCHIVO = "echarts-b66b25ae.js", ECHARTS_PREFIJO = 2048, ECHARTS_HUELLA = 0xab20ba12;
// 15-11-2026 · la letra de títulos (Cormorant Garamond, licencia SIL OFL, sitio/fuentes/OFL.txt) se sirve desde cofrad.es, latín y
// latín extendido (el navegador baja solo lo que la página usa): sin conectarse a fonts.googleapis.com ni fonts.gstatic.com ni esperar su CSS
const FUENTES = "@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url(/f/cormorant-garamond-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-600-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:700;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-700-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:700;font-display:swap;src:url(/f/cormorant-garamond-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-600-italic.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-600-italic.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}";
const ECHARTS_SHA = "b66b25aeb4df84e33199dc21694014d336d222cbd9deb0e5a7c14bd6aa0d0fd0";
// El bloque es idéntico, byte a byte, al archivo oficial dist/echarts.min.js del paquete echarts@6.1.0 (comprobado el 15-11-2026):
// si GitHub no responde, se toma de jsDelivr, y en ambos casos solo se sirve si la huella SHA-256 coincide.
const ECHARTS_FUENTES = [RAW + "sitio/assets/" + ECHARTS_ARCHIVO, "https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"];
const ECHARTS_COOKIE = "cn_lib=" + ECHARTS_ARCHIVO.slice(8, 16);
const conLibreria = (req) => (req.headers.get("Cookie") || "").split(/;\s*/).includes(ECHARTS_COOKIE);
// primera visita: con la página ya cargada (y 3 s de margen para no competir con los gráficos), baja la librería a la memoria del navegador
const GUARDAR_LIBRERIA = `<script>addEventListener('load',function(){setTimeout(function(){try{var c=navigator.connection;if(c&&c.saveData)return;`
  + `fetch('/a/${ECHARTS_ARCHIVO}',{credentials:'same-origin'}).then(function(r){return r.ok?r.arrayBuffer():null}).then(function(b){`
  + `if(b&&b.byteLength>1e6)document.cookie='${ECHARTS_COOKIE};max-age=31536000;path=/;secure;samesite=lax'}).catch(function(){})}catch(e){}},3000)})</script>`;
async function libreriaGraficos(ctx) {
  const cache = caches.default, clave = new Request("https://cache.cofrad.es/a/" + ECHARTS_ARCHIVO);
  const r0 = await cache.match(clave);
  if (r0) return r0;
  for (const u of ECHARTS_FUENTES) {
    try {
      const o = await fetch(u, { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 31536000, "300-599": -1 } } });
      if (!o.ok) continue;
      const b = await o.arrayBuffer();
      const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map((x) => x.toString(16).padStart(2, "0")).join("");
      if (h !== ECHARTS_SHA) continue;
      const r = new Response(b, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
      ctx.waitUntil(cache.put(clave, r.clone()));
      return r;
    } catch { /* siguiente fuente */ }
  }
  return null;
}
function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// 15-11-2026 · el script principal de la edición (empieza con «const D=») se corrige al vuelo en 3 puntos para que los gráficos no
// obliguen a rearmar la página (ver __cnDiferir/__cnAlto en modulos/lento.js). Cada cambio exige el texto exacto; si la Skill
// cambia ese código, no se toca nada y la edición queda como viene. Si los ayudantes no estuvieran, se usa el código original.
const PARCHES_APP = [
  ["el.style.height=h+'px';el.dataset.h=h;const c=mk(l.id,o);",
   "(window.__cnDiferir?__cnDiferir(el,'height',h+'px'):el.style.height=h+'px');el.dataset.h=h;const c=mk(l.id,o);"],
  ["if(el.clientHeight<min)el.style.minHeight=min+'px';",
   "(window.__cnAlto?__cnAlto(el,min):el.clientHeight<min&&(el.style.minHeight=min+'px'));"],
  ["el.style.height=Math.max(140,34*lista.length+40)+'px';mk(id,o);",
   "(window.__cnDiferir?__cnDiferir(el,'height',Math.max(140,34*lista.length+40)+'px'):el.style.height=Math.max(140,34*lista.length+40)+'px');mk(id,o);"],
  // el gráfico de cada ley del Congreso plegada espera a que el lector abra su votación (ver __cnLeyEspera en modulos/lento.js)
  ["LY.forEach((l,li)=>{const el=document.getElementById(l.id);if(!l.partidos.length||!el)return;",
   "LY.forEach(window.__cnLeyF=(l,li)=>{const el=document.getElementById(l.id);if(!l.partidos.length||!el)return;if(window.__cnLeyEspera&&__cnLeyEspera(el,l,li))return;"],
  // las filas de pestañas se ordenan cuando el navegador ya las midió (ResizeObserver avisa al empezar), no 12 veces mientras carga
  ["todas.push(upd);if(window.ResizeObserver)new ResizeObserver(upd).observe(g);upd();});",
   "todas.push(upd);if(window.ResizeObserver)new ResizeObserver(upd).observe(g);else upd();});"],
];
const COLA_APP = Math.max(...PARCHES_APP.map(([a]) => a.length)) - 1;
const parchearApp = (x) => { for (const [a, b] of PARCHES_APP) if (x.includes(a)) x = x.split(a).join(b); return x; };
function scriptsEdicion(lib) {
  let buf = "", cola = "", modo = "pasar";
  const salidaApp = (t, x) => {   // corrige y deja guardados los últimos caracteres por si un patrón queda partido entre dos trozos
    const s2 = parchearApp(cola + x);
    if (t.lastInTextNode) { cola = ""; if (s2) t.before(s2, { html: true }); return; }
    const corte = Math.max(0, s2.length - COLA_APP);
    cola = s2.slice(corte);
    if (corte) t.before(s2.slice(0, corte), { html: true });
  };
  return {
    element() { buf = ""; cola = ""; modo = "decidir"; },
    text(t) {
      if (modo === "pasar") return;
      if (modo === "quitar") { t.remove(); return; }
      const x = t.text; t.remove();
      if (modo === "app") { salidaApp(t, x); return; }
      buf += x;   // decidir: se miran los primeros 2.048 caracteres
      if (buf.length < ECHARTS_PREFIJO && !t.lastInTextNode) return;
      const b = buf; buf = "";
      if (b.startsWith("\nconst D=")) { modo = "app"; salidaApp(t, b); return; }
      if (lib && b.length >= ECHARTS_PREFIJO && fnv1a(b.slice(0, ECHARTS_PREFIJO)) === ECHARTS_HUELLA) {
        modo = "quitar";
        t.before(`</script><script src="/a/${ECHARTS_ARCHIVO}"></script><script>window.echarts||document.write('<script src="/a/${ECHARTS_ARCHIVO}?r=2"><\\/script>')</script><script>`, { html: true });
        return;
      }
      modo = "pasar"; t.before(b, { html: true });
    },
  };
}
const TZ = "America/Santiago";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlSegura = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#");

function fechaChile(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // AAAA-MM-DD
}
let _FMT_LARGA = null;   // 14-11-2026 (auditoría): un solo formateador; crear uno por fecha costaba ~20 ms de CPU con 400 ediciones
function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 15));
  _FMT_LARGA = _FMT_LARGA || new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const t = _FMT_LARGA.format(f);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function num(v, dec = 2) {
  return new Intl.NumberFormat("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
function pct(v) {
  if (typeof v !== "number" || !isFinite(v)) return "";
  const s = (v > 0 ? "+" : v < 0 ? "−" : "") + num(Math.abs(v), 2) + " %";
  return `<span class="var ${v > 0 ? "sube" : v < 0 ? "baja" : ""}">${s}</span>`;
}

const SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
// 13-11-2026: el captcha del Buzón (Cloudflare Turnstile) necesita su script y su recuadro desde challenges.cloudflare.com.
const csp = ({ script = "", frame = "" } = {}) => "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; "
  + `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${script}; connect-src 'self'; frame-src https://challenges.cloudflare.com${frame}; `
  + "frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://script.google.com";
const CSP_PORTADA = csp();

// 13-11-2026: /mercados muestra widgets de TradingView (gratis con su marca visible); solo esa página los permite.
const CSP_MERCADOS = csp({ script: " https://s3.tradingview.com", frame: " https://www.tradingview-widget.com https://s.tradingview.com https://*.tradingview.com" });
function html(cuerpo, status = 200, extra = {}, csp = CSP_PORTADA) {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": csp, "X-Frame-Options": "DENY", ...SEGURIDAD, ...extra },
  });
}

// ---------- lectura del repositorio con caché del borde (rápido y sin abusar de GitHub) ----------
// 15-11-2026 · «frescura» (solo ediciones): la copia guardada se entrega al tiro aunque tenga más de esos segundos, y por detrás se
// trae la versión de GitHub para el próximo lector (stale-while-revalidate). Antes, pasados 10 minutos, el primer lector esperaba
// la descarga completa desde GitHub (448 ms antes del primer byte, medido en producción el 15-11).
async function desdeGitHub(ruta, segundos, ctx, completa = null, frescura = 0) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/" + ruta);
  const r = await cache.match(clave);
  if (r) {
    if (frescura && Date.now() - Number(r.headers.get("X-Cn-Guardado") || 0) > frescura * 1000)
      ctx.waitUntil(traerGitHub(clave, ruta, segundos, completa, frescura).then((x) => x && x.body && x.body.cancel()).catch(() => {}));
    return r;
  }
  return await traerGitHub(clave, ruta, segundos, completa, frescura, ctx);
}
async function traerGitHub(clave, ruta, segundos, completa, frescura, ctx = null) {
  // 14-11-2026 (auditoría): solo se guardan las respuestas buenas. Un release responde 302 hacia una dirección firmada que vence en
  // ~1 hora; con cacheTtl se guardaba también el 302 y al día siguiente la edición completa daba 403.
  const o = await fetch(completa || RAW + ruta, { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": segundos, "300-599": -1 } } });
  if (!o.ok) return null;
  const r = new Response(o.body, { headers: { "Cache-Control": `public, max-age=${frescura ? 2592000 : segundos}`, "X-Cn-Guardado": String(Date.now()) } });
  if (ctx) { ctx.waitUntil(caches.default.put(clave, r.clone())); return r; }
  await caches.default.put(clave, r.clone());   // por detrás: se guarda y la copia sobrante se descarta
  return r;
}

async function existeEdicion(f) {
  for (const completa of [true, false]) {   // primero la completa; si no está, la liviana
    try {
      const r = await fetch(rutaEdicion(f, completa), { method: "HEAD" });
      if (r.ok) return true;
    } catch { /* sigue */ }
  }
  return false;
}

// 14-11-2026: el índice lo escribe GitHub (datos/ediciones.json, con cada edición y varias veces al día): UNA lectura en vez de
// 60 a 120. Con el plan gratuito, sobre 50 lecturas por visita las demás fallaban y la edición del 11-11 no salía en el Archivo.
// Los 3 últimos días se confirman igual (la edición de hoy puede llegar antes que el índice); sin índice, se buscan 20 días.
async function indice(ctx) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/indice-ediciones-v2");
  const c = await cache.match(clave);
  if (c) return c.json();
  let lista = [];
  try {
    const r = await fetch(RAW + "datos/ediciones.json", { cf: { cacheTtl: 300, cacheEverything: true } });
    if (r.ok) {
      const j = await r.json();
      lista = (Array.isArray(j && j.ediciones) ? j.ediciones : []).map((x) => (typeof x === "string" ? x : x && x.f)).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f)));
    }
  } catch { /* respaldo abajo */ }
  const hoy = new Date();
  const recientes = Array.from({ length: lista.length ? 3 : DIAS_ARCHIVO }, (_, i) => fechaChile(new Date(hoy.getTime() - i * 86400000)));
  const nuevas = await Promise.all(recientes.filter((f) => !lista.includes(f)).map(async (f) => ((await existeEdicion(f)) ? f : null)));
  const tope = fechaChile();
  const conIndice = lista.length > 0;
  lista = [...new Set([...lista, ...nuevas.filter(Boolean)])].filter((f) => f <= tope).sort().reverse().slice(0, TOPE_ARCHIVO);
  // sin el índice de GitHub (respaldo de 20 días) se guarda solo 1 minuto: apenas vuelva el índice, el Archivo vuelve a estar completo
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(lista), { headers: { "Cache-Control": `public, max-age=${conIndice ? 900 : 60}` } })));
  return lista;
}

async function pulso(ctx) {
  try {
    const r = await desdeGitHub("datos/pulso.json", 300, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}

// ---------- inglés (13-11-2026): lo que cambia cada 2 horas se traduce aquí, con Workers AI (binding «AI»), y queda en caché ----------
const AIRE_EN = { "Bueno": "Good", "Regular": "Moderate", "Moderado": "Moderate", "Malo": "Poor", "Alerta": "Alert", "Preemergencia": "Pre-emergency",
  "Emergencia": "Emergency", "Dañino para grupos sensibles": "Unhealthy for sensitive groups", "Dañino": "Unhealthy", "Muy dañino": "Very unhealthy", "Peligroso": "Hazardous" };
const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
function textos(h) {
  const out = new Set();
  for (const m of h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").matchAll(/>([^<]+)</g)) {
    const t = m[1].replace(/&(amp|lt|gt|quot|#39);/g, (x) => ENT[x]).trim();
    if (t && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(t) && !t.startsWith("·") && !/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo), \d+ de \S+ de \d{4}$/.test(t) && t.length <= 400 && EN_FIJO[t] === undefined) out.add(t);
  }
  return [...out];
}
const RUMBO_EN = { N: "N", S: "S", E: "E", O: "W", NE: "NE", NO: "NW", SE: "SE", SO: "SW", NNE: "NNE", NNO: "NNW", ENE: "ENE", ESE: "ESE", SSE: "SSE", SSO: "SSW", ONO: "WNW", OSO: "WSW" };
function enFijo(t) {   // reglas sin IA para las frases con números
  let m = t.match(/^Actualizado a las (\d\d:\d\d)(?: · próxima actualización (\d\d:\d\d))?\. (.+)$/);
  if (m) return `Updated at ${m[1]}${m[2] ? ` · next update ${m[2]}` : ""}. ` + (EN_FIJO[m[3]] || m[3]);
  if ((m = t.match(/^Sismo mayor 24 h · (\d+) sobre M 2,5$/))) return `Largest earthquake in 24 h · ${m[1]} above M 2.5`;
  if ((m = t.match(/^(.+) · cierre (\d\d-\d\d)$/))) return `${EN_FIJO[m[1]] || m[1]} · close ${m[2]}`;
  if ((m = t.match(/^(.+) · (\d\d-\d\d-\d{4})$/)) && EN_FIJO[m[1]]) return `${EN_FIJO[m[1]]} · ${m[2]}`;
  if ((m = t.match(/^([+−-]?[\d.,]+ %) en un mes$/))) return `${m[1]} over one month`;
  if ((m = t.match(/^(\d+) km al ([NSEO]{1,3}) de (.+?)( · \d\d:\d\d)?$/)) && RUMBO_EN[m[2]]) return `${m[1]} km ${RUMBO_EN[m[2]]} of ${m[3]}${m[4] || ""}`;
  if ((m = t.match(/^Aire · (.+)$/))) return `Air · ${m[1]}`;
  if ((m = t.match(/^ICA (\d+) · (.*)$/))) return `AQI ${m[1]} · ${m[2]}`;
  if (AIRE_EN[t]) return AIRE_EN[t];
  return null;
}
async function huella(t) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// 14-11-2026 (Germán: «muchos textos no se están traduciendo»): /en.json caía. Cada frase leía y escribía la caché del borde y el plan
// gratuito permite 50 de esas lecturas por visita (los titulares son ~90): la excepción botaba /en.json y la portada quedaba en español.
// Ahora: memoria de traducciones en D1 (una consulta cada 90 frases), hasta 40 frases nuevas por visita con Workers AI, y la página
// pide el resto en unos segundos (__faltan). Nunca devuelve error: en el peor caso, {}.
const MAX_IA = 40;
async function traducirIA(t, env) {
  try {
    let en = "";
    if (env.AI) {
      const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text: t, source_lang: "es", target_lang: "en" });
      en = r && typeof r.translated_text === "string" ? r.translated_text.trim() : "";
    } else if (env.AI_PRUEBA) {   // solo en el arnés de pruebas (Miniflare)
      en = (await (await env.AI_PRUEBA.fetch("https://ia.prueba/", { method: "POST", body: t })).text()).trim();
    }
    return en || null;
  } catch { return null; }
}
async function traduccionesPortada(env, ctx) {
  const { cuerpo, p } = await cuerpoPortada(ctx);
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/en-portada-v2/" + encodeURIComponent((p && p.generado) || "sin-pulso") + "/" + fechaChile());
  const c = await cache.match(clave);
  if (c) return c.json();
  const res = {};
  const paraIA = [];
  for (const t of textos(cuerpo)) {
    const f = enFijo(t);
    if (f !== null) res[t] = f;
    else if (/[a-záéíóúñ]{2}/.test(t)) paraIA.push(t);   // cifras como «US$6,30» o siglas no se mandan a traducir
  }
  if (paraIA.length && env.DB) {
    try {
      for (let i = 0; i < paraIA.length; i += 90) {
        const parte = paraIA.slice(i, i + 90);
        const r = await env.DB.prepare(`SELECT es, en FROM traducciones WHERE es IN (${parte.map(() => "?").join(",")})`).bind(...parte).all();
        for (const x of (r && r.results) || []) if (x && x.en) res[x.es] = x.en;
      }
    } catch { /* sin la tabla: se sigue con la IA */ }
  }
  const pendientes = paraIA.filter((t) => res[t] === undefined).slice(0, MAX_IA);
  const nuevas = [];
  for (let i = 0; i < pendientes.length; i += 6) {   // de a 6 a la vez, sin saturar
    const parte = pendientes.slice(i, i + 6);
    const tr = await Promise.all(parte.map((t) => traducirIA(t, env)));
    parte.forEach((t, k) => { if (tr[k]) { res[t] = tr[k]; nuevas.push([t, tr[k]]); } });
  }
  if (nuevas.length && env.DB) {
    try {
      const ahora = new Date().toISOString();
      const st = env.DB.prepare("INSERT OR REPLACE INTO traducciones (es, en, creado) VALUES (?, ?, ?)");
      await env.DB.batch(nuevas.map(([es, en]) => st.bind(es, en, ahora)));
    } catch { /* la próxima visita las vuelve a pedir */ }
  }
  const faltan = paraIA.filter((t) => res[t] === undefined).length;
  if (!faltan) ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(res), { headers: { "Cache-Control": "public, max-age=7200" } })));
  else if (!nuevas.length) ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(res), { headers: { "Cache-Control": "public, max-age=600" } })));   // la IA no responde: se reintenta en 10 minutos
  else res.__faltan = faltan;   // avanzó: la página vuelve a pedir en 2,5 segundos
  return res;
}

// ---------- formulario de publicidad (13-11-2026): el sitio lo recibe y lo pasa al receptor de Germán (Apps Script) ----------
async function contacto(req, ctx) {
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEGURIDAD } });
  const origen = req.headers.get("Origin") || "";
  if (origen && !/^https:\/\/(www\.)?cofrad\.es$/.test(origen)) return j({ ok: false, error: "Origen no permitido." }, 403);
  const f = await req.formData().catch(() => null);
  if (!f) return j({ ok: false, error: "Formulario vacío." }, 400);
  const v = (k, n) => String(f.get(k) || "").trim().slice(0, n);
  if (v("sitio_web", 200)) return j({ ok: true });   // trampa para robots: se descarta en silencio
  const d = { interes: v("interes", 80) || "Cofrade News", nombre: v("nombre", 80), empresa: v("empresa", 80), email: v("email", 120),
    telefono: v("telefono", 20), prefiere: v("prefiere", 20), mensaje: v("mensaje", 1000), acepto: v("acepto", 4) };
  if (!d.nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !d.mensaje) return j({ ok: false, error: "Complete nombre, un email válido y su mensaje." }, 400);
  if (d.acepto !== "si") return j({ ok: false, error: "Debe aceptar el uso de sus datos para que podamos responderle." }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x";
  const cache = caches.default;
  const freno = new Request("https://cache.cofrad.es/contacto/" + (await huella(ip)));
  if (await cache.match(freno)) return j({ ok: false, error: "Ya recibimos un mensaje suyo hace un momento. Intente de nuevo en un minuto." }, 429);
  ctx.waitUntil(cache.put(freno, new Response("1", { headers: { "Cache-Control": "public, max-age=60" } })));
  try {
    const r = await fetch(FORMULARIO, { method: "POST", body: new URLSearchParams({ ...d, origen: "www.cofrad.es" }), redirect: "follow" });
    if (r.status >= 400) return j({ ok: false, error: "No se pudo enviar. Intente de nuevo en un momento." }, 502);
    return j({ ok: true });
  } catch { return j({ ok: false, error: "No se pudo enviar. Intente de nuevo en un momento." }, 502); }
}

// ---------- área de socios: clave compartida, cookie firmada (HMAC-SHA256) ----------
async function firma(texto, secreto) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
async function esSocio(req, env) {
  if (!env.SOCIOS_CLAVE) return false;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)cn_socio=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return iguales(m[2], await firma("socio|" + m[1], env.SOCIOS_CLAVE));
}

// ---------- páginas ----------
const CSS = `
:root{--tinta:#0B1F3A;--tinta2:#23395B;--oro:#B8892B;--oro-t:#8A6416;--papel:#FBF8F1;--linea:#DDD3BF;--gris:#5B6472;--verde:#1E7B4F;--rojo:#B3261E;--card:#FFFFFF;
--serif:'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;--sans:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--tinta:#E9EEF6;--tinta2:#C9D3E3;--papel:#0E1522;--linea:#2A3547;--gris:#9AA6B8;--card:#152033;--oro:#D9AE52;--oro-t:#D9AE52;--verde:#4CC38A;--rojo:#F2867E}}
:root[data-theme=dark]{--tinta:#E9EEF6;--tinta2:#C9D3E3;--papel:#0E1522;--linea:#2A3547;--gris:#9AA6B8;--card:#152033;--oro:#D9AE52;--oro-t:#D9AE52;--verde:#4CC38A;--rojo:#F2867E}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--papel);color:var(--tinta);font:17px/1.6 var(--sans)}
a{color:inherit}.hoja{max-width:1120px;margin:0 auto;padding:0 16px}
.cab{border-bottom:3px double var(--linea)}.cab .hoja{display:flex;align-items:center;gap:14px;padding-top:14px;padding-bottom:10px;flex-wrap:wrap}
.marca{display:flex;align-items:center;gap:12px;text-decoration:none}.marca img{width:52px;height:52px}
.marca b{font:600 clamp(26px,5vw,38px)/1 var(--serif);letter-spacing:.2px}.fecha{color:var(--gris);font-size:14px}
.l-oscuro{display:none}:root[data-theme=dark] .l-claro{display:none}:root[data-theme=dark] .l-oscuro{display:inline}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .l-claro{display:none}:root:not([data-theme=light]) .l-oscuro{display:inline}}
nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}nav a,.tema,.nav-b{font:14px var(--sans);text-decoration:none;padding:8px 10px;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:inherit;cursor:pointer}
nav a:hover,.tema:hover,.nav-b:hover{background:var(--card)}.herr{display:flex;gap:4px;align-items:center}
.nav-b{font-weight:600;color:var(--oro-t)}.nav-b svg{flex:none}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
.portada{display:grid;grid-template-columns:1.25fr 1fr;gap:40px;padding:44px 0 28px;align-items:center}
.kicker{font:600 13px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t)}
h1{font:600 clamp(32px,5.4vw,56px)/1.06 var(--serif);margin:12px 0 16px;text-wrap:balance}
.lede{font-size:19px;color:var(--tinta2);max-width:36em}
.acciones{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.btn{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;font-weight:600;text-decoration:none;transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s}
.btn.oro{background:var(--oro);color:#1A1406;box-shadow:0 6px 18px -8px rgba(184,137,43,.8)}.btn.oro:hover{transform:translateY(-1px)}.btn.oro:active{transform:translateY(0)}
.btn.linea{border:1.5px solid var(--linea)}.btn.linea:hover{border-color:var(--oro)}
.tarjeta{background:var(--card);border:1px solid var(--linea);border-radius:18px;padding:22px}
.edicion h2{font:600 24px/1.2 var(--serif);margin:6px 0 10px}.edicion ul{margin:12px 0 0;padding:0;list-style:none;columns:2;column-gap:20px;font-size:14px;color:var(--gris)}
.edicion li{break-inside:avoid;padding:3px 0}.edicion li::before{content:"·";color:var(--oro);margin-right:6px}
section{padding:28px 0;border-top:1px solid var(--linea)}h3{font:600 26px/1.2 var(--serif);margin:0 0 4px}.sub{color:var(--gris);font-size:14px;margin:0 0 18px}
.vivo{display:inline-flex;align-items:center;gap:6px}.vivo::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--rojo);animation:latido 2s infinite}
@keyframes latido{0%,100%{opacity:1}50%{opacity:.25}}@media (prefers-reduced-motion:reduce){.vivo::before{animation:none}.btn{transition:none}}
.cifras{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.cifra{background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:12px 14px}.cifra small{display:block;color:var(--gris);font-size:12.5px}
.cifra b{font:600 21px/1.3 var(--serif);font-variant-numeric:tabular-nums}
.tabla-vis{width:100%;border-collapse:collapse;font-size:15px;font-variant-numeric:tabular-nums}.tabla-vis th,.tabla-vis td{padding:7px 10px;border-bottom:1px solid var(--linea);text-align:right;white-space:nowrap}
.tabla-vis th{font-size:13px;color:var(--gris);font-weight:600}.tabla-vis th:first-child,.tabla-vis td:first-child{text-align:left}.tabla-vis th[colspan]{text-align:center}
.tabla-vis td:first-child{font-variant-numeric:normal}.cifras.c4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.dos.d2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
@media (max-width:560px){.tabla-vis{font-size:14px}.tabla-vis th,.tabla-vis td{padding:6px 7px}.tabla-vis th:first-child,.tabla-vis td:first-child{position:sticky;left:0;z-index:1;background:var(--card);box-shadow:1px 0 0 var(--linea)}}.var{font-size:13px;margin-left:4px}.sube{color:var(--verde)}.baja{color:var(--rojo)}
.cifra a{font-size:12px;color:var(--gris)}
.dos{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
.titulares h4{font:600 13px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--oro-t);margin:0 0 8px}
.titulares ol{margin:0;padding-left:18px}.titulares li{margin:0 0 9px;font-size:15.5px;line-height:1.45}.titulares li a{text-decoration:none}.titulares li a:hover{text-decoration:underline}
.titulares .m{color:var(--gris);font-size:12.5px;white-space:nowrap}
.archivo{display:flex;flex-wrap:wrap;gap:8px}.archivo a{border:1px solid var(--linea);border-radius:999px;padding:10px 14px;text-decoration:none;font-size:14px;min-height:44px;display:inline-flex;align-items:center}
.archivo a:hover{border-color:var(--oro)}.archivo a[hidden]{display:none}
.arch-pie{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;margin-top:12px}.arch-pie[hidden]{display:none}
.arch-mas{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 2px;background:none;border:0;border-radius:0;cursor:pointer;
color:var(--oro-t);font:600 12.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;box-shadow:inset 0 -1px 0 color-mix(in srgb,var(--oro) 45%,transparent);transition:box-shadow .2s,color .2s}
.arch-mas:hover{box-shadow:inset 0 -2px 0 var(--oro)}.arch-mas svg{flex:none;transition:transform .28s cubic-bezier(.2,.7,.2,1)}.arch-mas.abierto svg{transform:rotate(180deg)}
.am-cuenta{font-size:13px;color:var(--gris);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.arch-mas,.arch-mas svg{transition:none}}
.socios{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:center}
.precio{font:600 30px/1 var(--serif);color:var(--oro-t)}
.pie{color:var(--gris);font-size:13.5px;padding:26px 0 40px;border-top:3px double var(--linea)}
.aviso{color:var(--gris);font-size:14px}
form.clave{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}form.clave input{flex:1 1 220px;min-height:48px;border-radius:12px;border:1.5px solid var(--linea);padding:0 14px;font-size:17px;background:var(--card);color:var(--tinta)}
form.clave button{min-height:48px;border-radius:999px;border:0;background:var(--oro);color:#1A1406;font-weight:600;padding:0 22px;cursor:pointer}
.idioma{font-weight:700;letter-spacing:.06em;border:1.5px solid var(--linea)!important;border-radius:999px!important;padding:8px 12px!important}
.idioma:hover{border-color:var(--oro)!important}
button.btn{border:0;cursor:pointer;font:inherit;font-weight:600}
.dlg-pub{border:none;border-radius:16px;padding:0;max-width:520px;width:calc(100% - 24px);background:var(--card);color:var(--tinta);box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}
.dlg-pub::backdrop{background:rgba(5,12,24,.6)}.pub-form{padding:24px;display:flex;flex-direction:column;gap:10px;position:relative}
.pub-form h3{margin:0 34px 0 0}.pub-form label{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600}
.pub-form input,.pub-form select,.pub-form textarea{font:16px var(--sans);padding:10px;border:1.5px solid var(--linea);border-radius:10px;background:var(--papel);color:var(--tinta)}
.pub-form .pub-ok{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400}.pub-form .pub-ok input{margin-top:3px}
.pub-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.pub-cerrar{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:1px solid var(--linea);background:none;color:inherit;cursor:pointer;font-size:16px}
.pub-enviar{min-height:48px;border-radius:999px;border:0;background:var(--oro);color:#1A1406;font-weight:700;font-size:16px;cursor:pointer}.pub-enviar:disabled{opacity:.6;cursor:wait}
.pub-estado{min-height:1.4em;margin:0;font-weight:600}
.marcas{padding:22px 0 8px;border-top:1px solid var(--linea)}.marcas h4{font:600 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t);margin:0 0 12px;text-align:center}
.cinta{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.pista{display:flex;gap:18px;width:max-content;animation:cinta 28s linear infinite}.cinta:hover .pista,.cinta:focus-within .pista{animation-play-state:paused}
@keyframes cinta{to{transform:translateX(calc(-50% - 9px))}}
.marca-a{display:flex;align-items:center;gap:10px;height:72px;min-width:190px;justify-content:center;padding:0 22px;border-radius:14px;border:1px solid var(--linea);background:var(--mf);color:var(--mc);text-decoration:none;cursor:pointer;font:700 17px var(--sans)}
.marca-a img{max-height:40px;max-width:170px;width:auto;height:auto;display:block}.marca-a:hover{border-color:var(--oro)}
@media (prefers-reduced-motion:reduce){.pista{animation:none;flex-wrap:wrap;justify-content:center;width:auto}.pista [aria-hidden=true]{display:none}}
/* 13-11-2026 · portada de lujo: noche azul, oro y marfil; tipografía Cormorant Garamond; escudo de la Cofradía como marca de agua */
:root{--noche:#06121F;--noche2:#0B1F3A;--marfil:#F6F1E6;--oro-l:#E6C77A;--display:'Cormorant Garamond','Iowan Old Style','Palatino Linotype',Georgia,serif}
.lujo{position:relative;overflow:hidden;background:radial-gradient(1200px 520px at 78% 30%,#12305a 0%,var(--noche2) 46%,var(--noche) 100%);color:var(--marfil);border-bottom:1px solid rgba(230,199,122,.28)}
.lujo::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0,rgba(230,199,122,.35) 50%,transparent 100%) top/100% 1px no-repeat,
 repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 120px);pointer-events:none}
.agua{position:absolute;right:-90px;top:50%;width:min(660px,62vw);transform:translateY(-50%);opacity:.075;pointer-events:none;user-select:none}
.lujo-in{position:relative;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center;padding:64px 16px 58px}
.lujo .kicker{color:var(--oro-l)}.lujo h1{font:600 clamp(38px,6vw,68px)/1.02 var(--display);letter-spacing:-.4px;color:#FFFDF8;margin:14px 0 18px}
.lujo h1 em{font-style:italic;color:var(--oro-l)}.lujo .lede{color:#D8D2C4;font-size:19px}
.btn.claro{border:1px solid rgba(230,199,122,.55);color:var(--marfil)}.btn.claro:hover{background:rgba(230,199,122,.08)}
.sellos{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;padding:0;margin:26px 0 0;font-size:13.5px;color:#BFB7A6;letter-spacing:.03em}
.sellos li::before{content:"◆";color:var(--oro-l);font-size:9px;margin-right:8px;vertical-align:2px}
.pizarra{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(230,199,122,.32);border-radius:20px;padding:22px 22px 16px;
 box-shadow:0 30px 80px -30px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(6px)}
.piz-cab{display:flex;justify-content:space-between;align-items:center;font:600 12px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--oro-l);margin-bottom:10px}
.piz-cab span{color:#9FB0C6;letter-spacing:.06em;text-transform:none;font-weight:500}
.piz-fila{display:grid;grid-template-columns:1fr 150px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid rgba(230,199,122,.14)}
.piz-fila small{display:block;color:#AFB9C8;font-size:12.5px;letter-spacing:.02em}.piz-fila b{font:600 27px/1.15 var(--display);color:#FFFDF8;font-variant-numeric:tabular-nums}
.piz-fila .var{font-size:12.5px;margin-left:6px;white-space:nowrap}.piz-fila .nw{white-space:nowrap}.piz-fila svg{width:150px;height:46px;display:block}
.lujo .sube{color:#7DDBA6}.lujo .baja{color:#F4A39C}
.piz-pie{font-size:11.5px;color:#8E9AAB;margin-top:8px}
.secc{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.sec-card{position:relative;background:var(--card);border:1px solid var(--linea);border-radius:16px;padding:18px 18px 16px;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start;
 transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .2s}
.sec-card:hover{transform:translateY(-2px);border-color:var(--oro);box-shadow:0 14px 34px -22px rgba(11,31,58,.45)}
.sec-card svg{width:44px;height:44px;color:var(--oro-t)}.sec-card b{display:block;font:600 19px/1.2 var(--display);margin-bottom:3px}.sec-card p{margin:0;font-size:13.5px;color:var(--gris);line-height:1.45}
.titulo-lujo{font:600 clamp(28px,3.6vw,40px)/1.1 var(--display);margin:0 0 6px;letter-spacing:-.2px}
/* 15-11-2026 (Germán: «que se vea más armónico y compacto, hay muchos espacios entremedio»): filas justificadas. Cada tarjeta crece
   en proporción al ancho/alto de su imagen (--r): en una fila todas las imágenes quedan de la MISMA altura y la fila llena el ancho,
   sin huecos. Bajo 900 px: dos columnas con marcos iguales; bajo 600 px: una columna. */
.galeria{display:grid;gap:16px}.g-fila{display:flex;gap:16px;align-items:stretch}
.cab .fecha{display:none}
.galeria figure{--p:10px;box-sizing:border-box;flex:var(--r) 1 0;min-width:0;margin:0;background:#FBF8F1;border:1px solid var(--linea);border-radius:16px;padding:var(--p);box-shadow:0 18px 40px -30px rgba(11,31,58,.5);position:relative;display:flex;flex-direction:column}
.galeria figure::after{content:"";position:absolute;inset:6px;border:1px solid rgba(184,137,43,.28);border-radius:12px;pointer-events:none}
.galeria img{width:100%;height:auto;aspect-ratio:var(--r);object-fit:contain;display:block;border-radius:8px;background:var(--f,#fff)}.galeria figcaption{font-size:13px;line-height:1.4;color:#5B6472;padding:9px 4px 1px}
.galeria figcaption b{display:block;font:600 17px/1.2 var(--display);color:#0B1F3A}
@media (max-width:899px){.galeria{grid-template-columns:1fr 1fr;gap:14px}.g-fila{display:contents}.galeria img{aspect-ratio:4/3}}
@media (max-width:600px){.galeria{grid-template-columns:1fr}.galeria img{aspect-ratio:var(--r);max-height:420px}}
.puente{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--noche2),var(--noche));color:var(--marfil);border-radius:24px;padding:44px 36px;margin:34px 0;border:1px solid rgba(230,199,122,.3)}
.puente .agua{right:-140px;width:520px;opacity:.06}.puente .kicker{color:var(--oro-l)}.puente h2{font:600 clamp(30px,4vw,46px)/1.05 var(--display);color:#FFFDF8;margin:10px 0 10px}
.puente p.lede{color:#D8D2C4;max-width:44em}
.pilares{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:22px 0}
.pilar{border:1px solid rgba(230,199,122,.22);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.03)}
.pilar b{display:block;font:600 18px/1.2 var(--display);color:var(--oro-l);margin-bottom:4px}.pilar span{font-size:13.5px;color:#C9C2B3;line-height:1.45}
.precio-lujo{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 18px;margin:8px 0 18px}
.precio-lujo .monto{font:600 46px/1 var(--display);color:#FFFDF8}.precio-lujo .monto small{font-size:17px;color:#BFB7A6;font-family:var(--sans)}
.precio-lujo .extra{font-size:14px;color:#D8D2C4}.legal{font-size:12px;color:#8E9AAB;margin:14px 0 0;max-width:60em}
.pie-agua{display:block;width:64px;height:64px;margin:0 0 10px;opacity:.85}
@media (max-width:980px){.lujo-in{grid-template-columns:1fr;gap:30px;padding:44px 16px}.agua{width:520px;right:-180px;top:30%}}
/* 15-11-2026 (Germán: «estandarizar el largo de los 3 botones de la portada»): los tres miden lo mismo en todo tamaño de pantalla;
   en el celular van uno bajo otro a todo el ancho y desde 601 px en dos columnas iguales */
.lujo .acciones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-width:36rem}
.lujo .acciones .btn{justify-content:center;text-align:center;padding:0 14px;white-space:nowrap}
@media (max-width:600px){.lujo .acciones{grid-template-columns:minmax(0,1fr);max-width:none}}
/* 15-11-2026, 11:58 (Germán: «al verlos con la pantalla horizontal deberían quedar los 3 botones horizontalmente en una misma línea»):
   celular horizontal y tablet (601 a 980 px, portada en una columna): los 3 en una fila, iguales; la letra baja un poco solo si hace falta */
@media (min-width:601px) and (max-width:980px){.lujo .acciones{grid-template-columns:repeat(3,minmax(0,1fr));max-width:none}.lujo .acciones .btn{padding:0 8px;font-size:clamp(13px,2.25vw,17px)}}
/* 15-11-2026: en celulares de 320 a 375 px la pizarra (cifra grande + gráfico de 150 px) ensanchaba la columna a 362 px y la portada
   se cortaba por la derecha (título y texto incluidos). La columna ya no pasa del ancho de la pantalla y la pizarra se ajusta */
@media (max-width:980px){.lujo-in{grid-template-columns:minmax(0,1fr)}.piz-fila .var{display:block;margin:2px 0 0}}
@media (max-width:420px){.pizarra{padding:18px 16px 14px}.piz-fila{grid-template-columns:minmax(0,1fr) 104px;gap:10px}.piz-fila svg{width:104px;height:40px}.piz-fila b{font-size:24px}.piz-fila small{font-size:12px}}
@media (max-width:820px){.portada,.socios{grid-template-columns:1fr;gap:22px}.portada{padding-top:26px}nav{margin-left:0;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}nav a{white-space:nowrap}.edicion ul{columns:1}}
/* 13-11-2026 · cabecera fija (Germán: «el header debe mantenerse fijo, para que siempre esté visible») */
html{scroll-padding-top:calc(var(--alto-cab,112px) + 12px)}
.cab{position:sticky;top:0;z-index:60;background:rgba(251,248,241,.95);-webkit-backdrop-filter:saturate(1.3) blur(10px);backdrop-filter:saturate(1.3) blur(10px)}
:root[data-theme=dark] .cab{background:rgba(14,21,34,.95)}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .cab{background:rgba(14,21,34,.95)}}
.cab.pegado{box-shadow:0 14px 30px -22px rgba(6,18,31,.6)}
@media (max-width:1000px){.cab .hoja{padding-top:8px;padding-bottom:4px;gap:2px 10px}.marca img{width:42px;height:42px}.marca b{font-size:27px}
 .herr{order:1;margin-left:auto}nav{order:2;margin-left:0;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
 nav::-webkit-scrollbar{display:none}nav.mas{-webkit-mask-image:linear-gradient(90deg,#000 80%,transparent);mask-image:linear-gradient(90deg,#000 80%,transparent)}
 nav a,.nav-b{white-space:nowrap;padding:8px 9px}}
@media print{.cab{position:static;box-shadow:none}}
/* 13-11-2026 · Buzón de sugerencias en tres pasos */
.dlg-buzon{max-width:680px}.dlg-buzon [hidden]{display:none!important}.buzon-fin{padding:0 34px}.dlg-buzon .pub-form{max-height:min(90vh,900px);overflow:auto;gap:12px}
.pasos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:2px 40px 0 0}.pasos i{height:4px;border-radius:4px;background:var(--linea)}.pasos i.si{background:var(--oro)}
.pub-form fieldset{border:1px solid var(--linea);border-radius:14px;padding:12px 14px 14px;margin:0 0 10px}.pub-form legend{font-weight:700;font-size:15px;padding:0 6px}
.ayuda{display:block;font-weight:400;color:var(--gris);font-size:12.5px;margin:0 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}.pub-form .chip{position:relative;display:inline-flex;flex-direction:row;font-weight:500;gap:0}
.chip input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.chip span{display:inline-flex;align-items:center;min-height:44px;padding:8px 15px;border:1.5px solid var(--linea);border-radius:999px;font-size:14.5px;cursor:pointer;user-select:none;background:var(--papel)}
.chip span:hover{border-color:var(--oro)}.chip input:checked+span{background:var(--oro);border-color:var(--oro);color:#1A1406;font-weight:600}
.chip input:checked+span::before{content:"✓";margin-right:7px;font-weight:800}.chip input:focus-visible+span,.nps input:focus-visible+span{outline:3px solid var(--oro);outline-offset:2px}
.nps{display:grid;grid-template-columns:repeat(11,1fr);gap:5px}.pub-form .nps label{display:block;position:relative;font-weight:600}
.nps input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.nps span{display:flex;align-items:center;justify-content:center;min-height:44px;border:1.5px solid var(--linea);border-radius:10px;cursor:pointer;background:var(--papel);font-variant-numeric:tabular-nums}
.nps span:hover{border-color:var(--oro)}.nps input:checked+span{background:var(--tinta);color:var(--papel);border-color:var(--tinta)}
.nps-ej{display:flex;justify-content:space-between;font-size:12px;color:var(--gris);margin-top:6px}
.dos-campos{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ts{min-height:70px}
.buzon-nav{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}.buzon-nav .pub-enviar{padding:0 26px}.buzon-nav .btn{min-height:48px}
.buzon-ok{text-align:center;padding:10px 0}.sello-ok{width:64px;height:64px;margin:4px auto 6px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--oro);color:#1A1406;font:800 30px/1 var(--sans)}
.buzon-ok h3{margin:0 0 6px}.buzon-msg{color:var(--tinta2);margin:0 auto 16px;max-width:34em}
@media (max-width:540px){.dos-campos{grid-template-columns:1fr}.nps{grid-template-columns:repeat(6,1fr)}.chip span{font-size:14px;padding:8px 13px}}
/* 13-11-2026 · Panel de Control */
.barras{display:flex;flex-direction:column;gap:8px}.barra{display:grid;grid-template-columns:minmax(120px,38%) 1fr auto;gap:10px;align-items:center;font-size:14px}
.bb{height:12px;background:var(--linea);border-radius:6px;overflow:hidden}.bb i{display:block;height:100%;border-radius:6px}.barra b{font-variant-numeric:tabular-nums}
.calor{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.cel{border-radius:12px;padding:12px 14px;background:rgba(184,137,43,var(--a));color:var(--tinta);border:1px solid rgba(184,137,43,.35)}
.enlace{background:none;border:0;padding:0;font:inherit;color:var(--oro-t);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.cel b{display:block;font-size:15px}.cel span{font-size:12.5px}.tabla-buzon .m{color:var(--gris);font-size:13px}
`;

const SCRIPT = `
(function(){var r=document.documentElement,b=document.getElementById('tema');function g(){try{return localStorage.getItem('cn-tema')}catch(e){return null}}
var t=g();if(t)r.setAttribute('data-theme',t);if(b)b.addEventListener('click',function(){var o=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
var n=o==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('cn-tema',n)}catch(e){}});
setTimeout(function(){location.reload()},20*60*1000);})();
// 13-11-2026 · formulario de publicidad (el mismo del boletín): llega a Germán por la planilla, sin mostrar sus datos
(function(){var dlg=document.getElementById('dlgPub');if(!dlg)return;var f=dlg.querySelector('form'),st=dlg.querySelector('.pub-estado'),sub=document.getElementById('dlgPubSub');
function en(){return document.documentElement.lang==='en'}
function abrir(i){f.reset();f.interes.value=i;st.textContent='';sub.textContent=i==='Cofrade News'?(en()?'To advertise your company in Cofrade News.':'Para publicitar su empresa en Cofrade News.'):(en()?'Inquiry for ':'Consulta para ')+i+'.';
if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');setTimeout(function(){try{f.nombre.focus()}catch(e){}},60)}
function cerrar(){if(dlg.close)dlg.close();else dlg.removeAttribute('open')}
document.querySelectorAll('.pub-abrir').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();abrir(b.getAttribute('data-interes')||'Cofrade News')})});
dlg.querySelector('.pub-cerrar').addEventListener('click',cerrar);dlg.addEventListener('click',function(ev){if(ev.target===dlg)cerrar()});
if(location.hash==='#publicitar')setTimeout(function(){abrir('Cofrade News')},300);
f.addEventListener('submit',function(ev){ev.preventDefault();if(f.sitio_web.value)return;
if(!f.nombre.value.trim()||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())||!f.mensaje.value.trim()){st.textContent=en()?'Please enter your name, a valid email and your message.':'Complete nombre, un email válido y su mensaje.';return}
if(!f.acepto.checked){st.textContent=en()?'Please accept the use of your data so we can reply.':'Debe aceptar el uso de sus datos para que podamos responderle.';return}
var bt=f.querySelector('.pub-enviar');bt.disabled=true;st.textContent=en()?'Sending…':'Enviando…';
fetch('/contacto',{method:'POST',body:new URLSearchParams(new FormData(f))}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){
if(j&&j.ok){st.textContent=en()?'Thank you! We received your details and will contact you shortly.':'¡Gracias! Recibimos sus datos y lo contactaremos a la brevedad.';setTimeout(cerrar,2800)}
else st.textContent=(j&&j.error)||(en()?'It could not be sent. Please try again in a moment.':'No se pudo enviar. Intente de nuevo en un momento.')})
.catch(function(){st.textContent=en()?'It could not be sent (no internet?). Please try again.':'No se pudo enviar (¿sin internet?). Intente de nuevo en un momento.'})
.finally(function(){bt.disabled=false})})})();
// 13-11-2026 · botón EN/ES: textos fijos con diccionario; titulares y cifras «En vivo» traducidos en el servidor (/en.json).
// Queda guardado en el equipo (la misma clave que usa la edición, así la edición también abre en inglés).
(function(){var r=document.documentElement,b=document.getElementById('idioma');if(!b)return;var orig=new Map(),hecho=false,trad=null,vueltas=0,titulo0=document.title;
var D=window.__EN||{};
// 14-11-2026 (Germán: «muchos textos no se están traduciendo»): las frases con cifras, horas y fechas se traducen aquí con reglas
// (no dependen de /en.json); los titulares del día llegan de /en.json por partes y la página los va poniendo
var DIR={N:'N',S:'S',E:'E',O:'W',NE:'NE',NO:'NW',SE:'SE',SO:'SW',NNE:'NNE',NNO:'NNW',ENE:'ENE',ESE:'ESE',SSE:'SSE',SSO:'SSW',ONO:'WNW',OSO:'WSW'};
function regla(t){var m;
if((m=t.match(/^Actualizado a las (\\d\\d:\\d\\d)(?: · próxima actualización (\\d\\d:\\d\\d))?\\. (.+)$/)))return 'Updated at '+m[1]+(m[2]?' · next update '+m[2]:'')+'. '+(D[m[3]]||m[3]);
if((m=t.match(/^(.+) · cierre (\\d\\d-\\d\\d)$/)))return (D[m[1]]||m[1])+' · close '+m[2];
if((m=t.match(/^(.+) · (\\d\\d-\\d\\d-\\d{4})$/))&&D[m[1]])return D[m[1]]+' · '+m[2];
if((m=t.match(/^([+−-]?[\\d.,]+ %) en un mes$/)))return m[1]+' over one month';
if((m=t.match(/^Sismo mayor 24 h · (\\d+) sobre M 2,5$/)))return 'Largest earthquake in 24 h · '+m[1]+' above M 2.5';
if((m=t.match(/^(\\d+) km al ([NSEO]{1,3}) de (.+?)( · \\d\\d:\\d\\d)?$/))&&DIR[m[2]])return m[1]+' km '+DIR[m[2]]+' of '+m[3]+(m[4]||'');
if((m=t.match(/^Aire · (.+)$/)))return 'Air · '+(D[m[1]]||m[1]);
if((m=t.match(/^ICA (\\d+) · (.*)$/)))return 'AQI '+m[1]+' · '+(D[m[2]]||m[2]);
if(t.charAt(0)==='·')return t.split(' · ').map(function(x,i){var y=i===0?x.replace(/^·\\s*/,''):x;return (i===0?'· ':'')+(D[y]||y)}).join(' · ');
return null}
function nodos(){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),o=[],n;while(n=w.nextNode()){var p=n.parentNode;if(!p||/^(SCRIPT|STYLE)$/.test(p.nodeName)||p.closest('[data-no-tr]'))continue;if(n.nodeValue.trim())o.push(n)}return o}
function attrs(){return document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')}
function fecha(l){document.querySelectorAll('[data-iso]').forEach(function(e){var p=e.getAttribute('data-iso').split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2],15));
if(!orig.has(e))orig.set(e,e.textContent);e.textContent=l==='en'?new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):orig.get(e)})}
function poner(l){r.lang=l==='en'?'en':'es-CL';
nodos().forEach(function(n){if(n.parentNode&&n.parentNode.closest('[data-iso]'))return;if(!orig.has(n))orig.set(n,n.nodeValue);var o=orig.get(n),k=o.trim();
if(l!=='en'){n.nodeValue=o;return}var t=D[k]!==undefined?D[k]:regla(k);if(t===null&&trad&&trad[k]!==undefined)t=trad[k];if(t!==null)n.nodeValue=o.replace(k,t)});
document.title=l==='en'?(D[titulo0]||titulo0):titulo0;
attrs().forEach(function(e){['aria-label','placeholder','title','alt'].forEach(function(a){var v=e.getAttribute(a);if(v===null)return;var key='data-o-'+a;if(!e.hasAttribute(key))e.setAttribute(key,v);var o=e.getAttribute(key);e.setAttribute(a,l==='en'&&D[o]?D[o]:o)})});
fecha(l);b.textContent=l==='en'?'ES':'EN';b.setAttribute('aria-pressed',String(l==='en'));b.setAttribute('aria-label',l==='en'?'Ver en español':'Read in English');
try{localStorage.setItem('cofrade-idioma',l)}catch(e){}
if(l==='en'&&!hecho){hecho=true;pedir()}}
function pedir(){fetch('/en.json'+(vueltas?'?v='+vueltas:''),{cache:vueltas?'no-store':'default'}).then(function(x){return x.ok?x.json():{}}).then(function(j){j=j&&typeof j==='object'?j:{};var f=+j.__faltan||0;delete j.__faltan;
trad=Object.assign(trad||{},j);if(r.lang==='en')poner('en');if(f>0&&vueltas<6){vueltas++;setTimeout(pedir,2500)}}).catch(function(){})}
b.addEventListener('click',function(){poner(r.lang==='en'?'es':'en')});
try{if(localStorage.getItem('cofrade-idioma')==='en')poner('en')}catch(e){}})();`;

// 14-11-2026 (Germán: «un botón muy discreto, sobrio y elegante que diga "Ver más"»): el Archivo muestra 12 ediciones y el botón
// abre las anteriores de a 12; con todas a la vista, «Ver menos» vuelve a las 12. Sin JavaScript, las 12 siguen ahí.
function archivoMas(total) {
  if (total <= MAX_ARCHIVO) return "";
  return `<div class="arch-pie" id="archPie" hidden><button type="button" class="arch-mas" id="archMas" aria-controls="archivoLista" aria-expanded="false" data-no-tr `
    + `data-paso="${MAX_ARCHIVO}"><span class="am-tx">Ver más</span><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" `
    + `stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>`
    + `<span class="am-cuenta" id="archCuenta" aria-live="polite" data-no-tr></span></div><script>${ARCHIVO_JS}</script>`;
}
const ARCHIVO_JS = `(function(){var b=document.getElementById('archMas');if(!b)return;document.getElementById('archPie').hidden=false;var L=[].slice.call(document.querySelectorAll('#archivoLista a')),
paso=+b.getAttribute('data-paso')||12,c=document.getElementById('archCuenta'),tx=b.querySelector('.am-tx');
function en(){return document.documentElement.lang==='en'}
function vis(){var n=0;L.forEach(function(a){if(!a.hidden)n++});return n}
function rotulo(){var n=vis(),t=L.length,todo=n>=t;tx.textContent=todo?(en()?'See less':'Ver menos'):(en()?'See more':'Ver más');
b.setAttribute('aria-expanded',String(n>paso));b.classList.toggle('abierto',todo);
var r=t-n;c.textContent=n>paso?(en()?n+' of '+t+' editions':n+' de '+t+' ediciones'):(en()?r+' earlier':r+(r===1?' anterior':' anteriores'))}
b.addEventListener('click',function(){var n=vis();
if(n>=L.length){L.forEach(function(a,i){a.hidden=i>=paso});var s=document.getElementById('archivo');
if(s&&s.getBoundingClientRect().top<0)s.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
else{var p=null;L.forEach(function(a,i){if(i<n+paso&&a.hidden){a.hidden=false;if(!p)p=a}});if(p&&document.activeElement===b&&b.matches(':focus-visible'))p.focus()}
rotulo()});
var idi=document.getElementById('idioma');if(idi)idi.addEventListener('click',function(){setTimeout(rotulo,0)});rotulo();
document.addEventListener('DOMContentLoaded',rotulo)})();`;   // el inglés guardado se aplica después de este script

// Diccionario de los textos fijos de la portada (los dinámicos se traducen en /en.json)
const EN_FIJO = {
  "Edición de hoy": "Today's edition", "En vivo": "Live", "Archivo": "Archive", "Socios": "Members", "Publicite": "Advertise",
  "Cofrade News, portada": "Cofrade News, home", "Cambiar entre modo claro y oscuro": "Switch between light and dark mode", "Secciones": "Sections",
  "El diario de la mañana · gratuito": "The morning paper · free",
  "Chile y el mundo, ordenados en minutos y con datos verificados.": "Chile and the world, sorted in minutes, with verified data.",
  "Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.":
    "Every morning at 07:30: economy, politics and Congress, conflicts, science, sports, weather, flights and more. Every figure with its source and date.",
  "Leer la edición de hoy →": "Read today's edition →", "Leer la edición →": "Read the edition →", "Ver lo último": "See the latest",
  "Hoy ·": "Today ·", "Última edición ·": "Latest edition ·", "Muy pronto": "Coming soon", "Edición": "Edition",
  "La edición de hoy ya está publicada.": "Today's edition is out.",
  "La edición de hoy se publica a las 07:30. Mientras, lee la última.": "Today's edition comes out at 07:30. Meanwhile, read the latest one.",
  "La primera edición web aparece mañana a las 07:30.": "The first web edition comes out tomorrow at 07:30.",
  "Crecimiento de Chile": "Chile's growth", "Economía y mercados": "Economy and markets", "Política y Congreso": "Politics and Congress",
  "Conflictos en el mundo": "Conflicts around the world", "Perspectivas 2050": "Outlook 2050", "Ciencia y Astronomía": "Science and Astronomy",
  "Deportes": "Sports", "Clima, mar y sismos": "Weather, sea and earthquakes", "Vuelos comerciales": "Commercial flights",
  "Entretenimiento": "Entertainment", "Fondos y subsidios": "Grants and subsidies", "Efemérides": "On this day",
  "Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.": "Central Bank, Santiago Stock Exchange, USGS, measured air quality and the country's media.",
  "Se actualiza cada 2 horas, de 07:00 a 23:00.": "Updated every 2 hours, from 07:00 to 23:00.",
  "Los titulares de las últimas horas aparecen aquí en la próxima actualización.": "The latest headlines appear here at the next update.",
  "Las 12 ediciones publicadas más recientes.": "The 12 most recent published editions.", "El archivo empieza con la próxima edición.": "The archive starts with the next edition.",
  "Ver más": "See more", "Ver menos": "See less",
  "Área de socios": "Members' area", "Informes financieros, análisis de mercado y contenidos exclusivos para socios.": "Financial reports, market analysis and exclusive content for members.",
  "Ingresar con mi clave": "Sign in with my password", "Publicite aquí": "Advertise here", "Su marca cada mañana frente a lectores que deciden.": "Your brand every morning in front of readers who make decisions.",
  "al mes": "per month", "Quiero publicitar": "I want to advertise", "Marcas que nos auspician": "Our sponsors",
  "Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.":
    "Cofrade News · the Cofradía's free daily newsletter, made in Chile. Every figure carries its source and date in the edition.",
  "Cofrade News. Todos los derechos reservados.": "Cofrade News. All rights reserved.",
  "Déjenos sus datos y lo contactamos": "Leave us your details and we will contact you", "Nombre y apellido *": "Full name *", "Empresa": "Company",
  "Email *": "Email *", "Teléfono / WhatsApp": "Phone / WhatsApp", "¿Cómo prefiere que lo contactemos?": "How would you like us to contact you?",
  "Llamada": "Phone call", "Mensaje *": "Message *", "Sitio web": "Website", "Enviar": "Send", "Cerrar": "Close",
  "Acepto que usen estos datos solo para responder mi consulta (Ley 19.628).": "I agree that this data is used only to answer my inquiry (Chilean Law 19.628).",
  "IPSA (puntos)": "IPSA (points)", "Dólar": "US dollar", "Euro": "Euro", "UF": "UF", "UTM": "UTM", "Cobre (libra)": "Copper (pound)", "Bitcoin": "Bitcoin", "Petróleo Brent": "Brent crude", "Cobre": "Copper", "Oro": "Gold", "Plata": "Silver",
  "Mercados": "Markets", "Mercados en vivo": "Live markets", "El diario de la mañana · Gratuito": "The morning paper · Free",
  "Dashboard Financiero": "Financial Dashboard", "Cada dato con su fuente": "Every figure with its source", "Hecho en Chile": "Made in Chile",
  "Edición de hoy publicada": "Today's edition is out", "Pizarra del día": "Today's board", "últimos 12 meses": "last 12 months",
  "Dólar observado": "US dollar (official rate)", "Cobre, US$ por libra": "Copper, US$ per pound", "Unidad de Fomento": "Unidad de Fomento (UF)",
  "Tasa de Política Monetaria": "Monetary policy rate", "Fuente: Banco Central de Chile, Base de Datos Estadísticos.": "Source: Central Bank of Chile, Statistical Database.",
  "Doce secciones, cada mañana, con la fuente de cada dato.": "Twelve sections every morning, with the source of every figure.",
  "Así se ve por dentro": "A look inside", "Algunos de los gráficos de la edición, tal como los recibes cada mañana.": "Some of the edition's charts, just as you get them every morning.",
  "Indicadores y monedas": "Indicators and currencies", "Industrias de Chile": "Chile's industries", "Avances por gobierno": "Progress by government", "Mar y navegación": "Sea and navigation",
  "Para socios · Muy pronto": "For members · Coming soon", "Puente de Mando · Dashboard Financiero": "The Bridge · Financial Dashboard",
  "ETF y cripto": "ETFs and crypto", "Dinero en movimiento": "Money on the move", "Radar político": "Political radar", "Calendario": "Calendar", "Herramientas": "Tools",
  "Quiero ser socio fundador": "I want to be a founding member", "Ver mercados en vivo": "See live markets", "Ingresar": "Sign in",
  "Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta, y no considera tu situación personal.":
    "General and educational information. It is not investment advice or a recommendation to buy or sell, and it does not consider your personal situation.",
  "Resumen del mundo": "World overview", "Dónde se movió el dinero hoy": "Where the money moved today", "Cripto": "Crypto", "Agenda económica": "Economic calendar",
  "USGS ↗": "USGS ↗", "fuente ↗": "source ↗", "Ver en español": "Ver en español", "Read in English": "Read in English",
};
// 14-11-2026 (Germán: «muchos textos no se están traduciendo», con capturas): portada, galería, Dashboard Financiero, Mercados en vivo,
// textos alternativos de las imágenes y el título de la pestaña. La prueba del arnés revisa que ningún texto fijo quede sin traducción.
Object.assign(EN_FIJO, {
  "Cofrade News · El diario de la mañana": "Cofrade News · The morning paper", "Mercados en vivo · Cofrade News": "Live markets · Cofrade News",
  "Chile y el mundo, ordenados en minutos y con": "Chile and the world, sorted in minutes, with", "datos verificados.": "verified data.",
  "El Imacec del mes, la proyección del año y cuánto avanza cada gobierno a igual período.": "This month's Imacec, the full-year forecast and how far each government had come at the same point in its term.",
  "Dólar, UF, IPSA, Wall Street, cobre y petróleo, con su fuente y su hora.": "Dollar, UF, IPSA, Wall Street, copper and oil, each with its source and time.",
  "Cada votación de la Sala con el voto de cada diputado y senador, y cómo votan las bancadas.": "Every floor vote, with how each deputy and senator voted and how each party bloc voted.",
  "Mapas, cifras oficiales de refugiados y su efecto en los precios que pagas.": "Maps, official refugee figures and their effect on the prices you pay.",
  "Los megaproyectos que cambiarán Chile: inversión, etapa y año de término.": "The megaprojects that will change Chile: investment, stage and completion year.",
  "Descubrimientos de la semana y el cielo de esta noche, explicados en simple.": "This week's discoveries and tonight's sky, explained simply.",
  "Tablas con proyección, fútbol, tenis, golf, Fórmula 1, NBA y equitación.": "Standings with projections: football, tennis, golf, Formula 1, NBA and equestrian.",
  "El tiempo de 9 ciudades, oleaje y mareas de los puertos, y los sismos del día.": "Weather for 9 cities, waves and tides at the ports, and the day's earthquakes.",
  "Salidas y llegadas confirmadas en los cinco aeropuertos principales.": "Confirmed departures and arrivals at the five main airports.",
  "Panoramas, estrenos y lo que no te puedes perder esta semana.": "Things to do, premieres and what not to miss this week.",
  "Fondos concursables abiertos, con su plazo y el enlace para postular.": "Open grant calls, with their deadline and the link to apply.",
  "La historia naval y de Chile que se recuerda hoy.": "The naval and Chilean history we remember today.",
  "Chile": "Chile", "Economía": "Economy", "Economía mundial": "World economy", "Tecnología": "Technology", "Mundo": "World", "Política": "Politics",
  "Ciencia": "Science", "Negocios": "Business", "Nacional": "National", "Internacional": "International", "Opinión": "Opinion",
  "Cultura": "Culture", "Salud": "Health", "Emprendimiento": "Entrepreneurship", "Inmobiliario": "Real estate", "Sociedad": "Society",
  "El dólar día a día, con la UF, el euro y el yuan.": "The dollar day by day, with the UF, the euro and the yuan.",
  "Wall Street, cobre, petróleo, IPSA y bolsas de Europa.": "Wall Street, copper, oil, IPSA and European stock markets.",
  "Qué produce cada región.": "What each region produces.", "Inversión en megaproyectos por sector.": "Megaproject investment by sector.",
  "Crecimiento, inflación, desempleo y deuda.": "Growth, inflation, unemployment and debt.",
  "Oleaje, mareas y el paso por el Estrecho de Magallanes.": "Waves, tides and passage through the Strait of Magellan.",
  "Para quienes toman decisiones: bolsa chilena y extranjera, ETF, cripto y blockchain, el dinero que entra y sale de Chile, y el radar político y regulatorio que mueve los mercados. Todo en un solo lugar, explicado en simple.":
    "For decision-makers: Chilean and global stocks, ETFs, crypto and blockchain, the money flowing in and out of Chile, and the political and regulatory radar that moves markets. All in one place, explained simply.",
  "IPSA, Wall Street, Europa y Asia, bonos, cobre, oro y petróleo.": "IPSA, Wall Street, Europe and Asia, bonds, copper, gold and oil.",
  "Los fondos que más se transan, Bitcoin, Ethereum y el ánimo del mercado cripto.": "The most traded funds, Bitcoin, Ethereum and crypto market sentiment.",
  "Qué compran y venden las AFP, los fondos mutuos y los inversionistas extranjeros.": "What pension funds (AFPs), mutual funds and foreign investors are buying and selling.",
  "Las leyes y normas que se votan y a qué sectores afectan.": "The laws and rules being voted on, and which sectors they affect.",
  "Reuniones del Banco Central, de la Reserva Federal y los datos que vienen.": "Central Bank and Federal Reserve meetings, and the data coming up.",
  "Conversor UF, dólar y euro, calculadora de IPC, interés compuesto y crédito hipotecario.": "UF, dollar and euro converter, plus CPI, compound interest and mortgage calculators.",
  "7 días gratis · Plan anual $55.000 (un mes de regalo) · Socios de la Cofradía con precio preferente": "7 days free · Annual plan CLP 55,000 (one month free) · Preferential price for Cofradía members",
  "Página web": "Website", "English": "Español", "Portada": "Home", "Pizarra del Banco Central": "Central Bank board",
  "Gráfico del dólar en los últimos dos meses": "US dollar chart for the last two months", "Variación diaria de los mercados": "Daily market moves",
  "Mapa de Chile por industria": "Map of Chile by industry", "Indicadores económicos por gobierno": "Economic indicators by government",
  "Mapa del Estrecho de Magallanes": "Map of the Strait of Magellan", "Inversión en megaproyectos por sector": "Megaproject investment by sector",
  "Socios · Cofrade News": "Members · Cofrade News", "Ingresa con tu clave.": "Sign in with your password.",
  "Informes financieros, análisis de mercado y contenidos exclusivos. La clave la entrega la Cofradía.": "Financial reports, market analysis and exclusive content. The Cofradía provides the password.",
  "Clave de socio": "Member password", "Entrar": "Sign in",
  "Gratis · Datos con el desfase que exigen las bolsas": "Free · Data delayed as the exchanges require",
  "Índices, monedas, materias primas, ETF y cripto del mundo en una sola página. Los gráficos son de TradingView; la lectura de lo que significa para Chile llega cada mañana en la edición.":
    "World indices, currencies, commodities, ETFs and crypto on a single page. Charts by TradingView; what it all means for Chile arrives every morning in the edition.",
  "Gráficos de TradingView": "Charts by TradingView", "Toca una pestaña y luego un instrumento para ver su gráfico de 12 meses.": "Tap a tab and then an instrument to see its 12-month chart.",
  "Las 500 mayores empresas de EE. UU. por sector: el tamaño es su valor bursátil y el color, cuánto subió o bajó.": "The 500 largest US companies by sector: size shows market value and colour shows how much each rose or fell.",
  "Las principales criptomonedas por valor de mercado y su variación del día.": "The main cryptocurrencies by market value and their change on the day.",
  "Los datos y decisiones que vienen en Chile, EE. UU., Europa, China y Brasil.": "Upcoming data and decisions in Chile, the US, Europe, China and Brazil.",
  "Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta. Los precios pueden tener un desfase de 15 minutos o más.":
    "General and educational information. It is not investment advice or a recommendation to buy or sell. Prices may be delayed by 15 minutes or more.",
  "Bueno": "Good", "Regular": "Moderate", "Moderado": "Moderate", "Malo": "Poor", "Alerta": "Alert", "Preemergencia": "Pre-emergency",
  "Emergencia": "Emergency", "Dañino para grupos sensibles": "Unhealthy for sensitive groups", "Dañino": "Unhealthy", "Muy dañino": "Very unhealthy", "Peligroso": "Hazardous",
});
// 13-11-2026 · textos del Buzón de sugerencias y del pie (las secciones ya están arriba)
Object.assign(EN_FIJO, {
  "Página no encontrada · Cofrade News": "Page not found · Cofrade News", "Esta página no existe.": "This page does not exist.",
  "Vuelve a la": "Go back to the", "portada": "front page", "Edición no encontrada · Cofrade News": "Edition not found · Cofrade News",
  "Esa edición no está.": "That edition is not available.", "para ver las disponibles.": "to see the available ones.",
  "Panel · Cofrade News": "Dashboard · Cofrade News", "Panel de Control": "Control Panel", "Acceso de administración": "Administrator access",
  "Clave": "Password", "Clave de administración": "Administrator password",
  "Buzón": "Suggestions", "Buzón de sugerencias": "Suggestion box", "Ayúdanos a hacer el mejor diario de Chile": "Help us make the best daily briefing in Chile",
  "Paso 1 de 3": "Step 1 of 3", "¿Qué es lo que más te gusta?": "What do you like most?", "Marca todas las que quieras.": "Tick as many as you like.",
  "¿Qué te gustaría que agreguemos?": "What would you like us to add?", "¿Con qué frecuencia lees Cofrade News?": "How often do you read Cofrade News?",
  "Del 0 al 10, ¿qué tan probable es que recomiendes Cofrade News a un amigo?": "From 0 to 10, how likely are you to recommend Cofrade News to a friend?",
  "Nada probable": "Not likely", "Muy probable": "Very likely", "Escribe lo que quieras": "Write anything you like",
  "Una idea, una crítica, una felicitación…": "An idea, a criticism, a compliment…", "Nombre *": "First name *", "Apellido *": "Last name *",
  "Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email.": "We will email you to confirm it is you. We never publish your email.",
  "Acepto que Cofrade News use estos datos solo para mejorar el diario y responder mi sugerencia. No se publican ni se venden (Ley 19.628).":
    "I agree that Cofrade News may use this data only to improve the briefing and reply to my suggestion. It is never published or sold (Chilean Law 19,628).",
  "¡Gracias por escribirnos!": "Thank you for writing to us!", "Cerrar": "Close", "Atrás": "Back", "Siguiente": "Next", "Enviar al Buzón": "Send",
  "Medimos las visitas sin cookies y sin datos personales. ¿Una idea para mejorar?": "We measure visits without cookies or personal data. Have an idea to improve?",
  "Escríbenos al Buzón": "Write to our suggestion box",
  "Los gráficos": "The charts", "Las fuentes verificadas": "The verified sources", "La versión en inglés": "The English version", "Descargar en PDF": "PDF download",
  "El diseño": "The design", "Alertas por WhatsApp": "WhatsApp alerts", "Versión en audio (podcast)": "Audio version (podcast)",
  "Envío por correo cada mañana": "Morning email delivery", "App para el celular": "Mobile app", "Más noticias de regiones": "More regional news",
  "Análisis de inversiones": "Investment analysis", "Más deportes": "More sports", "Agenda de eventos de la Cofradía": "Cofradía events calendar",
  "Clasificados entre socios": "Members' classifieds", "Encuestas a los lectores": "Reader polls", "Más noticias internacionales": "More international news",
  "Tecnología e inteligencia artificial": "Technology and AI", "Salud y bienestar": "Health and wellbeing", "Cultura y panoramas": "Culture and things to do",
  "Historia naval": "Naval history", "Todos los días": "Every day", "Varias veces por semana": "Several times a week", "Una vez por semana": "Once a week",
  "Es mi primera vez": "It's my first time",
});

// 13-11-2026 (Germán: «que no puedan descargar los archivos HTML, solo el PDF del boletín»): en la edición se desactivan
// «Guardar como» (Ctrl/Cmd+S), «Ver código» (Ctrl/Cmd+U) y el menú del botón derecho. El botón «Descargar PDF» sigue igual.
// Es un freno para el lector común, no un candado: quien sepa usar las herramientas del navegador igual puede copiar la página.
const PROTEGER = `<script>(function(){function no(e){e.preventDefault();e.stopPropagation();return false}
document.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='u'))return no(e)},true);
document.addEventListener('contextmenu',function(e){var t=e.target;if(t&&t.closest&&t.closest('input,textarea,[contenteditable]'))return;return no(e)},true);
document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')no(e)},true);})();<\/script>`;

// 15-11-2026 (Germán: «un auditor que cada 6 horas revise ... medios de pago, formularios, suscripción Socios ... y lo repare»):
// estado de las piezas que el vigía de GitHub no puede ver desde afuera. Solo dice SÍ o NO por pieza: nunca muestra llaves ni datos.
// Mercado Pago se prueba con una consulta de solo lectura (la cuenta dueña de la llave). Se guarda 5 minutos para no repetir consultas.
async function salud(env, ctx) {
  const clave = new Request("https://www.cofrad.es/__salud");
  try { const c = await caches.default.match(clave); if (c) return c; } catch (e) { /* sin caché: se calcula */ }
  const r = { hora: new Date().toISOString() };
  try { r.d1 = !!env.DB && !!(await env.DB.prepare("SELECT 1 AS uno").first()); } catch (e) { r.d1 = false; }
  r.mp_configurado = !!(env.MP_ACCESS_TOKEN && String(env.MP_ACCESS_TOKEN).trim() && env.MP_WEBHOOK_SECRET);
  if (r.mp_configurado) {
    try {
      const x = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${String(env.MP_ACCESS_TOKEN).trim()}` }, signal: AbortSignal.timeout(8000) });
      r.mp_api = x.ok ? true : (x.status === 401 || x.status === 403) ? false : null;   // 429 o 5xx: Mercado Pago ocupado, no la llave
    } catch (e) { r.mp_api = null; }
  }
  r.turnstile = !!env.TURNSTILE_SECRET;
  r.correo = !!env.RESEND_API_KEY;
  r.ok = r.d1 && r.mp_api !== false;
  const resp = new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
  try { ctx.waitUntil(caches.default.put(clave, resp.clone())); } catch (e) { /* sin caché */ }
  return resp;
}

// 15-11-2026 · Navegación que el sitio agrega a TODA edición (de hoy, por fecha, liviana o permanente). Un solo dueño: el sitio.
// (a) Germán: «agregar una flecha que le permita al lector retroceder y volver al Landing page». Botón fijo arriba a la izquierda,
//     con el lenguaje del botón «Índice» (azul marino, borde dorado). Es un enlace real a la portada: funciona sin JavaScript y con
//     «abrir en pestaña nueva». Si el lector llegó desde la portada y no navegó dentro de la edición, vuelve con history.back()
//     (regresa al mismo punto de la portada, al instante y sin contar otra visita). Donde tapa el texto, se esconde al bajar y
//     reaparece al subir; con el teclado aparece al recibir el foco.
// (b) Germán: «arriba del botón flotante del Índice agrega otro botón ... una flecha (que apunta hacia arriba) contenida dentro de un
//     círculo, para que el lector pueda subir rápidamente al header». Círculo claro con aro dorado y doble flecha azul marino (su dibujo),
//     centrado sobre «Índice». Aparece recién cuando el lector bajó casi una pantalla; sube suave (o al instante con «reducir movimiento»)
//     y deja el foco arriba para quien usa teclado.
// Ninguno de los dos se imprime (el PDF sale igual que antes) y ambos cambian su texto con el botón EN/ES (evento «cofrade-idioma»).
const NAV_HTML = `<a id="cnVolver" class="cn-volver" href="/" data-no-tr translate="no" aria-label="Volver a la portada de Cofrade News" title="Volver a la portada de Cofrade News"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5.5M11.5 18.5 5 12l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
const SUBIR_HTML = `<button type="button" id="cnSubir" class="cn-subir" data-no-tr translate="no" aria-label="Subir al encabezado del boletín" title="Subir al encabezado del boletín"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 12.5 12 7l5.5 5.5M6.5 18 12 12.5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
// 15-11-2026 (Germán: «un leve espacio adicional entre los 22 temas»): las ediciones nuevas lo traen de la Skill y lo declaran con
// data-ritmo en <html>; a las ya publicadas se lo pone el sitio con los MISMOS valores. Así nunca se suma dos veces.
const SITIO_CSS = `<style id="cnSitio">@media screen{.cg-det.cerrada>.cg-det-in{content-visibility:hidden}.cg-det-in{transition:content-visibility .35s allow-discrete}}@media screen and (prefers-reduced-motion:reduce){.cg-det-in{transition:none}}a.cn-volver{position:fixed;z-index:900;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));
display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;box-sizing:border-box;
background:#0B1F3A;color:#fff;border:2px solid #D9AE52;text-decoration:none;-webkit-tap-highlight-color:transparent;
box-shadow:0 10px 26px rgba(11,31,58,.30),0 2px 6px rgba(11,31,58,.20);
transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .18s ease-out,box-shadow .18s}
a.cn-volver svg,button.cn-subir svg{display:block;transition:transform .18s cubic-bezier(.2,.8,.2,1)}
a.cn-volver:hover{box-shadow:0 14px 32px rgba(11,31,58,.36),0 3px 8px rgba(11,31,58,.22)}a.cn-volver:hover svg{transform:translateX(-2px)}
a.cn-volver:active{transform:scale(.95)}a.cn-volver:focus-visible,button.cn-subir:focus-visible{outline:3px solid #D9AE52;outline-offset:3px}
a.cn-volver.cn-oculto{transform:translateY(calc(-100% - 24px));opacity:0;pointer-events:none}
:root[data-theme=dark] a.cn-volver{background:#D9AE52;color:#0E1522;border-color:#F3D58F}
button.cn-subir{position:fixed;z-index:900;right:var(--cn-sr,calc(max(16px,env(safe-area-inset-right)) + 32px));bottom:var(--cn-sb,calc(max(16px,env(safe-area-inset-bottom)) + 66px));
display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;min-width:0;padding:0;margin:0;border-radius:50%;box-sizing:border-box;
background:var(--card,#fff);color:var(--tinta,#0B1F3A);border:2px solid var(--oro,#B8892B);cursor:pointer;-webkit-tap-highlight-color:transparent;
box-shadow:0 8px 22px rgba(11,31,58,.22),0 2px 6px rgba(11,31,58,.14);
opacity:0;visibility:hidden;transform:translateY(10px) scale(.9);pointer-events:none;
transition:opacity .2s ease-out,transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .18s,visibility 0s linear .22s}
button.cn-subir.cn-on{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition-delay:0s}
button.cn-subir.cn-on:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(11,31,58,.28),0 3px 8px rgba(11,31,58,.18)}
button.cn-subir:hover svg{transform:translateY(-1px)}button.cn-subir.cn-on:active{transform:scale(.95)}
@media (min-width:900px){a.cn-volver{top:16px;left:16px;width:48px;height:48px}button.cn-subir{width:48px;height:48px}}
@media (prefers-reduced-motion:reduce){a.cn-volver,a.cn-volver svg,button.cn-subir,button.cn-subir svg{transition:none}a.cn-volver:hover svg,button.cn-subir:hover svg,button.cn-subir.cn-on:hover{transform:none}}
@media print{a.cn-volver,button.cn-subir{display:none!important}}
html:not([data-ritmo]) section.sec{margin-top:clamp(46px,5vw,60px);margin-bottom:clamp(46px,5vw,60px);padding-top:12px}
html:not([data-ritmo]) main>h2{margin-top:clamp(46px,5vw,60px)}
@media print{html:not([data-ritmo]) section.sec{margin-top:30px;margin-bottom:30px;padding-top:8px}html:not([data-ritmo]) main>h2{margin-top:30px}}</style>`;
const NAV_JS = `<script>(function(){var a=document.getElementById('cnVolver'),s=document.getElementById('cnSubir'),R=document.documentElement;if(!a)return;
var L0,h0;function base(){L0=history.length;h0=location.href}base();
if(document.prerendering)document.addEventListener('prerenderingchange',base,{once:true});
var desde=false;try{var r=new URL(document.referrer);desde=r.origin===location.origin&&r.pathname==='/'}catch(e){}
a.addEventListener('click',function(ev){if(ev.defaultPrevented||ev.button||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;
if(desde&&L0>1&&history.length===L0&&location.href===h0){ev.preventDefault();history.back()}});
var T={es:['Volver a la portada de Cofrade News','Subir al encabezado del boletín'],en:['Back to the Cofrade News home page','Back to the top of the newsletter']};
function rot(el,t){if(el){el.setAttribute('aria-label',t);el.setAttribute('title',t)}}
function idioma(l){var t=/^en/i.test(String(l||''))?T.en:T.es;rot(a,t[0]);rot(s,t[1]);setTimeout(lugar,60)}
var cubre=true;function medir(){var c=document.querySelector('.hoja')||document.querySelector('main');if(!c){cubre=true;return}
var cs=getComputedStyle(c);cubre=c.getBoundingClientRect().left+(parseFloat(cs.paddingLeft)||0)<a.getBoundingClientRect().right+12}
function lugar(){if(!s)return;var f=document.getElementById('cnFab');
if(!f||!f.offsetWidth){s.style.setProperty('--cn-sr','max(16px, env(safe-area-inset-right))');s.style.setProperty('--cn-sb','max(16px, env(safe-area-inset-bottom))');return}
var cf=getComputedStyle(f),fr=parseFloat(cf.right)||16,fb=parseFloat(cf.bottom)||16;
s.style.setProperty('--cn-sr',Math.round(fr+(f.offsetWidth-s.offsetWidth)/2)+'px');s.style.setProperty('--cn-sb',Math.round(fb+f.offsetHeight+12)+'px')}
function todo(){medir();lugar()}
idioma(R.lang);document.addEventListener('cofrade-idioma',function(e){idioma(e.detail)});
todo();addEventListener('resize',todo,{passive:true});addEventListener('load',todo);
var y0=scrollY,oc=false;function poner(o){if(o!==oc){oc=o;a.classList.toggle('cn-oculto',o)}}
function verSubir(){if(s)s.classList.toggle('cn-on',scrollY>Math.max(600,innerHeight*0.9))}
addEventListener('scroll',function(){verSubir();var y=scrollY,d=y-y0;if(Math.abs(d)<10&&y>140)return;y0=y;poner(cubre&&d>0&&y>140)},{passive:true});
verSubir();a.addEventListener('focus',function(){poner(false)});
if(s)s.addEventListener('click',function(){var q=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{scrollTo({top:0,behavior:q?'auto':'smooth'})}catch(e){scrollTo(0,0)}poner(false);var hh=document.querySelector('h1')||a;if(hh!==a&&!hh.hasAttribute('tabindex'))hh.setAttribute('tabindex','-1');try{hh.focus({preventScroll:true})}catch(e){}})})();<\/script>`;

const DIALOGO = `<dialog class="dlg-pub" id="dlgPub" aria-labelledby="dlgPubT"><form class="pub-form" method="dialog" novalidate>
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button><h3 id="dlgPubT">Déjenos sus datos y lo contactamos</h3><p class="sub" id="dlgPubSub" style="margin:0"></p>
<input type="hidden" name="interes" value=""><label>Nombre y apellido *<input name="nombre" required maxlength="80" autocomplete="name"></label>
<label>Empresa<input name="empresa" maxlength="80" autocomplete="organization"></label><label>Email *<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>Teléfono / WhatsApp<input name="telefono" type="tel" maxlength="20" autocomplete="tel" placeholder="+56 9 …"></label>
<label>¿Cómo prefiere que lo contactemos?<select name="prefiere"><option value="Email">Email</option><option value="WhatsApp">WhatsApp</option><option value="Llamada">Llamada</option></select></label>
<label>Mensaje *<textarea name="mensaje" required maxlength="1000" rows="3"></textarea></label>
<label class="pub-hp" aria-hidden="true">Sitio web<input name="sitio_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> Acepto que usen estos datos solo para responder mi consulta (Ley 19.628).</label>
<button type="submit" class="pub-enviar">Enviar</button><p class="pub-estado" role="status" aria-live="polite"></p></form></dialog>`;

// 13-11-2026 · la cabecera queda fija: sombra al bajar, altura medida para que los enlaces internos no queden tapados,
// y en el celular un degradé avisa que el menú tiene más opciones hacia la derecha.
const CABECERA_JS = `
(function(){var c=document.querySelector('.cab');if(!c)return;var n=c.querySelector('nav'),r=document.documentElement;
function alto(){r.style.setProperty('--alto-cab',c.offsetHeight+'px')}alto();if(window.ResizeObserver)new ResizeObserver(alto).observe(c);else addEventListener('resize',alto);
var p=false;function sombra(){var s=scrollY>4;if(s!==p){p=s;c.classList.toggle('pegado',s)}}sombra();addEventListener('scroll',sombra,{passive:true});
function mas(){if(n)n.classList.toggle('mas',n.scrollLeft+n.clientWidth<n.scrollWidth-4)}mas();if(n)n.addEventListener('scroll',mas,{passive:true});addEventListener('resize',mas)})();`;

// =====================================================================================================================
// 13-11-2026 · BUZÓN de sugerencias, MEDICIÓN propia y PANEL DE CONTROL de www.cofrad.es
// Germán: «cambia "En vivo" por "Buzón": ventana emergente con selección múltiple, área libre, nombre, apellido y email,
// captcha y verificación del email, para evitar spam, bots y haters; y que se puedan modelar los datos y sacar métricas».
// Datos en Cloudflare D1 (binding DB, base cofrade-socios). Captcha: Cloudflare Turnstile (secreto TURNSTILE_SECRET).
// Correo: agradecimiento personalizado + confirmación desde hola@cofrad.es (15-11-2026), con Resend (RESEND_API_KEY) o el binding EMAIL.
// Panel: /panel, con la clave PANEL_CLAVE (secreto que crea Germán en Cloudflare). Sin esa clave, el panel no abre.
// =====================================================================================================================
const TURNSTILE_SITEKEY = "0x4AAAAAAGAKCkb75CKKeT2q";   // clave pública del widget (va en el HTML; la secreta vive solo en Cloudflare)
const GUSTA = ["Crecimiento de Chile", "Economía y mercados", "Política y Congreso", "Conflictos en el mundo", "Perspectivas 2050", "Ciencia y Astronomía",
  "Deportes", "Clima, mar y sismos", "Vuelos comerciales", "Entretenimiento", "Fondos y subsidios", "Efemérides", "Los gráficos", "Las fuentes verificadas",
  "La versión en inglés", "Descargar en PDF", "Mercados en vivo", "El diseño"];
const AGREGAR = ["Alertas por WhatsApp", "Versión en audio (podcast)", "Envío por correo cada mañana", "App para el celular", "Más noticias de regiones",
  "Análisis de inversiones", "Más deportes", "Agenda de eventos de la Cofradía", "Clasificados entre socios", "Encuestas a los lectores",
  "Más noticias internacionales", "Tecnología e inteligencia artificial", "Salud y bienestar", "Cultura y panoramas", "Historia naval"];
const FRECUENCIA = ["Todos los días", "Varias veces por semana", "Una vez por semana", "Es mi primera vez"];
const DESECHABLES = /(^|\.)(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable|maildrop|throwawaymail|fakeinbox|mohmal|emailondeck|mintemail|spamgourmet|mailnesia|tempail|burnermail|moakt|minuteinbox|tempr|discard|mail\.tm)\./i;
const LISTA_DESECHABLES = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";   // lista pública CC0
const GROSERO = /\b(conchetumadre|ctm|culiao|culiado|maric[oó]n|hijo de puta|hdp|puta madre|imb[eé]cil|idiota|est[uú]pido|pendejo|retrasado|mierda)\b/i;
const NOMBRE_OK = /^\p{L}[\p{L}' .-]{1,39}$/u;
const NOMBRE_FALSO = /^(asdf\w*|qwer\w*|zxcv\w*|test|tester|prueba|nombre|apellido|admin|usuario|anonimo|anónimo|xx+|nn)$/i;

const chips = (nombre, lista, tipo = "checkbox") => lista.map((x) => `<label class="chip"><input type="${tipo}" name="${nombre}" value="${esc(x)}"><span>${esc(x)}</span></label>`).join("");
const BUZON = `<dialog class="dlg-pub dlg-buzon" id="dlgBuzon" aria-labelledby="dlgBuzonT"><form class="pub-form" novalidate>
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button>
<span class="kicker">Buzón de sugerencias</span><h3 id="dlgBuzonT">Ayúdanos a hacer el mejor diario de Chile</h3>
<div class="pasos" aria-hidden="true"><i></i><i></i><i></i></div><p class="sub paso-n" style="margin:0" aria-live="polite">Paso 1 de 3</p>
<div class="paso" data-paso="1"><fieldset><legend>¿Qué es lo que más te gusta?</legend><p class="ayuda">Marca todas las que quieras.</p><div class="chips">${chips("gusta", GUSTA)}</div></fieldset></div>
<div class="paso" data-paso="2" hidden><fieldset><legend>¿Qué te gustaría que agreguemos?</legend><p class="ayuda">Marca todas las que quieras.</p><div class="chips">${chips("agregar", AGREGAR)}</div></fieldset>
<fieldset><legend>¿Con qué frecuencia lees Cofrade News?</legend><div class="chips">${chips("frecuencia", FRECUENCIA, "radio")}</div></fieldset>
<fieldset><legend>Del 0 al 10, ¿qué tan probable es que recomiendes Cofrade News a un amigo?</legend><div class="nps">${Array.from({ length: 11 }, (_, i) => `<label><input type="radio" name="nps" value="${i}"><span>${i}</span></label>`).join("")}</div>
<div class="nps-ej"><span>Nada probable</span><span>Muy probable</span></div></fieldset></div>
<div class="paso" data-paso="3" hidden><label>Escribe lo que quieras<textarea name="texto" maxlength="2000" rows="4" placeholder="Una idea, una crítica, una felicitación…"></textarea></label>
<div class="dos-campos"><label>Nombre *<input name="nombre" required maxlength="40" autocomplete="given-name"></label><label>Apellido *<input name="apellido" required maxlength="40" autocomplete="family-name"></label></div>
<label>Email *<input name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"><span class="ayuda">Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email.</span></label>
<label class="pub-hp" aria-hidden="true">Página web<input name="pagina_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> Acepto que Cofrade News use estos datos solo para mejorar el diario y responder mi sugerencia. No se publican ni se venden (Ley 19.628).</label>
<div id="tsBuzon" class="ts"></div></div>
<div class="buzon-ok" hidden><p class="sello-ok" aria-hidden="true">✓</p><h3>¡Gracias por escribirnos!</h3><p class="buzon-msg"></p><button type="button" class="pub-enviar buzon-fin">Cerrar</button></div>
<div class="buzon-nav"><button type="button" class="btn linea buzon-atras" hidden>Atrás</button><button type="button" class="pub-enviar buzon-sig">Siguiente</button><button type="submit" class="pub-enviar buzon-enviar" hidden>Enviar al Buzón</button></div>
<p class="pub-estado" role="status" aria-live="polite"></p></form></dialog>`;

const BUZON_JS = `
(function(){var d=document.getElementById('dlgBuzon');if(!d)return;var f=d.querySelector('form'),st=d.querySelector('.pub-estado'),tk='',wid=null,pedido=false,paso=1,
pasos=d.querySelectorAll('.paso'),barra=d.querySelectorAll('.pasos i'),pn=d.querySelector('.paso-n'),atras=d.querySelector('.buzon-atras'),sig=d.querySelector('.buzon-sig'),env=d.querySelector('.buzon-enviar'),
ok=d.querySelector('.buzon-ok'),nav=d.querySelector('.buzon-nav');
function en(){return document.documentElement.lang==='en'}
function script(){if(pedido)return;pedido=true;window.__tsListo=function(){if(paso===3)dibujar()};var s=document.createElement('script');
s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsListo&render=explicit';s.async=true;s.onerror=function(){st.textContent=en()?'The security check could not load. Check your connection or ad blocker.':'No cargó la verificación de seguridad. Revisa tu conexión o el bloqueador de anuncios.'};document.head.appendChild(s)}
function dibujar(){if(!window.turnstile)return;if(wid!==null){return}try{wid=turnstile.render('#tsBuzon',{sitekey:'${TURNSTILE_SITEKEY}',language:en()?'en':'es',theme:'auto',
callback:function(t){tk=t;if(st.textContent.indexOf('verificaci')>=0||st.textContent.indexOf('security')>=0)st.textContent=''},'expired-callback':function(){tk=''},'error-callback':function(){tk=''}})}catch(e){}}
function ir(n){paso=n;pasos.forEach(function(p){p.hidden=Number(p.getAttribute('data-paso'))!==n});barra.forEach(function(b,i){b.className=i<n?'si':''});
pn.textContent=(en()?'Step ':'Paso ')+n+(en()?' of 3':' de 3');atras.hidden=n===1;sig.hidden=n===3;env.hidden=n!==3;st.textContent='';
if(n===3){script();dibujar();setTimeout(function(){try{f.texto.focus()}catch(e){}},60)}try{f.scrollTop=0}catch(e){}}
function abrir(){st.textContent='';ok.hidden=true;nav.hidden=false;pn.hidden=false;d.querySelector('.pasos').hidden=false;ir(1);if(d.showModal)d.showModal();else d.setAttribute('open','');script()}
function cerrar(){if(d.close)d.close();else d.removeAttribute('open')}
document.querySelectorAll('.buzon-abrir').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();abrir()})});
if(location.hash==='#buzon')setTimeout(abrir,300);
d.querySelector('.pub-cerrar').addEventListener('click',cerrar);d.querySelector('.buzon-fin').addEventListener('click',cerrar);d.addEventListener('click',function(ev){if(ev.target===d)cerrar()});
sig.addEventListener('click',function(){ir(Math.min(3,paso+1))});atras.addEventListener('click',function(){ir(Math.max(1,paso-1))});
f.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&paso<3&&ev.target.tagName!=='TEXTAREA'){ev.preventDefault();ir(paso+1)}});
f.addEventListener('submit',function(ev){ev.preventDefault();if(paso!==3){ir(paso+1);return}if(f.pagina_web.value)return;
var nom=f.nombre.value.trim(),ape=f.apellido.value.trim(),em=f.email.value.trim();
if(nom.length<2||ape.length<2||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$/.test(em)){st.textContent=en()?'Please enter your first name, last name and a valid email.':'Escribe tu nombre, tu apellido y un email válido.';return}
if(!f.acepto.checked){st.textContent=en()?'Please accept the use of your data.':'Debes aceptar el uso de tus datos para enviar.';return}
if(!tk){st.textContent=en()?'Please complete the security check (the Cloudflare box).':'Completa la verificación de seguridad (el recuadro de Cloudflare).';script();dibujar();return}
var fd=new FormData(f);fd.append('cf-turnstile-response',tk);env.disabled=true;st.textContent=en()?'Sending…':'Enviando…';
fetch('/buzon',{method:'POST',body:new URLSearchParams(fd)}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){tk='';try{turnstile.reset(wid)}catch(e){}
if(j&&j.ok){f.reset();st.textContent='';pasos.forEach(function(p){p.hidden=true});nav.hidden=true;pn.hidden=true;d.querySelector('.pasos').hidden=true;
d.querySelector('.buzon-msg').textContent=j.mensaje||'';ok.hidden=false}else{st.textContent=(j&&j.error)||(en()?'It could not be sent. Please try again.':'No se pudo enviar. Intenta de nuevo.')}})
.catch(function(){st.textContent=en()?'It could not be sent (no internet?).':'No se pudo enviar (¿sin internet?).'}).finally(function(){env.disabled=false})})})();`;

async function sha256hex(t) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const sal = (env) => env.TURNSTILE_SECRET || env.SOCIOS_CLAVE || "cofrade-news";
// Huella anónima: IP + navegador + fecha + sal secreta, recortada. Cambia cada día y no permite saber quién es la persona.
async function huellaVisitante(req, env, fecha, conUA = true) {
  return (await sha256hex([fecha, req.headers.get("CF-Connecting-IP") || "", conUA ? req.headers.get("User-Agent") || "" : "", sal(env)].join("|"))).slice(0, 20);
}
async function dns(nombre, tipo) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nombre)}&type=${tipo}`, { headers: { Accept: "application/dns-json" } });
  return r.json();
}
// ¿El dominio recibe correo? NXDOMAIN o «MX nulo» = no. Sin MX pero con dirección IP = sí (regla del correo). Si el DNS falla, no se castiga al lector.
async function recibeCorreo(dominio) {
  try {
    const mx = await dns(dominio, "MX");
    if (mx.Status === 3) return false;
    const r = (mx.Answer || []).filter((a) => a.type === 15).map((a) => String(a.data || "").trim());
    if (r.length) return !r.every((x) => /^0\s+\.?$/.test(x));
    const a = await dns(dominio, "A");
    return (a.Answer || []).some((x) => x.type === 1);
  } catch { return true; }
}
let _desechables = null;
async function esDesechable(dominio, ctx) {
  if (DESECHABLES.test(dominio + ".")) return true;
  try {
    if (!_desechables) {
      const cache = caches.default, clave = new Request("https://cache.cofrad.es/desechables");
      let r = await cache.match(clave);
      if (!r) {
        const o = await fetch(LISTA_DESECHABLES, { cf: { cacheTtl: 86400, cacheEverything: true } });
        if (!o.ok) return false;
        r = new Response(await o.text(), { headers: { "Cache-Control": "public, max-age=86400" } });
        ctx.waitUntil(cache.put(clave, r.clone()));
      }
      _desechables = new Set((await r.text()).split("\n").map((x) => x.trim().toLowerCase()).filter((x) => x && !x.startsWith("#")));
    }
    const partes = dominio.toLowerCase().split(".");
    for (let i = 0; i < partes.length - 1; i++) if (_desechables.has(partes.slice(i).join("."))) return true;
  } catch { /* si la lista no carga, queda la lista corta de arriba */ }
  return false;
}
async function turnstileOk(token, req, env) {
  if (!env.TURNSTILE_SECRET || !token || token.length > 2048) return false;
  const fd = new FormData();
  fd.append("secret", env.TURNSTILE_SECRET); fd.append("response", token); fd.append("remoteip", req.headers.get("CF-Connecting-IP") || "");
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd });
    const j = await r.json();
    return j.success === true && /(^|\.)cofrad\.es$/.test(String(j.hostname || ""));
  } catch { return false; }
}
// Freno de ráfagas por conexión (binding LIMITE: 30 por minuto y por clave). Si el binding no está, no frena.
async function bajoLimite(env, clave) {
  if (!env.LIMITE || typeof env.LIMITE.limit !== "function") return true;
  try { return (await env.LIMITE.limit({ key: clave })).success; } catch { return true; }
}
// Lee el cuerpo con un tope de bytes aunque el cliente no declare Content-Length. Devuelve null si se pasa.
async function leerCuerpo(req, max) {
  if (Number(req.headers.get("Content-Length") || 0) > max) return null;
  if (!req.body) return "";
  const lector = req.body.getReader(), partes = [];
  let n = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { try { await lector.cancel(); } catch { /* nada */ } return null; }
    partes.push(value);
  }
  const todo = new Uint8Array(n);
  let o = 0;
  for (const x of partes) { todo.set(x, o); o += x.byteLength; }
  return new TextDecoder().decode(todo);
}
function jsonR(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEGURIDAD } });
}
const ORIGEN_OK = (req) => { const o = req.headers.get("Origin") || ""; return !o || /^https:\/\/(www\.)?cofrad\.es$/.test(o); };

async function recibirBuzon(req, env, ctx) {
  if (!ORIGEN_OK(req)) return jsonR({ ok: false, error: "Origen no permitido." }, 403);
  if (!env.DB) return jsonR({ ok: false, error: "El Buzón se habilita en unos minutos." }, 503);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (!(await bajoLimite(env, "b:" + ip))) return jsonR({ ok: false, error: "Demasiados intentos seguidos. Espera un minuto y vuelve a enviar." }, 429);
  const cuerpo = await leerCuerpo(req, 20000);
  if (cuerpo === null) return jsonR({ ok: false, error: "El mensaje es demasiado largo." }, 413);
  const f = new URLSearchParams(cuerpo);
  const v = (k, n) => String(f.get(k) || "").trim().replace(/\s+/g, " ").slice(0, n);
  if (v("pagina_web", 100)) return jsonR({ ok: true, mensaje: "¡Gracias!" });   // trampa para robots: se finge éxito y no se guarda nada
  if (!(await turnstileOk(String(f.get("cf-turnstile-response") || ""), req, env))) return jsonR({ ok: false, error: "No pudimos confirmar que eres una persona. Vuelve a marcar el recuadro de seguridad." }, 400);
  const nombre = v("nombre", 40), apellido = v("apellido", 40), email = v("email", 120).toLowerCase();
  if (!NOMBRE_OK.test(nombre) || !NOMBRE_OK.test(apellido) || NOMBRE_FALSO.test(nombre) || NOMBRE_FALSO.test(apellido) || /(.)\1{3,}/i.test(nombre + " " + apellido))
    return jsonR({ ok: false, error: "Escribe tu nombre y tu apellido reales (solo letras)." }, 400);
  const m = email.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!m || !/\.[a-z]{2,}$/.test(m[1])) return jsonR({ ok: false, error: "Ese email no parece válido. Revisa que esté bien escrito." }, 400);
  if (await esDesechable(m[1], ctx)) return jsonR({ ok: false, error: "No aceptamos correos temporales o desechables. Usa tu email de siempre." }, 400);
  if (!(await recibeCorreo(m[1]))) return jsonR({ ok: false, error: "Ese dominio de correo no recibe emails. Revisa que esté bien escrito." }, 400);
  if (v("acepto", 4) !== "si") return jsonR({ ok: false, error: "Debes aceptar el uso de tus datos." }, 400);
  const gusta = [...new Set(f.getAll("gusta").map(String))].filter((x) => GUSTA.includes(x));
  const agregar = [...new Set(f.getAll("agregar").map(String))].filter((x) => AGREGAR.includes(x));
  const frecuencia = FRECUENCIA.includes(v("frecuencia", 40)) ? v("frecuencia", 40) : "";
  const npsT = v("nps", 2), nps = /^(10|[0-9])$/.test(npsT) ? Number(npsT) : null;
  const texto = String(f.get("texto") || "").replace(/\r\n?/g, "\n").trim().slice(0, 2000);
  if ((texto.match(/https?:\/\/|www\./gi) || []).length > 2) return jsonR({ ok: false, error: "Tu mensaje tiene demasiados enlaces." }, 400);
  if (!gusta.length && !agregar.length && !texto && nps === null) return jsonR({ ok: false, error: "Marca al menos una opción o escribe tu mensaje." }, 400);
  const [porIp, porEmail] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM buzon WHERE ip = ?").bind(ip).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM buzon WHERE email = ? AND fecha >= ?").bind(email, new Date(Date.now() - 86400000).toISOString()).first(),
  ]);
  if ((porIp && porIp.n >= 5) || (porEmail && porEmail.n >= 3)) return jsonR({ ok: false, error: "Ya recibimos varias sugerencias tuyas hoy. ¡Gracias! Vuelve a escribirnos mañana." }, 429);
  const token = (await sha256hex(crypto.randomUUID() + email + Date.now())).slice(0, 40);
  const estado = GROSERO.test(`${texto} ${nombre} ${apellido}`) ? "revisar" : "nuevo";
  await env.DB.prepare("INSERT INTO buzon (fecha, nombre, apellido, email, gusta, agregar, frecuencia, nps, texto, verificado, token, ip, pais, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)")
    .bind(new Date().toISOString(), nombre, apellido, email, JSON.stringify(gusta), JSON.stringify(agregar), frecuencia, nps, texto, token, ip,
      String((req.cf && req.cf.country) || "").slice(0, 2), estado).run();
  let mensaje = "Tu sugerencia quedó en el Buzón. La leeremos con atención.";
  if (hayCorreo(env)) {
    // 15-11-2026 (Germán): «debes automatizar una respuesta automática, respondiéndole de manera personalizada (saludándolo por su
    // Nombre) y agradeciéndole "sus sugerencias y comentarios", porque "nos permite ofrecerle a nuestros lectores un sitio más completo,
    // y con contenidos de lectura más relevantes y de gran interés"». Un solo correo desde hola@cofrad.es: el agradecimiento y, abajo,
    // el botón para confirmar (la verificación del 13-11 sigue: frena a quien escribe con un email ajeno).
    try {
      const enviado = await enviarCorreo(env, { to: email, ...correoGracias({ nombre, gusta, agregar, enlace: `https://${DOMINIO}/buzon/verificar?t=${token}` }) });
      if (enviado) mensaje = "Te enviamos un correo desde hola@cofrad.es: ábrelo y toca «Confirmar mi sugerencia». Si no lo ves, revisa la carpeta de spam o de promociones.";
    } catch { /* si el correo falla, la sugerencia queda guardada como no confirmada */ }
  }
  return jsonR({ ok: true, mensaje });
}
// Correo de confirmación: usa Cloudflare Email Service si está activo (binding EMAIL, requiere plan pagado de Workers);
// si no, Resend (gratis hasta 100 correos al día) con el secreto RESEND_API_KEY. Sin ninguno, la sugerencia queda «sin confirmar».
const hayCorreo = (env) => !!((env.EMAIL && typeof env.EMAIL.send === "function") || env.RESEND_API_KEY);
const CORREO_HOLA = "hola@cofrad.es";   // 15-11-2026 (Germán): las respuestas salen de hola@cofrad.es y las respuestas del lector llegan ahí
async function enviarCorreo(env, { to, subject, text, html: cuerpo, bcc }) {   // bcc: copia oculta (16-11-2026: avisos a anunciantes)
  const de = env.CORREO_REMITENTE || CORREO_HOLA;
  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    await env.EMAIL.send({ from: { email: de, name: "Cofrade News" }, to, replyTo: CORREO_HOLA, subject, text, html: cuerpo, ...(bcc ? { bcc } : {}) });
    return true;
  }
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Cofrade News <${de}>`, to: [to], reply_to: CORREO_HOLA, subject, text, html: cuerpo, ...(bcc ? { bcc: [bcc] } : {}) }) });
    return r.ok;
  }
  return false;
}
// «Crecimiento de Chile, Deportes y Los gráficos» (máximo 4 y «N más»); los valores vienen de las listas fijas del Buzón, no del lector
function enumerar(lista) {
  const v = lista.slice(0, 4), resto = lista.length - v.length;
  if (resto > 0) return `${v.join(", ")} y ${resto} más`;
  return v.length > 1 ? `${v.slice(0, -1).join(", ")} y ${v[v.length - 1]}` : (v[0] || "");
}
function correoGracias({ nombre, gusta, agregar, enlace }) {
  const subject = `¡Gracias por tus sugerencias, ${nombre}!`;
  const extra = [gusta.length ? `Nos alegra saber que disfrutas ${enumerar(gusta)}.` : "", agregar.length ? `Y tomamos nota de lo que te gustaría que agreguemos: ${enumerar(agregar)}.` : ""].filter(Boolean);
  const text = `Hola ${nombre}:\n\nMuchas gracias por tus sugerencias y comentarios, porque nos permiten ofrecerles a nuestros lectores un sitio más completo, y con contenidos de lectura más relevantes y de gran interés.\n\n`
    + (extra.length ? extra.join(" ") + "\n\n" : "")
    + `Para que tu mensaje quede registrado, confírmalo con un clic:\n${enlace}\n(El enlace vence en 7 días. Si no fuiste tú, ignora este correo.)\n\n`
    + `Si quieres contarnos algo más, responde este correo: llega directo a nuestro equipo.\n\nUn cordial saludo,\nEquipo Cofrade News\nwww.cofrad.es · ${CORREO_HOLA}`;
  const p = (t) => `<p style="margin:0 0 14px">${t}</p>`;
  const html = `<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#0B1F3A;max-width:560px;margin:0 auto;padding:8px 4px">`
    + `<p style="margin:0 0 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9A7B2F">Cofrade News · Buzón</p>`
    + p(`Hola ${esc(nombre)}:`)
    + p("Muchas gracias por tus <b>sugerencias y comentarios</b>, porque nos permiten ofrecerles a nuestros lectores un sitio más completo, y con contenidos de lectura más relevantes y de gran interés.")
    + extra.map((x) => p(esc(x))).join("")
    + p("Para que tu mensaje quede registrado, confírmalo con un clic:")
    + `<p style="margin:0 0 18px"><a href="${enlace}" style="display:inline-block;background:#C9A227;color:#0B1F3A;font:700 16px/1 Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:999px">Confirmar mi sugerencia</a></p>`
    + `<p style="margin:0 0 18px;font:13px/1.5 Arial,sans-serif;color:#5A6577">El enlace vence en 7 días. Si no fuiste tú, ignora este correo.</p>`
    + p("Si quieres contarnos algo más, responde este correo: llega directo a nuestro equipo.")
    + `<p style="margin:22px 0 0">Un cordial saludo,<br><b>Equipo Cofrade News</b><br><a href="https://${DOMINIO}/" style="color:#0B1F3A">www.cofrad.es</a> · <a href="mailto:${CORREO_HOLA}" style="color:#0B1F3A">${CORREO_HOLA}</a></p></div>`;
  return { subject, text, html };
}
// Confirmación en dos pasos (abrir el enlace muestra un botón; el botón confirma): así los antivirus del correo, que abren
// los enlaces solos, no confirman por la persona.
async function verificarBuzon(req, u, env) {
  const pagina = (cuerpo, s = 200) => html(marco({ titulo: "Buzón · Cofrade News", descripcion: "", cuerpo }), s, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const vencido = pagina(`<section style="border:0"><span class="kicker">Buzón</span><h1>Este enlace ya se usó o venció.</h1><p class="lede">Si quieres, vuelve a escribirnos desde el Buzón.</p><div class="acciones"><a class="btn oro" href="/#buzon">Abrir el Buzón</a></div></section>`, 410);
  if (req.method === "POST") {
    const cuerpo = await leerCuerpo(req, 2000);
    const t = String((cuerpo && new URLSearchParams(cuerpo).get("t")) || "");
    if (!env.DB || !/^[a-f0-9]{40}$/.test(t)) return vencido;
    const r = await env.DB.prepare("UPDATE buzon SET verificado = 1 WHERE token = ? AND verificado = 0 AND fecha >= ?").bind(t, new Date(Date.now() - 7 * 86400000).toISOString()).run();
    if (!(r && r.meta && r.meta.changes)) return vencido;
    return pagina(`<section style="border:0"><span class="kicker">Buzón</span><h1>¡Listo! Tu sugerencia quedó confirmada.</h1><p class="lede">Gracias por ayudarnos a mejorar Cofrade News.</p><div class="acciones"><a class="btn oro" href="/">Volver a la portada</a></div></section>`);
  }
  const t = String(u.searchParams.get("t") || "");
  if (!env.DB || !/^[a-f0-9]{40}$/.test(t)) return vencido;
  const fila = await env.DB.prepare("SELECT verificado, fecha FROM buzon WHERE token = ?").bind(t).first();
  if (!fila || fila.verificado || fila.fecha < new Date(Date.now() - 7 * 86400000).toISOString()) return vencido;
  return pagina(`<section style="border:0;max-width:640px"><span class="kicker">Buzón</span><h1>Confirma que eres tú</h1><p class="lede">Toca el botón para confirmar tu sugerencia.</p>
<form method="post" action="/buzon/verificar"><input type="hidden" name="t" value="${t}"><button type="submit" class="btn oro" style="margin-top:18px">Confirmar mi sugerencia</button></form></section>`);
}

// ---------- medición propia: lectores únicos por día (sin cookies) y tiempo de lectura por sección ----------
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|monitor|headless|lighthouse|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|scrapy|okhttp/i;
// 15-11-2026 (Germán: «el Panel de Administración debe llevar un registro de un "Contador de Visitas" al Sitio Web (Landing Page) y al
// Newsletter "Cofrade News" (verificando el total de visitas diarias, y el total de visitas únicas que ingresan...)»). Cada apertura
// suma 1 en vistas (fecha, zona); el visitante único del día sigue en visitas (IP + navegador, guardados solo como huella anónima del
// día). Zonas: portada «/», diario «/edicion/…» y otras. Las dos escrituras van por separado: si una falla, la otra igual cuenta.
const zonaDe = (ruta) => (ruta === "/" ? "portada" : String(ruta).startsWith("/edicion/") ? "diario" : "otras");
async function registrarVisita(req, env, ruta) {
  const ua = req.headers.get("User-Agent") || "";
  if (!env.DB || !ua || BOT_UA.test(ua)) return;
  const fecha = fechaChile();
  await Promise.all([
    env.DB.prepare("INSERT OR IGNORE INTO visitas (fecha, ruta, visitante, pais) VALUES (?, ?, ?, ?)")
      .bind(fecha, ruta, await huellaVisitante(req, env, fecha), String((req.cf && req.cf.country) || "").slice(0, 2)).run().catch(() => null),
    env.DB.prepare("INSERT INTO vistas (fecha, zona, n) VALUES (?, ?, 1) ON CONFLICT(fecha, zona) DO UPDATE SET n = n + 1")
      .bind(fecha, zonaDe(ruta)).run().catch(() => null),
    registrarDimensiones(req, env, fecha, zonaDe(ruta)).catch(() => null),   // 16-11-2026: hora, origen y aparato (modulos/tablero.js)
  ]);
}
// Las 2 zonas del contador, día por día (fechas de Chile), desde «desde» hasta hoy, con los días sin visitas en cero. Parte el día en que
// empezó a contar las visitas (el primero que hay en vistas), para no mostrar ceros falsos en días en que el contador aún no existía; los
// visitantes únicos de esos días previos (la tabla visitas existe desde el 13-11-2026) vuelven aparte, en «previos».
async function contadorVisitas(env, desde) {
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results || []).catch(() => []);
  const [pri, vis, uni, tot] = await Promise.all([
    env.DB.prepare("SELECT MIN(fecha) AS f FROM vistas").first().catch(() => null),
    q("SELECT fecha, zona, n FROM vistas WHERE fecha >= ?", desde),
    q("SELECT fecha, CASE WHEN ruta = '/' THEN 'portada' WHEN ruta LIKE '/edicion/%' THEN 'diario' ELSE 'otras' END AS zona, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY fecha, zona", desde),
    q("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY fecha ORDER BY fecha", desde),
  ]);
  const hoy = fechaChile(), inicio = (pri && pri.f) || hoy, desdeReal = inicio > desde ? inicio : desde;
  const dias = {}, dia = (f) => (dias[f] = dias[f] || { fecha: f, pv: 0, pu: 0, dv: 0, du: 0, su: 0 });
  vis.forEach((x) => { if (x.zona === "portada") dia(x.fecha).pv = x.n; else if (x.zona === "diario") dia(x.fecha).dv = x.n; });
  uni.forEach((x) => { if (x.zona === "portada") dia(x.fecha).pu = x.u; else if (x.zona === "diario") dia(x.fecha).du = x.u; });
  tot.forEach((x) => { dia(x.fecha).su = x.u; });
  const filas = [];
  for (let t = Date.parse(desdeReal + "T12:00:00Z"); ; t += 86400000) {
    const f = new Date(t).toISOString().slice(0, 10);
    if (f > hoy) break;
    filas.push(dias[f] || { fecha: f, pv: 0, pu: 0, dv: 0, du: 0, su: 0 });
  }
  return { filas, inicio, previos: tot.filter((x) => x.fecha < desdeReal && x.u > 0) };
}
const ddmm = (f) => `${f.slice(8, 10)}-${f.slice(5, 7)}-${f.slice(0, 4)}`;
const cuantos = (n, uno, varios) => num(n, 0) + " " + (n === 1 ? uno : varios);
// Columnas pareadas por día: visitas (borde y relleno suave) y visitantes únicos (sólido), con el color del tema (claro y oscuro) y una
// escala a la izquierda. Con 7 días o menos, cada columna lleva su número encima (en el teléfono no hay «pasar el mouse»).
function dobles(serie, titulo, color) {   // serie: [[fecha, visitas, únicos]]
  if (!serie.some((x) => x[1] || x[2])) return `<p class="aviso">Aún no hay visitas registradas.</p>`;
  const w = 420, h = 210, izq = 36, abajo = 24, arriba = 18, alto = h - abajo - arriba, n = serie.length;
  const max = Math.max(...serie.map((x) => Math.max(x[1], x[2])), 1), paso = (w - izq - 6) / n, bw = Math.max(2, Math.min(22, Math.floor(paso / 2) - 2));
  const cada = Math.ceil(n / 7), conNumeros = n <= 7, y = (v) => h - abajo - Math.round(v / max * alto);
  const visita = `fill="${color}" fill-opacity=".3" stroke="${color}" stroke-width="1"`, unico = `fill="${color}"`;
  const cols = serie.map(([f, v, u], i) => {
    const x0 = izq + i * paso + (paso - (2 * bw + 2)) / 2, xu = x0 + bw + 2, yv = v ? Math.min(y(v), h - abajo - 2) : h - abajo, yu = u ? Math.min(y(u), h - abajo - 2) : h - abajo;
    return (v ? `<rect x="${x0.toFixed(1)}" y="${yv}" width="${bw}" height="${h - abajo - yv}" rx="2" ${visita}><title>${ddmm(f)}: ${cuantos(v, "visita", "visitas")}</title></rect>` : "")
      + (u ? `<rect x="${xu.toFixed(1)}" y="${yu}" width="${bw}" height="${h - abajo - yu}" rx="2" ${unico}><title>${ddmm(f)}: ${cuantos(u, "visitante único", "visitantes únicos")}</title></rect>` : "")
      + (conNumeros ? `<text x="${(x0 + bw / 2).toFixed(1)}" y="${yv - 4}" font-size="11" text-anchor="middle" fill="var(--gris)">${num(v, 0)}</text><text x="${(xu + bw / 2).toFixed(1)}" y="${yu - 4}" font-size="11" text-anchor="middle" fill="var(--gris)">${num(u, 0)}</text>` : "")
      + (i % cada === 0 ? `<text x="${(x0 + bw + 1).toFixed(1)}" y="${h - 7}" font-size="12" text-anchor="middle" fill="var(--gris)">${f.slice(8, 10)}-${f.slice(5, 7)}</text>` : "");
  }).join("");
  const escala = `<line x1="${izq}" x2="${w - 4}" y1="${h - abajo}" y2="${h - abajo}" stroke="var(--linea)"/>`
    + (conNumeros ? "" : `<line x1="${izq}" x2="${w - 4}" y1="${y(max)}" y2="${y(max)}" stroke="var(--linea)" stroke-dasharray="3 4"/><text x="${izq - 6}" y="${y(max) + 4}" font-size="11" text-anchor="end" fill="var(--gris)">${num(max, 0)}</text>`)
    + `<text x="${izq - 6}" y="${h - abajo + 4}" font-size="11" text-anchor="end" fill="var(--gris)">0</text>`;
  const muestra = (attrs) => `<svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" style="vertical-align:-1px"><rect x=".5" y=".5" width="10" height="10" rx="2" ${attrs}/></svg>`;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(titulo)}">${escala}${cols}</svg>`
    + `<p class="sub" style="margin:6px 0 0">${muestra(visita)} visitas &nbsp; ${muestra(unico)} visitantes únicos</p>`;
}
function seccionVisitas({ filas, inicio, previos }) {
  const hoy = filas[filas.length - 1] || { pv: 0, pu: 0, dv: 0, du: 0, su: 0 };
  const suma = (k) => filas.reduce((a, x) => a + x[k], 0), treinta = filas.length >= 30;
  const kpi = (t, v, s) => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b><br><small>${esc(s)}</small></div>`;
  const filasT = filas.slice().reverse().map((x) => `<tr><td>${ddmm(x.fecha)}</td><td>${num(x.pv, 0)}</td><td>${num(x.pu, 0)}</td><td>${num(x.dv, 0)}</td><td>${num(x.du, 0)}</td><td>${num(x.su, 0)}</td></tr>`).join("");
  const antes = previos.length ? `<p class="sub" style="margin:10px 0 0">Antes del ${ddmm(inicio)} el panel solo registraba visitantes únicos (${previos.map((x) => `${ddmm(x.fecha)}: ${num(x.u, 0)}`).join(" · ")}).</p>` : "";
  return `<section id="contador"><h3>Contador de visitas</h3>
<p class="sub">Una <b>visita</b> es cada vez que alguien abre la página: si la abre 3 veces, son 3 visitas. Un <b>visitante único</b> es una persona por día,
reconocida por su conexión (IP) y su navegador, para no juntar a quienes comparten la misma red (como pasa en las redes de celular). La IP no se guarda:
queda solo una huella anónima que cambia cada día. Robots, buscadores y vistas previas no cuentan. Las visitas se cuentan desde el ${ddmm(inicio)}.</p>
<div class="cifras c4">${kpi("Portada hoy", cuantos(hoy.pv, "visita", "visitas"), cuantos(hoy.pu, "visitante único", "visitantes únicos"))}${kpi("Diario hoy", cuantos(hoy.dv, "visita", "visitas"), cuantos(hoy.du, "visitante único", "visitantes únicos"))}
${kpi("Todo el sitio hoy", cuantos(hoy.su, "visitante único", "visitantes únicos"), "todas las páginas, cada persona una vez")}${kpi(treinta ? "Últimos 30 días" : "Desde el " + ddmm(filas[0] ? filas[0].fecha : inicio), cuantos(suma("pv") + suma("dv"), "visita", "visitas"), "a la portada y al diario")}</div>
<div class="dos d2"><div class="tarjeta"><h4 class="kicker">Portada (Landing Page)</h4>${dobles(filas.map((x) => [x.fecha, x.pv, x.pu]), "Portada: visitas y visitantes únicos por día", "var(--tinta)")}</div>
<div class="tarjeta"><h4 class="kicker">Diario Cofrade News</h4>${dobles(filas.map((x) => [x.fecha, x.dv, x.du]), "Diario: visitas y visitantes únicos por día", "var(--oro)")}</div></div>
<div class="tarjeta" style="margin-top:14px;padding:12px"><div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th rowspan="2">Día</th><th colspan="2">Portada</th><th colspan="2">Diario</th><th rowspan="2">Únicos en<br>todo el sitio</th></tr>
<tr><th>Visitas</th><th>Únicos</th><th>Visitas</th><th>Únicos</th></tr></thead><tbody>${filasT}</tbody></table></div>${antes}</div>
<p style="margin:14px 0 0"><a class="btn linea" href="/panel/visitas.csv">Descargar el contador completo (Excel / CSV)</a></p></section>`;
}
async function panelVisitasCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const { filas } = await contadorVisitas(env, "2000-01-01");   // todo el contador, desde su primer día
  const csv = "\ufefffecha;portada_visitas;portada_unicos;diario_visitas;diario_unicos;sitio_unicos\n"
    + filas.map((x) => [ddmm(x.fecha), x.pv, x.pu, x.dv, x.du, x.su].join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cofrade-visitas-${fechaChile()}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
async function contarVisita(req, env, ruta) {
  try {
    if (req.method !== "GET") return;
    if (/prefetch|prerender/i.test((req.headers.get("Sec-Purpose") || "") + (req.headers.get("Purpose") || ""))) return;   // precargas: se cuentan al abrirse
    if (!(await bajoLimite(env, "v:" + (await huellaVisitante(req, env, fechaChile(), false))))) return;
    await registrarVisita(req, env, ruta);
  } catch { /* la medición nunca rompe la página */ }
}
async function recibirLectura(req, env, ctx) {
  const nada = new Response(null, { status: 204 });
  try {
    if (!env.DB || !ORIGEN_OK(req)) return nada;
    if (!(await bajoLimite(env, "m:" + (await huellaVisitante(req, env, fechaChile(), false))))) return nada;
    const t = await leerCuerpo(req, 4000);
    if (!t) return nada;
    const j = JSON.parse(t);
    const ruta = String(j.r || "").replace(/\/+$/, "").slice(0, 40), me = ruta.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
    if (!me || !(await indice(ctx)).includes(me[1])) return nada;   // solo ediciones publicadas
    if (j.v === 1) await registrarVisita(req, env, ruta);   // página precargada que el lector sí abrió
    const fecha = fechaChile(), ops = [], vistas = new Set(Array.isArray(j.n) ? j.n.map(String) : []);
    for (const [sec, seg] of Object.entries(j.s || {}).slice(0, 40)) {
      const id = String(sec), s = Math.max(0, Math.min(1800, Math.round(Number(seg) || 0)));
      if (!Object.prototype.hasOwnProperty.call(NOMBRE_SECCION, id) || s < 1) continue;   // solo secciones reales de la edición
      ops.push(env.DB.prepare("INSERT INTO lectura (fecha, ruta, seccion, segundos, vistas) VALUES (?, ?, ?, ?, ?) ON CONFLICT(fecha, ruta, seccion) DO UPDATE SET segundos = segundos + excluded.segundos, vistas = vistas + excluded.vistas")
        .bind(fecha, ruta, id, s, vistas.has(sec) ? 1 : 0));
    }
    if (ops.length) await env.DB.batch(ops);
  } catch { /* nada */ }
  return nada;
}
// En la edición: mide cuántos segundos pasa cada sección en la franja central de la pantalla (sirve para secciones largas).
const MEDIR = `<script>(function(){try{var r=location.pathname;if(r.length>1&&r.charAt(r.length-1)==='/')r=r.slice(0,-1);function b(o){try{navigator.sendBeacon('/m',JSON.stringify(o))}catch(e){}}
if(document.prerendering)document.addEventListener('prerenderingchange',function(){b({r:r,v:1})},{once:true});
if(!('IntersectionObserver' in window)||!navigator.sendBeacon)return;var dentro={},t={},v={},acum={},vistos={};
function activo(){return !document.hidden&&!document.prerendering}function abre(id,n){if(activo()&&!v[id])v[id]=n}
function cierra(id,n){if(v[id]){t[id]=(t[id]||0)+(n-v[id])/1000;delete v[id]}}
var io=new IntersectionObserver(function(es){var n=Date.now();es.forEach(function(e){var id=e.target.id;if(!id)return;if(e.isIntersecting){dentro[id]=1;abre(id,n)}else{delete dentro[id];cierra(id,n)}})},{rootMargin:'-40% 0px -40% 0px',threshold:0});
document.querySelectorAll('section.sec[id]').forEach(function(s){io.observe(s)});
function enviar(){var n=Date.now(),s={},nv=[],h=false;for(var k in v)cierra(k,n);for(var k2 in t){var x=Math.round(t[k2]);if(x>=1){s[k2]=Math.min(1800,x);h=true;acum[k2]=(acum[k2]||0)+x;if(acum[k2]>=3&&!vistos[k2]){vistos[k2]=1;nv.push(k2)}}}t={};if(h)b({r:r,s:s,n:nv})}
function reabre(){var n=Date.now();for(var k in dentro)abre(k,n)}
document.addEventListener('visibilitychange',function(){if(document.hidden)enviar();else reabre()});document.addEventListener('prerenderingchange',reabre);addEventListener('pagehide',enviar)}catch(e){}})();<\/script>`;

// ---------- PANEL DE CONTROL (solo Germán): entra con la clave PANEL_CLAVE ----------
async function esAdmin(req, env) {
  if (!env.PANEL_CLAVE) return false;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)cn_adm=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return iguales(m[2], await firma("adm|" + m[1], env.PANEL_CLAVE));
}
function paginaPanelLogin(error = "", status = 200, env = {}) {
  const sinClave = !env.PANEL_CLAVE;
  const cuerpo = `<section style="border:0;max-width:560px"><span class="kicker">Panel de Control</span><h1>Acceso de administración</h1>
${sinClave ? `<p class="lede">El panel se abre cuando exista la clave <b>PANEL_CLAVE</b> en Cloudflare (Workers → cofrade-news-web → Settings → Variables and Secrets).</p>`
    : `<form class="clave" method="post" action="/panel/entrar"><label for="pc" style="position:absolute;left:-9999px">Clave</label><input id="pc" name="clave" type="password" required placeholder="Clave de administración" autocomplete="current-password"><button type="submit">Entrar</button></form>`}
${error ? `<p class="aviso" role="alert" style="color:var(--rojo)">${esc(error)}</p>` : ""}</section>`;
  return html(marco({ titulo: "Panel · Cofrade News", descripcion: "", cuerpo }), status, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}
async function entrarPanel(req, env) {
  if (!env.PANEL_CLAVE) return paginaPanelLogin("", 200, env);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (env.DB) {
    const r = await env.DB.prepare("INSERT INTO intentos (ip, fecha, n) VALUES (?, ?, 1) ON CONFLICT(ip, fecha) DO UPDATE SET n = n + 1 RETURNING n").bind(ip, hoy).first().catch(() => null);
    if (r && r.n > 8) return paginaPanelLogin("Demasiados intentos hoy desde esta conexión. Prueba mañana.", 429, env);
  }
  const cuerpo = await leerCuerpo(req, 2000);
  const clave = String((cuerpo && new URLSearchParams(cuerpo).get("clave")) || "").slice(0, 200);
  await new Promise((r) => setTimeout(r, 500));   // frena los intentos a ciegas
  if (!iguales(await firma("c|" + clave, env.PANEL_CLAVE), await firma("c|" + env.PANEL_CLAVE, env.PANEL_CLAVE))) return paginaPanelLogin("Clave incorrecta.", 401, env);
  if (env.DB) await env.DB.prepare("DELETE FROM intentos WHERE ip = ? AND fecha = ?").bind(ip, hoy).run().catch(() => {});
  const vence = Date.now() + 7 * 86400000;
  return new Response(null, { status: 303, headers: { Location: "/panel", "Cache-Control": "no-store",
    "Set-Cookie": `cn_adm=${vence}.${await firma("adm|" + vence, env.PANEL_CLAVE)}; Max-Age=${7 * 86400}; Path=/panel; Secure; HttpOnly; SameSite=Strict` } });
}
function barras(filas, color = "#B8892B") {   // filas: [[etiqueta, valor, nota?]]
  if (!filas.length) return `<p class="aviso">Aún no hay datos.</p>`;
  const max = Math.max(...filas.map((x) => x[1]), 1);
  return `<div class="barras">${filas.map(([e, n, nota]) => `<div class="barra"><span class="be">${esc(e)}</span><span class="bb"><i style="width:${Math.max(2, n / max * 100).toFixed(1)}%;background:${color}"></i></span><b>${num(n, 0)}${nota ? ` <small>${esc(nota)}</small>` : ""}</b></div>`).join("")}</div>`;
}
function calor(filas) {   // [[sección, segundos, lecturas]]: mapa de calor de la atención por sección
  if (!filas.length) return `<p class="aviso">Aún no hay lecturas medidas: el contador parte con esta versión del sitio.</p>`;
  const max = Math.max(1, ...filas.map((x) => x[1]));
  const tiempo = (s) => (s < 60 ? `${num(s, 0)} s` : s < 36000 ? `${num(s / 60, s < 600 ? 1 : 0)} min` : `${num(s / 3600, 1)} h`);
  return `<div class="calor">${filas.map(([n, se, vi]) => `<div class="cel" style="--a:${(0.08 + 0.57 * se / max).toFixed(2)}"><b>${esc(n)}</b><span>${tiempo(se)} · ${num(vi, 0)} lecturas</span></div>`).join("")}</div>`;
}
const NOMBRE_SECCION = { economia: "Economía", politica: "Política y Congreso", emprendimiento: "Emprendimiento", tecnologia: "Tecnología", conflictos: "Conflictos",
  efemerides: "Efemérides", naval: "Historia naval", onomastico: "Santoral", indicadores: "Indicadores", clima: "Clima", mar: "Mar y mareas", sismos: "Sismos", vuelos: "Vuelos",
  feriados: "Feriados", inmobiliario: "Inmobiliario", industrias: "Industrias", entretenimiento: "Entretenimiento", biografia: "Biografía", ciencia: "Ciencia",
  astronomia: "Astronomía", deportes: "Deportes", horoscopo: "Horóscopo" };
// 16-11-2026: panel() pasó a modulos/tablero.js (tablero con filtros, ayudas, gráficos y publicidad pagada).
async function panelCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const filas = (await env.DB.prepare("SELECT fecha, nombre, apellido, email, verificado, gusta, agregar, frecuencia, nps, texto, estado, pais FROM buzon ORDER BY id").all()).results || [];
  const c = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas inyectadas
  const lista = (j) => { try { return JSON.parse(j || "[]").join(" | "); } catch { return ""; } };
  const csv = "﻿fecha;nombre;apellido;email;email_confirmado;le_gusta;quiere_agregar;frecuencia;nps;mensaje;estado;pais\n"
    + filas.map((r) => [r.fecha, r.nombre, r.apellido, r.email, r.verificado ? "sí" : "no", lista(r.gusta), lista(r.agregar), r.frecuencia, r.nps, r.texto, r.estado, r.pais].map(c).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="buzon-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", ...SEGURIDAD } });
}

// ---------- SOCIOS FUNDADORES DEL DASHBOARD FINANCIERO · MERCADO PAGO (14-11-2026) ----------
// Decisiones de Germán (14-11-2026): nadie paga por algo que aún no existe, así que el primer cobro llega el día del lanzamiento
// del Dashboard Financiero, el 1 de diciembre de 2026 (o 7 días después de inscribirse, si eso es más tarde). Plan mensual $5.000
// o anual $55.000 (un mes de regalo); los socios de la Cofradía pagan 20 % menos escribiendo su clave de socio. La aplicación es
// «Cofrade News» (id 8369215541599277) en la cuenta de Mercado Pago de Destak E.I.R.L.
// Secretos (los crea Germán en Cloudflare): MP_ACCESS_TOKEN (cobrar) y MP_WEBHOOK_SECRET (firma de los avisos). Sin el primero,
// el botón «Quiero ser socio fundador» sigue abriendo el formulario de interés, como antes.
// Apertura en dos pasos (auditoría del 14-11): con las llaves puestas, las inscripciones siguen CERRADAS al público. Germán se
// inscribe primero en privado (Panel → «Probar la inscripción»), mira en el Panel la fecha del primer cobro que anotó Mercado Pago
// y recién entonces aprieta «Abrir inscripciones al público». La documentación de Mercado Pago no asegura que `start_date` difiera
// el primer cobro: si Mercado Pago anota uno anterior a lo prometido, la suscripción se pausa sola y el Panel lo avisa en rojo.
// Seguridad: el precio, la frecuencia y la fecha los fija este programa (nunca el navegador); cada aviso de Mercado Pago se acepta
// solo con su firma válida y su contenido se vuelve a preguntar a Mercado Pago con la llave (nunca se confía en el aviso).
const MP_API = "https://api.mercadopago.com";
const LANZAMIENTO_DASHBOARD = Date.parse("2026-12-01T12:00:00-03:00");
const PLANES_SOCIO = { mensual: { frecuencia: 1, monto: 5000 }, anual: { frecuencia: 12, monto: 55000 } };
const esPlan = (k) => Object.prototype.hasOwnProperty.call(PLANES_SOCIO, k);   // «__proto__» o «toString» no son planes
const ESTADO_MP = { pending: "pendiente", authorized: "activa", paused: "pausada", cancelled: "cancelada", canceled: "cancelada" };
const MARGEN_COBRO = 24 * 3600000;   // un primer cobro anotado más de 1 día antes de lo prometido = Mercado Pago no respetó la fecha
const primerCobro = (ahora = Date.now()) => Math.max(LANZAMIENTO_DASHBOARD, ahora + 7 * 86400000);
const isoChile = (ms) => fechaChile(new Date(ms));
const pesos = (n) => "$" + num(n, 0);
const clp = (n) => "CLP " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fechaFrase = (iso) => { const t = fechaLarga(iso).replace(",", ""); return t.charAt(0).toLowerCase() + t.slice(1); };   // fecha dentro de una frase: día de la semana en minúscula y sin coma
const precioSocio = (plan, cofradia, pct) => Math.round(PLANES_SOCIO[plan].monto * (cofradia ? 1 - pct / 100 : 1) / 10) * 10;
const mpActivo = (env) => !!(env.MP_ACCESS_TOKEN && String(env.MP_ACCESS_TOKEN).trim() && env.DB);
const DE_MP = /^https:\/\/(www\.)?mercadopago\.(cl|com)\//;
const PARTICULA = /^(de|del|la|las|los|y|e|da|das|do|dos|di|van|von|der|den|san|santa)$/i;
const INICIAL = /^\p{L}\.?$/u;

async function leerConfig(env, clave) {
  try {
    const r = await env.DB.prepare("SELECT valor FROM config WHERE clave = ?").bind(clave).first();
    return r ? String(r.valor) : null;
  } catch { return null; }
}
async function ponerConfig(env, clave, valor) {
  await env.DB.prepare("INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(clave, String(valor)).run();
}
async function pctCofradia(env) {
  const n = Number(await leerConfig(env, "descuento_cofradia_pct"));
  return Number.isFinite(n) && n > 0 && n <= 50 ? n : 20;
}
async function mpPedir(env, metodo, ruta, cuerpo) {
  const r = await fetch(MP_API + ruta, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(10000),   // 10 s como máximo
    headers: { Authorization: `Bearer ${String(env.MP_ACCESS_TOKEN || "").trim()}`, "Content-Type": "application/json" } });
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  return { ok: r.ok, status: r.status, j };
}

// Inscripciones abiertas al público (botón del Panel) o prueba privada de Germán (galleta firmada de 2 horas, solo en /socios).
async function tienePrueba(req, env) {
  if (!env.PANEL_CLAVE) return false;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)cn_prueba=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return iguales(m[2], await firma("prueba|" + m[1], env.PANEL_CLAVE));
}
async function modoInscripcion(req, env) {
  if (!mpActivo(env)) return "cerrada";
  if ((await leerConfig(env, "fundadores_abierto")) === "1") return "abierta";
  return (await tienePrueba(req, env)) ? "prueba" : "cerrada";
}
// GET /panel/probar (solo con la sesión del Panel): deja la galleta de prueba y lleva al formulario.
async function probarInscripcion(req, env) {
  if (!(await esAdmin(req, env))) return new Response(null, { status: 303, headers: { Location: "/panel", "Cache-Control": "no-store" } });
  const exp = Date.now() + 2 * 3600000;
  return new Response(null, { status: 303, headers: { Location: "/socios/fundador", "Cache-Control": "no-store",
    "Set-Cookie": `cn_prueba=${exp}.${await firma("prueba|" + exp, env.PANEL_CLAVE)}; Max-Age=7200; Path=/socios; Secure; HttpOnly; SameSite=Strict` } });
}

Object.assign(EN_FIJO, {
  "Socios fundadores · Dashboard Financiero": "Founding members · Financial Dashboard",
  "Inscríbete hoy. No pagas nada hasta el": "Sign up today. You pay nothing until",
  "Puente de Mando reúne la bolsa chilena y extranjera, ETF, cripto, el dinero que entra y sale de Chile y el radar político que mueve los mercados.":
    "The Bridge brings together the Chilean and foreign stock markets, ETFs, crypto, the money flowing in and out of Chile and the political radar that moves markets.",
  "Elige tu plan": "Choose your plan", "Mensual": "Monthly", "Anual": "Annual", "al mes": "per month", "al año, con un mes de regalo": "per year, with one month free",
  "Socios de la Cofradía:": "Cofradía members:", "Nombre y apellido *": "First and last name *",
  "Email de tu cuenta de Mercado Pago *": "Email of your Mercado Pago account *",
  "Leí y acepto las": "I have read and accept the", "condiciones de la suscripción": "subscription terms",
  "Inscribirme con Mercado Pago": "Sign up with Mercado Pago",
  "Mercado Pago te pedirá tu tarjeta para autorizar el cobro automático. Hoy no se cobra nada: el primer cargo llega el":
    "Mercado Pago will ask for your card to authorize the automatic charge. Nothing is charged today: the first charge comes on",
  "Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.": "You can cancel anytime from your Mercado Pago account.",
  "Las inscripciones de socios fundadores abren pronto. Déjanos tus datos y te avisamos.":
    "Founding member sign-ups open soon. Leave us your details and we will let you know.",
  "Modo de prueba: solo tú ves este formulario, durante 2 horas. Para el público las inscripciones siguen cerradas.":
    "Test mode: only you can see this form, for 2 hours. Sign-ups are still closed to the public.",
  "Avísenme cuando abra": "Let me know when it opens", "Continuar a Mercado Pago": "Continue to Mercado Pago",
  "Te llevamos a Mercado Pago para que autorices el cobro.": "We are taking you to Mercado Pago to authorize the charge.",
  "Estado de tu inscripción": "Your sign-up status", "Quedaste inscrito como socio fundador.": "You are signed up as a founding member.",
  "Tu primer cargo:": "Your first charge:", "Tu inscripción quedó pendiente: falta autorizar el pago en Mercado Pago.":
    "Your sign-up is pending: the payment still has to be authorized in Mercado Pago.", "Autorizar en Mercado Pago": "Authorize in Mercado Pago",
  "Tu suscripción está en pausa: no se te cobra mientras siga así.": "Your subscription is paused: you will not be charged while it stays that way.",
  "Tu suscripción quedó cancelada. No se te cobrará nada más.": "Your subscription was canceled. You will not be charged again.",
  "No encontramos esa inscripción.": "We could not find that sign-up.", "Volver a la portada": "Back to the home page",
  "Condiciones de la suscripción de socio fundador": "Founding member subscription terms",
  "Socios fundadores · Cofrade News": "Founding members · Cofrade News", "Condiciones de la suscripción · Cofrade News": "Subscription terms · Cofrade News",
  "Socios fundadores: te inscribes hoy y el primer cobro llega el 1 de diciembre de 2026.": "Founding members: sign up today and the first charge comes on December 1, 2026.",
  "Versión del 14 de noviembre de 2026.": "Version of November 14, 2026.",
});

function paginaFundador(env, pct, modo) {
  const ms = primerCobro(), dia = isoChile(ms);
  const fechaHtml = `<span data-iso="${dia}">${esc(fechaFrase(dia))}</span>`;
  const rotClave = `Clave de socio de la Cofradía (opcional, para el ${pct} % menos)`;
  EN_FIJO[rotClave] = `Cofradía member password (optional, for ${pct}% off)`;
  const plan = (k, rot, det, sel) => `<label class="plan-s"><input type="radio" name="plan" value="${k}"${sel ? " checked" : ""}>
<span class="plan-c"><b>${rot}</b><span class="plan-m">${pesos(PLANES_SOCIO[k].monto)}</span><span>${det}</span>
<small><span>Socios de la Cofradía:</span> ${pesos(precioSocio(k, true, pct))}</small></span></label>`;
  const form = modo !== "cerrada"
    ? `${modo === "prueba" ? `<p class="aviso">Modo de prueba: solo tú ves este formulario, durante 2 horas. Para el público las inscripciones siguen cerradas.</p>` : ""}
<form class="pub-form fundador" id="fFundador" method="post" action="/socios/fundador" novalidate>
<fieldset><legend>Elige tu plan</legend><div class="planes-s">${plan("mensual", "Mensual", "al mes", true)}${plan("anual", "Anual", "al año, con un mes de regalo", false)}</div></fieldset>
<label>Nombre y apellido *<input name="nombre" required maxlength="80" autocomplete="name"></label>
<label>Email de tu cuenta de Mercado Pago *<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>${esc(rotClave)}<input name="clave" type="password" maxlength="80" autocomplete="off"></label>
<label class="pub-hp" aria-hidden="true">Sitio web<input name="pagina_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> <span><span>Leí y acepto las</span> <a href="/socios/condiciones" target="_blank" rel="noopener">condiciones de la suscripción</a></span></label>
<div class="cf-turnstile ts" data-sitekey="${TURNSTILE_SITEKEY}" data-language="es"></div>
<button type="submit" class="pub-enviar">Inscribirme con Mercado Pago</button><p class="pub-estado" role="status" aria-live="polite"></p>
<p class="sub"><span>Mercado Pago te pedirá tu tarjeta para autorizar el cobro automático. Hoy no se cobra nada: el primer cargo llega el</span> ${fechaHtml}.
<span>Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.</span></p></form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>(function(){var f=document.getElementById('fFundador');if(!f||!window.fetch)return;var st=f.querySelector('.pub-estado'),b=f.querySelector('.pub-enviar'),en=function(){return document.documentElement.lang==='en'};
f.addEventListener('submit',function(ev){ev.preventDefault();st.textContent=en()?'Connecting with Mercado Pago…':'Conectando con Mercado Pago…';b.disabled=true;
fetch('/socios/fundador',{method:'POST',headers:{'Accept':'application/json'},body:new URLSearchParams(new FormData(f))}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){
if(j&&j.ok&&j.url){st.textContent=en()?'Taking you to Mercado Pago…':'Te llevamos a Mercado Pago…';location.assign(j.url);return}
st.textContent=(j&&j.error)||(en()?'We could not connect. Try again in a minute.':'No pudimos conectar. Intenta de nuevo en un minuto.');b.disabled=false;try{if(window.turnstile)turnstile.reset()}catch(e){}
}).catch(function(){st.textContent=en()?'We could not connect. Try again in a minute.':'No pudimos conectar. Intenta de nuevo en un minuto.';b.disabled=false})})})();</script>`
    : `<p class="aviso">Las inscripciones de socios fundadores abren pronto. Déjanos tus datos y te avisamos.</p>
<div class="acciones"><button type="button" class="btn oro pub-abrir" data-interes="Dashboard Financiero · socio fundador" aria-haspopup="dialog">Avísenme cuando abra</button></div>`;
  const estilo = `<style>.planes-s{display:grid;grid-template-columns:1fr 1fr;gap:12px}.plan-s{position:relative}.plan-s input{position:absolute;opacity:0}
.plan-c{display:flex;flex-direction:column;gap:2px;border:1.5px solid var(--linea);border-radius:14px;padding:14px;cursor:pointer;font-weight:400}
.plan-c b{font-size:15px}.plan-m{font:700 28px var(--serif,Georgia,serif);color:var(--tinta)}.plan-s input:checked+.plan-c{border-color:var(--oro,#B8892B);box-shadow:0 0 0 2px rgba(184,137,43,.25)}
.plan-s input:focus-visible+.plan-c{outline:2px solid var(--oro,#B8892B);outline-offset:2px}@media (max-width:540px){.planes-s{grid-template-columns:1fr}}</style>`;
  const cuerpo = `${estilo}<section style="border:0;max-width:720px"><span class="kicker">Socios fundadores · Dashboard Financiero</span>
<h1 class="titulo-lujo"><span>Inscríbete hoy. No pagas nada hasta el</span> ${fechaHtml}.</h1>
<p class="lede">Puente de Mando reúne la bolsa chilena y extranjera, ETF, cripto, el dinero que entra y sale de Chile y el radar político que mueve los mercados.</p>
${form}</section>`;
  return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "Inscríbete como socio fundador del Dashboard Financiero de Cofrade News.",
    cuerpo, canonica: "/socios/fundador" }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// POST /socios/fundador → crea la suscripción en Mercado Pago (pendiente hasta que la persona autorice su tarjeta allá).
async function crearSuscripcion(req, env, ctx) {
  const quiereJson = /json/.test(req.headers.get("Accept") || "");
  const responder = (ok, datos, status = 200) => {
    if (quiereJson) return jsonR(ok ? { ok: true, url: datos } : { ok: false, error: datos }, status);
    const cuerpo = ok
      ? `<section style="border:0;max-width:620px"><span class="kicker">Socios fundadores · Dashboard Financiero</span><h1>Te llevamos a Mercado Pago para que autorices el cobro.</h1>
<div class="acciones"><a class="btn oro" href="${esc(datos)}">Continuar a Mercado Pago</a></div></section>`
      : `<section style="border:0;max-width:620px"><span class="kicker">Socios fundadores · Dashboard Financiero</span><p class="aviso" role="alert">${esc(datos)}</p>
<div class="acciones"><a class="btn linea" href="/socios/fundador">Volver</a></div></section>`;
    return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "", cuerpo, canonica: "/socios/fundador" }), status, { "Cache-Control": "no-store" });
  };
  if (!ORIGEN_OK(req)) return responder(false, "Origen no permitido.", 403);
  if ((await modoInscripcion(req, env)) === "cerrada") return responder(false, "Las inscripciones de socios fundadores abren pronto.", 503);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (!(await bajoLimite(env, "s:" + ip))) return responder(false, "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.", 429);
  const cuerpo = await leerCuerpo(req, 8000);
  if (cuerpo === null) return responder(false, "El formulario es demasiado largo.", 413);
  const f = new URLSearchParams(cuerpo);
  const v = (k, n) => String(f.get(k) || "").trim().replace(/\s+/g, " ").slice(0, n);
  if (v("pagina_web", 100)) return responder(false, "No pudimos procesar la inscripción.", 400);   // trampa para robots
  if (!(await turnstileOk(String(f.get("cf-turnstile-response") || ""), req, env)))
    return responder(false, "No pudimos confirmar que eres una persona. Vuelve a marcar el recuadro de seguridad.", 400);
  const nombre = v("nombre", 80), email = v("email", 120).toLowerCase(), plan = v("plan", 10), clave = String(f.get("clave") || "").slice(0, 80);
  // Nombre real: al menos 2 palabras de verdad; se aceptan iniciales («Juan P Pérez») y partículas («Errázuriz y Ovalle», «de la Fuente»)
  const partes = nombre.split(" "), palabras = partes.filter((x) => !PARTICULA.test(x) && !INICIAL.test(x));
  if (palabras.length < 2 || !partes.every((x) => NOMBRE_OK.test(x) || INICIAL.test(x) || PARTICULA.test(x)) || NOMBRE_FALSO.test(partes[0]) || /(.)\1{3,}/i.test(nombre))
    return responder(false, "Escribe tu nombre y tu apellido reales (solo letras).", 400);
  const m = email.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!m || !/\.[a-z]{2,}$/.test(m[1])) return responder(false, "Ese email no parece válido. Usa el de tu cuenta de Mercado Pago.", 400);
  if (await esDesechable(m[1], ctx)) return responder(false, "No aceptamos correos temporales o desechables. Usa el de tu cuenta de Mercado Pago.", 400);
  if (!esPlan(plan)) return responder(false, "Elige el plan mensual o el anual.", 400);
  if (v("acepto", 4) !== "si") return responder(false, "Debes aceptar las condiciones de la suscripción.", 400);
  let cofradia = false;
  if (clave) {
    if (!env.SOCIOS_CLAVE || !iguales(await firma("c|" + clave, env.SOCIOS_CLAVE), await firma("c|" + env.SOCIOS_CLAVE, env.SOCIOS_CLAVE)))
      return responder(false, "Esa clave de socio no es correcta. Déjala en blanco para inscribirte sin el precio Cofradía.", 400);
    cofradia = true;
  }
  // Candado por correo (auditoría del 14-11): dos pestañas o un doble envío no crean dos suscripciones a la vez.
  const candado = "candado:" + (await sha256hex("sus|" + email)).slice(0, 24), t0 = Date.now();
  const tomado = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?")
    .bind(candado, String(t0), t0 - 90000).run();
  if (!tomado || !tomado.meta || tomado.meta.changes !== 1)
    return responder(false, "Ya estamos procesando una inscripción con ese correo. Espera un minuto y revisa tu cuenta de Mercado Pago.", 409);
  try {
    return await inscribir(env, responder, { nombre, email, plan, cofradia, ip });
  } finally {
    await env.DB.prepare("DELETE FROM config WHERE clave = ? AND valor = ?").bind(candado, String(t0)).run().catch(() => null);   // solo el candado propio
  }
}

async function inscribir(env, responder, { nombre, email, plan, cofradia, ip }) {
  const ahoraIso = () => new Date().toISOString();
  const vivas = (await env.DB.prepare("SELECT * FROM suscripciones WHERE email = ? AND estado IN ('creada', 'pendiente', 'activa', 'pausada') ORDER BY creado DESC LIMIT 6")
    .bind(email).all()).results || [];
  // Una pendiente pudo quedar autorizada en Mercado Pago sin que llegara el aviso: se le pregunta antes de decidir.
  for (const x of vivas.filter((y) => y.estado === "pendiente" && y.mp_id).slice(0, 3)) {
    const r = await mpPedir(env, "GET", `/preapproval/${encodeURIComponent(x.mp_id)}`).catch(() => ({ ok: false }));
    if (r.ok) { const n = await actualizarSuscripcion(env, r.j); if (n) x.estado = n.estado; }
  }
  if (vivas.some((x) => ["activa", "pausada"].includes(x.estado)))
    return responder(false, "Ese correo ya tiene una suscripción de socio fundador. Revísala en tu cuenta de Mercado Pago, en «Suscripciones».", 409);
  if (vivas.some((x) => x.estado === "creada" && Date.now() - Date.parse(x.creado) < 120000))   // con 10 s por pedido, nunca dura más
    return responder(false, "Ya estamos procesando una inscripción con ese correo. Espera un minuto y revisa tu cuenta de Mercado Pago.", 409);
  const igual = vivas.find((x) => x.estado === "pendiente" && x.enlace && DE_MP.test(x.enlace) && x.plan === plan && !!x.cofradia === cofradia
    && Date.now() - Date.parse(x.creado) < 86400000);
  if (igual) return responder(true, igual.enlace);   // la dejó a medias hoy con el mismo plan: el mismo enlace
  // Las demás pendientes se cancelan en Mercado Pago ANTES de crear la nueva: así nunca quedan dos que se puedan autorizar.
  for (const x of vivas.filter((y) => y.estado === "pendiente" && y.mp_id)) {
    const r = await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(x.mp_id)}`, { status: "cancelled" }).catch(() => ({ ok: false }));
    if (!r.ok) return responder(false, "No pudimos cerrar tu inscripción anterior en Mercado Pago. Intenta de nuevo en unos minutos.", 502);
    await env.DB.prepare("UPDATE suscripciones SET estado = 'cancelada', actualizado = ? WHERE ref = ?").bind(ahoraIso(), x.ref).run();
  }
  for (const x of vivas.filter((y) => y.estado === "creada" || (y.estado === "pendiente" && !y.mp_id)))
    await env.DB.prepare("UPDATE suscripciones SET estado = 'error', actualizado = ? WHERE ref = ?").bind(ahoraIso(), x.ref).run();
  const pct = await pctCofradia(env), monto = precioSocio(plan, cofradia, pct), inicio = new Date(primerCobro()).toISOString();
  const ref = "CN-" + (await sha256hex(crypto.randomUUID())).slice(0, 12);
  await env.DB.prepare("INSERT INTO suscripciones (ref, creado, nombre, email, plan, monto, cofradia, inicio, estado, actualizado, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'creada', ?, ?)")
    .bind(ref, ahoraIso(), nombre, email, plan, monto, cofradia ? 1 : 0, inicio, ahoraIso(), ip).run();
  const r = await mpPedir(env, "POST", "/preapproval", {
    reason: `Cofrade News · socio fundador ${plan}${cofradia ? " Cofradía" : ""}`, external_reference: ref, payer_email: email,
    auto_recurring: { frequency: PLANES_SOCIO[plan].frecuencia, frequency_type: "months", start_date: inicio, transaction_amount: monto, currency_id: "CLP" },
    back_url: `https://${DOMINIO}/socios/gracias?ref=${ref}`, status: "pending" }).catch(() => ({ ok: false, status: 0, j: null }));
  const enlace = r.j && r.j.init_point, mpId = r.j && r.j.id ? String(r.j.id) : null;
  if (!r.ok || !enlace || !DE_MP.test(enlace) || (r.j && r.j.status && r.j.status !== "pending")) {
    // nunca queda una suscripción huérfana que alguien pueda autorizar: si Mercado Pago la creó, se cancela
    if (mpId) await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(mpId)}`, { status: "cancelled" }).catch(() => null);
    await env.DB.prepare("UPDATE suscripciones SET estado = 'error', mp_id = ?, actualizado = ? WHERE ref = ?").bind(mpId, ahoraIso(), ref).run();
    const msg = r.status === 400 ? "Mercado Pago no aceptó el correo: usa el email con que entras a tu cuenta de Mercado Pago."
      : "Mercado Pago no respondió. Intenta de nuevo en unos minutos.";
    return responder(false, msg, 502);
  }
  const u = await env.DB.prepare("UPDATE suscripciones SET estado = 'pendiente', mp_id = ?, enlace = ?, actualizado = ? WHERE ref = ? AND estado = 'creada'")
    .bind(mpId, enlace, ahoraIso(), ref).run();
  if (!u.meta || u.meta.changes !== 1) {   // otra inscripción del mismo correo la dio por perdida mientras Mercado Pago tardaba
    await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(mpId)}`, { status: "cancelled" }).catch(() => null);
    return responder(false, "Mercado Pago tardó demasiado en responder. Intenta de nuevo en unos minutos.", 502);
  }
  return responder(true, enlace);
}

// Pone al día una suscripción con lo que dice Mercado Pago (aviso firmado, regreso desde Mercado Pago o revisión del panel).
// Si Mercado Pago anotó un primer cobro anterior a lo prometido, o si Germán pausó todas, la deja en pausa en Mercado Pago.
async function actualizarSuscripcion(env, pre) {
  if (!pre || !pre.id) return null;
  const fila = await env.DB.prepare("SELECT * FROM suscripciones WHERE ref = ? OR mp_id = ? LIMIT 1").bind(String(pre.external_reference || ""), String(pre.id)).first();
  if (!fila) return null;
  let estado = ESTADO_MP[pre.status] || fila.estado, pausadaPor = fila.pausada_por || null;
  const ahora = new Date().toISOString();
  const proximo = pre.next_payment_date ? String(pre.next_payment_date) : (fila.proximo || null);   // solo el dato de Mercado Pago (auditoría N3)
  if (estado === "activa") {
    pausadaPor = null;
    const promesa = Date.parse(fila.inicio), prox = Date.parse(pre.next_payment_date || "");
    const antes = Number.isFinite(promesa) && Number.isFinite(prox) && Date.now() < promesa && prox < promesa - MARGEN_COBRO;
    const enPausa = (await leerConfig(env, "suscripciones_en_pausa")) === "1";
    if (!antes && Number.isFinite(prox) && Number.isFinite(promesa) && prox >= promesa - MARGEN_COBRO)
      await ponerConfig(env, "fecha_verificada", fila.ref).catch(() => null);   // Mercado Pago anotó la fecha prometida: se puede abrir
    if (antes || enPausa) {
      const r = await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(pre.id)}`, { status: "paused" }).catch(() => ({ ok: false }));
      if (r.ok) { estado = "pausada"; pausadaPor = antes ? "seguridad" : "admin"; }
      if (antes) {
        await ponerConfig(env, "fundadores_abierto", "0").catch(() => null);
        await ponerConfig(env, "alerta_mp", JSON.stringify({ tipo: "fecha", ref: fila.ref, email: fila.email, proximo: pre.next_payment_date, prometido: fila.inicio, pausada: !!r.ok, hora: ahora })).catch(() => null);
      }
      if (!r.ok) throw new Error("No se pudo pausar en Mercado Pago");   // el aviso responde 500 y Mercado Pago lo repite (auditoría N5)
    }
  } else if (estado === "pausada" && fila.estado !== "pausada") {
    pausadaPor = null;   // la pausó el cliente desde Mercado Pago (las del Panel y las de seguridad llegan ya marcadas)
  }
  await env.DB.prepare("UPDATE suscripciones SET estado = ?, mp_id = ?, proximo = ?, actualizado = ?, pausada_por = ? WHERE ref = ?")
    .bind(estado, String(pre.id), proximo, ahora, pausadaPor, fila.ref).run();
  const est = estado === "activa" ? (Date.now() < Date.parse(fila.inicio) ? "prueba" : "activo") : estado === "pausada" ? "pausado" : estado === "cancelada" ? "cancelado" : null;
  if (est) {
    await env.DB.prepare(`INSERT INTO usuarios (email, nombre, creado, ultimo, cofradia, estado, plan, vence, mp_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET nombre = excluded.nombre, ultimo = excluded.ultimo, cofradia = MAX(usuarios.cofradia, excluded.cofradia), estado = excluded.estado,
plan = excluded.plan, vence = excluded.vence, mp_id = excluded.mp_id`).bind(fila.email, fila.nombre, ahora, ahora, fila.cofradia, est, fila.plan, proximo, String(pre.id)).run();
  }
  return { ...fila, estado, proximo, pausada_por: pausadaPor };
}
async function registrarCobro(env, ap) {
  if (!ap || !ap.id) return null;
  const fila = await env.DB.prepare("SELECT ref, email, inicio FROM suscripciones WHERE mp_id = ? LIMIT 1").bind(String(ap.preapproval_id || "")).first();
  if (!fila) return null;   // un cobro que no es de Cofrade News
  const pago = ap.payment || {};
  const id = pago.id ? String(pago.id) : "ap-" + ap.id, fecha = String(ap.debit_date || ap.date_created || new Date().toISOString());
  const monto = Math.round(Number(ap.transaction_amount) || 0);
  await env.DB.prepare("INSERT OR REPLACE INTO pagos (id, email, monto, fecha, estado, tipo, ref) VALUES (?, ?, ?, ?, ?, 'suscripcion', ?)")
    .bind(id, fila.email, monto, fecha, String(pago.status || ap.status || ""), fila.ref).run();
  // Auditoría N2: si Mercado Pago cobra ANTES de lo prometido (y corre la fecha siguiente), next_payment_date no lo delata;
  // el cobro sí. Se pausa, se cierran las inscripciones y el Panel avisa en rojo para devolverlo.
  const promesa = Date.parse(fila.inicio), cuando = Date.parse(fecha);
  if (Number.isFinite(promesa) && Number.isFinite(cuando) && cuando < promesa - MARGEN_COBRO) {
    const r = await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(String(ap.preapproval_id))}`, { status: "paused" }).catch(() => ({ ok: false }));
    if (r.ok) await env.DB.prepare("UPDATE suscripciones SET estado = 'pausada', pausada_por = 'seguridad', actualizado = ? WHERE ref = ?").bind(new Date().toISOString(), fila.ref).run();
    await ponerConfig(env, "fundadores_abierto", "0");
    await ponerConfig(env, "alerta_mp", JSON.stringify({ tipo: "cobro", ref: fila.ref, email: fila.email, cobro: fecha, monto, prometido: fila.inicio, pausada: !!r.ok, hora: new Date().toISOString() }));
    if (!r.ok) throw new Error("No se pudo pausar en Mercado Pago");
  }
  return id;
}
// Lanza un error si hay que reintentar (Mercado Pago caído o la base no guardó): el aviso responde 500 y Mercado Pago lo repite.
async function procesarAvisoMP(env, tipo, id) {
  const ruta = /preapproval$/.test(tipo) ? `/preapproval/${encodeURIComponent(id)}` : /authorized_payment$/.test(tipo) ? `/authorized_payments/${encodeURIComponent(id)}` : null;
  if (!ruta) return;
  const r = await mpPedir(env, "GET", ruta);
  if (r.status === 404) return;   // un aviso de prueba o de otro producto: no se reintenta
  if (!r.ok) throw new Error("Mercado Pago " + r.status);   // caído, llave cambiada o revocada: 500 y Mercado Pago reintenta
  if (/preapproval$/.test(tipo)) await actualizarSuscripcion(env, r.j);
  else await registrarCobro(env, r.j);
}

// POST /mp/aviso: los avisos de Mercado Pago. Firma HMAC-SHA256 de «id:<data.id>;request-id:<x-request-id>;ts:<ts>;» con la
// clave secreta de la aplicación. Se procesa ANTES de responder (auditoría del 14-11: si falla, 500 y Mercado Pago reintenta; antes
// se respondía 200 aunque el cobro no quedara anotado).
async function avisoMP(req, u, env) {
  if (!env.MP_WEBHOOK_SECRET || !mpActivo(env)) return jsonR({ ok: false, error: "Avisos aún no activos." }, 503);   // Mercado Pago reintenta
  const s = req.headers.get("x-signature") || "", rid = req.headers.get("x-request-id") || "";
  let ts = "", v1 = "";
  for (const p of s.split(",")) {
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = p.slice(0, i).trim(), val = p.slice(i + 1).trim();
    if (k === "ts") ts = val;
    if (k === "v1") v1 = val.toLowerCase();
  }
  const cuerpo = await leerCuerpo(req, 65536);
  let b = {};
  try { b = JSON.parse(cuerpo || "{}"); } catch { b = {}; }
  const dataId = String(u.searchParams.get("data.id") || "").toLowerCase();
  const partes = [];
  if (dataId) partes.push(`id:${dataId}`);
  if (rid) partes.push(`request-id:${rid}`);
  partes.push(`ts:${ts}`);
  if (!ts || !/^[a-f0-9]{64}$/.test(v1) || !iguales(await firma(partes.join(";") + ";", String(env.MP_WEBHOOK_SECRET).trim()), v1))
    return jsonR({ ok: false, error: "Firma no válida." }, 401);
  const tipo = String(u.searchParams.get("type") || b.type || b.topic || ""), id = String(u.searchParams.get("data.id") || (b.data && b.data.id) || "");
  if (id && /^[\w-]{1,64}$/.test(id)) {
    try { await procesarAvisoMP(env, tipo, id); } catch { return jsonR({ ok: false, error: "No se pudo procesar ahora; Mercado Pago reintentará." }, 500); }
  }
  return jsonR({ ok: true });
}

function cajaEstado(fila) {
  const k = `<span class="kicker">Estado de tu inscripción</span>`;
  if (!fila) return `${k}<h1>No encontramos esa inscripción.</h1>`;
  const primer = isoChile(Date.parse(fila.proximo || fila.inicio));
  const nombre = esc(String(fila.nombre || "").split(" ")[0]);
  if (fila.estado === "activa")
    return `${k}<h1>${nombre ? nombre + ": " : ""}<span>Quedaste inscrito como socio fundador.</span></h1>
<p class="lede"><span>Tu primer cargo:</span> <b>${pesos(fila.monto)}</b>, <span data-iso="${primer}">${esc(fechaFrase(primer))}</span>.
<span>Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.</span></p>`;
  if (fila.estado === "pausada") return `${k}<h1>Tu suscripción está en pausa: no se te cobra mientras siga así.</h1>`;
  if (fila.estado === "cancelada") return `${k}<h1>Tu suscripción quedó cancelada. No se te cobrará nada más.</h1>`;
  return `${k}<h1>Tu inscripción quedó pendiente: falta autorizar el pago en Mercado Pago.</h1>
${fila.enlace && DE_MP.test(fila.enlace) ? `<div class="acciones"><a class="btn oro" href="${esc(fila.enlace)}">Autorizar en Mercado Pago</a></div>` : ""}`;
}
// GET /socios/gracias?ref=CN-…: a donde vuelve la persona desde Mercado Pago. Se pregunta el estado real a Mercado Pago, con freno
// (auditoría del 14-11): a lo más una vez por minuto por inscripción y dentro del freno de ráfagas de cada conexión.
async function paginaGracias(req, u, env) {
  const ref = String(u.searchParams.get("ref") || "");
  let fila = /^CN-[a-f0-9]{12}$/.test(ref) && env.DB ? await env.DB.prepare("SELECT * FROM suscripciones WHERE ref = ?").bind(ref).first() : null;
  if (fila && fila.mp_id && mpActivo(env) && fila.estado !== "cancelada" && !(Date.now() - Date.parse(fila.actualizado || "") < 60000)
      && (await bajoLimite(env, "g:" + (await huellaVisitante(req, env, fechaChile(), false))))) {
    const r = await mpPedir(env, "GET", `/preapproval/${encodeURIComponent(fila.mp_id)}`).catch(() => ({ ok: false }));
    if (r.ok) fila = (await actualizarSuscripcion(env, r.j).catch(() => null)) || fila;
  }
  const cuerpo = `<section style="border:0;max-width:620px">${cajaEstado(fila)}<div class="acciones"><a class="btn linea" href="/">Volver a la portada</a></div></section>`;
  return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "", cuerpo, canonica: "/socios/gracias" }), fila ? 200 : 404,
    { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// GET /socios/condiciones: las reglas de la suscripción en palabras simples. Los precios salen de la misma cuenta que cobra.
function condiciones(pct) {
  const m = PLANES_SOCIO.mensual.monto, a = PLANES_SOCIO.anual.monto, mc = precioSocio("mensual", true, pct), ac = precioSocio("anual", true, pct);
  return [
    ["Quién vende", "El Dashboard Financiero de Cofrade News lo presta Destak E.I.R.L. Los cobros los procesa Mercado Pago; Cofrade News nunca ve ni guarda los datos de tu tarjeta.",
      "Cofrade News' Financial Dashboard is provided by Destak E.I.R.L. Charges are processed by Mercado Pago; Cofrade News never sees or stores your card details."],
    ["Precio", `Plan mensual: ${pesos(m)} al mes. Plan anual: ${pesos(a)} al año (equivale a 11 meses). Los socios de la Cofradía que escriben su clave de socio pagan ${pct} % menos: ${pesos(mc)} al mes o ${pesos(ac)} al año. Los precios incluyen impuestos.`,
      `Monthly plan: ${clp(m)} per month. Annual plan: ${clp(a)} per year (the same as 11 months). Cofradía members who enter their member password pay ${pct}% less: ${clp(mc)} per month or ${clp(ac)} per year. Prices include taxes.`],
    ["Cuándo se cobra", "Al inscribirte autorizas el cobro automático en Mercado Pago, pero hoy no se cobra nada. El primer cargo llega el 1 de diciembre de 2026, día del lanzamiento del Dashboard Financiero, o 7 días después de inscribirte si te inscribes después del 24 de noviembre. Luego se cobra cada mes o cada año, según tu plan. Mercado Pago puede hacer un cargo mínimo para validar la tarjeta, que devuelve de inmediato.",
      "When you sign up you authorize the automatic charge in Mercado Pago, but nothing is charged today. The first charge comes on December 1, 2026, the launch day of the Financial Dashboard, or 7 days after you sign up if you sign up after November 24. After that you are charged every month or every year, depending on your plan. Mercado Pago may make a small charge to validate the card, which it refunds right away."],
    ["Si el lanzamiento se atrasa", "Si el Dashboard Financiero no está disponible el 1 de diciembre de 2026, pausamos tu suscripción antes de esa fecha y no se te cobra hasta que lo esté.",
      "If the Financial Dashboard is not available on December 1, 2026, we will pause your subscription before that date and you will not be charged until it is."],
    ["Cómo cancelar", "Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago (sección «Suscripciones») o escribiéndonos desde el Buzón de www.cofrad.es. La cancelación detiene los cobros siguientes.",
      "You can cancel anytime from your Mercado Pago account (the Subscriptions section) or by writing to us through the Suggestion box at www.cofrad.es. Canceling stops the following charges."],
    ["Boleta", "Por cada cobro, Destak E.I.R.L. emite la boleta electrónica que corresponde.",
      "For each charge, Destak E.I.R.L. issues the corresponding electronic receipt (boleta)."],
    ["Tus datos", "Guardamos tu nombre, tu email, el estado de tu suscripción y una huella seudónima de la conexión desde la que te inscribiste (no guardamos tu dirección IP; la huella sirve para frenar abusos), solo para darte acceso, emitir tus boletas y proteger el sitio. No los vendemos ni los compartimos, salvo con Mercado Pago para procesar el pago. Puedes pedir que los borremos escribiéndonos desde el Buzón de www.cofrad.es.",
      "We keep your name, your email, the status of your subscription and a pseudonymous fingerprint of the connection you signed up from (we do not store your IP address; the fingerprint helps stop abuse), only to give you access, issue your receipts and protect the site. We do not sell or share them, except with Mercado Pago to process the payment. You can ask us to delete them by writing to us through the Suggestion box at www.cofrad.es."],
    ["Qué no es", "El Dashboard Financiero es información general y educativa. No es asesoría de inversión ni una recomendación de compra o venta, y no considera tu situación personal.",
      "The Financial Dashboard is general and educational information. It is not investment advice or a recommendation to buy or sell, and it does not consider your personal situation."],
  ];
}
Object.assign(EN_FIJO, {
  "Quién vende": "Who sells", "Precio": "Price", "Cuándo se cobra": "When you are charged", "Si el lanzamiento se atrasa": "If the launch is delayed",
  "Cómo cancelar": "How to cancel", "Volver": "Back", "Boleta": "Receipt", "Tus datos": "Your data", "Qué no es": "What it is not",
});
function paginaCondiciones(pct) {
  const lista = condiciones(pct);
  for (const [, es, en] of lista) EN_FIJO[es] = en;   // la traducción va con los mismos montos
  const cuerpo = `<section style="border:0;max-width:760px"><span class="kicker">Socios fundadores · Dashboard Financiero</span>
<h1>Condiciones de la suscripción de socio fundador</h1><p class="sub">Versión del 14 de noviembre de 2026.</p>
${lista.map(([t, d]) => `<h3>${esc(t)}</h3><p>${esc(d)}</p>`).join("\n")}
<div class="acciones"><a class="btn oro" href="/socios/fundador">Inscribirme con Mercado Pago</a></div></section>`;
  return html(marco({ titulo: "Condiciones de la suscripción · Cofrade News", descripcion: "Condiciones de la suscripción de socio fundador del Dashboard Financiero de Cofrade News.",
    cuerpo, canonica: "/socios/condiciones" }), 200, { "Cache-Control": "public, max-age=600" });
}

// POST /panel/suscripciones (solo Germán, desde el panel). Acciones:
// · abrir / cerrar: inscripciones al público (abrir exige las dos llaves y que no estén en pausa).
// · pausar: lo que promete la cláusula «Si el lanzamiento se atrasa». Cierra las inscripciones, pone al día las pendientes (una que
//   ya autorizó en Mercado Pago también queda en pausa) y pausa las activas, de a 25 por vez (límite de pedidos del plan gratuito).
// · reanudar: solo las que pausó el Panel (nunca las que pausó el propio cliente).
async function accionSuscripciones(req, env) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const ir = (r) => new Response(null, { status: 303, headers: { Location: "/panel?suscripciones=" + encodeURIComponent(r) + "#socios", "Cache-Control": "no-store" } });
  if (!mpActivo(env)) return ir("sin-llave");
  const f = new URLSearchParams((await leerCuerpo(req, 2000)) || "");
  const accion = f.get("accion");
  const q = (s, ...b) => env.DB.prepare(s).bind(...b).all().then((r) => r.results || []);
  const cuantas = async (s, ...b) => Number(((await env.DB.prepare(s).bind(...b).first()) || {}).n || 0);
  if (accion === "alerta") { await env.DB.prepare("DELETE FROM config WHERE clave = 'alerta_mp'").run(); return ir("alerta-borrada"); }
  if (accion === "abrir") {
    if (!env.MP_WEBHOOK_SECRET) return ir("falta-aviso");
    if ((await leerConfig(env, "suscripciones_en_pausa")) === "1") return ir("en-pausa");
    if (await leerConfig(env, "alerta_mp")) return ir("con-alerta");
    if (!(await leerConfig(env, "fecha_verificada"))) return ir("sin-verificar");
    await ponerConfig(env, "fundadores_abierto", "1");
    return ir("abiertas");
  }
  if (accion === "cerrar") { await ponerConfig(env, "fundadores_abierto", "0"); return ir("cerradas"); }
  if (accion !== "pausar" && accion !== "reanudar") return ir("");
  const pausar = accion === "pausar";
  await ponerConfig(env, "suscripciones_en_pausa", pausar ? "1" : "0");
  let hechas = 0, fallas = 0;
  if (pausar) {
    await ponerConfig(env, "fundadores_abierto", "0");
    for (const x of await q("SELECT mp_id FROM suscripciones WHERE estado = 'pendiente' AND mp_id IS NOT NULL AND mp_id <> '' ORDER BY actualizado LIMIT 8")) {
      const r = await mpPedir(env, "GET", `/preapproval/${encodeURIComponent(x.mp_id)}`).catch(() => ({ ok: false }));
      const n = r.ok ? await actualizarSuscripcion(env, r.j).catch(() => null) : null;   // si ya autorizó, queda en pausa ahí mismo
      if (n && n.estado === "pausada" && n.pausada_por === "admin") hechas++;
    }
  }
  const donde = pausar ? "estado = 'activa'" : "estado = 'pausada' AND pausada_por = 'admin'";
  const filas = await q(`SELECT ref, mp_id FROM suscripciones WHERE ${donde} AND mp_id IS NOT NULL AND mp_id <> '' LIMIT 25`);
  for (const x of filas) {
    try {
      const r = await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(x.mp_id)}`, { status: pausar ? "paused" : "authorized" });
      if (!r.ok) { fallas++; continue; }
      await env.DB.prepare("UPDATE suscripciones SET estado = ?, pausada_por = ?, actualizado = ? WHERE ref = ?")
        .bind(pausar ? "pausada" : "activa", pausar ? "admin" : null, new Date().toISOString(), x.ref).run();
      hechas++;
    } catch { fallas++; }
  }
  const quedan = await cuantas(`SELECT COUNT(*) AS n FROM suscripciones WHERE ${donde} AND mp_id IS NOT NULL AND mp_id <> ''`);
  return ir(`${accion}:${hechas}:${fallas}:${quedan}`);
}

function mensajeAccion(r) {
  const m = String(r || "").match(/^(pausar|reanudar):(\d+):(\d+):(\d+)$/);
  if (m) {
    const [, a, h, f, q] = m, n = Number(q);
    return `${a === "pausar" ? "Pausadas" : "Reanudadas"}: ${h}.${Number(f) ? ` Fallaron ${f} (Mercado Pago no respondió).` : ""}`
      + (n ? ` Quedan ${n}: aprieta «${a === "pausar" ? "Pausar todas" : "Reanudar las pausadas"}» otra vez.` : a === "pausar" ? " No queda ninguna activa: nadie paga mientras sigan en pausa." : " No queda ninguna pausada por el Panel.");
  }
  return { abiertas: "Inscripciones abiertas al público.", cerradas: "Inscripciones cerradas: la página muestra «Avísenme cuando abra».",
    "falta-aviso": "Para abrir las inscripciones falta la clave MP_WEBHOOK_SECRET en Cloudflare.",
    "en-pausa": "Las suscripciones están en pausa: reanúdalas antes de abrir las inscripciones.", "sin-llave": "Falta la clave MP_ACCESS_TOKEN en Cloudflare.",
    "con-alerta": "Hay un aviso en rojo sin revisar: no se abren las inscripciones hasta revisarlo.", "alerta-borrada": "Aviso borrado.",
    "sin-verificar": "Todavía no hay una suscripción de prueba activa con la fecha de Mercado Pago: haz primero la prueba privada." }[r] || "";
}

// Panel (solo Germán): inscripciones y cobros. De paso, pone al día hasta 6 suscripciones que no se revisan hace más de 6 horas,
// por si algún aviso de Mercado Pago no llegó.
async function panelSocios(env, u) {
  if (!env.DB) return "";
  const q = (s, ...b) => env.DB.prepare(s).bind(...b).all().then((r) => r.results || []).catch(() => []);
  if (mpActivo(env)) {
    const viejas = await q("SELECT mp_id FROM suscripciones WHERE mp_id IS NOT NULL AND mp_id <> '' AND estado IN ('pendiente', 'activa', 'pausada') AND actualizado < ? ORDER BY actualizado LIMIT 6",
      new Date(Date.now() - 6 * 3600000).toISOString());
    await Promise.all(viejas.map((x) => mpPedir(env, "GET", `/preapproval/${encodeURIComponent(x.mp_id)}`).then((r) => (r.ok ? actualizarSuscripcion(env, r.j) : null)).catch(() => null)));
  }
  const [subs, cobros, abierto, enPausa, alertaTxt, verificada] = await Promise.all([
    q("SELECT creado, nombre, email, plan, monto, cofradia, estado, proximo, inicio, pausada_por FROM suscripciones WHERE estado NOT IN ('creada', 'error') ORDER BY creado DESC LIMIT 200"),
    q("SELECT id, email, monto, fecha, estado FROM pagos WHERE tipo = 'suscripcion' ORDER BY fecha DESC LIMIT 200"),
    leerConfig(env, "fundadores_abierto"), leerConfig(env, "suscripciones_en_pausa"), leerConfig(env, "alerta_mp"), leerConfig(env, "fecha_verificada"),
  ]);
  let alerta = null;
  try { alerta = JSON.parse(alertaTxt || "null"); } catch { alerta = null; }
  const cuenta = (e) => subs.filter((x) => x.estado === e).length;
  const mensual = subs.filter((x) => x.estado === "activa").reduce((a, x) => a + (x.plan === "anual" ? x.monto / 12 : x.monto), 0);
  const kpi = (t, v, s = "") => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b>${s ? `<br><small>${esc(s)}</small>` : ""}</div>`;
  const pausaTxt = (x) => x.estado !== "pausada" ? "" : x.pausada_por === "admin" ? " (Panel)" : x.pausada_por === "seguridad" ? " (seguridad)" : " (cliente)";
  const fila = (x) => `<tr><td>${esc(String(x.creado).slice(0, 10))}</td><td>${esc(x.nombre)}</td><td>${esc(x.email)}</td><td>${esc(x.plan)}${x.cofradia ? " · Cofradía" : ""}</td>
<td>${pesos(x.monto)}</td><td>${esc(x.estado + pausaTxt(x))}</td><td>${x.proximo ? esc(String(x.proximo).slice(0, 10)) : `${esc(String(x.inicio || "").slice(0, 10))} <small>(prometido; Mercado Pago aún no lo confirma)</small>`}</td></tr>`;
  const msg = mensajeAccion(u ? u.searchParams.get("suscripciones") : "");
  const listas = mpActivo(env) && !!env.MP_WEBHOOK_SECRET;
  const boton = (accion, texto) => `<button class="btn linea" name="accion" value="${accion}" type="submit">${texto}</button>`;
  return `<section id="socios"><h3>Socios fundadores (Mercado Pago)</h3>
${msg ? `<p class="aviso" role="status">${esc(msg)}</p>` : ""}
${alerta ? `<p class="aviso" role="alert" style="color:var(--rojo)">${alerta.tipo === "cobro"
    ? `Mercado Pago COBRÓ ${pesos(alerta.monto || 0)} a ${esc(alerta.email || alerta.ref || "")} el ${esc(String(alerta.cobro || "").slice(0, 10))}, antes de lo prometido (${esc(String(alerta.prometido || "").slice(0, 10))}). Hay que devolverle ese cobro desde tu cuenta de Mercado Pago.`
    : `Mercado Pago anotó para ${esc(alerta.email || alerta.ref || "")} un primer cobro el ${esc(String(alerta.proximo || "").slice(0, 10))}, antes de lo prometido (${esc(String(alerta.prometido || "").slice(0, 10))}).`}
${alerta.pausada ? "La dejé en pausa en Mercado Pago y cerré las inscripciones" : "NO se pudo pausar: páusala tú en Mercado Pago"}. No abras las inscripciones hasta revisarlo conmigo.</p>
<form method="post" action="/panel/suscripciones" class="acciones" style="margin:0 0 12px"><button class="btn linea" name="accion" value="alerta" type="submit">Ya lo revisé: borrar el aviso</button></form>` : ""}
${mpActivo(env) ? "" : `<p class="aviso">Falta la clave MP_ACCESS_TOKEN en Cloudflare: el botón «Quiero ser socio fundador» todavía abre el formulario de interés.</p>`}
${mpActivo(env) && !env.MP_WEBHOOK_SECRET ? `<p class="aviso">Falta la clave MP_WEBHOOK_SECRET: los avisos de Mercado Pago esperan y las inscripciones no se pueden abrir al público.</p>` : ""}
${enPausa === "1" && cuenta("activa") ? `<p class="aviso" role="alert" style="color:var(--rojo)">Hay ${num(cuenta("activa"), 0)} suscripción(es) activa(s) aunque pausaste todas: aprieta «Pausar todas» otra vez.</p>` : ""}
${mpActivo(env) ? `<p class="sub">Inscripciones: <b>${abierto === "1" ? "abiertas al público" : "cerradas al público"}</b>${enPausa === "1" ? " · <b>suscripciones en pausa</b> (nadie paga mientras sigan así)" : ""}.
${abierto === "1" ? "" : verificada ? "La prueba privada salió bien: Mercado Pago anotó el primer cobro en la fecha prometida." : "Antes de abrir: «Probar la inscripción», inscríbete con tu tarjeta y autoriza en Mercado Pago. Cuando tu suscripción de prueba quede activa con el «Próximo cobro» 2026-12-01, aparece el botón «Abrir inscripciones al público»."}</p>
<div class="acciones" style="margin:10px 0 14px"><a class="btn linea" href="/panel/probar">Probar la inscripción (solo tú, 2 horas)</a>
<form method="post" action="/panel/suscripciones" style="display:contents">${listas && abierto !== "1" && enPausa !== "1" && !alerta && verificada ? boton("abrir", "Abrir inscripciones al público") : ""}${abierto === "1" ? boton("cerrar", "Cerrar inscripciones") : ""}
${subs.length ? boton("pausar", "Pausar todas (no se cobra a nadie)") + boton("reanudar", "Reanudar las pausadas") : ""}</form></div>
${subs.length ? `<p class="sub">«Pausar todas» es lo que promete la cláusula «Si el lanzamiento se atrasa»: úsalo si el Dashboard no está listo el 1 de diciembre. «Reanudar» solo reactiva las que pausó el Panel.</p>` : ""}` : ""}
<div class="cifras">${kpi("Inscritos con tarjeta autorizada", num(cuenta("activa"), 0), "cobro desde el 1 de diciembre")}${kpi("Pendientes de autorizar", num(cuenta("pendiente"), 0))}
${kpi("En pausa o cancelados", num(cuenta("pausada") + cuenta("cancelada"), 0))}${kpi("Ingreso mensual esperado", pesos(Math.round(mensual)), "planes anuales divididos por 12")}</div>
${subs.length ? `<div class="tabla"><table><thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Plan</th><th>Monto</th><th>Estado</th><th>Próximo cobro</th></tr></thead><tbody>${subs.slice(0, 60).map(fila).join("")}</tbody></table></div>` : `<p class="aviso">Todavía no hay inscripciones.</p>`}
<h4 class="kicker" style="margin-top:18px">Cobros recibidos (para emitir cada boleta)</h4>
${cobros.length ? `<div class="tabla"><table><thead><tr><th>Fecha</th><th>Email</th><th>Monto</th><th>Estado</th><th>N° Mercado Pago</th></tr></thead><tbody>${cobros.map((x) => `<tr><td>${esc(String(x.fecha).slice(0, 10))}</td><td>${esc(x.email)}</td><td>${pesos(x.monto)}</td><td>${esc(x.estado)}</td><td>${esc(x.id)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="aviso">Aún no hay cobros: el primero llega el 1 de diciembre de 2026.</p>`}</section>`;
}

// ---------- TABLERO v2 Y PUBLICIDAD PAGADA (16-11-2026) ----------
// Germán, 15-11-2026: «al pasar el cursor encima de cada KPI y de cada gráfico aparezca una ventana emergente con una descripción
// detallada de lo que representa el valor obtenido [...] más KPIs de medición y más gráficos dinámicos, pudiendo filtrar por meses, por
// año y por cada ítem del "Mapa de Calor" [...] una sección con las empresas que pagan por publicidad [...] Y cuando les quede unos 7
// días para el vencimiento de su publicidad contratada le enviarás un email automático». Sus respuestas: el Panel es el registro único
// de los anunciantes que pagan, SIN mezclar sus marcas propias (son permanentes, no caducan); el correo sale solo, con copia a
// hola@cofrad.es; la renovación se ofrece a UF 11 por un año.

// ===== 1. De dónde llega cada visita, a qué hora y en qué aparato (sin datos personales: solo se suma 1 en una casilla) =====
const ORIGENES = { directo: "Directo o desde una app", interno: "Desde otra página del sitio", buscadores: "Buscadores", ia: "Asistentes de IA",
  redes: "Redes sociales y mensajería", correo: "Correo electrónico", otros: "Otros sitios web" };
const DISPOSITIVOS = { celular: "Celular", computador: "Computador", tablet: "Tablet" };
const RE_IA = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|you\.com|meta\.ai|grok\.com|deepseek\.com|mistral\.ai)$/;
const RE_CORREO = /^(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com|mail\.yahoo\.com|mail\.proton\.me|mail\.aol\.com|mail\.zoho\.com|(webmail|correo|mail)\.[a-z0-9.-]+)$/;
const RE_BUSCADOR = /(^|\.)(google\.[a-z]{2,3}(\.[a-z]{2})?|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.brave\.com|yandex\.[a-z]{2,3}|baidu\.com|qwant\.com|startpage\.com)$/;
const RE_REDES = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|whatsapp\.com|wa\.me|telegram\.org|t\.me|threads\.net|tiktok\.com|youtube\.com|youtu\.be|reddit\.com|bsky\.app|pinterest\.com|mastodon\.social)$/;
const APPS_ORIGEN = { "com.google.android.gm": "correo", "com.microsoft.office.outlook": "correo", "com.google.android.googlequicksearchbox": "buscadores",
  "com.whatsapp": "redes", "org.telegram.messenger": "redes", "com.facebook.katana": "redes", "com.instagram.android": "redes", "com.linkedin.android": "redes", "com.twitter.android": "redes" };
// [origen, sitio que la envió]. Los enlaces con utm_source (los que se comparten a propósito) mandan; si no, la página de la que vino.
function origenVisita(req, u) {
  const q = (k) => String((u && u.searchParams.get(k)) || "").toLowerCase().slice(0, 60);
  const fuente = q("utm_source"), medio = q("utm_medium");
  if (fuente || medio) {
    const t = fuente + " " + medio;
    if (/mail|correo|newsletter|bolet/.test(t)) return ["correo", ""];
    if (/whatsapp|telegram|facebook|instagram|linkedin|twitter|tiktok|threads|youtube|social|redes|^x /.test(t)) return ["redes", ""];
    if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(t)) return ["ia", ""];
    if (/google|bing|cpc|search|busca/.test(t)) return ["buscadores", ""];
    return ["otros", ""];
  }
  const ref = String(req.headers.get("Referer") || "");
  const app = ref.match(/^android-app:\/\/([a-z0-9_.]{3,80})/i);   // apps de Android (Gmail, WhatsApp...) se identifican así
  if (app) return [APPS_ORIGEN[app[1].toLowerCase()] || "otros", ""];
  let host = "";
  try { host = new URL(ref).hostname.toLowerCase(); } catch { host = ""; }
  if (!host) return ["directo", ""];
  if (host === DOMINIO || host === "cofrad.es" || host.endsWith(".cofrad.es")) return ["interno", ""];
  host = host.replace(/^www\./, "");
  if (RE_IA.test(host)) return ["ia", host];
  if (RE_CORREO.test(host)) return ["correo", host];
  if (RE_BUSCADOR.test(host)) return ["buscadores", host];
  if (RE_REDES.test(host)) return ["redes", host];
  return ["otros", host];
}
function dispositivoVisita(req) {
  const ua = req.headers.get("User-Agent") || "";
  if (/iPad|Tablet|PlayBook|Silk|Kindle|SM-T\d|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (req.headers.get("Sec-CH-UA-Mobile") === "?1" || /Mobi|iPhone|iPod|Android|IEMobile|Opera Mini|Windows Phone|BlackBerry/i.test(ua)) return "celular";
  return "computador";
}
const horaDeChile = (ms = Date.now()) => { const h = Number(_FMT_HORA_CL.format(new Date(ms))); return Number.isFinite(h) ? h % 24 : 0; };
// Una sola escritura por visita (hora × origen × aparato van en la misma casilla) y otra solo si vino desde otro sitio.
async function registrarDimensiones(req, env, fecha, zona) {
  let u = null;
  try { u = new URL(req.url); } catch { u = null; }
  const [origen, host] = origenVisita(req, u);
  const ops = [env.DB.prepare("INSERT INTO dimensiones (fecha, zona, hora, origen, disp, n) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(fecha, zona, hora, origen, disp) DO UPDATE SET n = n + 1")
    .bind(fecha, zona, horaDeChile(), origen, dispositivoVisita(req))];
  if (host && /^[a-z0-9.-]{3,80}$/.test(host)) ops.push(env.DB.prepare("INSERT INTO referentes (fecha, host, n) VALUES (?, ?, 1) ON CONFLICT(fecha, host) DO UPDATE SET n = n + 1").bind(fecha, host));
  await env.DB.batch(ops);
}

// ===== 2. Utilidades =====
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const masDias = (f, n) => new Date(Date.parse(f + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const diasHasta = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
const finDeMes = (y, m) => new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
function unAnioDesde(f) { const [y, m, d] = f.split("-").map(Number); return masDias(new Date(Date.UTC(y + 1, m - 1, d, 12)).toISOString().slice(0, 10), -1); }
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || "")) && !Number.isNaN(Date.parse(f + "T12:00:00Z")) && new Date(f + "T12:00:00Z").toISOString().slice(0, 10) === f;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_OK = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
const EXT_LOGO = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const BASE_SITIO = "https://" + DOMINIO;
const PRECIO_RENOVACION = { monto: 11, moneda: "UF" };   // Germán, 15-11-2026: «UF 11 al año» (12 meses al precio de 11)
function slugAnuncio(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "anunciante";
}
// https://… o http://… (agrega https:// si se escribió sin él). "" si viene vacío; null si no es una dirección web válida.
function webOk(v) {
  let t = String(v || "").trim();
  if (!t) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = "https://" + t.replace(/^\/+/, "");
  try {
    const x = new URL(t);
    if (!/^https?:$/.test(x.protocol) || x.username || x.password || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x.hostname) || x.href.length > 300) return null;
    return x.href;
  } catch { return null; }
}
function rutValido(r) {
  const t = String(r || "").replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(t)) return false;
  let s = 0, m = 2;
  for (let i = t.length - 2; i >= 0; i--) { s += Number(t[i]) * m; m = m === 7 ? 2 : m + 1; }
  const dv = 11 - (s % 11);
  return t.slice(-1) === (dv === 11 ? "0" : dv === 10 ? "K" : String(dv));
}
const rutConPuntos = (r) => { const t = String(r).replace(/[.\s-]/g, "").toUpperCase(); return t.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + t.slice(-1); };
function tintaSobre(hex) {   // texto blanco o azul marino según qué se lee mejor sobre ese fondo
  if (!HEX6.test(hex || "")) return "#FFFFFF";
  const n = parseInt(hex.slice(1), 16), L = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return L > 0.6 ? "#0B1F3A" : "#FFFFFF";
}
const montoTxt = (m, moneda) => (moneda === "CLP" ? "$" + num(m, 0) : "UF " + num(m, Number(m) % 1 ? 2 : 0));
const _FMT_FH = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fechaHora = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? _FMT_FH.format(new Date(t)).replace(",", "").replace(/\//g, "-") : ""; };
const pctTxt = (x) => num(x, x < 10 && x % 1 ? 1 : 0) + " %";

// Marcas propias de Germán (sitio/marcas.json): permanentes, fuera del registro de anunciantes. Sus clics van con «m-» delante.
const marcasPropias = () => ((MARCAS && MARCAS.marcas) || []);
const slugMarca = (m) => "m-" + slugAnuncio(m.nombre);
const dominioRaiz = (h) => String(h || "").toLowerCase().replace(/\.$/, "").split(".").slice(-2).join(".");
function hostsPropios() {
  const s = new Set(["caddiegolf.cl"]);
  for (const m of marcasPropias()) { const w = webOk(m.url); if (w) s.add(dominioRaiz(new URL(w).hostname)); }
  return s;
}

// ===== 3. Avisos vigentes: portada (carrusel), /publicidad.json (para el diario) y /ir (clics) =====
let ANUNCIOS = { t: 0, lista: [] };   // copia en memoria 5 minutos: la portada no consulta la base en cada visita
function logoDe(a, absoluta = false) {   // absoluta: para el diario (se abre también fuera del sitio); relativa: portada y panel
  if (a.logo_tipo && a.logo_v && EXT_LOGO[a.logo_tipo]) return `${absoluta ? BASE_SITIO : ""}/anuncios/${a.slug}.${EXT_LOGO[a.logo_tipo]}?v=${a.logo_v}`;
  return /^https:\/\/[^\s"'<>]+\.(png|jpe?g|webp|gif)(\?[^\s"'<>]*)?$/i.test(a.logo_url || "") ? a.logo_url : "";
}
async function avisosVigentes(env, hoy) {
  const r = await env.DB.prepare(`SELECT a.id, a.slug, a.empresa, a.titulo, a.texto, a.boton1_texto, a.boton1_web, a.boton2_texto, a.boton2_web, a.boton2_email,
    a.banner, a.orden, a.color_fondo, a.color_acento, a.logo_url, l.tipo AS logo_tipo, l.version AS logo_v, MIN(c.desde) AS desde, MAX(c.hasta) AS hasta
    FROM anunciantes a JOIN contratos c ON c.anunciante_id = a.id LEFT JOIN logos_anuncios l ON l.anunciante_id = a.id
    WHERE a.estado = 'activo' AND c.desde <= ?1 AND c.hasta >= ?1 GROUP BY a.id ORDER BY a.orden, a.empresa`).bind(hoy).all();
  return r.results || [];
}
async function prepararAnuncios(env) {
  if (!env.DB || Date.now() - ANUNCIOS.t < 300000) return ANUNCIOS.lista;
  try { ANUNCIOS = { t: Date.now(), lista: await avisosVigentes(env, fechaChile()) }; } catch { ANUNCIOS.t = Date.now() - 240000; }   // si falla, reintenta en 1 minuto
  return ANUNCIOS.lista;
}
// Para el carrusel del pie (bloqueMarcas): primero los que pagan, después las marcas propias.
const avisosCarrusel = () => ANUNCIOS.lista.map((a) => ({ nombre: a.empresa, src: logoDe(a), texto: logoDe(a) ? "" : a.empresa, fondo: HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A",
  color: tintaSobre(HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A"), ir: `/ir/${a.slug}?o=portada` }));
// Mismo formato de fila que la planilla «Cofrade News · Anunciantes», para que la Skill los sume tal cual al diario. Solo datos públicos:
// nunca el contacto, el email, el teléfono, el RUT ni lo que pagó. Los botones pasan por /ir para contar los clics.
async function publicidadJson(env) {
  const hoy = fechaChile();
  let lista = [];
  try { lista = env.DB ? await avisosVigentes(env, hoy) : []; } catch { lista = []; }
  const avisos = lista.map((a) => ({ activo: "SI", fuente: "panel", slug: a.slug, empresa: a.empresa, titulo: a.titulo || a.empresa, texto: a.texto || "",
    banner: a.banner || "ambos", orden: a.orden || 1, logo_url: logoDe(a, true), color_fondo: HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A",
    color_acento: HEX6.test(a.color_acento || "") ? a.color_acento : "#D9AE52", boton1_texto: a.boton1_texto || "Visitar sitio web", boton1_web: `${BASE_SITIO}/ir/${a.slug}?b=1&o=diario`,
    ...(a.boton2_web || a.boton2_email ? { boton2_texto: a.boton2_texto || (a.boton2_email ? "Escribir un email" : "Más información"), boton2_web: `${BASE_SITIO}/ir/${a.slug}?b=2&o=diario` } : {}),
    desde: a.desde, hasta: a.hasta }));
  return new Response(JSON.stringify({ generado: new Date().toISOString(), fecha: hoy, avisos }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", ...SEGURIDAD } });
}

// Clics: no cuentan robots, precargas, repeticiones a ráfaga ni las redes de nubes donde corren los escáneres de correo y los robots
// (Microsoft, Google, Amazon y otras): ante la duda, no se cuenta, para que lo que se le muestre al anunciante nunca esté inflado.
const ASN_NUBE = new Set([8075, 15169, 396982, 16509, 14618, 14061, 16276, 24940, 63949, 20473, 31898, 45102, 132203, 26211]);
function origenClic(req, u) {
  try {
    const r = new URL(req.headers.get("Referer") || "");
    if (r.hostname === DOMINIO || r.hostname === "cofrad.es") return r.pathname.startsWith("/edicion") ? "diario" : r.pathname === "/" ? "portada" : "sitio";
  } catch { /* sin página de origen */ }
  const o = String(u.searchParams.get("o") || "");
  return ["diario", "portada", "correo", "pdf"].includes(o) ? o : "otro";
}
async function contarClic(req, env, slug, origen) {
  try {
    if (!env.DB || req.method !== "GET") return;
    const ua = req.headers.get("User-Agent") || "";
    if (!ua || BOT_UA.test(ua)) return;
    if (/prefetch|prerender/i.test((req.headers.get("Sec-Purpose") || "") + (req.headers.get("Purpose") || "") + (req.headers.get("X-Moz") || ""))) return;
    if (ASN_NUBE.has(Number(req.cf && req.cf.asn))) return;
    const fecha = fechaChile(), quien = await huellaVisitante(req, env, fecha);
    if (!(await bajoLimite(env, "c:" + quien))) return;
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO clics_unicos (fecha, slug, visitante) VALUES (?, ?, ?)").bind(fecha, slug, quien),
      env.DB.prepare("INSERT INTO clics (fecha, slug, origen, n) VALUES (?, ?, ?, 1) ON CONFLICT(fecha, slug, origen) DO UPDATE SET n = n + 1").bind(fecha, slug, origen),
    ]);
  } catch { /* contar nunca impide llegar al anunciante */ }
}
function conUtm(url, origen) {   // para que el anunciante vea en su Google Analytics las visitas que le manda Cofrade News
  try {
    const x = new URL(url);
    if (!/^https?:$/.test(x.protocol) || x.searchParams.has("utm_source")) return url;
    x.searchParams.set("utm_source", "cofrade-news"); x.searchParams.set("utm_medium", origen === "portada" ? "sitio" : "boletin"); x.searchParams.set("utm_campaign", "publicidad");
    return x.href;
  } catch { return url; }
}
function paginaCorreoDestino(email, nombre) {   // botón de email: cuenta el clic y abre el correo del lector
  const mailto = "mailto:" + email + "?subject=" + encodeURIComponent("Contacto desde Cofrade News");
  return new Response(`<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Escribir a ${esc(nombre)}</title></head>
<body style="font:17px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:48px 20px;text-align:center;background:#FBF8F1;color:#0B1F3A">
<p>Abriendo su correo para escribir a <b>${esc(nombre)}</b>…</p><p><a href="${esc(mailto)}" style="color:#8A6416;font-weight:600">Si no se abrió, toque aquí</a></p>
<p><a href="/" style="color:#5B6472">Volver a Cofrade News</a></p><script>location.href=${JSON.stringify(mailto).replace(/</g, "\\u003c")}</script></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Content-Security-Policy": CSP_PORTADA, ...SEGURIDAD } });
}
// /ir/<slug>: el destino sale SIEMPRE del registro (nunca de la dirección), así nadie puede usar el sitio para redirigir a otra parte.
async function irAnuncio(req, env, ctx, slug, u) {
  const portada = () => new Response(null, { status: 302, headers: { Location: "/", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const origen = origenClic(req, u), b = u.searchParams.get("b") === "2" ? 2 : 1;
  let destino = "", email = "", nombre = "";
  if (slug.startsWith("m-")) {   // marca propia: su enlace del carrusel, o una página o email de sus propios dominios
    const m = marcasPropias().find((x) => slugMarca(x) === slug);
    if (!m) return portada();
    nombre = m.nombre;
    const pedido = String(u.searchParams.get("u") || ""), propios = hostsPropios(), mm = pedido.match(/^mailto:([^?]+)/i);
    if (mm && EMAIL_OK.test(mm[1]) && propios.has(dominioRaiz(mm[1].split("@")[1]))) email = mm[1];
    else { const w = webOk(pedido); destino = w && propios.has(dominioRaiz(new URL(w).hostname)) ? w : webOk(m.url) || ""; }
  } else {
    if (!env.DB) return portada();
    const a = await env.DB.prepare("SELECT empresa, web, boton1_web, boton2_web, boton2_email, estado FROM anunciantes WHERE slug = ?").bind(slug).first().catch(() => null);
    if (!a || a.estado === "archivado") return portada();
    nombre = a.empresa;
    if (b === 2 && a.boton2_email && EMAIL_OK.test(a.boton2_email)) email = a.boton2_email;
    else destino = webOk(b === 2 ? a.boton2_web || a.boton1_web : a.boton1_web) || webOk(a.web) || "";
  }
  if (!destino && !email) return portada();
  ctx.waitUntil(contarClic(req, env, slug, origen));
  if (email) return paginaCorreoDestino(email, nombre);
  return new Response(null, { status: 302, headers: { Location: conUtm(destino, origen), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
// /anuncios/<slug>.<png|jpg|webp>: el logo que se subió en el Panel. Solo imágenes PNG, JPG o WebP (revisadas por su contenido, no por
// el nombre) y con una política que impide que el archivo ejecute nada. Queda en la caché de Cloudflare: no se lee la base cada vez.
async function logoAnuncio(req, env, ctx, slug, ext) {
  const nada = () => new Response("", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!env.DB) return nada();
  const cache = caches.default, clave = new Request(`https://cache.cofrad.es/anuncios/${slug}.${ext}?v=${encodeURIComponent(new URL(req.url).searchParams.get("v") || "")}`);
  const c = await cache.match(clave).catch(() => null);
  if (c) return c;
  const x = await env.DB.prepare("SELECT l.tipo, l.datos FROM logos_anuncios l JOIN anunciantes a ON a.id = l.anunciante_id WHERE a.slug = ? AND a.estado <> 'archivado'").bind(slug).first().catch(() => null);
  if (!x || EXT_LOGO[x.tipo] !== ext) return nada();
  let bin;
  try { bin = Uint8Array.from(atob(x.datos), (ch) => ch.charCodeAt(0)); } catch { return nada(); }
  const r = new Response(bin, { headers: { "Content-Type": x.tipo, "Cache-Control": "public, max-age=86400", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "cross-origin", ...SEGURIDAD } });
  ctx.waitUntil(cache.put(clave, r.clone()).catch(() => null));
  return r;
}

// ===== 4. Correo de renovación: 7 días antes del vencimiento, una vez por contrato, con copia a hola@cofrad.es =====
// Cifras del contrato: promedios de los días completos medidos (no cuenta hoy, que va en curso, ni el primer día de cada medición, que
// empezó a medias). Si no hay ningún día completo, usa los que haya.
async function metricasContrato(env, ctx, c) {
  const hoy = fechaChile(), fin = c.hasta < hoy ? c.hasta : hoy;
  const s = (sql, ...b) => env.DB.prepare(sql).bind(...b);
  const [ini, vis, uni, cl, cu] = (await env.DB.batch([
    s("SELECT (SELECT MIN(fecha) FROM vistas) AS v, (SELECT MIN(fecha) FROM visitas) AS u"),
    s("SELECT fecha, zona, n FROM vistas WHERE zona IN ('portada', 'diario') AND fecha BETWEEN ? AND ?", c.desde, fin),
    s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", c.desde, fin),
    s("SELECT COALESCE(SUM(n), 0) AS n FROM clics WHERE slug = ? AND fecha BETWEEN ? AND ?", c.slug, c.desde, fin),
    s("SELECT COUNT(*) AS u FROM clics_unicos WHERE slug = ? AND fecha BETWEEN ? AND ?", c.slug, c.desde, fin),
  ])).map((r) => r.results || []);
  const i0 = ini[0] || {};
  const rango = (inicio) => {
    let a = c.desde > inicio ? c.desde : masDias(inicio, 1), z = fin < hoy ? fin : masDias(hoy, -1);
    if (a > z) { a = c.desde > inicio ? c.desde : inicio; z = fin; }
    return { a, z, n: Math.max(1, diasHasta(a, z) + 1) };
  };
  const rv = rango(i0.v || hoy), ru = rango(i0.u || hoy);
  const suma = (zona) => vis.filter((x) => x.zona === zona && x.fecha >= rv.a && x.fecha <= rv.z).reduce((t, x) => t + x.n, 0);
  let ediciones = 0;
  try { ediciones = (await indice(ctx)).filter((f) => f >= c.desde && f <= fin).length; } catch { ediciones = 0; }
  return { portada: suma("portada") / rv.n, diario: suma("diario") / rv.n, unicos: uni.filter((x) => x.fecha >= ru.a && x.fecha <= ru.z).reduce((t, x) => t + x.u, 0) / ru.n,
    clics: Number((cl[0] || {}).n || 0), lectoresClic: Number((cu[0] || {}).u || 0), ediciones, desdeMedido: rv.a > c.desde ? rv.a : c.desde, parcial: rv.a > c.desde };
}
// Muestra solo cifras mayores que cero (un «0 clics» no informa nada); nunca inventa ni redondea hacia arriba.
function correoRenovacion(m, c) {
  const dias = diasHasta(fechaChile(), c.hasta), vence = ddmm(c.hasta);
  const quedan = dias <= 0 ? "vence hoy" : dias === 1 ? "queda 1 día" : `quedan ${dias} días`;
  const nombre = String(c.contacto || "").trim().split(/\s+/)[0] || "";
  const saludo = nombre ? `Hola, ${nombre}:` : "Hola:";
  const asunto = `${c.empresa}: su aviso en Cofrade News vence el ${vence}`.replace(/[\r\n]+/g, " ").slice(0, 150);
  const r0 = (x) => Math.round(x), visitasDia = r0(m.portada + m.diario);
  const cifras = [];
  if (visitasDia >= 1) cifras.push([num(visitasDia, 0), (visitasDia === 1 ? "visita" : "visitas") + " al día, en promedio, entre el sitio web y el diario"]);
  if (r0(m.unicos) >= 1) cifras.push([num(r0(m.unicos), 0), r0(m.unicos) === 1 ? "persona distinta nos lee cada día" : "personas distintas nos leen cada día"]);
  if (m.lectoresClic >= 1) cifras.push([num(m.lectoresClic, 0), m.lectoresClic === 1 ? "clic de un lector en su aviso" : "clics de lectores en su aviso"]);
  if (m.ediciones >= 1) cifras.push([num(m.ediciones, 0), m.ediciones === 1 ? "edición publicada durante su contrato" : "ediciones publicadas durante su contrato"]);
  const filas = [["Sitio web (portada)", r0(m.portada)], ["Diario Cofrade News", r0(m.diario)]].filter((x) => x[1] >= 1);
  const nota = m.parcial ? `Las visitas se miden de esta forma desde el ${ddmm(m.desdeMedido)}: los promedios usan los días completos medidos.` : "Promedios de los días completos de su contrato.";
  const asuntoRenovar = encodeURIComponent(`Renovar el aviso de ${c.empresa}`), cuerpoRenovar = encodeURIComponent(`Hola, queremos renovar nuestro aviso en Cofrade News por 12 meses (UF ${PRECIO_RENOVACION.monto}).`);
  const enlace = `mailto:${CORREO_HOLA}?subject=${asuntoRenovar}&body=${cuerpoRenovar}`;
  const F = "font-family:Arial,Helvetica,sans-serif;", celda = (v, t) => `<td width="50%" valign="top" style="padding:6px"><div style="background:#FBF8F1;border:1px solid #E4DCCB;border-radius:12px;padding:14px 16px">
<div style="${F}font-size:28px;line-height:1.1;font-weight:bold;color:#0B1F3A">${esc(v)}</div><div style="${F}font-size:13.5px;line-height:1.4;color:#5B6472;margin-top:4px">${esc(t)}</div></div></td>`;
  const grilla = cifras.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px">${[0, 2].filter((i) => cifras[i]).map((i) => `<tr>${celda(...cifras[i])}${cifras[i + 1] ? celda(...cifras[i + 1]) : '<td width="50%"></td>'}</tr>`).join("")}</table>` : "";
  const tabla = filas.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${F}font-size:15px;color:#0B1F3A;margin:10px 0 4px;border-collapse:collapse">
<tr><td style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Visitas en promedio</b></td><td align="right" style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Al día</b></td><td align="right" style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Al mes</b></td></tr>
${filas.map(([t, v]) => `<tr><td style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${esc(t)}</td><td align="right" style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${num(v, 0)}</td><td align="right" style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${num(v * 30, 0)}</td></tr>`).join("")}
</table><p style="${F}font-size:12.5px;color:#5B6472;margin:4px 6px 0">${esc(nota)} «Al mes» es el promedio diario por 30.</p>` : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(asunto)}</title></head>
<body style="margin:0;padding:0;background:#F3EEE3"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Su aviso vence el ${esc(vence)}. Le contamos cómo le fue y cómo renovar con un mes de regalo.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E4DCCB;border-radius:16px">
<tr><td style="background:#0B1F3A;padding:22px 28px;border-radius:16px 16px 0 0"><div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#FBF8F1">Cofrade News</div>
<div style="${F}font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D9AE52;margin-top:4px">Su publicidad · aviso de renovación</div></td></tr>
<tr><td style="padding:26px 22px 8px 28px;${F}font-size:16px;line-height:1.6;color:#0B1F3A">
<p style="margin:0 0 14px">${esc(saludo)}</p>
<p style="margin:0 0 14px">Gracias por confiar en Cofrade News. El aviso de <b>${esc(c.empresa)}</b> está vigente hasta el <b>${esc(vence)}</b>: ${esc(quedan)}.</p>
${cifras.length ? `<p style="margin:0 0 6px">Esto logró su marca con nosotros:</p>${grilla}${tabla}` : ""}
</td></tr>
<tr><td style="padding:14px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #D9AE52;border-radius:14px;background:#FFFBF1"><tr><td style="padding:18px 20px;${F}color:#0B1F3A">
<div style="font-size:20px;font-weight:bold;line-height:1.3">Renueve 12 meses por UF&nbsp;${PRECIO_RENOVACION.monto}</div>
<div style="font-size:15px;line-height:1.55;margin:6px 0 14px">Es el precio de 11 meses: el mes 12 se lo regalamos. Su aviso sigue cada mañana en el diario y en la portada de www.cofrad.es.</div>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#B8892B;border-radius:999px"><a href="${esc(enlace)}" style="display:inline-block;padding:13px 26px;${F}font-size:16px;font-weight:bold;color:#1A1406;text-decoration:none">Quiero renovar</a></td></tr></table>
<div style="font-size:13.5px;color:#5B6472;margin-top:10px">O simplemente responda este correo. Si quiere cambiar el texto, el logo o el enlace de su aviso, cuéntenos en la misma respuesta.</div>
</td></tr></table></td></tr>
<tr><td style="padding:18px 28px 26px;${F}font-size:16px;line-height:1.6;color:#0B1F3A">Un saludo cordial,<br><b>Equipo Cofrade News</b><br><a href="${BASE_SITIO}" style="color:#8A6416">www.cofrad.es</a> · ${CORREO_HOLA}</td></tr>
<tr><td style="padding:14px 28px;background:#FBF8F1;border-radius:0 0 16px 16px;${F}font-size:12px;line-height:1.5;color:#5B6472">Cifras medidas por Cofrade News sin cookies: no cuentan robots ni vistas previas. Recibe este correo porque ${esc(c.empresa)} tiene un aviso contratado en Cofrade News.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = [saludo, "", `Gracias por confiar en Cofrade News. El aviso de ${c.empresa} está vigente hasta el ${vence}: ${quedan}.`, "",
    ...(cifras.length ? ["Esto logró su marca con nosotros:", ...cifras.map(([v, t]) => `- ${v} ${t}`), ""] : []),
    ...(filas.length ? ["Visitas en promedio:", ...filas.map(([t, v]) => `- ${t}: ${num(v, 0)} al día, ${num(v * 30, 0)} al mes`), nota + " «Al mes» es el promedio diario por 30.", ""] : []),
    `Renueve 12 meses por UF ${PRECIO_RENOVACION.monto}: es el precio de 11 meses, el mes 12 se lo regalamos.`, "Para renovar, responda este correo.", "",
    "Un saludo cordial,", "Equipo Cofrade News", `www.cofrad.es · ${CORREO_HOLA}`].join("\n");
  return { asunto, html, texto };
}
// Reserva el contrato antes de enviar («enviando:<hora>»): si dos visitas llegan a la vez, solo una envía. Una reserva de más de 15
// minutos (el envío se cortó a medias) se puede volver a tomar.
async function enviarRenovacion(env, ctx, contratoId, modo) {
  const c = await env.DB.prepare(`SELECT c.id, c.anunciante_id, c.desde, c.hasta, c.aviso_enviado, a.empresa, a.contacto, a.email, a.slug
    FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id WHERE c.id = ?`).bind(contratoId).first().catch(() => null);
  if (!c || !EMAIL_OK.test(c.email || "")) return { ok: false, error: "sin-email" };
  const marca = "enviando:" + Date.now(), viejo = Date.now() - 15 * 60000;
  const libre = modo === "auto" ? "(aviso_enviado IS NULL OR (aviso_enviado LIKE 'enviando:%' AND CAST(substr(aviso_enviado, 10) AS INTEGER) < ?3))"
    : "(aviso_enviado IS NULL OR aviso_enviado NOT LIKE 'enviando:%' OR CAST(substr(aviso_enviado, 10) AS INTEGER) < ?3)";
  const res = await env.DB.prepare(`UPDATE contratos SET aviso_enviado = ?1 WHERE id = ?2 AND ${libre}`).bind(marca, contratoId, viejo).run().catch(() => null);
  if (!res || !res.meta || res.meta.changes !== 1) return { ok: false, error: "ocupado" };
  let correo = null, ok = false;
  try {
    correo = correoRenovacion(await metricasContrato(env, ctx, c), c);
    ok = await enviarCorreo(env, { to: c.email, bcc: CORREO_HOLA, subject: correo.asunto, text: correo.texto, html: correo.html });
  } catch { ok = false; }
  const ahora = new Date().toISOString(), antes = c.aviso_enviado && !String(c.aviso_enviado).startsWith("enviando:") ? c.aviso_enviado : null;
  await env.DB.batch([
    env.DB.prepare("UPDATE contratos SET aviso_enviado = ? WHERE id = ? AND aviso_enviado = ?").bind(ok ? ahora : antes, contratoId, marca),
    env.DB.prepare("INSERT INTO correos_anunciantes (fecha, anunciante_id, contrato_id, tipo, para, asunto, estado) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(ahora, c.anunciante_id, contratoId, modo === "auto" ? "renovación (automático)" : "renovación (enviado desde el Panel)", c.email, correo ? correo.asunto : "", ok ? "enviado" : "falló"),
  ]).catch(() => null);
  return { ok };
}
// La revisión corre con las visitas (la cuenta gratis de Cloudflare no tiene más relojes): como mucho una vez por hora, entre las 9:00 y
// las 20:59 de Chile, para que el correo llegue en horario de oficina. Un correo fallido se reintenta la hora siguiente (máximo 3 al día).
let REVISION_HECHA = "";
async function revisarRenovaciones(env, ctx, ahora = Date.now()) {
  try {
    if (!env.DB || !hayCorreo(env)) return "sin correo";
    const [a, b] = String(env.AVISOS_HORAS || "9-20").split("-").map(Number), h = horaDeChile(ahora);
    if (Number.isFinite(a) && Number.isFinite(b) && (h < a || h > b)) return "fuera de horario";
    const hoy = fechaChile(new Date(ahora)), clave = hoy + "T" + String(h).padStart(2, "0");
    if (REVISION_HECHA === clave) return "ya revisado";
    REVISION_HECHA = clave;
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('anuncios_revision', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE config.valor < ?1").bind(clave).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya revisado";
    const lista = (await env.DB.prepare(`SELECT c.id FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id
      WHERE a.estado = 'activo' AND c.hasta >= ?1 AND c.hasta <= ?2
        AND (c.aviso_enviado IS NULL OR (c.aviso_enviado LIKE 'enviando:%' AND CAST(substr(c.aviso_enviado, 10) AS INTEGER) < ?3))
        AND NOT EXISTS (SELECT 1 FROM contratos d WHERE d.anunciante_id = c.anunciante_id AND d.hasta > c.hasta)
        AND (SELECT COUNT(*) FROM correos_anunciantes e WHERE e.contrato_id = c.id AND e.estado = 'falló' AND e.fecha >= ?4) < 3
      ORDER BY c.hasta LIMIT 5`).bind(hoy, masDias(hoy, 7), ahora - 15 * 60000, new Date(ahora - 86400000).toISOString()).all()).results || [];
    let enviados = 0;
    for (const x of lista) if ((await enviarRenovacion(env, ctx, x.id, "auto")).ok) enviados++;
    return "enviados:" + enviados;
  } catch { return "error"; }
}

// ===== 5. Panel de Control =====
function periodoPanel(u) {
  const hoy = fechaChile(), anioHoy = Number(hoy.slice(0, 4));
  let anio = Number(u.searchParams.get("anio")) || 0, mes = Number(u.searchParams.get("mes")) || 0;
  const s = String(u.searchParams.get("seccion") || ""), seccion = Object.prototype.hasOwnProperty.call(NOMBRE_SECCION, s) ? s : "";
  if (!(anio >= 2026 && anio <= anioHoy)) anio = 0;
  if (!anio || !(mes >= 1 && mes <= 12)) mes = 0;
  let desde, hasta, etiqueta;
  if (!anio) { desde = masDias(hoy, -29); hasta = hoy; etiqueta = "Últimos 30 días"; }
  else if (mes) { desde = `${anio}-${String(mes).padStart(2, "0")}-01`; const f = finDeMes(anio, mes); hasta = f < hoy ? f : hoy; etiqueta = `${NOMBRES_MES[mes - 1].replace(/^./, (x) => x.toUpperCase())} de ${anio}`; }
  else { desde = `${anio}-01-01`; hasta = `${anio}-12-31` < hoy ? `${anio}-12-31` : hoy; etiqueta = `Año ${anio}`; }
  const futuro = desde > hoy;
  if (futuro) hasta = desde;
  const largo = diasHasta(desde, hasta) + 1;
  let antDesde, antHasta;   // período anterior del mismo largo, para comparar
  if (mes) { antDesde = mes === 1 ? `${anio - 1}-12-01` : `${anio}-${String(mes - 1).padStart(2, "0")}-01`; antHasta = masDias(antDesde, largo - 1); }
  else if (anio) { antDesde = `${anio - 1}-01-01`; antHasta = masDias(antDesde, largo - 1); }
  else { antHasta = masDias(desde, -1); antDesde = masDias(antHasta, -(largo - 1)); }
  return { hoy, anio, mes, seccion, desde, hasta, etiqueta, antDesde, antHasta, futuro, largo, agrupar: largo > 62 ? "mes" : "dia" };
}
function qsPanel(P, cambios = {}) {   // conserva los filtros en los enlaces
  const p = new URLSearchParams();
  if (P.anio) p.set("anio", String(P.anio));
  if (P.mes) p.set("mes", String(P.mes));
  if (P.seccion) p.set("seccion", P.seccion);
  for (const [k, v] of Object.entries(cambios)) { if (v) p.set(k, String(v)); else p.delete(k); }
  const t = p.toString();
  return t ? "?" + t : "";
}
function limpiarQ(t) {   // los filtros que vuelven del formulario: solo año, mes y sección válidos
  return qsPanel(periodoPanel(new URL("https://x/panel?" + String(t || "").replace(/^\?/, "").slice(0, 200))));
}
async function datosTablero(env, P) {
  const s = (sql, ...b) => env.DB.prepare(sql).bind(...b), d = P.desde, h = P.hasta, sec = P.seccion ? [P.seccion] : [];
  const lista = {
    vistas: s("SELECT fecha, zona, n FROM vistas WHERE fecha BETWEEN ? AND ?", d, h),
    unicosZona: s("SELECT fecha, CASE WHEN ruta = '/' THEN 'portada' WHEN ruta LIKE '/edicion/%' THEN 'diario' ELSE 'otras' END AS zona, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha, zona", d, h),
    unicos: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", d, h),
    secciones: s("SELECT seccion, SUM(segundos) AS s, SUM(vistas) AS v FROM lectura WHERE fecha BETWEEN ? AND ? GROUP BY seccion", d, h),
    lecturaDia: s(`SELECT fecha, SUM(segundos) AS s, SUM(vistas) AS v FROM lectura WHERE fecha BETWEEN ? AND ?${sec.length ? " AND seccion = ?" : ""} GROUP BY fecha`, d, h, ...sec),
    ediciones: sec.length ? s("SELECT ruta, SUM(segundos) AS n FROM lectura WHERE fecha BETWEEN ? AND ? AND seccion = ? GROUP BY ruta ORDER BY n DESC LIMIT 10", d, h, ...sec)
      : s("SELECT ruta, COUNT(*) AS n FROM visitas WHERE fecha BETWEEN ? AND ? AND ruta LIKE '/edicion/%' GROUP BY ruta ORDER BY n DESC LIMIT 10", d, h),
    paises: s("SELECT pais, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY pais ORDER BY u DESC LIMIT 10", d, h),
    dims: s("SELECT hora, origen, disp, SUM(n) AS n FROM dimensiones WHERE fecha BETWEEN ? AND ? GROUP BY hora, origen, disp", d, h),
    sitios: s("SELECT host, SUM(n) AS n FROM referentes WHERE fecha BETWEEN ? AND ? GROUP BY host ORDER BY n DESC LIMIT 10", d, h),
    clics: s("SELECT slug, SUM(n) AS n FROM clics WHERE fecha BETWEEN ? AND ? GROUP BY slug", d, h),
    clicsU: s("SELECT slug, COUNT(*) AS u FROM clics_unicos WHERE fecha BETWEEN ? AND ? GROUP BY slug", d, h),
    clicsDia: s("SELECT slug, fecha, SUM(n) AS n FROM clics WHERE fecha >= ? AND slug NOT LIKE 'm-%' GROUP BY slug, fecha", masDias(P.hoy, -1100)),
    antVistas: s("SELECT fecha, SUM(n) AS n FROM vistas WHERE zona IN ('portada', 'diario') AND fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antUnicos: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antDiario: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE ruta LIKE '/edicion/%' AND fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antLectura: s(`SELECT fecha, SUM(segundos) AS s FROM lectura WHERE fecha BETWEEN ? AND ?${sec.length ? " AND seccion = ?" : ""} GROUP BY fecha`, P.antDesde, P.antHasta, ...sec),
    inicios: env.DB.prepare("SELECT (SELECT MIN(fecha) FROM vistas) AS vistas, (SELECT MIN(fecha) FROM visitas) AS visitas, (SELECT MIN(fecha) FROM dimensiones) AS dims, (SELECT MIN(fecha) FROM lectura) AS lectura, (SELECT MIN(fecha) FROM clics) AS clics"),
    hoyU: s("SELECT COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha = ?", P.hoy),
    hoyV: s("SELECT COALESCE(SUM(n), 0) AS n FROM vistas WHERE fecha = ? AND zona IN ('portada', 'diario')", P.hoy),
    anunciantes: env.DB.prepare(`SELECT a.id, a.slug, a.empresa, a.rut, a.rubro, a.contacto, a.email, a.telefono, a.web, a.titulo, a.texto, a.boton1_texto, a.boton1_web, a.boton2_texto,
      a.boton2_web, a.boton2_email, a.banner, a.orden, a.color_fondo, a.color_acento, a.logo_url, a.estado, a.notas, a.creado, l.tipo AS logo_tipo, l.version AS logo_v
      FROM anunciantes a LEFT JOIN logos_anuncios l ON l.anunciante_id = a.id ORDER BY a.estado = 'archivado', a.empresa`),
    contratos: env.DB.prepare("SELECT id, anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, aviso_enviado, creado FROM contratos ORDER BY desde, id"),
    correos: env.DB.prepare("SELECT id, fecha, anunciante_id, tipo, para, asunto, estado FROM correos_anunciantes ORDER BY id DESC LIMIT 20"),
    bz: env.DB.prepare("SELECT * FROM buzon ORDER BY id DESC LIMIT 500"),
    bzTot: env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(verificado), 0) AS ver FROM buzon"),
    socios: env.DB.prepare("SELECT estado, COUNT(*) AS n FROM usuarios GROUP BY estado"),
    pulso: env.DB.prepare("SELECT valor FROM config WHERE clave = 'pulso_resultado'"),
  };
  const claves = Object.keys(lista), R = {};
  try {   // una sola consulta a la base (D1 cuenta un «batch» como una): el panel queda lejos del tope de consultas por visita
    const res = await env.DB.batch(claves.map((k) => lista[k]));
    claves.forEach((k, i) => { R[k] = (res[i] && res[i].results) || []; });
  } catch {   // si una tabla falla (p. ej. falta crearla), se leen una por una y lo que falle queda vacío
    const res = await Promise.all(claves.map((k) => lista[k].all().then((r) => r.results || []).catch(() => [])));
    claves.forEach((k, i) => { R[k] = res[i]; });
    R.parcial = true;
  }
  return R;
}
// Promedio diario sobre los días completos: después del primer día de la medición (empezó a medias) y antes de hoy (va en curso).
function promedioCompleto(porDia, desde, hasta, inicio, hoy) {
  if (!inicio) return { prom: null, dias: 0 };
  const a0 = desde > inicio ? desde : masDias(inicio, 1), z0 = hasta < hoy ? hasta : masDias(hoy, -1);
  let a = a0, z = z0;
  if (a > z) { a = desde > inicio ? desde : inicio; z = hasta; }
  if (a > z) return { prom: null, dias: 0 };
  const n = diasHasta(a, z) + 1;
  let t = 0;
  for (const [f, v] of Object.entries(porDia)) if (f >= a && f <= z) t += v;
  return { prom: t / n, dias: n, total: t };
}
function deltaTxt(ahora, antes) {
  if (ahora === null || antes === null || antes === undefined || !(antes > 0)) return "";
  const v = (ahora - antes) / antes * 100;
  if (Math.abs(v) < 0.5) return `<span class="delta igual">= Igual que el período anterior</span>`;
  return `<span class="delta ${v > 0 ? "sube" : "baja"}">${v > 0 ? "▲ +" : "▼ −"}${pctTxt(Math.abs(v))} vs. el período anterior</span>`;
}
const kpiA = (titulo, valor, sub, ayuda, extra = "") => `<div class="cifra" tabindex="0" data-ayuda="${esc(ayuda)}"><small>${esc(titulo)}</small><b>${valor}</b>${sub ? `<br><small>${esc(sub)}</small>` : ""}${extra}</div>`;
const tarjetaG = (id, titulo, ayuda, { ancha = false, alto = 0, vacio = "Sin datos en este período.", nota = "" } = {}) =>
  `<div class="tarjeta${ancha ? " ancha" : ""}"><h4 class="kicker tit-g" tabindex="0" data-ayuda="${esc(ayuda)}">${esc(titulo)}</h4><div class="graf" id="g-${id}" role="img" aria-label="${esc(titulo)}" data-vacio="${esc(vacio)}"${alto ? ` style="height:${alto}px"` : ""}></div>${nota ? `<p class="nota-g">${esc(nota)}</p>` : ""}</div>`;
let _PAISES = null;
function nombrePais(c) {
  if (!c) return "Sin país";
  try { _PAISES = _PAISES || new Intl.DisplayNames(["es"], { type: "region" }); return _PAISES.of(c) || c; } catch { return c; }
}
const fechaRuta = (r) => { const m = String(r || "").match(/(\d{4}-\d{2}-\d{2})/); return m ? ddmm(m[1]) : r; };
const MSG_ANUNCIOS = { creado: ["ok", "Anunciante agregado. Su aviso ya entra en el carrusel de la portada."], editado: ["ok", "Cambios guardados."],
  renovado: ["ok", "Renovación registrada."], pausado: ["ok", "Aviso en pausa: deja de salir en la portada y en el diario hasta que lo reactives."],
  reactivado: ["ok", "Aviso reactivado."], archivado: ["ok", "Anunciante archivado. Sigue guardado abajo, en «Archivados»."], "contrato-borrado": ["ok", "Contrato borrado."],
  enviado: ["ok", `Correo de renovación enviado, con copia a ${CORREO_HOLA}.`],
  "no-enviado": ["mal", "No se pudo enviar el correo. Revisa que el email del anunciante esté bien escrito y vuelve a intentarlo en unos minutos."],
  ocupado: ["mal", "Ese correo se está enviando en este momento. Espera un minuto y recarga el panel."], "sin-email": ["mal", "El anunciante no tiene un email válido."],
  "sin-contrato": ["mal", "Ese anunciante no tiene contratos."], "no-existe": ["mal", "Ese anunciante ya no existe."], "muy-grande": ["mal", "El formulario pesa demasiado: el logo debe ser de 300 KB o menos."],
  formulario: ["mal", "No se pudo leer el formulario. Inténtalo de nuevo."], "sin-base": ["mal", "Falta la base de datos."] };
const CAMPO_ERROR = { empresa: "Empresa (al menos 2 letras)", contacto: "Persona de contacto", email: "Email de contacto (revisa que esté bien escrito)", telefono: "Teléfono (solo números, espacios, +, guiones y paréntesis)",
  rut: "RUT (el dígito verificador no calza)", web: "Sitio web", titulo: "Título del aviso (al menos 2 letras)", boton1_web: "Enlace del botón 1 (una dirección web, por ejemplo https://www.empresa.cl)",
  boton2: "Botón 2 (una dirección web o un email)", desde: "Desde (fecha de inicio)", hasta: "Hasta (debe ser igual o posterior a «Desde», y hasta 3 años)", monto: "Monto pagado",
  fecha_pago: "Fecha de pago", "logo-grande": "Logo (debe pesar 300 KB o menos)", "logo-tipo": "Logo (debe ser PNG, JPG o WebP)" };
function mensajeAnuncios(r) {
  if (!r) return "";
  const m = String(r).match(/^error:([\w-]+)$/);
  const [tipo, txt] = m ? ["mal", `No se guardó: revisa el campo «${CAMPO_ERROR[m[1]] || m[1]}».`] : MSG_ANUNCIOS[r] || ["", ""];
  return txt ? `<p class="${tipo === "ok" ? "aviso-ok" : "aviso-mal"}" role="${tipo === "ok" ? "status" : "alert"}">${esc(txt)}</p>` : "";
}

const AYUDA = {
  visitas: "Cuántas veces se abrieron la portada (el sitio web) y el diario en el período. Si una persona abre la página 3 veces, son 3 visitas. No cuentan robots, buscadores ni vistas previas de WhatsApp o Telegram. La comparación usa el promedio por día de días completos.",
  unicos: "Personas distintas que entraron cada día, en promedio. Cada persona se reconoce por su conexión (IP) y su navegador, y cuenta una sola vez por día aunque abra muchas páginas. La IP no se guarda: queda una huella anónima que cambia cada día; por eso la cifra es por día y no se suma entre días. Promedia solo días completos (no cuenta hoy, que va en curso).",
  diario: "Personas distintas que abrieron alguna edición del diario Cofrade News cada día, en promedio: es la audiencia del newsletter en la web. Promedia solo días completos.",
  paginas: "Cuántas veces abre el sitio cada persona en un día, en promedio (visitas divididas por visitantes únicos). Más de 1,5 indica que la gente vuelve o pasa de la portada al diario: buena señal de interés.",
  minutos: "Tiempo promedio que cada lector del diario pasa leyendo. Se mide solo mientras una sección está en el centro de la pantalla y la pestaña está a la vista, así que es tiempo de lectura real, no tiempo con la página abierta.",
  minutosSec: "Minutos que cada lector del diario dedicó, en promedio, a la sección elegida en el filtro. Se mide solo mientras esa sección está en el centro de la pantalla.",
  seccion: "La sección del diario donde los lectores pasaron más tiempo en el período y qué parte del tiempo total de lectura se llevó. Sirve para decidir qué secciones potenciar y dónde conviene ubicar la publicidad.",
  seccionSel: "Tiempo total que los lectores pasaron en la sección elegida, qué parte del tiempo total de lectura se llevó y en qué lugar quedó entre todas las secciones.",
  hora: "La hora del día (hora de Chile) en que llegan más visitas. Sirve para elegir a qué hora publicar o compartir la edición en redes y grupos.",
  celular: "Qué parte de las visitas llega desde un celular. Si casi todo es celular, conviene revisar primero cómo se ven el diario y los avisos en el teléfono.",
  origen: "De dónde llega la mayor parte de las visitas. «Directo o desde una app» incluye a quien escribe la dirección, usa un favorito o abre un enlace desde WhatsApp o Telegram, que no informan de dónde viene la visita.",
  hoy: "Personas distintas que han entrado hoy a cualquier página del sitio, desde las 00:00 de Chile. Se actualiza cada vez que abres o recargas el panel.",
  vigentes: "Empresas que pagaron publicidad y cuyo contrato cubre el día de hoy. Sus avisos salen en el diario y en el carrusel de la portada. No incluye tus marcas propias, que son permanentes.",
  vencen: "Contratos que terminan en los próximos 30 días. Siete días antes del vencimiento, el panel envía solo un correo de renovación al anunciante, con copia a hola@cofrad.es, y lo anota abajo.",
  ingresos: "Lo que pagaron los anunciantes en el período, según la fecha de pago anotada en cada contrato. Se muestra en la moneda en que se pactó (UF o pesos).",
  clics: "Veces que los lectores tocaron un aviso pagado para ir a la web o escribir al anunciante. Abajo, cuántas personas distintas lo hicieron (cada persona cuenta una vez por día). No cuentan robots ni escáneres de correo.",
  tendencia: "Barras: visitas a la portada y al diario. Línea: personas distintas en todo el sitio. Pasa el cursor (o toca) cada barra para ver los números exactos de ese día.",
  tendenciaMes: "Barras: visitas a la portada y al diario de cada mes. Línea: personas distintas por día, en promedio, de ese mes. Pasa el cursor (o toca) cada mes para ver los números exactos.",
  horas: "Visitas según la hora del día en que llegaron (hora de Chile). La barra dorada es la hora con más visitas: un buen momento para compartir la edición.",
  origenG: "De dónde llegan las visitas: directo o desde una app (WhatsApp y Telegram no informan de dónde viene la visita), desde otra página del sitio, buscadores, redes sociales, correo, asistentes de inteligencia artificial u otros sitios.",
  disp: "Desde qué aparato se abren las visitas: celular, computador o tablet, según el navegador de cada visita.",
  semana: "Personas distintas en promedio según el día de la semana: muestra qué días se lee más, para elegir cuándo lanzar novedades o publicidad. Con menos de dos semanas de datos es solo orientativo.",
  secciones: "Minutos totales de lectura de cada sección del diario. Toca una barra (o un cuadro del mapa de calor) para filtrar el panel por esa sección.",
  seccionDia: "Minutos de lectura por día y cuántas veces se leyó (una lectura es cuando la sección estuvo al menos 3 segundos en el centro de la pantalla).",
  ediciones: "Las ediciones del diario con más lectores en el período (cada persona cuenta una vez por día).",
  edicionesSec: "Las ediciones donde los lectores pasaron más minutos en la sección elegida.",
  paises: "Desde qué país se conectan los visitantes, según su red (sin datos personales).",
  sitios: "Sitios web que enviaron visitantes con un enlace. Las apps como WhatsApp o Telegram no aparecen aquí porque no informan de dónde viene la visita.",
  calor: "Cada cuadro es una sección del diario: más dorado, más tiempo de lectura. Toca un cuadro para filtrar todo el panel por esa sección; tócalo otra vez para quitar el filtro.",
  clicsG: "Clics de los lectores en cada aviso pagado durante el período: el total y cuántas personas distintas hicieron clic (una vez por día).",
};

async function panel(req, env) {
  if (!(await esAdmin(req, env))) return paginaPanelLogin("", 200, env);
  if (!env.DB) return html(marco({ titulo: "Panel", descripcion: "", cuerpo: `<section style="border:0"><h1>Falta la base de datos.</h1></section>` }), 503);
  const u = new URL(req.url), P = periodoPanel(u);
  const [R, fundadores, cont] = await Promise.all([datosTablero(env, P), panelSocios(env, u).catch(() => ""), contadorVisitas(env, masDias(P.hoy, -29))]);
  const ini = R.inicios[0] || {}, sec = P.seccion, nomSec = sec ? NOMBRE_SECCION[sec] : "";
  // --- series por día ---
  const dias = [], primero = [ini.visitas, ini.vistas].filter(Boolean).sort()[0] || P.hoy;
  for (let f = P.desde; f <= P.hasta; f = masDias(f, 1)) dias.push(f);
  const diasG = dias.filter((f) => f >= primero), diasL = dias.filter((f) => ini.lectura && f >= ini.lectura);   // los gráficos parten el primer día medido
  const porDia = (filas, campo, filtro = () => true) => { const o = {}; filas.forEach((x) => { if (filtro(x)) o[x.fecha] = (o[x.fecha] || 0) + Number(x[campo] || 0); }); return o; };
  const pv = porDia(R.vistas, "n", (x) => x.zona === "portada"), dv = porDia(R.vistas, "n", (x) => x.zona === "diario");
  const vt = porDia(R.vistas, "n", (x) => x.zona !== "otras"), su = porDia(R.unicos, "u"), du = porDia(R.unicosZona, "u", (x) => x.zona === "diario");
  const lecS = porDia(R.lecturaDia, "s"), lecV = porDia(R.lecturaDia, "v");
  // --- KPIs de audiencia ---
  const pVis = promedioCompleto(vt, P.desde, P.hasta, ini.vistas, P.hoy), pUni = promedioCompleto(su, P.desde, P.hasta, ini.visitas, P.hoy), pDia = promedioCompleto(du, P.desde, P.hasta, ini.visitas, P.hoy);
  const aVis = promedioCompleto(porDia(R.antVistas, "n"), P.antDesde, P.antHasta, ini.vistas, P.hoy), aUni = promedioCompleto(porDia(R.antUnicos, "u"), P.antDesde, P.antHasta, ini.visitas, P.hoy);
  const aDia = promedioCompleto(porDia(R.antDiario, "u"), P.antDesde, P.antHasta, ini.visitas, P.hoy);
  const totalVis = Object.values(vt).reduce((a, x) => a + x, 0);
  const diasConVistas = dias.filter((f) => ini.vistas && f >= ini.vistas);
  const visConVistas = diasConVistas.reduce((a, f) => a + (vt[f] || 0), 0), uniConVistas = diasConVistas.reduce((a, f) => a + (su[f] || 0), 0);
  const lecDias = dias.filter((f) => ini.lectura && f >= ini.lectura), segTot = lecDias.reduce((a, f) => a + (lecS[f] || 0), 0), lecDiario = lecDias.reduce((a, f) => a + (du[f] || 0), 0);
  const aLecS = porDia(R.antLectura, "s"), aLecU = porDia(R.antDiario, "u"), aSeg = Object.values(aLecS).reduce((a, x) => a + x, 0), aLecDiario = Object.keys(aLecS).reduce((a, f) => a + (aLecU[f] || 0), 0);
  const minLector = lecDiario ? segTot / 60 / lecDiario : null, aMinLector = aLecDiario ? aSeg / 60 / aLecDiario : null;
  const secs = R.secciones.filter((x) => NOMBRE_SECCION[x.seccion]).map((x) => ({ id: x.seccion, nombre: NOMBRE_SECCION[x.seccion], s: Number(x.s || 0), v: Number(x.v || 0) })).sort((a, b) => b.s - a.s);
  const segSecciones = secs.reduce((a, x) => a + x.s, 0), top = secs[0], selS = sec ? secs.find((x) => x.id === sec) : null, rankSel = selS ? secs.indexOf(selS) + 1 : 0;
  const horas = new Array(24).fill(0), org = {}, disp = {};
  R.dims.forEach((x) => { const n = Number(x.n || 0); if (x.hora >= 0 && x.hora < 24) horas[x.hora] += n; org[x.origen] = (org[x.origen] || 0) + n; disp[x.disp] = (disp[x.disp] || 0) + n; });
  const totDims = horas.reduce((a, x) => a + x, 0), horaTop = totDims ? horas.indexOf(Math.max(...horas)) : -1;
  const orgOrden = Object.entries(org).sort((a, b) => b[1] - a[1]);
  const tiempo = (s) => (s < 60 ? `${num(s, 0)} s` : s < 36000 ? `${num(s / 60, s < 600 ? 1 : 0)} min` : `${num(s / 3600, 1)} h`);
  const hoyU = Number((R.hoyU[0] || {}).u || 0), hoyV = Number((R.hoyV[0] || {}).n || 0);
  const desdeTxt = (f) => (f && f > P.desde ? ` · se mide desde el ${ddmm(f)}` : "");
  const kAud = [
    kpiA("Visitas en el período", num(totalVis, 0), pVis.prom !== null ? `≈ ${num(Math.round(pVis.prom), 0)} al día${desdeTxt(ini.vistas)}` : "Aún sin visitas medidas", AYUDA.visitas, deltaTxt(pVis.prom, aVis.prom)),
    kpiA("Visitantes únicos al día", pUni.prom === null ? "Sin datos" : num(Math.round(pUni.prom), 0), "promedio de días completos" + desdeTxt(ini.visitas), AYUDA.unicos, deltaTxt(pUni.prom, aUni.prom)),
    kpiA("Lectores del diario al día", pDia.prom === null ? "Sin datos" : num(Math.round(pDia.prom), 0), "personas distintas que abren una edición", AYUDA.diario, deltaTxt(pDia.prom, aDia.prom)),
    kpiA("Visitas por visitante", uniConVistas ? num(visConVistas / uniConVistas, 2) : "Sin datos", "veces que cada persona abre el sitio en un día", AYUDA.paginas),
    kpiA(sec ? `Minutos por lector en ${nomSec}` : "Minutos de lectura por lector", minLector === null ? "Sin datos" : num(minLector, 1) + " min", sec ? "promedio por lector del diario" : "promedio por lector del diario y por día", sec ? AYUDA.minutosSec : AYUDA.minutos, deltaTxt(minLector, aMinLector)),
    sec ? kpiA(`Lectura de ${nomSec}`, selS ? tiempo(selS.s) : "Sin lecturas", selS && segSecciones ? `${pctTxt(selS.s / segSecciones * 100)} del tiempo total · lugar ${rankSel} de ${secs.length}` : "en el período", AYUDA.seccionSel)
      : kpiA("Sección más leída", top ? esc(top.nombre) : "Sin lecturas", top && segSecciones ? `${tiempo(top.s)} · ${pctTxt(top.s / segSecciones * 100)} del tiempo de lectura` : "aún sin datos", AYUDA.seccion),
    kpiA("Hora con más visitas", horaTop >= 0 ? `${String(horaTop).padStart(2, "0")}:00 a ${String((horaTop + 1) % 24).padStart(2, "0")}:00` : "Sin datos", horaTop >= 0 ? `${cuantos(horas[horaTop], "visita", "visitas")} en esa hora${desdeTxt(ini.dims)}` : "se empieza a medir con esta versión", AYUDA.hora),
    kpiA("Desde celular", totDims ? pctTxt((disp.celular || 0) / totDims * 100) : "Sin datos", totDims ? `computador ${pctTxt((disp.computador || 0) / totDims * 100)} · tablet ${pctTxt((disp.tablet || 0) / totDims * 100)}` : "se empieza a medir con esta versión", AYUDA.celular),
    kpiA("Origen principal", orgOrden.length ? esc(ORIGENES[orgOrden[0][0]] || orgOrden[0][0]) : "Sin datos", orgOrden.length ? `${pctTxt(orgOrden[0][1] / totDims * 100)} de las visitas` : "se empieza a medir con esta versión", AYUDA.origen),
    kpiA("Lectores hoy", num(hoyU, 0), cuantos(hoyV, "visita", "visitas") + " a la portada y al diario", AYUDA.hoy),
  ].join("");
  // --- datos de los gráficos ---
  const parcial = (f) => f === P.hoy || f === ini.vistas || f === ini.visitas;
  let ten;
  if (P.agrupar === "mes") {
    const meses = {};
    diasG.forEach((f) => { const k = f.slice(0, 7), m = (meses[k] = meses[k] || { pv: 0, dv: 0, su: 0, d: 0, medido: false }); m.pv += pv[f] || 0; m.dv += dv[f] || 0; if (su[f]) { m.su += su[f]; m.d++; } if (ini.vistas && f >= ini.vistas) m.medido = true; });
    const ks = Object.keys(meses).sort();
    ten = { x: ks.map((k) => NOMBRES_MES[Number(k.slice(5)) - 1].slice(0, 3) + " " + k.slice(0, 4)), pv: ks.map((k) => (meses[k].medido ? meses[k].pv : null)), dv: ks.map((k) => (meses[k].medido ? meses[k].dv : null)),
      su: ks.map((k) => (meses[k].d ? Math.round(meses[k].su / meses[k].d) : null)), parcial: [] };
  } else {
    ten = { x: diasG.map((f) => f.slice(8, 10) + "-" + f.slice(5, 7)), pv: diasG.map((f) => (ini.vistas && f >= ini.vistas ? pv[f] || 0 : null)), dv: diasG.map((f) => (ini.vistas && f >= ini.vistas ? dv[f] || 0 : null)),
      su: diasG.map((f) => (ini.visitas && f >= ini.visitas ? su[f] || 0 : null)), parcial: diasG.map((f, i) => (parcial(f) ? i : -1)).filter((i) => i >= 0) };
  }
  const sem = [0, 0, 0, 0, 0, 0, 0], semN = [0, 0, 0, 0, 0, 0, 0];
  dias.forEach((f) => { if (!ini.visitas || f <= ini.visitas || f >= P.hoy) return; const w = (new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7; sem[w] += su[f] || 0; semN[w]++; });
  const diasSemana = semN.reduce((a, x) => a + x, 0);
  const anun = R.anunciantes, nomPorSlug = {};
  anun.forEach((a) => { nomPorSlug[a.slug] = a.empresa; });
  const clicsSlug = {}, clicsUSlug = {};
  R.clics.forEach((x) => { clicsSlug[x.slug] = Number(x.n || 0); });
  R.clicsU.forEach((x) => { clicsUSlug[x.slug] = Number(x.u || 0); });
  const clicsPagados = Object.keys(clicsSlug).filter((s) => !s.startsWith("m-") && nomPorSlug[s]).map((s) => [nomPorSlug[s], clicsSlug[s], clicsUSlug[s] || 0]).sort((a, b) => b[1] - a[1]);
  const D = {
    agrupar: P.agrupar, ten, horas, totDims,
    origen: orgOrden.map(([k, n]) => [ORIGENES[k] || k, n]), disp: Object.entries(disp).sort((a, b) => b[1] - a[1]).map(([k, n]) => [DISPOSITIVOS[k] || k, n]),
    semana: sem.map((t, i) => (semN[i] ? Math.round(t / semN[i]) : null)), diasSemana, dsem: DIAS_SEMANA,
    secciones: secs.map((x) => [x.id, x.nombre, Math.round(x.s / 6) / 10, x.v]), sel: sec,
    secDia: { x: diasL.map((f) => f.slice(8, 10) + "-" + f.slice(5, 7)), min: diasL.map((f) => Math.round((lecS[f] || 0) / 6) / 10), v: diasL.map((f) => lecV[f] || 0) },
    ediciones: R.ediciones.map((x) => [fechaRuta(x.ruta), sec ? Math.round(Number(x.n || 0) / 6) / 10 : Number(x.n || 0)]), edTipo: sec ? "min" : "lect",
    paises: R.paises.map((x) => [nombrePais(x.pais), Number(x.u || 0)]), sitios: R.sitios.map((x) => [x.host, Number(x.n || 0)]), clics: clicsPagados,
  };
  const notaDims = ini.dims ? (ini.dims > P.desde ? `Horas, origen y aparato se miden desde el ${ddmm(ini.dims)}.` : "") : "Horas, origen y aparato se empiezan a medir con esta versión del sitio.";
  const vacioDims = ini.dims ? "Sin visitas medidas en este período." : "Se empieza a medir con esta versión del sitio: vuelve mañana.";
  const notaTen = (ini.vistas && ini.vistas > P.desde ? `Las visitas se cuentan desde el ${ddmm(ini.vistas)}; antes solo se registraban personas distintas (línea).` : "")
    + (ten.parcial.length ? " El día de hoy va en curso, y el primer día de cada medición empezó a medias." : "");
  const graficos = `<div class="dos d2">
${tarjetaG("tendencia", P.agrupar === "mes" ? "Visitas y personas por mes" : "Visitas y personas por día", P.agrupar === "mes" ? AYUDA.tendenciaMes : AYUDA.tendencia, { ancha: true, alto: 320, nota: notaTen.trim() })}
${tarjetaG("horas", "¿A qué hora leen?", AYUDA.horas, { vacio: vacioDims, nota: notaDims })}
${tarjetaG("semana", "¿Qué días se lee más?", AYUDA.semana, { vacio: "Hace falta al menos un día completo de datos.", nota: diasSemana && diasSemana < 14 ? `Con ${cuantos(diasSemana, "día", "días")} de datos: orientativo.` : "" })}
${tarjetaG("origen", "¿De dónde llegan?", AYUDA.origenG, { vacio: vacioDims })}
${tarjetaG("disp", "¿Desde qué aparato?", AYUDA.disp, { vacio: vacioDims })}
${tarjetaG("paises", "Países", AYUDA.paises, { alto: Math.max(220, D.paises.length * 30 + 40) })}
${tarjetaG("sitios", "Sitios que envían lectores", AYUDA.sitios, { alto: Math.max(220, D.sitios.length * 30 + 40), vacio: ini.dims ? "Ningún sitio web envió visitas en este período." : vacioDims })}
</div>`;
  const celdas = secs.length ? `<div class="calor">${secs.map((x) => `<a class="cel${x.id === sec ? " sel" : ""}" href="/panel${qsPanel(P, { seccion: x.id === sec ? "" : x.id })}#lectura" style="--a:${(0.08 + 0.57 * x.s / Math.max(1, top.s)).toFixed(2)}"${x.id === sec ? ' aria-current="true"' : ""}><b>${esc(x.nombre)}</b><span>${tiempo(x.s)} · ${num(x.v, 0)} lecturas</span></a>`).join("")}</div>`
    : `<p class="aviso">Aún no hay lecturas medidas en este período.</p>`;
  const lectura = `<section id="lectura"><h3 class="tit-g" tabindex="0" data-ayuda="${esc(AYUDA.calor)}">Mapa de calor de lectura${sec ? ` · ${esc(nomSec)}` : ""}</h3>
<p class="sub">Tiempo que los lectores pasan en cada sección del diario (sumado, en el período elegido). Más dorado = más leído.${sec ? ` <a href="/panel${qsPanel(P, { seccion: "" })}#lectura">Ver todas las secciones</a>.` : " Toca un cuadro para filtrar por esa sección."}</p>${celdas}
<div class="dos d2">${tarjetaG("secciones", "Minutos de lectura por sección", AYUDA.secciones, { alto: Math.max(240, secs.length * 26 + 40), vacio: "Aún no hay lecturas medidas en este período." })}
${tarjetaG("secdia", sec ? `${nomSec}: lectura por día` : "Lectura por día (todas las secciones)", AYUDA.seccionDia, { vacio: "Aún no hay lecturas medidas en este período." })}
${tarjetaG("ediciones", sec ? `Ediciones donde más se leyó ${nomSec}` : "Ediciones con más lectores", sec ? AYUDA.edicionesSec : AYUDA.ediciones, { ancha: true, alto: Math.max(220, D.ediciones.length * 30 + 40) })}</div></section>`;
  // --- filtros ---
  const anioHoy = Number(P.hoy.slice(0, 4)), anios = [];
  for (let y = anioHoy; y >= 2026; y--) anios.push(y);
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const filtros = `<form class="tab-filtros" method="get" action="/panel" aria-label="Filtros del panel">
<label>Año<select name="anio">${opt("", "Últimos 30 días", !P.anio)}${anios.map((y) => opt(y, String(y), P.anio === y)).join("")}</select></label>
<label>Mes<select name="mes"${P.anio ? "" : " disabled"}>${opt("", "Todo el año", !P.mes)}${NOMBRES_MES.map((m, i) => opt(i + 1, m.replace(/^./, (x) => x.toUpperCase()), P.mes === i + 1)).join("")}</select></label>
<label>Sección del mapa de calor<select name="seccion">${opt("", "Todas las secciones", !sec)}${Object.entries(NOMBRE_SECCION).map(([k, n]) => opt(k, n, sec === k)).join("")}</select></label>
<noscript><button class="btn linea chico" type="submit">Aplicar</button></noscript>${P.anio || P.mes || sec ? `<a class="btn linea chico" href="/panel">Quitar filtros</a>` : ""}</form>`;
  // --- publicidad, comunidad y el resto ---
  const publicidad = seccionPublicidad(P, R, u.searchParams.get("anuncios"), { clicsSlug, clicsUSlug, D });
  let pul = null;
  try { pul = JSON.parse((R.pulso[0] || {}).valor || "null"); } catch { pul = null; }
  const pulTxt = !pul ? "Sin pedidos" : pul.estado === "204" ? "Pedido aceptado" : ["401", "403"].includes(pul.estado) ? "Llave rechazada" : "Falló (" + pul.estado + ")";
  const pulSub = !pul ? "Se activa con la clave GITHUB_DISPATCH" : ["401", "403"].includes(pul.estado) ? "Renovar GITHUB_DISPATCH · " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC"
    : "Último pedido " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC";
  const bz = R.bz, tot = R.bzTot[0] || { n: 0, ver: 0 };
  const cuenta = (campo) => { const c = {}; bz.forEach((r) => { try { JSON.parse(r[campo] || "[]").forEach((x) => { c[x] = (c[x] || 0) + 1; }); } catch { /* nada */ } }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const frec = {};
  bz.forEach((r) => { if (r.frecuencia) frec[r.frecuencia] = (frec[r.frecuencia] || 0) + 1; });
  const npsR = bz.filter((r) => typeof r.nps === "number");
  const nps = npsR.length ? Math.round((npsR.filter((r) => r.nps >= 9).length - npsR.filter((r) => r.nps <= 6).length) / npsR.length * 100) : null;
  const kCom = [
    kpiA("Sugerencias en el Buzón", num(tot.n, 0), num(tot.ver, 0) + " con email confirmado", "Mensajes que dejaron los lectores en el Buzón de sugerencias (desde que existe). «Con email confirmado» son los que tocaron el enlace del correo de confirmación."),
    kpiA("Recomendación (NPS)", nps === null ? "Sin respuestas" : (nps > 0 ? "+" : "") + nps, npsR.length + " respuestas", "Qué tanto recomendarían Cofrade News, de −100 a +100: el % que responde 9 o 10 menos el % que responde de 0 a 6. Sobre +30 es muy bueno; sobre +50, excelente."),
    kpiA("Socios activos", num(R.socios.filter((x) => ["activo", "prueba"].includes(x.estado)).reduce((a, x) => a + x.n, 0), 0), "Dashboard Financiero", "Personas con acceso vigente al Dashboard Financiero (área de socios), pagado o en prueba."),
    kpiA("«En vivo» al día", esc(pulTxt), pulSub, "Estado del último pedido del sitio a GitHub para actualizar los datos «En vivo» de la portada. «Pedido aceptado» es lo normal; «Llave rechazada» significa que hay que renovar la clave GITHUB_DISPATCH."),
  ].join("");
  const buzon = `<section id="buzon"><h3>Buzón: lo que dicen los lectores</h3><div class="dos">
<div class="tarjeta"><h4 class="kicker">Lo que más les gusta</h4>${barras(cuenta("gusta"))}</div>
<div class="tarjeta"><h4 class="kicker">Lo que piden agregar</h4>${barras(cuenta("agregar"), "#1E7B4F")}</div>
<div class="tarjeta"><h4 class="kicker">Frecuencia de lectura</h4>${barras(Object.entries(frec).sort((a, b) => b[1] - a[1]), "#23395B")}
<p class="sub" style="margin-top:12px">NPS = % que responde 9 o 10, menos % que responde de 0 a 6. Sobre +30 es muy bueno; sobre +50, excelente.</p></div></div>
<p style="margin:16px 0"><a class="btn linea" href="/panel/buzon.csv">Descargar todas las sugerencias (Excel / CSV)</a></p>
<div class="tabla-buzon">${bz.slice(0, 60).map((r) => `<article class="tarjeta" style="margin:0 0 10px"><b>${esc(r.nombre)} ${esc(r.apellido)}</b> <span class="m">· ${esc(r.email)} · ${esc(String(r.fecha).slice(0, 16).replace("T", " "))} UTC · ${r.verificado ? "email confirmado" : "sin confirmar"}${typeof r.nps === "number" ? " · NPS " + r.nps : ""}</span>
${r.texto ? `<p style="margin:6px 0 0;white-space:pre-wrap">${esc(r.texto)}</p>` : ""}</article>`).join("") || `<p class="aviso">Todavía no llegan sugerencias.</p>`}</div></section>`;
  const datosJson = JSON.stringify(D).replace(/</g, "\\u003c");
  const cuerpo = `<style>${TABLERO_CSS}</style><section style="border:0;padding-top:30px"><span class="kicker">Panel de Control · solo administración</span><h1 class="titulo-lujo">Cómo va Cofrade News</h1>
<p class="sub">Medición propia, sin cookies ni datos personales. Pasa el cursor (o toca) cualquier cifra o título con una <i>i</i> para ver qué significa.</p>
${filtros}<p class="tab-periodo">Mostrando: <b>${esc(P.etiqueta)}</b> (del ${ddmm(P.desde)} al ${ddmm(P.hasta)})${sec ? ` · sección <b>${esc(nomSec)}</b>` : ""}${P.futuro ? " · ese mes todavía no empieza" : ""}${R.parcial ? ' · <span style="color:var(--rojo)">algunas cifras no se pudieron leer</span>' : ""}</p>
<p class="tab-ir"><a href="#graficos">Gráficos</a><a href="#lectura">Mapa de calor</a><a href="#publicidad">Publicidad</a><a href="#socios">Socios</a><a href="#contador">Contador diario</a><a href="#buzon">Buzón</a><a href="/panel/salir">Salir del panel</a></p>
<h2 class="grupo-k">Audiencia</h2><div class="cifras k5">${kAud}</div>
<h2 class="grupo-k">Comunidad</h2><div class="cifras k5">${kCom}</div></section>
<section id="graficos"><h3>Gráficos del período</h3>${graficos}</section>
${lectura}${publicidad}${fundadores}${seccionVisitas(cont)}${buzon}
<script type="application/json" id="tablero-datos">${datosJson}</script><script src="/a/${ECHARTS_ARCHIVO}" defer></script><script>${TABLERO_JS}</script>`;
  return html(marco({ titulo: "Panel de Control · Cofrade News", descripcion: "", cuerpo }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// ----- Publicidad pagada en el Panel -----
function estadoAnunciante(a, cs, hoy) {
  const actual = cs.filter((c) => c.desde <= hoy && c.hasta >= hoy).sort((x, y) => (x.hasta < y.hasta ? 1 : -1))[0] || null;
  const ultimo = cs.slice().sort((x, y) => (x.hasta < y.hasta ? 1 : -1))[0] || null;
  const futuro = cs.filter((c) => c.desde > hoy).sort((x, y) => (x.desde > y.desde ? 1 : -1))[0] || null;
  const renovado = actual && cs.some((c) => c.hasta > actual.hasta);
  let est, clase;
  if (a.estado === "archivado") { est = "Archivado"; clase = "gris"; }
  else if (a.estado === "pausado") { est = "En pausa"; clase = "gris"; }
  else if (!ultimo) { est = "Sin contrato"; clase = "gris"; }
  else if (actual) {
    const d = diasHasta(hoy, actual.hasta);
    if (renovado) { est = `Vigente y renovado hasta el ${ddmm(ultimo.hasta)}`; clase = "ok"; }
    else if (d <= 7) { est = d <= 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `Vence en ${d} días`; clase = "urgente"; }
    else if (d <= 30) { est = `Vence en ${d} días`; clase = "pronto"; }
    else { est = `Vigente: quedan ${d} días`; clase = "ok"; }
  } else if (futuro) { est = `Empieza el ${ddmm(futuro.desde)}`; clase = "gris"; }
  else { const d = diasHasta(ultimo.hasta, hoy); est = d === 1 ? "Venció ayer" : `Venció hace ${d} días`; clase = "urgente"; }
  let aviso = "";
  if (actual && !renovado && a.estado === "activo") {
    const enviado = actual.aviso_enviado && !String(actual.aviso_enviado).startsWith("enviando:") ? actual.aviso_enviado : "";
    aviso = enviado ? `Enviado el ${fechaHora(enviado)}` : diasHasta(hoy, actual.hasta) <= 7 ? "Sale en la próxima revisión (cada hora, de 9:00 a 20:59)" : `Sale solo el ${ddmm(masDias(actual.hasta, -7))}`;
  } else if (renovado) aviso = "No hace falta: ya renovó";
  return { actual, ultimo, futuro, renovado, est, clase, aviso };
}
function campoA(etiqueta, nombre, valor, extra = "", ayuda = "") {
  return `<label${/class="ancho"/.test(extra) ? ' class="ancho"' : ""}>${esc(etiqueta)}${ayuda ? ` <span class="ac">${esc(ayuda)}</span>` : ""}<input name="${nombre}" value="${esc(valor)}" ${extra.replace(/class="ancho"/, "")}></label>`;
}
function camposContratoHtml(c, hoy) {
  const desde = c.desde || hoy, hasta = c.hasta || unAnioDesde(desde);
  return `<fieldset><legend>Contrato y pago</legend>
${campoA("Desde *", "desde", desde, 'type="date" required')}${campoA("Hasta *", "hasta", hasta, 'type="date" required', "un año por defecto")}
${campoA("Monto pagado *", "monto", c.monto ?? PRECIO_RENOVACION.monto, 'type="number" step="0.01" min="0" required inputmode="decimal"')}
<label>Moneda<select name="moneda"><option value="UF"${c.moneda === "CLP" ? "" : " selected"}>UF</option><option value="CLP"${c.moneda === "CLP" ? " selected" : ""}>Pesos chilenos</option></select></label>
${campoA("Fecha de pago", "fecha_pago", c.fecha_pago || hoy, 'type="date"')}
<label>Medio de pago<select name="medio_pago">${["Transferencia", "Mercado Pago", "Tarjeta", "Efectivo", "Otro"].map((x) => `<option${c.medio_pago === x ? " selected" : ""}>${x}</option>`).join("")}</select></label>
${campoA("N° de factura o boleta", "documento", c.documento || "", 'maxlength="40"')}${campoA("Notas del contrato", "notas_contrato", c.notas || "", 'maxlength="300" class="ancho"')}
</fieldset>`;
}
function formAnunciante(a, P, q) {
  const v = (k, d = "") => (a && a[k] !== null && a[k] !== undefined && a[k] !== "" ? a[k] : d);
  const banner = v("banner", "ambos");
  return `<form class="form-anun" method="post" action="/panel/anunciantes" enctype="multipart/form-data">
<input type="hidden" name="accion" value="${a ? "editar" : "crear"}">${a ? `<input type="hidden" name="id" value="${a.id}">` : ""}<input type="hidden" name="q" value="${esc(q)}">
<fieldset><legend>Empresa y contacto</legend>
${campoA("Empresa *", "empresa", v("empresa"), 'required maxlength="60" autocomplete="organization"')}
${campoA("RUT de la empresa", "rut", v("rut"), 'maxlength="14" placeholder="76.123.456-0"', "para la factura; opcional")}
${campoA("Rubro", "rubro", v("rubro"), 'maxlength="60" placeholder="Ej.: ferretería, corredora de propiedades"')}
${campoA("Persona de contacto *", "contacto", v("contacto"), 'required maxlength="80" autocomplete="name"')}
${campoA("Email de contacto *", "email", v("email"), 'type="email" required maxlength="120" autocomplete="email"', "aquí llega el aviso de renovación")}
${campoA("Teléfono", "telefono", v("telefono"), 'type="tel" maxlength="30" placeholder="+56 9 1234 5678" autocomplete="tel"')}
${campoA("Sitio web", "web", v("web"), 'maxlength="300" placeholder="www.empresa.cl" inputmode="url" class="ancho"')}
</fieldset>
<fieldset><legend>El aviso (así sale en el diario y en la portada)</legend>
${campoA("Título del aviso *", "titulo", v("titulo"), 'required maxlength="90" class="ancho"')}
<label class="ancho">Texto del aviso <span class="ac">hasta 260 letras</span><textarea name="texto" maxlength="260" rows="3">${esc(v("texto"))}</textarea></label>
${campoA("Texto del botón 1", "boton1_texto", v("boton1_texto", "Visitar sitio web"), 'maxlength="40"')}
${campoA("Enlace del botón 1 *", "boton1_web", v("boton1_web"), 'required maxlength="300" placeholder="www.empresa.cl/oferta" inputmode="url"', "la página a la que llega el lector")}
${campoA("Texto del botón 2", "boton2_texto", v("boton2_texto"), 'maxlength="40" placeholder="Escribir un email"', "opcional")}
${campoA("Enlace o email del botón 2", "boton2", a ? a.boton2_email || a.boton2_web || "" : "", 'maxlength="300" placeholder="ventas@empresa.cl o www.empresa.cl/contacto"', "opcional")}
<label>Dónde sale en el diario<select name="banner">${[["ambos", "En los dos banners (recomendado)"], ["1", "Solo en el banner 1 (a un tercio del diario)"], ["2", "Solo en el banner 2 (a dos tercios)"]].map(([k, t]) => `<option value="${k}"${banner === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
${campoA("Orden en el carrusel", "orden", v("orden", 1), 'type="number" min="1" max="99"', "1 = primero")}
${campoA("Color de fondo", "color_fondo", HEX6.test(v("color_fondo")) ? v("color_fondo") : "#0B1F3A", 'type="color"')}
${campoA("Color de botones y detalles", "color_acento", HEX6.test(v("color_acento")) ? v("color_acento") : "#D9AE52", 'type="color"')}
<label>Logo <span class="ac">PNG, JPG o WebP de hasta 300 KB; ideal cuadrado de 400 × 400 px</span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp"></label>
${a && a.logo_tipo ? `<label class="check"><input type="checkbox" name="quitar_logo" value="1"> Quitar el logo actual</label>` : ""}
</fieldset>
${a ? "" : camposContratoHtml({}, P.hoy)}
<label class="ancho">Notas internas <span class="ac">solo las ves tú</span><textarea name="notas" maxlength="1000" rows="2">${esc(v("notas"))}</textarea></label>
<div><button class="btn oro" type="submit">${a ? "Guardar cambios" : "Agregar anunciante"}</button></div></form>`;
}
function seccionPublicidad(P, R, msg, { clicsSlug, clicsUSlug, D }) {
  const hoy = P.hoy, q = qsPanel(P), anun = R.anunciantes, cs = R.contratos;
  const de = (id) => cs.filter((c) => c.anunciante_id === id);
  const clicsEn = (slug, a, z) => R.clicsDia.filter((x) => x.slug === slug && x.fecha >= a && x.fecha <= z).reduce((t, x) => t + Number(x.n || 0), 0);
  const filas = anun.map((a) => ({ a, cs: de(a.id), e: estadoAnunciante(a, de(a.id), hoy) }));
  const vigentes = filas.filter((x) => x.a.estado === "activo" && x.e.actual), pausados = filas.filter((x) => x.a.estado === "pausado");
  const vencen = vigentes.filter((x) => !x.e.renovado && diasHasta(hoy, x.e.actual.hasta) <= 30), urgentes = vencen.filter((x) => diasHasta(hoy, x.e.actual.hasta) <= 7);
  const ingresos = {};
  cs.forEach((c) => { const f = c.fecha_pago || c.desde; if (f >= P.desde && f <= P.hasta) ingresos[c.moneda || "UF"] = (ingresos[c.moneda || "UF"] || 0) + Number(c.monto || 0); });
  const ingTxt = Object.keys(ingresos).length ? Object.entries(ingresos).map(([m, t]) => montoTxt(t, m)).join(" + ") : montoTxt(0, "UF");
  const nIng = cs.filter((c) => { const f = c.fecha_pago || c.desde; return f >= P.desde && f <= P.hasta; }).length;
  const slugsPagados = new Set(anun.map((a) => a.slug)), clicsTot = Object.entries(clicsSlug).filter(([s]) => slugsPagados.has(s)).reduce((t, [, n]) => t + n, 0);
  const clicsUTot = Object.entries(clicsUSlug).filter(([s]) => slugsPagados.has(s)).reduce((t, [, n]) => t + n, 0);
  const kPub = [
    kpiA("Anunciantes con aviso vigente", num(vigentes.length, 0), pausados.length ? `${cuantos(pausados.length, "en pausa", "en pausa")}` : "pagan y salen hoy", AYUDA.vigentes),
    kpiA("Vencen en 30 días", num(vencen.length, 0), urgentes.length ? `${cuantos(urgentes.length, "vence", "vencen")} en 7 días o menos: el correo sale solo` : "el correo de renovación sale solo 7 días antes", AYUDA.vencen),
    kpiA("Ingresos del período", esc(ingTxt), nIng ? cuantos(nIng, "contrato pagado", "contratos pagados") : "sin pagos anotados en el período", AYUDA.ingresos),
    kpiA("Clics en avisos pagados", num(clicsTot, 0), cuantos(clicsUTot, "persona distinta", "personas distintas") + " (por día)", AYUDA.clics),
  ].join("");
  const tarjeta = ({ a, cs: lc, e }) => {
    const ini = (a.empresa || "?").trim().charAt(0).toUpperCase(), fondo = HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A", logo = logoDe(a);
    const marca = logo ? `<img class="anun-logo" src="${esc(logo)}" alt="" loading="lazy">` : `<span class="anun-ini" style="background:${fondo};color:${tintaSobre(fondo)}" aria-hidden="true">${esc(ini)}</span>`;
    const c = e.actual || e.ultimo, total = {};
    lc.forEach((x) => { total[x.moneda || "UF"] = (total[x.moneda || "UF"] || 0) + Number(x.monto || 0); });
    const clicsContrato = c ? clicsEn(a.slug, c.desde, c.hasta < hoy ? c.hasta : hoy) : 0;
    const renovar = { desde: e.ultimo && e.ultimo.hasta >= hoy ? masDias(e.ultimo.hasta, 1) : hoy };
    renovar.hasta = unAnioDesde(renovar.desde);
    const boton = (accion, texto, extra = "") => `<form method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="${accion}"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="q" value="${esc(q)}"><button class="btn linea chico" type="submit"${extra}>${texto}</button></form>`;
    return `<article class="anun ${esc(a.estado)}" id="anun-${a.id}"><div class="anun-cab">${marca}<div><h4>${esc(a.empresa)}</h4>${a.rubro ? `<span class="aviso">${esc(a.rubro)}</span>` : ""}</div><span class="est ${e.clase}">${esc(e.est)}</span></div>
<div class="anun-datos">
<div><small>Contacto</small>${esc(a.contacto || "Sin nombre")}<br><a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${a.telefono ? `<br><a href="tel:${esc(String(a.telefono).replace(/[^+\d]/g, ""))}">${esc(a.telefono)}</a>` : ""}</div>
<div><small>Vigencia del contrato</small>${c ? `${ddmm(c.desde)} al ${ddmm(c.hasta)}` : "Sin contrato"}${e.renovado ? `<br>renovado hasta el ${ddmm(e.ultimo.hasta)}` : ""}</div>
<div><small>Pagó</small>${c ? `${esc(montoTxt(c.monto, c.moneda))} · ${ddmm(c.fecha_pago || c.desde)}${c.medio_pago ? " · " + esc(c.medio_pago) : ""}${c.documento ? ` · doc. ${esc(c.documento)}` : ""}` : "Sin pagos"}<br><span class="aviso">Total histórico: ${esc(Object.entries(total).map(([m, t]) => montoTxt(t, m)).join(" + ") || montoTxt(0, "UF"))}</span></div>
<div><small>Clics en su aviso</small>${cuantos(clicsSlug[a.slug] || 0, "clic", "clics")} en el período${c ? `<br><span class="aviso">${cuantos(clicsContrato, "clic", "clics")} en el contrato</span>` : ""}</div>
<div><small>Correo de renovación</small>${esc(e.aviso || "No corresponde")}</div>
${a.rut ? `<div><small>RUT</small>${esc(a.rut)}</div>` : ""}${a.web ? `<div><small>Sitio web</small><a href="${esc(urlSegura(a.web))}" target="_blank" rel="noopener">${esc(String(a.web).replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>` : ""}
</div>${a.notas ? `<p class="aviso" style="white-space:pre-wrap;margin:6px 0 0">Notas: ${esc(a.notas)}</p>` : ""}
<div class="acciones-anun">${a.estado === "activo" ? boton("pausar", "Pausar el aviso") : boton("reactivar", "Reactivar")}
${c ? `<a class="btn linea chico" href="/panel/anunciantes/correo?id=${a.id}" target="_blank" rel="noopener">Ver el correo de renovación</a>${a.estado !== "archivado" ? boton("enviar-aviso", "Enviar ahora el correo", ` onclick="return confirm('¿Enviar ahora el correo de renovación a ${esc(String(a.email).replace(/['\\]/g, ""))}?')"`) : ""}` : ""}
${a.estado !== "archivado" ? boton("archivar", "Archivar", ` onclick="return confirm('¿Archivar a ${esc(String(a.empresa).replace(/['\\]/g, ""))}? Su aviso deja de salir.')"`) : ""}</div>
<details><summary>Renovar (UF ${PRECIO_RENOVACION.monto} por 12 meses)</summary><form class="form-anun" method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="contrato"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="q" value="${esc(q)}">
${camposContratoHtml({ desde: renovar.desde, hasta: renovar.hasta }, hoy)}<div><button class="btn oro" type="submit">Registrar la renovación</button></div></form></details>
<details><summary>Editar los datos y el aviso</summary>${formAnunciante(a, P, q)}</details>
${lc.length ? `<details><summary>Historial de contratos (${lc.length})</summary><div style="overflow-x:auto"><table class="tabla-c"><thead><tr><th>Desde</th><th>Hasta</th><th>Monto</th><th>Pago</th><th>Correo de renovación</th><th></th></tr></thead><tbody>
${lc.slice().reverse().map((x) => `<tr><td>${ddmm(x.desde)}</td><td>${ddmm(x.hasta)}</td><td>${esc(montoTxt(x.monto, x.moneda))}</td><td>${ddmm(x.fecha_pago || x.desde)}${x.medio_pago ? "<br>" + esc(x.medio_pago) : ""}${x.documento ? "<br>doc. " + esc(x.documento) : ""}</td>
<td>${x.aviso_enviado && !String(x.aviso_enviado).startsWith("enviando:") ? esc(fechaHora(x.aviso_enviado)) : "No enviado"}</td><td><form method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="borrar-contrato"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="contrato" value="${x.id}"><input type="hidden" name="q" value="${esc(q)}"><button class="enlace" type="submit" onclick="return confirm('¿Borrar este contrato? No se puede deshacer.')">Borrar</button></form></td></tr>`).join("")}
</tbody></table></div></details>` : ""}</article>`;
  };
  const activos = filas.filter((x) => x.a.estado !== "archivado"), archivados = filas.filter((x) => x.a.estado === "archivado");
  const clicsMarcas = marcasPropias().map((m) => [m.nombre, clicsSlug[slugMarca(m)] || 0, clicsUSlug[slugMarca(m)] || 0]);
  const correos = R.correos;
  return `<section id="publicidad"><h3>Publicidad pagada</h3>${mensajeAnuncios(msg)}
<p class="sub">Registro de las empresas que pagan por publicidad. Sus avisos salen en el carrusel de la portada y en los dos banners del diario mientras el contrato esté vigente. Siete días antes del vencimiento, el panel les envía solo un correo de renovación (UF ${PRECIO_RENOVACION.monto} por 12 meses) con sus cifras y copia a ${CORREO_HOLA}. Tus marcas propias no se mezclan aquí: van abajo, aparte, y no vencen.</p>
<div class="cifras k5">${kPub}</div>
<div class="dos d2" style="margin-top:14px">${tarjetaG("clics", "Clics por anunciante en el período", AYUDA.clicsG, { ancha: true, alto: Math.max(200, D.clics.length * 40 + 70), vacio: "Todavía no hay clics en avisos pagados en este período." })}</div>
<details class="nuevo-anun" id="nuevo-anunciante"${activos.length ? "" : " open"}><summary class="btn oro" style="display:inline-flex;margin:16px 0 4px">+ Agregar un anunciante</summary>${formAnunciante(null, P, q)}</details>
<div class="anuns">${activos.map(tarjeta).join("") || `<p class="aviso">Todavía no hay anunciantes que paguen. Cuando cierres el primero, agrégalo con el botón de arriba: su aviso entra solo al carrusel de la portada y al diario.</p>`}</div>
${archivados.length ? `<details style="margin-top:12px"><summary>Archivados (${archivados.length})</summary><div class="anuns">${archivados.map(tarjeta).join("")}</div></details>` : ""}
${anun.length ? `<p style="margin:16px 0 0"><a class="btn linea" href="/panel/anunciantes.csv">Descargar anunciantes y contratos (Excel / CSV)</a></p>` : ""}
<h4 class="kicker tit-g" tabindex="0" style="margin-top:26px" data-ayuda="Tus marcas aparecen en el carrusel de la portada y en el diario de forma permanente: no tienen contrato ni vencen. Aquí solo se cuentan sus clics.">Tus marcas (permanentes)</h4>
<div class="marcas-p">${clicsMarcas.map(([n, c, cu]) => `<div class="cifra"><small>${esc(n)}</small><b>${cuantos(c, "clic", "clics")}</b><br><small>${cuantos(cu, "persona distinta", "personas distintas")} · en el período</small></div>`).join("")}</div>
<h4 class="kicker" style="margin-top:22px">Correos enviados a los anunciantes</h4>
${correos.length ? `<div style="overflow-x:auto"><table class="tabla-c"><thead><tr><th>Fecha</th><th>Empresa</th><th>Para</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>${correos.map((x) => `<tr><td>${esc(fechaHora(x.fecha))}</td><td>${esc((anun.find((a) => a.id === x.anunciante_id) || {}).empresa || "")}</td><td>${esc(x.para)}</td><td>${esc(x.tipo)}</td><td>${x.estado === "enviado" ? "Enviado" : '<b style="color:var(--rojo)">Falló</b>'}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="aviso">Todavía no se ha enviado ningún correo a los anunciantes.</p>`}</section>`;
}

// ----- Acciones del registro (solo Germán) -----
function camposAnunciante(f) {
  const t = (k, n) => String(f.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  const color = (k, d) => (HEX6.test(String(f.get(k) || "")) ? String(f.get(k)).toUpperCase() : d);
  const d = { empresa: t("empresa", 60), rubro: t("rubro", 60), contacto: t("contacto", 80), email: t("email", 120).toLowerCase(), telefono: t("telefono", 30),
    titulo: t("titulo", 90), texto: t("texto", 260), boton1_texto: t("boton1_texto", 40), boton2_texto: t("boton2_texto", 40),
    banner: ["ambos", "1", "2"].includes(String(f.get("banner"))) ? String(f.get("banner")) : "ambos", orden: Math.max(1, Math.min(99, Math.round(Number(f.get("orden")) || 1))),
    color_fondo: color("color_fondo", "#0B1F3A"), color_acento: color("color_acento", "#D9AE52"), notas: String(f.get("notas") || "").trim().slice(0, 1000) };
  if (d.empresa.length < 2) return { error: "empresa" };
  if (!d.contacto) return { error: "contacto" };
  if (!EMAIL_OK.test(d.email)) return { error: "email" };
  if (d.telefono && !/^[+\d ()-]{6,30}$/.test(d.telefono)) return { error: "telefono" };
  const rut = t("rut", 14);
  if (rut && !rutValido(rut)) return { error: "rut" };
  d.rut = rut ? rutConPuntos(rut) : "";
  const web = webOk(f.get("web"));
  if (web === null) return { error: "web" };
  d.web = web;
  if (d.titulo.length < 2) return { error: "titulo" };
  const b1 = webOk(f.get("boton1_web") || web);
  if (!b1) return { error: "boton1_web" };
  d.boton1_web = b1;
  const b2 = String(f.get("boton2") || "").trim().replace(/^mailto:/i, "");
  d.boton2_web = ""; d.boton2_email = "";
  if (b2) { if (EMAIL_OK.test(b2)) d.boton2_email = b2.toLowerCase(); else { const w = webOk(b2); if (!w) return { error: "boton2" }; d.boton2_web = w; } }
  return { d };
}
function camposContrato(f) {
  const desde = String(f.get("desde") || ""), hasta = String(f.get("hasta") || "");
  if (!fechaValida(desde)) return { error: "desde" };
  if (!fechaValida(hasta) || hasta < desde || diasHasta(desde, hasta) > 1100) return { error: "hasta" };
  const moneda = String(f.get("moneda")) === "CLP" ? "CLP" : "UF", monto = Number(String(f.get("monto") || "").replace(",", "."));
  if (!String(f.get("monto") || "").trim() || !Number.isFinite(monto) || monto < 0 || monto > (moneda === "UF" ? 10000 : 500000000)) return { error: "monto" };
  const fp = String(f.get("fecha_pago") || "");
  if (fp && !fechaValida(fp)) return { error: "fecha_pago" };
  const t = (k, n) => String(f.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  return { c: { desde, hasta, monto: Math.round(monto * 100) / 100, moneda, fecha_pago: fp || desde, medio_pago: t("medio_pago", 40), documento: t("documento", 40), notas: t("notas_contrato", 300) } };
}
async function leerLogo(f) {   // PNG, JPG o WebP reconocidos por sus primeros bytes, hasta 300 KB
  const x = f.get("logo");
  if (!x || typeof x === "string" || !x.size) return {};
  if (x.size > 300 * 1024) return { error: "logo-grande" };
  const b = new Uint8Array(await x.arrayBuffer()), txt = (i, j) => String.fromCharCode(...b.slice(i, j));
  const tipo = b[0] === 0x89 && txt(1, 4) === "PNG" ? "image/png" : b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF ? "image/jpeg" : b.length > 12 && txt(0, 4) === "RIFF" && txt(8, 12) === "WEBP" ? "image/webp" : "";
  if (!tipo) return { error: "logo-tipo" };
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  const datos = btoa(bin);
  return { tipo, datos, version: (await sha256hex(datos)).slice(0, 10) };
}
async function accionAnunciantes(req, env, ctx) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const volver = (q, codigo, ancla = "publicidad") => new Response(null, { status: 303, headers: { Location: `/panel${q ? q + "&" : "?"}anuncios=${encodeURIComponent(codigo)}#${ancla}`, "Cache-Control": "no-store" } });
  if (!env.DB) return volver("", "sin-base");
  if (Number(req.headers.get("Content-Length") || 0) > 700000) return volver("", "muy-grande");
  let f;
  try { f = await req.formData(); } catch { return volver("", "formulario"); }
  const q = limpiarQ(String(f.get("q") || "")), ir = (codigo, ancla) => volver(q, codigo, ancla);
  const accion = String(f.get("accion") || ""), id = Math.floor(Number(f.get("id") || 0)), ahora = new Date().toISOString();
  if (accion === "crear") {
    const A = camposAnunciante(f);
    if (A.error) return ir("error:" + A.error, "nuevo-anunciante");
    const C = camposContrato(f);
    if (C.error) return ir("error:" + C.error, "nuevo-anunciante");
    const L = await leerLogo(f);
    if (L.error) return ir("error:" + L.error, "nuevo-anunciante");
    let base = slugAnuncio(A.d.empresa);
    if (base.startsWith("m-")) base = "a-" + base;   // «m-…» es de las marcas propias
    const usados = new Set(((await env.DB.prepare("SELECT slug FROM anunciantes WHERE slug = ? OR slug LIKE ?").bind(base, base + "-%").all()).results || []).map((x) => x.slug));
    let slug = base;
    for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
    const d = A.d;
    const r = await env.DB.prepare(`INSERT INTO anunciantes (slug, empresa, rut, rubro, contacto, email, telefono, web, titulo, texto, boton1_texto, boton1_web, boton2_texto, boton2_web, boton2_email,
      banner, orden, color_fondo, color_acento, estado, notas, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?, ?) RETURNING id`)
      .bind(slug, d.empresa, d.rut, d.rubro, d.contacto, d.email, d.telefono, d.web, d.titulo, d.texto, d.boton1_texto, d.boton1_web, d.boton2_texto, d.boton2_web, d.boton2_email,
        d.banner, d.orden, d.color_fondo, d.color_acento, d.notas, ahora, ahora).first();
    const c = C.c, ops = [env.DB.prepare("INSERT INTO contratos (anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(r.id, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.notas, ahora)];
    if (L.tipo) ops.push(env.DB.prepare("INSERT OR REPLACE INTO logos_anuncios (anunciante_id, tipo, datos, version, creado) VALUES (?, ?, ?, ?, ?)").bind(r.id, L.tipo, L.datos, L.version, ahora));
    await env.DB.batch(ops);
    ANUNCIOS.t = 0;
    return ir("creado", "anun-" + r.id);
  }
  const a = id ? await env.DB.prepare("SELECT id, estado FROM anunciantes WHERE id = ?").bind(id).first().catch(() => null) : null;
  if (!a) return ir("no-existe");
  if (accion === "editar") {   // el slug no cambia: los enlaces de las ediciones ya publicadas siguen funcionando
    const A = camposAnunciante(f);
    if (A.error) return ir("error:" + A.error, "anun-" + id);
    const L = await leerLogo(f);
    if (L.error) return ir("error:" + L.error, "anun-" + id);
    const d = A.d, ops = [env.DB.prepare(`UPDATE anunciantes SET empresa = ?, rut = ?, rubro = ?, contacto = ?, email = ?, telefono = ?, web = ?, titulo = ?, texto = ?, boton1_texto = ?, boton1_web = ?,
      boton2_texto = ?, boton2_web = ?, boton2_email = ?, banner = ?, orden = ?, color_fondo = ?, color_acento = ?, notas = ?, actualizado = ? WHERE id = ?`)
      .bind(d.empresa, d.rut, d.rubro, d.contacto, d.email, d.telefono, d.web, d.titulo, d.texto, d.boton1_texto, d.boton1_web, d.boton2_texto, d.boton2_web, d.boton2_email,
        d.banner, d.orden, d.color_fondo, d.color_acento, d.notas, ahora, id)];
    if (L.tipo) ops.push(env.DB.prepare("INSERT OR REPLACE INTO logos_anuncios (anunciante_id, tipo, datos, version, creado) VALUES (?, ?, ?, ?, ?)").bind(id, L.tipo, L.datos, L.version, ahora));
    else if (String(f.get("quitar_logo")) === "1") ops.push(env.DB.prepare("DELETE FROM logos_anuncios WHERE anunciante_id = ?").bind(id));
    await env.DB.batch(ops);
    ANUNCIOS.t = 0;
    return ir("editado", "anun-" + id);
  }
  if (accion === "contrato") {
    const C = camposContrato(f);
    if (C.error) return ir("error:" + C.error, "anun-" + id);
    const c = C.c;
    await env.DB.prepare("INSERT INTO contratos (anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.notas, ahora).run();
    ANUNCIOS.t = 0;
    return ir("renovado", "anun-" + id);
  }
  if (accion === "borrar-contrato") {
    await env.DB.prepare("DELETE FROM contratos WHERE id = ? AND anunciante_id = ?").bind(Math.floor(Number(f.get("contrato") || 0)), id).run();
    ANUNCIOS.t = 0;
    return ir("contrato-borrado", "anun-" + id);
  }
  if (["pausar", "reactivar", "archivar"].includes(accion)) {
    const nuevo = { pausar: "pausado", reactivar: "activo", archivar: "archivado" }[accion];
    await env.DB.prepare("UPDATE anunciantes SET estado = ?, actualizado = ? WHERE id = ?").bind(nuevo, ahora, id).run();
    ANUNCIOS.t = 0;
    return ir({ pausar: "pausado", reactivar: "reactivado", archivar: "archivado" }[accion], "anun-" + id);
  }
  if (accion === "enviar-aviso") {
    const c = await env.DB.prepare("SELECT id FROM contratos WHERE anunciante_id = ? ORDER BY hasta DESC, id DESC LIMIT 1").bind(id).first().catch(() => null);
    if (!c) return ir("sin-contrato", "anun-" + id);
    const r = await enviarRenovacion(env, ctx, c.id, "manual");
    return ir(r.ok ? "enviado" : r.error === "ocupado" ? "ocupado" : r.error === "sin-email" ? "sin-email" : "no-enviado", "anun-" + id);
  }
  return ir("formulario");
}
async function anunciantesCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const filas = (await env.DB.prepare(`SELECT a.empresa, a.rut, a.rubro, a.contacto, a.email, a.telefono, a.web, a.estado, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.aviso_enviado,
    (SELECT COALESCE(SUM(k.n), 0) FROM clics k WHERE k.slug = a.slug AND k.fecha BETWEEN c.desde AND c.hasta) AS clics,
    (SELECT COUNT(*) FROM clics_unicos k WHERE k.slug = a.slug AND k.fecha BETWEEN c.desde AND c.hasta) AS personas
    FROM anunciantes a LEFT JOIN contratos c ON c.anunciante_id = a.id ORDER BY a.empresa, c.desde`).all()).results || [];
  const celda = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas inyectadas
  const csv = "\ufeffempresa;rut;rubro;contacto;email;telefono;web;estado;contrato_desde;contrato_hasta;monto;moneda;fecha_pago;medio_pago;documento;correo_renovacion;clics_en_el_contrato;personas_que_hicieron_clic\n"
    + filas.map((r) => [r.empresa, r.rut, r.rubro, r.contacto, r.email, r.telefono, r.web, r.estado, r.desde ? ddmm(r.desde) : "", r.hasta ? ddmm(r.hasta) : "", r.monto, r.moneda, r.fecha_pago ? ddmm(r.fecha_pago) : "",
      r.medio_pago, r.documento, r.aviso_enviado && !String(r.aviso_enviado).startsWith("enviando:") ? fechaHora(r.aviso_enviado) : "", r.desde ? r.clics : "", r.desde ? r.personas : ""].map(celda).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="anunciantes-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
}
async function vistaCorreoAnunciante(req, env, ctx, u) {   // el mismo correo que recibiría el anunciante, sin enviarlo
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const c = await env.DB.prepare(`SELECT c.id, c.anunciante_id, c.desde, c.hasta, c.aviso_enviado, a.empresa, a.contacto, a.email, a.slug FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id
    WHERE a.id = ? ORDER BY c.hasta DESC, c.id DESC LIMIT 1`).bind(Math.floor(Number(u.searchParams.get("id") || 0))).first().catch(() => null);
  if (!c) return html(marco({ titulo: "Sin contrato · Panel", descripcion: "", cuerpo: `<section style="border:0"><h1>Ese anunciante no tiene contratos.</h1><p class="lede"><a href="/panel#publicidad">Volver al Panel</a></p></section>` }), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const co = correoRenovacion(await metricasContrato(env, ctx, c), c);
  const aviso = `<div style="background:#FFF4D6;border-bottom:1px solid #E4D2A0;padding:12px 16px;font:14px/1.5 Arial,sans-serif;color:#5B4A12">Vista previa: no se envió nada. Para: ${esc(c.email)} · copia a ${CORREO_HOLA} · Asunto: «${esc(co.asunto)}»</div>`;
  return new Response(co.html.replace(/<body([^>]*)>/, `<body$1>${aviso}`), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex",
    "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; frame-ancestors 'none'", ...SEGURIDAD } });
}

const TABLERO_CSS = `.tab-filtros{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-end;margin:4px 0 0}
.tab-filtros label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:var(--gris)}
.tab-filtros select{font:15px var(--sans);min-height:46px;padding:8px 12px;border:1.5px solid var(--linea);border-radius:12px;background:var(--card);color:var(--tinta);min-width:170px;cursor:pointer}
.tab-filtros select:hover{border-color:var(--oro)}.tab-filtros select:disabled{opacity:.5;cursor:not-allowed}
.tab-periodo{margin:14px 0 4px;font-size:14.5px;color:var(--gris)}.tab-periodo b{color:var(--tinta)}
.tab-ir{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px;margin:6px 0 0}.tab-ir a{color:var(--oro-t);min-height:32px;display:inline-flex;align-items:center}
.grupo-k{margin:24px 0 10px;font:700 13px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t)}
.cifras.k5{grid-template-columns:repeat(auto-fit,minmax(176px,1fr))}
[data-ayuda]{position:relative;cursor:help}[data-ayuda]:focus{outline:none}[data-ayuda]:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
.cifra[data-ayuda]{padding-right:34px;transition:border-color .15s}.cifra[data-ayuda]:hover{border-color:var(--oro)}
.cifra[data-ayuda]::after,.tit-g[data-ayuda]::after{content:"i";position:absolute;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--linea);color:var(--gris);font:italic 700 12px/15px var(--serif);text-align:center;box-sizing:border-box}
.cifra[data-ayuda]::after{top:10px;right:10px}.tit-g{display:inline-block;position:relative;padding-right:28px}.tit-g[data-ayuda]::after{top:50%;margin-top:-9px;right:0}
[data-ayuda]:hover::after,[data-ayuda]:focus::after{border-color:var(--oro);color:var(--oro-t)}
.delta{display:inline-block;margin-top:5px;font-size:12.5px;font-weight:600;line-height:1.35}.delta.sube{color:var(--verde)}.delta.baja{color:var(--rojo)}.delta.igual{color:var(--gris);font-weight:500}
.ayuda-flot{position:absolute;z-index:90;max-width:340px;background:var(--tinta);color:var(--papel);font:14px/1.55 var(--sans);padding:12px 14px;border-radius:12px;box-shadow:0 16px 36px -14px rgba(0,0,0,.55);pointer-events:none}
.ayuda-flot[hidden]{display:none}
.graf{width:100%;height:300px}.graf .aviso{margin:20px 0}.tarjeta.ancha{grid-column:1/-1}.nota-g{font-size:12.5px;color:var(--gris);margin:8px 0 0}
a.cel{text-decoration:none;display:block;transition:border-color .15s,transform .15s}a.cel:hover{border-color:var(--oro);transform:translateY(-1px)}a.cel.sel{outline:3px solid var(--oro);outline-offset:1px}
.anuns{display:grid;gap:14px;margin-top:14px}.anun{background:var(--card);border:1px solid var(--linea);border-radius:18px;padding:18px}.anun.pausado,.anun.archivado{opacity:.82}
.anun-cab{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.anun-cab h4{margin:0;font:600 21px/1.2 var(--serif)}.anun-cab .est{margin-left:auto}
.anun-logo,.anun-ini{width:52px;height:52px;border-radius:12px;flex:none}.anun-logo{object-fit:contain;background:#fff;border:1px solid var(--linea)}.anun-ini{display:grid;place-items:center;font:700 21px var(--serif)}
.est{display:inline-flex;align-items:center;min-height:28px;padding:3px 12px;border-radius:999px;font-size:13px;font-weight:700}
.est.ok{background:rgba(30,123,79,.14);color:var(--verde)}.est.pronto{background:rgba(184,137,43,.2);color:var(--oro-t)}.est.urgente{background:rgba(179,38,30,.13);color:var(--rojo)}.est.gris{background:var(--linea);color:var(--gris)}
.anun-datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 20px;margin:14px 0 4px;font-size:14.5px}
.anun-datos small{display:block;color:var(--gris);font-size:12.5px;font-weight:600;margin-bottom:2px}.anun-datos a{color:var(--oro-t);overflow-wrap:anywhere}
.anun details{border-top:1px solid var(--linea);margin-top:10px}.anun summary{cursor:pointer;font-weight:600;color:var(--oro-t);min-height:46px;display:flex;align-items:center}
.nuevo-anun>summary{list-style:none;cursor:pointer}.nuevo-anun>summary::-webkit-details-marker{display:none}
.acciones-anun{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.acciones-anun form{display:contents}.btn.chico{min-height:44px;padding:0 16px;font-size:14px}
.form-anun{display:grid;gap:14px;margin:8px 0 12px}
.form-anun fieldset{border:1px solid var(--linea);border-radius:14px;padding:12px 14px 14px;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;min-width:0}
.form-anun legend{font-weight:700;font-size:15px;padding:0 6px}.form-anun label{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:600;min-width:0}
.form-anun input,.form-anun select,.form-anun textarea{font:16px var(--sans);padding:10px 12px;border:1.5px solid var(--linea);border-radius:10px;background:var(--papel);color:var(--tinta);min-height:46px;width:100%;box-sizing:border-box}
.form-anun input:focus,.form-anun select:focus,.form-anun textarea:focus{outline:3px solid rgba(184,137,43,.45);border-color:var(--oro)}
.form-anun input[type=color]{padding:4px;cursor:pointer}.form-anun .ancho{grid-column:1/-1}.form-anun .ac{font-weight:400;color:var(--gris);font-size:12.5px}
.form-anun label.check{flex-direction:row;align-items:center;gap:8px;font-weight:500}.form-anun label.check input{width:22px;min-height:22px}
.tabla-c{width:100%;border-collapse:collapse;font-size:14px}.tabla-c th,.tabla-c td{padding:8px;border-bottom:1px solid var(--linea);text-align:left;vertical-align:top}.tabla-c th{color:var(--gris);font-size:12.5px}
.marcas-p{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.aviso-ok{border-left:4px solid var(--verde);background:rgba(30,123,79,.09);padding:10px 14px;border-radius:10px;font-size:15px}
.aviso-mal{border-left:4px solid var(--rojo);background:rgba(179,38,30,.09);padding:10px 14px;border-radius:10px;font-size:15px;color:var(--rojo)}
@media (max-width:560px){.cifras.k5,.marcas-p{grid-template-columns:repeat(2,minmax(0,1fr))}.cifra[data-ayuda]{padding-right:28px}.graf{height:260px}.tab-filtros label{flex:1 1 140px}.tab-filtros select{min-width:0;width:100%}.anun-cab .est{margin-left:0}.anun{padding:16px 14px}}
@media (prefers-reduced-motion:reduce){a.cel,.cifra[data-ayuda]{transition:none}a.cel:hover{transform:none}}`;

// Navegador del panel: ventanas de ayuda (cursor, foco y toque), filtros que se aplican solos y gráficos con los colores del tema.
const TABLERO_JS = String.raw`(function(){
var tip=document.createElement('div');tip.className='ayuda-flot';tip.id='ayuda-flot';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
var act=null,fijo=false;
function poner(el){var r=el.getBoundingClientRect(),w=Math.min(340,innerWidth-16);tip.style.maxWidth=w+'px';tip.style.left='0px';tip.style.top='0px';var tw=tip.offsetWidth,th=tip.offsetHeight;
var x=Math.min(Math.max(8,r.left+r.width/2-tw/2),innerWidth-tw-8),y=r.bottom+8;if(y+th>innerHeight-8&&r.top-th-8>8)y=r.top-th-8;tip.style.left=(x+scrollX)+'px';tip.style.top=(y+scrollY)+'px'}
function mostrar(el){if(act&&act!==el)act.removeAttribute('aria-describedby');act=el;tip.textContent=el.getAttribute('data-ayuda');tip.hidden=false;el.setAttribute('aria-describedby','ayuda-flot');poner(el)}
function ocultar(){if(act)act.removeAttribute('aria-describedby');act=null;fijo=false;tip.hidden=true}
document.querySelectorAll('[data-ayuda]').forEach(function(el){
el.addEventListener('mouseenter',function(){if(!fijo)mostrar(el)});el.addEventListener('mouseleave',function(){if(!fijo&&act===el)ocultar()});
el.addEventListener('focus',function(){mostrar(el)});el.addEventListener('blur',function(){if(act===el)ocultar()});
el.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a,button'))return;if(act===el&&fijo){ocultar()}else{mostrar(el);fijo=true}e.stopPropagation()})});
document.addEventListener('click',function(){if(fijo)ocultar()});document.addEventListener('keydown',function(e){if(e.key==='Escape')ocultar()});
addEventListener('scroll',function(){if(act)poner(act)},{passive:true});addEventListener('resize',function(){if(act)poner(act)});
var fa=document.querySelector('.tab-filtros');if(fa){var an=fa.querySelector('[name=anio]'),me=fa.querySelector('[name=mes]');
fa.querySelectorAll('select').forEach(function(s){s.addEventListener('change',function(){if(s===an){me.disabled=!an.value;if(!an.value)me.value=''}fa.submit()})})}
var nodo=document.getElementById('tablero-datos');if(!nodo)return;var D;try{D=JSON.parse(nodo.textContent)}catch(e){return}
var nf=new Intl.NumberFormat('es-CL'),nf1=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1});
function C(){var s=getComputedStyle(document.documentElement),v=function(n){return s.getPropertyValue(n).trim()};return{t:v('--tinta'),t2:v('--tinta2'),o:v('--oro'),g:v('--gris'),l:v('--linea'),c:v('--card'),ve:v('--verde'),r:v('--rojo')}}
function suma(a){var t=0;for(var i=0;i<a.length;i++)t+=a[i]||0;return t}
function base(c,o){var b={animationDuration:450,textStyle:{color:c.g,fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'},
tooltip:{confine:true,backgroundColor:c.c,borderColor:c.l,textStyle:{color:c.t,fontSize:13},extraCssText:'border-radius:10px;box-shadow:0 10px 26px -12px rgba(0,0,0,.4)'},grid:{left:6,right:16,top:26,bottom:6,containLabel:true}};
for(var k in o){if(k==='tooltip'){for(var j in o.tooltip)b.tooltip[j]=o.tooltip[j]}else b[k]=o[k]}return b}
function cat(c,d,x){var a={type:'category',data:d,axisLine:{lineStyle:{color:c.l}},axisTick:{show:false},axisLabel:{color:c.g,fontSize:12}};for(var k in x||{})a[k]=x[k];return a}
function val(c,x){var a={type:'value',splitLine:{lineStyle:{color:c.l,type:'dashed'}},axisLabel:{color:c.g,fontSize:12,formatter:function(v){return nf.format(v)}}};for(var k in x||{})a[k]=x[k];return a}
function leyenda(c){return{bottom:0,icon:'roundRect',itemWidth:12,itemHeight:12,textStyle:{color:c.g,fontSize:12.5}}}
function horiz(c,filas,nombre,color,fmt){if(!filas.length||!suma(filas.map(function(f){return f[1]})))return null;var f=filas.slice().reverse();
return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:fmt||function(v){return nf.format(v)}},grid:{left:6,right:56,top:6,bottom:6,containLabel:true},
xAxis:val(c,{minInterval:1,splitNumber:3}),yAxis:cat(c,f.map(function(x){return x[0]}),{axisLabel:{color:c.t,fontSize:12.5,width:170,overflow:'truncate'}}),
series:[{name:nombre,type:'bar',data:f.map(function(x){return x[1]}),barMaxWidth:20,itemStyle:{color:color,borderRadius:[0,5,5,0]},label:{show:true,position:'right',color:c.g,fontSize:12,formatter:function(p){return fmt?fmt(p.value):nf.format(p.value)}}}]})}
function dona(c,filas,u){var tot=suma(filas.map(function(f){return f[1]}));if(!filas.length||!tot)return null;var pc={};filas.forEach(function(f){pc[f[0]]=nf1.format(f[1]/tot*100)+' %'});
var lg=leyenda(c);lg.formatter=function(n){return n+'  '+pc[n]};lg.orient='vertical';lg.left='center';
return base(c,{color:[c.t,c.o,c.ve,'#7C8DA6',c.r,'#A77BCA','#5AA9C9'],tooltip:{trigger:'item',formatter:function(p){return p.marker+p.name+'<br><b>'+nf.format(p.value)+'</b> '+u+' ('+nf1.format(p.percent)+' %)'}},legend:lg,
series:[{type:'pie',radius:['38%','60%'],center:['50%',filas.length>3?'32%':'38%'],itemStyle:{borderColor:c.c,borderWidth:2},label:{show:false},labelLine:{show:false},data:filas.map(function(x){return{name:x[0],value:x[1]}})}]})}
var G={
tendencia:function(c){var T=D.ten;if(!suma(T.pv)&&!suma(T.dv)&&!suma(T.su))return null;var mes=D.agrupar==='mes',P={};(T.parcial||[]).forEach(function(i){P[i]=1});
return base(c,{legend:leyenda(c),grid:{left:6,right:16,top:26,bottom:36,containLabel:true},tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var i=ps[0].dataIndex,h='<b>'+T.x[i]+'</b>'+(P[i]?' <span style="opacity:.7">(día parcial)</span>':'');
ps.forEach(function(p){h+='<br>'+p.marker+p.seriesName+': <b>'+(p.value===null||p.value===undefined?'sin medir':nf.format(p.value))+'</b>'});return h}},
xAxis:cat(c,T.x,{axisLabel:{color:c.g,fontSize:12,hideOverlap:true}}),yAxis:val(c,{minInterval:1}),
series:[{name:'Visitas a la portada',type:'bar',stack:'v',data:T.pv,barMaxWidth:30,itemStyle:{color:c.t}},{name:'Visitas al diario',type:'bar',stack:'v',data:T.dv,barMaxWidth:30,itemStyle:{color:c.o,borderRadius:[4,4,0,0]}},
{name:mes?'Personas distintas por día (promedio)':'Personas distintas en el sitio',type:'line',data:T.su,smooth:true,symbol:'circle',symbolSize:7,lineStyle:{width:2.5,color:c.ve},itemStyle:{color:c.ve},z:5}]})},
horas:function(c){if(!D.totDims)return null;var mx=Math.max.apply(null,D.horas),x=[];for(var i=0;i<24;i++)x.push((i<10?'0':'')+i+':00');
return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var i=ps[0].dataIndex;return '<b>'+x[i]+' a '+x[(i+1)%24]+'</b><br>'+nf.format(ps[0].value)+' visitas'}},xAxis:cat(c,x,{axisLabel:{color:c.g,fontSize:11.5,interval:2,formatter:function(v){return Number(v.slice(0,2))+' h'}}}),yAxis:val(c,{minInterval:1}),
series:[{type:'bar',data:D.horas.map(function(v){return{value:v,itemStyle:{color:v===mx&&v>0?c.o:c.t2,borderRadius:[4,4,0,0]}}}),barMaxWidth:18}]})},
semana:function(c){if(!D.diasSemana||!suma(D.semana))return null;var mx=Math.max.apply(null,D.semana.map(function(v){return v||0}));return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:function(v){return v===null||v===undefined?'sin datos':nf.format(v)+' personas al día'}},
xAxis:cat(c,D.dsem),yAxis:val(c,{minInterval:1}),series:[{name:'Promedio',type:'bar',barMaxWidth:34,data:D.semana.map(function(v){return{value:v,itemStyle:{color:v===mx&&v>0?c.o:c.t2,borderRadius:[5,5,0,0]}}})}]})},
origen:function(c){return dona(c,D.origen,'visitas')},disp:function(c){return dona(c,D.disp,'visitas')},
paises:function(c){return horiz(c,D.paises,'Visitantes',c.t2)},sitios:function(c){return horiz(c,D.sitios,'Visitas',c.t2)},
secciones:function(c){if(!D.secciones.length)return null;var f=D.secciones.slice().reverse();return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var r=f[ps[0].dataIndex];return '<b>'+r[1]+'</b><br>'+nf1.format(r[2])+' min de lectura<br>'+nf.format(r[3])+' lecturas<br><span style="opacity:.7">Toca para filtrar por esta sección</span>'}},
grid:{left:6,right:70,top:6,bottom:6,containLabel:true},xAxis:val(c,{splitNumber:3}),yAxis:cat(c,f.map(function(r){return r[1]}),{axisLabel:{color:c.t,fontSize:12.5}}),
series:[{type:'bar',barMaxWidth:18,cursor:'pointer',data:f.map(function(r){return{value:r[2],itemStyle:{color:D.sel?(r[0]===D.sel?c.o:c.l):c.o,borderRadius:[0,5,5,0]}}}),label:{show:true,position:'right',color:c.g,fontSize:12,formatter:function(p){return (p.value>=100?nf.format(Math.round(p.value)):nf1.format(p.value))+' min'}}}]})},
secdia:function(c){var S=D.secDia;if(!suma(S.min))return null;return base(c,{legend:leyenda(c),grid:{left:6,right:16,top:26,bottom:36,containLabel:true},tooltip:{trigger:'axis'},xAxis:cat(c,S.x,{axisLabel:{color:c.g,fontSize:12,hideOverlap:true}}),
yAxis:[val(c),val(c,{splitLine:{show:false},minInterval:1})],series:[{name:'Minutos de lectura',type:'bar',data:S.min,barMaxWidth:26,itemStyle:{color:c.o,borderRadius:[4,4,0,0]}},{name:'Lecturas',type:'line',yAxisIndex:1,data:S.v,smooth:true,symbol:'circle',symbolSize:6,lineStyle:{color:c.t2,width:2},itemStyle:{color:c.t2}}]})},
ediciones:function(c){return horiz(c,D.ediciones,D.edTipo==='min'?'Minutos':'Lectores',c.o,D.edTipo==='min'?function(v){return nf1.format(v)+' min'}:null)},
clics:function(c){if(!D.clics.length)return null;var f=D.clics.slice().reverse();return base(c,{legend:leyenda(c),grid:{left:6,right:40,top:6,bottom:36,containLabel:true},tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},xAxis:val(c,{minInterval:1,splitNumber:3}),
yAxis:cat(c,f.map(function(r){return r[0]}),{axisLabel:{color:c.t,fontSize:12.5,width:170,overflow:'truncate'}}),series:[{name:'Clics',type:'bar',barMaxWidth:16,data:f.map(function(r){return r[1]}),itemStyle:{color:c.o,borderRadius:[0,5,5,0]}},{name:'Personas distintas',type:'bar',barMaxWidth:16,data:f.map(function(r){return r[2]}),itemStyle:{color:c.t2,borderRadius:[0,5,5,0]}}]})}};
function irSeccion(p){var f=D.secciones.slice().reverse(),r=f[p.dataIndex];if(!r)return;var q=new URLSearchParams(location.search);q.delete('anuncios');if(D.sel===r[0])q.delete('seccion');else q.set('seccion',r[0]);location.href='/panel'+(q.toString()?'?'+q.toString():'')+'#lectura'}
function pintar(){if(!window.echarts){document.querySelectorAll('.graf').forEach(function(g){if(!g.firstChild)g.innerHTML='<p class="aviso">No se pudo cargar la librería de gráficos. Recarga la página.</p>'});return}
var c=C();Object.keys(G).forEach(function(k){var g=document.getElementById('g-'+k);if(!g)return;var o=null;try{o=G[k](c)}catch(e){o=null}var ch=echarts.getInstanceByDom(g);
if(!o){if(ch)ch.dispose();g.innerHTML='<p class="aviso">'+(g.getAttribute('data-vacio')||'Sin datos en este período.')+'</p>';g.removeAttribute('role');g.style.height='auto';return}
if(!ch){g.innerHTML='';ch=echarts.init(g,null,{renderer:'svg'});if(k==='secciones')ch.on('click',irSeccion)}ch.setOption(o,true)})}
function inicio(){pintar();new MutationObserver(function(){setTimeout(pintar,40)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
if(window.matchMedia){var mq=matchMedia('(prefers-color-scheme: dark)');if(mq.addEventListener)mq.addEventListener('change',pintar)}
var rz;addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){if(!window.echarts)return;document.querySelectorAll('.graf').forEach(function(g){var ch=echarts.getInstanceByDom(g);if(ch)ch.resize()})},120)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicio);else inicio()})();`;


// 13-11-2026 · carrusel de marcas auspiciadoras (pie de página). Se detiene con el mouse o el foco y queda quieto con «reducir movimiento».
function bloqueMarcas() {
  // 16-11-2026: primero los avisos pagados vigentes (registro del Panel, ver modulos/tablero.js) y después las marcas propias, que no
  // vencen. Los enlaces pasan por /ir/… para contar los clics.
  const ms = avisosCarrusel().concat(((MARCAS && MARCAS.marcas) || []).map((m) => (m.url ? { ...m, ir: `/ir/${slugMarca(m)}?o=portada` } : m)));
  if (!ms.length) return "";
  const uno = (m, oculto) => {
    const est = `style="--mf:${/^#[0-9A-Fa-f]{6}$/.test(m.fondo || "") ? m.fondo : "#FFFFFF"};--mc:${/^#[0-9A-Fa-f]{6}$/.test(m.color || "") ? m.color : "#0B1F3A"}"`;
    const src = m.src || (m.logo ? `/marcas/${m.logo}` : "");
    const dentro = `${src ? `<img src="${esc(src)}" alt="${oculto ? "" : esc(m.nombre)}" loading="lazy" decoding="async">` : ""}${m.texto ? `<span data-no-tr>${esc(m.texto)}</span>` : ""}`;
    const ext = oculto ? ' aria-hidden="true" tabindex="-1"' : "";
    return m.ir || m.url
      ? `<a class="marca-a" ${est} href="${esc(m.ir || urlSegura(m.url))}" target="_blank" rel="noopener"${ext}>${dentro}</a>`
      : `<button type="button" class="marca-a pub-abrir" ${est} data-interes="${esc(m.nombre)}"${ext}>${dentro}</button>`;
  };
  let lista = ms;
  while (lista.length < 6) lista = lista.concat(ms);   // con pocas marcas, la cinta igual llena el ancho
  return `<div class="hoja marcas" aria-label="Marcas que nos auspician"><h4>Marcas que nos auspician</h4><div class="cinta"><div class="pista">${lista.map((m, i) => uno(m, i >= ms.length)).join("")}${lista.map((m) => uno(m, true)).join("")}</div></div></div>`;
}

function marco({ titulo, descripcion, cuerpo, canonica, hero = "" }) {
  return `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descripcion)}"><link rel="canonical" href="https://${DOMINIO}${canonica || "/"}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:type" content="website">
<meta property="og:url" content="https://${DOMINIO}${canonica || "/"}"><meta property="og:locale" content="es_CL"><meta name="theme-color" content="#0B1F3A">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="preload" href="/f/cormorant-garamond-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/f/cormorant-garamond-latin-600-italic.woff2" as="font" type="font/woff2" crossorigin><style>${FUENTES}${CSS}</style></head><body>
<header class="cab"><div class="hoja"><a class="marca" href="/" aria-label="Cofrade News, portada"><img class="l-claro" src="${LOGO_CLARO}" alt="" width="52" height="52"><img class="l-oscuro" src="${LOGO_OSCURO}" alt="" width="52" height="52"><b>Cofrade News</b></a>
<span class="fecha" data-iso="${fechaChile()}">${esc(fechaLarga(fechaChile()))}</span>
<nav aria-label="Secciones"><a href="/edicion">Edición de hoy</a><button type="button" class="nav-b buzon-abrir" aria-haspopup="dialog"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/></svg>Buzón</button><a href="/mercados">Mercados</a><a href="/#archivo">Archivo</a><a href="/socios">Socios</a><a href="/#publicite">Publicite</a></nav>
<div class="herr"><button class="tema idioma" id="idioma" type="button" lang="en" aria-pressed="false" aria-label="Read in English" title="English">EN</button><button class="tema" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></div></div></header>
${hero}<main class="hoja">${cuerpo}</main>
${bloqueMarcas()}${DIALOGO}${BUZON}
<footer class="hoja pie"><img class="pie-agua" src="/marca-agua.webp" alt="" aria-hidden="true">Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.<br>
Medimos las visitas sin cookies y sin datos personales. ¿Una idea para mejorar? <button type="button" class="enlace buzon-abrir">Escríbenos al Buzón</button>.<br>
© ${fechaChile().slice(0, 4)} <span>Cofrade News. Todos los derechos reservados.</span></footer><script>window.__EN=${JSON.stringify(EN_FIJO).replace(/</g, "\\u003c")};${SCRIPT}${BUZON_JS}${CABECERA_JS}</script>
<script type="speculationrules">{"prerender":[{"where":{"or":[{"href_matches":"/edicion"},{"href_matches":"/edicion/*"}]},"eagerness":"moderate"}]}</script></body></html>`;
}

const SECCIONES = ["Crecimiento de Chile", "Economía y mercados", "Política y Congreso", "Conflictos en el mundo", "Perspectivas 2050",
  "Ciencia y Astronomía", "Deportes", "Clima, mar y sismos", "Vuelos comerciales", "Entretenimiento", "Fondos y subsidios", "Efemérides"];

// 13-11-2026 · dibujos de cada sección (trazo dorado, 44 px)
const ICONO = {
  crecimiento: '<path d="M6 34 16 24l7 6 15-17"/><path d="M31 13h7v7"/><path d="M6 40h34"/>',
  economia: '<path d="M10 10v26M22 6v32M34 14v20"/><rect x="7" y="16" width="6" height="12" rx="1"/><rect x="19" y="12" width="6" height="16" rx="1"/><rect x="31" y="18" width="6" height="9" rx="1"/>',
  congreso: '<path d="M6 34a17 17 0 0 1 34 0"/><path d="M12 34a11 11 0 0 1 22 0"/><path d="M4 38h38"/><circle cx="23" cy="13" r="2"/>',
  conflictos: '<circle cx="23" cy="23" r="16"/><path d="M7 23h32M23 7c-6 5-6 27 0 32M23 7c6 5 6 27 0 32"/><path d="M31 15l3-3"/>',
  perspectivas: '<path d="M6 38V22h8v16M18 38V12h10v26M32 38V26h8v12"/><path d="M4 38h38M23 12V6l9 4"/>',
  ciencia: '<ellipse cx="23" cy="23" rx="17" ry="7" transform="rotate(-25 23 23)"/><circle cx="23" cy="23" r="5"/><circle cx="37" cy="15" r="2"/>',
  deportes: '<circle cx="23" cy="23" r="15"/><path d="M23 8v30M8 23h30M12 12c6 4 6 18 0 22M34 12c-6 4-6 18 0 22"/>',
  clima: '<path d="M4 18c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/><path d="M4 27c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/><path d="M4 36c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/>',
  vuelos: '<path d="M6 34c10-16 22-22 34-24"/><path d="M33 7l7 3-3 7"/><circle cx="8" cy="34" r="2"/>',
  entretenimiento: '<rect x="6" y="11" width="34" height="24" rx="3"/><path d="M6 17h34M6 29h34M13 11v24M33 11v24"/>',
  fondos: '<ellipse cx="23" cy="12" rx="12" ry="4"/><path d="M11 12v8c0 2 5 4 12 4s12-2 12-4v-8M11 20v8c0 2 5 4 12 4s12-2 12-4v-8M11 28v6c0 2 5 4 12 4s12-2 12-4v-6"/>',
  efemerides: '<circle cx="23" cy="9" r="3"/><path d="M23 12v26M15 18h16M9 28c0 6 6 10 14 10s14-4 14-10"/><path d="M9 28l-3 3M37 28l3 3"/>',
};
const icono = (n) => `<svg viewBox="0 0 46 46" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO[n] || ""}</svg>`;
const SECCIONES_LUJO = [
  ["crecimiento", "Crecimiento de Chile", "El Imacec del mes, la proyección del año y cuánto avanza cada gobierno a igual período."],
  ["economia", "Economía y mercados", "Dólar, UF, IPSA, Wall Street, cobre y petróleo, con su fuente y su hora."],
  ["congreso", "Política y Congreso", "Cada votación de la Sala con el voto de cada diputado y senador, y cómo votan las bancadas."],
  ["conflictos", "Conflictos en el mundo", "Mapas, cifras oficiales de refugiados y su efecto en los precios que pagas."],
  ["perspectivas", "Perspectivas 2050", "Los megaproyectos que cambiarán Chile: inversión, etapa y año de término."],
  ["ciencia", "Ciencia y Astronomía", "Descubrimientos de la semana y el cielo de esta noche, explicados en simple."],
  ["deportes", "Deportes", "Tablas con proyección, fútbol, tenis, golf, Fórmula 1, NBA y equitación."],
  ["clima", "Clima, mar y sismos", "El tiempo de 9 ciudades, oleaje y mareas de los puertos, y los sismos del día."],
  ["vuelos", "Vuelos comerciales", "Salidas y llegadas confirmadas en los cinco aeropuertos principales."],
  ["entretenimiento", "Entretenimiento", "Panoramas, estrenos y lo que no te puedes perder esta semana."],
  ["fondos", "Fondos y subsidios", "Fondos concursables abiertos, con su plazo y el enlace para postular."],
  ["efemerides", "Efemérides", "La historia naval y de Chile que se recuerda hoy."],
];

// Gráfico lineal mínimo (SVG) para la pizarra de la portada: área dorada y línea, sin bibliotecas.
function spark(datos, w = 150, h = 46) {
  const v = (datos || []).map((d) => Number(d[1])).filter((x) => isFinite(x));
  if (v.length < 2) return "";
  const min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
  const pts = v.map((y, i) => [((i / (v.length - 1)) * (w - 2) + 1).toFixed(1), (h - 3 - ((y - min) / r) * (h - 8)).toFixed(1)]);
  const linea = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join("");
  const id = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6C77A" stop-opacity=".38"/><stop offset="1" stop-color="#E6C77A" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="${linea}L${w - 1} ${h}L1 ${h}Z" fill="url(#${id})"/><path d="${linea}" fill="none" stroke="#E6C77A" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

async function historia(ctx) {
  try {
    const r = await desdeGitHub("datos/historia.json", 3600, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}

function pizarra(h, p) {
  const S = (h && h.series) || {};
  const fila = (clave, titulo, pre, dec, dias = 365) => {
    const s = S[clave];
    if (!s || !s.datos || s.datos.length < 2) return "";
    const datos = s.datos.slice(-Math.min(s.datos.length, Math.round(dias * 0.7)));   // ~250 días hábiles
    const ult = datos[datos.length - 1], ant = s.datos[Math.max(0, s.datos.length - 22)];
    const varp = ant && ant[1] ? ((ult[1] / ant[1]) - 1) * 100 : null;
    return `<div class="piz-fila"><div><small><span>${esc(titulo)}</span> <span class="nw">· ${esc(ult[0].split("-").reverse().join("-"))}</span></small><b>${esc(pre)}${num(ult[1], dec)}</b>`
      + `${varp !== null ? `<span class="var ${varp > 0 ? "sube" : varp < 0 ? "baja" : ""}">${varp > 0 ? "+" : varp < 0 ? "−" : ""}${num(Math.abs(varp), 1)} % en un mes</span>` : ""}</div>${spark(datos)}</div>`;
  };
  const filas = fila("dolar", "Dólar observado", "$", 2) + fila("cobre", "Cobre, US$ por libra", "US$", 2) + fila("uf", "Unidad de Fomento", "$", 2);
  if (!filas) return "";
  const tpm = S.tpm && S.tpm.datos && S.tpm.datos.length ? S.tpm.datos[S.tpm.datos.length - 1][1] : null;
  return `<aside class="pizarra" aria-label="Pizarra del Banco Central"><div class="piz-cab">Pizarra del día <span>últimos 12 meses</span></div>${filas}`
    + `${tpm !== null ? `<div class="piz-fila"><div><small>Tasa de Política Monetaria</small><b>${num(tpm, 2)} %</b></div><svg viewBox="0 0 150 46" aria-hidden="true"></svg></div>` : ""}`
    + `<div class="piz-pie">Fuente: Banco Central de Chile, Base de Datos Estadísticos.</div></aside>`;
}

function bloqueCifras(p) {
  if (!p) return "";
  const c = [];
  for (const x of p.indicadores || []) {
    c.push(`<div class="cifra"><small>${esc(x.nombre)}</small><b>${esc(x.prefijo || "")}${num(x.valor, x.decimales ?? 2)}</b></div>`);
  }
  if (p.ipsa) c.push(`<div class="cifra"><small>IPSA (puntos)</small><b>${num(p.ipsa.valor, 2)}</b>${pct(p.ipsa.variacion_pct)}</div>`);
  const hayCobre = (p.indicadores || []).some((x) => x.clave === "libra_cobre");
  for (const m of (p.mercados || []).filter((m) => !(hayCobre && /^cobre/i.test(m.nombre || ""))).slice(0, 6)) {
    c.push(`<div class="cifra"><small>${esc(m.nombre)} · cierre ${esc((m.fecha || "").split("-").reverse().slice(0, 2).join("-"))}</small><b>${num(m.valor, 2)}</b>${pct(m.variacion_pct)}</div>`);
  }
  if (p.bitcoin && p.bitcoin.bitcoin_usd) c.push(`<div class="cifra"><small>Bitcoin</small><b>US$${num(p.bitcoin.bitcoin_usd, 0)}</b></div>`);
  return c.length ? `<div class="cifras">${c.join("")}</div>` : "";
}

function bloqueTitulares(p) {
  const s = (p && p.titulares) || [];
  if (!s.length) return `<p class="aviso">Los titulares de las últimas horas aparecen aquí en la próxima actualización.</p>`;
  return `<div class="dos">${s.map((x) => `<div class="tarjeta titulares"><h4>${esc(x.seccion)}</h4><ol>${x.notas
    .map((n) => `<li><a href="${esc(urlSegura(n.url))}" target="_blank" rel="noopener">${esc(n.titulo)}</a> <span class="m">· ${esc(n.medio)}${n.hora ? " · " + esc(n.hora) : ""}</span></li>`)
    .join("")}</ol></div>`).join("")}</div>`;
}

function bloqueTierra(p) {
  const out = [];
  const s = p && p.sismos;
  if (s && s.mayores && s.mayores.length) {
    const m = s.mayores[0];
    out.push(`<div class="cifra"><small>Sismo mayor 24 h · ${s.n} sobre M 2,5</small><b>M ${num(m.magnitud, 1)}</b><br><small>${esc(m.referencia)} · ${esc((m.hora || "").slice(11, 16))}</small><a href="${esc(s.url)}" target="_blank" rel="noopener">USGS ↗</a></div>`);
  }
  const a = p && p.aire && p.aire.ciudades;
  for (const x of (a || []).slice(0, 5)) {
    out.push(`<div class="cifra"><small>Aire · ${esc(x.ciudad)}</small><b>${esc(x.estado || "")}</b><br><small>ICA ${esc(x.aqi)} · ${esc(x.hora || "")}</small><a href="${esc(urlSegura(x.url))}" target="_blank" rel="noopener">fuente ↗</a></div>`);
  }
  return out.length ? `<div class="cifras" style="margin-top:12px">${out.join("")}</div>` : "";
}

async function cuerpoPortada(ctx) {
  const [lista, p, h] = await Promise.all([indice(ctx), pulso(ctx), historia(ctx)]);   // 15-11-2026: los tres a la vez
  const ultima = lista[0];
  const hoy = fechaChile();
  const estado = !ultima ? "La primera edición web aparece mañana a las 07:30."
    : ultima === hoy ? "La edición de hoy ya está publicada." : "La edición de hoy se publica a las 07:30. Mientras, lee la última.";
  const hora = p && p.generado ? String(p.generado).slice(11, 16) : "";
  const piz = pizarra(h, p);
  const hero = `<section class="lujo" aria-label="Portada"><img class="agua" src="/marca-agua.webp" alt="" aria-hidden="true">
<div class="hoja lujo-in"><div class="lujo-txt"><span class="kicker">El diario de la mañana · Gratuito</span>
<h1>Chile y el mundo, ordenados en minutos y con <em>datos verificados.</em></h1>
<p class="lede">Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.</p>
<div class="acciones"><a class="btn oro" href="/edicion">Leer la edición${ultima === hoy ? " de hoy" : ""} →</a><a class="btn claro" href="#puente">Dashboard Financiero</a><a class="btn claro" href="/mercados">Mercados en vivo</a></div>
<ul class="sellos"><li>${ultima ? (ultima === hoy ? "Edición de hoy publicada" : "Última edición: " + esc(fechaLarga(ultima))) : "Primera edición muy pronto"}</li><li>Cada dato con su fuente</li><li>Hecho en Chile</li></ul></div>
${piz || `<aside class="pizarra"><div class="piz-cab">Hoy · <span data-iso="${hoy}">${esc(fechaLarga(hoy))}</span></div><p style="margin:6px 0 0;color:#D8D2C4">${esc(estado)}</p></aside>`}</div></section>`;
  const cuerpo = `
<section aria-labelledby="t-secc" style="border:0;padding-top:40px"><span class="kicker">${ultima ? (ultima === hoy ? "Hoy · " : "Última edición · ") : ""}<span data-iso="${ultima || hoy}">${esc(fechaLarga(ultima || hoy))}</span></span>
<h2 class="titulo-lujo" id="t-secc">${esc(estado)}</h2><p class="sub">Doce secciones, cada mañana, con la fuente de cada dato.</p>
<div class="secc">${SECCIONES_LUJO.map(([ic, t, d]) => `<a class="sec-card" href="/edicion" style="text-decoration:none">${icono(ic)}<div><b>${esc(t)}</b><p>${esc(d)}</p></div></a>`).join("")}</div></section>
<section id="en-vivo" aria-labelledby="t-vivo"><h3 id="t-vivo"><span class="vivo">En vivo</span></h3>
<p class="sub">${hora ? `Actualizado a las ${esc(hora)}${p.proxima ? ` · próxima actualización ${esc(p.proxima)}` : ""}.` : "Se actualiza cada 2 horas, de 07:00 a 23:00."} Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.</p>
${bloqueCifras(p)}${bloqueTierra(p)}${bloqueTitulares(p)}</section>
<section aria-labelledby="t-gal"><h2 class="titulo-lujo" id="t-gal">Así se ve por dentro</h2><p class="sub">Algunos de los gráficos de la edición, tal como los recibes cada mañana.</p>
<div class="galeria">
<div class="g-fila"><figure style="--r:2.347"><img src="/capturas/indicadores.webp" alt="Gráfico del dólar en los últimos dos meses" loading="lazy" width="1000" height="426"><figcaption><b>Indicadores y monedas</b>El dólar día a día, con la UF, el euro y el yuan.</figcaption></figure><figure style="--r:1.086"><img src="/capturas/mercados.webp" alt="Variación diaria de los mercados" loading="lazy" width="962" height="886"><figcaption><b>Mercados</b>Wall Street, cobre, petróleo, IPSA y bolsas de Europa.</figcaption></figure></div>
<div class="g-fila"><figure style="--r:1.387;--f:#FBF8F2"><img src="/capturas/perspectivas-2050.webp" alt="Inversión en megaproyectos por sector" loading="lazy" width="1000" height="721"><figcaption><b>Perspectivas 2050</b>Inversión en megaproyectos por sector.</figcaption></figure><figure style="--r:2.725;--f:#FBF8F2"><img src="/capturas/estrecho.webp" alt="Mapa del Estrecho de Magallanes" loading="lazy" width="1000" height="367"><figcaption><b>Mar y navegación</b>Oleaje, mareas y el paso por el Estrecho de Magallanes.</figcaption></figure></div>
<div class="g-fila"><figure style="--r:0.564"><img src="/capturas/industrias.webp" alt="Mapa de Chile por industria" loading="lazy" width="700" height="1242"><figcaption><b>Industrias de Chile</b>Qué produce cada región.</figcaption></figure><figure style="--r:3.135"><img src="/capturas/gobiernos.webp" alt="Indicadores económicos por gobierno" loading="lazy" width="1000" height="319"><figcaption><b>Avances por gobierno</b>Crecimiento, inflación, desempleo y deuda.</figcaption></figure></div>
</div></section>
<section id="puente" style="border:0;padding:0"><div class="puente"><img class="agua" src="/marca-agua.webp" alt="" aria-hidden="true">
<span class="kicker">Para socios · Muy pronto</span><h2>Puente de Mando · Dashboard Financiero</h2>
<p class="lede">Para quienes toman decisiones: bolsa chilena y extranjera, ETF, cripto y blockchain, el dinero que entra y sale de Chile, y el radar político y regulatorio que mueve los mercados. Todo en un solo lugar, explicado en simple.</p>
<div class="pilares">
<div class="pilar"><b>Mercados</b><span>IPSA, Wall Street, Europa y Asia, bonos, cobre, oro y petróleo.</span></div>
<div class="pilar"><b>ETF y cripto</b><span>Los fondos que más se transan, Bitcoin, Ethereum y el ánimo del mercado cripto.</span></div>
<div class="pilar"><b>Dinero en movimiento</b><span>Qué compran y venden las AFP, los fondos mutuos y los inversionistas extranjeros.</span></div>
<div class="pilar"><b>Radar político</b><span>Las leyes y normas que se votan y a qué sectores afectan.</span></div>
<div class="pilar"><b>Calendario</b><span>Reuniones del Banco Central, de la Reserva Federal y los datos que vienen.</span></div>
<div class="pilar"><b>Herramientas</b><span>Conversor UF, dólar y euro, calculadora de IPC, interés compuesto y crédito hipotecario.</span></div>
</div>
<div class="precio-lujo"><span class="monto">$5.000 <small>al mes</small></span><span class="extra">7 días gratis · Plan anual $55.000 (un mes de regalo) · Socios de la Cofradía con precio preferente</span><span class="extra">Socios fundadores: te inscribes hoy y el primer cobro llega el 1 de diciembre de 2026.</span></div>
<div class="acciones"><a class="btn oro" href="/socios/fundador">Quiero ser socio fundador</a><a class="btn claro" href="/mercados">Ver mercados en vivo</a></div>
<p class="legal">Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta, y no considera tu situación personal.</p></div></section>
<section id="archivo" aria-labelledby="t-arch"><h3 id="t-arch">Archivo</h3><p class="sub">Las 12 ediciones publicadas más recientes.</p>
${lista.length ? `<div class="archivo" id="archivoLista">${lista.map((f, i) => `<a href="/edicion/${f}" data-iso="${f}"${i >= MAX_ARCHIVO ? " hidden" : ""}>${esc(fechaLarga(f))}</a>`).join("")}</div>${archivoMas(lista.length)}` : `<p class="aviso">El archivo empieza con la próxima edición.</p>`}</section>
<section id="socios" aria-labelledby="t-soc"><div class="socios"><div><h3 id="t-soc">Área de socios</h3>
<p class="sub">Informes financieros, análisis de mercado y contenidos exclusivos para socios.</p><a class="btn linea" href="/socios">Ingresar</a></div>
<div class="tarjeta" id="publicite"><span class="kicker">Publicite aquí</span><p style="margin:8px 0 6px">Su marca cada mañana frente a lectores que deciden.</p>
<div class="precio">UF 1 <small style="font-size:15px;color:var(--gris)">al mes</small></div><div class="acciones" style="margin-top:14px"><button type="button" class="btn oro pub-abrir" data-interes="Cofrade News" aria-haspopup="dialog">Quiero publicitar</button></div></div></div></section>`;
  return { cuerpo, p, hero };
}

async function portada(env, ctx, req) {
  const [{ cuerpo, hero, p }] = await Promise.all([cuerpoPortada(ctx), prepararAnuncios(env)]);
  ctx.waitUntil(revisarRenovaciones(env, ctx));   // 16-11-2026: correos de renovación de los anunciantes (como mucho 1 revisión por hora)
  ctx.waitUntil(revivirPulso(env, p));
  // 15-11-2026: el vigía corre cada 3 horas; su propia visita reinicia el reloj y la de un lector lo despierta si GitHub se atrasó
  ctx.waitUntil(/CofradeNews-Vigia/.test((req && req.headers.get("User-Agent")) || "") ? marcarVigia(env) : revivirVigia(env));
  return html(marco({ titulo: "Cofrade News · El diario de la mañana", descripcion: "Chile y el mundo cada mañana: economía, política y Congreso, conflictos, ciencia, deportes, clima y vuelos, con datos verificados. Gratuito.", cuerpo, hero }), 200,
    { "Cache-Control": "public, max-age=120" });
}

// 13-11-2026 · /mercados: widgets oficiales de TradingView (gratis para sitios web, con su atribución visible). Datos con el desfase
// que exigen las bolsas. Solo esta página los carga (su propia política de seguridad).
function tv(tipo, cfg, alto) {
  return `<div class="tradingview-widget-container" style="height:${alto}px"><div class="tradingview-widget-container__widget" style="height:calc(100% - 32px)"></div>`
    + `<div class="tradingview-widget-copyright"><a href="https://es.tradingview.com/" rel="noopener nofollow" target="_blank">Gráficos de TradingView</a></div>`
    + `<script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-${tipo}.js" async>${JSON.stringify({ locale: "es", colorTheme: "light", isTransparent: true, ...cfg })}<\/script></div>`;
}
function paginaMercados() {
  const cinta = tv("ticker-tape", { symbols: [
    { proName: "FX_IDC:USDCLP", title: "Dólar / peso" }, { proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
    { proName: "FOREXCOM:DJI", title: "Dow Jones" }, { proName: "COMEX:HG1!", title: "Cobre" }, { proName: "TVC:GOLD", title: "Oro" }, { proName: "TVC:UKOIL", title: "Petróleo Brent" },
    { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" }, { proName: "BITSTAMP:ETHUSD", title: "Ethereum" }, { proName: "FX:EURUSD", title: "Euro / dólar" } ],
    showSymbolLogo: true, displayMode: "adaptive" }, 78);
  const resumen = tv("market-overview", { dateRange: "12M", showChart: true, width: "100%", height: "100%", tabs: [
    { title: "Índices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow Jones" }, { s: "INDEX:NKY", d: "Nikkei 225" }, { s: "INDEX:DEU40", d: "DAX" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }] },
    { title: "Materias primas", symbols: [{ s: "COMEX:HG1!", d: "Cobre" }, { s: "TVC:GOLD", d: "Oro" }, { s: "TVC:SILVER", d: "Plata" }, { s: "TVC:UKOIL", d: "Petróleo Brent" }, { s: "TVC:USOIL", d: "Petróleo WTI" }] },
    { title: "Monedas", symbols: [{ s: "FX_IDC:USDCLP", d: "Dólar / peso chileno" }, { s: "FX:EURUSD", d: "Euro / dólar" }, { s: "FX_IDC:USDBRL", d: "Dólar / real" }, { s: "FX_IDC:USDCNY", d: "Dólar / yuan" }] },
    { title: "ETF", symbols: [{ s: "AMEX:SPY", d: "SPY · S&P 500" }, { s: "NASDAQ:QQQ", d: "QQQ · Nasdaq 100" }, { s: "ECH", d: "ECH · Acciones de Chile" }, { s: "AMEX:EWZ", d: "EWZ · Brasil" }, { s: "AMEX:GLD", d: "GLD · Oro" }, { s: "NASDAQ:IBIT", d: "IBIT · Bitcoin" }] },
    { title: "Cripto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }, { s: "COINBASE:SOLUSD", d: "Solana" }] } ] }, 560);
  const calor = tv("stock-heatmap", { dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" }, 520);
  const cripto = tv("crypto-coins-heatmap", { dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" }, 460);
  const agenda = tv("events", { importanceFilter: "0,1", countryFilter: "cl,us,eu,cn,br", width: "100%", height: "100%" }, 560);
  const cuerpo = `<section style="border:0;padding-top:34px"><span class="kicker">Gratis · Datos con el desfase que exigen las bolsas</span>
<h1 class="titulo-lujo" style="font-size:clamp(34px,5vw,54px)">Mercados en vivo</h1>
<p class="lede">Índices, monedas, materias primas, ETF y cripto del mundo en una sola página. Los gráficos son de TradingView; la lectura de lo que significa para Chile llega cada mañana en la edición.</p></section>
${cinta}
<section aria-labelledby="t-res"><h2 class="titulo-lujo" id="t-res">Resumen del mundo</h2><p class="sub">Toca una pestaña y luego un instrumento para ver su gráfico de 12 meses.</p>${resumen}</section>
<section aria-labelledby="t-cal"><h2 class="titulo-lujo" id="t-cal">Dónde se movió el dinero hoy</h2><p class="sub">Las 500 mayores empresas de EE. UU. por sector: el tamaño es su valor bursátil y el color, cuánto subió o bajó.</p>${calor}</section>
<section aria-labelledby="t-cri"><h2 class="titulo-lujo" id="t-cri">Cripto</h2><p class="sub">Las principales criptomonedas por valor de mercado y su variación del día.</p>${cripto}</section>
<section aria-labelledby="t-age"><h2 class="titulo-lujo" id="t-age">Agenda económica</h2><p class="sub">Los datos y decisiones que vienen en Chile, EE. UU., Europa, China y Brasil.</p>${agenda}</section>
<p class="legal" style="color:var(--gris)">Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta. Los precios pueden tener un desfase de 15 minutos o más.</p>`;
  return html(marco({ titulo: "Mercados en vivo · Cofrade News", descripcion: "Índices, monedas, materias primas, ETF y cripto del mundo en una sola página, gratis.", cuerpo, canonica: "/mercados" }), 200,
    { "Cache-Control": "public, max-age=300" }, CSP_MERCADOS);
}

function paginaSocios(dentro, error = "") {
  const cuerpo = dentro
    ? `<section style="border:0"><span class="kicker">Área de socios</span><h1>Bienvenido.</h1>
<p class="lede">Aquí estarán los informes financieros y análisis exclusivos. El primero se publica pronto; te avisaremos en la edición del día.</p>
<div class="acciones"><a class="btn linea" href="/socios/salir">Cerrar sesión</a></div></section>`
    : `<section style="border:0;max-width:560px"><span class="kicker">Área de socios</span><h1>Ingresa con tu clave.</h1>
<p class="lede">Informes financieros, análisis de mercado y contenidos exclusivos. La clave la entrega la Cofradía.</p>
<form class="clave" method="post" action="/socios"><label for="c" style="position:absolute;left:-9999px">Clave de socio</label><input id="c" name="clave" type="password" autocomplete="current-password" required placeholder="Clave de socio"><button type="submit">Entrar</button></form>
${error ? `<p class="aviso" role="alert" style="color:var(--rojo)">${esc(error)}</p>` : ""}</section>`;
  return html(marco({ titulo: "Socios · Cofrade News", descripcion: "Área de socios de Cofrade News.", cuerpo, canonica: "/socios" }), error ? 401 : 200,
    { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" });
}


// 14-11-2026 (Germán: «verificar que todo funcione»): «En vivo» decía «Actualizado a las 03:40» a las 11:39. GitHub corre los
// horarios programados cuando puede: el «Pulso del día», programado 9 veces al día, corrió 2 o 3. La cuenta gratuita de Cloudflare
// ya usa sus 5 relojes (Cron Triggers) en otros proyectos, así que el reloj es la visita: si alguien abre la portada y el Pulso tiene
// más de 2 horas y 10 minutos, el sitio le pide a GitHub que lo corra. Un candado en D1 (tabla config) deja pasar un pedido por hora
// en todo el mundo. Necesita la clave GITHUB_DISPATCH (token de GitHub solo para «Actions» de cofrade-datos, creado por Germán);
// sin ella no hace nada y la portada sigue igual. Si algún día este Worker tiene un reloj propio, scheduled() hace lo mismo.
// Auditoría del 14-11: de noche no se pide (el Pulso programado va de 07 a 23 h; así los robots nocturnos no gastan corridas) y el
// resultado de cada pedido queda en config ('pulso_resultado') y se ve en /panel: una llave vencida (401) ya no pasa en silencio.
const PULSO_VIEJO_MIN = 130, PULSO_CANDADO_MIN = 60;
const _FMT_HORA_CL = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23" });
function pulsoEnHorario(env, ms) {
  const [a, b] = String(env.PULSO_HORAS || "7-23").split("-").map(Number);
  const h = Number(_FMT_HORA_CL.format(new Date(ms)));
  return !(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(h)) || (h >= a && h <= b);
}
async function pedirPulso(env) { return pedirFlujo(env, "pulso.yml"); }
async function pedirFlujo(env, archivo) {
  if (!env.GITHUB_DISPATCH) return "sin clave";
  const r = await fetch(`https://api.github.com/repos/germanperey/cofrade-datos/actions/workflows/${archivo}/dispatches`, {
    method: "POST", body: JSON.stringify({ ref: "main" }),
    headers: { Authorization: `Bearer ${env.GITHUB_DISPATCH}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cofrade-news-web", "Content-Type": "application/json" } });
  return String(r.status);
}
async function revivirPulso(env, p) {
  try {
    if (!env.GITHUB_DISPATCH || !env.DB) return "sin clave";
    const t = Date.parse(p && p.generado);
    if (!Number.isFinite(t)) return "sin fecha";
    const ahora = Date.now();
    if (ahora - t < PULSO_VIEJO_MIN * 60000) return "al día";
    if (!pulsoEnHorario(env, ahora)) return "de noche";
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('pulso_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - PULSO_CANDADO_MIN * 60000).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya pedido";
    let res;
    try { res = await pedirPulso(env); } catch { res = "sin conexión"; }
    await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('pulso_resultado', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor")
      .bind(JSON.stringify({ estado: res, hora: new Date(ahora).toISOString() })).run();
    return res;
  } catch { return "error"; }
}

// 15-11-2026 (Germán: «un auditor que todos los días revise al menos cada 6 horas ... y lo repare automáticamente»; a las 07:21 lo
// ajustó: «que el "auditor" revise, audite, repare y mejore todo cada 3 horas»): el «Vigía del sitio» de GitHub está programado cada
// 3 horas, pero GitHub corre sus horarios cuando puede. Igual que con el Pulso, la visita es el reloj de respaldo: cada vez que el vigía
// pasa por la portada deja su hora en el candado de D1 (marcarVigia) y la visita de un lector solo se lo pide a GitHub si lleva 3 h 30 min
// sin pasar (la media hora absorbe el atraso habitual de GitHub, así no se piden dos revisiones seguidas; un pedido como máximo por vez).
const VIGIA_CADA_MIN = 210;
async function marcarVigia(env) {
  try {
    // auditoría del 15-11: el User-Agent del vigía se puede imitar; como máximo una escritura cada 10 minutos, así no gasta la cuota de D1
    const ahora = Date.now();
    if (env.DB) await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - 10 * 60000).run();
  } catch { /* sin base de datos: el respaldo sigue como estaba */ }
}
async function revivirVigia(env) {
  try {
    if (!env.GITHUB_DISPATCH || !env.DB) return "sin clave";
    const ahora = Date.now();
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - VIGIA_CADA_MIN * 60000).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya pedido";
    let res;
    try { res = await pedirFlujo(env, "vigia.yml"); } catch { res = "sin conexión"; }
    await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_resultado', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor")
      .bind(JSON.stringify({ estado: res, hora: new Date(ahora).toISOString() })).run();
    return res;
  } catch { return "error"; }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pedirPulso(env).catch(() => "error"));
  },
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.hostname === "cofrad.es") return Response.redirect(`https://${DOMINIO}${u.pathname}${u.search}`, 301);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    try {
      // 16-11-2026: el carrusel del pie (todas las páginas) muestra los avisos pagados: la primera página de cada copia del sitio los carga
      if (req.method === "GET" && !ANUNCIOS.t && p !== "/" && !p.startsWith("/ir/") && !/\.[a-z0-9]{2,5}$/i.test(p)) await prepararAnuncios(env);
      if (p === "/" && req.method === "GET") { if (!/CofradeNews-Vigia/.test(req.headers.get("User-Agent") || "")) ctx.waitUntil(contarVisita(req, env, "/")); return await portada(env, ctx, req); }
      if (p === "/edicion") {
        const l = await indice(ctx);
        return l.length ? Response.redirect(`https://${u.host}/edicion/${l[0]}${u.search}`, 302) : Response.redirect(`https://${u.host}/`, 302);
      }
      const m = p.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        // 13-11-2026 (Germán: «demora mucho en cargar»): una edición pasada ya no cambia, así que se guarda 1 día en el borde y
        // 1 hora en el navegador; la de hoy, 10 minutos. Los gráficos se dibujan recién cuando el lector llega a ellos (LENTO).
        const pasada = m[1] < fechaChile(), ttl = pasada ? 86400 : 600;
        const r = (await desdeGitHub(`completa/${m[1]}`, ttl, ctx, rutaEdicion(m[1], true), ttl)) || (pasada && (await desdeGitHub(`permanente/${m[1]}`, 86400, ctx, rutaPermanente(m[1]), 86400)))
          || (await desdeGitHub(`ediciones/Cofrade-News-${m[1]}.html`, ttl, ctx, null, ttl));
        if (!r) return html(marco({ titulo: "Edición no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esa edición no está.</h1><p class="lede">Vuelve a la <a href="/">portada</a> para ver las disponibles.</p></section>` }), 404);
        ctx.waitUntil(contarVisita(req, env, p));
        ctx.waitUntil(revisarRenovaciones(env, ctx));
        const resp = new Response(r.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": "inline", "X-Robots-Tag": "noarchive",
          "Cache-Control": pasada ? "public, max-age=3600, stale-while-revalidate=86400" : "public, max-age=600", ...SEGURIDAD } });
        if (typeof HTMLRewriter === "undefined") return resp;
        const lib = conLibreria(req);   // 15-11-2026: el navegador ya tiene la librería de gráficos (ver ECHARTS_ARCHIVO)
        return new HTMLRewriter()   // 13-11-2026: la edición también lleva el escudo de la Cofradía como ícono
          .on('link[rel~="icon"]', { element(e) { e.remove(); } })
          .on("body", { element(e) { e.prepend(NAV_HTML, { html: true }); e.append(SUBIR_HTML + PROTEGER + MEDIR + NAV_JS + (lib ? "" : GUARDAR_LIBRERIA), { html: true }); } })
          .on("script", scriptsEdicion(lib))
          .on("head", { element(e) { e.prepend(LENTO, { html: true }); e.append('<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png">' + SITIO_CSS, { html: true }); } })
          .transform(resp);
      }
      if (p === "/mercados") { ctx.waitUntil(contarVisita(req, env, "/mercados")); return paginaMercados(); }
      if (p === "/salud") return await salud(env, ctx);   // 15-11-2026: para el vigía de GitHub y el auditor de Claude (cada 3 h)
      // 13-11-2026 · Buzón de sugerencias, medición de lectura y Panel de Control
      if (p === "/buzon" && req.method === "POST") return await recibirBuzon(req, env, ctx).catch(() => jsonR({ ok: false, error: "No pudimos guardar tu sugerencia en este momento. Intenta de nuevo en unos minutos." }, 503));
      if (p === "/buzon/verificar") return await verificarBuzon(req, u, env);
      if (p === "/buzon") return Response.redirect(`https://${u.host}/#buzon`, 302);   // enlace corto para compartir: abre el Buzón
      if (p === "/m" && req.method === "POST") return await recibirLectura(req, env, ctx);
      if (p === "/panel/entrar" && req.method === "POST") return await entrarPanel(req, env);
      if (p === "/panel/salir") return new Response(null, { status: 303, headers: { Location: "/panel", "Set-Cookie": "cn_adm=; Max-Age=0; Path=/panel; Secure; HttpOnly; SameSite=Strict" } });
      if (p === "/panel/buzon.csv") return await panelCsv(req, env);
      if (p === "/panel/visitas.csv") return await panelVisitasCsv(req, env);   // 15-11-2026: contador de visitas completo
      if (p === "/panel") return await panel(req, env);
      // 16-11-2026 · publicidad pagada: registro del Panel, clics, logos y avisos vigentes para el diario (modulos/tablero.js)
      if (p === "/panel/anunciantes" && req.method === "POST") return await accionAnunciantes(req, env, ctx).catch(() => new Response(null, { status: 303, headers: { Location: "/panel?anuncios=formulario#publicidad" } }));
      if (p === "/panel/anunciantes.csv") return await anunciantesCsv(req, env);
      if (p === "/panel/anunciantes/correo") return await vistaCorreoAnunciante(req, env, ctx, u);
      if (p === "/publicidad.json") return await publicidadJson(env);
      const ira = p.match(/^\/ir\/([a-z0-9][a-z0-9-]{0,60})$/);
      if (ira) return await irAnuncio(req, env, ctx, ira[1], u);
      const lga = p.match(/^\/anuncios\/([a-z0-9][a-z0-9-]{0,60})\.(png|jpg|webp)$/);
      if (lga) return await logoAnuncio(req, env, ctx, lga[1], lga[2]);
      const cap = p.match(/^\/capturas\/([a-z0-9-]+\.webp)$/);
      if (cap || p === "/marca-agua.webp") {
        // 15-11-2026: el vigía rehace las capturas con cada edición nueva (herramientas/capturas.py) y corre cada 3 horas: 3 h de caché,
        // así la galería de la portada nunca queda más de una vuelta del vigía atrás
        const r = await desdeGitHub(cap ? `sitio/capturas/${cap[1]}` : "sitio/marca-agua.webp?v=2", cap ? 10800 : 86400, ctx);   // ?v=2: 15-11-2026, 86 → 36 KB
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": cap ? "public, max-age=10800" : "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      const fu = p.match(/^\/f\/(cormorant-garamond-latin(?:-ext)?-(?:500|600|700)-(?:normal|italic)\.woff2)$/);
      if (fu) {   // 15-11-2026: letra de títulos propia (ver FUENTES); caché de un año
        const r = await desdeGitHub(`sitio/fuentes/${fu[1]}`, 31536000, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=31536000, immutable", ...SEGURIDAD } })
          : new Response("", { status: 404, headers: { "Cache-Control": "no-store" } });
      }
      if (p === `/a/${ECHARTS_ARCHIVO}`) {   // 15-11-2026: la librería de gráficos de las ediciones, con caché de un año (ver ECHARTS_ARCHIVO)
        const r = await libreriaGraficos(ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", ...SEGURIDAD } })
          : new Response("", { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      if (p === "/contacto" && req.method === "POST") return await contacto(req, ctx);
      if (p === "/en.json") {
        let t = {};
        try { t = await traduccionesPortada(env, ctx); } catch { t = {}; }
        // a medio traducir: que el navegador no lo guarde (vuelve a pedir en 2,5 s); completo: 10 minutos
        return new Response(JSON.stringify(t), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": t.__faltan ? "no-store" : "public, max-age=600", ...SEGURIDAD } });
      }
      const mc = p.match(/^\/marcas\/([a-z0-9-]+\.webp)$/);
      if (mc && ((MARCAS && MARCAS.marcas) || []).some((x) => x.logo === mc[1])) {
        const r = await desdeGitHub(`sitio/marcas/${mc[1]}`, 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      const ic = { "/favicon.ico": ["favicon.ico", "image/x-icon"], "/favicon-64.png": ["favicon-64.png", "image/png"], "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png"],
        "/escudo-192.png": ["escudo-192.png", "image/png"] }[p];
      if (ic) {
        const r = await desdeGitHub(`sitio/${ic[0]}`, 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": ic[1], "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      if (p === "/pulso.json") {
        const r = await desdeGitHub("datos/pulso.json", 300, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", ...SEGURIDAD } })
          : new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
      }
      // 14-11-2026: socios fundadores del Dashboard Financiero con Mercado Pago (modulos/suscripciones.js)
      if (p === "/socios/fundador") {
        if (req.method === "POST") return await crearSuscripcion(req, env, ctx).catch(() => jsonR({ ok: false, error: "No pudimos conectar con Mercado Pago. Intenta de nuevo en unos minutos." }, 503));
        return paginaFundador(env, env.DB ? await pctCofradia(env) : 20, await modoInscripcion(req, env));
      }
      if (p === "/socios/gracias") return await paginaGracias(req, u, env);
      if (p === "/socios/condiciones") return paginaCondiciones(env.DB ? await pctCofradia(env) : 20);
      if (p === "/panel/probar") return await probarInscripcion(req, env);
      if (p === "/panel/suscripciones" && req.method === "POST") return await accionSuscripciones(req, env).catch(() => new Response(null, { status: 303, headers: { Location: "/panel" } }));
      if (p === "/mp/aviso" && req.method === "POST") return await avisoMP(req, u, env, ctx).catch(() => jsonR({ ok: false }, 500));
      if (p === "/socios/salir") return new Response(null, { status: 302, headers: { Location: "/socios", "Set-Cookie": "cn_socio=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax" } });
      if (p === "/socios") {
        if (req.method === "POST") {
          if (!env.SOCIOS_CLAVE) return paginaSocios(false, "El área de socios se habilita pronto.");
          const f = await req.formData().catch(() => null);
          const clave = String((f && f.get("clave")) || "");
          await new Promise((r) => setTimeout(r, 400)); // frena los intentos a ciegas
          if (!iguales(await firma("c|" + clave, env.SOCIOS_CLAVE), await firma("c|" + env.SOCIOS_CLAVE, env.SOCIOS_CLAVE))) return paginaSocios(false, "Clave incorrecta.");
          const vence = Date.now() + 30 * 86400000;
          return new Response(null, { status: 303, headers: { Location: "/socios", "Set-Cookie": `cn_socio=${vence}.${await firma("socio|" + vence, env.SOCIOS_CLAVE)}; Max-Age=${30 * 86400}; Path=/; Secure; HttpOnly; SameSite=Lax` } });
        }
        return paginaSocios(await esSocio(req, env));
      }
      const lg = p.match(/^\/logo-(claro|oscuro)\.webp$/);
      if (lg) {
        const r = await desdeGitHub(`sitio/logo-${lg[1]}.webp?v=2`, 86400, ctx);   // ?v=2: 15-11-2026, 272 → 156 px
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      if (p === "/favicon.svg") return Response.redirect(`https://${u.host}/favicon-64.png`, 301);   // 13-11-2026: ícono = escudo de la Cofradía
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /socios\nDisallow: /panel\nDisallow: /buzon\nDisallow: /ir/\nSitemap: https://${DOMINIO}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain" } });
      if (p === "/sitemap.xml") {
        const l = await indice(ctx);
        const x = [`https://${DOMINIO}/`, `https://${DOMINIO}/mercados`, ...l.map((f) => `https://${DOMINIO}/edicion/${f}`)].map((h) => `<url><loc>${h}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${x}</urlset>`, { headers: { "Content-Type": "application/xml" } });
      }
      return html(marco({ titulo: "Página no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esta página no existe.</h1><p class="lede">Vuelve a la <a href="/">portada</a>.</p></section>` }), 404);
    } catch (e) {
      return html(marco({ titulo: "Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Volvemos en un momento.</h1><p class="lede">Hubo un problema al leer los datos. Intenta de nuevo en unos minutos.</p></section>` }), 503);
    }
  },
};
