// 27-11-2026 · Germán, con capturas del correo del día: «no viene adjunto el audio con el resumen de las Noticias!!!». Eligió un
// resumen de 2 a 3 minutos (las balas de «Lo que mueve la aguja hoy» y un titular por sección), adjunto al correo.
// Cómo funciona: GitHub (herramientas/audio_dia.py) arma el guion desde la edición publicada y lo guarda en datos/audio-guion/;
// después llama a /audio/generar/AAAA-MM-DD?sha=<commit>, que lee ese guion fijo (por su commit, sin caché vieja) y lo pasa por la
// voz de Workers AI (MeloTTS, español). GitHub une las partes, lo deja en la rama «audio» y la tarea de la edición lo adjunta.
// /audio/AAAA-MM-DD.mp3 sirve ese archivo para el correo de Kit y Telegram.
// Freno de gasto: cada fecha se puede generar 4 veces como máximo (tabla audio_gen); el guion viene solo del repositorio propio.
const AUDIO_VOZ = "@cf/myshell-ai/melotts";
const AUDIO_REPO = "https://raw.githubusercontent.com/germanperey/cofrade-datos";
const AUDIO_TABLA = "CREATE TABLE IF NOT EXISTS audio_gen (fecha TEXT PRIMARY KEY, n INTEGER NOT NULL, actualizado TEXT NOT NULL)";

function audioB64(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

async function audioVoz(env, texto) {
  const r = await env.AI.run(AUDIO_VOZ, { prompt: texto, lang: "es" });
  if (r && typeof r.audio === "string") return r.audio;   // MeloTTS entrega el MP3 en base64
  if (r instanceof ArrayBuffer || ArrayBuffer.isView(r)) return audioB64(r instanceof ArrayBuffer ? r : r.buffer);
  if (r && typeof r.getReader === "function") return audioB64(await new Response(r).arrayBuffer());
  throw new Error("la voz no devolvió audio");
}

async function audioGenerar(f, u, env) {
  const sha = u.searchParams.get("sha") || "";
  const J = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^[0-9a-f]{40}$/.test(sha)) return J({ ok: false, error: "fecha o commit inválido" }, 400);
  if (!env.AI) return J({ ok: false, error: "sin Workers AI" }, 503);
  const g = await fetch(`${AUDIO_REPO}/${sha}/datos/audio-guion/${f}.json`, { cf: { cacheTtl: 0 } });
  if (!g.ok) return J({ ok: false, error: `guion no encontrado (${g.status})` }, 404);
  let guion;
  try { guion = await g.json(); } catch { return J({ ok: false, error: "guion ilegible" }, 422); }
  const partes = Array.isArray(guion && guion.partes) ? guion.partes.filter((x) => typeof x === "string" && x.trim()) : [];
  if (guion.fecha !== f || !partes.length || partes.length > 24 || partes.some((x) => x.length > 420)) return J({ ok: false, error: "guion fuera de formato" }, 422);
  if (env.DB) {
    await env.DB.prepare(AUDIO_TABLA).run();
    const r = await env.DB.prepare("INSERT INTO audio_gen (fecha, n, actualizado) VALUES (?, 1, ?) ON CONFLICT(fecha) DO UPDATE SET n = n + 1, actualizado = excluded.actualizado RETURNING n")
      .bind(f, new Date().toISOString()).first();
    if (r && r.n > 4) return J({ ok: false, error: "ya se generó 4 veces hoy" }, 429);
  }
  const salida = [];
  for (const t of partes) {
    let ok = null;
    for (let i = 0; i < 2 && !ok; i++) { try { ok = await audioVoz(env, t); } catch { /* un reintento */ } }
    if (!ok) return J({ ok: false, error: `la voz falló en la parte ${salida.length + 1}` }, 502);
    salida.push(ok);
  }
  return J({ ok: true, fecha: f, voz: AUDIO_VOZ, formato: "mp3", partes: salida }, 200);
}

async function audioArchivo(f) {
  const r = await fetch(`${AUDIO_REPO}/audio/Cofrade-News-${f}-resumen.mp3`, { cf: { cacheTtl: 600 } });
  if (!r.ok) return new Response("El audio de esa fecha todavía no está listo.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return new Response(r.body, { status: 200, headers: { "Content-Type": "audio/mpeg", "Content-Disposition": `inline; filename="Cofrade-News-${f}-resumen.mp3"`, "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
}
