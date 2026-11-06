// Cofrade News · www.cofrad.es (Cloudflare Worker, plan gratuito). 06-11-2026.
// Portada con la edición del día, la franja «En vivo» (pulso de GitHub cada 2 horas), el archivo y el área de socios.
// Las ediciones y el pulso se leen del repositorio público germanperey/cofrade-datos: este programa no guarda datos propios.
// Secreto opcional SOCIOS_CLAVE (Cloudflare → Workers & Pages → cofrade-news-web → Settings → Variables and Secrets).
// © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).

const RAW = "https://raw.githubusercontent.com/germanperey/cofrade-datos/main/";
const DOMINIO = "www.cofrad.es";
const FORMULARIO = "__FORMULARIO__";
const LOGO_CLARO = "__LOGO_CLARO__";
const LOGO_OSCURO = "__LOGO_OSCURO__";
const DIAS_ARCHIVO = 21;
const TZ = "America/Santiago";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlSegura = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#");

function fechaChile(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // AAAA-MM-DD
}
function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 15));
  const t = new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(f);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function num(v, dec = 2) {
  return new Intl.NumberFormat("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
function pct(v) {
  if (typeof v !== "number" || !isFinite(v)) return "";
  const s = (v > 0 ? "+" : v < 0 ? "−" : "") + num(Math.abs(v), 2) + " %";
  return `<span class="var ${v > 0 ? "sube" : v < 0 ? "baja" : ""}">${s}</span>`;
}

const SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
const CSP_PORTADA = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://script.google.com";

function html(cuerpo, status = 200, extra = {}) {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP_PORTADA, "X-Frame-Options": "DENY", ...SEGURIDAD, ...extra },
  });
}

// ---------- lectura del repositorio con caché del borde (rápido y sin abusar de GitHub) ----------
async function desdeGitHub(ruta, segundos, ctx) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/" + ruta);
  let r = await cache.match(clave);
  if (r) return r;
  const o = await fetch(RAW + ruta, { cf: { cacheTtl: segundos, cacheEverything: true } });
  if (!o.ok) return null;
  r = new Response(o.body, { headers: { "Cache-Control": `public, max-age=${segundos}` } });
  ctx.waitUntil(cache.put(clave, r.clone()));
  return r;
}

async function indice(ctx) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/indice-ediciones");
  const c = await cache.match(clave);
  if (c) return c.json();
  const hoy = new Date();
  const fechas = Array.from({ length: DIAS_ARCHIVO }, (_, i) => fechaChile(new Date(hoy.getTime() - i * 86400000)));
  const ok = await Promise.all(fechas.map(async (f) => {
    try {
      const r = await fetch(RAW + `ediciones/Cofrade-News-${f}.html`, { method: "HEAD" });
      return r.ok ? f : null;
    } catch { return null; }
  }));
  const lista = ok.filter(Boolean);
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(lista), { headers: { "Cache-Control": "public, max-age=900" } })));
  return lista;
}

