// Cofrade News · www.cofrad.es (Cloudflare Worker, plan gratuito). 06-11-2026.
// Portada con la edición del día, la franja «En vivo» (pulso de GitHub cada 2 horas), el archivo y el área de socios.
// Las ediciones y el pulso se leen del repositorio público germanperey/cofrade-datos: este programa no guarda datos propios.
// Secreto opcional SOCIOS_CLAVE (Cloudflare → Workers & Pages → cofrade-news-web → Settings → Variables and Secrets).
// © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).

const RAW = "https://raw.githubusercontent.com/germanperey/cofrade-datos/main/";
const RAW_ED = "https://raw.githubusercontent.com/germanperey/cofrade-datos/ediciones/";   // edición COMPLETA (gráficos interactivos), 14 días
const rutaEdicion = (f, completa) => (completa ? RAW_ED : RAW + "ediciones/") + `Cofrade-News-${f}.html`;
const DOMINIO = "www.cofrad.es";
const FORMULARIO = "https://script.google.com/macros/s/AKfycbzruAvDDO14ZEP6wlA7UwFwFprOvT3516COFx7ZSaYys3qkLrnluO25ZnFnaAlTrlo/exec";
const LOGO_CLARO = "/logo-claro.webp";
const LOGO_OSCURO = "/logo-oscuro.webp";
const DIAS_ARCHIVO = 60;   // 13-11-2026: se buscan 60 días hacia atrás…
const MAX_ARCHIVO = 12;    // …y se muestran las 12 ediciones publicadas más recientes (Germán)
const MARCAS = {"marcas": [{"nombre": "Caddie Golf", "logo": "caddie-icono.webp", "texto": "Caddie Golf", "fondo": "#0A1410", "color": "#E9F5EC", "url": "https://www.caddiegolf.cl/?utm_source=cofrad.es&utm_medium=carrusel"}, {"nombre": "Inbestu", "logo": "inbestu.webp", "fondo": "#FFFFFF", "contacto": true}, {"nombre": "Megabots", "logo": "megabots-blanco.webp", "fondo": "#121418", "contacto": true}]};
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
async function desdeGitHub(ruta, segundos, ctx, completa = null) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/" + ruta);
  let r = await cache.match(clave);
  if (r) return r;
  const o = await fetch(completa || RAW + ruta, { cf: { cacheTtl: segundos, cacheEverything: true } });
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
    for (const completa of [true, false]) {   // primero la completa; si no está, la liviana
      try {
        const r = await fetch(rutaEdicion(f, completa), { method: "HEAD" });
        if (r.ok) return f;
      } catch { /* sigue */ }
    }
    return null;
  }));
  const lista = ok.filter(Boolean).slice(0, MAX_ARCHIVO);
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(lista), { headers: { "Cache-Control": "public, max-age=900" } })));
  return lista;
}

