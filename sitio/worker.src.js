// Cofrade News · www.cofrad.es (Cloudflare Worker, plan gratuito). 06-11-2026.
// Portada con la edición del día, la franja «En vivo» (pulso de GitHub cada 2 horas), el archivo y el área de socios.
// Las ediciones y el pulso se leen del repositorio público germanperey/cofrade-datos: este programa no guarda datos propios.
// Secreto opcional SOCIOS_CLAVE (Cloudflare → Workers & Pages → cofrade-news-web → Settings → Variables and Secrets).
// © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).

const RAW = "https://raw.githubusercontent.com/germanperey/cofrade-datos/main/";
const RAW_ED = "https://raw.githubusercontent.com/germanperey/cofrade-datos/ediciones/";   // edición COMPLETA (gráficos interactivos), 14 días
const rutaEdicion = (f, completa) => (completa ? RAW_ED : RAW + "ediciones/") + `Cofrade-News-${f}.html`;
// 14-11-2026 (Germán: «los respaldos de cada Newsletter»): cuando una edición completa sale de la rama (guarda 16), queda para siempre en
// el release mensual completas-AAAA-MM del repositorio (herramientas/completas_permanentes.py) y se sigue leyendo de ahí.
const rutaPermanente = (f) => `https://github.com/germanperey/cofrade-datos/releases/download/completas-${f.slice(0, 7)}/Cofrade-News-${f}.html`;
const DOMINIO = "www.cofrad.es";
const FORMULARIO = "__FORMULARIO__";
const LOGO_CLARO = "/logo-claro.webp";
const LOGO_OSCURO = "/logo-oscuro.webp";
const DIAS_ARCHIVO = 20;   // respaldo sin índice: 20 días hacia atrás (hasta 40 lecturas; el plan gratuito permite 50 por visita)
const MAX_ARCHIVO = 12;    // la portada muestra las 12 ediciones más recientes (Germán, 13-11-2026)…
const TOPE_ARCHIVO = 400;  // …y «Ver más» abre las anteriores de a 12 (Germán, 14-11-2026)
const MARCAS = __MARCAS__;
const LENTO = __LENTO__;   // 13-11-2026: capa que dibuja cada gráfico de la edición recién cuando el lector llega a él
const TZ = "America/Santiago";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlSegura = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#");

function fechaChile(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p; // AAAA-MM-DD
}
let _FMT_LARGA = null;   // 14-11-2026 (auditoría): un solo formateador; crear uno por fecha costaba ~20 ms de CPU con 400 ediciones
function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 15));
  _FMT_LARGA = _FMT_LARGA || new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const t = _FMT_LARGA.format(f);
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
// 13-11-2026: el captcha del Buzón (Cloudflare Turnstile) necesita su script y su recuadro desde challenges.cloudflare.com.
const csp = ({ script = "", frame = "" } = {}) => "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
  + `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${script}; connect-src 'self'; frame-src https://challenges.cloudflare.com${frame}; `
  + "frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://script.google.com";
const CSP_PORTADA = csp();

// 13-11-2026: /mercados muestra widgets de TradingView (gratis con su marca visible); solo esa página los permite.
const CSP_MERCADOS = csp({ script: " https://s3.tradingview.com", frame: " https://www.tradingview-widget.com https://s.tradingview.com https://*.tradingview.com" });
function html(cuerpo, status = 200, extra = {}, csp = CSP_PORTADA) {
  return new Response(cuerpo, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": csp, "X-Frame-Options": "DENY", ...SEGURIDAD, ...extra },
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

async function existeEdicion(f) {
  for (const completa of [true, false]) {   // primero la completa; si no está, la liviana
    try {
      const r = await fetch(rutaEdicion(f, completa), { method: "HEAD" });
      if (r.ok) return true;
    } catch { /* sigue */ }
  }
  return false;
}

// 14-11-2026: el índice lo escribe GitHub (datos/ediciones.json, con cada edición y varias veces al día): UNA lectura en vez de
// 60 a 120. Con el plan gratuito, sobre 50 lecturas por visita las demás fallaban y la edición del 11-11 no salía en el Archivo.
// Los 3 últimos días se confirman igual (la edición de hoy puede llegar antes que el índice); sin índice, se buscan 20 días.
async function indice(ctx) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/indice-ediciones-v2");
  const c = await cache.match(clave);
  if (c) return c.json();
  let lista = [];
  try {
    const r = await fetch(RAW + "datos/ediciones.json", { cf: { cacheTtl: 300, cacheEverything: true } });
    if (r.ok) {
      const j = await r.json();
      lista = (Array.isArray(j && j.ediciones) ? j.ediciones : []).map((x) => (typeof x === "string" ? x : x && x.f)).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f)));
    }
  } catch { /* respaldo abajo */ }
  const hoy = new Date();
  const recientes = Array.from({ length: lista.length ? 3 : DIAS_ARCHIVO }, (_, i) => fechaChile(new Date(hoy.getTime() - i * 86400000)));
  const nuevas = await Promise.all(recientes.filter((f) => !lista.includes(f)).map(async (f) => ((await existeEdicion(f)) ? f : null)));
  const tope = fechaChile();
  const conIndice = lista.length > 0;
  lista = [...new Set([...lista, ...nuevas.filter(Boolean)])].filter((f) => f <= tope).sort().reverse().slice(0, TOPE_ARCHIVO);
  // sin el índice de GitHub (respaldo de 20 días) se guarda solo 1 minuto: apenas vuelva el índice, el Archivo vuelve a estar completo
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(lista), { headers: { "Cache-Control": `public, max-age=${conIndice ? 900 : 60}` } })));
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
    if (t && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(t) && !t.startsWith("·") && !/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo), \d+ de \S+ de \d{4}$/.test(t) && t.length <= 400 && EN_FIJO[t] === undefined) out.add(t);
  }
  return [...out];
}
const RUMBO_EN = { N: "N", S: "S", E: "E", O: "W", NE: "NE", NO: "NW", SE: "SE", SO: "SW", NNE: "NNE", NNO: "NNW", ENE: "ENE", ESE: "ESE", SSE: "SSE", SSO: "SSW", ONO: "WNW", OSO: "WSW" };
function enFijo(t) {   // reglas sin IA para las frases con números
  let m = t.match(/^Actualizado a las (\d\d:\d\d)(?: · próxima actualización (\d\d:\d\d))?\. (.+)$/);
  if (m) return `Updated at ${m[1]}${m[2] ? ` · next update ${m[2]}` : ""}. ` + (EN_FIJO[m[3]] || m[3]);
  if ((m = t.match(/^Sismo mayor 24 h · (\d+) sobre M 2,5$/))) return `Largest earthquake in 24 h · ${m[1]} above M 2.5`;
  if ((m = t.match(/^(.+) · cierre (\d\d-\d\d)$/))) return `${EN_FIJO[m[1]] || m[1]} · close ${m[2]}`;
  if ((m = t.match(/^(.+) · (\d\d-\d\d-\d{4})$/)) && EN_FIJO[m[1]]) return `${EN_FIJO[m[1]]} · ${m[2]}`;
  if ((m = t.match(/^([+−-]?[\d.,]+ %) en un mes$/))) return `${m[1]} over one month`;
  if ((m = t.match(/^(\d+) km al ([NSEO]{1,3}) de (.+?)( · \d\d:\d\d)?$/)) && RUMBO_EN[m[2]]) return `${m[1]} km ${RUMBO_EN[m[2]]} of ${m[3]}${m[4] || ""}`;
  if ((m = t.match(/^Aire · (.+)$/))) return `Air · ${m[1]}`;
  if ((m = t.match(/^ICA (\d+) · (.*)$/))) return `AQI ${m[1]} · ${m[2]}`;
  if (AIRE_EN[t]) return AIRE_EN[t];
  return null;
}
async function huella(t) {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// 14-11-2026 (Germán: «muchos textos no se están traduciendo»): /en.json caía. Cada frase leía y escribía la caché del borde y el plan
// gratuito permite 50 de esas lecturas por visita (los titulares son ~90): la excepción botaba /en.json y la portada quedaba en español.
// Ahora: memoria de traducciones en D1 (una consulta cada 90 frases), hasta 40 frases nuevas por visita con Workers AI, y la página
// pide el resto en unos segundos (__faltan). Nunca devuelve error: en el peor caso, {}.
const MAX_IA = 40;
async function traducirIA(t, env) {
  try {
    let en = "";
    if (env.AI) {
      const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text: t, source_lang: "es", target_lang: "en" });
      en = r && typeof r.translated_text === "string" ? r.translated_text.trim() : "";
    } else if (env.AI_PRUEBA) {   // solo en el arnés de pruebas (Miniflare)
      en = (await (await env.AI_PRUEBA.fetch("https://ia.prueba/", { method: "POST", body: t })).text()).trim();
    }
    return en || null;
  } catch { return null; }
}
async function traduccionesPortada(env, ctx) {
  const { cuerpo, p } = await cuerpoPortada(ctx);
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/en-portada-v2/" + encodeURIComponent((p && p.generado) || "sin-pulso") + "/" + fechaChile());
  const c = await cache.match(clave);
  if (c) return c.json();
  const res = {};
  const paraIA = [];
  for (const t of textos(cuerpo)) {
    const f = enFijo(t);
    if (f !== null) res[t] = f;
    else if (/[a-záéíóúñ]{2}/.test(t)) paraIA.push(t);   // cifras como «US$6,30» o siglas no se mandan a traducir
  }
  if (paraIA.length && env.DB) {
    try {
      for (let i = 0; i < paraIA.length; i += 90) {
        const parte = paraIA.slice(i, i + 90);
        const r = await env.DB.prepare(`SELECT es, en FROM traducciones WHERE es IN (${parte.map(() => "?").join(",")})`).bind(...parte).all();
        for (const x of (r && r.results) || []) if (x && x.en) res[x.es] = x.en;
      }
    } catch { /* sin la tabla: se sigue con la IA */ }
  }
  const pendientes = paraIA.filter((t) => res[t] === undefined).slice(0, MAX_IA);
  const nuevas = [];
  for (let i = 0; i < pendientes.length; i += 6) {   // de a 6 a la vez, sin saturar
    const parte = pendientes.slice(i, i + 6);
    const tr = await Promise.all(parte.map((t) => traducirIA(t, env)));
    parte.forEach((t, k) => { if (tr[k]) { res[t] = tr[k]; nuevas.push([t, tr[k]]); } });
  }
  if (nuevas.length && env.DB) {
    try {
      const ahora = new Date().toISOString();
      const st = env.DB.prepare("INSERT OR REPLACE INTO traducciones (es, en, creado) VALUES (?, ?, ?)");
      await env.DB.batch(nuevas.map(([es, en]) => st.bind(es, en, ahora)));
    } catch { /* la próxima visita las vuelve a pedir */ }
  }
  const faltan = paraIA.filter((t) => res[t] === undefined).length;
  if (!faltan) ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(res), { headers: { "Cache-Control": "public, max-age=7200" } })));
  else if (!nuevas.length) ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(res), { headers: { "Cache-Control": "public, max-age=600" } })));   // la IA no responde: se reintenta en 10 minutos
  else res.__faltan = faltan;   // avanzó: la página vuelve a pedir en 2,5 segundos
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
nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}nav a,.tema,.nav-b{font:14px var(--sans);text-decoration:none;padding:8px 10px;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:inherit;cursor:pointer}
nav a:hover,.tema:hover,.nav-b:hover{background:var(--card)}.herr{display:flex;gap:4px;align-items:center}
.nav-b{font-weight:600;color:var(--oro-t)}.nav-b svg{flex:none}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
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
.archivo a:hover{border-color:var(--oro)}.archivo a[hidden]{display:none}
.arch-pie{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;margin-top:12px}.arch-pie[hidden]{display:none}
.arch-mas{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 2px;background:none;border:0;border-radius:0;cursor:pointer;
color:var(--oro-t);font:600 12.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;box-shadow:inset 0 -1px 0 color-mix(in srgb,var(--oro) 45%,transparent);transition:box-shadow .2s,color .2s}
.arch-mas:hover{box-shadow:inset 0 -2px 0 var(--oro)}.arch-mas svg{flex:none;transition:transform .28s cubic-bezier(.2,.7,.2,1)}.arch-mas.abierto svg{transform:rotate(180deg)}
.am-cuenta{font-size:13px;color:var(--gris);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.arch-mas,.arch-mas svg{transition:none}}
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
/* 13-11-2026 · portada de lujo: noche azul, oro y marfil; tipografía Cormorant Garamond; escudo de la Cofradía como marca de agua */
:root{--noche:#06121F;--noche2:#0B1F3A;--marfil:#F6F1E6;--oro-l:#E6C77A;--display:'Cormorant Garamond','Iowan Old Style','Palatino Linotype',Georgia,serif}
.lujo{position:relative;overflow:hidden;background:radial-gradient(1200px 520px at 78% 30%,#12305a 0%,var(--noche2) 46%,var(--noche) 100%);color:var(--marfil);border-bottom:1px solid rgba(230,199,122,.28)}
.lujo::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0,rgba(230,199,122,.35) 50%,transparent 100%) top/100% 1px no-repeat,
 repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 120px);pointer-events:none}
