// 20-11-2026 · Concurso «Comparte Cofrade News» (Germán, 04:43): inscripción desde el Buzón en 3 pasos, igual que las sugerencias:
// requisitos y bases, captura opcional (se achica aquí mismo a 1280 px en JPEG, ~0,7, bajo 400 KB) y email con el recuadro de
// seguridad de Cloudflare (Turnstile). La captura nunca se publica; el servidor la guarda privada y la borra 30 días después del sorteo.
(function () {
  var d = document.getElementById('dlgConcurso');
  if (!d) return;
  var f = d.querySelector('form'), st = d.querySelector('.pub-estado'), paso = 1, tk = '', wid = null, cargando = false, img = null, procesando = false,
    pasos = d.querySelectorAll('.paso'), barra = d.querySelectorAll('.pasos i'), pn = d.querySelector('.paso-n'), atras = d.querySelector('.cc-atras'),
    sig = d.querySelector('.cc-sig'), env = d.querySelector('.cc-enviar'), ok = d.querySelector('.buzon-ok'), nav = d.querySelector('.buzon-nav'),
    arch = d.querySelector('input[type=file]'), vista = d.querySelector('.cc-vista'), peso = d.querySelector('.cc-peso'), A = 'abcdefghijklmnopqrstuvwxyz0123456789';
  function en() { return document.documentElement.lang === 'en' }
  function tx(es, ing) { return en() ? ing : es }
  function dibujar() {
    if (!window.turnstile || wid !== null || paso !== 3) return;
    try {
      wid = turnstile.render('#tsConcurso', { sitekey: d.getAttribute('data-sitekey'), language: en() ? 'en' : 'es', theme: 'auto',
        callback: function (t) { tk = t }, 'expired-callback': function () { tk = '' }, 'error-callback': function () { tk = '' } })
    } catch (e) {}
  }
  // El script de Turnstile se carga una sola vez para el Buzón y el concurso
  function turnstile0() {
    if (window.turnstile) { dibujar(); return }
    if (document.querySelector('script[src*="/turnstile/v0/api.js"]')) {
      var n = 0, i = setInterval(function () { if (window.turnstile || ++n > 75) { clearInterval(i); dibujar() } }, 200);
      return
    }
    if (cargando) return;
    cargando = true; window.__tsConcurso = dibujar;
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tsConcurso&render=explicit'; s.async = true;
    s.onerror = function () { st.textContent = tx('No cargó la verificación de seguridad. Revisa tu conexión o el bloqueador de anuncios.', 'The security check could not load. Check your connection or ad blocker.') };
    document.head.appendChild(s)
  }
  function ir(n) {
    paso = n;
    pasos.forEach(function (p) { p.hidden = Number(p.getAttribute('data-paso')) !== n });
    barra.forEach(function (b, i) { b.className = i < n ? 'si' : '' });
    pn.textContent = tx('Paso ' + n + ' de 3', 'Step ' + n + ' of 3'); atras.hidden = n === 1; sig.hidden = n === 3; env.hidden = n !== 3; st.textContent = '';
    if (n === 3) { turnstile0(); setTimeout(function () { try { f.email.focus() } catch (e) {} }, 60) }
    try { f.scrollTop = 0 } catch (e) {}
  }
  function abrir() {
    var bz = document.getElementById('dlgBuzon');
    if (bz && bz.open) { try { bz.close() } catch (e) { bz.removeAttribute('open') } }
    st.textContent = ''; ok.hidden = true; nav.hidden = false; pn.hidden = false; d.querySelector('.pasos').hidden = false; ir(1);
    if (d.showModal) { if (!d.open) d.showModal() } else d.setAttribute('open', '');
    turnstile0()
  }
  function cerrar() { if (d.close) d.close(); else d.removeAttribute('open') }
  document.querySelectorAll('.concurso-abrir').forEach(function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); abrir() }) });
  if (location.hash === '#concurso') setTimeout(abrir, 300);
  d.querySelector('.pub-cerrar').addEventListener('click', cerrar);
  d.querySelector('.buzon-fin').addEventListener('click', cerrar);
  d.addEventListener('click', function (ev) { if (ev.target === d) cerrar() });
  function avanzar() {
    if (paso === 1) {
      if (!f.mayor.checked || !f.bases.checked) { st.textContent = tx('Para participar debes tener 18 años o más, vivir en Chile y aceptar las bases.', 'To take part you must be 18 or older, live in Chile and accept the rules.'); return }
      ir(2); return
    }
    if (paso === 2) {
      if (procesando) { st.textContent = tx('Espera un momento: estamos preparando tu captura.', 'Please wait: we are preparing your screenshot.'); return }
      ir(3)
    }
  }
  sig.addEventListener('click', avanzar);
  atras.addEventListener('click', function () { ir(Math.max(1, paso - 1)) });
  f.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && paso < 3 && ev.target.tagName !== 'TEXTAREA') { ev.preventDefault(); avanzar() } });
  // ---- captura: se achica en el navegador (máximo 1280 px por lado, o 960 si no alcanza; JPEG ~0,7, idealmente bajo 250 KB y nunca sobre 300 KB) ----
  function porLector(a) {
    return new Promise(function (bien, mal) {
      var r = new FileReader();
      r.onload = function () { var im = new Image(); im.onload = function () { bien(im) }; im.onerror = mal; im.src = r.result };
      r.onerror = mal; r.readAsDataURL(a)
    })
  }
  function decodificar(a) { return window.createImageBitmap ? createImageBitmap(a).catch(function () { return porLector(a) }) : porLector(a) }
  function comprimir(c, q) {
    return new Promise(function (bien, mal) {
      c.toBlob(function (b) {
        if (!b) return mal();
        if (b.size > 250000 && q > 0.45) bien(comprimir(c, Math.round((q - 0.1) * 100) / 100));
        else if (b.size > 300000) mal(); else bien(b)
      }, 'image/jpeg', q)
    })
  }
  function achicar(a, lado) {
    lado = lado || 1280;
    return decodificar(a).then(function (im) {
      var w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight;
      if (!w0 || !h0) throw new Error('vacía');
      var e = Math.min(1, lado / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * e)), h = Math.max(1, Math.round(h0 * e)), c = document.createElement('canvas');
      c.width = w; c.height = h;
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
      if (im.close) { try { im.close() } catch (er) {} }
      var m = document.createElement('canvas'), em = 144 / Math.max(w, h);
      m.width = Math.max(1, Math.round(w * em)); m.height = Math.max(1, Math.round(h * em)); m.getContext('2d').drawImage(c, 0, 0, m.width, m.height);
      return comprimir(c, 0.7).then(function (b) { return { blob: b, w: w, h: h, prev: m.toDataURL('image/jpeg', 0.7) } })
    })
  }
  function quitar() { img = null; arch.value = ''; vista.hidden = true }
  arch.addEventListener('change', function () {
    img = null; vista.hidden = true; st.textContent = '';
    var a = arch.files && arch.files[0];
    if (!a) return;
    if (!/^image\//i.test(a.type || '')) { arch.value = ''; st.textContent = tx('Ese archivo no es una imagen. Sube una captura de pantalla (JPG o PNG).', 'That file is not an image. Upload a screenshot (JPG or PNG).'); return }
    if (a.size > 25e6) { arch.value = ''; st.textContent = tx('La imagen es demasiado grande (máximo 25 MB).', 'The image is too large (25 MB max).'); return }
    procesando = true; st.textContent = tx('Preparando tu captura…', 'Preparing your screenshot…');
    achicar(a).catch(function () { return achicar(a, 960) }).then(function (r) {
      img = r; procesando = false; st.textContent = '';
      vista.querySelector('img').src = r.prev; peso.textContent = Math.round(r.blob.size / 1024) + ' KB · ' + r.w + '×' + r.h; vista.hidden = false
    }, function () { procesando = false; quitar(); st.textContent = tx('No pudimos leer esa imagen. Prueba con otra captura.', 'We could not read that image. Try another screenshot.') })
  });
  d.querySelector('.cc-quitar').addEventListener('click', quitar);
  // ---- el mismo secreto del botón Compartir: une el email con el enlace personal de este navegador ----
  function secreto() {
    if (window.__cnSecreto) return window.__cnSecreto();
    var s = '';
    try { s = localStorage.getItem('cn-ref-s') || '' } catch (e) {}
    if (!/^[a-z0-9]{24}$/.test(s)) {
      var b = new Uint8Array(24); s = '';
      try { crypto.getRandomValues(b) } catch (e) { for (var i = 0; i < 24; i++) b[i] = Math.floor(Math.random() * 256) }
      for (var j = 0; j < 24; j++) s += A.charAt(b[j] % 36);
      try { localStorage.setItem('cn-ref-s', s); localStorage.removeItem('cn-ref') } catch (e) {}
    }
    return s
  }
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (paso !== 3) { avanzar(); return }
    if (f.pagina_web.value) return;
    var em = f.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(em)) { st.textContent = tx('Escribe un email válido.', 'Please enter a valid email.'); return }
    if (!tk) { st.textContent = tx('Completa la verificación de seguridad (el recuadro de Cloudflare).', 'Please complete the security check (the Cloudflare box).'); turnstile0(); return }
    var fd = new FormData();
    fd.append('email', em); fd.append('mayor', f.mayor.checked ? 'si' : ''); fd.append('bases', f.bases.checked ? 'si' : '');
    fd.append('secreto', secreto()); fd.append('cf-turnstile-response', tk); fd.append('pagina_web', f.pagina_web.value);
    if (img) { fd.append('captura', img.blob, 'captura.jpg'); fd.append('ancho', String(img.w)); fd.append('alto', String(img.h)) }
    env.disabled = true; st.textContent = tx('Enviando…', 'Sending…');
    fetch('/concurso', { method: 'POST', body: fd }).then(function (r) { return r.json().catch(function () { return { ok: false } }) }).then(function (j) {
      tk = ''; try { turnstile.reset(wid) } catch (e) {}
      if (j && j.ok) {
        if (j.codigo) { try { localStorage.setItem('cn-ref', j.codigo) } catch (e) {} }
        f.reset(); quitar(); pasos.forEach(function (p) { p.hidden = true }); nav.hidden = true; pn.hidden = true; d.querySelector('.pasos').hidden = true;
        d.querySelector('.buzon-msg').textContent = (en() && j.mensaje_en) || j.mensaje || '';
        var mio = d.querySelector('.cc-mio');
        if (j.enlace) { mio.hidden = false; d.querySelector('.cc-enlace').value = j.enlace } else mio.hidden = true;
        ok.hidden = false; st.textContent = ''
      } else st.textContent = (j && ((en() && j.error_en) || j.error)) || tx('No se pudo enviar. Intenta de nuevo.', 'It could not be sent. Please try again.')
    }).catch(function () { st.textContent = tx('No se pudo enviar (¿sin internet?).', 'It could not be sent (no internet?).') }).finally(function () { env.disabled = false })
  });
  d.querySelector('.cc-copiar').addEventListener('click', function () {
    var i = d.querySelector('.cc-enlace'), listo = function () { st.textContent = tx('¡Enlace copiado!', 'Link copied!') };
    var mano = function () { i.focus(); i.select(); try { if (document.execCommand('copy')) listo() } catch (e) {} };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(i.value).then(listo, mano); else mano() } catch (e) { mano() }
  });
})();
