// =====================================================================================================================
// 13-11-2026 · BUZÓN de sugerencias, MEDICIÓN propia y PANEL DE CONTROL de www.cofrad.es
// Germán: «cambia "En vivo" por "Buzón": ventana emergente con selección múltiple, área libre, nombre, apellido y email,
// captcha y verificación del email, para evitar spam, bots y haters; y que se puedan modelar los datos y sacar métricas».
// Datos en Cloudflare D1 (binding DB, base cofrade-socios). Captcha: Cloudflare Turnstile (secreto TURNSTILE_SECRET).
// Correo de verificación: binding EMAIL de Cloudflare Email Service (se activa cuando cofrad.es quede habilitado para enviar).
// Panel: /panel, con la clave PANEL_CLAVE (secreto que crea Germán en Cloudflare). Sin esa clave, el panel no abre.
// =====================================================================================================================
const TURNSTILE_SITEKEY = "0x4AAAAAAGAKCkb75CKKeT2q";   // clave pública del widget (va en el HTML; la secreta vive solo en Cloudflare)
const GUSTA = ["Crecimiento de Chile", "Economía y mercados", "Política y Congreso", "Conflictos en el mundo", "Perspectivas 2050", "Ciencia y Astronomía",
  "Deportes", "Clima, mar y sismos", "Vuelos comerciales", "Entretenimiento", "Fondos y subsidios", "Efemérides", "Los gráficos", "Las fuentes verificadas",
  "La versión en inglés", "Descargar en PDF", "Mercados en vivo", "El diseño"];
const AGREGAR = ["Alertas por WhatsApp", "Versión en audio (podcast)", "Envío por correo cada mañana", "App para el celular", "Más noticias de regiones",
  "Análisis de inversiones", "Más deportes", "Agenda de eventos de la Cofradía", "Clasificados entre socios", "Encuestas a los lectores",
  "Más noticias internacionales", "Tecnología e inteligencia artificial", "Salud y bienestar", "Cultura y panoramas", "Historia naval"];
