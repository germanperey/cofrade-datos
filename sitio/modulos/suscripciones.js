// ---------- SOCIOS FUNDADORES DEL DASHBOARD FINANCIERO · MERCADO PAGO (14-11-2026) ----------
// Decisiones de Germán (14-11-2026): nadie paga por algo que aún no existe, así que el primer cobro llega el día del lanzamiento
// del Dashboard Financiero, el 1 de diciembre de 2026 (o 7 días después de inscribirse, si eso es más tarde). Plan mensual $5.000
// o anual $55.000 (un mes de regalo); los socios de la Cofradía pagan 20 % menos escribiendo su clave de socio. La aplicación es
// «Cofrade News» (id 8369215541599277) en la cuenta de Mercado Pago de Destak E.I.R.L.
// Secretos (los crea Germán en Cloudflare): MP_ACCESS_TOKEN (cobrar) y MP_WEBHOOK_SECRET (firma de los avisos). Sin el primero,
// el botón «Quiero ser socio fundador» sigue abriendo el formulario de interés, como antes.
// Seguridad: el precio, la frecuencia y la fecha los fija este programa (nunca el navegador); cada aviso de Mercado Pago se acepta
// solo con su firma válida y su contenido se vuelve a preguntar a Mercado Pago con la llave (nunca se confía en el aviso).
const MP_API = "https://api.mercadopago.com";
const LANZAMIENTO_DASHBOARD = Date.parse("2026-12-01T12:00:00-03:00");
const PLANES_SOCIO = { mensual: { frecuencia: 1, monto: 5000 }, anual: { frecuencia: 12, monto: 55000 } };
const ESTADO_MP = { pending: "pendiente", authorized: "activa", paused: "pausada", cancelled: "cancelada", canceled: "cancelada" };
const primerCobro = (ahora = Date.now()) => Math.max(LANZAMIENTO_DASHBOARD, ahora + 7 * 86400000);
const isoChile = (ms) => fechaChile(new Date(ms));
const pesos = (n) => "$" + num(n, 0);
const fechaFrase = (iso) => { const t = fechaLarga(iso).replace(",", ""); return t.charAt(0).toLowerCase() + t.slice(1); };   // fecha dentro de una frase: día de la semana en minúscula y sin coma
const precioSocio = (plan, cofradia, pct) => Math.round(PLANES_SOCIO[plan].monto * (cofradia ? 1 - pct / 100 : 1) / 10) * 10;
const mpActivo = (env) => !!(env.MP_ACCESS_TOKEN && String(env.MP_ACCESS_TOKEN).trim() && env.DB);
const DE_MP = /^https:\/\/(www\.)?mercadopago\.(cl|com)\//;

async function pctCofradia(env) {
  try {
    const r = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'descuento_cofradia_pct'").first();
    const n = Number(r && r.valor);
    return Number.isFinite(n) && n > 0 && n <= 50 ? n : 20;
  } catch { return 20; }
}
async function mpPedir(env, metodo, ruta, cuerpo) {
  const r = await fetch(MP_API + ruta, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    headers: { Authorization: `Bearer ${String(env.MP_ACCESS_TOKEN || "").trim()}`, "Content-Type": "application/json" } });
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  return { ok: r.ok, status: r.status, j };
}

