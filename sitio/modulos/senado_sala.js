// 26-11-2026 · Decisiones de la Sala del Senado desde la fuente oficial. Germán (con captura de la edición: «Senado 1» en noviembre):
// «Puedes verificar si el Senado ha tenido más de una votación en el mes de Noviembre?». No: en noviembre la Sala votó, entre otros,
// el Presupuesto 2027, la Sala Cuna Universal, combustibles, incendios forestales y varias nacionalidades por gracia. El voto de cada
// senador venía de la API del Senado (web-back.senado.cl), que hoy responde con un desafío anti-robots, y de una copia pública que dejó
// de actualizarse el 21-10-2026. No se salta ningún bloqueo: se usa la página pública de Tramitación de proyectos del Senado
// (tramitacion.senado.cl, «últimos movimientos»), que lista cada decisión de Sala con fecha, boletín, etapa y resultado, sin desafío,
// y respetando su robots.txt. El sitio la lee como mucho cada 6 horas, en segundo plano, y acumula cada fila en D1 (tabla senado_sala),
// porque la página muestra solo los movimientos recientes. En la edición, el panel «Senado» del mes muestra esas decisiones, con enlace
// a cada boletín, y los contadores toman el mayor entre lo que traía la edición y lo oficial. Lo que la fuente no publica (el voto de
// cada senador) se dice, no se inventa.
const SENADO_SALA_URL = "https://tramitacion.senado.cl/appsenado/index.php?ac=ultimos_vistos&mo=tramitacion";
const SENADO_SALA_TABLA = "CREATE TABLE IF NOT EXISTS senado_sala (clave TEXT PRIMARY KEY, fecha TEXT NOT NULL, boletin TEXT NOT NULL, titulo TEXT, etapa TEXT, resultado TEXT, visto TEXT NOT NULL)";
const SS_UA = "CofradeNews/1.0 (+https://www.cofrad.es; noticias@cofrad.es)";
const ssEsc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ssTexto = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const ssAprobado = (r) => /aprob|despach/i.test(r) && !/rechaz/i.test(r);
const ssRechazado = (r) => /rechaz/i.test(r);
const ssDecision = (r) => ssAprobado(r) || ssRechazado(r);

