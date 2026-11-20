// 20-11-2026 19:46 · Germán: «Estos gráficos aparecen para la configuración de la "Cámara de Diputados", pero falta agregar los mismos
// gráficos de esta sección para el "Senado" (para tener todo el panorama de cómo están configuradas las bancadas políticas, sus
// votaciones, etc.)». Del Senado casi no llegan votaciones del mes con el voto de cada senador, y con menos de 3 la edición no arma
// «Cómo votan las bancadas». El robot de datos lo calcula con el mismo método y código de la Skill sobre las últimas votaciones de
// Sala del Senado con voto nominal oficial (herramientas/senado_bancadas.py → datos/senado-bancadas.json, con su rango de fechas a
// la vista) y aquí se pone en cada panel del Senado que no lo traiga, en el mismo lugar que el de la Cámara (antes del botón de
// las votaciones). Si la edición ya lo trae, no se toca. Las barras, la composición y sus ventanas usan el CSS y el script que la
// edición ya tiene para la Cámara (escuchan en todo el documento).
function senadoBancadas(sb) {
  const html = sb && typeof sb.html === "string" && sb.html.startsWith('<div class="cga">') ? sb.html : "";
  let tiene = false, puesto = false;
  return {
    panel: { element(e) {
      tiene = false; puesto = false;
      if (!html) return;
      e.onEndTag((fin) => { if (!tiene && !puesto) { fin.before(html, { html: true }); puesto = true; } });
    } },
    cga: { element() { tiene = true; } },
    tog: { element(e) { if (html && !tiene && !puesto) { e.before(html, { html: true }); puesto = true; } } },
  };
}

async function senadoBancadasLeer(ctx) {
  try {
    const r = await desdeGitHub("datos/senado-bancadas.json", 3600, ctx);
    return r ? await r.json() : null;
  } catch { return null; }
}
