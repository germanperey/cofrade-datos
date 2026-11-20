// 20-11-2026 19:52 · Germán (captura de «7 pilares» en «Avances logrados a igual período»): «falta explicar con alguna ventana
// emergente o nota que las categorías de "Familia" y "Conectividad" abarcan varios temas... "FAMILIA" (Calidad de Vida; Natalidad;
// Cuidado del Adulto Mayor), y "CONECTIVIDAD" (Transporte Público; Transporte Privado; Obras Públicas; Internet). Para ambos casos, se
// debe mostrar qué monto y porcentaje se destinó por cada ítem que lo configura».
// En cada gobierno, las filas «Familia» y «Conectividad» (y sus colores de la leyenda) abren una ventana con su desglose: monto en
// billones de pesos de 2025 y porcentaje de cada partida, más la comparación entre gobiernos. Las cifras salen del mismo archivo de la
// DIPRES con que la Skill arma la tabla (datos/gasto-funcional.json) y con los mismos años por gobierno, así que suman exactamente lo
// que dice la tabla. Lo que la DIPRES no separa se dice en la ventana, sin repartirlo a ojo:
//  · Transporte (7045) es una sola partida: no distingue transporte público, privado y obras públicas.
//  · El cuidado del adulto mayor va dentro de «Edad avanzada» (7102), junto a las pensiones: está en el pilar Pensiones.
const PILARES_CODIGOS = ["707", "706", "7106", "7102", "7105", "7041", "709", "7045", "7046", "7104", "7101", "7107", "708"];

async function apiGastoPilares(ctx) {
  const r = await desdeGitHub("datos/gasto-funcional.json", 3600, ctx);
  if (!r) return { error: "sin datos" };
  const j = await r.json();
  const anios = {};
  for (const [a, v] of Object.entries(j.anios || {})) {
    anios[a] = {};
    for (const c of PILARES_CODIGOS) if (typeof v[c] === "number") anios[a][c] = v[c];
  }
  return { fuente: j.fuente, url: j.url, unidad: j.unidad, anios };
}

