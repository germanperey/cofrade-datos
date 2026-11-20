// Arnés de pruebas: el worker real (minificado) corre en workerd vía Miniflare, con D1 local, caché y salida a internet simulada.
import { Miniflare } from "miniflare";
import http from "node:http";
import fs from "node:fs";
const SECRETO_TS = "secreto-prueba", REPO = "/tmp/titulos/wt2/", ED = "/mnt/user-data/uploads/", FX = "/tmp/mf/prueba_wt2/fx/";
const oidos = [], youtube = [];
const completas = {};
for (const f of fs.readdirSync(ED)) { const m = f.match(/Cofrade-News-(\d{4}-\d{2}-\d{2})-completo\.html$/); if (m) completas[m[1]] = ED + f; }
// 15-11-2026: ediciones de prueba extra (p. ej. con data-ritmo o livianas) desde ED_EXTRA
if (process.env.ED_EXTRA) for (const f of fs.readdirSync(process.env.ED_EXTRA)) { const m = f.match(/Cofrade-News-(\d{4}-\d{2}-\d{2})-completo\.html$/); if (m) completas[m[1]] = process.env.ED_EXTRA + "/" + f; }
const salida = [], correos = [], llamadasIA = [], despachos = [], mpCreadas = [], mpEstado = {}, mpPedidos = [], mpProximo = {}, mpFalla = { get: 0, st: 500, put: 0 }, mpCobro = {};
const mf = new Miniflare({
  modules: true, scriptPath: process.argv[2] || "/tmp/esb/wt2.min.js", modulesRoot: "/tmp/esb", compatibilityDate: "2025-09-01",
  d1Databases: { DB: "prueba" }, cache: true,
  // 14-11-2026: la IA de traducción simulada (en producción es Workers AI); cuenta las llamadas para probar el tope por visita
  serviceBindings: { AI_PRUEBA: async (req) => { if (new URL(req.url).pathname === "/oido") { oidos.push(new URL(req.url).searchParams.get("l")); if (process.env.OIDO_FALLA) return new Response("", { status: 500 }); return new Response(process.env.OIDO_TEXTO || "índice"); } llamadasIA.push(1); const t = await req.text(); return new Response(process.env.IA_CAIDA ? "" : "EN·" + t); } }, ratelimits: { LIMITE: { namespace_id: "1101", simple: { limit: 30, period: 60 } } },
  bindings: { TURNSTILE_SECRET: SECRETO_TS, SEC_FETCH_PRUEBA: "1", ...(process.env.CON_GITHUB ? { GITHUB_DISPATCH: "ghp_prueba" } : {}), PULSO_HORAS: process.env.PULSO_HORAS || "0-23", ...(process.env.CON_MP ? { MP_ACCESS_TOKEN: "prueba-llave-mp" } : {}), ...(process.env.CON_MP && !process.env.MP_SIN_AVISOS ? { MP_WEBHOOK_SECRET: "secreto-mp-prueba" } : {}), PANEL_CLAVE: "clave-de-prueba-123", SOCIOS_CLAVE: "socios-prueba", ...(process.env.CON_RESEND ? { RESEND_API_KEY: "re_prueba" } : {}), ...(process.env.AVISOS_HORAS ? { AVISOS_HORAS: process.env.AVISOS_HORAS } : {}), ...(process.env.CON_YOUTUBE ? { YOUTUBE_API_KEY: "yt-clave-prueba" } : {}), ...(process.env.HOY_CONCURSO ? { CONCURSO_HOY_PRUEBA: process.env.HOY_CONCURSO } : {}), ...(process.env.HORA_CONCURSO ? { CONCURSO_HORA_PRUEBA: process.env.HORA_CONCURSO } : {}), ...(process.env.MANT_SEG !== undefined ? { CONCURSO_MANT_SEG: process.env.MANT_SEG } : {}), ...(process.env.PASO_SEG !== undefined ? { MENCIONES_PASO_SEG: process.env.PASO_SEG } : {}) },
  outboundService: async (req) => {
    const u = new URL(req.url); salida.push(req.method + " " + u.hostname + u.pathname);
    // 15-11-2026: librería de gráficos aparte. LIB_FALLA: GitHub no la entrega; LIB_MALA: jsDelivr entrega otra cosa
    if (u.hostname === "cdn.jsdelivr.net") {
      if (u.pathname !== "/npm/echarts@6.1.0/dist/echarts.min.js") return new Response("", { status: 404 });
      const b = fs.readFileSync("/tmp/npmech/x/package/dist/echarts.min.js");
      return new Response(process.env.LIB_MALA ? Buffer.concat([b, Buffer.from("\n//x")]) : b, { status: 200 });
    }
    if (u.hostname === "raw.githubusercontent.com") {
      const [, owner, , rama, ...resto] = u.pathname.split("/"), ruta = resto.join("/");
      if (process.env.LIB_FALLA && ruta.startsWith("sitio/assets/")) return new Response("", { status: 404 });
      if (owner === "disposable-email-domains") return new Response("# lista\nfakemailx.cl\nbasura-correo.xyz\n");
      let f = null;
      if (rama === "ediciones") { const m = ruta.match(/Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$/); f = m && completas[m[1]]; }
      else if (ruta === "datos/pulso.json" && process.env.PULSO_ARCHIVO) f = process.env.PULSO_ARCHIVO;   // 17-11-2026: pulsos de prueba
      else if (ruta.startsWith("datos/proyecciones/") && process.env.PROY_FOTOS) { const f2 = process.env.PROY_FOTOS + "/" + ruta.slice(19); if (!fs.existsSync(f2)) return new Response("", { status: 404 }); f = f2; }   // 19-11-2026: fotos por fecha
      else if (ruta === "datos/proyecciones-chile.json" && process.env.PROY_ARCHIVO) { if (process.env.PROY_ARCHIVO === "no") return new Response("", { status: 404 }); f = process.env.PROY_ARCHIVO; }   // 19-11-2026
      else if (ruta === "datos/pulso.json" && process.env.PULSO_EDAD_MIN) {   // pruebas del reloj por visita: Pulso con la edad pedida
        const j = JSON.parse(fs.readFileSync(REPO + ruta, "utf8")), t = new Date(Date.now() - Number(process.env.PULSO_EDAD_MIN) * 60000 - 3 * 3600000);
        j.generado = t.toISOString().slice(0, 16) + "-03:00";
        return new Response(req.method === "HEAD" ? null : JSON.stringify(j), { status: 200 });
      }
      else if (fs.existsSync(REPO + ruta)) f = REPO + ruta;
      if (!f) return new Response("", { status: 404 });
      return new Response(req.method === "HEAD" ? null : fs.readFileSync(f), { status: 200 });
    }
    if (u.hostname === "challenges.cloudflare.com" && u.pathname.endsWith("/siteverify")) {
      const fd = await req.formData();
      return Response.json({ success: fd.get("secret") === SECRETO_TS && fd.get("response") === "token-bueno", hostname: "www.cofrad.es" });
    }
    if (u.hostname === "cloudflare-dns.com") {
      const n = u.searchParams.get("name"), t = u.searchParams.get("type");
      if (n === "noexiste-xyz.cl") return Response.json({ Status: 3 });
      if (n === "sinmx.cl") return Response.json({ Status: 0, Answer: t === "MX" ? [{ type: 15, data: "0 ." }] : [] });
      return Response.json({ Status: 0, Answer: t === "MX" ? [{ type: 15, data: "10 mx.ejemplo.com." }] : [{ type: 1, data: "203.0.113.10" }] });
    }
    if (u.hostname === "api.resend.com") { const j = await req.json(); correos.push({ auth: req.headers.get("authorization"), ...j }); return Response.json({ id: "prueba-" + correos.length }); }
    if (u.hostname === "script.google.com") return new Response("ok");
    // 20-11-2026 · fuentes de menciones simuladas y sus robots.txt (FX)
    if (u.pathname === "/robots.txt") {
      const k = { "news.google.com": "ROBOTS_GOOGLE", "alerts.talkwalker.com": "ROBOTS_TALKWALKER", "www.google.com": "ROBOTS_ALERTAS" }[u.hostname];
      const modo = (k && process.env[k]) || "permitir";
      if (modo === "404") return new Response("", { status: 404 });
      if (modo === "500") return new Response("", { status: 503 });
      const f = FX + "robots_" + u.hostname + "_" + modo + ".txt";
      return new Response(fs.existsSync(f) ? fs.readFileSync(f) : "User-agent: *\nAllow: /\n", { status: 200 });
    }
    const fx = { "news.google.com": "google_news.xml", "itunes.apple.com": "itunes.json", "api.gdeltproject.org": "gdelt.json", "www.googleapis.com": "youtube.json", "alerts.talkwalker.com": "talkwalker.xml", "www.google.com": "google_alertas.xml" }[u.hostname];
    if (fx) {
      if (process.env["FALLA_" + u.hostname.replace(/\W/g, "_")]) return new Response("caída simulada", { status: 503 });
      if (u.hostname === "www.googleapis.com") { const c = new URL(u), k = req.headers.get("x-goog-api-key") || u.searchParams.get("key"); c.searchParams.delete("key"); c.searchParams.set("_clave", req.headers.get("x-goog-api-key") ? "cabecera" : u.searchParams.get("key") ? "url" : "no"); youtube.push(c.toString()); if (k !== "yt-clave-prueba") return Response.json({ error: { code: 400 } }, { status: 400 }); }
      return new Response(fs.readFileSync(FX + fx), { status: 200, headers: { "Content-Type": fx.endsWith(".json") ? "application/json" : "application/xml" } });
    }
    if (u.hostname === "api.mercadopago.com") {   // Mercado Pago de prueba: crea suscripciones pendientes y responde su estado
      mpPedidos.push({ metodo: req.method, ruta: u.pathname, auth: req.headers.get("authorization") });
      if (req.method === "GET" && u.pathname === "/users/me") return process.env.MP_LLAVE_MALA ? Response.json({ message: "invalid access token" }, { status: 401 }) : Response.json({ id: 123, nickname: "PRUEBA" });
      if (req.method === "POST" && u.pathname === "/preapproval") {
        const j = await req.json();
        if (process.env.MP_400) return Response.json({ message: "invalid payer_email" }, { status: 400 });
        const id = "2c9380849" + String(mpCreadas.length + 1).padStart(3, "0") + "a";
        mpCreadas.push({ id, ...j });
        if (process.env.MP_CANCELADA) mpEstado[id] = "cancelled";
        const dom = process.env.MP_SANDBOX ? "sandbox.mercadopago.cl" : "www.mercadopago.cl";
        return Response.json({ id, status: process.env.MP_CANCELADA ? "cancelled" : "pending", init_point: `https://${dom}/subscriptions/checkout?preapproval_id=${id}` }, { status: 201 });
      }
      let m = u.pathname.match(/^\/preapproval\/([\w-]+)$/);
      if (req.method === "GET" && m) {
        if (mpFalla.get > 0) { mpFalla.get--; return Response.json({ message: "falla simulada" }, { status: mpFalla.st }); }
        const c = mpCreadas.find((x) => x.id === m[1]);
        if (!c) return Response.json({ message: "not found" }, { status: 404 });
        return Response.json({ id: c.id, status: mpEstado[c.id] || "pending", external_reference: c.external_reference, payer_email: c.payer_email,
          next_payment_date: mpProximo[c.id] || c.auto_recurring.start_date, auto_recurring: c.auto_recurring, reason: c.reason });
      }
      if (req.method === "PUT" && m) {   // pausar o reanudar
        if (mpFalla.put > 0) { mpFalla.put--; return Response.json({ message: "falla simulada" }, { status: 500 }); }
        const c = mpCreadas.find((x) => x.id === m[1]);
        if (!c) return Response.json({ message: "not found" }, { status: 404 });
        const j = await req.json(); mpEstado[c.id] = j.status;
        return Response.json({ id: c.id, status: j.status });
      }
      m = u.pathname.match(/^\/authorized_payments\/(\d+)$/);
      if (req.method === "GET" && m) {
        const c = mpCobro.pre ? mpCreadas.find((x) => x.id === mpCobro.pre) : mpCreadas[mpCreadas.length - 1];
        return Response.json({ id: Number(m[1]), preapproval_id: c && c.id, status: "processed", transaction_amount: c ? c.auto_recurring.transaction_amount : 0,
          debit_date: mpCobro.fecha || "2026-12-01T15:00:00.000-03:00", payment: { id: mpCobro.pago || 98765, status: "approved" } });
      }
      return Response.json({ message: "ruta de prueba no simulada" }, { status: 404 });
    }
    if (u.hostname === "api.github.com" && /\/actions\/workflows\/[\w.-]+\/dispatches$/.test(u.pathname)) { despachos.push({ flujo: u.pathname.split("/").slice(-2)[0], auth: req.headers.get("authorization"), cuerpo: await req.text() }); return new Response(null, { status: process.env.GITHUB_401 ? 401 : 204 }); }
    return new Response("bloqueado en pruebas: " + u.hostname, { status: 599 });
  },
});
const db = await mf.getD1Database("DB");
const esquema = fs.readFileSync(REPO + "sitio/esquema-d1.sql", "utf8").split(";").map((x) => x.replace(/--.*$/gm, "").trim()).filter(Boolean);   // sin las líneas de comentario
const NUEVAS = /\b(compartidos|referidos|referidos_unicos|menciones|concurso_participantes|concurso_capturas|concurso_sorteos|cupones)\b/;
for (const q of esquema) { if (process.env.SIN_NUEVAS && NUEVAS.test(q)) continue; await db.prepare(q).run(); }
http.createServer(async (req, res) => {
  if (req.url.startsWith("/__sql")) {   // consultas de verificación de las pruebas
    const q = decodeURIComponent(req.url.split("?q=")[1] || "");
    try { const r = await db.prepare(q).all(); res.end(JSON.stringify(r.results)); } catch (e) { res.statusCode = 500; res.end(String(e)); }
    return;
  }
  if (req.url === "/__salida") { res.end(JSON.stringify(salida)); return; }
  if (req.url === "/__correos") { res.end(JSON.stringify(correos)); return; }
  if (req.url === "/__ia") { res.end(JSON.stringify({ llamadas: llamadasIA.length })); return; }
  if (req.url === "/__mp") { res.end(JSON.stringify({ creadas: mpCreadas, pedidos: mpPedidos })); return; }
  if (req.url.startsWith("/__mpestado")) { const q = new URL("http://x" + req.url).searchParams; if (q.get("s")) mpEstado[q.get("id")] = q.get("s"); if (q.get("np")) mpProximo[q.get("id")] = q.get("np"); res.end("{}"); return; }
  if (req.url.startsWith("/__mpfalla")) { const q = new URL("http://x" + req.url).searchParams; mpFalla.get = Number(q.get("n") || 0); mpFalla.st = Number(q.get("st") || 500); mpFalla.put = Number(q.get("put") || 0); res.end("{}"); return; }
  if (req.url.startsWith("/__mpcobro")) { const q = new URL("http://x" + req.url).searchParams; mpCobro.pre = q.get("pre") || ""; mpCobro.fecha = q.get("fecha") || ""; mpCobro.pago = Number(q.get("pago") || 0); res.end("{}"); return; }
  if (req.url === "/__despachos") { res.end(JSON.stringify(despachos)); return; }
  if (req.url === "/__oidos") { res.end(JSON.stringify(oidos)); return; }
  if (req.url === "/__youtube") { res.end(JSON.stringify(youtube)); return; }
  if (req.url === "/__cron") { const w = await mf.getWorker(); const r = await w.scheduled({ cron: "17 */2 * * *" }); res.end(JSON.stringify({ r, despachos })); return; }
  const chunks = []; for await (const c of req) chunks.push(c);
  const h = { ...req.headers }; delete h.host;
  if (h["x-origen-real"]) h.origin = h["x-origen-real"]; else if (h.origin) h.origin = "https://www.cofrad.es";
  h["cf-connecting-ip"] = h["x-ip-prueba"] || "198.51.100.7";
  if (h["sec-fetch-mode"]) h["x-prueba-sec-fetch-mode"] = h["sec-fetch-mode"];   // 20-11-2026: el cliente HTTP de Miniflare reescribe Sec-Fetch-Mode a «cors»
  const cf = h["x-asn-prueba"] ? { asn: Number(h["x-asn-prueba"]), country: "US" } : undefined;   // 16-11-2026: red de origen simulada
  const r = await mf.dispatchFetch("https://www.cofrad.es" + req.url, { method: req.method, headers: h, ...(cf ? { cf } : {}), body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks), redirect: "manual" });
  const out = {}; r.headers.forEach((v, k) => { out[k] = v; });
  if (r.headers.getSetCookie) { const sc = r.headers.getSetCookie(); if (sc.length) out["set-cookie"] = sc; }
  // 16-11-2026: con LOCAL_REDIR, las redirecciones a https://www.cofrad.es quedan en este simulador (solo la prueba del ícono)
  if (process.env.LOCAL_REDIR && out.location && out.location.startsWith("https://www.cofrad.es")) out.location = "http://localhost:" + (process.env.PUERTO || 8787) + out.location.slice(21);
  res.writeHead(r.status, out); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(Number(process.env.PUERTO || 8787), () => console.log("listo", Object.keys(completas).sort().join(",")));
