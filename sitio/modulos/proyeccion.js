// 19-11-2026 · «Proyección de crecimiento en Chile durante los próximos 4 años» (Germán, 15:27: «agregar después de la sección
// "Crecimiento de Chile 2026: ¿cuánto crecerá la economía?" y antes de la sección "Perspectivas de Desarrollo para Chile 2050" una nueva
// sección… basándote en el Banco Central de Chile y junto con los principales Organismos internacionales que analizan esta información
// para publicar gráficos y noticias que detallen cuál es la tendencia y los indicadores esperados durante los próximos años»).
// Los datos los arma GitHub cada día (bajar.py → datos/proyecciones-chile.json): el FMI desde su base de datos oficial, la Encuesta de
// Expectativas desde el Banco Central, las demás instituciones verificadas con fecha y enlace, y las noticias de los titulares del día.
// Aquí se arma el bloque (español e inglés) justo después de «Crecimiento de Chile»; los gráficos los dibuja el navegador
// (modulos/proyeccion_cliente.js), que además suma el tema al Índice. Si el archivo no llega o viene incompleto, la edición queda como
// salió (nunca un bloque vacío). Va desde la edición del 19-11-2026: las anteriores quedan tal como se publicaron.
const PROY_DESDE = "2026-11-19";
const PROY_META = 3;   // meta de inflación del Banco Central de Chile (3 % anual)
const PROY_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const PROY_MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pcEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function pcLimpio(t) {   // menos tipográfico → «-»; «2-3» → «2 a 3» (un rango, no 2 y −3)
  return String(t == null ? "" : t).replace(/[−–]/g, "-").replace(/(\d)\s*-\s*(?=\d)/g, "$1 a ");
}
function pcNum(t) {   // «0,25 a 0,75» → 0,5 (centro del rango); «2,4» o «2.4» → 2,4; «-1,8» → -1,8
  const xs = pcLimpio(t).match(/-?\d+(?:[.,]\d+)?/g);
  if (!xs) return null;
  const v = xs.slice(0, 2).map((x) => Number(x.replace(",", ".")));
  return v.every(Number.isFinite) ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function pcRango(t) {   // «2 a 3» → [2, 3]; un solo número → null
  const xs = pcLimpio(t).match(/-?\d+(?:[.,]\d+)?/g);
  return xs && xs.length >= 2 ? [Number(xs[0].replace(",", ".")), Number(xs[1].replace(",", "."))] : null;
}
function pcFmt(v, en, dec = 1) {   // 2.5 → «2,5 %» / «2.5%»; -0.4 → «−0,4 %» (redondeo igual para positivos y negativos)
  if (v == null || !Number.isFinite(v)) return "";
  const r = Math.sign(v) * Math.round(Math.abs(v) * 10 ** dec) / 10 ** dec, a = Math.abs(r).toFixed(dec);
  return (r < 0 ? "−" : "") + (en ? a + "%" : a.replace(".", ",") + " %");
}
function pcFmtL(v, en) {   // con la precisión publicada: 4,25 → «4,25 %»; 4,5 → «4,5 %»
  if (v == null || !Number.isFinite(v)) return "";
  const a = String(Math.round(Math.abs(v) * 100) / 100);
  return (v < 0 ? "−" : "") + (en ? a + "%" : a.replace(".", ",") + " %");
}
function pcCelda(t, en) {   // como lo publicó la institución: «2 a 3» → «2–3»; «2,7» → «2,7» (inglés: «2.7»); lo que no es número, vacío
  const s = String(t == null ? "" : t).trim();
  if (!s) return "";
  const r = pcRango(s), n = pcNum(s);
  if (!r && n == null) return "";
  const f = (x) => { const a = Math.abs(x).toString(); return (x < 0 ? "−" : "") + (en ? a : a.replace(".", ",")); };
  return r ? f(r[0]) + "–" + f(r[1]) : f(n);
}
function pcMes(iso) {   // «2026-11-…» → 10 (índice del mes) o -1 si no es una fecha válida
  const m = String(iso || "").match(/^\d{4}-(\d{2})/), k = m ? Number(m[1]) - 1 : -1;
  return k >= 0 && k < 12 ? k : -1;
}
function pcFecha(iso, en) {   // «2026-11-19» → «19 de noviembre de 2026» / «November 19, 2026»
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/), k = pcMes(iso);
  if (!m || k < 0) return "";
  return en ? `${PROY_MESES_EN[k]} ${Number(m[3])}, ${m[1]}` : `${Number(m[3])} de ${PROY_MESES[k]} de ${m[1]}`;
}
function pcFechaCorta(iso, en) {   // «2026-11-18» → «18 nov» / «Nov 18»
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/), k = pcMes(iso);
  if (!m || k < 0) return "";
  return en ? `${PROY_MESES_EN[k].slice(0, 3)} ${Number(m[3])}` : `${Number(m[3])} ${PROY_MESES[k].slice(0, 3)}`;
}
function pcMesInforme(x, en) {   // fecha del informe para leer: «septiembre de 2026» / «September 2026»
  if (en && x.fecha_texto_en) return String(x.fecha_texto_en);
  if (!en && x.fecha_texto) return String(x.fecha_texto);
  const m = String(x.fecha || "").match(/^(\d{4})-/), k = pcMes(x.fecha);
  return m && k >= 0 ? (en ? `${PROY_MESES_EN[k]} ${m[1]}` : `${PROY_MESES[k]} de ${m[1]}`) : "";
}