const PILARES_JS = `<script>(function(){
var W=document.getElementById('gGobPilares');if(!W)return;
var SUB={Conectividad:[['7045','Transporte y obras públicas','Transporte público y privado, y las obras que conectan el país: caminos, puentes, puertos y aeropuertos','Transport and public works'],['7046','Internet y telecomunicaciones','Comunicaciones','Internet and telecommunications']],
Familia:[['7104','Natalidad, familia e hijos','Asignaciones y apoyos a la familia y a los hijos','Birth rate, family and children'],['708','Calidad de vida: deporte, recreación y cultura','','Quality of life: sport, recreation and culture'],['7101','Discapacidad','Apoyos por enfermedad e incapacidad','Disability'],['7107','Exclusión social','Apoyos a hogares vulnerables','Social exclusion']]};
var NOTA={Conectividad:['La Dirección de Presupuestos publica el transporte en una sola partida: no separa transporte público, transporte privado y obras públicas, así que no se reparte a ojo.','The Budget Office publishes transport as a single item: it does not split public transport, private transport and public works.'],
Familia:['El cuidado del adulto mayor la Dirección de Presupuestos lo cuenta dentro de «Edad avanzada», junto a las pensiones, sin separarlo: por eso está en el pilar Pensiones.','Elderly care is counted by the Budget Office under «Old age», together with pensions, and is not published separately: it sits in the Pensions pillar.']};
var COL={Conectividad:['#0E7C86','#7CC6CD'],Familia:['#C2185B','#E57AA6','#8E1145','#F4B6CF']};
var T7=['707','706','7106','7102','7105','7041','709','7045','7046','7104','7101','7107','708'];
var G=[].slice.call(W.querySelectorAll('.pil-c:not(.pil-sin)')).map(function(c){var n=c.querySelector('.pil-n b'),s=c.querySelector('.pil-n .sub'),m=s&&s.textContent.match(/(\\d{4})\\D+(\\d{4})/);return n&&m?{c:c,n:n.textContent.trim(),a:+m[1],b:+m[2]}:null}).filter(Boolean);
if(!G.length)return;var D=null,abierto=null,volver=null,pil='Familia',gi=G.length-1;
function en(){return /^en/i.test(document.documentElement.lang||'')}
function bill(v){var x=v/1e6;return '$'+x.toLocaleString(en()?'en-US':'es-CL',{minimumFractionDigits:x<0.1?2:1,maximumFractionDigits:x<0.1?2:1})}
function pct(v){return v.toLocaleString(en()?'en-US':'es-CL',{minimumFractionDigits:1,maximumFractionDigits:1})+' %'}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function suma(g,cs){var t=0;for(var y=g.a;y<=g.b;y++){var v=D.anios[String(y)]||{};cs.forEach(function(c){t+=v[c]||0})}return t}
function cerrar(){if(!abierto)return;abierto.remove();abierto=null;document.removeEventListener('keydown',tecla,true);document.documentElement.style.overflow='';if(volver&&volver.focus)volver.focus()}
function tecla(e){if(e.key==='Escape'){e.preventDefault();cerrar()}}
function pintar(){var v=abierto&&abierto.querySelector('.cn-ig-v');if(!v)return;var c=v.querySelector('.cn-ig-cuerpo'),e=en();
if(!D||D.error){c.innerHTML='<p class="cn-ig-msg">'+(e?'The source did not answer just now. Please try again in a few minutes.':'La fuente no respondió en este momento. Intenta de nuevo en unos minutos.')+'</p>';return}
var g=G[gi],S=SUB[pil],cs=S.map(function(s){return s[0]}),tot=suma(g,cs),t7=suma(g,T7);
v.querySelector('h3').textContent=(e?(pil==='Familia'?'Family':'Connectivity'):pil)+' · '+g.n+' '+g.a+'-'+g.b;
var h='<div class="cn-pd-tabs" role="group">'+['Familia','Conectividad'].map(function(p){return '<button type="button" class="vamb" data-p="'+p+'" aria-pressed="'+(p===pil)+'">'+(e?(p==='Familia'?'Family':'Connectivity'):p)+'</button>'}).join('')+'</div>';
h+='<p class="cn-ig-res"><b>'+esc(bill(tot))+(e?' trillion':' billones')+'</b><span>'+esc(pct(t7?100*tot/t7:0))+(e?' of the 7 pillars':' de los 7 pilares')+' · '+(g.b-g.a+1)+(e?' years':' años')+'</span></p>';
h+='<div class="cn-pd-lista">'+S.map(function(s,i){var x=suma(g,[s[0]]),p=tot?100*x/tot:0;return '<div class="cn-pd-f"><div class="cn-pd-e"><span><i style="background:'+COL[pil][i]+'"></i><b>'+esc(e?s[3]:s[1])+'</b>'+(s[2]&&!e?'<small>'+esc(s[2])+'</small>':'')+'</span><span class="cn-pd-v"><b>'+esc(bill(x))+'</b> '+(e?'tn':'bill.')+' · '+esc(pct(p))+'</span></div><span class="cn-pd-p"><span style="width:'+p.toFixed(1)+'%;background:'+COL[pil][i]+'"></span></span></div>'}).join('')+'</div>';
h+='<p class="cn-pd-nota">'+esc(NOTA[pil][e?1:0])+'</p>';
h+='<p class="cn-pd-st">'+(e?'Each government (share of each item within the pillar)':'En cada gobierno (parte de cada ítem dentro del pilar)')+'</p><div class="cn-pd-g">'+G.map(function(x,k){var t=suma(x,cs);return '<button type="button" class="cn-pd-row'+(k===gi?' on':'')+'" data-g="'+k+'" aria-pressed="'+(k===gi)+'"><span class="cn-pd-gn">'+esc(x.n)+'</span><span class="cn-pd-sb">'+S.map(function(s,i){var y=suma(x,[s[0]]),p=t?100*y/t:0;return p>0?'<span title="'+esc((e?s[3]:s[1])+': '+bill(y)+' · '+pct(p))+'" style="width:'+p.toFixed(2)+'%;background:'+COL[pil][i]+'"></span>':''}).join('')+'</span><span class="cn-pd-gt">'+esc(bill(t))+'</span></button>'}).join('')+'</div>';
h+='<p class="cn-ig-pie">'+(e?'Trillions of 2025 pesos, total for the period. Source: ':'Billones de pesos de 2025, total del período. Fuente: ')+'<a href="'+esc(D.url)+'" target="_blank" rel="noopener">'+(e?'Budget Office (DIPRES), functional classification of central government spending':'Dirección de Presupuestos (DIPRES), clasificación funcional del gasto del Gobierno Central')+'</a>.</p>';
c.innerHTML=h;
[].forEach.call(c.querySelectorAll('.cn-pd-tabs button'),function(b){b.onclick=function(){pil=b.dataset.p;pintar()}});
[].forEach.call(c.querySelectorAll('.cn-pd-row'),function(b){b.onclick=function(){gi=+b.dataset.g;pintar()}})}
function abrir(el,p,k){pil=p;gi=k;volver=el;cerrar();volver=el;var e=en(),f=document.createElement('div');f.className='cn-ig-fondo';f.setAttribute('data-no-tr','');f.setAttribute('translate','no');
f.innerHTML='<div class="cn-ig-v cn-pd" role="dialog" aria-modal="true" aria-labelledby="cnPdT"><button type="button" class="cn-ig-x" aria-label="'+(e?'Close':'Cerrar')+'">×</button><h3 id="cnPdT"></h3><div class="cn-ig-cuerpo"><p class="cn-ig-msg">'+(e?'Loading…':'Cargando…')+'</p></div></div>';
f.addEventListener('click',function(ev){if(ev.target===f)cerrar()});f.querySelector('.cn-ig-x').onclick=cerrar;
document.body.appendChild(f);abierto=f;document.documentElement.style.overflow='hidden';document.addEventListener('keydown',tecla,true);f.querySelector('.cn-ig-x').focus();
if(D){pintar();return}fetch('/api/gasto-pilares').then(function(r){return r.json()}).then(function(j){D=j;pintar()}).catch(function(){D={error:1};pintar();D=null})}
function boton(el,p,k){el.classList.add('cn-pd-btn');el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-haspopup','dialog');
el.setAttribute('title',en()?'See what it includes':'Ver qué incluye');el.addEventListener('click',function(ev){ev.stopPropagation();abrir(el,p,k)});
el.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();abrir(el,p,k)}})}
G.forEach(function(g,k){[].forEach.call(g.c.querySelectorAll('.pil-tab tbody tr'),function(tr){var t=(tr.cells[0]&&tr.cells[0].textContent||'').trim();if(t==='Familia'||t==='Conectividad'){var s=document.createElement('span');s.className='cn-pd-i';s.setAttribute('aria-hidden','true');s.textContent='+';tr.cells[0].appendChild(s);boton(tr,t,k)}})});
[].forEach.call(W.querySelectorAll('.pil-ley'),function(l){var t=l.textContent.trim();if(t==='Familia'||t==='Conectividad'){var s=document.createElement('span');s.className='cn-pd-i';s.setAttribute('aria-hidden','true');s.textContent='+';l.appendChild(s);boton(l,t,G.length-1)}});
var q=W.querySelector('details.pil-que');if(q){var n=document.createElement('p');n.className='cn-pd-aviso';n.textContent=en()?'Family and Connectivity group several items: tap them to see each one with its amount and share.':'Familia y Conectividad agrupan varios temas: tócalos (en la tabla o en la leyenda) para ver cada uno con su monto y porcentaje.';W.querySelector('.pil-leyenda')&&W.querySelector('.pil-leyenda').after(n)}
})();<\/script>`;