// ¿Permite el robots.txt leer /appsenado/? (grupo «*»; sin robots.txt o ilegible, se permite como lo hace cualquier navegador)
function ssRobotsPermite(txt, ruta) {
  let aplica = false, permite = true, largo = -1;
  for (const l of String(txt || "").split(/\r?\n/)) {
    const [k, ...r] = l.split("#")[0].split(":"); const v = r.join(":").trim(), c = (k || "").trim().toLowerCase();
    if (c === "user-agent") aplica = v === "*";
    else if (aplica && (c === "disallow" || c === "allow") && v && ruta.startsWith(v) && v.length > largo) { largo = v.length; permite = c === "allow"; }
  }
  return permite;
}
// Filas de la tabla de Sala (grid_nivel1): [{fecha:'2026-11-25', boletin, titulo, etapa, resultado}]
function ssLeerTabla(html) {
  const t = (String(html || "").match(/<table[^>]*id="grid_nivel1"[\s\S]*?<\/table>/) || [""])[0];
  const out = [];
  for (const m of t.matchAll(/<tr>\s*<td>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)) {
    const boletin = (ssTexto(m[4]).match(/\d{3,6}-\d{2}/) || [""])[0];
    if (!boletin) continue;
    out.push({ fecha: `${m[3]}-${m[2]}-${m[1]}`, boletin, titulo: ssTexto(m[5]).slice(0, 400), etapa: ssTexto(m[6]).slice(0, 200), resultado: ssTexto(m[7]).slice(0, 200) });
  }
  return out;
}
async function senadoSalaActualizar(env) {
  const ahora = new Date().toISOString();
  try {
    await env.DB.prepare(SENADO_SALA_TABLA).run();
    const rb = await fetch("https://tramitacion.senado.cl/robots.txt", { headers: { "User-Agent": SS_UA }, signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (rb && rb.ok && !ssRobotsPermite(await rb.text(), "/appsenado/index.php")) { await ponerConfig(env, "senado_sala_estado", JSON.stringify({ ok: false, hora: ahora, motivo: "robots.txt no lo permite" })); return 0; }
    const r = await fetch(SENADO_SALA_URL, { headers: { "User-Agent": SS_UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
    const html = r.ok ? await r.text() : "";
    const filas = ssLeerTabla(html);
    if (!filas.length) { await ponerConfig(env, "senado_sala_estado", JSON.stringify({ ok: false, hora: ahora, motivo: `sin filas (HTTP ${r.status})` })); return 0; }
    await env.DB.batch(filas.map((f) => env.DB.prepare("INSERT INTO senado_sala (clave, fecha, boletin, titulo, etapa, resultado, visto) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(clave) DO UPDATE SET resultado=excluded.resultado, titulo=excluded.titulo, visto=excluded.visto")
      .bind(`${f.fecha}|${f.boletin}|${f.etapa}`.slice(0, 300), f.fecha, f.boletin, f.titulo, f.etapa, f.resultado, ahora)));
    await ponerConfig(env, "senado_sala_estado", JSON.stringify({ ok: true, hora: ahora, filas: filas.length, mas_nueva: filas.map((f) => f.fecha).sort().pop() }));
    return filas.length;
  } catch (e) {
    try { await ponerConfig(env, "senado_sala_estado", JSON.stringify({ ok: false, hora: ahora, motivo: String(e.message || e).slice(0, 120) })); } catch { /* nada */ }
    return 0;
  }
}
// Lee lo guardado; si la última lectura tiene más de 6 horas, pide otra en segundo plano (una sola a la vez: candado en config)
async function senadoSalaDatos(env, ctx) {
  if (!env.DB) return null;
  try {
    await env.DB.prepare(SENADO_SALA_TABLA).run();
    const est = JSON.parse((await leerConfig(env, "senado_sala_estado")) || "null");
    const viejo = !est || Date.now() - Date.parse(est.hora) > 6 * 3600e3;
    if (viejo) {
      const cand = await leerConfig(env, "senado_sala_candado");
      if (!cand || Date.now() - Date.parse(cand) > 300e3) {
        await ponerConfig(env, "senado_sala_candado", new Date().toISOString());
        const t = senadoSalaActualizar(env).catch(() => 0);
        if (ctx && ctx.waitUntil) ctx.waitUntil(t); else await t;
      }
    }
    const filas = (await env.DB.prepare("SELECT fecha, boletin, titulo, etapa, resultado FROM senado_sala ORDER BY fecha DESC, boletin").all()).results || [];
    return { estado: est, filas };
  } catch { return null; }
}
function ssMes(datos, mes) {
  const f = ((datos && datos.filas) || []).filter((x) => x.fecha.startsWith(mes) && ssDecision(x.resultado));
  return { filas: f, proyectos: new Set(f.map((x) => x.boletin)).size, aprobados: f.filter((x) => ssAprobado(x.resultado)).length, rechazados: f.filter((x) => ssRechazado(x.resultado)).length };
}
const SS_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function ssBloque(datos, mes) {
  const m = ssMes(datos, mes);
  if (!m.filas.length) return "";
  const est = (datos && datos.estado) || {};
  const h = est.hora ? new Date(est.hora).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", " a las") : "";
  const filas = m.filas.map((x) => `<tr><td class="nw">${x.fecha.slice(8)}-${x.fecha.slice(5, 7)}</td><td class="nw"><a href="https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${encodeURIComponent(x.boletin)}" target="_blank" rel="noopener">${ssEsc(x.boletin)}</a></td><td>${ssEsc(x.titulo)}</td><td>${ssEsc(x.etapa)}</td><td><span class="vres ${ssRechazado(x.resultado) ? "mal" : "ok"}">${ssEsc(x.resultado)}</span></td></tr>`).join("");
  return `<div class="ss-of" data-ss="${m.filas.length}"><p class="sub"><b>Decisiones de la Sala del Senado en ${SS_MESES[+mes.slice(5) - 1]}: ${m.filas.length}</b> (${m.proyectos} proyectos · ${m.aprobados} aprobadas · ${m.rechazados} rechazadas). Fuente oficial: <a href="https://tramitacion.senado.cl/appsenado/index.php?ac=ultimos_vistos&amp;mo=tramitacion" target="_blank" rel="noopener">Senado de Chile, Tramitación de proyectos</a>${h ? `, revisada el ${h}` : ""}. El Senado dejó de publicar en formato abierto el voto de cada senador el 21-10-2026: por eso estas decisiones van sin el detalle por senador.</p>
<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Fecha</th><th>Boletín</th><th>Proyecto</th><th>Etapa</th><th>Resultado</th></tr></thead><tbody>${filas}</tbody></table></div></div>`;
}
// Ajusta el total del mes (Cámara + Senado) en el navegador, porque el total va antes en la página que los números de cada cámara
const SS_JS = `<script>(function(){[].forEach.call(document.querySelectorAll('.cg-mes[data-mes]'),function(g){var m=g.getAttribute('data-mes');var c=g.querySelector('button.vcam[data-cam="c"] span'),s=g.querySelector('button.vcam[data-cam="s"] span'),b=document.querySelector('button.cg-mesb[data-mes="'+m+'"] span');if(c&&s&&b){var t=(parseInt(c.textContent,10)||0)+(parseInt(s.textContent,10)||0);if(t>(parseInt(b.textContent,10)||0))b.textContent=t}})})()</script>`;
const SS_CSS = `<style>.ss-of{margin:12px 0 18px}.ss-of .tabla td{vertical-align:top}.ss-of .vres.mal{color:#9b2c2c}</style>`;
// Reescritor de la edición para el mes indicado: contadores (el mayor entre la edición y lo oficial) y el bloque oficial en el panel
function conSenadoSala(rw, datos, mes) {
  const m = ssMes(datos, mes);
  if (!m.filas.length) return rw;
  const mayor = (n) => ({ text(t) { const v = parseInt(t.text, 10); if (!isNaN(v)) t.replace(String(Math.max(v, n))); } });
  const base = `div.cg-mes[data-mes="${mes}"]`;
  let k = 0;
  const kp = [m.proyectos, m.aprobados, m.rechazados];
  return rw
    .on(`${base} button.vcam[data-cam="s"] span`, mayor(m.filas.length))
    .on(`${base} div.cg-panel[data-cam="s"] .kpi .kv`, { text(t) { const v = parseInt(t.text, 10); if (!isNaN(v) && k < 3) { t.replace(String(Math.max(v, kp[k]))); k++; } } })
    .on(`${base} div.cg-panel[data-cam="s"] h4.cg-cam`, { element(e) { e.after(ssBloque(datos, mes), { html: true }); } })
    .on("body", { element(e) { e.append(SS_CSS + SS_JS, { html: true }); } });
}
