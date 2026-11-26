// =====================================================================================================================
// 23-11-2026 · REPUBLICA COFRADE NEWS: recuadro para pegar en otros sitios, canal RSS, fichas al compartir y aviso a buscadores.
// Germán, 19:37: «Deja una semilla en múltiples páginas webs y redes sociales para que republiquen nuestro newsletter y capten nuevos
// lectores». Se le advirtió que sembrar enlaces en sitios ajenos es spam (bloqueos, castigo de Google, pérdida de credibilidad) y
// aprobó, 19:42: «aplica todo lo propuesto, y todo lo que puedas automatizar y validar de mi parte de forma automática y permanente».
// La semilla queda en NUESTRO sitio y otros la usan por su cuenta:
//  · /republica  página con el código para pegar, la vista previa y las condiciones.
//  · /widget     recuadro «Las 3 del día» (se puede incrustar en cualquier sitio; cada carga y cada clic se cuentan por sitio).
//  · /widget.js  una línea de código que pega el recuadro y ajusta su alto solo.
//  · /rss.xml    canal RSS 2.0 con aviso WebSub (lectores de noticias y sitios que republican por RSS).
//  · fichas Open Graph y Twitter con imagen (/og.png) y datos de noticia (JSON-LD) en la portada y en cada edición.
//  · /<clave>.txt de IndexNow: el flujo «Índice de ediciones» avisa a Bing y otros buscadores al publicar (herramientas/difusion_datos.py).
// Solo se republica el resumen «Las 3 del día» y siempre enlaza a cofrad.es: la edición completa sigue protegida como antes.
// =====================================================================================================================
const INDEXNOW_KEY = "d14dc1b3928cadd21d5ac21eed6d825a";
const OG_IMG = `https://${DOMINIO}/og.png`;
const TABLAS_REPUBLICA = ["CREATE TABLE IF NOT EXISTS republica (fecha TEXT NOT NULL, sitio TEXT NOT NULL, vistas INTEGER NOT NULL DEFAULT 0, clics INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, sitio))"];
let _tablasRep = null;
function asegurarRepublica(env) {
  if (!_tablasRep) _tablasRep = env.DB.batch(TABLAS_REPUBLICA.map((q) => env.DB.prepare(q))).then(() => true, (e) => { _tablasRep = null; throw e; });
  return _tablasRep;
}
async function resumenes(ctx) {
  try {
    const r = await desdeGitHub("datos/resumenes.json", 300, ctx);
    const j = r ? await r.json() : null;
    return (j && Array.isArray(j.ediciones) ? j.ediciones : []).filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(x.f) && Array.isArray(x.tres) && x.tres.length);
  } catch { return []; }
}
async function resumenDe(fecha, ctx) { return (await resumenes(ctx)).find((x) => x.f === fecha) || null; }
const sitioDe = (t) => { try { const h = new URL(String(t || "")).hostname.toLowerCase().replace(/^www\./, ""); return /^[a-z0-9.-]{3,80}$/.test(h) && h.includes(".") && !/(^|\.)cofrad\.es$/.test(h) && !/^(localhost|127\.|10\.|192\.168\.)/.test(h) ? h : ""; } catch { return ""; } };
async function contarRepublica(req, env, sitio, campo) {
  try {
    if (!env.DB || !sitio) return;
    const ua = req.headers.get("User-Agent") || "";
    if (!ua || BOT_UA.test(ua)) return;
    if (!(await bajoLimite(env, "w:" + (await hmacDif(env, ["rep", fechaChile(), req.headers.get("CF-Connecting-IP") || "", ua].join("|")))))) return;
    await asegurarRepublica(env);
    await env.DB.prepare(`INSERT INTO republica (fecha, sitio, ${campo}) VALUES (?, ?, 1) ON CONFLICT(fecha, sitio) DO UPDATE SET ${campo} = ${campo} + 1`).bind(fechaChile(), sitio).run();
  } catch { /* contar nunca rompe nada */ }
}
// ---------- fichas para compartir y datos de noticia ----------
function fichaEdicion(fecha, res) {
  const titulo = (res && res.titulo) || `Cofrade News · ${fechaLarga(fecha)}`;
  const desc = res ? res.tres.join(" · ").slice(0, 297) + (res.tres.join(" · ").length > 297 ? "…" : "") : "El boletín matinal de Chile: economía, política, mar, indicadores y mundo, con cada dato y su fuente.";
  const url = `https://${DOMINIO}/edicion/${fecha}`;
  const ld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: titulo.slice(0, 110), description: desc, datePublished: `${fecha}T07:00:00-03:00`,
    dateModified: `${fecha}T07:00:00-03:00`, inLanguage: "es-CL", url, mainEntityOfPage: url, image: [OG_IMG], isAccessibleForFree: true,
    author: { "@type": "Organization", name: "Cofrade News", url: `https://${DOMINIO}/` },
    publisher: { "@type": "Organization", name: "Cofrade News", logo: { "@type": "ImageObject", url: `https://${DOMINIO}/icono-512.png`, width: 512, height: 512 } } };
  return `<meta property="og:type" content="article"><meta property="og:site_name" content="Cofrade News"><meta property="og:title" content="${esc(titulo)}">`
    + `<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="es_CL">`
    + `<meta property="og:image" content="${OG_IMG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Cofrade News, el boletín matinal de Chile">`
    + `<meta property="article:published_time" content="${fecha}T07:00:00-03:00"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titulo)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${OG_IMG}">`
    + `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}"><link rel="alternate" type="application/rss+xml" title="Cofrade News" href="https://${DOMINIO}/rss.xml">`
    + `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
}
const FICHA_SITIO = `<meta property="og:site_name" content="Cofrade News"><meta property="og:image" content="${OG_IMG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`
  + `<meta property="og:image:alt" content="Cofrade News, el boletín matinal de Chile"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${OG_IMG}">`
  + `<link rel="alternate" type="application/rss+xml" title="Cofrade News" href="https://${DOMINIO}/rss.xml">`
  + `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": "NewsMediaOrganization", "@id": `https://${DOMINIO}/#org`, name: "Cofrade News", url: `https://${DOMINIO}/`, logo: `https://${DOMINIO}/icono-512.png`, foundingLocation: "Santiago, Chile" },
    { "@type": "WebSite", "@id": `https://${DOMINIO}/#web`, name: "Cofrade News", url: `https://${DOMINIO}/`, inLanguage: "es-CL", publisher: { "@id": `https://${DOMINIO}/#org` } }] }).replace(/</g, "\\u003c")}</script>`;
// ---------- RSS ----------
const xmlEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
function rfc822(fecha) { return new Date(`${fecha}T10:00:00Z`).toUTCString(); }
async function rss(ctx) {
  const L = (await resumenes(ctx)).slice(0, 30), hoy = fechaChile();
  const items = L.filter((x) => x.f <= hoy).map((x) => {
    const url = `https://${DOMINIO}/edicion/${x.f}`;
    const cuerpo = `<p><b>Lo que mueve la aguja hoy</b></p><ol>${x.tres.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><p><a href="${url}">Lee la edición completa en Cofrade News</a>, gratis cada mañana.</p>`;
    return `<item><title>${xmlEsc(x.titulo)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${rfc822(x.f)}</pubDate>`
      + `<description>${xmlEsc(x.tres.join(" · "))}</description><content:encoded><![CDATA[${cuerpo.replace(/\]\]>/g, "]]&gt;")}]]></content:encoded>`
      + `<enclosure url="${OG_IMG}" length="30445" type="image/png"/></item>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Cofrade News</title><link>https://${DOMINIO}/</link><description>El boletín matinal de Chile: economía, política, mar, indicadores y mundo, con cada dato y su fuente. Gratis cada mañana.</description>
<language>es-cl</language><copyright>© ${hoy.slice(0, 4)} Cofrade News</copyright><ttl>60</ttl>
<atom:link href="https://${DOMINIO}/rss.xml" rel="self" type="application/rss+xml"/><atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>
<image><url>https://${DOMINIO}/icono-512.png</url><title>Cofrade News</title><link>https://${DOMINIO}/</link></image>
${items}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*", ...SEGURIDAD } });
}
// ---------- recuadro para otros sitios ----------
async function widget(req, env, ctx) {
  const u = new URL(req.url), oscuro = u.searchParams.get("tema") === "oscuro", L = await resumenes(ctx), hoy = fechaChile();
  const x = L.find((e) => e.f <= hoy);
  const sitio = sitioDe(req.headers.get("Referer")) || sitioDe(u.searchParams.get("sitio") ? "https://" + u.searchParams.get("sitio") : "");
  if (sitio) ctx.waitUntil(contarRepublica(req, env, sitio, "vistas"));
  const ir = (ruta) => `https://${DOMINIO}${ruta}${ruta.includes("?") ? "&" : "?"}w=${encodeURIComponent(sitio || "directo")}`;
  const c = oscuro ? { f: "#0B1F3A", t: "#F5EFE2", s: "#C9D2E0", l: "rgba(201,161,74,.45)", o: "#E0B85C" } : { f: "#FBF8F1", t: "#0B1F3A", s: "#3B4A5E", l: "#E4D9C3", o: "#8A6416" };
  const cuerpo = x ? `<p class="f">${esc(fechaLarga(x.f))}</p><h2>Lo que mueve la aguja hoy</h2><ol>${x.tres.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
<p class="b"><a class="btn" href="${ir("/edicion/" + x.f)}" target="_blank" rel="noopener">Leer la edición completa</a><a class="sus" href="${ir("/")}" target="_blank" rel="noopener">Gratis cada mañana →</a></p>`
    : `<h2>Cofrade News</h2><p>El boletín matinal de Chile.</p><p class="b"><a class="btn" href="${ir("/")}" target="_blank" rel="noopener">Ver la edición de hoy</a></p>`;
  const pagina = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Cofrade News · Lo que mueve la aguja hoy</title>
