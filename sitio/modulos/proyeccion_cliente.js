(function () {
// 19-11-2026 · «Proyección de crecimiento en Chile durante los próximos 4 años» (modulos/proyeccion.js arma el bloque en el servidor).
// En el navegador: 1) dibuja los dos gráficos (SVG, al ancho real, cuando el lector llega a ellos, y de nuevo si cambia el ancho o el
// idioma); 2) ayuda flotante al pasar el ratón, tocar con el dedo o usar el teclado; 3) cambia de idioma con el botón EN/ES; 4) saca las
// noticias que la edición ya trae en otra sección (para no leerlas dos veces) y deja máximo 4; 5) suma el tema al Índice, debajo de
// «Crecimiento de Chile».
'use strict';
var B = document.getElementById('proyw');
if (!B || B.__pc) return;
B.__pc = 1;
var D = document, R = D.documentElement, NS = 'http://www.w3.org/2000/svg', datos, en = false;
var NB = String.fromCharCode(160), MENOS = String.fromCharCode(8722);
try { datos = JSON.parse(B.querySelector('.pc-datos').textContent); } catch (e) { return; }
if (!datos || !datos.anios || !datos.consenso) return;

function pct(a) { return en ? a + '%' : String(a).replace('.', ',') + NB + '%'; }
function fmt(v) {   // una cifra: 2.5 → «2,5 %» (inglés: «2.5%»)
  if (v == null || !isFinite(v)) return '';
  var r = Math.round(v * 10) / 10;
  return (r < 0 ? MENOS : '') + pct(Math.abs(r).toFixed(1));
}
function fmtL(v) {   // con la precisión publicada: 2,75 → «2,75 %»; 3 → «3 %»
  if (v == null || !isFinite(v)) return '';
  return (v < 0 ? MENOS : '') + pct(String(Math.round(Math.abs(v) * 100) / 100));
}
function sinPct(t) { return String(t).replace(new RegExp(NB + '?%$'), ''); }
function nodo(tag, at, padre) {
  var e = D.createElementNS(NS, tag);
  for (var k in at) if (at[k] != null) e.setAttribute(k, at[k]);
  if (padre) padre.appendChild(e);
  return e;
}
function texto(x, y, s, cls, ancla, padre) { var t = nodo('text', { x: x, y: y, 'class': cls || null, 'text-anchor': ancla || 'start' }, padre); t.textContent = s; return t; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function escala(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) * (r1 - r0) / ((d1 - d0) || 1); }; }
function marcas(lo, hi) { var p = hi - lo > 7 ? 2 : 1, o = []; for (var v = Math.ceil(lo / p) * p; v <= hi + 1e-9; v += p) o.push(Math.round(v * 10) / 10); return o; }
function eje(v) { return (v < 0 ? MENOS : '') + pct(Math.abs(v)); }

// ---------- ayuda flotante ----------
function mostrar(cont, html, x, y) {
  var t = cont.querySelector('.pc-tt');
  if (!t) { t = D.createElement('div'); t.className = 'pc-tt'; t.setAttribute('aria-hidden', 'true'); cont.appendChild(t); }
  t.innerHTML = html;
  t.classList.add('pc-ver');
  var w = t.offsetWidth, h = t.offsetHeight, W = cont.clientWidth;
  var top = y - h - 12;
  t.style.left = Math.round(Math.max(0, Math.min(W - w, x - w / 2))) + 'px';
  t.style.top = Math.round(top < 0 ? y + 14 : top) + 'px';
}
function ocultar(cont) { var t = cont.querySelector('.pc-tt'); if (t) t.classList.remove('pc-ver'); if (cont.__salir) cont.__salir(); }
function conAyuda(cont, svg) {   // cada marca con data-tt muestra su ayuda
  function ver(ev) {
    var m = ev.target.closest ? ev.target.closest('[data-tt]') : null;
    if (!m || !svg.contains(m)) { if (!(ev.type === 'pointerdown' && ev.pointerType === 'touch')) ocultar(cont); return; }
    var r = m.getBoundingClientRect(), c = cont.getBoundingClientRect();
    mostrar(cont, m.getAttribute('data-tt'), r.left + r.width / 2 - c.left, r.top - c.top);
  }
  svg.addEventListener('pointerover', ver);
  svg.addEventListener('pointerdown', ver);
  svg.addEventListener('focusin', ver);
  svg.addEventListener('pointerleave', function (ev) { if (ev.pointerType !== 'touch') ocultar(cont); });   // con el dedo, queda hasta tocar fuera
  svg.addEventListener('focusout', function () { ocultar(cont); });
}

// ---------- 1. crecimiento esperado del PIB: promedio (azul), Banco Central (dorado) y las demás instituciones (aros) ----------
function dibujarPib(cont) {
  var W = Math.round(cont.clientWidth || 0);
  if (W < 200) return false;
  var H = Math.round(Math.max(270, Math.min(350, W * 0.66))), m = { t: 14, r: 10, b: 62, l: 40 };
  var anios = datos.anios, C = {}, vals = [];
  datos.consenso.forEach(function (c) { C[c.a] = c; vals.push(c.v, c.min, c.max); });
  datos.puntos.forEach(function (p) { if (anios.indexOf(p.a) >= 0) { vals.push(p.v); if (p.r) vals.push(p.r[0], p.r[1]); } });
  vals = vals.filter(function (v) { return v != null && isFinite(v); });
  if (!vals.length) return false;
  var lo = Math.min(0, Math.floor(Math.min.apply(null, vals) * 2 - 0.3) / 2), hi = Math.ceil(Math.max.apply(null, vals) + 0.3);
  var y = escala(lo, hi, H - m.b, m.t), banda = (W - m.l - m.r) / anios.length, sep = Math.min(22, banda * 0.22);
  var cx = function (i) { return m.l + banda * (i + 0.5); };
  var svg = nodo('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, focusable: 'false' });
  marcas(lo, hi).forEach(function (v) {
    nodo('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), 'class': v === 0 ? 'pc-cero' : 'pc-rej' }, svg);
    texto(m.l - 8, y(v) + 4, eje(v), null, 'end', svg);
  });
  var fila = [];
  anios.forEach(function (a, i) {   // bajo cada año, el promedio (con el punto azul que lo identifica); así ninguna cifra tapa un punto
    texto(cx(i), H - m.b + 19, a, null, 'middle', svg);
    var c = C[a];
    if (!c) return;
    fila.push([texto(cx(i) + 6, H - m.b + 37, fmt(c.v), 'pc-v', 'middle', svg), nodo('circle', { cx: cx(i) - 14, cy: H - m.b + 33, r: 4, fill: 'var(--pc-s1)' }, svg), cx(i) + 6]);
    if (c.n === 1) texto(cx(i), H - m.b + 53, en ? 'IMF only' : 'solo FMI', null, 'middle', svg).setAttribute('font-size', '11');
  });
  var linea = [];
  anios.forEach(function (a, i) {
    var c = C[a], x = cx(i);
    if (c && c.n > 1) nodo('line', { x1: x, x2: x, y1: y(c.min), y2: y(c.max), stroke: 'var(--pc-o)', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.35 }, svg);
    var otros = datos.puntos.filter(function (p) { return p.a === a && !p.bc; }).sort(function (p, q) { return p.v - q.v; });
    var prev = null, k = 0;
    otros.forEach(function (p) {   // los que caen casi en el mismo valor se abren hacia el lado
      k = prev != null && Math.abs(p.v - prev) < 0.18 ? k + 1 : 0;
      prev = p.v;
      var xo = x + sep + k * 7;
      nodo('circle', { cx: xo, cy: y(p.v), r: 4.5, fill: 'var(--card,#fff)', stroke: 'var(--pc-o)', 'stroke-width': 2 }, svg);
      nodo('circle', { cx: xo, cy: y(p.v), r: 11, fill: 'transparent', 'data-tt': '<b>' + esc(en ? p.ne : p.n) + '</b> · ' + a + ': ' + esc(fmtL(p.v)) }, svg);
    });
    datos.puntos.filter(function (p) { return p.a === a && p.bc; }).forEach(function (p) {
      var xb = x - sep;
      if (p.r) {
        nodo('line', { x1: xb, x2: xb, y1: y(p.r[0]), y2: y(p.r[1]), stroke: 'var(--pc-s2)', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
        [p.r[0], p.r[1]].forEach(function (v) { nodo('line', { x1: xb - 4, x2: xb + 4, y1: y(v), y2: y(v), stroke: 'var(--pc-s2)', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg); });
      }
      nodo('circle', { cx: xb, cy: y(p.v), r: 5.5, fill: 'var(--pc-s2)', stroke: 'var(--card,#fff)', 'stroke-width': 2 }, svg);
      var rg = p.r ? ' (' + (en ? 'range ' : 'rango ') + esc(sinPct(fmtL(p.r[0]))) + (en ? ' to ' : ' a ') + esc(fmtL(p.r[1])) + ')' : '';
      nodo('circle', { cx: xb, cy: y(p.v), r: 12, fill: 'transparent', 'data-tt': '<b>' + esc(en ? p.ne : p.n) + '</b> · ' + a + ': ' + esc(fmtL(p.v)) + (p.r ? (en ? ' midpoint' : ', punto medio') : '') + rg }, svg);
    });
    if (c) linea.push([x, y(c.v), c, a]);
  });
  if (linea.length > 1) nodo('polyline', { points: linea.map(function (p) { return p[0] + ',' + p[1]; }).join(' '), fill: 'none', stroke: 'var(--pc-s1)', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
  linea.forEach(function (p) {
    var c = p[2];
    nodo('circle', { cx: p[0], cy: p[1], r: 6, fill: 'var(--pc-s1)', stroke: 'var(--card,#fff)', 'stroke-width': 2 }, svg);
    var det = c.n > 1 ? (en ? c.n + ' institutions · range ' : c.n + ' instituciones · rango ') + sinPct(fmtL(c.min)) + (en ? ' to ' : ' a ') + fmtL(c.max) : (en ? 'IMF only' : 'solo el FMI');
    nodo('circle', { cx: p[0], cy: p[1], r: 13, fill: 'transparent', tabindex: 0, 'data-tt': '<b>' + p[3] + '</b> · ' + (en ? 'Average: ' : 'Promedio: ') + esc(fmt(c.v)) + '<br>' + esc(det) }, svg);
  });
  cont.textContent = '';
  cont.appendChild(svg);
  fila.forEach(function (f) {   // el punto azul justo antes de la cifra (se mide ya dibujada)
    var w = 0;
    try { w = f[0].getComputedTextLength(); } catch (e) { w = 0; }
    if (w > 0) f[1].setAttribute('cx', f[2] - w / 2 - 8);
  });
  conAyuda(cont, svg);
  return true;
}

// ---------- 2. inflación y desempleo según el FMI, con la meta de 3 % y la zona proyectada ----------
function dibujarFmi(cont) {
  var W = Math.round(cont.clientWidth || 0), F = datos.fmi || {};
  if (W < 200 || !F.anios) return false;
  var series = [['inflacion', 'var(--pc-s2)', en ? 'Inflation' : 'Inflación'], ['desempleo', 'var(--pc-s1)', en ? 'Unemployment' : 'Desempleo']]
    .filter(function (s) { return F[s[0]] && Object.keys(F[s[0]]).length > 1; });
  if (!series.length) return false;
  var anios = F.anios, H = Math.round(Math.max(250, Math.min(330, W * 0.62))), m = { t: 26, r: 14, b: 34, l: 36 };
  var meta = datos.meta || 3, vals = [meta];
  series.forEach(function (s) { anios.forEach(function (a) { var v = F[s[0]][a]; if (isFinite(v)) vals.push(v); }); });
  var lo = Math.min(0, Math.floor(Math.min.apply(null, vals))), hi = Math.ceil(Math.max.apply(null, vals) + 1);
  var x = escala(0, anios.length - 1, m.l + 8, W - m.r - 8), y = escala(lo, hi, H - m.b, m.t);
  var svg = nodo('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, focusable: 'false' });
  var ib = anios.indexOf(String(datos.base));
  if (ib >= 0) {
    var x0 = x(ib) - (x(1) - x(0)) / 2;
    nodo('rect', { x: x0, y: m.t, width: W - m.r - x0, height: H - m.b - m.t, fill: 'var(--pc-banda)', rx: 4 }, svg);
    texto(x0 + 6, m.t + 14, en ? 'Projection' : 'Proyección', null, 'start', svg);
  }
  marcas(lo, hi).forEach(function (v) {
    nodo('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), 'class': v === 0 ? 'pc-cero' : 'pc-rej' }, svg);
    texto(m.l - 8, y(v) + 4, eje(v), null, 'end', svg);
  });
  nodo('line', { x1: m.l, x2: W - m.r, y1: y(meta), y2: y(meta), stroke: 'var(--gris,#5f6670)', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
  var paso = anios.length > 6 && W < 420 ? 2 : 1;
  anios.forEach(function (a, i) { if (i % paso === 0) texto(x(i), H - m.b + 20, a, null, 'middle', svg); });
  var finales = [];
  series.forEach(function (s) {
    var pts = [];
    anios.forEach(function (a, i) { var v = F[s[0]][a]; if (isFinite(v)) pts.push([x(i), y(v), v, a, i]); });
    var real = pts.filter(function (p) { return ib < 0 || p[4] <= ib - 1; }), proy = pts.filter(function (p) { return ib >= 0 && p[4] >= ib - 1; });
    if (real.length > 1) nodo('polyline', { points: real.map(function (p) { return p[0] + ',' + p[1]; }).join(' '), fill: 'none', stroke: s[1], 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    if (proy.length > 1) nodo('polyline', { points: proy.map(function (p) { return p[0] + ',' + p[1]; }).join(' '), fill: 'none', stroke: s[1], 'stroke-width': 2, 'stroke-dasharray': '6 4', 'stroke-linejoin': 'round' }, svg);
    pts.forEach(function (p) { nodo('circle', { cx: p[0], cy: p[1], r: 4, fill: s[1], stroke: 'var(--card,#fff)', 'stroke-width': 1.5 }, svg); });
    if (pts.length) finales.push([pts[pts.length - 1], s]);
  });
  finales.sort(function (a, b) { return a[0][1] - b[0][1]; });   // el de más arriba lleva su nombre encima; el otro, debajo
  finales.forEach(function (f, i) {   // por encima (o por debajo) de todos los puntos que quedan bajo el nombre, para que la línea no lo cruce
    var p = f[0], t = f[1][2] + ' ' + fmt(p[2]), ancho = t.length * 7.4, ys = [];
    anios.forEach(function (a, k) { var v = F[f[1][0]][a]; if (isFinite(v) && x(k) >= p[0] - ancho - 6) ys.push(y(v)); });
    var yy = i === 0 ? Math.min.apply(null, ys.concat([p[1]])) - 10 : Math.max.apply(null, ys.concat([p[1]])) + 18;
    texto(p[0] - 4, Math.max(m.t + 12, Math.min(H - m.b - 4, yy)), t, 'pc-v', 'end', svg);
  });
  texto(m.l + 6, y(meta) + 15, (en ? 'Target ' : 'Meta ') + pct(meta), null, 'start', svg).setAttribute('font-size', '11');   // debajo de la línea, a la izquierda: ahí no pasa ninguna serie
  // cruz: el año más cercano al puntero (o con las flechas del teclado), con las dos cifras
  var cruz = nodo('line', { x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: 'var(--gris,#5f6670)', 'stroke-width': 1, opacity: 0 }, svg);
  var zona = nodo('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.b - m.t, fill: 'transparent', tabindex: 0, 'aria-label': en ? 'Values by year (use the arrow keys)' : 'Cifras por año (use las flechas)' }, svg);
  var actual = -1;
  function enAnio(i) {
    if (i < 0 || i >= anios.length) return;
    actual = i;
    var a = anios[i], partes = series.map(function (s) { var v = F[s[0]][a]; return isFinite(v) ? esc(s[2]) + ': ' + esc(fmt(v)) : ''; }).filter(Boolean);
    if (!partes.length) return;
    cruz.setAttribute('x1', x(i)); cruz.setAttribute('x2', x(i)); cruz.setAttribute('opacity', 0.5);
    var ys = series.map(function (s) { var v = F[s[0]][a]; return isFinite(v) ? y(v) : H; });
    mostrar(cont, '<b>' + a + (ib >= 0 && i >= ib ? (en ? ' · projection' : ' · proyección') : '') + '</b><br>' + partes.join('<br>'), x(i) * (cont.clientWidth / W), Math.min.apply(null, ys) * (cont.clientWidth / W));
  }
  function mover(ev) {
    var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), mejor = 0, d = 1e9;
    anios.forEach(function (a, i) { var dd = Math.abs(x(i) - px); if (dd < d) { d = dd; mejor = i; } });
    enAnio(mejor);
  }
  cont.__salir = function () { cruz.setAttribute('opacity', 0); };
  zona.addEventListener('pointermove', mover);
  zona.addEventListener('pointerdown', mover);
  zona.addEventListener('pointerleave', function (ev) { if (ev.pointerType !== 'touch') ocultar(cont); });   // con el dedo, queda hasta tocar fuera
  zona.addEventListener('blur', function () { ocultar(cont); });
  zona.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); enAnio(Math.max(0, Math.min(anios.length - 1, (actual < 0 ? Math.max(0, ib) : actual) + (ev.key === 'ArrowRight' ? 1 : -1)))); }
    if (ev.key === 'Escape') ocultar(cont);
  });
  zona.addEventListener('focus', function () { enAnio(actual < 0 ? Math.max(0, ib) : actual); });
  cont.textContent = '';
  cont.appendChild(svg);
  return true;
}

// ---------- dibujar solo lo que se ve, al ancho real ----------
var hechos = new WeakMap(), visto = false, espera = 0;
function dibujar(forzar) {
  [].forEach.call(B.querySelectorAll(':scope > .pc-l'), function (w) {
    if ((w.getAttribute('lang') === 'en') !== en) return;
    [].forEach.call(w.querySelectorAll('.pc-graf'), function (g) {
      var ancho = Math.round(g.clientWidth || 0), clave = ancho + (en ? 'en' : 'es');
      if (!ancho || (!forzar && hechos.get(g) === clave)) return;
      try {
        if ((g.getAttribute('data-g') === 'pib' ? dibujarPib : dibujarFmi)(g)) hechos.set(g, clave);
      } catch (e) { /* si un gráfico falla, la tabla de abajo tiene las mismas cifras */ }
    });
  });
}
function cuandoSeVea() {
  if (!('IntersectionObserver' in window)) { visto = true; dibujar(); return; }
  var io = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { visto = true; io.disconnect(); dibujar(); }
  }, { rootMargin: '600px 0px' });
  io.observe(B);
}
function otraVez() { if (!visto) return; clearTimeout(espera); espera = setTimeout(function () { dibujar(); }, 120); }
if ('ResizeObserver' in window) new ResizeObserver(otraVez).observe(B); else addEventListener('resize', otraVez);
addEventListener('beforeprint', function () { visto = true; dibujar(true); });

// ---------- noticias: sin repetir las que la edición ya trae ----------
var VACIAS = ' para como tras desde entre sobre pero este esta estos estas segun hasta ante cual cuando donde porque durante mientras tiene tienen sera seria millones chile chilena chileno ';
function palabras(s) {   // raíces de 6 letras de las palabras con contenido (y los montos de 3 cifras o más), como en GitHub
  var o = {}, n = 0;
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').forEach(function (w) {
    if (!(w.length >= 4 || (w.length === 3 && /^[0-9]+$/.test(w))) || VACIAS.indexOf(' ' + w + ' ') >= 0) return;
    w = w.slice(0, 6);
    if (!o[w]) { o[w] = 1; n++; }
  });
  return { p: o, n: n };
}
function parecidas(a, b) {
  if (a.n < 3 || b.n < 3) return false;
  var c = 0;
  for (var k in a.p) if (b.p[k]) c++;
  return c >= 3 && c / Math.min(a.n, b.n) >= 0.5;
}
function sinRepetir() {
  var otras = [];
  [].forEach.call(D.querySelectorAll('section.sec li, section.sec .pj-tit, section.sec .ca-tit, section.sec .fz-tit, section.sec h4'), function (el) {   // noticias, megaproyectos y fichas de la edición
    if (B.contains(el)) return;
    var t = (el.tagName === 'LI' && el.querySelector('strong')) || el;
    otras.push(palabras((t.textContent || '').slice(0, 200)));
  });
  [].forEach.call(B.querySelectorAll('.pc-noticias > .pc-notas'), function (ul) {
    [].slice.call(ul.children).forEach(function (li) {
      var p = palabras((li.querySelector('.pc-n-t') || li).textContent);
      for (var i = 0; i < otras.length; i++) if (parecidas(p, otras[i])) { li.parentNode.removeChild(li); return; }
    });
    [].slice.call(ul.children, 4).forEach(function (li) { li.parentNode.removeChild(li); });
    var resto = [].slice.call(ul.children, 3);   // la voz lee 3 (la sección 1 ya es larga): la cuarta va en una lista aparte que la voz salta
    if (resto.length) {
      var u2 = D.createElement('ul');
      u2.className = 'pc-notas';
      u2.setAttribute('data-voz', 'no');
      resto.forEach(function (li) { u2.appendChild(li); });
      ul.parentNode.insertBefore(u2, ul.nextSibling);
    }
    if (!ul.children.length) { var w = ul.closest('.pc-noticias'); if (w) w.parentNode.removeChild(w); }
  });
}

// ---------- Índice: el tema nuevo, debajo de «Crecimiento de Chile» ----------
function textoIndice() { var s = D.querySelector('#cnIdx .pc-ix'); if (s) s.textContent = s.getAttribute(en ? 'data-en' : 'data-es'); }
function indice() {
  var I = D.getElementById('cnIdx');
  if (!I) return false;
  if (I.querySelector('a[data-id="proyw"]')) return true;
  var ref = I.querySelector('a[data-id="crecw"]') || I.querySelector('a[data-id="economia"]');
  ref = ref && ref.closest('li');
  if (!ref) return false;
  var li = D.createElement('li'), a = D.createElement('a'), s = D.createElement('span');
  li.className = 'cn-sub';
  li.setAttribute('data-no-tr', '');
  a.href = '#proyw';
  a.setAttribute('data-id', 'proyw');
  s.className = 'pc-ix';
  s.setAttribute('data-es', 'Proyección de crecimiento: próximos 4 años');
  s.setAttribute('data-en', 'Growth outlook: next 4 years');
  a.appendChild(s);
  li.appendChild(a);
  ref.parentNode.insertBefore(li, ref.nextSibling);
  textoIndice();
  return true;
}

// ---------- idioma ----------
function idioma(l) {
  en = /^en/i.test(String(l || R.lang || ''));
  B.classList.toggle('pc-en', en);
  B.classList.toggle('pc-es', !en);
  [].forEach.call(B.querySelectorAll(':scope > .pc-l'), function (w) {
    if ((w.getAttribute('lang') === 'en') !== en) w.setAttribute('aria-hidden', 'true'); else w.removeAttribute('aria-hidden');
  });
  textoIndice();
  if (visto) dibujar(true);
}

D.addEventListener('pointerdown', function (ev) {   // tocar fuera de un gráfico cierra su ayuda
  [].forEach.call(B.querySelectorAll('.pc-graf'), function (g) { if (!g.contains(ev.target)) ocultar(g); });
}, true);
idioma(R.lang);
D.addEventListener('cofrade-idioma', function (e) { idioma(e && e.detail); });
try { sinRepetir(); } catch (e) { /* las noticias quedan como vienen */ }
if (!indice()) { D.addEventListener('DOMContentLoaded', indice); addEventListener('load', indice); }
cuandoSeVea();
})();