Object.assign(EN_FIJO, {
  "Socios fundadores · Dashboard Financiero": "Founding members · Financial Dashboard",
  "Inscríbete hoy. No pagas nada hasta el": "Sign up today. You pay nothing until",
  "Puente de Mando reúne la bolsa chilena y extranjera, ETF, cripto, el dinero que entra y sale de Chile y el radar político que mueve los mercados.":
    "The Bridge brings together the Chilean and foreign stock markets, ETFs, crypto, the money flowing in and out of Chile and the political radar that moves markets.",
  "Elige tu plan": "Choose your plan", "Mensual": "Monthly", "Anual": "Annual", "al mes": "per month", "al año, con un mes de regalo": "per year, with one month free",
  "Socios de la Cofradía:": "Cofradía members:", "Nombre y apellido *": "First and last name *",
  "Email de tu cuenta de Mercado Pago *": "Email of your Mercado Pago account *",
  "Clave de socio de la Cofradía (opcional, para el 20 % menos)": "Cofradía member password (optional, for 20% off)",
  "Leí y acepto las": "I have read and accept the", "condiciones de la suscripción": "subscription terms",
  "Inscribirme con Mercado Pago": "Sign up with Mercado Pago",
  "Mercado Pago te pedirá tu tarjeta para autorizar el cobro automático. Hoy no se cobra nada: el primer cargo llega el":
    "Mercado Pago will ask for your card to authorize the automatic charge. Nothing is charged today: the first charge comes on",
  "Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.": "You can cancel anytime from your Mercado Pago account.",
  "La inscripción con Mercado Pago se abre en las próximas horas. Déjanos tus datos y te avisamos.":
    "Sign-up with Mercado Pago opens in the next few hours. Leave us your details and we will let you know.",
  "Avísenme cuando abra": "Let me know when it opens", "Continuar a Mercado Pago": "Continue to Mercado Pago",
  "Te llevamos a Mercado Pago para que autorices el cobro.": "We are taking you to Mercado Pago to authorize the charge.",
  "Estado de tu inscripción": "Your sign-up status", "Quedaste inscrito como socio fundador.": "You are signed up as a founding member.",
  "Tu primer cargo:": "Your first charge:", "Tu inscripción quedó pendiente: falta autorizar el pago en Mercado Pago.":
    "Your sign-up is pending: the payment still has to be authorized in Mercado Pago.", "Autorizar en Mercado Pago": "Authorize in Mercado Pago",
  "Tu suscripción está en pausa: no se te cobra mientras siga así.": "Your subscription is paused: you will not be charged while it stays that way.",
  "Tu suscripción quedó cancelada. No se te cobrará nada más.": "Your subscription was canceled. You will not be charged again.",
  "No encontramos esa inscripción.": "We could not find that sign-up.", "Volver a la portada": "Back to the home page",
  "Condiciones de la suscripción de socio fundador": "Founding member subscription terms",
  "Socios fundadores · Cofrade News": "Founding members · Cofrade News", "Condiciones de la suscripción · Cofrade News": "Subscription terms · Cofrade News",
  "Socios fundadores: te inscribes hoy y el primer cobro llega el 1 de diciembre de 2026.": "Founding members: sign up today and the first charge comes on December 1, 2026.",
  "Versión del 14 de noviembre de 2026.": "Version of November 14, 2026.",
});

function paginaFundador(env, pct) {
  const ms = primerCobro(), dia = isoChile(ms);
  const fechaHtml = `<span data-iso="${dia}">${esc(fechaFrase(dia))}</span>`;
  const plan = (k, rot, det, sel) => `<label class="plan-s"><input type="radio" name="plan" value="${k}"${sel ? " checked" : ""}>
<span class="plan-c"><b>${rot}</b><span class="plan-m">${pesos(PLANES_SOCIO[k].monto)}</span><span>${det}</span>
<small><span>Socios de la Cofradía:</span> ${pesos(precioSocio(k, true, pct))}</small></span></label>`;
  const form = mpActivo(env)
    ? `<form class="pub-form fundador" id="fFundador" method="post" action="/socios/fundador" novalidate>
<fieldset><legend>Elige tu plan</legend><div class="planes-s">${plan("mensual", "Mensual", "al mes", true)}${plan("anual", "Anual", "al año, con un mes de regalo", false)}</div></fieldset>
<label>Nombre y apellido *<input name="nombre" required maxlength="80" autocomplete="name"></label>
<label>Email de tu cuenta de Mercado Pago *<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>Clave de socio de la Cofradía (opcional, para el 20 % menos)<input name="clave" type="password" maxlength="80" autocomplete="off"></label>
<label class="pub-hp" aria-hidden="true">Sitio web<input name="pagina_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> <span><span>Leí y acepto las</span> <a href="/socios/condiciones" target="_blank" rel="noopener">condiciones de la suscripción</a></span></label>
<div class="cf-turnstile ts" data-sitekey="${TURNSTILE_SITEKEY}" data-language="es"></div>
<button type="submit" class="pub-enviar">Inscribirme con Mercado Pago</button><p class="pub-estado" role="status" aria-live="polite"></p>
<p class="sub"><span>Mercado Pago te pedirá tu tarjeta para autorizar el cobro automático. Hoy no se cobra nada: el primer cargo llega el</span> ${fechaHtml}.
<span>Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.</span></p></form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>(function(){var f=document.getElementById('fFundador');if(!f||!window.fetch)return;var st=f.querySelector('.pub-estado'),b=f.querySelector('.pub-enviar'),en=function(){return document.documentElement.lang==='en'};
f.addEventListener('submit',function(ev){ev.preventDefault();st.textContent=en()?'Connecting with Mercado Pago…':'Conectando con Mercado Pago…';b.disabled=true;
fetch('/socios/fundador',{method:'POST',headers:{'Accept':'application/json'},body:new URLSearchParams(new FormData(f))}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){
if(j&&j.ok&&j.url){st.textContent=en()?'Taking you to Mercado Pago…':'Te llevamos a Mercado Pago…';location.assign(j.url);return}
st.textContent=(j&&j.error)||(en()?'We could not connect. Try again in a minute.':'No pudimos conectar. Intenta de nuevo en un minuto.');b.disabled=false;try{if(window.turnstile)turnstile.reset()}catch(e){}
}).catch(function(){st.textContent=en()?'We could not connect. Try again in a minute.':'No pudimos conectar. Intenta de nuevo en un minuto.';b.disabled=false})})})();</script>`
    : `<p class="aviso">La inscripción con Mercado Pago se abre en las próximas horas. Déjanos tus datos y te avisamos.</p>
<div class="acciones"><button type="button" class="btn oro pub-abrir" data-interes="Dashboard Financiero · socio fundador" aria-haspopup="dialog">Avísenme cuando abra</button></div>`;
  const estilo = `<style>.planes-s{display:grid;grid-template-columns:1fr 1fr;gap:12px}.plan-s{position:relative}.plan-s input{position:absolute;opacity:0}
.plan-c{display:flex;flex-direction:column;gap:2px;border:1.5px solid var(--linea);border-radius:14px;padding:14px;cursor:pointer;font-weight:400}
.plan-c b{font-size:15px}.plan-m{font:700 28px var(--serif,Georgia,serif);color:var(--tinta)}.plan-s input:checked+.plan-c{border-color:var(--oro,#B8892B);box-shadow:0 0 0 2px rgba(184,137,43,.25)}
.plan-s input:focus-visible+.plan-c{outline:2px solid var(--oro,#B8892B);outline-offset:2px}@media (max-width:540px){.planes-s{grid-template-columns:1fr}}</style>`;
  const cuerpo = `${estilo}<section style="border:0;max-width:720px"><span class="kicker">Socios fundadores · Dashboard Financiero</span>
<h1 class="titulo-lujo"><span>Inscríbete hoy. No pagas nada hasta el</span> ${fechaHtml}.</h1>
<p class="lede">Puente de Mando reúne la bolsa chilena y extranjera, ETF, cripto, el dinero que entra y sale de Chile y el radar político que mueve los mercados.</p>
${form}</section>`;
  return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "Inscríbete como socio fundador del Dashboard Financiero de Cofrade News.",
    cuerpo, canonica: "/socios/fundador" }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// POST /socios/fundador → crea la suscripción en Mercado Pago (pendiente hasta que la persona autorice su tarjeta allá).
