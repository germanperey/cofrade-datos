// 26-11-2026 · Eventos anónimos, sin cookies ni datos personales. Germán, con una revisión externa: «si no sabes qué sección concentra
// el tiempo de lectura, en qué minuto abandonan el audio o qué módulo empuja clics a Socios, estás navegando a ciegas. Incorpora eventos
// anónimos (sin cookies) para ver retención real». El tiempo por sección ya se medía (tabla lectura, «Mapa de calor» del Panel). Esto
// suma: minuto en que se deja el audio, clics a Socios con su origen (banner, botón, portada), compartir un gráfico, suscripciones y
// Telegram. Se guarda SOLO un contador por día y por nombre de evento (tabla eventos): ni IP, ni identificador, ni hora exacta. El
// navegador no guarda nada para medir. Nombres permitidos: lista fija abajo; lo demás se ignora.
const EVENTOS_TABLA = "CREATE TABLE IF NOT EXISTS eventos (fecha TEXT NOT NULL, nombre TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, nombre))";
const EV_OK = /^(audio_inicio|audio_min_(?:[0-9]|[12][0-9]|30)|socios_(?:banner(?:_[a-z]{3,16})?|boton|portada|ventana|otro)|compartir_grafico(?:_[a-z]{3,10})?|suscripcion_correo|telegram|favoritas_guardadas|aguja_vista)$/;
const EV_NOMBRES = {
  audio_inicio: "Empezaron a escuchar el audio", suscripcion_correo: "Dejaron su correo (portada)", telegram: "Abrieron el canal de Telegram",
  compartir_grafico: "Compartieron un gráfico", favoritas_guardadas: "Eligieron sus secciones favoritas", aguja_vista: "Vieron «Lo que mueve la aguja»",
};
async function recibirEventos(req, env) {
  const nada = new Response(null, { status: 204 });
  try {
    if (!env.DB || !ORIGEN_OK(req)) return nada;
    if (!(await bajoLimite(env, "e:" + (await huellaVisitante(req, env, fechaChile(), false))))) return nada;
    const t = await leerCuerpo(req, 2000);
    if (!t) return nada;
    const lista = [...new Set((JSON.parse(t).e || []).map(String).filter((x) => EV_OK.test(x)))].slice(0, 12);
    if (!lista.length) return nada;
    await env.DB.prepare(EVENTOS_TABLA).run();
    const f = fechaChile();
    await env.DB.batch(lista.map((x) => env.DB.prepare("INSERT INTO eventos (fecha, nombre, n) VALUES (?, ?, 1) ON CONFLICT(fecha, nombre) DO UPDATE SET n = n + 1").bind(f, x)));
  } catch { /* nunca molesta al lector */ }
  return nada;
}
// En el navegador: window.cnEv('nombre') junta eventos y los manda al salir o cada 20 s. El audio se mide mirando si suena la voz del
// diario (speechSynthesis o un <audio>), segundo a segundo; al salir se manda el minuto en que se dejó de escuchar.
const EVENTOS_JS = `<script>(function(){if(window.cnEv)return;var q=[];function env(){if(!q.length||!navigator.sendBeacon)return;try{navigator.sendBeacon('/e',JSON.stringify({e:q.splice(0,12)}))}catch(e){}}
window.cnEv=function(n){if(q.indexOf(n)<0)q.push(n);if(q.length>=12)env()};setInterval(env,20000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){cierre();env()}});addEventListener('pagehide',function(){cierre();env()});
var seg=0,ini=false,ult=0;function suena(){try{if(window.speechSynthesis&&speechSynthesis.speaking&&!speechSynthesis.paused)return true}catch(e){}var a=document.querySelectorAll('audio,video');for(var i=0;i<a.length;i++)if(!a[i].paused&&!a[i].ended)return true;return false}
setInterval(function(){if(document.hidden)return;if(suena()){seg++;if(!ini){ini=true;cnEv('audio_inicio')}}},1000);
function cierre(){if(!ini||seg===ult)return;ult=seg;var m=Math.min(30,Math.floor(seg/60));q=q.filter(function(x){return x.indexOf('audio_min_')!==0});q.push('audio_min_'+m)}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href],button');if(!a)return;var h=a.getAttribute('href')||'';
if(/^\\/socios/.test(h)||a.hasAttribute('data-cnb')){var o=(h.match(/[?&]o=banner-([a-z]{3,16})/)||[])[1];cnEv(o?'socios_banner_'+o:a.closest('.lujo,.puente')?'socios_portada':/banner/.test(h)?'socios_banner':'socios_boton')}
var ev=a.getAttribute('data-cn-ev');if(ev)cnEv(ev)},true)})()</script>`;
// Para /panel: eventos del período, con nombres en simple y el abandono del audio por minuto
function bloqueEventos(filas) {
  const n = {}, audio = [];
  for (const r of filas || []) n[r.nombre] = Number(r.n || 0);
  for (let m = 0; m <= 30; m++) if (n["audio_min_" + m]) audio.push([m, n["audio_min_" + m]]);
  const socios = Object.entries(n).filter(([k]) => k.startsWith("socios_")).sort((a, b) => b[1] - a[1]);
  const fila = (a, b) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`;
  const base = Object.entries(EV_NOMBRES).map(([k, t]) => fila(t, n[k] || 0)).join("");
  const so = socios.length ? socios.map(([k, v]) => fila("Clic a Socios · " + k.replace("socios_", "").replace("banner_", "banner ").replace("_", " "), v)).join("") : fila("Clics a Socios", 0);
  const au = audio.length ? audio.map(([m, v]) => fila(m === 0 ? "Dejó el audio antes del minuto 1" : m === 30 ? "Escuchó 30 minutos o más" : `Dejó el audio en el minuto ${m}`, v)).join("")
    : fila("Aún no hay escuchas medidas", "");
  return `<section id="eventos"><h3 class="tit-g">Qué hacen los lectores (anónimo, sin cookies)</h3>
<p class="sub">Contadores por día, sin datos personales. Sirven para ver qué empuja suscripciones y en qué minuto se deja el audio.</p>
<div class="dos d2"><div class="tarjeta"><table class="tabla">${base}${so}</table></div><div class="tarjeta"><table class="tabla">${au}</table></div></div></section>`;
}
