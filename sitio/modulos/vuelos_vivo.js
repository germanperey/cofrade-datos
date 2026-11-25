// 25-11-2026 · Vuelos en vivo (Germán, 00:40: «el Auditor que revisa cada 3 horas debe también actualizar los vuelos aéreos (Salidas y
// Llegadas) colocando el status actualizado de cada vuelo y el horario confirmado»).
// La edición sale a las 07:00 con el estado de esa hora. El pulso de GitHub relee cada 2 horas el tablero público de Flight-Status de
// los 5 aeropuertos y deja datos/vuelos-vivo.json (sitio: /vuelos-vivo.json). En la edición de HOY este script pone, vuelo por vuelo
// (número y hora programada), el estado actual y la hora confirmada, y avisa en cada aeropuerto a qué hora se actualizó; se repite cada
// 10 minutos mientras la página está abierta. En TODAS las ediciones traduce al español los estados que la fuente dejó en inglés
// («Expected», «In Air», «Arrived on …»). Si no hay datos nuevos, la tabla queda tal como salió.
const VUELOS_VIVO_JS = `<script>(function(){'use strict';var D=document,R=D.documentElement;if(!D.getElementById('vuelos')||window.__vv)return;window.__vv=1;
var E={programado:['Programado','Scheduled','#FADA5E','#3B2A00'],retrasado:['Retrasado','Delayed','#A84E0A','#FFFFFF'],cancelado:['Cancelado','Cancelled','#B3261E','#FFFFFF'],
ruta:['En ruta','En route','#1F5FAF','#FFFFFF'],arribado:['Arribado','Arrived','#1E7B4F','#FFFFFF'],embarcando:['Embarcando','Boarding','#1F5FAF','#FFFFFF'],
desviado:['Desviado','Diverted','#B3261E','#FFFFFF'],checkin:['Check-in','Check-in','#56677F','#FFFFFF'],puerta:['Puerta cerrada','Gate closed','#1F5FAF','#FFFFFF'],
sininfo:['Sin información reciente','No recent info','#56677F','#FFFFFF']};
function clave(t){t=String(t||'').toLowerCase().trim();if(!t)return null;if(/cancel/.test(t))return'cancelado';if(/divert/.test(t))return'desviado';if(/delay/.test(t))return'retrasado';
if(/no recent info/.test(t))return'sininfo';if(/board/.test(t))return'embarcando';if(/gate clos|final call/.test(t))return'puerta';if(/check.?in/.test(t))return'checkin';
if(/arriv|landed/.test(t))return'arribado';if(/in air|en ?route|airborne|departed/.test(t))return'ruta';if(/scheduled|expected|on time|estimated/.test(t))return'programado';return null}
var en=function(){return /^en/i.test(R.lang||'')};
function fmtFecha(f){var m=/(\\d{4})-(\\d{2})-(\\d{2})/.exec(f||'');return m?m[3]+'-'+m[2]:''}
function chip(viejo,k,extra,titulo){var e=E[k],s=D.createElement('span');s.className='estado-v vv-chip';s.setAttribute('data-no-tr','');s.setAttribute('translate','no');
s.setAttribute('data-vk',k);if(extra)s.setAttribute('data-vx',extra);s.style.background=e[2];s.style.color=e[3];if(titulo)s.title=titulo;s.textContent=e[en()?1:0]+(extra?' ('+extra+')':'');viejo.replaceWith(s);return s}
function reidioma(){[].forEach.call(D.querySelectorAll('#vuelos .vv-chip'),function(s){var e=E[s.getAttribute('data-vk')];if(!e)return;var x=s.getAttribute('data-vx');s.textContent=e[en()?1:0]+(x?' ('+x+')':'')});
[].forEach.call(D.querySelectorAll('#vuelos .vv-nota'),function(p){p.textContent=p.getAttribute(en()?'data-en':'data-es')});
[].forEach.call(D.querySelectorAll('#vuelos .fv-pref[data-vvh]'),function(p){p.textContent=(en()?'At ':'A las ')+p.getAttribute('data-vvh')+' (Flight-Status)'})}
// 1) estados en inglés que quedaron en la edición → español (todas las ediciones)
function traducir(){[].forEach.call(D.querySelectorAll('#vuelos table.vuelos .estado-v:not(.vv-chip)'),function(s){var t=(s.textContent||'').trim();
if(!/^[A-Za-z][A-Za-z \\-]+( on \\d{4}-\\d{2}-\\d{2})?$/.test(t)||/^(Programado|Retrasado|Cancelado|Arribado|Embarcando|Desviado)$/.test(t))return;var k=clave(t);if(!k)return;
var m=/ on (\\d{4}-\\d{2}-\\d{2})$/.exec(t);chip(s,k,m?fmtFecha(m[1]):'','estado informado por la fuente: '+t)})}
// 2) estado y hora confirmada al momento, solo en la edición de hoy
var F=(location.pathname.match(/\\d{4}-\\d{2}-\\d{2}/)||[''])[0],HOY='';try{HOY=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date())}catch(_){HOY=''}
function hhmm(iso){var m=/T(\\d{2}:\\d{2})/.exec(iso||'');return m?m[1]:''}
function aplicar(d){if(!d||d.fecha!==F||!d.aeropuertos)return;var hora=hhmm(d.generado);
[].forEach.call(D.querySelectorAll('.panel-ciudad[data-grupo=vuelos]'),function(pn){var A=d.aeropuertos[pn.getAttribute('data-k')];if(!A)return;var n=0,ret=0,can=0;
var tb=pn.querySelectorAll('.dos table.vuelos');[['salidas',tb[0]],['llegadas',tb[1]]].forEach(function(par){var M=A[par[0]],t=par[1];if(!M||!t)return;
var porNum={};Object.keys(M).forEach(function(k){var v=k.split('|')[0];porNum[v]=porNum[v]?'*':k});
var filas=[].slice.call(t.tBodies[0]?t.tBodies[0].rows:[]),cuenta={};filas.forEach(function(tr){var b=tr.cells[1]&&tr.cells[1].querySelector('b');if(b){var v=b.textContent.trim();cuenta[v]=(cuenta[v]||0)+1}});
filas.forEach(function(tr){if(tr.cells.length<5)return;var b=tr.cells[1].querySelector('b');if(!b)return;var v=b.textContent.trim(),h=(/(\\d{2}:\\d{2})/.exec(tr.cells[0].textContent)||[])[1];
var k=v+'|'+h,x=M[k];if(!x&&cuenta[v]===1&&porNum[v]&&porNum[v]!=='*')x=M[porNum[v]];if(!x)return;var est=clave(x.e);
if(x.c){var conf=tr.cells[3],firme=est==='ruta'||est==='arribado'||est==='cancelado'||est==='desviado';conf.textContent=x.c;
if(!firme){var e=D.createElement('span');e.className='sub vv-est';e.textContent='est.';conf.appendChild(D.createTextNode(' '));conf.appendChild(e)}
var mk=tr.cells[0],cm=mk.querySelector('.fv-conf-m');if(!cm){cm=D.createElement('span');cm.className='fv-conf-m';mk.appendChild(cm)}cm.textContent='conf. '+x.c;
if(mk.firstChild&&mk.firstChild.nodeType===3)mk.firstChild.textContent=mk.firstChild.textContent.replace(/^≈\\s*/,'');tr.classList.remove('fv-hab')}
var ap=String(pn.getAttribute('data-k')||'').toUpperCase(),dc=tr.cells[2],ib=dc&&dc.querySelector('.iata');if(x.i&&x.l&&ib&&ib.textContent.indexOf('('+ap+')')>=0&&x.i!==ap){dc.textContent='';dc.appendChild(D.createTextNode(x.l+' '));var nb=D.createElement('b');nb.className='iata';nb.textContent='('+x.i+')';dc.appendChild(nb)}
if(est){var ch=tr.querySelector('.estado-v');if(ch)chip(ch,est,'','actualizado a las '+hora+' con Flight-Status');tr.removeAttribute('data-v')}
if(est==='retrasado')ret++;if(est==='cancelado'||est==='desviado')can++;n++})});
if(!n)return;var nota=pn.querySelector('.vv-nota');if(!nota){nota=D.createElement('p');nota.className='sub vv-nota';nota.setAttribute('data-no-tr','');var ref=pn.querySelector('.fv-resumen')||pn.querySelector('.ciudad-tit');if(ref)ref.parentNode.insertBefore(nota,ref.nextSibling)}
nota.setAttribute('data-es','Actualizado a las '+hora+' con Flight-Status: '+n+' vuelos con su estado y hora confirmada'+(ret?' · '+ret+' con retraso':'')+(can?' · '+can+' cancelado(s) o desviado(s)':'')+'. Antes de ir al aeropuerto, confirma con tu aerolínea.');
nota.setAttribute('data-en','Updated at '+hora+' with Flight-Status: '+n+' flights with their status and confirmed time'+(ret?' · '+ret+' delayed':'')+(can?' · '+can+' cancelled or diverted':'')+'. Before going to the airport, check with your airline.');
nota.textContent=nota.getAttribute(en()?'data-en':'data-es');
var bt=D.querySelector('.ciudad-btn[data-grupo=vuelos][data-k="'+pn.getAttribute('data-k')+'"] .mf');if(bt&&!bt.hasAttribute('data-vv0'))bt.setAttribute('data-vv0',bt.textContent);
if(bt){var base=bt.getAttribute('data-vv0').replace(/\\s*·\\s*\\d+ con retraso.*$/,'');bt.textContent=base+(ret?' · '+ret+' con retraso':'')}
var r=pn.querySelector('.fv-c-ruta'),a=pn.querySelector('.fv-c-arr'),p=pn.querySelector('.fv-pref');var c=function(t,k){return t?[].filter.call(t.querySelectorAll('.estado-v'),function(s){return s.getAttribute('data-vk')===k||(!s.classList.contains('vv-chip')&&s.textContent.trim().indexOf(E[k][0])===0)}).length:0};
if(r)r.textContent=c(tb[0],'ruta');if(a)a.textContent=c(tb[1],'arribado');if(p){p.setAttribute('data-vvh',hora);p.setAttribute('data-no-tr','');p.textContent=(en()?'At ':'A las ')+hora+' (Flight-Status)'}})}
function leer(){if(!F||F!==HOY||!window.fetch)return;fetch('/vuelos-vivo.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){try{aplicar(d)}catch(e){try{console.warn('Vuelos en vivo:',e)}catch(_){}}}).catch(function(){})}
function iniciar(){try{traducir()}catch(e){}leer();setInterval(leer,600000)}
D.addEventListener('cofrade-idioma',function(){setTimeout(reidioma,0)});
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',iniciar);else iniciar()})();</script>`;
