// 20-11-2026 19:21 · Germán (captura de «Hoy en 60 segundos» con la ficha de Marejadas encerrada y «RESUMIR»): «De las fichas que
// aparecen en la portada del Newsletter, como es una mirada rápida de los principales temas, debes resumir el texto!!».
// Cada ficha (.chip60) es un vistazo: la Skill a veces copia ahí el aviso completo (zona, días, horas, emisión) y la tarjeta crece
// hasta doblar a las otras. Aquí, al pasar la página, toda ficha de más de 80 letras se resume en una línea corta; el detalle completo
// sigue en su sección (la ficha es un enlace a ella). Las marejadas se resumen como «Aviso vigente · zona · hasta el lunes 23», con su
// versión en inglés; cualquier otra ficha larga se corta en su primera frase. Las fichas cortas pasan intactas, byte por byte.
const MAX60 = 80;
const DIAS_EN = { lunes: "Monday", martes: "Tuesday", "miércoles": "Wednesday", jueves: "Thursday", viernes: "Friday", "sábado": "Saturday", domingo: "Sunday" };
const NEGRITA_EN = { "aviso vigente": "Warning in effect", "alerta vigente": "Alert in effect", "sin avisos": "No warnings" };
const esc60 = (s) => String(s).replace(/&(?!(?:[a-z]+|#\d+|#x[\da-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plano = (s) => String(s).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function cortar(t, n) {
  if (t.length <= n) return t;
  const c = t.slice(0, n + 1).replace(/[\s,;:·-]+\S*$/, "");
  return (c || t.slice(0, n)).replace(/[\s,;:·-]+$/, "") + "…";
}

// segs: [[negrita, texto crudo]] en orden. Devuelve el HTML de la ficha (igual al original si es corta).
function resumir60(segs) {
  const crudo = segs.map(([b, t]) => (b ? `<b>${t}</b>` : t)).join("").replace(/<\/b><b>/g, "");
  const todo = plano(segs.map((s) => s[1]).join(""));
  if (todo.length <= MAX60) return { html: crudo };
  const i = segs.findIndex((s) => s[0]);
  const neg = i >= 0 ? plano(segs.filter((s) => s[0]).map((s) => s[1]).join("")) : "";
  const resto = plano(segs.filter((s) => !s[0]).map((s) => s[1]).join("")).replace(/^[\s·,:;-]+/, "");
  if (/marejada/i.test(resto)) {
    const z = resto.match(/:\s*([^,;]+?)\s*(?:,|;|$)/);
    const h = resto.match(/\bal\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})\b/i);
    if (z) {
      const zona = z[1].replace(/\s+hasta\s+/i, " a ").replace(/Archipi[eé]lago\s+(de\s+)?Juan Fern[aá]ndez/i, "J. Fernández").trim();
      const dia = h ? h[1].toLowerCase().replace("miercoles", "miércoles").replace("sabado", "sábado") : "";
      const es = `${neg ? `<b>${esc60(neg)}</b> · ` : ""}${esc60(cortar(zona, 52))}${h ? ` · hasta el ${dia} ${h[2]}` : ""}`;
      const negEn = NEGRITA_EN[neg.toLowerCase()] || "";
      const zonaEn = zona.replace(/\s+a\s+/, " to ").replace(/Golfo de /g, "Gulf of ").replace(/\s+y\s+/g, " and ");
      const en = negEn ? `<b>${esc60(negEn)}</b> · ${esc60(cortar(zonaEn, 52))}${h ? ` · until ${DIAS_EN[dia] || dia} ${h[2]}` : ""}` : "";
      return { html: es, en, completo: todo };
    }
  }
  const frase = resto.split(/\s*(?:;|\s\(|\.\s)/)[0];
  const n = Math.max(24, MAX60 - (neg ? neg.length + 3 : 0));
  return { html: `${neg ? `<b>${esc60(neg)}</b> · ` : ""}${esc60(cortar(frase, n))}`, completo: todo };
}

function sesenta() {
  let segs = null, negrita = false;
  return {
    v: {
      element(e) {
        segs = []; negrita = false;
        e.onEndTag((fin) => {
          const s = segs; segs = null;
          if (!s || !s.length) return;
          const r = resumir60(s);
          const html = r.en
            ? `<span class="cn60" data-no-tr translate="no" data-en="${esc60(r.en)}">${r.html}</span>`
            : r.html;
          fin.before(html, { html: true });
        });
      },
      text(t) { if (segs) { if (t.text) segs.push([negrita, t.text]); t.remove(); } },
    },
    b: { element(e) { if (!segs) return; negrita = true; e.removeAndKeepContent(); e.onEndTag(() => { negrita = false; }); } },
    cuerpo: { element(e) { e.append(SESENTA_JS, { html: true }); } },
  };
}

// Las fichas resumidas con versión en inglés siguen al botón ES/EN como el resto de la edición.
const SESENTA_JS = `<script>(function(){var E=[].slice.call(document.querySelectorAll('.cn60[data-en]'));if(!E.length)return;
E.forEach(function(e){e.setAttribute('data-es',e.innerHTML)});
function f(l){var en=/^en/i.test(String(l||''));E.forEach(function(e){var t=e.getAttribute(en?'data-en':'data-es');if(t!=null&&e.innerHTML!==t)e.innerHTML=t})}
f(document.documentElement.lang);document.addEventListener('cofrade-idioma',function(e){f(e.detail)})})();<\/script>`;
