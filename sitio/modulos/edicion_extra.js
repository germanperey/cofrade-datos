// 26-11-2026 · Tres mejoras de la edición pedidas por Germán con una revisión externa:
// 1) «Lo que mueve la aguja hoy»: «Abre cada edición con 5 balas ejecutivas ("Lo que mueve la aguja hoy")». El bloque «Las 3 del día»
//    pasa a llamarse así (la tarea de la mañana ahora escribe 5 balas: regla 49 de correcciones-vivas); las ediciones viejas, con 3,
//    también toman el título nuevo.
// 2) Secciones favoritas: «permite que cada lector elija sus secciones favoritas para leer o escuchar». Botón «Mis secciones»: se marcan
//    las que quiere; las demás se pliegan (una barra dice cuántas y las muestra con un toque) y la voz del diario se las salta. La
//    elección vive solo en este navegador (localStorage cn-favs): no se manda a ningún lado.
// 3) Compartir gráfico: «Pon un botón de "Compartir gráfico por WhatsApp / LinkedIn" en cada infografía (con tu logo y cofrad.es en la
//    imagen)». Cada gráfico lleva un botón que arma una imagen PNG con el título, el gráfico, el logo y «cofrad.es»: en el teléfono abre
//    el menú de compartir con la imagen (WhatsApp, LinkedIn, etc.); en el computador la descarga y ofrece WhatsApp y LinkedIn con el
//    enlace a ese gráfico.
const AGUJA_TITULO = "Lo que mueve la aguja hoy";
// 27-11-2026 (Germán: «Verifica que las traducciones a inglés se realicen correctamente!!», con captura: el título quedaba en español
// en la edición en inglés). Lo que agrega el sitio no está en el diccionario de la edición, así que va en los dos idiomas (cn-es / cn-en,
// fuera del traductor) y se muestra el que corresponde.
const BIL = (es, en) => `<span class="cn-es" lang="es" data-no-tr translate="no">${es}</span><span class="cn-en" lang="en" data-no-tr translate="no">${en}</span>`;
const AGUJA_EN = "What moves the needle today";
const AGUJA_REW = { element(e) { e.setInnerContent(BIL(AGUJA_TITULO, AGUJA_EN), { html: true }); } };
// 26-11-2026 (Germán: «todo esté respaldado con su fuente»): Indicadores y Feriados nombraban la fuente sin enlace; ahora la enlazan.
// Los enlaces van en un párrafo aparte: si se agregaran dentro del párrafo de la edición, el traductor ya no lo reconoce y queda en español.
const FUENTES_IND = { element(e) { e.after('<p class="fuente">' + BIL("Ver en la fuente:", "See the source:") + ' <a href="https://si3.bcentral.cl/siete" target="_blank" rel="noopener">' + BIL("Banco Central de Chile (Base de Datos Estadísticos)", "Central Bank of Chile (Statistics Database)") + '</a> · <a href="https://www.coinbase.com/price/bitcoin" target="_blank" rel="noopener">Coinbase</a></p>', { html: true }); } };
const FUENTES_FER = { element(e) { e.append('<p class="fuente">' + BIL("Fuentes:", "Sources:") + ' <a href="https://www.bcn.cl/leychile" target="_blank" rel="noopener">' + BIL("Biblioteca del Congreso Nacional (Ley 19.668 y Ley 20.983)", "Library of the National Congress of Chile (Laws 19,668 and 20,983)") + '</a> · <a href="https://www.feriados.cl" target="_blank" rel="noopener">feriados.cl</a> ' + BIL("(feriados extraordinarios) · feriados de otros países: calendarios oficiales de cada gobierno.", "(extraordinary holidays) · other countries: each government's official calendar.") + '</p>', { html: true }); } };
// 27-11-2026 (Germán, con captura de Efemérides: «Mucha precaución cuando en los textos de "Efemérides del día" aparezca la frase
// "en la imagen" dado que no hay imágenes adjuntas, por lo tanto, debes omitir esa frase o sino agregar la imagen correspondiente»).
// Las efemérides vienen de Wikipedia, que escribe «(en la imagen)» porque allá hay una foto al lado. Aquí no la hay: se quita la frase.
// Se quita en el navegador y no en el servidor: el traductor de la edición reconoce cada frase completa, así que antes de pasar
// a inglés se le devuelve el texto original y, ya traducido, se quita también «(pictured)» o «(in the image)».
const SIN_IMAGEN_JS = "var RX=/\\s*\\((?:en la (?:imagen|foto|fotograf\\u00eda|ilustraci\\u00f3n)|a la (?:izquierda|derecha)|en el centro|imagen|foto|pictured|in the (?:image|picture|photo)|left|right|center)\\)/gi;"
  + "var LI=[].filter.call(D.querySelectorAll('section#efemerides li, section#efemerides p'),function(li){RX.lastIndex=0;return RX.test(li.textContent)});"
  + "function tx(li){var w=D.createTreeWalker(li,4),n,a=[];while(n=w.nextNode())a.push(n);return a}"
  + "function sin(t){return t.replace(RX,'')}"
  + "LI.forEach(function(li){li.__es={};tx(li).forEach(function(n,k){RX.lastIndex=0;if(RX.test(n.nodeValue)){li.__es[k]=n.nodeValue;n.nodeValue=sin(n.nodeValue)}})});"
  + "function es(){if(R.lang==='en')return;LI.forEach(function(li){var a=tx(li);for(var k in li.__es)if(a[k])a[k].nodeValue=sin(li.__es[k])})}"
  + "function en(){if(R.lang!=='en')return;LI.forEach(function(li){tx(li).forEach(function(n){RX.lastIndex=0;if(RX.test(n.nodeValue))n.nodeValue=sin(n.nodeValue)})})}"
  + "if(LI.length){window.addEventListener('click',function(e){if(!(e.target&&e.target.closest&&e.target.closest('#btnIdioma')))return;"
  + "if(R.lang!=='en')LI.forEach(function(li){var a=tx(li);for(var k in li.__es)if(a[k])a[k].nodeValue=li.__es[k]});else[60,400,1500].forEach(function(t){setTimeout(es,t)})},true);"
  + "D.addEventListener('cofrade-idioma-listo',function(){setTimeout(function(){en();es()},0)})}"
  + "function graf(){if(!window.echarts)return;[].forEach.call(D.querySelectorAll('section#efemerides div.chart'),function(el){var c=echarts.getInstanceByDom(el);if(!c)return;var o=JSON.stringify(c.getOption());RX.lastIndex=0;if(RX.test(o)){RX.lastIndex=0;c.setOption(JSON.parse(o.replace(RX,'')))}})}"
  + "[800,3000].forEach(function(t){setTimeout(graf,t)});D.addEventListener('cofrade-idioma-listo',function(){setTimeout(graf,300)});";
