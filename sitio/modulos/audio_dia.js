// 27-11-2026 · Germán, con capturas del correo del día: «no viene adjunto el audio con el resumen de las Noticias!!!». Eligió un
// resumen de 2 a 3 minutos (las balas de «Lo que mueve la aguja hoy» y un titular por sección), adjunto al correo.
// Cómo funciona: GitHub (herramientas/audio_dia.py) arma el guion desde la edición publicada y lo guarda en datos/audio-guion/;
// después llama a /audio/generar/AAAA-MM-DD?sha=<commit>, que lee ese guion fijo (por su commit, sin caché vieja) y lo pasa por la
// voz de Workers AI (Deepgram Aura-2, español). GitHub une las partes, lo deja en la rama «audio» y la tarea de la edición lo adjunta.
// /audio/AAAA-MM-DD.mp3 sirve ese archivo para el correo de Kit y Telegram.
// Freno de gasto: cada trozo se genera 2 veces al día como máximo (tabla audio_gen); el guion viene solo del repositorio propio.
// 27-11-2026 (después): MeloTTS ya no está en el catálogo de Workers AI; la voz es Deepgram Aura-2 en español (más natural).
// Cuesta unos 5.000 neuronas por resumen de 2 minutos (cupo gratis: 10.000 al día), por eso cada trozo se genera 2 veces como máximo.
// Cada trozo se pide aparte (/audio/generar/AAAA-MM-DD/N) y el MP3 pasa tal cual, sin convertirlo (no gasta CPU del Worker).
const AUDIO_VOZ = "@cf/deepgram/aura-2-es";
const AUDIO_HABLANTE = "aquila";
const AUDIO_REPO = "https://raw.githubusercontent.com/germanperey/cofrade-datos";
const AUDIO_TABLA = "CREATE TABLE IF NOT EXISTS audio_gen (fecha TEXT PRIMARY KEY, n INTEGER NOT NULL, actualizado TEXT NOT NULL)";

async function audioGenerar(f, n, u, env) {
  const sha = u.searchParams.get("sha") || "";
  const J = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^[0-9a-f]{40}$/.test(sha) || !(n >= 0 && n < 24)) return J({ ok: false, error: "fecha, trozo o commit inválido" }, 400);
  if (!env.AI) return J({ ok: false, error: "sin Workers AI" }, 503);
  const g = await fetch(`${AUDIO_REPO}/${sha}/datos/audio-guion/${f}.json`);
  if (!g.ok) return J({ ok: false, error: `guion no encontrado (${g.status})` }, 404);
  let guion;
  try { guion = await g.json(); } catch { return J({ ok: false, error: "guion ilegible" }, 422); }
  const partes = Array.isArray(guion && guion.partes) ? guion.partes : [];
  const t = partes[n];
  if (guion.fecha !== f || typeof t !== "string" || !t.trim() || partes.length > 24 || t.length > 420) return J({ ok: false, error: "guion fuera de formato" }, 422);
  if (env.DB) {
    await env.DB.prepare(AUDIO_TABLA).run();
    const r = await env.DB.prepare("INSERT INTO audio_gen (fecha, n, actualizado) VALUES (?, 1, ?) ON CONFLICT(fecha) DO UPDATE SET n = n + 1, actualizado = excluded.actualizado RETURNING n")
      .bind(`${f}#${n}`, new Date().toISOString()).first();
    if (r && r.n > 2) return J({ ok: false, error: "ese trozo ya se generó 2 veces hoy" }, 429);
  }
  const hablante = /^[a-z]{3,12}$/.test(guion.hablante || "") ? guion.hablante : AUDIO_HABLANTE;
  const a = await env.AI.run(AUDIO_VOZ, { text: t, speaker: hablante, encoding: "mp3" });
  const H = { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voz": AUDIO_VOZ };
  if (a && typeof a.getReader === "function") return new Response(a, { headers: H });
  if (a instanceof ArrayBuffer || ArrayBuffer.isView(a)) return new Response(a, { headers: H });
  if (a && typeof a.audio === "string") return new Response(Uint8Array.from(atob(a.audio), (c) => c.charCodeAt(0)), { headers: H });
  return J({ ok: false, error: "la voz no devolvió audio" }, 502);
}

async function audioArchivo(f) {
  const r = await fetch(`${AUDIO_REPO}/audio/Cofrade-News-${f}-resumen.mp3`, { cf: { cacheTtl: 600 } });
  if (!r.ok) return new Response("El audio de esa fecha todavía no está listo.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return new Response(r.body, { status: 200, headers: { "Content-Type": "audio/mpeg", "Content-Disposition": `inline; filename="Cofrade-News-${f}-resumen.mp3"`, "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
}
