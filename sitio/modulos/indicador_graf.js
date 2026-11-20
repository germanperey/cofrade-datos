// 20-11-2026 19:17 · Germán: en «9. Indicadores económicos», «al clickear encima con el cursor deberá aparecer una ventana emergente con
// un gráfico que muestre todas las variaciones que ese indicador ha experimentado en el mes, similar al diseño de los gráficos que
// aparecen al comienzo del Newsletter en la sección "Indicadores y monedas"».
// Cada tarjeta se vuelve un botón (mouse, dedo o teclado) que abre una ventana con el gráfico, en el dorado de «Indicadores y monedas».
// Datos, siempre de la misma fuente que la tarjeta y nunca inventados:
//  · Diarios (UF, dólar, euro, cobre, TPM): el último mes del Banco Central (datos/historia.json, que el robot de datos baja cada 30 min).
//  · Mensuales (UTM, IPC del mes, IPC 12 meses): los últimos 13 meses del Banco Central (misma historia; si aún no están, mindicador.cl).
//    Un dato mensual no varía dentro del mes: por eso se muestra su recorrido de 13 meses, y la ventana lo dice.
//  · IMACEC y desempleo: los últimos 13 meses de mindicador.cl (Banco Central e INE), la misma fuente que cita la tarjeta.
//  · Bitcoin: el último mes de cierres diarios de Coinbase (la fuente de la tarjeta).
// Si una fuente no responde, la ventana lo dice en una línea; nunca dibuja una serie inventada ni rellena huecos.
const IND = {
  uf: { n: "UF", en: "UF", h: "uf", pre: "$", dec: 2, f: "Banco Central de Chile" },
  dolar: { n: "Dólar observado", en: "Observed dollar", h: "dolar", pre: "$", dec: 2, f: "Banco Central de Chile" },
  euro: { n: "Euro", en: "Euro", h: "euro", pre: "$", dec: 2, f: "Banco Central de Chile" },
  cobre: { n: "Libra de cobre", en: "Copper (per pound)", h: "cobre", pre: "US$", dec: 2, f: "Banco Central de Chile" },
  tpm: { n: "TPM", en: "Monetary policy rate", h: "tpm", suf: "%", dec: 2, f: "Banco Central de Chile", pp: 1 },
  utm: { n: "UTM", en: "UTM", h: "utm", md: "utm", pre: "$", dec: 0, f: "Banco Central de Chile", mes: 1 },
  ipc: { n: "IPC del mes", en: "CPI, monthly change", h: "ipc", md: "ipc", suf: "%", dec: 1, f: "Banco Central de Chile", mes: 1, pp: 1 },
  ipc12: { n: "IPC 12 meses", en: "CPI, 12-month change", h: "ipc12", suf: "%", dec: 1, f: "Banco Central de Chile", mes: 1, pp: 1 },
  imacec: { n: "IMACEC", en: "IMACEC", md: "imacec", suf: "%", dec: 1, f: "Banco Central de Chile vía mindicador.cl", mes: 1, pp: 1 },
  desempleo: { n: "Desempleo", en: "Unemployment", md: "tasa_desempleo", suf: "%", dec: 1, f: "INE vía mindicador.cl", mes: 1, pp: 1 },
  bitcoin: { n: "Bitcoin", en: "Bitcoin", pre: "US$", dec: 0, f: "Coinbase", cb: 1 },
};

