// =====================================================================================================================
// 20-11-2026 · DIFUSIÓN: botón «Compartir», visitas por enlace compartido, menciones en medios y concurso «Comparte Cofrade News»
// Germán, 04:35: «agrega en www.cofrad.es/panel todas las menciones que recibamos en medios digitales, como Youtube, Radio, TV, Redes
// Sociales, etc (y qué persona nos mencionó o qué programa, y en qué fecha)... Además, en el Landing Page de www.cofrad.es agrega un
// icono de "compartir" para que nuestros lectores y usuarios compartan nuestro Newsletter con sus amistades y contactos».
// Germán, 04:43 (concurso): cuenta el enlace personal Y la captura subida en el Buzón; del 20-11-2026 al 24-12-2026 a las 23:59 de
// Santiago; el premio no se suma al 20 % de la Cofradía; organiza solo «Destak».
// Sin datos personales en claro: cada visita por un enlace compartido se guarda como una huella seudónima HMAC del día (IP + navegador
// + fecha, con una sal derivada de un secreto que ya existe), que cambia cada día, más una huella de la red (la IPv4 o el /64 de la IPv6)
// para el tope de 2 personas por red, enlace y día. Nunca se guarda la IP.
// Las tablas nuevas están en esquema-d1.sql (el dueño del esquema) y aquí se crean solas la primera vez si aún no existen.
// =====================================================================================================================
const CONCURSO = {
  nombre: "Concurso Comparte Cofrade News", organizador: "Destak", desde: "2026-11-20", hasta: "2026-12-24", sorteo: "2026-12-26",
  reclamo: "2027-01-31", vence: "2027-03-31", borrarCapturas: "2027-01-25", borrarDatos: "2027-02-01", plan: "anual",
  // Germán, 20-11-2026 07:58: «el premio sea para el primer lugar de los ganadores obtenga un plan anual gratis, para el segundo lugar un plan
  // anual con un 75% de descuento, para el tercer lugar un 50% de descuento, y para el cuarto y quinto lugar un 25% de descuento en el Plan
  // Anual (estos premios son sólo válidos por el primer año para los ganadores)». El orden del sorteo define el lugar.
  premios: [100, 75, 50, 25, 25], get ganadores() { return this.premios.length; },
  topeEnlace: 10, topeCaptura: 1,
  // Topes contra abusos (revisión independiente del 20-11-2026): personas por red y día en cada enlace, capturas (tamaño, por conexión,
  // por día, por persona y espacio total en la base) y correos de confirmación (por conexión y día, por email y por día en todo el sitio)
  redesPorCodigo: 2, capturaMaxBytes: 300000, capturasIpDia: 3, capturasDia: 60, capturasPorPersona: 40, capturasMaxTotal: 120000000,
  correosIpDia: 5, correosPorEmail: 4, correosDia: 60, sorteoAutoHora: 18,
};
const RE_CODIGO_REF = /^[a-z0-9]{6,10}$/;
// Textos de los premios armados desde CONCURSO.premios (una sola fuente): la cinta, el diálogo, los correos, las bases y el inglés
const LUGAR_ES = ["1.er", "2.º", "3.er", "4.º", "5.º", "6.º", "7.º", "8.º", "9.º", "10.º"], LUGAR_EN = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
function premiosResumen(en) {   // «1.er lugar, plan anual gratis; 2.º lugar, 75 % de descuento; …; 4.º y 5.º lugares, 25 % de descuento»
  const p = CONCURSO.premios, partes = [];
  for (let i = 0; i < p.length;) {
    let j = i;
    while (j + 1 < p.length && p[j + 1] === p[i]) j++;
    const L = en ? LUGAR_EN : LUGAR_ES, idx = [];
    for (let k = i; k <= j; k++) idx.push(L[k]);
    const quien = idx.length > 1 ? idx.slice(0, -1).join(", ") + (en ? " and " : " y ") + idx.at(-1) : idx[0];
    const que = p[i] >= 100 ? (en ? "free annual plan" : "plan anual gratis") : (en ? `${p[i]}% off` : `${p[i]} % de descuento`);
    partes.push(`${quien} ${idx.length > 1 ? (en ? "places" : "lugares") : (en ? "place" : "lugar")}, ${que}`);
    i = j + 1;
  }
  return partes.join("; ");
}
const premioDe = (pct, en) => pct >= 100 ? (en ? "first year free" : "primer año gratis") : (en ? `${pct}% off the first year` : `${pct} % de descuento en el primer año`);
const PREMIOS_ES = premiosResumen(false), PREMIOS_EN = premiosResumen(true);
// Lo que paga cada ganador con descuento por su primer año (revisión del 20-11: que las bases lo digan en pesos)
function saldosPremios(en) {
  const base = PLANES_SOCIO.anual.monto, p = CONCURSO.premios, L = en ? LUGAR_EN : LUGAR_ES, partes = [];
  const fmt = (n) => (en ? "CLP " + n.toLocaleString("en-US") : "$" + n.toLocaleString("es-CL"));
  for (const pct of [...new Set(p)].filter((x) => x < 100)) {
    const lug = p.map((x, i) => (x === pct ? L[i] : null)).filter(Boolean);
    const quien = lug.length > 1 ? lug.slice(0, -1).join(", ") + (en ? " and " : " y ") + lug.at(-1) : lug[0];
    partes.push(`${fmt(Math.round(base * (1 - pct / 100) / 10) * 10)} (${quien} ${lug.length > 1 ? (en ? "places" : "lugares") : (en ? "place" : "lugar")})`);
  }
  const lista = partes.length > 1 ? partes.slice(0, -1).join(", ") + (en ? " or " : " o ") + partes.at(-1) : partes[0] || "";
  return en ? `With a discount, the winner pays the rest of the first year on the current price of the annual plan (${fmt(base)}): ${lista}.`
    : `Con descuento, el ganador paga el resto del primer año sobre el precio actual del plan anual (${fmt(base)}): ${lista}.`;
}
const N_PREMIOS = CONCURSO.premios.length;
const RE_CUPON = new RegExp(`^CN(?:${[...new Set(CONCURSO.premios)].join("|")})(?:-[0-9A-HJKMNP-TV-Z]{5}){3}$`);
const TXT_PLAN_ES = "en el plan anual del Dashboard Financiero (válidos el primer año)", TXT_PLAN_EN = "on the annual plan of the Financial Dashboard (valid for the first year)";
const TXT_PREMIOS_ES = `El 26 de diciembre sorteamos ${N_PREMIOS} premios ${TXT_PLAN_ES}: ${PREMIOS_ES}.`;
const TXT_PREMIOS_EN = `On December 26 we draw ${N_PREMIOS} prizes ${TXT_PLAN_EN}: ${PREMIOS_EN}.`;
const TXT_CINTA_ES = `Participa por ${N_PREMIOS} premios ${TXT_PLAN_ES}: ${PREMIOS_ES}. Cada persona distinta que abre tu enlace en un día suma 1 participación (hasta 10 al día).`;
const TXT_CINTA_EN = `Win one of ${N_PREMIOS} prizes ${TXT_PLAN_EN}: ${PREMIOS_EN}. Every different person who opens your link on a given day adds 1 entry (up to 10 a day).`;
const TXT_SORTEO_HECHO_ES = `El sorteo de los ${N_PREMIOS} premios se hizo el 26 de diciembre. Los resultados están en las bases del concurso.`;
const TXT_SORTEO_HECHO_EN = `The draw for the ${N_PREMIOS} prizes took place on December 26. The results are in the contest rules.`;
const TXT_SORTEO_ANTES_ES = `El sorteo de los ${N_PREMIOS} premios es el 26 de diciembre. Los resultados se publican en las bases del concurso.`;
const TXT_SORTEO_ANTES_EN = `The draw for the ${N_PREMIOS} prizes is on December 26. The results are published in the contest rules.`;
const TXT_DLG_ES = "Comparte tu enlace personal: cada persona distinta que lo abre en un día suma 1 participación (hasta 10 al día). Cuando confirmes tu email, cada captura aceptada suma 1 más (1 al día). " + TXT_PREMIOS_ES;
const TXT_DLG_EN = "Share your personal link: every different person who opens it on a given day adds 1 entry (up to 10 a day). Once you confirm your email, every accepted screenshot adds 1 more (1 a day). " + TXT_PREMIOS_EN;
const CANALES_COMPARTIR = ["nativo", "whatsapp", "telegram", "correo", "linkedin", "facebook", "x", "copiar"];
const NOMBRE_CANAL = { nativo: "Menú del teléfono", whatsapp: "WhatsApp", telegram: "Telegram", correo: "Correo", linkedin: "LinkedIn", facebook: "Facebook", x: "X", copiar: "Copiar enlace" };
const MEDIOS_MENCION = ["YouTube", "Radio", "TV", "Prensa digital", "Redes sociales", "Podcast", "Otro"];
const ESTADOS_MENCION = ["por confirmar", "confirmada", "descartada"];
const TABLAS_DIFUSION = [
  "CREATE TABLE IF NOT EXISTS compartidos (fecha TEXT NOT NULL, canal TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, canal))",
  "CREATE TABLE IF NOT EXISTS referidos (fecha TEXT NOT NULL, codigo TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, codigo))",
  "CREATE TABLE IF NOT EXISTS referidos_unicos (fecha TEXT NOT NULL, codigo TEXT NOT NULL, visitante TEXT NOT NULL, red TEXT, PRIMARY KEY (fecha, codigo, visitante))",
  "CREATE INDEX IF NOT EXISTS referidos_unicos_codigo ON referidos_unicos (codigo, fecha)",
  "CREATE INDEX IF NOT EXISTS referidos_unicos_red ON referidos_unicos (fecha, codigo, red)",
  "CREATE TABLE IF NOT EXISTS menciones (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT, medio TEXT NOT NULL, programa TEXT, persona TEXT, enlace TEXT UNIQUE, alcance INTEGER, origen TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'por confirmar', nota TEXT, titulo TEXT, fuente TEXT, creado TEXT NOT NULL, actualizado TEXT)",
  "CREATE INDEX IF NOT EXISTS menciones_estado ON menciones (estado, fecha)",
];
const TABLAS_CONCURSO = [
  "CREATE TABLE IF NOT EXISTS concurso_participantes (email TEXT PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, creado TEXT NOT NULL, verificado INTEGER NOT NULL DEFAULT 0, confirmado TEXT, token TEXT, enviado TEXT, mayor INTEGER NOT NULL DEFAULT 0, bases INTEGER NOT NULL DEFAULT 0, ip TEXT, estado TEXT NOT NULL DEFAULT 'activo')",
  "CREATE INDEX IF NOT EXISTS concurso_participantes_token ON concurso_participantes (token)",
  "CREATE TABLE IF NOT EXISTS concurso_capturas (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, fecha TEXT NOT NULL, creado TEXT NOT NULL, sha TEXT UNIQUE NOT NULL, bytes INTEGER NOT NULL, ancho INTEGER, alto INTEGER, datos TEXT, estado TEXT NOT NULL DEFAULT 'por revisar', revisado TEXT, ip TEXT)",
  "CREATE INDEX IF NOT EXISTS concurso_capturas_email ON concurso_capturas (email, fecha)",
  "CREATE INDEX IF NOT EXISTS concurso_capturas_fecha ON concurso_capturas (fecha, ip)",
  "CREATE TABLE IF NOT EXISTS concurso_envios (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, ip TEXT, email TEXT NOT NULL, creado TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS concurso_envios_fecha ON concurso_envios (fecha, ip)",
  "CREATE INDEX IF NOT EXISTS concurso_envios_email ON concurso_envios (email)",
  "CREATE TABLE IF NOT EXISTS concurso_sorteos (id INTEGER PRIMARY KEY AUTOINCREMENT, creado TEXT NOT NULL, tipo TEXT NOT NULL, semilla TEXT NOT NULL, huella TEXT NOT NULL, total INTEGER NOT NULL, participantes INTEGER NOT NULL, ganadores TEXT NOT NULL, lista TEXT NOT NULL, avisos INTEGER NOT NULL DEFAULT 0)",
  "CREATE UNIQUE INDEX IF NOT EXISTS concurso_sorteo_oficial ON concurso_sorteos (tipo) WHERE tipo = 'oficial'",
  "CREATE TABLE IF NOT EXISTS canjes (token TEXT PRIMARY KEY, codigo TEXT NOT NULL, email TEXT NOT NULL, creado TEXT NOT NULL, usado TEXT)",
  "CREATE INDEX IF NOT EXISTS canjes_codigo ON canjes (codigo, creado)",
  "CREATE TABLE IF NOT EXISTS cupones (codigo TEXT PRIMARY KEY, email TEXT NOT NULL, origen TEXT NOT NULL, pct INTEGER NOT NULL, plan TEXT NOT NULL, vence TEXT NOT NULL, creado TEXT NOT NULL, usado TEXT, ref TEXT, reclamado TEXT)",
];
const URL_GOOGLE_NEWS = "https://news.google.com/rss/search?q=%22Cofrade%20News%22%20OR%20%22cofrad.es%22&hl=es-419&gl=CL&ceid=CL:es-419";
const URL_ITUNES = "https://itunes.apple.com/search?term=Cofrade%20News&media=podcast&entity=podcastEpisode&country=CL";
const URL_GDELT = "https://api.gdeltproject.org/api/v2/doc/doc?query=%22cofrade%20news%22&mode=artlist&format=json&maxrecords=50&timespan=1week&sort=datedesc";
const URL_REGLAS_REDES = RAW + "datos/reglas-redes.json";
// Valores por defecto: los mismos de datos/reglas-redes.json (20-11-2026), por si el archivo no baja
const REDES_DEFECTO = { youtube: { activo: true, busquedas_dia: 16 }, instagram: { activo: false, busquedas_dia: 8 }, facebook: { activo: false, busquedas_dia: 8 },
  x: { activo: false, busquedas_dia: 0 }, tiktok: { activo: false, busquedas_dia: 0 }, linkedin: { activo: false, busquedas_dia: 0 } };
const Q_YOUTUBE = '"Cofrade News"|cofrad.es';   // una sola búsqueda: el operador | de la API une las dos formas de nombrarnos
const MENCIONES_CADA_H = 6, MAX_RSS_ALERTAS = 5, UA_MENCIONES = "CofradeNews-Menciones/1.0 (+https://www.cofrad.es; hola@cofrad.es)";

// ---------- utilidades ----------
const _tdif = new TextEncoder();
const hexDif = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
let _llaveDif = null;
// Sal derivada (HMAC) de un secreto que ya existe: el secreto original no se usa directo ni sale nunca de aquí
function llaveDifusion(env) {
  const s = String(env.TURNSTILE_SECRET || env.PANEL_CLAVE || env.SOCIOS_CLAVE || "");
  if (!s) return Promise.resolve(null);
  if (!_llaveDif) {
    _llaveDif = (async () => {
      const base = await crypto.subtle.importKey("raw", _tdif.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sal = await crypto.subtle.sign("HMAC", base, _tdif.encode("cofrade-difusion-v1"));
      return crypto.subtle.importKey("raw", sal, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    })().catch((e) => { _llaveDif = null; throw e; });
  }
  return _llaveDif;
}
async function hmacDif(env, texto, largo = 24) {
  const k = await llaveDifusion(env);
  return k ? hexDif(await crypto.subtle.sign("HMAC", k, _tdif.encode(texto))).slice(0, largo) : null;
}
const _tablasDif = {};
function asegurarTablas(env, grupo) {
  if (!_tablasDif[grupo]) {
    _tablasDif[grupo] = env.DB.batch((grupo === "concurso" ? TABLAS_CONCURSO : TABLAS_DIFUSION).map((q) => env.DB.prepare(q)))
      .then(() => true, (e) => { _tablasDif[grupo] = null; throw e; });
  }
  return _tablasDif[grupo];
}
// «Hoy» del concurso: la fecha de Santiago. Solo el arnés de pruebas la cambia (binding CONCURSO_HOY_PRUEBA; en producción no existe)
let _hoyPrueba = "", _horaPrueba = "";   // _horaPrueba: binding CONCURSO_HORA_PRUEBA, solo en el arnés (hora del sorteo de respaldo)
const hoyConcurso = () => (/^\d{4}-\d{2}-\d{2}$/.test(_hoyPrueba) ? _hoyPrueba : fechaChile());
function etapaConcurso(h = hoyConcurso()) {
  return h < CONCURSO.desde ? "antes" : h <= CONCURSO.hasta ? "abierto" : h <= CONCURSO.reclamo ? "cerrado" : "fin";
}
function enmascarar(email) {
  const [u, d] = String(email || "").split("@");
  return d ? `${u.slice(0, u.length <= 2 ? 1 : 2)}***@${d}` : "***";
}
// Enlace limpio para no repetir menciones: sin marcas de campaña ni ancla; los de Google Noticias, sin parámetros
function normalizarEnlace(t) {
  let u;
  try { u = new URL(String(t || "").trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || u.username || u.password) return null;
  if (/^(www\.)?google\.[a-z.]+$/.test(u.hostname) && u.pathname === "/url") {   // alertas de Google: el enlace real va en «url»
    const real = u.searchParams.get("url") || u.searchParams.get("q");
    if (real && real !== t) return normalizarEnlace(real);
  }
  u.hash = "";
  if (u.hostname === "news.google.com") u.search = "";
  else for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_|igshid$|si$)/i.test(k)) u.searchParams.delete(k);
  const s = u.toString();
  return s.length <= 600 ? s : null;
}
const hostDe = (t) => { try { return new URL(t).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
const esNuestro = (h) => /(^|\.)cofrad\.es$/i.test(String(h || ""));
function desXml(s) {
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") { const c = k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); try { return String.fromCodePoint(c); } catch { return ""; } }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[k];
  }).replace(/<[^>]{0,400}>/g, " ").replace(/\s+/g, " ").trim();
}
function medioPorHost(h) {
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return "YouTube";
  if (/(^|\.)(podcasts\.apple\.com|open\.spotify\.com|ivoox\.com|podbean\.com|anchor\.fm|spreaker\.com)$/.test(h)) return "Podcast";
  if (/(^|\.)(twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|threads\.net|bsky\.app|reddit\.com|mastodon\.social)$/.test(h)) return "Redes sociales";
  return "Prensa digital";
}
const fechaDeMs = (ms) => (Number.isFinite(ms) ? fechaChile(new Date(ms)) : null);
const recorte = (t, n) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n);

