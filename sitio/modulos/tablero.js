// ---------- TABLERO v2 Y PUBLICIDAD PAGADA (16-11-2026) ----------
// Germán, 15-11-2026: «al pasar el cursor encima de cada KPI y de cada gráfico aparezca una ventana emergente con una descripción
// detallada de lo que representa el valor obtenido [...] más KPIs de medición y más gráficos dinámicos, pudiendo filtrar por meses, por
// año y por cada ítem del "Mapa de Calor" [...] una sección con las empresas que pagan por publicidad [...] Y cuando les quede unos 7
// días para el vencimiento de su publicidad contratada le enviarás un email automático». Sus respuestas: el Panel es el registro único
// de los anunciantes que pagan, SIN mezclar sus marcas propias (son permanentes, no caducan); el correo sale solo, con copia a
// hola@cofrad.es; la renovación se ofrece a UF 11 por un año.

// ===== 1. De dónde llega cada visita, a qué hora y en qué aparato (sin datos personales: solo se suma 1 en una casilla) =====
const ORIGENES = { directo: "Directo o desde una app", interno: "Desde otra página del sitio", buscadores: "Buscadores", ia: "Asistentes de IA",
  redes: "Redes sociales y mensajería", correo: "Correo electrónico", otros: "Otros sitios web", compartido: "Enlaces compartidos por lectores" };
const DISPOSITIVOS = { celular: "Celular", computador: "Computador", tablet: "Tablet" };
const RE_IA = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|you\.com|meta\.ai|grok\.com|deepseek\.com|mistral\.ai)$/;
const RE_CORREO = /^(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com|mail\.yahoo\.com|mail\.proton\.me|mail\.aol\.com|mail\.zoho\.com|(webmail|correo|mail)\.[a-z0-9.-]+)$/;
const RE_BUSCADOR = /(^|\.)(google\.[a-z]{2,3}(\.[a-z]{2})?|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.brave\.com|yandex\.[a-z]{2,3}|baidu\.com|qwant\.com|startpage\.com)$/;
const RE_REDES = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|whatsapp\.com|wa\.me|telegram\.org|t\.me|threads\.net|tiktok\.com|youtube\.com|youtu\.be|reddit\.com|bsky\.app|pinterest\.com|mastodon\.social)$/;
const APPS_ORIGEN = { "com.google.android.gm": "correo", "com.microsoft.office.outlook": "correo", "com.google.android.googlequicksearchbox": "buscadores",
  "com.whatsapp": "redes", "org.telegram.messenger": "redes", "com.facebook.katana": "redes", "com.instagram.android": "redes", "com.linkedin.android": "redes", "com.twitter.android": "redes" };