const FRECUENCIA = ["Todos los días", "Varias veces por semana", "Una vez por semana", "Es mi primera vez"];
const DESECHABLES = /(^|\.)(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable|maildrop|throwawaymail|fakeinbox|mohmal|emailondeck|mintemail|spamgourmet|mailnesia|tempail|burnermail|moakt|minuteinbox|tempr|discard|mail\.tm)\./i;
const LISTA_DESECHABLES = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";   // lista pública CC0
const GROSERO = /\b(conchetumadre|ctm|culiao|culiado|maric[oó]n|hijo de puta|hdp|puta madre|imb[eé]cil|idiota|est[uú]pido|pendejo|retrasado|mierda)\b/i;
const NOMBRE_OK = /^\p{L}[\p{L}' .-]{1,39}$/u;
const NOMBRE_FALSO = /^(asdf\w*|qwer\w*|zxcv\w*|test|tester|prueba|nombre|apellido|admin|usuario|anonimo|anónimo|xx+|nn)$/i;

const chips = (nombre, lista, tipo = "checkbox") => lista.map((x) => `<label class="chip"><input type="${tipo}" name="${nombre}" value="${esc(x)}"><span>${esc(x)}</span></label>`).join("");
const BUZON = `<dialog class="dlg-pub dlg-buzon" id="dlgBuzon" aria-labelledby="dlgBuzonT"><form class="pub-form" novalidate>
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button>
<span class="kicker">Buzón de sugerencias</span><h3 id="dlgBuzonT">Ayúdanos a hacer el mejor diario de Chile</h3>
<div class="pasos" aria-hidden="true"><i></i><i></i><i></i></div><p class="sub paso-n" style="margin:0" aria-live="polite">Paso 1 de 3</p>
<div class="paso" data-paso="1"><fieldset><legend>¿Qué es lo que más te gusta?</legend><p class="ayuda">Marca todas las que quieras.</p><div class="chips">${chips("gusta", GUSTA)}</div></fieldset></div>
<div class="paso" data-paso="2" hidden><fieldset><legend>¿Qué te gustaría que agreguemos?</legend><p class="ayuda">Marca todas las que quieras.</p><div class="chips">${chips("agregar", AGREGAR)}</div></fieldset>
<fieldset><legend>¿Con qué frecuencia lees Cofrade News?</legend><div class="chips">${chips("frecuencia", FRECUENCIA, "radio")}</div></fieldset>
<fieldset><legend>Del 0 al 10, ¿qué tan probable es que recomiendes Cofrade News a un amigo?</legend><div class="nps">${Array.from({ length: 11 }, (_, i) => `<label><input type="radio" name="nps" value="${i}"><span>${i}</span></label>`).join("")}</div>
<div class="nps-ej"><span>Nada probable</span><span>Muy probable</span></div></fieldset></div>
<div class="paso" data-paso="3" hidden><label>Escribe lo que quieras<textarea name="texto" maxlength="2000" rows="4" placeholder="Una idea, una crítica, una felicitación…"></textarea></label>
<div class="dos-campos"><label>Nombre *<input name="nombre" required maxlength="40" autocomplete="given-name"></label><label>Apellido *<input name="apellido" required maxlength="40" autocomplete="family-name"></label></div>
<label>Email *<input name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"><span class="ayuda">Te enviaremos un correo para confirmar que eres tú. Nunca publicamos tu email.</span></label>
<label class="pub-hp" aria-hidden="true">Página web<input name="pagina_web" tabindex="-1" autocomplete="off"></label>
<label class="pub-ok"><input type="checkbox" name="acepto" value="si" required> Acepto que Cofrade News use estos datos solo para mejorar el diario y responder mi sugerencia. No se publican ni se venden (Ley 19.628).</label>
<div id="tsBuzon" class="ts"></div></div>
<div class="buzon-ok" hidden><p class="sello-ok" aria-hidden="true">✓</p><h3>¡Gracias por escribirnos!</h3><p class="buzon-msg"></p><button type="button" class="pub-enviar buzon-fin">Cerrar</button></div>
<div class="buzon-nav"><button type="button" class="btn linea buzon-atras" hidden>Atrás</button><button type="button" class="pub-enviar buzon-sig">Siguiente</button><button type="submit" class="pub-enviar buzon-enviar" hidden>Enviar al Buzón</button></div>
<p class="pub-estado" role="status" aria-live="polite"></p></form></dialog>`;

const BUZON_JS = `
(function(){var d=document.getElementById('dlgBuzon');if(!d)return;var f=d.querySelector('form'),st=d.querySelector('.pub-estado'),tk='',wid=null,pedido=false,paso=1,
pasos=d.querySelectorAll('.paso'),barra=d.querySelectorAll('.pasos i'),pn=d.querySelector('.paso-n'),atras=d.querySelector('.buzon-atras'),sig=d.querySelector('.buzon-sig'),env=d.querySelector('.buzon-enviar'),
ok=d.querySelector('.buzon-ok'),nav=d.querySelector('.buzon-nav');
function en(){return document.documentElement.lang==='en'}
function script(){if(pedido)return;pedido=true;window.__tsListo=function(){if(paso===3)dibujar()};var s=document.createElement('script');
s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsListo&render=explicit';s.async=true;s.onerror=function(){st.textContent=en()?'The security check could not load. Check your connection or ad blocker.':'No cargó la verificación de seguridad. Revisa tu conexión o el bloqueador de anuncios.'};document.head.appendChild(s)}
function dibujar(){if(!window.turnstile)return;if(wid!==null){return}try{wid=turnstile.render('#tsBuzon',{sitekey:'${TURNSTILE_SITEKEY}',language:en()?'en':'es',theme:'auto',
callback:function(t){tk=t;if(st.textContent.indexOf('verificaci')>=0||st.textContent.indexOf('security')>=0)st.textContent=''},'expired-callback':function(){tk=''},'error-callback':function(){tk=''}})}catch(e){}}
function ir(n){paso=n;pasos.forEach(function(p){p.hidden=Number(p.getAttribute('data-paso'))!==n});barra.forEach(function(b,i){b.className=i<n?'si':''});
pn.textContent=(en()?'Step ':'Paso ')+n+(en()?' of 3':' de 3');atras.hidden=n===1;sig.hidden=n===3;env.hidden=n!==3;st.textContent='';
if(n===3){script();dibujar();setTimeout(function(){try{f.texto.focus()}catch(e){}},60)}try{f.scrollTop=0}catch(e){}}
function abrir(){st.textContent='';ok.hidden=true;nav.hidden=false;pn.hidden=false;d.querySelector('.pasos').hidden=false;ir(1);if(d.showModal)d.showModal();else d.setAttribute('open','');script()}
function cerrar(){if(d.close)d.close();else d.removeAttribute('open')}
document.querySelectorAll('.buzon-abrir').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();abrir()})});
if(location.hash==='#buzon')setTimeout(abrir,300);
d.querySelector('.pub-cerrar').addEventListener('click',cerrar);d.querySelector('.buzon-fin').addEventListener('click',cerrar);d.addEventListener('click',function(ev){if(ev.target===d)cerrar()});
sig.addEventListener('click',function(){ir(Math.min(3,paso+1))});atras.addEventListener('click',function(){ir(Math.max(1,paso-1))});
f.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&paso<3&&ev.target.tagName!=='TEXTAREA'){ev.preventDefault();ir(paso+1)}});
f.addEventListener('submit',function(ev){ev.preventDefault();if(paso!==3){ir(paso+1);return}if(f.pagina_web.value)return;
var nom=f.nombre.value.trim(),ape=f.apellido.value.trim(),em=f.email.value.trim();
if(nom.length<2||ape.length<2||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$/.test(em)){st.textContent=en()?'Please enter your first name, last name and a valid email.':'Escribe tu nombre, tu apellido y un email válido.';return}
if(!f.acepto.checked){st.textContent=en()?'Please accept the use of your data.':'Debes aceptar el uso de tus datos para enviar.';return}
if(!tk){st.textContent=en()?'Please complete the security check (the Cloudflare box).':'Completa la verificación de seguridad (el recuadro de Cloudflare).';script();dibujar();return}
var fd=new FormData(f);fd.append('cf-turnstile-response',tk);env.disabled=true;st.textContent=en()?'Sending…':'Enviando…';
fetch('/buzon',{method:'POST',body:new URLSearchParams(fd)}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){tk='';try{turnstile.reset(wid)}catch(e){}
if(j&&j.ok){f.reset();st.textContent='';pasos.forEach(function(p){p.hidden=true});nav.hidden=true;pn.hidden=true;d.querySelector('.pasos').hidden=true;
d.querySelector('.buzon-msg').textContent=j.mensaje||'';ok.hidden=false}else{st.textContent=(j&&j.error)||(en()?'It could not be sent. Please try again.':'No se pudo enviar. Intenta de nuevo.')}})
.catch(function(){st.textContent=en()?'It could not be sent (no internet?).':'No se pudo enviar (¿sin internet?).'}).finally(function(){env.disabled=false})})})();`;

async function sha256hex(t) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const sal = (env) => env.TURNSTILE_SECRET || env.SOCIOS_CLAVE || "cofrade-news";
// Huella anónima: IP + navegador + fecha + sal secreta, recortada. Cambia cada día y no permite saber quién es la persona.
async function huellaVisitante(req, env, fecha, conUA = true) {
  return (await sha256hex([fecha, req.headers.get("CF-Connecting-IP") || "", conUA ? req.headers.get("User-Agent") || "" : "", sal(env)].join("|"))).slice(0, 20);
}
async function dns(nombre, tipo) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nombre)}&type=${tipo}`, { headers: { Accept: "application/dns-json" } });
  return r.json();
}
// ¿El dominio recibe correo? NXDOMAIN o «MX nulo» = no. Sin MX pero con dirección IP = sí (regla del correo). Si el DNS falla, no se castiga al lector.
async function recibeCorreo(dominio) {
  try {
    const mx = await dns(dominio, "MX");
    if (mx.Status === 3) return false;
    const r = (mx.Answer || []).filter((a) => a.type === 15).map((a) => String(a.data || "").trim());
    if (r.length) return !r.every((x) => /^0\s+\.?$/.test(x));
    const a = await dns(dominio, "A");
    return (a.Answer || []).some((x) => x.type === 1);
  } catch { return true; }
}
let _desechables = null;
async function esDesechable(dominio, ctx) {
  if (DESECHABLES.test(dominio + ".")) return true;
  try {
    if (!_desechables) {
      const cache = caches.default, clave = new Request("https://cache.cofrad.es/desechables");
      let r = await cache.match(clave);
      if (!r) {
        const o = await fetch(LISTA_DESECHABLES, { cf: { cacheTtl: 86400, cacheEverything: true } });
        if (!o.ok) return false;
        r = new Response(await o.text(), { headers: { "Cache-Control": "public, max-age=86400" } });
        ctx.waitUntil(cache.put(clave, r.clone()));
      }
      _desechables = new Set((await r.text()).split("\n").map((x) => x.trim().toLowerCase()).filter((x) => x && !x.startsWith("#")));
    }
    const partes = dominio.toLowerCase().split(".");
    for (let i = 0; i < partes.length - 1; i++) if (_desechables.has(partes.slice(i).join("."))) return true;
  } catch { /* si la lista no carga, queda la lista corta de arriba */ }
  return false;
}
async function turnstileOk(token, req, env) {
  if (!env.TURNSTILE_SECRET || !token || token.length > 2048) return false;
  const fd = new FormData();
  fd.append("secret", env.TURNSTILE_SECRET); fd.append("response", token); fd.append("remoteip", req.headers.get("CF-Connecting-IP") || "");
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd });
    const j = await r.json();
    return j.success === true && /(^|\.)cofrad\.es$/.test(String(j.hostname || ""));
  } catch { return false; }
}
// Freno de ráfagas por conexión (binding LIMITE: 30 por minuto y por clave). Si el binding no está, no frena.
async function bajoLimite(env, clave) {
  if (!env.LIMITE || typeof env.LIMITE.limit !== "function") return true;
  try { return (await env.LIMITE.limit({ key: clave })).success; } catch { return true; }
}
// Lee el cuerpo con un tope de bytes aunque el cliente no declare Content-Length. Devuelve null si se pasa.
async function leerCuerpo(req, max) {
  if (Number(req.headers.get("Content-Length") || 0) > max) return null;
  if (!req.body) return "";
  const lector = req.body.getReader(), partes = [];
  let n = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { try { await lector.cancel(); } catch { /* nada */ } return null; }
    partes.push(value);
  }
  const todo = new Uint8Array(n);
  let o = 0;
  for (const x of partes) { todo.set(x, o); o += x.byteLength; }
  return new TextDecoder().decode(todo);
}
function jsonR(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SEGURIDAD } });
}
const ORIGEN_OK = (req) => { const o = req.headers.get("Origin") || ""; return !o || /^https:\/\/(www\.)?cofrad\.es$/.test(o); };

async function recibirBuzon(req, env, ctx) {
  if (!ORIGEN_OK(req)) return jsonR({ ok: false, error: "Origen no permitido." }, 403);
  if (!env.DB) return jsonR({ ok: false, error: "El Buzón se habilita en unos minutos." }, 503);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (!(await bajoLimite(env, "b:" + ip))) return jsonR({ ok: false, error: "Demasiados intentos seguidos. Espera un minuto y vuelve a enviar." }, 429);
  const cuerpo = await leerCuerpo(req, 20000);
  if (cuerpo === null) return jsonR({ ok: false, error: "El mensaje es demasiado largo." }, 413);
  const f = new URLSearchParams(cuerpo);
  const v = (k, n) => String(f.get(k) || "").trim().replace(/\s+/g, " ").slice(0, n);
  if (v("pagina_web", 100)) return jsonR({ ok: true, mensaje: "¡Gracias!" });   // trampa para robots: se finge éxito y no se guarda nada
  if (!(await turnstileOk(String(f.get("cf-turnstile-response") || ""), req, env))) return jsonR({ ok: false, error: "No pudimos confirmar que eres una persona. Vuelve a marcar el recuadro de seguridad." }, 400);
  const nombre = v("nombre", 40), apellido = v("apellido", 40), email = v("email", 120).toLowerCase();
  if (!NOMBRE_OK.test(nombre) || !NOMBRE_OK.test(apellido) || NOMBRE_FALSO.test(nombre) || NOMBRE_FALSO.test(apellido) || /(.)\1{3,}/i.test(nombre + " " + apellido))
    return jsonR({ ok: false, error: "Escribe tu nombre y tu apellido reales (solo letras)." }, 400);
  const m = email.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!m || !/\.[a-z]{2,}$/.test(m[1])) return jsonR({ ok: false, error: "Ese email no parece válido. Revisa que esté bien escrito." }, 400);
  if (await esDesechable(m[1], ctx)) return jsonR({ ok: false, error: "No aceptamos correos temporales o desechables. Usa tu email de siempre." }, 400);
  if (!(await recibeCorreo(m[1]))) return jsonR({ ok: false, error: "Ese dominio de correo no recibe emails. Revisa que esté bien escrito." }, 400);
  if (v("acepto", 4) !== "si") return jsonR({ ok: false, error: "Debes aceptar el uso de tus datos." }, 400);
  const gusta = [...new Set(f.getAll("gusta").map(String))].filter((x) => GUSTA.includes(x));
  const agregar = [...new Set(f.getAll("agregar").map(String))].filter((x) => AGREGAR.includes(x));
  const frecuencia = FRECUENCIA.includes(v("frecuencia", 40)) ? v("frecuencia", 40) : "";
  const npsT = v("nps", 2), nps = /^(10|[0-9])$/.test(npsT) ? Number(npsT) : null;
  const texto = String(f.get("texto") || "").replace(/\r\n?/g, "\n").trim().slice(0, 2000);
  if ((texto.match(/https?:\/\/|www\./gi) || []).length > 2) return jsonR({ ok: false, error: "Tu mensaje tiene demasiados enlaces." }, 400);
  if (!gusta.length && !agregar.length && !texto && nps === null) return jsonR({ ok: false, error: "Marca al menos una opción o escribe tu mensaje." }, 400);
  const [porIp, porEmail] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM buzon WHERE ip = ?").bind(ip).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM buzon WHERE email = ? AND fecha >= ?").bind(email, new Date(Date.now() - 86400000).toISOString()).first(),
  ]);
  if ((porIp && porIp.n >= 5) || (porEmail && porEmail.n >= 3)) return jsonR({ ok: false, error: "Ya recibimos varias sugerencias tuyas hoy. ¡Gracias! Vuelve a escribirnos mañana." }, 429);
  const token = (await sha256hex(crypto.randomUUID() + email + Date.now())).slice(0, 40);
  const estado = GROSERO.test(`${texto} ${nombre} ${apellido}`) ? "revisar" : "nuevo";
  await env.DB.prepare("INSERT INTO buzon (fecha, nombre, apellido, email, gusta, agregar, frecuencia, nps, texto, verificado, token, ip, pais, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)")
    .bind(new Date().toISOString(), nombre, apellido, email, JSON.stringify(gusta), JSON.stringify(agregar), frecuencia, nps, texto, token, ip,
      String((req.cf && req.cf.country) || "").slice(0, 2), estado).run();
  let mensaje = "Tu sugerencia quedó en el Buzón. La leeremos con atención.";
  if (hayCorreo(env)) {
    const enlace = `https://${DOMINIO}/buzon/verificar?t=${token}`;
    try {
      const enviado = await enviarCorreo(env, { to: email, subject: "Confirma tu sugerencia en Cofrade News",
        text: `Hola ${nombre}:\n\nGracias por escribirnos. Para confirmar que eres tú, abre este enlace y toca «Confirmar»:\n${enlace}\n\nEl enlace vence en 7 días. Si no fuiste tú, ignora este correo.\n\nCofrade News · www.cofrad.es`,
        html: `<div style="font:16px/1.55 Georgia,serif;color:#0B1F3A;max-width:520px"><p>Hola ${esc(nombre)}:</p><p>Gracias por escribirnos. Para confirmar que eres tú, toca el botón:</p><p><a href="${enlace}" style="display:inline-block;background:#B8892B;color:#1A1406;padding:12px 22px;border-radius:999px;text-decoration:none;font:600 15px Arial,sans-serif">Confirmar mi sugerencia</a></p><p style="color:#5B6472;font:13px Arial,sans-serif">El enlace vence en 7 días. Si no fuiste tú, ignora este correo.<br>Cofrade News · www.cofrad.es</p></div>` });
      if (enviado) mensaje = "Te enviamos un correo para confirmar que eres tú: ábrelo y toca «Confirmar mi sugerencia». Si no lo ves, revisa la carpeta de spam.";
    } catch { /* si el correo falla, la sugerencia queda guardada como no confirmada */ }
  }
  return jsonR({ ok: true, mensaje });
}
// Correo de confirmación: usa Cloudflare Email Service si está activo (binding EMAIL, requiere plan pagado de Workers);
// si no, Resend (gratis hasta 100 correos al día) con el secreto RESEND_API_KEY. Sin ninguno, la sugerencia queda «sin confirmar».
const hayCorreo = (env) => !!((env.EMAIL && typeof env.EMAIL.send === "function") || env.RESEND_API_KEY);
async function enviarCorreo(env, { to, subject, text, html: cuerpo }) {
  const de = env.CORREO_REMITENTE || "buzon@cofrad.es";
  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    await env.EMAIL.send({ from: { email: de, name: "Cofrade News" }, to, subject, text, html: cuerpo });
    return true;
  }
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Cofrade News <${de}>`, to: [to], subject, text, html: cuerpo }) });
    return r.ok;
  }
  return false;
}
// Confirmación en dos pasos (abrir el enlace muestra un botón; el botón confirma): así los antivirus del correo, que abren
// los enlaces solos, no confirman por la persona.
async function verificarBuzon(req, u, env) {
  const pagina = (cuerpo, s = 200) => html(marco({ titulo: "Buzón · Cofrade News", descripcion: "", cuerpo }), s, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const vencido = pagina(`<section style="border:0"><span class="kicker">Buzón</span><h1>Este enlace ya se usó o venció.</h1><p class="lede">Si quieres, vuelve a escribirnos desde el Buzón.</p><div class="acciones"><a class="btn oro" href="/#buzon">Abrir el Buzón</a></div></section>`, 410);
  if (req.method === "POST") {
    const cuerpo = await leerCuerpo(req, 2000);
    const t = String((cuerpo && new URLSearchParams(cuerpo).get("t")) || "");
    if (!env.DB || !/^[a-f0-9]{40}$/.test(t)) return vencido;
    const r = await env.DB.prepare("UPDATE buzon SET verificado = 1 WHERE token = ? AND verificado = 0 AND fecha >= ?").bind(t, new Date(Date.now() - 7 * 86400000).toISOString()).run();
    if (!(r && r.meta && r.meta.changes)) return vencido;
    return pagina(`<section style="border:0"><span class="kicker">Buzón</span><h1>¡Listo! Tu sugerencia quedó confirmada.</h1><p class="lede">Gracias por ayudarnos a mejorar Cofrade News.</p><div class="acciones"><a class="btn oro" href="/">Volver a la portada</a></div></section>`);
  }
  const t = String(u.searchParams.get("t") || "");
  if (!env.DB || !/^[a-f0-9]{40}$/.test(t)) return vencido;
  const fila = await env.DB.prepare("SELECT verificado, fecha FROM buzon WHERE token = ?").bind(t).first();
  if (!fila || fila.verificado || fila.fecha < new Date(Date.now() - 7 * 86400000).toISOString()) return vencido;
  return pagina(`<section style="border:0;max-width:640px"><span class="kicker">Buzón</span><h1>Confirma que eres tú</h1><p class="lede">Toca el botón para confirmar tu sugerencia.</p>