// 27-11-2026 (Germán, con captura de Mar y mareas: «muestra un mensaje de alerta de Marejadas, sin embargo, en el gráfico no se
// aprecia ninguna marejada en los puertos!!»). El aviso vigente era de viento y marejadas locales en la Península Antártica, lejos
// de los puertos del gráfico, y la franja roja decía «Embarcaciones en puerto: trincar...» sin decir dónde. Ahora: la franja roja queda
// solo si el aviso toca la costa de los puertos de Chile; si es oceánico o antártico, pasa a ámbar y dice qué es, dónde y que los
// puertos del gráfico no tienen aviso. En los dos idiomas.
const MAREJADA_JS = "var sec=D.getElementById('mar');if(!sec)return;"
  + "var F=[].map.call(sec.querySelectorAll('.tabla tbody tr'),function(tr){var t=tr.querySelectorAll('td');function x(i){return t[i]?t[i].textContent.replace(/\\s+/g,' ').trim():''}return{tipo:x(0),sector:x(1),emi:x(2),vig:x(3)}});"
  + "var V=F.filter(function(f){return /vigente/i.test(f.vig)});"
  + "var COSTA=/Arica|Iquique|Tocopilla|Mejillones|Antofagasta|Taltal|Chañaral|Caldera|Huasco|Coquimbo|Los Vilos|Valpara|Quintero|San Antonio|Constituci|Talcahuano|Concepci|Lebu|Arauco|Corral|Valdivia|Puerto Montt|Chilo|Castro|Quell|Ays|Chacabuco|Punta Arenas|Magallanes|Juan Fern|Golfo de Penas|Rapa Nui|Isla de Pascua|costa|litoral|caleta|bah[ií]a/i;"
  + "if(!V.length||V.some(function(f){return COSTA.test(f.sector)}))return;"
  + "var TIP={'Viento':'Wind','Marejadas':'Swell','Temporal':'Storm'};function tEn(t){return t.replace(/^Otro: /,'').replace(/Temporal en área oceánica/i,'Ocean-area storm').replace(/^(Viento|Marejadas|Temporal)$/,function(m){return TIP[m]})}"
  + "var es=V.map(function(f){return f.tipo.replace(/^Otro: /,'')+' en '+f.sector+' (emitido el '+f.emi+')'}).join('; '),en=V.map(function(f){return tEn(f.tipo)+' in '+f.sector+' (issued '+f.emi.replace(' a las ',' at ')+')'}).join('; ');"
  + "function esc(t){var d=D.createElement('div');d.textContent=t;return d.innerHTML}"
  + "var H='<span class=\"cn-es\" lang=\"es\"><b>Aviso vigente lejos de los puertos del gráfico.</b> '+esc(es)+'. Valparaíso, San Antonio, Talcahuano, Puerto Montt y Punta Arenas no tienen aviso de marejadas vigente. Si navegas en esa zona, revisa el aviso oficial de la Armada.</span>'"
  + "+'<span class=\"cn-en\" lang=\"en\"><b>Active notice far from the ports in the chart.</b> '+esc(en)+'. Valparaíso, San Antonio, Talcahuano, Puerto Montt and Punta Arenas have no active swell warning. If you sail in that area, check the Chilean Navy\\'s official notice.</span>';"
  + "var EST='background:rgba(201,161,74,.16);color:inherit;border:1px solid rgba(201,161,74,.6)';"
  + "[].forEach.call(D.querySelectorAll('section#mar p.alerta.roja, .alerta.roja[role=alert]'),function(b){if(!/marejad|swell/i.test(b.textContent))return;b.className=b.className.replace('roja','ambar');b.setAttribute('style',EST);b.setAttribute('data-no-tr','');b.setAttribute('translate','no');b.innerHTML=H})";
