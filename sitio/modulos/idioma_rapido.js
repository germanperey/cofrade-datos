// 21-11-2026 18:35 · Germán: «procura que al seleccionar el icono del header para cambiar el idioma del Newsletter sea más rápido,
// porque tarda un poco en mostrar la traducción». Medido en la edición del 21-11: el paso a inglés tardaba 2,0 s en computador
// (5,7 s la segunda vez) y 9,6 s en un teléfono lento (26 s la segunda vez). Causa: el traductor de la edición (motor v3.9.1, viene
// cifrado dentro de cada edición) pregunta el estilo de cada etiqueta en línea justo después de cambiar el texto de la anterior, y el
// navegador recalcula los estilos de toda la página en cada pregunta (miles de veces). Además revisa los mismos elementos una y otra vez.
// Arreglo sin tocar la edición: cuando el sitio descifra el traductor, le cambia 3 piezas: (1) lee el estilo de todas las etiquetas en
// línea una sola vez, antes de traducir; (2) recuerda qué elemento ya revisó durante la misma pasada; (3) borra esa memoria al terminar.
// Si una edición futura trae otro traductor (las 3 piezas no calzan), no se cambia nada y funciona como siempre.
const IDIOMA_RAPIDO = `<script>(function(){var C=window.__cn;if(!C||typeof C._d!=='function'||C.__rap||/[?&]tr=lento\\b/.test(location.search))return;C.__rap=1;var d0=C._d;
var A1="const enFila=c=>{if(SOLO.has(c.tagName))return true;const d=getComputedStyle(c).display;return d==='inline'||d==='contents'};",
B1="let __D=new WeakMap(),__DON=false;const enFila=c=>{if(SOLO.has(c.tagName))return true;let d=__DON?__D.get(c):undefined;if(d===undefined){d=getComputedStyle(c).display;if(__DON)__D.set(c,d)}return d==='inline'||d==='contents'};",
A2="function enLinea(el){if(salta(el))return false;",
B2="const __M=new Map();let __MON=false;function enLinea(el){if(!__MON)return enLinea0(el);let r=__M.get(el);if(r===undefined){r=enLinea0(el);__M.set(el,r)}return r}function enLinea0(el){if(salta(el))return false;",
A3="function traducir(raiz){try{unidades(raiz,txUnidad);txAtributos(raiz)}finally{if(obs)obs.takeRecords()}}",
B3="function __pre(r){if(!r||!r.querySelectorAll)return;const l=r.querySelectorAll('a,b,i,em,strong,span,small,time,sup,sub,abbr,code,mark,u,s,q,cite,dfn,kbd,samp,var,data,bdi,bdo,ins,del');for(let i=0;i<l.length;i++)__D.set(l[i],getComputedStyle(l[i]).display)}"
+"let __gen=0;const __cont=[];window.__trPendiente=0;"
+"function __partes(){const o=[];__cont.length=0;(function f(el){__cont.push(el);for(const c of Array.from(el.childNodes)){if(c.nodeType===3){if(/\\\\S/.test(c.nodeValue))o.push(c);continue}if(c.nodeType!==1||salta(c))continue;if(c.getElementsByTagName('*').length>2500&&!enLinea0(c))f(c);else o.push(c)}})(document.body);return o}"
+"function __atrUno(el){if(!el.getAttribute||(el.closest&&el.closest('[data-no-tr],[translate=no]')))return;for(const a of ATR){const s=el.getAttribute(a);if(!s||!LET.test(s))continue;let v=busca(norm(escT(s)));v=v===null?porFrases(s):desT(v);if(v===s)continue;let o=ORIGA.get(el);if(!o){o={};ORIGA.set(el,o);HECHAS.add(el)}if(!(a in o))o[a]=s;el.setAttribute(a,v)}}"
+"function __uno(p){if(p.nodeType===3){if(p.parentNode)txUnidad(null,p)}else if(p.isConnected)traducir(p)}"
+"function __porPartes(){const g=++__gen,ps=__partes(),H=innerHeight||800,W=innerWidth||400,P=new Map();ps.forEach((p,i)=>{if(p.nodeType===1)P.set(p,i)});const cen=new Set(),ya=[];"
+"for(let k=0;k<14;k++)for(const x of [.25,.75]){let e=document.elementFromPoint(W*x,(k+.5)*H/14);while(e&&e!==document.body&&!P.has(e))e=e.parentElement;if(e&&P.has(e))cen.add(P.get(e))}"
+"const ci=[...cen];const dist=i=>{let d=1e9;for(const c of ci){const v=Math.abs(i-c);if(v<d)d=v}return d};const luego=[];"
+"ps.forEach((p,i)=>{if(p.nodeType!==1||p.id==='cnMenu'||p.tagName==='HEADER'||dist(i)<=2)ya.push(p);else luego.push(p)});"
+"if(ci.length)luego.sort((a,b)=>dist(P.get(a))-dist(P.get(b)));const oc=[];"
+"const resto=luego.concat(oc);document.querySelectorAll('section h2').forEach(__uno);ya.forEach(__uno);__cont.forEach(__atrUno);if(obs)obs.takeRecords();window.__trPendiente=resto.length;let i=0;"
+"(function paso(){if(lang!=='en'||g!==__gen){if(g===__gen)window.__trPendiente=0;return}const t0=performance.now();while(i<resto.length&&performance.now()-t0<14)__uno(resto[i++]);"
+"window.__trPendiente=resto.length-i;if(obs)obs.takeRecords();if(i<resto.length)setTimeout(paso,0);else try{document.dispatchEvent(new CustomEvent('cofrade-idioma-listo',{detail:'en'}))}catch(e){}})()}"
+"function traducir(raiz){const p=__DON;if(!p){__D=new WeakMap();__DON=__MON=true;try{__pre(raiz)}catch(e){}}try{unidades(raiz,txUnidad);txAtributos(raiz)}finally{if(!p){__DON=__MON=false;__M.clear()}if(obs)obs.takeRecords()}}";
A4="traducir(document.body);observar()}",B4="__porPartes();observar()}";
function uno(s,a){var i=s.indexOf(a);return i>=0&&s.indexOf(a,i+1)<0}
C._d=function(b){var s=d0.call(this,b);try{if(s.indexOf('const enFila=c=>')>=0&&uno(s,A1)&&uno(s,A2)&&uno(s,A3)&&uno(s,A4)){s=s.replace(A1,function(){return B1}).replace(A2,function(){return B2}).replace(A3,function(){return B3}).replace(A4,function(){return B4});window.__cnIdiomaRapido=1}}catch(e){}return s}})();</script>`;