<style>*{box-sizing:border-box}html,body{margin:0;background:${c.f};color:${c.t};font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{border:1px solid ${c.l};border-top:4px solid #B8892B;border-radius:10px;padding:14px 16px 12px}.cab{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}
.cab img{width:34px;height:34px;border-radius:7px}.cab b{font:700 19px Georgia,"Times New Roman",serif;letter-spacing:.2px}.f{margin:10px 0 0;font-size:12.5px;color:${c.s}}
h2{margin:2px 0 6px;font:700 17px Georgia,"Times New Roman",serif;color:${c.o}}ol{margin:0;padding-left:20px}li{margin:0 0 7px}.b{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:10px 0 2px}
.btn{display:inline-block;background:#B8892B;color:#fff;text-decoration:none;font-weight:600;padding:9px 14px;border-radius:8px;min-height:40px}.sus{color:${c.o};font-weight:600}
.pie{margin:8px 0 0;font-size:11.5px;color:${c.s}}.pie a{color:inherit}a:focus-visible{outline:3px solid #B8892B;outline-offset:2px}</style></head><body>
<div class="w"><a class="cab" href="${ir("/")}" target="_blank" rel="noopener"><img src="/icono-192.png" alt="" width="34" height="34"><b>Cofrade News</b></a>
${cuerpo}<p class="pie">Resumen de Cofrade News, publicado con su autorización. <a href="${ir("/republica")}" target="_blank" rel="noopener">Ponlo en tu sitio</a></p></div>
<script>(function(){function a(){try{parent.postMessage({cn:"alto",h:document.documentElement.scrollHeight},"*")}catch(e){}}addEventListener("load",a);addEventListener("resize",a);setTimeout(a,400)})();</script></body></html>`;
  return new Response(pagina, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600",
    "Content-Security-Policy": `default-src 'none'; img-src https://${DOMINIO} 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors *; base-uri 'none'`,
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" } });
}
const WIDGET_JS = `(function(){var s=document.currentScript;if(!s)return;var t=s.getAttribute("data-tema")==="oscuro"?"oscuro":"claro";
var f=document.createElement("iframe");f.src="https://${DOMINIO}/widget?tema="+t+"&sitio="+encodeURIComponent(location.hostname);f.title="Cofrade News: Lo que mueve la aguja hoy";
f.loading="lazy";f.style.cssText="width:100%;max-width:640px;height:360px;border:0;display:block;overflow:hidden";f.setAttribute("scrolling","no");
s.parentNode.insertBefore(f,s.nextSibling);addEventListener("message",function(e){if(e.origin==="https://${DOMINIO}"&&e.source===f.contentWindow&&e.data&&e.data.cn==="alto"&&e.data.h>80&&e.data.h<2000)f.style.height=e.data.h+"px"})})();`;
function paginaRepublica() {
  const s1 = `<script src="https://${DOMINIO}/widget.js" async></script>`, s2 = `<script src="https://${DOMINIO}/widget.js" data-tema="oscuro" async></script>`;
  const s3 = `<iframe src="https://${DOMINIO}/widget" title="Cofrade News: Lo que mueve la aguja hoy" style="width:100%;max-width:640px;height:380px;border:0"></iframe>`;
  const bloque = (id, t) => `<div class="rp-cod"><pre id="${id}">${esc(t)}</pre><button type="button" class="btn linea rp-copiar" data-de="${id}">Copiar código</button></div>`;
  const cuerpo = `<section style="border:0"><h1>Republica Cofrade News en tu sitio</h1>
<p class="lede">Lleva «Lo que mueve la aguja hoy» de Cofrade News a tu web, blog, intranet, club, municipio o medio. Es gratis, se actualiza solo cada mañana y no tienes que hacer nada más.</p>
<h2>Así se ve</h2><iframe class="rp-vista" src="/widget" title="Vista previa del recuadro de Cofrade News"></iframe>
<h2>Cómo ponerlo (1 minuto)</h2><ol class="rp-pasos"><li>Copia el código de abajo con el botón «Copiar código».</li><li>En tu sitio, abre el editor de la página donde lo quieres (en WordPress: bloque «HTML personalizado»; en Wix: «Insertar código»; en Blogger: gadget «HTML/JavaScript»).</li><li>Pega el código y guarda. Listo: cada mañana aparece la edición nueva.</li></ol>
<h3>Recuadro claro (recomendado)</h3>${bloque("rpC1", s1)}<h3>Recuadro oscuro</h3>${bloque("rpC2", s2)}<h3>Si tu sitio no acepta scripts</h3>${bloque("rpC3", s3)}
<h2>Por RSS</h2><p>Si tu sitio, tu aplicación o tu lector de noticias (Feedly, Inoreader, Flipboard) funciona con RSS, usa esta dirección: <a href="/rss.xml">https://${DOMINIO}/rss.xml</a>. Trae cada edición con «Lo que mueve la aguja hoy» y su enlace.</p>
<h2>Condiciones</h2><ul><li>Puedes publicar el recuadro o el RSS gratis, sin pedir permiso, en cualquier sitio que no promueva el odio, la violencia o actividades ilegales.</li><li>El texto va tal cual, sin cambios, con el nombre Cofrade News y su enlace a www.cofrad.es.</li><li>La edición completa no se copia ni se reproduce: se lee en www.cofrad.es.</li><li>Si quieres un formato especial o una alianza, escríbenos al Buzón.</li></ul>
<h2>¿Prefieres compartir con tus contactos?</h2><p>Usa el botón Compartir de la portada o de la edición: con tu enlace personal del concurso «Comparte Cofrade News», cada persona distinta que lo abre suma una participación.</p></section>
<style>.rp-vista{width:100%;max-width:640px;height:400px;border:0;display:block;margin:8px 0 18px}.rp-cod{margin:6px 0 16px}.rp-cod pre{white-space:pre-wrap;word-break:break-all;background:rgba(11,31,58,.06);border:1px solid rgba(184,137,43,.35);border-radius:8px;padding:12px;font:13.5px/1.45 ui-monospace,Menlo,Consolas,monospace;margin:0 0 8px}.rp-pasos li{margin-bottom:6px}</style>
<script>document.querySelectorAll(".rp-copiar").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById(b.getAttribute("data-de")).textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent="¡Copiado!";setTimeout(function(){b.textContent="Copiar código"},1800)},function(){var r=document.createRange();r.selectNodeContents(document.getElementById(b.getAttribute("data-de")));var s=getSelection();s.removeAllRanges();s.addRange(r)})})})</script>`;
  return html(marco({ titulo: "Republica Cofrade News en tu sitio · Gratis", descripcion: "Pon «Lo que mueve la aguja hoy» de Cofrade News en tu web, blog o medio: gratis, se actualiza solo cada mañana. Código para copiar y RSS.", cuerpo, canonica: "/republica" }),
    200, {}, csp({ frame: " 'self'" }));
}
// ---------- Panel: qué sitios nos republican ----------
async function seccionRepublica(env) {
  try {
    await asegurarRepublica(env);
    const desde = fechaChile(new Date(Date.now() - 29 * 86400000));
    const r = await env.DB.prepare("SELECT sitio, SUM(vistas) v, SUM(clics) c, MIN(fecha) p, MAX(fecha) u FROM republica WHERE fecha >= ? GROUP BY sitio ORDER BY v DESC LIMIT 40").bind(desde).all();
    const L = (r && r.results) || [];
    const filas = L.map((x) => `<tr><td>${esc(x.sitio)}</td><td>${Number(x.v || 0).toLocaleString("es-CL")}</td><td>${Number(x.c || 0).toLocaleString("es-CL")}</td><td>${esc(x.p)} a ${esc(x.u)}</td></tr>`).join("");
    return `<section id="republica"><h3>Sitios que republican Cofrade News (30 días)</h3><p class="aviso">Cada sitio que pegó el recuadro de <a href="/republica">/republica</a>: cuántas veces se mostró y cuántos clics trajo. Se cuenta solo, sin datos personales.</p>`
      + (L.length ? `<div class="tabla"><table><thead><tr><th>Sitio</th><th>Vistas</th><th>Clics a cofrad.es</th><th>Período</th></tr></thead><tbody>${filas}</tbody></table></div>` : `<p>Aún ningún sitio ha pegado el recuadro.</p>`) + `</section>`;
  } catch { return `<section id="republica"><h3>Sitios que republican Cofrade News</h3><p class="aviso">No se pudo leer esta sección. Intenta de nuevo en un momento.</p></section>`; }
}
