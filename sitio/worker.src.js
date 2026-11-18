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
// 15-11-2026 (Germán: «procura que la Landing Page y el Diario "Cofrade News" cargue mucho más rápido en la Web»): la librería de
// gráficos (ECharts 6.1.0, 1,1 MB y 367 KB comprimida) es idéntica en todas las ediciones desde el 06-11. Medido con un celular
// con 4G lento: servirla aparte en la PRIMERA visita era ~1 s más lento (el navegador se detiene en ella a mitad de la página), y en
// las visitas siguientes ~1 s más rápido. Por eso: la primera visita la recibe dentro de la página, como siempre, y después de cargar
// la deja guardada en el navegador (sin gastar datos si el lector activó el ahorro de datos) y marca la cookie cn_lib; con esa cookie
// las ediciones siguientes la piden aparte y el navegador la toma de su memoria, con la compilación ya hecha. Solo se cambia si los
// primeros 2.048 caracteres son exactamente los de esa versión (huella FNV-1a); si un día la edición trae otra versión, queda dentro.
const ECHARTS_ARCHIVO = "echarts-b66b25ae.js", ECHARTS_PREFIJO = 2048, ECHARTS_HUELLA = 0xab20ba12;
// 15-11-2026 · la letra de títulos (Cormorant Garamond, licencia SIL OFL, sitio/fuentes/OFL.txt) se sirve desde cofrad.es, latín y
// latín extendido (el navegador baja solo lo que la página usa): sin conectarse a fonts.googleapis.com ni fonts.gstatic.com ni esperar su CSS
const FUENTES = "@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;font-display:swap;src:url(/f/cormorant-garamond-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-600-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:700;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-700-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:700;font-display:swap;src:url(/f/cormorant-garamond-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-ext-600-italic.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;font-display:swap;src:url(/f/cormorant-garamond-latin-600-italic.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}";
const ECHARTS_SHA = "b66b25aeb4df84e33199dc21694014d336d222cbd9deb0e5a7c14bd6aa0d0fd0";
// El bloque es idéntico, byte a byte, al archivo oficial dist/echarts.min.js del paquete echarts@6.1.0 (comprobado el 15-11-2026):
// si GitHub no responde, se toma de jsDelivr, y en ambos casos solo se sirve si la huella SHA-256 coincide.
const ECHARTS_FUENTES = [RAW + "sitio/assets/" + ECHARTS_ARCHIVO, "https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"];
const ECHARTS_COOKIE = "cn_lib=" + ECHARTS_ARCHIVO.slice(8, 16);
const conLibreria = (req) => (req.headers.get("Cookie") || "").split(/;\s*/).includes(ECHARTS_COOKIE);
// primera visita: con la página ya cargada (y 3 s de margen para no competir con los gráficos), baja la librería a la memoria del navegador
const GUARDAR_LIBRERIA = `<script>addEventListener('load',function(){setTimeout(function(){try{var c=navigator.connection;if(c&&c.saveData)return;`
  + `fetch('/a/${ECHARTS_ARCHIVO}',{credentials:'same-origin'}).then(function(r){return r.ok?r.arrayBuffer():null}).then(function(b){`
  + `if(b&&b.byteLength>1e6)document.cookie='${ECHARTS_COOKIE};max-age=31536000;path=/;secure;samesite=lax'}).catch(function(){})}catch(e){}},3000)})</script>`;
async function libreriaGraficos(ctx) {
  const cache = caches.default, clave = new Request("https://cache.cofrad.es/a/" + ECHARTS_ARCHIVO);
  const r0 = await cache.match(clave);
  if (r0) return r0;
  for (const u of ECHARTS_FUENTES) {
    try {
      const o = await fetch(u, { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 31536000, "300-599": -1 } } });
      if (!o.ok) continue;
      const b = await o.arrayBuffer();
      const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map((x) => x.toString(16).padStart(2, "0")).join("");
      if (h !== ECHARTS_SHA) continue;
      const r = new Response(b, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
      ctx.waitUntil(cache.put(clave, r.clone()));
      return r;
    } catch { /* siguiente fuente */ }
  }
  return null;
}
function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// 15-11-2026 · el script principal de la edición (empieza con «const D=») se corrige al vuelo en 3 puntos para que los gráficos no
// obliguen a rearmar la página (ver __cnDiferir/__cnAlto en modulos/lento.js). Cada cambio exige el texto exacto; si la Skill
// cambia ese código, no se toca nada y la edición queda como viene. Si los ayudantes no estuvieran, se usa el código original.
const PARCHES_APP = [
  ["el.style.height=h+'px';el.dataset.h=h;const c=mk(l.id,o);",
   "(window.__cnDiferir?__cnDiferir(el,'height',h+'px'):el.style.height=h+'px');el.dataset.h=h;const c=mk(l.id,o);"],
  ["if(el.clientHeight<min)el.style.minHeight=min+'px';",
   "(window.__cnAlto?__cnAlto(el,min):el.clientHeight<min&&(el.style.minHeight=min+'px'));"],
  ["el.style.height=Math.max(140,34*lista.length+40)+'px';mk(id,o);",
   "(window.__cnDiferir?__cnDiferir(el,'height',Math.max(140,34*lista.length+40)+'px'):el.style.height=Math.max(140,34*lista.length+40)+'px');mk(id,o);"],
  // el gráfico de cada ley del Congreso plegada espera a que el lector abra su votación (ver __cnLeyEspera en modulos/lento.js)
  ["LY.forEach((l,li)=>{const el=document.getElementById(l.id);if(!l.partidos.length||!el)return;",
   "LY.forEach(window.__cnLeyF=(l,li)=>{const el=document.getElementById(l.id);if(!l.partidos.length||!el)return;if(window.__cnLeyEspera&&__cnLeyEspera(el,l,li))return;"],
  // las filas de pestañas se ordenan cuando el navegador ya las midió (ResizeObserver avisa al empezar), no 12 veces mientras carga
  ["todas.push(upd);if(window.ResizeObserver)new ResizeObserver(upd).observe(g);upd();});",
   "todas.push(upd);if(window.ResizeObserver)new ResizeObserver(upd).observe(g);else upd();});"],
  // 16-11-2026: la tabla de vuelos se ubica en la hora actual cuando el lector llega a Vuelos (medía miles de filas al cargar)
  ["try{desplazar()}catch(e){aviso(e)}setInterval(",
   "try{(window.__cnCuandoSeVea?__cnCuandoSeVea(document.getElementById('vw'),desplazar):desplazar())}catch(e){aviso(e)}setInterval("],
  // 16-11-2026: mk() medía el ancho de cada gráfico al cargar (0,15 s de página rearmada); ahora se mide al armarlo (__cnAncho)
  ["if(opt&&opt.xAxis&&!Array.isArray(opt.xAxis)&&opt.xAxis.type==='value'&&el.clientWidth<600){opt.xAxis.splitNumber=3;opt.xAxis.axisLabel=Object.assign({},opt.xAxis.axisLabel||{},{hideOverlap:true})}",
   "if(opt&&opt.xAxis&&!Array.isArray(opt.xAxis)&&opt.xAxis.type==='value'){const _x=opt.xAxis,_f=()=>{_x.splitNumber=3;_x.axisLabel=Object.assign({},_x.axisLabel||{},{hideOverlap:true})};window.__cnAncho?__cnAncho(el,_f):el.clientWidth<600&&_f()}"],
];
const COLA_APP = Math.max(...PARCHES_APP.map(([a]) => a.length)) - 1;
const parchearApp = (x) => { for (const [a, b] of PARCHES_APP) if (x.includes(a)) x = x.split(a).join(b); return x; };
function scriptsEdicion(lib) {
  let buf = "", cola = "", modo = "pasar";
  const salidaApp = (t, x) => {   // corrige y deja guardados los últimos caracteres por si un patrón queda partido entre dos trozos
    const s2 = parchearApp(cola + x);
    if (t.lastInTextNode) { cola = ""; if (s2) t.before(s2, { html: true }); return; }
    const corte = Math.max(0, s2.length - COLA_APP);
    cola = s2.slice(corte);
    if (corte) t.before(s2.slice(0, corte), { html: true });
  };
  return {
    element() { buf = ""; cola = ""; modo = "decidir"; },
    text(t) {
      if (modo === "pasar") return;
      if (modo === "quitar") { t.remove(); return; }
      const x = t.text; t.remove();
      if (modo === "app") { salidaApp(t, x); return; }
      buf += x;   // decidir: se miran los primeros 2.048 caracteres
      if (buf.length < ECHARTS_PREFIJO && !t.lastInTextNode) return;
      const b = buf; buf = "";
      if (b.startsWith("\nconst D=")) { modo = "app"; salidaApp(t, b); return; }
      if (lib && b.length >= ECHARTS_PREFIJO && fnv1a(b.slice(0, ECHARTS_PREFIJO)) === ECHARTS_HUELLA) {
        modo = "quitar";
        t.before(`</script><script src="/a/${ECHARTS_ARCHIVO}"></script><script>window.echarts||document.write('<script src="/a/${ECHARTS_ARCHIVO}?r=2"><\\/script>')</script><script>`, { html: true });
        return;
      }
      modo = "pasar"; t.before(b, { html: true });
    },
  };
}
const TZ = "America/Santiago";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlSegura = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "#");