// =====================================================================================================================
// 1. BOTÓN «COMPARTIR» (portada y cabecera de cada edición). El script del navegador vive en modulos/compartir_cliente.js
// =====================================================================================================================
const COMPARTIR_JS = __COMPARTIR_JS__;
const ICONO_COMPARTIR = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="6" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="18" cy="19" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.3 10.8 15.7 6.2M8.3 13.2l7.4 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
function compartirHtml(contexto, url) {
  const ed = contexto === "edicion", id = ed ? "cmpEd" : "cmpPo";
  const boton = ed
    ? `<button type="button" class="cmp-b cn-cmp-b" id="cnCompartir" hidden aria-expanded="false" aria-controls="${id}" data-ta="ed" aria-label="Compartir esta edición" title="Compartir esta edición">${ICONO_COMPARTIR}<span data-t="boton">Compartir</span></button>`
    : `<button type="button" class="tema cmp-b" id="cmpBoton" hidden aria-expanded="false" aria-controls="${id}" data-ta="abrir" aria-label="Compartir Cofrade News" title="Compartir Cofrade News">${ICONO_COMPARTIR}</button>`;
  const red = (k, t, ext = true) => `<a class="cmp-i" data-canal="${k}" href="${esc(url)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}><span${k === "correo" ? ' data-t="correo"' : ""}>${t}</span></a>`;
  const cc = etapaConcurso() === "abierto" ? `<p class="cmp-cc"><a href="/bases-concurso" data-t="concurso">Concurso «Comparte Cofrade News»: bases</a></p>` : "";
  return `<span class="cmp${ed ? " cn-cmp" : ""}" data-cmp data-url="${esc(url)}"${ed ? "" : " data-sistema"} data-no-tr translate="no">${boton}`
    + `<span class="cmp-p" id="${id}" hidden role="group" aria-labelledby="${id}T"><span class="cmp-cab"><b class="cmp-tit" id="${id}T" data-t="titulo">Compartir Cofrade News</b>`
    + `<button type="button" class="cmp-x" data-ta="cerrar" aria-label="Cerrar" title="Cerrar">✕</button></span><span class="cmp-red">${red("whatsapp", "WhatsApp")}${red("telegram", "Telegram")}${red("correo", "Correo", false)}`
    + `${red("linkedin", "LinkedIn")}${red("facebook", "Facebook")}${red("x", "X")}</span><button type="button" class="cmp-copiar"><span data-t="copiar">Copiar enlace</span></button>`
    + `<input class="cmp-campo" readonly hidden data-ta="campo" aria-label="Enlace para compartir"><span class="cmp-ok" role="status" aria-live="polite"></span>${cc}</span></span>`;
}
const COMPARTIR_CSS = `.cmp{display:inline-flex;align-items:center;position:relative}.cmp-b{min-width:44px;min-height:44px;justify-content:center}.cmp-b[hidden]{display:none!important}
.tema.cmp-b{border:1.5px solid var(--linea);border-radius:999px;color:var(--oro-t)}.tema.cmp-b:hover{border-color:var(--oro)}.cmp-b svg{display:block;flex:none}
.cn-cmp-b{display:inline-flex!important;align-items:center;gap:7px;min-height:44px;min-width:44px;cursor:pointer}
.cmp-p{position:fixed;z-index:2147483000;left:8px;top:8px;width:320px;max-width:calc(100vw - 16px);box-sizing:border-box;display:block;background:#fff;color:#0B1F3A;border:1px solid #DDD3BF;border-radius:16px;padding:12px 14px 14px;
box-shadow:0 18px 48px -12px rgba(11,31,58,.35),0 2px 8px rgba(11,31,58,.12);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:left;letter-spacing:0;text-transform:none}
.cmp-p[hidden]{display:none!important}.cmp-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}.cmp-tit{font-weight:700;font-size:15px}
.cmp-x{min-width:44px;min-height:44px;margin:-8px -10px -8px 0;border:0;background:none;color:inherit;font:600 18px/1 system-ui,sans-serif;cursor:pointer;border-radius:10px}
.cmp-red{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cmp-i,.cmp-copiar{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:8px 10px;border-radius:12px;border:1.5px solid #DDD3BF;background:transparent;color:inherit;text-decoration:none;font:600 15px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;box-sizing:border-box}
.cmp-i:hover{border-color:#B8892B}.cmp-copiar{width:100%;margin-top:8px;background:#B8892B;border-color:#B8892B;color:#1A1406}.cmp-copiar:hover{filter:brightness(1.06)}
.cmp-campo{display:block;width:100%;margin-top:8px;min-height:44px;border-radius:10px;border:1.5px solid #DDD3BF;padding:0 10px;font:14px system-ui,sans-serif;background:transparent;color:inherit;box-sizing:border-box}.cmp-campo[hidden]{display:none}
.cmp-ok{display:block;margin:8px 0 0;min-height:1.3em;font-size:14px;font-weight:700;color:#1E7B4F}.cmp-cc{margin:8px 0 0;font-size:13px}.cmp-cc a{color:#8A6416}
.cmp-p a:focus-visible,.cmp-p button:focus-visible,.cmp-p input:focus-visible,.cmp-b:focus-visible{outline:3px solid #B8892B;outline-offset:2px}
:root[data-theme=dark] .cmp-p{background:#152033;color:#E9EEF6;border-color:#2A3547;box-shadow:0 18px 48px -12px rgba(0,0,0,.7)}
:root[data-theme=dark] .cmp-i,:root[data-theme=dark] .cmp-campo{border-color:#3A4A63}:root[data-theme=dark] .cmp-copiar{background:#D9AE52;border-color:#D9AE52}
:root[data-theme=dark] .cmp-ok{color:#4CC38A}:root[data-theme=dark] .cmp-cc a{color:#D9AE52}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .cmp-p.cmp-sistema{background:#152033;color:#E9EEF6;border-color:#2A3547;box-shadow:0 18px 48px -12px rgba(0,0,0,.7)}
:root:not([data-theme=light]) .cmp-sistema .cmp-i,:root:not([data-theme=light]) .cmp-sistema .cmp-campo{border-color:#3A4A63}:root:not([data-theme=light]) .cmp-sistema .cmp-copiar{background:#D9AE52;border-color:#D9AE52}
:root:not([data-theme=light]) .cmp-sistema .cmp-ok{color:#4CC38A}:root:not([data-theme=light]) .cmp-sistema .cmp-cc a{color:#D9AE52}}
@media (prefers-reduced-motion:no-preference){.cmp-p{animation:cmpEntra .16s ease-out}}@keyframes cmpEntra{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@media print{.cmp,.cmp-p{display:none!important}}
@media (max-width:400px){.cab .hoja:has(.herr .cmp){column-gap:6px}.cab .hoja:has(.herr .cmp) .marca img{width:44px;height:44px}.cab .hoja:has(.herr .cmp) .marca b{font-size:23px}.cab .hoja:has(.herr .cmp) .herr{column-gap:0}}
@media (max-width:380px){.cab .hoja:has(.herr .cmp){padding-left:12px;padding-right:12px}.cab .hoja:has(.herr .cmp) .marca b{font-size:21px}.cab .hoja:has(.herr .cmp) .marca img{width:40px;height:40px}}
@media (max-width:350px){.cab .hoja:has(.herr .cmp){padding-left:8px;padding-right:8px;column-gap:4px}.cab .hoja:has(.herr .cmp) .marca{gap:8px}.cab .hoja:has(.herr .cmp) .marca b{font-size:18px}.cab .hoja:has(.herr .cmp) .marca img{width:36px;height:36px}}`;
const COMPARTIR_ESTILO = `<style id="cnCmp">${COMPARTIR_CSS}</style>`;

// Red de la conexión: la IPv4 completa o los primeros 64 bits de la IPv6 (un hogar o un teléfono cambia de dirección dentro de su /64)
function redDe(ip) {
  let s0 = String(ip || "").trim().toLowerCase();
  if (s0.includes(".") && s0.includes(":")) s0 = s0.slice(s0.lastIndexOf(":") + 1);   // IPv4 escrita como IPv6 (::ffff:1.2.3.4)
  if (!s0.includes(":")) return s0;
  const [a, b] = s0.split("::"), ia = a ? a.split(":") : [], ib = b ? b.split(":") : [];
  const g = s0.includes("::") ? [...ia, ...Array(Math.max(0, 8 - ia.length - ib.length)).fill("0"), ...ib] : ia;
  return g.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, "") || "0").join(":") + "::/64";
}
// Visita que llega con ?r=<código>: suma 1 por código y día, y 1 persona distinta por huella del día, con un máximo de 2 personas por red,
// código y día. Solo cuenta una página abierta de verdad en el navegador (Sec-Fetch-Mode «navigate» y Sec-Fetch-Dest «document»): una
// imagen, un marco o un fetch escondidos en otra web no suman. Nunca rompe ni atrasa la página.
async function contarReferido(req, env) {
  try {
    if (req.method !== "GET" || !env.DB) return;
    const r = String(new URL(req.url).searchParams.get("r") || "");
    if (!RE_CODIGO_REF.test(r)) return;
    const ua = req.headers.get("User-Agent") || "", cab = (k) => String(req.headers.get(k) || "").toLowerCase();
    if (!ua || BOT_UA.test(ua) || /CofradeNews-/i.test(ua)) return;   // robots y vistas previas de WhatsApp o Telegram no cuentan
    // SEC_FETCH_PRUEBA solo existe en el arnés de pruebas: su cliente HTTP reescribe Sec-Fetch-Mode, y el arnés copia el valor real aparte
    const modo = env.SEC_FETCH_PRUEBA ? cab("X-Prueba-Sec-Fetch-Mode") : cab("Sec-Fetch-Mode");
    if (modo !== "navigate" || cab("Sec-Fetch-Dest") !== "document") return;
    if (/prefetch|prerender/i.test(cab("Sec-Purpose") + cab("Purpose"))) return;
    if (ASN_NUBE.has(Number(req.cf && req.cf.asn))) return;
    const fecha = fechaChile(), ip = req.headers.get("CF-Connecting-IP") || "";
    const [v, red] = await Promise.all([hmacDif(env, ["ref", fecha, ip, ua].join("|")), hmacDif(env, ["red", fecha, r, redDe(ip)].join("|"))]);
    if (!v || !red || !(await bajoLimite(env, "r:" + red))) return;
    await asegurarTablas(env, "difusion");
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO referidos_unicos (fecha, codigo, visitante, red) SELECT ?1, ?2, ?3, ?4 WHERE (SELECT COUNT(*) FROM referidos_unicos WHERE fecha = ?1 AND codigo = ?2 AND red = ?4) < ?5")
        .bind(fecha, r, v, red, CONCURSO.redesPorCodigo),
      env.DB.prepare("INSERT INTO referidos (fecha, codigo, n) VALUES (?, ?, 1) ON CONFLICT(fecha, codigo) DO UPDATE SET n = n + 1").bind(fecha, r),
    ]);
  } catch { /* la medición nunca rompe la página */ }
}
// Cuántas veces tocaron cada forma de compartir (el navegador avisa con sendBeacon a /compartir)
async function recibirCompartido(req, env) {
  const nada = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...SEGURIDAD } });
  try {
    if (!ORIGEN_OK(req) || !env.DB) return nada();
    const ua = req.headers.get("User-Agent") || "";
    if (!ua || BOT_UA.test(ua)) return nada();
    const cuerpo = await leerCuerpo(req, 300);
    const canal = String((cuerpo && new URLSearchParams(cuerpo).get("c")) || "");
    if (!CANALES_COMPARTIR.includes(canal)) return nada();
    const fecha = fechaChile(), v = await hmacDif(env, ["cmp", fecha, req.headers.get("CF-Connecting-IP") || "", ua].join("|"));
    if (!v || !(await bajoLimite(env, "s:" + v))) return nada();
    await asegurarTablas(env, "difusion");
    await env.DB.prepare("INSERT INTO compartidos (fecha, canal, n) VALUES (?, ?, 1) ON CONFLICT(fecha, canal) DO UPDATE SET n = n + 1").bind(fecha, canal).run();
  } catch { /* nada */ }
  return nada();
}

