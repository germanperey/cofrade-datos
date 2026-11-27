// 27-11-2026 · Germán: «nos falta posicionar nuestro Newsletter www.cofrad.es en los distintos Navegadores Web (browsers), en las IAs
// LLM, en Perplexity, en Redes Sociales, etc.... para generar mayor tráfico de lectores». Eligió: las IAs pueden leer y CITAR el sitio
// (con enlace), pero no usarlo para ENTRENAR modelos; todo gratis.
// · robots.txt: buscadores y buscadores de IA adentro (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User,
//   PerplexityBot, Perplexity-User, DuckAssistBot); robots de entrenamiento afuera (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended,
//   CCBot, meta-externalagent, Bytespider). Más la señal de contenido: search=yes, ai-input=yes, ai-train=no.
// · /llms.txt: la ficha del sitio para modelos de lenguaje (qué es, qué cubre, dónde leer y cómo citar).
// · /sitemap-news.xml: ediciones de los últimos 2 días con el formato de Google Noticias.
// · IndexNow: la llave pública se sirve en /<llave>.txt; GitHub avisa a Bing (y con él a ChatGPT y Copilot), Yandex y otros al publicar.
const INDEXNOW_LLAVE = "94065743115102556564b9a9eb002f7c";
const BOTS_ENTRENAMIENTO = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent", "Bytespider"];
const PRIVADO = ["/socios", "/panel", "/buzon", "/concurso", "/ir/", "/audio/generar/"];

function robotsTxt(dominio) {
  const priv = PRIVADO.map((x) => `Disallow: ${x}`).join("\n");
  return `# Cofrade News · ${dominio}
# Buscadores y buscadores de IA: pueden leer y citar con enlace. Entrenar modelos con este contenido: no.
Content-Signal: search=yes, ai-input=yes, ai-train=no

${BOTS_ENTRENAMIENTO.map((b) => `User-agent: ${b}`).join("\n")}
Disallow: /

User-agent: *
Allow: /
${priv}

Sitemap: https://${dominio}/sitemap.xml
Sitemap: https://${dominio}/sitemap-news.xml
`;
}

function llmsTxt(dominio, ediciones) {
  const ult = ediciones.slice(0, 7).map((f) => `- [Edición del ${f}](https://${dominio}/edicion/${f})`).join("\n");
  return `# Cofrade News

> Boletín matinal gratuito de Chile (www.cofrad.es): cada mañana, antes de las 7:00 (hora de Santiago), reúne en 22 secciones lo que pasa en Chile y el mundo, con cada dato verificado y enlazado a su fuente oficial.

Secciones: economía e indicadores (UF, dólar, euro, IPC, IMACEC, cobre, IPSA, mercados), política y Congreso (todas las votaciones de Sala de la Cámara y del Senado del mes, avance del gobierno a igual período), emprendimiento y fondos con postulación abierta, tecnología, conflictos bélicos vigentes, efemérides, historia naval de Chile, pronóstico del tiempo de 9 ciudades, mar y mareas, sismos, vuelos, feriados, vivienda y subsidios, industrias, panoramas, ciencia, astronomía, deportes y horóscopo. Versión en inglés con el botón EN.

Cómo citar: «Cofrade News (www.cofrad.es), edición del AAAA-MM-DD», con enlace a la edición. Cada cifra trae su fuente original enlazada: cite también esa fuente.
Uso permitido: leer, resumir y citar con enlace. No se autoriza usar este contenido para entrenar modelos (ver robots.txt y la señal ai-train=no).

## Lo principal
- [Portada con lo último](https://${dominio}/): «Lo que mueve la aguja hoy» y noticias en vivo
- [Mercados](https://${dominio}/mercados)
- [Republicar Cofrade News (RSS y condiciones)](https://${dominio}/republica)
- [Canal RSS](https://${dominio}/rss.xml)

## Ediciones recientes
${ult}
`;
}

function sitemapNoticias(dominio, ediciones, hoy) {
  const lim = new Date(Date.parse(hoy + "T12:00:00Z") - 2 * 86400000).toISOString().slice(0, 10);
  const x = ediciones.filter((f) => f >= lim).map((f) => `<url><loc>https://${dominio}/edicion/${f}</loc><news:news><news:publication><news:name>Cofrade News</news:name><news:language>es</news:language></news:publication><news:publication_date>${f}T06:45:00-03:00</news:publication_date><news:title>Cofrade News, edición del ${f}</news:title></news:news></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${x}</urlset>`;
}