async function traerJson(url, ttl) {
  const r = await fetch(url, { headers: { "User-Agent": "CofradeNews/1.0 (+https://www.cofrad.es)", Accept: "application/json" },
    cf: { cacheTtl: ttl, cacheEverything: true }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

const diaIso = (f) => String(f || "").slice(0, 10);
function ultimoMes(p) {   // del mismo día del mes anterior al último dato, hasta el último dato
  if (!p.length) return p;
  const u = new Date(p[p.length - 1][0] + "T12:00:00Z");
  u.setUTCMonth(u.getUTCMonth() - 1);
  const d = u.toISOString().slice(0, 10);
  return p.filter((x) => x[0] >= d);
}

async function apiIndicador(k, h) {
  const c = IND[k];
  if (!c) return { error: "indicador desconocido" };
  let p = [], fuente = c.f;
  const S = (h && h.series) || {};
  if (c.h && S[c.h] && Array.isArray(S[c.h].datos) && S[c.h].datos.length > 1) {
    p = S[c.h].datos.map((x) => [diaIso(x[0]), Number(x[1])]).filter((x) => isFinite(x[1]));
  } else if (k === "ipc12" && S.ipc && Array.isArray(S.ipc.datos) && S.ipc.datos.length >= 13) {
    // Sin la serie a 12 meses del Banco Central: se encadenan sus 12 variaciones mensuales del IPC, mes a mes (solo con 12 meses seguidos).
    const m = S.ipc.datos.map((x) => [diaIso(x[0]), Number(x[1])]).filter((x) => isFinite(x[1])).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const mesN = (f) => Number(f.slice(0, 4)) * 12 + Number(f.slice(5, 7));
    for (let i = 11; i < m.length; i++) {
      if (mesN(m[i][0]) - mesN(m[i - 11][0]) !== 11) continue;
      let f = 1; for (let j = i - 11; j <= i; j++) f *= 1 + m[j][1] / 100;
      p.push([m[i][0], Math.round((f - 1) * 1000) / 10]);
    }
    fuente = "Banco Central de Chile (12 variaciones mensuales del IPC encadenadas por Cofrade News)";
  } else if (c.md) {
    const j = await traerJson(`https://mindicador.cl/api/${c.md}`, 3600).catch(() => null);
    p = ((j && j.serie) || []).map((x) => [diaIso(x.fecha), Number(x.valor)]).filter((x) => x[0] && isFinite(x[1]));
    fuente = c.md === "tasa_desempleo" ? c.f : (c.h ? "Banco Central de Chile vía mindicador.cl" : c.f);
  } else if (c.cb) {
    const j = await traerJson("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400", 1800).catch(() => null);
    p = (Array.isArray(j) ? j : []).map((x) => [new Date(x[0] * 1000).toISOString().slice(0, 10), Number(x[4])]).filter((x) => isFinite(x[1]));
  }
  p.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  p = p.filter((x, i) => i === 0 || x[0] !== p[i - 1][0]);
  p = c.mes ? p.slice(-13) : ultimoMes(p);
  if (p.length < 2) return { error: "sin datos" };
  return { k, nombre: c.n, nombre_en: c.en, pre: c.pre || "", suf: c.suf || "", dec: c.dec, mensual: !!c.mes, pp: !!c.pp, fuente, puntos: p };
}

const INDG_CSS = `<style id="cnIndG">
#indicadores .kpi.cn-ig{cursor:pointer;position:relative;transition:border-color .15s,box-shadow .15s,transform .15s;-webkit-tap-highlight-color:transparent}
#indicadores .kpi.cn-ig:hover{border-color:var(--oro,#B8892B);box-shadow:0 4px 14px rgba(11,31,58,.10)}
#indicadores .kpi.cn-ig:focus-visible{outline:3px solid var(--oro,#B8892B);outline-offset:2px}
#indicadores .kpi.cn-ig:active{transform:scale(.985)}
#indicadores .kpi.cn-ig::after{content:"";position:absolute;top:10px;right:10px;width:16px;height:16px;opacity:.55;background:currentColor;color:var(--oro,#B8892B);
-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M1 13l4-5 3 3 6-8' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;
mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M1 13l4-5 3 3 6-8' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat}
#indicadores .kpi.cn-ig:hover::after{opacity:1}
.cn-ig-fondo{position:fixed;inset:0;z-index:2147483000;background:rgba(11,31,58,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:cnIgF .18s ease-out}
.cn-ig-v{position:relative;width:min(720px,100%);max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;background:var(--card,#fff);color:var(--tinta,#0B1F3A);border:1px solid var(--linea,#DDD3BF);border-top:3px solid var(--oro,#B8892B);border-radius:10px;padding:20px 20px 16px;box-shadow:0 18px 50px rgba(11,31,58,.28);animation:cnIgV .22s cubic-bezier(.2,.8,.2,1)}
.cn-ig-v h3{margin:0 44px 4px 0;font:700 clamp(18px,2.4vw,21px)/1.25 var(--serif,Georgia,serif)}
.cn-ig-res{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin:2px 0 10px;font:14px/1.4 var(--sans,system-ui,sans-serif);color:var(--gris,#5f6670)}
.cn-ig-res b{font-size:22px;color:var(--tinta,#0B1F3A);font-variant-numeric:tabular-nums}
.cn-ig-res .sube{color:#1E7B4F;font-weight:700}.cn-ig-res .baja{color:#B3261E;font-weight:700}
.cn-ig-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:var(--gris,#5f6670);font-size:26px;line-height:1;cursor:pointer}
.cn-ig-x:hover{background:rgba(184,137,43,.14);color:var(--tinta,#0B1F3A)}.cn-ig-x:focus-visible{outline:3px solid var(--oro,#B8892B)}
.cn-ig-g{position:relative;touch-action:pan-y}.cn-ig-g svg{display:block;width:100%;height:auto;overflow:visible}
.cn-ig-tt{position:absolute;pointer-events:none;z-index:2;padding:6px 9px;border-radius:6px;background:var(--tinta,#0B1F3A);color:#fff;font:12.5px/1.35 var(--sans,system-ui,sans-serif);white-space:nowrap;transform:translate(-50%,-115%);display:none}
.cn-ig-pie{margin:8px 0 0;font:12.5px/1.4 var(--sans,system-ui,sans-serif);color:var(--gris,#5f6670)}
.cn-ig-msg{padding:40px 0;text-align:center;color:var(--gris,#5f6670);font:15px/1.5 var(--sans,system-ui,sans-serif)}
:root[data-theme=dark] .cn-ig-res .sube{color:#5BC793}:root[data-theme=dark] .cn-ig-res .baja{color:#FF8A80}
:root[data-theme=dark] .cn-ig-tt{background:#E6C77A;color:#0B1F3A}
@keyframes cnIgF{from{opacity:0}}@keyframes cnIgV{from{opacity:0;transform:translateY(10px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.cn-ig-fondo,.cn-ig-v{animation:none}#indicadores .kpi.cn-ig{transition:none}}
@media print{#indicadores .kpi.cn-ig::after,.cn-ig-fondo{display:none}}
</style>`;

const INDG_JS = `<script>(function(){
var K=[].slice.call(document.querySelectorAll('#indicadores .kpi'));if(!K.length)return;
var MAPA=[[/^UF$/i,'uf'],[/d[oó]lar/i,'dolar'],[/^euro/i,'euro'],[/^UTM/i,'utm'],[/cobre/i,'cobre'],[/^TPM/i,'tpm'],[/IPC.*12/i,'ipc12'],[/^IPC/i,'ipc'],[/IMACEC/i,'imacec'],[/desempleo|desocupa/i,'desempleo'],[/bitcoin/i,'bitcoin']];
var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],MESEN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var cache={},abierto=null,volver=null;
function en(){return /^en/i.test(document.documentElement.lang||'')}
function num(v,d){return Number(v).toLocaleString(en()?'en-US':'es-CL',{minimumFractionDigits:d,maximumFractionDigits:d})}
function val(s,v){return (s.pre?s.pre+' ':'')+num(v,s.dec)+(s.suf||'')}
function fecha(s,f){var p=f.split('-');return s.mensual?(en()?MESEN:MES)[+p[1]-1]+' '+p[0]:p[2]+'-'+p[1]+'-'+p[0]}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function cerrar(){if(!abierto)return;abierto.remove();abierto=null;document.removeEventListener('keydown',tecla,true);document.documentElement.style.overflow='';if(volver&&volver.focus)volver.focus()}
function tecla(e){if(e.key==='Escape'){e.preventDefault();cerrar()}else if(e.key==='Tab'&&abierto){var f=abierto.querySelectorAll('button');if(f.length===1){e.preventDefault();f[0].focus()}}}
function dibujar(box,s){var P=s.puntos,W=Math.max(300,Math.round(box.clientWidth||640)),H=W<520?250:280,L=58,R=14,T=26,B=34,n=P.length,vs=P.map(function(p){return p[1]});
var mn=Math.min.apply(0,vs),mx=Math.max.apply(0,vs);if(mn===mx){mn-=Math.abs(mn)*.01||1;mx+=Math.abs(mx)*.01||1}var pad=(mx-mn)*.12;mn-=pad;mx+=pad;
if(s.pp&&mn>0&&vs.every(function(v){return v>=0})&&mn<(mx-mn)*.25)mn=0;
var x=function(i){return L+(W-L-R)*(n===1?0:i/(n-1))},y=function(v){return T+(H-T-B)*(1-(v-mn)/(mx-mn))};
var g='',i,tk=4;for(i=0;i<=tk;i++){var v=mn+(mx-mn)*i/tk,yy=y(v).toFixed(1);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="currentColor" stroke-opacity=".12"/><text x="'+(L-8)+'" y="'+yy+'" dy=".32em" text-anchor="end" font-size="11" fill="currentColor" fill-opacity=".7">'+esc(num(v,s.dec>1&&Math.abs(mx-mn)>50?0:s.dec))+'</text>'}
if(mn<0&&mx>0){var y0=y(0).toFixed(1);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y0+'" y2="'+y0+'" stroke="currentColor" stroke-opacity=".45"/>'}
var meses=[],cur=null;P.forEach(function(p,i){var m=p[0].slice(0,7);if(!s.mensual&&m!==cur){meses.push(i);cur=m}});
if(!s.mensual)meses.forEach(function(a,j){var b=j+1<meses.length?meses[j+1]-1:n-1,x1=j?(x(a-1)+x(a))/2:L,x2=b<n-1?(x(b)+x(b+1))/2:W-R;g+='<rect x="'+x1.toFixed(1)+'" y="'+T+'" width="'+Math.max(0,x2-x1).toFixed(1)+'" height="'+(H-T-B)+'" fill="'+(j%2?'rgba(184,137,43,.08)':'rgba(11,31,58,.04)')+'"/><text x="'+((x1+x2)/2).toFixed(1)+'" y="'+(T-9)+'" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".7">'+esc((en()?MESEN:MES)[+P[a][0].slice(5,7)-1])+'</text>'});
var paso=Math.max(1,Math.ceil(n/(innerWidth<560?5:8)));for(i=0;i<n;i+=paso)g+='<text x="'+x(i).toFixed(1)+'" y="'+(H-B+18)+'" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".7">'+esc(s.mensual?fecha(s,P[i][0]):P[i][0].slice(8,10)+'-'+P[i][0].slice(5,7))+'</text>';
var d=P.map(function(p,i){return(i?'L':'M')+x(i).toFixed(1)+' '+y(p[1]).toFixed(1)}).join(''),base=y(Math.max(mn,Math.min(mx,s.pp&&mn<0?0:mn))).toFixed(1);
var id='cnIgA'+Math.random().toString(36).slice(2,7);
g+='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8892B" stop-opacity=".32"/><stop offset="1" stop-color="#B8892B" stop-opacity=".02"/></linearGradient></defs>';
g+='<path d="'+d+'L'+x(n-1).toFixed(1)+' '+base+'L'+x(0).toFixed(1)+' '+base+'Z" fill="url(#'+id+')"/><path d="'+d+'" fill="none" stroke="#B8892B" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
if(s.mensual||n<=16)P.forEach(function(p,i){g+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p[1]).toFixed(1)+'" r="3.5" fill="#B8892B" stroke="var(--card,#fff)" stroke-width="2"/>'});
g+='<line class="cn-ig-cx" y1="'+T+'" y2="'+(H-B)+'" stroke="#B8892B" stroke-opacity=".55" stroke-dasharray="3 3" style="display:none"/><circle class="cn-ig-pt" r="5.5" fill="#B8892B" stroke="var(--card,#fff)" stroke-width="2.5" style="display:none"/>';
box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc((en()?s.nombre_en:s.nombre)+': '+fecha(s,P[0][0])+' '+val(s,P[0][1])+' → '+fecha(s,P[n-1][0])+' '+val(s,P[n-1][1]))+'">'+g+'</svg><div class="cn-ig-tt" role="status"></div>';
var svg=box.firstChild,tt=box.lastChild,cx=svg.querySelector('.cn-ig-cx'),pt=svg.querySelector('.cn-ig-pt');
function mostrar(i){var X=x(i),Y=y(P[i][1]);cx.setAttribute('x1',X);cx.setAttribute('x2',X);cx.style.display='';pt.setAttribute('cx',X);pt.setAttribute('cy',Y);pt.style.display='';
var r=svg.getBoundingClientRect(),k=r.width/W;tt.innerHTML=esc(fecha(s,P[i][0]))+'<br><b>'+esc(val(s,P[i][1]))+'</b>';tt.style.display='block';
var lx=X*k,w=tt.offsetWidth/2;tt.style.left=Math.max(w,Math.min(r.width-w,lx))+'px';tt.style.top=(Y*k)+'px'}
function mover(e){var r=svg.getBoundingClientRect(),X=(e.clientX-r.left)*W/r.width,i=Math.round((X-L)/((W-L-R)/Math.max(1,n-1)));mostrar(Math.max(0,Math.min(n-1,i)))}
svg.addEventListener('pointermove',mover);svg.addEventListener('pointerdown',mover);svg.addEventListener('pointerleave',function(){tt.style.display='none';cx.style.display='none';pt.style.display='none'});
mostrar(n-1)}
function pintar(v,s,nom){var c=v.querySelector('.cn-ig-cuerpo'),e=en();
if(!s||s.error||!s.puntos){c.innerHTML='<p class="cn-ig-msg">'+(e?'The source did not answer just now. Please try again in a few minutes.':'La fuente no respondió en este momento. Intenta de nuevo en unos minutos.')+'</p>';return}
var P=s.puntos,a=P[0][1],b=P[P.length-1][1],dif=s.pp?b-a:(a?(b/a-1)*100:0),cl=dif>0?'sube':dif<0?'baja':'',sg=dif>0?'+':dif<0?'−':'';
var per=s.mensual?(e?'last 13 months':'últimos 13 meses'):(e?'last month':'último mes');
c.innerHTML='<p class="cn-ig-res"><b>'+esc(val(s,b))+'</b><span>'+esc(fecha(s,P[P.length-1][0]))+'</span><span class="'+cl+'">'+sg+esc(num(Math.abs(dif),s.pp?2:2))+(s.pp?(e?' pts':' pts'):' %')+'</span><span>'+(e?'vs ':'vs ')+esc(fecha(s,P[0][0]))+' · '+per+'</span></p><div class="cn-ig-g"></div>'
+'<p class="cn-ig-pie">'+(s.mensual?(e?'Monthly figure: it is published once a month, so the chart shows its path over the last 13 months. ':'Dato mensual: se publica una vez al mes, por eso el gráfico muestra su recorrido de los últimos 13 meses. '):(e?'Each point is a business day. ':'Cada punto es un día hábil. '))+(e?'Touch or hover the line to see each value. Source: ':'Toca o pasa el cursor por la línea para ver cada valor. Fuente: ')+esc(s.fuente)+'.</p>';
dibujar(c.querySelector('.cn-ig-g'),s)}
function abrir(kpi,k){volver=kpi;cerrar();volver=kpi;var nom=(kpi.querySelector('.kn')||{}).textContent||'',e=en();
var f=document.createElement('div');f.className='cn-ig-fondo';f.setAttribute('data-no-tr','');f.setAttribute('translate','no');
f.innerHTML='<div class="cn-ig-v" role="dialog" aria-modal="true" aria-labelledby="cnIgT"><button type="button" class="cn-ig-x" aria-label="'+(e?'Close':'Cerrar')+'">×</button><h3 id="cnIgT">'+esc(nom)+'</h3><div class="cn-ig-cuerpo"><p class="cn-ig-msg">'+(e?'Loading…':'Cargando…')+'</p></div></div>';
f.addEventListener('click',function(ev){if(ev.target===f)cerrar()});f.querySelector('.cn-ig-x').onclick=cerrar;
document.body.appendChild(f);abierto=f;document.documentElement.style.overflow='hidden';document.addEventListener('keydown',tecla,true);f.querySelector('.cn-ig-x').focus();
var v=f.querySelector('.cn-ig-v');
if(cache[k]){pintar(v,cache[k],nom);return}
fetch('/api/indicador/'+k).then(function(r){return r.json()}).then(function(s){if(s&&!s.error)cache[k]=s;if(abierto===f)pintar(v,s,nom)}).catch(function(){if(abierto===f)pintar(v,null,nom)})}
K.forEach(function(kpi){var nom=((kpi.querySelector('.kn')||{}).textContent||'').trim(),k=null;MAPA.some(function(m){if(m[0].test(nom)){k=m[1];return true}});if(!k)return;
kpi.classList.add('cn-ig');kpi.setAttribute('role','button');kpi.setAttribute('tabindex','0');kpi.setAttribute('aria-haspopup','dialog');
kpi.setAttribute('title',en()?'See the chart':'Ver el gráfico');
kpi.addEventListener('click',function(){abrir(kpi,k)});kpi.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();abrir(kpi,k)}})});
})();<\/script>`;
