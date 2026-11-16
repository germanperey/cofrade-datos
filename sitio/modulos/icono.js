// ═══ 16-11-2026 · El ícono de Cofrade News (acceso directo en teléfonos y computadores) ═══════════════════════════════════
// Germán: «Al igual como lo hicimos en la App de "Caddie Golf" también en nuestro Landing page www.cofrad.es tenemos que tener la
// opción que los lectores descarguen un icono de "Acceso directo" en sus dispositivos móviles y Ordenadores». Decidió (16-11, 12:26):
// «Deberá abrir la nueva edición del Newsletter, y en caso que no tenga señal a Internet abrirá la última edición leída». El Panel
// cuenta instalaciones y aperturas.
// Piezas: ficha de instalación (/manifest.webmanifest), lectura sin señal (/sw.js, red primero), tarjeta «Instalar» con
// instrucciones por sistema en la portada, aviso de instalaciones y aperturas (/instalacion) y textos en inglés.

const MANIFEST = JSON.stringify({
  id: "/",
  name: "Cofrade News",
  short_name: "Cofrade News",
  description: "El diario de la mañana de la Cofradía: economía, política y Congreso, conflictos, ciencia, deportes, clima y vuelos, con la fuente de cada dato.",
  lang: "es-CL",
  dir: "ltr",
  start_url: "/edicion",   // la edición más nueva (antes de las 9:00, la de ayer); sin señal, la última leída (ver SW_JS)
  scope: "/",
  display: "standalone",
  background_color: "#0B1F3A",
  theme_color: "#0B1F3A",
  categories: ["news"],
  icons: [
    { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [   // «?inicio=portada»: abre la portada sin que el ícono la mande a la edición (ver INSTALAR_HTML)
    { name: "Portada", short_name: "Portada", url: "/?inicio=portada", icons: [{ src: "/icono-192.png", sizes: "192x192", type: "image/png" }] },
    { name: "Mercados en vivo", short_name: "Mercados", url: "/mercados", icons: [{ src: "/icono-192.png", sizes: "192x192", type: "image/png" }] },
  ],
});

// Lectura sin señal. Red primero: con señal SIEMPRE se trae lo nuevo; sin señal (o si el sitio no responde) se muestra la copia
// guardada con un aviso arriba. Solo atiende la portada y las ediciones: el panel, los clics de avisos (/ir/), los pagos, el Buzón,
// Mercados y las imágenes pasan directo, sin tocarse. Guarda la portada y las 3 últimas ediciones leídas en ese aparato (por hora
// de lectura, no por fecha: leer una edición vieja del Archivo no la borra). Sin señal, «/edicion» abre la última leída.
// Para apagarlo en todos los aparatos: publicar un /sw.js que solo haga self.registration.unregister() (ver el documento del sitio).
const SW_JS = String.raw`// Cofrade News · lectura sin señal (16-11-2026)
var CACHE = "cofrade-lectura-v1", MAX_EDICIONES = 3, ED = /^\/edicion\/(\d{4}-\d{2}-\d{2})$/;
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("cofrade-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname !== "/" && u.pathname !== "/edicion" && !ED.test(u.pathname)) return;
  e.respondWith(fetch(r).then(function (resp) {
    if (resp.status >= 500) return sinRed(u).then(function (x) { return x.status === 200 ? x : resp; });
    if (resp.status === 200 && resp.type === "basic" && u.pathname !== "/edicion" && /text\/html/i.test(resp.headers.get("Content-Type") || ""))
      e.waitUntil(guardar(u, resp.clone()));
    return resp;
  }, function () { return sinRed(u); }));
});
function clave(u) { return u.origin + u.pathname; }
function guardar(u, resp) {
  return resp.blob().then(function (b) {
    var h = new Headers(resp.headers); h.set("X-Cn-Guardado", String(Date.now())); h.delete("Content-Length");
    return caches.open(CACHE).then(function (c) {
      return c.put(clave(u), new Response(b, { status: 200, headers: h })).then(function () { return podar(c); });
    });
  }).catch(function () {});
}
function ediciones(c) {   // las ediciones guardadas, la última leída primero (X-Cn-Guardado = cuándo se leyó con señal)
  return c.keys().then(function (ks) {
    return Promise.all(ks.map(function (q) {
      var m = new URL(q.url).pathname.match(ED);
      return m ? c.match(q).then(function (r) { return { q: q, f: m[1], t: Number((r && r.headers.get("X-Cn-Guardado")) || 0) }; }) : null;
    }));
  }).then(function (l) { return l.filter(Boolean).sort(function (a, b) { return b.t - a.t; }); });
}
function podar(c) {
  return ediciones(c).then(function (l) { return Promise.all(l.slice(MAX_EDICIONES).map(function (x) { return c.delete(x.q); })); });
}
// Idioma: español por defecto; cambia a inglés si el lector eligió inglés en el sitio o en la edición (localStorage «cofrade-idioma»,
// la misma llave que usan el botón EN/ES de la portada y el de la edición). El cambio lo hace un script de 1 línea en la página.
var A_INGLES = '<script>try{if(localStorage.getItem("cofrade-idioma")==="en"){document.documentElement.lang="en";[].forEach.call(document.querySelectorAll("[data-cn-en]"),function(x){x.textContent=x.getAttribute("data-cn-en")})}}catch(e){}</' + 'script>';
function attr(t) { return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function sinRed(u) {
  return caches.open(CACHE).then(function (c) {
    var copia = u.pathname === "/edicion" ? ediciones(c).then(function (l) { return l.length ? c.match(l[0].q) : null; }) : c.match(clave(u));
    return copia.then(function (x) { return x ? conAviso(x) : paginaSinSenal(c); });
  }).catch(function () { return paginaSinSenal(null); });
}
function conAviso(copia) {
  var t = Number(copia.headers.get("X-Cn-Guardado") || 0), es = "", en = "";
  if (t) {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    es = " el " + p.day + "-" + p.month + " a las " + p.hour + ":" + p.minute; en = " on " + p.day + "/" + p.month + " at " + p.hour + ":" + p.minute;
  }
  var txtEs = "Sin conexión con Cofrade News: estás leyendo la copia guardada" + es + ".", txtEn = "No connection to Cofrade News: you are reading the copy saved" + en + ".";
  var aviso = '<div id="cn-sin-senal" role="status" data-cn-en="' + attr(txtEn) + '" style="position:sticky;top:0;z-index:2147483647;background:#B8892B;color:#1A1406;font:600 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 14px;text-align:center">' + txtEs + "</div>" + A_INGLES;
  return copia.text().then(function (html) {
    var h = new Headers(copia.headers); h.delete("Content-Length");
    var out = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, function (m) { return m + aviso; }) : aviso + html;
    return new Response(out, { status: 200, headers: h });
  });
}
function paginaSinSenal(c) {
  return (c ? ediciones(c) : Promise.resolve([])).then(function (l) {
    var enlaces = l.slice().sort(function (a, b) { return a.f < b.f ? 1 : -1; }).map(function (x) { var f = x.f.split("-"); return '<a href="/edicion/' + x.f + '" style="display:inline-block;margin:6px;padding:10px 18px;border:1.5px solid #B8892B;border-radius:999px;color:#F5F0E6;text-decoration:none">' + f[2] + "-" + f[1] + "-" + f[0] + "</a>"; }).join("");
    var html = '<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0B1F3A"><title>Cofrade News</title></head>'
      + '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B1F3A;color:#F5F0E6;font:17px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px;box-sizing:border-box">'
      + '<main style="max-width:440px"><p style="font:600 28px/1.2 Georgia,serif;color:#E7C77A;margin:0 0 8px">Cofrade News</p><h1 style="font-size:22px;margin:0 0 10px" data-cn-en="No connection">Sin conexión</h1>'
      + '<p data-cn-en="There is no signal and this page was not saved on this device.">No hay señal y esta página no quedó guardada en este aparato.</p>'
      + (enlaces ? '<p data-cn-en="Editions saved to read offline:">Ediciones guardadas para leer sin señal:</p><p>' + enlaces + "</p>" : "")
      + '<p><button type="button" onclick="location.reload()" data-cn-en="Try again" style="min-height:48px;padding:0 26px;border:0;border-radius:999px;background:#B8892B;color:#1A1406;font:700 16px system-ui,sans-serif;cursor:pointer">Reintentar</button></p></main>' + A_INGLES + "</body></html>";
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  });
}
`;

// Etiquetas del <head> (todas las páginas y las ediciones): ficha de instalación, nombre bajo el ícono en iPhone y el ícono 180 px.
const ICONO_HEAD = '<link rel="manifest" href="/manifest.webmanifest"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Cofrade News"><link rel="apple-touch-icon" href="/icono-180.png">';

// En todas las páginas y ediciones: si el lector entró por el ícono, avisa «instalada» la primera vez en ese aparato (iPhone, iPad y
// Mac no avisan al instalar) y «apertura» una vez por sesión. En Android y computadores, «instalada» sale al instalar (appinstalled).
const ICONO_JS = `<script>(function(){try{var w=window,n=navigator;
function app(){try{return !!(w.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: minimal-ui)').matches))||n.standalone===true}catch(e){return false}}
function avisar(ev){try{if(!(n.sendBeacon&&n.sendBeacon('/instalacion',new Blob([ev],{type:'text/plain'}))))fetch('/instalacion',{method:'POST',body:ev,keepalive:true}).catch(function(){})}catch(e){}}
function marcar(s,k){try{var x=s.getItem(k);s.setItem(k,'1');return x}catch(e){return '1'}}
w.addEventListener('appinstalled',function(){if(!marcar(localStorage,'cn-icono'))avisar('instalada')});
if(app()){if(!marcar(localStorage,'cn-icono'))avisar('instalada');if(!marcar(sessionStorage,'cn-apertura'))avisar('apertura')}
}catch(e){}})();</script>`;

const ICONO_CSS = `.icono-cinta{display:flex;align-items:center;gap:18px;margin:28px 0 6px;padding:18px 20px;border-radius:18px;background:linear-gradient(135deg,#0B1F3A,#16325A);color:#F5F0E6;box-shadow:0 18px 40px -24px rgba(11,31,58,.8)}
.icono-cinta[hidden]{display:none}.icono-cinta h2{font:600 27px/1.12 var(--display);margin:0 0 6px;color:#FFFDF8;letter-spacing:-.2px}
.icono-sub{margin:0;font-size:15.5px;line-height:1.5;color:#D8D2C4}.icono-ok{margin:6px 0 0;font-weight:600;color:#E7C77A}.icono-ok[hidden],.icono-cinta .btn[hidden]{display:none}
.icono-img{flex:none;border-radius:16px;box-shadow:0 6px 16px -8px rgba(0,0,0,.6)}.icono-txt{flex:1 1 auto;min-width:0}.icono-cinta .btn{flex:none}
@media (max-width:640px){.icono-cinta{flex-wrap:wrap;gap:14px}.icono-cinta .btn{width:100%;justify-content:center}.icono-img{width:52px;height:52px}}
.dlg-icono ol{margin:4px 0 6px;padding-left:22px}.dlg-icono li{margin:7px 0;line-height:1.5}.dlg-icono [data-pf][hidden]{display:none}.dlg-icono .sub{font-size:15px}`;

// Tarjeta de la portada. Se dibuja visible y un script inmediato la ajusta ANTES de pintar (sin saltos de diseño): dentro del ícono
// se esconde; si ya se instaló en este navegador, muestra «Ya tienes Cofrade News instalada» en vez del botón.
// Si el ícono abre la portada como primera página de la sesión (un iPhone antiguo que no respete start_url), la manda a la edición.
// Dentro de la misma sesión, o con «?inicio=portada» (acceso rápido «Portada»), la portada se queda.
const INSTALAR_HTML = `<section class="icono-cinta" id="instalar" aria-labelledby="t-instalar" style="border:0">
<img class="icono-img" src="/icono-192.png" alt="" width="64" height="64">
<div class="icono-txt"><h2 id="t-instalar">Cofrade News en tu pantalla de inicio</h2>
<p class="icono-sub">Queda como un ícono en tu teléfono o computador: un toque y abres la edición del día, a pantalla completa. Sin señal, abre la última que leíste.</p>
<p class="icono-ok" id="instalar-ok" hidden>Ya tienes Cofrade News instalada. Búscala en tu pantalla de inicio.</p>
<p class="icono-ok" id="instalar-listo" hidden>¡Listo! Busca el ícono de Cofrade News en tu pantalla de inicio.</p></div>
<button type="button" class="btn oro" id="instalar-b">Instalar Cofrade News</button></section>
<script>(function(){try{var c=document.getElementById('instalar'),w=window,n=navigator;
if((w.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: minimal-ui)').matches))||n.standalone===true){c.hidden=true;
try{if(location.pathname==='/'&&!location.search&&!sessionStorage.getItem('cn-apertura'))location.replace('/edicion')}catch(e){}return}
var ya=null;try{ya=localStorage.getItem('cn-icono')}catch(e){}
if(ya){document.getElementById('instalar-b').hidden=true;document.getElementById('instalar-ok').hidden=false}}catch(e){}})();</script>`;

// Instrucciones por sistema (iPhone y iPad no tienen botón automático; Safari en Mac usa «Agregar al Dock»; Firefox solo instala en
// Windows y a medias). Se dibujan en el HTML para que el botón EN/ES las traduzca; el script solo muestra la que corresponde.
const INSTALAR_DLG = `<dialog class="dlg-pub dlg-icono" id="instalar-guia" aria-labelledby="t-guia"><div class="pub-form">
<button type="button" class="pub-cerrar" aria-label="Cerrar">✕</button><h3 id="t-guia">Cómo instalar Cofrade News</h3>
<div data-pf="ios" hidden><ol><li>Toca el botón Compartir: el cuadrado con una flecha hacia arriba. En iOS 26 está dentro del botón «···», al lado de la dirección.</li>
<li>Desliza hacia abajo y elige «Agregar a pantalla de inicio».</li><li>Deja encendida la opción «Abrir como app web», si aparece, y toca «Agregar».</li></ol>
<p class="sub">En el iPad, Compartir está arriba a la derecha. También funciona desde Chrome o Edge del iPhone, con su botón Compartir.</p></div>
<div data-pf="mac" hidden><ol><li>En la barra de menú de Safari, abre «Archivo».</li><li>Elige «Agregar al Dock» y confirma con «Agregar».</li></ol>
<p class="sub">Cofrade News queda en el Dock y abre en su propia ventana.</p></div>
<div data-pf="android" hidden><ol><li>Toca el menú ⋮ del navegador (en Chrome está arriba a la derecha).</li><li>Elige «Instalar app» o «Agregar a la pantalla principal».</li><li>Confirma con «Instalar».</li></ol></div>
<div data-pf="pc" hidden><ol><li>En Chrome o Edge, busca el ícono de instalar al final de la barra de direcciones: una pantalla con una flecha.</li>
<li>Si no aparece, abre el menú ⋮ o ··· del navegador y busca «Instalar Cofrade News».</li><li>Confirma con «Instalar»: queda en tu escritorio y en el menú de inicio.</li></ol></div>
<div data-pf="firefox" hidden><p class="sub">Firefox todavía no instala sitios como app en todos los computadores. Tienes dos caminos:</p>
<ol><li>Abre www.cofrad.es en Chrome o Edge y toca «Instalar Cofrade News».</li><li>O arrastra el candado que está a la izquierda de la dirección hasta tu escritorio: queda un acceso directo.</li></ol></div>
<div data-pf="app" hidden><p class="sub">Abriste Cofrade News dentro de otra app (por ejemplo Instagram, Facebook o LinkedIn), y ahí no se puede instalar.</p>
<ol><li>Toca el menú ··· o ⋮ y elige «Abrir en el navegador» (Safari o Chrome).</li><li>Ya en el navegador, toca «Instalar Cofrade News».</li></ol></div>
<button type="button" class="pub-enviar" id="instalar-entendido">Entendido</button></div></dialog>`;

// Botón «Instalar»: en Chrome, Edge y Samsung Internet abre la instalación del propio navegador (beforeinstallprompt, que exige el
// service worker); en los demás, la guía. También registra el service worker de lectura sin señal.
const INSTALAR_JS = `<script>(function(){var d=document,w=window,n=navigator,c=d.getElementById('instalar');if(!c)return;
var b=d.getElementById('instalar-b'),ok=d.getElementById('instalar-ok'),listo=d.getElementById('instalar-listo'),g=d.getElementById('instalar-guia'),evt=null;
if('serviceWorker' in n){var reg=function(){n.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(function(){})};if(d.readyState==='complete')reg();else w.addEventListener('load',reg)}
w.addEventListener('beforeinstallprompt',function(e){e.preventDefault();evt=e;if(!c.hidden){b.hidden=false;ok.hidden=true}});
w.addEventListener('appinstalled',function(){evt=null;b.hidden=true;ok.hidden=true;listo.hidden=false});
function sistema(){var u=n.userAgent||'';if(/FBAN|FBAV|Instagram|LinkedInApp/.test(u))return 'app';if(/iPhone|iPad|iPod/.test(u)||(n.platform==='MacIntel'&&n.maxTouchPoints>1))return 'ios';
if(/Android/.test(u))return 'android';if(/Firefox\\//.test(u))return 'firefox';if(/Macintosh/.test(u)&&/Safari\\//.test(u)&&!/Chrome|Chromium|Edg\\//.test(u))return 'mac';return 'pc'}
function cerrar(){if(g.close)g.close();else g.removeAttribute('open')}
function guia(){var s=sistema();[].forEach.call(g.querySelectorAll('[data-pf]'),function(x){x.hidden=x.getAttribute('data-pf')!==s});g.setAttribute('data-sistema',s);if(g.showModal)g.showModal();else g.setAttribute('open','')}
b.addEventListener('click',function(){if(evt){var e=evt;evt=null;try{e.prompt();e.userChoice.then(function(r){if(r&&r.outcome==='accepted'){b.hidden=true;listo.hidden=false}}).catch(function(){})}catch(x){guia()}return}guia()});
g.querySelector('.pub-cerrar').addEventListener('click',cerrar);d.getElementById('instalar-entendido').addEventListener('click',cerrar);g.addEventListener('click',function(e){if(e.target===g)cerrar()});
})();</script>`;

const EN_ICONO = {
  "Cofrade News en tu pantalla de inicio": "Cofrade News on your home screen",
  "Queda como un ícono en tu teléfono o computador: un toque y abres la edición del día, a pantalla completa. Sin señal, abre la última que leíste.":
    "It sits as an icon on your phone or computer: one tap opens the day's edition, full screen. With no signal, it opens the last one you read.",
  "Ya tienes Cofrade News instalada. Búscala en tu pantalla de inicio.": "You already have Cofrade News installed. Look for it on your home screen.",
  "¡Listo! Busca el ícono de Cofrade News en tu pantalla de inicio.": "Done! Look for the Cofrade News icon on your home screen.",
  "Instalar Cofrade News": "Install Cofrade News", "Cómo instalar Cofrade News": "How to install Cofrade News", "Entendido": "Got it",
  "Toca el botón Compartir: el cuadrado con una flecha hacia arriba. En iOS 26 está dentro del botón «···», al lado de la dirección.":
    "Tap the Share button: the square with an arrow pointing up. On iOS 26 it is inside the «···» button, next to the address.",
  "Desliza hacia abajo y elige «Agregar a pantalla de inicio».": "Scroll down and choose «Add to Home Screen».",
  "Deja encendida la opción «Abrir como app web», si aparece, y toca «Agregar».": "Leave «Open as Web App» switched on, if it appears, and tap «Add».",
  "En el iPad, Compartir está arriba a la derecha. También funciona desde Chrome o Edge del iPhone, con su botón Compartir.":
    "On iPad, Share is at the top right. It also works from Chrome or Edge on iPhone, with their Share button.",
  "En la barra de menú de Safari, abre «Archivo».": "In Safari's menu bar, open «File».",
  "Elige «Agregar al Dock» y confirma con «Agregar».": "Choose «Add to Dock» and confirm with «Add».",
  "Cofrade News queda en el Dock y abre en su propia ventana.": "Cofrade News stays in the Dock and opens in its own window.",
  "Toca el menú ⋮ del navegador (en Chrome está arriba a la derecha).": "Tap the browser's ⋮ menu (in Chrome it is at the top right).",
  "Elige «Instalar app» o «Agregar a la pantalla principal».": "Choose «Install app» or «Add to Home screen».",
  "Confirma con «Instalar».": "Confirm with «Install».",
  "En Chrome o Edge, busca el ícono de instalar al final de la barra de direcciones: una pantalla con una flecha.":
    "In Chrome or Edge, look for the install icon at the end of the address bar: a screen with an arrow.",
  "Si no aparece, abre el menú ⋮ o ··· del navegador y busca «Instalar Cofrade News».": "If it is not there, open the browser's ⋮ or ··· menu and look for «Install Cofrade News».",
  "Confirma con «Instalar»: queda en tu escritorio y en el menú de inicio.": "Confirm with «Install»: it stays on your desktop and in the start menu.",
  "Firefox todavía no instala sitios como app en todos los computadores. Tienes dos caminos:": "Firefox cannot yet install sites as apps on every computer. You have two options:",
  "Abre www.cofrad.es en Chrome o Edge y toca «Instalar Cofrade News».": "Open www.cofrad.es in Chrome or Edge and tap «Install Cofrade News».",
  "O arrastra el candado que está a la izquierda de la dirección hasta tu escritorio: queda un acceso directo.":
    "Or drag the padlock to the left of the address onto your desktop: it becomes a shortcut.",
  "Abriste Cofrade News dentro de otra app (por ejemplo Instagram, Facebook o LinkedIn), y ahí no se puede instalar.":
    "You opened Cofrade News inside another app (for example Instagram, Facebook or LinkedIn), and it cannot be installed there.",
  "Toca el menú ··· o ⋮ y elige «Abrir en el navegador» (Safari o Chrome).": "Tap the ··· or ⋮ menu and choose «Open in browser» (Safari or Chrome).",
  "Ya en el navegador, toca «Instalar Cofrade News».": "Once in the browser, tap «Install Cofrade News».",
};
Object.assign(EN_FIJO, EN_ICONO);

// Aviso de instalación o apertura (POST /instalacion, lo manda ICONO_JS con sendBeacon). Cuenta por día, evento y tipo de aparato;
// sin datos personales. No cuentan robots, redes de nubes, pedidos de otro sitio ni ráfagas (mismo freno que los clics).
const EVENTOS_ICONO = new Set(["instalada", "apertura"]);
async function registrarIcono(req, env) {
  const listo = new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...SEGURIDAD } });
  if (req.method !== "POST") return new Response("", { status: 405, headers: { Allow: "POST", ...SEGURIDAD } });
  try {
    const origen = req.headers.get("Origin") || "";
    const mismo = origen ? /^https:\/\/(www\.)?cofrad\.es$/.test(origen) || origen === new URL(req.url).origin : req.headers.get("Sec-Fetch-Site") === "same-origin";
    if (!mismo || !env.DB) return listo;
    const ua = req.headers.get("User-Agent") || "";
    if (!ua || BOT_UA.test(ua) || ASN_NUBE.has(Number(req.cf && req.cf.asn))) return listo;
    const ev = String((await leerCuerpo(req, 64)) || "").trim();
    if (!EVENTOS_ICONO.has(ev)) return listo;
    const fecha = fechaChile(), quien = await huellaVisitante(req, env, fecha);
    if (!(await bajoLimite(env, "i:" + quien))) return listo;
    await env.DB.prepare("INSERT INTO instalaciones (fecha, evento, aparato, n) VALUES (?, ?, ?, 1) ON CONFLICT(fecha, evento, aparato) DO UPDATE SET n = n + 1")
      .bind(fecha, ev, dispositivoVisita(req)).run();
  } catch { /* medir nunca rompe nada */ }
  return listo;
}
