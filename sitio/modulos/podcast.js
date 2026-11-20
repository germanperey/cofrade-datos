// =====================================================================================================================
// 20-11-2026 · PODCAST de Cofrade News: fuente diaria para Gemini Notebook (antes NotebookLM), episodios de YouTube en la portada,
// página /podcast y sección «Podcast» del Panel con el conversor de audio a video (portada fija) que corre en el navegador.
// Germán, 05:39: «quiero que me ayudes a implementar un "Podcast", para crear audios que iré subiendo a Youtube, y los links deberán
// estar disponible (ordenados por fecha) en el Landing page de www.cofrad.es .... utilicemos mi cuenta de "Notebook LM" de Google,
// para que diariamente pueda crear un mini Podcast con las noticias del día, basándose en los principales temas del índice».
// Respuestas: canal https://www.youtube.com/@cofradia_networking; «Audio con portada fija»; «Corto, 5 a 8 minutos».
// La fuente del día la arma GitHub (herramientas/podcast_fuente.py → podcast/fuentes/AAAA-MM-DD.md). Los episodios se leen de la
// lista de reproducción del podcast con la API oficial de YouTube (clave gratuita YOUTUBE_API_KEY, 1 unidad por consulta, cada 2 h)
// o se agregan a mano en el Panel. Sin la clave ni la lista, la portada muestra «muy pronto».
// =====================================================================================================================
const PODCAST = {
  canal: "https://www.youtube.com/@cofradia_networking", cadaMin: 120, maxPaginas: 4,
  secciones: ["Economía, Negocios e Inversión", "Política y Actualidad", "Emprendimiento", "Tecnología, Tendencias e Innovación",
    "Conflictos bélicos vigentes", "Indicadores económicos", "Crecimiento inmobiliario en Chile"],
  notebook: "https://notebooklm.google.com/", studio: "https://studio.youtube.com/",
};
// Indicaciones para el cuadro «Personalizar» del audio (menos de 500 caracteres: el cuadro tiene tope)
const PODCAST_INDICACIONES = "Podcast breve de 5 a 8 minutos, en español de Chile, con tono cercano y profesional. Recorre en este orden: Economía; Política; Emprendimiento; Tecnología; Conflictos bélicos; Indicadores económicos; Crecimiento inmobiliario. Usa solo la fuente: sin datos, cifras ni opiniones que no estén ahí; nombra el medio de las noticias clave. Abre con «Bienvenidos a Cofrade News» y cierra invitando a leer la edición completa en cofrad.es.";
const TABLAS_PODCAST = [
  "CREATE TABLE IF NOT EXISTS podcast_episodios (video TEXT PRIMARY KEY, titulo TEXT NOT NULL, publicado TEXT NOT NULL, fecha TEXT, miniatura TEXT, origen TEXT NOT NULL, oculto INTEGER NOT NULL DEFAULT 0, creado TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS podcast_episodios_orden ON podcast_episodios (oculto, fecha, publicado)",
];
let _tablasPod = null;
function asegurarPodcast(env) {
  if (!_tablasPod) _tablasPod = env.DB.batch(TABLAS_PODCAST.map((q) => env.DB.prepare(q))).then(() => true, (e) => { _tablasPod = null; throw e; });
  return _tablasPod;
}
const MESES_POD = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// Identificador de un video de YouTube desde su enlace (watch, youtu.be, shorts, live, embed) o el identificador solo
function idVideo(t) {
  const s = String(t || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(s); } catch { return null; }
  const h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let id = null;
  if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (h === "youtube.com" || h === "youtube-nocookie.com") id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/) || [])[1] || null;
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
// Identificador de una lista de reproducción desde su enlace (…?list=PL…) o el identificador solo
function idLista(t) {
  const s = String(t || "").trim();
  if (/^(PL|UU|OL|FL|LL)[\w-]{10,60}$/.test(s)) return s;
  try { const l = new URL(s).searchParams.get("list"); return l && /^(PL|UU|OL|FL)[\w-]{10,60}$/.test(l) ? l : null; } catch { return null; }
}
// Fecha de la edición que cubre un episodio, leída del título («20 de noviembre de 2026», «20-11-2026» o «2026-11-20»)
function fechaDeTitulo(t) {
  const s = String(t || "").toLowerCase();
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de(?:l)? (\d{4}))?/);
  if (m) {
    const mes = m[2] === "setiembre" ? 9 : MESES_POD.indexOf(m[2]) + 1;
    return `${m[3] || "2026"}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}
const fechaPodOk = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || "") && !Number.isNaN(Date.parse(f + "T12:00:00Z"));
const miniaturaDe = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const verEnYoutube = (id) => `https://www.youtube.com/watch?v=${id}`;
const fechaPod = (f) => fechaLarga(f).replace(",", "");   // «Viernes 20 de noviembre de 2026»
function tituloPodcast(f) { return `Podcast Cofrade News · ${fechaPod(f)}`; }
function descripcionPodcast(f) {
  return `Las noticias del ${fechaPod(f).toLowerCase()} en pocos minutos: ${PODCAST.secciones.slice(0, -1).join("; ")}; y ${PODCAST.secciones.at(-1)}.\n\n`
    + `Lee la edición completa, con cada dato y su fuente: https://${DOMINIO}/edicion/${f}\n\n`
    + "Audio generado con inteligencia artificial (Gemini Notebook de Google) a partir de la edición de Cofrade News, el diario de la mañana. Suscríbete gratis en www.cofrad.es";
}

// ---------- episodios (D1) ----------
let _epCache = { t: 0, l: null };
async function episodiosPodcast(env, limite = 6, fresco = false) {
  if (!env.DB) return [];
  if (!fresco && limite <= 6 && _epCache.l && Date.now() - _epCache.t < 300000) return _epCache.l.slice(0, limite);
  try {
    await asegurarPodcast(env);
    const r = await env.DB.prepare("SELECT video, titulo, publicado, fecha, miniatura FROM podcast_episodios WHERE oculto = 0 ORDER BY COALESCE(fecha, substr(publicado, 1, 10)) DESC, publicado DESC LIMIT ?")
      .bind(Math.max(limite, 6)).all();
    const l = r.results || [];
    if (limite <= 6) _epCache = { t: Date.now(), l };
    return l.slice(0, limite);
  } catch { return []; }
}
// Sincroniza con la lista de reproducción del podcast (API oficial de YouTube, 1 unidad por página, hasta 4 páginas cada 2 horas).
// Los episodios que salieron de la lista se borran (los agregados a mano, nunca). Desde la portada, como mucho una vez cada 10 min.
let _proximoPod = 0;
function revisarPodcast(env) {
  const cada = Math.max(0, Number(env.PODCAST_SEG ?? 600)) * 1000;   // PODCAST_SEG solo existe en el arnés de pruebas
  if (!env.DB || !env.YOUTUBE_API_KEY || Date.now() < _proximoPod) return Promise.resolve("espera");
  _proximoPod = Date.now() + cada;
  const t = sincronizarPodcast(env, { forzar: false, turnoMin: cada ? PODCAST.cadaMin : 0 }).catch(() => "error");
  return Promise.race([t, new Promise((ok) => setTimeout(() => ok("corte"), 20000))]);
}
async function sincronizarPodcast(env, { forzar = false, turnoMin = PODCAST.cadaMin } = {}) {
  if (!env.DB) return "sin-base";
  await asegurarPodcast(env);
  const lista = idLista((await env.DB.prepare("SELECT valor FROM config WHERE clave = 'podcast_lista'").first() || {}).valor);
  if (!lista) return "sin-lista";
  if (!env.YOUTUBE_API_KEY) return "sin-clave";
  if (forzar) await cfgDif(env, "podcast_turno", new Date().toISOString());   // la lectura pedida desde el Panel también cuenta como turno
  else if (!(await tomarTurno(env, "podcast_turno", turnoMin))) return "espera";
  const items = [];
  let pagina = "", paginas = 0, error = "";
  try {
    do {
      const u = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&maxResults=50&playlistId=${encodeURIComponent(lista)}${pagina ? "&pageToken=" + encodeURIComponent(pagina) : ""}`;
      const j = await traerFuente(u, "json", { "X-Goog-Api-Key": String(env.YOUTUBE_API_KEY) });   // la clave va en la cabecera, nunca en la dirección
      for (const it of j.items || []) {
        const sn = it.snippet || {}, id = idVideo((it.contentDetails || {}).videoId || (sn.resourceId || {}).videoId);
        if (!id || ((it.status || {}).privacyStatus && it.status.privacyStatus !== "public")) continue;   // privados y no listados no van
        const pub = (it.contentDetails || {}).videoPublishedAt || sn.publishedAt || new Date().toISOString();
        const titulo = recorte(sn.title, 200);
        if (!titulo || /^(private|deleted) video$/i.test(titulo)) continue;
        const th = sn.thumbnails || {}, mini = ((th.medium || th.high || th.default || {}).url || "");
        items.push({ id, titulo, pub, fecha: fechaDeTitulo(titulo) || fechaChile(new Date(pub)), mini: /^https:\/\/i\d?\.ytimg\.com\//.test(mini) ? mini : miniaturaDe(id) });
      }
      pagina = j.nextPageToken || "";
      paginas++;
    } while (pagina && paginas < PODCAST.maxPaginas);
  } catch (e) { error = recorte((e && e.message) || e, 80); }   // el error no lleva la clave: va en la cabecera
  const ahora = new Date().toISOString();
  if (!error) {
    const ops = items.map((x) => env.DB.prepare(`INSERT INTO podcast_episodios (video, titulo, publicado, fecha, miniatura, origen, creado) VALUES (?, ?, ?, ?, ?, 'lista', ?)
      ON CONFLICT(video) DO UPDATE SET titulo = CASE WHEN podcast_episodios.origen = 'manual' THEN podcast_episodios.titulo ELSE excluded.titulo END,
      publicado = excluded.publicado, miniatura = excluded.miniatura, fecha = CASE WHEN podcast_episodios.origen = 'manual' THEN podcast_episodios.fecha ELSE excluded.fecha END`)
      .bind(x.id, x.titulo, x.pub, x.fecha, x.mini, ahora));
    if (!pagina) {   // la lista completa cupo en las páginas leídas: lo que ya no está en la lista sale (lo manual se queda)
      const ids = items.map((x) => x.id);
      ops.push(ids.length ? env.DB.prepare(`DELETE FROM podcast_episodios WHERE origen = 'lista' AND video NOT IN (${ids.map(() => "?").join(", ")})`).bind(...ids)
        : env.DB.prepare("DELETE FROM podcast_episodios WHERE origen = 'lista'"));
    }
    for (let i = 0; i < ops.length; i += 40) await env.DB.batch(ops.slice(i, i + 40));
    _epCache = { t: 0, l: null };
  }
  await cfgDif(env, "podcast_estado", JSON.stringify({ hora: ahora, n: items.length, error })).catch(() => null);
  return error ? "error" : `ok:${items.length}`;
}

// ---------- portada ----------
const POD_ICONO = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
function fechaCorta(f) {
  if (!fechaPodOk(f)) return "";
  const d = new Date(f + "T12:00:00Z"), dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES_POD[d.getUTCMonth()]}`;
}
function tarjetaEpisodio(e, i) {
  const f = e.fecha || String(e.publicado || "").slice(0, 10);
  return `<li><a class="pod-ep" href="${verEnYoutube(e.video)}" target="_blank" rel="noopener"><span class="pod-mini"><img src="${esc(e.miniatura || miniaturaDe(e.video))}" alt="" loading="lazy" width="320" height="180"><span class="pod-play" aria-hidden="true"></span></span>`
    + `<span class="pod-t">${fechaPodOk(f) ? `<time datetime="${f}">${esc(fechaCorta(f))}</time>` : ""}<b>${esc(e.titulo)}</b>${i === 0 ? '<span class="pod-nuevo">Último episodio</span>' : ""}</span></a></li>`;
}
async function podcastPortada(env) {
  const l = await episodiosPodcast(env, 3);
  const cab = `<span class="kicker">${l.length ? "Podcast diario · gratis" : "Podcast diario · muy pronto"}</span><h2 class="titulo-lujo" id="t-pod">Escucha el boletín en 5 minutos</h2>
<p class="sub">${l.length ? "Las 7 secciones principales de cada edición, en audio: economía, política, emprendimiento, tecnología, conflictos, indicadores e inmobiliario."
    : "Muy pronto, cada mañana, las 7 secciones principales de la edición en un audio de 5 a 8 minutos. Mientras tanto, puedes escuchar la edición con la voz del boletín."}</p>`;
  const acc = l.length ? `<a class="btn linea" href="/podcast">Ver todos los episodios</a><a class="btn linea" href="${PODCAST.canal}" target="_blank" rel="noopener">Canal de YouTube</a>`
    : `<a class="btn linea" href="/edicion?voz=1">Escuchar la edición con voz</a>`;
  return `<section class="pod-sec" id="podcast" aria-labelledby="t-pod"><div class="pod-caja"><div class="pod-ico" aria-hidden="true">${POD_ICONO}</div><div class="pod-cab">${cab}</div></div>
${l.length ? `<ol class="pod-lista">${l.map(tarjetaEpisodio).join("")}</ol>` : ""}<div class="acciones">${acc}</div></section>`;
}
// ---------- página /podcast (todos los episodios, del más nuevo al más antiguo) ----------
const CSP_PODCAST = csp({ frame: " https://www.youtube-nocookie.com" });
async function paginaPodcast(env) {
  const l = await episodiosPodcast(env, 400, true);
  const items = l.map((e) => {
    const f = e.fecha || String(e.publicado || "").slice(0, 10);
    return `<li class="pod-fila"><button type="button" class="pod-lite" data-v="${esc(e.video)}" aria-label="Reproducir: ${esc(e.titulo)}"><img src="${esc(e.miniatura || miniaturaDe(e.video))}" alt="" loading="lazy" width="320" height="180"><span class="pod-play" aria-hidden="true"></span></button>`
      + `<div class="pod-t">${fechaPodOk(f) ? `<time datetime="${f}">${esc(fechaPod(f))}</time>` : ""}<b>${esc(e.titulo)}</b><a href="${verEnYoutube(e.video)}" target="_blank" rel="noopener">Abrir en YouTube</a>${fechaPodOk(f) ? ` · <a href="/edicion/${f}">Leer la edición</a>` : ""}</div></li>`;
  }).join("");
  const cuerpo = `<section style="border:0;padding-top:30px"><span class="kicker">Podcast diario</span><h1 class="titulo-lujo">Podcast Cofrade News</h1>
<p class="lede">Las 7 secciones principales de cada edición en un audio de 5 a 8 minutos: economía, política, emprendimiento, tecnología, conflictos, indicadores e inmobiliario. Del más nuevo al más antiguo.</p>
${items ? `<ol class="pod-todas">${items}</ol>` : `<p class="aviso">El primer episodio llega muy pronto.</p>`}
<div class="acciones"><a class="btn linea" href="${PODCAST.canal}" target="_blank" rel="noopener">Canal de YouTube</a><a class="btn oro" href="/edicion">Leer la edición de hoy</a></div>
<p class="sub">Audio generado con inteligencia artificial (Gemini Notebook de Google) a partir de la edición de Cofrade News. Cada dato tiene su fuente en la edición escrita.</p></section>
<script>document.querySelectorAll('.pod-lite').forEach(function(b){b.addEventListener('click',function(){var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(b.dataset.v)+'?autoplay=1&rel=0';f.title=b.getAttribute('aria-label')||'Podcast';f.allow='autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;f.className='pod-frame';b.replaceWith(f)})})</script>`;
  return html(marco({ titulo: "Podcast · Cofrade News", descripcion: "Podcast diario de Cofrade News: las noticias del día en 5 a 8 minutos.", cuerpo, canonica: "/podcast" }), 200, { "Cache-Control": "public, max-age=300" }, CSP_PODCAST);
}
// ---------- fuente del día para Gemini Notebook (/podcast/fuente/AAAA-MM-DD y .txt) ----------
async function fuentePodcast(f, txt, ctx) {
  if (!fechaPodOk(f)) return new Response("Fecha no válida.", { status: 400 });
  let md = null;
  try {
    const r = await fetch(RAW + `podcast/fuentes/${f}.md`, { cf: { cacheTtl: 600, cacheEverything: true } });
    if (r.ok) md = await r.text();
  } catch { md = null; }
  if (!md) {
    const cuerpo = `<section style="border:0"><span class="kicker">Podcast</span><h1>La fuente de esa fecha todavía no está.</h1><p class="lede">Se arma sola cuando se publica la edición del día (alrededor de las 8:00).</p><div class="acciones"><a class="btn oro" href="/edicion">Leer la edición</a></div></section>`;
    return txt ? new Response("La fuente de esa fecha todavía no está.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...SEGURIDAD } })
      : html(marco({ titulo: "Fuente del podcast · Cofrade News", descripcion: "", cuerpo }), 404, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  }
  if (txt) return new Response(md.replace(/^#+ /gm, "").replace(/\*\*/g, ""), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
  const lineas = md.split("\n"), out = [];
  let enLista = false;
  for (const l of lineas) {
    const li = l.startsWith("- ");
    if (enLista && !li) { out.push("</ul>"); enLista = false; }
    if (l.startsWith("# ")) out.push(`<h1>${esc(l.slice(2))}</h1>`);
    else if (l.startsWith("## ")) out.push(`<h2>${esc(l.slice(3))}</h2>`);
    else if (l.startsWith("### ")) out.push(`<h3>${esc(l.slice(4))}</h3>`);
    else if (li) { if (!enLista) { out.push("<ul>"); enLista = true; } out.push(`<li>${esc(l.slice(2))}</li>`); }
    else if (l.trim()) out.push(`<p>${esc(l)}</p>`);
  }
  if (enLista) out.push("</ul>");
  const cuerpo = `<article class="pod-fuente" style="border:0;padding-top:24px">${out.join("\n")}</article>`;
  return html(marco({ titulo: `Fuente del podcast · ${fechaLarga(f)} · Cofrade News`, descripcion: "Noticias del día de Cofrade News, por sección, con su medio y su fecha.", cuerpo, canonica: `/podcast/fuente/${f}` }), 200,
    { "Cache-Control": "public, max-age=600", "X-Robots-Tag": "noindex" });
}

// ---------- Panel: sección «Podcast» y acciones ----------
const PODCAST_JS = __PODCAST_JS__;
const MENSAJES_POD = {
  lista: "Lista de reproducción guardada. Los episodios se leen solos cada 2 horas.", "error:lista": "Ese enlace no es de una lista de reproducción de YouTube (debe llevar «list=»).",
  agregado: "Episodio agregado: ya aparece en la portada.", "error:video": "Ese enlace no es de un video de YouTube.", "error:fecha": "Revisa la fecha de la edición.",
  oculto: "Episodio oculto: ya no aparece en la portada.", visible: "Episodio visible otra vez.", "error:no-existe": "Ese episodio ya no existe.",
  "sin-lista": "Primero guarda el enlace de la lista de reproducción del podcast.", "sin-clave": "Falta el secreto YOUTUBE_API_KEY en Cloudflare (ver la guía).", error: "YouTube no respondió. Intenta de nuevo en unos minutos.",
};
async function accionPodcast(req, env) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  const volver = (c) => new Response(null, { status: 303, headers: { Location: `/panel?pod=${encodeURIComponent(c)}#podcast`, "Cache-Control": "no-store" } });
  if (!env.DB) return volver("error");
  const cuerpo = await leerCuerpo(req, 4000);
  if (cuerpo === null) return volver("error");
  const f = new URLSearchParams(cuerpo), accion = String(f.get("accion") || "");
  await asegurarPodcast(env);
  if (accion === "lista") {
    const id = idLista(f.get("lista"));
    if (!id) return volver("error:lista");
    await cfgDif(env, "podcast_lista", id);
    return volver(env.YOUTUBE_API_KEY ? await sincronizarPodcast(env, { forzar: true }) : "lista");
  }
  if (accion === "sincronizar") return volver(await sincronizarPodcast(env, { forzar: true }));
  if (accion === "agregar") {
    const id = idVideo(f.get("video")), fecha = String(f.get("fecha") || "").trim(), titulo = recorte(f.get("titulo"), 200) || (fechaPodOk(fecha) ? tituloPodcast(fecha) : "");
    if (!id) return volver("error:video");
    if (!fechaPodOk(fecha) || fecha > masDias(fechaChile(), 1)) return volver("error:fecha");
    await env.DB.prepare(`INSERT INTO podcast_episodios (video, titulo, publicado, fecha, miniatura, origen, creado) VALUES (?, ?, ?, ?, ?, 'manual', ?)
      ON CONFLICT(video) DO UPDATE SET titulo = excluded.titulo, fecha = excluded.fecha, origen = 'manual', oculto = 0`).bind(id, titulo, new Date().toISOString(), fecha, miniaturaDe(id), new Date().toISOString()).run();
    _epCache = { t: 0, l: null };
    return volver("agregado");
  }
  if (accion === "ocultar" || accion === "mostrar") {
    const r = await env.DB.prepare("UPDATE podcast_episodios SET oculto = ? WHERE video = ?").bind(accion === "ocultar" ? 1 : 0, String(f.get("video") || "").slice(0, 20)).run();
    _epCache = { t: 0, l: null };
    return volver(r.meta && r.meta.changes ? (accion === "ocultar" ? "oculto" : "visible") : "error:no-existe");
  }
  return volver("error");
}
async function seccionPodcast(env, u) {
  await asegurarPodcast(env);
  const hoy = fechaChile();
  const [cfg, eps, fuente] = await Promise.all([
    env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('podcast_lista', 'podcast_estado')").all().then((r) => Object.fromEntries((r.results || []).map((x) => [x.clave, x.valor]))),
    env.DB.prepare("SELECT video, titulo, publicado, fecha, origen, oculto FROM podcast_episodios ORDER BY COALESCE(fecha, substr(publicado, 1, 10)) DESC, publicado DESC LIMIT 60").all().then((r) => r.results || []),
    fetch(RAW + `podcast/fuentes/${hoy}.md`, { method: "HEAD", cf: { cacheTtl: 120 } }).then((r) => r.ok, () => false),
  ]);
  const lista = idLista(cfg.podcast_lista), est = jsonDe(cfg.podcast_estado, {});
  const c = u.searchParams.get("pod"), msg = c ? (MENSAJES_POD[c] || (/^ok:\d+$/.test(c) ? `Lista leída: ${c.slice(3)} episodios públicos.` : "")) : "";
  const estado = [
    `Clave de YouTube: ${env.YOUTUBE_API_KEY ? "lista" : "<b>falta el secreto YOUTUBE_API_KEY</b> (sin ella, los episodios se agregan a mano)"}`,
    `Lista de reproducción: ${lista ? `<code>${esc(lista)}</code>` : "<b>falta</b> (pega su enlace abajo)"}`,
    est.hora ? `Última lectura: ${esc(horaCL(est.hora))}${est.error ? ` · <span style="color:var(--rojo)">sin respuesta</span>` : ` · ${num(est.n || 0, 0)} episodios`}` : "Todavía no se lee la lista",
  ].join(" · ");
  const fila = (e) => `<tr${e.oculto ? ' class="men-desc"' : ""}><td>${esc(e.fecha ? ddmm(e.fecha) : "")}</td><td><a href="${verEnYoutube(e.video)}" target="_blank" rel="noopener">${esc(e.titulo)}</a></td><td>${e.origen === "manual" ? "a mano" : "lista"}</td>`
    + `<td><form method="post" action="/panel/podcast" style="display:inline"><input type="hidden" name="accion" value="${e.oculto ? "mostrar" : "ocultar"}"><input type="hidden" name="video" value="${esc(e.video)}"><button class="btn linea chico" type="submit">${e.oculto ? "Mostrar" : "Ocultar"}</button></form></td></tr>`;
  const datos = JSON.stringify({ hoy, fechaLarga: fechaPod(hoy), titulo: tituloPodcast(hoy), descripcion: descripcionPodcast(hoy), indicaciones: PODCAST_INDICACIONES, secciones: PODCAST.secciones }).replace(/</g, "\\u003c");
  return `<section id="podcast"><h3>Podcast diario</h3>${msg ? `<p class="aviso" role="status" style="color:${c.startsWith("error") || c.startsWith("sin-") ? "var(--rojo)" : "var(--verde)"};font-weight:600">${esc(msg)}</p>` : ""}
<p class="sub">${estado}. Episodios en la portada: los 3 más nuevos; todos en <a href="/podcast">/podcast</a>.</p>
<div class="dos d2"><div class="tarjeta pod-paso"><h4 class="kicker">1 · Fuente de hoy para Gemini Notebook</h4>
${fuente ? `<p>Lista la fuente del ${esc(fechaLarga(hoy))} con las 7 secciones.</p><p class="pod-bot"><a class="btn oro chico" href="/podcast/fuente/${hoy}" target="_blank" rel="noopener">Abrir la fuente</a><button type="button" class="btn linea chico" data-copiar-url="/podcast/fuente/${hoy}.txt">Copiar el texto</button><button type="button" class="btn linea chico" data-copiar-url="https://${DOMINIO}/podcast/fuente/${hoy}" data-literal="1">Copiar el enlace</button></p>`
    : `<p>La fuente de hoy se arma sola cuando se publica la edición (alrededor de las 8:00). <a href="/podcast/fuente/${masDias(hoy, -1)}" target="_blank" rel="noopener">Ver la de ayer</a>.</p>`}
<p class="pod-bot"><button type="button" class="btn linea chico" data-copiar-id="podIndicaciones">Copiar las indicaciones del audio</button><a class="btn linea chico" href="${PODCAST.notebook}" target="_blank" rel="noopener">Abrir Gemini Notebook</a></p>
<p class="sub" id="podIndicaciones">${esc(PODCAST_INDICACIONES)}</p></div>
<div class="tarjeta pod-paso"><h4 class="kicker">2 · Convertir el audio en video con portada fija</h4>
<p>Elige el audio que descargaste de Gemini Notebook. El video se arma aquí mismo, en tu navegador (Chrome o Edge en el computador); nada se sube a ningún servidor.</p>
<label class="pod-archivo"><span class="btn oro chico">Elegir el audio</span><input type="file" id="podAudio" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm"></label>
<label class="pod-fecha">Fecha de la edición <input type="date" id="podFecha" value="${hoy}" max="${masDias(hoy, 1)}"></label>
<canvas id="podPortada" width="1280" height="720" aria-label="Portada del video" style="width:100%;height:auto;border-radius:10px;margin:10px 0;background:#0B1F3A"></canvas>
<p class="pod-bot"><button type="button" class="btn oro chico" id="podCrear" disabled>Crear el video</button><a class="btn linea chico" id="podBajarPortada" download="Portada-Podcast-Cofrade-News.png" href="#">Descargar la portada (PNG)</a></p>
<p class="pod-estado" id="podEstado" role="status" aria-live="polite"></p><p class="pod-bot"><a class="btn oro chico" id="podBajar" hidden download>Descargar el video</a></p></div></div>
<div class="tarjeta pod-paso" style="margin-top:14px"><h4 class="kicker">3 · Subir a YouTube</h4>
<p class="pod-bot"><a class="btn oro chico" href="${PODCAST.studio}" target="_blank" rel="noopener">Abrir YouTube Studio</a><button type="button" class="btn linea chico" data-copiar-id="podTitulo">Copiar el título</button><button type="button" class="btn linea chico" data-copiar-id="podDesc">Copiar la descripción</button></p>
<p><b id="podTitulo">${esc(tituloPodcast(hoy))}</b></p><pre class="pod-desc" id="podDesc">${esc(descripcionPodcast(hoy))}</pre></div>
<div class="dos d2" style="margin-top:14px"><form class="tarjeta form-anun" method="post" action="/panel/podcast"><input type="hidden" name="accion" value="lista"><h4 class="kicker">Lista de reproducción del podcast</h4>
<label class="ancho">Enlace de la lista (YouTube → tu lista → Compartir)<input name="lista" maxlength="300" placeholder="https://www.youtube.com/playlist?list=PL…" value="${lista ? esc("https://www.youtube.com/playlist?list=" + lista) : ""}"></label>
<button class="btn oro chico" type="submit">Guardar la lista</button>${lista && env.YOUTUBE_API_KEY ? ` <button class="btn linea chico" type="submit" name="accion" value="sincronizar">Leer la lista ahora</button>` : ""}</form>
<form class="tarjeta form-anun" method="post" action="/panel/podcast"><input type="hidden" name="accion" value="agregar"><h4 class="kicker">Agregar un episodio a mano</h4>
<label class="ancho">Enlace del video<input name="video" maxlength="300" required placeholder="https://youtu.be/…"></label><label>Fecha de la edición<input type="date" name="fecha" required value="${hoy}" max="${masDias(hoy, 1)}"></label>
<label>Título (opcional)<input name="titulo" maxlength="200" placeholder="${esc(tituloPodcast(hoy))}"></label><button class="btn oro chico" type="submit">Agregar</button></form></div>
<h4 class="grupo-k" style="margin-top:22px">Episodios (${num(eps.length, 0)})</h4>${eps.length ? `<div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th>Edición</th><th>Título</th><th>Origen</th><th></th></tr></thead><tbody>${eps.map(fila).join("")}</tbody></table></div>` : `<p class="aviso">Todavía no hay episodios.</p>`}
<script type="application/json" id="podDatos">${datos}</script>${PODCAST_JS}</section>`;
}

// ---------- estilos de la portada, /podcast y el Panel ----------
const PODCAST_CSS = `.pod-sec{border:0!important;padding:34px 0 0!important}.pod-caja{display:flex;gap:16px;align-items:flex-start}.pod-ico{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--oro);color:var(--oro-texto,#8A6416)}
.pod-cab{min-width:0}.pod-cab .titulo-lujo{margin-top:6px}.pod-lista{list-style:none;margin:18px 0 6px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.pod-ep{display:flex;flex-direction:column;gap:10px;height:100%;padding:10px;border:1px solid var(--linea);border-radius:16px;background:var(--card);color:inherit;text-decoration:none}.pod-ep:hover{border-color:var(--oro)}
.pod-ep:focus-visible,.pod-lite:focus-visible{outline:3px solid var(--oro);outline-offset:2px}.pod-mini{position:relative;display:block;border-radius:10px;overflow:hidden;aspect-ratio:16/9;background:#0B1F3A}
.pod-mini img,.pod-lite img{display:block;width:100%;height:100%;object-fit:cover}.pod-play{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(11,31,58,.82);box-shadow:0 0 0 2px rgba(201,162,39,.9)}
.pod-play::after{content:"";position:absolute;left:21px;top:16px;border-style:solid;border-width:10px 0 10px 16px;border-color:transparent transparent transparent #F4E7C1}
.pod-t{display:flex;flex-direction:column;gap:4px;min-width:0}.pod-t time{font-size:13px;letter-spacing:.04em;color:var(--gris)}.pod-t b{font-weight:600;line-height:1.35}
.pod-nuevo{align-self:flex-start;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--oro-texto,#8A6416)}
.pod-todas{list-style:none;margin:22px 0;padding:0;display:grid;gap:18px}.pod-fila{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:16px;align-items:start}
.pod-lite{position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:0;border-radius:12px;overflow:hidden;background:#0B1F3A;cursor:pointer}.pod-frame{width:100%;aspect-ratio:16/9;border:0;border-radius:12px}
.pod-fila .pod-t a{font-size:14px}@media (max-width:640px){.pod-fila{grid-template-columns:1fr}.pod-caja{gap:12px}.pod-ico{width:40px;height:40px}}
.pod-fuente h1{font:600 clamp(26px,3.4vw,34px)/1.2 var(--serif)}.pod-fuente h2{margin-top:26px}.pod-fuente li{margin:0 0 10px;line-height:1.55}
.pod-paso p{margin:8px 0}.pod-bot{display:flex;flex-wrap:wrap;gap:8px}.pod-archivo input{position:absolute;width:1px;height:1px;opacity:0}.pod-archivo{position:relative;display:inline-block;cursor:pointer}
.pod-fecha{display:inline-flex;gap:8px;align-items:center;margin-left:10px;font-size:14px}.pod-desc{white-space:pre-wrap;font:14px/1.5 var(--sans,system-ui,sans-serif);background:var(--papel);border:1px solid var(--linea);border-radius:10px;padding:10px 12px;margin:6px 0 0}
.pod-estado{min-height:1.3em;font-weight:600}
@media print{.pod-sec{display:none!important}}`;

// ---------- textos fijos en inglés (botón EN de la portada y de /podcast) ----------
Object.assign(EN_FIJO, {
  "Podcast diario · gratis": "Daily podcast · free", "Podcast diario · muy pronto": "Daily podcast · coming soon", "Podcast diario": "Daily podcast",
  "Escucha el boletín en 5 minutos": "Listen to the newsletter in 5 minutes",
  "Las 7 secciones principales de cada edición, en audio: economía, política, emprendimiento, tecnología, conflictos, indicadores e inmobiliario.":
    "The 7 main sections of every edition, as audio: economy, politics, entrepreneurship, technology, conflicts, indicators and real estate.",
  "Muy pronto, cada mañana, las 7 secciones principales de la edición en un audio de 5 a 8 minutos. Mientras tanto, puedes escuchar la edición con la voz del boletín.":
    "Coming soon: every morning, the 7 main sections of the edition in a 5 to 8 minute audio. Meanwhile, you can listen to the edition with the newsletter's voice.",
  "Ver todos los episodios": "See all episodes", "Canal de YouTube": "YouTube channel", "Escuchar la edición con voz": "Listen to the edition by voice", "Último episodio": "Latest episode",
  "Podcast Cofrade News": "Cofrade News podcast", "Abrir en YouTube": "Open on YouTube", "Leer la edición": "Read the edition", "Leer la edición de hoy": "Read today's edition",
  "El primer episodio llega muy pronto.": "The first episode is coming very soon.",
  "Las 7 secciones principales de cada edición en un audio de 5 a 8 minutos: economía, política, emprendimiento, tecnología, conflictos, indicadores e inmobiliario. Del más nuevo al más antiguo.":
    "The 7 main sections of every edition in a 5 to 8 minute audio: economy, politics, entrepreneurship, technology, conflicts, indicators and real estate. Newest first.",
  "Audio generado con inteligencia artificial (Gemini Notebook de Google) a partir de la edición de Cofrade News. Cada dato tiene su fuente en la edición escrita.":
    "Audio generated with artificial intelligence (Google's Gemini Notebook) from the Cofrade News edition. Every figure has its source in the written edition.",
});
