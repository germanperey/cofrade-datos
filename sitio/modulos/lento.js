(function(){if(window.__cnLento)return;window.__cnLento=1;
var E,realInit,realGet,porDom=new Map(),io=null,imprimiendo=false,pend=[],corre=0,
sig=window.scheduler&&scheduler.postTask?function(f){scheduler.postTask(f,{priority:'user-visible'})}:window.MessageChannel?(function(){var c=new MessageChannel(),fs=[];c.port1.onmessage=function(){var f=fs.shift();if(f)f()};return function(f){fs.push(f);c.port2.postMessage(0)}})():function(f){setTimeout(f,0)},
COLA={setOption:1,on:1,off:1,dispatchAction:1,showLoading:1,hideLoading:1,clear:1};
function vivo(st){if(st.m||st.real)return st.real;var an=st.el&&st.el.__cnAntes;if(an){st.el.__cnAntes=null;try{if(st.el.clientWidth<600)an()}catch(e){}}st.real=realInit.apply(E,st.a);for(var i=0;i<st.q.length;i++){try{st.real[st.q[i][0]].apply(st.real,st.q[i][1])}catch(e){}}st.q.length=0;var z=null;for(var j=0;j<st.zq.length;j++){try{z=z||st.real.getZr();z[st.zq[j][0]].apply(z,st.zq[j][1])}catch(e){}}st.zq.length=0;if(io)io.unobserve(st.el);return st.real}
// 16-11-2026: 16 ms por tanda (un cuadro de pantalla): entre tandas el navegador atiende el mouse, el teclado y el desplazamiento
function paso(){pend.sort(function(a,b){return a.d-b.d});var t0=Date.now();while(pend.length){var st=pend.shift();st.ec=0;vivo(st);if(Date.now()-t0>=16)break}if(pend.length)sig(paso);else corre=0}
function todos(){if(window.__cnLeyTodas){try{window.__cnLeyTodas()}catch(e){}}porDom.forEach(function(st){vivo(st)})}
function lazyInit(dom){if(!dom||imprimiendo||!window.IntersectionObserver||!window.Proxy)return realInit.apply(E,arguments);
var prev=porDom.get(dom);if(prev&&!prev.m&&!(prev.real&&prev.real.isDisposed&&prev.real.isDisposed()))return prev.p;
if(!io)io=new IntersectionObserver(function(es){var vh=window.innerHeight||800;es.forEach(function(x){if(x.isIntersecting){var st=porDom.get(x.target);if(st&&!st.real&&!st.m&&!st.ec){st.ec=1;var b=x.boundingClientRect;st.d=Math.max(0,b.top-vh,-b.bottom);pend.push(st)}}});if(pend.length&&!corre){corre=1;sig(paso)}},{rootMargin:'900px 0px'});
var st={el:dom,a:[].slice.call(arguments),q:[],zq:[],over:{},real:null,m:false};
st.p=new Proxy(st,{set:function(t,k,v){t.over[k]=v;return true},get:function(t,k){
 if(Object.prototype.hasOwnProperty.call(t.over,k))return t.over[k];
 if(k==='dispose')return function(){if(t.real){try{t.real.dispose()}catch(e){}}t.m=true;t.q.length=0;if(io)io.unobserve(t.el);if(porDom.get(t.el)===t)porDom.delete(t.el)};
 if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};
 if(t.real){var v=t.real[k];return typeof v==='function'?v.bind(t.real):v}
 if(k==='getDom')return function(){return t.el};
 if(k==='getZr')return function(){return new Proxy({},{get:function(_,kk){if(t.real){var z=t.real.getZr();var v=z[kk];return typeof v==='function'?v.bind(z):v}if(kk==='on'||kk==='off')return function(){if(!t.m)t.zq.push([kk,[].slice.call(arguments)])};if(kk==='then'||typeof kk==='symbol')return undefined;var r=vivo(t);if(!r)return undefined;var z2=r.getZr();var v2=z2[kk];return typeof v2==='function'?v2.bind(z2):v2}})};
 if(k==='isDisposed')return function(){return t.m};
 if(k==='resize')return function(){};
 if(k==='getOption')return function(){for(var i=t.q.length-1;i>=0;i--)if(t.q[i][0]==='setOption')return t.q[i][1][0];return null};
 if(k==='then'||typeof k==='symbol')return undefined;
 if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};
 var r=vivo(t);if(!r)return undefined;var v2=r[k];return typeof v2==='function'?v2.bind(r):v2}});
porDom.set(dom,st);io.observe(dom);return st.p}
function lazyGet(dom){var st=porDom.get(dom);if(st&&!st.m)return st.p;return realGet?realGet.apply(E,arguments):undefined}
function parchar(o){if(!o||o.__cnLento||typeof o.init!=='function')return;realInit=o.init;realGet=o.getInstanceByDom;
 try{o.init=lazyInit;o.getInstanceByDom=lazyGet}catch(e){}if(o.init!==lazyInit){try{Object.defineProperty(o,'init',{value:lazyInit,writable:true,configurable:true});Object.defineProperty(o,'getInstanceByDom',{value:lazyGet,writable:true,configurable:true})}catch(e){}}
 try{o.__cnLento=1}catch(e){}}