async function crearSuscripcion(req, env, ctx) {
  const quiereJson = /json/.test(req.headers.get("Accept") || "");
  const responder = (ok, datos, status = 200) => {
    if (quiereJson) return jsonR(ok ? { ok: true, url: datos } : { ok: false, error: datos }, status);
    const cuerpo = ok
      ? `<section style="border:0;max-width:620px"><span class="kicker">Socios fundadores · Dashboard Financiero</span><h1>Te llevamos a Mercado Pago para que autorices el cobro.</h1>
<div class="acciones"><a class="btn oro" href="${esc(datos)}">Continuar a Mercado Pago</a></div></section>`
      : `<section style="border:0;max-width:620px"><span class="kicker">Socios fundadores · Dashboard Financiero</span><p class="aviso" role="alert">${esc(datos)}</p>
<div class="acciones"><a class="btn linea" href="/socios/fundador">Volver</a></div></section>`;
    return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "", cuerpo, canonica: "/socios/fundador" }), status, { "Cache-Control": "no-store" });
  };
  if (!ORIGEN_OK(req)) return responder(false, "Origen no permitido.", 403);
  if (!mpActivo(env)) return responder(false, "La inscripción con Mercado Pago se abre en las próximas horas.", 503);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (!(await bajoLimite(env, "s:" + ip))) return responder(false, "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.", 429);
  const cuerpo = await leerCuerpo(req, 8000);
  if (cuerpo === null) return responder(false, "El formulario es demasiado largo.", 413);
  const f = new URLSearchParams(cuerpo);
  const v = (k, n) => String(f.get(k) || "").trim().replace(/\s+/g, " ").slice(0, n);
  if (v("pagina_web", 100)) return responder(false, "No pudimos procesar la inscripción.", 400);   // trampa para robots
  if (!(await turnstileOk(String(f.get("cf-turnstile-response") || ""), req, env)))
    return responder(false, "No pudimos confirmar que eres una persona. Vuelve a marcar el recuadro de seguridad.", 400);
  const nombre = v("nombre", 80), email = v("email", 120).toLowerCase(), plan = v("plan", 10), clave = String(f.get("clave") || "").slice(0, 80);
  const partes = nombre.split(" ");
  if (partes.length < 2 || !partes.every((x) => NOMBRE_OK.test(x)) || NOMBRE_FALSO.test(partes[0]) || /(.)\1{3,}/i.test(nombre))
    return responder(false, "Escribe tu nombre y tu apellido reales (solo letras).", 400);
  const m = email.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!m || !/\.[a-z]{2,}$/.test(m[1])) return responder(false, "Ese email no parece válido. Usa el de tu cuenta de Mercado Pago.", 400);
  if (await esDesechable(m[1], ctx)) return responder(false, "No aceptamos correos temporales o desechables. Usa el de tu cuenta de Mercado Pago.", 400);
  if (!PLANES_SOCIO[plan]) return responder(false, "Elige el plan mensual o el anual.", 400);
  if (v("acepto", 4) !== "si") return responder(false, "Debes aceptar las condiciones de la suscripción.", 400);
  let cofradia = false;
  if (clave) {
    if (!env.SOCIOS_CLAVE || !iguales(await firma("c|" + clave, env.SOCIOS_CLAVE), await firma("c|" + env.SOCIOS_CLAVE, env.SOCIOS_CLAVE)))
      return responder(false, "Esa clave de socio no es correcta. Déjala en blanco para inscribirte sin el precio Cofradía.", 400);
    cofradia = true;
  }
  // una inscripción viva por correo: si ya autorizó, no se cobra dos veces; si la dejó a medias hoy, se reusa el mismo enlace
  const previa = await env.DB.prepare("SELECT ref, estado, enlace, creado, plan, cofradia FROM suscripciones WHERE email = ? ORDER BY creado DESC LIMIT 1").bind(email).first();
  if (previa && ["activa", "pausada"].includes(previa.estado))
    return responder(false, "Ese correo ya tiene una suscripción de socio fundador. Puedes revisarla en tu cuenta de Mercado Pago.", 409);
  if (previa && previa.estado === "pendiente" && previa.enlace && DE_MP.test(previa.enlace) && previa.plan === plan && !!previa.cofradia === cofradia
      && Date.now() - Date.parse(previa.creado) < 86400000)
    return responder(true, previa.enlace);
  const pct = await pctCofradia(env), monto = precioSocio(plan, cofradia, pct), inicio = new Date(primerCobro()).toISOString();
  const ref = "CN-" + (await sha256hex(crypto.randomUUID())).slice(0, 12);
  const ahora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO suscripciones (ref, creado, nombre, email, plan, monto, cofradia, inicio, estado, actualizado, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'creada', ?, ?)")
    .bind(ref, ahora, nombre, email, plan, monto, cofradia ? 1 : 0, inicio, ahora, ip).run();
  const r = await mpPedir(env, "POST", "/preapproval", {
    reason: `Cofrade News · socio fundador ${plan}${cofradia ? " Cofradía" : ""}`, external_reference: ref, payer_email: email,
    auto_recurring: { frequency: PLANES_SOCIO[plan].frecuencia, frequency_type: "months", start_date: inicio, transaction_amount: monto, currency_id: "CLP" },
    back_url: `https://${DOMINIO}/socios/gracias?ref=${ref}`, status: "pending" }).catch(() => ({ ok: false, status: 0, j: null }));
  const enlace = r.j && r.j.init_point;
  if (!r.ok || !enlace || !DE_MP.test(enlace)) {
    await env.DB.prepare("UPDATE suscripciones SET estado = 'error', actualizado = ? WHERE ref = ?").bind(new Date().toISOString(), ref).run();
    const msg = r.status === 400 ? "Mercado Pago no aceptó el correo: usa el email con que entras a tu cuenta de Mercado Pago."
      : "Mercado Pago no respondió. Intenta de nuevo en unos minutos.";
    return responder(false, msg, 502);
  }
  await env.DB.prepare("UPDATE suscripciones SET estado = 'pendiente', mp_id = ?, enlace = ?, actualizado = ? WHERE ref = ?")
    .bind(String(r.j.id || ""), enlace, new Date().toISOString(), ref).run();
  return responder(true, enlace);
}

