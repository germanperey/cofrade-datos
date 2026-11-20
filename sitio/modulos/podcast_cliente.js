// 20-11-2026 · Panel «Podcast»: botones de copiar, portada fija (1280×720) y conversor de audio a video WebM (VP8 + Opus) en el
// navegador, con WebCodecs y webm-muxer (MIT, sitio/vendor/webm-muxer.js). Nada se sube a ningún servidor.
(function () {
  var D = {};
  try { D = JSON.parse(document.getElementById('podDatos').textContent) } catch (e) { return }
  var $ = function (id) { return document.getElementById(id) };
  var est = $('podEstado'), cv = $('podPortada'), inFecha = $('podFecha'), inAudio = $('podAudio'), bCrear = $('podCrear'), aBajar = $('podBajar'), aPortada = $('podBajarPortada');
  function aviso(t, mal) { if (est) { est.textContent = t; est.style.color = mal ? 'var(--rojo)' : '' } }
  // ---- copiar ----
  function copiar(t, b) {
    var listo = function () { var o = b.textContent; b.textContent = '¡Copiado!'; setTimeout(function () { b.textContent = o }, 1600) };
    var mano = function () { var x = document.createElement('textarea'), ok = false; x.value = t; document.body.appendChild(x); x.select(); try { ok = document.execCommand('copy') } catch (e) {} x.remove(); if (ok) listo(); else aviso('No se pudo copiar: selecciona el texto y cópialo a mano.', true) };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(listo, mano); else mano() } catch (e) { mano() }
  }
  document.querySelectorAll('#podcast [data-copiar-id]').forEach(function (b) { b.addEventListener('click', function () { var e = $(b.getAttribute('data-copiar-id')); if (e) copiar(e.textContent, b) }) });
  document.querySelectorAll('#podcast [data-copiar-url]').forEach(function (b) {
    b.addEventListener('click', function () {
      var u = b.getAttribute('data-copiar-url');
      if (b.hasAttribute('data-literal')) return copiar(u, b);
      fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.text() }).then(function (t) { copiar(t, b) }, function () { aviso('No se pudo leer la fuente. Ábrela y cópiala a mano.', true) })
    })
  });
  // ---- fechas, título y descripción según la fecha elegida ----
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function larga(f) { var p = String(f || '').split('-').map(Number); if (p.length !== 3 || !p[0]) return ''; var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 15)); return DIAS[d.getUTCDay()] + ' ' + p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0] }
  function textos(f) {
    var l = larga(f), s = D.secciones || [];
    var tit = $('podTitulo'), des = $('podDesc');
    if (tit) tit.textContent = 'Podcast Cofrade News · ' + l;
    if (des) des.textContent = 'Las noticias del ' + l.toLowerCase() + ' en pocos minutos: ' + s.slice(0, -1).join('; ') + '; y ' + s[s.length - 1] + '.\n\nLee la edición completa, con cada dato y su fuente: https://www.cofrad.es/edicion/' + f
      + '\n\nAudio generado con inteligencia artificial (Gemini Notebook de Google) a partir de la edición de Cofrade News, el diario de la mañana. Suscríbete gratis en www.cofrad.es';
  }
  // ---- portada fija (la misma para la miniatura de YouTube y para el video) ----
  var logo = new Image(), logoListo = false;
  logo.onload = function () { logoListo = true; dibujar() }; logo.src = '/icono-512.png';
  function envolver(x, t, ancho) { var pal = t.split(' '), l = [], a = ''; pal.forEach(function (p) { var n = a ? a + ' ' + p : p; if (x.measureText(n).width > ancho && a) { l.push(a); a = p } else a = n }); if (a) l.push(a); return l }
  function dibujar() {
    if (!cv) return;
    var x = cv.getContext('2d'), W = 1280, H = 720, f = (inFecha && inFecha.value) || D.hoy;
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0B1F3A'); g.addColorStop(1, '#14305A'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(201,162,39,.6)'; x.lineWidth = 2; x.strokeRect(30, 30, W - 60, H - 60);
    x.strokeStyle = 'rgba(201,162,39,.25)'; x.lineWidth = 1; x.strokeRect(42, 42, W - 84, H - 84);
    if (logoListo) { x.save(); x.beginPath(); x.arc(250, 330, 150, 0, Math.PI * 2); x.closePath(); x.clip(); x.drawImage(logo, 100, 180, 300, 300); x.restore(); x.strokeStyle = '#C9A227'; x.lineWidth = 3; x.beginPath(); x.arc(250, 330, 151, 0, Math.PI * 2); x.stroke() }
    var X0 = 470;
    x.fillStyle = '#C9A227'; x.font = '700 24px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; try { x.letterSpacing = '5px' } catch (e) {}
    x.fillText('COFRADE NEWS · PODCAST', X0, 150); try { x.letterSpacing = '0px' } catch (e) {}
    x.fillStyle = '#FBF8F2'; x.font = '600 72px "Cormorant Garamond", Georgia, "Times New Roman", serif'; x.fillText('Las noticias del día', X0, 238);
    x.fillStyle = '#E9D9A6'; x.font = '600 44px "Cormorant Garamond", Georgia, "Times New Roman", serif';
    envolver(x, larga(f), W - X0 - 80).slice(0, 2).forEach(function (l, i) { x.fillText(l, X0, 300 + i * 50) });
    x.font = '400 22px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; x.fillStyle = '#D8D2C4';
    var s = D.secciones || [];
    s.forEach(function (t, i) { var col = i < 4 ? 0 : 1, fila = i < 4 ? i : i - 4; x.fillStyle = '#C9A227'; x.fillText('•', X0 + col * 360, 410 + fila * 40); x.fillStyle = '#D8D2C4'; x.fillText(t.replace('Tecnología, Tendencias e Innovación', 'Tecnología e Innovación').replace('Economía, Negocios e Inversión', 'Economía y Negocios'), X0 + 22 + col * 360, 410 + fila * 40) });
    x.fillStyle = '#C9A227'; x.font = '700 26px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; x.fillText('www.cofrad.es', X0, 640);
    x.fillStyle = 'rgba(216,210,196,.75)'; x.font = '400 18px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; x.fillText('Audio generado con IA a partir de la edición · cada dato con su fuente', X0, 670);
    if (aPortada) cv.toBlob(function (b) { if (!b) return; if (aPortada.href && aPortada.href.indexOf('blob:') === 0) URL.revokeObjectURL(aPortada.href); aPortada.href = URL.createObjectURL(b); aPortada.download = 'Portada-Podcast-Cofrade-News-' + f + '.png'; aPortada.setAttribute('aria-disabled', 'false') }, 'image/png');
  }
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('600 72px "Cormorant Garamond"'), document.fonts.load('600 44px "Cormorant Garamond"')]).then(dibujar, dibujar);
  dibujar(); textos(D.hoy);
  if (inFecha) inFecha.addEventListener('change', function () { dibujar(); textos(inFecha.value || D.hoy) });
  if (inAudio) inAudio.addEventListener('change', function () { var a = inAudio.files && inAudio.files[0]; if (bCrear) bCrear.disabled = !a; if (aBajar) aBajar.hidden = true; aviso(a ? 'Audio listo: ' + a.name + ' (' + Math.round(a.size / 1048576 * 10) / 10 + ' MB). Toca «Crear el video».' : '') });
  // ---- conversor: audio → WebM (VP8 1280×720 a 1 cuadro por segundo + Opus mono 48 kHz) ----
  var VCFG = { codec: 'vp8', width: 1280, height: 720, bitrate: 600000, framerate: 1 }, ACFG = { codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 96000 };
  function soporte() {
    if (!window.VideoEncoder || !window.AudioEncoder || !window.VideoFrame || !window.AudioData || !window.OfflineAudioContext) return Promise.resolve(false);
    return Promise.all([VideoEncoder.isConfigSupported(VCFG), AudioEncoder.isConfigSupported(ACFG)]).then(function (r) { return r[0].supported && r[1].supported }, function () { return false });
  }
  function esperar(enc) { return enc.encodeQueueSize > 8 ? new Promise(function (ok) { enc.addEventListener('dequeue', function () { ok() }, { once: true }) }) : Promise.resolve() }
  // Duración del audio ANTES de decodificarlo (decodificar un audio largo ocupa mucha memoria). Si el navegador no la entrega, null.
  function duracion(a) {
    return new Promise(function (ok) {
      var el = document.createElement('audio'), u = URL.createObjectURL(a), fin = function (d) { clearTimeout(t); el.removeAttribute('src'); try { el.load() } catch (e) {} URL.revokeObjectURL(u); ok(d) };
      var t = setTimeout(function () { fin(null) }, 8000);
      el.preload = 'metadata'; el.onloadedmetadata = function () { fin(isFinite(el.duration) && el.duration > 0 ? el.duration : null) }; el.onerror = function () { fin(null) }; el.src = u;
    });
  }
  var MAX_MIN = 20;
  async function crear() {
    var a = inAudio && inAudio.files && inAudio.files[0];
    if (!a) return;
    if (a.size > 150 * 1048576) return aviso('El audio es demasiado grande (máximo 150 MB). Descárgalo de nuevo desde Gemini Notebook.', true);
    bCrear.disabled = true; aBajar.hidden = true;
    try {
      if (!(await soporte())) throw new Error('Este navegador no puede crear el video. Usa Google Chrome o Microsoft Edge en el computador.');
      aviso('Leyendo el audio…');
      var largo = 'El audio dura más de ' + MAX_MIN + ' minutos: en Gemini Notebook elige la duración «Más corto» y vuelve a generarlo (el podcast es de 5 a 8 minutos).';
      var d0 = await duracion(a);
      if (d0 && d0 > MAX_MIN * 60) throw new Error(largo);
      var ac; try { ac = new AudioContext({ sampleRate: 48000 }) } catch (e) { ac = new (window.AudioContext || window.webkitAudioContext)() }
      var crudo = await a.arrayBuffer(), buf;
      try { buf = await ac.decodeAudioData(crudo) } catch (e) { throw new Error('No pudimos leer ese audio. Usa el archivo que descargaste de Gemini Notebook (m4a, mp3 o wav).') } finally { crudo = null; try { ac.close() } catch (e) {} }
      var seg = buf.duration;
      if (!(seg > 1)) throw new Error('El audio está vacío.');
      if (seg > MAX_MIN * 60) throw new Error(largo);
      var n = Math.ceil(seg * 48000), off = new OfflineAudioContext(1, n, 48000), src = off.createBufferSource();
      src.buffer = buf; src.connect(off.destination); src.start();
      var pcm = (await off.startRendering()).getChannelData(0);
      src.disconnect(); src = null; off = null; buf = null;   // se suelta la memoria del audio decodificado antes de codificar
      dibujar();
      var vChunks = [], aChunks = [], vMeta = null, aMeta = null, error = null;
      var ve = new VideoEncoder({ output: function (c, m) { if (m && m.decoderConfig && !vMeta) vMeta = m; vChunks.push(c) }, error: function (e) { error = e } });
      ve.configure(VCFG);
      var ae = new AudioEncoder({ output: function (c, m) { if (m && m.decoderConfig && !aMeta) aMeta = m; aChunks.push(c) }, error: function (e) { error = e } });
      ae.configure(ACFG);
      var cuadros = Math.ceil(seg);
      for (var i = 0; i < cuadros; i++) {
        if (error) throw error;
        var fr = new VideoFrame(cv, { timestamp: i * 1e6, duration: 1e6 });
        ve.encode(fr, { keyFrame: i % 10 === 0 }); fr.close();
        var ini = i * 48000, fin = Math.min(n, ini + 48000);
        if (fin > ini) { var parte = pcm.slice(ini, fin), ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: parte.length, numberOfChannels: 1, timestamp: Math.round(ini / 48 * 1000), data: parte }); ae.encode(ad); ad.close() }
        if (i % 15 === 0) aviso('Creando el video… ' + Math.round(i / cuadros * 100) + ' %');
        await esperar(ve); await esperar(ae);
      }
      await ve.flush(); await ae.flush(); ve.close(); ae.close();
      if (error) throw error;
      aviso('Armando el archivo…');
      var mux = new WebMMuxer.Muxer({ target: new WebMMuxer.ArrayBufferTarget(), video: { codec: 'V_VP8', width: 1280, height: 720, frameRate: 1 }, audio: { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 1 }, firstTimestampBehavior: 'offset' });
      var iv = 0, ia = 0;
      while (iv < vChunks.length || ia < aChunks.length) {   // en orden de tiempo: video y audio intercalados
        if (ia >= aChunks.length || (iv < vChunks.length && vChunks[iv].timestamp <= aChunks[ia].timestamp)) { mux.addVideoChunk(vChunks[iv], iv === 0 ? vMeta : undefined); iv++ }
        else { mux.addAudioChunk(aChunks[ia], ia === 0 ? aMeta : undefined); ia++ }
      }
      mux.finalize(); vChunks = aChunks = null; pcm = null;
      var blob = new Blob([mux.target.buffer], { type: 'video/webm' }), f = (inFecha && inFecha.value) || D.hoy;
      if (aBajar.href && aBajar.href.indexOf('blob:') === 0) URL.revokeObjectURL(aBajar.href);
      aBajar.href = URL.createObjectURL(blob); aBajar.download = 'Podcast-Cofrade-News-' + f + '.webm'; aBajar.hidden = false;
      aBajar.dataset.segundos = String(Math.round(seg)); aBajar.dataset.bytes = String(blob.size);
      var m = Math.floor(seg / 60), s = Math.round(seg % 60);
      aviso('Listo: video de ' + m + ' min ' + (s < 10 ? '0' : '') + s + ' s (' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB). Toca «Descargar el video» y súbelo en YouTube Studio.');
    } catch (e) {
      aviso((e && e.message) || 'No se pudo crear el video.', true);
    } finally { bCrear.disabled = !(inAudio && inAudio.files && inAudio.files[0]) }
  }
  if (bCrear) bCrear.addEventListener('click', crear);
})();
