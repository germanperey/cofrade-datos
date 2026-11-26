// 26-11-2026 · Curaduría con IA de la franja «En vivo». Germán envió una revisión externa: «en Deportes aparece la gala de Miss Universo
// y un robo de camiones; en Economía Mundial sale duplicada una nota policial del padre de Meghan Markle; y en Ciencia se coló política
// electoral española y una oferta de Xiaomi. Un filtro rápido con IA antes de publicar, que reclasifique, descarte farándula y elimine
// duplicados». La primera capa está en pulso.py (reglas fijas y duplicados entre secciones). Esta es la segunda: Workers AI lee los
// titulares de cada pulso (las 5 visibles y hasta 7 candidatas «extra» por sección) y decide la sección o el descarte de cada uno.
// Medido el 26-11-2026 con 35 titulares reales etiquetados a mano: llama-3.3-70b acertó 34 (el que falló lo saca la regla fija);
// gpt-oss-120b acertó 34 y 35, pero tarda de 7 a 15 segundos, por eso queda de respaldo. Cuesta unas 85 neuronas por pulso (el plan
// gratuito trae 10.000 al día y hay 12 pulsos). La decisión se guarda en D1 por pulso: se pide una sola vez cada 2 horas, en segundo
// plano. Mientras no está, la portada muestra el pulso con la primera capa. La IA no escribe texto: solo elige, y lo que devuelva
// fuera de los códigos válidos se ignora.
const CUR_MODELOS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/openai/gpt-oss-120b"];
const CUR_SECC = { C: "Chile", E: "Economía", M: "Mundo", EM: "Economía mundial", T: "Tecnología", D: "Deportes", CI: "Ciencia", EMP: "Emprendimiento" };
const CUR_ORDEN = ["Chile", "Economía", "Mundo", "Economía mundial", "Tecnología", "Deportes", "Ciencia", "Emprendimiento"];
const CUR_POR_SECCION = 5;
const CUR_SYS = `Eres el editor de turno de Cofrade News, un diario chileno para ejecutivos, inversionistas y tomadores de decisiones. Recibes titulares numerados que un lector automático de RSS puso en una sección. Para cada uno decides en qué sección va, o si se descarta.

Secciones (usa solo estos códigos):
C = Chile: política, gobierno, Congreso, justicia relevante, seguridad nacional, emergencias, regiones, sociedad chilena de alcance nacional.
E = Economía de Chile: macro, mercados, empresas, minería, energía, empleo, regulación económica chilenos.
M = Mundo: geopolítica, guerras, elecciones y gobiernos extranjeros, diplomacia, grandes catástrofes.
EM = Economía mundial: bancos centrales, bolsas, comercio, aranceles, materias primas, grandes empresas globales.
T = Tecnología: IA, software, chips, ciberseguridad, telecomunicaciones, innovación con impacto empresarial.
D = Deportes: competencias, resultados, fichajes, lesiones y deportistas, de Chile o del extranjero (el fútbol europeo y sudamericano se publica).
CI = Ciencia: investigación científica, salud con evidencia, espacio, clima y medio ambiente.
EMP = Emprendimiento: startups, fondos, inversión de riesgo, pymes, premios y programas de emprendimiento.
X = Descartar.

Descarta (X) todo lo que no sirve a un lector que toma decisiones:
- farándula, celebridades, realeza como chisme, concursos de belleza, horóscopo, curiosidades, tests y notas de "según los psicólogos";
- ofertas, descuentos, guías de compra, precios de productos, publicidad encubierta;
- crónica policial o judicial menor y local (robos, detenciones, juicios de personas comunes), sobre todo de otros países;
- noticias locales de otros países sin efecto fuera de su ciudad o provincia;
- titulares sin contenido informativo ("La última víctima", "Tremendo susto").
Mueve a la sección correcta lo que está mal ubicado (una entrevista a un canciller sobre una guerra va en M aunque venga en Economía). Ante la duda entre dos secciones, elige la del tema principal. Ante la duda entre publicar o descartar, publica si un ejecutivo chileno lo leería con provecho.

Responde SOLO un objeto JSON cuyas claves son los números de la lista y cuyos valores son los códigos, por ejemplo {"0":"C","1":"X","2":"EM"}. Incluye todos los números. Nada más.`;