// Pone al día una suscripción con lo que dice Mercado Pago (aviso firmado, regreso desde Mercado Pago o revisión del panel).
async function actualizarSuscripcion(env, pre) {
  if (!pre || !pre.id) return null;
  const fila = await env.DB.prepare("SELECT * FROM suscripciones WHERE ref = ? OR mp_id = ? LIMIT 1").bind(String(pre.external_reference || ""), String(pre.id)).first();
  if (!fila) return null;
  const estado = ESTADO_MP[pre.status] || fila.estado, ahora = new Date().toISOString();
  const proximo = String(pre.next_payment_date || (pre.auto_recurring && pre.auto_recurring.start_date) || fila.inicio || "");
  await env.DB.prepare("UPDATE suscripciones SET estado = ?, mp_id = ?, proximo = ?, actualizado = ? WHERE ref = ?").bind(estado, String(pre.id), proximo, ahora, fila.ref).run();
  const est = estado === "activa" ? (Date.now() < Date.parse(fila.inicio) ? "prueba" : "activo") : estado === "pausada" ? "pausado" : estado === "cancelada" ? "cancelado" : null;
  if (est) {
    await env.DB.prepare(`INSERT INTO usuarios (email, nombre, creado, ultimo, cofradia, estado, plan, vence, mp_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(email) DO UPDATE SET nombre = excluded.nombre, ultimo = excluded.ultimo, cofradia = MAX(usuarios.cofradia, excluded.cofradia), estado = excluded.estado,
plan = excluded.plan, vence = excluded.vence, mp_id = excluded.mp_id`).bind(fila.email, fila.nombre, ahora, ahora, fila.cofradia, est, fila.plan, proximo, String(pre.id)).run();
  }
  return { ...fila, estado, proximo };
}
async function registrarCobro(env, ap) {
  if (!ap || !ap.id) return null;
  const fila = await env.DB.prepare("SELECT ref, email FROM suscripciones WHERE mp_id = ? LIMIT 1").bind(String(ap.preapproval_id || "")).first();
  if (!fila) return null;   // un cobro que no es de Cofrade News
  const pago = ap.payment || {};
  const id = pago.id ? String(pago.id) : "ap-" + ap.id;
  await env.DB.prepare("INSERT OR REPLACE INTO pagos (id, email, monto, fecha, estado, tipo, ref) VALUES (?, ?, ?, ?, ?, 'suscripcion', ?)")
    .bind(id, fila.email, Math.round(Number(ap.transaction_amount) || 0), String(ap.debit_date || ap.date_created || new Date().toISOString()),
      String(pago.status || ap.status || ""), fila.ref).run();
  return id;
}
async function procesarAvisoMP(env, tipo, id) {
  if (/preapproval$/.test(tipo)) {
    const r = await mpPedir(env, "GET", `/preapproval/${encodeURIComponent(id)}`);
    if (r.ok) await actualizarSuscripcion(env, r.j);
  } else if (/authorized_payment$/.test(tipo)) {
    const r = await mpPedir(env, "GET", `/authorized_payments/${encodeURIComponent(id)}`);
    if (r.ok) await registrarCobro(env, r.j);
  }
}