async function pulso(ctx) {
  try {
    const r = await desdeGitHub("datos/pulso.json", 300, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}

// ---------- inglés (13-11-2026): lo que cambia cada 2 horas se traduce aquí, con Workers AI (binding «AI»), y queda en caché ----------
const AIRE_EN = { "Bueno": "Good", "Regular": "Moderate", "Moderado": "Moderate", "Malo": "Poor", "Alerta": "Alert", "Preemergencia": "Pre-emergency",
  "Emergencia": "Emergency", "Dañino para grupos sensibles": "Unhealthy for sensitive groups", "Dañino": "Unhealthy", "Muy dañino": "Very unhealthy", "Peligroso": "Hazardous" };
const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
function textos(h) {
  const out = new Set();
  for (const m of h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").matchAll(/>([^<]+)</g)) {
    const t = m[1].replace(/&(amp|lt|gt|quot|#39);/g, (x) => ENT[x]).trim();
    if (t && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(t) && !t.startsWith("·") && t.length <= 400 && EN_FIJO[t] === undefined) out.add(t);
  }
  return [...out];
}
function enFijo(t) {   // reglas sin IA para las frases con números
  let m = t.match(/^Actualizado a las (\d\d:\d\d)(?: · próxima actualización (\d\d:\d\d))?\. (.+)$/);
  if (m) return `Updated at ${m[1]}${m[2] ? ` · next update ${m[2]}` : ""}. ` + (EN_FIJO[m[3]] || m[3]);
  if ((m = t.match(/^Sismo mayor 24 h · (\d+) sobre M 2,5$/))) return `Largest earthquake in 24 h · ${m[1]} above M 2.5`;
  if ((m = t.match(/^(.+) · cierre (\d\d-\d\d)$/))) return `${EN_FIJO[m[1]] || m[1]} · close ${m[2]}`;
  if ((m = t.match(/^Aire · (.+)$/))) return `Air · ${m[1]}`;
  if ((m = t.match(/^ICA (\d+) · (.*)$/))) return `AQI ${m[1]} · ${m[2]}`;
  if (AIRE_EN[t]) return AIRE_EN[t];
  return null;
}
async function huella(t) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function traducirUno(t, env, ctx) {
  const fijo = enFijo(t);
  if (fijo !== null) return fijo;
  if (!env.AI) return null;
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/en/" + (await huella(t)));
  const c = await cache.match(clave);
  if (c) return c.text();
  try {
    const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text: t, source_lang: "es", target_lang: "en" });
    const en = r && typeof r.translated_text === "string" ? r.translated_text.trim() : "";
    if (!en) return null;
    ctx.waitUntil(cache.put(clave, new Response(en, { headers: { "Cache-Control": "public, max-age=604800" } })));
    return en;
  } catch { return null; }
}
async function traduccionesPortada(env, ctx) {
  const { cuerpo, p } = await cuerpoPortada(ctx);
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/en-portada/" + encodeURIComponent((p && p.generado) || "sin-pulso") + "/" + fechaChile());
  const c = await cache.match(clave);
  if (c) return c.json();
  const lista = textos(cuerpo);
  const res = {};
  for (let i = 0; i < lista.length; i += 6) {   // de a 6 a la vez, sin saturar
    const parte = lista.slice(i, i + 6);
    const tr = await Promise.all(parte.map((t) => traducirUno(t, env, ctx)));
    parte.forEach((t, k) => { if (tr[k]) res[t] = tr[k]; });
  }
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(res), { headers: { "Cache-Control": "public, max-age=7200" } })));
  return res;
}