// =====================================================================================================================
// 2. MENCIONES EN MEDIOS: recolector automático (fuentes gratuitas que permiten lectura automática) + registro manual en el Panel
// =====================================================================================================================
function leerRss(xml, { fuente, medio = "", tope = 20 }) {
  const out = [], s = String(xml || "");
  const bloques = s.includes("<item") ? s.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g) : s.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/g);
  for (const m of bloques) {
    const it = m[1], tag = (t) => { const x = it.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`)); return x ? desXml(x[1]) : ""; };
    let link = tag("link");
    if (!link) { const a = it.match(/<link\b[^>]*\bhref="([^"]+)"/); link = a ? desXml(a[1]) : ""; }   // Atom (alertas de Google)
    const src = it.match(/<source\b[^>]*\burl="([^"]*)"[^>]*>([\s\S]*?)<\/source>/);
    const fuenteHost = src ? hostDe(desXml(src[1])) : "", fuenteNom = src ? desXml(src[2]) : "";
    const enlace = normalizarEnlace(link);
    if (!enlace) continue;
    const host = hostDe(enlace);
    if (esNuestro(host) || esNuestro(fuenteHost)) continue;   // lo publicado por el propio sitio no es una mención
    let titulo = tag("title");
    if (fuenteNom && titulo.endsWith(" - " + fuenteNom)) titulo = titulo.slice(0, -(fuenteNom.length + 3));
    const fecha = fechaDeMs(Date.parse(tag("pubDate") || tag("published") || tag("updated")));
    const real = host === "news.google.com" ? fuenteHost : host;
    out.push({ fecha, medio: medio || medioPorHost(real), programa: recorte(fuenteNom || real, 160), persona: "", enlace, titulo: recorte(titulo, 300), fuente });
    if (out.length >= tope) break;
  }
  return out;
}
function leerItunes(j) {
  const out = [];
  for (const r of j && Array.isArray(j.results) ? j.results : []) {
    if (!/cofrade[\s-]*news|cofrad\.es/i.test([r.trackName, r.collectionName, r.description, r.shortDescription].join(" "))) continue;   // la búsqueda de Apple es amplia
    const enlace = normalizarEnlace(r.trackViewUrl || r.collectionViewUrl);
    if (!enlace) continue;
    out.push({ fecha: fechaDeMs(Date.parse(r.releaseDate)), medio: "Podcast", programa: recorte(r.collectionName, 160), persona: recorte(r.artistName, 120), enlace, titulo: recorte(r.trackName, 300), fuente: "Apple Podcasts" });
    if (out.length >= 20) break;
  }
  return out;
}
function leerGdelt(j) {
  const out = [];
  for (const a of j && Array.isArray(j.articles) ? j.articles : []) {
    const enlace = normalizarEnlace(a.url);
    if (!enlace || esNuestro(hostDe(enlace))) continue;
    const sd = String(a.seendate || "").match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
    out.push({ fecha: sd ? fechaDeMs(Date.UTC(+sd[1], +sd[2] - 1, +sd[3], +sd[4], +sd[5], +sd[6])) : null, medio: medioPorHost(hostDe(enlace)), programa: recorte(a.domain || hostDe(enlace), 160),
      persona: "", enlace, titulo: recorte(a.title, 300), fuente: "GDELT" });
    if (out.length >= 20) break;
  }
  return out;
}
function leerYoutube(j) {
  const out = [];
  for (const x of j && Array.isArray(j.items) ? j.items : []) {
    const id = x && x.id && x.id.videoId, sn = (x && x.snippet) || {};
    if (!/^[\w-]{6,20}$/.test(String(id || ""))) continue;
    if (!/cofrade[\s-]*news|cofrad\.es/i.test(desXml(sn.title) + " " + desXml(sn.description))) continue;   // la búsqueda de YouTube es amplia
    out.push({ fecha: fechaDeMs(Date.parse(sn.publishedAt)), medio: "YouTube", programa: recorte(sn.channelTitle, 160), persona: recorte(sn.channelTitle, 120),
      enlace: `https://www.youtube.com/watch?v=${id}`, titulo: recorte(desXml(sn.title), 300), fuente: "YouTube" });
    if (out.length >= 20) break;
  }
  return out;
}
async function traerFuente(url, tipo, extra = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA_MENCIONES, Accept: tipo === "json" ? "application/json" : "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9", ...extra },
    signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const t = await r.text();
  if (t.length > 900000) throw new Error("respuesta demasiado grande");
  return tipo === "json" ? JSON.parse(t) : t;
}
// Reglas por red (datos/reglas-redes.json, las revisa cada mes la tarea): «activo» y «busquedas_dia». Se guardan 24 h en la base.
function leerReglas(j) {
  const redes = {}, notas = {};
  for (const [k, d] of Object.entries(REDES_DEFECTO)) {
    const a = j && j.redes && j.redes[k] && j.redes[k].ajustes;
    const n = a ? Math.floor(Number(a.busquedas_dia)) : NaN;
    redes[k] = a && typeof a.activo === "boolean" && Number.isFinite(n) && n >= 0 && n <= 100 ? { activo: a.activo, busquedas_dia: Math.min(n, 50) } : d;   // tope 50: la cuota diaria de búsquedas es de 100
    if (a && a.nota) notas[k] = recorte(a.nota, 200);
  }
  return { origen: "datos/reglas-redes.json" + (j && j.revisado ? " (revisado " + recorte(j.revisado, 10) + ")" : ""), redes, notas };
}
const REGLAS_DEFECTO = { origen: "los valores por defecto de datos/reglas-redes.json (el archivo no bajó)", redes: REDES_DEFECTO, notas: {} };
async function bajarReglas() {
  try {
    const x = await fetch(URL_REGLAS_REDES, { cf: { cacheTtl: 86400, cacheEverything: true }, signal: AbortSignal.timeout(8000) });
    if (x.ok) return leerReglas(await x.json());
  } catch { /* quedan los valores por defecto del mismo archivo */ }
  return REGLAS_DEFECTO;
}
// robots.txt (RFC 9309): grupo propio o «*»; la regla más larga gana y, si empatan, Allow. 4xx = sin reglas; 429, 5xx o sin respuesta = no se lee.
function patronRobots(p) {
  const fin = p.endsWith("$");
  return new RegExp("^" + (fin ? p.slice(0, -1) : p).split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (fin ? "$" : ""));
}
function robotsPermite(txt, ruta, agente = "cofradenews-menciones") {
  const grupos = [];
  let g = null, conReglas = false;
  for (const l0 of String(txt || "").split(/\r?\n/)) {
    const m = l0.replace(/#.*$/, "").trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (!g || conReglas) { g = { agentes: [], reglas: [] }; grupos.push(g); conReglas = false; } g.agentes.push(v.toLowerCase()); }
    else if ((k === "allow" || k === "disallow") && g) { conReglas = true; if (v) g.reglas.push([k === "allow", v]); }
  }
  const propios = grupos.filter((x) => x.agentes.some((a) => a && a !== "*" && agente.startsWith(a)));
  let mejor = null;
  for (const [permite, patron] of (propios.length ? propios : grupos.filter((x) => x.agentes.includes("*"))).flatMap((x) => x.reglas)) {
    if (!patronRobots(patron).test(ruta)) continue;
    if (!mejor || patron.length > mejor.largo || (patron.length === mejor.largo && permite)) mejor = { permite, largo: patron.length };
  }
  return mejor ? mejor.permite : true;
}
async function revisarRobots(url) {
  const u = new URL(url);
  try {
    const r = await fetch(u.origin + "/robots.txt", { headers: { "User-Agent": UA_MENCIONES }, signal: AbortSignal.timeout(8000) });
    if (r.status === 429) return false;   // «demasiadas consultas»: no se lee
    if (r.status >= 400 && r.status < 500) return true;
    if (!r.ok) return false;
    return robotsPermite((await r.text()).slice(0, 500000), u.pathname + u.search);
  } catch { return false; }
}
// Hasta 5 direcciones RSS de alertas (Talkwalker Alerts, Google Alertas…) que Germán pega en el Panel. Solo https y sin claves.
function validarRss(t) {
  let u;
  try { u = new URL(String(t || "").trim()); } catch { return null; }
  if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password || u.port || esNuestro(u.hostname) || u.toString().length > 500) return null;
  if (/^[\d.]+$/.test(u.hostname) || /^localhost\./i.test(u.hostname)) return null;
  for (const k of u.searchParams.keys()) if (/key|token|secret|password|clave|auth|signature|sig$/i.test(k)) return null;   // nunca secretos en la base
  u.hash = "";
  return u.toString();
}
function listaRss(valor) {
  try { const l = JSON.parse(valor || "[]"); return Array.isArray(l) ? l.map(validarRss).filter(Boolean).slice(0, MAX_RSS_ALERTAS) : []; } catch { return []; }
}
function fuentesMenciones(rss) {
  return [
    { id: "google", url: URL_GOOGLE_NEWS, tipo: "xml", robots: true, leer: (x) => leerRss(x, { fuente: "Google Noticias", medio: "Prensa digital" }) },
    { id: "itunes", url: URL_ITUNES, tipo: "json", robots: false, leer: leerItunes },   // API documentada para uso automático
    { id: "gdelt", url: URL_GDELT, tipo: "json", robots: false, leer: leerGdelt },      // API documentada para uso automático
    ...rss.map((u, i) => ({ id: "alerta" + (i + 1), url: u, tipo: "xml", robots: true, leer: (x) => leerRss(x, { fuente: "Alerta RSS (" + hostDe(u) + ")" }) })),
  ];
}
// La clave va en la cabecera X-Goog-Api-Key (no en la dirección, para que no quede en ningún registro)
const URL_YOUTUBE = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=20&q=${encodeURIComponent(Q_YOUTUBE)}`;
// Turno atómico en la tabla config: una sola copia del Worker lo toma, y como mucho cada «cadaMin» minutos
async function tomarTurno(env, clave, cadaMin) {
  const ahora = Date.now();
  const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES (?1, ?2) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE config.valor < ?3 RETURNING valor")
    .bind(clave, new Date(ahora).toISOString(), new Date(ahora - cadaMin * 60000).toISOString()).first();
  return !!r;
}
const cfgDif = (env, clave, valor) => env.DB.prepare("INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(clave, valor).run();
const jsonDe = (t, d) => { try { const x = JSON.parse(t || ""); return x && typeof x === "object" ? x : d; } catch { return d; } };
const normTitulo = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
function sinRepetir(items, previos = new Set()) {
  const vistos = new Set(), titulos = new Set(previos), filas = [];
  for (const x of items) {
    const kt = normTitulo(x.titulo);
    if (vistos.has(x.enlace) || (kt.length > 12 && titulos.has(kt))) continue;
    vistos.add(x.enlace); if (kt.length > 12) titulos.add(kt); filas.push(x);
    if (filas.length >= 40) break;
  }
  return filas;
}
async function guardarMenciones(env, items) {
  if (!items.length) return 0;
  // la misma nota llega por varias fuentes (Google Noticias la enlaza por su redirección, GDELT por la dirección real): el título la delata
  const recientes = ((await env.DB.prepare("SELECT titulo FROM menciones WHERE titulo IS NOT NULL AND creado >= ?").bind(new Date(Date.now() - 45 * 86400000).toISOString()).all()).results) || [];
  const filas = sinRepetir(items, new Set(recientes.map((x) => normTitulo(x.titulo)).filter((k) => k.length > 12))), ahora = new Date().toISOString();
  let nuevas = 0;
  for (let i = 0; i < filas.length; i += 10) {   // 9 datos por fila: 10 filas por consulta quedan bajo el tope de 100 datos por consulta de D1
    const parte = filas.slice(i, i + 10), vals = [];
    for (const x of parte) vals.push(x.fecha, x.medio, x.programa || null, x.persona || null, x.enlace, x.titulo || null, x.fuente, ahora, ahora);
    const r = await env.DB.prepare(`INSERT OR IGNORE INTO menciones (fecha, medio, programa, persona, enlace, titulo, fuente, creado, actualizado, origen, estado) VALUES ${parte.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, 'automática', 'por confirmar')").join(", ")}`)
      .bind(...vals).run();
    nuevas += (r && r.meta && r.meta.changes) || 0;
  }
  return nuevas;
}
// El recolector avanza por pasos: cada paso hace como mucho UNA descarga externa (las reglas de las redes si vencieron, un robots.txt,
// una fuente o la búsqueda de YouTube). Una visita a la portada da un solo paso, en segundo plano y con corte a los 20 s; el botón
// del Panel y scheduled() dan todos los pasos seguidos. Cada 6 h empieza una ronda nueva por Google Noticias, Apple Podcasts, GDELT y
// las alertas RSS; YouTube va aparte, con su propio turno según «busquedas_dia» (16 al día = una búsqueda cada 90 minutos como mínimo).
async function pasoMenciones(env, { completa = false, forzar = false } = {}) {
  if (!env.DB) return { estado: "sin base", nuevas: 0, descargas: 0 };
  await asegurarTablas(env, "difusion");
  const C = Object.fromEntries((((await env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('menciones_estado', 'menciones_reglas', 'menciones_robots', 'menciones_yt_dia', 'menciones_rss')").all()).results) || []).map((x) => [x.clave, x.valor]));
  const st = jsonDe(C.menciones_estado, {}), robots = jsonDe(C.menciones_robots, {}), rss = listaRss(C.menciones_rss), fuentes = fuentesMenciones(rss);
  const tope = completa ? 40 : 1, fin = Date.now() + (completa ? 25000 : 18000), iso = () => new Date().toISOString(), fresco = (t) => Date.parse(t) > Date.now() - 86400000;
  let descargas = 0, nuevas = 0, cambioRobots = false;
  const queda = () => descargas < tope && Date.now() < fin;
  let reglas = jsonDe(C.menciones_reglas, null);
  if (!reglas || !fresco(reglas.t)) {
    if (!queda()) return { estado: "en espera", nuevas, descargas };
    descargas++;
    reglas = { t: iso(), r: await bajarReglas() };
    await cfgDif(env, "menciones_reglas", JSON.stringify(reglas));
  }
  const yt = ((reglas.r || REGLAS_DEFECTO).redes || REDES_DEFECTO).youtube || REDES_DEFECTO.youtube;
  if (queda() && env.YOUTUBE_API_KEY && yt.activo && yt.busquedas_dia > 0) {
    const dia = fechaChile(), c = jsonDe(C.menciones_yt_dia, {}), n = c.fecha === dia ? Number(c.n) || 0 : 0;
    if (n < yt.busquedas_dia && (await tomarTurno(env, "menciones_yt_turno", Math.ceil(1440 / yt.busquedas_dia)))) {
      await cfgDif(env, "menciones_yt_dia", JSON.stringify({ fecha: dia, n: n + 1 }));
      descargas++;
      let r = "error";
      try { const items = leerYoutube(await traerFuente(URL_YOUTUBE, "json", { "X-Goog-Api-Key": String(env.YOUTUBE_API_KEY) })); r = items.length; nuevas += await guardarMenciones(env, items); } catch { r = "error"; }   // el error no se guarda: la dirección lleva la clave
      st.youtube = { hora: iso(), n: r };
    }
  }
  if (!st.ronda || !(st.ronda.pendientes || []).length) {
    if (queda() && (forzar || (await tomarTurno(env, "menciones_turno", MENCIONES_CADA_H * 60)))) st.ronda = { inicio: iso(), pendientes: fuentes.map((f) => f.id), fuentes: {}, nuevas: 0 };
  }
  const mapa = Object.fromEntries(fuentes.map((f) => [f.id, f]));
  while (st.ronda && (st.ronda.pendientes || []).length && queda()) {
    const id = st.ronda.pendientes[0], f = mapa[id];
    if (!f) { st.ronda.pendientes.shift(); continue; }   // una alerta RSS que se quitó en el Panel
    if (f.robots) {
      const r = robots[f.url];
      if (!r || !fresco(r.t)) { descargas++; robots[f.url] = { ok: await revisarRobots(f.url), t: iso() }; cambioRobots = true; continue; }
      if (!r.ok) { st.ronda.fuentes[id] = "bloqueado"; st.ronda.pendientes.shift(); continue; }   // sus reglas no permiten leerlo
    }
    descargas++;
    try {
      const items = f.leer(await traerFuente(f.url, f.tipo)), k = await guardarMenciones(env, items);
      st.ronda.fuentes[id] = items.length; st.ronda.nuevas += k; nuevas += k;
    } catch { st.ronda.fuentes[id] = "error"; }
    st.ronda.pendientes.shift();
    if (!st.ronda.pendientes.length) st.ultima = { inicio: st.ronda.inicio, hora: iso(), fuentes: st.ronda.fuentes, nuevas: st.ronda.nuevas };
  }
  st.reglas = (reglas.r || REGLAS_DEFECTO).origen;
  const stTxt = JSON.stringify(st);
  if (stTxt !== (C.menciones_estado || "")) await cfgDif(env, "menciones_estado", stTxt);   // sin escrituras inútiles en la base
  if (cambioRobots) {   // solo las fuentes vigentes, para que la lista no crezca sin fin
    const vigentes = Object.fromEntries(fuentes.filter((f) => robots[f.url]).map((f) => [f.url, robots[f.url]]));
    await cfgDif(env, "menciones_robots", JSON.stringify(vigentes));
  }
  return { estado: descargas ? "ok" : "en espera", nuevas, descargas };
}
// Desde la portada (ctx.waitUntil): un paso como mucho cada 2 minutos en todo el sitio, y nunca más de 20 s
let _proximoPasoMenciones = 0;
function revisarMenciones(env) {
  const cada = Math.max(0, Number(env.MENCIONES_PASO_SEG ?? 120)) * 1000;   // MENCIONES_PASO_SEG solo existe en el arnés de pruebas
  if (!env.DB || Date.now() < _proximoPasoMenciones) return Promise.resolve("espera");
  _proximoPasoMenciones = Date.now() + cada;
  const paso = (async () => ((await tomarTurno(env, "menciones_paso", cada / 60000)) ? (await pasoMenciones(env)).estado : "espera"))().catch(() => "error");
  return Promise.race([paso, new Promise((r) => setTimeout(() => r("corte"), 20000))]);
}
// Plazos de las bases: capturas borradas 30 días después del sorteo; datos de quienes no ganaron, el 01-02-2027; cupones no reclamados
// al 31-01-2027, anulados; los datos de un ganador se borran cuando usa su cupón; al vencer los cupones (31-03-2027), todo lo demás.
async function mantenerDifusion(env) {
  const hoy = hoyConcurso(), ops = [env.DB.prepare("DELETE FROM referidos_unicos WHERE fecha < ?").bind(masDias(fechaChile(), -120))];
  await asegurarTablas(env, "concurso");
  ops.push(env.DB.prepare("DELETE FROM canjes WHERE creado < ?").bind(new Date(Date.now() - 7 * 86400000).toISOString()),
    env.DB.prepare("DELETE FROM concurso_envios WHERE fecha < ?").bind(masDias(fechaChile(), -30)),
    env.DB.prepare("DELETE FROM concurso_participantes WHERE email IN (SELECT email FROM cupones WHERE origen = 'concurso' AND usado IS NOT NULL)"));
  if (hoy >= CONCURSO.borrarCapturas) ops.push(env.DB.prepare("UPDATE concurso_capturas SET datos = NULL WHERE datos IS NOT NULL"));
  if (hoy > CONCURSO.reclamo) ops.push(env.DB.prepare("DELETE FROM cupones WHERE origen = 'concurso' AND reclamado IS NULL AND usado IS NULL"));
  if (hoy >= CONCURSO.borrarDatos) ops.push(env.DB.prepare("DELETE FROM concurso_capturas"), env.DB.prepare("DELETE FROM concurso_envios"),
    env.DB.prepare("DELETE FROM concurso_participantes WHERE email NOT IN (SELECT email FROM cupones WHERE origen = 'concurso')"));
  if (hoy > CONCURSO.vence) ops.push(env.DB.prepare("DELETE FROM concurso_participantes"), env.DB.prepare("DELETE FROM cupones WHERE origen = 'concurso' AND usado IS NULL"),
    env.DB.prepare("UPDATE cupones SET email = 'borrado' WHERE origen = 'concurso' AND email <> 'borrado'"));
  await env.DB.batch(ops);
}
// Mantenimiento propio del concurso (no depende del recolector): los borrados de las bases una vez cada 12 horas y, desde el 26-12 a las
// 18:00 (hora de Santiago), el sorteo oficial si nadie lo hizo desde el Panel. Lo dispara cualquier visita a la portada o al Panel.
let _proximoMantConcurso = 0;
function revisarConcurso(env) {
  const cada = Math.max(0, Number(env.CONCURSO_MANT_SEG ?? 600)) * 1000;   // CONCURSO_MANT_SEG solo existe en el arnés de pruebas
  if (!env.DB || Date.now() < _proximoMantConcurso) return Promise.resolve("espera");
  _proximoMantConcurso = Date.now() + cada;   // cada copia del Worker mira como mucho cada 10 minutos
  const tarea = (async () => {
    await asegurarTablas(env, "difusion");
    await asegurarTablas(env, "concurso");
    let r = "nada";
    if (await tomarTurno(env, "difusion_mant", cada ? 720 : 0)) {
      try { await mantenerDifusion(env); await cfgDif(env, "difusion_mant_ok", new Date().toISOString()); r = "mantenimiento"; }
      catch (e) { await cfgDif(env, "difusion_mant_error", new Date().toISOString() + " " + recorte((e && e.message) || e, 160)).catch(() => null); r = "error"; }
    }
    const hoy = hoyConcurso(), hora = /^\d{1,2}$/.test(_horaPrueba) ? Number(_horaPrueba) : horaDeChile();
    if (hoy <= CONCURSO.reclamo && (hoy > CONCURSO.sorteo || (hoy === CONCURSO.sorteo && hora >= CONCURSO.sorteoAutoHora))
      && !(await env.DB.prepare("SELECT id FROM concurso_sorteos WHERE tipo = 'oficial'").first()) && (await tomarTurno(env, "sorteo_auto", cada ? 30 : 0))) r = "sorteo:" + (await sortearOficial(env));
    return r;
  })().catch(() => "error");
  return Promise.race([tarea, new Promise((ok) => setTimeout(() => ok("corte"), 25000))]);
}
async function accionMenciones(req, env) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const volver = (codigo) => new Response(null, { status: 303, headers: { Location: `/panel?men=${encodeURIComponent(codigo)}#difusion`, "Cache-Control": "no-store" } });
  if (!env.DB) return volver("sin-base");
  const cuerpo = await leerCuerpo(req, 20000);
  if (cuerpo === null) return volver("error:muy-grande");
  const f = new URLSearchParams(cuerpo), accion = String(f.get("accion") || ""), id = Math.floor(Number(f.get("id") || 0)), ahora = new Date().toISOString();
  const v = (k, n) => String(f.get(k) || "").trim().replace(/\s+/g, " ").slice(0, n);
  await asegurarTablas(env, "difusion");
  if (accion === "agregar") {
    const fecha = v("fecha", 10), medio = v("medio", 30), programa = v("programa", 160), persona = v("persona", 120), enlaceT = v("enlace", 700);
    if (!fechaValida(fecha) || fecha > fechaChile()) return volver("error:fecha");
    if (!MEDIOS_MENCION.includes(medio)) return volver("error:medio");
    if (!programa && !persona) return volver("error:quien");
    let enlace = null;
    if (enlaceT) { enlace = normalizarEnlace(enlaceT); if (!enlace) return volver("error:enlace"); if (esNuestro(hostDe(enlace))) return volver("error:propio"); }
    const alcT = v("alcance", 14).replace(/[.\s]/g, ""), alcance = alcT ? Number(alcT) : null;
    if (alcT && !(Number.isInteger(alcance) && alcance >= 0 && alcance <= 1e10)) return volver("error:alcance");
    try {
      await env.DB.prepare("INSERT INTO menciones (fecha, medio, programa, persona, enlace, alcance, origen, estado, nota, titulo, fuente, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, 'manual', 'confirmada', ?, ?, 'Panel', ?, ?)")
        .bind(fecha, medio, programa || null, persona || null, enlace, alcance, v("nota", 500) || null, v("titulo", 300) || null, ahora, ahora).run();
    } catch (e) {
      if (/UNIQUE/i.test(String((e && e.message) || e))) return volver("error:repetida");
      throw e;
    }
    return volver("agregada");
  }
  if (accion === "confirmar" || accion === "descartar" || accion === "pendiente") {
    const nuevo = { confirmar: "confirmada", descartar: "descartada", pendiente: "por confirmar" }[accion];
    const r = await env.DB.prepare("UPDATE menciones SET estado = ?, actualizado = ? WHERE id = ?").bind(nuevo, ahora, id).run();
    return volver(r.meta && r.meta.changes ? accion : "error:no-existe");
  }
  if (accion === "barrer") { const r = await pasoMenciones(env, { completa: true, forzar: true }); return volver("barrido:" + (Number(r && r.nuevas) || 0)); }
  if (accion === "rss") {
    const lineas = String(f.get("rss") || "").split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
    if (lineas.length > MAX_RSS_ALERTAS) return volver("error:rss-tope");
    const lista = [];
    for (const x of lineas) { const u = validarRss(x); if (!u) return volver("error:rss"); if (!lista.includes(u)) lista.push(u); }
    await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('menciones_rss', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(JSON.stringify(lista)).run();
    return volver("rss:" + lista.length);
  }
  return volver("error:accion");
}

// =====================================================================================================================
// 3. CONCURSO «COMPARTE COFRADE NEWS»: inscripción desde el Buzón (3 pasos, Turnstile y email confirmado), captura privada, conteo,
//    sorteo auditable y cupones. El script del navegador vive en modulos/concurso_cliente.js
// =====================================================================================================================
const CONCURSO_JS = __CONCURSO_JS__;
const CONCURSO_DLG = `<dialog class="dlg-pub dlg-buzon dlg-concurso" id="dlgConcurso" aria-labelledby="dlgConT" data-sitekey="${TURNSTILE_SITEKEY}"><form class="pub-form" novalidate>
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button>
<span class="kicker">Concurso Comparte Cofrade News</span><h3 id="dlgConT">Gana hasta un año gratis</h3>
<div class="pasos" aria-hidden="true"><i></i><i></i><i></i></div><p class="sub paso-n" style="margin:0" aria-live="polite">Paso 1 de 3</p>
<div class="paso" data-paso="1"><p class="cc-txt">${TXT_DLG_ES}</p>
<label class="pub-ok"><input type="checkbox" name="mayor" value="si"> Tengo 18 años o más y vivo en Chile</label>
<label class="pub-ok"><input type="checkbox" name="bases" value="si"> Acepto las <a href="/bases-concurso" target="_blank" rel="noopener">bases del concurso</a></label></div>
<div class="paso" data-paso="2" hidden><fieldset><legend>Captura de pantalla (opcional)</legend>
<p class="ayuda">Si ya confirmaste tu email, sube una captura que muestre que compartiste Cofrade News. Si la aceptamos, suma 1 participación (máximo 1 al día).</p>
<p class="cc-aviso"><b>Antes de subirla:</b> tapa los nombres, números y fotos de otras personas. La captura es privada: nunca se publica y se borra 30 días después del sorteo.</p>
<label class="cc-archivo"><span>Elegir imagen</span><input type="file" name="archivo" accept="image/*"></label>
<div class="cc-vista" hidden><img src="data:," alt="Vista previa de tu captura" width="72" height="72"><span class="cc-peso"></span><button type="button" class="enlace cc-quitar">Quitar</button></div></fieldset></div>
<div class="paso" data-paso="3" hidden><label>Email *<input name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"><span class="ayuda">Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email completo.</span></label>
<label class="pub-hp" aria-hidden="true">Página web<input name="pagina_web" tabindex="-1" autocomplete="off"></label>
<div id="tsConcurso" class="ts"></div></div>
<div class="buzon-ok" hidden><p class="sello-ok" aria-hidden="true">✓</p><h3>¡Gracias por participar!</h3><p class="buzon-msg"></p>
<div class="cc-mio" hidden><label>Tu enlace personal<input class="cc-enlace" readonly></label><button type="button" class="btn linea cc-copiar">Copiar mi enlace</button></div>
<button type="button" class="pub-enviar buzon-fin">Cerrar</button></div>
<div class="buzon-nav"><button type="button" class="btn linea cc-atras" hidden>Atrás</button><button type="button" class="pub-enviar cc-sig">Siguiente</button><button type="submit" class="pub-enviar cc-enviar" hidden>Participar</button></div>
<p class="pub-estado" role="status" aria-live="polite"></p></form></dialog>`;
const BUZON_CONCURSO = `<p class="buzon-cc"><span>¿Compartes Cofrade News?</span> <button type="button" class="enlace concurso-abrir">Participar en el concurso</button> · <a href="/bases-concurso">Bases</a></p>`;
// El Buzón muestra la opción del concurso solo mientras está abierto (lo arma marco() en cada página)
function buzonHtml() {
  return etapaConcurso() === "abierto" ? BUZON.replace('<div class="pasos"', BUZON_CONCURSO + '<div class="pasos"') : BUZON;
}
const concursoDialogo = () => (etapaConcurso() === "abierto" ? CONCURSO_DLG : "");
const concursoScript = () => (etapaConcurso() === "abierto" ? CONCURSO_JS : "");
// Cinta de la portada: invita a compartir y a participar; después del cierre, avisa del sorteo y de los resultados
function cintaConcurso() {
  const e = etapaConcurso();
  if (e === "antes" || e === "fin") return "";
  const abierto = e === "abierto";
  return `<section class="cc-sec" aria-labelledby="t-cc"><div class="cc-cinta"><div class="cc-c-txt"><span class="kicker">${abierto ? "Concurso · hasta el 24 de diciembre" : "Concurso cerrado"}</span>
<h2 id="t-cc">${abierto ? "Comparte Cofrade News y gana hasta un año gratis" : "Resultados del concurso"}</h2>
<p>${abierto ? TXT_CINTA_ES
    : e === "cerrado" && hoyConcurso() > CONCURSO.sorteo ? TXT_SORTEO_HECHO_ES : TXT_SORTEO_ANTES_ES}</p></div>
<div class="cc-acc">${abierto ? `<button type="button" class="btn oro cmp-abrir">Compartir mi enlace</button><button type="button" class="btn linea concurso-abrir">Participar</button>` : ""}<a class="btn linea" href="/bases-concurso">Ver las bases</a></div></div></section>`;
}
// Código del enlace personal: los primeros 40 bits del SHA-256 de «cn-ref|secreto», en base 36 (8 letras y números). El secreto vive
// solo en el navegador del lector (localStorage cn-ref-s): quien ve un enlace compartido no puede inscribir ese código como propio.
async function codigoDeSecreto(s) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", _tdif.encode("cn-ref|" + s)));
  let n = 0;
  for (let i = 0; i < 5; i++) n = n * 256 + b[i];
  return n.toString(36).padStart(8, "0");
}
const enlacePersonal = (c) => `https://${DOMINIO}/?r=${c}&utm_source=compartir`;
function errorConcurso(es, en, s = 400) { return jsonR({ ok: false, error: es, error_en: en }, s); }
// Email para comparar y guardar: en minúsculas; en Gmail sin puntos, y sin «+etiqueta» en los correos que la aceptan. Así la misma
// casilla no se inscribe dos veces con alias, y el correo de confirmación llega igual a la misma casilla.
const PLUS_OK = /^(gmail\.com|googlemail\.com|outlook\.com|hotmail\.com|live\.com|msn\.com|icloud\.com|me\.com|mac\.com|proton\.me|protonmail\.com|pm\.me|fastmail\.com)$/;
function emailCanonico(email) {
  const i = email.lastIndexOf("@");
  let u = email.slice(0, i), d = email.slice(i + 1);
  if (d === "googlemail.com") d = "gmail.com";
  if (PLUS_OK.test(d)) u = u.replace(/\+.*$/, "");
  if (d === "gmail.com") u = u.replace(/\./g, "");
  return u ? u + "@" + d : email;
}
// Las capturas se guardan en texto base64: D1 convierte un BLOB en una lista de números (mucha CPU en el plan gratuito); el texto no
function aBase64(u8) {
  let t = "";
  for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(t);
}
const MSG_NEUTRO = {
  es: "Si ese email está bien escrito, revisa tu bandeja: ahí llega (o ya llegó) nuestro correo con tu enlace personal. Para subir capturas, usa el mismo navegador con el que te inscribiste.",
  en: "If that email is spelled correctly, check your inbox: our email with your personal link arrives (or already arrived) there. To upload screenshots, use the same browser you signed up with.",
};
async function recibirConcurso(req, env, ctx) {
  if (!ORIGEN_OK(req)) return errorConcurso("Origen no permitido.", "Origin not allowed.", 403);
  if (!env.DB) return errorConcurso("El concurso se habilita en unos minutos.", "The contest opens in a few minutes.", 503);
  const hoy = hoyConcurso();
  if (hoy < CONCURSO.desde) return errorConcurso("El concurso todavía no empieza.", "The contest has not started yet.");
  if (hoy > CONCURSO.hasta) return errorConcurso("El concurso ya cerró. ¡Gracias por participar!", "The contest is closed. Thank you for taking part!");
  const dia = fechaChile(), ip = await huellaVisitante(req, env, dia, false);
  if (!(await bajoLimite(env, "c:" + ip))) return errorConcurso("Demasiados intentos seguidos. Espera un minuto y vuelve a enviar.", "Too many attempts. Wait a minute and try again.", 429);
  const largo = Number(req.headers.get("Content-Length") || 0);
  if (!largo) return errorConcurso("No pudimos leer el envío.", "We could not read the form.", 411);
  if (largo > CONCURSO.capturaMaxBytes + 60000) return errorConcurso("La captura es demasiado pesada (máximo 300 KB).", "The screenshot is too large (300 KB max).", 413);
  let f;
  try { f = await req.formData(); } catch { return errorConcurso("No pudimos leer el envío.", "We could not read the form."); }
  const v = (k, n) => String(f.get(k) || "").trim().slice(0, n);
  if (v("pagina_web", 100)) return jsonR({ ok: true, mensaje: "¡Gracias!", mensaje_en: "Thank you!" });   // trampa para robots
  if (!(await turnstileOk(v("cf-turnstile-response", 2048), req, env))) return errorConcurso("No pudimos confirmar que eres una persona. Vuelve a marcar el recuadro de seguridad.", "We could not confirm you are a person. Please tick the security box again.");
  if (v("mayor", 4) !== "si") return errorConcurso("Para participar debes tener 18 años o más y vivir en Chile.", "To take part you must be 18 or older and live in Chile.");
  if (v("bases", 4) !== "si") return errorConcurso("Debes aceptar las bases del concurso.", "You must accept the contest rules.");
  const email0 = v("email", 120).toLowerCase();
  const m = email0.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!m || !/\.[a-z]{2,}$/.test(m[1])) return errorConcurso("Ese email no parece válido. Revisa que esté bien escrito.", "That email does not look valid. Please check it.");
  const email = emailCanonico(email0);
  const secreto = v("secreto", 40);
  if (!/^[a-z0-9]{24}$/.test(secreto)) return errorConcurso("Recarga la página e intenta de nuevo.", "Please reload the page and try again.");
  const codigo = await codigoDeSecreto(secreto);
  let cap = null;
  const archivo = f.get("captura");
  if (archivo && typeof archivo === "object" && typeof archivo.arrayBuffer === "function" && archivo.size > 0) {
    if (archivo.size > CONCURSO.capturaMaxBytes) return errorConcurso("La captura es demasiado pesada (máximo 300 KB).", "The screenshot is too large (300 KB max).", 413);
    const b = new Uint8Array(await archivo.arrayBuffer());
    if (!(b.length > 100 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) return errorConcurso("La captura debe ser una imagen. Elige una captura de pantalla.", "The screenshot must be an image.");
    const entero = (k) => { const x = Math.floor(Number(v(k, 6))); return x > 0 && x <= 20000 ? x : null; };
    cap = { b, bytes: b.length, sha: hexDif(await crypto.subtle.digest("SHA-256", b)), ancho: entero("ancho"), alto: entero("alto") };
  }
  await asegurarTablas(env, "concurso");
  const ahora = new Date().toISOString();
  const [rp, ro, rd, rc, re] = await env.DB.batch([
    env.DB.prepare("SELECT email, codigo, verificado, token, enviado, creado, estado FROM concurso_participantes WHERE email = ?").bind(email),
    env.DB.prepare("SELECT email, verificado FROM concurso_participantes WHERE codigo = ?").bind(codigo),
    env.DB.prepare("SELECT id FROM concurso_capturas WHERE sha = ?").bind(cap ? cap.sha : "-"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM concurso_capturas WHERE email = ? AND fecha = ?").bind(email, hoy),
    env.DB.prepare("SELECT (SELECT COUNT(*) FROM concurso_envios WHERE fecha = ?1 AND ip = ?2) AS ipdia, (SELECT COUNT(*) FROM concurso_envios WHERE email = ?3) AS mail, (SELECT COUNT(*) FROM concurso_envios WHERE fecha = ?1) AS dia")
      .bind(dia, ip, email),
  ]);
  let p = (rp.results || [])[0] || null;
  const otro = (ro.results || [])[0] || null, E = (re.results || [])[0] || {};
  // El email ya está inscrito desde otro navegador: respuesta neutra (no revela si participa), sin reenvíos ni capturas a su nombre
  if (p && p.codigo !== codigo) return jsonR({ ok: true, mensaje: MSG_NEUTRO.es, mensaje_en: MSG_NEUTRO.en });
  if (!p && otro && otro.verificado) return errorConcurso("Este navegador ya está inscrito en el concurso con otro email. Cada persona participa una sola vez.", "This browser is already signed up with another email. Each person can enter only once.", 409);
  let capPendiente = false;
  if (cap && (!p || !p.verificado)) { cap = null; capPendiente = true; }   // la captura espera a que confirme su email; la inscripción sigue
  if (cap) {
    if (p.estado === "excluido") return errorConcurso("No pudimos recibir la captura. Escríbenos a hola@cofrad.es.", "We could not receive the screenshot. Please write to hola@cofrad.es.", 409);
    if ((rd.results || []).length) return errorConcurso("Esa captura ya fue enviada. Sube una distinta.", "That screenshot was already sent. Please upload a different one.", 409);
    if (Number(((rc.results || [])[0] || {}).n || 0) >= CONCURSO.topeCaptura) return errorConcurso("Ya recibimos tu captura de hoy. Puedes subir otra mañana.", "We already received your screenshot today. You can upload another one tomorrow.", 429);
  }
  const puedeEnviar = Number(E.ipdia || 0) < CONCURSO.correosIpDia && Number(E.mail || 0) < CONCURSO.correosPorEmail && Number(E.dia || 0) < CONCURSO.correosDia;
  let enviar = false;
  if (!p) {
    if (!hayCorreo(env)) return errorConcurso("Las inscripciones se abren en unos minutos. Vuelve a intentarlo más tarde.", "Sign-ups open in a few minutes. Please try again later.", 503);
    if (!puedeEnviar) return errorConcurso("Por hoy no podemos enviar más correos de confirmación desde esta conexión. Inténtalo mañana.", "We cannot send more confirmation emails from this connection today. Please try again tomorrow.", 429);
    if (await esDesechable(m[1], ctx)) return errorConcurso("No aceptamos correos temporales o desechables. Usa tu email de siempre.", "Temporary or disposable emails are not accepted.");
    if (!(await recibeCorreo(m[1]))) return errorConcurso("Ese dominio de correo no recibe emails. Revisa que esté bien escrito.", "That email domain does not receive email. Please check it.");
    const token = (await sha256hex(crypto.randomUUID() + email + Date.now())).slice(0, 40);
    try {
      if (otro) {   // el mismo navegador corrige un email mal escrito que aún no confirma: el secreto del navegador prueba que el código es suyo
        const r = await env.DB.prepare("UPDATE concurso_participantes SET email = ?, token = ?, creado = ?, enviado = NULL, ip = ? WHERE codigo = ? AND verificado = 0").bind(email, token, ahora, ip, codigo).run();
        if (!(r.meta && r.meta.changes)) return errorConcurso("Recarga la página e intenta de nuevo.", "Please reload the page and try again.", 409);
      } else {
        await env.DB.prepare("INSERT INTO concurso_participantes (email, codigo, creado, verificado, token, mayor, bases, ip) VALUES (?, ?, ?, 0, ?, 1, 1, ?)").bind(email, codigo, ahora, token, ip).run();
      }
    } catch (e) {
      if (/UNIQUE/i.test(String((e && e.message) || e))) return jsonR({ ok: true, mensaje: MSG_NEUTRO.es, mensaje_en: MSG_NEUTRO.en });
      throw e;
    }
    p = { email, codigo, verificado: 0, token, enviado: null, creado: ahora, estado: "activo" };
    enviar = true;
  } else if (!p.verificado && (!p.enviado || Date.parse(p.enviado) < Date.now() - 600000) && puedeEnviar && hayCorreo(env)) {   // reenvío: cada 10 minutos como mucho, con enlace nuevo
    p.token = (await sha256hex(crypto.randomUUID() + email + Date.now())).slice(0, 40);
    await env.DB.prepare("UPDATE concurso_participantes SET token = ?, creado = ? WHERE email = ? AND verificado = 0").bind(p.token, ahora, email).run();
    enviar = true;
  }
  let capEs = capPendiente ? " La captura no se guardó: súbela de nuevo desde este navegador cuando confirmes tu email." : "";
  let capEn = capPendiente ? " The screenshot was not saved: upload it again from this browser once you confirm your email." : "";
  if (cap) {
    let r;
    try {
      r = await env.DB.prepare(`INSERT INTO concurso_capturas (email, fecha, creado, sha, bytes, ancho, alto, datos, estado, ip) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'por revisar', ?9
        WHERE (SELECT COUNT(*) FROM concurso_capturas WHERE fecha = ?2) < ?10 AND (SELECT COUNT(*) FROM concurso_capturas WHERE fecha = ?2 AND ip = ?9) < ?11
        AND (SELECT COUNT(*) FROM concurso_capturas WHERE email = ?1) < ?12 AND (SELECT COALESCE(SUM(bytes), 0) FROM concurso_capturas WHERE datos IS NOT NULL) + ?5 <= ?13`)
        .bind(email, hoy, ahora, cap.sha, cap.bytes, cap.ancho, cap.alto, aBase64(cap.b), ip, CONCURSO.capturasDia, CONCURSO.capturasIpDia, CONCURSO.capturasPorPersona, CONCURSO.capturasMaxTotal).run();
    } catch (e) {
      if (/UNIQUE/i.test(String((e && e.message) || e))) return errorConcurso("Esa captura ya fue enviada. Sube una distinta.", "That screenshot was already sent. Please upload a different one.", 409);
      throw e;
    }
    if (!(r && r.meta && r.meta.changes)) return errorConcurso("Hoy no podemos recibir más capturas. Inténtalo mañana.", "We cannot receive more screenshots today. Please try again tomorrow.", 429);
    capEs = " Recibimos tu captura: la revisaremos y, si cumple las bases, suma 1 participación.";
    capEn = " We received your screenshot: we will review it and, if it meets the rules, it adds 1 entry.";
  }
  let es, en;
  if (p.verificado) { es = "Ya estás participando con este email."; en = "You are already taking part with this email."; }
  else if (enviar) {
    await env.DB.prepare("INSERT INTO concurso_envios (fecha, ip, email, creado) VALUES (?, ?, ?, ?)").bind(dia, ip, email, ahora).run();
    let ok = false;
    try { ok = await enviarCorreo(env, { to: email, ...correoConcurso({ enlace: `https://${DOMINIO}/concurso/verificar?t=${p.token}`, personal: enlacePersonal(p.codigo) }) }); } catch { ok = false; }
    if (ok) await env.DB.prepare("UPDATE concurso_participantes SET enviado = ? WHERE email = ?").bind(ahora, email).run();
    es = ok ? "Te enviamos un correo desde hola@cofrad.es: ábrelo y toca «Confirmar mi participación». Tus participaciones cuentan cuando confirmes (también las visitas que tu enlace ya trajo). Si no lo ves, revisa spam o promociones."
      : "Quedaste inscrito, pero no pudimos enviarte el correo de confirmación. Inténtalo de nuevo en unos minutos.";
    en = ok ? "We sent you an email from hola@cofrad.es: open it and tap “Confirm my entry”. Your entries count once you confirm (including the visits your link already brought). If you don't see it, check spam or promotions."
      : "You are signed up, but we could not send the confirmation email. Please try again in a few minutes.";
  } else if (!puedeEnviar) { es = "Ya te enviamos el correo de confirmación: revisa tu bandeja, spam o promociones. Por hoy no podemos enviarlo de nuevo."; en = "We already sent you the confirmation email: check your inbox, spam or promotions. We cannot send it again today."; }
  else { es = "Ya te enviamos el correo de confirmación hace unos minutos: revisa tu bandeja, spam o promociones."; en = "We already sent you the confirmation email a few minutes ago: check your inbox, spam or promotions."; }
  return jsonR({ ok: true, mensaje: es + capEs, mensaje_en: en + capEn, codigo, enlace: enlacePersonal(codigo) });   // solo llega aquí el navegador dueño del código
}
function correoConcurso({ enlace, personal }) {
  const subject = "Confirma tu participación en el Concurso Comparte Cofrade News";
  const text = `Hola:\n\nRecibimos tu inscripción en el Concurso «Comparte Cofrade News». Para que tus participaciones cuenten, confirma tu email con un clic:\n${enlace}\n`
    + `(El enlace vence en 7 días. Si no fuiste tú, ignora este correo.)\n\nTu enlace personal para compartir:\n${personal}\nCada persona distinta que lo abre en un día suma 1 participación (hasta 10 al día). `
    + `${TXT_PREMIOS_ES}\nBases: https://${DOMINIO}/bases-concurso\n\nUn cordial saludo,\nEquipo Cofrade News\nwww.cofrad.es · ${CORREO_HOLA}`;
  const p = (t) => `<p style="margin:0 0 14px">${t}</p>`;
  const html = `<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#0B1F3A;max-width:560px;margin:0 auto;padding:8px 4px">`
    + `<p style="margin:0 0 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9A7B2F">Cofrade News · Concurso</p>`
    + p("Hola:") + p("Recibimos tu inscripción en el <b>Concurso «Comparte Cofrade News»</b>. Para que tus participaciones cuenten, confirma tu email con un clic:")
    + `<p style="margin:0 0 18px"><a href="${enlace}" style="display:inline-block;background:#C9A227;color:#0B1F3A;font:700 16px/1 Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:999px">Confirmar mi participación</a></p>`
    + `<p style="margin:0 0 18px;font:13px/1.5 Arial,sans-serif;color:#5A6577">El enlace vence en 7 días. Si no fuiste tú, ignora este correo.</p>`
    + p(`Tu enlace personal para compartir:<br><a href="${personal}" style="color:#0B1F3A;word-break:break-all">${personal}</a>`)
    + p("Cada persona distinta que lo abre en un día suma 1 participación (hasta 10 al día). " + TXT_PREMIOS_ES)
    + `<p style="margin:22px 0 0">Un cordial saludo,<br><b>Equipo Cofrade News</b><br><a href="https://${DOMINIO}/bases-concurso" style="color:#0B1F3A">Bases del concurso</a> · <a href="mailto:${CORREO_HOLA}" style="color:#0B1F3A">${CORREO_HOLA}</a></p></div>`;
  return { subject, text, html };
}
// Confirmación en dos pasos (como el Buzón): abrir el enlace muestra un botón; el botón confirma. Así el antivirus del correo no confirma solo.
async function verificarConcurso(req, u, env) {
  const pagina = (cuerpo, s = 200) => html(marco({ titulo: "Concurso · Cofrade News", descripcion: "", cuerpo }), s, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const vencido = pagina(`<section style="border:0"><span class="kicker">Concurso</span><h1>Este enlace ya se usó o venció.</h1><p class="lede">Si quieres, vuelve a inscribirte desde el Buzón.</p><div class="acciones"><a class="btn oro" href="/#concurso">Abrir el concurso</a></div></section>`, 410);
  if (!env.DB) return vencido;
  await asegurarTablas(env, "concurso");
  const limite = new Date(Date.now() - 7 * 86400000).toISOString();
  if (req.method === "POST") {
    const cuerpo = await leerCuerpo(req, 2000);
    const t = String((cuerpo && new URLSearchParams(cuerpo).get("t")) || "");
    if (!/^[a-f0-9]{40}$/.test(t)) return vencido;
    const r = await env.DB.prepare("UPDATE concurso_participantes SET verificado = 1, confirmado = ?, token = NULL WHERE token = ? AND verificado = 0 AND creado >= ? RETURNING codigo")
      .bind(new Date().toISOString(), t, limite).first();
    if (!r) return vencido;
    const personal = enlacePersonal(r.codigo), abierto = etapaConcurso() === "abierto";
    return pagina(`<section style="border:0;max-width:680px"><span class="kicker">Concurso Comparte Cofrade News</span><h1>${abierto ? "¡Listo! Ya estás participando." : "¡Listo! Tu email quedó confirmado."}</h1>
<p class="lede">${abierto ? "Tus participaciones ya cuentan: cada persona distinta que abre tu enlace en un día suma 1 (hasta 10 al día), también las visitas que trajo antes de confirmar. Copia tu enlace personal y compártelo:"
    : "Las inscripciones cerraron el 24 de diciembre: cuentan las visitas que tu enlace trajo hasta ese día. El sorteo es el 26 de diciembre. Tu enlace personal:"}</p>
<p><input class="cc-enlace" readonly value="${esc(personal)}" aria-label="Tu enlace personal" style="width:100%;min-height:48px;border-radius:12px;border:1.5px solid var(--linea);padding:0 12px;font-size:16px;background:var(--card);color:var(--tinta)"></p>
<p class="sub">En el navegador con el que te inscribiste, el botón Compartir de la portada ya usa este mismo enlace.</p>
<div class="acciones"><a class="btn oro" href="/">Ir a la portada</a><a class="btn linea" href="/bases-concurso">Ver las bases</a></div></section>`);
  }
  const t = String(u.searchParams.get("t") || "");
  if (!/^[a-f0-9]{40}$/.test(t)) return vencido;
  const fila = await env.DB.prepare("SELECT verificado, creado FROM concurso_participantes WHERE token = ?").bind(t).first();
  if (!fila || fila.verificado || fila.creado < limite) return vencido;
  return html(marco({ titulo: "Concurso · Cofrade News", descripcion: "", cuerpo: `<section style="border:0;max-width:640px"><span class="kicker">Concurso Comparte Cofrade News</span><h1>Confirma que eres tú</h1><p class="lede">Toca el botón para confirmar tu participación.</p>
<form method="post" action="/concurso/verificar"><input type="hidden" name="t" value="${t}"><button type="submit" class="btn oro" style="margin-top:18px">Confirmar mi participación</button></form></section>` }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}
// Participaciones de cada persona con email confirmado, dentro de las fechas del concurso:
//   enlace: por cada día, personas distintas que abrieron su enlace, con tope de 10 al día; captura: días con una captura aceptada (tope 1).
// La lista sale ordenada por una huella del email (HMAC), que es lo que guarda el registro de auditoría (nunca el email en claro).
async function entradasConcurso(env, conId = false) {
  await asegurarTablas(env, "difusion");
  await asegurarTablas(env, "concurso");
  const [ps, enl, caps] = await env.DB.batch([
    env.DB.prepare("SELECT email, codigo, verificado, creado, confirmado, estado FROM concurso_participantes ORDER BY creado"),
    env.DB.prepare("SELECT p.email AS email, u.fecha AS fecha, COUNT(*) AS n FROM concurso_participantes p JOIN referidos_unicos u ON u.codigo = p.codigo WHERE p.verificado = 1 AND u.fecha BETWEEN ? AND ? GROUP BY p.email, u.fecha")
      .bind(CONCURSO.desde, CONCURSO.hasta),
    env.DB.prepare("SELECT email, COUNT(DISTINCT fecha) AS n FROM concurso_capturas WHERE estado = 'aceptada' AND fecha BETWEEN ? AND ? GROUP BY email").bind(CONCURSO.desde, CONCURSO.hasta),
  ]);
  const enlace = {}, captura = {};
  for (const x of enl.results || []) enlace[x.email] = (enlace[x.email] || 0) + Math.min(CONCURSO.topeEnlace, Number(x.n) || 0);
  for (const x of caps.results || []) captura[x.email] = Math.min(Number(x.n) || 0, 99999);
  const lista = [];
  for (const p of ps.results || []) {
    const vale = p.verificado && p.estado !== "excluido", e = vale ? enlace[p.email] || 0 : 0, c = vale ? captura[p.email] || 0 : 0;
    lista.push({ email: p.email, codigo: p.codigo, verificado: !!p.verificado, estado: p.estado || "activo", creado: p.creado, enlace: e, captura: c, total: e + c, id: conId && e + c > 0 ? await hmacDif(env, "concurso|" + p.email, 16) : "" });
  }
  if (conId) lista.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return lista;
}
// Número de 48 bits a partir de la semilla: SHA-256(«semilla:i»). Cualquiera puede repetir el sorteo con la semilla y la lista.
async function azar48(semilla, i) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", _tdif.encode(semilla + ":" + i)));
  let n = 0;
  for (let j = 0; j < 6; j++) n = n * 256 + b[j];
  return n;
}
// Sorteo ponderado sin reemplazo: cada participación es una chance; quien sale elegido deja de participar (ganadores distintos).
async function elegirGanadores(pesos0, semilla, k) {
  const pesos = pesos0.slice(), sal = [];
  let total = pesos.reduce((a, x) => a + x, 0), i = 0;
  while (sal.length < k && total > 0) {
    const lim = 2 ** 48 - (2 ** 48 % total);   // múltiplo exacto de total (enteros < 2^53: sin error de coma flotante)
    let r;
    do { r = await azar48(semilla, i++); } while (r >= lim);   // sin sesgo de módulo
    let t = r % total, j = 0;
    while (t >= pesos[j]) { t -= pesos[j]; j++; }
    sal.push(j); total -= pesos[j]; pesos[j] = 0;
  }
  return sal;
}
async function prepararSorteo(lista, semilla) {
  const conChances = lista.filter((x) => x.total > 0), audit = conChances.map((x) => [x.id, x.total]);
  const huella = await sha256hex(JSON.stringify(audit));
  const elegidos = await elegirGanadores(audit.map((x) => x[1]), semilla, CONCURSO.ganadores);
  return { audit, huella, total: audit.reduce((a, x) => a + x[1], 0), participantes: audit.length, ganadores: elegidos.map((i) => conChances[i]) };
}
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// Germán, 20-11-2026 09:01: «Hazlo como tú consideres que sea viable y 100% seguro, para que nadie pueda compartir o descifrar el código de
// otro ganador». El código no lleva datos del email (los dejaría a la vista): son 15 caracteres al azar (75 bits, imposibles de adivinar),
// solo valen junto con el email ganador, se usan una vez y el año gratis se activa con un enlace que llega a la bandeja del ganador.
function codigoCupon(pct) {   // el prefijo dice el descuento: CN100 (año gratis), CN75, CN50, CN25
  const b = crypto.getRandomValues(new Uint8Array(15));
  let s = "";
  for (const x of b) s += CROCKFORD[x & 31];
  return `CN${pct}-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10)}`;
}
// Lo que escribe la persona: mayúsculas, sin espacios, y las letras que se confunden (I, L → 1; O → 0) como en el alfabeto de Crockford
// Se rearma por posición: se quita todo lo que no es letra o número (espacios, guiones de cualquier tipo) y las letras que se confunden
// pasan a su número (I y L → 1; O → 0), como en el alfabeto de Crockford. «cn1oo abcde…» queda «CN100-ABCDE-…».
function normalizarCodigo(t) {
  const x = String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
  if (!x.startsWith("CN")) return x;
  const r = x.slice(2).replace(/[IL]/g, "1").replace(/O/g, "0");
  const n = r.length - 15;
  if (n < 2 || n > 3) return "CN" + r;
  const a = r.slice(n);
  return `CN${r.slice(0, n)}-${a.slice(0, 5)}-${a.slice(5, 10)}-${a.slice(10)}`;
}
async function sortearOficial(env) {
  if (hoyConcurso() < CONCURSO.sorteo) return "antes";
  await asegurarTablas(env, "concurso");
  if (await env.DB.prepare("SELECT id FROM concurso_sorteos WHERE tipo = 'oficial'").first()) return "hecho";
  const lista = await entradasConcurso(env, true);
  const semilla = hexDif(crypto.getRandomValues(new Uint8Array(32)));
  const S = await prepararSorteo(lista, semilla);
  if (!S.participantes) return "sin-participantes";
  // El orden del sorteo define el lugar: el primero que sale gana el 1.er lugar, y así (CONCURSO.premios)
  const ahora = new Date().toISOString(), cupones = S.ganadores.map((g, i) => ({ ...g, lugar: i + 1, pct: CONCURSO.premios[i], cupon: codigoCupon(CONCURSO.premios[i]) }));
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO concurso_sorteos (creado, tipo, semilla, huella, total, participantes, ganadores, lista) VALUES (?, 'oficial', ?, ?, ?, ?, ?, ?)")
        .bind(ahora, semilla, S.huella, S.total, S.participantes, JSON.stringify(cupones.map((g) => ({ id: g.id, mascara: enmascarar(g.email), entradas: g.total, lugar: g.lugar, pct: g.pct }))), JSON.stringify(S.audit)),
      ...cupones.map((g) => env.DB.prepare("INSERT INTO cupones (codigo, email, origen, pct, plan, vence, creado) VALUES (?, ?, 'concurso', ?, ?, ?, ?)").bind(g.cupon, g.email, g.pct, CONCURSO.plan, CONCURSO.vence, ahora)),
    ]);
  } catch (e) {
    return /UNIQUE/i.test(String((e && e.message) || e)) ? "hecho" : "error";
  }
  let avisos = 0;
  if (hayCorreo(env)) for (const g of cupones) { try { if (await enviarCorreo(env, { to: g.email, ...correoGanador(g.cupon, g.lugar, g.pct) })) avisos++; } catch { /* sigue con el siguiente */ } }
  await env.DB.prepare("UPDATE concurso_sorteos SET avisos = ? WHERE tipo = 'oficial'").bind(avisos).run().catch(() => null);
  return `ok:${cupones.length}:${avisos}`;
}
function correoGanador(cupon, lugar, pct) {
  const L = LUGAR_ES[lugar - 1] || `${lugar}.º`;
  const premio = pct >= 100 ? "el primer año del plan anual del Dashboard Financiero, gratis (100 % de descuento)" : `${pct} % de descuento en el primer año del plan anual del Dashboard Financiero`;
  const condiciones = "Vale solo para el primer año del plan anual (desde el segundo año rige el precio normal), es personal (vale para este email), no se cambia por dinero, no se suma a otros descuentos (tampoco al 20 % de los socios de la Cofradía) y vence el 31 de marzo de 2027.";
  const subject = `¡Ganaste el ${L} lugar en el Concurso Comparte Cofrade News!`;
  const como = pct >= 100
    ? `Para activarlo, entra antes del 31 de enero de 2027 a https://${DOMINIO}/socios/canjear, escribe este email y tu código, y confirma con el enlace que te llegará aquí mismo: tu plan anual queda activo por un año, sin pagar nada.`
    : "Para usarlo, responde este correo antes del 31 de enero de 2027 y te indicamos cómo aplicarlo a tu pago.";
  const comoHtml = pct >= 100
    ? `Para activarlo, entra <b>antes del 31 de enero de 2027</b> a <a href="https://${DOMINIO}/socios/canjear" style="color:#0B1F3A">www.cofrad.es/socios/canjear</a>, escribe este email y tu código, y confirma con el enlace que te llegará aquí mismo: tu plan anual queda activo por un año, sin pagar nada.`
    : "Para usarlo, <b>responde este correo antes del 31 de enero de 2027</b> y te indicamos cómo aplicarlo a tu pago.";
  const reserva = "Tu código es personal: solo funciona con este email. No lo compartas.";
  const text = `Hola:\n\n¡Felicitaciones! Saliste sorteado en el ${L} lugar del Concurso «Comparte Cofrade News».\n\nTu premio: ${premio}. Tu código de un solo uso:\n${cupon}\n\n`
    + `${condiciones}\n${reserva}\n${como}\n\nBases: https://${DOMINIO}/bases-concurso\n\nUn cordial saludo,\nEquipo Cofrade News\nwww.cofrad.es · ${CORREO_HOLA}`;
  const html = `<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#0B1F3A;max-width:560px;margin:0 auto;padding:8px 4px">`
    + `<p style="margin:0 0 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9A7B2F">Cofrade News · Concurso</p>`
    + `<p style="margin:0 0 14px">Hola:</p><p style="margin:0 0 14px">¡Felicitaciones! Saliste sorteado en el <b>${L} lugar</b> del <b>Concurso «Comparte Cofrade News»</b>.</p>`
    + `<p style="margin:0 0 8px">Tu premio: <b>${premio}</b>. Tu código de un solo uso:</p>`
    + `<p style="margin:0 0 16px;font:700 22px/1.2 'Courier New',monospace;letter-spacing:.08em">${cupon}</p>`
    + `<p style="margin:0 0 14px">${condiciones}</p>`
    + `<p style="margin:0 0 14px">${reserva}</p><p style="margin:0 0 14px">${comoHtml}</p>`
    + `<p style="margin:22px 0 0">Un cordial saludo,<br><b>Equipo Cofrade News</b><br><a href="https://${DOMINIO}/bases-concurso" style="color:#0B1F3A">Bases del concurso</a> · <a href="mailto:${CORREO_HOLA}" style="color:#0B1F3A">${CORREO_HOLA}</a></p></div>`;
  return { subject, text, html };
}
// TODO (canje en el pago de Mercado Pago, desde el 26-12-2026): crearSuscripcion (modulos/suscripciones.js) todavía no recibe cupones.
// Falta: 1) un campo «cupón» en /socios/fundador que llame a validarCupon con el email y el plan anual; 2) cobrar el primer año con su
// descuento (75, 50 o 25 %; el de 100 % no pasa por Mercado Pago: el plan se activa sin cobro desde el Panel y se cobra desde el segundo año)
// (la suscripción de Mercado Pago cobra siempre el mismo monto: o se cambia el monto después del primer cobro con PUT /preapproval/{id},
// o se cobra el primer año con un pago único y la suscripción parte al año siguiente); 3) sin el 20 % de la Cofradía si hay cupón;
// 4) canjearCupon con la referencia de la suscripción cuando Mercado Pago confirme el primer cobro. Hoy el Panel valida y marca usados.
async function validarCupon(env, codigo, email, plan) {
  const c = normalizarCodigo(codigo);
  if (!RE_CUPON.test(c)) return { ok: false, motivo: "formato" };
  await asegurarTablas(env, "concurso");
  const f = await env.DB.prepare("SELECT codigo, email, pct, plan, vence, usado, reclamado FROM cupones WHERE codigo = ?").bind(c).first();
  if (!f || !c.startsWith(`CN${f.pct}-`)) return { ok: false, motivo: "no existe" };
  const em = String(email || "").trim().toLowerCase();
  if (!em.includes("@") || (em !== f.email && emailCanonico(em) !== f.email)) return { ok: false, motivo: "otro email" };
  if (f.usado) return { ok: false, motivo: "ya usado" };
  if (!f.reclamado && hoyConcurso() > CONCURSO.reclamo) return { ok: false, motivo: "no reclamado a tiempo" };
  if (hoyConcurso() > f.vence) return { ok: false, motivo: "vencido" };
  if (plan !== f.plan) return { ok: false, motivo: "solo plan " + f.plan };
  return { ok: true, codigo: c, pct: f.pct, plan: f.plan, vence: f.vence, combinable: false, monto: Math.round(PLANES_SOCIO[f.plan].monto * (1 - f.pct / 100) / 10) * 10 };
}
async function canjearCupon(env, codigo, ref) {
  const r = await env.DB.prepare("UPDATE cupones SET usado = ?, ref = ? WHERE codigo = ? AND usado IS NULL").bind(new Date().toISOString(), String(ref || "panel").slice(0, 80), codigo).run();
  return !!(r.meta && r.meta.changes);
}
// ---------- canje del 1.er lugar: /socios/canjear (email + código → enlace a la bandeja del ganador → activación) ----------
// Seguro aunque alguien vea el código: sin el email exacto no vale, y sin abrir el correo del ganador no se activa. El enlace
// lleva un token de 32 bytes que se guarda solo como huella SHA-256, vence en 24 horas y sirve una vez.
const CANJE_TOKEN_H = 24, CANJE_ENVIOS_DIA = 3;
// ¿Tiene un plan con Mercado Pago (con el email escrito o su forma canónica)? Entonces el año gratis se aplica a mano al siguiente período
async function socioPagado(env, email) {
  const r = await env.DB.prepare("SELECT email, mp_id FROM usuarios WHERE mp_id IS NOT NULL AND (email = ? OR email = ?)").bind(email, emailCanonico(email)).all().catch(() => ({ results: [] }));
  if ((r.results || []).length) return true;
  const s = await env.DB.prepare("SELECT 1 FROM suscripciones WHERE estado IN ('pendiente', 'activa', 'pausada') AND (email = ? OR email = ?) LIMIT 1").bind(email, emailCanonico(email)).first().catch(() => null);
  return !!s;
}
function paginaCanjeHtml(msg, mal, forma = true, extra = "") {
  const aviso = msg ? `<p class="aviso" role="status" style="color:${mal ? "var(--rojo)" : "var(--verde)"};font-weight:600">${esc(msg)}</p>` : "";
  const form = forma ? `<form class="form-anun" method="post" action="/socios/canjear" style="max-width:34em"><fieldset><legend>Activa tu premio</legend>
<label class="ancho">Email ganador *<input name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"></label>
<label class="ancho">Código *<input name="codigo" required maxlength="40" autocomplete="off" spellcheck="false" placeholder="CN100-XXXXX-XXXXX-XXXXX" style="text-transform:uppercase"></label>
<label class="pub-hp" aria-hidden="true">Página web<input name="pagina_web" tabindex="-1" autocomplete="off"></label></fieldset>
<button class="btn oro" type="submit">Continuar</button></form>` : "";
  const cuerpo = `<section style="border:0;padding-top:30px"><span class="kicker">Concurso Comparte Cofrade News</span><h1 class="titulo-lujo">Activa tu plan anual gratis</h1>
<p class="lede">Para el 1.er lugar del concurso. Escribe tu email ganador y tu código: te enviaremos un enlace a ese email para confirmar que eres tú.</p>${aviso}${extra}${form}
<p class="sub">Tu código es personal: solo funciona con tu email y se usa una vez. ¿Ganaste un descuento? Responde el correo del premio o escríbenos a ${CORREO_HOLA}. <a href="/bases-concurso">Bases del concurso</a>.</p></section>`;
  return html(marco({ titulo: "Activa tu premio · Cofrade News", descripcion: "Activación del premio del Concurso Comparte Cofrade News.", cuerpo, canonica: "/socios/canjear" }), 200,
    { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}
async function paginaCanje(req, env, u) {
  if (!env.DB) return paginaCanjeHtml("El canje no está disponible en este momento. Escríbenos a " + CORREO_HOLA + ".", true, false);
  await asegurarTablas(env, "concurso");
  const ip = req.headers.get("CF-Connecting-IP") || "x";
  if (req.method === "GET") {
    const t = String(u.searchParams.get("t") || "");
    if (!/^[a-f0-9]{64}$/.test(t)) return paginaCanjeHtml("", false);
    // Dos pasos (como el Buzón): abrir el enlace solo muestra el botón; así el antivirus del correo no activa nada solo
    const fila = await env.DB.prepare("SELECT codigo, creado, usado FROM canjes WHERE token = ?").bind(await sha256hex(t)).first();
    if (!fila || fila.usado || Date.now() - Date.parse(fila.creado) > CANJE_TOKEN_H * 3600000) return paginaCanjeHtml("Ese enlace ya se usó o venció. Vuelve a escribir tu email y tu código para recibir uno nuevo.", true);
    return paginaCanjeHtml("", false, false, `<form method="post" action="/socios/canjear"><input type="hidden" name="t" value="${t}"><button class="btn oro" type="submit">Activar mi plan anual</button></form>`);
  }
  if (!ORIGEN_OK(req)) return new Response("No autorizado.", { status: 403 });
  if (!(await bajoLimite(env, "canje:" + ip))) return paginaCanjeHtml("Demasiados intentos. Espera un minuto.", true);
  const cuerpo = await leerCuerpo(req, 2000);
  if (cuerpo === null) return paginaCanjeHtml("Envío demasiado grande.", true);
  const f = new URLSearchParams(cuerpo);
  if (f.get("pagina_web")) return paginaCanjeHtml("Revisa tu email y tu código.", true);
  const ahora = new Date().toISOString(), t = String(f.get("t") || "");
  if (t) {   // paso 2: el enlace del correo
    if (!/^[a-f0-9]{64}$/.test(t)) return paginaCanjeHtml("Ese enlace no es válido.", true);
    const h = await sha256hex(t);
    const fila = await env.DB.prepare("SELECT codigo, email, creado, usado FROM canjes WHERE token = ?").bind(h).first();
    if (!fila || fila.usado || Date.now() - Date.parse(fila.creado) > CANJE_TOKEN_H * 3600000) return paginaCanjeHtml("Ese enlace ya se usó o venció. Vuelve a escribir tu email y tu código para recibir uno nuevo.", true);
    const v = await validarCupon(env, fila.codigo, fila.email, CONCURSO.plan);
    if (!v.ok || v.pct < 100) return paginaCanjeHtml(v.motivo === "ya usado" ? "Este premio ya está activado." : "Este código ya no es válido. Escríbenos a " + CORREO_HOLA + ".", true, false);
    const vence = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    if (await socioPagado(env, fila.email)) return paginaCanjeHtml(`Ya eres socio con un plan de Mercado Pago: escríbenos a ${CORREO_HOLA} desde este email y aplicamos tu año gratis a tu siguiente período anual.`, false, false);
    // Un solo lote (todo o nada): marca el código, crea el plan solo si este pedido lo marcó y si la fila no es de un socio pagado, y anula los enlaces
    let res;
    try {
      res = await env.DB.batch([
        env.DB.prepare("UPDATE cupones SET usado = ?, ref = 'activacion', reclamado = COALESCE(reclamado, ?) WHERE codigo = ? AND usado IS NULL").bind(ahora, ahora, v.codigo),
        env.DB.prepare(`INSERT INTO usuarios (email, creado, ultimo, estado, plan, vence) SELECT ?, ?, ?, 'activo', ?, ? WHERE EXISTS (SELECT 1 FROM cupones WHERE codigo = ? AND usado = ? AND ref = 'activacion')
          ON CONFLICT(email) DO UPDATE SET ultimo = excluded.ultimo, estado = 'activo', plan = excluded.plan, vence = excluded.vence WHERE usuarios.mp_id IS NULL`)
          .bind(fila.email, ahora, ahora, CONCURSO.plan, vence, v.codigo, ahora),
        env.DB.prepare("UPDATE canjes SET usado = COALESCE(usado, ?) WHERE codigo = ?").bind(ahora, v.codigo),
      ]);
    } catch { return paginaCanjeHtml("No pudimos activar tu plan. Intenta de nuevo en unos minutos.", true, false); }
    if (!(res[0].meta && res[0].meta.changes)) return paginaCanjeHtml("Este premio ya está activado.", true, false);
    return paginaCanjeHtml(`¡Listo! Tu plan anual del Dashboard Financiero quedó activo hasta el ${vence.split("-").reverse().join("-")}, sin pagar nada. Terminado ese año, el plan sigue solo si tú lo contratas.`, false, false);
  }
  // paso 1: email + código → enlace a la bandeja del ganador (el mismo mensaje si no calzan: no revela qué falló)
  const email = String(f.get("email") || "").trim().toLowerCase().slice(0, 120);
  const v = await validarCupon(env, f.get("codigo"), email, CONCURSO.plan);
  if (!v.ok) {
    if (v.motivo === "ya usado") return paginaCanjeHtml("Ese premio ya está activado.", true);
    if (v.motivo === "vencido" || v.motivo === "no reclamado a tiempo") return paginaCanjeHtml("El plazo para activar este premio terminó.", true);
    return paginaCanjeHtml("El email y el código no coinciden con ningún premio. Revisa que sea el email con que participaste.", true);
  }
  if (v.pct < 100) return paginaCanjeHtml(`Tu premio es un ${v.pct} % de descuento en el primer año del plan anual: responde el correo del premio o escríbenos a ${CORREO_HOLA} desde tu email ganador y lo aplicamos a tu pago.`, false, false);
  if (await socioPagado(env, email))
    return paginaCanjeHtml(`Ya eres socio con un plan pagado: escríbenos a ${CORREO_HOLA} desde este email y aplicamos tu año gratis a tu siguiente período anual.`, false, false);
  const hoy = new Date(Date.now() - 86400000).toISOString();
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM canjes WHERE codigo = ? AND creado > ?").bind(v.codigo, hoy).first();
  if (n && n.n >= CANJE_ENVIOS_DIA) return paginaCanjeHtml("Ya te enviamos el enlace varias veces hoy: revisa tu bandeja, spam o promociones.", true, false);
  if (!hayCorreo(env)) return paginaCanjeHtml(`No podemos enviar el correo en este momento. Escríbenos a ${CORREO_HOLA}.`, true, false);
  const tok = hexDif(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([env.DB.prepare("INSERT INTO canjes (token, codigo, email, creado) VALUES (?, ?, ?, ?)").bind(await sha256hex(tok), v.codigo, email, ahora),
    env.DB.prepare("UPDATE cupones SET reclamado = COALESCE(reclamado, ?) WHERE codigo = ?").bind(ahora, v.codigo)]);   // pedir el enlace a tiempo cuenta como reclamo
  const enlace = `https://${DOMINIO}/socios/canjear?t=${tok}`;
  const text = `Hola:\n\nPara activar tu plan anual gratis del Dashboard Financiero (1.er lugar del Concurso «Comparte Cofrade News»), abre este enlace y toca «Activar mi plan anual»:\n${enlace}\n\nEl enlace vence en ${CANJE_TOKEN_H} horas y sirve una vez. Si no fuiste tú, ignora este correo: sin este enlace nadie puede activar tu premio.\n\nUn cordial saludo,\nEquipo Cofrade News\nwww.cofrad.es · ${CORREO_HOLA}`;
  const htmlC = `<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#0B1F3A;max-width:560px;margin:0 auto;padding:8px 4px"><p style="margin:0 0 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9A7B2F">Cofrade News · Concurso</p>`
    + `<p style="margin:0 0 14px">Hola:</p><p style="margin:0 0 14px">Para activar tu <b>plan anual gratis</b> del Dashboard Financiero (1.er lugar del Concurso «Comparte Cofrade News»), toca el botón:</p>`
    + `<p style="margin:0 0 18px"><a href="${enlace}" style="display:inline-block;background:#C9A227;color:#0B1F3A;font:700 16px/1 Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:999px">Activar mi plan anual</a></p>`
    + `<p style="margin:0 0 14px;font:13px/1.5 Arial,sans-serif;color:#5A6577">El enlace vence en ${CANJE_TOKEN_H} horas y sirve una vez. Si no fuiste tú, ignora este correo: sin este enlace nadie puede activar tu premio.</p>`
    + `<p style="margin:22px 0 0">Un cordial saludo,<br><b>Equipo Cofrade News</b></p></div>`;
  const ok = await enviarCorreo(env, { to: email, subject: "Activa tu plan anual gratis · Cofrade News", text, html: htmlC }).catch(() => false);
  if (!ok) return paginaCanjeHtml(`No pudimos enviar el correo. Intenta de nuevo en unos minutos o escríbenos a ${CORREO_HOLA}.`, true);
  return paginaCanjeHtml("Te enviamos un enlace a tu email ganador. Ábrelo y toca «Activar mi plan anual» (revisa también spam o promociones).", false, false);
}
// D1 entrega un BLOB como ArrayBuffer o como lista de números según la versión: aquí se aceptan las dos
function bytesDe(x) {
  if (!x) return null;
  if (typeof x === "string") { try { const t = atob(x), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; } catch { return null; } }
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  return Array.isArray(x) ? Uint8Array.from(x) : null;
}
async function capturaConcurso(req, env, id) {
  if (!(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!env.DB) return new Response("", { status: 404 });
  await asegurarTablas(env, "concurso");
  const f = await env.DB.prepare("SELECT datos FROM concurso_capturas WHERE id = ?").bind(id).first();
  const b = f && bytesDe(f.datos);
  if (!b) return new Response("La captura ya no existe.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(b, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Content-Security-Policy": "default-src 'none'", ...SEGURIDAD } });
}
async function accionConcurso(req, env) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const volver = (codigo) => new Response(null, { status: 303, headers: { Location: `/panel?cc=${encodeURIComponent(codigo)}#concurso`, "Cache-Control": "no-store" } });
  if (!env.DB) return volver("sin-base");
  const cuerpo = await leerCuerpo(req, 4000);
  if (cuerpo === null) return volver("error:muy-grande");
  const f = new URLSearchParams(cuerpo), accion = String(f.get("accion") || ""), id = Math.floor(Number(f.get("id") || 0));
  await asegurarTablas(env, "concurso");
  if (accion === "aceptar" || accion === "rechazar") {
    const r = await env.DB.prepare("UPDATE concurso_capturas SET estado = ?, revisado = ? WHERE id = ? AND datos IS NOT NULL").bind(accion === "aceptar" ? "aceptada" : "rechazada", new Date().toISOString(), id).run();
    return volver(r.meta && r.meta.changes ? accion : "error:no-existe");
  }
  if (accion === "sortear") {
    if (f.get("revisado") !== "si") return volver("error:confirmar");
    return volver(await sortearOficial(env));
  }
  if (accion === "cupon-usado") return volver((await canjearCupon(env, String(f.get("codigo") || "").toUpperCase(), "panel")) ? "cupon-usado" : "error:cupon");
  if (accion === "cupon-reclamado") {
    const r = await env.DB.prepare("UPDATE cupones SET reclamado = ? WHERE codigo = ? AND reclamado IS NULL").bind(new Date().toISOString(), String(f.get("codigo") || "").toUpperCase()).run();
    return volver(r.meta && r.meta.changes ? "cupon-reclamado" : "error:cupon");
  }
  const email = String(f.get("email") || "").trim().toLowerCase().slice(0, 120);
  if (accion === "excluir" || accion === "reincorporar") {
    const r = await env.DB.prepare("UPDATE concurso_participantes SET estado = ? WHERE email = ?").bind(accion === "excluir" ? "excluido" : "activo", email).run();
    return volver(r.meta && r.meta.changes ? accion : "error:no-existe");
  }
  if (accion === "borrar-datos") {   // derecho de supresión (Ley 21.719): inscripción, capturas, correos y visitas de su enlace
    if (f.get("confirmo") !== "si") return volver("error:confirmar-borrado");
    const q = await env.DB.prepare("SELECT codigo FROM concurso_participantes WHERE email = ?").bind(emailCanonico(email)).first();
    if (!q) return volver("error:no-existe");
    const e2 = emailCanonico(email);
    await asegurarTablas(env, "difusion");
    await env.DB.batch([env.DB.prepare("DELETE FROM concurso_capturas WHERE email = ?").bind(e2), env.DB.prepare("DELETE FROM concurso_envios WHERE email = ?").bind(e2),
      env.DB.prepare("DELETE FROM referidos_unicos WHERE codigo = ?").bind(q.codigo), env.DB.prepare("DELETE FROM referidos WHERE codigo = ?").bind(q.codigo),
      env.DB.prepare("DELETE FROM concurso_participantes WHERE email = ?").bind(e2)]);
    return volver("borrado");
  }
  return volver("error:accion");
}
// JSON solo para el Panel: vista previa del sorteo (no vale; con «semilla» se repite exacta) y el registro del sorteo oficial
async function concursoJson(req, env, u, que) {
  if (!(await esAdmin(req, env))) return jsonR({ ok: false, error: "No autorizado." }, 403);
  if (!env.DB) return jsonR({ ok: false, error: "Sin base." }, 503);
  await asegurarTablas(env, "concurso");
  if (que === "cupon") return jsonR(await validarCupon(env, u.searchParams.get("codigo"), u.searchParams.get("email"), u.searchParams.get("plan") || "anual"));
  if (que === "sorteo") {
    const s = await env.DB.prepare("SELECT * FROM concurso_sorteos WHERE tipo = 'oficial'").first();
    const c = s ? (await env.DB.prepare("SELECT codigo, email, pct, plan, vence, usado FROM cupones WHERE origen = 'concurso' ORDER BY creado, pct DESC, codigo").all()).results || [] : [];
    return jsonR({ ok: true, sorteo: s ? { ...s, ganadores: JSON.parse(s.ganadores), lista: JSON.parse(s.lista) } : null, cupones: c });
  }
  const q = String(u.searchParams.get("semilla") || ""), semilla = /^[\w-]{1,64}$/.test(q) ? q : hexDif(crypto.getRandomValues(new Uint8Array(32)));
  const lista = await entradasConcurso(env, true), S = await prepararSorteo(lista, semilla);
  return jsonR({ ok: true, vista_previa: true, semilla, huella: S.huella, total: S.total, participantes: S.participantes, audit: S.audit,
    ganadores: S.ganadores.map((g, i) => ({ id: g.id, email: g.email, mascara: enmascarar(g.email), entradas: g.total, lugar: i + 1, pct: CONCURSO.premios[i] })) });
}

// ---------- página de bases (español e inglés; el botón EN cambia de bloque) ----------
const BASES = {
  es: [
    ["Organizador", "El concurso «Comparte Cofrade News» (el «Concurso») lo organiza Destak (el «Organizador»), a cargo del boletín Cofrade News que se publica en www.cofrad.es. Contacto: hola@cofrad.es."],
    ["Vigencia", "Desde el 20 de noviembre de 2026 hasta el 24 de diciembre de 2026 a las 23:59 (hora de Santiago de Chile). Las participaciones fuera de ese período no cuentan."],
    ["Quiénes pueden participar", "Personas naturales de 18 años o más que vivan en Chile. Una sola inscripción por persona y por email. No se necesita comprar ni pagar nada para participar. No pueden participar los trabajadores del Organizador ni sus familiares directos."],
    ["Cómo participar", "1) Abre el Buzón de www.cofrad.es y elige «Participar en el concurso». 2) Marca que tienes 18 años o más, que vives en Chile y que aceptas estas bases. 3) Escribe tu email y confírmalo con el enlace que te enviamos desde hola@cofrad.es: las participaciones cuentan solo con el email confirmado. 4) Al inscribirte, tu email queda unido a tu enlace personal para compartir, el que crea en tu navegador el botón «Compartir» de www.cofrad.es (lleva tu código personal, por ejemplo www.cofrad.es/?r=abcd1234). Inscríbete desde el mismo navegador con el que compartes. Si cambias de navegador o borras sus datos, escríbenos a hola@cofrad.es."],
    ["Participaciones", "a) Por enlace: cada persona distinta que abre tu enlace personal en su navegador en un día suma 1 participación, con un máximo de 10 por día y de 2 por conexión a internet. Cuentan las aperturas entre el 20 de noviembre y el 24 de diciembre de 2026, también las de antes de confirmar tu email. No cuentan los robots, las vistas previas automáticas de las aplicaciones de mensajería ni los enlaces escondidos en imágenes o marcos de otras páginas. b) Por captura: después de confirmar tu email, puedes subir en el Buzón, desde el mismo navegador, una captura de pantalla que muestre que compartiste Cofrade News. Cada captura aceptada suma 1 participación, con un máximo de 1 por día. Se rechazan las imágenes idénticas a otra ya enviada. El equipo del Organizador revisa cada captura. c) Antes de subir una captura, tapa los nombres, números de teléfono y fotos de otras personas."],
    ["Premios", `${N_PREMIOS} ganadores, con un premio cada uno en el plan anual del Dashboard Financiero de Cofrade News: ${PREMIOS_ES}. Los premios valen solo para el primer año del plan anual. {SALDOS} Cada premio se entrega como un código personal de un solo uso, que solo vale junto con el email ganador: aunque otra persona lo vea, no puede usarlo. El 1.er lugar activa su premio en www.cofrad.es/socios/canjear, escribiendo su email y su código y confirmando con el enlace que le enviamos a ese email; su plan anual queda activo por un año, sin pagar nada. Los demás lugares canjean su descuento coordinando con hola@cofrad.es desde el email ganador, a más tardar el 31 de marzo de 2027. Si ya eres socio del plan mensual, se aplica al pasarte al plan anual; si ya pagaste tu plan anual, se aplica a tu siguiente período anual, aunque empiece después de esa fecha. Terminado el año del premio, el plan sigue solo si tú lo contratas, al precio normal vigente. El código es personal (vale solo para el email ganador), no se transfiere, no se cambia por dinero y no se suma a otros descuentos, incluido el 20 % de los socios de la Cofradía.`],
    ["Sorteo", "El 26 de diciembre de 2026, a más tardar a las 18:00 (hora de Santiago de Chile), el sistema de www.cofrad.es sortea a los 5 ganadores entre las personas con email confirmado y al menos 1 participación. Antes del sorteo, el Organizador revisa las capturas y puede excluir participaciones según la cláusula de exclusiones. Cada participación es una chance: quien tiene más participaciones tiene más probabilidades de ganar. Cada persona gana como máximo un premio (5 ganadores distintos). El orden en que salen sorteados define el lugar: el primero que sale gana el 1.er lugar, el segundo el 2.º lugar, y así hasta el 5.º. Si hay menos personas con participaciones que premios, los premios se asignan desde el 1.er lugar y los que sobran quedan desiertos. El sistema guarda un registro de auditoría con la huella digital (SHA-256) de la lista ordenada de participaciones, la semilla aleatoria y los ganadores."],
    ["Aviso y resultados", "Avisamos a los ganadores por email y publicamos los resultados en esta página, con el lugar de cada ganador y su email parcialmente oculto. Los ganadores pueden reclamar su premio hasta el 31 de enero de 2027: el 1.er lugar, activándolo en www.cofrad.es/socios/canjear; los demás, respondiendo el correo o escribiendo a hola@cofrad.es. Si un premio no se reclama en ese plazo, queda desierto y el código se anula. El Organizador puede pedir a los ganadores que acrediten su edad y su residencia en Chile antes de entregar el premio."],
    ["Datos personales", "Responsable: Destak EIRL. Finalidad: administrar el concurso (inscripción, conteo de participaciones, sorteo, aviso a los ganadores y entrega de premios). Datos que tratamos: tu email, tu código de enlace, la cantidad de personas que abren tu enlace (guardadas como huellas seudónimas que cambian cada día, sin guardar direcciones IP), una huella diaria de tu conexión para frenar abusos y las capturas que subas. Las capturas son privadas: nunca se publican, solo las ve el equipo que las revisa y se borran 30 días después del sorteo. Los datos de los participantes se borran una vez entregados los premios (los de quienes no ganaron, el 1 de febrero de 2027; los de los ganadores, cuando usen su cupón o este venza), salvo que la persona se suscriba a nuestros servicios. Cloudflare (sitio y base de datos) y Resend (envío de correos) tratan estos datos por encargo del Organizador, con servidores fuera de Chile. Puedes pedir acceso, rectificación, supresión, oposición, portabilidad o bloqueo escribiendo a hola@cofrad.es. Tratamos los datos conforme a la Ley 19.628 y a la Ley 21.719 sobre protección de datos personales."],
    ["Exclusiones", "El Organizador puede anular las participaciones obtenidas con métodos automatizados, visitas falsas, capturas ajenas o adulteradas, o datos falsos."],
    ["Información legal", "Estas bases se informan aquí conforme a los artículos 35 y 36 de la Ley 19.496 sobre Protección de los Derechos de los Consumidores: duración del concurso, número de premios, plazo para reclamarlos y publicación de los resultados. Participar implica aceptar estas bases. Cambio del 20 de noviembre de 2026: se mejoraron los premios (antes, 5 cupones de 25 % de descuento); el cambio no perjudica a nadie que ya participe."],
  ],
  en: [
    ["Organizer", "The “Share Cofrade News” contest (the “Contest”) is organized by Destak (the “Organizer”), which runs the Cofrade News newsletter published at www.cofrad.es. Contact: hola@cofrad.es."],
    ["Period", "From November 20, 2026 until December 24, 2026 at 23:59 (Santiago, Chile time). Entries outside this period do not count."],
    ["Who can enter", "Individuals aged 18 or older who live in Chile. One sign-up per person and per email. No purchase or payment of any kind is needed to take part. Employees of the Organizer and their immediate family cannot take part."],
    ["How to enter", "1) Open the Suggestions box at www.cofrad.es and choose “Enter the contest”. 2) Confirm that you are 18 or older, that you live in Chile and that you accept these rules. 3) Enter your email and confirm it with the link we send you from hola@cofrad.es: entries only count once your email is confirmed. 4) When you sign up, your email is linked to your personal sharing link, the one the “Share” button on www.cofrad.es creates in your browser (it carries your personal code, for example www.cofrad.es/?r=abcd1234). Sign up from the same browser you share from. If you change browsers or clear its data, write to hola@cofrad.es."],
    ["Entries", "a) Link: each different person who opens your personal link in their browser on a given day adds 1 entry, up to 10 per day and 2 per internet connection. Visits between November 20 and December 24, 2026 count, including those before you confirm your email. Robots, automatic link previews from messaging apps and links hidden in images or frames of other pages do not count. b) Screenshot: after confirming your email, you can upload in the Suggestions box, from the same browser, a screenshot showing that you shared Cofrade News. Each accepted screenshot adds 1 entry, up to 1 per day. Images identical to one already sent are rejected. The Organizer's team reviews every screenshot. c) Before uploading a screenshot, cover other people's names, phone numbers and photos."],
    ["Prizes", `${N_PREMIOS} winners, each with one prize on the annual plan of the Cofrade News Financial Dashboard: ${PREMIOS_EN}. The prizes are valid only for the first year of the annual plan. {SALDOS} Each prize is delivered as a personal single-use code that only works together with the winning email: even if someone else sees it, they cannot use it. The 1st place winner activates the prize at www.cofrad.es/socios/canjear by entering their email and code and confirming with the link we send to that email; the annual plan becomes active for one year, at no cost. The other places redeem their discount by arranging it with hola@cofrad.es from the winning email, no later than March 31, 2027. If you are already on the monthly plan, it applies when you switch to the annual plan; if you already paid your annual plan, it applies to your next annual period, even if it starts after that date. When the prize year ends, the plan continues only if you choose to subscribe, at the regular price in force. The code is personal (valid only for the winning email), cannot be transferred, exchanged for cash or combined with other discounts, including the 20% discount for members of the Cofradía.`],
    ["Draw", "On December 26, 2026, no later than 18:00 (Santiago, Chile time), the www.cofrad.es system draws the 5 winners among the people with a confirmed email and at least 1 entry. Before the draw, the Organizer reviews the screenshots and may cancel entries under the exclusions clause. Each entry is one chance: the more entries, the higher the probability of winning. Each person can win only one prize (5 different winners). The order of the draw sets the place: the first person drawn wins 1st place, the second wins 2nd place, and so on up to 5th. If fewer people have entries than there are prizes, prizes are assigned from 1st place down and the rest are void. The system keeps an audit record with the digital fingerprint (SHA-256) of the ordered list of entries, the random seed and the winners."],
    ["Notice and results", "We notify the winners by email and publish the results on this page, with each winner's place and their email partly hidden. Winners can claim their prize until January 31, 2027: 1st place by activating it at www.cofrad.es/socios/canjear; the others by replying to the email or writing to hola@cofrad.es. Prizes not claimed within that period are void and the code is cancelled. The Organizer may ask the winners to prove their age and residence in Chile before delivering the prize."],
    ["Personal data", "Controller: Destak EIRL. Purpose: running the contest (sign-up, counting entries, the draw, notifying the winners and delivering the prizes). Data we process: your email, your link code, the number of people who open your link (stored as pseudonymous daily fingerprints, without storing IP addresses), a daily fingerprint of your connection to curb abuse and the screenshots you upload. Screenshots are private: they are never published, only the reviewing team sees them, and they are deleted 30 days after the draw. Participants' data is deleted once the prizes are delivered (non-winners' data on February 1, 2027; winners' data when they use their coupon or it expires), unless the person subscribes to our services. Cloudflare (website and database) and Resend (email delivery) process this data on behalf of the Organizer, on servers outside Chile. You can request access, correction, deletion, objection, portability or blocking by writing to hola@cofrad.es. We process data under Chilean Law 19,628 and Law 21,719 on personal data protection."],
    ["Exclusions", "The Organizer may cancel entries obtained through automated methods, fake visits, someone else's or altered screenshots, or false data."],
    ["Legal information", "These rules are published here in accordance with articles 35 and 36 of Chilean Law 19,496 on Consumer Protection: duration of the contest, number of prizes, period to claim them and publication of the results. Taking part implies accepting these rules. Change of November 20, 2026: the prizes were improved (previously, 5 coupons for 25% off); the change does not harm anyone already taking part."],
  ],
};
async function paginaBases(env) {
  let res = null;
  if (env.DB) {
    try { await asegurarTablas(env, "concurso"); res = await env.DB.prepare("SELECT creado, huella, semilla, total, participantes, ganadores FROM concurso_sorteos WHERE tipo = 'oficial'").first(); } catch { res = null; }
  }
  const lista = (l, en) => `<ol class="bases-l">${l.map(([t, x]) => `<li><b>${esc(t)}.</b> ${esc(x.replace("{SALDOS}", saldosPremios(en)))}</li>`).join("")}</ol>`;
  let ganadores = [];
  try { ganadores = res ? JSON.parse(res.ganadores) : []; } catch { ganadores = []; }
  const cuando = res ? new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(res.creado)) : "";
  const resultados = (en) => res ? `<section id="resultados" class="bases-res"><h2>${en ? "Results of the draw" : "Resultados del sorteo"}</h2>
<p>${en ? "Draw held on" : "Sorteo realizado el"} ${esc(cuando)} · ${num(res.participantes, 0)} ${en ? "people with entries" : "personas con participaciones"} · ${num(res.total, 0)} ${en ? "entries" : "participaciones"}.</p>
<ol>${ganadores.map((g) => `<li>${esc(g.mascara)}${g.pct ? ` · ${esc(premioDe(g.pct, en))}` : ""}</li>`).join("")}</ol>
<p class="sub">${en ? "Fingerprint (SHA-256) of the ordered list" : "Huella (SHA-256) de la lista ordenada"}: <code>${esc(res.huella)}</code><br>${en ? "Random seed" : "Semilla aleatoria"}: <code>${esc(res.semilla)}</code></p></section>` : "";
  const etapa = etapaConcurso();
  const accion = (en) => etapa === "abierto" ? `<div class="acciones"><button type="button" class="btn oro concurso-abrir">${en ? "Enter the contest" : "Participar en el concurso"}</button></div>` : "";
  const cuerpo = `<style>.bases-l{padding-left:1.3em;max-width:46em}.bases-l li{margin:0 0 14px;line-height:1.6}.bases-res{border:1.5px solid var(--oro);border-radius:16px;padding:18px 20px;margin:20px 0}
.bases-res code{word-break:break-all;font-size:12.5px}html[lang=en] .b-es{display:none}html:not([lang=en]) .b-en{display:none}</style>
<div class="b-es" data-no-tr><section style="border:0;padding-top:30px"><span class="kicker">Bases del concurso</span><h1 class="titulo-lujo">Concurso «Comparte Cofrade News»</h1>
<p class="lede">Comparte Cofrade News y participa por ${N_PREMIOS} premios ${TXT_PLAN_ES}: ${PREMIOS_ES}. Del 20 de noviembre al 24 de diciembre de 2026.</p>${accion(false)}
${resultados(false)}${lista(BASES.es, false)}<p class="sub">Última actualización: 20 de noviembre de 2026.</p></section></div>
<div class="b-en" lang="en" data-no-tr><section style="border:0;padding-top:30px"><span class="kicker">Contest rules</span><h1 class="titulo-lujo">“Share Cofrade News” contest</h1>
<p class="lede">Share Cofrade News and win one of ${N_PREMIOS} prizes ${TXT_PLAN_EN}: ${PREMIOS_EN}. From November 20 to December 24, 2026.</p>${accion(true)}
${resultados(true)}${lista(BASES.en, true)}<p class="sub">Last updated: November 20, 2026.</p></section></div>`;
  return html(marco({ titulo: "Bases del Concurso «Comparte Cofrade News» · Cofrade News", descripcion: "Bases del Concurso «Comparte Cofrade News»: fechas, cómo participar, premios, sorteo y datos personales.", cuerpo, canonica: "/bases-concurso" }), 200,
    { "Cache-Control": "public, max-age=300" });
}

// =====================================================================================================================
// 4. PANEL: «Difusión y menciones» y «Concurso» (dentro de /panel, con la misma clave PANEL_CLAVE)
// =====================================================================================================================
async function lotePanel(env, L) {
  const claves = Object.keys(L), R = {};
  try {
    const res = await env.DB.batch(claves.map((k) => L[k]));
    claves.forEach((k, i) => { R[k] = (res[i] && res[i].results) || []; });
  } catch {
    const res = await Promise.all(claves.map((k) => L[k].all().then((r) => r.results || []).catch(() => [])));
    claves.forEach((k, i) => { R[k] = res[i]; });
    R.parcial = true;
  }
  return R;
}
const MENSAJES_PANEL = {
  agregada: "Mención agregada.", confirmar: "Mención confirmada.", descartar: "Mención descartada.", pendiente: "La mención volvió a «por confirmar».",
  "error:fecha": "Revisa la fecha (no puede ser futura).", "error:medio": "Elige el medio.", "error:quien": "Escribe el programa, la cuenta o la persona.",
  "error:enlace": "El enlace no es válido (debe empezar con https:// o http://).", "error:propio": "Ese enlace es de cofrad.es: no es una mención.",
  "error:alcance": "El alcance debe ser un número entero.", "error:repetida": "Esa mención ya estaba registrada (mismo enlace).", "error:no-existe": "Ese registro ya no existe.",
  "error:rss": "Una de las direcciones RSS no es válida (solo https, sin claves ni contraseñas).", "error:rss-tope": "Máximo 5 direcciones RSS.",
  aceptar: "Captura aceptada: suma 1 participación.", rechazar: "Captura rechazada.", antes: "El sorteo oficial se habilita el 26-12-2026.", hecho: "El sorteo oficial ya se hizo.",
  "sin-participantes": "No hay personas con participaciones: no se sorteó.", "error:confirmar": "Marca la casilla de confirmación antes de sortear.", error: "No se pudo completar. Intenta de nuevo.",
  "cupon-usado": "Cupón marcado como usado.", "error:cupon": "Ese cupón no existe, ya estaba usado o ya estaba marcado.", "cupon-reclamado": "Cupón marcado como reclamado: sigue válido hasta su vencimiento.",
  excluir: "Participante excluido: no entra al sorteo.", reincorporar: "Participante reincorporado.", borrado: "Datos del participante borrados (inscripción, capturas, correos y visitas de su enlace).",
  "error:confirmar-borrado": "Marca la casilla para confirmar el borrado.", "error:accion": "Acción desconocida.", "error:muy-grande": "Envío demasiado grande.",
};
function mensajePanel(c) {
  if (!c) return "";
  let t = MENSAJES_PANEL[c];
  if (!t && /^barrido:\d+$/.test(c)) t = `Búsqueda hecha: ${c.split(":")[1]} menciones nuevas por confirmar.`;
  if (!t && /^rss:\d+$/.test(c)) t = `Direcciones RSS guardadas: ${c.split(":")[1]}.`;
  if (!t && /^ok:\d+:\d+$/.test(c)) { const [, n, a] = c.split(":"); t = `Sorteo oficial hecho: ${n} ganadores y ${a} correos enviados.`; }
  return t ? `<p class="aviso" role="status" style="color:${c.startsWith("error") ? "var(--rojo)" : "var(--verde)"};font-weight:600">${esc(t)}</p>` : "";
}
const horaCL = (iso) => { try { return new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); } catch { return ""; } };
async function seccionDifusion(env, u) {
  await asegurarTablas(env, "difusion");
  await asegurarTablas(env, "concurso");
  const hoy = fechaChile(), d30 = masDias(hoy, -29), s = (q, ...b) => env.DB.prepare(q).bind(...b);
  const R = await lotePanel(env, {
    canal: s("SELECT canal, SUM(n) AS n FROM compartidos WHERE fecha >= ? GROUP BY canal ORDER BY n DESC", d30),
    cmpTot: env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n, MIN(fecha) AS desde FROM compartidos"),
    refDia: s("SELECT fecha, SUM(n) AS n FROM referidos WHERE fecha >= ? GROUP BY fecha", d30),
    uniDia: s("SELECT fecha, COUNT(*) AS u FROM referidos_unicos WHERE fecha >= ? GROUP BY fecha", d30),
    refTot: env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n, COUNT(DISTINCT codigo) AS c, MIN(fecha) AS desde FROM referidos"),
    top: s(`SELECT r.codigo AS codigo, SUM(r.n) AS n, (SELECT COUNT(*) FROM referidos_unicos x WHERE x.codigo = r.codigo AND x.fecha >= ?) AS u,
      (SELECT p.email FROM concurso_participantes p WHERE p.codigo = r.codigo) AS email FROM referidos r WHERE r.fecha >= ? GROUP BY r.codigo ORDER BY n DESC LIMIT 10`, d30, d30),
    sitios: s("SELECT host, SUM(n) AS n FROM referentes WHERE fecha >= ? GROUP BY host ORDER BY n DESC LIMIT 12", d30),
    org: s("SELECT origen, SUM(n) AS n FROM dimensiones WHERE fecha >= ? GROUP BY origen ORDER BY n DESC", d30),
    men: env.DB.prepare("SELECT id, fecha, medio, programa, persona, enlace, alcance, origen, estado, nota, titulo, fuente, creado FROM menciones ORDER BY CASE estado WHEN 'por confirmar' THEN 0 WHEN 'confirmada' THEN 1 ELSE 2 END, COALESCE(fecha, substr(creado, 1, 10)) DESC, id DESC LIMIT 150"),
    menTot: env.DB.prepare("SELECT estado, COUNT(*) AS n, COALESCE(SUM(alcance), 0) AS a FROM menciones GROUP BY estado"),
    medio: env.DB.prepare("SELECT medio, COUNT(*) AS n, COALESCE(SUM(alcance), 0) AS a FROM menciones WHERE estado = 'confirmada' GROUP BY medio ORDER BY n DESC"),
    mes: env.DB.prepare("SELECT substr(COALESCE(fecha, creado), 1, 7) AS mes, COUNT(*) AS n FROM menciones WHERE estado = 'confirmada' GROUP BY mes ORDER BY mes DESC LIMIT 12"),
    cfg: env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('menciones_estado', 'menciones_rss', 'menciones_reglas', 'menciones_robots')"),
  });
  const sum = (filas, k = "n") => filas.reduce((a, x) => a + Number(x[k] || 0), 0);
  const cmp30 = sum(R.canal), ref30 = sum(R.refDia), uni30 = sum(R.uniDia, "u"), tot = (R.menTot || []).reduce((o, x) => ({ ...o, [x.estado]: x }), {});
  const conf = tot.confirmada || { n: 0, a: 0 }, pend = (tot["por confirmar"] || { n: 0 }).n, cmpT = (R.cmpTot[0] || {}), refT = (R.refTot[0] || {});
  const kpis = [
    kpiA("Veces que tocaron «Compartir»", num(cmp30, 0), `últimos 30 días · ${num(cmpT.n || 0, 0)} en total`, "Cuántas veces los lectores eligieron una forma de compartir (WhatsApp, correo, copiar enlace, el menú del teléfono…). No es lo mismo que cuántos lo recibieron."),
    kpiA("Visitas por enlaces compartidos", num(ref30, 0), `últimos 30 días · ${num(refT.n || 0, 0)} en total`, "Aperturas de la portada o de una edición que llegaron con el código personal de un lector (?r=…). Robots y vistas previas no cuentan."),
    kpiA("Personas que llegaron por un enlace", num(uni30, 0), "distintas por día, sumadas en 30 días", "Personas distintas por día que abrieron un enlace compartido (huella anónima del día, sin IP)."),
    kpiA("Lectores que comparten", num(refT.c || 0, 0), "códigos con al menos una visita", "Cuántos enlaces personales distintos trajeron al menos una visita desde que existe el botón."),
    kpiA("Menciones confirmadas", num(conf.n, 0), `${num(pend, 0)} por confirmar`, "Menciones de Cofrade News en medios, redes, radio, TV o podcasts que confirmaste (manuales o encontradas por el recolector)."),
    kpiA("Alcance estimado", num(conf.a, 0), "suma de las confirmadas", "Suma del alcance estimado (personas) que anotaste en las menciones confirmadas."),
  ].join("");
  const serie = [];
  const uniD = Object.fromEntries((R.uniDia || []).map((x) => [x.fecha, Number(x.u || 0)])), refD = Object.fromEntries((R.refDia || []).map((x) => [x.fecha, Number(x.n || 0)]));
  for (let f = d30; f <= hoy; f = masDias(f, 1)) if (refD[f]) serie.push([ddmm(f).slice(0, 5), refD[f], `${uniD[f] || 0} personas`]);
  const top = (R.top || []).map((x) => `<tr><td><code>${esc(x.codigo)}</code></td><td>${num(x.n, 0)}</td><td>${num(x.u, 0)}</td><td>${x.email ? esc(x.email) : '<span class="m">sin inscripción</span>'}</td></tr>`).join("");
  const cfg = Object.fromEntries((R.cfg || []).map((x) => [x.clave, x.valor]));
  const est = jsonDe(cfg.menciones_estado, {}), rss = listaRss(cfg.menciones_rss), robots = jsonDe(cfg.menciones_robots, {});
  const reglas = (jsonDe(cfg.menciones_reglas, {}) || {}).r || REGLAS_DEFECTO, ult = est.ultima || {};
  const nomF = { google: "Google Noticias", itunes: "Apple Podcasts", gdelt: "GDELT" };
  const fuentesTxt = Object.entries(ult.fuentes || {}).map(([k, n]) => `${nomF[k] || (k.startsWith("alerta") ? "Alerta RSS " + k.slice(6) : k)}: ${n === "error" ? "sin respuesta" : n === "bloqueado" ? "bloqueado por sus reglas (robots.txt)" : num(n, 0)}`).join(" · ");
  const enCurso = est.ronda && (est.ronda.pendientes || []).length ? ` Ronda en curso: faltan ${est.ronda.pendientes.length} fuentes (avanza con las visitas a la portada).` : "";
  const yt = (reglas.redes || REDES_DEFECTO).youtube || REDES_DEFECTO.youtube;
  const ytTxt = !env.YOUTUBE_API_KEY ? "YouTube: falta el secreto YOUTUBE_API_KEY (sin él no se busca)." : !yt.activo ? "YouTube: apagado en reglas-redes.json."
    : `YouTube: activo, hasta ${yt.busquedas_dia} búsquedas al día (una cada ${Math.ceil(1440 / yt.busquedas_dia)} minutos como mínimo)${est.youtube ? " · última " + horaCL(est.youtube.hora) + (est.youtube.n === "error" ? " sin respuesta" : ", " + est.youtube.n + " resultados") : ""}.`;
  const redesTxt = Object.entries(reglas.redes || {}).filter(([k]) => k !== "youtube").map(([k, a]) => `${k}: ${a.activo ? "activo" : "apagado"}${(reglas.notas || {})[k] ? " (" + reglas.notas[k] + ")" : ""}`).join(" · ");
  const rssEstado = rss.map((x) => { const r = robots[x]; return `<li><code>${esc(hostDe(x))}</code> · ${!r ? "aún sin revisar" : r.ok ? "permitido por su robots.txt" : "<b>bloqueado por sus reglas</b> (robots.txt): no se lee"}</li>`; }).join("");
  const fila = (m) => {
    const acc = (a, t) => `<form method="post" action="/panel/menciones" style="display:inline"><input type="hidden" name="accion" value="${a}"><input type="hidden" name="id" value="${m.id}"><button class="btn linea chico" type="submit">${t}</button></form>`;
    const enl = m.enlace ? `<a href="${esc(m.enlace)}" target="_blank" rel="noopener noreferrer nofollow">${esc(hostDe(m.enlace) || "abrir")}</a>` : "—";
    return `<tr class="men-${m.estado === "por confirmar" ? "pend" : m.estado === "confirmada" ? "ok" : "desc"}"><td>${m.fecha ? ddmm(m.fecha) : "—"}</td><td>${esc(m.medio)}</td><td>${esc(m.programa || "—")}${m.titulo ? `<br><small>${esc(m.titulo)}</small>` : ""}</td>`
      + `<td>${esc(m.persona || "—")}</td><td>${enl}</td><td>${m.alcance === null || m.alcance === undefined ? "—" : num(m.alcance, 0)}</td><td>${esc(m.origen)}${m.fuente ? `<br><small>${esc(m.fuente)}</small>` : ""}</td>`
      + `<td><b>${esc(m.estado)}</b></td><td>${esc(m.nota || "")}</td><td class="men-acc">${m.estado !== "confirmada" ? acc("confirmar", "Confirmar") : ""}${m.estado !== "descartada" ? acc("descartar", "Descartar") : acc("pendiente", "Reabrir")}</td></tr>`;
  };
  const opt = (x, sel) => `<option${sel ? " selected" : ""}>${esc(x)}</option>`;
  return `<section id="difusion"><h3>Difusión y menciones</h3>${mensajePanel(u.searchParams.get("men"))}
<p class="sub">Cuánto se comparte Cofrade News, cuántas personas llegan por esos enlaces y dónde nos nombran. Sin datos personales: las visitas se guardan como huellas anónimas del día.${R.parcial ? ' <span style="color:var(--rojo)">Algunas cifras no se pudieron leer.</span>' : ""}</p>
<div class="cifras k5">${kpis}</div>
<div class="dos d2"><div class="tarjeta"><h4 class="kicker">¿Cómo comparten? (30 días)</h4>${barras((R.canal || []).map((x) => [NOMBRE_CANAL[x.canal] || x.canal, Number(x.n || 0)]))}</div>
<div class="tarjeta"><h4 class="kicker">Visitas por enlaces compartidos, por día</h4>${barras(serie, "#1E7B4F")}</div>
<div class="tarjeta"><h4 class="kicker">Origen de las visitas (30 días)</h4>${barras((R.org || []).map((x) => [ORIGENES[x.origen] || x.origen, Number(x.n || 0)]), "#23395B")}</div>
<div class="tarjeta"><h4 class="kicker">Sitios que envían lectores (dominio, 30 días)</h4>${barras((R.sitios || []).map((x) => [x.host, Number(x.n || 0)]), "#8A6416")}</div></div>
<div class="tarjeta" style="margin-top:14px"><h4 class="kicker">Enlaces personales con más visitas (30 días)</h4>${top ? `<div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th>Código</th><th>Visitas</th><th>Personas</th><th>Inscrito en el concurso</th></tr></thead><tbody>${top}</tbody></table></div>` : `<p class="aviso">Aún nadie llegó por un enlace compartido.</p>`}</div>
<h4 class="grupo-k" style="margin-top:26px">Menciones en medios</h4>
<div class="dos d2"><div class="tarjeta"><h4 class="kicker">Confirmadas por medio</h4>${barras((R.medio || []).map((x) => [x.medio, Number(x.n || 0), Number(x.a || 0) ? "alcance " + num(x.a, 0) : ""]))}</div>
<div class="tarjeta"><h4 class="kicker">Confirmadas por mes</h4>${barras((R.mes || []).map((x) => [x.mes ? NOMBRES_MES[Number(x.mes.slice(5, 7)) - 1] + " " + x.mes.slice(0, 4) : "Sin fecha", Number(x.n || 0)]), "#1E7B4F")}</div></div>
<p class="sub" style="margin-top:12px">Búsqueda automática cada ${MENCIONES_CADA_H} horas en Google Noticias, Apple Podcasts, GDELT y tus alertas RSS: ${ult.hora ? "última ronda " + esc(horaCL(ult.hora)) + (fuentesTxt ? " · " + esc(fuentesTxt) : "") : "todavía no completa una ronda"}.${esc(enCurso)} ${esc(ytTxt)} Otras redes según ${esc(reglas.origen)}: ${esc(redesTxt)}.</p>
<form method="post" action="/panel/menciones" style="margin:0 0 14px"><input type="hidden" name="accion" value="barrer"><button class="btn linea chico" type="submit">Buscar menciones ahora</button></form>
<div style="overflow-x:auto"><table class="tabla-vis tabla-men"><thead><tr><th>Fecha</th><th>Medio</th><th>Programa o cuenta</th><th>Persona</th><th>Enlace</th><th>Alcance</th><th>Origen</th><th>Estado</th><th>Nota</th><th></th></tr></thead>
<tbody>${(R.men || []).map(fila).join("") || `<tr><td colspan="10">Todavía no hay menciones registradas.</td></tr>`}</tbody></table></div>
<details class="nuevo-anun" id="nueva-mencion"><summary class="btn oro" style="display:inline-flex;margin:16px 0 4px">+ Agregar una mención</summary>
<form class="form-anun" method="post" action="/panel/menciones"><input type="hidden" name="accion" value="agregar"><fieldset><legend>Nueva mención (queda confirmada)</legend>
<label>Fecha *<input type="date" name="fecha" required value="${hoy}" max="${hoy}"></label><label>Medio *<select name="medio" required>${MEDIOS_MENCION.map((x, i) => opt(x, i === 0)).join("")}</select></label>
<label>Programa o cuenta<input name="programa" maxlength="160" placeholder="Ej.: Radio Bío-Bío, «Mañaneros»"></label><label>Persona<input name="persona" maxlength="120" placeholder="Quién nos mencionó"></label>
<label class="ancho">Enlace<input name="enlace" type="url" maxlength="700" placeholder="https://…"></label><label>Alcance estimado (personas)<input name="alcance" inputmode="numeric" maxlength="14" placeholder="Ej.: 25000"></label>
<label>Título o tema<input name="titulo" maxlength="300"></label><label class="ancho">Nota<input name="nota" maxlength="500"></label></fieldset>
<button class="btn oro" type="submit">Guardar mención</button></form></details>
<details class="nuevo-anun" id="alertas-rss"><summary class="btn linea" style="display:inline-flex;margin:12px 0 4px">Alertas RSS (${rss.length} de ${MAX_RSS_ALERTAS})</summary>
<form class="form-anun" method="post" action="/panel/menciones"><input type="hidden" name="accion" value="rss"><fieldset><legend>Direcciones RSS de alertas (Talkwalker Alerts, Google Alertas…)</legend>
${rssEstado ? `<ul class="sub" style="margin:0 0 6px;grid-column:1/-1">${rssEstado}</ul>` : ""}<label class="ancho">Una por línea, solo https, máximo ${MAX_RSS_ALERTAS}. Se leen en cada búsqueda automática si su robots.txt lo permite.<textarea name="rss" rows="5" maxlength="2600" placeholder="https://alerts.talkwalker.com/alerts/rss/…">${esc(rss.join("\n"))}</textarea></label></fieldset>
<button class="btn oro" type="submit">Guardar alertas RSS</button></form></details></section>`;
}
async function seccionConcurso(env, u) {
  await asegurarTablas(env, "difusion");
  await asegurarTablas(env, "concurso");
  const hoy = hoyConcurso(), etapa = etapaConcurso(hoy);
  const [lista, R] = await Promise.all([entradasConcurso(env), lotePanel(env, {
    revisar: env.DB.prepare("SELECT id, email, fecha, creado, bytes, ancho, alto FROM concurso_capturas WHERE estado = 'por revisar' AND datos IS NOT NULL ORDER BY id LIMIT 30"),
    capEst: env.DB.prepare("SELECT estado, COUNT(*) AS n FROM concurso_capturas GROUP BY estado"),
    sorteo: env.DB.prepare("SELECT * FROM concurso_sorteos WHERE tipo = 'oficial'"),
    cupones: env.DB.prepare("SELECT codigo, email, pct, plan, vence, usado, reclamado FROM cupones WHERE origen = 'concurso' ORDER BY creado, pct DESC, codigo"),
    mant: env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('difusion_mant_ok', 'difusion_mant_error')"),
  })]);
  const conf = lista.filter((x) => x.verificado), capE = Object.fromEntries((R.capEst || []).map((x) => [x.estado, Number(x.n || 0)]));
  const mant = Object.fromEntries((R.mant || []).map((x) => [x.clave, x.valor]));
  const tEnl = lista.reduce((a, x) => a + x.enlace, 0), tCap = lista.reduce((a, x) => a + x.captura, 0), conChances = lista.filter((x) => x.total > 0).length;
  const etTxt = { antes: "Todavía no empieza", abierto: "Abierto", cerrado: "Cerrado", fin: "Terminado" }[etapa];
  const kpis = [
    kpiA("Estado", etTxt, `del ${ddmm(CONCURSO.desde)} al ${ddmm(CONCURSO.hasta)} · sorteo ${ddmm(CONCURSO.sorteo)}`, "El concurso acepta inscripciones y capturas hasta el 24-12-2026 a las 23:59 (hora de Santiago). El sorteo oficial se habilita el 26-12-2026."),
    kpiA("Participantes", num(conf.length, 0), `${num(lista.length - conf.length, 0)} sin confirmar el email`, "Personas inscritas con el email confirmado (solo ellas suman participaciones)."),
    kpiA("Participaciones por enlace", num(tEnl, 0), "personas distintas al día, tope 10", "Por cada día del concurso, personas distintas que abrieron el enlace de cada participante (máximo 10 por día y persona)."),
    kpiA("Participaciones por captura", num(tCap, 0), `${num(capE["por revisar"] || 0, 0)} capturas por revisar`, "Capturas aceptadas (máximo 1 por día y persona). Las por revisar todavía no suman."),
    kpiA("Con chances en el sorteo", num(conChances, 0), "personas con al menos 1 participación", `Entre ellas se sortean los ${N_PREMIOS} premios; cada participación es una chance.`),
  ].join("");
  const btnP = (x) => `<form method="post" action="/panel/concurso" style="display:inline"><input type="hidden" name="accion" value="${x.estado === "excluido" ? "reincorporar" : "excluir"}"><input type="hidden" name="email" value="${esc(x.email)}"><button class="btn linea chico" type="submit">${x.estado === "excluido" ? "Reincorporar" : "Excluir"}</button></form>`;
  const filas = lista.slice().sort((a, b) => b.total - a.total || (a.creado < b.creado ? -1 : 1)).slice(0, 150).map((x) => `<tr${x.estado === "excluido" ? ' class="men-desc"' : ""}><td>${esc(x.email)}</td><td><code>${esc(x.codigo)}</code></td><td>${x.verificado ? "sí" : "no"}</td><td>${num(x.enlace, 0)}</td><td>${num(x.captura, 0)}</td><td><b>${num(x.total, 0)}</b></td><td>${esc(String(x.creado || "").slice(0, 10))}</td><td>${x.estado === "excluido" ? "<b>excluido</b>" : "activo"}</td><td>${btnP(x)}</td></tr>`).join("");
  const caps = (R.revisar || []).map((c) => {
    const b = (a, t, cls) => `<form method="post" action="/panel/concurso" style="display:inline"><input type="hidden" name="accion" value="${a}"><input type="hidden" name="id" value="${c.id}"><button class="btn ${cls} chico" type="submit">${t}</button></form>`;
    return `<figure class="cc-cap"><a href="/panel/concurso/captura/${c.id}" target="_blank" rel="noopener"><img src="/panel/concurso/captura/${c.id}" alt="Captura de ${esc(enmascarar(c.email))}" loading="lazy" width="180" height="180"></a>`
      + `<figcaption>${esc(c.email)}<br><small>${ddmm(c.fecha)} · ${num(Math.round(c.bytes / 1024), 0)} KB${c.ancho ? ` · ${c.ancho}×${c.alto}` : ""}</small><br>${b("aceptar", "Aceptar", "oro")}${b("rechazar", "Rechazar", "linea")}</figcaption></figure>`;
  }).join("");
  const s = (R.sorteo || [])[0];
  let sorteo;
  if (s) {
    let g = [];
    try { g = JSON.parse(s.ganadores); } catch { g = []; }
    const fc = (a, c, t) => `<form method="post" action="/panel/concurso" style="display:inline"><input type="hidden" name="accion" value="${a}"><input type="hidden" name="codigo" value="${esc(c.codigo)}"><button class="btn linea chico" type="submit">${t}</button></form>`;
    const cup = (R.cupones || []).map((c) => `<tr><td><code>${esc(c.codigo)}</code></td><td>${esc(c.email)}</td><td>${c.pct >= 100 ? "100 % (año gratis)" : c.pct + " %"}</td><td>${ddmm(c.vence)}</td><td>${c.reclamado ? "reclamado " + esc(String(c.reclamado).slice(0, 10)) : fc("cupon-reclamado", c, "Marcar como reclamado")}</td><td>${c.usado ? (c.pct >= 100 ? "activado " : "usado ") + esc(String(c.usado).slice(0, 10)) : c.pct >= 100 ? "se activa en /socios/canjear" : fc("cupon-usado", c, "Marcar como usado")}</td></tr>`).join("");
    const sinReclamo = (R.cupones || []).filter((c) => !c.reclamado && !c.usado).length;
    sorteo = `<div class="tarjeta"><h4 class="kicker">Sorteo oficial · registro de auditoría</h4><p>Realizado el ${esc(horaCL(s.creado))} · ${num(s.participantes, 0)} personas · ${num(s.total, 0)} participaciones · ${num(s.avisos, 0)} correos enviados.</p>
<p class="sub">Huella SHA-256 de la lista ordenada: <code>${esc(s.huella)}</code><br>Semilla: <code>${esc(s.semilla)}</code><br>Ganadores en orden de lugar (huella del email): ${g.map((x, i) => `${esc(LUGAR_ES[(x.lugar || i + 1) - 1] || "")} <code>${esc(x.id)}</code> ${esc(x.mascara)} (${num(x.entradas, 0)})${x.pct ? ` · ${esc(premioDe(x.pct, false))}` : ""}`).join(" · ")}</p>
<p><a class="btn linea chico" href="/panel/concurso/sorteo.json" target="_blank" rel="noopener">Descargar el registro completo (JSON)</a></p>
${sinReclamo && hoy <= CONCURSO.reclamo ? `<p class="aviso" style="color:var(--rojo);font-weight:600">${sinReclamo} ${sinReclamo === 1 ? "premio sin reclamar" : "premios sin reclamar"}: cuando un ganador responda, toca «Marcar como reclamado». Lo que no esté reclamado el ${ddmm(CONCURSO.reclamo)} se anula solo.</p>` : ""}<div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th>Cupón</th><th>Ganador</th><th>Descuento</th><th>Vence</th><th>Reclamo (hasta el 31-01-2027)</th><th>Uso</th></tr></thead><tbody>${cup}</tbody></table></div></div>`;
  } else {
    const listo = hoy >= CONCURSO.sorteo;
    sorteo = `<div class="tarjeta"><h4 class="kicker">Sorteo</h4><p>${listo ? "Ya se puede hacer el sorteo oficial. Antes, revisa las capturas pendientes: las que queden sin revisar no suman." : `El botón se habilita el ${ddmm(CONCURSO.sorteo)}. Mientras, puedes ver una vista previa (no vale).`}</p>
<p><a class="btn linea chico" href="/panel/concurso/vista.json" target="_blank" rel="noopener">Vista previa del sorteo (no vale)</a></p>
<p class="sub">Si nadie lo hace antes, el sistema hace el sorteo oficial solo el ${ddmm(CONCURSO.sorteo)} desde las ${CONCURSO.sorteoAutoHora}:00 (hora de Santiago), con la primera visita a la portada o al Panel.</p>
<form method="post" action="/panel/concurso"><input type="hidden" name="accion" value="sortear"><label class="pub-ok" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" name="revisado" value="si"${listo ? " required" : " disabled"}> Revisé las capturas y quiero hacer el sorteo oficial (no se puede repetir)</label>
<button class="btn oro" type="submit"${listo ? "" : " disabled"}>Sortear</button></form></div>`;
  }
  const aviso = _hoyPrueba ? `<p class="aviso" style="color:var(--rojo);font-weight:700">Atención: fecha de prueba activa (CONCURSO_HOY_PRUEBA = ${esc(_hoyPrueba)}). En producción este secreto no debe existir.</p>` : "";
  return `<section id="concurso"><h3>Concurso «Comparte Cofrade News»</h3>${mensajePanel(u.searchParams.get("cc"))}${aviso}
<p class="sub">Organiza Destak. Premios: ${esc(PREMIOS_ES)}. Bases públicas en <a href="/bases-concurso">/bases-concurso</a>. Aquí los emails se ven completos; en la página pública, ocultos.</p>
<div class="cifras k5">${kpis}</div>
<h4 class="grupo-k" style="margin-top:22px">Capturas por revisar (${num(capE["por revisar"] || 0, 0)})</h4>${caps ? `<div class="cc-caps">${caps}</div>` : `<p class="aviso">No hay capturas pendientes.</p>`}
<h4 class="grupo-k" style="margin-top:22px">Participantes</h4>${filas ? `<div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th>Email</th><th>Código</th><th>Confirmado</th><th>Por enlace</th><th>Por captura</th><th>Total</th><th>Inscrito</th><th>Estado</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>` : `<p class="aviso">Todavía no hay inscritos.</p>`}
<p class="sub">Excluir: la persona no entra al sorteo (por ejemplo, visitas falsas o la misma persona con varios emails, como dicen las bases). Se puede reincorporar.</p>
<div style="margin-top:16px">${sorteo}</div>
<details class="nuevo-anun" id="borrar-participante"><summary class="btn linea" style="display:inline-flex;margin:16px 0 4px">Borrar los datos de un participante (derecho de supresión)</summary>
<form class="form-anun" method="post" action="/panel/concurso"><input type="hidden" name="accion" value="borrar-datos"><fieldset><legend>Borra su inscripción, sus capturas, sus correos y las visitas de su enlace</legend>
<label class="ancho">Email *<input name="email" type="email" required maxlength="120"></label>
<label class="pub-ok ancho" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="confirmo" value="si" required> Confirmo que la persona lo pidió (no se puede deshacer)</label></fieldset>
<button class="btn oro" type="submit">Borrar sus datos</button></form></details>
<p class="sub">Borrados automáticos de las bases (capturas el 25-01-2027, datos el 01-02-2027, cupones al vencer): último mantenimiento ${esc(horaCL(mant.difusion_mant_ok) || "pendiente")}${mant.difusion_mant_error ? ` · <span style="color:var(--rojo)">último error: ${esc(mant.difusion_mant_error)}</span>` : ""}.</p></section>`;
}

// ---------- estilos de la cinta, el diálogo del concurso y las secciones del Panel ----------
const DIFUSION_CSS = `${COMPARTIR_CSS}
.cc-sec{border:0!important;padding:26px 0 0!important}.cc-cinta{display:flex;flex-wrap:wrap;gap:16px 26px;align-items:center;justify-content:space-between;padding:20px 22px;border:1.5px solid var(--oro);border-radius:18px;background:var(--card)}
.cc-c-txt{flex:1 1 320px;min-width:0}.cc-cinta h2{font:600 clamp(22px,3vw,28px)/1.2 var(--serif);margin:8px 0 6px}.cc-cinta p{margin:0;color:var(--tinta2)}
.cc-acc{display:flex;flex-wrap:wrap;gap:10px}.cc-acc .btn{min-height:46px}
.buzon-cc{margin:2px 0 4px;font-size:14px;color:var(--gris)}.buzon-cc .enlace{font-weight:600;min-height:44px}
.cc-txt{margin:0 0 6px;color:var(--tinta2);font-size:15px}.cc-aviso{margin:0 0 10px;padding:10px 12px;border-left:3px solid var(--oro);border-radius:8px;background:var(--papel);font-size:14px}
.cc-archivo{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border:1.5px solid var(--linea);border-radius:999px;cursor:pointer;font-weight:600}
.cc-archivo:hover,.cc-archivo:focus-within{border-color:var(--oro)}.cc-archivo:focus-within{outline:3px solid var(--oro);outline-offset:2px}
.cc-archivo input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.cc-vista{display:flex;align-items:center;gap:12px;margin-top:12px}.cc-vista img{width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid var(--linea)}.cc-peso{font-size:13px;color:var(--gris)}
.cc-mio{display:grid;gap:8px;margin:0 auto 16px;max-width:30em;text-align:left}.cc-mio input{min-height:46px;border-radius:12px;border:1.5px solid var(--linea);padding:0 12px;font-size:15px;background:var(--papel);color:var(--tinta);width:100%}
.cc-caps{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.cc-cap{margin:0;background:var(--card);border:1px solid var(--linea);border-radius:14px;padding:10px;font-size:13px}
.cc-cap img{display:block;width:100%;height:180px;object-fit:contain;background:var(--papel);border-radius:8px;margin-bottom:8px}.cc-cap form{margin:6px 6px 0 0}
.tabla-men td{white-space:normal;vertical-align:top;text-align:left;min-width:90px}.tabla-men small{color:var(--gris)}.tabla-men .men-acc{white-space:nowrap}.tabla-men form{margin:0 4px 4px 0}
.tabla-men tr.men-pend td{background:color-mix(in srgb,var(--oro) 9%,transparent)}.tabla-men tr.men-desc td{opacity:.6}`;

// ---------- textos fijos en inglés (botón EN de la portada y del Buzón) ----------
Object.assign(EN_FIJO, {
  "Compartir Cofrade News": "Share Cofrade News", "Compartir esta edición": "Share this edition", "Compartir": "Share", "Enlace para compartir": "Link to share",
  "Concurso · hasta el 24 de diciembre": "Contest · until December 24", "Concurso cerrado": "Contest closed", "Comparte Cofrade News y gana hasta un año gratis": "Share Cofrade News and win up to a free year",
  "Resultados del concurso": "Contest results",
  [TXT_CINTA_ES]: TXT_CINTA_EN,
  [TXT_SORTEO_HECHO_ES]: TXT_SORTEO_HECHO_EN, [TXT_SORTEO_ANTES_ES]: TXT_SORTEO_ANTES_EN,
  "Compartir mi enlace": "Share my link", "Participar": "Enter", "Ver las bases": "Read the rules",
  "¿Compartes Cofrade News?": "Do you share Cofrade News?", "Participar en el concurso": "Enter the contest", "Bases": "Rules",
  "Concurso Comparte Cofrade News": "“Share Cofrade News” contest", "Gana hasta un año gratis": "Win up to a free year",
  [TXT_DLG_ES]: TXT_DLG_EN,
  "Tengo 18 años o más y vivo en Chile": "I am 18 or older and live in Chile", "Acepto las": "I accept the", "bases del concurso": "contest rules",
  "Captura de pantalla (opcional)": "Screenshot (optional)",
  "Si ya confirmaste tu email, sube una captura que muestre que compartiste Cofrade News. Si la aceptamos, suma 1 participación (máximo 1 al día).": "If you already confirmed your email, upload a screenshot showing that you shared Cofrade News. If we accept it, it adds 1 entry (1 a day max).",
  "Antes de subirla:": "Before uploading it:",
  "tapa los nombres, números y fotos de otras personas. La captura es privada: nunca se publica y se borra 30 días después del sorteo.": "cover other people's names, numbers and photos. The screenshot is private: it is never published and it is deleted 30 days after the draw.",
  "Elegir imagen": "Choose image", "Vista previa de tu captura": "Preview of your screenshot", "Quitar": "Remove",
  "Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email completo.": "We will send you an email to confirm it is you. We never publish your full email.",
  "Página web": "Website", "¡Gracias por participar!": "Thank you for taking part!", "Tu enlace personal": "Your personal link", "Copiar mi enlace": "Copy my link",
  "Bases del Concurso «Comparte Cofrade News» · Cofrade News": "“Share Cofrade News” contest rules · Cofrade News",
});