const EXTRA_CSS = `<style>
.cn-en{display:none}html[lang^="en"] .cn-en{display:inline}html[lang^="en"] .cn-es{display:none}
.cn-gcw{display:flex;justify-content:flex-end;margin:8px 0 0}.cn-gc{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid rgba(201,161,74,.6);
background:rgba(251,248,242,.94);color:#1A1406;font:600 12.5px/1 var(--sans,system-ui);cursor:pointer;opacity:.9}
.cn-gc:hover,.cn-gc:focus-visible{opacity:1;outline:2px solid #C9A14A;outline-offset:2px}[data-theme=dark] .cn-gc{background:rgba(20,18,14,.9);color:#F4EEDF}
.cn-gc svg{width:15px;height:15px}.cn-gc-p{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
max-width:min(560px,94vw);padding:12px 14px;border-radius:16px;background:#1A1406;color:#F4EEDF;box-shadow:0 10px 30px rgba(0,0,0,.35);font:14px/1.3 var(--sans,system-ui)}
.cn-gc-p a,.cn-gc-p button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #C9A14A;background:transparent;color:#F4EEDF;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer;font:600 13px var(--sans,system-ui)}
.cn-gc-p a.oro{background:#C9A14A;color:#1A1406}
.cn-favb{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;margin:10px 0 0;border-radius:999px;border:1px solid #C9A14A;background:transparent;color:inherit;font:600 14px var(--sans,system-ui);cursor:pointer}
.cn-fav{position:fixed;inset:auto 0 0 0;z-index:9998;max-height:78vh;overflow:auto;padding:18px 18px 22px;background:#FBF8F2;color:#1A1406;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.3)}
[data-theme=dark] .cn-fav{background:#17140F;color:#F4EEDF}.cn-fav h2{margin:0 0 4px;font-size:19px}.cn-fav p{margin:0 0 12px;font-size:13.5px;opacity:.8}
.cn-fav-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 14px;margin:0 0 14px}.cn-fav-l label{display:flex;gap:10px;align-items:center;min-height:40px;font-size:15px;cursor:pointer}
.cn-fav-l input{width:20px;height:20px;accent-color:#C9A14A}.cn-fav-a{display:flex;flex-wrap:wrap;gap:10px}.cn-fav-a button{min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #C9A14A;background:transparent;color:inherit;font:600 14px var(--sans,system-ui);cursor:pointer}
.cn-fav-a .oro{background:#C9A14A;color:#1A1406}section.sec.cn-oculta{display:none}
.cn-ocultas{margin:14px 0;padding:12px 16px;border:1px dashed rgba(201,161,74,.7);border-radius:14px;font-size:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.cn-ocultas button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #C9A14A;background:transparent;color:inherit;font:600 13px var(--sans,system-ui);cursor:pointer}
@media (prefers-reduced-motion:no-preference){.cn-fav,.cn-gc-p{animation:cnSube .22s cubic-bezier(.2,.8,.2,1)}}@keyframes cnSube{from{opacity:0;transform:translate(var(--tx,0),12px)}to{opacity:1;transform:translate(var(--tx,0),0)}}
.cn-gc-p{--tx:-50%}
</style>`;
const EXTRA_JS = `<script>(function(){var D=document,R=D.documentElement,en=function(){return R.lang==='en'};
(function(){${SIN_IMAGEN_JS}})();
(function(){${MAREJADA_JS}})();
function ev(n){try{window.cnEv&&cnEv(n)}catch(e){}}
/* --- Lo que mueve la aguja hoy: se cuenta cuando se ve --- */
var ag=D.querySelector('section.tres');if(ag&&'IntersectionObserver' in window){var io0=new IntersectionObserver(function(es){if(es[0].isIntersecting){ev('aguja_vista');io0.disconnect()}},{threshold:.5});io0.observe(ag)}
/* --- Secciones favoritas --- */
var secs=[].slice.call(D.querySelectorAll('.hoja section.sec[id]')).filter(function(s){return s.querySelector('h2')});
function nombre(s){return s.querySelector('h2').textContent.replace(/^\\s*\\d{1,2}\\.\\s*/,'').trim()}
function leer(){try{var v=JSON.parse(localStorage.getItem('cn-favs')||'null');return Array.isArray(v)&&v.length?v:null}catch(e){return null}}
var barra=null;function aplicar(){var f=leer(),n=0;secs.forEach(function(s){var o=!!f&&f.indexOf(s.id)<0;s.classList.toggle('cn-oculta',o);if(o)n++});
if(barra){barra.remove();barra=null}if(n&&secs[0]){barra=D.createElement('div');barra.className='cn-ocultas';barra.setAttribute('data-no-tr','');barra.setAttribute('translate','no');barra.setAttribute('role','status');
barra.innerHTML='<span>'+(en()?n+' sections hidden by your choice.':'Ocultas por tu elección: '+n+' secciones.')+'</span><button type="button">'+(en()?'Show all':'Mostrar todas')+'</button>';
barra.querySelector('button').onclick=function(){try{localStorage.removeItem('cn-favs')}catch(e){}aplicar()};var t=ag||secs[0];t.parentNode.insertBefore(barra,t.nextSibling)}}
function abrir(){var f=leer(),c=D.createElement('div');c.className='cn-fav';c.setAttribute('role','dialog');c.setAttribute('aria-modal','true');c.setAttribute('aria-label',en()?'My sections':'Mis secciones');
c.innerHTML='<h2>'+(en()?'My sections':'Mis secciones')+'</h2><p>'+(en()?'Pick what you want to read or listen to. The rest folds away; the voice skips it. Saved only on this device.':'Marca lo que quieres leer o escuchar. Lo demás se pliega y la voz se lo salta. Queda guardado solo en este aparato.')+'</p><div class="cn-fav-l"></div><div class="cn-fav-a"><button type="button" class="oro" data-a="g">'+(en()?'Save':'Guardar')+'</button><button type="button" data-a="t">'+(en()?'All':'Todas')+'</button><button type="button" data-a="c">'+(en()?'Close':'Cerrar')+'</button></div>';
var L=c.querySelector('.cn-fav-l');secs.forEach(function(s){var l=D.createElement('label'),i=D.createElement('input');i.type='checkbox';i.value=s.id;i.checked=!f||f.indexOf(s.id)>=0;l.appendChild(i);l.appendChild(D.createTextNode(nombre(s)));L.appendChild(l)});
function cerrar(){c.remove();D.removeEventListener('keydown',esc);if(b)b.focus()}function esc(e){if(e.key==='Escape')cerrar()}D.addEventListener('keydown',esc);
c.addEventListener('click',function(e){var a=e.target.getAttribute&&e.target.getAttribute('data-a');if(!a)return;if(a==='c')return cerrar();
if(a==='t'){[].forEach.call(L.querySelectorAll('input'),function(i){i.checked=true});return}
var v=[].filter.call(L.querySelectorAll('input'),function(i){return i.checked}).map(function(i){return i.value});try{if(!v.length||v.length===secs.length)localStorage.removeItem('cn-favs');else{localStorage.setItem('cn-favs',JSON.stringify(v));ev('favoritas_guardadas')}}catch(_){}aplicar();cerrar()});
D.body.appendChild(c);var p=c.querySelector('input');if(p)p.focus()}
var b=null;function rotFav(){if(b)b.innerHTML='☰ '+(en()?'My sections':'Mis secciones')}
if(secs.length>3&&ag){b=D.createElement('button');b.type='button';b.className='cn-favb';b.setAttribute('data-no-tr','');b.setAttribute('translate','no');rotFav();b.onclick=abrir;ag.appendChild(b)}
aplicar();
var SUP={'Laboratorio':'Laboratory','En animales':'In animals','Ensayo clínico':'Clinical trial','Aprobado':'Approved','En uso clínico':'In clinical use'};var MES_ES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],MES_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];function sup(){var e=en();[].forEach.call(D.querySelectorAll('svg text'),function(t){var o=t.__cnO;if(o==null){o=t.textContent.trim();if(!SUP[o])return;t.__cnO=o}t.textContent=e?SUP[o]:o});if(!window.echarts||!echarts.getInstanceByDom)return;[].forEach.call(D.querySelectorAll('div.chart[id]'),function(el){var c=echarts.getInstanceByDom(el);if(!c)return;var op=c.getOption(),hay=false;(op.series||[]).forEach(function(s){var ma=s.markArea;if(!ma||!ma.data)return;ma.data.forEach(function(p){var x=Array.isArray(p)?p[0]:p;if(!x||typeof x.name!=='string')return;var i=MES_ES.indexOf(x.name),j=MES_EN.indexOf(x.name);if(e&&i>=0){x.name=MES_EN[i];hay=true}else if(!e&&j>=0){x.name=MES_ES[j];hay=true}})});if(hay)c.setOption({series:op.series.map(function(s){return{markArea:s.markArea}})})})}function rot(){rotFav();aplicar();rotGc();try{sup()}catch(x){}}D.addEventListener('cofrade-idioma',function(){setTimeout(rot,30)});D.addEventListener('cofrade-idioma-listo',function(){setTimeout(rot,0)});
/* --- Compartir gráfico --- */
var ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
function titulo(el){var c=el.closest('.card,.chart-wrap,figure,section');var h=c&&c.querySelector('h3,h2,figcaption');return ((h&&h.textContent)||el.getAttribute('aria-label')||'Gráfico de Cofrade News').replace(/\\s+/g,' ').trim().slice(0,90)}
function img(src){return new Promise(function(ok,no){var i=new Image();i.onload=function(){ok(i)};i.onerror=no;i.src=src})}
function svgUrl(el){var s=el.querySelector('svg');if(!s)return null;var c=s.cloneNode(true),r=s.getBoundingClientRect();c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',Math.round(r.width));c.setAttribute('height',Math.round(r.height));
return {u:URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml;charset=utf-8'})),w:r.width,h:r.height}}
function armar(el){var t=titulo(el),fecha=(location.pathname.match(/\\d{4}-\\d{2}-\\d{2}/)||[''])[0];var inst=window.echarts&&echarts.getInstanceByDom&&echarts.getInstanceByDom(el),src,w,h;
if(inst){src=inst.getDataURL({type:inst.getDom().querySelector('svg')?'svg':'png',pixelRatio:2,backgroundColor:'#FBF8F2'});w=inst.getWidth();h=inst.getHeight()}else{var s=svgUrl(el);if(!s)return Promise.reject();src=s.u;w=s.w;h=s.h}
return Promise.all([img(src),img('/logo-claro.webp').catch(function(){return null})]).then(function(r){var g=r[0],lg=r[1],W=1200,esc=(W-60)/Math.max(1,w),gh=Math.round(h*esc),H=gh+200;
var cv=D.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');x.fillStyle='#FBF8F2';x.fillRect(0,0,W,H);x.fillStyle='#C9A14A';x.fillRect(0,0,W,8);
x.fillStyle='#1A1406';x.font='700 42px Georgia,serif';x.fillText(t,30,68,W-60);x.drawImage(g,30,100,W-60,gh);
x.fillStyle='#1A1406';x.fillRect(0,H-74,W,74);var lx=30;if(lg){var lh=54,lw=lg.width*lh/lg.height;x.drawImage(lg,30,H-64,lw,lh);lx+=lw+14}x.fillStyle='#C9A14A';x.font='700 30px Georgia,serif';x.textAlign='left';x.fillText('Cofrade News',lx,H-27);
x.fillStyle='#F4EEDF';x.font='600 28px system-ui,sans-serif';x.textAlign='right';x.fillText('www.cofrad.es'+(fecha?' · '+fecha.split('-').reverse().join('-'):''),W-30,H-27);
return new Promise(function(ok){cv.toBlob(function(b){ok({b:b,t:t})},'image/png')})})}
function panel(url,t,blob){var p=D.createElement('div');p.className='cn-gc-p';p.setAttribute('role','dialog');var E=encodeURIComponent,d=URL.createObjectURL(blob);
p.innerHTML='<span>'+(blob.size?(en()?'Image ready:':'Imagen lista:'):(en()?'Share the link:':'Comparte el enlace:'))+'</span>'+(blob.size?'<a class="oro" download="cofrade-news-grafico.png" href="'+d+'">'+(en()?'Download':'Descargar')+'</a>':'')+'<a target="_blank" rel="noopener" href="https://wa.me/?text='+E(t+' · '+url)+'">WhatsApp</a><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url='+E(url)+'">LinkedIn</a><button type="button">✕</button>';
p.querySelector('button').onclick=function(){p.remove()};D.body.appendChild(p);setTimeout(function(){if(p.isConnected)p.remove()},30000)}
function compartir(el,bt){bt.disabled=true;var url=location.origin+location.pathname+'?utm_source=grafico'+(el.id?'#'+el.id:'');
armar(el).then(function(r){var f=new File([r.b],'cofrade-news-grafico.png',{type:'image/png'});ev('compartir_grafico');
if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:r.t,text:r.t+' · '+url}).catch(function(){});panel(url,r.t,r.b)})
.catch(function(){panel(url,titulo(el),new Blob([]))}).finally(function(){bt.disabled=false})}
function principal(el){if(/\d$/.test(el.id)||el.closest('table,li,.cg-panel,.monedas'))return false;var c=el.closest('.card,section');return !c||c.querySelector('div.chart[id]')===el}
function rotUno(bt){bt.innerHTML=ICO+(en()?'Share chart':'Compartir gráfico');bt.setAttribute('aria-label',(en()?'Share chart: ':'Compartir gráfico: ')+titulo(bt.__el))}
function rotGc(){[].forEach.call(D.querySelectorAll('.cn-gc'),function(bt){if(bt.__el)rotUno(bt)})}
// 27-11-2026 (Germán, Sismos: «la tabla con la información detallada debe aparecer al costado derecho... al lado del Mapa»): el botón
// no puede quedar como tercera pieza de una grilla de dos columnas (empujaba la tabla abajo); en ese caso va debajo de la grilla.
function botones(){[].forEach.call(D.querySelectorAll('div.chart[id]'),function(el){if(el.getAttribute('data-gc')||!principal(el))return;var r=el.getBoundingClientRect();if(r.width<240||r.height<160)return;
el.setAttribute('data-gc','1');var w=D.createElement('div');w.className='cn-gcw';var bt=D.createElement('button');bt.type='button';bt.className='cn-gc';
bt.setAttribute('data-no-tr','');bt.setAttribute('translate','no');bt.__el=el;rotUno(bt);bt.onclick=function(){compartir(el,bt)};w.appendChild(bt);var pa=el.parentElement,dp=pa?getComputedStyle(pa).display:'';(/grid|flex/.test(dp)&&pa.parentElement?pa:el).insertAdjacentElement('afterend',w)})}
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){botones();}})},{rootMargin:'200px'});[].forEach.call(D.querySelectorAll('div.chart[id]'),function(el){io.observe(el)})}else botones();
})()</script>`;