function proyeccionValida(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.instituciones) || !Array.isArray(d.anios) || d.anios.length < 4) return false;
  if (!Number.isInteger(d.anio_base) || !d.anios.slice(0, 4).every((a, i) => String(a) === String(d.anio_base + 1 + i))) return false;   // años de verdad, en orden
  const a1 = d.anios[0], p = d.promedio || {};
  return d.instituciones.filter((x) => x && x.activo !== false).length >= 3 && !!p[a1] && Number.isFinite(p[a1].valor) && Number.isFinite(p[a1].n);
}

async function proyeccionLeer(fecha, ctx) {
  if (!fecha || fecha < PROY_DESDE) return null;
  try {
    // Cada edición lee la foto de su fecha (datos/proyecciones/AAAA-MM-DD.json): una edición pasada no cambia nunca. La de hoy, si su
    // foto aún no está, usa el archivo del día. Un «no está» se recuerda 2 minutos para no preguntarle a GitHub en cada visita.
    const hoy = fechaChile(), neg = new Request("https://cache.cofrad.es/neg/proyecciones/" + fecha);
    let r = null;
    if (!(await caches.default.match(neg))) {
      r = await desdeGitHub(`datos/proyecciones/${fecha}.json`, fecha < hoy ? 86400 : 1800, ctx);
      if (!r) ctx.waitUntil(caches.default.put(neg, new Response("0", { headers: { "Cache-Control": "public, max-age=120" } })).catch(() => {}));
    }
    if (!r && fecha === hoy) r = await desdeGitHub("datos/proyecciones-chile.json", 1800, ctx);
    if (!r) return null;
    const ver = String(r.headers.get("X-Cn-Fuente") || r.headers.get("X-Cn-Guardado") || "").replace(/[^\w.-]/g, "").slice(0, 40);
    const d = await r.json();
    return proyeccionValida(d) ? { d, ver } : null;
  } catch (e) {
    return null;
  }
}

// Las cifras que usan el bloque y los gráficos (una sola cuenta para los dos idiomas)
function proyeccionCifras(d) {
  const base = Number(d.anio_base), anios = [String(base), ...d.anios.slice(0, 4).map(String)];
  const inst = d.instituciones.filter((x) => x && x.clave && x.pib && x.activo !== false);   // las de hace más de ~6 meses no se muestran
  const prom = d.promedio || {};
  const puntos = [];
  for (const x of inst) for (const a of anios) {
    const v = pcNum((x.pib || {})[a]);
    if (v == null) continue;
    puntos.push({ k: x.clave, n: x.corto || x.institucion, ne: x.corto_en || x.corto || x.institucion, a, v, r: pcRango((x.pib || {})[a]), bc: x.clave === "bcch_ipom" });
  }
  const consenso = anios.map((a) => (prom[a] && Number.isFinite(prom[a].valor) ? { a, v: prom[a].valor, min: prom[a].min, max: prom[a].max, n: prom[a].n } : null)).filter(Boolean);
  const infl = {};
  for (const a of anios) {
    const vs = inst.map((x) => pcNum((x.inflacion || {})[a])).filter((v) => v != null);
    if (vs.length) infl[a] = { v: vs.reduce((s, v) => s + v, 0) / vs.length, n: vs.length };
  }
  const fmi = (d.fmi && d.fmi.series) || {};
  return { base, anios, inst, prom, puntos, consenso, infl, fmi };
}

