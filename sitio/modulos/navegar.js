(function(){if(window.__cnNavegar||!window.Element||!Element.prototype.scrollIntoView)return;window.__cnNavegar=1;
// 18-11-2026 (Germán: «revisa el botón del "Índice" porque en ocasiones al seleccionar un tema específico me lleva a una Sección
// distinta... Asegúrate de que el "Índice" funcione perfectamente»). Causa medida en un navegador real: desde el 16-11 cada sección se
// dibuja recién cuando el lector se acerca (content-visibility:auto, la capa que hizo rápida la carga) y, mientras no se ha dibujado,
// cuenta como un bloque de 3.000 px. El salto suave del navegador calculaba el destino con esos altos de reserva y, al pasar, cada
// sección tomaba su alto real: el destino se corría. Con la edición recién abierta, 26 de los 32 temas del Índice llegaban a otra
// sección en computador y 29 de 32 en teléfono; con la página ya recorrida fallaban 2 (por eso «en ocasiones»).
// Ahora: 1) salto exacto al instante (no dibuja todo lo de en medio, así que además es más liviano); 2) entrada suave corta, de menos
// de media pantalla, midiendo el destino en cada cuadro; 3) durante unos segundos mide y corrige si algo se movió (una sección que
// toma su alto real, un gráfico, una imagen). Si el lector toca la pantalla, usa la rueda, arrastra o usa el teclado, deja de corregir.
// Vale para el Índice, el buscador, los enlaces internos (#), el gráfico de secciones, abrir con #tema y recargar la página.
var ORIG=Element.prototype.scrollIntoView,gen=0,ses=null,movio=false,
 raf=window.requestAnimationFrame?function(f){requestAnimationFrame(f)}:function(f){setTimeout(f,16)},
 ahora=function(){return window.performance&&performance.now?performance.now():Date.now()};
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function maxY(){var d=document.scrollingElement||document.documentElement;return Math.max(0,d.scrollHeight-innerHeight)}
function pad(el){var v=0;try{v=(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+(el?parseFloat(getComputedStyle(el).scrollMarginTop)||0:0)}catch(e){}return v}
// lugar de la ventana (scrollY) que deja el elemento arriba (start) o al centro (center), como lo dejaría el navegador
function meta(el,b,extra){var r=el.getBoundingClientRect(),p=pad(el),d;
 if(b==='center'){var a=innerHeight-p;d=r.height>=a?r.top-p:r.top-p-(a-r.height)/2}else d=r.top-p+(extra||0);
 return Math.max(0,Math.min(maxY(),pageYOffset+d))}
function visible(el){return !!(el&&document.documentElement.contains(el)&&el.getClientRects().length)}
function parar(){gen++;ses=null}
function poner(y){y=Math.max(0,Math.round(y));try{window.scrollTo({top:y,left:pageXOffset,behavior:'instant'})}catch(e){window.scrollTo(pageXOffset,y)}
 if(ses){ses.y=pageYOffset;ses.top=ses.el.getBoundingClientRect().top}}
// ¿desplazó la página otro (barra lateral, lector de pantalla)? La página se movió y el tema se movió en la pantalla lo mismo al revés.
// Si en cambio el navegador compensó un cambio de alto (anclaje) o tocó el final de la página, no es el lector: se toma como nueva base.
function ajeno(){if(!ses)return false;var y=pageYOffset,t=ses.el.getBoundingClientRect().top,dy=y-ses.y,dt=t-ses.top;
 if(Math.abs(dy)>2&&Math.abs(dy+dt)<2&&y<maxY()-1){parar();return true}ses.y=y;ses.top=t;return false}
// el lector manda: rueda, toque, clic o teclas que desplazan cortan la corrección
['wheel','touchstart','mousedown','keydown'].forEach(function(t){addEventListener(t,function(e){movio=true;if(!ses)return;
 if(t==='keydown'&&!/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| |Spacebar)$/.test(e.key||''))return;parar()},{passive:true,capture:true})});
addEventListener('scroll',function(){if(ses&&ses.quieta)ajeno()},{passive:true});
function navegar(el,b,suave,extra){
 parar();var g=gen,y0=pageYOffset,t0=ahora(),G=Math.min(innerHeight*0.5,440),T,off=0,dur=0,est=0;
 // 1) salto al instante: el original acomoda también las cajas con desplazamiento propio (tablas, listas); luego se ajusta la ventana
 try{ORIG.call(el,{block:b==='center'?'center':'start',inline:'nearest',behavior:'instant'})}catch(e){try{ORIG.call(el,b!=='center')}catch(e2){}}
 T=meta(el,b,extra);
 // 2) entrada suave corta (en el sentido del viaje); sin ella si el lector pidió reducir el movimiento
 if(suave&&!quieto()){off=Math.max(-G,Math.min(G,y0-T));if(Math.abs(off)<2)off=0;else dur=Math.min(420,200+Math.abs(off)*0.5)}
 ses={el:el,g:g,y:0,top:0};poner(T+off);
 function paso(){if(g!==gen)return;if(!visible(el)){parar();return}if(ajeno())return;
  var t=ahora(),y;T=meta(el,b,extra);
  if(t<t0+dur){var k=(t-t0)/dur;k=1-Math.pow(1-k,3);y=T+off*(1-k)}else y=T;
  if(Math.abs(pageYOffset-y)>=1){poner(y);est=0}else est++;
  if((t<t0+dur+700||est<12)&&t<t0+3500){raf(paso);return}
  // 3) ya quieto: hasta 9 s desde el clic, si algo cambia de alto (imagen, gráfico, sección) se deja el tema de nuevo en su lugar,
  // salvo que el lector ya se haya movido
  ses.quieta=1;if(!window.ResizeObserver)return;var hoja=document.querySelector('.hoja')||document.body,fin=t0+9000,
  ro=new ResizeObserver(function(){if(g!==gen||ahora()>fin||!visible(el)){ro.disconnect();return}if(ajeno()){ro.disconnect();return}
   var T2=meta(el,b,extra);if(Math.abs(pageYOffset-T2)>=2)poner(T2)});
  ro.observe(hoja);setTimeout(function(){ro.disconnect();if(g===gen)ses=null},Math.max(0,fin-ahora()))}
 raf(paso)}
window.__cnNavegarA=navegar;
// el reemplazo: solo para llevar contenido de la edición arriba o al centro (Índice, buscador, gráfico de secciones, paginadores)
Element.prototype.scrollIntoView=function(o){
 try{var b='start',s=false;if(o===false)b='end';else if(o&&typeof o==='object'){b=o.block||'start';s=o.behavior==='smooth'}
  if((b==='start'||b==='center')&&!window.__imp&&this.closest&&this.closest('.hoja')&&visible(this)){navegar(this,b,s);return}}catch(e){}
 return ORIG.apply(this,arguments)};
// enlaces internos (#tema) de la edición: mismo camino; la dirección conserva el #tema, como antes
document.addEventListener('click',function(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 var a=e.target&&e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var h=a.getAttribute('href')||'',id;
 if(h.length<2)return;try{id=decodeURIComponent(h.slice(1))}catch(_){id=h.slice(1)}
 var el=document.getElementById(id);if(!el||!el.closest('.hoja')||!visible(el))return;
 e.preventDefault();try{history.pushState(history.state,'',h)}catch(_){}navegar(el,'start',true)});
// abrir la edición con #tema (o volver a una dirección con #tema): se llega exacto aunque la página siga cargando
function porDireccion(){if(movio||!location.hash||location.hash.length<2)return false;var el=null;
 try{el=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch(e){}
 if(!el||!el.closest||!el.closest('.hoja')||!visible(el))return false;navegar(el,'start',false);return true}
addEventListener('popstate',function(){movio=false;porDireccion()});
// recargar o volver atrás: el navegador recordaba solo los píxeles, que con secciones aún sin dibujar caen en otro tema. Se guarda en
// qué tema iba el lector (y cuánto había leído de él) y se vuelve exactamente ahí.
var CLAVE='cn-pos:'+location.pathname;
function lugar(){var y=pad(null)+2,c=document.querySelectorAll('.hoja section.sec[id]'),u=null,top=0;
 for(var i=0;i<c.length;i++){var r=c[i].getBoundingClientRect();if(r.top>y)break;if(r.height){u=c[i];top=r.top}}
 return u?{id:u.id,d:Math.round(y-2-top)}:{y:Math.round(pageYOffset)}}
function guardar(){try{sessionStorage.setItem(CLAVE,JSON.stringify(lugar()))}catch(e){}}
addEventListener('pagehide',guardar);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')guardar()});
var tipo='navigate';try{var nv=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];tipo=nv?nv.type:(performance.navigation&&performance.navigation.type===1?'reload':performance.navigation&&performance.navigation.type===2?'back_forward':'navigate')}catch(e){}
var previo=null;try{previo=JSON.parse(sessionStorage.getItem(CLAVE)||'null')}catch(e){}
var restaurar=!!previo&&(tipo==='reload'||tipo==='back_forward');   // como el navegador: al recargar manda dónde iba, no el #tema
if(restaurar&&'scrollRestoration' in history){try{history.scrollRestoration='manual'}catch(e){}}
function volver(){if(!restaurar||movio)return;
 if(previo.id){var el=document.getElementById(previo.id);if(el&&visible(el)){navegar(el,'start',false,previo.d||0);return}}
 if(typeof previo.y==='number')poner(previo.y)}
function listo(){if(restaurar)volver();else porDireccion()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listo);else setTimeout(listo,0);
addEventListener('load',function(){setTimeout(function(){if(!movio&&!ses)listo()},0)});
})();
