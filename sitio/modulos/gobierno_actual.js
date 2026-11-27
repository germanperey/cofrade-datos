// 27-11-2026 · Germán: «revisa también, que toda la sección "2. Política y Actualidad" se esté actualizando diariamente, los avances del
// gobierno, los gráficos, las votaciones Parlamentarias, etc.» y luego «sí al agente de gobierno». Las 8 promesas del gobierno en curso
// salían de un archivo fijo de la Skill (estados al 15-10-2026). Ahora la tarea «Agente de gobierno» las revisa lunes y jueves y las
// guarda en datos/gobierno-actual.json (herramientas/gobierno_actual.py); el sitio pone la versión vigente a la fecha de cada edición
// sobre la tabla del gobierno, el impacto en la ciudadanía, los dos indicadores de avance y la barra del gráfico. En los dos idiomas.
const GOB_RAW = "https://raw.githubusercontent.com/germanperey/cofrade-datos/main/datos/gobierno-actual.json";

async function gobiernoActualJson() {
  const r = await fetch(GOB_RAW, { cf: { cacheTtl: 600, cacheEverything: true } });
  return new Response(r.ok ? r.body : "{}", { status: r.ok ? 200 : 503, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}

const GOBIERNO_JS = "var m=location.pathname.match(/(\\d{4}-\\d{2}-\\d{2})/);if(!m||m[1]<'2026-11-27')return;var ed=m[1];"
  + "var panel=D.querySelector('.gob-panel[data-k=\"kast\"]');if(!panel||!window.fetch)return;"
  + "function esc(t){var d=D.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML}"
  + "function bil(es,en){return '<span class=\"cn-es\" lang=\"es\">'+es+'</span><span class=\"cn-en\" lang=\"en\">'+en+'</span>'}"
  + "function dm(f){return f?f.slice(8,10)+'-'+f.slice(5,7)+'-'+f.slice(0,4):''}var MES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];function dmEn(f){return f?MES[+f.slice(5,7)-1]+' '+(+f.slice(8,10))+', '+f.slice(0,4):''}"
  + "function n(v){return String(v).replace('.',',')}"
  + "fetch('/gobierno-actual.json').then(function(r){return r.json()}).then(function(G){var V=(G.versiones||[]).filter(function(v){return v.fecha<=ed}).pop();if(!V||!V.promesas)return;"
  + "var P=V.promesas,pts=function(l){return P.reduce(function(s,p){return s+((!l||p.tipo==='ley')?({cumplida:1,parcial:.5}[p.estado]||0):0)},0)},IG=pts(false),LE=pts(true);"
  + "var ST={cumplida:['gob-ok','✓ Cumplida','✓ Fulfilled'],parcial:['gob-par','◐ Parcial','◐ Partial'],no:['gob-no','✗ No cumplida','✗ Not fulfilled']};"
  + "var tb=panel.querySelector('table.gob-prom tbody');if(tb){tb.setAttribute('data-no-tr','');tb.setAttribute('translate','no');tb.innerHTML=P.map(function(p){var s=ST[p.estado]||ST.no;"
  + "var f=p.fecha?bil(dm(p.fecha),dmEn(p.fecha)):(p.en_tramite?bil('En trámite','In progress'):bil('Pendiente','Pending'));"
  + "return '<tr><td><span class=\"gob-st '+s[0]+'\">'+bil(s[1],s[2])+'</span>'+(p.estado!=='no'?'<span class=\"gob-ig\">'+bil('a igual período','at the same point')+'</span>':'')+'</td>'"
  + "+'<td><b>'+bil(esc(p.eje),esc(p.eje_en))+'</b><br>'+bil(esc(p.texto),esc(p.texto_en))+'</td><td>'+f+'<br><span class=\"sub\">'+bil(esc(p.instrumento),esc(p.instrumento_en))+'</span></td>'"
  + "+'<td class=\"sub\">'+bil(esc(p.nota),esc(p.nota_en))+' <a href=\"'+esc(p.fuente)+'\" target=\"_blank\" rel=\"noopener\">'+bil('fuente','source')+'</a></td></tr>'}).join('')}"
  + "[].forEach.call(panel.querySelectorAll('.gob-grid b'),function(b){if(/Impacto en la ciudadan/i.test(b.textContent)&&V.impacto){var q=b.parentNode.querySelector('p');if(q){q.setAttribute('data-no-tr','');q.setAttribute('translate','no');q.innerHTML=bil(esc(V.impacto.es),esc(V.impacto.en))}}});"
  + "[].forEach.call(D.querySelectorAll('.gob-kpis .kpi'),function(k){var kn=(k.querySelector('.kn')||{}).textContent||'',kv=k.querySelector('.kv'),kf=k.querySelector('.kf');if(!kv)return;"
  + "if(/a igual per|at the same/i.test(kn)){kv.setAttribute('data-no-tr','');kv.innerHTML=bil(n(IG)+' de 8',IG+' of 8');if(kf){kf.setAttribute('data-no-tr','');kf.innerHTML=bil(Math.round(IG/8*100)+'% de sus 8 promesas emblemáticas',Math.round(IG/8*100)+'% of its 8 flagship promises')}}"
  + "else if(/ley publicada|enacted law|published law/i.test(kn)){kv.setAttribute('data-no-tr','');kv.innerHTML=bil(n(LE)+' de 8',LE+' of 8')}});"
  + "function barra(){var el=D.getElementById('gGobAvance'),c=el&&window.echarts&&echarts.getInstanceByDom(el);if(!c)return;var o=c.getOption(),A=function(x){return Array.isArray(x)?x[0]:x},y=A(o.yAxis),s=A(o.series);if(!y||!s||!y.data)return;"
  + "var i=y.data.indexOf('Kast'),md=window.__gobModo||'igual';if(i<0||!/^(igual|leyes|mandato)$/.test(md)||s.type!=='bar')return;var v=md==='leyes'?LE:IG,d=s.data.slice();"
  + "var it=typeof d[i]==='object'&&d[i]?Object.assign({},d[i]):{};if(it.value===v&&c.__cnGob)return;it.value=v;d[i]=it;"
  + "var tt=A(o.tooltip)||{},fo=tt.formatter;c.__cnGob=1;c.setOption({series:[{data:d}],tooltip:{formatter:function(p){if(p&&p.name==='Kast'){var en=/^en/.test(D.documentElement.lang);"
  + "return '<b>Kast</b>: <b>'+(en?v+' of 8':n(v)+' de 8')+'</b> '+(en?'promises':'promesas')+' ('+Math.round(v/8*100)+'%)<br>'+P.map(function(q){return (q.estado==='cumplida'?'✓':q.estado==='parcial'?'½':'○')+' '+esc(en?q.eje_en:q.eje)}).join('<br>')}"
  + "return typeof fo==='function'?fo.apply(this,arguments):''}}})}"
  + "barra();setInterval(barra,1500)}).catch(function(){})";