try{Object.defineProperty(window,'echarts',{configurable:true,enumerable:true,get:function(){parchar(E);return E},set:function(v){E=v}})}catch(e){}
addEventListener('beforeprint',function(){imprimiendo=true;todos()});addEventListener('afterprint',function(){imprimiendo=false});
var pr=window.print;window.print=function(){imprimiendo=true;todos();try{return pr.apply(window,arguments)}finally{setTimeout(function(){imprimiendo=false},1500)}};
window.__cnTodos=todos;
window.__cnAncho=function(el,f){var st=porDom.get(el);if(imprimiendo||!window.IntersectionObserver||!window.Proxy||(st&&!st.m&&st.real)){if(el.clientWidth<600)f();return}el.__cnAntes=f};})();
// 15-11-2026 (Germán: «optimices bastante más el tiempo de carga»). Medido con una traza del navegador: al cargar, cada gráfico
// por partido del Congreso escribía su alto y enseguida leía medidas (alto() y mk() de la edición), y eso obligaba al navegador a
// rearmar la página completa unas 400 veces (4,1 s con CPU 4x). El sitio cambia esas escrituras por __cnDiferir/__cnAlto: se juntan
// y se aplican de una vez al terminar el script, primero los altos, luego una sola lectura y al final los mínimos. Mismo resultado.
(function(){var q=null,a=null;
// 16-11-2026: el mínimo se pone sin medir. min-height solo agranda cuando hace falta, así que el resultado es el mismo que medir y
// comparar (los contenedores .chart no tienen relleno), y no obliga al navegador a ubicar la página entera mientras carga.
function f(){var Q=q,A=a,i;q=a=null;
 if(Q)for(i=0;i<Q.length;i++)Q[i][0].style[Q[i][1]]=Q[i][2];
 if(A)for(i=0;i<A.length;i++)A[i][0].style.minHeight=A[i][1]+'px'}
function prog(){if(!q&&!a){if(window.queueMicrotask)queueMicrotask(f);else Promise.resolve().then(f)}}
window.__cnDiferir=function(el,p,v){prog();(q||(q=[])).push([el,p,v])};
window.__cnAlto=function(el,min){prog();(a||(a=[])).push([el,min])};})();
// 15-11-2026 · votaciones del Congreso plegadas («Ver la votación», cerrada al cargar): el navegador las armaba igual aunque no se
// vieran (44 mil de los 80 mil elementos de la edición). Ahora se marcan content-visibility:hidden (CSS del sitio) y el gráfico de cada
// ley se arma recién cuando el lector abre su votación. Al cargar se dejan puestos los altos finales (el mismo cálculo de la edición:
// alto y mínimo dependen solo del número de partidos), así que nada se mueve al abrir. Al imprimir se arman todos antes.
(function(){var esperan=null,forzar=false,io=null;
// 16-11-2026: el script de la edición dibuja las leyes ANTES de plegarlas (las fichas y «Ver todas las votaciones» se cierran después),
// así que cada ley espera a que el lector se acerque a su gráfico: con la ficha plegada no se ve (content-visibility:hidden) y el
// navegador no lo marca como cercano hasta que el lector la abre. Los altos finales se ponen al cargar, para que nada se mueva al abrir.
function correr(lista){var antes=forzar;forzar=true;try{lista.forEach(function(x){try{window.__cnLeyF(x[1],x[2])}catch(e){}})}finally{forzar=antes}}
function cerca(el){if(!io)io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting||!esperan)return;
 var ya=[],resto=[];esperan.forEach(function(y){(y[0]===e.target?ya:resto).push(y)});esperan=resto.length?resto:null;io.unobserve(e.target);correr(ya)})},{rootMargin:'900px 0px'});
 io.observe(el)}
window.__cnLeyEspera=function(el,l,li){if(forzar||window.__imp||!window.IntersectionObserver)return false;
 var n=l.partidos.length,h=Math.max(160,28*n+60),dos=l.partidos.some(function(p){return String(p[0]).indexOf('\n')>=0}),min=n*(dos?42:30)+64;
 el.style.height=h+'px';el.dataset.h=h;if(h<min)el.style.minHeight=min+'px';
 var x=[el,l,li];if(esperan)for(var i=0;i<esperan.length;i++)if(esperan[i][0]===el){esperan[i]=x;return true}
 (esperan||(esperan=[])).push(x);cerca(el);return true};
window.__cnLeyTodas=function(){if(!esperan)return;var t=esperan;esperan=null;if(io)t.forEach(function(x){io.unobserve(x[0])});correr(t)};})();
// 16-11-2026: si la edición no alcanzó a plegar las votaciones del Congreso (su botón sigue oculto), se muestran como antes
addEventListener('load',function(){setTimeout(function(){try{if(document.querySelector('.cg-tog[hidden]+.cg-det'))document.documentElement.classList.add('cn-sin-plegar')}catch(e){}},1500)});
// 16-11-2026: hace algo recién cuando un bloque está por verse (p. ej. ubicar la tabla de Vuelos en la hora actual); al imprimir, de inmediato
window.__cnCuandoSeVea=function(el,fn){if(!el||window.__imp||!window.IntersectionObserver)return fn();
 var o=new IntersectionObserver(function(es){if(!es.some(function(e){return e.isIntersecting}))return;o.disconnect();try{fn()}catch(e){}},{rootMargin:'900px 0px'});o.observe(el)};
