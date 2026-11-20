// =====================================================================================================================
// 13-11-2026 · BUZÓN de sugerencias, MEDICIÓN propia y PANEL DE CONTROL de www.cofrad.es
// Germán: «cambia "En vivo" por "Buzón": ventana emergente con selección múltiple, área libre, nombre, apellido y email,
// captcha y verificación del email, para evitar spam, bots y haters; y que se puedan modelar los datos y sacar métricas».
// Datos en Cloudflare D1 (binding DB, base cofrade-socios). Captcha: Cloudflare Turnstile (secreto TURNSTILE_SECRET).
// Correo: agradecimiento personalizado + confirmación desde hola@cofrad.es (15-11-2026), con Resend (RESEND_API_KEY) o el binding EMAIL.
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
function script(){if(pedido)return;pedido=true;window.__tsListo=function(){if(paso===3)dibujar()};
if(document.querySelector('script[src*="/turnstile/v0/api.js"]')){var n0=0,i0=setInterval(function(){if(window.turnstile||++n0>75){clearInterval(i0);if(window.turnstile&&paso===3)dibujar()}},200);return}var s=document.createElement('script');
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
    // 15-11-2026 (Germán): «debes automatizar una respuesta automática, respondiéndole de manera personalizada (saludándolo por su
    // Nombre) y agradeciéndole "sus sugerencias y comentarios", porque "nos permite ofrecerle a nuestros lectores un sitio más completo,
    // y con contenidos de lectura más relevantes y de gran interés"». Un solo correo desde hola@cofrad.es: el agradecimiento y, abajo,
    // el botón para confirmar (la verificación del 13-11 sigue: frena a quien escribe con un email ajeno).
    try {
      const enviado = await enviarCorreo(env, { to: email, ...correoGracias({ nombre, gusta, agregar, enlace: `https://${DOMINIO}/buzon/verificar?t=${token}` }) });
      if (enviado) mensaje = "Te enviamos un correo desde hola@cofrad.es: ábrelo y toca «Confirmar mi sugerencia». Si no lo ves, revisa la carpeta de spam o de promociones.";
    } catch { /* si el correo falla, la sugerencia queda guardada como no confirmada */ }
  }
  return jsonR({ ok: true, mensaje });
}
// Correo de confirmación: usa Cloudflare Email Service si está activo (binding EMAIL, requiere plan pagado de Workers);
// si no, Resend (gratis hasta 100 correos al día) con el secreto RESEND_API_KEY. Sin ninguno, la sugerencia queda «sin confirmar».
const hayCorreo = (env) => !!((env.EMAIL && typeof env.EMAIL.send === "function") || env.RESEND_API_KEY);
const CORREO_HOLA = "hola@cofrad.es";   // 15-11-2026 (Germán): las respuestas salen de hola@cofrad.es y las respuestas del lector llegan ahí
async function enviarCorreo(env, { to, subject, text, html: cuerpo, bcc }) {   // bcc: copia oculta (16-11-2026: avisos a anunciantes)
  const de = env.CORREO_REMITENTE || CORREO_HOLA;
  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    await env.EMAIL.send({ from: { email: de, name: "Cofrade News" }, to, replyTo: CORREO_HOLA, subject, text, html: cuerpo, ...(bcc ? { bcc } : {}) });
    return true;
  }
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Cofrade News <${de}>`, to: [to], reply_to: CORREO_HOLA, subject, text, html: cuerpo, ...(bcc ? { bcc: [bcc] } : {}) }) });
    return r.ok;
  }
  return false;
}
// «Crecimiento de Chile, Deportes y Los gráficos» (máximo 4 y «N más»); los valores vienen de las listas fijas del Buzón, no del lector
function enumerar(lista) {
  const v = lista.slice(0, 4), resto = lista.length - v.length;
  if (resto > 0) return `${v.join(", ")} y ${resto} más`;
  return v.length > 1 ? `${v.slice(0, -1).join(", ")} y ${v[v.length - 1]}` : (v[0] || "");
}
function correoGracias({ nombre, gusta, agregar, enlace }) {
  const subject = `¡Gracias por tus sugerencias, ${nombre}!`;
  const extra = [gusta.length ? `Nos alegra saber que disfrutas ${enumerar(gusta)}.` : "", agregar.length ? `Y tomamos nota de lo que te gustaría que agreguemos: ${enumerar(agregar)}.` : ""].filter(Boolean);
  const text = `Hola ${nombre}:\n\nMuchas gracias por tus sugerencias y comentarios, porque nos permiten ofrecerles a nuestros lectores un sitio más completo, y con contenidos de lectura más relevantes y de gran interés.\n\n`
    + (extra.length ? extra.join(" ") + "\n\n" : "")
    + `Para que tu mensaje quede registrado, confírmalo con un clic:\n${enlace}\n(El enlace vence en 7 días. Si no fuiste tú, ignora este correo.)\n\n`
    + `Si quieres contarnos algo más, responde este correo: llega directo a nuestro equipo.\n\nUn cordial saludo,\nEquipo Cofrade News\nwww.cofrad.es · ${CORREO_HOLA}`;
  const p = (t) => `<p style="margin:0 0 14px">${t}</p>`;
  const html = `<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#0B1F3A;max-width:560px;margin:0 auto;padding:8px 4px">`
    + `<p style="margin:0 0 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9A7B2F">Cofrade News · Buzón</p>`
    + p(`Hola ${esc(nombre)}:`)
    + p("Muchas gracias por tus <b>sugerencias y comentarios</b>, porque nos permiten ofrecerles a nuestros lectores un sitio más completo, y con contenidos de lectura más relevantes y de gran interés.")
    + extra.map((x) => p(esc(x))).join("")
    + p("Para que tu mensaje quede registrado, confírmalo con un clic:")
    + `<p style="margin:0 0 18px"><a href="${enlace}" style="display:inline-block;background:#C9A227;color:#0B1F3A;font:700 16px/1 Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:999px">Confirmar mi sugerencia</a></p>`
    + `<p style="margin:0 0 18px;font:13px/1.5 Arial,sans-serif;color:#5A6577">El enlace vence en 7 días. Si no fuiste tú, ignora este correo.</p>`
    + p("Si quieres contarnos algo más, responde este correo: llega directo a nuestro equipo.")
    + `<p style="margin:22px 0 0">Un cordial saludo,<br><b>Equipo Cofrade News</b><br><a href="https://${DOMINIO}/" style="color:#0B1F3A">www.cofrad.es</a> · <a href="mailto:${CORREO_HOLA}" style="color:#0B1F3A">${CORREO_HOLA}</a></p></div>`;
  return { subject, text, html };
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
// 15-11-2026 (Germán: «el Panel de Administración debe llevar un registro de un "Contador de Visitas" al Sitio Web (Landing Page) y al
// Newsletter "Cofrade News" (verificando el total de visitas diarias, y el total de visitas únicas que ingresan...)»). Cada apertura
// suma 1 en vistas (fecha, zona); el visitante único del día sigue en visitas (IP + navegador, guardados solo como huella anónima del
// día). Zonas: portada «/», diario «/edicion/…» y otras. Las dos escrituras van por separado: si una falla, la otra igual cuenta.
const zonaDe = (ruta) => (ruta === "/" ? "portada" : String(ruta).startsWith("/edicion/") ? "diario" : "otras");
async function registrarVisita(req, env, ruta) {
  const ua = req.headers.get("User-Agent") || "";
  if (!env.DB || !ua || BOT_UA.test(ua)) return;
  const fecha = fechaChile();
  // 16-11-2026: robots que se hacen pasar por navegadores desde redes de nubes (Amazon, Google, Microsoft y otras, ver ASN_NUBE): no son
  // lectores. No cuentan como visita ni como visitante; solo se suma cuántos se descartaron (zona «nube»), para que se vea.
  if (ASN_NUBE.has(Number(req.cf && req.cf.asn))) {
    await env.DB.prepare("INSERT INTO vistas (fecha, zona, n) VALUES (?, 'nube', 1) ON CONFLICT(fecha, zona) DO UPDATE SET n = n + 1").bind(fecha).run().catch(() => null);
    return;
  }
  await Promise.all([
    env.DB.prepare("INSERT OR IGNORE INTO visitas (fecha, ruta, visitante, pais) VALUES (?, ?, ?, ?)")
      .bind(fecha, ruta, await huellaVisitante(req, env, fecha), String((req.cf && req.cf.country) || "").slice(0, 2)).run().catch(() => null),
    env.DB.prepare("INSERT INTO vistas (fecha, zona, n) VALUES (?, ?, 1) ON CONFLICT(fecha, zona) DO UPDATE SET n = n + 1")
      .bind(fecha, zonaDe(ruta)).run().catch(() => null),
    registrarDimensiones(req, env, fecha, zonaDe(ruta)).catch(() => null),   // 16-11-2026: hora, origen y aparato (modulos/tablero.js)
  ]);
}
// Las 2 zonas del contador, día por día (fechas de Chile), desde «desde» hasta hoy, con los días sin visitas en cero. Parte el día en que
// empezó a contar las visitas (el primero que hay en vistas), para no mostrar ceros falsos en días en que el contador aún no existía; los
// visitantes únicos de esos días previos (la tabla visitas existe desde el 13-11-2026) vuelven aparte, en «previos».
async function contadorVisitas(env, desde) {
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results || []).catch(() => []);
  const [pri, vis, uni, tot] = await Promise.all([
    env.DB.prepare("SELECT MIN(fecha) AS f FROM vistas").first().catch(() => null),
    q("SELECT fecha, zona, n FROM vistas WHERE fecha >= ?", desde),
    q("SELECT fecha, CASE WHEN ruta = '/' THEN 'portada' WHEN ruta LIKE '/edicion/%' THEN 'diario' ELSE 'otras' END AS zona, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY fecha, zona", desde),
    q("SELECT fecha, COUNT(DISTINCT visitante) AS u FROM visitas WHERE fecha >= ? GROUP BY fecha ORDER BY fecha", desde),
  ]);
  const hoy = fechaChile(), inicio = (pri && pri.f) || hoy, desdeReal = inicio > desde ? inicio : desde;
  const dias = {}, dia = (f) => (dias[f] = dias[f] || { fecha: f, pv: 0, pu: 0, dv: 0, du: 0, su: 0 });
  vis.forEach((x) => { if (x.zona === "portada") dia(x.fecha).pv = x.n; else if (x.zona === "diario") dia(x.fecha).dv = x.n; });
  uni.forEach((x) => { if (x.zona === "portada") dia(x.fecha).pu = x.u; else if (x.zona === "diario") dia(x.fecha).du = x.u; });
  tot.forEach((x) => { dia(x.fecha).su = x.u; });
  const filas = [];
  for (let t = Date.parse(desdeReal + "T12:00:00Z"); ; t += 86400000) {
    const f = new Date(t).toISOString().slice(0, 10);
    if (f > hoy) break;
    filas.push(dias[f] || { fecha: f, pv: 0, pu: 0, dv: 0, du: 0, su: 0 });
  }
  return { filas, inicio, previos: tot.filter((x) => x.fecha < desdeReal && x.u > 0) };
}
const ddmm = (f) => `${f.slice(8, 10)}-${f.slice(5, 7)}-${f.slice(0, 4)}`;
const cuantos = (n, uno, varios) => num(n, 0) + " " + (n === 1 ? uno : varios);
// Columnas pareadas por día: visitas (borde y relleno suave) y visitantes únicos (sólido), con el color del tema (claro y oscuro) y una
// escala a la izquierda. Con 7 días o menos, cada columna lleva su número encima (en el teléfono no hay «pasar el mouse»).
function dobles(serie, titulo, color) {   // serie: [[fecha, visitas, únicos]]
  if (!serie.some((x) => x[1] || x[2])) return `<p class="aviso">Aún no hay visitas registradas.</p>`;
  const w = 420, h = 210, izq = 36, abajo = 24, arriba = 18, alto = h - abajo - arriba, n = serie.length;
  const max = Math.max(...serie.map((x) => Math.max(x[1], x[2])), 1), paso = (w - izq - 6) / n, bw = Math.max(2, Math.min(22, Math.floor(paso / 2) - 2));
  const cada = Math.ceil(n / 7), conNumeros = n <= 7, y = (v) => h - abajo - Math.round(v / max * alto);
  const visita = `fill="${color}" fill-opacity=".3" stroke="${color}" stroke-width="1"`, unico = `fill="${color}"`;
  const cols = serie.map(([f, v, u], i) => {
    const x0 = izq + i * paso + (paso - (2 * bw + 2)) / 2, xu = x0 + bw + 2, yv = v ? Math.min(y(v), h - abajo - 2) : h - abajo, yu = u ? Math.min(y(u), h - abajo - 2) : h - abajo;
    return (v ? `<rect x="${x0.toFixed(1)}" y="${yv}" width="${bw}" height="${h - abajo - yv}" rx="2" ${visita}><title>${ddmm(f)}: ${cuantos(v, "visita", "visitas")}</title></rect>` : "")
      + (u ? `<rect x="${xu.toFixed(1)}" y="${yu}" width="${bw}" height="${h - abajo - yu}" rx="2" ${unico}><title>${ddmm(f)}: ${cuantos(u, "visitante único", "visitantes únicos")}</title></rect>` : "")
      + (conNumeros ? `<text x="${(x0 + bw / 2).toFixed(1)}" y="${yv - 4}" font-size="11" text-anchor="middle" fill="var(--gris)">${num(v, 0)}</text><text x="${(xu + bw / 2).toFixed(1)}" y="${yu - 4}" font-size="11" text-anchor="middle" fill="var(--gris)">${num(u, 0)}</text>` : "")
      + (i % cada === 0 ? `<text x="${(x0 + bw + 1).toFixed(1)}" y="${h - 7}" font-size="12" text-anchor="middle" fill="var(--gris)">${f.slice(8, 10)}-${f.slice(5, 7)}</text>` : "");
  }).join("");
  const escala = `<line x1="${izq}" x2="${w - 4}" y1="${h - abajo}" y2="${h - abajo}" stroke="var(--linea)"/>`
    + (conNumeros ? "" : `<line x1="${izq}" x2="${w - 4}" y1="${y(max)}" y2="${y(max)}" stroke="var(--linea)" stroke-dasharray="3 4"/><text x="${izq - 6}" y="${y(max) + 4}" font-size="11" text-anchor="end" fill="var(--gris)">${num(max, 0)}</text>`)
    + `<text x="${izq - 6}" y="${h - abajo + 4}" font-size="11" text-anchor="end" fill="var(--gris)">0</text>`;
  const muestra = (attrs) => `<svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" style="vertical-align:-1px"><rect x=".5" y=".5" width="10" height="10" rx="2" ${attrs}/></svg>`;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(titulo)}">${escala}${cols}</svg>`
    + `<p class="sub" style="margin:6px 0 0">${muestra(visita)} visitas &nbsp; ${muestra(unico)} visitantes únicos</p>`;
}
function seccionVisitas({ filas, inicio, previos }) {
  const hoy = filas[filas.length - 1] || { pv: 0, pu: 0, dv: 0, du: 0, su: 0 };
  const suma = (k) => filas.reduce((a, x) => a + x[k], 0), treinta = filas.length >= 30;
  const kpi = (t, v, s) => `<div class="cifra"><small>${esc(t)}</small><b>${v}</b><br><small>${esc(s)}</small></div>`;
  const filasT = filas.slice().reverse().map((x) => `<tr><td>${ddmm(x.fecha)}</td><td>${num(x.pv, 0)}</td><td>${num(x.pu, 0)}</td><td>${num(x.dv, 0)}</td><td>${num(x.du, 0)}</td><td>${num(x.su, 0)}</td></tr>`).join("");
  const antes = previos.length ? `<p class="sub" style="margin:10px 0 0">Antes del ${ddmm(inicio)} el panel solo registraba visitantes únicos (${previos.map((x) => `${ddmm(x.fecha)}: ${num(x.u, 0)}`).join(" · ")}).</p>` : "";
  return `<section id="contador"><h3>Contador de visitas</h3>
<p class="sub">Una <b>visita</b> es cada vez que alguien abre la página: si la abre 3 veces, son 3 visitas. Un <b>visitante único</b> es una persona por día,
reconocida por su conexión (IP) y su navegador, para no juntar a quienes comparten la misma red (como pasa en las redes de celular). La IP no se guarda:
queda solo una huella anónima que cambia cada día. Robots, buscadores y vistas previas no cuentan, y desde el 16-11-2026 tampoco las visitas desde redes de nubes (robots que se hacen pasar por navegadores). Las visitas se cuentan desde el ${ddmm(inicio)}.</p>
<div class="cifras c4">${kpi("Portada hoy", cuantos(hoy.pv, "visita", "visitas"), cuantos(hoy.pu, "visitante único", "visitantes únicos"))}${kpi("Diario hoy", cuantos(hoy.dv, "visita", "visitas"), cuantos(hoy.du, "visitante único", "visitantes únicos"))}
${kpi("Todo el sitio hoy", cuantos(hoy.su, "visitante único", "visitantes únicos"), "todas las páginas, cada persona una vez")}${kpi(treinta ? "Últimos 30 días" : "Desde el " + ddmm(filas[0] ? filas[0].fecha : inicio), cuantos(suma("pv") + suma("dv"), "visita", "visitas"), "a la portada y al diario")}</div>
<div class="dos d2"><div class="tarjeta"><h4 class="kicker">Portada (Landing Page)</h4>${dobles(filas.map((x) => [x.fecha, x.pv, x.pu]), "Portada: visitas y visitantes únicos por día", "var(--tinta)")}</div>
<div class="tarjeta"><h4 class="kicker">Diario Cofrade News</h4>${dobles(filas.map((x) => [x.fecha, x.dv, x.du]), "Diario: visitas y visitantes únicos por día", "var(--oro)")}</div></div>
<div class="tarjeta" style="margin-top:14px;padding:12px"><div style="overflow-x:auto"><table class="tabla-vis"><thead><tr><th rowspan="2">Día</th><th colspan="2">Portada</th><th colspan="2">Diario</th><th rowspan="2">Únicos en<br>todo el sitio</th></tr>
<tr><th>Visitas</th><th>Únicos</th><th>Visitas</th><th>Únicos</th></tr></thead><tbody>${filasT}</tbody></table></div>${antes}</div>
<p style="margin:14px 0 0"><a class="btn linea" href="/panel/visitas.csv">Descargar el contador completo (Excel / CSV)</a></p></section>`;
}
async function panelVisitasCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const { filas } = await contadorVisitas(env, "2000-01-01");   // todo el contador, desde su primer día
  const csv = "\ufefffecha;portada_visitas;portada_unicos;diario_visitas;diario_unicos;sitio_unicos\n"
    + filas.map((x) => [ddmm(x.fecha), x.pv, x.pu, x.dv, x.du, x.su].join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cofrade-visitas-${fechaChile()}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
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
const NOMBRE_SECCION = { economia: "Economía", politica: "Política y Congreso", emprendimiento: "Emprendimiento", tecnologia: "Tecnología", conflictos: "Conflictos",
  efemerides: "Efemérides", naval: "Historia naval", onomastico: "Santoral", indicadores: "Indicadores", clima: "Clima", mar: "Mar y mareas", sismos: "Sismos", vuelos: "Vuelos",
  feriados: "Feriados", inmobiliario: "Inmobiliario", industrias: "Industrias", entretenimiento: "Entretenimiento", biografia: "Biografía", ciencia: "Ciencia",
  astronomia: "Astronomía", deportes: "Deportes", horoscopo: "Horóscopo" };
// 16-11-2026: panel() pasó a modulos/tablero.js (tablero con filtros, ayudas, gráficos y publicidad pagada).
async function panelCsv(req, env) {
  if (!(await esAdmin(req, env)) || !env.DB) return new Response("no autorizado", { status: 401 });
  const filas = (await env.DB.prepare("SELECT fecha, nombre, apellido, email, verificado, gusta, agregar, frecuencia, nps, texto, estado, pais FROM buzon ORDER BY id").all()).results || [];
  const c = (x) => { let s = String(x === null || x === undefined ? "" : x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // sin fórmulas inyectadas
  const lista = (j) => { try { return JSON.parse(j || "[]").join(" | "); } catch { return ""; } };
  const csv = "﻿fecha;nombre;apellido;email;email_confirmado;le_gusta;quiere_agregar;frecuencia;nps;mensaje;estado;pais\n"
    + filas.map((r) => [r.fecha, r.nombre, r.apellido, r.email, r.verificado ? "sí" : "no", lista(r.gusta), lista(r.agregar), r.frecuencia, r.nps, r.texto, r.estado, r.pais].map(c).join(";")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="buzon-cofrade-news-${fechaChile()}.csv"`, "Cache-Control": "no-store", ...SEGURIDAD } });
}