// ---------- formulario de publicidad (13-11-2026): el sitio lo recibe y lo pasa al receptor de Germán (Apps Script) ----------
async function contacto(req, ctx) {
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEGURIDAD } });
  const origen = req.headers.get("Origin") || "";
  if (origen && !/^https:\/\/(www\.)?cofrad\.es$/.test(origen)) return j({ ok: false, error: "Origen no permitido." }, 403);
  const f = await req.formData().catch(() => null);
  if (!f) return j({ ok: false, error: "Formulario vacío." }, 400);
  const v = (k, n) => String(f.get(k) || "").trim().slice(0, n);
  if (v("sitio_web", 200)) return j({ ok: true });   // trampa para robots: se descarta en silencio
  const d = { interes: v("interes", 80) || "Cofrade News", nombre: v("nombre", 80), empresa: v("empresa", 80), email: v("email", 120),
    telefono: v("telefono", 20), prefiere: v("prefiere", 20), mensaje: v("mensaje", 1000), acepto: v("acepto", 4) };
  if (!d.nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !d.mensaje) return j({ ok: false, error: "Complete nombre, un email válido y su mensaje." }, 400);
  if (d.acepto !== "si") return j({ ok: false, error: "Debe aceptar el uso de sus datos para que podamos responderle." }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x";
  const cache = caches.default;
  const freno = new Request("https://cache.cofrad.es/contacto/" + (await huella(ip)));
  if (await cache.match(freno)) return j({ ok: false, error: "Ya recibimos un mensaje suyo hace un momento. Intente de nuevo en un minuto." }, 429);
  ctx.waitUntil(cache.put(freno, new Response("1", { headers: { "Cache-Control": "public, max-age=60" } })));
  try {
    const r = await fetch(FORMULARIO, { method: "POST", body: new URLSearchParams({ ...d, origen: "www.cofrad.es" }), redirect: "follow" });
    if (r.status >= 400) return j({ ok: false, error: "No se pudo enviar. Intente de nuevo en un momento." }, 502);
    return j({ ok: true });
  } catch { return j({ ok: false, error: "No se pudo enviar. Intente de nuevo en un momento." }, 502); }
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
.idioma{font-weight:700;letter-spacing:.06em;border:1.5px solid var(--linea)!important;border-radius:999px!important;padding:8px 12px!important}
.idioma:hover{border-color:var(--oro)!important}
button.btn{border:0;cursor:pointer;font:inherit;font-weight:600}
.dlg-pub{border:none;border-radius:16px;padding:0;max-width:520px;width:calc(100% - 24px);background:var(--card);color:var(--tinta);box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}
.dlg-pub::backdrop{background:rgba(5,12,24,.6)}.pub-form{padding:24px;display:flex;flex-direction:column;gap:10px;position:relative}
.pub-form h3{margin:0 34px 0 0}.pub-form label{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600}
.pub-form input,.pub-form select,.pub-form textarea{font:16px var(--sans);padding:10px;border:1.5px solid var(--linea);border-radius:10px;background:var(--papel);color:var(--tinta)}
.pub-form .pub-ok{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400}.pub-form .pub-ok input{margin-top:3px}
.pub-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.pub-cerrar{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:1px solid var(--linea);background:none;color:inherit;cursor:pointer;font-size:16px}
.pub-enviar{min-height:48px;border-radius:999px;border:0;background:var(--oro);color:#1A1406;font-weight:700;font-size:16px;cursor:pointer}.pub-enviar:disabled{opacity:.6;cursor:wait}
.pub-estado{min-height:1.4em;margin:0;font-weight:600}
.marcas{padding:22px 0 8px;border-top:1px solid var(--linea)}.marcas h4{font:600 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t);margin:0 0 12px;text-align:center}
.cinta{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.pista{display:flex;gap:18px;width:max-content;animation:cinta 28s linear infinite}.cinta:hover .pista,.cinta:focus-within .pista{animation-play-state:paused}
@keyframes cinta{to{transform:translateX(calc(-50% - 9px))}}
.marca-a{display:flex;align-items:center;gap:10px;height:72px;min-width:190px;justify-content:center;padding:0 22px;border-radius:14px;border:1px solid var(--linea);background:var(--mf);color:var(--mc);text-decoration:none;cursor:pointer;font:700 17px var(--sans)}
.marca-a img{max-height:40px;max-width:170px;width:auto;height:auto;display:block}.marca-a:hover{border-color:var(--oro)}
@media (prefers-reduced-motion:reduce){.pista{animation:none;flex-wrap:wrap;justify-content:center;width:auto}.pista [aria-hidden=true]{display:none}}
@media (max-width:820px){.portada,.socios{grid-template-columns:1fr;gap:22px}.portada{padding-top:26px}nav{margin-left:0;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}nav a{white-space:nowrap}.edicion ul{columns:1}}
`;

const SCRIPT = `
(function(){var r=document.documentElement,b=document.getElementById('tema');function g(){try{return localStorage.getItem('cn-tema')}catch(e){return null}}
var t=g();if(t)r.setAttribute('data-theme',t);if(b)b.addEventListener('click',function(){var o=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
var n=o==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('cn-tema',n)}catch(e){}});
setTimeout(function(){location.reload()},20*60*1000);})();
// 13-11-2026 · formulario de publicidad (el mismo del boletín): llega a Germán por la planilla, sin mostrar sus datos
(function(){var dlg=document.getElementById('dlgPub');if(!dlg)return;var f=dlg.querySelector('form'),st=dlg.querySelector('.pub-estado'),sub=document.getElementById('dlgPubSub');
function en(){return document.documentElement.lang==='en'}
function abrir(i){f.reset();f.interes.value=i;st.textContent='';sub.textContent=i==='Cofrade News'?(en()?'To advertise your company in Cofrade News.':'Para publicitar su empresa en Cofrade News.'):(en()?'Inquiry for ':'Consulta para ')+i+'.';
if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');setTimeout(function(){try{f.nombre.focus()}catch(e){}},60)}
function cerrar(){if(dlg.close)dlg.close();else dlg.removeAttribute('open')}
document.querySelectorAll('.pub-abrir').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();abrir(b.getAttribute('data-interes')||'Cofrade News')})});
dlg.querySelector('.pub-cerrar').addEventListener('click',cerrar);dlg.addEventListener('click',function(ev){if(ev.target===dlg)cerrar()});
if(location.hash==='#publicitar')setTimeout(function(){abrir('Cofrade News')},300);
f.addEventListener('submit',function(ev){ev.preventDefault();if(f.sitio_web.value)return;
if(!f.nombre.value.trim()||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())||!f.mensaje.value.trim()){st.textContent=en()?'Please enter your name, a valid email and your message.':'Complete nombre, un email válido y su mensaje.';return}
if(!f.acepto.checked){st.textContent=en()?'Please accept the use of your data so we can reply.':'Debe aceptar el uso de sus datos para que podamos responderle.';return}
var bt=f.querySelector('.pub-enviar');bt.disabled=true;st.textContent=en()?'Sending…':'Enviando…';
fetch('/contacto',{method:'POST',body:new URLSearchParams(new FormData(f))}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){
if(j&&j.ok){st.textContent=en()?'Thank you! We received your details and will contact you shortly.':'¡Gracias! Recibimos sus datos y lo contactaremos a la brevedad.';setTimeout(cerrar,2800)}
else st.textContent=(j&&j.error)||(en()?'It could not be sent. Please try again in a moment.':'No se pudo enviar. Intente de nuevo en un momento.')})
.catch(function(){st.textContent=en()?'It could not be sent (no internet?). Please try again.':'No se pudo enviar (¿sin internet?). Intente de nuevo en un momento.'})
.finally(function(){bt.disabled=false})})})();
// 13-11-2026 · botón EN/ES: textos fijos con diccionario; titulares y cifras «En vivo» traducidos en el servidor (/en.json).
// Queda guardado en el equipo (la misma clave que usa la edición, así la edición también abre en inglés).
(function(){var r=document.documentElement,b=document.getElementById('idioma');if(!b)return;var orig=new Map(),hecho=false,trad=null;
var D=window.__EN||{};
function nodos(){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),o=[],n;while(n=w.nextNode()){var p=n.parentNode;if(!p||/^(SCRIPT|STYLE)$/.test(p.nodeName)||p.closest('[data-no-tr]'))continue;if(n.nodeValue.trim())o.push(n)}return o}
function attrs(){return document.querySelectorAll('[aria-label],[placeholder],[title]')}
function fecha(l){document.querySelectorAll('[data-iso]').forEach(function(e){var p=e.getAttribute('data-iso').split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2],15));
if(!orig.has(e))orig.set(e,e.textContent);e.textContent=l==='en'?new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):orig.get(e)})}
function poner(l){r.lang=l==='en'?'en':'es-CL';
nodos().forEach(function(n){if(n.parentNode&&n.parentNode.closest('[data-iso]'))return;if(!orig.has(n))orig.set(n,n.nodeValue);var o=orig.get(n),k=o.trim();
if(l!=='en'){n.nodeValue=o;return}var t=D[k]!==undefined?D[k]:(trad&&trad[k]!==undefined?trad[k]:null);if(t!==null)n.nodeValue=o.replace(k,t)});
attrs().forEach(function(e){['aria-label','placeholder','title'].forEach(function(a){var v=e.getAttribute(a);if(v===null)return;var key='data-o-'+a;if(!e.hasAttribute(key))e.setAttribute(key,v);var o=e.getAttribute(key);e.setAttribute(a,l==='en'&&D[o]?D[o]:o)})});
fecha(l);b.textContent=l==='en'?'ES':'EN';b.setAttribute('aria-pressed',String(l==='en'));b.setAttribute('aria-label',l==='en'?'Ver en español':'Read in English');
try{localStorage.setItem('cofrade-idioma',l)}catch(e){}
if(l==='en'&&!trad&&!hecho){hecho=true;fetch('/en.json').then(function(x){return x.ok?x.json():{}}).then(function(j){trad=j||{};if(r.lang==='en')poner('en')}).catch(function(){})}}
b.addEventListener('click',function(){poner(r.lang==='en'?'es':'en')});
try{if(localStorage.getItem('cofrade-idioma')==='en')poner('en')}catch(e){}})();`;

// Diccionario de los textos fijos de la portada (los dinámicos se traducen en /en.json)
const EN_FIJO = {
  "Edición de hoy": "Today's edition", "En vivo": "Live", "Archivo": "Archive", "Socios": "Members", "Publicite": "Advertise",
  "Cofrade News, portada": "Cofrade News, home", "Cambiar entre modo claro y oscuro": "Switch between light and dark mode", "Secciones": "Sections",
  "El diario de la mañana · gratuito": "The morning paper · free",
  "Chile y el mundo, ordenados en minutos y con datos verificados.": "Chile and the world, sorted in minutes, with verified data.",
  "Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.":
    "Every morning at 07:30: economy, politics and Congress, conflicts, science, sports, weather, flights and more. Every figure with its source and date.",
  "Leer la edición de hoy →": "Read today's edition →", "Leer la edición →": "Read the edition →", "Ver lo último": "See the latest",
  "Hoy ·": "Today ·", "Última edición ·": "Latest edition ·", "Muy pronto": "Coming soon", "Edición": "Edition",
  "La edición de hoy ya está publicada.": "Today's edition is out.",
  "La edición de hoy se publica a las 07:30. Mientras, lee la última.": "Today's edition comes out at 07:30. Meanwhile, read the latest one.",
  "La primera edición web aparece mañana a las 07:30.": "The first web edition comes out tomorrow at 07:30.",
  "Crecimiento de Chile": "Chile's growth", "Economía y mercados": "Economy and markets", "Política y Congreso": "Politics and Congress",
  "Conflictos en el mundo": "Conflicts around the world", "Perspectivas 2050": "Outlook 2050", "Ciencia y Astronomía": "Science and Astronomy",
  "Deportes": "Sports", "Clima, mar y sismos": "Weather, sea and earthquakes", "Vuelos comerciales": "Commercial flights",
  "Entretenimiento": "Entertainment", "Fondos y subsidios": "Grants and subsidies", "Efemérides": "On this day",
  "Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.": "Central Bank, Santiago Stock Exchange, USGS, measured air quality and the country's media.",
  "Se actualiza cada 2 horas, de 07:00 a 23:00.": "Updated every 2 hours, from 07:00 to 23:00.",
  "Los titulares de las últimas horas aparecen aquí en la próxima actualización.": "The latest headlines appear here at the next update.",
  "Las 12 ediciones publicadas más recientes.": "The 12 most recent published editions.", "El archivo empieza con la próxima edición.": "The archive starts with the next edition.",
  "Área de socios": "Members' area", "Informes financieros, análisis de mercado y contenidos exclusivos para socios.": "Financial reports, market analysis and exclusive content for members.",
  "Ingresar con mi clave": "Sign in with my password", "Publicite aquí": "Advertise here", "Su marca cada mañana frente a lectores que deciden.": "Your brand every morning in front of readers who make decisions.",
  "al mes": "per month", "Quiero publicitar": "I want to advertise", "Marcas que nos auspician": "Our sponsors",
  "Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.":
    "Cofrade News · the Cofradía's free daily newsletter, made in Chile. Every figure carries its source and date in the edition.",
  "Cofrade News. Todos los derechos reservados.": "Cofrade News. All rights reserved.",
  "Déjenos sus datos y lo contactamos": "Leave us your details and we will contact you", "Nombre y apellido *": "Full name *", "Empresa": "Company",
  "Email *": "Email *", "Teléfono / WhatsApp": "Phone / WhatsApp", "¿Cómo prefiere que lo contactemos?": "How would you like us to contact you?",
  "Llamada": "Phone call", "Mensaje *": "Message *", "Sitio web": "Website", "Enviar": "Send", "Cerrar": "Close",
  "Acepto que usen estos datos solo para responder mi consulta (Ley 19.628).": "I agree that this data is used only to answer my inquiry (Chilean Law 19.628).",
  "IPSA (puntos)": "IPSA (points)", "Dólar": "US dollar", "Euro": "Euro", "UF": "UF", "UTM": "UTM", "Cobre (libra)": "Copper (pound)", "Bitcoin": "Bitcoin", "Petróleo Brent": "Brent crude", "Cobre": "Copper", "Oro": "Gold", "Plata": "Silver",
  "USGS ↗": "USGS ↗", "fuente ↗": "source ↗", "Ver en español": "Ver en español", "Read in English": "Read in English",
};

const DIALOGO = `<dialog class="dlg-pub" id="dlgPub" aria-labelledby="dlgPubT"><form class="pub-form" method="dialog" novalidate>
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button><h3 id="dlgPubT">Déjenos sus datos y lo contactamos</h3><p class="sub" id="dlgPubSub" style="margin:0"></p>
<input type="hidden" name="interes" value=""><label>Nombre y apellido *<input name="nombre" required maxlength="80" autocomplete="name"></label>
<label>Empresa<input name="empresa" maxlength="80" autocomplete="organization"></label><label>Email *<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>Teléfono / WhatsApp<input name="telefono" type="tel" maxlength="20" autocomplete="tel" placeholder="+56 9 …"></label>
<label>¿Cómo prefiere que lo contactemos?<select name="prefiere"><option value="Email">Email</option><option value="WhatsApp">WhatsApp</option><option value="Llamada">Llamada</option></select></label>
<label>Mensaje *<textarea name="mensaje" required maxlength="1000" rows="3"></textarea></label>
<label class="pub-hp" aria-hidden="true">Sitio web<input name="sitio_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> Acepto que usen estos datos solo para responder mi consulta (Ley 19.628).</label>
<button type="submit" class="pub-enviar">Enviar</button><p class="pub-estado" role="status" aria-live="polite"></p></form></dialog>`;

// 13-11-2026 · carrusel de marcas auspiciadoras (pie de página). Se detiene con el mouse o el foco y queda quieto con «reducir movimiento».
function bloqueMarcas() {
  const ms = (MARCAS && MARCAS.marcas) || [];
  if (!ms.length) return "";
  const uno = (m, oculto) => {
    const est = `style="--mf:${/^#[0-9A-Fa-f]{6}$/.test(m.fondo || "") ? m.fondo : "#FFFFFF"};--mc:${/^#[0-9A-Fa-f]{6}$/.test(m.color || "") ? m.color : "#0B1F3A"}"`;
    const dentro = `<img src="/marcas/${esc(m.logo)}" alt="${oculto ? "" : esc(m.nombre)}" loading="lazy" decoding="async">${m.texto ? `<span data-no-tr>${esc(m.texto)}</span>` : ""}`;
    const ext = oculto ? ' aria-hidden="true" tabindex="-1"' : "";
    return m.url
      ? `<a class="marca-a" ${est} href="${esc(urlSegura(m.url))}" target="_blank" rel="noopener"${ext}>${dentro}</a>`
      : `<button type="button" class="marca-a pub-abrir" ${est} data-interes="${esc(m.nombre)}"${ext}>${dentro}</button>`;
  };
  let lista = ms;
  while (lista.length < 6) lista = lista.concat(ms);   // con pocas marcas, la cinta igual llena el ancho
  return `<div class="hoja marcas" aria-label="Marcas que nos auspician"><h4>Marcas que nos auspician</h4><div class="cinta"><div class="pista">${lista.map((m, i) => uno(m, i >= ms.length)).join("")}${lista.map((m) => uno(m, true)).join("")}</div></div></div>`;
}