// POST /mp/aviso: los avisos de Mercado Pago. Firma HMAC-SHA256 de «id:<data.id>;request-id:<x-request-id>;ts:<ts>;» con la
// clave secreta de la aplicación. Se responde de inmediato y el contenido se pregunta a Mercado Pago aparte.
async function avisoMP(req, u, env, ctx) {
  if (!env.MP_WEBHOOK_SECRET || !mpActivo(env)) return jsonR({ ok: false, error: "Avisos aún no activos." }, 503);   // Mercado Pago reintenta
  const s = req.headers.get("x-signature") || "", rid = req.headers.get("x-request-id") || "";
  let ts = "", v1 = "";
  for (const p of s.split(",")) {
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = p.slice(0, i).trim(), val = p.slice(i + 1).trim();
    if (k === "ts") ts = val;
    if (k === "v1") v1 = val.toLowerCase();
  }
  const cuerpo = await leerCuerpo(req, 65536);
  let b = {};
  try { b = JSON.parse(cuerpo || "{}"); } catch { b = {}; }
  const dataId = String(u.searchParams.get("data.id") || "").toLowerCase();
  const partes = [];
  if (dataId) partes.push(`id:${dataId}`);
  if (rid) partes.push(`request-id:${rid}`);
  partes.push(`ts:${ts}`);
  if (!ts || !/^[a-f0-9]{64}$/.test(v1) || !iguales(await firma(partes.join(";") + ";", String(env.MP_WEBHOOK_SECRET).trim()), v1))
    return jsonR({ ok: false, error: "Firma no válida." }, 401);
  const tipo = String(u.searchParams.get("type") || b.type || b.topic || ""), id = String(u.searchParams.get("data.id") || (b.data && b.data.id) || "");
  if (id && /^[\w-]{1,64}$/.test(id)) ctx.waitUntil(procesarAvisoMP(env, tipo, id).catch(() => null));
  return jsonR({ ok: true });
}