// Todas las candidatas del pulso, en orden: sección por sección, primero las visibles y luego las «extra».
function curCandidatas(p) {
  const out = [];
  for (const s of (p && p.titulares) || []) {
    for (const n of [...(s.notas || []), ...(s.extra || [])]) if (n && n.titulo && n.url) out.push({ seccion: s.seccion, n });
  }
  return out;
}
function curLista(c) {
  return c.map((x, i) => `${i}. [${x.seccion}] ${String(x.n.titulo).replace(/\s+/g, " ").slice(0, 220)} (${x.n.medio || ""})`).join("\n");
}
// {"0":"C",...} → arreglo de códigos válidos; null si la respuesta no sirve (faltan más de 2 o no es JSON)
function curLeer(txt, total) {
  try {
    const t = String(txt || "");
    const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    const d = [];
    let faltan = 0;
    for (let i = 0; i < total; i++) {
      const v = String(j[i] ?? j[String(i)] ?? "").trim().toUpperCase();
      if (v === "X" || CUR_SECC[v]) d.push(v); else { d.push(""); faltan++; }
    }
    return faltan > 2 ? null : d;
  } catch { return null; }
}
// Arma los titulares con la decisión: cada nota va a su sección nueva, se descartan las X, máximo 5 por sección (primero las que
// venían visibles, en su orden de hora). Una nota sin decisión («») se queda donde estaba. Nunca agrega texto.
function curAplicar(p, d) {
  const c = curCandidatas(p);
  if (!Array.isArray(d) || d.length !== c.length) return p;
  const por = {};
  c.forEach((x, i) => {
    const v = d[i];
    if (v === "X") return;
    const sec = v ? CUR_SECC[v] : x.seccion;
    (por[sec] = por[sec] || []).push(x.n);
  });
  const titulares = CUR_ORDEN.filter((s) => (por[s] || []).length).map((s) => ({ seccion: s, notas: por[s].slice(0, CUR_POR_SECCION) }));
  // freno: si la IA botara casi todo (respuesta rara o un titular con instrucciones escondidas), queda la primera capa
  const antes = ((p && p.titulares) || []).reduce((a, s) => a + (s.notas || []).length, 0), despues = titulares.reduce((a, s) => a + s.notas.length, 0);
  if (despues < Math.min(12, Math.ceil(antes / 2))) return p;
  return { ...p, titulares, curado: true };
}
async function curPedirIA(env, lista, total) {
  for (const m of CUR_MODELOS) {
    try {
      let txt = "";
      if (env.AI) {
        const r = m.includes("gpt-oss")
          ? await env.AI.run(m, { instructions: CUR_SYS, input: lista, reasoning: { effort: "low" } })
          : await env.AI.run(m, { messages: [{ role: "system", content: CUR_SYS }, { role: "user", content: lista }], max_tokens: 900, temperature: 0 });
        txt = typeof r?.response === "string" ? r.response : r?.response ? JSON.stringify(r.response)
          : (r?.output || []).filter((x) => x.type === "message").flatMap((x) => x.content || []).map((x) => x.text || "").join("");
      } else if (env.AI_PRUEBA) {   // solo en el arnés de pruebas (Miniflare)
        txt = await (await env.AI_PRUEBA.fetch("https://ia.prueba/curar", { method: "POST", body: lista })).text();
      } else return null;
      const d = curLeer(txt, total);
      if (d) return { d, modelo: m };
    } catch { /* siguiente modelo */ }
  }
  return null;
}
const CUR_TABLA = "CREATE TABLE IF NOT EXISTS pulso_curado (generado TEXT PRIMARY KEY, estado TEXT NOT NULL, decision TEXT, modelo TEXT, creado TEXT NOT NULL)";
async function curarAhora(p, env) {
  const c = curCandidatas(p);
  const r = c.length ? await curPedirIA(env, curLista(c), c.length) : null;
  await env.DB.prepare("UPDATE pulso_curado SET estado=?, decision=?, modelo=?, creado=? WHERE generado=?")
    .bind(r ? "ok" : "falla", r ? JSON.stringify(r.d) : null, r ? r.modelo : null, new Date().toISOString(), String(p.generado)).run();
}
// Devuelve el pulso curado si la decisión ya está; si no, la pide en segundo plano (una sola vez por pulso) y devuelve el de la
// primera capa. Si algo falla, siempre devuelve el pulso tal cual: la portada nunca se cae por la curaduría.
async function pulsoCurado(p, env, ctx) {
  if (!p || !p.generado || !Array.isArray(p.titulares) || !env || !env.DB || !(env.AI || env.AI_PRUEBA)) return p;
  try {
    const k = String(p.generado);
    let fila = await env.DB.prepare("SELECT estado, decision, creado FROM pulso_curado WHERE generado=?").bind(k).first().catch(() => undefined);
    if (fila === undefined) { await env.DB.prepare(CUR_TABLA).run(); fila = null; }
    if (fila && fila.estado === "ok" && fila.decision) return curAplicar(p, JSON.parse(fila.decision));
    // nadie la pidió, o la pedida anterior falló o quedó colgada hace más de 10 minutos: se pide (el INSERT gana una sola visita)
    const viejo = fila && (fila.estado === "falla" || Date.now() - Date.parse(fila.creado) > 600000);
    if (!fila || viejo) {
      const ahora = new Date().toISOString();
      const w = viejo
        ? await env.DB.prepare("UPDATE pulso_curado SET estado='pidiendo', creado=? WHERE generado=? AND creado=?").bind(ahora, k, fila.creado).run()
        : await env.DB.prepare("INSERT OR IGNORE INTO pulso_curado (generado, estado, creado) VALUES (?, 'pidiendo', ?)").bind(k, ahora).run();
      if (w && w.meta && w.meta.changes) {
        const tarea = curarAhora(p, env).catch(() => {});
        if (ctx && ctx.waitUntil) ctx.waitUntil(tarea); else await tarea;
      }
    }
  } catch { /* la portada sigue con la primera capa */ }
  return p;
}
