// 19-11-2026 · Voz y oído simulados para probar la lectura sin parlantes ni micrófono.
// cfg (window.__simCfg): voz (ajustes de la lectura), voces (lista), sinVoz, sinOido, eco (el oído escucha a la propia voz),
// msPorCaracter (duración realista de cada frase), finSesionMs (Chrome cierra la escucha cada tanto), vocesTarde (Edge entrega Catalina
// recién después de la primera frase), vocesIndefinidas (falla de Edge 150), limites (avisos de palabra), ecoFiel (eco siempre completo).
(function () {
  var cfg = window.__simCfg || {};
  window.__cnVozCfg = Object.assign({ forzar: true, espera: 700, entre: 300, auspicioMin: 10, bilingue: !!cfg.bilingue }, cfg.voz || {});
  var dicho = []; window.__dicho = dicho; window.__mudas = 0;
  var cola = [], hablando = null, oyentes = [];
  var CAT = { name: 'Microsoft Catalina Online (Natural) - Spanish (Chile)', lang: 'es-CL', localService: false };
  var V = cfg.voces || [
    { name: 'Microsoft Jorge Online (Natural) - Spanish (Mexico)', lang: 'es-MX', localService: false },
    { name: 'Google español', lang: 'es-ES', localService: false },
    CAT,
    { name: 'Microsoft Lorenzo Online (Natural) - Spanish (Chile)', lang: 'es-CL', localService: false },
    { name: 'Microsoft Ava Online (Natural) - English (United States)', lang: 'en-US', localService: false },
    { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US', localService: false }
  ];
  if (cfg.vocesIndefinidas) V = [
    { name: 'Microsoft undefined Online (Natural) - undefined', lang: undefined, localService: false },
    { name: 'Microsoft undefined Online (Natural) - undefined', lang: 'undefined', localService: false },
    { name: 'Microsoft undefined Online (Natural) - Spanish (Chile)', lang: 'es-CL', localService: false },
    { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES', localService: true },
    { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true }
  ];
  var tarde = !!cfg.vocesTarde, completas = V;
  var LOCALES = [{ name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES', localService: true }, { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true }];
  if (tarde) { completas = LOCALES.concat(V); V = LOCALES.slice(); }   // como Edge: al principio solo las voces del sistema
  window.__vocesCompletas = function () { V = completas; oyentes.forEach(function (f) { try { f(); } catch (e) {} }); if (window.speechSynthesis.onvoiceschanged) window.speechSynthesis.onvoiceschanged(); };
  function duracion(t) { return cfg.msPorCaracter ? Math.max(250, t.length * cfg.msPorCaracter) : (window.__msPorFrase || 25); }
  if (!cfg.sinVoz) {
    window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; };
    var ss = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: function () { return V; },
      speak: function (u) {
        if (tarde) { tarde = false; setTimeout(window.__vocesCompletas, 120); }
        if (u.volume === 0) { window.__mudas++; setTimeout(function () { if (u.onend) u.onend(); }, 5); return; }
        cola.push(u); bomba();
      },
      cancel: function () {
        var c = cola; cola = [];
        if (hablando) { var h = hablando; hablando = null; h._cortada = true; clearTimeout(h._t); ss.speaking = false; if (h.onerror) h.onerror({ error: 'interrupted' }); }
        c.forEach(function (u) { if (u.onerror) u.onerror({ error: 'canceled' }); });
      },
      pause: function () {}, resume: function () {},
      addEventListener: function (n, f) { if (n === 'voiceschanged') oyentes.push(f); }, removeEventListener: function () {}
    };
    function bomba() {
      if (hablando || !cola.length) return;
      var u = cola.shift(), d = duracion(u.text);
      if (cfg.fallaVoz && u.voice && new RegExp(cfg.fallaVoz).test(u.voice.name)) { window.__fallas = (window.__fallas || 0) + 1; setTimeout(function () { if (u.onerror) u.onerror({ error: 'synthesis-failed' }); bomba(); }, 5); return; }
      hablando = u; ss.speaking = true;
      var reg = { t: u.text, v: u.voice && u.voice.name, lang: u.lang, r: u.rate, p: u.pitch, at: Date.now(), dur: d }; dicho.push(reg);
      setTimeout(function () { if (u.onstart) u.onstart(); }, 0);
      if (cfg.eco) eco(u, u.text, d);
      if (cfg.limites) u.text.replace(/\S+/g, function (m, i) {   // avisos de palabra, como Edge y las voces del sistema
        setTimeout(function () { if (hablando === u && u.onboundary) u.onboundary({ name: 'word', charIndex: i }); }, Math.round(d * i / Math.max(1, u.text.length)));
        return m;
      });
      u._t = setTimeout(function () { if (hablando !== u) return; hablando = null; ss.speaking = false; reg.fin = Date.now(); if (u.onend) u.onend(); bomba(); }, d);
    }
    Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true, writable: true });
  } else {
    try { delete window.speechSynthesis; } catch (e) {}
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true, writable: true });
  }
  // el eco: el oído continuo «oye» lo que dice la voz. Variantes en rueda: completo, a medias, con una letra mal oída, con los números
  // en palabras, y un tramo que junta el final de la frase anterior; unas llegan mientras la voz habla y otras después (retraso real).
  var nEco = 0, prevW = [], PAL = { 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez' };
  function eco(u, texto, d) {
    var orig = texto.replace(/[«»"“”.,;:!?¿¡()]/g, ' ').split(/\s+/).filter(Boolean), w = orig.slice(), nv = cfg.ecoInicio ? 7 : cfg.ecoSinRuido ? 5 : 6;
    var v = cfg.ecoFiel ? 0 : (nEco++) % nv;
    if (cfg.ecoInicio && v === 5) v = texto.length >= 30 ? 6 : 0;
    if (cfg.ecoSinRuido && v === 5) v = 0;
    if (v === 1) w = w.slice(0, Math.max(1, Math.ceil(w.length * 0.6)));
    if (v === 0 || v === 3) w = w.slice(0, Math.max(1, Math.ceil(w.length * (v === 0 ? 0.7 : 0.9))));   // lo que llega mientras la voz habla solo trae lo ya dicho
    if (v === 2) for (var i = 0; i < w.length; i++) if (w[i].length > 6) { w[i] = w[i].slice(0, -1); break; }
    if (v === 3) w = w.map(function (x) { return PAL[x] || x; });
    if (v === 4) w = prevW.slice(-2).concat(w);
    if (v === 5) w = w.concat(['pues']);   // un ruido de la sala pegado al eco
    if (v === 6) w = w.slice(0, 2);   // el reconocedor solo alcanzó a oír el comienzo de una frase larga
    if (cfg.ecoSiempreRuido) w = w.concat(['pues']);   // sala ruidosa: ningún eco llega limpio
    prevW = orig;
    var cuando = [0.7 * d, d + 400, d + 900, 0.9 * d, d + 1300, d + 600, d + 600][v], prov = null, rp = null;
    setTimeout(function () { var r = window.__recContinuo; if (r && r._vivo && !u._cortada) { rp = r; prov = provisorio(r); } }, Math.round(Math.max(0, Math.min(300, cuando - 50))));
    setTimeout(function () {
      if (u._cortada) return;   // si la cortaron antes, ese pedazo no sonó entero
      var r = window.__recContinuo; if (r && r._vivo) entregar(r, w.join(' '), r === rp ? prov : null);
    }, Math.round(cuando));
  }
  function provisorio(r, texto) {   // Chrome manda resultados provisorios mientras alguien habla; el final llega después en el mismo lugar
    var x = [{ transcript: texto || '…', confidence: 0.3 }]; x.isFinal = false; r._res.push(x);
    var k = r._res.length - 1; if (r.onresult) r.onresult({ resultIndex: k, results: r._res }); return k;
  }
  function entregar(r, t, k) {
    var x = [{ transcript: t, confidence: 0.9 }]; x.isFinal = true;
    if (k == null || k >= r._res.length) { r._res.push(x); k = r._res.length - 1; } else r._res[k] = x;
    window.__oido.push(t);
    if (r.onresult) r.onresult({ resultIndex: k, results: r._res });
  }
  window.__candados = { pedidos: 0, soltados: 0 };   // la pantalla encendida mientras lee
  try {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: function (t) {
      window.__candados.pedidos++;
      var l = { released: false, type: t, _h: [], addEventListener: function (e, f) { this._h.push(f); }, release: function () { window.__candados.soltados++; this.released = true; this._h.forEach(function (f) { f(); }); return Promise.resolve(); } };
      return Promise.resolve(l);
    } } });
  } catch (e) {}
  // 19-11-2026 · permiso del micrófono: cfg.mic = 'prompt' (por defecto; el pedido lo concede), 'granted' o 'denied'
  var micP = { state: cfg.mic || 'prompt', onchange: null, _o: [], addEventListener: function (n, f) { this._o.push(f); } };
  window.__gum = 0; window.__gumStop = 0;
  window.__micCambia = function (st) { micP.state = st; micP._o.forEach(function (f) { try { f(); } catch (e) {} }); if (micP.onchange) micP.onchange(); };
  // cfg.sinConsulta: el navegador no sabe consultar el permiso del micrófono (la consulta falla); cfg.alPedir = 'bloquea' (la persona
  // bloquea en la ventana de permiso) o 'cierra' (la cierra sin responder); cfg.gumDemoraMs: la ventana tarda en responderse
  if (!cfg.micReal) try { Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: function () {
    if (cfg.sinConsulta) return Promise.reject(new TypeError('microphone no es un permiso consultable'));
    return Promise.resolve(micP); } } }); } catch (e) {}
  if (!cfg.micReal) try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: function () {
    window.__gum++;
    var rechazo = function (msg) { var e = new Error(msg); e.name = 'NotAllowedError'; return e; };
    if (micP.state === 'denied') return Promise.reject(rechazo('denegado'));
    var responder = function (ok, no) {
      if (cfg.alPedir === 'bloquea') { micP.state = 'denied'; if (!cfg.sinAvisoCambio) window.__micCambia('denied'); return no(rechazo('Permission denied')); }
      if (cfg.alPedir === 'cierra') return no(rechazo('Permission dismissed'));
      micP.state = 'granted';
      ok({ getTracks: function () { return [{ stop: function () { window.__gumStop++; } }]; } });
    };
    return new Promise(function (ok, no) { if (cfg.gumDemoraMs) setTimeout(function () { responder(ok, no); }, cfg.gumDemoraMs); else responder(ok, no); });
  } } }); } catch (e) {}
  window.__oidos = []; window.__escuchas = 0; window.__langOido = []; window.__sesiones = []; window.__oido = [];
  if (cfg.sinOido) {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true, writable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true, writable: true });
  } else {
    var SR = function () {
      var r = this; r.lang = ''; r.continuous = false; r.interimResults = false; r.maxAlternatives = 1; r._res = []; r._vivo = false;
      r.start = function () {   // escucha hasta que «la persona hable» (algo llega a __oidos) o hasta que la corten
        window.__escuchas++; window.__langOido.push(r.lang); window.__sesiones.push({ continuo: r.continuous, at: Date.now() });
        if (micP.state === 'denied') { setTimeout(function () { if (r.onerror) r.onerror({ error: 'not-allowed' }); if (r.onend) r.onend(); }, 20); return; }
        if (cfg.redCaida) { window.__redCaidas = (window.__redCaidas || 0) + 1; setTimeout(function () { if (r.onerror) r.onerror({ error: 'network' }); if (r.onend) r.onend(); }, 40); return; }
        r._vivo = true; window.__recActivo = r; if (r.continuous) window.__recContinuo = r;
        setTimeout(function () { if (r._vivo && r.onstart) r.onstart(); }, 30);
        if (r.continuous && cfg.continuoRoto) { setTimeout(function () { if (!r._vivo) return; r._vivo = false; if (window.__recContinuo === r) window.__recContinuo = null; if (r.onend) r.onend(); }, 120); }   // como un navegador que corta la escucha continua al empezar
        var iv = setInterval(function () {
          if (!r._vivo) { clearInterval(iv); return; }
          if (!window.__oidos.length) return;
          var x = window.__oidos.shift();
          if (x === '__denegado') { clearInterval(iv); r._vivo = false; if (r.onerror) r.onerror({ error: 'not-allowed' }); if (r.onend) r.onend(); return; }
          if (r.continuous) {
            if (r.onspeechstart) r.onspeechstart();
            if (cfg.mudo) return;   // oye la voz pero nunca entrega texto
            var k = provisorio(r, x);
            if (cfg.sinFinales) return;   // solo resultados provisorios, sin final
            return setTimeout(function () { if (r._vivo) entregar(r, x, k); else window.__oidos.unshift(x); }, cfg.finalTarde || 250);
          }
          clearInterval(iv); r._vivo = false;
          if (r.onresult) r.onresult({ results: [[{ transcript: x }]] });
          if (r.onend) r.onend();
        }, 15);
        if (r.continuous && cfg.finSesionMs) setTimeout(function () { if (!r._vivo) return; r._vivo = false; clearInterval(iv); if (r.onend) r.onend(); }, cfg.finSesionMs);
      };
      r.abort = function () { r._vivo = false; if (window.__recActivo === r) window.__recActivo = null; if (window.__recContinuo === r) window.__recContinuo = null; };
      r.stop = r.abort;
    };
    Object.defineProperty(window, 'SpeechRecognition', { value: SR, configurable: true, writable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: SR, configurable: true, writable: true });
  }
})();