function cajaEstado(fila) {
  const k = `<span class="kicker">Estado de tu inscripción</span>`;
  if (!fila) return `${k}<h1>No encontramos esa inscripción.</h1>`;
  const primer = isoChile(Date.parse(fila.proximo || fila.inicio));
  const nombre = esc(String(fila.nombre || "").split(" ")[0]);
  if (fila.estado === "activa")
    return `${k}<h1>${nombre ? nombre + ": " : ""}<span>Quedaste inscrito como socio fundador.</span></h1>
<p class="lede"><span>Tu primer cargo:</span> <b>${pesos(fila.monto)}</b>, <span data-iso="${primer}">${esc(fechaFrase(primer))}</span>.
<span>Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago.</span></p>`;
  if (fila.estado === "pausada") return `${k}<h1>Tu suscripción está en pausa: no se te cobra mientras siga así.</h1>`;
  if (fila.estado === "cancelada") return `${k}<h1>Tu suscripción quedó cancelada. No se te cobrará nada más.</h1>`;
  return `${k}<h1>Tu inscripción quedó pendiente: falta autorizar el pago en Mercado Pago.</h1>
${fila.enlace && DE_MP.test(fila.enlace) ? `<div class="acciones"><a class="btn oro" href="${esc(fila.enlace)}">Autorizar en Mercado Pago</a></div>` : ""}`;
}
// GET /socios/gracias?ref=CN-…: a donde vuelve la persona desde Mercado Pago. Se pregunta el estado real a Mercado Pago.
async function paginaGracias(u, env) {
  const ref = String(u.searchParams.get("ref") || "");
  let fila = /^CN-[a-f0-9]{12}$/.test(ref) && env.DB ? await env.DB.prepare("SELECT * FROM suscripciones WHERE ref = ?").bind(ref).first() : null;
  if (fila && fila.mp_id && mpActivo(env)) {
    const r = await mpPedir(env, "GET", `/preapproval/${encodeURIComponent(fila.mp_id)}`).catch(() => ({ ok: false }));
    if (r.ok) fila = (await actualizarSuscripcion(env, r.j)) || fila;
  }
  const cuerpo = `<section style="border:0;max-width:620px">${cajaEstado(fila)}<div class="acciones"><a class="btn linea" href="/">Volver a la portada</a></div></section>`;
  return html(marco({ titulo: "Socios fundadores · Cofrade News", descripcion: "", cuerpo, canonica: "/socios/gracias" }), fila ? 200 : 404,
    { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}

// GET /socios/condiciones: las reglas de la suscripción en palabras simples (revisadas por Germán antes de cobrar).
const CONDICIONES = [
  ["Quién vende", "El Dashboard Financiero de Cofrade News lo presta Destak E.I.R.L. Los cobros los procesa Mercado Pago; Cofrade News nunca ve ni guarda los datos de tu tarjeta."],
  ["Precio", "Plan mensual: $5.000 al mes. Plan anual: $55.000 al año (equivale a 11 meses). Los socios de la Cofradía que escriben su clave de socio pagan 20 % menos: $4.000 al mes o $44.000 al año. Los precios incluyen impuestos."],
  ["Cuándo se cobra", "Al inscribirte autorizas el cobro automático en Mercado Pago, pero hoy no se cobra nada. El primer cargo llega el 1 de diciembre de 2026, día del lanzamiento del Dashboard Financiero, o 7 días después de inscribirte si te inscribes después del 24 de noviembre. Luego se cobra cada mes o cada año, según tu plan. Mercado Pago puede hacer un cargo mínimo para validar la tarjeta, que devuelve de inmediato."],
  ["Si el lanzamiento se atrasa", "Si el Dashboard Financiero no está disponible el 1 de diciembre de 2026, pausamos tu suscripción antes de esa fecha y no se te cobra hasta que lo esté."],
  ["Cómo cancelar", "Puedes cancelar cuando quieras desde tu cuenta de Mercado Pago (sección Suscripciones) o escribiéndonos por el formulario de contacto de www.cofrad.es. La cancelación detiene los cobros siguientes."],
  ["Boleta", "Por cada cobro, Destak E.I.R.L. emite la boleta electrónica que corresponde."],
  ["Tus datos", "Guardamos tu nombre, tu email y el estado de tu suscripción solo para darte acceso y emitir tus boletas. No los vendemos ni los compartimos, salvo con Mercado Pago para procesar el pago. Puedes pedir que los borremos por el formulario de contacto."],
  ["Qué no es", "El Dashboard Financiero es información general y educativa. No es asesoría de inversión ni una recomendación de compra o venta, y no considera tu situación personal."],
];
Object.assign(EN_FIJO, {
  "Quién vende": "Who sells", "Precio": "Price", "Cuándo se cobra": "When you are charged", "Si el lanzamiento se atrasa": "If the launch is delayed",
  "Cómo cancelar": "How to cancel", "Volver": "Back", "Boleta": "Receipt", "Tus datos": "Your data", "Qué no es": "What it is not",
  [CONDICIONES[0][1]]: "Cofrade News' Financial Dashboard is provided by Destak E.I.R.L. Charges are processed by Mercado Pago; Cofrade News never sees or stores your card details.",
  [CONDICIONES[1][1]]: "Monthly plan: CLP 5,000 per month. Annual plan: CLP 55,000 per year (the same as 11 months). Cofradía members who enter their member password pay 20% less: CLP 4,000 per month or CLP 44,000 per year. Prices include taxes.",
  [CONDICIONES[2][1]]: "When you sign up you authorize the automatic charge in Mercado Pago, but nothing is charged today. The first charge comes on December 1, 2026, the launch day of the Financial Dashboard, or 7 days after you sign up if you sign up after November 24. After that you are charged every month or every year, depending on your plan. Mercado Pago may make a small charge to validate the card, which it refunds right away.",
  [CONDICIONES[3][1]]: "If the Financial Dashboard is not available on December 1, 2026, we will pause your subscription before that date and you will not be charged until it is.",
  [CONDICIONES[4][1]]: "You can cancel anytime from your Mercado Pago account (Subscriptions section) or by writing to us through the contact form at www.cofrad.es. Canceling stops the following charges.",
  [CONDICIONES[5][1]]: "For each charge, Destak E.I.R.L. issues the corresponding electronic receipt (boleta).",
  [CONDICIONES[6][1]]: "We keep your name, your email and the status of your subscription only to give you access and issue your receipts. We do not sell or share them, except with Mercado Pago to process the payment. You can ask us to delete them through the contact form.",
  [CONDICIONES[7][1]]: "The Financial Dashboard is general and educational information. It is not investment advice or a recommendation to buy or sell, and it does not consider your personal situation.",
});
function paginaCondiciones() {
  const cuerpo = `<section style="border:0;max-width:760px"><span class="kicker">Socios fundadores · Dashboard Financiero</span>
<h1>Condiciones de la suscripción de socio fundador</h1><p class="sub">Versión del 14 de noviembre de 2026.</p>
${CONDICIONES.map(([t, d]) => `<h3>${esc(t)}</h3><p>${esc(d)}</p>`).join("\n")}
<div class="acciones"><a class="btn oro" href="/socios/fundador">Inscribirme con Mercado Pago</a></div></section>`;
  return html(marco({ titulo: "Condiciones de la suscripción · Cofrade News", descripcion: "Condiciones de la suscripción de socio fundador del Dashboard Financiero de Cofrade News.",
    cuerpo, canonica: "/socios/condiciones" }), 200, { "Cache-Control": "public, max-age=600" });
}

// POST /panel/suscripciones (solo Germán, desde el panel): pausar o reanudar TODAS las suscripciones. Es lo que promete la cláusula
// «Si el lanzamiento se atrasa»: se pausan antes del 1 de diciembre y nadie paga hasta que el Dashboard esté disponible.
async function accionSuscripciones(req, env) {
  if (!ORIGEN_OK(req) || !(await esAdmin(req, env))) return new Response("No autorizado.", { status: 403 });
  if (!mpActivo(env)) return new Response(null, { status: 303, headers: { Location: "/panel" } });
  const f = new URLSearchParams((await leerCuerpo(req, 2000)) || "");
  const accion = f.get("accion"), [desde, hacia, estado] = accion === "pausar" ? ["activa", "paused", "pausada"] : accion === "reanudar" ? ["pausada", "authorized", "activa"] : [];
  if (!desde) return new Response(null, { status: 303, headers: { Location: "/panel" } });
  const filas = (await env.DB.prepare("SELECT ref, mp_id FROM suscripciones WHERE estado = ? AND mp_id IS NOT NULL AND mp_id <> '' LIMIT 40").bind(desde).all()).results || [];
  let hechas = 0;
  for (const x of filas) {
    const r = await mpPedir(env, "PUT", `/preapproval/${encodeURIComponent(x.mp_id)}`, { status: hacia }).catch(() => ({ ok: false }));
    if (r.ok) {
      await env.DB.prepare("UPDATE suscripciones SET estado = ?, actualizado = ? WHERE ref = ?").bind(estado, new Date().toISOString(), x.ref).run();
      hechas++;
    }
  }
  return new Response(null, { status: 303, headers: { Location: `/panel?suscripciones=${accion}-${hechas}-de-${filas.length}`, "Cache-Control": "no-store" } });
}

// Panel (solo Germán): inscripciones y cobros. De paso, pone al día hasta 6 suscripciones que no se revisan hace más de 6 horas,
// por si algún aviso de Mercado Pago no llegó.
async function panelSocios(env) {
  if (!env.DB) return "";
  const q = (s, ...b) => env.DB.prepare(s).bind(...b).all().then((r) => r.results || []).catch(() => []);
  if (mpActivo(env)) {
    const viejas = await q("SELECT mp_id FROM suscripciones WHERE mp_id IS NOT NULL AND mp_id <> '' AND estado IN ('pendiente', 'activa', 'pausada') AND actualizado < ? ORDER BY actualizado LIMIT 6",
      new Date(Date.now() - 6 * 3600000).toISOString());
    await Promise.all(viejas.map((x) => mpPedir(env, "GET", `/preapproval/${encodeURIComponent(x.mp_id)}`).then((r) => (r.ok ? actualizarSuscripcion(env, r.j) : null)).catch(() => null)));
  }
  const [subs, cobros] = await Promise.all([
    q("SELECT creado, nombre, email, plan, monto, cofradia, estado, proximo, inicio FROM suscripciones WHERE estado <> 'creada' ORDER BY creado DESC LIMIT 200"),
    q("SELECT id, email, monto, fecha, estado FROM pagos WHERE tipo = 'suscripcion' ORDER BY fecha DESC LIMIT 200"),
  ]);
  const cuenta = (e) => subs.filter((x) => x.estado === e).length;
  const mensual = subs.filter((x) => x.estado === "activa").reduce((a, x) => a + (x.plan === "anual" ? x.monto / 12 : x.monto), 0);
  const kpi = (t, v, s = "") => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b>${s ? `<br><small>${esc(s)}</small>` : ""}</div>`;
  const fila = (x) => `<tr><td>${esc(String(x.creado).slice(0, 10))}</td><td>${esc(x.nombre)}</td><td>${esc(x.email)}</td><td>${esc(x.plan)}${x.cofradia ? " · Cofradía" : ""}</td>
<td>${pesos(x.monto)}</td><td>${esc(x.estado)}</td><td>${esc(String(x.proximo || x.inicio || "").slice(0, 10))}</td></tr>`;
  return `<section><h3>Socios fundadores (Mercado Pago)</h3>
${mpActivo(env) ? "" : `<p class="aviso">Falta la clave MP_ACCESS_TOKEN en Cloudflare: el botón «Quiero ser socio fundador» todavía abre el formulario de interés.</p>`}
${mpActivo(env) && !env.MP_WEBHOOK_SECRET ? `<p class="aviso">Falta la clave MP_WEBHOOK_SECRET: los avisos de Mercado Pago esperan; el panel revisa las suscripciones cada 6 horas.</p>` : ""}
<div class="cifras">${kpi("Inscritos con tarjeta autorizada", num(cuenta("activa"), 0), "cobro desde el 1 de diciembre")}${kpi("Pendientes de autorizar", num(cuenta("pendiente"), 0))}
${kpi("En pausa o cancelados", num(cuenta("pausada") + cuenta("cancelada"), 0))}${kpi("Ingreso mensual esperado", pesos(Math.round(mensual)), "planes anuales divididos por 12")}</div>
${mpActivo(env) && subs.length ? `<form method="post" action="/panel/suscripciones" class="acciones" style="margin:10px 0 14px"><button class="btn linea" name="accion" value="pausar" type="submit">Pausar todas (no se cobra a nadie)</button>
<button class="btn linea" name="accion" value="reanudar" type="submit">Reanudar las pausadas</button><span class="sub" style="align-self:center">Úsalo si el Dashboard no está listo el 1 de diciembre: lo promete la cláusula «Si el lanzamiento se atrasa».</span></form>` : ""}
${subs.length ? `<div class="tabla"><table><thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Plan</th><th>Monto</th><th>Estado</th><th>Próximo cobro</th></tr></thead><tbody>${subs.slice(0, 60).map(fila).join("")}</tbody></table></div>` : `<p class="aviso">Todavía no hay inscripciones.</p>`}
<h4 class="kicker" style="margin-top:18px">Cobros recibidos (para emitir cada boleta)</h4>
${cobros.length ? `<div class="tabla"><table><thead><tr><th>Fecha</th><th>Email</th><th>Monto</th><th>Estado</th><th>N° Mercado Pago</th></tr></thead><tbody>${cobros.map((x) => `<tr><td>${esc(String(x.fecha).slice(0, 10))}</td><td>${esc(x.email)}</td><td>${pesos(x.monto)}</td><td>${esc(x.estado)}</td><td>${esc(x.id)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="aviso">Aún no hay cobros: el primero llega el 1 de diciembre de 2026.</p>`}</section>`;
}