const PILARES_CSS = `<style id="cnPilD">
#gGobPilares .cn-pd-btn{cursor:pointer;-webkit-tap-highlight-color:transparent}
#gGobPilares tr.cn-pd-btn td{text-decoration:underline dotted rgba(184,137,43,.7);text-underline-offset:3px}
#gGobPilares tr.cn-pd-btn:hover td,#gGobPilares .pil-ley.cn-pd-btn:hover{background:rgba(184,137,43,.10)}
#gGobPilares .cn-pd-btn:focus-visible{outline:3px solid var(--oro,#B8892B);outline-offset:1px}
.cn-pd-i{display:inline-grid;place-items:center;width:15px;height:15px;margin-left:5px;border-radius:50%;background:var(--oro,#B8892B);color:#fff;font:700 12px/1 var(--sans,system-ui,sans-serif);vertical-align:1px}
.cn-pd-aviso{margin:6px 0 0;font:13px/1.45 var(--sans,system-ui,sans-serif);color:var(--gris,#5f6670)}
.cn-pd-tabs{display:flex;gap:8px;margin:2px 0 12px}.cn-pd-tabs .vamb{min-height:40px}
.cn-pd-lista{display:grid;gap:12px;margin:4px 0 10px}
.cn-pd-e{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;font:14px/1.35 var(--sans,system-ui,sans-serif)}
.cn-pd-e i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:0}
.cn-pd-e small{display:block;margin:2px 0 0 17px;color:var(--gris,#5f6670);font-size:12.5px}
.cn-pd-v{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--gris,#5f6670)}.cn-pd-v b{color:var(--tinta,#0B1F3A)}
.cn-pd-p{display:block;height:10px;margin-top:6px;border-radius:999px;background:rgba(11,31,58,.08);overflow:hidden}.cn-pd-p span{display:block;height:100%;border-radius:999px}
.cn-pd-nota{margin:12px 0 0;padding:10px 12px;border-left:3px solid var(--oro,#B8892B);background:rgba(184,137,43,.08);font:13px/1.45 var(--sans,system-ui,sans-serif)}
.cn-pd-st{margin:16px 0 6px;font:700 13.5px/1.3 var(--sans,system-ui,sans-serif)}
.cn-pd-g{display:grid;gap:4px}
.cn-pd-row{display:grid;grid-template-columns:92px 1fr 64px;align-items:center;gap:10px;width:100%;min-height:32px;padding:3px 6px;border:1px solid transparent;border-radius:6px;background:none;color:inherit;font:13px/1.2 var(--sans,system-ui,sans-serif);text-align:left;cursor:pointer}
.cn-pd-row:hover,.cn-pd-row.on{border-color:var(--oro,#B8892B);background:rgba(184,137,43,.08)}.cn-pd-row:focus-visible{outline:3px solid var(--oro,#B8892B)}
.cn-pd-sb{display:flex;gap:2px;height:12px;border-radius:999px;overflow:hidden}.cn-pd-sb span{display:block;min-width:3px}
.cn-pd-gt{text-align:right;font-variant-numeric:tabular-nums}
@media (max-width:480px){.cn-pd-e{flex-direction:column;gap:2px}.cn-pd-row{grid-template-columns:78px 1fr 56px}}
</style>`;