async function pulso(ctx) {
  try {
    const r = await desdeGitHub("datos/pulso.json", 300, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}

// ---------- área de socios: clave compartida, cookie firmada (HMAC-SHA256) ----------
async function firma(texto, secreto) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
async function esSocio(req, env) {
  if (!env.SOCIOS_CLAVE) return false;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)cn_socio=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return iguales(m[2], await firma("socio|" + m[1], env.SOCIOS_CLAVE));
}

// ---------- páginas ----------
const CSS = `
:root{--tinta:#0B1F3A;--tinta2:#23395B;--oro:#B8892B;--oro-t:#8A6416;--papel:#FBF8F1;--linea:#DDD3BF;--gris:#5B6472;--verde:#1E7B4F;--rojo:#B3261E;--card:#FFFFFF;
--serif:'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;--sans:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--tinta:#E9EEF6;--tinta2:#C9D3E3;--papel:#0E1522;--linea:#2A3547;--gris:#9AA6B8;--card:#152033;--oro:#D9AE52;--oro-t:#D9AE52;--verde:#4CC38A;--rojo:#F2867E}}
:root[data-theme=dark]{--tinta:#E9EEF6;--tinta2:#C9D3E3;--papel:#0E1522;--linea:#2A3547;--gris:#9AA6B8;--card:#152033;--oro:#D9AE52;--oro-t:#D9AE52;--verde:#4CC38A;--rojo:#F2867E}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--papel);color:var(--tinta);font:17px/1.6 var(--sans)}
a{color:inherit}.hoja{max-width:1120px;margin:0 auto;padding:0 16px}
.cab{border-bottom:3px double var(--linea)}.cab .hoja{display:flex;align-items:center;gap:14px;padding-top:14px;padding-bottom:10px;flex-wrap:wrap}
.marca{display:flex;align-items:center;gap:12px;text-decoration:none}.marca img{width:52px;height:52px}
.marca b{font:600 clamp(26px,5vw,38px)/1 var(--serif);letter-spacing:.2px}.fecha{color:var(--gris);font-size:14px}
.l-oscuro{display:none}:root[data-theme=dark] .l-claro{display:none}:root[data-theme=dark] .l-oscuro{display:inline}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .l-claro{display:none}:root:not([data-theme=light]) .l-oscuro{display:inline}}
nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}nav a,.tema{font-size:14px;text-decoration:none;padding:8px 10px;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;background:none;border:0;color:inherit;cursor:pointer}
nav a:hover,.tema:hover{background:var(--card)}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
.portada{display:grid;grid-template-columns:1.25fr 1fr;gap:40px;padding:44px 0 28px;align-items:center}
.kicker{font:600 13px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t)}
h1{font:600 clamp(32px,5.4vw,56px)/1.06 var(--serif);margin:12px 0 16px;text-wrap:balance}
.lede{font-size:19px;color:var(--tinta2);max-width:36em}
.acciones{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.btn{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;font-weight:600;text-decoration:none;transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s}
.btn.oro{background:var(--oro);color:#1A1406;box-shadow:0 6px 18px -8px rgba(184,137,43,.8)}.btn.oro:hover{transform:translateY(-1px)}.btn.oro:active{transform:translateY(0)}
.btn.linea{border:1.5px solid var(--linea)}.btn.linea:hover{border-color:var(--oro)}
.tarjeta{background:var(--card);border:1px solid var(--linea);border-radius:18px;padding:22px}
.edicion h2{font:600 24px/1.2 var(--serif);margin:6px 0 10px}.edicion ul{margin:12px 0 0;padding:0;list-style:none;columns:2;column-gap:20px;font-size:14px;color:var(--gris)}
.edicion li{break-inside:avoid;padding:3px 0}.edicion li::before{content:"·";color:var(--oro);margin-right:6px}
section{padding:28px 0;border-top:1px solid var(--linea)}h3{font:600 26px/1.2 var(--serif);margin:0 0 4px}.sub{color:var(--gris);font-size:14px;margin:0 0 18px}
.vivo{display:inline-flex;align-items:center;gap:6px}.vivo::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--rojo);animation:latido 2s infinite}
@keyframes latido{0%,100%{opacity:1}50%{opacity:.25}}@media (prefers-reduced-motion:reduce){.vivo::before{animation:none}.btn{transition:none}}
.cifras{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.cifra{background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:12px 14px}.cifra small{display:block;color:var(--gris);font-size:12.5px}
.cifra b{font:600 21px/1.3 var(--serif);font-variant-numeric:tabular-nums}.var{font-size:13px;margin-left:4px}.sube{color:var(--verde)}.baja{color:var(--rojo)}
.cifra a{font-size:12px;color:var(--gris)}
.dos{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
.titulares h4{font:600 13px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--oro-t);margin:0 0 8px}
.titulares ol{margin:0;padding-left:18px}.titulares li{margin:0 0 9px;font-size:15.5px;line-height:1.45}.titulares li a{text-decoration:none}.titulares li a:hover{text-decoration:underline}
.titulares .m{color:var(--gris);font-size:12.5px;white-space:nowrap}
.archivo{display:flex;flex-wrap:wrap;gap:8px}.archivo a{border:1px solid var(--linea);border-radius:999px;padding:10px 14px;text-decoration:none;font-size:14px;min-height:44px;display:inline-flex;align-items:center}
.archivo a:hover{border-color:var(--oro)}
.socios{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:center}
.precio{font:600 30px/1 var(--serif);color:var(--oro-t)}
.pie{color:var(--gris);font-size:13.5px;padding:26px 0 40px;border-top:3px double var(--linea)}
.aviso{color:var(--gris);font-size:14px}
form.clave{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}form.clave input{flex:1 1 220px;min-height:48px;border-radius:12px;border:1.5px solid var(--linea);padding:0 14px;font-size:17px;background:var(--card);color:var(--tinta)}
form.clave button{min-height:48px;border-radius:999px;border:0;background:var(--oro);color:#1A1406;font-weight:600;padding:0 22px;cursor:pointer}
@media (max-width:820px){.portada,.socios{grid-template-columns:1fr;gap:22px}.portada{padding-top:26px}nav{margin-left:0;width:100%}.edicion ul{columns:1}}
`;

const SCRIPT = `
(function(){var r=document.documentElement,b=document.getElementById('tema');function g(){try{return localStorage.getItem('cn-tema')}catch(e){return null}}
var t=g();if(t)r.setAttribute('data-theme',t);if(b)b.addEventListener('click',function(){var o=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
var n=o==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('cn-tema',n)}catch(e){}});
setTimeout(function(){location.reload()},20*60*1000);})();`;

function marco({ titulo, descripcion, cuerpo, canonica }) {
  return `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descripcion)}"><link rel="canonical" href="https://${DOMINIO}${canonica || "/"}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:type" content="website">
<meta property="og:url" content="https://${DOMINIO}${canonica || "/"}"><meta property="og:locale" content="es_CL"><meta name="theme-color" content="#0B1F3A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>${CSS}</style></head><body>
<header class="cab"><div class="hoja"><a class="marca" href="/" aria-label="Cofrade News, portada"><img class="l-claro" src="${LOGO_CLARO}" alt="" width="52" height="52"><img class="l-oscuro" src="${LOGO_OSCURO}" alt="" width="52" height="52"><b>Cofrade News</b></a>
<span class="fecha">${esc(fechaLarga(fechaChile()))}</span>
<nav aria-label="Secciones"><a href="/edicion">Edición de hoy</a><a href="/#en-vivo">En vivo</a><a href="/#archivo">Archivo</a><a href="/socios">Socios</a><a href="/#publicite">Publicite</a><button class="tema" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></nav></div></header>
<main class="hoja">${cuerpo}</main>
<footer class="hoja pie">Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.<br>
© ${fechaChile().slice(0, 4)} Cofrade News. Todos los derechos reservados.</footer><script>${SCRIPT}</script></body></html>`;
}

const SECCIONES = ["Crecimiento de Chile", "Economía y mercados", "Política y Congreso", "Conflictos en el mundo", "Perspectivas 2050",
  "Ciencia y Astronomía", "Deportes", "Clima, mar y sismos", "Vuelos comerciales", "Entretenimiento", "Fondos y subsidios", "Efemérides"];

function bloqueCifras(p) {
  if (!p) return "";
  const c = [];
  for (const x of p.indicadores || []) {
    c.push(`<div class="cifra"><small>${esc(x.nombre)}</small><b>${esc(x.prefijo || "")}${num(x.valor, x.decimales ?? 2)}</b></div>`);
  }
  if (p.ipsa) c.push(`<div class="cifra"><small>IPSA (puntos)</small><b>${num(p.ipsa.valor, 2)}</b>${pct(p.ipsa.variacion_pct)}</div>`);
  const hayCobre = (p.indicadores || []).some((x) => x.clave === "libra_cobre");
  for (const m of (p.mercados || []).filter((m) => !(hayCobre && /^cobre/i.test(m.nombre || ""))).slice(0, 6)) {
    c.push(`<div class="cifra"><small>${esc(m.nombre)} · cierre ${esc((m.fecha || "").split("-").reverse().slice(0, 2).join("-"))}</small><b>${num(m.valor, 2)}</b>${pct(m.variacion_pct)}</div>`);
  }
  if (p.bitcoin && p.bitcoin.bitcoin_usd) c.push(`<div class="cifra"><small>Bitcoin</small><b>US$${num(p.bitcoin.bitcoin_usd, 0)}</b></div>`);
  return c.length ? `<div class="cifras">${c.join("")}</div>` : "";
}

function bloqueTitulares(p) {
  const s = (p && p.titulares) || [];
  if (!s.length) return `<p class="aviso">Los titulares de las últimas horas aparecen aquí en la próxima actualización.</p>`;
  return `<div class="dos">${s.map((x) => `<div class="tarjeta titulares"><h4>${esc(x.seccion)}</h4><ol>${x.notas
    .map((n) => `<li><a href="${esc(urlSegura(n.url))}" target="_blank" rel="noopener">${esc(n.titulo)}</a> <span class="m">· ${esc(n.medio)}${n.hora ? " · " + esc(n.hora) : ""}</span></li>`)
    .join("")}</ol></div>`).join("")}</div>`;
}

function bloqueTierra(p) {
  const out = [];
  const s = p && p.sismos;
  if (s && s.mayores && s.mayores.length) {
    const m = s.mayores[0];
    out.push(`<div class="cifra"><small>Sismo mayor 24 h · ${s.n} sobre M 2,5</small><b>M ${num(m.magnitud, 1)}</b><br><small>${esc(m.referencia)} · ${esc((m.hora || "").slice(11, 16))}</small><a href="${esc(s.url)}" target="_blank" rel="noopener">USGS ↗</a></div>`);
  }
  const a = p && p.aire && p.aire.ciudades;
  for (const x of (a || []).slice(0, 5)) {
    out.push(`<div class="cifra"><small>Aire · ${esc(x.ciudad)}</small><b>${esc(x.estado || "")}</b><br><small>ICA ${esc(x.aqi)} · ${esc(x.hora || "")}</small><a href="${esc(urlSegura(x.url))}" target="_blank" rel="noopener">fuente ↗</a></div>`);
  }
  return out.length ? `<div class="cifras" style="margin-top:12px">${out.join("")}</div>` : "";
}

async function portada(env, ctx) {
  const [lista, p] = await Promise.all([indice(ctx), pulso(ctx)]);
  const ultima = lista[0];
  const hoy = fechaChile();
  const estado = !ultima ? "La primera edición web aparece mañana a las 07:30."
    : ultima === hoy ? "Edición de hoy, publicada a las 07:30." : `Última edición: ${fechaLarga(ultima)}. La de hoy se publica a las 07:30.`;
  const hora = p && p.generado ? String(p.generado).slice(11, 16) : "";
  const cuerpo = `
<div class="portada"><div><span class="kicker">El diario de la mañana · gratuito</span>
<h1>Chile y el mundo, ordenados en minutos y con datos verificados.</h1>
<p class="lede">Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.</p>
<div class="acciones"><a class="btn oro" href="/edicion">Leer la edición${ultima === hoy ? " de hoy" : ""} →</a><a class="btn linea" href="#en-vivo">Ver lo último</a></div></div>
<aside class="tarjeta edicion" aria-label="Edición"><span class="kicker">${ultima ? esc(fechaLarga(ultima)) : "Muy pronto"}</span><h2>${esc(estado)}</h2>
<ul>${SECCIONES.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></aside></div>
<section id="en-vivo" aria-labelledby="t-vivo"><h3 id="t-vivo"><span class="vivo">En vivo</span></h3>
<p class="sub">${hora ? `Actualizado a las ${esc(hora)}${p.proxima ? ` · próxima actualización ${esc(p.proxima)}` : ""}.` : "Se actualiza cada 2 horas, de 07:00 a 23:00."} Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.</p>
${bloqueCifras(p)}${bloqueTierra(p)}${bloqueTitulares(p)}</section>
<section id="archivo" aria-labelledby="t-arch"><h3 id="t-arch">Archivo</h3><p class="sub">Las ediciones de los últimos días.</p>
${lista.length ? `<div class="archivo">${lista.map((f) => `<a href="/edicion/${f}">${esc(fechaLarga(f))}</a>`).join("")}</div>` : `<p class="aviso">El archivo empieza con la próxima edición.</p>`}</section>
<section id="socios" aria-labelledby="t-soc"><div class="socios"><div><h3 id="t-soc">Área de socios</h3>
<p class="sub">Informes financieros, análisis de mercado y contenidos exclusivos para socios.</p><a class="btn linea" href="/socios">Ingresar con mi clave</a></div>
<div class="tarjeta" id="publicite"><span class="kicker">Publicite aquí</span><p style="margin:8px 0 6px">Su marca cada mañana frente a lectores que deciden.</p>
<div class="precio">UF 1 <small style="font-size:15px;color:var(--gris)">al mes</small></div><div class="acciones" style="margin-top:14px"><a class="btn oro" href="${esc(FORMULARIO)}" target="_blank" rel="noopener">Quiero publicitar</a></div></div></div></section>`;
  return html(marco({ titulo: "Cofrade News · El diario de la mañana", descripcion: "Chile y el mundo cada mañana: economía, política y Congreso, conflictos, ciencia, deportes, clima y vuelos, con datos verificados. Gratuito.", cuerpo }), 200,
    { "Cache-Control": "public, max-age=120" });
}

function paginaSocios(dentro, error = "") {
  const cuerpo = dentro
    ? `<section style="border:0"><span class="kicker">Área de socios</span><h1>Bienvenido.</h1>
<p class="lede">Aquí estarán los informes financieros y análisis exclusivos. El primero se publica pronto; te avisaremos en la edición del día.</p>
<div class="acciones"><a class="btn linea" href="/socios/salir">Cerrar sesión</a></div></section>`
    : `<section style="border:0;max-width:560px"><span class="kicker">Área de socios</span><h1>Ingresa con tu clave.</h1>
<p class="lede">Informes financieros, análisis de mercado y contenidos exclusivos. La clave la entrega la Cofradía.</p>
<form class="clave" method="post" action="/socios"><label for="c" style="position:absolute;left:-9999px">Clave de socio</label><input id="c" name="clave" type="password" autocomplete="current-password" required placeholder="Clave de socio"><button type="submit">Entrar</button></form>
${error ? `<p class="aviso" role="alert" style="color:var(--rojo)">${esc(error)}</p>` : ""}</section>`;
  return html(marco({ titulo: "Socios · Cofrade News", descripcion: "Área de socios de Cofrade News.", cuerpo, canonica: "/socios" }), error ? 401 : 200,
    { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" });
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B1F3A"/><text x="32" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#D9AE52">CN</text></svg>`;

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.hostname === "cofrad.es") return Response.redirect(`https://${DOMINIO}${u.pathname}${u.search}`, 301);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    try {
      if (p === "/" && req.method === "GET") return await portada(env, ctx);
      if (p === "/edicion") {
        const l = await indice(ctx);
        return l.length ? Response.redirect(`https://${u.host}/edicion/${l[0]}`, 302) : Response.redirect(`https://${u.host}/`, 302);
      }
      const m = p.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        const r = await desdeGitHub(`ediciones/Cofrade-News-${m[1]}.html`, 600, ctx);
        if (!r) return html(marco({ titulo: "Edición no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esa edición no está.</h1><p class="lede">Vuelve a la <a href="/">portada</a> para ver las disponibles.</p></section>` }), 404);
        return new Response(r.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", ...SEGURIDAD } });
      }
      if (p === "/pulso.json") {
        const r = await desdeGitHub("datos/pulso.json", 300, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", ...SEGURIDAD } })
          : new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
      }
      if (p === "/socios/salir") return new Response(null, { status: 302, headers: { Location: "/socios", "Set-Cookie": "cn_socio=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax" } });
      if (p === "/socios") {
        if (req.method === "POST") {
          if (!env.SOCIOS_CLAVE) return paginaSocios(false, "El área de socios se habilita pronto.");
          const f = await req.formData().catch(() => null);
          const clave = String((f && f.get("clave")) || "");
          await new Promise((r) => setTimeout(r, 400)); // frena los intentos a ciegas
          if (!iguales(await firma("c|" + clave, env.SOCIOS_CLAVE), await firma("c|" + env.SOCIOS_CLAVE, env.SOCIOS_CLAVE))) return paginaSocios(false, "Clave incorrecta.");
          const vence = Date.now() + 30 * 86400000;
          return new Response(null, { status: 303, headers: { Location: "/socios", "Set-Cookie": `cn_socio=${vence}.${await firma("socio|" + vence, env.SOCIOS_CLAVE)}; Max-Age=${30 * 86400}; Path=/; Secure; HttpOnly; SameSite=Lax` } });
        }
        return paginaSocios(await esSocio(req, env));
      }
      if (p === "/favicon.svg") return new Response(FAVICON, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=604800" } });
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /socios\nSitemap: https://${DOMINIO}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain" } });
      if (p === "/sitemap.xml") {
        const l = await indice(ctx);
        const x = [`https://${DOMINIO}/`, ...l.map((f) => `https://${DOMINIO}/edicion/${f}`)].map((h) => `<url><loc>${h}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${x}</urlset>`, { headers: { "Content-Type": "application/xml" } });
      }
      return html(marco({ titulo: "Página no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esta página no existe.</h1><p class="lede">Vuelve a la <a href="/">portada</a>.</p></section>` }), 404);
    } catch (e) {
      return html(marco({ titulo: "Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Volvemos en un momento.</h1><p class="lede">Hubo un problema al leer los datos. Intenta de nuevo en unos minutos.</p></section>` }), 503);
    }
  },
};