function proyeccionKpis(c, en) {
  const [a0, a1, a2, a3, a4] = c.anios, P = c.prom, k = [];
  const kpi = (n, v, dd) => `<div class="kpi"><span class="kn">${pcEsc(n)}</span><span class="kv">${pcEsc(v)}</span><span class="kd">${pcEsc(dd)}</span></div>`;
  const rango = (p) => (p.n > 1 ? (en ? `range ${pcFmt(p.min, true)} to ${pcFmt(p.max, true)}` : `rango ${pcFmt(p.min, false).replace(" %", "")} a ${pcFmt(p.max, false)}`) : "");
  const quien = (p) => (p.n === 1 ? (en ? "one institution" : "una institución") : en ? `average of ${p.n} institutions` : `promedio de ${p.n} instituciones`);
  for (const a of [a1, a2]) if (P[a]) k.push(kpi(en ? `GDP growth ${a}` : `Crecimiento del PIB ${a}`, pcFmt(P[a].valor, en), [quien(P[a]), rango(P[a])].filter(Boolean).join(" · ")));
  if (P[a1] && P[a2] && P[a3] && P[a4]) {   // cuánto más grande sería la economía en 4 años si se cumple el promedio de cada año
    const acum = ([a1, a2, a3, a4].reduce((x, a) => x * (1 + P[a].valor / 100), 1) - 1) * 100;
    const solos = [a1, a2, a3, a4].filter((a) => P[a].n === 1), lista = solos.length > 1 ? solos.slice(0, -1).join(", ") + (en ? " and " : " y ") + solos[solos.length - 1] : solos.join("");
    k.push(kpi(en ? `Cumulative growth ${a1}–${a4}` : `Crecimiento acumulado ${a1}–${a4}`, (acum >= 0 ? "+" : "") + pcFmt(acum, en),
      en ? `if each year's average holds${solos.length ? ` (${lista}: IMF only)` : ""}` : `si se cumple el promedio de cada año${solos.length ? ` (${lista}: solo FMI)` : ""}`));
  }
  const inf = c.infl[a1];
  if (inf && inf.n >= 2) k.push(kpi(en ? `Inflation ${a1}` : `Inflación ${a1}`, pcFmt(inf.v, en), en ? `average of ${inf.n} · Central Bank target: 3%` : `promedio de ${inf.n} · meta del Banco Central: 3 %`));
  else if (P[a0]) k.push(kpi(en ? `GDP growth ${a0}` : `Crecimiento del PIB ${a0}`, pcFmt(P[a0].valor, en), quien(P[a0])));
  return k.length >= 3 ? `<div class="kpis">${k.join("")}</div>` : "";
}

