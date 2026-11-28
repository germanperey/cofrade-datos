// 26-11-2026 · Casillero «Recíbelo a las 7:00» en el primer pantallazo de la portada. Germán, con una revisión externa: «Captura de
// correo y WhatsApp/Telegram en el primer pantallazo: este es el cuello de botella más caro que tienes hoy... en la portada no hay
// ningún casillero para suscribirse». Eligió correo con Kit + Telegram (gratis).
// Flujo: el lector deja su correo → le llega un correo de confirmación desde hola@cofrad.es (Resend, el mismo del Buzón) → al tocar el
// enlace queda confirmado en D1 (tabla lectores) y se da de alta en Kit con la etiqueta «cofrade-news» (secreto KIT_API_KEY). El envío
// diario de las 7:00 lo hace GitHub (herramientas/envio_manana.py) solo a esa etiqueta; cada correo trae su enlace para darse de baja.
// Doble confirmación: nadie queda suscrito con un correo ajeno (Ley 19.628 y 21.719). Se guarda solo el correo y las fechas: ni IP ni
// nombre. Si falta KIT_API_KEY, el lector queda confirmado en D1 con kit = «pendiente» y se sube solo apenas exista la llave.
// Telegram: el botón aparece cuando existe la variable TELEGRAM_URL (por ejemplo https://t.me/CofradeNews).
const LECTORES_TABLA = "CREATE TABLE IF NOT EXISTS lectores (email TEXT PRIMARY KEY, token TEXT NOT NULL, creado TEXT NOT NULL, confirmado TEXT, origen TEXT, kit TEXT, enviado TEXT)";
const LECT_ETIQUETA = "cofrade-news";
const lectEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lectEmailOk = (e) => /^[^\s@<>"']{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/.test(e) && e.length <= 254;

// 27-11-2026 (Germán: «Verifica que las traducciones a inglés se realicen correctamente!!»): la caja va en los dos idiomas.
const lectBil = (es, en) => `<span class="cn-es" lang="es">${es}</span><span class="cn-en" lang="en">${en}</span>`;
function cajaLectores(env) {
  const tg = env && /^https:\/\/t\.me\/[A-Za-z0-9_+]{3,64}$/.test(String(env.TELEGRAM_URL || "")) ? String(env.TELEGRAM_URL) : "";
  return `<form class="cnl" id="cnLect" action="/suscribir" method="post" novalidate>
<label class="cnl-t" for="cnLectEmail" data-no-tr translate="no">${lectBil("Recibe lo que mueve la aguja, cada mañana a las 7:00", "Get what moves the needle, every morning at 7:00")}</label>
<div class="cnl-f"><input id="cnLectEmail" name="cn_email" type="email" inputmode="email" autocomplete="email" required maxlength="254" placeholder="tu@correo.cl" aria-describedby="cnLectNota">
<input type="text" name="cn_web" tabindex="-1" autocomplete="off" aria-hidden="true" class="cnl-h">
<button type="submit" class="btn oro" data-no-tr translate="no">${lectBil("Recíbelo gratis", "Get it free")}</button>${tg ? `<a class="btn claro cnl-tg" href="${lectEsc(tg)}" target="_blank" rel="noopener" data-cn-ev="telegram">Telegram</a>` : ""}</div>
<p class="cnl-n" id="cnLectNota" role="status" aria-live="polite" data-no-tr translate="no">${lectBil("5 titulares y el audio de la edición. Te pedimos confirmar por correo; te das de baja con un clic.", "5 headlines and the edition’s audio. We ask you to confirm by email; unsubscribe with one click.")}</p></form>`;
}
const LECTORES_CSS = `.cnl .cn-en{display:none}html[lang^="en"] .cnl .cn-en{display:inline}html[lang^="en"] .cnl .cn-es{display:none}.cnl{margin:22px 0 4px;max-width:560px}.cnl-t{display:block;font:600 15px/1.35 var(--sans);color:#F4EEDF;margin:0 0 10px}
.cnl-f{display:flex;flex-wrap:wrap;gap:10px}.cnl-f input[type=email]{flex:1 1 220px;min-height:48px;padding:0 16px;border-radius:999px;border:1px solid rgba(201,161,74,.55);
background:rgba(255,255,255,.96);color:#1A1406;font:16px var(--sans)}.cnl-f input[type=email]:focus-visible{outline:3px solid #C9A14A;outline-offset:2px}
.cnl-f .btn{min-height:48px}.cnl-h{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}
.cnl-n{margin:8px 0 0;font-size:13px;line-height:1.45;color:#D8D2C4}.cnl-n.ok{color:#BFE3B4}.cnl-n.mal{color:#FFB4A8}
@media (max-width:560px){.cnl-f .btn{flex:1 1 100%}}`;
const LECTORES_JS = `<script>(function(){var f=document.getElementById('cnLect');if(!f)return;var n=document.getElementById('cnLectNota'),b=f.querySelector('button[type=submit]');
function ph(){f.cn_email.placeholder=document.documentElement.lang.indexOf('en')===0?'you@email.com':'tu@correo.cl'}ph();try{new MutationObserver(ph).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}catch(_){}
var en=function(){return document.documentElement.lang==='en'};
f.addEventListener('submit',function(e){e.preventDefault();var em=f.cn_email.value.trim();
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(em)){n.className='cnl-n mal';n.textContent=en()?'Check your email address.':'Revisa tu correo: falta algo.';f.cn_email.focus();return}
b.disabled=true;n.className='cnl-n';n.textContent=en()?'Sending…':'Enviando…';
fetch('/suscribir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,web:f.cn_web.value,origen:'portada'})})
.then(function(r){return r.json()}).then(function(j){n.className='cnl-n '+(j.ok?'ok':'mal');n.textContent=(en()&&j.en)||j.mensaje||'';if(j.ok){f.cn_email.value='';try{window.cnEv&&cnEv('suscripcion_correo')}catch(_){}}})
.catch(function(){n.className='cnl-n mal';n.textContent=en()?'No connection. Try again.':'Sin conexión. Intenta de nuevo.'}).finally(function(){b.disabled=false})})})()</script>`;

async function lectTabla(env) { await env.DB.prepare(LECTORES_TABLA).run(); }
function lectToken() { const a = new Uint8Array(24); crypto.getRandomValues(a); return [...a].map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function suscribirLector(req, env, ctx) {
  const R = (ok, mensaje, en, s = 200) => jsonR({ ok, mensaje, en }, s);
  if (!env.DB) return R(false, "La suscripción no está disponible en este momento.", "Subscription is not available right now.", 503);
  let d = {};
  try { d = req.headers.get("Content-Type")?.includes("json") ? await req.json() : Object.fromEntries(await req.formData()); } catch { d = {}; }
  if (d.web || d.cn_web) return R(true, "Listo. Revisa tu correo para confirmar.", "Done. Check your inbox to confirm.");   // trampa para robots
  const email = String(d.email || d.cn_email || "").trim().toLowerCase();
  if (!lectEmailOk(email)) return R(false, "Revisa tu correo: falta algo.", "Check your email address.", 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x";
  if (!(await bajoLimite(env, "lect:" + ip)) || !(await bajoLimite(env, "lect:" + email))) return R(false, "Demasiados intentos. Prueba en un minuto.", "Too many attempts. Try again in a minute.", 429);
  await lectTabla(env);
  const ya = await env.DB.prepare("SELECT token, confirmado, enviado FROM lectores WHERE email=?").bind(email).first();
  // la misma respuesta para todos: nadie puede averiguar aquí si un correo ajeno está suscrito
  if (ya && ya.confirmado) return R(true, "¡Listo! Si el correo no estaba confirmado, te llega un mensaje para confirmar.", "Done! If the address wasn't confirmed yet, you'll get a message to confirm.");
  if (ya && ya.enviado && Date.now() - Date.parse(ya.enviado) < 600000) return R(true, "Ya te enviamos el correo de confirmación. Revisa también Spam o Promociones.", "We already sent the confirmation email. Check Spam or Promotions too.");
  const token = (ya && ya.token) || lectToken(), ahora = new Date().toISOString();
  // tope diario de correos de confirmación: Resend gratis da 100 al día y el Buzón también los usa
  const hoy0 = new Date(Date.now() - 86400000).toISOString();
  const n24 = await env.DB.prepare("SELECT COUNT(*) n FROM lectores WHERE enviado > ?").bind(hoy0).first();
  if (n24 && n24.n >= 60) return R(false, "Hoy llegamos al tope de inscripciones. Intenta mañana, por favor.", "We reached today's sign-up limit. Please try tomorrow.", 429);
  await env.DB.prepare("INSERT INTO lectores (email, token, creado, origen) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING").bind(email, token, ahora, String(d.origen || "portada").slice(0, 20)).run();
  if (!hayCorreo(env)) return R(false, "No pudimos enviar el correo de confirmación. Intenta más tarde.", "We couldn't send the confirmation email. Try later.", 503);
  const enlace = `https://${DOMINIO}/suscribir/confirmar?t=${token}`;
  const ok = await enviarCorreo(env, { to: email, subject: "Confirma tu suscripción a Cofrade News",
    text: `Hola:\n\nPara recibir Cofrade News cada mañana a las 7:00 (lo que mueve la aguja y el audio de la edición), abre este enlace y toca «Validar mi correo»:\n${enlace}\n\nSi no fuiste tú, ignora este correo y no recibirás nada.\n\nCofrade News · www.cofrad.es`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1A1406"><h2 style="margin:0 0 12px">Confirma tu suscripción</h2><p>Para recibir <b>Cofrade News</b> cada mañana a las 7:00, con lo que mueve la aguja y el audio de la edición, toca el botón y luego «Validar mi correo»:</p><p><a href="${enlace}" style="display:inline-block;background:#C9A14A;color:#1A1406;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:600">Validar mi correo</a></p><p style="color:#666;font-size:13px">Si no fuiste tú, ignora este correo y no recibirás nada.</p></div>` }).catch(() => false);
  if (!ok) return R(false, "No pudimos enviar el correo de confirmación. Intenta más tarde.", "We couldn't send the confirmation email. Try later.", 503);
  await env.DB.prepare("UPDATE lectores SET enviado=? WHERE email=?").bind(ahora, email).run();
  if (env.KIT_API_KEY && ctx && ctx.waitUntil) ctx.waitUntil(kitSincronizar(env).catch(() => 0));   // sube a Kit a los confirmados que quedaron pendientes
  return R(true, "¡Listo! Te enviamos un correo para confirmar. Revisa también Spam o Promociones.", "Done! We sent you an email to confirm. Check Spam or Promotions too.");
}

async function kitPedir(env, metodo, ruta, cuerpo) {
  const r = await fetch("https://api.kit.com/v4" + ruta, { method: metodo, headers: { "X-Kit-Api-Key": env.KIT_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Kit ${ruta} HTTP ${r.status}`);
  return r.status === 204 ? {} : r.json();
}
async function kitEtiqueta(env) {
  const g = await leerConfig(env, "kit_etiqueta");
  if (g) return g;
  const t = ((await kitPedir(env, "GET", "/tags?per_page=1000")).tags || []).find((x) => x.name === LECT_ETIQUETA)
    || (await kitPedir(env, "POST", "/tags", { name: LECT_ETIQUETA })).tag;
  if (!t || !t.id) throw new Error("Kit sin etiqueta");
  await ponerConfig(env, "kit_etiqueta", String(t.id));
  return String(t.id);
}
// Sube a Kit los confirmados que faltan (hasta 20 por vez). Sin KIT_API_KEY no hace nada: quedan «pendiente» en D1.
async function kitSincronizar(env, primero) {
  if (!env.KIT_API_KEY || !env.DB) return 0;
  const filas = (await env.DB.prepare("SELECT email FROM lectores WHERE confirmado IS NOT NULL AND (kit IS NULL OR kit <> 'ok') ORDER BY (email = ?) DESC, confirmado LIMIT 20").bind(primero || "").all()).results || [];
  if (!filas.length) return 0;
  const tag = await kitEtiqueta(env);
  let n = 0;
  for (const { email } of filas) {
    try {
      await kitPedir(env, "POST", "/subscribers", { email_address: email, state: "active" });
      await kitPedir(env, "POST", `/tags/${tag}/subscribers`, { email_address: email });
      await env.DB.prepare("UPDATE lectores SET kit='ok' WHERE email=?").bind(email).run(); n++;
    } catch (e) { await env.DB.prepare("UPDATE lectores SET kit=? WHERE email=?").bind(("falla: " + String(e.message || e)).slice(0, 120), email).run(); }
  }
  return n;
}

// 27-11-2026 (Germán: «Verificado» = el lector abrió el correo y tocó «Validar»). Los antivirus de correo (Outlook, Gmail
// corporativo, Mimecast) abren solos los enlaces para revisarlos; si el GET confirmara, esos robots marcarían como verificado un
// correo que nadie abrió. Por eso el enlace solo muestra el botón, y lo que verifica es el POST que manda una persona al tocarlo.
async function confirmarLector(req, env, ctx) {
  const post = req.method === "POST";
  let t = new URL(req.url).searchParams.get("t") || "";
  if (post) { try { t = String((await req.formData()).get("t") || ""); } catch { t = ""; } }
  const pag = (titulo, texto, extra) => html(marco({ titulo: titulo + " · Cofrade News", descripcion: titulo, canonica: "/suscribir/confirmar",
    cuerpo: `<section style="border:0"><span class="kicker">Suscripción</span><h1>${lectEsc(titulo)}</h1><p class="lede">${texto}</p><div class="acciones">${extra || '<a class="btn oro" href="/edicion">Leer la edición de hoy</a>'}</div></section>` }), 200,
    { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" });
  if (!/^[0-9a-f]{48}$/.test(t) || !env.DB) return pag("El enlace no es válido", "Vuelve a la portada y deja tu correo otra vez.");
  await lectTabla(env);
  const f = await env.DB.prepare("SELECT email, confirmado FROM lectores WHERE token=?").bind(t).first();
  if (!f) return pag("El enlace no es válido", "Vuelve a la portada y deja tu correo otra vez.");
  if (!post && !f.confirmado) return pag("Valida tu correo", "Un último paso: toca el botón para confirmar que este correo es tuyo y empezar a recibir Cofrade News cada mañana a las 7:00.",
    `<form method="post" action="/suscribir/confirmar" style="margin:0"><input type="hidden" name="t" value="${t}"><button class="btn oro" type="submit">Validar mi correo</button></form>`);
  if (!f.confirmado) await env.DB.prepare("UPDATE lectores SET confirmado=?, kit=COALESCE(kit,'pendiente') WHERE email=? AND confirmado IS NULL").bind(new Date().toISOString(), f.email).run();
  const tarea = kitSincronizar(env, f.email).catch(() => 0);
  if (ctx && ctx.waitUntil) ctx.waitUntil(tarea); else await tarea;
  return pag(f.confirmado ? "Tu correo ya está verificado" : "¡Correo verificado!", "Desde mañana te llega Cofrade News a las 7:00: lo que mueve la aguja y el audio de la edición. Cada correo trae su enlace para darte de baja.");
}
// Para /panel: cuántos lectores hay y cuántos faltan por subir a Kit (sin mostrar correos)
async function resumenLectores(env) {
  try {
    await lectTabla(env);
    const r = await env.DB.prepare("SELECT COUNT(*) total, SUM(confirmado IS NOT NULL) confirmados, SUM(confirmado IS NOT NULL AND kit = 'ok') en_kit FROM lectores").first();
    return { total: r.total || 0, confirmados: r.confirmados || 0, en_kit: r.en_kit || 0, kit_llave: !!env.KIT_API_KEY };
  } catch { return null; }
}

// 27-11-2026 · Germán: «Al Dashboard del Panel de Control de Administración agrega el listado de emails que se han inscrito para recibir
// diariamente un resumen de las Noticias del día, más el audio de 2 a 3 minutos... De manera de saber quiénes y cuántas personas utilizan
// esta funcionalidad». Solo en /panel (con clave de administrador); los correos no salen de ahí salvo en la descarga CSV del mismo panel.
const LECT_HORA = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return String(iso).slice(0, 16); } };
function bloqueLectores(filas, hoy) {
  const F = filas || [], conf = F.filter((r) => r.confirmado), pend = F.length - conf.length, kit = conf.filter((r) => r.kit === "ok").length;
  const lim = new Date(Date.parse(hoy + "T12:00:00Z") - 7 * 86400000).toISOString().slice(0, 10), nuevos = conf.filter((r) => String(r.confirmado).slice(0, 10) >= lim).length;
  const k = (t, v, sub) => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b>${sub ? `<br><small>${esc(sub)}</small>` : ""}</div>`;
  const estado = (r) => r.confirmado ? '<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#1f7a4a1f;color:#1f7a4a;font-weight:700;white-space:nowrap">✓ Verificado</span>' : '<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#9a7b2e1f;color:#9a7b2e;font-weight:700;white-space:nowrap">Sin verificar</span>';
  const fila = (r) => `<tr><td>${esc(r.email)}</td><td>${estado(r)}</td><td style="white-space:nowrap">${esc(LECT_HORA(r.creado))}</td><td style="white-space:nowrap">${r.confirmado ? esc(LECT_HORA(r.confirmado)) : ""}</td><td>${esc(r.origen || "portada")}</td><td>${r.kit === "ok" ? "sí" : r.confirmado ? "pendiente" : ""}</td></tr>`;
  return `<section id="lectores"><h3 class="tit-g">Lectores del resumen diario por correo (5 titulares y audio de 2 a 3 minutos)</h3>
<p class="sub">Personas que se inscribieron en la casilla de la portada. «Verificado» significa que la persona abrió el correo que le enviamos y tocó el botón «Validar mi correo»: solo esos correos son reales y solo ellos reciben el resumen de las 7:00; las bajas se registran en Kit (cada correo trae su enlace para darse de baja). Datos personales: no compartir fuera del panel (Ley 21.719).</p>
<div class="cifras">${k("Verificados", conf.length, "tocaron «Validar»: correos reales que reciben el resumen")}${k("Sin verificar", pend, "no han tocado «Validar» (no reciben nada)")}${k("Nuevos en 7 días", nuevos, "verificados desde el " + lim.split("-").reverse().join("-"))}${k("Sincronizados con Kit", kit + " de " + conf.length, "")}</div>
${F.length ? `<div class="tarjeta ancha"><div class="tabla-scroll" style="max-height:420px;overflow:auto"><table class="tabla"><thead><tr><th>Correo</th><th>Estado</th><th>Inscrito</th><th>Verificado el</th><th>Origen</th><th>En Kit</th></tr></thead><tbody>${F.map(fila).join("")}</tbody></table></div></div>
<p style="margin:12px 0 0"><a class="btn linea" href="/panel/lectores.csv">Descargar la lista (Excel / CSV)</a></p>` : `<p class="sub">Todavía no hay inscritos.</p>`}</section>`;
}
async function lectoresCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  await lectTabla(env);
  const filas = (await env.DB.prepare("SELECT email, creado, confirmado, origen, kit FROM lectores ORDER BY creado DESC").all()).results || [];
  const c = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = "\ufeffcorreo;estado;inscrito;verificado_el;origen;en_kit\n" + filas.map((r) => [r.email, r.confirmado ? "Verificado" : "Sin verificar", LECT_HORA(r.creado), r.confirmado ? LECT_HORA(r.confirmado) : "", r.origen || "portada", r.kit === "ok" ? "sí" : ""].map(c).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lectores-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...SEGURIDAD } });
}