<form method="post" action="/buzon/verificar"><input type="hidden" name="t" value="${t}"><button type="submit" class="btn oro" style="margin-top:18px">Confirmar mi sugerencia</button></form></section>`);
}

// ---------- medición propia: lectores únicos por día (sin cookies) y tiempo de lectura por sección ----------
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|monitor|headless|lighthouse|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|scrapy|okhttp/i;
async function registrarVisita(req, env, ruta) {
  const ua = req.headers.get("User-Agent") || "";
  if (!env.DB || !ua || BOT_UA.test(ua)) return;
  const fecha = fechaChile();
  await env.DB.prepare("INSERT OR IGNORE INTO visitas (fecha, ruta, visitante, pais) VALUES (?, ?, ?, ?)")
    .bind(fecha, ruta, await huellaVisitante(req, env, fecha), String((req.cf && req.cf.country) || "").slice(0, 2)).run();
}
async function contarVisita(req, env, ruta) {
  try {
    if (req.method !== "GET") return;
    if (/prefetch|prerender/i.test((req.headers.get("Sec-Purpose") || "") + (req.headers.get("Purpose") || ""))) return;   // precargas: se cuentan al abrirse
    if (!(await bajoLimite(env, "v:" + (await huellaVisitante(req, env, fechaChile(), false))))) return;
    await registrarVisita(req, env, ruta);
  } catch { /* la medición nunca rompe la página */ }
}
async function recibirLectura(req, env, ctx) {
  const nada = new Response(null, { status: 204 });
  try {
    if (!env.DB || !ORIGEN_OK(req)) return nada;
    if (!(await bajoLimite(env, "m:" + (await huellaVisitante(req, env, fechaChile(), false))))) return nada;
    const t = await leerCuerpo(req, 4000);
    if (!t) return nada;
    const j = JSON.parse(t);
    const ruta = String(j.r || "").replace(/\/+$/, "").slice(0, 40), me = ruta.match(/^\/edicion\/(\d{4}-\d{2}-\d{2})$/);
    if (!me || !(await indice(ctx)).includes(me[1])) return nada;   // solo ediciones publicadas
    if (j.v === 1) await registrarVisita(req, env, ruta);   // página precargada que el lector sí abrió
    const fecha = fechaChile(), ops = [], vistas = new Set(Array.isArray(j.n) ? j.n.map(String) : []);
    for (const [sec, seg] of Object.entries(j.s || {}).slice(0, 40)) {
      const id = String(sec), s = Math.max(0, Math.min(1800, Math.round(Number(seg) || 0)));
      if (!Object.prototype.hasOwnProperty.call(NOMBRE_SECCION, id) || s < 1) continue;   // solo secciones reales de la edición
      ops.push(env.DB.prepare("INSERT INTO lectura (fecha, ruta, seccion, segundos, vistas) VALUES (?, ?, ?, ?, ?) ON CONFLICT(fecha, ruta, seccion) DO UPDATE SET segundos = segundos + excluded.segundos, vistas = vistas + excluded.vistas")
        .bind(fecha, ruta, id, s, vistas.has(sec) ? 1 : 0));
    }
    if (ops.length) await env.DB.batch(ops);
  } catch { /* nada */ }
  return nada;
}
// En la edición: mide cuántos segundos pasa cada sección en la franja central de la pantalla (sirve para secciones largas).
const MEDIR = `<script>(function(){try{var r=location.pathname;if(r.length>1&&r.charAt(r.length-1)==='/')r=r.slice(0,-1);function b(o){try{navigator.sendBeacon('/m',JSON.stringify(o))}catch(e){}}
if(document.prerendering)document.addEventListener('prerenderingchange',function(){b({r:r,v:1})},{once:true});
if(!('IntersectionObserver' in window)||!navigator.sendBeacon)return;var dentro={},t={},v={},acum={},vistos={};
function activo(){return !document.hidden&&!document.prerendering}function abre(id,n){if(activo()&&!v[id])v[id]=n}
function cierra(id,n){if(v[id]){t[id]=(t[id]||0)+(n-v[id])/1000;delete v[id]}}
var io=new IntersectionObserver(function(es){var n=Date.now();es.forEach(function(e){var id=e.target.id;if(!id)return;if(e.isIntersecting){dentro[id]=1;abre(id,n)}else{delete dentro[id];cierra(id,n)}})},{rootMargin:'-40% 0px -40% 0px',threshold:0});
document.querySelectorAll('section.sec[id]').forEach(function(s){io.observe(s)});
function enviar(){var n=Date.now(),s={},nv=[],h=false;for(var k in v)cierra(k,n);for(var k2 in t){var x=Math.round(t[k2]);if(x>=1){s[k2]=Math.min(1800,x);h=true;acum[k2]=(acum[k2]||0)+x;if(acum[k2]>=3&&!vistos[k2]){vistos[k2]=1;nv.push(k2)}}}t={};if(h)b({r:r,s:s,n:nv})}
function reabre(){var n=Date.now();for(var k in dentro)abre(k,n)}
document.addEventListener('visibilitychange',function(){if(document.hidden)enviar();else reabre()});document.addEventListener('prerenderingchange',reabre);addEventListener('pagehide',enviar)}catch(e){}})();<\/script>`;

// ---------- PANEL DE CONTROL (solo Germán): entra con la clave PANEL_CLAVE ----------
async function esAdmin(req, env) {
  if (!env.PANEL_CLAVE) return false;
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)cn_adm=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return iguales(m[2], await firma("adm|" + m[1], env.PANEL_CLAVE));
}
function paginaPanelLogin(error = "", status = 200, env = {}) {
  const sinClave = !env.PANEL_CLAVE;
  const cuerpo = `<section style="border:0;max-width:560px"><span class="kicker">Panel de Control</span><h1>Acceso de administración</h1>