function marco({ titulo, descripcion, cuerpo, canonica }) {
  return `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descripcion)}"><link rel="canonical" href="https://${DOMINIO}${canonica || "/"}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:type" content="website">
<meta property="og:url" content="https://${DOMINIO}${canonica || "/"}"><meta property="og:locale" content="es_CL"><meta name="theme-color" content="#0B1F3A">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><style>${CSS}</style></head><body>
<header class="cab"><div class="hoja"><a class="marca" href="/" aria-label="Cofrade News, portada"><img class="l-claro" src="${LOGO_CLARO}" alt="" width="52" height="52"><img class="l-oscuro" src="${LOGO_OSCURO}" alt="" width="52" height="52"><b>Cofrade News</b></a>
<span class="fecha" data-iso="${fechaChile()}">${esc(fechaLarga(fechaChile()))}</span>
<nav aria-label="Secciones"><a href="/edicion">Edición de hoy</a><a href="/#en-vivo">En vivo</a><a href="/#archivo">Archivo</a><a href="/socios">Socios</a><a href="/#publicite">Publicite</a><button class="tema idioma" id="idioma" type="button" lang="en" aria-pressed="false" aria-label="Read in English" title="English">EN</button><button class="tema" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></nav></div></header>
<main class="hoja">${cuerpo}</main>
${bloqueMarcas()}${DIALOGO}
<footer class="hoja pie">Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.<br>
© ${fechaChile().slice(0, 4)} <span>Cofrade News. Todos los derechos reservados.</span></footer><script>window.__EN=${JSON.stringify(EN_FIJO).replace(/</g, "\\u003c")};${SCRIPT}</script></body></html>`;
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

async function cuerpoPortada(ctx) {
  const [lista, p] = await Promise.all([indice(ctx), pulso(ctx)]);
  const ultima = lista[0];
  const hoy = fechaChile();
  const estado = !ultima ? "La primera edición web aparece mañana a las 07:30."
    : ultima === hoy ? "La edición de hoy ya está publicada." : "La edición de hoy se publica a las 07:30. Mientras, lee la última.";
  const hora = p && p.generado ? String(p.generado).slice(11, 16) : "";
  const cuerpo = `
<div class="portada"><div><span class="kicker">El diario de la mañana · gratuito</span>
<h1>Chile y el mundo, ordenados en minutos y con datos verificados.</h1>
<p class="lede">Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.</p>
<div class="acciones"><a class="btn oro" href="/edicion">Leer la edición${ultima === hoy ? " de hoy" : ""} →</a><a class="btn linea" href="#en-vivo">Ver lo último</a></div></div>
<aside class="tarjeta edicion" aria-label="Edición"><span class="kicker">${ultima ? `<span>${ultima === hoy ? "Hoy ·" : "Última edición ·"}</span> <span data-iso="${ultima}">${esc(fechaLarga(ultima))}</span>` : "Muy pronto"}</span><h2>${esc(estado)}</h2>
<ul>${SECCIONES.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></aside></div>
<section id="en-vivo" aria-labelledby="t-vivo"><h3 id="t-vivo"><span class="vivo">En vivo</span></h3>
<p class="sub">${hora ? `Actualizado a las ${esc(hora)}${p.proxima ? ` · próxima actualización ${esc(p.proxima)}` : ""}.` : "Se actualiza cada 2 horas, de 07:00 a 23:00."} Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.</p>
${bloqueCifras(p)}${bloqueTierra(p)}${bloqueTitulares(p)}</section>
<section id="archivo" aria-labelledby="t-arch"><h3 id="t-arch">Archivo</h3><p class="sub">Las 12 ediciones publicadas más recientes.</p>
${lista.length ? `<div class="archivo">${lista.map((f) => `<a href="/edicion/${f}" data-iso="${f}">${esc(fechaLarga(f))}</a>`).join("")}</div>` : `<p class="aviso">El archivo empieza con la próxima edición.</p>`}</section>
<section id="socios" aria-labelledby="t-soc"><div class="socios"><div><h3 id="t-soc">Área de socios</h3>
<p class="sub">Informes financieros, análisis de mercado y contenidos exclusivos para socios.</p><a class="btn linea" href="/socios">Ingresar con mi clave</a></div>
<div class="tarjeta" id="publicite"><span class="kicker">Publicite aquí</span><p style="margin:8px 0 6px">Su marca cada mañana frente a lectores que deciden.</p>
<div class="precio">UF 1 <small style="font-size:15px;color:var(--gris)">al mes</small></div><div class="acciones" style="margin-top:14px"><button type="button" class="btn oro pub-abrir" data-interes="Cofrade News" aria-haspopup="dialog">Quiero publicitar</button></div></div></div></section>`;
  return { cuerpo, p };
}

async function portada(env, ctx) {
  const { cuerpo } = await cuerpoPortada(ctx);
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
        const r = (await desdeGitHub(`completa/${m[1]}`, 600, ctx, rutaEdicion(m[1], true))) || (await desdeGitHub(`ediciones/Cofrade-News-${m[1]}.html`, 600, ctx));
        if (!r) return html(marco({ titulo: "Edición no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esa edición no está.</h1><p class="lede">Vuelve a la <a href="/">portada</a> para ver las disponibles.</p></section>` }), 404);
        const resp = new Response(r.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", ...SEGURIDAD } });
        if (typeof HTMLRewriter === "undefined") return resp;
        return new HTMLRewriter()   // 13-11-2026: la edición también lleva el escudo de la Cofradía como ícono
          .on('link[rel~="icon"]', { element(e) { e.remove(); } })
          .on("head", { element(e) { e.append('<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png">', { html: true }); } })
          .transform(resp);
      }
      if (p === "/contacto" && req.method === "POST") return await contacto(req, ctx);
      if (p === "/en.json") {
        const t = await traduccionesPortada(env, ctx);
        return new Response(JSON.stringify(t), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=600", ...SEGURIDAD } });
      }
      const mc = p.match(/^\/marcas\/([a-z0-9-]+\.webp)$/);
      if (mc && ((MARCAS && MARCAS.marcas) || []).some((x) => x.logo === mc[1])) {
        const r = await desdeGitHub(`sitio/marcas/${mc[1]}`, 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      const ic = { "/favicon.ico": ["favicon.ico", "image/x-icon"], "/favicon-64.png": ["favicon-64.png", "image/png"], "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png"],
        "/escudo-192.png": ["escudo-192.png", "image/png"] }[p];
      if (ic) {
        const r = await desdeGitHub(`sitio/${ic[0]}`, 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": ic[1], "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
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
      const lg = p.match(/^\/logo-(claro|oscuro)\.webp$/);
      if (lg) {
        const r = await desdeGitHub(`sitio/logo-${lg[1]}.webp`, 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      if (p === "/favicon.svg") return Response.redirect(`https://${u.host}/favicon-64.png`, 301);   // 13-11-2026: ícono = escudo de la Cofradía
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