function proyeccionResumen(c, d, en) {
  const [a0, a1, a2, a3, a4] = c.anios, P = c.prom, f = (v) => pcFmt(v, en), o = [];
  if (P[a1] && P[a2]) {
    o.push(en ? `Institutions expect Chile's economy to grow ${f(P[a1].valor)} in ${a1} and ${f(P[a2].valor)} in ${a2}`
      : `Las instituciones esperan que la economía chilena crezca ${f(P[a1].valor)} en ${a1} y ${f(P[a2].valor)} en ${a2}`);
    if (P[a0]) o[0] += en ? `, after ${f(P[a0].valor)} in ${a0}.` : `, después de ${f(P[a0].valor)} en ${a0}.`;
    else o[0] += ".";
  }
  if (P[a3] && P[a4]) {
    const solo = P[a3].n === 1 && P[a4].n === 1;
    const igual = f(P[a3].valor) === f(P[a4].valor);
    o.push(en ? `For ${a3} and ${a4}${solo ? ", the IMF projects" : ", the projections point to"} ${igual ? f(P[a3].valor) + " in both years" : f(P[a3].valor) + " and " + f(P[a4].valor)}.`
      : `Para ${a3} y ${a4}${solo ? ", el FMI proyecta" : ", las proyecciones apuntan a"} ${igual ? f(P[a3].valor) + " en ambos años" : f(P[a3].valor) + " y " + f(P[a4].valor)}.`);
  }
  const inf = c.infl[a1];
  if (inf && inf.n >= 2) {
    const dif = inf.v - PROY_META;
    const donde = Math.abs(dif) <= 0.3 ? (en ? "close to" : "cerca de") : dif > 0 ? (en ? "above" : "sobre") : (en ? "below" : "bajo");
    o.push(en ? `Inflation in ${a1} would be around ${f(inf.v)}, ${donde} the Central Bank's 3% target.` : `La inflación de ${a1} rondaría ${f(inf.v)}, ${donde} la meta de 3 % del Banco Central.`);
  }
  const t = d.tpm_esperada && Array.isArray(d.tpm_esperada.trayectoria) ? d.tpm_esperada.trayectoria.filter((x) => Array.isArray(x) && Number.isFinite(x[1])) : [];
  if (t.length >= 2) {
    const ult = t[t.length - 1], m = String(ult[0]).match(/^(\d{4})-(\d{2})/);
    if (m && pcMes(ult[0]) >= 0 && Number.isFinite(t[0][1])) {
      const cuando = en ? `${PROY_MESES_EN[Number(m[2]) - 1]} ${m[1]}` : `${PROY_MESES[Number(m[2]) - 1]} de ${m[1]}`;
      const g = (v) => pcFmtL(v, en), dif = ult[1] - t[0][1];
      o.push(Math.abs(dif) < 0.01
        ? (en ? `Economists surveyed by the Central Bank expect the monetary policy rate to stay at ${g(ult[1])} through ${cuando}.`
          : `Los economistas que encuesta el Banco Central esperan que la tasa de política monetaria se mantenga en ${g(ult[1])} hasta ${cuando}.`)
        : (en ? `Economists surveyed by the Central Bank expect the monetary policy rate to ${dif < 0 ? "fall" : "rise"} from ${g(t[0][1])} this month to ${g(ult[1])} by ${cuando}.`
          : `Los economistas que encuesta el Banco Central esperan que la tasa de política monetaria ${dif < 0 ? "baje" : "suba"} de ${g(t[0][1])} este mes a ${g(ult[1])} hacia ${cuando}.`));
    }
  }
  return o.length ? `<p class="pc-resumen"><b>${en ? "In short:" : "En resumen:"}</b> ${pcEsc(o.join(" "))}</p>` : "";
}

function proyeccionTablaInst(c, en) {
  const filas = c.inst.map((x) => {
    const inf = pcMesInforme(x, en) || "", via = x.via ? (en ? ` (via ${x.via})` : ` (vía ${x.via})`) : "";
    const celdas = c.anios.map((a) => { const t = pcCelda((x.pib || {})[a], en); return `<td class="pc-n"${t ? "" : ` aria-label="${en ? "no projection" : "sin proyección"}"`}>${t ? pcEsc(t) : "·"}</td>`; }).join("");
    return `<tr><th scope="row"><b>${pcEsc(en ? x.corto_en || x.corto : x.corto)}</b><br><span class="pc-inf">${pcEsc(inf)}${pcEsc(via)}</span></th>${celdas}</tr>`;
  }).join("");
  const prom = c.anios.map((a) => `<td class="pc-n"><b>${c.prom[a] ? pcEsc(pcFmt(c.prom[a].valor, en).replace(/ ?%$/, "")) : "·"}</b></td>`).join("");
  return `<div class="tabla pc-tabla" data-voz="no"><table><caption>${en ? "GDP growth projections by institution (% per year)" : "Proyecciones de crecimiento del PIB por institución (% anual)"}</caption>`
    + `<thead><tr><th scope="col">${en ? "Institution and report" : "Institución e informe"}</th>${c.anios.map((a) => `<th scope="col" class="pc-n">${a}</th>`).join("")}</tr></thead>`
    + `<tbody>${filas}</tbody><tfoot><tr><th scope="row">${en ? "Average (reports from the last 6 months)" : "Promedio (informes de los últimos 6 meses)"}</th>${prom}</tr></tfoot></table></div>`;
}