${sinClave ? `<p class="lede">El panel se abre cuando exista la clave <b>PANEL_CLAVE</b> en Cloudflare (Workers → cofrade-news-web → Settings → Variables and Secrets).</p>`
    : `<form class="clave" method="post" action="/panel/entrar"><label for="pc" style="position:absolute;left:-9999px">Clave</label><input id="pc" name="clave" type="password" required placeholder="Clave de administración" autocomplete="current-password"><button type="submit">Entrar</button></form>`}
${error ? `<p class="aviso" role="alert" style="color:var(--rojo)">${esc(error)}</p>` : ""}</section>`;
  return html(marco({ titulo: "Panel · Cofrade News", descripcion: "", cuerpo }), status, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}
async function entrarPanel(req, env) {
  if (!env.PANEL_CLAVE) return paginaPanelLogin("", 200, env);
  const hoy = fechaChile(), ip = await huellaVisitante(req, env, hoy, false);
  if (env.DB) {
    const r = await env.DB.prepare("INSERT INTO intentos (ip, fecha, n) VALUES (?, ?, 1) ON CONFLICT(ip, fecha) DO UPDATE SET n = n + 1 RETURNING n").bind(ip, hoy).first().catch(() => null);
    if (r && r.n > 8) return paginaPanelLogin("Demasiados intentos hoy desde esta conexión. Prueba mañana.", 429, env);
  }
  const cuerpo = await leerCuerpo(req, 2000);
  const clave = String((cuerpo && new URLSearchParams(cuerpo).get("clave")) || "").slice(0, 200);
  await new Promise((r) => setTimeout(r, 500));   // frena los intentos a ciegas
  if (!iguales(await firma("c|" + clave, env.PANEL_CLAVE), await firma("c|" + env.PANEL_CLAVE, env.PANEL_CLAVE))) return paginaPanelLogin("Clave incorrecta.", 401, env);
  if (env.DB) await env.DB.prepare("DELETE FROM intentos WHERE ip = ? AND fecha = ?").bind(ip, hoy).run().catch(() => {});
  const vence = Date.now() + 7 * 86400000;
  return new Response(null, { status: 303, headers: { Location: "/panel", "Cache-Control": "no-store",
    "Set-Cookie": `cn_adm=${vence}.${await firma("adm|" + vence, env.PANEL_CLAVE)}; Max-Age=${7 * 86400}; Path=/panel; Secure; HttpOnly; SameSite=Strict` } });
}
function barras(filas, color = "#B8892B") {   // filas: [[etiqueta, valor, nota?]]
  if (!filas.length) return `<p class="aviso">Aún no hay datos.</p>`;
  const max = Math.max(...filas.map((x) => x[1]), 1);
  return `<div class="barras">${filas.map(([e, n, nota]) => `<div class="barra"><span class="be">${esc(e)}</span><span class="bb"><i style="width:${Math.max(2, n / max * 100).toFixed(1)}%;background:${color}"></i></span><b>${num(n, 0)}${nota ? ` <small>${esc(nota)}</small>` : ""}</b></div>`).join("")}</div>`;
}
function calor(filas) {   // [[sección, segundos, lecturas]]: mapa de calor de la atención por sección
  if (!filas.length) return `<p class="aviso">Aún no hay lecturas medidas: el contador parte con esta versión del sitio.</p>`;
  const max = Math.max(1, ...filas.map((x) => x[1]));
  const tiempo = (s) => (s < 60 ? `${num(s, 0)} s` : s < 36000 ? `${num(s / 60, s < 600 ? 1 : 0)} min` : `${num(s / 3600, 1)} h`);
  return `<div class="calor">${filas.map(([n, se, vi]) => `<div class="cel" style="--a:${(0.08 + 0.57 * se / max).toFixed(2)}"><b>${esc(n)}</b><span>${tiempo(se)} · ${num(vi, 0)} lecturas</span></div>`).join("")}</div>`;
}
function columnas(serie) {   // serie: [[fecha, únicos]]
  if (!serie.length) return `<p class="aviso">Aún no hay visitas registradas: el contador parte con esta versión del sitio.</p>`;
  const w = 720, h = 190, max = Math.max(...serie.map((x) => x[1]), 1), paso = Math.min(60, (w - 20) / serie.length), bw = Math.max(4, Math.min(44, Math.floor(paso) - 6));
  const cada = Math.ceil(serie.length / 10);
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" role="img" aria-label="Lectores únicos por día">${serie.map(([f, u], i) => {
    const hh = Math.max(2, Math.round(u / max * (h - 44))), x = 10 + i * paso;
    return `<rect x="${x.toFixed(1)}" y="${h - 22 - hh}" width="${bw}" height="${hh}" rx="3" fill="#B8892B"><title>${f}: ${u} lectores</title></rect>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 26 - hh}" font-size="10" text-anchor="middle" fill="currentColor">${u}</text>`
      + (i % cada === 0 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="#5B6472">${f.slice(8, 10)}-${f.slice(5, 7)}</text>` : "");
  }).join("")}</svg>`;
}
const NOMBRE_SECCION = { economia: "Economía", politica: "Política y Congreso", emprendimiento: "Emprendimiento", tecnologia: "Tecnología", conflictos: "Conflictos",
  efemerides: "Efemérides", naval: "Historia naval", onomastico: "Santoral", indicadores: "Indicadores", clima: "Clima", mar: "Mar y mareas", sismos: "Sismos", vuelos: "Vuelos",
  feriados: "Feriados", inmobiliario: "Inmobiliario", industrias: "Industrias", entretenimiento: "Entretenimiento", biografia: "Biografía", ciencia: "Ciencia",
  astronomia: "Astronomía", deportes: "Deportes", horoscopo: "Horóscopo" };
