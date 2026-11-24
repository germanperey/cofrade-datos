// 24-11-2026 · «Ferias, eventos y concursos de emprendimiento» (Germán, 18:09: «Debemos agregar dentro de la sección de
// "Emprendimiento" un subtitulo respecto a varios temas relacionados con "Ferias, Eventos y Concursos de Emprendimiento" (justo antes
// del subtitulo de "Fondos Concursables")»).
// Los datos los arma GitHub cada mañana (herramientas/eventos_emprendimiento.py → datos/eventos-emprendimiento.json y la foto del día en
// datos/eventos/AAAA-MM-DD.json): fichas verificadas con fuente (las que ya pasaron se quitan solas) y las noticias de las últimas tres
// semanas. Aquí se arma el bloque (español e inglés) justo antes de «Fondos concursables»; si la edición no trae Fondos, va al final de
// Emprendimiento. Sin datos válidos la edición queda como salió (nunca un bloque vacío). Desde la edición del 24-11-2026.
const EV_DESDE = "2026-11-24";
const EV_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const EV_MES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EV_TIPO = { feria: ["Feria", "Fair", "Ferias", "Fairs"], evento: ["Evento", "Event", "Eventos", "Events"], concurso: ["Concurso", "Contest", "Concursos", "Contests"] };

function evEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function evDia(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? { a: +m[1], m: +m[2] - 1, d: +m[3], t: Date.UTC(+m[1], +m[2] - 1, +m[3]) } : null; }
function evUrl(u) { return /^https:\/\/[^\s"'<>]+$/.test(String(u || "")) ? String(u) : ""; }

// «2 y 3 de diciembre de 2026», «11 al 16 de enero de 2027», «28 de noviembre al 3 de diciembre de 2026»; en inglés «December 2–3, 2026»
function evRango(i, f, en) {
  const a = evDia(i), b = evDia(f);
  if (!a) return "";
  if (en) {
    if (!b || b.t === a.t) return `${EV_MES_EN[a.m]} ${a.d}, ${a.a}`;
    if (a.a !== b.a) return `${EV_MES_EN[a.m]} ${a.d}, ${a.a} – ${EV_MES_EN[b.m]} ${b.d}, ${b.a}`;
    return a.m === b.m ? `${EV_MES_EN[a.m]} ${a.d}–${b.d}, ${a.a}` : `${EV_MES_EN[a.m]} ${a.d} – ${EV_MES_EN[b.m]} ${b.d}, ${a.a}`;
  }
  if (!b || b.t === a.t) return `${a.d} de ${EV_MES[a.m]} de ${a.a}`;
  if (a.a !== b.a) return `${a.d} de ${EV_MES[a.m]} de ${a.a} al ${b.d} de ${EV_MES[b.m]} de ${b.a}`;
  if (a.m !== b.m) return `${a.d} de ${EV_MES[a.m]} al ${b.d} de ${EV_MES[b.m]} de ${a.a}`;
  return `${a.d} ${b.t - a.t === 86400000 ? "y" : "al"} ${b.d} de ${EV_MES[a.m]} de ${a.a}`;
}
function evMes(iso, en) { const a = evDia(iso); return a ? (en ? `${EV_MES_EN[a.m]} ${a.a}` : `${EV_MES[a.m][0].toUpperCase()}${EV_MES[a.m].slice(1)} de ${a.a}`) : ""; }
function evCorta(iso, en) { const a = evDia(iso); return a ? (en ? `${EV_MES_EN[a.m].slice(0, 3)} ${a.d}` : `${a.d} ${EV_MES[a.m].slice(0, 3)}`) : ""; }

// Estado según la fecha de la edición (una edición pasada muestra lo que valía ese día)
function evEstado(e, hoy, en) {
  const h = evDia(hoy).t, a = evDia(e.inicio), b = evDia(e.fin);
  const dias = a ? Math.round((a.t - h) / 86400000) : null, fin = b ? Math.round((b.t - h) / 86400000) : null;
  if (e.tipo === "concurso") {
    if (dias != null && dias > 0) return { c: "ev-pronto", t: en ? `Opens ${evCorta(e.inicio, en)}` : `Abre el ${evCorta(e.inicio, en)}` };
    if (fin == null) return { c: "ev-ab", t: en ? "Open" : "Postulación abierta" };
    if (fin === 0) return { c: "ev-urge", t: en ? "Closes today" : "Cierra hoy" };
    if (fin <= 7) return { c: "ev-urge", t: en ? `Closes in ${fin} day${fin > 1 ? "s" : ""}` : `Cierra en ${fin} día${fin > 1 ? "s" : ""}` };
    return { c: "ev-ab", t: en ? `Apply by ${evCorta(e.fin, en)}` : `Postula hasta el ${evCorta(e.fin, en)}` };
  }
  if (e.solo_mes) return { c: "ev-pronto", t: en ? "Coming up" : "Próximamente" };   // solo se sabe el mes
  if (dias != null && dias <= 0 && (fin == null ? dias === 0 : fin >= 0)) return { c: "ev-urge", t: en ? "Happening now" : "En curso" };
  if (dias === 1) return { c: "ev-urge", t: en ? "Tomorrow" : "Mañana" };
  if (dias != null && dias <= 14) return { c: "ev-ab", t: en ? `In ${dias} days` : `En ${dias} días` };
  return { c: "ev-pronto", t: en ? "Coming up" : "Próximamente" };
}

// Enlace para agendarlo en Google Calendar (todo el día; Google toma el día final como exclusivo)
function evAgenda(e) {
  const a = evDia(e.inicio);
  if (!a || e.tipo === "concurso" || e.solo_mes) return "";
  const b = evDia(e.fin) || a, f = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.nombre, dates: `${f(a.t)}/${f(b.t + 86400000)}`, details: `${e.desc} ${evUrl(e.url)}`.trim(), location: e.lugar || "" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

function eventosValidos(d, hoy) {
  if (!d || !Array.isArray(d.eventos)) return [];
  return d.eventos.filter((e) => e && EV_TIPO[e.tipo] && e.nombre && evDia(e.inicio) && evUrl(e.url)
    && ((e.fin && evDia(e.fin)) ? e.fin >= hoy : e.inicio >= hoy || (evDia(hoy).t - evDia(e.inicio).t) / 86400000 <= 60))
    .map((e) => [evClave(e, hoy), e]).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : String(x[1].nombre).localeCompare(String(y[1].nombre)))).map((x) => x[1]);
}
// Orden por la próxima fecha que le importa al lector: un concurso abierto, su cierre; uno por abrir o un evento, su inicio; lo que ya está
// en curso va primero (con la fecha de hoy)
function evClave(e, hoy) {
  if (e.tipo === "concurso") return e.inicio > hoy ? e.inicio : e.fin || hoy;
  return e.inicio > hoy ? e.inicio : hoy;
}

function eventosLado(lista, nots, hoy, en) {
  const T = (es, ing) => (en ? ing : es);
  const cuenta = { feria: 0, evento: 0, concurso: 0 };
  lista.forEach((e) => cuenta[e.tipo]++);
  const filtros = `<div class="ev-g" role="group" aria-label="${T("Tipo", "Type")}"><button type="button" class="vamb ev-b" data-v="" aria-pressed="true">${T("Todos", "All")} (${lista.length})</button>`
    + ["feria", "evento", "concurso"].filter((k) => cuenta[k]).map((k) => `<button type="button" class="vamb ev-b" data-v="${k}" aria-pressed="false">${EV_TIPO[k][en ? 3 : 2]} (${cuenta[k]})</button>`).join("") + "</div>";
  const tarjetas = lista.map((e, i) => {
    const st = evEstado(e, hoy, en), ag = evAgenda(e), desc = en ? e.desc_en || e.desc : e.desc;
    const costo = e.costo !== "gratis" ? "" : e.tipo === "concurso" ? `<div class="ev-f"><dt>${T("Postular", "To apply")}</dt><dd>${T("Sin costo", "Free")}</dd></div>`
      : `<div class="ev-f"><dt>${T("Entrada", "Entry")}</dt><dd>${T("Gratuita", "Free")}</dd></div>`;
    return `<article class="ev-card" data-tipo="${evEsc(e.tipo)}"${i >= 6 ? " data-extra hidden" : ""}><p class="ev-inst">${EV_TIPO[e.tipo][en ? 1 : 0]}<span class="ev-est ${st.c}">${evEsc(st.t)}</span></p>`
      + `<h4 class="ev-tit">${evEsc(e.nombre)}</h4><dl class="ev-dl"><div class="ev-f"><dt>${T(e.tipo === "concurso" ? "Postulación" : "Cuándo", e.tipo === "concurso" ? "Applications" : "When")}</dt><dd>`
      + evEsc(e.tipo === "concurso" && e.fin ? T(`Hasta el ${evRango(e.fin, "", en)}`, `Until ${evRango(e.fin, "", en)}`) : e.tipo === "concurso" && !e.fin ? T(`Desde el ${evRango(e.inicio, "", en)}`, `From ${evRango(e.inicio, "", en)}`) : e.solo_mes ? evMes(e.inicio, en) : evRango(e.inicio, e.fin, en))
      + `</dd></div><div class="ev-f"><dt>${T("Dónde", "Where")}</dt><dd>${evEsc(e.lugar)}</dd></div>${costo}</dl><p class="ev-desc">${evEsc(desc)}</p>`
      + `<p class="ev-pie"><a href="${evEsc(evUrl(e.url))}" target="_blank" rel="noopener">${T("Más información", "More info")}</a> <span class="fuente">${T("Fuente", "Source")}: ${evEsc(e.fuente)}</span>`
      + (ag ? ` · <a class="ev-ag" href="${evEsc(ag)}" target="_blank" rel="noopener">${T("Agendar", "Add to calendar")}</a>` : "") + "</p></article>";
  }).join("");
  const mas = lista.length > 6 ? `<button type="button" class="vamb ev-mas">${T(`Ver ${lista.length - 6} más`, `Show ${lista.length - 6} more`)}</button>` : "";
  const notas = nots.length ? `<div class="ev-notas"><p class="ev-h">${T("En las noticias", "In the news")}</p><ul>` + nots.map((n) =>
    `<li><a href="${evEsc(evUrl(n.url))}" target="_blank" rel="noopener">${evEsc(n.titulo)}</a> <span class="fuente">${evEsc(n.medio)} · ${evEsc(evCorta(n.fecha, en))}</span></li>`).join("") + "</ul></div>" : "";
  return `<div class="ev-l" lang="${en ? "en" : "es"}"><h3>${T("Ferias, eventos y concursos de emprendimiento", "Entrepreneurship fairs, events and contests")}</h3>`
    + `<p class="sub">${T(`Las próximas ferias, encuentros y concursos para emprendedores en Chile, ordenados por fecha. Hoy hay <b>${lista.length}</b> por delante.`, `Upcoming fairs, meetups and contests for entrepreneurs in Chile, sorted by date. <b>${lista.length}</b> coming up.`)}</p>`
    + filtros + `<div class="ev-lista">${tarjetas}</div>${mas}<p class="ev-vacio" hidden>${T("No hay de este tipo por ahora.", "None of this type right now.")}</p>${notas}</div>`;
}

function eventosHtml(d, hoy) {
  const lista = eventosValidos(d, hoy);
  if (!lista.length) return "";
  const nots = (Array.isArray(d.noticias) ? d.noticias : []).filter((n) => n && n.titulo && evUrl(n.url) && evDia(n.fecha) && n.fecha <= hoy).slice(0, 4);
  return `<div class="fz ev-bloque" id="eventos" data-no-tr translate="no">${eventosLado(lista, nots, hoy, false)}${eventosLado(lista, nots, hoy, true)}</div>`;
}

async function eventosLeer(fecha, ctx) {
  if (!fecha || fecha < EV_DESDE) return null;
  try {
    // Cada edición lee la foto de su fecha (una edición pasada no cambia). La de hoy, si su foto aún no está, usa el archivo del día.
    const hoy = fechaChile(), neg = new Request("https://cache.cofrad.es/neg/eventos/" + fecha);
    let r = null;
    if (!(await caches.default.match(neg))) {
      r = await desdeGitHub(`datos/eventos/${fecha}.json`, fecha < hoy ? 86400 : 1800, ctx);
      if (!r) ctx.waitUntil(caches.default.put(neg, new Response("0", { headers: { "Cache-Control": "public, max-age=120" } })).catch(() => {}));
    }
    if (!r && fecha === hoy) r = await desdeGitHub("datos/eventos-emprendimiento.json", 1800, ctx);
    if (!r) return null;
    const ver = String(r.headers.get("X-Cn-Fuente") || r.headers.get("X-Cn-Guardado") || "").replace(/[^\w.-]/g, "").slice(0, 40);
    const d = await r.json();
    return d && Array.isArray(d.eventos) ? { d, ver } : null;
  } catch (e) {
    return null;
  }
}

const EV_CSS = `<style id="cnEventos">
.ev-bloque>.ev-l[lang="en"],.ev-bloque.ev-en>.ev-l[lang="es"],html[lang^="en"] .ev-bloque:not(.ev-es)>.ev-l[lang="es"]{display:none}
.ev-bloque.ev-en>.ev-l[lang="en"],html[lang^="en"] .ev-bloque:not(.ev-es)>.ev-l[lang="en"]{display:block}
.ev-bloque{margin:clamp(28px,4vw,44px) 0 clamp(20px,3vw,32px)}
.ev-bloque .ev-g{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}
.ev-bloque .ev-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
.ev-bloque .ev-card{border:1px solid var(--linea,#DDD3BF);border-radius:12px;padding:14px 16px;background:var(--card,#fff);display:flex;flex-direction:column;min-width:0}
.ev-bloque .ev-card[hidden]{display:none}
.ev-bloque .ev-inst{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 6px;font:600 12px/1.3 var(--sans,system-ui,sans-serif);letter-spacing:.04em;text-transform:uppercase;color:var(--gris,#5f6670)}
.ev-bloque .ev-est{flex:none;text-transform:none;letter-spacing:0;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid currentColor}
.ev-bloque .ev-ab{color:#1f7a4d}.ev-bloque .ev-urge{color:#a5531a}.ev-bloque .ev-pronto{color:var(--gris,#5f6670)}
html[data-theme="dark"] .ev-bloque .ev-ab{color:#5fcf95}html[data-theme="dark"] .ev-bloque .ev-urge{color:#f0a868}
.ev-bloque .ev-tit{font:700 17px/1.3 var(--serif,Georgia,serif);color:var(--tinta,#0B1F3A);margin:0 0 8px;overflow-wrap:anywhere}
.ev-bloque .ev-dl{margin:0 0 8px;display:grid;gap:4px}.ev-bloque .ev-f{display:grid;grid-template-columns:6.6em 1fr;gap:8px;font-size:14px;line-height:1.45}
.ev-bloque .ev-f dt{color:var(--gris,#5f6670);margin:0}.ev-bloque .ev-f dd{margin:0;color:var(--tinta,#0B1F3A);overflow-wrap:anywhere}
.ev-bloque .ev-desc{font-size:14.5px;line-height:1.5;margin:0 0 10px;color:var(--tinta,#0B1F3A)}
.ev-bloque .ev-pie{margin:auto 0 0;font-size:13.5px;line-height:1.5}.ev-bloque .ev-pie a{font-weight:600}
.ev-bloque .ev-mas{margin-top:14px}
.ev-bloque .ev-vacio{color:var(--gris,#5f6670);font-size:14px}
.ev-bloque .ev-notas{margin-top:clamp(20px,3vw,28px)}
.ev-bloque .ev-h{font:700 clamp(16px,1.9vw,18px)/1.35 var(--sans,system-ui,sans-serif);color:var(--oro-texto,#8A6416);margin:0 0 6px}
.ev-bloque .ev-notas ul{list-style:none;margin:0;padding:0}.ev-bloque .ev-notas li{padding:9px 0;border-bottom:1px solid var(--linea,#DDD3BF);line-height:1.45}
.ev-bloque .ev-notas li a{color:var(--tinta,#0B1F3A);font-weight:600;text-decoration:none}.ev-bloque .ev-notas li a:hover,.ev-bloque .ev-notas li a:focus-visible{text-decoration:underline}
.ev-bloque .ev-notas .fuente{white-space:nowrap}
@media print{.ev-bloque .ev-g,.ev-bloque .ev-mas,.ev-bloque .ev-ag{display:none}.ev-bloque .ev-card[hidden]{display:flex}}
</style>`;

// En el navegador: filtros por tipo, «Ver más», idioma con el botón EN/ES y el tema en el Índice (antes de «Fondos concursables»)
const EV_JS = `<script>(function(){'use strict';var B=document.getElementById('eventos');if(!B||B.__ev)return;B.__ev=1;var D=document,R=D.documentElement,en=false;
[].forEach.call(B.querySelectorAll('.ev-l'),function(L){var F='',abierto=false,C=[].slice.call(L.querySelectorAll('.ev-card')),M=L.querySelector('.ev-mas'),V=L.querySelector('.ev-vacio');
function pintar(){var n=0;C.forEach(function(c){var ok=!F||c.getAttribute('data-tipo')===F;if(ok)n++;c.hidden=!ok||(!abierto&&n>6)});if(V)V.hidden=n>0;if(M)M.hidden=abierto||n<=6;
[].forEach.call(L.querySelectorAll('.ev-b'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===F))})}
[].forEach.call(L.querySelectorAll('.ev-b'),function(b){b.addEventListener('click',function(){F=b.getAttribute('data-v')||'';pintar()})});
if(M)M.addEventListener('click',function(){abierto=true;pintar()});pintar()});
function ix(){var s=D.querySelector('#cnIdx .ev-ix');if(s)s.textContent=s.getAttribute(en?'data-en':'data-es')}
function idioma(l){en=/^en/i.test(String(l||R.lang||''));B.classList.toggle('ev-en',en);B.classList.toggle('ev-es',!en);ix()}
function indice(){var I=D.getElementById('cnIdx');if(!I)return false;if(I.querySelector('a[data-id="eventos"]'))return true;
var ref=I.querySelector('a[data-id="fondos"]')||I.querySelector('a[data-id="emprendimiento"]');ref=ref&&ref.closest('li');if(!ref)return false;
var li=D.createElement('li'),a=D.createElement('a'),s=D.createElement('span');li.className='cn-sub';li.setAttribute('data-no-tr','');a.href='#eventos';a.setAttribute('data-id','eventos');
s.className='ev-ix';s.setAttribute('data-es','Ferias, eventos y concursos');s.setAttribute('data-en','Fairs, events and contests');a.appendChild(s);li.appendChild(a);
if(ref.querySelector('a[data-id="fondos"]'))ref.parentNode.insertBefore(li,ref);else ref.parentNode.insertBefore(li,ref.nextSibling);ix();return true}
idioma(R.lang);D.addEventListener('cofrade-idioma',function(e){idioma(e&&e.detail)});
if(!indice()){D.addEventListener('DOMContentLoaded',indice);addEventListener('load',indice)}})();</script>`;

function eventosEmpr(fecha, ev) {   // los manejadores para HTMLRewriter; sin datos válidos no cambia nada
  let puesto = false, html = "";
  try { html = ev && ev.d ? eventosHtml(ev.d, fecha) : ""; } catch (e) { html = ""; }
  return {
    cabeza: { element(e) { if (html) e.append(EV_CSS, { html: true }); } },
    fondos: { element(e) { if (!html || puesto) return; puesto = true; e.before(html, { html: true }); } },
    // Si la edición no trae «Fondos concursables», el bloque va al final de Emprendimiento (antes de </section>)
    seccion: { element(e) { if (!html) return; e.onEndTag((t) => { if (!puesto) { puesto = true; t.before(html, { html: true }); } }); } },
    cuerpo: { element(e) { if (html) e.append(EV_JS, { html: true }); } },
  };
}
