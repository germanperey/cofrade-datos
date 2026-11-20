// 20-11-2026 · Botón «Compartir» de la portada y de cada edición (Germán, 04:35: «agrega un icono de "compartir" para que nuestros
// lectores y usuarios compartan nuestro Newsletter con sus amistades y contactos»). Usa el menú del teléfono (navigator.share) cuando
// existe; si no, abre un panel con WhatsApp, Telegram, correo, LinkedIn, Facebook, X y «Copiar enlace» (con aviso visible).
// El enlace lleva el código personal del lector (?r=…, 8 letras y números) y utm_source=compartir. El código sale de un secreto que
// vive solo en este navegador (localStorage cn-ref-s): así nadie puede inscribir en el concurso el código de otra persona.
(function () {
  var R = document.documentElement, E = encodeURIComponent, A = 'abcdefghijklmnopqrstuvwxyz0123456789';
  // quien llegó por un enlace compartido no lo vuelve a compartir con el código de otro (y al recargar no se cuenta de nuevo)
  try {
    var q = new URL(location.href);
    if (q.searchParams.has('r')) {
      q.searchParams.delete('r'); if (q.searchParams.get('utm_source') === 'compartir') q.searchParams.delete('utm_source');
      history.replaceState(history.state, '', q.pathname + q.search + q.hash);
    }
  } catch (e) {}
  var W = document.querySelectorAll('[data-cmp]');
  if (!W.length) return;
  var T = {
    es: { abrir: 'Compartir Cofrade News', ed: 'Compartir esta edición', boton: 'Compartir', titulo: 'Compartir Cofrade News', correo: 'Correo', copiar: 'Copiar enlace',
      copiado: '¡Enlace copiado!', manual: 'Copia el enlace de arriba.', campo: 'Enlace para compartir', concurso: 'Concurso «Comparte Cofrade News»: bases', cerrar: 'Cerrar',
      texto: 'Te comparto Cofrade News, el boletín diario con las noticias de Chile y el mundo, cada dato con su fuente:', asunto: 'Te comparto Cofrade News' },
    en: { abrir: 'Share Cofrade News', ed: 'Share this edition', boton: 'Share', titulo: 'Share Cofrade News', correo: 'Email', copiar: 'Copy link',
      copiado: 'Link copied!', manual: 'Copy the link above.', campo: 'Link to share', concurso: '“Share Cofrade News” contest: rules', cerrar: 'Close',
      texto: "I'm sharing Cofrade News with you, the daily newsletter with the news from Chile and the world, every figure with its source:", asunto: "I'm sharing Cofrade News with you" }
  };
  function en() { return /^en/i.test(R.getAttribute('lang') || '') }
  function t(k) { return (en() ? T.en : T.es)[k] }
  function leer(k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } }
  function poner(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function azar(n) {
    var b = new Uint8Array(n), s = '';
    try { crypto.getRandomValues(b) } catch (e) { for (var i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256) }
    for (var j = 0; j < n; j++) s += A.charAt(b[j] % 36);
    return s
  }
  function secreto() { var s = leer('cn-ref-s'); if (!/^[a-z0-9]{24}$/.test(s)) { s = azar(24); poner('cn-ref-s', s); try { localStorage.removeItem('cn-ref') } catch (e) {} } return s }
  var pend = null;
  function codigo() {
    var c = leer('cn-ref');
    if (/^[a-z0-9]{8}$/.test(c) && /^[a-z0-9]{24}$/.test(leer('cn-ref-s'))) return Promise.resolve(c);
    if (pend) return pend;
    var s = secreto();
    pend = new Promise(function (ok) {
      try {
        crypto.subtle.digest('SHA-256', new TextEncoder().encode('cn-ref|' + s)).then(function (d) {
          var b = new Uint8Array(d), n = 0;
          for (var i = 0; i < 5; i++) n = n * 256 + b[i];
          var x = n.toString(36); while (x.length < 8) x = '0' + x;
          ok(x)
        }, function () { ok(azar(8)) })
      } catch (e) { ok(azar(8)) }
    }).then(function (x) { poner('cn-ref', x); pend = null; return x });
    return pend
  }
  window.__cnCodigo = codigo; window.__cnSecreto = secreto;   // el concurso usa el mismo secreto
  function enlace(base, c) { return base + (base.indexOf('?') < 0 ? '?' : '&') + 'r=' + c + '&utm_source=compartir' }
  function destino(k, u) {
    var tx = t('texto');
    if (k === 'whatsapp') return 'https://wa.me/?text=' + E(tx + ' ' + u);
    if (k === 'telegram') return 'https://t.me/share/url?url=' + E(u) + '&text=' + E(tx);
    if (k === 'correo') return 'mailto:?subject=' + E(t('asunto')) + '&body=' + E(tx + '\n\n' + u);
    if (k === 'linkedin') return 'https://www.linkedin.com/sharing/share-offsite/?url=' + E(u);
    if (k === 'facebook') return 'https://www.facebook.com/sharer/sharer.php?u=' + E(u);
    return 'https://twitter.com/intent/tweet?text=' + E(tx) + '&url=' + E(u)
  }
  function contar(c) {
    try {
      var b = new URLSearchParams({ c: c });
      if (navigator.sendBeacon) navigator.sendBeacon('/compartir', b); else fetch('/compartir', { method: 'POST', body: b, keepalive: true })
    } catch (e) {}
  }
  function iniciar(w) {
    var b = w.querySelector('.cmp-b'), p = w.querySelector('.cmp-p'), base = w.getAttribute('data-url') || 'https://www.cofrad.es/', ok = p.querySelector('.cmp-ok'),
      campo = p.querySelector('.cmp-campo'), origen = b, u = '', tOk = 0;
    if (w.hasAttribute('data-sistema')) p.classList.add('cmp-sistema');
    document.body.appendChild(p);   // fuera de la cabecera: así ninguna transformación de la página lo corre de lugar
    function rotular() {
      [w, p].forEach(function (z) {
        z.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = t(e.getAttribute('data-t')) });
        z.querySelectorAll('[data-ta]').forEach(function (e) { var x = t(e.getAttribute('data-ta')); e.setAttribute('aria-label', x); e.setAttribute('title', x) });
      });
      if (u) enlaces()
    }
    function enlaces() { p.querySelectorAll('[data-canal]').forEach(function (a) { a.setAttribute('href', destino(a.getAttribute('data-canal'), u)) }) }
    function ubicar() {
      if (p.hidden) return;
      var r = origen.getBoundingClientRect(), vw = document.documentElement.clientWidth || innerWidth, pw = Math.min(320, vw - 16);
      p.style.width = pw + 'px';
      var x = Math.min(Math.max(8, r.right - pw), vw - pw - 8), y = r.bottom + 8, h = p.offsetHeight;
      if (y + h > innerHeight - 8 && r.top - h - 8 >= 8) y = r.top - h - 8;
      p.style.left = Math.round(x) + 'px'; p.style.top = Math.round(Math.max(8, y)) + 'px'
    }
    function abrir(desde) {
      origen = desde || b;
      return codigo().then(function (c) {
        u = enlace(base, c); enlaces(); campo.value = u; campo.hidden = true; ok.textContent = '';
        p.hidden = false; b.setAttribute('aria-expanded', 'true'); ubicar();
        var pri = p.querySelector('[data-canal]'); try { pri.focus({ preventScroll: true }) } catch (e) { pri.focus() }
      })
    }
    function cerrar(volver) {
      if (p.hidden) return;
      p.hidden = true; b.setAttribute('aria-expanded', 'false');
      if (volver) { try { origen.focus({ preventScroll: true }) } catch (e) {} }
    }
    function tocar(desde) {
      if (!p.hidden) { cerrar(true); return }
      if (navigator.share) {
        codigo().then(function (c) {
          navigator.share({ title: 'Cofrade News', text: t('texto'), url: enlace(base, c) }).then(function () { contar('nativo') },
            function (e) { if (!e || e.name !== 'AbortError') abrir(desde) })
        })
      } else abrir(desde)
    }
    b.addEventListener('click', function (ev) { ev.preventDefault(); tocar(b) });
    ['pointerenter', 'focus', 'touchstart'].forEach(function (n) { b.addEventListener(n, function () { codigo() }, { passive: true, once: true }) });
    p.querySelectorAll('[data-canal]').forEach(function (a) {
      a.addEventListener('click', function (ev) { if (!u) { ev.preventDefault(); return } contar(a.getAttribute('data-canal')); setTimeout(function () { cerrar(false) }, 200) })
    });
    function aviso(s) { ok.textContent = s; clearTimeout(tOk); tOk = setTimeout(function () { ok.textContent = '' }, 4000) }
    p.querySelector('.cmp-copiar').addEventListener('click', function () {
      if (!u) return;
      var listo = function () { aviso(t('copiado')); contar('copiar') };
      var mano = function () {
        campo.hidden = false; campo.value = u; campo.focus(); campo.select();
        var x = false; try { x = document.execCommand('copy') } catch (e) {}
        if (x) listo(); else aviso(t('manual'))
      };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(listo, mano); else mano() } catch (e) { mano() }
    });
    p.querySelector('.cmp-x').addEventListener('click', function () { cerrar(true) });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !p.hidden) { ev.preventDefault(); ev.stopPropagation(); cerrar(true) } });
    document.addEventListener('pointerdown', function (ev) { if (!p.hidden && !p.contains(ev.target) && !b.contains(ev.target) && !(origen && origen.contains(ev.target))) cerrar(false) }, true);
    p.addEventListener('focusout', function (ev) { var d = ev.relatedTarget; if (d && !p.contains(d) && d !== b && d !== origen) cerrar(false) });
    addEventListener('resize', ubicar, { passive: true }); addEventListener('scroll', ubicar, { passive: true });
    rotular();
    try { new MutationObserver(rotular).observe(R, { attributes: true, attributeFilter: ['lang'] }) } catch (e) {}
    document.addEventListener('cofrade-idioma', function () { setTimeout(rotular, 0) });
    b.hidden = false;
    return tocar
  }
  var primero = null;
  W.forEach(function (w) { try { var f = iniciar(w); if (!primero) primero = f } catch (e) {} });
  document.querySelectorAll('.cmp-abrir').forEach(function (x) { x.addEventListener('click', function (ev) { ev.preventDefault(); if (primero) primero(x) }) });
})();