// [origen, sitio que la envió]. Los enlaces con utm_source (los que se comparten a propósito) mandan; si no, la página de la que vino.
function origenVisita(req, u) {
  const q = (k) => String((u && u.searchParams.get(k)) || "").toLowerCase().slice(0, 60);
  const fuente = q("utm_source"), medio = q("utm_medium");
  if (fuente || medio) {
    if (fuente === "compartir") return ["compartido", ""];   // 20-11-2026: enlaces del botón Compartir (modulos/difusion.js)
    const t = fuente + " " + medio;
    if (/mail|correo|newsletter|bolet/.test(t)) return ["correo", ""];
    if (/whatsapp|telegram|facebook|instagram|linkedin|twitter|tiktok|threads|youtube|social|redes|^x /.test(t)) return ["redes", ""];
    if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(t)) return ["ia", ""];
    if (/google|bing|cpc|search|busca/.test(t)) return ["buscadores", ""];
    return ["otros", ""];
  }
  const ref = String(req.headers.get("Referer") || "");
  const app = ref.match(/^android-app:\/\/([a-z0-9_.]{3,80})/i);   // apps de Android (Gmail, WhatsApp...) se identifican así
  if (app) return [APPS_ORIGEN[app[1].toLowerCase()] || "otros", ""];
  let host = "";
  try { host = new URL(ref).hostname.toLowerCase(); } catch { host = ""; }
  if (!host) return ["directo", ""];
  if (host === DOMINIO || host === "cofrad.es" || host.endsWith(".cofrad.es")) return ["interno", ""];
  host = host.replace(/^www\./, "");
  if (RE_IA.test(host)) return ["ia", host];
  if (RE_CORREO.test(host)) return ["correo", host];
  if (RE_BUSCADOR.test(host)) return ["buscadores", host];
  if (RE_REDES.test(host)) return ["redes", host];
  return ["otros", host];
}
function dispositivoVisita(req) {
  const ua = req.headers.get("User-Agent") || "";
  if (/iPad|Tablet|PlayBook|Silk|Kindle|SM-T\d|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (req.headers.get("Sec-CH-UA-Mobile") === "?1" || /Mobi|iPhone|iPod|Android|IEMobile|Opera Mini|Windows Phone|BlackBerry/i.test(ua)) return "celular";
  return "computador";
}
const horaDeChile = (ms = Date.now()) => { const h = Number(_FMT_HORA_CL.format(new Date(ms))); return Number.isFinite(h) ? h % 24 : 0; };
// Una sola escritura por visita (hora × origen × aparato van en la misma casilla) y otra solo si vino desde otro sitio.
async function registrarDimensiones(req, env, fecha, zona) {
  let u = null;
  try { u = new URL(req.url); } catch { u = null; }
  const [origen, host] = origenVisita(req, u);
  const ops = [env.DB.prepare("INSERT INTO dimensiones (fecha, zona, hora, origen, disp, n) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(fecha, zona, hora, origen, disp) DO UPDATE SET n = n + 1")
    .bind(fecha, zona, horaDeChile(), origen, dispositivoVisita(req))];
  if (host && /^[a-z0-9.-]{3,80}$/.test(host)) ops.push(env.DB.prepare("INSERT INTO referentes (fecha, host, n) VALUES (?, ?, 1) ON CONFLICT(fecha, host) DO UPDATE SET n = n + 1").bind(fecha, host));
  await env.DB.batch(ops);
}

// ===== 2. Utilidades =====
const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const masDias = (f, n) => new Date(Date.parse(f + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const diasHasta = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
const finDeMes = (y, m) => new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
function unAnioDesde(f) { const [y, m, d] = f.split("-").map(Number); return masDias(new Date(Date.UTC(y + 1, m - 1, d, 12)).toISOString().slice(0, 10), -1); }
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || "")) && !Number.isNaN(Date.parse(f + "T12:00:00Z")) && new Date(f + "T12:00:00Z").toISOString().slice(0, 10) === f;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_OK = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
const EXT_LOGO = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const BASE_SITIO = "https://" + DOMINIO;
const PRECIO_RENOVACION = { monto: 11, moneda: "UF" };   // Germán, 15-11-2026: «UF 11 al año» (12 meses al precio de 11)
function slugAnuncio(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "anunciante";
}
// https://… o http://… (agrega https:// si se escribió sin él). "" si viene vacío; null si no es una dirección web válida.
function webOk(v) {
  let t = String(v || "").trim();
  if (!t) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = "https://" + t.replace(/^\/+/, "");
  try {
    const x = new URL(t);
    if (!/^https?:$/.test(x.protocol) || x.username || x.password || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x.hostname) || x.href.length > 300) return null;
    return x.href;
  } catch { return null; }
}
function rutValido(r) {
  const t = String(r || "").replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(t)) return false;
  let s = 0, m = 2;
  for (let i = t.length - 2; i >= 0; i--) { s += Number(t[i]) * m; m = m === 7 ? 2 : m + 1; }
  const dv = 11 - (s % 11);
  return t.slice(-1) === (dv === 11 ? "0" : dv === 10 ? "K" : String(dv));
}
const rutConPuntos = (r) => { const t = String(r).replace(/[.\s-]/g, "").toUpperCase(); return t.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + t.slice(-1); };
function tintaSobre(hex) {   // texto blanco o azul marino según qué se lee mejor sobre ese fondo
  if (!HEX6.test(hex || "")) return "#FFFFFF";
  const n = parseInt(hex.slice(1), 16), L = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return L > 0.6 ? "#0B1F3A" : "#FFFFFF";
}
const montoTxt = (m, moneda) => (moneda === "CLP" ? "$" + num(m, 0) : "UF " + num(m, Number(m) % 1 ? 2 : 0));
const _FMT_FH = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fechaHora = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? _FMT_FH.format(new Date(t)).replace(",", "").replace(/\//g, "-") : ""; };
const pctTxt = (x) => num(x, x < 10 && x % 1 ? 1 : 0) + " %";

// Marcas propias de Germán (sitio/marcas.json): permanentes, fuera del registro de anunciantes. Sus clics van con «m-» delante.
const marcasPropias = () => ((MARCAS && MARCAS.marcas) || []);
const slugMarca = (m) => "m-" + slugAnuncio(m.nombre);
const dominioRaiz = (h) => String(h || "").toLowerCase().replace(/\.$/, "").split(".").slice(-2).join(".");
function hostsPropios() {
  const s = new Set(["caddiegolf.cl"]);
  for (const m of marcasPropias()) { const w = webOk(m.url); if (w) s.add(dominioRaiz(new URL(w).hostname)); }
  return s;
}

// ===== 3. Avisos vigentes: portada (carrusel), /publicidad.json (para el diario) y /ir (clics) =====
let ANUNCIOS = { t: 0, lista: [] };   // copia en memoria 5 minutos: la portada no consulta la base en cada visita
function logoDe(a, absoluta = false) {   // absoluta: para el diario (se abre también fuera del sitio); relativa: portada y panel
  if (a.logo_tipo && a.logo_v && EXT_LOGO[a.logo_tipo]) return `${absoluta ? BASE_SITIO : ""}/anuncios/${a.slug}.${EXT_LOGO[a.logo_tipo]}?v=${a.logo_v}`;
  return /^https:\/\/[^\s"'<>]+\.(png|jpe?g|webp|gif)(\?[^\s"'<>]*)?$/i.test(a.logo_url || "") ? a.logo_url : "";
}
async function avisosVigentes(env, hoy) {
  const r = await env.DB.prepare(`SELECT a.id, a.slug, a.empresa, a.titulo, a.texto, a.boton1_texto, a.boton1_web, a.boton2_texto, a.boton2_web, a.boton2_email,
    a.banner, a.orden, a.color_fondo, a.color_acento, a.logo_url, l.tipo AS logo_tipo, l.version AS logo_v, MIN(c.desde) AS desde, MAX(c.hasta) AS hasta
    FROM anunciantes a JOIN contratos c ON c.anunciante_id = a.id LEFT JOIN logos_anuncios l ON l.anunciante_id = a.id
    WHERE a.estado = 'activo' AND c.desde <= ?1 AND c.hasta >= ?1 GROUP BY a.id ORDER BY a.orden, a.empresa`).bind(hoy).all();
  return r.results || [];
}
async function prepararAnuncios(env) {
  if (!env.DB || Date.now() - ANUNCIOS.t < 300000) return ANUNCIOS.lista;
  try { ANUNCIOS = { t: Date.now(), lista: await avisosVigentes(env, fechaChile()) }; } catch { ANUNCIOS.t = Date.now() - 240000; }   // si falla, reintenta en 1 minuto
  return ANUNCIOS.lista;
}
// Para el carrusel del pie (bloqueMarcas): primero los que pagan, después las marcas propias.
const avisosCarrusel = () => ANUNCIOS.lista.map((a) => ({ nombre: a.empresa, src: logoDe(a), texto: logoDe(a) ? "" : a.empresa, fondo: HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A",
  color: tintaSobre(HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A"), ir: `/ir/${a.slug}?o=portada` }));
// Mismo formato de fila que la planilla «Cofrade News · Anunciantes», para que la Skill los sume tal cual al diario. Solo datos públicos:
// nunca el contacto, el email, el teléfono, el RUT ni lo que pagó. Los botones pasan por /ir para contar los clics.
async function publicidadJson(env) {
  const hoy = fechaChile();
  let lista = [];
  try { lista = env.DB ? await avisosVigentes(env, hoy) : []; } catch { lista = []; }
  const avisos = lista.map((a) => ({ activo: "SI", fuente: "panel", slug: a.slug, empresa: a.empresa, titulo: a.titulo || a.empresa, texto: a.texto || "",
    banner: a.banner || "ambos", orden: a.orden || 1, logo_url: logoDe(a, true), color_fondo: HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A",
    color_acento: HEX6.test(a.color_acento || "") ? a.color_acento : "#D9AE52", boton1_texto: a.boton1_texto || "Visitar sitio web", boton1_web: `${BASE_SITIO}/ir/${a.slug}?b=1&o=diario`,
    ...(a.boton2_web || a.boton2_email ? { boton2_texto: a.boton2_texto || (a.boton2_email ? "Escribir un email" : "Más información"), boton2_web: `${BASE_SITIO}/ir/${a.slug}?b=2&o=diario` } : {}),
    desde: a.desde, hasta: a.hasta }));
  return new Response(JSON.stringify({ generado: new Date().toISOString(), fecha: hoy, avisos }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", ...SEGURIDAD } });
}

// Clics: no cuentan robots, precargas, repeticiones a ráfaga ni las redes de nubes donde corren los escáneres de correo y los robots
// (Microsoft, Google, Amazon y otras): ante la duda, no se cuenta, para que lo que se le muestre al anunciante nunca esté inflado.
const ASN_NUBE = new Set([8075, 15169, 396982, 16509, 14618, 14061, 16276, 24940, 63949, 20473, 31898, 45102, 132203, 26211]);
function origenClic(req, u) {
  try {
    const r = new URL(req.headers.get("Referer") || "");
    if (r.hostname === DOMINIO || r.hostname === "cofrad.es") return r.pathname.startsWith("/edicion") ? "diario" : r.pathname === "/" ? "portada" : "sitio";
  } catch { /* sin página de origen */ }
  const o = String(u.searchParams.get("o") || "");
  return ["diario", "portada", "correo", "pdf"].includes(o) ? o : "otro";
}
async function contarClic(req, env, slug, origen) {
  try {
    if (!env.DB || req.method !== "GET") return;
    const ua = req.headers.get("User-Agent") || "";
    if (!ua || BOT_UA.test(ua)) return;
    if (/prefetch|prerender/i.test((req.headers.get("Sec-Purpose") || "") + (req.headers.get("Purpose") || "") + (req.headers.get("X-Moz") || ""))) return;
    if (ASN_NUBE.has(Number(req.cf && req.cf.asn))) return;
    const fecha = fechaChile(), quien = await huellaVisitante(req, env, fecha);
    if (!(await bajoLimite(env, "c:" + quien))) return;
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO clics_unicos (fecha, slug, visitante) VALUES (?, ?, ?)").bind(fecha, slug, quien),
      env.DB.prepare("INSERT INTO clics (fecha, slug, origen, n) VALUES (?, ?, ?, 1) ON CONFLICT(fecha, slug, origen) DO UPDATE SET n = n + 1").bind(fecha, slug, origen),
    ]);
  } catch { /* contar nunca impide llegar al anunciante */ }
}
function conUtm(url, origen) {   // para que el anunciante vea en su Google Analytics las visitas que le manda Cofrade News
  try {
    const x = new URL(url);
    if (!/^https?:$/.test(x.protocol) || x.searchParams.has("utm_source")) return url;
    x.searchParams.set("utm_source", "cofrade-news"); x.searchParams.set("utm_medium", origen === "portada" ? "sitio" : "boletin"); x.searchParams.set("utm_campaign", "publicidad");
    return x.href;
  } catch { return url; }
}
function paginaCorreoDestino(email, nombre) {   // botón de email: cuenta el clic y abre el correo del lector
  const mailto = "mailto:" + email + "?subject=" + encodeURIComponent("Contacto desde Cofrade News");
  return new Response(`<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Escribir a ${esc(nombre)}</title></head>
<body style="font:17px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:48px 20px;text-align:center;background:#FBF8F1;color:#0B1F3A">
<p>Abriendo su correo para escribir a <b>${esc(nombre)}</b>…</p><p><a href="${esc(mailto)}" style="color:#8A6416;font-weight:600">Si no se abrió, toque aquí</a></p>
<p><a href="/" style="color:#5B6472">Volver a Cofrade News</a></p><script>location.href=${JSON.stringify(mailto).replace(/</g, "\\u003c")}</script></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Content-Security-Policy": CSP_PORTADA, ...SEGURIDAD } });
}
// /ir/<slug>: el destino sale SIEMPRE del registro (nunca de la dirección), así nadie puede usar el sitio para redirigir a otra parte.
async function irAnuncio(req, env, ctx, slug, u) {
  const portada = () => new Response(null, { status: 302, headers: { Location: "/", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const origen = origenClic(req, u), b = u.searchParams.get("b") === "2" ? 2 : 1;
  let destino = "", email = "", nombre = "";
  if (slug.startsWith("m-")) {   // marca propia: su enlace del carrusel, o una página o email de sus propios dominios
    const m = marcasPropias().find((x) => slugMarca(x) === slug);
    if (!m) return portada();
    nombre = m.nombre;
    const pedido = String(u.searchParams.get("u") || ""), propios = hostsPropios(), mm = pedido.match(/^mailto:([^?]+)/i);
    if (mm && EMAIL_OK.test(mm[1]) && propios.has(dominioRaiz(mm[1].split("@")[1]))) email = mm[1];
    else { const w = webOk(pedido); destino = w && propios.has(dominioRaiz(new URL(w).hostname)) ? w : webOk(m.url) || ""; }
  } else {
    if (!env.DB) return portada();
    const a = await env.DB.prepare("SELECT empresa, web, boton1_web, boton2_web, boton2_email, estado FROM anunciantes WHERE slug = ?").bind(slug).first().catch(() => null);
    if (!a || a.estado === "archivado") return portada();
    nombre = a.empresa;
    if (b === 2 && a.boton2_email && EMAIL_OK.test(a.boton2_email)) email = a.boton2_email;
    else destino = webOk(b === 2 ? a.boton2_web || a.boton1_web : a.boton1_web) || webOk(a.web) || "";
  }
  if (!destino && !email) return portada();
  ctx.waitUntil(contarClic(req, env, slug, origen));
  if (email) return paginaCorreoDestino(email, nombre);
  return new Response(null, { status: 302, headers: { Location: conUtm(destino, origen), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
// /anuncios/<slug>.<png|jpg|webp>: el logo que se subió en el Panel. Solo imágenes PNG, JPG o WebP (revisadas por su contenido, no por
// el nombre) y con una política que impide que el archivo ejecute nada. Queda en la caché de Cloudflare: no se lee la base cada vez.
async function logoAnuncio(req, env, ctx, slug, ext) {
  const nada = () => new Response("", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!env.DB) return nada();
  const cache = caches.default, clave = new Request(`https://cache.cofrad.es/anuncios/${slug}.${ext}?v=${encodeURIComponent(new URL(req.url).searchParams.get("v") || "")}`);
  const c = await cache.match(clave).catch(() => null);
  if (c) return c;
  const x = await env.DB.prepare("SELECT l.tipo, l.datos FROM logos_anuncios l JOIN anunciantes a ON a.id = l.anunciante_id WHERE a.slug = ? AND a.estado <> 'archivado'").bind(slug).first().catch(() => null);
  if (!x || EXT_LOGO[x.tipo] !== ext) return nada();
  let bin;
  try { bin = Uint8Array.from(atob(x.datos), (ch) => ch.charCodeAt(0)); } catch { return nada(); }
  const r = new Response(bin, { headers: { "Content-Type": x.tipo, "Cache-Control": "public, max-age=86400", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "cross-origin", ...SEGURIDAD } });
  ctx.waitUntil(cache.put(clave, r.clone()).catch(() => null));
  return r;
}

// ===== 4. Correo de renovación: 7 días antes del vencimiento, una vez por contrato, con copia a hola@cofrad.es =====
// Cifras del contrato: promedios de los días completos medidos (no cuenta hoy, que va en curso, ni el primer día de cada medición, que
// empezó a medias). Si no hay ningún día completo, usa los que haya.
async function metricasContrato(env, ctx, c) {
  const hoy = fechaChile(), fin = c.hasta < hoy ? c.hasta : hoy;
  const s = (sql, ...b) => env.DB.prepare(sql).bind(...b);
  const [ini, vis, uni, cl, cu] = (await env.DB.batch([
    s("SELECT (SELECT MIN(fecha) FROM vistas) AS v, (SELECT MIN(fecha) FROM visitas) AS u"),
    s("SELECT fecha, zona, n FROM vistas WHERE zona IN ('portada', 'diario') AND fecha BETWEEN ? AND ?", c.desde, fin),
    s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", c.desde, fin),
    s("SELECT COALESCE(SUM(n), 0) AS n FROM clics WHERE slug = ? AND fecha BETWEEN ? AND ?", c.slug, c.desde, fin),
    s("SELECT COUNT(*) AS u FROM clics_unicos WHERE slug = ? AND fecha BETWEEN ? AND ?", c.slug, c.desde, fin),
  ])).map((r) => r.results || []);
  const i0 = ini[0] || {};
  const rango = (inicio) => {
    let a = c.desde > inicio ? c.desde : masDias(inicio, 1), z = fin < hoy ? fin : masDias(hoy, -1);
    if (a > z) { a = c.desde > inicio ? c.desde : inicio; z = fin; }
    return { a, z, n: Math.max(1, diasHasta(a, z) + 1) };
  };
  const rv = rango(i0.v || hoy), ru = rango(i0.u || hoy);
  const suma = (zona) => vis.filter((x) => x.zona === zona && x.fecha >= rv.a && x.fecha <= rv.z).reduce((t, x) => t + x.n, 0);
  let ediciones = 0;
  try { ediciones = (await indice(ctx)).filter((f) => f >= c.desde && f <= fin).length; } catch { ediciones = 0; }
  return { portada: suma("portada") / rv.n, diario: suma("diario") / rv.n, unicos: uni.filter((x) => x.fecha >= ru.a && x.fecha <= ru.z).reduce((t, x) => t + x.u, 0) / ru.n,
    clics: Number((cl[0] || {}).n || 0), lectoresClic: Number((cu[0] || {}).u || 0), ediciones, desdeMedido: rv.a > c.desde ? rv.a : c.desde, parcial: rv.a > c.desde };
}
// Muestra solo cifras mayores que cero (un «0 clics» no informa nada); nunca inventa ni redondea hacia arriba.
function correoRenovacion(m, c) {
  const dias = diasHasta(fechaChile(), c.hasta), vence = ddmm(c.hasta);
  const quedan = dias <= 0 ? "vence hoy" : dias === 1 ? "queda 1 día" : `quedan ${dias} días`;
  const nombre = String(c.contacto || "").trim().split(/\s+/)[0] || "";
  const saludo = nombre ? `Hola, ${nombre}:` : "Hola:";
  const asunto = `${c.empresa}: su aviso en Cofrade News vence el ${vence}`.replace(/[\r\n]+/g, " ").slice(0, 150);
  const r0 = (x) => Math.round(x), visitasDia = r0(m.portada + m.diario);
  const cifras = [];
  if (visitasDia >= 1) cifras.push([num(visitasDia, 0), (visitasDia === 1 ? "visita" : "visitas") + " al día, en promedio, entre el sitio web y el diario"]);
  if (r0(m.unicos) >= 1) cifras.push([num(r0(m.unicos), 0), r0(m.unicos) === 1 ? "persona distinta nos lee cada día" : "personas distintas nos leen cada día"]);
  if (m.lectoresClic >= 1) cifras.push([num(m.lectoresClic, 0), m.lectoresClic === 1 ? "clic de un lector en su aviso" : "clics de lectores en su aviso"]);
  if (m.ediciones >= 1) cifras.push([num(m.ediciones, 0), m.ediciones === 1 ? "edición publicada durante su contrato" : "ediciones publicadas durante su contrato"]);
  const filas = [["Sitio web (portada)", r0(m.portada)], ["Diario Cofrade News", r0(m.diario)]].filter((x) => x[1] >= 1);
  const nota = m.parcial ? `Las visitas se miden de esta forma desde el ${ddmm(m.desdeMedido)}: los promedios usan los días completos medidos.` : "Promedios de los días completos de su contrato.";
  const asuntoRenovar = encodeURIComponent(`Renovar el aviso de ${c.empresa}`), cuerpoRenovar = encodeURIComponent(`Hola, queremos renovar nuestro aviso en Cofrade News por 12 meses (UF ${PRECIO_RENOVACION.monto}).`);
  const enlace = `mailto:${CORREO_HOLA}?subject=${asuntoRenovar}&body=${cuerpoRenovar}`;
  const F = "font-family:Arial,Helvetica,sans-serif;", celda = (v, t) => `<td width="50%" valign="top" style="padding:6px"><div style="background:#FBF8F1;border:1px solid #E4DCCB;border-radius:12px;padding:14px 16px">
<div style="${F}font-size:28px;line-height:1.1;font-weight:bold;color:#0B1F3A">${esc(v)}</div><div style="${F}font-size:13.5px;line-height:1.4;color:#5B6472;margin-top:4px">${esc(t)}</div></div></td>`;
  const grilla = cifras.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px">${[0, 2].filter((i) => cifras[i]).map((i) => `<tr>${celda(...cifras[i])}${cifras[i + 1] ? celda(...cifras[i + 1]) : '<td width="50%"></td>'}</tr>`).join("")}</table>` : "";
  const tabla = filas.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${F}font-size:15px;color:#0B1F3A;margin:10px 0 4px;border-collapse:collapse">
<tr><td style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Visitas en promedio</b></td><td align="right" style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Al día</b></td><td align="right" style="padding:8px 6px;border-bottom:2px solid #E4DCCB;color:#5B6472;font-size:13px"><b>Al mes</b></td></tr>
${filas.map(([t, v]) => `<tr><td style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${esc(t)}</td><td align="right" style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${num(v, 0)}</td><td align="right" style="padding:8px 6px;border-bottom:1px solid #EFE8DA">${num(v * 30, 0)}</td></tr>`).join("")}
</table><p style="${F}font-size:12.5px;color:#5B6472;margin:4px 6px 0">${esc(nota)} «Al mes» es el promedio diario por 30.</p>` : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(asunto)}</title></head>
<body style="margin:0;padding:0;background:#F3EEE3"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Su aviso vence el ${esc(vence)}. Le contamos cómo le fue y cómo renovar con un mes de regalo.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E4DCCB;border-radius:16px">
<tr><td style="background:#0B1F3A;padding:22px 28px;border-radius:16px 16px 0 0"><div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#FBF8F1">Cofrade News</div>
<div style="${F}font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D9AE52;margin-top:4px">Su publicidad · aviso de renovación</div></td></tr>
<tr><td style="padding:26px 22px 8px 28px;${F}font-size:16px;line-height:1.6;color:#0B1F3A">
<p style="margin:0 0 14px">${esc(saludo)}</p>
<p style="margin:0 0 14px">Gracias por confiar en Cofrade News. El aviso de <b>${esc(c.empresa)}</b> está vigente hasta el <b>${esc(vence)}</b>: ${esc(quedan)}.</p>
${cifras.length ? `<p style="margin:0 0 6px">Esto logró su marca con nosotros:</p>${grilla}${tabla}` : ""}
</td></tr>
<tr><td style="padding:14px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #D9AE52;border-radius:14px;background:#FFFBF1"><tr><td style="padding:18px 20px;${F}color:#0B1F3A">
<div style="font-size:20px;font-weight:bold;line-height:1.3">Renueve 12 meses por UF&nbsp;${PRECIO_RENOVACION.monto}</div>
<div style="font-size:15px;line-height:1.55;margin:6px 0 14px">Es el precio de 11 meses: el mes 12 se lo regalamos. Su aviso sigue cada mañana en el diario y en la portada de www.cofrad.es.</div>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#B8892B;border-radius:999px"><a href="${esc(enlace)}" style="display:inline-block;padding:13px 26px;${F}font-size:16px;font-weight:bold;color:#1A1406;text-decoration:none">Quiero renovar</a></td></tr></table>
<div style="font-size:13.5px;color:#5B6472;margin-top:10px">O simplemente responda este correo. Si quiere cambiar el texto, el logo o el enlace de su aviso, cuéntenos en la misma respuesta.</div>
</td></tr></table></td></tr>
<tr><td style="padding:18px 28px 26px;${F}font-size:16px;line-height:1.6;color:#0B1F3A">Un saludo cordial,<br><b>Equipo Cofrade News</b><br><a href="${BASE_SITIO}" style="color:#8A6416">www.cofrad.es</a> · ${CORREO_HOLA}</td></tr>
<tr><td style="padding:14px 28px;background:#FBF8F1;border-radius:0 0 16px 16px;${F}font-size:12px;line-height:1.5;color:#5B6472">Cifras medidas por Cofrade News sin cookies: no cuentan robots ni vistas previas. Recibe este correo porque ${esc(c.empresa)} tiene un aviso contratado en Cofrade News.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = [saludo, "", `Gracias por confiar en Cofrade News. El aviso de ${c.empresa} está vigente hasta el ${vence}: ${quedan}.`, "",
    ...(cifras.length ? ["Esto logró su marca con nosotros:", ...cifras.map(([v, t]) => `- ${v} ${t}`), ""] : []),
    ...(filas.length ? ["Visitas en promedio:", ...filas.map(([t, v]) => `- ${t}: ${num(v, 0)} al día, ${num(v * 30, 0)} al mes`), nota + " «Al mes» es el promedio diario por 30.", ""] : []),
    `Renueve 12 meses por UF ${PRECIO_RENOVACION.monto}: es el precio de 11 meses, el mes 12 se lo regalamos.`, "Para renovar, responda este correo.", "",
    "Un saludo cordial,", "Equipo Cofrade News", `www.cofrad.es · ${CORREO_HOLA}`].join("\n");
  return { asunto, html, texto };
}
// Reserva el contrato antes de enviar («enviando:<hora>»): si dos visitas llegan a la vez, solo una envía. Una reserva de más de 15
// minutos (el envío se cortó a medias) se puede volver a tomar.
async function enviarRenovacion(env, ctx, contratoId, modo) {
  const c = await env.DB.prepare(`SELECT c.id, c.anunciante_id, c.desde, c.hasta, c.aviso_enviado, a.empresa, a.contacto, a.email, a.slug
    FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id WHERE c.id = ?`).bind(contratoId).first().catch(() => null);
  if (!c || !EMAIL_OK.test(c.email || "")) return { ok: false, error: "sin-email" };
  const marca = "enviando:" + Date.now(), viejo = Date.now() - 15 * 60000;
  const libre = modo === "auto" ? "(aviso_enviado IS NULL OR (aviso_enviado LIKE 'enviando:%' AND CAST(substr(aviso_enviado, 10) AS INTEGER) < ?3))"
    : "(aviso_enviado IS NULL OR aviso_enviado NOT LIKE 'enviando:%' OR CAST(substr(aviso_enviado, 10) AS INTEGER) < ?3)";
  const res = await env.DB.prepare(`UPDATE contratos SET aviso_enviado = ?1 WHERE id = ?2 AND ${libre}`).bind(marca, contratoId, viejo).run().catch(() => null);
  if (!res || !res.meta || res.meta.changes !== 1) return { ok: false, error: "ocupado" };
  let correo = null, ok = false;
  try {
    correo = correoRenovacion(await metricasContrato(env, ctx, c), c);
    ok = await enviarCorreo(env, { to: c.email, bcc: CORREO_HOLA, subject: correo.asunto, text: correo.texto, html: correo.html });
  } catch { ok = false; }
  const ahora = new Date().toISOString(), antes = c.aviso_enviado && !String(c.aviso_enviado).startsWith("enviando:") ? c.aviso_enviado : null;
  await env.DB.batch([
    env.DB.prepare("UPDATE contratos SET aviso_enviado = ? WHERE id = ? AND aviso_enviado = ?").bind(ok ? ahora : antes, contratoId, marca),
    env.DB.prepare("INSERT INTO correos_anunciantes (fecha, anunciante_id, contrato_id, tipo, para, asunto, estado) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(ahora, c.anunciante_id, contratoId, modo === "auto" ? "renovación (automático)" : "renovación (enviado desde el Panel)", c.email, correo ? correo.asunto : "", ok ? "enviado" : "falló"),
  ]).catch(() => null);
  return { ok };
}
// La revisión corre con las visitas (la cuenta gratis de Cloudflare no tiene más relojes): como mucho una vez por hora, entre las 9:00 y
// las 20:59 de Chile, para que el correo llegue en horario de oficina. Un correo fallido se reintenta la hora siguiente (máximo 3 al día).
let REVISION_HECHA = "";
async function revisarRenovaciones(env, ctx, ahora = Date.now()) {
  try {
    if (!env.DB || !hayCorreo(env)) return "sin correo";
    const [a, b] = String(env.AVISOS_HORAS || "9-20").split("-").map(Number), h = horaDeChile(ahora);
    if (Number.isFinite(a) && Number.isFinite(b) && (h < a || h > b)) return "fuera de horario";
    const hoy = fechaChile(new Date(ahora)), clave = hoy + "T" + String(h).padStart(2, "0");
    if (REVISION_HECHA === clave) return "ya revisado";
    REVISION_HECHA = clave;
    const r = await env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('anuncios_revision', ?1) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor WHERE config.valor < ?1").bind(clave).run();
    if (!r || !r.meta || r.meta.changes !== 1) return "ya revisado";
    const lista = (await env.DB.prepare(`SELECT c.id FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id
      WHERE a.estado = 'activo' AND c.hasta >= ?1 AND c.hasta <= ?2
        AND (c.aviso_enviado IS NULL OR (c.aviso_enviado LIKE 'enviando:%' AND CAST(substr(c.aviso_enviado, 10) AS INTEGER) < ?3))
        AND NOT EXISTS (SELECT 1 FROM contratos d WHERE d.anunciante_id = c.anunciante_id AND d.hasta > c.hasta)
        AND (SELECT COUNT(*) FROM correos_anunciantes e WHERE e.contrato_id = c.id AND e.estado = 'falló' AND e.fecha >= ?4) < 3
      ORDER BY c.hasta LIMIT 5`).bind(hoy, masDias(hoy, 7), ahora - 15 * 60000, new Date(ahora - 86400000).toISOString()).all()).results || [];
    let enviados = 0;
    for (const x of lista) if ((await enviarRenovacion(env, ctx, x.id, "auto")).ok) enviados++;
    return "enviados:" + enviados;
  } catch { return "error"; }
}

// ===== 5. Panel de Control =====
function periodoPanel(u) {
  const hoy = fechaChile(), anioHoy = Number(hoy.slice(0, 4));
  let anio = Number(u.searchParams.get("anio")) || 0, mes = Number(u.searchParams.get("mes")) || 0;
  const s = String(u.searchParams.get("seccion") || ""), seccion = Object.prototype.hasOwnProperty.call(NOMBRE_SECCION, s) ? s : "";
  if (!(anio >= 2026 && anio <= anioHoy)) anio = 0;
  if (!anio || !(mes >= 1 && mes <= 12)) mes = 0;
  let desde, hasta, etiqueta;
  if (!anio) { desde = masDias(hoy, -29); hasta = hoy; etiqueta = "Últimos 30 días"; }
  else if (mes) { desde = `${anio}-${String(mes).padStart(2, "0")}-01`; const f = finDeMes(anio, mes); hasta = f < hoy ? f : hoy; etiqueta = `${NOMBRES_MES[mes - 1].replace(/^./, (x) => x.toUpperCase())} de ${anio}`; }
  else { desde = `${anio}-01-01`; hasta = `${anio}-12-31` < hoy ? `${anio}-12-31` : hoy; etiqueta = `Año ${anio}`; }
  const futuro = desde > hoy;
  if (futuro) hasta = desde;
  const largo = diasHasta(desde, hasta) + 1;
  let antDesde, antHasta;   // período anterior del mismo largo, para comparar
  if (mes) { antDesde = mes === 1 ? `${anio - 1}-12-01` : `${anio}-${String(mes - 1).padStart(2, "0")}-01`; antHasta = masDias(antDesde, largo - 1); }
  else if (anio) { antDesde = `${anio - 1}-01-01`; antHasta = masDias(antDesde, largo - 1); }
  else { antHasta = masDias(desde, -1); antDesde = masDias(antHasta, -(largo - 1)); }
  return { hoy, anio, mes, seccion, desde, hasta, etiqueta, antDesde, antHasta, futuro, largo, agrupar: largo > 62 ? "mes" : "dia" };
}
function qsPanel(P, cambios = {}) {   // conserva los filtros en los enlaces
  const p = new URLSearchParams();
  if (P.anio) p.set("anio", String(P.anio));
  if (P.mes) p.set("mes", String(P.mes));
  if (P.seccion) p.set("seccion", P.seccion);
  for (const [k, v] of Object.entries(cambios)) { if (v) p.set(k, String(v)); else p.delete(k); }
  const t = p.toString();
  return t ? "?" + t : "";
}
function limpiarQ(t) {   // los filtros que vuelven del formulario: solo año, mes y sección válidos
  return qsPanel(periodoPanel(new URL("https://x/panel?" + String(t || "").replace(/^\?/, "").slice(0, 200))));
}
async function datosTablero(env, P) {
  const s = (sql, ...b) => env.DB.prepare(sql).bind(...b), d = P.desde, h = P.hasta, sec = P.seccion ? [P.seccion] : [];
  const lista = {
    vistas: s("SELECT fecha, zona, n FROM vistas WHERE fecha BETWEEN ? AND ?", d, h),
    unicosZona: s("SELECT fecha, CASE WHEN ruta = '/' THEN 'portada' WHEN ruta LIKE '/edicion/%' THEN 'diario' ELSE 'otras' END AS zona, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha, zona", d, h),
    unicos: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", d, h),
    secciones: s("SELECT seccion, SUM(segundos) AS s, SUM(vistas) AS v FROM lectura WHERE fecha BETWEEN ? AND ? GROUP BY seccion", d, h),
    lecturaDia: s(`SELECT fecha, SUM(segundos) AS s, SUM(vistas) AS v FROM lectura WHERE fecha BETWEEN ? AND ?${sec.length ? " AND seccion = ?" : ""} GROUP BY fecha`, d, h, ...sec),
    ediciones: sec.length ? s("SELECT ruta, SUM(segundos) AS n FROM lectura WHERE fecha BETWEEN ? AND ? AND seccion = ? GROUP BY ruta ORDER BY n DESC LIMIT 10", d, h, ...sec)
      : s("SELECT ruta, COUNT(*) AS n FROM visitas WHERE fecha BETWEEN ? AND ? AND ruta LIKE '/edicion/%' GROUP BY ruta ORDER BY n DESC LIMIT 10", d, h),
    paises: s("SELECT pais, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY pais ORDER BY u DESC LIMIT 10", d, h),
    dims: s("SELECT hora, origen, disp, SUM(n) AS n FROM dimensiones WHERE fecha BETWEEN ? AND ? GROUP BY hora, origen, disp", d, h),
    sitios: s("SELECT host, SUM(n) AS n FROM referentes WHERE fecha BETWEEN ? AND ? GROUP BY host ORDER BY n DESC LIMIT 10", d, h),
    clics: s("SELECT slug, SUM(n) AS n FROM clics WHERE fecha BETWEEN ? AND ? GROUP BY slug", d, h),
    clicsU: s("SELECT slug, COUNT(*) AS u FROM clics_unicos WHERE fecha BETWEEN ? AND ? GROUP BY slug", d, h),
    clicsDia: s("SELECT slug, fecha, SUM(n) AS n FROM clics WHERE fecha >= ? AND slug NOT LIKE 'm-%' GROUP BY slug, fecha", masDias(P.hoy, -1100)),
    antVistas: s("SELECT fecha, SUM(n) AS n FROM vistas WHERE zona IN ('portada', 'diario') AND fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antUnicos: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antDiario: s("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE ruta LIKE '/edicion/%' AND fecha BETWEEN ? AND ? GROUP BY fecha", P.antDesde, P.antHasta),
    antLectura: s(`SELECT fecha, SUM(segundos) AS s FROM lectura WHERE fecha BETWEEN ? AND ?${sec.length ? " AND seccion = ?" : ""} GROUP BY fecha`, P.antDesde, P.antHasta, ...sec),
    inicios: env.DB.prepare("SELECT (SELECT MIN(fecha) FROM vistas) AS vistas, (SELECT MIN(fecha) FROM visitas) AS visitas, (SELECT MIN(fecha) FROM dimensiones) AS dims, (SELECT MIN(fecha) FROM lectura) AS lectura, (SELECT MIN(fecha) FROM clics) AS clics"),
    hoyU: s("SELECT COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha = ?", P.hoy),
    hoyV: s("SELECT COALESCE(SUM(n), 0) AS n FROM vistas WHERE fecha = ? AND zona IN ('portada', 'diario')", P.hoy),
    // 16-11-2026: ícono de Cofrade News (acceso directo); consultas aparte: si faltara la tabla, solo faltan estas cifras
    icono: s("SELECT evento, aparato, SUM(n) AS n FROM instalaciones WHERE fecha BETWEEN ? AND ? GROUP BY evento, aparato", d, h),
    antIcono: s("SELECT evento, SUM(n) AS n FROM instalaciones WHERE fecha BETWEEN ? AND ? GROUP BY evento", P.antDesde, P.antHasta),
    iconoTot: env.DB.prepare("SELECT evento, SUM(n) AS n, MIN(fecha) AS desde FROM instalaciones GROUP BY evento"),
    anunciantes: env.DB.prepare(`SELECT a.id, a.slug, a.empresa, a.rut, a.rubro, a.contacto, a.email, a.telefono, a.web, a.titulo, a.texto, a.boton1_texto, a.boton1_web, a.boton2_texto,
      a.boton2_web, a.boton2_email, a.banner, a.orden, a.color_fondo, a.color_acento, a.logo_url, a.estado, a.notas, a.creado, l.tipo AS logo_tipo, l.version AS logo_v
      FROM anunciantes a LEFT JOIN logos_anuncios l ON l.anunciante_id = a.id ORDER BY a.estado = 'archivado', a.empresa`),
    contratos: env.DB.prepare("SELECT id, anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, aviso_enviado, creado FROM contratos ORDER BY desde, id"),
    correos: env.DB.prepare("SELECT id, fecha, anunciante_id, tipo, para, asunto, estado FROM correos_anunciantes ORDER BY id DESC LIMIT 20"),
    bz: env.DB.prepare("SELECT * FROM buzon ORDER BY id DESC LIMIT 500"),
    bzTot: env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(verificado), 0) AS ver FROM buzon"),
    socios: env.DB.prepare("SELECT estado, COUNT(*) AS n FROM usuarios GROUP BY estado"),
    pulso: env.DB.prepare("SELECT valor FROM config WHERE clave = 'pulso_resultado'"),
  };
  const claves = Object.keys(lista), R = {};
  try {   // una sola consulta a la base (D1 cuenta un «batch» como una): el panel queda lejos del tope de consultas por visita
    const res = await env.DB.batch(claves.map((k) => lista[k]));
    claves.forEach((k, i) => { R[k] = (res[i] && res[i].results) || []; });
  } catch {   // si una tabla falla (p. ej. falta crearla), se leen una por una y lo que falle queda vacío
    const res = await Promise.all(claves.map((k) => lista[k].all().then((r) => r.results || []).catch(() => [])));
    claves.forEach((k, i) => { R[k] = res[i]; });
    R.parcial = true;
  }
  return R;
}
// Promedio diario sobre los días completos: después del primer día de la medición (empezó a medias) y antes de hoy (va en curso).
function promedioCompleto(porDia, desde, hasta, inicio, hoy) {
  if (!inicio) return { prom: null, dias: 0 };
  const a0 = desde > inicio ? desde : masDias(inicio, 1), z0 = hasta < hoy ? hasta : masDias(hoy, -1);
  let a = a0, z = z0;
  if (a > z) { a = desde > inicio ? desde : inicio; z = hasta; }
  if (a > z) return { prom: null, dias: 0 };
  const n = diasHasta(a, z) + 1;
  let t = 0;
  for (const [f, v] of Object.entries(porDia)) if (f >= a && f <= z) t += v;
  return { prom: t / n, dias: n, total: t };
}
function deltaTxt(ahora, antes) {
  if (ahora === null || antes === null || antes === undefined || !(antes > 0)) return "";
  const v = (ahora - antes) / antes * 100;
  if (Math.abs(v) < 0.5) return `<span class="delta igual">= Igual que el período anterior</span>`;
  return `<span class="delta ${v > 0 ? "sube" : "baja"}">${v > 0 ? "▲ +" : "▼ −"}${pctTxt(Math.abs(v))} vs. el período anterior</span>`;
}
const kpiA = (titulo, valor, sub, ayuda, extra = "") => `<div class="cifra" tabindex="0" data-ayuda="${esc(ayuda)}"><small>${esc(titulo)}</small><b>${valor}</b>${sub ? `<br><small>${esc(sub)}</small>` : ""}${extra}</div>`;
const tarjetaG = (id, titulo, ayuda, { ancha = false, alto = 0, vacio = "Sin datos en este período.", nota = "" } = {}) =>
  `<div class="tarjeta${ancha ? " ancha" : ""}"><h4 class="kicker tit-g" tabindex="0" data-ayuda="${esc(ayuda)}">${esc(titulo)}</h4><div class="graf" id="g-${id}" role="img" aria-label="${esc(titulo)}" data-vacio="${esc(vacio)}"${alto ? ` style="height:${alto}px"` : ""}></div>${nota ? `<p class="nota-g">${esc(nota)}</p>` : ""}</div>`;
let _PAISES = null;
function nombrePais(c) {
  if (!c) return "Sin país";
  try { _PAISES = _PAISES || new Intl.DisplayNames(["es"], { type: "region" }); return _PAISES.of(c) || c; } catch { return c; }
}
const fechaRuta = (r) => { const m = String(r || "").match(/(\d{4}-\d{2}-\d{2})/); return m ? ddmm(m[1]) : r; };
const MSG_ANUNCIOS = { creado: ["ok", "Anunciante agregado. Su aviso ya entra en el carrusel de la portada."], editado: ["ok", "Cambios guardados."],
  renovado: ["ok", "Renovación registrada."], pausado: ["ok", "Aviso en pausa: deja de salir en la portada y en el diario hasta que lo reactives."],
  reactivado: ["ok", "Aviso reactivado."], archivado: ["ok", "Anunciante archivado. Sigue guardado abajo, en «Archivados»."], "contrato-borrado": ["ok", "Contrato borrado."],
  enviado: ["ok", `Correo de renovación enviado, con copia a ${CORREO_HOLA}.`],
  "no-enviado": ["mal", "No se pudo enviar el correo. Revisa que el email del anunciante esté bien escrito y vuelve a intentarlo en unos minutos."],
  ocupado: ["mal", "Ese correo se está enviando en este momento. Espera un minuto y recarga el panel."], "sin-email": ["mal", "El anunciante no tiene un email válido."],
  "sin-contrato": ["mal", "Ese anunciante no tiene contratos."], "no-existe": ["mal", "Ese anunciante ya no existe."], "muy-grande": ["mal", "El formulario pesa demasiado: el logo debe ser de 300 KB o menos."],
  formulario: ["mal", "No se pudo leer el formulario. Inténtalo de nuevo."], "sin-base": ["mal", "Falta la base de datos."] };
const CAMPO_ERROR = { empresa: "Empresa (al menos 2 letras)", contacto: "Persona de contacto", email: "Email de contacto (revisa que esté bien escrito)", telefono: "Teléfono (solo números, espacios, +, guiones y paréntesis)",
  rut: "RUT (el dígito verificador no calza)", web: "Sitio web", titulo: "Título del aviso (al menos 2 letras)", boton1_web: "Enlace del botón 1 (una dirección web, por ejemplo https://www.empresa.cl)",
  boton2: "Botón 2 (una dirección web o un email)", desde: "Desde (fecha de inicio)", hasta: "Hasta (debe ser igual o posterior a «Desde», y hasta 3 años)", monto: "Monto pagado",
  fecha_pago: "Fecha de pago", "logo-grande": "Logo (debe pesar 300 KB o menos)", "logo-tipo": "Logo (debe ser PNG, JPG o WebP)" };
function mensajeAnuncios(r) {
  if (!r) return "";
  const m = String(r).match(/^error:([\w-]+)$/);
  const [tipo, txt] = m ? ["mal", `No se guardó: revisa el campo «${CAMPO_ERROR[m[1]] || m[1]}».`] : MSG_ANUNCIOS[r] || ["", ""];
  return txt ? `<p class="${tipo === "ok" ? "aviso-ok" : "aviso-mal"}" role="${tipo === "ok" ? "status" : "alert"}">${esc(txt)}</p>` : "";
}

const AYUDA = {
  instalaciones: "Cuántas veces un lector instaló Cofrade News como ícono en su teléfono, tablet o computador durante el período. En Android y en computadores con Chrome o Edge se cuenta en el momento de instalar; en iPhone, iPad y Mac, la primera vez que se abre desde el ícono (esos aparatos no avisan al instalar). Cada aparato cuenta una vez, salvo que borre los datos del navegador. No cuentan robots ni redes de nubes.",
  aperturas: "Cuántas veces se abrió Cofrade News tocando el ícono instalado: una por cada sesión de lectura. Es la señal más clara de lectores fieles, porque llegan directo, sin buscar el sitio ni depender de un enlace. Sirve también como argumento de alcance ante los anunciantes.",
  visitas: "Cuántas veces se abrieron la portada (el sitio web) y el diario en el período. Si una persona abre la página 3 veces, son 3 visitas. No cuentan robots, buscadores, vistas previas de WhatsApp o Telegram ni programas que entran desde redes de nubes (Amazon, Google, Microsoft). La comparación usa el promedio por día de días completos.",
  unicos: "Personas distintas que entraron cada día, en promedio. Cada persona se reconoce por su conexión (IP) y su navegador, y cuenta una sola vez por día aunque abra muchas páginas. No cuentan los robots que entran desde redes de nubes. La IP no se guarda: queda una huella anónima que cambia cada día; por eso la cifra es por día y no se suma entre días. Promedia solo días completos (no cuenta hoy, que va en curso).",
  diario: "Personas distintas que abrieron alguna edición del diario Cofrade News cada día, en promedio: es la audiencia del newsletter en la web. Promedia solo días completos.",
  paginas: "Cuántas veces abre el sitio cada persona en un día, en promedio (visitas divididas por visitantes únicos). Más de 1,5 indica que la gente vuelve o pasa de la portada al diario: buena señal de interés.",
  minutos: "Tiempo promedio que cada lector del diario pasa leyendo. Se mide solo mientras una sección está en el centro de la pantalla y la pestaña está a la vista, así que es tiempo de lectura real, no tiempo con la página abierta.",
  minutosSec: "Minutos que cada lector del diario dedicó, en promedio, a la sección elegida en el filtro. Se mide solo mientras esa sección está en el centro de la pantalla.",
  seccion: "La sección del diario donde los lectores pasaron más tiempo en el período y qué parte del tiempo total de lectura se llevó. Sirve para decidir qué secciones potenciar y dónde conviene ubicar la publicidad.",
  seccionSel: "Tiempo total que los lectores pasaron en la sección elegida, qué parte del tiempo total de lectura se llevó y en qué lugar quedó entre todas las secciones.",
  hora: "La hora del día (hora de Chile) en que llegan más visitas. Sirve para elegir a qué hora publicar o compartir la edición en redes y grupos.",
  celular: "Qué parte de las visitas llega desde un celular. Si casi todo es celular, conviene revisar primero cómo se ven el diario y los avisos en el teléfono.",
  origen: "De dónde llega la mayor parte de las visitas. «Directo o desde una app» incluye a quien escribe la dirección, usa un favorito o abre un enlace desde WhatsApp o Telegram, que no informan de dónde viene la visita.",
  hoy: "Personas distintas que han entrado hoy a cualquier página del sitio, desde las 00:00 de Chile. Se actualiza cada vez que abres o recargas el panel.",
  vigentes: "Empresas que pagaron publicidad y cuyo contrato cubre el día de hoy. Sus avisos salen en el diario y en el carrusel de la portada. No incluye tus marcas propias, que son permanentes.",
  vencen: "Contratos que terminan en los próximos 30 días. Siete días antes del vencimiento, el panel envía solo un correo de renovación al anunciante, con copia a hola@cofrad.es, y lo anota abajo.",
  ingresos: "Lo que pagaron los anunciantes en el período, según la fecha de pago anotada en cada contrato. Se muestra en la moneda en que se pactó (UF o pesos).",
  clics: "Veces que los lectores tocaron un aviso pagado para ir a la web o escribir al anunciante. Abajo, cuántas personas distintas lo hicieron (cada persona cuenta una vez por día). No cuentan robots ni escáneres de correo.",
  tendencia: "Barras: visitas a la portada y al diario. Línea: personas distintas en todo el sitio. Pasa el cursor (o toca) cada barra para ver los números exactos de ese día.",
  tendenciaMes: "Barras: visitas a la portada y al diario de cada mes. Línea: personas distintas por día, en promedio, de ese mes. Pasa el cursor (o toca) cada mes para ver los números exactos.",
  horas: "Visitas según la hora del día en que llegaron (hora de Chile). La barra dorada es la hora con más visitas: un buen momento para compartir la edición.",
  origenG: "De dónde llegan las visitas: directo o desde una app (WhatsApp y Telegram no informan de dónde viene la visita), desde otra página del sitio, buscadores, redes sociales, correo, asistentes de inteligencia artificial u otros sitios.",
  disp: "Desde qué aparato se abren las visitas: celular, computador o tablet, según el navegador de cada visita.",
  semana: "Personas distintas en promedio según el día de la semana: muestra qué días se lee más, para elegir cuándo lanzar novedades o publicidad. Con menos de dos semanas de datos es solo orientativo.",
  secciones: "Minutos totales de lectura de cada sección del diario. Toca una barra (o un cuadro del mapa de calor) para filtrar el panel por esa sección.",
  seccionDia: "Minutos de lectura por día y cuántas veces se leyó (una lectura es cuando la sección estuvo al menos 3 segundos en el centro de la pantalla).",
  ediciones: "Las ediciones del diario con más lectores en el período (cada persona cuenta una vez por día).",
  edicionesSec: "Las ediciones donde los lectores pasaron más minutos en la sección elegida.",
  paises: "Desde qué país se conectan los visitantes, según su red (sin datos personales).",
  sitios: "Sitios web que enviaron visitantes con un enlace. Las apps como WhatsApp o Telegram no aparecen aquí porque no informan de dónde viene la visita.",
  calor: "Cada cuadro es una sección del diario: más dorado, más tiempo de lectura. Toca un cuadro para filtrar todo el panel por esa sección; tócalo otra vez para quitar el filtro.",
  clicsG: "Clics de los lectores en cada aviso pagado durante el período: el total y cuántas personas distintas hicieron clic (una vez por día).",
};

async function panel(req, env) {
  if (!(await esAdmin(req, env))) return paginaPanelLogin("", 200, env);
  if (!env.DB) return html(marco({ titulo: "Panel", descripcion: "", cuerpo: `<section style="border:0"><h1>Falta la base de datos.</h1></section>` }), 503);
  const u = new URL(req.url), P = periodoPanel(u);
  await revisarConcurso(env).catch(() => null);   // 20-11-2026: borrados de las bases y sorteo de respaldo también desde el Panel
  const [R, fundadores, cont, difusion, concurso, podcast, republica] = await Promise.all([datosTablero(env, P), panelSocios(env, u).catch(() => ""), contadorVisitas(env, masDias(P.hoy, -29)),
    seccionDifusion(env, u).catch(() => `<section id="difusion"><h3>Difusión y menciones</h3><p class="aviso">No se pudo leer esta sección. Intenta de nuevo en un momento.</p></section>`),   // 20-11-2026
    seccionConcurso(env, u).catch(() => `<section id="concurso"><h3>Concurso «Comparte Cofrade News»</h3><p class="aviso">No se pudo leer esta sección. Intenta de nuevo en un momento.</p></section>`),
    seccionPodcast(env, u).catch(() => `<section id="podcast"><h3>Podcast diario</h3><p class="aviso">No se pudo leer esta sección. Intenta de nuevo en un momento.</p></section>`),
    seccionRepublica(env)]);   // 23-11-2026: sitios que republican   // 20-11-2026
  const ini = R.inicios[0] || {}, sec = P.seccion, nomSec = sec ? NOMBRE_SECCION[sec] : "";
  // --- series por día ---
  const dias = [], primero = [ini.visitas, ini.vistas].filter(Boolean).sort()[0] || P.hoy;
  for (let f = P.desde; f <= P.hasta; f = masDias(f, 1)) dias.push(f);
  const diasG = dias.filter((f) => f >= primero), diasL = dias.filter((f) => ini.lectura && f >= ini.lectura);   // los gráficos parten el primer día medido
  const porDia = (filas, campo, filtro = () => true) => { const o = {}; filas.forEach((x) => { if (filtro(x)) o[x.fecha] = (o[x.fecha] || 0) + Number(x[campo] || 0); }); return o; };
  const pv = porDia(R.vistas, "n", (x) => x.zona === "portada"), dv = porDia(R.vistas, "n", (x) => x.zona === "diario");
  const vt = porDia(R.vistas, "n", (x) => x.zona === "portada" || x.zona === "diario"), su = porDia(R.unicos, "u"), du = porDia(R.unicosZona, "u", (x) => x.zona === "diario");
  const lecS = porDia(R.lecturaDia, "s"), lecV = porDia(R.lecturaDia, "v");
  // --- KPIs de audiencia ---
  const pVis = promedioCompleto(vt, P.desde, P.hasta, ini.vistas, P.hoy), pUni = promedioCompleto(su, P.desde, P.hasta, ini.visitas, P.hoy), pDia = promedioCompleto(du, P.desde, P.hasta, ini.visitas, P.hoy);
  const aVis = promedioCompleto(porDia(R.antVistas, "n"), P.antDesde, P.antHasta, ini.vistas, P.hoy), aUni = promedioCompleto(porDia(R.antUnicos, "u"), P.antDesde, P.antHasta, ini.visitas, P.hoy);
  const aDia = promedioCompleto(porDia(R.antDiario, "u"), P.antDesde, P.antHasta, ini.visitas, P.hoy);
  const totalVis = Object.values(vt).reduce((a, x) => a + x, 0), nubeTot = R.vistas.filter((x) => x.zona === "nube").reduce((a, x) => a + Number(x.n || 0), 0);
  const diasConVistas = dias.filter((f) => ini.vistas && f >= ini.vistas);
  const visConVistas = diasConVistas.reduce((a, f) => a + (vt[f] || 0), 0), uniConVistas = diasConVistas.reduce((a, f) => a + (su[f] || 0), 0);
  const lecDias = dias.filter((f) => ini.lectura && f >= ini.lectura), segTot = lecDias.reduce((a, f) => a + (lecS[f] || 0), 0), lecDiario = lecDias.reduce((a, f) => a + (du[f] || 0), 0);
  const aLecS = porDia(R.antLectura, "s"), aLecU = porDia(R.antDiario, "u"), aSeg = Object.values(aLecS).reduce((a, x) => a + x, 0), aLecDiario = Object.keys(aLecS).reduce((a, f) => a + (aLecU[f] || 0), 0);
  const minLector = lecDiario ? segTot / 60 / lecDiario : null, aMinLector = aLecDiario ? aSeg / 60 / aLecDiario : null;
  const secs = R.secciones.filter((x) => NOMBRE_SECCION[x.seccion]).map((x) => ({ id: x.seccion, nombre: NOMBRE_SECCION[x.seccion], s: Number(x.s || 0), v: Number(x.v || 0) })).sort((a, b) => b.s - a.s);
  const segSecciones = secs.reduce((a, x) => a + x.s, 0), top = secs[0], selS = sec ? secs.find((x) => x.id === sec) : null, rankSel = selS ? secs.indexOf(selS) + 1 : 0;
  const horas = new Array(24).fill(0), org = {}, disp = {};
  R.dims.forEach((x) => { const n = Number(x.n || 0); if (x.hora >= 0 && x.hora < 24) horas[x.hora] += n; org[x.origen] = (org[x.origen] || 0) + n; disp[x.disp] = (disp[x.disp] || 0) + n; });
  const totDims = horas.reduce((a, x) => a + x, 0), horaTop = totDims ? horas.indexOf(Math.max(...horas)) : -1;
  const orgOrden = Object.entries(org).sort((a, b) => b[1] - a[1]);
  const tiempo = (s) => (s < 60 ? `${num(s, 0)} s` : s < 36000 ? `${num(s / 60, s < 600 ? 1 : 0)} min` : `${num(s / 3600, 1)} h`);
  const hoyU = Number((R.hoyU[0] || {}).u || 0), hoyV = Number((R.hoyV[0] || {}).n || 0);
  const desdeTxt = (f) => (f && f > P.desde ? ` · se mide desde el ${ddmm(f)}` : "");
  // --- ícono de Cofrade News (16-11-2026): instalaciones y aperturas, con su desglose por aparato ---
  const icoN = (filas, ev) => (filas || []).filter((x) => x.evento === ev).reduce((a, x) => a + Number(x.n || 0), 0);
  const icoAparatos = (ev) => { const o = {}; (R.icono || []).filter((x) => x.evento === ev).forEach((x) => { o[x.aparato] = (o[x.aparato] || 0) + Number(x.n || 0); });
    return ["celular", "computador", "tablet"].filter((k) => o[k]).map((k) => `${k} ${num(o[k], 0)}`).join(" · "); };
  const icoIni = (R.iconoTot || []).map((x) => x.desde).filter(Boolean).sort()[0] || null;
  const inst = icoN(R.icono, "instalada"), aper = icoN(R.icono, "apertura"), instTot = icoN(R.iconoTot, "instalada");
  const icoSub = (n, ev, vacio) => (n ? icoAparatos(ev) : icoIni ? vacio : "se empieza a medir con esta versión") + desdeTxt(icoIni);
  const kAud = [
    kpiA("Visitas en el período", num(totalVis, 0), pVis.prom !== null ? `≈ ${num(Math.round(pVis.prom), 0)} al día${desdeTxt(ini.vistas)}` : "Aún sin visitas medidas", AYUDA.visitas, deltaTxt(pVis.prom, aVis.prom)),
    kpiA("Visitantes únicos al día", pUni.prom === null ? "Sin datos" : num(Math.round(pUni.prom), 0), "promedio de días completos" + desdeTxt(ini.visitas), AYUDA.unicos, deltaTxt(pUni.prom, aUni.prom)),
    kpiA("Lectores del diario al día", pDia.prom === null ? "Sin datos" : num(Math.round(pDia.prom), 0), "personas distintas que abren una edición", AYUDA.diario, deltaTxt(pDia.prom, aDia.prom)),
    kpiA("Visitas por visitante", uniConVistas ? num(visConVistas / uniConVistas, 2) : "Sin datos", "veces que cada persona abre el sitio en un día", AYUDA.paginas),
    kpiA(sec ? `Minutos por lector en ${nomSec}` : "Minutos de lectura por lector", minLector === null ? "Sin datos" : num(minLector, 1) + " min", sec ? "promedio por lector del diario" : "promedio por lector del diario y por día", sec ? AYUDA.minutosSec : AYUDA.minutos, deltaTxt(minLector, aMinLector)),
    sec ? kpiA(`Lectura de ${nomSec}`, selS ? tiempo(selS.s) : "Sin lecturas", selS && segSecciones ? `${pctTxt(selS.s / segSecciones * 100)} del tiempo total · lugar ${rankSel} de ${secs.length}` : "en el período", AYUDA.seccionSel)
      : kpiA("Sección más leída", top ? esc(top.nombre) : "Sin lecturas", top && segSecciones ? `${tiempo(top.s)} · ${pctTxt(top.s / segSecciones * 100)} del tiempo de lectura` : "aún sin datos", AYUDA.seccion),
    kpiA("Hora con más visitas", horaTop >= 0 ? `${String(horaTop).padStart(2, "0")}:00 a ${String((horaTop + 1) % 24).padStart(2, "0")}:00` : "Sin datos", horaTop >= 0 ? `${cuantos(horas[horaTop], "visita", "visitas")} en esa hora${desdeTxt(ini.dims)}` : "se empieza a medir con esta versión", AYUDA.hora),
    kpiA("Desde celular", totDims ? pctTxt((disp.celular || 0) / totDims * 100) : "Sin datos", totDims ? `computador ${pctTxt((disp.computador || 0) / totDims * 100)} · tablet ${pctTxt((disp.tablet || 0) / totDims * 100)}` : "se empieza a medir con esta versión", AYUDA.celular),
    kpiA("Origen principal", orgOrden.length ? esc(ORIGENES[orgOrden[0][0]] || orgOrden[0][0]) : "Sin datos", orgOrden.length ? `${pctTxt(orgOrden[0][1] / totDims * 100)} de las visitas` : "se empieza a medir con esta versión", AYUDA.origen),
    kpiA("Lectores hoy", num(hoyU, 0), cuantos(hoyV, "visita", "visitas") + " a la portada y al diario", AYUDA.hoy),
    kpiA("Instalaciones del ícono", num(inst, 0), icoSub(inst, "instalada", "ninguna en el período") + (instTot > inst ? ` · ${num(instTot, 0)} en total` : ""), AYUDA.instalaciones, deltaTxt(inst, icoN(R.antIcono, "instalada"))),
    kpiA("Aperturas desde el ícono", num(aper, 0), icoSub(aper, "apertura", "ninguna en el período"), AYUDA.aperturas, deltaTxt(aper, icoN(R.antIcono, "apertura"))),
  ].join("");
  // --- datos de los gráficos ---
  const parcial = (f) => f === P.hoy || f === ini.vistas || f === ini.visitas;
  let ten;
  if (P.agrupar === "mes") {
    const meses = {};
    diasG.forEach((f) => { const k = f.slice(0, 7), m = (meses[k] = meses[k] || { pv: 0, dv: 0, su: 0, d: 0, medido: false }); m.pv += pv[f] || 0; m.dv += dv[f] || 0; if (su[f]) { m.su += su[f]; m.d++; } if (ini.vistas && f >= ini.vistas) m.medido = true; });
    const ks = Object.keys(meses).sort();
    ten = { x: ks.map((k) => NOMBRES_MES[Number(k.slice(5)) - 1].slice(0, 3) + " " + k.slice(0, 4)), pv: ks.map((k) => (meses[k].medido ? meses[k].pv : null)), dv: ks.map((k) => (meses[k].medido ? meses[k].dv : null)),
      su: ks.map((k) => (meses[k].d ? Math.round(meses[k].su / meses[k].d) : null)), parcial: [] };
  } else {
    ten = { x: diasG.map((f) => f.slice(8, 10) + "-" + f.slice(5, 7)), pv: diasG.map((f) => (ini.vistas && f >= ini.vistas ? pv[f] || 0 : null)), dv: diasG.map((f) => (ini.vistas && f >= ini.vistas ? dv[f] || 0 : null)),
      su: diasG.map((f) => (ini.visitas && f >= ini.visitas ? su[f] || 0 : null)), parcial: diasG.map((f, i) => (parcial(f) ? i : -1)).filter((i) => i >= 0) };
  }
  const sem = [0, 0, 0, 0, 0, 0, 0], semN = [0, 0, 0, 0, 0, 0, 0];
  dias.forEach((f) => { if (!ini.visitas || f <= ini.visitas || f >= P.hoy) return; const w = (new Date(f + "T12:00:00Z").getUTCDay() + 6) % 7; sem[w] += su[f] || 0; semN[w]++; });
  const diasSemana = semN.reduce((a, x) => a + x, 0);
  const anun = R.anunciantes, nomPorSlug = {};
  anun.forEach((a) => { nomPorSlug[a.slug] = a.empresa; });
  const clicsSlug = {}, clicsUSlug = {};
  R.clics.forEach((x) => { clicsSlug[x.slug] = Number(x.n || 0); });
  R.clicsU.forEach((x) => { clicsUSlug[x.slug] = Number(x.u || 0); });
  const clicsPagados = Object.keys(clicsSlug).filter((s) => !s.startsWith("m-") && nomPorSlug[s]).map((s) => [nomPorSlug[s], clicsSlug[s], clicsUSlug[s] || 0]).sort((a, b) => b[1] - a[1]);
  const D = {
    agrupar: P.agrupar, ten, horas, totDims,
    origen: orgOrden.map(([k, n]) => [ORIGENES[k] || k, n]), disp: Object.entries(disp).sort((a, b) => b[1] - a[1]).map(([k, n]) => [DISPOSITIVOS[k] || k, n]),
    semana: sem.map((t, i) => (semN[i] ? Math.round(t / semN[i]) : null)), diasSemana, dsem: DIAS_SEMANA,
    secciones: secs.map((x) => [x.id, x.nombre, Math.round(x.s / 6) / 10, x.v]), sel: sec,
    secDia: { x: diasL.map((f) => f.slice(8, 10) + "-" + f.slice(5, 7)), min: diasL.map((f) => Math.round((lecS[f] || 0) / 6) / 10), v: diasL.map((f) => lecV[f] || 0) },
    ediciones: R.ediciones.map((x) => [fechaRuta(x.ruta), sec ? Math.round(Number(x.n || 0) / 6) / 10 : Number(x.n || 0)]), edTipo: sec ? "min" : "lect",
    paises: R.paises.map((x) => [nombrePais(x.pais), Number(x.u || 0)]), sitios: R.sitios.map((x) => [x.host, Number(x.n || 0)]), clics: clicsPagados,
  };
  const notaDims = ini.dims ? (ini.dims > P.desde ? `Horas, origen y aparato se miden desde el ${ddmm(ini.dims)}.` : "") : "Horas, origen y aparato se empiezan a medir con esta versión del sitio.";
  const vacioDims = ini.dims ? "Sin visitas medidas en este período." : "Se empieza a medir con esta versión del sitio: vuelve mañana.";
  const notaTen = (ini.vistas && ini.vistas > P.desde ? `Las visitas se cuentan desde el ${ddmm(ini.vistas)}; antes solo se registraban personas distintas (línea).` : "")
    + (ten.parcial.length ? " El día de hoy va en curso, y el primer día de cada medición empezó a medias." : "")
    + (nubeTot ? ` Se descartaron ${cuantos(nubeTot, "apertura automática", "aperturas automáticas")} desde redes de nubes (robots que se hacen pasar por navegadores).` : "");
  const graficos = `<div class="dos d2">
${tarjetaG("tendencia", P.agrupar === "mes" ? "Visitas y personas por mes" : "Visitas y personas por día", P.agrupar === "mes" ? AYUDA.tendenciaMes : AYUDA.tendencia, { ancha: true, alto: 320, nota: notaTen.trim() })}
${tarjetaG("horas", "¿A qué hora leen?", AYUDA.horas, { vacio: vacioDims, nota: notaDims })}
${tarjetaG("semana", "¿Qué días se lee más?", AYUDA.semana, { vacio: "Hace falta al menos un día completo de datos.", nota: diasSemana && diasSemana < 14 ? `Con ${cuantos(diasSemana, "día", "días")} de datos: orientativo.` : "" })}
${tarjetaG("origen", "¿De dónde llegan?", AYUDA.origenG, { vacio: vacioDims })}
${tarjetaG("disp", "¿Desde qué aparato?", AYUDA.disp, { vacio: vacioDims })}
${tarjetaG("paises", "Países", AYUDA.paises, { alto: Math.max(220, D.paises.length * 30 + 40) })}
${tarjetaG("sitios", "Sitios que envían lectores", AYUDA.sitios, { alto: Math.max(220, D.sitios.length * 30 + 40), vacio: ini.dims ? "Ningún sitio web envió visitas en este período." : vacioDims })}
</div>`;
  const celdas = secs.length ? `<div class="calor">${secs.map((x) => `<a class="cel${x.id === sec ? " sel" : ""}" href="/panel${qsPanel(P, { seccion: x.id === sec ? "" : x.id })}#lectura" style="--a:${(0.08 + 0.57 * x.s / Math.max(1, top.s)).toFixed(2)}"${x.id === sec ? ' aria-current="true"' : ""}><b>${esc(x.nombre)}</b><span>${tiempo(x.s)} · ${num(x.v, 0)} lecturas</span></a>`).join("")}</div>`
    : `<p class="aviso">Aún no hay lecturas medidas en este período.</p>`;
  const lectura = `<section id="lectura"><h3 class="tit-g" tabindex="0" data-ayuda="${esc(AYUDA.calor)}">Mapa de calor de lectura${sec ? ` · ${esc(nomSec)}` : ""}</h3>
<p class="sub">Tiempo que los lectores pasan en cada sección del diario (sumado, en el período elegido). Más dorado = más leído.${sec ? ` <a href="/panel${qsPanel(P, { seccion: "" })}#lectura">Ver todas las secciones</a>.` : " Toca un cuadro para filtrar por esa sección."}</p>${celdas}
<div class="dos d2">${tarjetaG("secciones", "Minutos de lectura por sección", AYUDA.secciones, { alto: Math.max(240, secs.length * 26 + 40), vacio: "Aún no hay lecturas medidas en este período." })}
${tarjetaG("secdia", sec ? `${nomSec}: lectura por día` : "Lectura por día (todas las secciones)", AYUDA.seccionDia, { vacio: "Aún no hay lecturas medidas en este período." })}
${tarjetaG("ediciones", sec ? `Ediciones donde más se leyó ${nomSec}` : "Ediciones con más lectores", sec ? AYUDA.edicionesSec : AYUDA.ediciones, { ancha: true, alto: Math.max(220, D.ediciones.length * 30 + 40) })}</div></section>`;
  // --- filtros ---
  const anioHoy = Number(P.hoy.slice(0, 4)), anios = [];
  for (let y = anioHoy; y >= 2026; y--) anios.push(y);
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const filtros = `<form class="tab-filtros" method="get" action="/panel" aria-label="Filtros del panel">
<label>Año<select name="anio">${opt("", "Últimos 30 días", !P.anio)}${anios.map((y) => opt(y, String(y), P.anio === y)).join("")}</select></label>
<label>Mes<select name="mes"${P.anio ? "" : " disabled"}>${opt("", "Todo el año", !P.mes)}${NOMBRES_MES.map((m, i) => opt(i + 1, m.replace(/^./, (x) => x.toUpperCase()), P.mes === i + 1)).join("")}</select></label>
<label>Sección del mapa de calor<select name="seccion">${opt("", "Todas las secciones", !sec)}${Object.entries(NOMBRE_SECCION).map(([k, n]) => opt(k, n, sec === k)).join("")}</select></label>
<noscript><button class="btn linea chico" type="submit">Aplicar</button></noscript>${P.anio || P.mes || sec ? `<a class="btn linea chico" href="/panel">Quitar filtros</a>` : ""}</form>`;
  // --- publicidad, comunidad y el resto ---
  const publicidad = seccionPublicidad(P, R, u.searchParams.get("anuncios"), { clicsSlug, clicsUSlug, D });
  let pul = null;
  try { pul = JSON.parse((R.pulso[0] || {}).valor || "null"); } catch { pul = null; }
  const pulTxt = !pul ? "Sin pedidos" : pul.estado === "204" ? "Pedido aceptado" : ["401", "403"].includes(pul.estado) ? "Llave rechazada" : "Falló (" + pul.estado + ")";
  const pulSub = !pul ? "Se activa con la clave GITHUB_DISPATCH" : ["401", "403"].includes(pul.estado) ? "Renovar GITHUB_DISPATCH · " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC"
    : "Último pedido " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC";
  const bz = R.bz, tot = R.bzTot[0] || { n: 0, ver: 0 };
  const cuenta = (campo) => { const c = {}; bz.forEach((r) => { try { JSON.parse(r[campo] || "[]").forEach((x) => { c[x] = (c[x] || 0) + 1; }); } catch { /* nada */ } }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const frec = {};
  bz.forEach((r) => { if (r.frecuencia) frec[r.frecuencia] = (frec[r.frecuencia] || 0) + 1; });
  const npsR = bz.filter((r) => typeof r.nps === "number");
  const nps = npsR.length ? Math.round((npsR.filter((r) => r.nps >= 9).length - npsR.filter((r) => r.nps <= 6).length) / npsR.length * 100) : null;
  const kCom = [
    kpiA("Sugerencias en el Buzón", num(tot.n, 0), num(tot.ver, 0) + " con email confirmado", "Mensajes que dejaron los lectores en el Buzón de sugerencias (desde que existe). «Con email confirmado» son los que tocaron el enlace del correo de confirmación."),
    kpiA("Recomendación (NPS)", nps === null ? "Sin respuestas" : (nps > 0 ? "+" : "") + nps, npsR.length + " respuestas", "Qué tanto recomendarían Cofrade News, de −100 a +100: el % que responde 9 o 10 menos el % que responde de 0 a 6. Sobre +30 es muy bueno; sobre +50, excelente."),
    kpiA("Socios activos", num(R.socios.filter((x) => ["activo", "prueba"].includes(x.estado)).reduce((a, x) => a + x.n, 0), 0), "Dashboard Financiero", "Personas con acceso vigente al Dashboard Financiero (área de socios), pagado o en prueba."),
    kpiA("«En vivo» al día", esc(pulTxt), pulSub, "Estado del último pedido del sitio a GitHub para actualizar los datos «En vivo» de la portada. «Pedido aceptado» es lo normal; «Llave rechazada» significa que hay que renovar la clave GITHUB_DISPATCH."),
  ].join("");
  const buzon = `<section id="buzon"><h3>Buzón: lo que dicen los lectores</h3><div class="dos">
<div class="tarjeta"><h4 class="kicker">Lo que más les gusta</h4>${barras(cuenta("gusta"))}</div>
<div class="tarjeta"><h4 class="kicker">Lo que piden agregar</h4>${barras(cuenta("agregar"), "#1E7B4F")}</div>
<div class="tarjeta"><h4 class="kicker">Frecuencia de lectura</h4>${barras(Object.entries(frec).sort((a, b) => b[1] - a[1]), "#23395B")}
<p class="sub" style="margin-top:12px">NPS = % que responde 9 o 10, menos % que responde de 0 a 6. Sobre +30 es muy bueno; sobre +50, excelente.</p></div></div>
<p style="margin:16px 0"><a class="btn linea" href="/panel/buzon.csv">Descargar todas las sugerencias (Excel / CSV)</a></p>
<div class="tabla-buzon">${bz.slice(0, 60).map((r) => `<article class="tarjeta" style="margin:0 0 10px"><b>${esc(r.nombre)} ${esc(r.apellido)}</b> <span class="m">· ${esc(r.email)} · ${esc(String(r.fecha).slice(0, 16).replace("T", " "))} UTC · ${r.verificado ? "email confirmado" : "sin confirmar"}${typeof r.nps === "number" ? " · NPS " + r.nps : ""}</span>
${r.texto ? `<p style="margin:6px 0 0;white-space:pre-wrap">${esc(r.texto)}</p>` : ""}</article>`).join("") || `<p class="aviso">Todavía no llegan sugerencias.</p>`}</div></section>`;
  const datosJson = JSON.stringify(D).replace(/</g, "\\u003c");
  const cuerpo = `<style>${TABLERO_CSS}</style><section style="border:0;padding-top:30px"><span class="kicker">Panel de Control · solo administración</span><h1 class="titulo-lujo">Cómo va Cofrade News</h1>
<p class="sub">Medición propia, sin cookies ni datos personales. Pasa el cursor (o toca) cualquier cifra o título con una <i>i</i> para ver qué significa.</p>
${filtros}<p class="tab-periodo">Mostrando: <b>${esc(P.etiqueta)}</b> (del ${ddmm(P.desde)} al ${ddmm(P.hasta)})${sec ? ` · sección <b>${esc(nomSec)}</b>` : ""}${P.futuro ? " · ese mes todavía no empieza" : ""}${R.parcial ? ' · <span style="color:var(--rojo)">algunas cifras no se pudieron leer</span>' : ""}</p>
<p class="tab-ir"><a href="#graficos">Gráficos</a><a href="#lectura">Mapa de calor</a><a href="#publicidad">Publicidad</a><a href="#socios">Socios</a><a href="#contador">Contador diario</a><a href="#buzon">Buzón</a><a href="#difusion">Difusión</a><a href="#concurso">Concurso</a><a href="#podcast">Podcast</a><a href="/panel/salir">Salir del panel</a></p>
<h2 class="grupo-k">Audiencia</h2><div class="cifras k5">${kAud}</div>
<h2 class="grupo-k">Comunidad</h2><div class="cifras k5">${kCom}</div></section>
<section id="graficos"><h3>Gráficos del período</h3>${graficos}</section>
${lectura}${publicidad}${fundadores}${seccionVisitas(cont)}${buzon}${difusion}${concurso}${republica}${podcast}
<script type="application/json" id="tablero-datos">${datosJson}</script><script src="/a/${ECHARTS_ARCHIVO}" defer></script><script>${TABLERO_JS}</script>`;
  return html(marco({ titulo: "Panel de Control · Cofrade News", descripcion: "", cuerpo }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// ----- Publicidad pagada en el Panel -----
function estadoAnunciante(a, cs, hoy) {
  const actual = cs.filter((c) => c.desde <= hoy && c.hasta >= hoy).sort((x, y) => (x.hasta < y.hasta ? 1 : -1))[0] || null;
  const ultimo = cs.slice().sort((x, y) => (x.hasta < y.hasta ? 1 : -1))[0] || null;
  const futuro = cs.filter((c) => c.desde > hoy).sort((x, y) => (x.desde > y.desde ? 1 : -1))[0] || null;
  const renovado = actual && cs.some((c) => c.hasta > actual.hasta);
  let est, clase;
  if (a.estado === "archivado") { est = "Archivado"; clase = "gris"; }
  else if (a.estado === "pausado") { est = "En pausa"; clase = "gris"; }
  else if (!ultimo) { est = "Sin contrato"; clase = "gris"; }
  else if (actual) {
    const d = diasHasta(hoy, actual.hasta);
    if (renovado) { est = `Vigente y renovado hasta el ${ddmm(ultimo.hasta)}`; clase = "ok"; }
    else if (d <= 7) { est = d <= 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `Vence en ${d} días`; clase = "urgente"; }
    else if (d <= 30) { est = `Vence en ${d} días`; clase = "pronto"; }
    else { est = `Vigente: quedan ${d} días`; clase = "ok"; }
  } else if (futuro) { est = `Empieza el ${ddmm(futuro.desde)}`; clase = "gris"; }
  else { const d = diasHasta(ultimo.hasta, hoy); est = d === 1 ? "Venció ayer" : `Venció hace ${d} días`; clase = "urgente"; }
  let aviso = "";
  if (actual && !renovado && a.estado === "activo") {
    const enviado = actual.aviso_enviado && !String(actual.aviso_enviado).startsWith("enviando:") ? actual.aviso_enviado : "";
    aviso = enviado ? `Enviado el ${fechaHora(enviado)}` : diasHasta(hoy, actual.hasta) <= 7 ? "Sale en la próxima revisión (cada hora, de 9:00 a 20:59)" : `Sale solo el ${ddmm(masDias(actual.hasta, -7))}`;
  } else if (renovado) aviso = "No hace falta: ya renovó";
  return { actual, ultimo, futuro, renovado, est, clase, aviso };
}
function campoA(etiqueta, nombre, valor, extra = "", ayuda = "") {
  return `<label${/class="ancho"/.test(extra) ? ' class="ancho"' : ""}>${esc(etiqueta)}${ayuda ? ` <span class="ac">${esc(ayuda)}</span>` : ""}<input name="${nombre}" value="${esc(valor)}" ${extra.replace(/class="ancho"/, "")}></label>`;
}
function camposContratoHtml(c, hoy) {
  const desde = c.desde || hoy, hasta = c.hasta || unAnioDesde(desde);
  return `<fieldset><legend>Contrato y pago</legend>
${campoA("Desde *", "desde", desde, 'type="date" required')}${campoA("Hasta *", "hasta", hasta, 'type="date" required', "un año por defecto")}
${campoA("Monto pagado *", "monto", c.monto ?? PRECIO_RENOVACION.monto, 'type="number" step="0.01" min="0" required inputmode="decimal"')}
<label>Moneda<select name="moneda"><option value="UF"${c.moneda === "CLP" ? "" : " selected"}>UF</option><option value="CLP"${c.moneda === "CLP" ? " selected" : ""}>Pesos chilenos</option></select></label>
${campoA("Fecha de pago", "fecha_pago", c.fecha_pago || hoy, 'type="date"')}
<label>Medio de pago<select name="medio_pago">${["Transferencia", "Mercado Pago", "Tarjeta", "Efectivo", "Otro"].map((x) => `<option${c.medio_pago === x ? " selected" : ""}>${x}</option>`).join("")}</select></label>
${campoA("N° de factura o boleta", "documento", c.documento || "", 'maxlength="40"')}${campoA("Notas del contrato", "notas_contrato", c.notas || "", 'maxlength="300" class="ancho"')}
</fieldset>`;
}
function formAnunciante(a, P, q) {
  const v = (k, d = "") => (a && a[k] !== null && a[k] !== undefined && a[k] !== "" ? a[k] : d);
  const banner = v("banner", "ambos");
  return `<form class="form-anun" method="post" action="/panel/anunciantes" enctype="multipart/form-data">
<input type="hidden" name="accion" value="${a ? "editar" : "crear"}">${a ? `<input type="hidden" name="id" value="${a.id}">` : ""}<input type="hidden" name="q" value="${esc(q)}">
<fieldset><legend>Empresa y contacto</legend>
${campoA("Empresa *", "empresa", v("empresa"), 'required maxlength="60" autocomplete="organization"')}
${campoA("RUT de la empresa", "rut", v("rut"), 'maxlength="14" placeholder="76.123.456-0"', "para la factura; opcional")}
${campoA("Rubro", "rubro", v("rubro"), 'maxlength="60" placeholder="Ej.: ferretería, corredora de propiedades"')}
${campoA("Persona de contacto *", "contacto", v("contacto"), 'required maxlength="80" autocomplete="name"')}
${campoA("Email de contacto *", "email", v("email"), 'type="email" required maxlength="120" autocomplete="email"', "aquí llega el aviso de renovación")}
${campoA("Teléfono", "telefono", v("telefono"), 'type="tel" maxlength="30" placeholder="+56 9 1234 5678" autocomplete="tel"')}
${campoA("Sitio web", "web", v("web"), 'maxlength="300" placeholder="www.empresa.cl" inputmode="url" class="ancho"')}
</fieldset>
<fieldset><legend>El aviso (así sale en el diario y en la portada)</legend>
${campoA("Título del aviso *", "titulo", v("titulo"), 'required maxlength="90" class="ancho"')}
<label class="ancho">Texto del aviso <span class="ac">hasta 260 letras</span><textarea name="texto" maxlength="260" rows="3">${esc(v("texto"))}</textarea></label>
${campoA("Texto del botón 1", "boton1_texto", v("boton1_texto", "Visitar sitio web"), 'maxlength="40"')}
${campoA("Enlace del botón 1 *", "boton1_web", v("boton1_web"), 'required maxlength="300" placeholder="www.empresa.cl/oferta" inputmode="url"', "la página a la que llega el lector")}
${campoA("Texto del botón 2", "boton2_texto", v("boton2_texto"), 'maxlength="40" placeholder="Escribir un email"', "opcional")}
${campoA("Enlace o email del botón 2", "boton2", a ? a.boton2_email || a.boton2_web || "" : "", 'maxlength="300" placeholder="ventas@empresa.cl o www.empresa.cl/contacto"', "opcional")}
<label>Dónde sale en el diario<select name="banner">${[["ambos", "En los dos banners (recomendado)"], ["1", "Solo en el banner 1 (a un tercio del diario)"], ["2", "Solo en el banner 2 (a dos tercios)"]].map(([k, t]) => `<option value="${k}"${banner === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
${campoA("Orden en el carrusel", "orden", v("orden", 1), 'type="number" min="1" max="99"', "1 = primero")}
${campoA("Color de fondo", "color_fondo", HEX6.test(v("color_fondo")) ? v("color_fondo") : "#0B1F3A", 'type="color"')}
${campoA("Color de botones y detalles", "color_acento", HEX6.test(v("color_acento")) ? v("color_acento") : "#D9AE52", 'type="color"')}
<label>Logo <span class="ac">PNG, JPG o WebP de hasta 300 KB; ideal cuadrado de 400 × 400 px</span><input name="logo" type="file" accept="image/png,image/jpeg,image/webp"></label>
${a && a.logo_tipo ? `<label class="check"><input type="checkbox" name="quitar_logo" value="1"> Quitar el logo actual</label>` : ""}
</fieldset>
${a ? "" : camposContratoHtml({}, P.hoy)}
<label class="ancho">Notas internas <span class="ac">solo las ves tú</span><textarea name="notas" maxlength="1000" rows="2">${esc(v("notas"))}</textarea></label>
<div><button class="btn oro" type="submit">${a ? "Guardar cambios" : "Agregar anunciante"}</button></div></form>`;
}
function seccionPublicidad(P, R, msg, { clicsSlug, clicsUSlug, D }) {
  const hoy = P.hoy, q = qsPanel(P), anun = R.anunciantes, cs = R.contratos;
  const de = (id) => cs.filter((c) => c.anunciante_id === id);
  const clicsEn = (slug, a, z) => R.clicsDia.filter((x) => x.slug === slug && x.fecha >= a && x.fecha <= z).reduce((t, x) => t + Number(x.n || 0), 0);
  const filas = anun.map((a) => ({ a, cs: de(a.id), e: estadoAnunciante(a, de(a.id), hoy) }));
  const vigentes = filas.filter((x) => x.a.estado === "activo" && x.e.actual), pausados = filas.filter((x) => x.a.estado === "pausado");
  const vencen = vigentes.filter((x) => !x.e.renovado && diasHasta(hoy, x.e.actual.hasta) <= 30), urgentes = vencen.filter((x) => diasHasta(hoy, x.e.actual.hasta) <= 7);
  const ingresos = {};
  cs.forEach((c) => { const f = c.fecha_pago || c.desde; if (f >= P.desde && f <= P.hasta) ingresos[c.moneda || "UF"] = (ingresos[c.moneda || "UF"] || 0) + Number(c.monto || 0); });
  const ingTxt = Object.keys(ingresos).length ? Object.entries(ingresos).map(([m, t]) => montoTxt(t, m)).join(" + ") : montoTxt(0, "UF");
  const nIng = cs.filter((c) => { const f = c.fecha_pago || c.desde; return f >= P.desde && f <= P.hasta; }).length;
  const slugsPagados = new Set(anun.map((a) => a.slug)), clicsTot = Object.entries(clicsSlug).filter(([s]) => slugsPagados.has(s)).reduce((t, [, n]) => t + n, 0);
  const clicsUTot = Object.entries(clicsUSlug).filter(([s]) => slugsPagados.has(s)).reduce((t, [, n]) => t + n, 0);
  const kPub = [
    kpiA("Anunciantes con aviso vigente", num(vigentes.length, 0), pausados.length ? `${cuantos(pausados.length, "en pausa", "en pausa")}` : "pagan y salen hoy", AYUDA.vigentes),
    kpiA("Vencen en 30 días", num(vencen.length, 0), urgentes.length ? `${cuantos(urgentes.length, "vence", "vencen")} en 7 días o menos: el correo sale solo` : "el correo de renovación sale solo 7 días antes", AYUDA.vencen),
    kpiA("Ingresos del período", esc(ingTxt), nIng ? cuantos(nIng, "contrato pagado", "contratos pagados") : "sin pagos anotados en el período", AYUDA.ingresos),
    kpiA("Clics en avisos pagados", num(clicsTot, 0), cuantos(clicsUTot, "persona distinta", "personas distintas") + " (por día)", AYUDA.clics),
  ].join("");
  const tarjeta = ({ a, cs: lc, e }) => {
    const ini = (a.empresa || "?").trim().charAt(0).toUpperCase(), fondo = HEX6.test(a.color_fondo || "") ? a.color_fondo : "#0B1F3A", logo = logoDe(a);
    const marca = logo ? `<img class="anun-logo" src="${esc(logo)}" alt="" loading="lazy">` : `<span class="anun-ini" style="background:${fondo};color:${tintaSobre(fondo)}" aria-hidden="true">${esc(ini)}</span>`;
    const c = e.actual || e.ultimo, total = {};
    lc.forEach((x) => { total[x.moneda || "UF"] = (total[x.moneda || "UF"] || 0) + Number(x.monto || 0); });
    const clicsContrato = c ? clicsEn(a.slug, c.desde, c.hasta < hoy ? c.hasta : hoy) : 0;
    const renovar = { desde: e.ultimo && e.ultimo.hasta >= hoy ? masDias(e.ultimo.hasta, 1) : hoy };
    renovar.hasta = unAnioDesde(renovar.desde);
    const boton = (accion, texto, extra = "") => `<form method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="${accion}"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="q" value="${esc(q)}"><button class="btn linea chico" type="submit"${extra}>${texto}</button></form>`;
    return `<article class="anun ${esc(a.estado)}" id="anun-${a.id}"><div class="anun-cab">${marca}<div><h4>${esc(a.empresa)}</h4>${a.rubro ? `<span class="aviso">${esc(a.rubro)}</span>` : ""}</div><span class="est ${e.clase}">${esc(e.est)}</span></div>
<div class="anun-datos">
<div><small>Contacto</small>${esc(a.contacto || "Sin nombre")}<br><a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${a.telefono ? `<br><a href="tel:${esc(String(a.telefono).replace(/[^+\d]/g, ""))}">${esc(a.telefono)}</a>` : ""}</div>
<div><small>Vigencia del contrato</small>${c ? `${ddmm(c.desde)} al ${ddmm(c.hasta)}` : "Sin contrato"}${e.renovado ? `<br>renovado hasta el ${ddmm(e.ultimo.hasta)}` : ""}</div>
<div><small>Pagó</small>${c ? `${esc(montoTxt(c.monto, c.moneda))} · ${ddmm(c.fecha_pago || c.desde)}${c.medio_pago ? " · " + esc(c.medio_pago) : ""}${c.documento ? ` · doc. ${esc(c.documento)}` : ""}` : "Sin pagos"}<br><span class="aviso">Total histórico: ${esc(Object.entries(total).map(([m, t]) => montoTxt(t, m)).join(" + ") || montoTxt(0, "UF"))}</span></div>
<div><small>Clics en su aviso</small>${cuantos(clicsSlug[a.slug] || 0, "clic", "clics")} en el período${c ? `<br><span class="aviso">${cuantos(clicsContrato, "clic", "clics")} en el contrato</span>` : ""}</div>
<div><small>Correo de renovación</small>${esc(e.aviso || "No corresponde")}</div>
${a.rut ? `<div><small>RUT</small>${esc(a.rut)}</div>` : ""}${a.web ? `<div><small>Sitio web</small><a href="${esc(urlSegura(a.web))}" target="_blank" rel="noopener">${esc(String(a.web).replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></div>` : ""}
</div>${a.notas ? `<p class="aviso" style="white-space:pre-wrap;margin:6px 0 0">Notas: ${esc(a.notas)}</p>` : ""}
<div class="acciones-anun">${a.estado === "activo" ? boton("pausar", "Pausar el aviso") : boton("reactivar", "Reactivar")}
${c ? `<a class="btn linea chico" href="/panel/anunciantes/correo?id=${a.id}" target="_blank" rel="noopener">Ver el correo de renovación</a>${a.estado !== "archivado" ? boton("enviar-aviso", "Enviar ahora el correo", ` onclick="return confirm('¿Enviar ahora el correo de renovación a ${esc(String(a.email).replace(/['\\]/g, ""))}?')"`) : ""}` : ""}
${a.estado !== "archivado" ? boton("archivar", "Archivar", ` onclick="return confirm('¿Archivar a ${esc(String(a.empresa).replace(/['\\]/g, ""))}? Su aviso deja de salir.')"`) : ""}</div>
<details><summary>Renovar (UF ${PRECIO_RENOVACION.monto} por 12 meses)</summary><form class="form-anun" method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="contrato"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="q" value="${esc(q)}">
${camposContratoHtml({ desde: renovar.desde, hasta: renovar.hasta }, hoy)}<div><button class="btn oro" type="submit">Registrar la renovación</button></div></form></details>
<details><summary>Editar los datos y el aviso</summary>${formAnunciante(a, P, q)}</details>
${lc.length ? `<details><summary>Historial de contratos (${lc.length})</summary><div style="overflow-x:auto"><table class="tabla-c"><thead><tr><th>Desde</th><th>Hasta</th><th>Monto</th><th>Pago</th><th>Correo de renovación</th><th></th></tr></thead><tbody>
${lc.slice().reverse().map((x) => `<tr><td>${ddmm(x.desde)}</td><td>${ddmm(x.hasta)}</td><td>${esc(montoTxt(x.monto, x.moneda))}</td><td>${ddmm(x.fecha_pago || x.desde)}${x.medio_pago ? "<br>" + esc(x.medio_pago) : ""}${x.documento ? "<br>doc. " + esc(x.documento) : ""}</td>
<td>${x.aviso_enviado && !String(x.aviso_enviado).startsWith("enviando:") ? esc(fechaHora(x.aviso_enviado)) : "No enviado"}</td><td><form method="post" action="/panel/anunciantes"><input type="hidden" name="accion" value="borrar-contrato"><input type="hidden" name="id" value="${a.id}"><input type="hidden" name="contrato" value="${x.id}"><input type="hidden" name="q" value="${esc(q)}"><button class="enlace" type="submit" onclick="return confirm('¿Borrar este contrato? No se puede deshacer.')">Borrar</button></form></td></tr>`).join("")}
</tbody></table></div></details>` : ""}</article>`;
  };
  const activos = filas.filter((x) => x.a.estado !== "archivado"), archivados = filas.filter((x) => x.a.estado === "archivado");
  const clicsMarcas = marcasPropias().map((m) => [m.nombre, clicsSlug[slugMarca(m)] || 0, clicsUSlug[slugMarca(m)] || 0]);
  const correos = R.correos;
  return `<section id="publicidad"><h3>Publicidad pagada</h3>${mensajeAnuncios(msg)}
<p class="sub">Registro de las empresas que pagan por publicidad. Sus avisos salen en el carrusel de la portada y en los dos banners del diario mientras el contrato esté vigente. Siete días antes del vencimiento, el panel les envía solo un correo de renovación (UF ${PRECIO_RENOVACION.monto} por 12 meses) con sus cifras y copia a ${CORREO_HOLA}. Tus marcas propias no se mezclan aquí: van abajo, aparte, y no vencen.</p>
<div class="cifras k5">${kPub}</div>
<div class="dos d2" style="margin-top:14px">${tarjetaG("clics", "Clics por anunciante en el período", AYUDA.clicsG, { ancha: true, alto: Math.max(200, D.clics.length * 40 + 70), vacio: "Todavía no hay clics en avisos pagados en este período." })}</div>
<details class="nuevo-anun" id="nuevo-anunciante"${activos.length ? "" : " open"}><summary class="btn oro" style="display:inline-flex;margin:16px 0 4px">+ Agregar un anunciante</summary>${formAnunciante(null, P, q)}</details>
<div class="anuns">${activos.map(tarjeta).join("") || `<p class="aviso">Todavía no hay anunciantes que paguen. Cuando cierres el primero, agrégalo con el botón de arriba: su aviso entra solo al carrusel de la portada y al diario.</p>`}</div>
${archivados.length ? `<details style="margin-top:12px"><summary>Archivados (${archivados.length})</summary><div class="anuns">${archivados.map(tarjeta).join("")}</div></details>` : ""}
${anun.length ? `<p style="margin:16px 0 0"><a class="btn linea" href="/panel/anunciantes.csv">Descargar anunciantes y contratos (Excel / CSV)</a></p>` : ""}
<h4 class="kicker tit-g" tabindex="0" style="margin-top:26px" data-ayuda="Tus marcas aparecen en el carrusel de la portada y en el diario de forma permanente: no tienen contrato ni vencen. Aquí solo se cuentan sus clics.">Tus marcas (permanentes)</h4>
<div class="marcas-p">${clicsMarcas.map(([n, c, cu]) => `<div class="cifra"><small>${esc(n)}</small><b>${cuantos(c, "clic", "clics")}</b><br><small>${cuantos(cu, "persona distinta", "personas distintas")} · en el período</small></div>`).join("")}</div>
<h4 class="kicker" style="margin-top:22px">Correos enviados a los anunciantes</h4>
${correos.length ? `<div style="overflow-x:auto"><table class="tabla-c"><thead><tr><th>Fecha</th><th>Empresa</th><th>Para</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>${correos.map((x) => `<tr><td>${esc(fechaHora(x.fecha))}</td><td>${esc((anun.find((a) => a.id === x.anunciante_id) || {}).empresa || "")}</td><td>${esc(x.para)}</td><td>${esc(x.tipo)}</td><td>${x.estado === "enviado" ? "Enviado" : '<b style="color:var(--rojo)">Falló</b>'}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="aviso">Todavía no se ha enviado ningún correo a los anunciantes.</p>`}</section>`;
}

// ----- Acciones del registro (solo Germán) -----
function camposAnunciante(f) {
  const t = (k, n) => String(f.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  const color = (k, d) => (HEX6.test(String(f.get(k) || "")) ? String(f.get(k)).toUpperCase() : d);
  const d = { empresa: t("empresa", 60), rubro: t("rubro", 60), contacto: t("contacto", 80), email: t("email", 120).toLowerCase(), telefono: t("telefono", 30),
    titulo: t("titulo", 90), texto: t("texto", 260), boton1_texto: t("boton1_texto", 40), boton2_texto: t("boton2_texto", 40),
    banner: ["ambos", "1", "2"].includes(String(f.get("banner"))) ? String(f.get("banner")) : "ambos", orden: Math.max(1, Math.min(99, Math.round(Number(f.get("orden")) || 1))),
    color_fondo: color("color_fondo", "#0B1F3A"), color_acento: color("color_acento", "#D9AE52"), notas: String(f.get("notas") || "").trim().slice(0, 1000) };
  if (d.empresa.length < 2) return { error: "empresa" };
  if (!d.contacto) return { error: "contacto" };
  if (!EMAIL_OK.test(d.email)) return { error: "email" };
  if (d.telefono && !/^[+\d ()-]{6,30}$/.test(d.telefono)) return { error: "telefono" };
  const rut = t("rut", 14);
  if (rut && !rutValido(rut)) return { error: "rut" };
  d.rut = rut ? rutConPuntos(rut) : "";
  const web = webOk(f.get("web"));
  if (web === null) return { error: "web" };
  d.web = web;
  if (d.titulo.length < 2) return { error: "titulo" };
  const b1 = webOk(f.get("boton1_web") || web);
  if (!b1) return { error: "boton1_web" };
  d.boton1_web = b1;
  const b2 = String(f.get("boton2") || "").trim().replace(/^mailto:/i, "");
  d.boton2_web = ""; d.boton2_email = "";
  if (b2) { if (EMAIL_OK.test(b2)) d.boton2_email = b2.toLowerCase(); else { const w = webOk(b2); if (!w) return { error: "boton2" }; d.boton2_web = w; } }
  return { d };
}
function camposContrato(f) {
  const desde = String(f.get("desde") || ""), hasta = String(f.get("hasta") || "");
  if (!fechaValida(desde)) return { error: "desde" };
  if (!fechaValida(hasta) || hasta < desde || diasHasta(desde, hasta) > 1100) return { error: "hasta" };
  const moneda = String(f.get("moneda")) === "CLP" ? "CLP" : "UF", monto = Number(String(f.get("monto") || "").replace(",", "."));
  if (!String(f.get("monto") || "").trim() || !Number.isFinite(monto) || monto < 0 || monto > (moneda === "UF" ? 10000 : 500000000)) return { error: "monto" };
  const fp = String(f.get("fecha_pago") || "");
  if (fp && !fechaValida(fp)) return { error: "fecha_pago" };
  const t = (k, n) => String(f.get(k) || "").replace(/\s+/g, " ").trim().slice(0, n);
  return { c: { desde, hasta, monto: Math.round(monto * 100) / 100, moneda, fecha_pago: fp || desde, medio_pago: t("medio_pago", 40), documento: t("documento", 40), notas: t("notas_contrato", 300) } };
}
async function leerLogo(f) {   // PNG, JPG o WebP reconocidos por sus primeros bytes, hasta 300 KB
  const x = f.get("logo");
  if (!x || typeof x === "string" || !x.size) return {};
  if (x.size > 300 * 1024) return { error: "logo-grande" };
  const b = new Uint8Array(await x.arrayBuffer()), txt = (i, j) => String.fromCharCode(...b.slice(i, j));
  const tipo = b[0] === 0x89 && txt(1, 4) === "PNG" ? "image/png" : b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF ? "image/jpeg" : b.length > 12 && txt(0, 4) === "RIFF" && txt(8, 12) === "WEBP" ? "image/webp" : "";
  if (!tipo) return { error: "logo-tipo" };
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  const datos = btoa(bin);
  return { tipo, datos, version: (await sha256hex(datos)).slice(0, 10) };
}
async function accionAnunciantes(req, env, ctx) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const volver = (q, codigo, ancla = "publicidad") => new Response(null, { status: 303, headers: { Location: `/panel${q ? q + "&" : "?"}anuncios=${encodeURIComponent(codigo)}#${ancla}`, "Cache-Control": "no-store" } });
  if (!env.DB) return volver("", "sin-base");
  if (Number(req.headers.get("Content-Length") || 0) > 700000) return volver("", "muy-grande");
  let f;
  try { f = await req.formData(); } catch { return volver("", "formulario"); }
  const q = limpiarQ(String(f.get("q") || "")), ir = (codigo, ancla) => volver(q, codigo, ancla);
  const accion = String(f.get("accion") || ""), id = Math.floor(Number(f.get("id") || 0)), ahora = new Date().toISOString();
  if (accion === "crear") {
    const A = camposAnunciante(f);
    if (A.error) return ir("error:" + A.error, "nuevo-anunciante");
    const C = camposContrato(f);
    if (C.error) return ir("error:" + C.error, "nuevo-anunciante");
    const L = await leerLogo(f);
    if (L.error) return ir("error:" + L.error, "nuevo-anunciante");
    let base = slugAnuncio(A.d.empresa);
    if (base.startsWith("m-")) base = "a-" + base;   // «m-…» es de las marcas propias
    const usados = new Set(((await env.DB.prepare("SELECT slug FROM anunciantes WHERE slug = ? OR slug LIKE ?").bind(base, base + "-%").all()).results || []).map((x) => x.slug));
    let slug = base;
    for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
    const d = A.d;
    const r = await env.DB.prepare(`INSERT INTO anunciantes (slug, empresa, rut, rubro, contacto, email, telefono, web, titulo, texto, boton1_texto, boton1_web, boton2_texto, boton2_web, boton2_email,
      banner, orden, color_fondo, color_acento, estado, notas, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?, ?) RETURNING id`)
      .bind(slug, d.empresa, d.rut, d.rubro, d.contacto, d.email, d.telefono, d.web, d.titulo, d.texto, d.boton1_texto, d.boton1_web, d.boton2_texto, d.boton2_web, d.boton2_email,
        d.banner, d.orden, d.color_fondo, d.color_acento, d.notas, ahora, ahora).first();
    const c = C.c, ops = [env.DB.prepare("INSERT INTO contratos (anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(r.id, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.notas, ahora)];
    if (L.tipo) ops.push(env.DB.prepare("INSERT OR REPLACE INTO logos_anuncios (anunciante_id, tipo, datos, version, creado) VALUES (?, ?, ?, ?, ?)").bind(r.id, L.tipo, L.datos, L.version, ahora));
    await env.DB.batch(ops);
    ANUNCIOS.t = 0;
    return ir("creado", "anun-" + r.id);
  }
  const a = id ? await env.DB.prepare("SELECT id, estado FROM anunciantes WHERE id = ?").bind(id).first().catch(() => null) : null;
  if (!a) return ir("no-existe");
  if (accion === "editar") {   // el slug no cambia: los enlaces de las ediciones ya publicadas siguen funcionando
    const A = camposAnunciante(f);
    if (A.error) return ir("error:" + A.error, "anun-" + id);
    const L = await leerLogo(f);
    if (L.error) return ir("error:" + L.error, "anun-" + id);
    const d = A.d, ops = [env.DB.prepare(`UPDATE anunciantes SET empresa = ?, rut = ?, rubro = ?, contacto = ?, email = ?, telefono = ?, web = ?, titulo = ?, texto = ?, boton1_texto = ?, boton1_web = ?,
      boton2_texto = ?, boton2_web = ?, boton2_email = ?, banner = ?, orden = ?, color_fondo = ?, color_acento = ?, notas = ?, actualizado = ? WHERE id = ?`)
      .bind(d.empresa, d.rut, d.rubro, d.contacto, d.email, d.telefono, d.web, d.titulo, d.texto, d.boton1_texto, d.boton1_web, d.boton2_texto, d.boton2_web, d.boton2_email,
        d.banner, d.orden, d.color_fondo, d.color_acento, d.notas, ahora, id)];
    if (L.tipo) ops.push(env.DB.prepare("INSERT OR REPLACE INTO logos_anuncios (anunciante_id, tipo, datos, version, creado) VALUES (?, ?, ?, ?, ?)").bind(id, L.tipo, L.datos, L.version, ahora));
    else if (String(f.get("quitar_logo")) === "1") ops.push(env.DB.prepare("DELETE FROM logos_anuncios WHERE anunciante_id = ?").bind(id));
    await env.DB.batch(ops);
    ANUNCIOS.t = 0;
    return ir("editado", "anun-" + id);
  }
  if (accion === "contrato") {
    const C = camposContrato(f);
    if (C.error) return ir("error:" + C.error, "anun-" + id);
    const c = C.c;
    await env.DB.prepare("INSERT INTO contratos (anunciante_id, desde, hasta, monto, moneda, fecha_pago, medio_pago, documento, notas, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.notas, ahora).run();
    ANUNCIOS.t = 0;
    return ir("renovado", "anun-" + id);
  }
  if (accion === "borrar-contrato") {
    await env.DB.prepare("DELETE FROM contratos WHERE id = ? AND anunciante_id = ?").bind(Math.floor(Number(f.get("contrato") || 0)), id).run();
    ANUNCIOS.t = 0;
    return ir("contrato-borrado", "anun-" + id);
  }
  if (["pausar", "reactivar", "archivar"].includes(accion)) {
    const nuevo = { pausar: "pausado", reactivar: "activo", archivar: "archivado" }[accion];
    await env.DB.prepare("UPDATE anunciantes SET estado = ?, actualizado = ? WHERE id = ?").bind(nuevo, ahora, id).run();
    ANUNCIOS.t = 0;
    return ir({ pausar: "pausado", reactivar: "reactivado", archivar: "archivado" }[accion], "anun-" + id);
  }
  if (accion === "enviar-aviso") {
    const c = await env.DB.prepare("SELECT id FROM contratos WHERE anunciante_id = ? ORDER BY hasta DESC, id DESC LIMIT 1").bind(id).first().catch(() => null);
    if (!c) return ir("sin-contrato", "anun-" + id);
    const r = await enviarRenovacion(env, ctx, c.id, "manual");
    return ir(r.ok ? "enviado" : r.error === "ocupado" ? "ocupado" : r.error === "sin-email" ? "sin-email" : "no-enviado", "anun-" + id);
  }
  return ir("formulario");
}
async function anunciantesCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const filas = (await env.DB.prepare(`SELECT a.empresa, a.rut, a.rubro, a.contacto, a.email, a.telefono, a.web, a.estado, c.desde, c.hasta, c.monto, c.moneda, c.fecha_pago, c.medio_pago, c.documento, c.aviso_enviado,
    (SELECT COALESCE(SUM(k.n), 0) FROM clics k WHERE k.slug = a.slug AND k.fecha BETWEEN c.desde AND c.hasta) AS clics,
    (SELECT COUNT(*) FROM clics_unicos k WHERE k.slug = a.slug AND k.fecha BETWEEN c.desde AND c.hasta) AS personas
    FROM anunciantes a LEFT JOIN contratos c ON c.anunciante_id = a.id ORDER BY a.empresa, c.desde`).all()).results || [];
  const celda = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas inyectadas
  const csv = "\ufeffempresa;rut;rubro;contacto;email;telefono;web;estado;contrato_desde;contrato_hasta;monto;moneda;fecha_pago;medio_pago;documento;correo_renovacion;clics_en_el_contrato;personas_que_hicieron_clic\n"
    + filas.map((r) => [r.empresa, r.rut, r.rubro, r.contacto, r.email, r.telefono, r.web, r.estado, r.desde ? ddmm(r.desde) : "", r.hasta ? ddmm(r.hasta) : "", r.monto, r.moneda, r.fecha_pago ? ddmm(r.fecha_pago) : "",
      r.medio_pago, r.documento, r.aviso_enviado && !String(r.aviso_enviado).startsWith("enviando:") ? fechaHora(r.aviso_enviado) : "", r.desde ? r.clics : "", r.desde ? r.personas : ""].map(celda).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="anunciantes-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
}
async function vistaCorreoAnunciante(req, env, ctx, u) {   // el mismo correo que recibiría el anunciante, sin enviarlo
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const c = await env.DB.prepare(`SELECT c.id, c.anunciante_id, c.desde, c.hasta, c.aviso_enviado, a.empresa, a.contacto, a.email, a.slug FROM contratos c JOIN anunciantes a ON a.id = c.anunciante_id
    WHERE a.id = ? ORDER BY c.hasta DESC, c.id DESC LIMIT 1`).bind(Math.floor(Number(u.searchParams.get("id") || 0))).first().catch(() => null);
  if (!c) return html(marco({ titulo: "Sin contrato · Panel", descripcion: "", cuerpo: `<section style="border:0"><h1>Ese anunciante no tiene contratos.</h1><p class="lede"><a href="/panel#publicidad">Volver al Panel</a></p></section>` }), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const co = correoRenovacion(await metricasContrato(env, ctx, c), c);
  const aviso = `<div style="background:#FFF4D6;border-bottom:1px solid #E4D2A0;padding:12px 16px;font:14px/1.5 Arial,sans-serif;color:#5B4A12">Vista previa: no se envió nada. Para: ${esc(c.email)} · copia a ${CORREO_HOLA} · Asunto: «${esc(co.asunto)}»</div>`;
  return new Response(co.html.replace(/<body([^>]*)>/, `<body$1>${aviso}`), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex",
    "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; frame-ancestors 'none'", ...SEGURIDAD } });
}

const TABLERO_CSS = `.tab-filtros{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-end;margin:4px 0 0}
.tab-filtros label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:var(--gris)}
.tab-filtros select{font:15px var(--sans);min-height:46px;padding:8px 12px;border:1.5px solid var(--linea);border-radius:12px;background:var(--card);color:var(--tinta);min-width:170px;cursor:pointer}
.tab-filtros select:hover{border-color:var(--oro)}.tab-filtros select:disabled{opacity:.5;cursor:not-allowed}
.tab-periodo{margin:14px 0 4px;font-size:14.5px;color:var(--gris)}.tab-periodo b{color:var(--tinta)}
.tab-ir{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px;margin:6px 0 0}.tab-ir a{color:var(--oro-t);min-height:32px;display:inline-flex;align-items:center}
.grupo-k{margin:24px 0 10px;font:700 13px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t)}
.cifras.k5{grid-template-columns:repeat(auto-fit,minmax(176px,1fr))}
[data-ayuda]{position:relative;cursor:help}[data-ayuda]:focus{outline:none}[data-ayuda]:focus-visible{outline:3px solid var(--oro);outline-offset:2px}
.cifra[data-ayuda]{padding-right:34px;transition:border-color .15s}.cifra[data-ayuda]:hover{border-color:var(--oro)}
.cifra[data-ayuda]::after,.tit-g[data-ayuda]::after{content:"i";position:absolute;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--linea);color:var(--gris);font:italic 700 12px/15px var(--serif);text-align:center;box-sizing:border-box}
.cifra[data-ayuda]::after{top:10px;right:10px}.tit-g{display:inline-block;position:relative;padding-right:28px}.tit-g[data-ayuda]::after{top:50%;margin-top:-9px;right:0}
[data-ayuda]:hover::after,[data-ayuda]:focus::after{border-color:var(--oro);color:var(--oro-t)}
.delta{display:inline-block;margin-top:5px;font-size:12.5px;font-weight:600;line-height:1.35}.delta.sube{color:var(--verde)}.delta.baja{color:var(--rojo)}.delta.igual{color:var(--gris);font-weight:500}
.ayuda-flot{position:absolute;z-index:90;max-width:340px;background:var(--tinta);color:var(--papel);font:14px/1.55 var(--sans);padding:12px 14px;border-radius:12px;box-shadow:0 16px 36px -14px rgba(0,0,0,.55);pointer-events:none}
.ayuda-flot[hidden]{display:none}
.graf{width:100%;height:300px}.graf .aviso{margin:20px 0}.tarjeta.ancha{grid-column:1/-1}.nota-g{font-size:12.5px;color:var(--gris);margin:8px 0 0}
a.cel{text-decoration:none;display:block;transition:border-color .15s,transform .15s}a.cel:hover{border-color:var(--oro);transform:translateY(-1px)}a.cel.sel{outline:3px solid var(--oro);outline-offset:1px}
.anuns{display:grid;gap:14px;margin-top:14px}.anun{background:var(--card);border:1px solid var(--linea);border-radius:18px;padding:18px}.anun.pausado,.anun.archivado{opacity:.82}
.anun-cab{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.anun-cab h4{margin:0;font:600 21px/1.2 var(--serif)}.anun-cab .est{margin-left:auto}
.anun-logo,.anun-ini{width:52px;height:52px;border-radius:12px;flex:none}.anun-logo{object-fit:contain;background:#fff;border:1px solid var(--linea)}.anun-ini{display:grid;place-items:center;font:700 21px var(--serif)}
.est{display:inline-flex;align-items:center;min-height:28px;padding:3px 12px;border-radius:999px;font-size:13px;font-weight:700}
.est.ok{background:rgba(30,123,79,.14);color:var(--verde)}.est.pronto{background:rgba(184,137,43,.2);color:var(--oro-t)}.est.urgente{background:rgba(179,38,30,.13);color:var(--rojo)}.est.gris{background:var(--linea);color:var(--gris)}
.anun-datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 20px;margin:14px 0 4px;font-size:14.5px}
.anun-datos small{display:block;color:var(--gris);font-size:12.5px;font-weight:600;margin-bottom:2px}.anun-datos a{color:var(--oro-t);overflow-wrap:anywhere}
.anun details{border-top:1px solid var(--linea);margin-top:10px}.anun summary{cursor:pointer;font-weight:600;color:var(--oro-t);min-height:46px;display:flex;align-items:center}
.nuevo-anun>summary{list-style:none;cursor:pointer}.nuevo-anun>summary::-webkit-details-marker{display:none}
.acciones-anun{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.acciones-anun form{display:contents}.btn.chico{min-height:44px;padding:0 16px;font-size:14px}
.form-anun{display:grid;gap:14px;margin:8px 0 12px}
.form-anun fieldset{border:1px solid var(--linea);border-radius:14px;padding:12px 14px 14px;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;min-width:0}
.form-anun legend{font-weight:700;font-size:15px;padding:0 6px}.form-anun label{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:600;min-width:0}
.form-anun input,.form-anun select,.form-anun textarea{font:16px var(--sans);padding:10px 12px;border:1.5px solid var(--linea);border-radius:10px;background:var(--papel);color:var(--tinta);min-height:46px;width:100%;box-sizing:border-box}
.form-anun input:focus,.form-anun select:focus,.form-anun textarea:focus{outline:3px solid rgba(184,137,43,.45);border-color:var(--oro)}
.form-anun input[type=color]{padding:4px;cursor:pointer}.form-anun .ancho{grid-column:1/-1}.form-anun .ac{font-weight:400;color:var(--gris);font-size:12.5px}
.form-anun label.check{flex-direction:row;align-items:center;gap:8px;font-weight:500}.form-anun label.check input{width:22px;min-height:22px}
.tabla-c{width:100%;border-collapse:collapse;font-size:14px}.tabla-c th,.tabla-c td{padding:8px;border-bottom:1px solid var(--linea);text-align:left;vertical-align:top}.tabla-c th{color:var(--gris);font-size:12.5px}
.marcas-p{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.aviso-ok{border-left:4px solid var(--verde);background:rgba(30,123,79,.09);padding:10px 14px;border-radius:10px;font-size:15px}
.aviso-mal{border-left:4px solid var(--rojo);background:rgba(179,38,30,.09);padding:10px 14px;border-radius:10px;font-size:15px;color:var(--rojo)}
@media (max-width:560px){.cifras.k5,.marcas-p{grid-template-columns:repeat(2,minmax(0,1fr))}.cifra[data-ayuda]{padding-right:28px}.graf{height:260px}.tab-filtros label{flex:1 1 140px}.tab-filtros select{min-width:0;width:100%}.anun-cab .est{margin-left:0}.anun{padding:16px 14px}}
@media (prefers-reduced-motion:reduce){a.cel,.cifra[data-ayuda]{transition:none}a.cel:hover{transform:none}}`;

// Navegador del panel: ventanas de ayuda (cursor, foco y toque), filtros que se aplican solos y gráficos con los colores del tema.
const TABLERO_JS = String.raw`(function(){
var tip=document.createElement('div');tip.className='ayuda-flot';tip.id='ayuda-flot';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
var act=null,fijo=false;
function poner(el){var r=el.getBoundingClientRect(),w=Math.min(340,innerWidth-16);tip.style.maxWidth=w+'px';tip.style.left='0px';tip.style.top='0px';var tw=tip.offsetWidth,th=tip.offsetHeight;
var x=Math.min(Math.max(8,r.left+r.width/2-tw/2),innerWidth-tw-8),y=r.bottom+8;if(y+th>innerHeight-8&&r.top-th-8>8)y=r.top-th-8;tip.style.left=(x+scrollX)+'px';tip.style.top=(y+scrollY)+'px'}
function mostrar(el){if(act&&act!==el)act.removeAttribute('aria-describedby');act=el;tip.textContent=el.getAttribute('data-ayuda');tip.hidden=false;el.setAttribute('aria-describedby','ayuda-flot');poner(el)}
function ocultar(){if(act)act.removeAttribute('aria-describedby');act=null;fijo=false;tip.hidden=true}
document.querySelectorAll('[data-ayuda]').forEach(function(el){
el.addEventListener('mouseenter',function(){if(!fijo)mostrar(el)});el.addEventListener('mouseleave',function(){if(!fijo&&act===el)ocultar()});
el.addEventListener('focus',function(){mostrar(el)});el.addEventListener('blur',function(){if(act===el)ocultar()});
el.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('a,button'))return;if(act===el&&fijo){ocultar()}else{mostrar(el);fijo=true}e.stopPropagation()})});
document.addEventListener('click',function(){if(fijo)ocultar()});document.addEventListener('keydown',function(e){if(e.key==='Escape')ocultar()});
addEventListener('scroll',function(){if(act)poner(act)},{passive:true});addEventListener('resize',function(){if(act)poner(act)});
var fa=document.querySelector('.tab-filtros');if(fa){var an=fa.querySelector('[name=anio]'),me=fa.querySelector('[name=mes]');
fa.querySelectorAll('select').forEach(function(s){s.addEventListener('change',function(){if(s===an){me.disabled=!an.value;if(!an.value)me.value=''}fa.submit()})})}
var nodo=document.getElementById('tablero-datos');if(!nodo)return;var D;try{D=JSON.parse(nodo.textContent)}catch(e){return}
var nf=new Intl.NumberFormat('es-CL'),nf1=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1});
function C(){var s=getComputedStyle(document.documentElement),v=function(n){return s.getPropertyValue(n).trim()};return{t:v('--tinta'),t2:v('--tinta2'),o:v('--oro'),g:v('--gris'),l:v('--linea'),c:v('--card'),ve:v('--verde'),r:v('--rojo')}}
function suma(a){var t=0;for(var i=0;i<a.length;i++)t+=a[i]||0;return t}
function base(c,o){var b={animationDuration:450,textStyle:{color:c.g,fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'},
tooltip:{confine:true,backgroundColor:c.c,borderColor:c.l,textStyle:{color:c.t,fontSize:13},extraCssText:'border-radius:10px;box-shadow:0 10px 26px -12px rgba(0,0,0,.4)'},grid:{left:6,right:16,top:26,bottom:6,containLabel:true}};
for(var k in o){if(k==='tooltip'){for(var j in o.tooltip)b.tooltip[j]=o.tooltip[j]}else b[k]=o[k]}return b}
function cat(c,d,x){var a={type:'category',data:d,axisLine:{lineStyle:{color:c.l}},axisTick:{show:false},axisLabel:{color:c.g,fontSize:12}};for(var k in x||{})a[k]=x[k];return a}
function val(c,x){var a={type:'value',splitLine:{lineStyle:{color:c.l,type:'dashed'}},axisLabel:{color:c.g,fontSize:12,formatter:function(v){return nf.format(v)}}};for(var k in x||{})a[k]=x[k];return a}
function leyenda(c){return{bottom:0,icon:'roundRect',itemWidth:12,itemHeight:12,textStyle:{color:c.g,fontSize:12.5}}}
function horiz(c,filas,nombre,color,fmt){if(!filas.length||!suma(filas.map(function(f){return f[1]})))return null;var f=filas.slice().reverse();
return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:fmt||function(v){return nf.format(v)}},grid:{left:6,right:56,top:6,bottom:6,containLabel:true},
xAxis:val(c,{minInterval:1,splitNumber:3}),yAxis:cat(c,f.map(function(x){return x[0]}),{axisLabel:{color:c.t,fontSize:12.5,width:170,overflow:'truncate'}}),
series:[{name:nombre,type:'bar',data:f.map(function(x){return x[1]}),barMaxWidth:20,itemStyle:{color:color,borderRadius:[0,5,5,0]},label:{show:true,position:'right',color:c.g,fontSize:12,formatter:function(p){return fmt?fmt(p.value):nf.format(p.value)}}}]})}
function dona(c,filas,u){var tot=suma(filas.map(function(f){return f[1]}));if(!filas.length||!tot)return null;var pc={};filas.forEach(function(f){pc[f[0]]=nf1.format(f[1]/tot*100)+' %'});
var lg=leyenda(c);lg.formatter=function(n){return n+'  '+pc[n]};lg.orient='vertical';lg.left='center';
return base(c,{color:[c.t,c.o,c.ve,'#7C8DA6',c.r,'#A77BCA','#5AA9C9'],tooltip:{trigger:'item',formatter:function(p){return p.marker+p.name+'<br><b>'+nf.format(p.value)+'</b> '+u+' ('+nf1.format(p.percent)+' %)'}},legend:lg,
series:[{type:'pie',radius:['38%','60%'],center:['50%',filas.length>3?'32%':'38%'],itemStyle:{borderColor:c.c,borderWidth:2},label:{show:false},labelLine:{show:false},data:filas.map(function(x){return{name:x[0],value:x[1]}})}]})}
var G={
tendencia:function(c){var T=D.ten;if(!suma(T.pv)&&!suma(T.dv)&&!suma(T.su))return null;var mes=D.agrupar==='mes',P={};(T.parcial||[]).forEach(function(i){P[i]=1});
return base(c,{legend:leyenda(c),grid:{left:6,right:16,top:26,bottom:36,containLabel:true},tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var i=ps[0].dataIndex,h='<b>'+T.x[i]+'</b>'+(P[i]?' <span style="opacity:.7">(día parcial)</span>':'');
ps.forEach(function(p){h+='<br>'+p.marker+p.seriesName+': <b>'+(p.value===null||p.value===undefined?'sin medir':nf.format(p.value))+'</b>'});return h}},
xAxis:cat(c,T.x,{axisLabel:{color:c.g,fontSize:12,hideOverlap:true}}),yAxis:val(c,{minInterval:1}),
series:[{name:'Visitas a la portada',type:'bar',stack:'v',data:T.pv,barMaxWidth:30,itemStyle:{color:c.t}},{name:'Visitas al diario',type:'bar',stack:'v',data:T.dv,barMaxWidth:30,itemStyle:{color:c.o,borderRadius:[4,4,0,0]}},
{name:mes?'Personas distintas por día (promedio)':'Personas distintas en el sitio',type:'line',data:T.su,smooth:true,symbol:'circle',symbolSize:7,lineStyle:{width:2.5,color:c.ve},itemStyle:{color:c.ve},z:5}]})},
horas:function(c){if(!D.totDims)return null;var mx=Math.max.apply(null,D.horas),x=[];for(var i=0;i<24;i++)x.push((i<10?'0':'')+i+':00');
return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var i=ps[0].dataIndex;return '<b>'+x[i]+' a '+x[(i+1)%24]+'</b><br>'+nf.format(ps[0].value)+' visitas'}},xAxis:cat(c,x,{axisLabel:{color:c.g,fontSize:11.5,interval:2,formatter:function(v){return Number(v.slice(0,2))+' h'}}}),yAxis:val(c,{minInterval:1}),
series:[{type:'bar',data:D.horas.map(function(v){return{value:v,itemStyle:{color:v===mx&&v>0?c.o:c.t2,borderRadius:[4,4,0,0]}}}),barMaxWidth:18}]})},
semana:function(c){if(!D.diasSemana||!suma(D.semana))return null;var mx=Math.max.apply(null,D.semana.map(function(v){return v||0}));return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:function(v){return v===null||v===undefined?'sin datos':nf.format(v)+' personas al día'}},
xAxis:cat(c,D.dsem),yAxis:val(c,{minInterval:1}),series:[{name:'Promedio',type:'bar',barMaxWidth:34,data:D.semana.map(function(v){return{value:v,itemStyle:{color:v===mx&&v>0?c.o:c.t2,borderRadius:[5,5,0,0]}}})}]})},
origen:function(c){return dona(c,D.origen,'visitas')},disp:function(c){return dona(c,D.disp,'visitas')},
paises:function(c){return horiz(c,D.paises,'Visitantes',c.t2)},sitios:function(c){return horiz(c,D.sitios,'Visitas',c.t2)},
secciones:function(c){if(!D.secciones.length)return null;var f=D.secciones.slice().reverse();return base(c,{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(ps){var r=f[ps[0].dataIndex];return '<b>'+r[1]+'</b><br>'+nf1.format(r[2])+' min de lectura<br>'+nf.format(r[3])+' lecturas<br><span style="opacity:.7">Toca para filtrar por esta sección</span>'}},
grid:{left:6,right:70,top:6,bottom:6,containLabel:true},xAxis:val(c,{splitNumber:3}),yAxis:cat(c,f.map(function(r){return r[1]}),{axisLabel:{color:c.t,fontSize:12.5}}),
series:[{type:'bar',barMaxWidth:18,cursor:'pointer',data:f.map(function(r){return{value:r[2],itemStyle:{color:D.sel?(r[0]===D.sel?c.o:c.l):c.o,borderRadius:[0,5,5,0]}}}),label:{show:true,position:'right',color:c.g,fontSize:12,formatter:function(p){return (p.value>=100?nf.format(Math.round(p.value)):nf1.format(p.value))+' min'}}}]})},
secdia:function(c){var S=D.secDia;if(!suma(S.min))return null;return base(c,{legend:leyenda(c),grid:{left:6,right:16,top:26,bottom:36,containLabel:true},tooltip:{trigger:'axis'},xAxis:cat(c,S.x,{axisLabel:{color:c.g,fontSize:12,hideOverlap:true}}),
yAxis:[val(c),val(c,{splitLine:{show:false},minInterval:1})],series:[{name:'Minutos de lectura',type:'bar',data:S.min,barMaxWidth:26,itemStyle:{color:c.o,borderRadius:[4,4,0,0]}},{name:'Lecturas',type:'line',yAxisIndex:1,data:S.v,smooth:true,symbol:'circle',symbolSize:6,lineStyle:{color:c.t2,width:2},itemStyle:{color:c.t2}}]})},
ediciones:function(c){return horiz(c,D.ediciones,D.edTipo==='min'?'Minutos':'Lectores',c.o,D.edTipo==='min'?function(v){return nf1.format(v)+' min'}:null)},
clics:function(c){if(!D.clics.length)return null;var f=D.clics.slice().reverse();return base(c,{legend:leyenda(c),grid:{left:6,right:40,top:6,bottom:36,containLabel:true},tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},xAxis:val(c,{minInterval:1,splitNumber:3}),
yAxis:cat(c,f.map(function(r){return r[0]}),{axisLabel:{color:c.t,fontSize:12.5,width:170,overflow:'truncate'}}),series:[{name:'Clics',type:'bar',barMaxWidth:16,data:f.map(function(r){return r[1]}),itemStyle:{color:c.o,borderRadius:[0,5,5,0]}},{name:'Personas distintas',type:'bar',barMaxWidth:16,data:f.map(function(r){return r[2]}),itemStyle:{color:c.t2,borderRadius:[0,5,5,0]}}]})}};
function irSeccion(p){var f=D.secciones.slice().reverse(),r=f[p.dataIndex];if(!r)return;var q=new URLSearchParams(location.search);q.delete('anuncios');if(D.sel===r[0])q.delete('seccion');else q.set('seccion',r[0]);location.href='/panel'+(q.toString()?'?'+q.toString():'')+'#lectura'}
function pintar(){if(!window.echarts){document.querySelectorAll('.graf').forEach(function(g){if(!g.firstChild)g.innerHTML='<p class="aviso">No se pudo cargar la librería de gráficos. Recarga la página.</p>'});return}
var c=C();Object.keys(G).forEach(function(k){var g=document.getElementById('g-'+k);if(!g)return;var o=null;try{o=G[k](c)}catch(e){o=null}var ch=echarts.getInstanceByDom(g);
if(!o){if(ch)ch.dispose();g.innerHTML='<p class="aviso">'+(g.getAttribute('data-vacio')||'Sin datos en este período.')+'</p>';g.removeAttribute('role');g.style.height='auto';return}
if(!ch){g.innerHTML='';ch=echarts.init(g,null,{renderer:'svg'});if(k==='secciones')ch.on('click',irSeccion)}ch.setOption(o,true)})}
function inicio(){pintar();new MutationObserver(function(){setTimeout(pintar,40)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
if(window.matchMedia){var mq=matchMedia('(prefers-color-scheme: dark)');if(mq.addEventListener)mq.addEventListener('change',pintar)}
var rz;addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){if(!window.echarts)return;document.querySelectorAll('.graf').forEach(function(g){var ch=echarts.getInstanceByDom(g);if(ch)ch.resize()})},120)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inicio);else inicio()})();`;