let _FMT_FECHA_CL = null;   // 16-11-2026: un solo formateador (se usa en cada visita y decenas de veces en el panel)
function fechaChile(d = new Date()) {
  _FMT_FECHA_CL = _FMT_FECHA_CL || new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return _FMT_FECHA_CL.format(d); // AAAA-MM-DD
}
let _FMT_LARGA = null;   // 14-11-2026 (auditoría): un solo formateador; crear uno por fecha costaba ~20 ms de CPU con 400 ediciones
function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 15));
  _FMT_LARGA = _FMT_LARGA || new Intl.DateTimeFormat("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const t = _FMT_LARGA.format(f);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const _FMT_NUM = {};   // 16-11-2026: un formateador por cantidad de decimales (crear uno en cada número costaba CPU: el panel usa cientos)
function num(v, dec = 2) {
  const f = _FMT_NUM[dec] || (_FMT_NUM[dec] = new Intl.NumberFormat("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  return f.format(v);
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
const csp = ({ script = "", frame = "" } = {}) => "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; "
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
// 15-11-2026 · «frescura» (solo ediciones): la copia guardada se entrega al tiro aunque tenga más de esos segundos, y por detrás se
// trae la versión de GitHub para el próximo lector (stale-while-revalidate). Antes, pasados 10 minutos, el primer lector esperaba
// la descarga completa desde GitHub (448 ms antes del primer byte, medido en producción el 15-11).
async function desdeGitHub(ruta, segundos, ctx, completa = null, frescura = 0) {
  const cache = caches.default;
  const clave = new Request("https://cache.cofrad.es/" + ruta);
  const r = await cache.match(clave);
  if (r) {
    if (frescura && Date.now() - Number(r.headers.get("X-Cn-Guardado") || 0) > frescura * 1000)
      ctx.waitUntil(traerGitHub(clave, ruta, segundos, completa, frescura).then((x) => x && x.body && x.body.cancel()).catch(() => {}));
    return r;
  }
  return await traerGitHub(clave, ruta, segundos, completa, frescura, ctx);
}
async function traerGitHub(clave, ruta, segundos, completa, frescura, ctx = null) {
  // 14-11-2026 (auditoría): solo se guardan las respuestas buenas. Un release responde 302 hacia una dirección firmada que vence en
  // ~1 hora; con cacheTtl se guardaba también el 302 y al día siguiente la edición completa daba 403.
  const o = await fetch(completa || RAW + ruta, { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": segundos, "300-599": -1 } } });
  if (!o.ok) return null;
  const r = new Response(o.body, { headers: { "Cache-Control": `public, max-age=${frescura ? 2592000 : segundos}`, "X-Cn-Guardado": String(Date.now()) } });
  if (ctx) { ctx.waitUntil(caches.default.put(clave, r.clone())); return r; }
  await caches.default.put(clave, r.clone());   // por detrás: se guarda y la copia sobrante se descarta
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
  // sin el índice de GitHub (respaldo de 20 días) se guarda solo 1 minuto: apenas vuelva el índice, el Archivo vuelve a estar completo.
  // 16-11-2026: mientras falta la edición de hoy también 1 minuto (antes 15): aparece apenas GitHub la publica, no hasta 15 min después
  ctx.waitUntil(cache.put(clave, new Response(JSON.stringify(lista), { headers: { "Cache-Control": `public, max-age=${conIndice && lista[0] === tope ? 900 : 60}` } })));
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
  if ((m = t.match(/^(.+) · (\d\d-\d\d|\d\d:\d\d)$/)) && EN_FIJO[m[1]]) return `${EN_FIJO[m[1]]} · ${m[2]}`;   // 17-11-2026: cifras con su fecha
  if ((m = t.match(/^(.+) · ([a-z]+) (\d{4})$/)) && EN_FIJO[m[1]] && MESES_ES.includes(m[2])) return `${EN_FIJO[m[1]]} · ${MESES_EN[MESES_ES.indexOf(m[2])]} ${m[3]}`;
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
.cifra b{font:600 21px/1.3 var(--serif);font-variant-numeric:tabular-nums}
.tabla-vis{width:100%;border-collapse:collapse;font-size:15px;font-variant-numeric:tabular-nums}.tabla-vis th,.tabla-vis td{padding:7px 10px;border-bottom:1px solid var(--linea);text-align:right;white-space:nowrap}
.tabla-vis th{font-size:13px;color:var(--gris);font-weight:600}.tabla-vis th:first-child,.tabla-vis td:first-child{text-align:left}.tabla-vis th[colspan]{text-align:center}
.tabla-vis td:first-child{font-variant-numeric:normal}.cifras.c4{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.dos.d2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
@media (max-width:560px){.tabla-vis{font-size:14px}.tabla-vis th,.tabla-vis td{padding:6px 7px}.tabla-vis th:first-child,.tabla-vis td:first-child{position:sticky;left:0;z-index:1;background:var(--card);box-shadow:1px 0 0 var(--linea)}}.var{font-size:13px;margin-left:4px}.sube{color:var(--verde)}.baja{color:var(--rojo)}
.cifra a{font-size:12px;color:var(--gris)}
.cifra.c2{display:flex;flex-direction:column;gap:2px}.cifra.c2 .cv{margin-top:auto}.vivo-grupo+.vivo-grupo{margin-top:18px}.vivo-tit{font:600 13px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--oro-t);margin:0 0 9px}
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
.piz-fila .var{font-size:12.5px;margin-left:6px;white-space:nowrap}.piz-fila .nw{white-space:nowrap}.piz-fila svg{width:150px;height:46px;display:block}
.lujo .sube{color:#7DDBA6}.lujo .baja{color:#F4A39C}
.piz-pie{font-size:11.5px;color:#8E9AAB;margin-top:8px}
.secc{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.sec-card{position:relative;background:var(--card);border:1px solid var(--linea);border-radius:16px;padding:18px 18px 16px;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start;
 transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .2s}
.sec-card:hover{transform:translateY(-2px);border-color:var(--oro);box-shadow:0 14px 34px -22px rgba(11,31,58,.45)}
.sec-card svg{width:44px;height:44px;color:var(--oro-t)}.sec-card b{display:block;font:600 19px/1.2 var(--display);margin-bottom:3px}.sec-card p{margin:0;font-size:13.5px;color:var(--gris);line-height:1.45}
.titulo-lujo{font:600 clamp(28px,3.6vw,40px)/1.1 var(--display);margin:0 0 6px;letter-spacing:-.2px}
/* 15-11-2026 (Germán: «que se vea más armónico y compacto, hay muchos espacios entremedio»): filas justificadas. Cada tarjeta crece
   en proporción al ancho/alto de su imagen (--r): en una fila todas las imágenes quedan de la MISMA altura y la fila llena el ancho,
   sin huecos. Bajo 900 px: dos columnas con marcos iguales; bajo 600 px: una columna. */
.galeria{display:grid;gap:16px}.g-fila{display:flex;gap:16px;align-items:stretch}
.cab .fecha{display:none}
.galeria figure{--p:10px;box-sizing:border-box;flex:var(--r) 1 0;min-width:0;margin:0;background:#FBF8F1;border:1px solid var(--linea);border-radius:16px;padding:var(--p);box-shadow:0 18px 40px -30px rgba(11,31,58,.5);position:relative;display:flex;flex-direction:column}
.galeria figure::after{content:"";position:absolute;inset:6px;border:1px solid rgba(184,137,43,.28);border-radius:12px;pointer-events:none}
.galeria img{width:100%;height:auto;aspect-ratio:var(--r);object-fit:contain;display:block;border-radius:8px;background:var(--f,#fff)}.galeria figcaption{font-size:13px;line-height:1.4;color:#5B6472;padding:9px 4px 1px}
.galeria figcaption b{display:block;font:600 17px/1.2 var(--display);color:#0B1F3A}
@media (max-width:899px){.galeria{grid-template-columns:1fr 1fr;gap:14px}.g-fila{display:contents}.galeria img{aspect-ratio:4/3}}
@media (max-width:600px){.galeria{grid-template-columns:1fr}.galeria img{aspect-ratio:var(--r);max-height:420px}}
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
@media (max-width:980px){.lujo-in{grid-template-columns:1fr;gap:30px;padding:44px 16px}.agua{width:520px;right:-180px;top:30%}}
/* 15-11-2026 (Germán: «estandarizar el largo de los 3 botones de la portada»): los tres miden lo mismo en todo tamaño de pantalla;
   en el celular van uno bajo otro a todo el ancho y desde 601 px en dos columnas iguales */
.lujo .acciones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-width:36rem}
.lujo .acciones .btn{justify-content:center;text-align:center;padding:0 14px;white-space:nowrap}
@media (max-width:600px){.lujo .acciones{grid-template-columns:minmax(0,1fr);max-width:none}}
/* 15-11-2026, 11:58 (Germán: «al verlos con la pantalla horizontal deberían quedar los 3 botones horizontalmente en una misma línea»):
   celular horizontal y tablet (601 a 980 px, portada en una columna): los 3 en una fila, iguales; la letra baja un poco solo si hace falta */
@media (min-width:601px) and (max-width:980px){.lujo .acciones{grid-template-columns:repeat(3,minmax(0,1fr));max-width:none}.lujo .acciones .btn{padding:0 8px;font-size:clamp(13px,2.25vw,17px)}}
/* 15-11-2026: en celulares de 320 a 375 px la pizarra (cifra grande + gráfico de 150 px) ensanchaba la columna a 362 px y la portada
   se cortaba por la derecha (título y texto incluidos). La columna ya no pasa del ancho de la pantalla y la pizarra se ajusta */
@media (max-width:980px){.lujo-in{grid-template-columns:minmax(0,1fr)}.piz-fila .var{display:block;margin:2px 0 0}}
@media (max-width:420px){.pizarra{padding:18px 16px 14px}.piz-fila{grid-template-columns:minmax(0,1fr) 104px;gap:10px}.piz-fila svg{width:104px;height:40px}.piz-fila b{font-size:24px}.piz-fila small{font-size:12px}}
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
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function regla(t){var m;
if((m=t.match(/^Actualizado a las (\\d\\d:\\d\\d)(?: · próxima actualización (\\d\\d:\\d\\d))?\\. (.+)$/)))return 'Updated at '+m[1]+(m[2]?' · next update '+m[2]:'')+'. '+(D[m[3]]||m[3]);
if((m=t.match(/^(.+) · cierre (\\d\\d-\\d\\d)$/)))return (D[m[1]]||m[1])+' · close '+m[2];
if((m=t.match(/^(.+) · (\\d\\d-\\d\\d|\\d\\d:\\d\\d)$/))&&D[m[1]])return D[m[1]]+' · '+m[2];
if((m=t.match(/^(.+) · ([a-z]+) (\\d{4})$/))&&D[m[1]]&&MES.indexOf(m[2])>=0)return D[m[1]]+' · '+MON[MES.indexOf(m[2])]+' '+m[3];
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
  "Cada mañana a las 9:00: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.":
    "Every morning at 9:00: economy, politics and Congress, conflicts, science, sports, weather, flights and more. Every figure with its source and date.",
  "Leer la edición de hoy →": "Read today's edition →", "Leer la edición →": "Read the edition →", "Ver lo último": "See the latest",
  "Hoy ·": "Today ·", "Última edición ·": "Latest edition ·", "Muy pronto": "Coming soon", "Edición": "Edition",
  "La edición de hoy ya está publicada.": "Today's edition is out.",
  "La edición de hoy se publica a las 9:00. Mientras, lee la última.": "Today's edition comes out at 9:00. Meanwhile, read the latest one.",
  "La edición de hoy viene en camino. Mientras, lee la última.": "Today's edition is on its way. Meanwhile, read the latest one.",
  "La primera edición web aparece mañana a las 9:00.": "The first web edition comes out tomorrow at 9:00.",
  "Crecimiento de Chile": "Chile's growth", "Economía y mercados": "Economy and markets", "Política y Congreso": "Politics and Congress",
  "Conflictos en el mundo": "Conflicts around the world", "Perspectivas 2050": "Outlook 2050", "Ciencia y Astronomía": "Science and Astronomy",
  "Deportes": "Sports", "Clima, mar y sismos": "Weather, sea and earthquakes", "Vuelos comerciales": "Commercial flights",
  "Entretenimiento": "Entertainment", "Fondos y subsidios": "Grants and subsidies", "Efemérides": "On this day",
  "Banco Central, Bolsa de Santiago, Reserva Federal de St. Louis, Coinbase, USGS y los medios del país.": "Central Bank, Santiago Stock Exchange, St. Louis Fed, Coinbase, USGS and the country's media.",
  "Banco Central, Bolsa de Santiago, Reserva Federal de St. Louis, Coinbase, USGS, aire medido y los medios del país.": "Central Bank, Santiago Stock Exchange, St. Louis Fed, Coinbase, USGS, measured air quality and the country's media.",
  "Mercados del mundo": "World markets", "Sismos": "Earthquakes", "Sismos y calidad del aire": "Earthquakes and air quality",
  "TPM": "Monetary policy rate",
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
  "Página no encontrada · Cofrade News": "Page not found · Cofrade News", "Esta página no existe.": "This page does not exist.",
  "Vuelve a la": "Go back to the", "portada": "front page", "Edición no encontrada · Cofrade News": "Edition not found · Cofrade News",
  "Esa edición no está.": "That edition is not available.", "para ver las disponibles.": "to see the available ones.",
  "Panel · Cofrade News": "Dashboard · Cofrade News", "Panel de Control": "Control Panel", "Acceso de administración": "Administrator access",
  "Clave": "Password", "Clave de administración": "Administrator password",
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

// 15-11-2026 (Germán: «un auditor que cada 6 horas revise ... medios de pago, formularios, suscripción Socios ... y lo repare»):
// estado de las piezas que el vigía de GitHub no puede ver desde afuera. Solo dice SÍ o NO por pieza: nunca muestra llaves ni datos.
// Mercado Pago se prueba con una consulta de solo lectura (la cuenta dueña de la llave). Se guarda 5 minutos para no repetir consultas.
async function salud(env, ctx) {
  const clave = new Request("https://www.cofrad.es/__salud");
  try { const c = await caches.default.match(clave); if (c) return c; } catch (e) { /* sin caché: se calcula */ }
  const r = { hora: new Date().toISOString() };
  try { r.d1 = !!env.DB && !!(await env.DB.prepare("SELECT 1 AS uno").first()); } catch (e) { r.d1 = false; }
  r.mp_configurado = !!(env.MP_ACCESS_TOKEN && String(env.MP_ACCESS_TOKEN).trim() && env.MP_WEBHOOK_SECRET);
  if (r.mp_configurado) {
    try {
      const x = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${String(env.MP_ACCESS_TOKEN).trim()}` }, signal: AbortSignal.timeout(8000) });
      r.mp_api = x.ok ? true : (x.status === 401 || x.status === 403) ? false : null;   // 429 o 5xx: Mercado Pago ocupado, no la llave
    } catch (e) { r.mp_api = null; }
  }
  r.turnstile = !!env.TURNSTILE_SECRET;
  r.correo = !!env.RESEND_API_KEY;
  r.ok = r.d1 && r.mp_api !== false;
  const resp = new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
  try { ctx.waitUntil(caches.default.put(clave, resp.clone())); } catch (e) { /* sin caché */ }
  return resp;
}

// 15-11-2026 · Navegación que el sitio agrega a TODA edición (de hoy, por fecha, liviana o permanente). Un solo dueño: el sitio.
// (a) Germán: «agregar una flecha que le permita al lector retroceder y volver al Landing page». Botón fijo arriba a la izquierda,
//     con el lenguaje del botón «Índice» (azul marino, borde dorado). Es un enlace real a la portada: funciona sin JavaScript y con
//     «abrir en pestaña nueva». Si el lector llegó desde la portada y no navegó dentro de la edición, vuelve con history.back()
//     (regresa al mismo punto de la portada, al instante y sin contar otra visita). Donde tapa el texto, se esconde al bajar y
//     reaparece al subir; con el teclado aparece al recibir el foco.
// (b) Germán: «arriba del botón flotante del Índice agrega otro botón ... una flecha (que apunta hacia arriba) contenida dentro de un
//     círculo, para que el lector pueda subir rápidamente al header». Círculo claro con aro dorado y doble flecha azul marino (su dibujo),
//     centrado sobre «Índice». Aparece recién cuando el lector bajó casi una pantalla; sube suave (o al instante con «reducir movimiento»)
//     y deja el foco arriba para quien usa teclado.
// Ninguno de los dos se imprime (el PDF sale igual que antes) y ambos cambian su texto con el botón EN/ES (evento «cofrade-idioma»).
const NAV_HTML = `<a id="cnVolver" class="cn-volver" href="/" data-no-tr translate="no" aria-label="Volver a la portada de Cofrade News" title="Volver a la portada de Cofrade News"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5.5M11.5 18.5 5 12l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
const SUBIR_HTML = `<button type="button" id="cnSubir" class="cn-subir" data-no-tr translate="no" aria-label="Subir al encabezado del boletín" title="Subir al encabezado del boletín"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 12.5 12 7l5.5 5.5M6.5 18 12 12.5l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
// 15-11-2026 (Germán: «un leve espacio adicional entre los 22 temas»): las ediciones nuevas lo traen de la Skill y lo declaran con
// data-ritmo en <html>; a las ya publicadas se lo pone el sitio con los MISMOS valores. Así nunca se suma dos veces.
// 16-11-2026 (Germán: «carga muy lento el Newsletter, dejando bloqueado o paralizado el cursor»). Medido con la traza del navegador:
// la edición tiene ~80 mil elementos y el navegador los volvía a ubicar y preparar para pintar completos varias veces mientras llegaba la
// página y en cada cuadro de la animación de los gráficos (54 ms por cuadro). Ahora cada sección se dibuja recién cuando el lector se
// acerca (content-visibility:auto) y lo que está plegado o en otra pestaña del Congreso no se dibuja (hidden). Al imprimir, todo.
// Las votaciones del Congreso («Ver todas las votaciones») quedan ocultas desde el primer momento: la edición las pliega recién al
// final de su script y, mientras tanto, el navegador las ubicaba completas (15 mil elementos, 0,14 s más de cursor congelado). Si
// la edición no alcanzara a plegarlas (botón aún oculto), a los 1,5 s de cargar se muestran como antes (clase cn-sin-plegar).
const SITIO_CSS = `<style id="cnSitio">@media screen{.cg-det.cerrada>.cg-det-in,html:not(.cn-sin-plegar) .cg-tog[hidden]+.cg-det>.cg-det-in{content-visibility:hidden}.cg-det-in{transition:content-visibility .35s allow-discrete}.hoja>section.sec{content-visibility:auto;contain-intrinsic-size:auto 3000px}.cg-mes:not(.activa),.cg-panel:not(.activa),.cg-pagina:not(.activa){content-visibility:hidden}.ley.plegable.cerrada .ley-det-in{content-visibility:hidden}.ley-det-in{transition:content-visibility .35s allow-discrete}}@media screen and (prefers-reduced-motion:reduce){.cg-det-in,.ley-det-in{transition:none}}a.cn-volver{position:fixed;z-index:900;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));
display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;box-sizing:border-box;
background:#0B1F3A;color:#fff;border:2px solid #D9AE52;text-decoration:none;-webkit-tap-highlight-color:transparent;
box-shadow:0 10px 26px rgba(11,31,58,.30),0 2px 6px rgba(11,31,58,.20);
transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .18s ease-out,box-shadow .18s}
a.cn-volver svg,button.cn-subir svg{display:block;transition:transform .18s cubic-bezier(.2,.8,.2,1)}
a.cn-volver:hover{box-shadow:0 14px 32px rgba(11,31,58,.36),0 3px 8px rgba(11,31,58,.22)}a.cn-volver:hover svg{transform:translateX(-2px)}
a.cn-volver:active{transform:scale(.95)}a.cn-volver:focus-visible,button.cn-subir:focus-visible{outline:3px solid #D9AE52;outline-offset:3px}
a.cn-volver.cn-oculto{transform:translateY(calc(-100% - 24px));opacity:0;pointer-events:none}
:root[data-theme=dark] a.cn-volver{background:#D9AE52;color:#0E1522;border-color:#F3D58F}
button.cn-subir{position:fixed;z-index:900;right:var(--cn-sr,calc(max(16px,env(safe-area-inset-right)) + 32px));bottom:var(--cn-sb,calc(max(16px,env(safe-area-inset-bottom)) + 66px));
display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;min-width:0;padding:0;margin:0;border-radius:50%;box-sizing:border-box;
background:var(--card,#fff);color:var(--tinta,#0B1F3A);border:2px solid var(--oro,#B8892B);cursor:pointer;-webkit-tap-highlight-color:transparent;
box-shadow:0 8px 22px rgba(11,31,58,.22),0 2px 6px rgba(11,31,58,.14);
opacity:0;visibility:hidden;transform:translateY(10px) scale(.9);pointer-events:none;
transition:opacity .2s ease-out,transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .18s,visibility 0s linear .22s}
button.cn-subir.cn-on{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition-delay:0s}
button.cn-subir.cn-on:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(11,31,58,.28),0 3px 8px rgba(11,31,58,.18)}
button.cn-subir:hover svg{transform:translateY(-1px)}button.cn-subir.cn-on:active{transform:scale(.95)}
@media (min-width:900px){a.cn-volver{top:16px;left:16px;width:48px;height:48px}button.cn-subir{width:48px;height:48px}}
@media (prefers-reduced-motion:reduce){a.cn-volver,a.cn-volver svg,button.cn-subir,button.cn-subir svg{transition:none}a.cn-volver:hover svg,button.cn-subir:hover svg,button.cn-subir.cn-on:hover{transform:none}}
@media print{a.cn-volver,button.cn-subir{display:none!important}}
html:not([data-ritmo]) section.sec{margin-top:clamp(46px,5vw,60px);margin-bottom:clamp(46px,5vw,60px);padding-top:12px}
html:not([data-ritmo]) main>h2{margin-top:clamp(46px,5vw,60px)}
@media print{html:not([data-ritmo]) section.sec{margin-top:30px;margin-bottom:30px;padding-top:8px}html:not([data-ritmo]) main>h2{margin-top:30px}}</style>`;
const NAV_JS = `<script>(function(){var a=document.getElementById('cnVolver'),s=document.getElementById('cnSubir'),R=document.documentElement;if(!a)return;
var L0,h0;function base(){L0=history.length;h0=location.href}base();
if(document.prerendering)document.addEventListener('prerenderingchange',base,{once:true});
var desde=false;try{var r=new URL(document.referrer);desde=r.origin===location.origin&&r.pathname==='/'}catch(e){}
a.addEventListener('click',function(ev){if(ev.defaultPrevented||ev.button||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;
if(desde&&L0>1&&history.length===L0&&location.href===h0){ev.preventDefault();history.back()}});
var T={es:['Volver a la portada de Cofrade News','Subir al encabezado del boletín'],en:['Back to the Cofrade News home page','Back to the top of the newsletter']};
function rot(el,t){if(el){el.setAttribute('aria-label',t);el.setAttribute('title',t)}}
function idioma(l){var t=/^en/i.test(String(l||''))?T.en:T.es;rot(a,t[0]);rot(s,t[1]);setTimeout(lugar,60)}
var cubre=true;function medir(){var c=document.querySelector('.hoja')||document.querySelector('main');if(!c){cubre=true;return}
var cs=getComputedStyle(c);cubre=c.getBoundingClientRect().left+(parseFloat(cs.paddingLeft)||0)<a.getBoundingClientRect().right+12}
function lugar(){if(!s)return;var f=document.getElementById('cnFab');
if(!f||!f.offsetWidth){s.style.setProperty('--cn-sr','max(16px, env(safe-area-inset-right))');s.style.setProperty('--cn-sb','max(16px, env(safe-area-inset-bottom))');return}
var cf=getComputedStyle(f),fr=parseFloat(cf.right)||16,fb=parseFloat(cf.bottom)||16;
s.style.setProperty('--cn-sr',Math.round(fr+(f.offsetWidth-s.offsetWidth)/2)+'px');s.style.setProperty('--cn-sb',Math.round(fb+f.offsetHeight+12)+'px')}
function todo(){medir();lugar()}
idioma(R.lang);document.addEventListener('cofrade-idioma',function(e){idioma(e.detail)});
todo();addEventListener('resize',todo,{passive:true});addEventListener('load',todo);
var y0=scrollY,oc=false;function poner(o){if(o!==oc){oc=o;a.classList.toggle('cn-oculto',o)}}
function verSubir(){if(s)s.classList.toggle('cn-on',scrollY>Math.max(600,innerHeight*0.9))}
addEventListener('scroll',function(){verSubir();var y=scrollY,d=y-y0;if(Math.abs(d)<10&&y>140)return;y0=y;poner(cubre&&d>0&&y>140)},{passive:true});
verSubir();a.addEventListener('focus',function(){poner(false)});
if(s)s.addEventListener('click',function(){var q=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{scrollTo({top:0,behavior:q?'auto':'smooth'})}catch(e){scrollTo(0,0)}poner(false);var hh=document.querySelector('h1')||a;if(hh!==a&&!hh.hasAttribute('tabindex'))hh.setAttribute('tabindex','-1');try{hh.focus({preventScroll:true})}catch(e){}})})();<\/script>`;

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
/*__TABLERO__*/
/*__COMPACTO__*/
/*__ICONO__*/

// 13-11-2026 · carrusel de marcas auspiciadoras (pie de página). Se detiene con el mouse o el foco y queda quieto con «reducir movimiento».
function bloqueMarcas() {
  // 16-11-2026: primero los avisos pagados vigentes (registro del Panel, ver modulos/tablero.js) y después las marcas propias, que no
  // vencen. Los enlaces pasan por /ir/… para contar los clics.
  const ms = avisosCarrusel().concat(((MARCAS && MARCAS.marcas) || []).map((m) => (m.url ? { ...m, ir: `/ir/${slugMarca(m)}?o=portada` } : m)));
  if (!ms.length) return "";
  const uno = (m, oculto) => {
    const est = `style="--mf:${/^#[0-9A-Fa-f]{6}$/.test(m.fondo || "") ? m.fondo : "#FFFFFF"};--mc:${/^#[0-9A-Fa-f]{6}$/.test(m.color || "") ? m.color : "#0B1F3A"}"`;
    const src = m.src || (m.logo ? `/marcas/${m.logo}` : "");
    const dentro = `${src ? `<img src="${esc(src)}" alt="${oculto ? "" : esc(m.nombre)}" loading="lazy" decoding="async">` : ""}${m.texto ? `<span data-no-tr>${esc(m.texto)}</span>` : ""}`;
    const ext = oculto ? ' aria-hidden="true" tabindex="-1"' : "";
    return m.ir || m.url
      ? `<a class="marca-a" ${est} href="${esc(m.ir || urlSegura(m.url))}" target="_blank" rel="noopener"${ext}>${dentro}</a>`
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
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64">${ICONO_HEAD}<link rel="preload" href="/f/cormorant-garamond-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/f/cormorant-garamond-latin-600-italic.woff2" as="font" type="font/woff2" crossorigin><style>${FUENTES}${CSS}${ICONO_CSS}</style></head><body>
<header class="cab"><div class="hoja"><a class="marca" href="/" aria-label="Cofrade News, portada"><img class="l-claro" src="${LOGO_CLARO}" alt="" width="52" height="52"><img class="l-oscuro" src="${LOGO_OSCURO}" alt="" width="52" height="52"><b>Cofrade News</b></a>
<span class="fecha" data-iso="${fechaChile()}">${esc(fechaLarga(fechaChile()))}</span>
<nav aria-label="Secciones"><a href="/edicion">Edición de hoy</a><button type="button" class="nav-b buzon-abrir" aria-haspopup="dialog"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/></svg>Buzón</button><a href="/mercados">Mercados</a><a href="/#archivo">Archivo</a><a href="/socios">Socios</a><a href="/#publicite">Publicite</a></nav>
<div class="herr"><button class="tema idioma" id="idioma" type="button" lang="en" aria-pressed="false" aria-label="Read in English" title="English">EN</button><button class="tema" id="tema" type="button" aria-label="Cambiar entre modo claro y oscuro"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></div></div></header>
${hero}<main class="hoja">${cuerpo}</main>
${bloqueMarcas()}${DIALOGO}${BUZON}
<footer class="hoja pie"><img class="pie-agua" src="/marca-agua.webp" alt="" aria-hidden="true">Cofrade News · boletín diario gratuito de la Cofradía, hecho en Chile. Cada dato lleva su fuente y su fecha en la edición.<br>
Medimos las visitas sin cookies y sin datos personales. ¿Una idea para mejorar? <button type="button" class="enlace buzon-abrir">Escríbenos al Buzón</button>.<br>
© ${fechaChile().slice(0, 4)} <span>Cofrade News. Todos los derechos reservados.</span></footer><script>window.__EN=${JSON.stringify(EN_FIJO).replace(/</g, "\\u003c")};${SCRIPT}${BUZON_JS}${CABECERA_JS}</script>
<script type="speculationrules">{"prerender":[{"where":{"or":[{"href_matches":"/edicion"},{"href_matches":"/edicion/*"}]},"eagerness":"moderate"}]}</script>${ICONO_JS}</body></html>`;
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
    return `<div class="piz-fila"><div><small><span>${esc(titulo)}</span> <span class="nw">· ${esc(ult[0].split("-").reverse().join("-"))}</span></small><b>${esc(pre)}${num(ult[1], dec)}</b>`
      + `${varp !== null ? `<span class="var ${varp > 0 ? "sube" : varp < 0 ? "baja" : ""}">${varp > 0 ? "+" : varp < 0 ? "−" : ""}${num(Math.abs(varp), 1)} % en un mes</span>` : ""}</div>${spark(datos)}</div>`;
  };
  const filas = fila("dolar", "Dólar observado", "$", 2) + fila("cobre", "Cobre, US$ por libra", "US$", 2) + fila("uf", "Unidad de Fomento", "$", 2);
  if (!filas) return "";
  const tpm = S.tpm && S.tpm.datos && S.tpm.datos.length ? S.tpm.datos[S.tpm.datos.length - 1][1] : null;
  return `<aside class="pizarra" aria-label="Pizarra del Banco Central"><div class="piz-cab">Pizarra del día <span>últimos 12 meses</span></div>${filas}`
    + `${tpm !== null ? `<div class="piz-fila"><div><small>Tasa de Política Monetaria</small><b>${num(tpm, 2)} %</b></div><svg viewBox="0 0 150 46" aria-hidden="true"></svg></div>` : ""}`
    + `<div class="piz-pie">Fuente: Banco Central de Chile, Base de Datos Estadísticos.</div></aside>`;
}

// 17-11-2026 (Germán: «En el Landing page de www.cofrad.es está incompleta la cantidad de Indicadores económicos»): mindicador.cl
// falló de día desde el 16-11 y la franja salía sin dólar, euro, UF, UTM ni cobre. El pulso ya trae cada indicador con su cascada
// de fuentes (pulso.py) y aquí van en dos grupos fijos, Chile y Mercados del mundo, cada cifra con la fecha de su dato (la hora si
// es del día). El vigía revisa cada 3 horas que no falte ninguna (herramientas/vigia.py, VIVO_REQUERIDAS).
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function fechaCifra(f, mensual) {
  const m = String(f || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return mensual ? `${MESES_ES[Number(m[2]) - 1]} ${m[1]}` : `${m[3]}-${m[2]}`;
}
function tarjetaCifra(nombre, cuando, valor, extra) {
  return `<div class="cifra c2"><small>${esc(nombre)}${cuando ? " · " + esc(cuando) : ""}</small><div class="cv"><b>${valor}</b>${extra || ""}</div></div>`;
}
function grupoCifras(titulo, c) {
  return c.length ? `<div class="vivo-grupo"><h4 class="vivo-tit">${esc(titulo)}</h4><div class="cifras">${c.join("")}</div></div>` : "";
}
const VIVO_CHILE = ["dolar", "euro", "uf", "utm", "tpm"];
const VIVO_FUENTES = "Banco Central, Bolsa de Santiago, Reserva Federal de St. Louis, Coinbase, USGS y los medios del país.";
const VIVO_FUENTES_AIRE = "Banco Central, Bolsa de Santiago, Reserva Federal de St. Louis, Coinbase, USGS, aire medido y los medios del país.";
function bloqueCifras(p) {
  if (!p) return "";
  const ind = {};
  for (const x of p.indicadores || []) if (x && x.clave && typeof x.valor === "number") ind[x.clave] = x;
  const val = (x) => `${esc(x.prefijo || "")}${num(x.valor, x.decimales ?? 2)}${esc(x.sufijo || "")}`;
  const chile = VIVO_CHILE.filter((k) => ind[k]).map((k) => tarjetaCifra(ind[k].nombre, fechaCifra(ind[k].fecha, k === "utm"), val(ind[k])));
  if (p.ipsa && typeof p.ipsa.valor === "number") chile.push(tarjetaCifra("IPSA (puntos)", String(p.ipsa.hora || "").slice(11, 16), num(p.ipsa.valor, 2), pct(p.ipsa.variacion_pct)));
  const merc = (p.mercados || []).filter((m) => m && m.nombre && typeof m.valor === "number");
  const cierre = (m) => tarjetaCifra(m.nombre, m.fecha ? "cierre " + fechaCifra(m.fecha) : "", num(m.valor, 2), pct(m.variacion_pct));
  const materia = /^(cobre|petr[oó]leo|oro|plata)/i;
  const mundo = merc.filter((m) => !materia.test(m.nombre)).map(cierre);
  if (ind.libra_cobre) mundo.push(tarjetaCifra(ind.libra_cobre.nombre, fechaCifra(ind.libra_cobre.fecha), val(ind.libra_cobre)));
  else mundo.push(...merc.filter((m) => /^cobre/i.test(m.nombre)).map(cierre));
  mundo.push(...merc.filter((m) => materia.test(m.nombre) && !/^cobre/i.test(m.nombre)).map(cierre));
  if (p.bitcoin && typeof p.bitcoin.bitcoin_usd === "number") mundo.push(tarjetaCifra("Bitcoin", fechaCifra(p.bitcoin.bitcoin_fecha), `US$${num(p.bitcoin.bitcoin_usd, 0)}`));
  return grupoCifras("Chile", chile) + grupoCifras("Mercados del mundo", mundo.slice(0, 6));
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
  return grupoCifras(a && a.length ? "Sismos y calidad del aire" : "Sismos", out);
}

// 16-11-2026 · Germán: «en vez de colocar 07:30 cámbialo por las 9.00, porque antes de esa hora estás procesando el Newsletter y aún
// no aparece publicado». La tarea parte a las 07:30 y la edición quedó arriba entre las 08:24 y las 09:04 (7 al 16-11). Pasadas
// las 9:00 sin la edición de hoy, el aviso ya no promete una hora que pasó.
const HORA_EDICION = 9;
function estadoEdicion(ultima, hoy, hora) {
  if (!ultima) return "La primera edición web aparece mañana a las 9:00.";
  if (ultima === hoy) return "La edición de hoy ya está publicada.";
  return hora < HORA_EDICION ? "La edición de hoy se publica a las 9:00. Mientras, lee la última." : "La edición de hoy viene en camino. Mientras, lee la última.";
}

async function cuerpoPortada(ctx) {
  const [lista, p, h] = await Promise.all([indice(ctx), pulso(ctx), historia(ctx)]);   // 15-11-2026: los tres a la vez
  const ultima = lista[0];
  const hoy = fechaChile();
  const estado = estadoEdicion(ultima, hoy, horaDeChile());
  const hora = p && p.generado ? String(p.generado).slice(11, 16) : "";
  const piz = pizarra(h, p);
  const hero = `<section class="lujo" aria-label="Portada"><img class="agua" src="/marca-agua.webp" alt="" aria-hidden="true">
<div class="hoja lujo-in"><div class="lujo-txt"><span class="kicker">El diario de la mañana · Gratuito</span>
<h1>Chile y el mundo, ordenados en minutos y con <em>datos verificados.</em></h1>
<p class="lede">Cada mañana a las 9:00: economía, política y Congreso, conflictos, ciencia, deportes, clima, vuelos y más. Cada cifra con su fuente y su fecha.</p>
<div class="acciones"><a class="btn oro" href="/edicion">Leer la edición${ultima === hoy ? " de hoy" : ""} →</a><a class="btn claro" href="#puente">Dashboard Financiero</a><a class="btn claro" href="/mercados">Mercados en vivo</a></div>
<ul class="sellos"><li>${ultima ? (ultima === hoy ? "Edición de hoy publicada" : "Última edición: " + esc(fechaLarga(ultima))) : "Primera edición muy pronto"}</li><li>Cada dato con su fuente</li><li>Hecho en Chile</li></ul></div>
${piz || `<aside class="pizarra"><div class="piz-cab">Hoy · <span data-iso="${hoy}">${esc(fechaLarga(hoy))}</span></div><p style="margin:6px 0 0;color:#D8D2C4">${esc(estado)}</p></aside>`}</div></section>`;
  const cuerpo = `${INSTALAR_HTML}
<section aria-labelledby="t-secc" style="border:0;padding-top:40px"><span class="kicker">${ultima ? (ultima === hoy ? "Hoy · " : "Última edición · ") : ""}<span data-iso="${ultima || hoy}">${esc(fechaLarga(ultima || hoy))}</span></span>
<h2 class="titulo-lujo" id="t-secc">${esc(estado)}</h2><p class="sub">Doce secciones, cada mañana, con la fuente de cada dato.</p>
<div class="secc">${SECCIONES_LUJO.map(([ic, t, d]) => `<a class="sec-card" href="/edicion" style="text-decoration:none">${icono(ic)}<div><b>${esc(t)}</b><p>${esc(d)}</p></div></a>`).join("")}</div></section>
<section id="en-vivo" aria-labelledby="t-vivo"><h3 id="t-vivo"><span class="vivo">En vivo</span></h3>
<p class="sub">${hora ? `Actualizado a las ${esc(hora)}${p.proxima ? ` · próxima actualización ${esc(p.proxima)}` : ""}.` : "Se actualiza cada 2 horas, de 07:00 a 23:00."} ${p && p.aire && (p.aire.ciudades || []).length ? VIVO_FUENTES_AIRE : VIVO_FUENTES}</p>
${bloqueCifras(p)}${bloqueTierra(p)}${bloqueTitulares(p)}</section>
<section aria-labelledby="t-gal"><h2 class="titulo-lujo" id="t-gal">Así se ve por dentro</h2><p class="sub">Algunos de los gráficos de la edición, tal como los recibes cada mañana.</p>
<div class="galeria">
<div class="g-fila"><figure style="--r:2.347"><img src="/capturas/indicadores.webp" alt="Gráfico del dólar en los últimos dos meses" loading="lazy" width="1000" height="426"><figcaption><b>Indicadores y monedas</b>El dólar día a día, con la UF, el euro y el yuan.</figcaption></figure><figure style="--r:1.086"><img src="/capturas/mercados.webp" alt="Variación diaria de los mercados" loading="lazy" width="962" height="886"><figcaption><b>Mercados</b>Wall Street, cobre, petróleo, IPSA y bolsas de Europa.</figcaption></figure></div>
<div class="g-fila"><figure style="--r:1.387;--f:#FBF8F2"><img src="/capturas/perspectivas-2050.webp" alt="Inversión en megaproyectos por sector" loading="lazy" width="1000" height="721"><figcaption><b>Perspectivas 2050</b>Inversión en megaproyectos por sector.</figcaption></figure><figure style="--r:2.725;--f:#FBF8F2"><img src="/capturas/estrecho.webp" alt="Mapa del Estrecho de Magallanes" loading="lazy" width="1000" height="367"><figcaption><b>Mar y navegación</b>Oleaje, mareas y el paso por el Estrecho de Magallanes.</figcaption></figure></div>
<div class="g-fila"><figure style="--r:0.564"><img src="/capturas/industrias.webp" alt="Mapa de Chile por industria" loading="lazy" width="700" height="1242"><figcaption><b>Industrias de Chile</b>Qué produce cada región.</figcaption></figure><figure style="--r:3.135"><img src="/capturas/gobiernos.webp" alt="Indicadores económicos por gobierno" loading="lazy" width="1000" height="319"><figcaption><b>Avances por gobierno</b>Crecimiento, inflación, desempleo y deuda.</figcaption></figure></div>
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
<div class="precio">UF 1 <small style="font-size:15px;color:var(--gris)">al mes</small></div><div class="acciones" style="margin-top:14px"><button type="button" class="btn oro pub-abrir" data-interes="Cofrade News" aria-haspopup="dialog">Quiero publicitar</button></div></div></div></section>
${INSTALAR_DLG}${INSTALAR_JS}`;
  return { cuerpo, p, hero };
}

async function portada(env, ctx, req) {
  const [{ cuerpo, hero, p }] = await Promise.all([cuerpoPortada(ctx), prepararAnuncios(env)]);
  ctx.waitUntil(revisarRenovaciones(env, ctx));   // 16-11-2026: correos de renovación de los anunciantes (como mucho 1 revisión por hora)
  ctx.waitUntil(revivirPulso(env, p));
  // 15-11-2026: el vigía corre cada 3 horas; su propia visita reinicia el reloj y la de un lector lo despierta si GitHub se atrasó
  ctx.waitUntil(/CofradeNews-Vigia/.test((req && req.headers.get("User-Agent")) || "") ? marcarVigia(env) : revivirVigia(env));
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
async function pedirPulso(env) { return pedirFlujo(env, "pulso.yml"); }
async function pedirFlujo(env, archivo) {
  if (!env.GITHUB_DISPATCH) return "sin clave";
  const r = await fetch(`https://api.github.com/repos/germanperey/cofrade-datos/actions/workflows/${archivo}/dispatches`, {
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

// 15-11-2026 (Germán: «un auditor que todos los días revise al menos cada 6 horas ... y lo repare automáticamente»; a las 07:21 lo
// ajustó: «que el "auditor" revise, audite, repare y mejore todo cada 3 horas»): el «Vigía del sitio» de GitHub está programado cada
// 3 horas, pero GitHub corre sus horarios cuando puede. Igual que con el Pulso, la visita es el reloj de respaldo: cada vez que el vigía
// pasa por la portada deja su hora en el candado de D1 (marcarVigia) y la visita de un lector solo se lo pide a GitHub si lleva 3 h 30 min
// sin pasar (la media hora absorbe el atraso habitual de GitHub, así no se piden dos revisiones seguidas; un pedido como máximo por vez).
const VIGIA_CADA_MIN = 210;
async function marcarVigia(env) {
  try {
    // auditoría del 15-11: el User-Agent del vigía se puede imitar; como máximo una escritura cada 10 minutos, así no gasta la cuota de D1
    const ahora = Date.now();
    if (env.DB) await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - 10 * 60000).run();
  } catch { /* sin base de datos: el respaldo sigue como estaba */ }
}
async function revivirVigia(env) {
  try {
    if (!env.GITHUB_DISPATCH || !env.DB) return "sin clave";
    const ahora = Date.now();
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_pedido', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE CAST(config.valor AS INTEGER) < ?2")
      .bind(String(ahora), ahora - VIGIA_CADA_MIN * 60000).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya pedido";
    let res;
    try { res = await pedirFlujo(env, "vigia.yml"); } catch { res = "sin conexión"; }
    await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('vigia_resultado', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor")
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
      // 16-11-2026: el carrusel del pie (todas las páginas) muestra los avisos pagados: la primera página de cada copia del sitio los carga
      if (req.method === "GET" && !ANUNCIOS.t && p !== "/" && !p.startsWith("/ir/") && !/\.[a-z0-9]{2,5}$/i.test(p) && p !== "/manifest.webmanifest") await prepararAnuncios(env);
      // 16-11-2026: el ícono de Cofrade News (modulos/icono.js): ficha de instalación, lectura sin señal y aviso de instalación o apertura
      if (p === "/manifest.webmanifest") return new Response(MANIFEST, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600", ...SEGURIDAD } });
      if (p === "/sw.js") return new Response(SW_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", ...SEGURIDAD } });
      if (p === "/instalacion") return await registrarIcono(req, env);
      if (p === "/" && req.method === "GET") { if (!/CofradeNews-Vigia/.test(req.headers.get("User-Agent") || "")) ctx.waitUntil(contarVisita(req, env, "/")); return await portada(env, ctx, req); }
      if (p === "/edicion") {
        const l = await indice(ctx);
        return l.length ? Response.redirect(`https://${u.host}/edicion/${l[0]}${u.search}`, 302) : Response.redirect(`https://${u.host}/`, 302);
      }
      const m = p.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        // 13-11-2026 (Germán: «demora mucho en cargar»): una edición pasada ya no cambia, así que se guarda 1 día en el borde y
        // 1 hora en el navegador; la de hoy, 10 minutos. Los gráficos se dibujan recién cuando el lector llega a ellos (LENTO).
        const pasada = m[1] < fechaChile(), ttl = pasada ? 86400 : 600;
        const r = (await desdeGitHub(`completa/${m[1]}`, ttl, ctx, rutaEdicion(m[1], true), ttl)) || (pasada && (await desdeGitHub(`permanente/${m[1]}`, 86400, ctx, rutaPermanente(m[1]), 86400)))
          || (await desdeGitHub(`ediciones/Cofrade-News-${m[1]}.html`, ttl, ctx, null, ttl));
        if (!r) return html(marco({ titulo: "Edición no encontrada · Cofrade News", descripcion: "", cuerpo: `<section style="border:0"><h1>Esa edición no está.</h1><p class="lede">Vuelve a la <a href="/">portada</a> para ver las disponibles.</p></section>` }), 404);
        ctx.waitUntil(contarVisita(req, env, p));
        ctx.waitUntil(revisarRenovaciones(env, ctx));
        const resp = new Response(r.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": "inline", "X-Robots-Tag": "noarchive",
          "Cache-Control": pasada ? "public, max-age=3600, stale-while-revalidate=86400" : "public, max-age=600", ...SEGURIDAD } });
        if (typeof HTMLRewriter === "undefined") return resp;
        const cp = compacto();   // 18-11-2026: títulos de bloque más grandes y gráficos del Congreso en barra compacta (modulos/compacto.js)
        const lib = conLibreria(req);   // 15-11-2026: el navegador ya tiene la librería de gráficos (ver ECHARTS_ARCHIVO)
        return new HTMLRewriter()   // 13-11-2026: la edición también lleva el escudo de la Cofradía como ícono
          .on('link[rel~="icon"]', { element(e) { e.remove(); } })
          .on("body", { element(e) { e.prepend(NAV_HTML, { html: true }); e.append(SUBIR_HTML + PROTEGER + MEDIR + NAV_JS + (lib ? "" : GUARDAR_LIBRERIA) + ICONO_JS, { html: true }); } })
          .on("head", cp.cabeza).on("body", cp.cuerpo).on("#cgw .kpis", cp.kpis).on("#cgw .kpi .kn", cp.kn).on("#cgw .kpi .kv", cp.kv).on("#cgw div.dos", cp.dos)
          .on("script", scriptsEdicion(lib))
          .on("head", { element(e) { e.prepend(LENTO, { html: true }); e.append('<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon-64.png" type="image/png" sizes="64x64">' + ICONO_HEAD + SITIO_CSS, { html: true }); } })   // 16-11-2026: ícono y ficha de instalación
          .transform(resp);
      }
      if (p === "/mercados") { ctx.waitUntil(contarVisita(req, env, "/mercados")); return paginaMercados(); }
      if (p === "/salud") return await salud(env, ctx);   // 15-11-2026: para el vigía de GitHub y el auditor de Claude (cada 3 h)
      // 13-11-2026 · Buzón de sugerencias, medición de lectura y Panel de Control
      if (p === "/buzon" && req.method === "POST") return await recibirBuzon(req, env, ctx).catch(() => jsonR({ ok: false, error: "No pudimos guardar tu sugerencia en este momento. Intenta de nuevo en unos minutos." }, 503));
      if (p === "/buzon/verificar") return await verificarBuzon(req, u, env);
      if (p === "/buzon") return Response.redirect(`https://${u.host}/#buzon`, 302);   // enlace corto para compartir: abre el Buzón
      if (p === "/m" && req.method === "POST") return await recibirLectura(req, env, ctx);
      if (p === "/panel/entrar" && req.method === "POST") return await entrarPanel(req, env);
      if (p === "/panel/salir") return new Response(null, { status: 303, headers: { Location: "/panel", "Set-Cookie": "cn_adm=; Max-Age=0; Path=/panel; Secure; HttpOnly; SameSite=Strict" } });
      if (p === "/panel/buzon.csv") return await panelCsv(req, env);
      if (p === "/panel/visitas.csv") return await panelVisitasCsv(req, env);   // 15-11-2026: contador de visitas completo
      if (p === "/panel") return await panel(req, env);
      // 16-11-2026 · publicidad pagada: registro del Panel, clics, logos y avisos vigentes para el diario (modulos/tablero.js)
      if (p === "/panel/anunciantes" && req.method === "POST") return await accionAnunciantes(req, env, ctx).catch(() => new Response(null, { status: 303, headers: { Location: "/panel?anuncios=formulario#publicidad" } }));
      if (p === "/panel/anunciantes.csv") return await anunciantesCsv(req, env);
      if (p === "/panel/anunciantes/correo") return await vistaCorreoAnunciante(req, env, ctx, u);
      if (p === "/publicidad.json") return await publicidadJson(env);
      const ira = p.match(/^\/ir\/([a-z0-9][a-z0-9-]{0,60})$/);
      if (ira) return await irAnuncio(req, env, ctx, ira[1], u);
      const lga = p.match(/^\/anuncios\/([a-z0-9][a-z0-9-]{0,60})\.(png|jpg|webp)$/);
      if (lga) return await logoAnuncio(req, env, ctx, lga[1], lga[2]);
      const cap = p.match(/^\/capturas\/([a-z0-9-]+\.webp)$/);
      if (cap || p === "/marca-agua.webp") {
        // 15-11-2026: el vigía rehace las capturas con cada edición nueva (herramientas/capturas.py) y corre cada 3 horas: 3 h de caché,
        // así la galería de la portada nunca queda más de una vuelta del vigía atrás
        const r = await desdeGitHub(cap ? `sitio/capturas/${cap[1]}` : "sitio/marca-agua.webp?v=2", cap ? 10800 : 86400, ctx);   // ?v=2: 15-11-2026, 86 → 36 KB
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": cap ? "public, max-age=10800" : "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      const fu = p.match(/^\/f\/(cormorant-garamond-latin(?:-ext)?-(?:500|600|700)-(?:normal|italic)\.woff2)$/);
      if (fu) {   // 15-11-2026: letra de títulos propia (ver FUENTES); caché de un año
        const r = await desdeGitHub(`sitio/fuentes/${fu[1]}`, 31536000, ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=31536000, immutable", ...SEGURIDAD } })
          : new Response("", { status: 404, headers: { "Cache-Control": "no-store" } });
      }
      if (p === `/a/${ECHARTS_ARCHIVO}`) {   // 15-11-2026: la librería de gráficos de las ediciones, con caché de un año (ver ECHARTS_ARCHIVO)
        const r = await libreriaGraficos(ctx);
        return r ? new Response(r.body, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", ...SEGURIDAD } })
          : new Response("", { status: 503, headers: { "Cache-Control": "no-store" } });
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
        "/escudo-192.png": ["escudo-192.png", "image/png"], "/icono-180.png": ["icono-180.png", "image/png"], "/icono-192.png": ["icono-192.png", "image/png"],
        "/icono-512.png": ["icono-512.png", "image/png"], "/icono-maskable-192.png": ["icono-maskable-192.png", "image/png"], "/icono-maskable-512.png": ["icono-maskable-512.png", "image/png"] }[p];
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
        return paginaFundador(env, env.DB ? await pctCofradia(env) : 20, await modoInscripcion(req, env));
      }
      if (p === "/socios/gracias") return await paginaGracias(req, u, env);
      if (p === "/socios/condiciones") return paginaCondiciones(env.DB ? await pctCofradia(env) : 20);
      if (p === "/panel/probar") return await probarInscripcion(req, env);
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
        const r = await desdeGitHub(`sitio/logo-${lg[1]}.webp?v=2`, 86400, ctx);   // ?v=2: 15-11-2026, 272 → 156 px
        return r ? new Response(r.body, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800", ...SEGURIDAD } }) : new Response("", { status: 404 });
      }
      if (p === "/favicon.svg") return Response.redirect(`https://${u.host}/favicon-64.png`, 301);   // 13-11-2026: ícono = escudo de la Cofradía
      if (p === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nDisallow: /socios\nDisallow: /panel\nDisallow: /buzon\nDisallow: /ir/\nSitemap: https://${DOMINIO}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain" } });
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