.agua{position:absolute;right:-90px;top:50%;width:min(660px,62vw);transform:translateY(-50%);opacity:.075;pointer-events:none;user-select:none}
.lujo-in{position:relative;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center;padding:64px 16px 58px}
.lujo .kicker{color:var(--oro-l)}.lujo h1{font:600 clamp(38px,6vw,68px)/1.02 var(--display);letter-spacing:-.4px;color:#FFFDF8;margin:14px 0 18px}
.lujo h1 em{font-style:italic;color:var(--oro-l)}.lujo .lede{color:#D8D2C4;font-size:19px}
.btn.claro{border:1px solid rgba(230,199,122,.55);color:var(--marfil)}.btn.claro:hover{background:rgba(230,199,122,.08)}
.sellos{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;padding:0;margin:26px 0 0;font-size:13.5px;color:#BFB7A6;letter-spacing:.03em}
.sellos li::before{content:"◆";color:var(--oro-l);font-size:9px;margin-right:8px;vertical-align:2px}
.pizarra{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid rgba(230,199,122,.32);border-radius:20px;padding:22px 22px 16px;
 box-shadow:0 30px 80px -30px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(6px)}
.piz-cab{display:flex;justify-content:space-between;align-items:center;font:600 12px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--oro-l);margin-bottom:10px}
.piz-cab span{color:#9FB0C6;letter-spacing:.06em;text-transform:none;font-weight:500}
.piz-fila{display:grid;grid-template-columns:1fr 150px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid rgba(230,199,122,.14)}
.piz-fila small{display:block;color:#AFB9C8;font-size:12.5px;letter-spacing:.02em}.piz-fila b{font:600 27px/1.15 var(--display);color:#FFFDF8;font-variant-numeric:tabular-nums}
.piz-fila .var{font-size:12.5px;margin-left:6px}.piz-fila svg{width:150px;height:46px;display:block}
.lujo .sube{color:#7DDBA6}.lujo .baja{color:#F4A39C}
.piz-pie{font-size:11.5px;color:#8E9AAB;margin-top:8px}
.secc{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.sec-card{position:relative;background:var(--card);border:1px solid var(--linea);border-radius:16px;padding:18px 18px 16px;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start;
 transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .2s}
.sec-card:hover{transform:translateY(-2px);border-color:var(--oro);box-shadow:0 14px 34px -22px rgba(11,31,58,.45)}
.sec-card svg{width:44px;height:44px;color:var(--oro-t)}.sec-card b{display:block;font:600 19px/1.2 var(--display);margin-bottom:3px}.sec-card p{margin:0;font-size:13.5px;color:var(--gris);line-height:1.45}
.titulo-lujo{font:600 clamp(28px,3.6vw,40px)/1.1 var(--display);margin:0 0 6px;letter-spacing:-.2px}
.galeria{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;align-items:start}
.cab .fecha{display:none}
.galeria figure{margin:0;background:#FBF8F1;border:1px solid var(--linea);border-radius:16px;padding:12px;box-shadow:0 18px 40px -30px rgba(11,31,58,.5);position:relative}
.galeria figure::after{content:"";position:absolute;inset:6px;border:1px solid rgba(184,137,43,.28);border-radius:12px;pointer-events:none}
.galeria img{width:100%;height:auto;display:block;border-radius:8px}.galeria figcaption{font-size:13px;color:#5B6472;padding:10px 4px 2px}
.galeria figcaption b{display:block;font:600 17px/1.2 var(--display);color:#0B1F3A}
.g-a{grid-column:span 7}.g-b{grid-column:span 5}.g-c{grid-column:span 4}.g-d{grid-column:span 4}.g-e{grid-column:span 4}.g-f{grid-column:span 12}
.puente{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--noche2),var(--noche));color:var(--marfil);border-radius:24px;padding:44px 36px;margin:34px 0;border:1px solid rgba(230,199,122,.3)}
.puente .agua{right:-140px;width:520px;opacity:.06}.puente .kicker{color:var(--oro-l)}.puente h2{font:600 clamp(30px,4vw,46px)/1.05 var(--display);color:#FFFDF8;margin:10px 0 10px}
.puente p.lede{color:#D8D2C4;max-width:44em}
.pilares{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:22px 0}
.pilar{border:1px solid rgba(230,199,122,.22);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.03)}
.pilar b{display:block;font:600 18px/1.2 var(--display);color:var(--oro-l);margin-bottom:4px}.pilar span{font-size:13.5px;color:#C9C2B3;line-height:1.45}
.precio-lujo{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 18px;margin:8px 0 18px}
.precio-lujo .monto{font:600 46px/1 var(--display);color:#FFFDF8}.precio-lujo .monto small{font-size:17px;color:#BFB7A6;font-family:var(--sans)}
.precio-lujo .extra{font-size:14px;color:#D8D2C4}.legal{font-size:12px;color:#8E9AAB;margin:14px 0 0;max-width:60em}
.pie-agua{display:block;width:64px;height:64px;margin:0 0 10px;opacity:.85}
@media (max-width:980px){.lujo-in{grid-template-columns:1fr;gap:30px;padding:44px 16px}.agua{width:520px;right:-180px;top:30%}.g-a,.g-b,.g-c,.g-d,.g-e{grid-column:span 12}}
@media (max-width:820px){.portada,.socios{grid-template-columns:1fr;gap:22px}.portada{padding-top:26px}nav{margin-left:0;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}nav a{white-space:nowrap}.edicion ul{columns:1}}
/* 13-11-2026 · cabecera fija (Germán: «el header debe mantenerse fijo, para que siempre esté visible») */
html{scroll-padding-top:calc(var(--alto-cab,112px) + 12px)}
.cab{position:sticky;top:0;z-index:60;background:rgba(251,248,241,.95);-webkit-backdrop-filter:saturate(1.3) blur(10px);backdrop-filter:saturate(1.3) blur(10px)}
:root[data-theme=dark] .cab{background:rgba(14,21,34,.95)}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .cab{background:rgba(14,21,34,.95)}}
.cab.pegado{box-shadow:0 14px 30px -22px rgba(6,18,31,.6)}
@media (max-width:1000px){.cab .hoja{padding-top:8px;padding-bottom:4px;gap:2px 10px}.marca img{width:42px;height:42px}.marca b{font-size:27px}
 .herr{order:1;margin-left:auto}nav{order:2;margin-left:0;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
 nav::-webkit-scrollbar{display:none}nav.mas{-webkit-mask-image:linear-gradient(90deg,#000 80%,transparent);mask-image:linear-gradient(90deg,#000 80%,transparent)}
 nav a,.nav-b{white-space:nowrap;padding:8px 9px}}
@media print{.cab{position:static;box-shadow:none}}
/* 13-11-2026 · Buzón de sugerencias en tres pasos */
.dlg-buzon{max-width:680px}.dlg-buzon [hidden]{display:none!important}.buzon-fin{padding:0 34px}.dlg-buzon .pub-form{max-height:min(90vh,900px);overflow:auto;gap:12px}
.pasos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:2px 40px 0 0}.pasos i{height:4px;border-radius:4px;background:var(--linea)}.pasos i.si{background:var(--oro)}
.pub-form fieldset{border:1px solid var(--linea);border-radius:14px;padding:12px 14px 14px;margin:0 0 10px}.pub-form legend{font-weight:700;font-size:15px;padding:0 6px}
.ayuda{display:block;font-weight:400;color:var(--gris);font-size:12.5px;margin:0 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}.pub-form .chip{position:relative;display:inline-flex;flex-direction:row;font-weight:500;gap:0}
.chip input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.chip span{display:inline-flex;align-items:center;min-height:44px;padding:8px 15px;border:1.5px solid var(--linea);border-radius:999px;font-size:14.5px;cursor:pointer;user-select:none;background:var(--papel)}
.chip span:hover{border-color:var(--oro)}.chip input:checked+span{background:var(--oro);border-color:var(--oro);color:#1A1406;font-weight:600}
.chip input:checked+span::before{content:"✓";margin-right:7px;font-weight:800}.chip input:focus-visible+span,.nps input:focus-visible+span{outline:3px solid var(--oro);outline-offset:2px}
.nps{display:grid;grid-template-columns:repeat(11,1fr);gap:5px}.pub-form .nps label{display:block;position:relative;font-weight:600}
.nps input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.nps span{display:flex;align-items:center;justify-content:center;min-height:44px;border:1.5px solid var(--linea);border-radius:10px;cursor:pointer;background:var(--papel);font-variant-numeric:tabular-nums}
.nps span:hover{border-color:var(--oro)}.nps input:checked+span{background:var(--tinta);color:var(--papel);border-color:var(--tinta)}
.nps-ej{display:flex;justify-content:space-between;font-size:12px;color:var(--gris);margin-top:6px}
.dos-campos{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ts{min-height:70px}
.buzon-nav{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}.buzon-nav .pub-enviar{padding:0 26px}.buzon-nav .btn{min-height:48px}
.buzon-ok{text-align:center;padding:10px 0}.sello-ok{width:64px;height:64px;margin:4px auto 6px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--oro);color:#1A1406;font:800 30px/1 var(--sans)}
.buzon-ok h3{margin:0 0 6px}.buzon-msg{color:var(--tinta2);margin:0 auto 16px;max-width:34em}
@media (max-width:540px){.dos-campos{grid-template-columns:1fr}.nps{grid-template-columns:repeat(6,1fr)}.chip span{font-size:14px;padding:8px 13px}}
/* 13-11-2026 · Panel de Control */
.barras{display:flex;flex-direction:column;gap:8px}.barra{display:grid;grid-template-columns:minmax(120px,38%) 1fr auto;gap:10px;align-items:center;font-size:14px}
.bb{height:12px;background:var(--linea);border-radius:6px;overflow:hidden}.bb i{display:block;height:100%;border-radius:6px}.barra b{font-variant-numeric:tabular-nums}
.calor{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.cel{border-radius:12px;padding:12px 14px;background:rgba(184,137,43,var(--a));color:var(--tinta);border:1px solid rgba(184,137,43,.35)}
.enlace{background:none;border:0;padding:0;font:inherit;color:var(--oro-t);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.cel b{display:block;font-size:15px}.cel span{font-size:12.5px}.tabla-buzon .m{color:var(--gris);font-size:13px}
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
(function(){var r=document.documentElement,b=document.getElementById('idioma');if(!b)return;var orig=new Map(),hecho=false,trad=null,vueltas=0,titulo0=document.title;
var D=window.__EN||{};
// 14-11-2026 (Germán: «muchos textos no se están traduciendo»): las frases con cifras, horas y fechas se traducen aquí con reglas
// (no dependen de /en.json); los titulares del día llegan de /en.json por partes y la página los va poniendo
var DIR={N:'N',S:'S',E:'E',O:'W',NE:'NE',NO:'NW',SE:'SE',SO:'SW',NNE:'NNE',NNO:'NNW',ENE:'ENE',ESE:'ESE',SSE:'SSE',SSO:'SSW',ONO:'WNW',OSO:'WSW'};
function regla(t){var m;
if((m=t.match(/^Actualizado a las (\\d\\d:\\d\\d)(?: · próxima actualización (\\d\\d:\\d\\d))?\\. (.+)$/)))return 'Updated at '+m[1]+(m[2]?' · next update '+m[2]:'')+'. '+(D[m[3]]||m[3]);
if((m=t.match(/^(.+) · cierre (\\d\\d-\\d\\d)$/)))return (D[m[1]]||m[1])+' · close '+m[2];
if((m=t.match(/^(.+) · (\\d\\d-\\d\\d-\\d{4})$/))&&D[m[1]])return D[m[1]]+' · '+m[2];
if((m=t.match(/^([+−-]?[\\d.,]+ %) en un mes$/)))return m[1]+' over one month';
if((m=t.match(/^Sismo mayor 24 h · (\\d+) sobre M 2,5$/)))return 'Largest earthquake in 24 h · '+m[1]+' above M 2.5';
if((m=t.match(/^(\\d+) km al ([NSEO]{1,3}) de (.+?)( · \\d\\d:\\d\\d)?$/))&&DIR[m[2]])return m[1]+' km '+DIR[m[2]]+' of '+m[3]+(m[4]||'');
if((m=t.match(/^Aire · (.+)$/)))return 'Air · '+(D[m[1]]||m[1]);
if((m=t.match(/^ICA (\\d+) · (.*)$/)))return 'AQI '+m[1]+' · '+(D[m[2]]||m[2]);
if(t.charAt(0)==='·')return t.split(' · ').map(function(x,i){var y=i===0?x.replace(/^·\\s*/,''):x;return (i===0?'· ':'')+(D[y]||y)}).join(' · ');
return null}
function nodos(){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),o=[],n;while(n=w.nextNode()){var p=n.parentNode;if(!p||/^(SCRIPT|STYLE)$/.test(p.nodeName)||p.closest('[data-no-tr]'))continue;if(n.nodeValue.trim())o.push(n)}return o}
function attrs(){return document.querySelectorAll('[aria-label],[placeholder],[title],[alt]')}
function fecha(l){document.querySelectorAll('[data-iso]').forEach(function(e){var p=e.getAttribute('data-iso').split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2],15));
if(!orig.has(e))orig.set(e,e.textContent);e.textContent=l==='en'?new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):orig.get(e)})}
function poner(l){r.lang=l==='en'?'en':'es-CL';
nodos().forEach(function(n){if(n.parentNode&&n.parentNode.closest('[data-iso]'))return;if(!orig.has(n))orig.set(n,n.nodeValue);var o=orig.get(n),k=o.trim();
if(l!=='en'){n.nodeValue=o;return}var t=D[k]!==undefined?D[k]:regla(k);if(t===null&&trad&&trad[k]!==undefined)t=trad[k];if(t!==null)n.nodeValue=o.replace(k,t)});
document.title=l==='en'?(D[titulo0]||titulo0):titulo0;
attrs().forEach(function(e){['aria-label','placeholder','title','alt'].forEach(function(a){var v=e.getAttribute(a);if(v===null)return;var key='data-o-'+a;if(!e.hasAttribute(key))e.setAttribute(key,v);var o=e.getAttribute(key);e.setAttribute(a,l==='en'&&D[o]?D[o]:o)})});
fecha(l);b.textContent=l==='en'?'ES':'EN';b.setAttribute('aria-pressed',String(l==='en'));b.setAttribute('aria-label',l==='en'?'Ver en español':'Read in English');
try{localStorage.setItem('cofrade-idioma',l)}catch(e){}
if(l==='en'&&!hecho){hecho=true;pedir()}}
function pedir(){fetch('/en.json'+(vueltas?'?v='+vueltas:''),{cache:vueltas?'no-store':'default'}).then(function(x){return x.ok?x.json():{}}).then(function(j){j=j&&typeof j==='object'?j:{};var f=+j.__faltan||0;delete j.__faltan;
trad=Object.assign(trad||{},j);if(r.lang==='en')poner('en');if(f>0&&vueltas<6){vueltas++;setTimeout(pedir,2500)}}).catch(function(){})}
b.addEventListener('click',function(){poner(r.lang==='en'?'es':'en')});
try{if(localStorage.getItem('cofrade-idioma')==='en')poner('en')}catch(e){}})();`;

// 14-11-2026 (Germán: «un botón muy discreto, sobrio y elegante que diga "Ver más"»): el Archivo muestra 12 ediciones y el botón
// abre las anteriores de a 12; con todas a la vista, «Ver menos» vuelve a las 12. Sin JavaScript, las 12 siguen ahí.
function archivoMas(total) {
  if (total <= MAX_ARCHIVO) return "";
  return `<div class="arch-pie" id="archPie" hidden><button type="button" class="arch-mas" id="archMas" aria-controls="archivoLista" aria-expanded="false" data-no-tr `
    + `data-paso="${MAX_ARCHIVO}"><span class="am-tx">Ver más</span><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" `
    + `stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>`
    + `<span class="am-cuenta" id="archCuenta" aria-live="polite" data-no-tr></span></div><script>${ARCHIVO_JS}</script>`;
}
const ARCHIVO_JS = `(function(){var b=document.getElementById('archMas');if(!b)return;document.getElementById('archPie').hidden=false;var L=[].slice.call(document.querySelectorAll('#archivoLista a')),
paso=+b.getAttribute('data-paso')||12,c=document.getElementById('archCuenta'),tx=b.querySelector('.am-tx');
function en(){return document.documentElement.lang==='en'}
function vis(){var n=0;L.forEach(function(a){if(!a.hidden)n++});return n}
function rotulo(){var n=vis(),t=L.length,todo=n>=t;tx.textContent=todo?(en()?'See less':'Ver menos'):(en()?'See more':'Ver más');
b.setAttribute('aria-expanded',String(n>paso));b.classList.toggle('abierto',todo);
var r=t-n;c.textContent=n>paso?(en()?n+' of '+t+' editions':n+' de '+t+' ediciones'):(en()?r+' earlier':r+(r===1?' anterior':' anteriores'))}
b.addEventListener('click',function(){var n=vis();
if(n>=L.length){L.forEach(function(a,i){a.hidden=i>=paso});var s=document.getElementById('archivo');
if(s&&s.getBoundingClientRect().top<0)s.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
else{var p=null;L.forEach(function(a,i){if(i<n+paso&&a.hidden){a.hidden=false;if(!p)p=a}});if(p&&document.activeElement===b&&b.matches(':focus-visible'))p.focus()}
rotulo()});
var idi=document.getElementById('idioma');if(idi)idi.addEventListener('click',function(){setTimeout(rotulo,0)});rotulo();
document.addEventListener('DOMContentLoaded',rotulo)})();`;   // el inglés guardado se aplica después de este script

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
  "Ver más": "See more", "Ver menos": "See less",
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
  "Mercados": "Markets", "Mercados en vivo": "Live markets", "El diario de la mañana · Gratuito": "The morning paper · Free",
  "Dashboard Financiero": "Financial Dashboard", "Cada dato con su fuente": "Every figure with its source", "Hecho en Chile": "Made in Chile",
  "Edición de hoy publicada": "Today's edition is out", "Pizarra del día": "Today's board", "últimos 12 meses": "last 12 months",
  "Dólar observado": "US dollar (official rate)", "Cobre, US$ por libra": "Copper, US$ per pound", "Unidad de Fomento": "Unidad de Fomento (UF)",
  "Tasa de Política Monetaria": "Monetary policy rate", "Fuente: Banco Central de Chile, Base de Datos Estadísticos.": "Source: Central Bank of Chile, Statistical Database.",
  "Doce secciones, cada mañana, con la fuente de cada dato.": "Twelve sections every morning, with the source of every figure.",
  "Así se ve por dentro": "A look inside", "Algunos de los gráficos de la edición, tal como los recibes cada mañana.": "Some of the edition's charts, just as you get them every morning.",
  "Indicadores y monedas": "Indicators and currencies", "Industrias de Chile": "Chile's industries", "Avances por gobierno": "Progress by government", "Mar y navegación": "Sea and navigation",
  "Para socios · Muy pronto": "For members · Coming soon", "Puente de Mando · Dashboard Financiero": "The Bridge · Financial Dashboard",
  "ETF y cripto": "ETFs and crypto", "Dinero en movimiento": "Money on the move", "Radar político": "Political radar", "Calendario": "Calendar", "Herramientas": "Tools",
  "Quiero ser socio fundador": "I want to be a founding member", "Ver mercados en vivo": "See live markets", "Ingresar": "Sign in",
  "Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta, y no considera tu situación personal.":
    "General and educational information. It is not investment advice or a recommendation to buy or sell, and it does not consider your personal situation.",
  "Resumen del mundo": "World overview", "Dónde se movió el dinero hoy": "Where the money moved today", "Cripto": "Crypto", "Agenda económica": "Economic calendar",
  "USGS ↗": "USGS ↗", "fuente ↗": "source ↗", "Ver en español": "Ver en español", "Read in English": "Read in English",
};
// 14-11-2026 (Germán: «muchos textos no se están traduciendo», con capturas): portada, galería, Dashboard Financiero, Mercados en vivo,
// textos alternativos de las imágenes y el título de la pestaña. La prueba del arnés revisa que ningún texto fijo quede sin traducción.
Object.assign(EN_FIJO, {
  "Cofrade News · El diario de la mañana": "Cofrade News · The morning paper", "Mercados en vivo · Cofrade News": "Live markets · Cofrade News",
  "Chile y el mundo, ordenados en minutos y con": "Chile and the world, sorted in minutes, with", "datos verificados.": "verified data.",
  "El Imacec del mes, la proyección del año y cuánto avanza cada gobierno a igual período.": "This month's Imacec, the full-year forecast and how far each government had come at the same point in its term.",
  "Dólar, UF, IPSA, Wall Street, cobre y petróleo, con su fuente y su hora.": "Dollar, UF, IPSA, Wall Street, copper and oil, each with its source and time.",
  "Cada votación de la Sala con el voto de cada diputado y senador, y cómo votan las bancadas.": "Every floor vote, with how each deputy and senator voted and how each party bloc voted.",
  "Mapas, cifras oficiales de refugiados y su efecto en los precios que pagas.": "Maps, official refugee figures and their effect on the prices you pay.",
  "Los megaproyectos que cambiarán Chile: inversión, etapa y año de término.": "The megaprojects that will change Chile: investment, stage and completion year.",
  "Descubrimientos de la semana y el cielo de esta noche, explicados en simple.": "This week's discoveries and tonight's sky, explained simply.",
  "Tablas con proyección, fútbol, tenis, golf, Fórmula 1, NBA y equitación.": "Standings with projections: football, tennis, golf, Formula 1, NBA and equestrian.",
  "El tiempo de 9 ciudades, oleaje y mareas de los puertos, y los sismos del día.": "Weather for 9 cities, waves and tides at the ports, and the day's earthquakes.",
  "Salidas y llegadas confirmadas en los cinco aeropuertos principales.": "Confirmed departures and arrivals at the five main airports.",
  "Panoramas, estrenos y lo que no te puedes perder esta semana.": "Things to do, premieres and what not to miss this week.",
  "Fondos concursables abiertos, con su plazo y el enlace para postular.": "Open grant calls, with their deadline and the link to apply.",
  "La historia naval y de Chile que se recuerda hoy.": "The naval and Chilean history we remember today.",
  "Chile": "Chile", "Economía": "Economy", "Economía mundial": "World economy", "Tecnología": "Technology", "Mundo": "World", "Política": "Politics",
  "Ciencia": "Science", "Negocios": "Business", "Nacional": "National", "Internacional": "International", "Opinión": "Opinion",
  "Cultura": "Culture", "Salud": "Health", "Emprendimiento": "Entrepreneurship", "Inmobiliario": "Real estate", "Sociedad": "Society",
  "El dólar día a día, con la UF, el euro y el yuan.": "The dollar day by day, with the UF, the euro and the yuan.",
  "Wall Street, cobre, petróleo, IPSA y bolsas de Europa.": "Wall Street, copper, oil, IPSA and European stock markets.",
  "Qué produce cada región.": "What each region produces.", "Inversión en megaproyectos por sector.": "Megaproject investment by sector.",
  "Crecimiento, inflación, desempleo y deuda.": "Growth, inflation, unemployment and debt.",
  "Oleaje, mareas y el paso por el Estrecho de Magallanes.": "Waves, tides and passage through the Strait of Magellan.",
  "Para quienes toman decisiones: bolsa chilena y extranjera, ETF, cripto y blockchain, el dinero que entra y sale de Chile, y el radar político y regulatorio que mueve los mercados. Todo en un solo lugar, explicado en simple.":
    "For decision-makers: Chilean and global stocks, ETFs, crypto and blockchain, the money flowing in and out of Chile, and the political and regulatory radar that moves markets. All in one place, explained simply.",
  "IPSA, Wall Street, Europa y Asia, bonos, cobre, oro y petróleo.": "IPSA, Wall Street, Europe and Asia, bonds, copper, gold and oil.",
  "Los fondos que más se transan, Bitcoin, Ethereum y el ánimo del mercado cripto.": "The most traded funds, Bitcoin, Ethereum and crypto market sentiment.",
  "Qué compran y venden las AFP, los fondos mutuos y los inversionistas extranjeros.": "What pension funds (AFPs), mutual funds and foreign investors are buying and selling.",
  "Las leyes y normas que se votan y a qué sectores afectan.": "The laws and rules being voted on, and which sectors they affect.",
  "Reuniones del Banco Central, de la Reserva Federal y los datos que vienen.": "Central Bank and Federal Reserve meetings, and the data coming up.",
  "Conversor UF, dólar y euro, calculadora de IPC, interés compuesto y crédito hipotecario.": "UF, dollar and euro converter, plus CPI, compound interest and mortgage calculators.",
  "7 días gratis · Plan anual $55.000 (un mes de regalo) · Socios de la Cofradía con precio preferente": "7 days free · Annual plan CLP 55,000 (one month free) · Preferential price for Cofradía members",
  "Página web": "Website", "English": "Español", "Portada": "Home", "Pizarra del Banco Central": "Central Bank board",
  "Gráfico del dólar en los últimos dos meses": "US dollar chart for the last two months", "Variación diaria de los mercados": "Daily market moves",
  "Mapa de Chile por industria": "Map of Chile by industry", "Indicadores económicos por gobierno": "Economic indicators by government",
  "Mapa del Estrecho de Magallanes": "Map of the Strait of Magellan", "Inversión en megaproyectos por sector": "Megaproject investment by sector",
  "Socios · Cofrade News": "Members · Cofrade News", "Ingresa con tu clave.": "Sign in with your password.",
  "Informes financieros, análisis de mercado y contenidos exclusivos. La clave la entrega la Cofradía.": "Financial reports, market analysis and exclusive content. The Cofradía provides the password.",
  "Clave de socio": "Member password", "Entrar": "Sign in",
  "Gratis · Datos con el desfase que exigen las bolsas": "Free · Data delayed as the exchanges require",
  "Índices, monedas, materias primas, ETF y cripto del mundo en una sola página. Los gráficos son de TradingView; la lectura de lo que significa para Chile llega cada mañana en la edición.":
    "World indices, currencies, commodities, ETFs and crypto on a single page. Charts by TradingView; what it all means for Chile arrives every morning in the edition.",
  "Gráficos de TradingView": "Charts by TradingView", "Toca una pestaña y luego un instrumento para ver su gráfico de 12 meses.": "Tap a tab and then an instrument to see its 12-month chart.",
  "Las 500 mayores empresas de EE. UU. por sector: el tamaño es su valor bursátil y el color, cuánto subió o bajó.": "The 500 largest US companies by sector: size shows market value and colour shows how much each rose or fell.",
  "Las principales criptomonedas por valor de mercado y su variación del día.": "The main cryptocurrencies by market value and their change on the day.",
  "Los datos y decisiones que vienen en Chile, EE. UU., Europa, China y Brasil.": "Upcoming data and decisions in Chile, the US, Europe, China and Brazil.",
  "Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta. Los precios pueden tener un desfase de 15 minutos o más.":
    "General and educational information. It is not investment advice or a recommendation to buy or sell. Prices may be delayed by 15 minutes or more.",
  "Bueno": "Good", "Regular": "Moderate", "Moderado": "Moderate", "Malo": "Poor", "Alerta": "Alert", "Preemergencia": "Pre-emergency",
  "Emergencia": "Emergency", "Dañino para grupos sensibles": "Unhealthy for sensitive groups", "Dañino": "Unhealthy", "Muy dañino": "Very unhealthy", "Peligroso": "Hazardous",
});
// 13-11-2026 · textos del Buzón de sugerencias y del pie (las secciones ya están arriba)
Object.assign(EN_FIJO, {
  "Buzón": "Suggestions", "Buzón de sugerencias": "Suggestion box", "Ayúdanos a hacer el mejor diario de Chile": "Help us make the best daily briefing in Chile",
  "Paso 1 de 3": "Step 1 of 3", "¿Qué es lo que más te gusta?": "What do you like most?", "Marca todas las que quieras.": "Tick as many as you like.",
  "¿Qué te gustaría que agreguemos?": "What would you like us to add?", "¿Con qué frecuencia lees Cofrade News?": "How often do you read Cofrade News?",
  "Del 0 al 10, ¿qué tan probable es que recomiendes Cofrade News a un amigo?": "From 0 to 10, how likely are you to recommend Cofrade News to a friend?",
  "Nada probable": "Not likely", "Muy probable": "Very likely", "Escribe lo que quieras": "Write anything you like",
  "Una idea, una crítica, una felicitación…": "An idea, a criticism, a compliment…", "Nombre *": "First name *", "Apellido *": "Last name *",
  "Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email.": "We will email you to confirm it is you. We never publish your email.",
  "Acepto que Cofrade News use estos datos solo para mejorar el diario y responder mi sugerencia. No se publican ni se venden (Ley 19.628).":
    "I agree that Cofrade News may use this data only to improve the briefing and reply to my suggestion. It is never published or sold (Chilean Law 19,628).",
  "¡Gracias por escribirnos!": "Thank you for writing to us!", "Cerrar": "Close", "Atrás": "Back", "Siguiente": "Next", "Enviar al Buzón": "Send",
  "Medimos las visitas sin cookies y sin datos personales. ¿Una idea para mejorar?": "We measure visits without cookies or personal data. Have an idea to improve?",
  "Escríbenos al Buzón": "Write to our suggestion box",
  "Los gráficos": "The charts", "Las fuentes verificadas": "The verified sources", "La versión en inglés": "The English version", "Descargar en PDF": "PDF download",
  "El diseño": "The design", "Alertas por WhatsApp": "WhatsApp alerts", "Versión en audio (podcast)": "Audio version (podcast)",
  "Envío por correo cada mañana": "Morning email delivery", "App para el celular": "Mobile app", "Más noticias de regiones": "More regional news",
  "Análisis de inversiones": "Investment analysis", "Más deportes": "More sports", "Agenda de eventos de la Cofradía": "Cofradía events calendar",
  "Clasificados entre socios": "Members' classifieds", "Encuestas a los lectores": "Reader polls", "Más noticias internacionales": "More international news",
  "Tecnología e inteligencia artificial": "Technology and AI", "Salud y bienestar": "Health and wellbeing", "Cultura y panoramas": "Culture and things to do",
  "Historia naval": "Naval history", "Todos los días": "Every day", "Varias veces por semana": "Several times a week", "Una vez por semana": "Once a week",
  "Es mi primera vez": "It's my first time",
});

// 13-11-2026 (Germán: «que no puedan descargar los archivos HTML, solo el PDF del boletín»): en la edición se desactivan
// «Guardar como» (Ctrl/Cmd+S), «Ver código» (Ctrl/Cmd+U) y el menú del botón derecho. El botón «Descargar PDF» sigue igual.
// Es un freno para el lector común, no un candado: quien sepa usar las herramientas del navegador igual puede copiar la página.
const PROTEGER = `<script>(function(){function no(e){e.preventDefault();e.stopPropagation();return false}
document.addEventListener('keydown',function(e){var k=(e.key||'').toLowerCase();if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='u'))return no(e)},true);
document.addEventListener('contextmenu',function(e){var t=e.target;if(t&&t.closest&&t.closest('input,textarea,[contenteditable]'))return;return no(e)},true);
document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')no(e)},true);})();<\/script>`;

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

// 13-11-2026 · la cabecera queda fija: sombra al bajar, altura medida para que los enlaces internos no queden tapados,
// y en el celular un degradé avisa que el menú tiene más opciones hacia la derecha.
const CABECERA_JS = `
(function(){var c=document.querySelector('.cab');if(!c)return;var n=c.querySelector('nav'),r=document.documentElement;
function alto(){r.style.setProperty('--alto-cab',c.offsetHeight+'px')}alto();if(window.ResizeObserver)new ResizeObserver(alto).observe(c);else addEventListener('resize',alto);
var p=false;function sombra(){var s=scrollY>4;if(s!==p){p=s;c.classList.toggle('pegado',s)}}sombra();addEventListener('scroll',sombra,{passive:true});
function mas(){if(n)n.classList.toggle('mas',n.scrollLeft+n.clientWidth<n.scrollWidth-4)}mas();if(n)n.addEventListener('scroll',mas,{passive:true});addEventListener('resize',mas)})();`;

/*__BUZON_PANEL__*/
/*__SUSCRIPCIONES__*/

// 13-11-2026 · carrusel de marcas auspiciadoras (pie de página). Se detiene con el mouse o el foco y queda quieto con «reducir movimiento».
function bloqueMarcas() {
  const ms = (MARCAS && MARCAS.marcas) || [];
  if (!ms.length) return "";
  const uno = (m, oculto) => {
    const est = `style="--mf:${/^#[0-9A-Fa-f]{6}$/.test(m.fondo || "") ? m.fondo : "#FFFFFF"};--mc:${/^#[0-9A-Fa-f]{6}$/.test(m.color || "") ? m.color : "#0B1F3A"}"`;
    const dentro = `<img src="/marcas/${esc(m.logo)}" alt="${oculto ? "" : esc(m.nombre)}" decoding="async">${m.texto ? `<span data-no-tr>${esc(m.texto)}</span>` : ""}`;
    const ext = oculto ? ' aria-hidden="true" tabindex="-1"' : "";
    return m.url
      ? `<a class="marca-a" ${est} href="${esc(urlSegura(m.url))}" target="_blank" rel="noopener"${ext}>${dentro}</a>`
      : `<button type="button" class="marca-a pub-abrir" ${est} data-interes="${esc(m.nombre)}"${ext}>${dentro}</button>`;
  };
  let lista = ms;
  while (lista.length < 6) lista = lista.concat(ms);   // con pocas marcas, la cinta igual llena el ancho
  return `<div class="hoja marcas" aria-label="Marcas que nos auspician"><h4>Marcas que nos auspician</h4><div class="cinta"><div class="pista">${lista.map((m, i) => uno(m, i >= ms.length)).join("")}${lista.map((m) => uno(m, true)).join("")}</div></div></div>`;
}

function marco({ titulo, descripcion, cuerpo, canonica, hero = "" }) {
  return `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descripcion)}"><link rel="canonical" href="https://${DOMINIO}${canonica || "/"}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:type" content="website">
<meta property="og:url" content="https://${DOMINIO}${canonica || "/"}"><meta property="og:locale" content="es_CL"><meta name="theme-color" content="#0B1F3A">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,600&display=swap"><style>${CSS}</style></head><body>
<header class="cab"><div class="hoja"><a class="marca" href="/" aria-label="Cofrade News, portada"><img class="l-claro" src="${LOGO_CLARO}" alt="" width="52" height="52"><img class="l-oscuro" src="${LOGO_OSCURO}" alt="" width="52" height="52"><b>Cofrade News</b></a>
<span class="fecha" data-iso="${fechaChile()}">${esc(fechaLarga(fechaChile()))}</span>
<nav aria-label="Secciones"><a href="/edicion">Edición de hoy</a><button type="button" class="nav-b buzon-abrir" aria-haspopup="dialog"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/></svg>Buzón</button><a href="/mercados">Mercados</a><a href="/#archivo">Archivo</a><a href="/socios">Socios</a><a href="/#publicite">Publicite</a></nav>
<div class="herr"><button class="tema idioma" id="idioma" type="button" lang="en" aria-pressed="false" aria-label="Read in English" title="English">EN</button><button class="tema" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></div></div></header>
${hero}<main class="hoja">${cuerpo}</main>
${bloqueMarcas()}${DIALOGO}${BUZON}
<footer class="hoja pie"><img class="pie-agua" src="/marca-agua.webp" alt="" aria-hidden="true">Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.<br>
Medimos las visitas sin cookies y sin datos personales. ¿Una idea para mejorar? <button type="button" class="enlace buzon-abrir">Escríbenos al Buzón</button>.<br>
© ${fechaChile().slice(0, 4)} <span>Cofrade News. Todos los derechos reservados.</span></footer><script>window.__EN=${JSON.stringify(EN_FIJO).replace(/</g, "\\u003c")};${SCRIPT}${BUZON_JS}${CABECERA_JS}</script>
<script type="speculationrules">{"prerender":[{"where":{"or":[{"href_matches":"/edicion"},{"href_matches":"/edicion/*"}]},"eagerness":"moderate"}]}</script></body></html>`;
}

const SECCIONES = ["Crecimiento de Chile", "Economía y mercados", "Política y Congreso", "Conflictos en el mundo", "Perspectivas 2050",
  "Ciencia y Astronomía", "Deportes", "Clima, mar y sismos", "Vuelos comerciales", "Entretenimiento", "Fondos y subsidios", "Efemérides"];

// 13-11-2026 · dibujos de cada sección (trazo dorado, 44 px)
const ICONO = {
  crecimiento: '<path d="M6 34 16 24l7 6 15-17"/><path d="M31 13h7v7"/><path d="M6 40h34"/>',
  economia: '<path d="M10 10v26M22 6v32M34 14v20"/><rect x="7" y="16" width="6" height="12" rx="1"/><rect x="19" y="12" width="6" height="16" rx="1"/><rect x="31" y="18" width="6" height="9" rx="1"/>',
  congreso: '<path d="M6 34a17 17 0 0 1 34 0"/><path d="M12 34a11 11 0 0 1 22 0"/><path d="M4 38h38"/><circle cx="23" cy="13" r="2"/>',
  conflictos: '<circle cx="23" cy="23" r="16"/><path d="M7 23h32M23 7c-6 5-6 27 0 32M23 7c6 5 6 27 0 32"/><path d="M31 15l3-3"/>',
  perspectivas: '<path d="M6 38V22h8v16M18 38V12h10v26M32 38V26h8v12"/><path d="M4 38h38M23 12V6l9 4"/>',
  ciencia: '<ellipse cx="23" cy="23" rx="17" ry="7" transform="rotate(-25 23 23)"/><circle cx="23" cy="23" r="5"/><circle cx="37" cy="15" r="2"/>',
  deportes: '<circle cx="23" cy="23" r="15"/><path d="M23 8v30M8 23h30M12 12c6 4 6 18 0 22M34 12c-6 4-6 18 0 22"/>',
  clima: '<path d="M4 18c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/><path d="M4 27c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/><path d="M4 36c5-5 9-5 14 0s9 5 14 0 9-5 10-2"/>',
  vuelos: '<path d="M6 34c10-16 22-22 34-24"/><path d="M33 7l7 3-3 7"/><circle cx="8" cy="34" r="2"/>',
  entretenimiento: '<rect x="6" y="11" width="34" height="24" rx="3"/><path d="M6 17h34M6 29h34M13 11v24M33 11v24"/>',
  fondos: '<ellipse cx="23" cy="12" rx="12" ry="4"/><path d="M11 12v8c0 2 5 4 12 4s12-2 12-4v-8M11 20v8c0 2 5 4 12 4s12-2 12-4v-8M11 28v6c0 2 5 4 12 4s12-2 12-4v-6"/>',
  efemerides: '<circle cx="23" cy="9" r="3"/><path d="M23 12v26M15 18h16M9 28c0 6 6 10 14 10s14-4 14-10"/><path d="M9 28l-3 3M37 28l3 3"/>',
};
const icono = (n) => `<svg viewBox="0 0 46 46" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO[n] || ""}</svg>`;
const SECCIONES_LUJO = [
  ["crecimiento", "Crecimiento de Chile", "El Imacec del mes, la proyección del año y cuánto avanza cada gobierno a igual período."],
  ["economia", "Economía y mercados", "Dólar, UF, IPSA, Wall Street, cobre y petróleo, con su fuente y su hora."],
  ["congreso", "Política y Congreso", "Cada votación de la Sala con el voto de cada diputado y senador, y cómo votan las bancadas."],
  ["conflictos", "Conflictos en el mundo", "Mapas, cifras oficiales de refugiados y su efecto en los precios que pagas."],
  ["perspectivas", "Perspectivas 2050", "Los megaproyectos que cambiarán Chile: inversión, etapa y año de término."],
  ["ciencia", "Ciencia y Astronomía", "Descubrimientos de la semana y el cielo de esta noche, explicados en simple."],
  ["deportes", "Deportes", "Tablas con proyección, fútbol, tenis, golf, Fórmula 1, NBA y equitación."],
  ["clima", "Clima, mar y sismos", "El tiempo de 9 ciudades, oleaje y mareas de los puertos, y los sismos del día."],
  ["vuelos", "Vuelos comerciales", "Salidas y llegadas confirmadas en los cinco aeropuertos principales."],
  ["entretenimiento", "Entretenimiento", "Panoramas, estrenos y lo que no te puedes perder esta semana."],
  ["fondos", "Fondos y subsidios", "Fondos concursables abiertos, con su plazo y el enlace para postular."],
  ["efemerides", "Efemérides", "La historia naval y de Chile que se recuerda hoy."],
];

// Gráfico lineal mínimo (SVG) para la pizarra de la portada: área dorada y línea, sin bibliotecas.
function spark(datos, w = 150, h = 46) {
  const v = (datos || []).map((d) => Number(d[1])).filter((x) => isFinite(x));
  if (v.length < 2) return "";
  const min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
  const pts = v.map((y, i) => [((i / (v.length - 1)) * (w - 2) + 1).toFixed(1), (h - 3 - ((y - min) / r) * (h - 8)).toFixed(1)]);
  const linea = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join("");
  const id = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6C77A" stop-opacity=".38"/><stop offset="1" stop-color="#E6C77A" stop-opacity="0"/></linearGradient></defs>`
    + `<path d="${linea}L${w - 1} ${h}L1 ${h}Z" fill="url(#${id})"/><path d="${linea}" fill="none" stroke="#E6C77A" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

async function historia(ctx) {
  try {
    const r = await desdeGitHub("datos/historia.json", 3600, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}

function pizarra(h, p) {
  const S = (h && h.series) || {};
  const fila = (clave, titulo, pre, dec, dias = 365) => {
    const s = S[clave];
    if (!s || !s.datos || s.datos.length < 2) return "";
    const datos = s.datos.slice(-Math.min(s.datos.length, Math.round(dias * 0.7)));   // ~250 días hábiles
    const ult = datos[datos.length - 1], ant = s.datos[Math.max(0, s.datos.length - 22)];
    const varp = ant && ant[1] ? ((ult[1] / ant[1]) - 1) * 100 : null;
    return `<div class="piz-fila"><div><small>${esc(titulo)} · ${esc(ult[0].split("-").reverse().join("-"))}</small><b>${esc(pre)}${num(ult[1], dec)}</b>`
      + `${varp !== null ? `<span class="var ${varp > 0 ? "sube" : varp < 0 ? "baja" : ""}">${varp > 0 ? "+" : varp < 0 ? "−" : ""}${num(Math.abs(varp), 1)} % en un mes</span>` : ""}</div>${spark(datos)}</div>`;
  };
  const filas = fila("dolar", "Dólar observado", "$", 2) + fila("cobre", "Cobre, US$ por libra", "US$", 2) + fila("uf", "Unidad de Fomento", "$", 2);
  if (!filas) return "";
  const tpm = S.tpm && S.tpm.datos && S.tpm.datos.length ? S.tpm.datos[S.tpm.datos.length - 1][1] : null;
  return `<aside class="pizarra" aria-label="Pizarra del Banco Central"><div class="piz-cab">Pizarra del día <span>últimos 12 meses</span></div>${filas}`
    + `${tpm !== null ? `<div class="piz-fila"><div><small>Tasa de Política Monetaria</small><b>${num(tpm, 2)} %</b></div><svg viewBox="0 0 150 46" aria-hidden="true"></svg></div>` : ""}`
    + `<div class="piz-pie">Fuente: Banco Central de Chile, Base de Datos Estadísticos.</div></aside>`;
}

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
  const h = await historia(ctx);
  const piz = pizarra(h, p);
  const hero = `<section class="lujo" aria-label="Portada"><img class="agua" src="/marca-agua.webp" alt="" aria-hidden="true">
<div class="hoja lujo-in"><div class="lujo-txt"><span class="kicker">El diario de la mañana · Gratuito</span>
<h1>Chile y el mundo, ordenados en minutos y con <em>datos verificados.</em></h1>
<p class="lede">Cada mañana a las 07:30: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.</p>
<div class="acciones"><a class="btn oro" href="/edicion">Leer la edición${ultima === hoy ? " de hoy" : ""} →</a><a class="btn claro" href="#puente">Dashboard Financiero</a><a class="btn claro" href="/mercados">Mercados en vivo</a></div>
<ul class="sellos"><li>${ultima ? (ultima === hoy ? "Edición de hoy publicada" : "Última edición: " + esc(fechaLarga(ultima))) : "Primera edición muy pronto"}</li><li>Cada dato con su fuente</li><li>Hecho en Chile</li></ul></div>
${piz || `<aside class="pizarra"><div class="piz-cab">Hoy · <span data-iso="${hoy}">${esc(fechaLarga(hoy))}</span></div><p style="margin:6px 0 0;color:#D8D2C4">${esc(estado)}</p></aside>`}</div></section>`;
  const cuerpo = `
<section aria-labelledby="t-secc" style="border:0;padding-top:40px"><span class="kicker">${ultima ? (ultima === hoy ? "Hoy · " : "Última edición · ") : ""}<span data-iso="${ultima || hoy}">${esc(fechaLarga(ultima || hoy))}</span></span>
<h2 class="titulo-lujo" id="t-secc">${esc(estado)}</h2><p class="sub">Doce secciones, cada mañana, con la fuente de cada dato.</p>
<div class="secc">${SECCIONES_LUJO.map(([ic, t, d]) => `<a class="sec-card" href="/edicion" style="text-decoration:none">${icono(ic)}<div><b>${esc(t)}</b><p>${esc(d)}</p></div></a>`).join("")}</div></section>
<section id="en-vivo" aria-labelledby="t-vivo"><h3 id="t-vivo"><span class="vivo">En vivo</span></h3>
<p class="sub">${hora ? `Actualizado a las ${esc(hora)}${p.proxima ? ` · próxima actualización ${esc(p.proxima)}` : ""}.` : "Se actualiza cada 2 horas, de 07:00 a 23:00."} Banco Central, Bolsa de Santiago, USGS, aire medido y los medios del país.</p>
${bloqueCifras(p)}${bloqueTierra(p)}${bloqueTitulares(p)}</section>
<section aria-labelledby="t-gal"><h2 class="titulo-lujo" id="t-gal">Así se ve por dentro</h2><p class="sub">Algunos de los gráficos de la edición, tal como los recibes cada mañana.</p>
<div class="galeria">
<figure class="g-a"><img src="/capturas/indicadores.webp" alt="Gráfico del dólar en los últimos dos meses" loading="lazy" width="1000" height="426"><figcaption><b>Indicadores y monedas</b>El dólar día a día, con la UF, el euro y el yuan.</figcaption></figure>
<figure class="g-b"><img src="/capturas/mercados.webp" alt="Variación diaria de los mercados" loading="lazy" width="962" height="886"><figcaption><b>Mercados</b>Wall Street, cobre, petróleo, IPSA y bolsas de Europa.</figcaption></figure>
<figure class="g-c"><img src="/capturas/industrias.webp" alt="Mapa de Chile por industria" loading="lazy" width="700" height="1242"><figcaption><b>Industrias de Chile</b>Qué produce cada región.</figcaption></figure>
<figure class="g-d"><img src="/capturas/perspectivas-2050.webp" alt="Inversión en megaproyectos por sector" loading="lazy" width="1000" height="721"><figcaption><b>Perspectivas 2050</b>Inversión en megaproyectos por sector.</figcaption></figure>
<figure class="g-e"><img src="/capturas/gobiernos.webp" alt="Indicadores económicos por gobierno" loading="lazy" width="1000" height="319"><figcaption><b>Avances por gobierno</b>Crecimiento, inflación, desempleo y deuda.</figcaption></figure>
<figure class="g-f"><img src="/capturas/estrecho.webp" alt="Mapa del Estrecho de Magallanes" loading="lazy" width="1000" height="367"><figcaption><b>Mar y navegación</b>Oleaje, mareas y el paso por el Estrecho de Magallanes.</figcaption></figure>
</div></section>
<section id="puente" style="border:0;padding:0"><div class="puente"><img class="agua" src="/marca-agua.webp" alt="" aria-hidden="true">
<span class="kicker">Para socios · Muy pronto</span><h2>Puente de Mando · Dashboard Financiero</h2>
<p class="lede">Para quienes toman decisiones: bolsa chilena y extranjera, ETF, cripto y blockchain, el dinero que entra y sale de Chile, y el radar político y regulatorio que mueve los mercados. Todo en un solo lugar, explicado en simple.</p>
<div class="pilares">
<div class="pilar"><b>Mercados</b><span>IPSA, Wall Street, Europa y Asia, bonos, cobre, oro y petróleo.</span></div>
<div class="pilar"><b>ETF y cripto</b><span>Los fondos que más se transan, Bitcoin, Ethereum y el ánimo del mercado cripto.</span></div>
<div class="pilar"><b>Dinero en movimiento</b><span>Qué compran y venden las AFP, los fondos mutuos y los inversionistas extranjeros.</span></div>
<div class="pilar"><b>Radar político</b><span>Las leyes y normas que se votan y a qué sectores afectan.</span></div>
<div class="pilar"><b>Calendario</b><span>Reuniones del Banco Central, de la Reserva Federal y los datos que vienen.</span></div>
<div class="pilar"><b>Herramientas</b><span>Conversor UF, dólar y euro, calculadora de IPC, interés compuesto y crédito hipotecario.</span></div>
</div>
<div class="precio-lujo"><span class="monto">$5.000 <small>al mes</small></span><span class="extra">7 días gratis · Plan anual $55.000 (un mes de regalo) · Socios de la Cofradía con precio preferente</span><span class="extra">Socios fundadores: te inscribes hoy y el primer cobro llega el 1 de diciembre de 2026.</span></div>
<div class="acciones"><a class="btn oro" href="/socios/fundador">Quiero ser socio fundador</a><a class="btn claro" href="/mercados">Ver mercados en vivo</a></div>
<p class="legal">Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta, y no considera tu situación personal.</p></div></section>
<section id="archivo" aria-labelledby="t-arch"><h3 id="t-arch">Archivo</h3><p class="sub">Las 12 ediciones publicadas más recientes.</p>
${lista.length ? `<div class="archivo" id="archivoLista">${lista.map((f, i) => `<a href="/edicion/${f}" data-iso="${f}"${i >= MAX_ARCHIVO ? " hidden" : ""}>${esc(fechaLarga(f))}</a>`).join("")}</div>${archivoMas(lista.length)}` : `<p class="aviso">El archivo empieza con la próxima edición.</p>`}</section>
<section id="socios" aria-labelledby="t-soc"><div class="socios"><div><h3 id="t-soc">Área de socios</h3>
<p class="sub">Informes financieros, análisis de mercado y contenidos exclusivos para socios.</p><a class="btn linea" href="/socios">Ingresar</a></div>
<div class="tarjeta" id="publicite"><span class="kicker">Publicite aquí</span><p style="margin:8px 0 6px">Su marca cada mañana frente a lectores que deciden.</p>
<div class="precio">UF 1 <small style="font-size:15px;color:var(--gris)">al mes</small></div><div class="acciones" style="margin-top:14px"><button type="button" class="btn oro pub-abrir" data-interes="Cofrade News" aria-haspopup="dialog">Quiero publicitar</button></div></div></div></section>`;
  return { cuerpo, p, hero };
}

async function portada(env, ctx) {
  const { cuerpo, hero, p } = await cuerpoPortada(ctx);
  ctx.waitUntil(revivirPulso(env, p));
  return html(marco({ titulo: "Cofrade News · El diario de la mañana", descripcion: "Chile y el mundo cada mañana: economía, política y Congreso, conflictos, ciencia, deportes, clima y vuelos, con datos verificados. Gratuito.", cuerpo, hero }), 200,
    { "Cache-Control": "public, max-age=120" });
}

// 13-11-2026 · /mercados: widgets oficiales de TradingView (gratis para sitios web, con su atribución visible). Datos con el desfase
// que exigen las bolsas. Solo esta página los carga (su propia política de seguridad).
function tv(tipo, cfg, alto) {
  return `<div class="tradingview-widget-container" style="height:${alto}px"><div class="tradingview-widget-container__widget" style="height:calc(100% - 32px)"></div>`
    + `<div class="tradingview-widget-copyright"><a href="https://es.tradingview.com/" rel="noopener nofollow" target="_blank">Gráficos de TradingView</a></div>`
    + `<script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-${tipo}.js" async>${JSON.stringify({ locale: "es", colorTheme: "light", isTransparent: true, ...cfg })}<\/script></div>`;
}
function paginaMercados() {
  const cinta = tv("ticker-tape", { symbols: [
    { proName: "FX_IDC:USDCLP", title: "Dólar / peso" }, { proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
    { proName: "FOREXCOM:DJI", title: "Dow Jones" }, { proName: "COMEX:HG1!", title: "Cobre" }, { proName: "TVC:GOLD", title: "Oro" }, { proName: "TVC:UKOIL", title: "Petróleo Brent" },
    { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" }, { proName: "BITSTAMP:ETHUSD", title: "Ethereum" }, { proName: "FX:EURUSD", title: "Euro / dólar" } ],
    showSymbolLogo: true, displayMode: "adaptive" }, 78);
  const resumen = tv("market-overview", { dateRange: "12M", showChart: true, width: "100%", height: "100%", tabs: [
    { title: "Índices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow Jones" }, { s: "INDEX:NKY", d: "Nikkei 225" }, { s: "INDEX:DEU40", d: "DAX" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }] },
    { title: "Materias primas", symbols: [{ s: "COMEX:HG1!", d: "Cobre" }, { s: "TVC:GOLD", d: "Oro" }, { s: "TVC:SILVER", d: "Plata" }, { s: "TVC:UKOIL", d: "Petróleo Brent" }, { s: "TVC:USOIL", d: "Petróleo WTI" }] },
    { title: "Monedas", symbols: [{ s: "FX_IDC:USDCLP", d: "Dólar / peso chileno" }, { s: "FX:EURUSD", d: "Euro / dólar" }, { s: "FX_IDC:USDBRL", d: "Dólar / real" }, { s: "FX_IDC:USDCNY", d: "Dólar / yuan" }] },
    { title: "ETF", symbols: [{ s: "AMEX:SPY", d: "SPY · S&P 500" }, { s: "NASDAQ:QQQ", d: "QQQ · Nasdaq 100" }, { s: "ECH", d: "ECH · Acciones de Chile" }, { s: "AMEX:EWZ", d: "EWZ · Brasil" }, { s: "AMEX:GLD", d: "GLD · Oro" }, { s: "NASDAQ:IBIT", d: "IBIT · Bitcoin" }] },
    { title: "Cripto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }, { s: "COINBASE:SOLUSD", d: "Solana" }] } ] }, 560);
  const calor = tv("stock-heatmap", { dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" }, 520);
  const cripto = tv("crypto-coins-heatmap", { dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" }, 460);
  const agenda = tv("events", { importanceFilter: "0,1", countryFilter: "cl,us,eu,cn,br", width: "100%", height: "100%" }, 560);
  const cuerpo = `<section style="border:0;padding-top:34px"><span class="kicker">Gratis · Datos con el desfase que exigen las bolsas</span>
<h1 class="titulo-lujo" style="font-size:clamp(34px,5vw,54px)">Mercados en vivo</h1>
<p class="lede">Índices, monedas, materias primas, ETF y cripto del mundo en una sola página. Los gráficos son de TradingView; la lectura de lo que significa para Chile llega cada mañana en la edición.</p></section>
${cinta}
<section aria-labelledby="t-res"><h2 class="titulo-lujo" id="t-res">Resumen del mundo</h2><p class="sub">Toca una pestaña y luego un instrumento para ver su gráfico de 12 meses.</p>${resumen}</section>
<section aria-labelledby="t-cal"><h2 class="titulo-lujo" id="t-cal">Dónde se movió el dinero hoy</h2><p class="sub">Las 500 mayores empresas de EE. UU. por sector: el tamaño es su valor bursátil y el color, cuánto subió o bajó.</p>${calor}</section>
<section aria-labelledby="t-cri"><h2 class="titulo-lujo" id="t-cri">Cripto</h2><p class="sub">Las principales criptomonedas por valor de mercado y su variación del día.</p>${cripto}</section>
<section aria-labelledby="t-age"><h2 class="titulo-lujo" id="t-age">Agenda económica</h2><p class="sub">Los datos y decisiones que vienen en Chile, EE. UU., Europa, China y Brasil.</p>${agenda}</section>
<p class="legal" style="color:var(--gris)">Información general y educativa. No constituye asesoría de inversión ni recomendación de compra o venta. Los precios pueden tener un desfase de 15 minutos o más.</p>`;
  return html(marco({ titulo: "Mercados en vivo · Cofrade News", descripcion: "Índices, monedas, materias primas, ETF y cripto del mundo en una sola página, gratis.", cuerpo, canonica: "/mercados" }), 200,
    { "Cache-Control": "public, max-age=300" }, CSP_MERCADOS);
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


// 14-11-2026 (Germán: «verificar que todo funcione»): «En vivo» decía «Actualizado a las 03:40» a las 11:39. GitHub corre los
// horarios programados cuando puede: el «Pulso del día», programado 9 veces al día, corrió 2 o 3. La cuenta gratuita de Cloudflare
// ya usa sus 5 relojes (Cron Triggers) en otros proyectos, así que el reloj es la visita: si alguien abre la portada y el Pulso tiene
// más de 2 horas y 10 minutos, el sitio le pide a GitHub que lo corra. Un candado en D1 (tabla config) deja pasar un pedido por hora
// en todo el mundo. Necesita la clave GITHUB_DISPATCH (token de GitHub solo para «Actions» de cofrade-datos, creado por Germán);
// sin ella no hace nada y la portada sigue igual. Si algún día este Worker tiene un reloj propio, scheduled() hace lo mismo.
// Auditoría del 14-11: de noche no se pide (el Pulso programado va de 07 a 23 h; así los robots nocturnos no gastan corridas) y el
// resultado de cada pedido queda en config ('pulso_resultado') y se ve en /panel: una llave vencida (401) ya no pasa en silencio.
const PULSO_VIEJO_MIN = 130, PULSO_CANDADO_MIN = 60;
const _FMT_HORA_CL = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23" });
function pulsoEnHorario(env, ms) {
  const [a, b] = String(env.PULSO_HORAS || "7-23").split("-").map(Number);
  const h = Number(_FMT_HORA_CL.format(new Date(ms)));
  return !(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(h)) || (h >= a && h <= b);
}
async function pedirPulso(env) {
  if (!env.GITHUB_DISPATCH) return "sin clave";
  const r = await fetch("https://api.github.com/repos/germanperey/cofrade-datos/actions/workflows/pulso.yml/dispatches", {
    method: "POST", body: JSON.stringify({ ref: "main" }),
    headers: { Authorization: `Bearer ${env.GITHUB_DISPATCH}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cofrade-news-web", "Content-Type": "application/json" } });
  return String(r.status);
}
async function revivirPulso(env, p) {
  try {
    if (!env.GITHUB_DISPATCH || !env.DB) return "sin clave";
    const t = Date.parse(p && p.generado);
    if (!Number.isFinite(t)) return "sin fecha";
    const ahora = Date.now();
    if (ahora - t < PULSO_VIEJO_MIN * 60000) return "al día";
    if (!pulsoEnHorario(env, ahora)) return "de noche";
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('pulso_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - PULSO_CANDADO_MIN * 60000).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya pedido";
    let res;
    try { res = await pedirPulso(env); } catch { res = "sin conexión"; }
    await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('pulso_resultado', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor")
      .bind(JSON.stringify({ estado: res, hora: new Date(ahora).toISOString() })).run();
    return res;
  } catch { return "error"; }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pedirPulso(env).catch(() => "error"));
  },
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.hostname === "cofrad.es") return Response.redirect(`https://${DOMINIO}${u.pathname}${u.search}`, 301);
    const p = u.pathname.replace(/\/+$/, "") || "/";
    try {
      if (p === "/" && req.method === "GET") { ctx.waitUntil(contarVisita(req, env, "/")); return await portada(env, ctx); }
      if (p === "/edicion") {
        const l = await indice(ctx);
        return l.length ? Response.redirect(`https://${u.host}/edicion/${l[0]}`, 302) : Response.redirect(`https://${u.host}/`, 302);
      }
      const m = p.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        // 13-11-2026 (Germán: «demora mucho en cargar»): una edición pasada ya no cambia, así que se guarda 1 día en el borde y
        // 1 hora en el navegador; la de hoy, 10 minutos. Los gráficos se dibujan recién cuando el lector llega a ellos (LENTO).
        const pasada = m[1] < fechaChile(), ttl = pasada ? 86400 : 600;
        const r = (await desdeGitHub(`completa/${m[1]}`, ttl, ctx, rutaEdicion(m[1], true))) || (pasada && (await desdeGitHub(`permanente/${m[1]}`, 86400, ctx, rutaPermanente(m[1]))))
          || (await desdeGitHub(`ediciones/Cofrade-News-${m[1]}.html`, ttl, ctx));
        if (!r) return html(marco({ titulo: "Edición no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esa edición no está.</h1><p class="lede">Vuelve a la <a href="/">portada</a> para ver las disponibles.</p></section>` }), 404);
        ctx.waitUntil(contarVisita(req, env, p));
        const resp = new Response(r.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": "inline", "X-Robots-Tag": "noarchive",
          "Cache-Control": pasada ? "public, max-age=3600, stale-while-revalidate=86400" : "public, max-age=600", ...SEGURIDAD } });
        if (typeof HTMLRewriter === "undefined") return resp;
        return new HTMLRewriter()   // 13-11-2026: la edición también lleva el escudo de la Cofradía como ícono
          .on('link[rel~="icon"]', { element(e) { e.remove(); } })
          .on("body", { element(e) { e.append(PROTEGER + MEDIR, { html: true }); } })
          .on("head", { element(e) { e.prepend(LENTO, { html: true }); e.append('<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64"><link rel="apple-touch-icon" href="/apple-touch-icon.png">', { html: true }); } })
          .transform(resp);
      }
      if (p === "/mercados") { ctx.waitUntil(contarVisita(req, env, "/mercados")); return paginaMercados(); }
      // 13-11-2026 · Buzón de sugerencias, medición de lectura y Panel de Control
      if (p === "/buzon" && req.method === "POST") return await recibirBuzon(req, env, ctx).catch(() => jsonR({ ok: false, error: "No pudimos guardar tu sugerencia en este momento. Intenta de nuevo en unos minutos." }, 503));
      if (p === "/buzon/verificar") return await verificarBuzon(req, u, env);
      if (p === "/buzon") return Response.redirect(`https://${u.host}/#buzon`, 302);   // enlace corto para compartir: abre el Buzón
      if (p === "/m" && req.method === "POST") return await recibirLectura(req, env, ctx);
      if (p === "/panel/entrar" && req.method === "POST") return await entrarPanel(req, env);
      if (p === "/panel/salir") return new Response(null, { status: 303, headers: { Location: "/panel", "Set-Cookie": "cn_adm=; Max-Age=0; Path=/panel; Secure; HttpOnly; SameSite=Strict" } });
      if (p === "/panel/buzon.csv") return await panelCsv(req, env);
      if (p === "/panel") return await panel(req, env);
      const cap = p.match(/^\/capturas\/([a-z0-9-]+\.webp)$/);
      if (cap || p === "/marca-agua.webp") {
        const r = await desdeGitHub(cap ? `sitio/capturas/${cap[1]}` : "sitio/marca-agua.webp", 86400, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      if (p === "/contacto" && req.method === "POST") return await contacto(req, ctx);
      if (p === "/en.json") {
        let t = {};
        try { t = await traduccionesPortada(env, ctx); } catch { t = {}; }
        // a medio traducir: que el navegador no lo guarde (vuelve a pedir en 2,5 s); completo: 10 minutos
        return new Response(JSON.stringify(t), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": t.__faltan ? "no-store" : "public, max-age=600", ...SEGURIDAD } });
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
      // 14-11-2026: socios fundadores del Dashboard Financiero con Mercado Pago (modulos/suscripciones.js)
      if (p === "/socios/fundador") {
        if (req.method === "POST") return await crearSuscripcion(req, env, ctx).catch(() => jsonR({ ok: false, error: "No pudimos conectar con Mercado Pago. Intenta de nuevo en unos minutos." }, 503));
        return paginaFundador(env, env.DB ? await pctCofradia(env) : 20);
      }
      if (p === "/socios/gracias") return await paginaGracias(u, env);
      if (p === "/socios/condiciones") return paginaCondiciones();
      if (p === "/panel/suscripciones" && req.method === "POST") return await accionSuscripciones(req, env).catch(() => new Response(null, { status: 303, headers: { Location: "/panel" } }));
      if (p === "/mp/aviso" && req.method === "POST") return await avisoMP(req, u, env, ctx).catch(() => jsonR({ ok: false }, 500));
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
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /socios\nDisallow: /panel\nDisallow: /buzon\nSitemap: https://${DOMINIO}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain" } });
      if (p === "/sitemap.xml") {
        const l = await indice(ctx);
        const x = [`https://${DOMINIO}/`, `https://${DOMINIO}/mercados`, ...l.map((f) => `https://${DOMINIO}/edicion/${f}`)].map((h) => `<url><loc>${h}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${x}</urlset>`, { headers: { "Content-Type": "application/xml" } });
      }
      return html(marco({ titulo: "Página no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esta página no existe.</h1><p class="lede">Vuelve a la <a href="/">portada</a>.</p></section>` }), 404);
    } catch (e) {
      return html(marco({ titulo: "Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Volvemos en un momento.</h1><p class="lede">Hubo un problema al leer los datos. Intenta de nuevo en unos minutos.</p></section>` }), 503);
    }
  },
};