function proyeccionTablaFmi(c, en) {
  const S = c.fmi, filas = [["pib", "Crecimiento del PIB (% anual)", "GDP growth (% per year)"], ["inflacion", "Inflación (% promedio del año)", "Inflation (% yearly average)"],
    ["desempleo", "Desempleo (% de la fuerza de trabajo)", "Unemployment (% of labor force)"], ["cuenta_corriente", "Cuenta corriente (% del PIB)", "Current account (% of GDP)"],
    ["deuda", "Deuda pública bruta (% del PIB)", "Gross public debt (% of GDP)"]].filter((f) => S[f[0]] && c.anios.some((a) => Number.isFinite(S[f[0]][a])));
  if (filas.length < 3) return "";
  const cuerpo = filas.map((f) => `<tr><td>${pcEsc(en ? f[2] : f[1])}</td>${c.anios.map((a) => { const v = S[f[0]][a]; return `<td class="pc-n">${Number.isFinite(v) ? pcEsc(pcFmt(v, en).replace(/ ?%$/, "")) : "·"}</td>`; }).join("")}</tr>`).join("");
  return `<div class="tabla pc-tabla" data-voz="no"><table><caption>${en ? "Indicators expected by the IMF for Chile" : "Indicadores esperados por el FMI para Chile"}</caption>`
    + `<thead><tr><th scope="col">${en ? "Indicator" : "Indicador"}</th>${c.anios.map((a) => `<th scope="col" class="pc-n">${a}</th>`).join("")}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
}

function proyeccionNoticias(d, en) {
  const n = (Array.isArray(d.noticias) ? d.noticias : []).filter((x) => x && x.titulo && /^https:\/\//.test(String(x.url || ""))).slice(0, 6);
  if (!n.length) return "";
  const li = n.map((x) => `<li><a class="pc-n-t" href="${pcEsc(x.url)}" target="_blank" rel="noopener">${pcEsc(x.titulo)}</a> <span class="fuente"><a href="${pcEsc(x.url)}" target="_blank" rel="noopener">${pcEsc(x.fuente || (en ? "Source" : "Fuente"))}</a> · ${pcEsc(pcFechaCorta(x.fecha, en))}</span></li>`).join("");
  return `<div class="pc-noticias"><h4 class="pc-h4">${en ? "News from these days" : "Noticias de estos días"}</h4><ul class="pc-notas">${li}</ul></div>`;
}

function proyeccionFuentes(c, d, en) {
  const L = c.inst.map((x) => {   // enlace solo si es https; sin «undefined» si falta un dato
    const t = pcEsc([en ? x.institucion_en || x.corto_en || x.institucion : x.institucion, en ? x.informe_en || x.informe : x.informe].filter(Boolean).join(": ") + (x.via ? (en ? ", via " : ", vía ") + x.via : ""));
    return /^https:\/\//.test(String(x.url || "")) ? `<a href="${pcEsc(x.url)}" target="_blank" rel="noopener">${t}</a>` : t;
  });
  if (d.fmi && /^https:\/\//.test(String(d.fmi.url || ""))) L.push(`<a href="${pcEsc(d.fmi.url)}" target="_blank" rel="noopener">${en ? "IMF DataMapper (official database)" : "FMI, base de datos oficial (DataMapper)"}</a>`);
  return `<p class="fuente">${en ? "Sources" : "Fuentes"}: ${L.join(" · ")}</p>`;
}

function proyeccionBloque(d, en) {
  const c = proyeccionCifras(d), [a0, a1, , , a4] = c.anios;
  const al = pcFecha(String(d.generado || "").slice(0, 10), en);
  const nombres = c.inst.map((x) => (en ? x.corto_en || x.corto : x.corto));
  const ley = en
    ? `<p class="pc-ley" aria-hidden="true"><span><i class="pc-l1"></i>Average of the institutions</span><span><i class="pc-l2"></i>Central Bank (IPoM, midpoint and range)</span><span><i class="pc-l3"></i>Other institutions</span></p>`
    : `<p class="pc-ley" aria-hidden="true"><span><i class="pc-l1"></i>Promedio de las instituciones</span><span><i class="pc-l2"></i>Banco Central (IPoM, punto medio y rango)</span><span><i class="pc-l3"></i>Otras instituciones</span></p>`;
  const ley2 = en
    ? `<p class="pc-ley" aria-hidden="true"><span><i class="pc-l2"></i>Inflation</span><span><i class="pc-l1"></i>Unemployment</span><span><i class="pc-lm"></i>3% inflation target</span></p>`
    : `<p class="pc-ley" aria-hidden="true"><span><i class="pc-l2"></i>Inflación</span><span><i class="pc-l1"></i>Desempleo</span><span><i class="pc-lm"></i>Meta de inflación de 3 %</span></p>`;
  const conFmi = c.fmi.inflacion && c.fmi.desempleo;
  const figs = `<div class="dos pc-dos"><figure class="pc-fig" data-voz="no"><figcaption class="sub tabtit"><b>${en ? "Expected GDP growth" : "Crecimiento esperado del PIB"}</b> ${en ? "(% per year; each dot is one institution)" : "(% anual; cada punto es una institución)"}</figcaption>${ley}<div class="pc-graf" data-g="pib" role="img" aria-label="${pcEsc(c.consenso.map((p) => `${p.a}: ${pcFmt(p.v, en)}`).join(", "))}"></div></figure>`
    + (conFmi ? `<figure class="pc-fig" data-voz="no"><figcaption class="sub tabtit"><b>${en ? "Inflation and unemployment according to the IMF" : "Inflación y desempleo según el FMI"}</b> ${en ? `(%; shaded from ${a0}: projection)` : `(%; sombreado desde ${a0}: proyección)`}</figcaption>${ley2}<div class="pc-graf" data-g="fmi" role="img" aria-label="${pcEsc(en ? "IMF: inflation and unemployment" : "FMI: inflación y desempleo")}"></div></figure>` : "")
    + `</div>`;
  const solo = c.anios.filter((a) => c.prom[a] && c.prom[a].n === 1), ys = solo.length === 2 ? solo.join(en ? " and " : " y ") : solo.join(", ");
  const leer = en
    ? `<p class="sub leer"><b>How to read:</b> the average uses the projections published in the last six months; when an institution gives a range (the Central Bank), its midpoint is used.${solo.length ? ` For ${ys} only the IMF publishes a projection.` : ""} The IMF figures and the Central Bank survey refresh automatically; the others change when each institution publishes a new report. Inflation mixes yearly averages and December figures, as each source publishes it.</p>`
    : `<p class="sub leer"><b>Cómo leer:</b> el promedio usa las proyecciones publicadas en los últimos seis meses; cuando una institución entrega un rango (el Banco Central), se toma el punto medio.${solo.length ? ` Para ${ys} solo el FMI publica una proyección.` : ""} Las cifras del FMI y la Encuesta del Banco Central se actualizan solas; las demás cambian cuando cada institución publica un informe nuevo. La inflación mezcla promedios del año y cifras a diciembre, tal como las publica cada fuente.</p>`;
  return `<div class="pc-l" lang="${en ? "en" : "es"}">`
    + `<p class="bloque-kick">${en ? `Central Bank and international organizations · figures as of ${pcEsc(al)}` : `Banco Central y organismos internacionales · cifras al ${pcEsc(al)}`}</p>`
    + `<h3 class="bloque-tit">${en ? "Chile's growth outlook for the next 4 years" : "Proyección de crecimiento en Chile durante los próximos 4 años"}</h3>`
    + `<p class="sub" data-voz="no">${pcEsc(en ? `What ${nombres.join(", ")} expect for ${a1} to ${a4}.` : `Qué esperan para ${a1} a ${a4}: ${nombres.join(", ")}.`)}</p>`
    + proyeccionResumen(c, d, en)
    + `<div data-voz="no">${proyeccionKpis(c, en)}</div>`
    + figs
    + proyeccionTablaInst(c, en)
    + proyeccionTablaFmi(c, en)
    + proyeccionNoticias(d, en)
    + leer
    + proyeccionFuentes(c, d, en)
    + `</div>`;
}

function proyeccionDatosGraf(d) {   // lo mínimo que necesitan los dos gráficos del navegador
  const c = proyeccionCifras(d), S = c.fmi, anios = c.anios, hist = [];
  for (let a = c.base - 3; a <= c.base + 5; a++) hist.push(String(a));
  const serie = (k) => { const o = {}; for (const a of hist) if (S[k] && Number.isFinite(S[k][a])) o[a] = S[k][a]; return o; };
  return { base: c.base, anios, meta: PROY_META, consenso: c.consenso, puntos: c.puntos.map((p) => ({ k: p.k, n: p.n, ne: p.ne, a: p.a, v: Math.round(p.v * 100) / 100, r: p.r, bc: p.bc || undefined })),
    fmi: { anios: hist, inflacion: serie("inflacion"), desempleo: serie("desempleo") } };
}

function proyeccionHtml(d) {
  const datos = JSON.stringify(proyeccionDatosGraf(d)).replace(/</g, "\\u003c");
  return `<div class="cr-bloque pc-bloque" id="proyw" data-no-tr>${proyeccionBloque(d, false)}${proyeccionBloque(d, true)}`
    + `<script type="application/json" class="pc-datos">${datos}</script></div>`;
}

const PROY_CSS = `<style id="cnProy">
.pc-bloque{--pc-s1:#2a78d6;--pc-s2:#B8892B;--pc-o:#7a808a;--pc-banda:rgba(11,31,58,.05);--pc-rej:rgba(11,31,58,.10)}
html[data-theme="dark"] .pc-bloque{--pc-s1:#3987e5;--pc-s2:#B8892B;--pc-o:#a3abb8;--pc-banda:rgba(255,255,255,.06);--pc-rej:rgba(255,255,255,.12)}
.pc-bloque>.pc-l[lang="en"],.pc-bloque.pc-en>.pc-l[lang="es"],html[lang^="en"] .pc-bloque:not(.pc-es)>.pc-l[lang="es"]{display:none}
.pc-bloque.pc-en>.pc-l[lang="en"],html[lang^="en"] .pc-bloque:not(.pc-es)>.pc-l[lang="en"]{display:block}
.pc-bloque .pc-resumen{font-size:clamp(16px,1.9vw,18px);line-height:1.55;color:var(--tinta);margin:14px 0 4px;max-width:70ch}
.pc-bloque .pc-resumen b{color:var(--oro-texto,#8A6416)}
.pc-bloque .pc-dos{margin-top:18px}.pc-bloque .pc-fig{margin:0;min-width:0}
.pc-bloque .pc-ley{display:flex;flex-wrap:wrap;gap:4px 16px;margin:6px 0 2px;font:13px/1.4 var(--sans,system-ui,sans-serif);color:var(--gris,#5f6670)}
.pc-bloque .pc-ley i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.pc-bloque .pc-l1{background:var(--pc-s1)}.pc-bloque .pc-l2{background:var(--pc-s2)}.pc-bloque .pc-l3{border:2px solid var(--pc-o);box-sizing:border-box}
.pc-bloque .pc-lm{border-radius:0!important;height:0!important;width:16px!important;border-top:2px dashed var(--gris,#5f6670);vertical-align:3px!important}
.pc-bloque .pc-graf{position:relative;min-height:250px;touch-action:pan-y}
.pc-bloque .pc-graf svg{display:block;width:100%;height:auto;overflow:visible}
.pc-bloque .pc-graf text{font:12px var(--sans,system-ui,sans-serif);fill:var(--gris,#5f6670)}
.pc-bloque .pc-graf text.pc-v{font-weight:700;fill:var(--tinta,#0B1F3A)}
.pc-bloque .pc-graf .pc-rej{stroke:var(--pc-rej);stroke-width:1}.pc-bloque .pc-graf .pc-cero{stroke:var(--gris,#5f6670);stroke-width:1;opacity:.6}
.pc-bloque .pc-tt{position:absolute;z-index:6;pointer-events:none;max-width:240px;padding:7px 10px;border-radius:8px;background:var(--card,#fff);color:var(--tinta,#0B1F3A);border:1px solid var(--linea,#DDD3BF);box-shadow:0 6px 18px rgba(0,0,0,.14);font:13px/1.4 var(--sans,system-ui,sans-serif);opacity:0;transition:opacity .12s}
.pc-bloque .pc-tt.pc-ver{opacity:1}
.pc-bloque .pc-tabla{margin-top:22px;overflow-x:auto;-webkit-overflow-scrolling:touch}.pc-bloque .pc-tabla table{width:100%;min-width:540px;border-collapse:collapse;font-variant-numeric:tabular-nums}
.pc-bloque .pc-tabla tbody th,.pc-bloque .pc-tabla tfoot th,.pc-bloque .pc-tabla thead th:first-child{position:sticky;left:0;z-index:1;background:var(--papel,#FBF8F1);font-weight:400;min-width:150px}
.pc-bloque .pc-tabla th.pc-n,.pc-bloque .pc-tabla td.pc-n{width:11%}
@media (max-width:600px){.pc-bloque .pc-tabla table{min-width:0;width:max-content}.pc-bloque .pc-tabla th.pc-n,.pc-bloque .pc-tabla td.pc-n{width:auto;min-width:52px}
.pc-bloque .pc-tabla tbody th,.pc-bloque .pc-tabla tfoot th,.pc-bloque .pc-tabla thead th:first-child{width:9.5em;min-width:9.5em;max-width:9.5em}
.pc-bloque .pc-tabla caption::after{content:" · desliza para ver todos los años";font-weight:400;color:var(--gris,#5f6670)}
.pc-bloque .pc-l[lang="en"] .pc-tabla caption::after{content:" · swipe to see every year"}}
.pc-bloque .pc-tabla caption{caption-side:top;text-align:left;font:600 14px/1.4 var(--sans,system-ui,sans-serif);color:var(--tinta);padding:0 0 8px}
.pc-bloque .pc-tabla th,.pc-bloque .pc-tabla td{padding:8px 6px;border-bottom:1px solid var(--linea,#DDD3BF);text-align:left;vertical-align:top}
.pc-bloque .pc-tabla .pc-n{text-align:right;white-space:nowrap}.pc-bloque .pc-tabla tfoot th,.pc-bloque .pc-tabla tfoot td{border-bottom:0;border-top:2px solid var(--linea,#DDD3BF)}
.pc-bloque .pc-inf{font-size:13px;color:var(--gris,#5f6670)}
.pc-bloque .pc-noticias{margin-top:24px}.pc-bloque .pc-h4{font:600 17px/1.3 var(--serif,Georgia,serif);color:var(--tinta);margin:0 0 4px}
.pc-bloque .pc-notas{list-style:none;margin:0;padding:0}.pc-bloque .pc-notas li{padding:10px 0;border-bottom:1px solid var(--linea,#DDD3BF);line-height:1.45}
.pc-bloque .pc-n-t{color:var(--tinta);font-weight:600;text-decoration:none}.pc-bloque .pc-n-t:hover,.pc-bloque .pc-n-t:focus-visible{text-decoration:underline}
.pc-bloque .pc-notas .fuente{display:inline;white-space:nowrap}
@media print{.pc-bloque .pc-tt{display:none}}
</style>`;

function proyeccionCrecimiento(fecha, pc) {   // los manejadores para HTMLRewriter; sin datos válidos no cambia nada
  let puesto = false, html = "";
  try { html = pc && pc.d ? proyeccionHtml(pc.d) : ""; } catch (e) { html = ""; }   // un dato raro nunca deja la edición sin cargar: sin bloque y listo
  return {
    cabeza: { element(e) { if (html) e.append(PROY_CSS, { html: true }); } },
    crec: { element(e) { if (!html || puesto) return; puesto = true; e.after(html, { html: true }); } },
    pj: { element(e) { if (!html || puesto) return; puesto = true; e.before(html, { html: true }); } },   // si la edición no trae «Crecimiento de Chile», va antes de «Perspectivas 2050»
    // OJO: un elemento admite UN solo onEndTag y el horóscopo anual ya usa el del <body> (uno nuevo borraba el suyo). Por eso el script
    // va con append (queda antes de </body>); si la edición no trae ni «Crecimiento de Chile» ni «Perspectivas 2050», no hace nada.
    cuerpo: { element(e) { if (html) e.append(PROY_JS, { html: true }); } },
  };
}