async function panel(req, env) {
  if (!(await esAdmin(req, env))) return paginaPanelLogin("", 200, env);
  if (!env.DB) return html(marco({ titulo: "Panel", descripcion: "", cuerpo: `<section style="border:0"><h1>Falta la base de datos.</h1></section>` }), 503);
  const hace30 = fechaChile(new Date(Date.now() - 30 * 86400000));
  const q = (s, ...b) => env.DB.prepare(s).bind(...b).all().then((r) => r.results || []).catch(() => []);
  const [dias, rutas, lect, paises, bz, bzTot, socios, pulsoR] = await Promise.all([
    q("SELECT fecha, COUNT(DISTINCT visitante) AS u, COUNT(*) AS v FROM visitas WHERE fecha >= ? GROUP BY fecha ORDER BY fecha", hace30),
    q("SELECT ruta, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY ruta ORDER BY u DESC LIMIT 15", hace30),
    q("SELECT seccion, SUM(segundos) AS s, SUM(vistas) AS v FROM lectura WHERE fecha >= ? GROUP BY seccion ORDER BY s DESC LIMIT 30", hace30),
    q("SELECT pais, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY pais ORDER BY u DESC LIMIT 10", hace30),
    q("SELECT * FROM buzon ORDER BY id DESC LIMIT 500"),
    q("SELECT COUNT(*) AS n, COALESCE(SUM(verificado), 0) AS ver FROM buzon"),
    q("SELECT estado, COUNT(*) AS n FROM usuarios GROUP BY estado"),
    q("SELECT valor FROM config WHERE clave = 'pulso_resultado'"),
  ]);
  // 14-11-2026: último pedido del sitio a GitHub para refrescar «En vivo» (204 = aceptado; 401/403 = la llave GITHUB_DISPATCH venció)
  let pul = null;
  try { pul = JSON.parse((pulsoR[0] || {}).valor || "null"); } catch { pul = null; }
  const pulTxt = !pul ? "Sin pedidos" : pul.estado === "204" ? "Pedido aceptado" : ["401", "403"].includes(pul.estado) ? "Llave rechazada" : "Falló (" + pul.estado + ")";
  const pulSub = !pul ? "Se activa con la clave GITHUB_DISPATCH" : ["401", "403"].includes(pul.estado) ? "Renovar GITHUB_DISPATCH · " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC"
    : "Último pedido " + String(pul.hora).slice(0, 16).replace("T", " ") + " UTC";
  const hoy = fechaChile(), dHoy = dias.find((x) => x.fecha === hoy) || { u: 0, v: 0 };
  const prom = dias.length ? Math.round(dias.reduce((a, x) => a + x.u, 0) / dias.length) : 0;
  const cuenta = (campo) => { const c = {}; bz.forEach((r) => { try { JSON.parse(r[campo] || "[]").forEach((x) => { c[x] = (c[x] || 0) + 1; }); } catch { /* nada */ } }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const frec = {}; bz.forEach((r) => { if (r.frecuencia) frec[r.frecuencia] = (frec[r.frecuencia] || 0) + 1; });
  const npsR = bz.filter((r) => typeof r.nps === "number");
  const nps = npsR.length ? Math.round((npsR.filter((r) => r.nps >= 9).length - npsR.filter((r) => r.nps <= 6).length) / npsR.length * 100) : null;
  const tot = bzTot[0] || { n: 0, ver: 0 };
  const kpi = (t, v, s = "") => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b>${s ? `<br><small>${esc(s)}</small>` : ""}</div>`;
  const cuerpo = `<section style="border:0;padding-top:30px"><span class="kicker">Panel de Control · solo administración</span><h1 class="titulo-lujo">Cómo va Cofrade News</h1>
<p class="sub">Contador propio, sin cookies ni datos personales: cada lector cuenta una vez por día con una huella anónima que cambia cada día. Últimos 30 días. <a href="/panel/salir">Salir del panel</a></p>
<div class="cifras">${kpi("Lectores hoy", num(dHoy.u, 0), num(dHoy.v, 0) + " páginas vistas")}${kpi("Promedio diario", num(prom, 0), "lectores únicos")}
${kpi("Sugerencias en el Buzón", num(tot.n, 0), num(tot.ver, 0) + " con email confirmado")}
${kpi("Recomendación (NPS)", nps === null ? "Sin respuestas" : (nps > 0 ? "+" : "") + nps, npsR.length + " respuestas")}
${kpi("Socios activos", num(socios.filter((x) => ["activo", "prueba"].includes(x.estado)).reduce((a, x) => a + x.n, 0), 0), "Dashboard Financiero")}
${kpi("«En vivo» al día", esc(pulTxt), pulSub)}</div></section>
<section><h3>Lectores por día</h3>${columnas(dias.map((x) => [x.fecha, x.u]))}</section>
<section><h3>Mapa de calor de lectura</h3><p class="sub">Tiempo que los lectores pasan en cada sección de la edición (sumado, últimos 30 días). Más dorado = más leído.</p>${calor(lect.map((x) => [NOMBRE_SECCION[x.seccion] || x.seccion, x.s, x.v]))}</section>
<section><div class="dos"><div class="tarjeta"><h4 class="kicker">Páginas más visitadas</h4>${barras(rutas.map((x) => [x.ruta === "/" ? "Portada" : x.ruta.replace("/edicion/", "Edición "), x.u]), "#23395B")}</div>
<div class="tarjeta"><h4 class="kicker">Países</h4>${barras(paises.map((x) => [x.pais || "Sin país", x.u]), "#23395B")}</div></div></section>
<section><h3>Buzón: lo que dicen los lectores</h3><div class="dos">
<div class="tarjeta"><h4 class="kicker">Lo que más les gusta</h4>${barras(cuenta("gusta"))}</div>
<div class="tarjeta"><h4 class="kicker">Lo que piden agregar</h4>${barras(cuenta("agregar"), "#1E7B4F")}</div>
<div class="tarjeta"><h4 class="kicker">Frecuencia de lectura</h4>${barras(Object.entries(frec).sort((a, b) => b[1] - a[1]), "#23395B")}
<p class="sub" style="margin-top:12px">NPS = % que responde 9 o 10, menos % que responde de 0 a 6. Sobre +30 es muy bueno; sobre +50, excelente.</p></div></div>
<p style="margin:16px 0"><a class="btn linea" href="/panel/buzon.csv">Descargar todas las sugerencias (Excel / CSV)</a></p>
<div class="tabla-buzon">${bz.slice(0, 60).map((r) => `<article class="tarjeta" style="margin:0 0 10px"><b>${esc(r.nombre)} ${esc(r.apellido)}</b> <span class="m">· ${esc(r.email)} · ${esc(String(r.fecha).slice(0, 16).replace("T", " "))} UTC · ${r.verificado ? "✓ email confirmado" : "email sin confirmar"}${r.estado === "revisar" ? " · ⚠ revisar lenguaje" : ""}${typeof r.nps === "number" ? " · NPS " + r.nps : ""}</span>
${r.texto ? `<p style="margin:6px 0 0;white-space:pre-wrap">${esc(r.texto)}</p>` : ""}</article>`).join("") || `<p class="aviso">Todavía no llegan sugerencias.</p>`}</div></section>`;
  return html(marco({ titulo: "Panel de Control · Cofrade News", descripcion: "", cuerpo }), 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
}
async function panelCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const filas = (await env.DB.prepare("SELECT fecha, nombre, apellido, email, verificado, gusta, agregar, frecuencia, nps, texto, estado, pais FROM buzon ORDER BY id").all()).results || [];
  const c = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas inyectadas
  const lista = (j) => { try { return JSON.parse(j || "[]").join(" | "); } catch { return ""; } };
  const csv = "﻿fecha;nombre;apellido;email;email_confirmado;le_gusta;quiere_agregar;frecuencia;nps;mensaje;estado;pais\n"
    + filas.map((r) => [r.fecha, r.nombre, r.apellido, r.email, r.verificado ? "sí" : "no", lista(r.gusta), lista(r.agregar), r.frecuencia, r.nps, r.texto, r.estado, r.pais].map(c).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="buzon-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", ...SEGURIDAD } });
}
