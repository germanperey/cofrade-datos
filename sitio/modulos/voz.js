(function () {
'use strict';
// 19-11-2026 · Cofrade News con voz (Germán, 18-11 23:48: «al abrirlo aparezca una ventana emergente que sugiera leer las Noticias con
// voz (pensado en el público de lectores "No videntes")... si la persona cliquea en cualquier parte de la pantalla se activará la voz...
// si el lector clickea en la cruz o X... podrá leer de manera normal»; 23:57: «la ventana emergente sólo aparecerá una sola vez, y si la
// persona eligió cerrarla se presume que la persona sí es vidente... tendrá un icono dentro del "Índice"»; 00:01: «cada 10 minutos se
// haga una mención de al menos 3 o 4 de los auspicios... y así sucesivamente»).
// Todo ocurre en el navegador del lector: la voz es la del propio aparato (en Microsoft Edge, Catalina, la voz natural chilena de
// IntelliBot) y el oído es el reconocimiento de voz del navegador. Cofrade News no recibe ni guarda audio.
var D = document, W = window, H = D.documentElement;
if (W.__cnVoz || !D.querySelector('.hoja')) return;
W.__cnVoz = 1;
var SS = W.speechSynthesis || null, SR = W.SpeechRecognition || W.webkitSpeechRecognition || null;
var CFG = { espera: 8000, entre: 3500, auspicioMin: 10, grupo: 6, maxItems: 36, porLista: 5, forzar: false, ecoBase: 2000, ecoPorPalabra: 450, ecoEstricto: 4000, ecoVigente: 300000, pausaOidoMs: 180000, spsMin: 3, spsMax: 14,
            tono: 0.95, tonoTit: 0.93, velTit: 0.95, pausaTit: 380, pausaItem: 300, conectores: true, margenEco: 5, bilingue: true, cambioMin: 6, inicioLee: 0.14, provIndice: 500 };   // 20-11-2026: sin pausas en palabras de otro idioma; oído más atento a «índice»   // 19-11-2026: voz más cálida (tono algo más grave, títulos más pausados, respiros)
try { var cf = W.__cnVozCfg; if (cf) for (var k in cf) CFG[k] = cf[k]; } catch (e) { /* sin ajustes */ }
try { if (/[?&]voz=diag\b/.test(W.location.search)) CFG.diag = true; } catch (e) { /* */ }   // ?voz=diag muestra en pantalla lo que hace el micrófono
try { if (/[?&]voz=monolingue\b/.test(W.location.search)) CFG.bilingue = false; if (/[?&]voz=voces\b/.test(W.location.search)) CFG.cambioMin = 0; } catch (e) { /* */ }   // ?voz=monolingue: sin voces de otros idiomas

// ---------- preferencias (solo en este aparato) ----------
var CLAVE = 'cn-voz', P = {};
try { P = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { P = {}; }
function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(P)); } catch (e) { /* modo privado */ } }
function en() { return (H.lang || '').slice(0, 2) === 'en'; }

// ---------- textos ----------
var TX = {
  es: {
    tit: '¿Te leemos las noticias?',
    txt: 'Toca o haz clic en cualquier parte de la pantalla y una voz te leerá el boletín de hoy. Podrás elegir las secciones con tu voz.',
    btn: 'Escuchar el boletín',
    x: 'Cerrar y leer sin voz',
    nota: 'Si prefieres leer, cierra con la X o con la tecla Esc. Para entender tu voz se usa el servicio del navegador (Google, Apple o Microsoft) o, si no lo tiene, la inteligencia artificial de Cloudflare, que solo transcribe tus órdenes. Cofrade News no guarda tu voz.',
    notaC: 'Mientras te leo, el micrófono queda abierto para que puedas interrumpirme. Se cierra al apagar la voz.',
    titDe: 'Toca en cualquier parte para seguir escuchando',
    txtDe: 'La lectura con voz está activada en este aparato.',
    noMas: 'No volver a mostrar',
    salto: 'Escuchar el boletín con voz',
    menu: 'Escuchar las noticias con voz',
    menuSub: 'Como un audiolibro: para manejar, pedalear o descansar la vista',
    barra: 'Lector de noticias por voz', ant: 'Anterior', pau: 'Pausa', seg: 'Seguir', sig: 'Siguiente', ind: 'Índice',
    hab: 'Hablar', vel: 'Velocidad', off: 'Apagar la voz',
    eHabla: 'Leyendo', ePausa: 'En pausa', eOye: 'Te escucho…', eListo: 'Listo', eAusp: 'Auspician',
    sinVoz: 'Este navegador no tiene una voz en español. Prueba con Microsoft Edge, Google Chrome o Safari.',
    saludo: 'Hola, qué gusto tenerte aquí. Te doy la bienvenida a Cofrade News, el boletín del {f}.',
    saludoDe: 'Hola de nuevo, qué bueno que volviste. Este es el boletín del {f}.',
    tres: 'Las tres noticias del día.', ord: ['Primera', 'Segunda', 'Tercera'],
    sesenta: 'Hoy en sesenta segundos.',
    preg: '¿Quieres que te lea los temas del índice, para que elijas qué sección escuchar? Di «índice». O di «todo» y te leo el boletín completo, como una radio.',
    pregSin: 'Para elegir una sección, presiona la tecla I o toca el botón Índice de la barra de abajo. Si no eliges nada, te leo el boletín completo, como una radio.',
    sinResp: 'Como no escuché una respuesta, te leo el boletín completo. Entre una sección y otra vas a escuchar un sonido corto: en ese momento puedes decir «índice».',
    sinRespSin: 'Te leo el boletín completo. Cuando quieras, toca Índice para elegir otra sección.',
    indIntro: 'El boletín de hoy tiene {n} secciones, y algunas traen temas propios. Te las digo de {g} en {g}. Para elegir, di «índice» y el número o el nombre; por ejemplo, «índice cinco» o «índice {e}».',
    indIntroSin: 'El boletín de hoy tiene {n} secciones. Te las digo de {g} en {g}. Escribe su número y presiona Enter, o toca Siguiente para escucharla.',
    indMas: '¿Sigo con las demás? Di «más», o di «índice» y el número o el nombre.',
    indFin: 'Esas son todas. Di «índice» y el número o el nombre de lo que quieres escuchar.',
    sec: 'Sección {n}: {t}.', tema: '{p}: {t}.', incluye: 'Incluye: {l}.', nomTres: 'las tres noticias del día', nomSesenta: 'el resumen en sesenta segundos',
    trasSec: 'Favor, permíteme terminar de informarte esta noticia y a continuación yo continuaré con {s}, la sección del Menú que me solicitas.',
    trasInd: 'Favor, permíteme terminar de informarte esta noticia y a continuación te leo el índice, como me solicitas.',
    trasOtro: 'Favor, permíteme terminar de informarte esta noticia y a continuación yo continuaré con {s}, como me solicitas.',
    trasGen: 'Favor, permíteme terminar de informarte esta noticia y a continuación yo continuaré con la sección del Menú que me solicitas.',
    otraVoz: 'Esta es otra voz. Si te gusta, sigo con ella; si no, di «otra voz» de nuevo.', unaVoz: 'Este aparato tiene una sola voz en español.',
    finSec: 'Hasta aquí {t}. Si quieres, di «siguiente», «índice» o «repite»; si no, sigo con {s}.',
    finTodo: 'Llegamos al final del boletín de hoy. Gracias por acompañarme en Cofrade News. Si quieres volver a una sección, di «índice».',
    noEnt: 'No te entendí. Puedes decir «índice», «índice» y el número de una sección, «siguiente» o «ayuda».',
    ayuda: 'Puedes decir: «índice», para escuchar las secciones; «índice» y el número o el nombre de una sección o de uno de sus temas, como «índice cinco» o «índice golf»; «siguiente» o «anterior»; «repite»; «pausa» y «sigue»; «más rápido» o «más lento»; «otra voz», para probar otra voz del aparato; y «salir», para apagar la voz.',
    rapido: 'Más rápido.', lento: 'Más lento.', yaRapido: 'Esa es la velocidad máxima.', yaLento: 'Esa es la velocidad mínima.',
    salir: 'Listo, apagué la voz. La puedes volver a encender desde el Índice.',
    noSec: 'No encontré esa sección.',
    mas: 'El resto de esta sección está en la edición escrita.', masLista: 'Quedan {n} más en la edición escrita.', masUna: 'Queda una más en la edición escrita.',
    pregC: '¿Quieres que te lea los temas del índice, para que elijas qué escuchar? Di «índice». O di «todo», y te leo el boletín completo, como una radio. Y puedes interrumpirme cuando quieras: di «índice» y el número o el nombre de otra sección.',
    sinRespC: 'Como no escuché una respuesta, te leo el boletín completo. Cuando quieras, dime «índice» y el nombre o el número de una sección, aunque yo esté hablando.',
    indIntroC: 'El boletín de hoy tiene {n} secciones, y algunas traen temas propios. Te las digo de {g} en {g}. Cuando escuches la que quieres, dime «índice» y el número o el nombre, aunque yo esté hablando; por ejemplo, «índice cinco» o «índice {e}».',
    tocaMic: 'Si quieres interrumpirme, toca el micrófono dorado de abajo.',
    pregE: '¿Quieres que te lea los temas del índice, para que elijas qué escuchar? Di «índice». O di «todo», y te leo el boletín completo, como una radio. Si quieres interrumpirme mientras hablo, di «índice» y el nombre o el número; por ejemplo, «índice deportes».',
    sinRespE: 'Como no escuché una respuesta, te leo el boletín completo. Cuando quieras, dime «índice» y el nombre o el número de una sección, aunque yo esté hablando.',
    indIntroE: 'El boletín de hoy tiene {n} secciones, y algunas traen temas propios. Te las digo de {g} en {g}. Cuando escuches la que quieres, dime «índice» y el número o el nombre, aunque yo esté hablando; por ejemplo, «índice cinco».',
    oiste: 'Te escuché: «{f}»',
    vozUsada: 'Voz: {v}',
    sinRed: 'Por ahora no logro escucharte, porque falla la conexión. Sigo leyendo y vuelvo a intentarlo en un rato. También puedes usar la barra de abajo o las teclas.',
    signo: '¿Cuál es tu signo? Por ejemplo, Escorpio. O di «todos».',
    signoSin: 'Te leo los doce signos.',
    tuSigno: 'Tu signo, {s}.',
    ausp: 'Una pausa para agradecer a quienes hacen posible Cofrade News: {l}.', auspFin: 'Seguimos.',
    cta: '¿Quieres que tu marca suene aquí? Escríbenos a hola, arroba, cofrad, punto, es.',
    sinMic: 'No logro escucharte por el micrófono. Puedes elegir con la barra de abajo o con las teclas.',
    segun: ['Según {f}.', 'Lo informa {f}.', 'Lo publica {f}.'], y: 'y', sinNaves: 'Sin naves informadas hoy.', tambien: 'También en pantalla: {l}.',
    conectores: ['Además, ', 'Por otra parte, ', 'En otra noticia, ', 'También, ']
  },
  en: {
    tit: 'Shall we read you the news?',
    txt: 'Tap or click anywhere on the screen and a voice will read today\'s newsletter. You can choose sections with your voice.',
    btn: 'Listen to the newsletter',
    x: 'Close and read without voice',
    nota: 'If you prefer to read, close with the X or the Esc key. To understand your voice, we use the browser\'s service (Google, Apple or Microsoft) or, if it has none, Cloudflare\'s artificial intelligence, which only transcribes your commands. Cofrade News does not keep your voice.',
    notaC: 'While I read, the microphone stays open so you can interrupt me. It closes when you turn the voice off.',
    titDe: 'Tap anywhere to keep listening',
    txtDe: 'Voice reading is on for this device.',
    noMas: 'Don\'t show again',
    salto: 'Listen to the newsletter',
    menu: 'Listen to the news',
    menuSub: 'Like an audiobook: while driving, cycling or resting your eyes',
    barra: 'News reader by voice', ant: 'Previous', pau: 'Pause', seg: 'Resume', sig: 'Next', ind: 'Index',
    hab: 'Speak', vel: 'Speed', off: 'Turn voice off',
    eHabla: 'Reading', ePausa: 'Paused', eOye: 'Listening…', eListo: 'Ready', eAusp: 'Sponsors',
    sinVoz: 'This browser has no English voice. Try Microsoft Edge, Google Chrome or Safari.',
    saludo: 'Hello, it is so nice to have you here. Welcome to Cofrade News, the newsletter for {f}.',
    saludoDe: 'Hello again, it is good to have you back. This is the newsletter for {f}.',
    tres: 'Today\'s top three stories.', ord: ['First', 'Second', 'Third'],
    sesenta: 'Today in sixty seconds.',
    preg: 'Would you like me to read the index, so you can choose a section? Say «index». Or say «all» and I will read the whole newsletter, like a radio show.',
    pregSin: 'To choose a section, press the I key or tap the Index button below. If you choose nothing, I will read the whole newsletter, like a radio show.',
    sinResp: 'I heard no answer, so I will read the whole newsletter. Between sections you will hear a short sound: that is when you can say «index».',
    sinRespSin: 'I will read the whole newsletter. Tap Index whenever you want another section.',
    indIntro: 'Today\'s newsletter has {n} sections, and some have topics of their own. I will read them {g} at a time. To choose, say «index» and the number or the name; for example, «index five» or «index {e}».',
    indIntroSin: 'Today\'s newsletter has {n} sections. I will read them {g} at a time. Type its number and press Enter, or tap Next to hear it.',
    indMas: 'Shall I go on? Say «more», or say «index» and the number or the name.',
    indFin: 'That is all of them. Say «index» and the number or the name of what you want to hear.',
    sec: 'Section {n}: {t}.', tema: '{p}: {t}.', incluye: 'It includes: {l}.', nomTres: 'today\'s top three stories', nomSesenta: 'the sixty-second summary',
    trasSec: 'Please let me finish this news story, and then I will continue with {s}, the menu section you asked for.',
    trasInd: 'Please let me finish this news story, and then I will read you the index, as you asked.',
    trasOtro: 'Please let me finish this news story, and then I will continue with {s}, as you asked.',
    trasGen: 'Please let me finish this news story, and then I will continue with the menu section you asked for.',
    otraVoz: 'This is another voice. If you like it, I will keep it; if not, say «another voice» again.', unaVoz: 'This device has only one English voice.',
    finSec: 'That was {t}. If you like, say «next», «index» or «repeat»; otherwise, I will go on with {s}.',
    finTodo: 'That is the end of today\'s newsletter. Thank you for listening to Cofrade News. Say «index» to go back to a section.',
    noEnt: 'Sorry, I did not get that. You can say «index», «index» and a section number, «next» or «help».',
    ayuda: 'You can say: «index», to hear the sections; «index» and the number or name of a section or one of its topics, like «index five» or «index golf»; «next» or «previous»; «repeat»; «pause» and «resume»; «faster» or «slower»; «another voice», to try another voice on this device; and «exit», to turn the voice off.',
    rapido: 'Faster.', lento: 'Slower.', yaRapido: 'That is the top speed.', yaLento: 'That is the lowest speed.',
    salir: 'Done, the voice is off. You can turn it on again from the Index.',
    noSec: 'I could not find that section.',
    mas: 'The rest of this section is in the written edition.', masLista: '{n} more in the written edition.', masUna: 'One more in the written edition.',
    pregC: 'Would you like me to read the index, so you can choose what to hear? Say «index». Or say «all», and I will read the whole newsletter, like a radio show. And you can interrupt me anytime: say «index» and the number or the name of another section.',
    sinRespC: 'I heard no answer, so I will read the whole newsletter. Whenever you want, say «index» and the name or the number of a section, even while I am talking.',
    indIntroC: 'Today\'s newsletter has {n} sections, and some have topics of their own. I will read them {g} at a time. When you hear the one you want, say «index» and its number or name, even while I am talking; for example, «index five» or «index {e}».',
    tocaMic: 'To interrupt me, tap the golden microphone below.',
    pregE: 'Would you like me to read the index, so you can choose what to hear? Say «index». Or say «all», and I will read the whole newsletter, like a radio show. To interrupt me while I am talking, say «index» and the name or the number; for example, «index sports».',
    sinRespE: 'I heard no answer, so I will read the whole newsletter. Whenever you want, say «index» and the name or the number of a section, even while I am talking.',
    indIntroE: 'Today\'s newsletter has {n} sections, and some have topics of their own. I will read them {g} at a time. When you hear the one you want, say «index» and its number or name, even while I am talking; for example, «index five».',
    oiste: 'I heard: «{f}»',
    vozUsada: 'Voice: {v}',
    sinRed: 'I cannot hear you right now, because the connection is failing. I will keep reading and try again in a while. You can also use the bar below or the keys.',
    signo: 'What is your sign? For example, Scorpio. Or say «all».',
    signoSin: 'Here are the twelve signs.',
    tuSigno: 'Your sign, {s}.',
    ausp: 'A moment to thank those who make Cofrade News possible: {l}.', auspFin: 'Back to the news.',
    cta: 'Want your brand to be heard here? Write to hola, at, cofrad, dot, es.',
    sinMic: 'I cannot hear you through the microphone. You can choose with the bar below or with the keys.',
    segun: ['According to {f}.', 'Reported by {f}.', 'From {f}.'], y: 'and', sinNaves: 'No ships reported today.', tambien: 'Also on screen: {l}.',
    conectores: ['Also, ', 'Meanwhile, ', 'In other news, ', 'And, ']
  }
};
var nConector = 0;
function conector(U, j) {   // «Además, …» entre noticias seguidas, una sí y otra no, para que suene a una persona y no a una lista
  if (!CFG.conectores || j < 1 || !U[j] || !U[j - 1] || U[j].tipo !== 'n' || U[j - 1].tipo !== 'n' || j % 2 === 0) return '';   // solo entre noticias seguidas
  var L = tx('conectores'); return L[(nConector++) % L.length];
}
function quedan(n) { return n === 1 ? tx('masUna') : tx('masLista', { n: n }); }
var nSegun = 0;
function segun(m) { var L = tx('segun'); return L[(nSegun++) % L.length].replace('{f}', m); }
function tx(k, o) { var t = (en() ? TX.en : TX.es)[k]; if (o && typeof t === 'string') t = t.replace(/\{(\w)\}/g, function (_, x) { return o[x] == null ? '' : o[x]; }); return t; }

// ---------- texto que se entiende al oírlo ----------
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
var MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var CORTOS = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11 };
var DIAS = { lun: 'lunes', mar: 'martes', 'mié': 'miércoles', mie: 'miércoles', jue: 'jueves', vie: 'viernes', 'sáb': 'sábado', sab: 'sábado', dom: 'domingo' };
var RUMBO = { N: 'norte', S: 'sur', E: 'este', O: 'oeste', W: 'oeste', NE: 'noreste', NO: 'noroeste', NW: 'noroeste', SE: 'sureste', SO: 'suroeste', SW: 'suroeste',
  NNE: 'nornoreste', ENE: 'estenoreste', ESE: 'estesureste', SSE: 'sursureste', SSO: 'sursuroeste', SSW: 'sursuroeste', OSO: 'oestesuroeste', WSW: 'oestesuroeste', ONO: 'oestenoroeste', WNW: 'oestenoroeste', NNO: 'nornoroeste', NNW: 'nornoroeste' };
var ORD = ['', 'primer', 'segund', 'tercer', 'cuart', 'quint', 'sext', 'séptim', 'octav', 'noven', 'décim'];
// cifras: en castellano 1.569 · 996,68 · 41.357,30; en inglés 1,569 · 996.68 (nunca se traga la coma o el punto que sigue)
var NUM_ES = '\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?', NUM_EN = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?';
var ESC = '(?:\\s?(mil millones|millones|millón|billones|mil|billion|million|thousand)\\b)?';
function rxDinero(NUMR) {
  return {
    usdM: new RegExp('US\\$\\s?(' + NUMR + ')\\s?(?:MM|M)\\b', 'g'), usd: new RegExp('US\\$\\s?(' + NUMR + ')' + ESC, 'g'),
    usdPost: new RegExp('(' + NUMR + ')\\s?US\\$' + ESC, 'g'), musd: new RegExp('(' + NUMR + ')\\s?(?:MMUSD|MUSD|MMUS\\$)', 'g'),
    eur: new RegExp('€\\s?(' + NUMR + ')' + ESC, 'g'), eurPost: new RegExp('(' + NUMR + ')\\s?€', 'g'),
    clp: new RegExp('\\$\\s?(' + NUMR + ')' + ESC + '(\\s+(?:de\\s+)?pesos)?', 'g')
  };
}
var RX_ES = rxDinero(NUM_ES), RX_EN = rxDinero(NUM_EN);
var RUMBO_EN = { N: 'north', S: 'south', E: 'east', W: 'west', O: 'west', NE: 'northeast', NW: 'northwest', NO: 'northwest', SE: 'southeast', SW: 'southwest', SO: 'southwest' };
var EMOJI = /[←-⇿⌀-⏿①-⓿─-➿⤀-⥿⬀-⯿〰〽️‍⃣›‹]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
function mes(m) { return (en() ? MESES_EN : MESES)[m]; }
function fecha(d, m, a) { m = +m - 1; if (m < 0 || m > 11 || +d < 1 || +d > 31) return null; return en() ? mes(m) + ' ' + (+d) + (a ? ', ' + a : '') : (+d) + ' de ' + mes(m) + (a ? ' de ' + a : ''); }
function mesAnio(m, a) { m = +m - 1; if (m < 0 || m > 11) return null; return en() ? mes(m) + ' ' + a : mes(m) + ' de ' + a; }
function dinero(n, e, moneda) {   // «1.569», «millones», «dólares» → «1.569 millones de dólares»; «996,68» pesos → «996 pesos con 68 centavos»
  var dec = en() ? /^(.+)\.(\d{1,2})$/ : /^(.+),(\d{1,2})$/, m = !e && moneda !== 'euros' && dec.exec(n), c = m ? String(+m[2] * (m[2].length === 1 ? 10 : 1)) : '';
  if (m) n = m[1];
  if (en()) return n + (e ? ' ' + ({ 'mil millones': 'billion', millones: 'million', 'millón': 'million', mil: 'thousand', billones: 'trillion' }[e] || e) : '') + ' ' + ({ 'dólares': 'dollars', euros: 'euros', pesos: 'pesos' }[moneda]) + (c && c !== '0' ? ' and ' + c + ' cents' : '');
  var mon = n === '1' && !e ? moneda.replace(/es$/, '').replace(/s$/, '') : moneda;
  return n + (e ? ' ' + e + ' de ' : ' ') + mon + (c && c !== '0' ? ' con ' + c + ' centavos' : '');
}
var ABREV_ES = { Sr: 'señor', Sra: 'señora', Srta: 'señorita', Dr: 'doctor', Dra: 'doctora', Av: 'avenida', Avda: 'avenida', Ltda: 'limitada', 'Cía': 'compañía', Gral: 'general', Alm: 'almirante',
  Vicealm: 'vicealmirante', Contralm: 'contraalmirante', Cdte: 'comandante', Cmdte: 'comandante', Tte: 'teniente', Sgto: 'sargento', Prof: 'profesor', Profa: 'profesora', Ing: 'ingeniero',
  Pdte: 'presidente', Pdta: 'presidenta', Mons: 'monseñor', Sta: 'santa', Sto: 'santo', Pbro: 'presbítero', Excmo: 'excelentísimo', Hno: 'hermano', Nro: 'número', 'núm': 'número', 'Núm': 'número',
  tel: 'teléfono', Tel: 'teléfono', depto: 'departamento', Depto: 'departamento', 'pág': 'página', 'págs': 'páginas', vol: 'volumen', art: 'artículo', Art: 'artículo', inc: 'inciso',
  etc: 'etcétera', aprox: 'aproximadamente' };
// palabras que llegan sin tilde desde algunas fuentes y no tienen otra lectura posible (no entran «publico», «ultimo», «paris» ni «sudan», que sí la tienen)
var TILDES = { valparaiso: 'valparaíso', concepcion: 'concepción', nunoa: 'ñuñoa', penalolen: 'peñalolén', 'peñalolen': 'peñalolén', maipu: 'maipú', conchali: 'conchalí', quilpue: 'quilpué',
  chillan: 'chillán', biobio: 'biobío', aysen: 'aysén', tarapaca: 'tarapacá', copiapo: 'copiapó', curico: 'curicó', pucon: 'pucón', constitucion: 'constitución', nuble: 'ñuble',
  peru: 'perú', mexico: 'méxico', canada: 'canadá', panama: 'panamá', japon: 'japón', bogota: 'bogotá', medellin: 'medellín', asuncion: 'asunción', moscu: 'moscú', berlin: 'berlín',
  teheran: 'teherán', pakistan: 'pakistán', iran: 'irán', libano: 'líbano', turquia: 'turquía', taiwan: 'taiwán', hamas: 'hamás', region: 'región', economia: 'economía',
  politica: 'política', tecnologia: 'tecnología', mineria: 'minería', energia: 'energía', indice: 'índice', telefono: 'teléfono', codigo: 'código', camara: 'cámara',
  informacion: 'información', educacion: 'educación', inflacion: 'inflación', produccion: 'producción', exportacion: 'exportación', inversion: 'inversión', millon: 'millón',
  tambien: 'también', ademas: 'además', segun: 'según', despues: 'después', pais: 'país', dolar: 'dólar', dolares: 'dólares', proximo: 'próximo', proxima: 'próxima', rapido: 'rápido' };
var RX_TILDES = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + Object.keys(TILDES).join('|') + ')(?![A-Za-zÀ-ÿ])', 'gi');
var MAY_PALABRA = { LA: 1, EL: 1, LOS: 1, LAS: 1, DE: 1, DEL: 1, EN: 1, UN: 1, UNA: 1, Y: 1, O: 1, SU: 1, SUS: 1, AL: 1, CON: 1, POR: 1, QUE: 1, NO: 1, SE: 1, ES: 1, MAS: 1, HOY: 1, SIN: 1, LE: 1, LO: 1, MI: 1, YA: 1, HAY: 1, SON: 1, FUE: 1, VER: 1, VEZ: 1 };
var SIGLA_PALABRA = { ONU: 1, OTAN: 1, NASA: 1, FIFA: 1, UEFA: 1, OPEP: 1, IVA: 1, APEC: 1, UNAM: 1, INE: 1, BID: 1, UDI: 1, SAG: 1, ENAP: 1, ENEL: 1, PYME: 1, SIDA: 1, OVNI: 1, OIT: 0 };
function hablable(t) {
  if (!t) return '';
  var es = !en(), RX = es ? RX_ES : RX_EN;
  t = String(t).replace(/https?:\/\/\S+/g, ' ').replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, ' ').replace(/\+\d{1,3}(?:[\s-]?\d){6,}/g, ' ')
       .replace(/[«»"“”]/g, '').replace(/\s*\((?:RSS|inglés|English|en la imagen|en la foto|in the picture)[^)]*\)/gi, '').replace(/\s*\((?:toque|toca|tap)[^)]*\)/gi, '')
       .replace(/\*/g, '').replace(/…/g, '...').replace(/[•▪]/g, ', ');
  // rangos y signos: «3,92–4,39», «−0,4 %», «+2,5%»
  t = t.replace(/(\d)\s?[–−]\s?(\d)/g, es ? '$1 a $2' : '$1 to $2').replace(/−/g, '-')
       .replace(/(^|[\s(\[,;:])-(?=\d)/g, es ? '$1menos ' : '$1minus ').replace(/(^|[\s(\[,;:])\+(?=\d)/g, es ? '$1más ' : '$1plus ')
       .replace(/≈\s?(?=\d)/g, es ? 'cerca de ' : 'about ').replace(/[≈≋]/g, ' ');
  // dinero: «$» es peso chileno; «US$», dólar; «€», euro
  t = t.replace(RX.usdM, function (_, n) { return dinero(n, 'millones', 'dólares'); }).replace(RX.musd, function (_, n) { return dinero(n, 'millones', 'dólares'); })
       .replace(RX.usd, function (_, n, e) { return dinero(n, e, 'dólares'); }).replace(RX.usdPost, function (_, n, e) { return dinero(n, e, 'dólares'); })
       .replace(RX.eur, function (_, n, e) { return dinero(n, e, 'euros'); }).replace(RX.eurPost, function (_, n) { return dinero(n, '', 'euros'); })
       .replace(RX.clp, function (_, n, e) { return dinero(n, e, 'pesos'); })
       .replace(/US\$/g, es ? 'dólares' : 'dollars');
  if (es) {
    t = t.replace(/\b(\d{1,3})\.000\.000\b(?![.,]\d)(?:\s+de\b)?(?=\s+[a-záéíóúñA-ZÁÉÍÓÚÑ])/g, function (x, n) { return (n === '1' ? '1 millón' : n + ' millones') + ' de'; })
         .replace(/\b(\d{1,3})\.000\.000\b(?![.,]\d)/g, function (x, n) { return n === '1' ? '1 millón' : n + ' millones'; })
         .replace(/\b(\d{1,3})\.(\d{3})\.000\b(?![.,]\d)/g, function (x, n, m) { return (n === '1' ? '1 millón ' : n + ' millones ') + (+m) + ' mil'; })
         .replace(/\by\/o\b/g, 'o');
    // 20-11-2026 (Germán: «respeta las pausas de la lectura, conforme a la puntuación y la ortografía»): una abreviatura no es fin de frase
    t = t.replace(/\bcofrad\.es\b/gi, 'cofrad punto es').replace(/\b[a-z0-9-]{2,}(?:\.[a-z0-9-]{2,})*\.(?:cl|com|org|net|gob|gov|io|ai|app)\b/g, function (m) { return m.replace(/\./g, ' punto '); })
         .replace(/\bS\.\s?p\.\s?A\.(?=\s+[A-ZÁÉÍÓÚÑ¿¡])/g, 'S P A.').replace(/\bS\.\s?p\.\s?A\./g, 'S P A').replace(/\bS\.\s?A\.(?=\s+[A-ZÁÉÍÓÚÑ¿¡])/g, 'S A.').replace(/\bS\.\s?A\./g, 'S A')
         .replace(/\b(Ltda|[Ee]tc|aprox)\.(?=\s+[A-ZÁÉÍÓÚÑ¿¡]|\s*$)/g, function (x, a) { return ABREV_ES[a.toLowerCase() === 'etc' ? 'etc' : a] + '.'; }).replace(/\b(Ltda|[Ee]tc|aprox)\./g, function (x, a) { return ABREV[a]; })
         .replace(/\bp\.\s?ej\./g, 'por ejemplo').replace(/\b(Sr|Sra|Srta|Dr|Dra|Av|Avda|Cía|Gral|Alm|Vicealm|Contralm|Cdte|Cmdte|Tte|Sgto|Prof|Profa|Ing|Pdte|Pdta|Mons|Sta|Sto|Pbro|Excmo|Hno|Nro|núm|Núm|tel|Tel|depto|Depto|pág|págs|vol|art|Art|inc)\.(?=\s)/g, function (x, a) { return ABREV_ES[a]; })
         .replace(/\b(\d{4,5})-(\d{2})\b/g, '$1 guion $2')   // boletines del Congreso: «18282-07»
         .replace(/([a-záéíóúñ)])([.;:!?])([A-ZÁÉÍÓÚÑ¿¡])/g, '$1$2 $3').replace(/([a-záéíóúñ]),(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/g, '$1, ')
         .replace(RX_TILDES, function (m, pre, x) { var r = TILDES[x.toLowerCase()]; if (!r) return m; return pre + (x === x.toUpperCase() && x.length > 1 ? r.toUpperCase() : /^[A-ZÑ]/.test(x) ? r.charAt(0).toUpperCase() + r.slice(1) : r); });
    t = t.replace(/\bEE\.\s?UU\.(?=\s+[A-ZÁÉÍÓÚÑ¿¡])/g, 'Estados Unidos.').replace(/\bEE\.\s?UU\.?/g, 'Estados Unidos').replace(/\bN\.?\s?[º°]\s?(?=\d)/g, 'número ').replace(/\bs\/n\b/gi, 'sin número')
         .replace(/\b([1-9]|10)\.?º/g, function (_, n) { return ORD[n] + (n == 1 || n == 3 ? 'o' : 'o'); }).replace(/\b([1-9]|10)\.?ª/g, function (_, n) { return ORD[n] + 'a'; })
         .replace(/\b1\.?er\b/g, 'primer').replace(/\b3\.?er\b/g, 'tercer').replace(/(\d+)\.[ºª]/g, '$1')
         .replace(/\bUF\b/g, 'U F').replace(/\bUTM\b/g, 'U T M').replace(/\bIPC\b/g, 'I P C').replace(/\bTPM\b/g, 'T P M').replace(/\bICA\b/g, 'I C A')
         .replace(/\bAFP\b/g, 'A F P').replace(/\bCMF\b/g, 'C M F')
         .replace(/\bkm\/h\b/g, 'kilómetros por hora').replace(/(\d)\s?km²/g, '$1 kilómetros cuadrados').replace(/(\d)\s?km\b/g, '$1 kilómetros')
         .replace(/(\d)\s?mm\b/g, '$1 milímetros').replace(/(\d)\s?cm\b/g, '$1 centímetros').replace(/(\d)\s?m\b(?![\wáéíóú])/g, '$1 metros')
         .replace(/(\d)\s?GWh\b/g, '$1 gigawatts hora').replace(/(\d)\s?MWh\b/g, '$1 megawatts hora').replace(/(\d)\s?kWh\b/g, '$1 kilowatts hora')
         .replace(/(\d)\s?GW\b/g, '$1 gigawatts').replace(/(\d)\s?MW\b/g, '$1 megawatts').replace(/(millones|millón)\s+t\b/g, '$1 de toneladas')
         .replace(/(\d)\s?t\b(?![\wáéíóú'])/g, '$1 toneladas').replace(/(\d)\s?kg\b/g, '$1 kilos').replace(/(\d)\s?ha\b/g, '$1 hectáreas')
         .replace(/µg\/m³/g, 'microgramos por metro cúbico').replace(/(\d)\s?°C?/g, '$1 grados').replace(/(\d)\s?pts?\b\.?/g, '$1 puntos').replace(/(\d)\s?pb\b/g, '$1 puntos base')
         .replace(/(\d)\s?h\b(?![\wáéíóú])/g, '$1 horas').replace(/\bM\s(\d+,\d)/g, 'magnitud $1').replace(/\b(\d)\/5\b/g, '$1 de 5').replace(/\bvs\.?\s/g, 'frente a ')
         .replace(/\b(al|del|hacia el)\s(N|S|E|O|W|NE|NO|NW|SE|SO|SW|NNE|ENE|ESE|SSE|SSO|SSW|OSO|WSW|ONO|WNW|NNO|NNW)\b(?=\s+de\b|[.,;)]|$)/g, function (_, p, r) { return p + ' ' + RUMBO[r]; });
    t = t.replace(/\b(lun|mar|mié|mie|jue|vie|sáb|sab|dom)\s(?=\d{1,2}-\d{2}\b)/g, function (_, d) { return DIAS[d] + ' '; });
  } else {
    t = t.replace(/\b(N|S|E|W|O|NE|NW|NO|SE|SW|SO)\s+of\b/g, function (_, r) { return RUMBO_EN[r] + ' of'; })
         .replace(/(\d)\s?°C?/g, '$1 degrees').replace(/(\d)\s?km\b/g, '$1 kilometers').replace(/(\d)\s?m\b(?![\w])/g, '$1 meters').replace(/(\d)\s?h\b(?![\w])/g, '$1 hours');
  }
  if (es) t = t.replace(/\b([A-ZÑ]{2,4})\b/g, function (x, a, off, todo) { if (MAY_PALABRA[x] && /\b[A-ZÁÉÍÓÚÑ]{2,}\s+[A-ZÁÉÍÓÚÑ]{2,}\b/.test(todo.slice(Math.max(0, off - 12), off + x.length + 12))) return x.toLowerCase(); return SIGLA_PALABRA[x] || /^[IVX]+$/.test(x) ? x : x.split('').join(' '); });   // «LA ECONOMÍA CRECE» (un título en mayúsculas) no se deletrea
  t = t.replace(/\b([A-ZÁÉÍÓÚÑ]{5,})\b/g, function (x) { return /[AEIOUÁÉÍÓÚ]/.test(x) && !/^[IVXLCDM]+$/.test(x) ? x.charAt(0) + x.slice(1).toLowerCase() : x; });
  // fechas: 18-11-2026, 18-11, 2026-09, 1894-1906; resultados 3-2 se leen «3 a 2»
  t = t.replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, function (x, d, m, a) { return fecha(d, m, a) || x; })
       .replace(/\b(1[5-9]\d\d|20\d\d)-(1[5-9]\d\d|20\d\d)\b/g, es ? '$1 a $2' : '$1 to $2')
       .replace(/\b(20\d\d)-(0[1-9]|1[0-2])\b(?!-)/g, function (x, a, m) { return mesAnio(m, a) || x; })
       .replace(/\b(\d{1,2})-(\d{2})\b(?!-)/g, function (x, d, m) { return fecha(d, m) || x; })
       .replace(/\b(\d{1,2})\s?-\s?(\d{1,2})\b(?!-)/g, es ? '$1 a $2' : '$1 to $2')
       .replace(/(\d a \d{1,2})\s(?=\d{1,2} a \d)/g, '$1, ')
       .replace(/\b(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\.?-(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\.?\s(\d{4})\b/g, function (x, a, b, y) { return mes(CORTOS[a]) + (es ? ' a ' : ' to ') + mesAnio(CORTOS[b] + 1, y); })
       .replace(/\b(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\.?\s(\d{4})\b/g, function (x, m, a) { return mesAnio(CORTOS[m] + 1, a) || x; })
       .replace(/\b(\d{1,2})\s(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\b\.?/g, function (x, d, m) { return fecha(d, CORTOS[m] + 1) || x; })
       .replace(/(\d{1,2}:\d{2})\s?[–-]\s?(\d{1,2}:\d{2})/g, es ? '$1 a $2' : '$1 to $2')
       .replace(/(^|[^\d:])0(\d):(\d\d)\b(?!:)/g, '$1$2:$3')
       .replace(/(\b(?:[Dd]e|[Dd]esde|[Ee]ntre|[Ll]as)\s+)?\b(\d{1,2}):00 a (\d{1,2})(?::(\d\d))?(?![\d:])(?:\s*(?:horas|hrs?|h)\b\.?)?/g, function (x, pre, a, b, m) { return es ? (pre || 'de ') + a + ' a ' + b + (m && m !== '00' ? ':' + m : ' horas') : x; })
       .replace(/\b(a la|la) 1:00(?:\s*(?:horas?|hrs?|h)\b\.?)?(?![\d:])/g, es ? '$1 una' : '$1 1')
       .replace(/\b(\d{1,2}):00(?:\s+(?:horas|hours|hrs?))?\b(?!:)/g, es ? '$1 horas' : "$1 o'clock");
  for (var pa = 0; pa < 2; pa++) t = t.replace(/\s*\(([^()]*)\)/g, ', $1,');   // un paréntesis se oye como una pausa, no como un salto
  // rayas: entre palabras pegadas, «Rusia–Ucrania» (y entre meses, «enero–septiembre»); con espacios, pausa o «al» antes de un número
  t = t.replace(/([A-Za-zÁÉÍÓÚáéíóúÑñ]+)–([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/g, function (x, a, b) { var m = MESES.concat(MESES_EN).map(function (z) { return z.toLowerCase(); }); return a + (m.indexOf(a.toLowerCase()) >= 0 && m.indexOf(b.toLowerCase()) >= 0 ? (es ? ' a ' : ' to ') : (es ? ' y ' : ' and ')) + b; })
       .replace(/\s[–—]\s(?=\d)/g, es ? ' al ' : ' to ').replace(/\s*[–—]\s*/g, ', ');
  t = t.replace(/\/(mes|año|día|month|year|day)\b/g, es ? ' al $1' : ' per $1').replace(/\/(barril|kilo|litro|onza|libra|tonelada|unidad|persona|habitante|barrel|pound|ounce|ton)\b/g, es ? ' por $1' : ' per $1').replace(/\/h\b/g, es ? ' por hora' : ' per hour')
       .replace(/([a-záéíóúñ]{3,})\/(as?|os?)\b/g, '$1').replace(/([A-Za-zÁÉÍÓÚáéíóúÑñ])\/([A-Za-zÁÉÍÓÚáéíóúÑñ])/g, es ? '$1 y $2' : '$1 and $2').replace(/\s\/\s/g, es ? ' y ' : ' and ').replace(EMOJI, ' ').replace(/\s*·\s*/g, ', ').replace(/\s*\|\s*/g, ', ')
       .replace(/\(\s*\)/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').replace(/([(¿¡])\s+/g, '$1').replace(/([,;:])(?:\s*[,;:])+/g, '$1').replace(/:\s*,/g, ':')
       .replace(/,\s*\./g, '.').replace(/,\s*$/, '').replace(/\.{2,}(?!\.)/g, '.').replace(/(^|[.,;:])\s*[,;:]+\s*/g, function (m, a) { return a ? a + ' ' : ''; }).replace(/\s{2,}/g, ' ').trim();
  return t;
}
function trozos(t) {   // tramos de hasta ~190 caracteres, sin cortar frases: cada corte es una pausa, y Chrome corta un tramo de más de ~15 s
  var max = Math.max(120, maxTramo()), out = [], cur = '';
  t.replace(/([.!?])\s+(?=\S)/g, '$1\u0001').split('\u0001').forEach(function (f) {
    f = f.trim(); if (!f) return;
    var partes = [];
    while (f.length > max + 30) {
      var c = Math.max(f.lastIndexOf(', ', max), f.lastIndexOf('; ', max), f.lastIndexOf(': ', max));
      if (c < 60) c = f.lastIndexOf(' ', max); if (c < 40) c = max;
      partes.push(f.slice(0, c + 1).trim()); f = f.slice(c + 1).trim();
    }
    if (f) partes.push(f);
    partes.forEach(function (x) { if (cur && cur.length + 1 + x.length > max) { out.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; });
  });
  if (cur) out.push(cur);
  return out;
}
function limpio(el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); }
function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim(); }

// ---------- la voz del aparato ----------
var voces = [], voz = null;
var FEM = /catalina|dalia|paloma|elvira|salom[eé]|paulina|paula|m[oó]nica|marisol|ximena|sof[ií]a|luc[ií]a|isabel|camila|laura|helena|sabina|valentina|abril|larissa|elena|esperanza|francisca|carmen|beatriz|ava|emma|jenny|aria|samantha|zira|libby|sonia|google espa|google us english/i;
var MAS = /jorge|diego|juan|lorenzo|[aá]lvaro|pablo|ra[uú]l|carlos|enrique|tom[aá]s|alex|andr[eé]s|gerardo|guy|david|mark|ryan|christopher|eric|brian|daniel|ricardo/i;
function puntaje(v, idioma) {
  var l = (v.lang || '').toLowerCase().replace('_', '-'), n = v.name || '', p = 10;
  if (l.slice(0, 2) !== idioma || /undefined/i.test(n + ' ' + l)) return -1;   // Edge 150 a veces entrega voces «Microsoft undefined Online»
  if (idioma === 'es') { if (/catalina/i.test(n)) p += 100; if (l === 'es-cl') p += 40; else if (/^es-(419|us|mx|co|ar|pe|ve)/.test(l)) p += 8; }
  else { if (/\b(ava|emma|jenny|aria)\b/i.test(n)) p += 30; if (l === 'en-us' || l === 'en-gb') p += 5; }
  if (/natural|neural|online|premium|enhanced|mejorad|wavenet|studio/i.test(n)) p += 30;
  if (FEM.test(n)) p += 15; else if (MAS.test(n)) p -= 10;
  if (v.localService === false) p += 3;
  return p;
}
function vocesIdioma() {   // las voces del idioma de la página, de la mejor a la peor
  var idioma = en() ? 'en' : 'es';
  if (SS) { try { voces = SS.getVoices() || voces; } catch (e) { /* */ } }
  return voces.filter(function (v) { return puntaje(v, idioma) >= 0; }).sort(function (a, b) { return puntaje(b, idioma) - puntaje(a, idioma); });
}
function elegirVoz() {
  var idioma = en() ? 'en' : 'es', mejor = null, pm = -1;
  voces = SS ? SS.getVoices() || [] : [];
  for (var i = 0; i < voces.length; i++) {
    var v = voces[i];
    if (P.v && v.name === P.v && (v.lang || '').toLowerCase().slice(0, 2) === idioma && !/undefined/i.test(v.name)) return (voz = v);
    var p = puntaje(v, idioma); if (p > pm) { pm = p; mejor = v; }
  }
  return (voz = mejor);
}
function vozNatural(v) { return !!v && /natural|neural|online|premium|enhanced|mejorad/i.test(v.name || '') && !/undefined/i.test(v.name || ''); }
function maxTramo() {   // cada corte entre tramos es una pausa: las voces neurales de Edge leen párrafos enteros; Chrome corta un tramo de más de ~15 s
  var n = (voz && voz.name) || '';
  if (/microsoft/i.test(n) && /natural|neural|online/i.test(n)) return continuo() ? 600 : 900;
  if (/^google/i.test(n)) return Math.round(190 * Math.min(1, R.rate));
  return 380;
}
var UA = navigator.userAgent || '', EDGE = /Edg\//.test(UA);
var MOVIL = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
var CROMO = /Chrome\/|Edg\//.test(UA) && !/OPR\/|SamsungBrowser|CriOS|FxiOS/.test(UA);
// escuchar mientras habla: Chrome y Edge de computador. En Android cada escucha suena con un pitido y en iPhone el micrófono baja el volumen de la voz.
function continuo() { return !(OIDO && OIDO.turnos) && (typeof CFG.continuo === 'boolean' ? CFG.continuo && !!SR : !!SR && !MOVIL && CROMO); }
if (SS) { elegirVoz(); try { SS.addEventListener('voiceschanged', elegirVoz); } catch (e) { SS.onvoiceschanged = elegirVoz; } }

// ---------- pronunciación bilingüe (19-11-2026) ----------
// Germán, 18:14 y 18:57: «las palabras cuyo origen son en idioma inglés la "Voz" las pronunciará con el acento correcto, como si fuese una
// persona bilingüe… y asimismo, para otros idiomas». Cada tramo se parte donde aparece un término o un nombre de otro idioma, y ese pedazo
// lo dice una voz nativa de ese idioma, si el aparato la tiene (si no, la de siempre). Los apellidos chilenos de origen extranjero
// (O'Higgins, Matthei, Walker, Kast) se quedan en castellano, como los dice cualquier chileno; y los términos breves que el castellano ya
// dice bien (app, web, show) no cambian de voz, porque cada cambio agrega una pausa corta. ?voz=monolingue lo apaga.
// Diccionario: términos separados por «|»; «^» delante, solo con mayúscula («Meta» no es «la meta»); «=», cómo se dice.
var LX = {"en": "Wall Street|Goldman Sachs|JP Morgan|J.P. Morgan|JPMorgan|Morgan Stanley|BlackRock|Bank of America|Citigroup|Citibank|Wells Fargo|Moody's|Standard & Poor's|S&P|S&P Global|Fitch Ratings|^Fitch|Federal Reserve|^Nasdaq|Dow Jones|New York Stock Exchange|^Bloomberg|^Reuters|Financial Times|The Economist|Wall Street Journal|New York Times|Washington Post|Oxford Economics|Capital Economics|^Barclays|^Scotiabank|^Morningstar|Berkshire Hathaway|Warren Buffett|^Mastercard|^PayPal|American Express|Western Union|West Texas Intermediate|private equity|venture capital|hedge fund|hedge funds|joint venture|crowdfunding|commodities|commodity|outsourcing|offshore|trading|trader|startup|fintech|proptech|insurtech|factoring|leasing|holding|royalty|lobby|rating|spread|swaps|dumping|stock|CEO|CFO|CTO|COO|MBA|IPO|KPI|SaaS|^Apple|^Google|^Alphabet|^Microsoft|^Amazon|^Meta|^Facebook|^Instagram|^WhatsApp|^YouTube|^TikTok|^Netflix|^Spotify|^Twitter|^LinkedIn|^Snapchat|^Pinterest|^Uber|^Airbnb|^SpaceX|^Starlink|^OpenAI|^ChatGPT|^Gemini|^Claude|^Anthropic|^Nvidia|^Qualcomm|^Oracle|^Salesforce|^Adobe|^Cisco|^iPhone|^iPad|^iOS|^Android|^Windows|^Copilot|^Kindle|^PlayStation|^Xbox|^Fortnite|^Minecraft|^Roblox|^Twitch|^Discord|^GitHub|^Walmart|^Starbucks|^McDonald's|^Cornershop|Black Friday|Cyber Monday|CyberDay|Cyber Day|software|hardware|online|offline|streaming|e-commerce|ecommerce|smartphone|smartwatch|wifi|wi-fi|bluetooth|router|gamer|gaming|esports|e-sports|podcast|influencer|youtuber|streamer|hashtag|selfie|feedback|e-mail|newsletter|password|login|backup|update|upgrade|big data|cloud|machine learning|deep learning|data center|chatbot|hacker|phishing|ransomware|malware|marketing|branding|retail|outlet|shopping|delivery|rider|food truck|fast food|brunch|coworking|home office|networking|freelance|freelancer|coaching|manager|meeting|deadline|target|ranking|reality|fashion|outfit|glamour|premium|bestseller|best seller|ticket|voucher|parking|living|hobby|sweater|Grand Slam|^Masters|US Open|Australian Open|Davis Cup|Billie Jean King Cup|ATP Finals|WTA Finals|tie-break|tiebreak|match point|break point|Premier League|Champions League|Europa League|Conference League|Super Bowl|playoff|playoffs|PGA Tour|PGA Championship|^PGA|LPGA|LIV Golf=Liv Golf|DP World Tour|Korn Ferry Tour|Ryder Cup|Presidents Cup|The Open|birdie|bogey|double bogey|eagle|albatross|putter|green|fairway|rough|bunker|driver|swing|caddie|handicap|hole in one|match play|stroke play|leaderboard|Caddie Golf|^Ironman|crossfit|fitness|running|trail running|spinning|training|skate|snowboard|rugby|hockey|pole position|Red Bull|McLaren|Aston Martin|New York|Silicon Valley|^Hollywood|^Washington|^Houston|^Boston|^Dallas|^Seattle|^Detroit|^Pittsburgh|^Philadelphia|^Denver|^Phoenix|Pebble Beach|^Augusta|^Wimbledon|^London|^Manchester|^Liverpool|^Chelsea|^Tottenham|^Newcastle|^Brighton|Aston Villa|West Ham|^Fulham|^Wolverhampton|Nottingham Forest|^Leicester|Crystal Palace|^Bournemouth|^Brentford|^Southampton|^Edinburgh|^Glasgow|^Oxford|^Cambridge|^Harvard|^Stanford|^Yale|^Princeton|^Berkeley|^Vancouver|^Sydney|^Melbourne|^Auckland|Hong Kong|^Wellington|Cape Town|^Johannesburg|^Brooklyn|^Manhattan|Donald Trump|^Trump|Joe Biden|^Biden|Kamala Harris|Elon Musk|^Musk|Jerome Powell|^Powell|Janet Yellen|Mark Zuckerberg|Bill Gates|Jeff Bezos|Tim Cook|Sam Altman|Jensen Huang|Taylor Swift|Beyoncé|Bruce Springsteen|Paul McCartney|Mick Jagger|Michael Jackson|Rolling Stones|The Beatles|^Coldplay|^Metallica|Bad Bunny|Tiger Woods|Scottie Scheffler|Rory McIlroy|Xander Schauffele|Bryson DeChambeau|Collin Morikawa|Jordan Spieth|Justin Thomas|Brooks Koepka|Dustin Johnson|Phil Mickelson|Taylor Fritz|Ben Shelton|Frances Tiafoe|Tommy Paul|Coco Gauff|Serena Williams|Venus Williams|Jessica Pegula|Madison Keys|Andy Murray|LeBron James|Stephen Curry|Michael Jordan|Tom Brady|Lewis Hamilton|Lando Norris|George Russell|Harry Kane|Jude Bellingham", "fr": "Roland Garros|Tour de France|Grand Prix|Paris Saint-Germain|Saint-Germain|Le Monde|Le Figaro|L'Équipe|Champs-Élysées|Élysée|Emmanuel Macron|^Macron|Marine Le Pen|Le Pen|Louis Vuitton|^Chanel|^Dior|Hermès|^Cartier|^Carrefour|^Renault|^Peugeot|Citroën|^Michelin|L'Oréal|^Danone|^TotalEnergies|^Airbus|BNP Paribas|Société Générale|Crédit Agricole|gourmet|boutique|croissant|champagne|ballet|bouquet|souvenir|déjà vu|rendez-vous|savoir-faire|foie gras|à la carte|avant-garde|haute couture|prêt-à-porter|^Cannes|^Montpellier|^Marseille|^Bordeaux|^Toulouse|^Nantes|^Strasbourg|^Versailles|^Louvre|Notre-Dame|^Montmartre|^Ligue", "pt": "São Paulo|Rio Grande do Sul|Grêmio|^Palmeiras|^Corinthians|^Flamengo|^Fluminense|^Botafogo|Vasco da Gama|^Petrobras|Itaú|^Bradesco|^Embraer|^Ambev|Folha de S.Paulo|O Globo|^Globo|Brasília|Belo Horizonte|Porto Alegre|^Lula|Lula da Silva|Luiz Inácio Lula da Silva|Jair Bolsonaro|^Bolsonaro|Geraldo Alckmin|^Alckmin|Fernando Haddad|^Haddad|Vinícius Júnior|Vini Jr.|^Benfica|^Itamaraty|^Planalto|reais", "de": "^Bundesliga|^Bayern|Borussia Dortmund|^Dortmund|^Bundestag|^Bundesbank|Deutsche Bank|Deutsche Telekom|^Volkswagen|^Siemens|^Lufthansa|^Allianz|^Bosch|^Porsche|Friedrich Merz|^Merz|Olaf Scholz|^Scholz|Angela Merkel|^Merkel|^Leipzig|^Schalke|^Wolfsburg|Bayer Leverkusen|^Leverkusen|^Oktoberfest|Toni Kroos|^Kroos|Ursula von der Leyen|von der Leyen", "it": "^Juventus|^Napoli|^Fiorentina|Giorgia Meloni|^Meloni|Sergio Mattarella|^Mattarella|^Maserati|^Lamborghini|^Gucci|^Versace|^Ferragamo|^Bulgari|^Pirelli|^Lavazza|^Barilla|espresso|cappuccino|Giro d'Italia|^Monza|^Imola"};
// 20-11-2026 (Germán: «hace una pausa previo a su mención y después de mencionarla»): cómo dice una voz castellana, sin cambiar de voz, cada término del diccionario
// (como lo diría un chileno bilingüe). Hecho con el diccionario de pronunciación CMU (licencia BSD) y revisado a mano: /tmp/titulos/v34/lexico.py
var RESP = {"Wall Street":"Uol Strit","Goldman Sachs":"Góldman Saks","JP Morgan":"Yei Pi Mórgan","J.P. Morgan":"Yei Pi Mórgan","JPMorgan":"Yei Pi Mórgan","Morgan Stanley":"Mórgan Stánli","BlackRock":"Blákrok","Bank of America":"Bank of Amérika","Citigroup":"Sítigrup","Citibank":"Sítibank","Wells Fargo":"Uels Fárgou","Moody's":"Múdis","Standard & Poor's":"Stándard and Purs","S&P":"Es and Pi","S&P Global":"Es and Pi Glóbal","Fitch Ratings":"Fich Réitings","Fitch":"Fich","Federal Reserve":"Féderal Resérv","Nasdaq":"Násdak","Dow Jones":"Dau Yóuns","New York Stock Exchange":"Niu York Stok Ekschéinch","Bloomberg":"Blúmberg","Reuters":"Róiters","Financial Times":"Fainánshal Taims","The Economist":"Di Ikónomist","Wall Street Journal":"Uol Strit Yérnal","New York Times":"Niu York Taims","Washington Post":"Uáshington Poust","Oxford Economics":"Óksford Ekonómiks","Capital Economics":"Kápital Ekonómiks","Barclays":"Bárkleis","Morningstar":"Mórningstar","Berkshire Hathaway":"Bérksher Játauei","Warren Buffett":"Uóren Báfet","Mastercard":"Másterkard","PayPal":"Péipal","American Express":"Amérikan Eksprés","Western Union":"Uéstern Yúnion","West Texas Intermediate":"Uest Téksas Intermídiet","private equity":"práivet ékuiti","venture capital":"vénchur kápital","hedge fund":"jech fand","hedge funds":"jech fands","joint venture":"yoint vénchur","crowdfunding":"kráudfanding","commodities":"komóditis","commodity":"komóditi","outsourcing":"autsórsing","offshore":"ofshór","trading":"tréiding","trader":"tréider","startup":"stártap","fintech":"fíntek","proptech":"próptek","insurtech":"ínsurtek","factoring":"fáktoring","leasing":"lísing","holding":"jólding","royalty":"róialti","lobby":"lóbi","rating":"réiting","spread":"spred","swaps":"suaps","dumping":"dámping","stock":"stok","CEO":"Si I Óu","CFO":"Si Ef Óu","CTO":"Si Ti Óu","COO":"Si Óu Óu","MBA":"Em Bi Éi","IPO":"Ai Pi Óu","KPI":"Kei Pi Ái","SaaS":"Sas","Apple":"Ápol","Google":"Gúgol","Alphabet":"Álfabet","Microsoft":"Máicrosoft","Amazon":"Ámason","Facebook":"Féisbuk","WhatsApp":"Uatsáp","YouTube":"Yutúb","TikTok":"Tíktok","Netflix":"Nétfliks","Spotify":"Spótifai","Twitter":"Tuíter","LinkedIn":"Línkedin","Snapchat":"Snápchat","Pinterest":"Píntrest","Airbnb":"Er bi en bi","SpaceX":"Speis Éks","Starlink":"Stárlink","OpenAI":"Ópen Ei Ái","ChatGPT":"Chat Yi Pi Tí","Gemini":"Yéminai","Claude":"Klod","Anthropic":"Antrópik","Nvidia":"Envídia","Qualcomm":"Kuálkom","Oracle":"Órakol","Salesforce":"Séilsfors","Adobe":"Adóubi","Cisco":"Sísko","iPhone":"Áifon","iPad":"Áipad","iOS":"Ai Óu Es","Windows":"Uíndous","Copilot":"Kópailot","Kindle":"Kíndel","PlayStation":"Pléisteishon","Xbox":"Éks Box","Fortnite":"Fórtnait","Minecraft":"Máinkraft","Twitch":"Tuich","Discord":"Dískord","GitHub":"Guít Jab","Walmart":"Uólmart","Starbucks":"Stárbaks","McDonald's":"Mac Dónalds","Cornershop":"Kórnershop","Black Friday":"Blak Fráidei","Cyber Monday":"Sáiber Mándei","CyberDay":"Sáiber Déi","Cyber Day":"Sáiber Déi","software":"sóftuer","hardware":"járduer","online":"onláin","offline":"ofláin","streaming":"stríming","e-commerce":"i kómers","ecommerce":"i kómers","smartphone":"smártfon","smartwatch":"smártuach","wifi":"uáifai","wi-fi":"uáifai","bluetooth":"blútuz","router":"rúter","gamer":"guéimer","gaming":"guéiming","esports":"i sports","e-sports":"i sports","podcast":"pódkast","influencer":"ínfluenser","youtuber":"yutúber","streamer":"strímer","hashtag":"jáshtag","selfie":"sélfi","feedback":"fídbak","e-mail":"iméil","newsletter":"niúsleter","password":"pásuord","login":"lóguin","backup":"bákap","update":"apdéit","upgrade":"apgréid","big data":"big déita","cloud":"klaud","machine learning":"mashín lérning","deep learning":"dip lérning","data center":"déita sénter","chatbot":"chátbot","hacker":"jáker","phishing":"físhing","ransomware":"ránsomuer","malware":"máluer","marketing":"márketing","branding":"bránding","retail":"ríteil","outlet":"áutlet","shopping":"shóping","delivery":"delíveri","rider":"ráider","food truck":"fud trak","fast food":"fast fud","brunch":"branch","coworking":"kouórking","home office":"jóum ófis","networking":"nétuerking","freelance":"frílans","freelancer":"frílanser","coaching":"kóching","manager":"mánayer","meeting":"míting","deadline":"dédlain","target":"tárguet","ranking":"ránking","reality":"riáliti","fashion":"fáshion","outfit":"áutfit","glamour":"glámur","premium":"prímium","bestseller":"bestséler","best seller":"best séler","ticket":"tíket","voucher":"váucher","parking":"párking","living":"líving","hobby":"jóbi","sweater":"suéter","Masters":"Másters","US Open":"Iu Es Óupen","Australian Open":"Ostréilian Óupen","Davis Cup":"Déivis Kap","Billie Jean King Cup":"Bíli Yin King Kap","ATP Finals":"A T P Fáinals","WTA Finals":"W T A Fáinals","tie-break":"tai bréik","tiebreak":"tai bréik","match point":"mach point","break point":"breik point","Premier League":"Prémier Lig","Champions League":"Chámpions Lig","Europa League":"Európa Lig","Conference League":"Kónferens Lig","Super Bowl":"Súper Bóul","playoff":"pléiof","playoffs":"pléiofs","PGA Tour":"P G A Tur","PGA Championship":"P G A Chámpionship","PGA":"P G A","LPGA":"L P G A","LIV Golf":"Liv Golf","DP World Tour":"Di Pi Uérld Tur","Korn Ferry Tour":"Korn Féri Tur","Ryder Cup":"Ráider Kap","Presidents Cup":"Présidents Kap","The Open":"Di Óupen","birdie":"bérdi","bogey":"bóugui","double bogey":"dábel bóugui","eagle":"íguel","albatross":"álbatros","putter":"páter","green":"grin","fairway":"féruei","rough":"raf","bunker":"bánker","driver":"dráiver","swing":"suing","caddie":"kádi","handicap":"jándikap","hole in one":"jóul in uán","match play":"mach plei","stroke play":"stróuk plei","leaderboard":"líderbord","Caddie Golf":"Kádi Golf","Ironman":"Áironman","crossfit":"krósfit","fitness":"fítnes","running":"ráning","trail running":"treil ráning","spinning":"spíning","training":"tréining","skate":"skeit","snowboard":"snóubord","rugby":"rágbi","hockey":"jóki","pole position":"póul posíshon","Red Bull":"Red Bul","McLaren":"Mac Láren","Aston Martin":"Áston Mártin","New York":"Niu York","Silicon Valley":"Sílikon Váli","Hollywood":"Jóliud","Washington":"Uáshington","Houston":"Jiúston","Boston":"Bóston","Dallas":"Dálas","Seattle":"Siátel","Detroit":"Detróit","Pittsburgh":"Pítsberg","Philadelphia":"Filadélfia","Denver":"Dénver","Phoenix":"Fíniks","Pebble Beach":"Pébel Bich","Augusta":"Ogásta","Wimbledon":"Uímbledon","London":"Lándon","Manchester":"Mánchester","Liverpool":"Líverpul","Chelsea":"Chélsi","Tottenham":"Tótenam","Newcastle":"Niúkasel","Brighton":"Bráiton","Aston Villa":"Áston Víla","West Ham":"Uest Jam","Fulham":"Fúlam","Wolverhampton":"Uúlverjámpton","Nottingham Forest":"Nótingam Fórest","Leicester":"Léster","Crystal Palace":"Krístel Pálas","Bournemouth":"Bórnmuz","Brentford":"Bréntford","Southampton":"Sautjámpton","Edinburgh":"Édimbra","Glasgow":"Gláskou","Oxford":"Óksford","Cambridge":"Kéimbrich","Harvard":"Járverd","Stanford":"Stánferd","Yale":"Yeil","Princeton":"Prínsten","Berkeley":"Bérkli","Vancouver":"Vankúver","Sydney":"Sídni","Melbourne":"Mélbern","Auckland":"Ákland","Wellington":"Uélington","Cape Town":"Keip Taun","Johannesburg":"Yojánesberg","Brooklyn":"Brúklin","Manhattan":"Manjátan","Donald Trump":"Dónald Tramp","Trump":"Tramp","Joe Biden":"Yóu Báiden","Biden":"Báiden","Kamala Harris":"Kámala Járis","Elon Musk":"Ílon Mask","Musk":"Mask","Jerome Powell":"Yeróum Páuel","Powell":"Páuel","Janet Yellen":"Yánet Yélen","Mark Zuckerberg":"Mark Súkerberg","Bill Gates":"Bil Guéits","Jeff Bezos":"Yef Bésos","Tim Cook":"Tim Kuk","Sam Altman":"Sam Óltman","Jensen Huang":"Yénsen Juang","Taylor Swift":"Téiler Suift","Beyoncé":"Biyónsei","Bruce Springsteen":"Brus Spríngstin","Paul McCartney":"Pol Mac Cártni","Mick Jagger":"Mik Yáguer","Michael Jackson":"Máikol Yákson","Rolling Stones":"Róling Stóuns","The Beatles":"De Bítels","Coldplay":"Kóldplei","Metallica":"Metálika","Bad Bunny":"Bad Báni","Tiger Woods":"Táiguer Guds","Scottie Scheffler":"Skóti Shéfler","Rory McIlroy":"Róri Mákilroi","Xander Schauffele":"Sánder Shófeli","Bryson DeChambeau":"Bráison Déshambou","Collin Morikawa":"Kólin Morikáua","Jordan Spieth":"Yórdan Spiz","Justin Thomas":"Yástin Tómas","Brooks Koepka":"Bruks Képka","Dustin Johnson":"Dástin Yónson","Phil Mickelson":"Fil Míkelson","Taylor Fritz":"Téiler Frits","Ben Shelton":"Ben Shélton","Frances Tiafoe":"Fránsis Tiafó","Tommy Paul":"Tómi Pol","Coco Gauff":"Kóko Gof","Serena Williams":"Serína Uíliams","Venus Williams":"Vínus Uíliams","Jessica Pegula":"Yésika Pegúla","Madison Keys":"Mádison Kis","Andy Murray":"Ándi Mári","LeBron James":"Lebrón Yéims","Stephen Curry":"Stíven Kári","Michael Jordan":"Máikol Yórdan","Tom Brady":"Tom Bréidi","Lewis Hamilton":"Lúis Jámilton","Lando Norris":"Lándo Nóris","George Russell":"Yorch Rásel","Harry Kane":"Jéri Kein","Jude Bellingham":"Yud Bélingam","Linkedin":"Línkedin","Roland Garros":"Rolán Garrós","Tour de France":"Tur de Frans","Grand Prix":"Gran Pri","Paris Saint-Germain":"Parí San Yermán","Saint-Germain":"San Yermán","Le Monde":"Le Mond","Le Figaro":"Le Fígaro","L'Équipe":"Lekíp","Champs-Élysées":"Shans Elisé","Élysée":"Elisé","Emmanuel Macron":"Emanuel Macrón","Macron":"Macrón","Marine Le Pen":"Marín Le Pen","Louis Vuitton":"Luí Vuitón","Chanel":"Shanel","Hermès":"Ermés","Cartier":"Cartié","Carrefour":"Carfur","Renault":"Renó","Peugeot":"Peyó","Citroën":"Citroén","Michelin":"Mishlán","L'Oréal":"Loreal","Danone":"Danón","TotalEnergies":"Total Enerjí","Airbus":"Érbus","BNP Paribas":"Be Ene Pe Paribá","Société Générale":"Sosieté Yeneral","Crédit Agricole":"Credí Agricol","gourmet":"gurmé","boutique":"butík","croissant":"cruasán","champagne":"champán","ballet":"balé","bouquet":"buké","souvenir":"suvenír","déjà vu":"deyavú","rendez-vous":"randevú","savoir-faire":"suavar fer","foie gras":"fua grá","à la carte":"a la cart","avant-garde":"avangard","haute couture":"ot cutur","prêt-à-porter":"pretaporté","Cannes":"Can","Montpellier":"Montpelié","Marseille":"Marséi","Bordeaux":"Bordó","Toulouse":"Tulús","Nantes":"Nant","Strasbourg":"Strasbur","Versailles":"Versái","Louvre":"Luvr","Notre-Dame":"Notr Dam","Montmartre":"Monmartr","Ligue":"Lig","São Paulo":"Sao Paulo","Grêmio":"Gremio","Corinthians":"Corintians","Folha de S.Paulo":"Folia de Sao Paulo","Jair Bolsonaro":"Yaír Bolsonaro","Geraldo Alckmin":"Yeraldo Alkmin","Alckmin":"Alkmin","Vinícius Júnior":"Vinísius Yúnior","Vini Jr.":"Vini Yúnior","Itamaraty":"Itamarati","reais":"reáis","Bayern":"Báyern","Deutsche Bank":"Dóiche Bank","Deutsche Telekom":"Dóiche Télekom","Volkswagen":"Folksvaguen","Siemens":"Símens","Bosch":"Bosh","Porsche":"Pórshe","Friedrich Merz":"Fridrij Merts","Merz":"Merts","Olaf Scholz":"Ólaf Sholts","Scholz":"Sholts","Angela Merkel":"Ánguela Merkel","Leipzig":"Láipsig","Schalke":"Shalke","Wolfsburg":"Volfsburg","Bayer Leverkusen":"Báyer Léverkusen","Toni Kroos":"Toni Krus","Kroos":"Krus","Ursula von der Leyen":"Úrsula fon der Láien","von der Leyen":"fon der Láien","Giorgia Meloni":"Yóryia Meloni","Sergio Mattarella":"Séryio Matarela","Mattarella":"Matarela","Lamborghini":"Lamborguini","Gucci":"Guchi","Versace":"Versache","Pirelli":"Pireli","Lavazza":"Lavatsa","Barilla":"Barila","cappuccino":"capuchino","Giro d'Italia":"Yiro de Italia","Aaron":"éron","Adam":"ádam","Alan":"álan","Andrew":"ándru","Andy":"ándi","Anthony":"ántoni","Arthur":"árter","Austin":"óstin","Barry":"bári","Bill":"bil","Billy":"bíli","Blades":"bleids","Bobby":"bóbi","Brandon":"brándon","Brian":"bráien","Brooks":"bruks","Bruce":"brus","Bryson":"bráisen","Carl":"karl","Charles":"charls","Charlie":"chárli","Chris":"kris","Christopher":"krístofer","Cody":"kódi","Colin":"kólin","Collin":"kólin","Connor":"kóner","Corey":"kóri","Craig":"kreig","Dale":"deil","Danny":"dáni","Darren":"dáren","Dave":"deiv","Dean":"din","Dennis":"dénis","Derek":"dérek","Donald":"dónald","Doug":"dag","Douglas":"dáglas","Dustin":"dástin","Dylan":"dílen","Eddie":"édi","Edward":"éduerd","Eric":"érik","Erik":"érik","Ethan":"ítan","Gary":"guéri","Gavin":"gávin","George":"yorch","Gordon":"górdon","Graham":"gréiam","Gregory":"grégueri","Harold":"jérold","Harry":"jéri","Hayden":"jéiden","Henry":"jénri","Howard":"jáuerd","Jack":"yak","Jacob":"yéikob","Jake":"yeik","James":"yeims","Jamie":"yéimi","Jared":"yéred","Jason":"yéison","Jeff":"yef","Jeffrey":"yéfri","Jeremy":"yéremi","Jerome":"yeróm","Jerry":"yéri","Jim":"yim","Jimmy":"yími","Joe":"you","Joel":"yóuel","John":"yon","Johnny":"yóni","Jonathan":"yónatan","Jordan":"yórdan","Joseph":"yósef","Josh":"yosh","Joshua":"yóshue","Justin":"yástin","Keegan":"kígan","Keith":"kit","Kenneth":"kénet","Kevin":"kévin","Kyle":"kail","Larry":"léri","Lawrence":"lórens","Lewis":"lúis","Logan":"lógan","Luke":"luk","Matt":"mat","Matthew":"mátyu","Michael":"máikal","Mike":"maik","Mitchell":"míchel","Nathan":"néitan","Neil":"nil","Nicholas":"níkolas","Nick":"nik","Noah":"nóue","Oliver":"óliver","Owen":"óuen","Patrick":"pátrik","Paul":"pol","Pete":"pit","Peter":"píter","Phil":"fil","Philip":"fílip","Ralph":"ralf","Randy":"rándi","Ray":"rei","Raymond":"réimond","Richard":"rícherd","Rick":"rik","Rickie":"ríki","Robert":"róbert","Robbie":"róbi","Roger":"róyer","Ronald":"rónald","Rory":"róri","Ross":"ros","Roy":"roi","Russell":"rásel","Ryan":"ráien","Scott":"skot","Scottie":"skóti","Sean":"shon","Seth":"set","Shane":"shein","Stephen":"stíven","Steve":"stiv","Steven":"stíven","Stewart":"stúert","Terry":"téri","Thomas":"tómas","Timothy":"tímoti","Todd":"tod","Tommy":"tómi","Tony":"tóni","Travis":"trávis","Trace":"treis","Trevor":"tréver","Troy":"troi","Tyler":"táiler","Vince":"vins","Wayne":"uein","Will":"uil","William":"uílyim","Wyndham":"uíndem","Zach":"sak","Zachary":"sákeri","Jensen":"yénsen","Abigail":"ábigueil","Alice":"ális","Alison":"álison","Amanda":"amánda","Amber":"ámber","Amy":"éimi","Ann":"an","Ashley":"áshli","Betty":"béti","Beverly":"béverli","Brenda":"brénda","Brittany":"brítani","Carol":"károl","Catherine":"káterin","Charlotte":"shárlot","Cheryl":"shérel","Christina":"kristína","Christine":"kristín","Cindy":"síndi","Claire":"kler","Coco":"kókou","Courtney":"kórtni","Crystal":"krístel","Cynthia":"síntie","Danielle":"daniél","Debbie":"débi","Deborah":"débera","Denise":"denís","Diane":"daián","Donna":"dóna","Doris":"dóris","Dorothy":"dóroti","Elizabeth":"elísabet","Ellen":"élen","Emily":"émili","Emma":"éma","Frances":"fránses","Gail":"gueil","Grace":"greis","Hailey":"jéili","Hannah":"jána","Heather":"jéder","Helen":"jélen","Hillary":"jíleri","Holly":"jóli","Jacqueline":"yákulin","Jane":"yein","Janet":"yánet","Janice":"yánis","Jean":"yin","Jennifer":"yénifer","Jenny":"yéni","Jessica":"yésika","Jill":"yil","Joan":"yon","Joanne":"youán","Joyce":"yois","Judith":"yúdit","Judy":"yúdi","Julie":"yúli","Karen":"kéren","Kate":"keit","Katherine":"káterin","Kathleen":"katlín","Kathryn":"kátrin","Katie":"kéiti","Kayla":"kéila","Kelly":"kéli","Kimberly":"kímberli","Kristen":"krísten","Lauren":"lóren","Leslie":"lésli","Lily":"líli","Linda":"línda","Lisa":"lísa","Lori":"lóri","Madison":"mádison","Margaret":"márgueret","Marilyn":"mérilen","Martha":"márta","Mary":"méri","Megan":"méigan","Melanie":"mélani","Melissa":"melísa","Michelle":"mishél","Nancy":"nánsi","Natalie":"nátali","Nicole":"nikól","Olivia":"olívie","Pamela":"pámela","Rachel":"réichel","Rebecca":"rebéka","Rose":"ros","Ruth":"rut","Sally":"sáli","Samantha":"samánta","Sarah":"séra","Serena":"serína","Sharon":"sháron","Shirley":"shérli","Sophia":"sofíe","Stephanie":"stéfani","Susan":"súsan","Taylor":"téiler","Theresa":"terísa","Tiffany":"tífani","Tracy":"tréisi","Venus":"vínus","Wendy":"uéndi","Whitney":"uítni"};
function conjunto(s) { var o = {}; s.split(' ').forEach(function (w) { if (w) o[w] = 1; }); return o; }
var EN_NOMBRES = conjunto("aaron adam alan andrew andy anthony arthur austin barry ben bill billy blades bob bobby brad brandon brian brooks bruce bryson carl chad charles charlie chris christopher cody colin collin connor corey craig dale dan danny darren dave dean dennis derek don donald doug douglas dustin dylan ed eddie edward eric erik ethan frank fred gary gavin george gordon graham greg gregory harold harry hayden henry howard jack jacob jake james jamie jared jason jeff jeffrey jeremy jerome jerry jim jimmy joe joel john johnny jonathan jordan joseph josh joshua justin keegan keith ken kenneth kevin kyle larry lawrence lewis logan luke mark matt matthew michael mike mitchell nathan neil nicholas nick noah oliver owen patrick paul pete peter phil philip ralph randy ray raymond richard rick rickie rob robert robbie roger ron ronald rory ross roy russell ryan sam scott scottie sean seth shane stephen steve steven stewart ted terry thomas tim timothy todd tom tommy tony travis trace trevor troy tyler vince wayne will william wyndham xander zach zachary elon jensen kamala abigail alice alison amanda amber amy ann ashley betty beverly brenda brittany carol catherine charlotte cheryl christina christine cindy claire coco courtney crystal cynthia danielle debbie deborah denise diane donna doris dorothy elizabeth ellen emily emma frances gail grace hailey hannah heather helen hillary holly jacqueline jane janet janice jean jennifer jenny jessica jill joan joanne joyce judith judy julie karen kate katherine kathleen kathryn katie kayla kelly kim kimberly kristen lauren leslie lily linda lisa lori madison margaret marilyn martha mary megan melanie melissa michelle nancy natalie nicole olivia pamela rachel rebecca rose ruth sally samantha sarah serena sharon shirley sophia stephanie susan taylor theresa tiffany tracy venus wendy whitney"), ES_NOMBRES = conjunto("jose juan luis carlos jorge manuel francisco pedro miguel sergio ricardo rodrigo gonzalo felipe cristian cristobal joaquin matias ignacio andres sebastian diego pablo alejandro fernando eduardo alberto marcelo mauricio claudio patricio hernan raul rafael roberto mario hector oscar tomas vicente benjamin agustin martin nicolas javier enrique arturo alvaro jaime guillermo rene osvaldo gustavo cesar ivan victor hugo marco antonio jon thiago matheus maria ana carmen isabel camila valentina francisca catalina constanza fernanda javiera carolina daniela paula macarena josefa antonia sofia florencia ignacia trinidad consuelo soledad pilar veronica paulina alejandra claudia marcela monica lorena ximena cecilia gloria rosa teresa patricia beatriz evelyn karina natalia andrea angela lucia elena silvia adriana viviana susana raquel margarita ines irene laura julia diana victoria virginia sara sandra barbara"), ES_APELLIDOS = conjunto("soto rojas silva contreras sepulveda morales reyes fuentes castillo espinoza torres araya flores valenzuela castro tapia vargas pizarro cortes rivera nunez herrera medina vega campos vera munoz jara cardenas caceres riquelme aravena carrasco sandoval figueroa salazar molina cisternas orellana toro alarcon garrido gallardo olivares bravo guzman parra saavedra pena romero navarro aguilera cabrera leiva troncoso poblete vidal acevedo cornejo ortiz ramos quezada maldonado miranda zuniga mora salinas palma donoso lagos allende alessandri montt prat lavin pinera toha vodanovic chahuan ossandon coloma macaya moreira desbordes sichel briones marcel grau crispi vallejo cariola mirosevic goic letelier pinochet insulza ominami velasco provoste rincon elizalde montes uriarte orrego larrain errazuriz matte luksic paulmann solari saieh yarur angelini ponce said hasbun alcaraz garin jarry tabilo niemann pereira"),
  CL = conjunto("ohiggins matthei walker edwards kast kaiser schalper bachelet frei boric jadue chadwick hirsch winter jackson aylwin abbott mackenna cochrane williams simpson wilson lynch thomson obrien wooster cofrade lyon"), ES_TOPE = conjunto("chile chilena chileno chilenas chilenos santiago latinoamerica latam america latina peru argentina mexico brasil colombia espana europa estados unidos china rusia ucrania francia alemania italia inglaterra japon india canada australia banco central ministerio gobierno presidente presidenta senado camara congreso region ciudad universidad ley sur norte grupo fundacion corporacion compania empresa sociedad nacional internacional mundial copa liga torneo campeonato abierto serie juegos olimpicos panamericanos lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre linea instituto centro museo escuela colegio departamento servicio oficina consejo tribunal corte agencia club estadio parque plaza avenida calle puerto aeropuerto isla islas lago monte cerro golfo mar bahia cabo estrecho canal provincia comuna pueblo villa playa laboratorio clinica hospital fondo programa proyecto plan premio festival feria cumbre foro encuentro campana operacion mision telescopio observatorio nave armada ejercito fuerza aerea policia carabineros estado republica reino imperio rey reina papa san santa santo"), ES_COMUN = conjunto("hoy ayer manana el la los las lo un una unos unas en con por para segun tras durante desde hasta este esta estos estas ese esa eso tambien ademas pero sin sobre entre cuando mientras como que quien donde aunque si ya mas menos muy otro otra otros otras cada todo toda todos todas nuevo nueva nuevos nuevas primer primera primero segundo segunda gran mejor peor sus su al del y o e ni a ante bajo contra hacia mediante salvo hay fue es son era sera seran tiene tienen"), PARTICULA = conjunto("van von der den da di du le st mc mac"),
  EN_FUNCION = conjunto("by of the and for presented pres at to with from on in"), ABREV = conjunto("pres jr sr st mr mrs ms dr co inc ltd corp"), LUGARES_CL = conjunto("santiago valparaiso concepcion antofagasta iquique arica temuco rancagua talca chillan osorno valdivia coquimbo serena montt arenas calama copiapo atacama biobio maule nuble araucania aysen magallanes tarapaca chiloe quilpue talcahuano curico linares providencia condes nunoa maipu vitacura florida quilicura pudahuel renca recoleta independencia vina"), EN_COMUNES = conjunto("championship championships solutions services open tour cup league news times post journal bank capital partners holdings technologies technology systems energy global street valley beach city united classic invitational masters series finals media studios pictures records music foods airlines airways motors labs lab games sports review therapeutics institute college school center centre store camera island world americas monthly weekly daily net report magazine press network channel park square hall house tower bridge road avenue company corporation foundation trust fund management asset assets investment investments securities insurance health care pharma tech software data cloud mobile digital communications entertainment productions books publishing challenge trophy grand prix arena stadium garden gardens");
var RX_PAL = /[0-9A-Za-zÀ-ÖØ-öø-ɏḀ-ỿ&]+(?:['’][A-Za-zÀ-ÖØ-öø-ɏ]+)*/g;
function clavePal(w) { return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9&]/g, ''); }
function palabras(t) {
  var L = [], m; RX_PAL.lastIndex = 0;
  while ((m = RX_PAL.exec(t))) L.push({ s: m.index, e: m.index + m[0].length, w: m[0], k: clavePal(m[0]), l: '' });
  return L;
}
var BL = null;
function prepBL() {   // el diccionario, con las mismas claves que deja hablable() (en castellano, «PGA» se dice «P G A»)
  var base = en() ? 'en' : 'es';
  if (BL && BL.base === base) return BL;
  BL = { base: base, d: {} };
  for (var l in LX) {
    if (l === base) continue;
    LX[l].split('|').forEach(function (e) {
      if (!e) return;
      var cs = e.charAt(0) === '^'; if (cs) e = e.slice(1);
      var q = e.indexOf('='), forma = q > 0 ? e.slice(0, q) : e, dicho = q > 0 ? e.slice(q + 1) : '';
      var pw = palabras(hablable(forma)).filter(function (x) { return x.k; }), k = pw.map(function (x) { return x.k; });
      var ac = /[^\x00-\x7f]/.test(forma) ? pw.map(function (x) { return x.w.toLowerCase(); }) : null;   // «Grêmio» no es «gremio»: con tildes, tal cual
      if (k.length) (BL.d[k[0]] = BL.d[k[0]] || []).push({ k: k, l: l, cs: cs ? forma.charAt(0) : '', dicho: dicho, ac: ac });
    });
  }
  for (var c in BL.d) BL.d[c].sort(function (a, b) { return b.k.length - a.k.length; });
  return BL;
}
var RESP_C = null;
function prepRESP() {   // el léxico con las mismas claves que deja hablable() (solo con la página en castellano)
  if (RESP_C) return RESP_C;
  RESP_C = {};
  for (var f in RESP) { var k = palabras(hablable(f)).map(function (x) { return x.k; }).filter(Boolean); if (k.length) (RESP_C[k[0]] = RESP_C[k[0]] || []).push({ k: k, r: RESP[f] }); }
  for (var c in RESP_C) RESP_C[c].sort(function (a, b) { return b.k.length - a.k.length; });
  return RESP_C;
}
function pronunciar(T, a, b, RP) {   // en el tramo a..b, cada término conocido se reemplaza por cómo se dice («Walmart» → «Uólmart»)
  var hizo = false;
  for (var i = a; i <= b; i++) {
    var c = RP[T[i].k], plural = '';
    if (!c && T[i].k.length > 4 && /s$/.test(T[i].k)) { c = (RP[T[i].k.slice(0, -1)] || []).filter(function (x) { return x.k.length === 1; }); plural = 's'; }
    if (!c || !c.length) { if (T[i].ll || /[^\x00-\x7fáéíóúüñÁÉÍÓÚÜÑ]/.test(T[i].w)) { T[i].dicho = castellanizar(T[i].w); T[i].hasta = i; hizo = true; } continue; }
    for (var q = 0; q < c.length; q++) {
      var e = c[q], L = e.k.length, ok = i + L - 1 <= b;
      for (var j = 1; ok && j < L; j++) ok = T[i + j].k === e.k[j];
      if (!ok) continue;
      var r = e.r + (L === 1 ? plural : '');
      if (/^[a-záéíóúñ]/.test(r) && /^[A-ZÁÉÍÓÚÑ]/.test(T[i].w)) r = r.charAt(0).toUpperCase() + r.slice(1);
      T[i].dicho = r; T[i].hasta = i + L - 1; for (j = i + 1; j < i + L; j++) delete T[j].dicho;
      hizo = true; i += L - 1; break;
    }
  }
  return hizo;
}
function castellanizar(w) {   // letras que una voz castellana no conoce: «Świątek» → «Swiatek» (quedan las tildes, la ñ y la ü)
  return w.replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/đ/g, 'd').replace(/ı/g, 'i')
    .normalize('NFD').replace(/([^\u0300-\u036f])([\u0300-\u036f]+)/g, function (_, ch, m) {
      if (/[aeiouAEIOU]/.test(ch) && m.indexOf('\u0301') >= 0) return ch + '\u0301';
      if (/[nN]/.test(ch) && m.indexOf('\u0303') >= 0) return ch + '\u0303';
      if (/[uU]/.test(ch) && m.indexOf('\u0308') >= 0) return ch + '\u0308';
      return ch; }).normalize('NFC');
}
var PREF_L = { en: 'en-us', es: 'es-cl', fr: 'fr-fr', pt: 'pt-br', de: 'de-de', it: 'it-it', pl: 'pl-pl', fi: 'fi-fi', sv: 'sv-se', da: 'da-dk', cs: 'cs-cz' };
var VOZ_L = {};
function vozPara(l) {   // la mejor voz de ese idioma en el aparato (natural y femenina, como la de siempre), o null
  if (!SS || !l) return null;
  if (!voces.length) { try { voces = SS.getVoices() || []; } catch (e) { voces = []; } }
  if (VOZ_L.n !== voces.length) VOZ_L = { n: voces.length };
  if (l in VOZ_L) return VOZ_L[l];
  var mejor = null, pm = -1;
  for (var i = 0; i < voces.length; i++) {
    var v = voces[i], lg = (v.lang || '').toLowerCase().replace('_', '-'), n = v.name || '', p;
    if (lg.slice(0, 2) !== l || /undefined/i.test(n + ' ' + lg)) continue;
    if (l === 'es' || l === 'en') p = puntaje(v, l);
    else {
      p = 10; if (/natural|neural|online|premium|enhanced|wavenet|studio/i.test(n)) p += 30;
      if (lg === PREF_L[l]) p += 8; if (FEM.test(n)) p += 15; else if (MAS.test(n)) p -= 10; if (v.localService === false) p += 3;
    }
    if (/multilingual/i.test(n)) p -= 5;
    if (p > pm) { pm = p; mejor = v; }
  }
  return (VOZ_L[l] = mejor);
}
function mayus(w) { return /^[A-ZÀ-ÖØ-ÞĀ-Ž]/.test(w) && /[a-zß-öø-ÿ]/.test(w); }
function blando(g) { return /^[\s\-.'’&]{0,3}$/.test(g); }
function espa(w) { return /[áéíóúñ]/i.test(w) || /g[üu]/i.test(w) && /ü/i.test(w); }
function lenguaLetras(w, base) {   // letras que el castellano no usa: ã, ç, ß, ł, å…
  if (base === 'en' && /[áéíóúñ]/i.test(w) && !/[àèìòùâêîôûäëïöãõçœ]/i.test(w)) return 'es';
  if (/[ãõ]/i.test(w)) return 'pt';
  if (/[ąęłśźżćń]/i.test(w)) return 'pl';
  if (/ß/.test(w)) return 'de';
  if (/å/i.test(w)) return 'sv';
  if (/[øæ]/i.test(w)) return 'da';
  if (/[äöü]/i.test(w) && !/gü/i.test(w)) return /ü|sch|tz|ei|mann|berg|burg|stadt|dorf|heim|bach/i.test(w) ? 'de' : /(aa|ää|ii|kk|tt|nen|ki|la|lä)$|ää|kk/i.test(w) ? 'fi' : 'de';
  if (/[àâèêëîïôûùœç]/i.test(w)) return /ção|ções|[ãõ]/i.test(w) ? 'pt' : 'fr';
  if (/[ìò]/i.test(w)) return 'it';
  if (/[čšžřěů]/i.test(w)) return 'cs';
  return '';
}
function inglesa(k) {   // rasgos de la ortografía inglesa que el castellano no tiene
  if (k.length < 4 || CL[k] || ES_COMUN[k] || ES_TOPE[k]) return false;
  return /sh|th|ck|ght|ph|gh|w/.test(k) || /[^aeiouyr]y$/.test(k) || (k.length >= 5 && /[^r]ey$/.test(k)) ||
    (k.length >= 6 && /(son|ton|ley|ford|field|wood|worth|land|ridge|well|shire|ville|berg|stein)$/.test(k));
}
var TIT_EN = conjunto('president minister senator deputy governor mayor former chilean finance economy foreign interior central chief ceo executive general director secretary king queen prince pope ambassador judge justice chairman chairwoman leader candidate coach striker midfielder defender goalkeeper captain player star champion manager founder vice deputy');
function pareceEs(t) { var k = t.k; return !!(CL[k] || ES_APELLIDOS[k] || ES_NOMBRES[k] || LUGARES_CL[k] || espa(t.w) || (k.length > 4 && /[aeiou]z$/.test(k))); }
function pareceEn(t) { var k = t.k; return !!(EN_COMUNES[k] || EN_NOMBRES[k] || inglesa(k)); }
function lenguaNombre(G, base, inicio) {   // un nombre propio de una o más palabras: ¿en qué idioma lo diría una persona bilingüe?
  var ks = G.map(function (t) { return t.k; });
  if (ks.indexOf('cofrade') >= 0) return '';   // la marca «Cofrade News» va entera con la voz de la página, en castellano y en inglés
  if (base === 'en') return ks.some(function (k) { return CL[k] || ES_APELLIDOS[k] || LUGARES_CL[k] || (k.length > 4 && /[aeiou]z$/.test(k)); }) ? 'es' : '';
  if (G.length === 1 && inicio) return '';   // una palabra sola al comienzo de una frase puede ser cualquier palabra
  if (ks.some(function (k) { return CL[k] || ES_APELLIDOS[k] || ES_TOPE[k] || LUGARES_CL[k] || (k.length > 4 && /[aeiou]z$/.test(k)); })) return '';
  if (G.some(function (t) { return espa(t.w); })) return '';
  if (G.length === 1) return '';   // 20-11-2026: una palabra suelta fuera del diccionario queda en castellano (menos cambios de voz, lectura más pareja)
  if (ks.some(function (k) { return ES_NOMBRES[k]; })) return '';   // «Thiago Agustín Tirante»
  var ult = ks[ks.length - 1]; if (ult.length > 3 && /(a|o|ez)$/.test(ult) && !EN_COMUNES[ult]) return '';   // 20-11-2026: apellido con final castellano («Pamela Jiles Moreno»)
  return EN_NOMBRES[ks[0]] || ks.some(inglesa) ? 'en' : '';
}
function sigueIngles(t, suelto) {   // ¿sigue el nombre en inglés? pegado, solo palabras inglesas («Solutions»); tras «by» u «of», cualquier nombre que no sea castellano
  if (!mayus(t.w) || t.k.length < 2 || espa(t.w) || ES_TOPE[t.k] || ES_COMUN[t.k] || ES_NOMBRES[t.k] || ES_APELLIDOS[t.k] || CL[t.k]) return false;
  return suelto || EN_COMUNES[t.k] || EN_NOMBRES[t.k] || inglesa(t.k);
}
function idiomas(texto) {   // [{t, l, v, s}] los pedazos del tramo y la voz de cada uno; null si todo va en el idioma de la página
  if (!CFG.bilingue || !SS || !texto) return null;
  var B = prepBL(), base = B.base, T = palabras(texto), n = T.length, i, j, z;
  if (!n) return null;
  for (i = 0; i < n; i++) {   // 1) términos y nombres del diccionario: la frase más larga que calce
    var c = B.d[T[i].k];
    if (!c && T[i].k.length > 5 && /s$/.test(T[i].k) && !espa(T[i].w)) c = (B.d[T[i].k.slice(0, -1)] || []).filter(function (x) { return x.k.length === 1 && !x.cs && !x.ac; });   // startups, influencers
    if (!c || !c.length) continue;
    for (var q = 0; q < c.length; q++) {
      var e = c[q], L = e.k.length, ok = i + L <= n && (!e.cs || T[i].w.charAt(0) === e.cs);
      for (j = 1; ok && j < L; j++) ok = T[i + j].k === e.k[j] && blando(texto.slice(T[i + j - 1].e, T[i + j].s));
      for (j = 0; ok && e.ac && j < L; j++) ok = T[i + j].w.toLowerCase() === e.ac[j];
      if (!ok) continue;
      for (j = 0; j < L; j++) T[i + j].l = e.l;
      if (e.dicho) { T[i].dicho = e.dicho; T[i].hasta = i + L - 1; }
      i += L - 1; break;
    }
  }
  for (i = 0; i < n; i++) if (!T[i].l) T[i].ll = lenguaLetras(T[i].w, base);   // 2) letras de otros idiomas (ã, ç, ß, ł…)
  for (i = 0; i < n; i++) {   // 3) nombres propios: palabras con mayúscula seguidas («Chad Ramey», «Erik van Rooyen»)
    if (T[i].l || !mayus(T[i].w) || T[i].k.length < 2) continue;
    var g = [i]; j = i + 1;
    while (j < n && /^[\s-]{1,2}$/.test(texto.slice(T[j - 1].e, T[j].s)) && !T[j].l) {
      if (mayus(T[j].w) && T[j].k.length >= 2) { g.push(j); j++; continue; }
      if (PARTICULA[T[j].k] && j + 1 < n && mayus(T[j + 1].w) && !T[j + 1].l && /^[\s-]{1,2}$/.test(texto.slice(T[j].e, T[j + 1].s))) { g.push(j); j++; continue; }
      break;
    }
    var gi = g.slice();
    while (gi.length && (ES_COMUN[T[gi[0]].k] || ES_TOPE[T[gi[0]].k] || PARTICULA[T[gi[0]].k])) gi.shift();   // «Hoy», «Según», «La»: no son parte del nombre
    while (gi.length && (ES_TOPE[T[gi[gi.length - 1]].k] || PARTICULA[T[gi[gi.length - 1]].k] || ES_COMUN[T[gi[gi.length - 1]].k])) gi.pop();
    if (gi.length) {
      var a0 = gi[0], ini = a0 === 0 || /[.!?¿¡:;]/.test(texto.slice(T[a0 - 1].e, T[a0].s));
      var lg = ''; for (z = 0; z < gi.length && !lg; z++) lg = T[gi[z]].ll || '';   // «Iga Świątek»: todo el nombre en el idioma de sus letras
      if (!lg) lg = lenguaNombre(gi.map(function (x) { return T[x]; }), base, ini);
      if (lg === 'es' && base === 'en') {   // 20-11-2026: «Finance Minister Mario Marcel» → solo «Mario Marcel» con la voz castellana
        var f1 = -1, l1 = -1; for (z = 0; z < gi.length; z++) if (pareceEs(T[gi[z]])) { if (f1 < 0) f1 = z; l1 = z; }
        if (f1 >= 0) {
          while (l1 + 1 < gi.length && !pareceEn(T[gi[l1 + 1]])) l1++;
          while (f1 > 0 && !EN_FUNCION[T[gi[f1 - 1]].k] && !TIT_EN[T[gi[f1 - 1]].k] && !pareceEn(T[gi[f1 - 1]])) f1--;   // «President Gabriel Boric»: el nombre de pila va con su apellido
          gi = gi.slice(f1, l1 + 1);
        }
      }
      if (lg) for (z = 0; z < gi.length; z++) T[gi[z]].l = lg;
    }
    i = j - 1;
  }
  for (i = 0; i < n; i++) if (!T[i].l && T[i].ll) T[i].l = T[i].ll;
  if (base === 'es') for (i = 0; i < n; i++) {   // 4) lo que sigue pegado a un nombre en inglés («Austin Championship pres. by Compliance Solutions»)
    if (T[i].l !== 'en' || (i + 1 < n && T[i + 1].l)) continue;
    j = i + 1;
    while (j < n && !T[j].l) {
      var gp = texto.slice(T[j - 1].e, T[j].s);
      if (!(/^[\s-]{1,2}$/.test(gp) || (ABREV[T[j - 1].k] && /^\.\s?$/.test(gp)))) break;
      if (sigueIngles(T[j])) { T[j].l = 'en'; j++; continue; }
      var f = j; while (f < n && f - j < 2 && EN_FUNCION[T[f].k] && !T[f].l) f++;
      if (f > j && f < n && !T[f].l && sigueIngles(T[f], true)) { for (z = j; z <= f; z++) T[z].l = 'en'; j = f + 1; continue; }
      break;
    }
    i = j - 1;
  }
  for (i = 0; i < n; i++) if (T[i].l && (T[i].l === base || !vozPara(T[i].l))) T[i].l = '';   // sin voz de ese idioma: la de siempre
  var cambio = false;
  if (CFG.cambioMin) {   // 20-11-2026: cambiar de voz a mitad de frase obliga a cortar y a cerrar la entonación antes y después; dentro de una frase
    var RP = base === 'es' ? prepRESP() : null;   // va con la misma voz y su pronunciación del léxico; solo un tramo de 6 palabras o más (una cita en otro idioma) cambia de voz
    for (i = 0; i < n; i++) {
      if (!T[i].l) continue;
      j = i; while (j + 1 < n && T[j + 1].l === T[i].l) j++;
      var largo = 0, seguidas = 0;   // el tramo más largo sin comas: «Caddie Golf, The Golf News Net» son dos nombres cortos, no una cita
      for (z = i; z <= j; z++) { seguidas = z > i && /[,;:]/.test(texto.slice(T[z - 1].e, T[z].s)) ? 1 : seguidas + 1; if (seguidas > largo) largo = seguidas; }
      if (largo < CFG.cambioMin) {   // también un nombre que es una frase sola (tablas de deportes): una sola voz, sin alternar
        for (z = i; z <= j; z++) { T[z].l = ''; delete T[z].dicho; }
        if (RP && pronunciar(T, i, j, RP)) cambio = true;
      }
      i = j;
    }
  }
  var P = [], cur = null;
  for (i = 0; i < n; i++) { if (!cur || cur.l !== T[i].l) { cur = { l: T[i].l, a: i, b: i }; P.push(cur); } else cur.b = i; }
  if (P.length === 1 && !P[0].l && !cambio) return null;
  var out = [], desde = 0;
  for (var p = 0; p < P.length; p++) {
    var hasta = texto.length;
    if (p + 1 < P.length) { var b = T[P[p + 1].a].s, ab = /[^\s]*$/.exec(texto.slice(T[P[p].b].e, b))[0]; hasta = b - ab.length; }   // lo que va entre dos pedazos («, », « %; ») se queda con el anterior; «¿» o «(», con el siguiente
    var t = texto.slice(desde, hasta);
    for (z = P[p].b; z >= P[p].a; z--) if (T[z].dicho) t = t.slice(0, T[z].s - desde) + T[z].dicho + t.slice(T[T[z].hasta].e - desde);
    if (/[0-9A-Za-zÀ-ÿ]/.test(t)) out.push({ t: t.trim(), l: P[p].l, v: P[p].l ? vozPara(P[p].l) : null, s: desde });
    else if (out.length) out[out.length - 1].t += t.trim();
    desde = hasta;
  }
  return out.length > 1 || (out.length === 1 && (out[0].l || cambio)) ? out : null;
}

// ---------- estado ----------
var R = { rate: Math.min(1.6, Math.max(0.7, +P.r || 0.92)), on: false, modo: '', secs: [], i: -1, items: [], j: 0, grupo: 0,
          habla: 0, ultAusp: 0, inicioUtt: 0, pausado: false, sinMic: false, fallasOido: 0, espera: null, rec: null, ctx: null, ctaDicho: false };
var gen = 0, ultimoCorte = 0;   // cada orden nueva deja sin efecto lo que estaba en curso

var ECO = [];   // lo que la voz dijo hace poco: {t0, t1, w}
function decir(texto, op) {   // 19-11-2026: si el tramo trae palabras de otro idioma, cada pedazo con la voz de su idioma
  texto = hablable(texto);
  if (!texto) return Promise.resolve('fin');
  if (!SS) return Promise.resolve('error');
  var partes = null; try { partes = op && op.mono ? null : idiomas(texto); } catch (e) { partes = null; }
  var g0 = gen;
  if (!partes) return decirSeguro(texto, op, null, 0, texto, false, '', g0);
  return partes.reduce(function (pr, x, i) {   // un pedazo que falla no calla el resto: solo una orden nueva corta
    return pr.then(function (r) { if (r === 'cortado' || g0 !== gen) return 'cortado'; return decirSeguro(x.t, op, x.v, x.s, texto, i < partes.length - 1, x.l, g0); });
  }, Promise.resolve('fin'));
}
// 20-11-2026 (revisión independiente): si la voz de otro idioma falla (un teléfono que la lista sin tenerla instalada), ese pedazo va con
// la voz de siempre y esa voz no se vuelve a usar en la visita; si falla la voz que la persona eligió con «otra voz», se vuelve a la mejor.
function decirSeguro(t, op, vv, off, base, sigue, l, g0) {
  return decirUno(t, op, vv, off, base, sigue).then(function (r) {
    if (r !== 'error' || g0 !== gen) return r;
    if (vv) { VOZ_L[l] = null; diag('✖ falló la voz de ' + l + ': sigo con la de siempre'); return decirUno(t, op, null, off, base, sigue); }
    if (P.v) { P.v = ''; guardar(); voz = null; elegirVoz(); diag('✖ falló la voz elegida: vuelvo a la de siempre'); return decirUno(t, op, null, off, base, sigue); }
    return r;
  });
}
// 19-11-2026 (Germán, 22:40, desde un Android con Chrome: «la voz ahora no se escucha natural como humana»; suena «como llamada telefónica»
// y «otra voz, más robótica»): el tono más grave de la voz cálida (0,95; 0,93 en los títulos) suena bien en las voces naturales de
// Microsoft, que lo aplican como entonación, pero las voces de Google y de los teléfonos lo hacen con un filtro que las vuelve metálicas.
// Con ellas va el tono propio de la voz (1).
function tonoPara(v, t) { return v && /microsoft/i.test(v.name || '') && /natural|online|neural/i.test(v.name || '') ? t : 1; }
function decirUno(texto, op, vv, off, base, sigue) {
  return new Promise(function (res) {
    if (!texto) return res('fin');
    if (!sigue && !/[.!?…:;]$/.test(texto)) texto += '.';   // cierre de frase: la voz baja el tono como una persona
    if (!vozNatural(voz)) elegirVoz();
    if (texto.normalize) texto = texto.normalize('NFC');
    var f = fichas(texto), sil = f.w.map(silabas), u = new SpeechSynthesisUtterance(texto), listo = false, t0 = 0,
      eco = { t0: Date.now(), ts: 0, t1: 0, tb: 0, ci: 0, w: f.w, pos: f.pos, sil: sil, silTot: sil.reduce(function (x, y) { return x + y; }, 0), cortada: false,
        base: base, off: off || 0, item: !!(op && op.item), tg: R.trozosG, ti: R.trozoI };
    ECO.push(eco); if (ECO.length > 24) ECO.shift();
    var vz = vv || voz; if (vz) { u.voice = vz; u.lang = vz.lang; } else u.lang = en() ? 'en-US' : 'es-CL';
    var vel = Math.max(0.5, Math.min(2, R.rate * ((op && op.vel) || 1)));
    u.rate = vel; u.pitch = tonoPara(vz, (op && op.tono) || CFG.tono || 1); u.volume = 1;
    var g0 = gen;
    function fin(r) { if (listo) return; listo = true; clearTimeout(tope); eco.t1 = Date.now(); eco.cortada = r !== 'fin' || !t0; if (t0) R.habla += Date.now() - t0; res(r); }
    u.onstart = function () { t0 = eco.ts = Date.now(); };
    u.onboundary = function (e) { if (e && e.name !== 'sentence' && typeof e.charIndex === 'number') { eco.ci = e.charIndex; eco.tb = Date.now(); } };
    u.onend = function () {
      var dur = Date.now() - t0;
      if (!vv && t0 && !listo && eco.silTot >= 10 && dur >= 400) {   // calibra cuántas sílabas por segundo dice esta voz
        var sps = eco.silTot / (dur / 1000) / vel;
        if (sps >= CFG.spsMin && sps <= CFG.spsMax) R.spsBase = R.spsBase ? 0.7 * R.spsBase + 0.3 * sps : sps;
      }
      fin('fin');
    };
    u.onerror = function (e) { fin(e && (e.error === 'interrupted' || e.error === 'canceled') ? 'cortado' : 'error'); };
    var tope = setTimeout(function () { if (!t0) { try { SS.cancel(); } catch (e) { /* */ } } fin('fin'); }, 4000 + texto.length * 110 / R.rate);   // por si el motor no avisa el fin (o se trabó)
    var resp = Math.max(ultimoCorte + 120, MOVIL ? Math.max(NUBE.solto || 0, OIDO.cerro || 0) + 350 : 0) - Date.now();   // en el teléfono, un instante tras cerrar el micrófono
    if (resp > 0) setTimeout(function () { if (listo) return; if (g0 !== gen) return fin('cortado'); SS.speak(u); }, resp); else SS.speak(u);   // una orden nueva en esos 120 ms la deja sin efecto
  });
}
async function decirTodo(texto, g, op) {
  var f = trozos(hablable(texto)), it = op && op.item;
  if (it) { R.trozos = f; R.trozosG = (R.trozosG || 0) + 1; }   // una noticia: se recuerda en qué tramo va, por si hay que retomarla
  for (var i = 0; i < f.length; i++) { if (g !== gen) return false; if (it) R.trozoI = i; await decir(f[i], op); }
  return g === gen;
}
function respiro(ms, g) {   // un silencio corto entre una noticia y otra, como respira una persona al leer
  return new Promise(function (res) { if (!ms || g !== gen) return res(g === gen); setTimeout(function () { res(g === gen); }, ms); });
}
function tono() {   // aviso corto: «ahora puedes hablar»
  try {
    var A = W.AudioContext || W.webkitAudioContext; if (!A) return;
    R.ctx = R.ctx || new A(); var c = R.ctx, o = c.createOscillator(), v = c.createGain(), t = c.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1175, t + 0.09);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.18, t + 0.02); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(v); v.connect(c.destination); o.start(t); o.stop(t + 0.24);
  } catch (e) { /* sin sonido */ }
}
function puedeOir() { return !!SR && !R.sinMic; }
// palabras comparables: sin tildes ni signos y con los números como cifras («cinco» y «5» son lo mismo),
// con el lugar donde empieza cada una en el texto que se le da a la voz
function fichas(texto) {
  var w = [], pos = [], cur = '', ini = 0;
  for (var i = 0; i <= texto.length; i++) {
    var c = i < texto.length ? norm(texto.charAt(i)) : '';
    if (c) { if (!cur) ini = i; cur += c; }
    else if (cur) { w.push(NUM[cur] ? String(NUM[cur]) : cur); pos.push(ini); cur = ''; }
  }
  return { w: w, pos: pos };
}
function silabas(w) {   // largo hablado aproximado: dice en qué parte de la frase va la voz
  if (/^\d/.test(w)) return 2 * w.length;
  var m = w.match(/[aeiouy]+/g); return m ? m.length : 1;
}
function velHabla() { return (R.spsBase || 5.4) * R.rate; }   // sílabas por segundo; se calibra con cada frase que termina
function tiempos(u) {   // a qué hora dijo (o dirá) la voz cada palabra de una frase
  if (u.tt) return u.tt;
  var ini = u.ts || u.t0, out = [], i, a = 0, acum = [];
  for (i = 0; i < u.w.length; i++) { acum.push(a); a += u.sil[i]; }
  if (u.t1 && !u.cortada) {   // terminó: se reparte su duración real
    var ms = (u.t1 - ini) / Math.max(1, u.silTot);
    for (i = 0; i < u.w.length; i++) out.push(ini + (acum[i] + u.sil[i] / 2) * ms);
    return (u.tt = out);
  }
  var msE = 1000 / velHabla(), k = -1, base = ini;
  if (u.tb) for (i = 0; i < u.pos.length; i++) if (u.pos[i] <= u.ci) k = i;
  if (k >= 0) base = u.tb - acum[k] * msE;   // la última palabra que la voz avisó haber empezado ancla la cuenta
  for (i = 0; i < u.w.length; i++) out.push(base + (acum[i] + u.sil[i] / 2) * msE);
  if (u.t1) u.tt = out;
  return out;
}
function holgura(u, ahora) {   // cuánto puede errar la estimación de cuándo se dijo cada palabra
  if (u.t1 && !u.cortada) return 600 + 0.05 * (u.t1 - (u.ts || u.t0));   // las pausas de puntuación corren las palabras del medio
  if (u.tb && ahora - u.tb < 2500) return 1000;
  return 1800 + 0.15 * (ahora - (u.ts || u.t0));
}
function parecida(a, b) {   // igual; plural o género («vigente»/«vigentes», «político»/«política»); o una letra mal oída en palabras largas que empiezan igual
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (a === b + 's' || b === a + 's' || a === b + 'es' || b === a + 'es') return true;
  if (a.length === b.length && a.slice(0, -1) === b.slice(0, -1) && /[ao]/.test(a.slice(-1)) && /[ao]/.test(b.slice(-1))) return true;
  if (a.length < 6 || b.length < 6 || a.charAt(0) !== b.charAt(0) || Math.abs(a.length - b.length) > 1) return false;   // «pausa» y «causa» nunca se confunden
  var i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}
function enEstricto() { return !!OIDO.eco && Date.now() - OIDO.eco < CFG.ecoVigente; }   // la voz se ha oído por el micrófono hace poco (parlantes)
// Marca en lo oído lo que pudo ser eco de la propia voz: se alinea, en orden, con lo que la voz dijo en el lapso en que pudo
// colarse al micrófono. El lapso parte 1,5 s antes de que el reconocedor empezara a oír esa frase (su primer resultado
// provisorio): lo que la voz dijo antes ya no puede ser eco de esta frase. Si no se sabe cuándo empezó, se calcula por el
// largo de lo oído y, con parlantes, nunca baja de 4 segundos. En empate se prefiere lo más reciente.
function sinEco(frase, t0) {
  var O = norm(frase).split(' ').filter(Boolean), T = O.map(function (w) { return NUM[w] ? String(NUM[w]) : w; });
  var ahora = Date.now(), E = [], Ei = [], Ef = [], Ec = [];
  var lapso = t0 ? Math.max(CFG.ecoBase, ahora - t0 + 1500) : Math.max(CFG.ecoBase + T.length * CFG.ecoPorPalabra, enEstricto() ? CFG.ecoEstricto : 0);
  for (var i = 0; i < ECO.length; i++) {
    var u = ECO[i];
    if (!u.ts && !(u.t1 && !u.cortada)) continue;   // nunca sonó (cortada antes de empezar)
    if (u.t1 && ahora - u.t1 > lapso + 600 + 0.05 * (u.t1 - (u.ts || u.t0))) continue;
    var tt = tiempos(u), h = holgura(u, ahora), msS = u.t1 && !u.cortada ? (u.t1 - (u.ts || u.t0)) / Math.max(1, u.silTot) : 1000 / velHabla();
    var conf = !!(u.t1 && !u.cortada) || !!(u.tb && ahora - u.tb < 2500);   // hora medida, o anclada por Edge; si no, es solo una estimación
    for (var k = 0; k < u.w.length; k++) {
      var t = tt[k];
      if (u.cortada && t > u.t1 + 400) break;   // lo que no alcanzó a decir
      if (t < ahora - lapso - h || t > ahora + h) continue;
      E.push(u.w[k]); Ei.push(t - u.sil[k] * msS / 2); Ef.push(t + u.sil[k] * msS / 2); Ec.push(conf);
    }
  }
  var L = [], a, b, marca = [], ei = [];
  for (a = 0; a <= T.length; a++) { L.push([]); marca.push(false); ei.push(-1); for (b = 0; b <= E.length; b++) L[a].push(0); }
  for (a = T.length - 1; a >= 0; a--) for (b = E.length - 1; b >= 0; b--) L[a][b] = parecida(T[a], E[b]) ? 1 + L[a + 1][b + 1] : Math.max(L[a + 1][b], L[a][b + 1]);
  a = 0; b = 0;
  while (a < T.length && b < E.length) {
    if (L[a][b + 1] === L[a][b]) b++;   // saltar esta palabra de la voz no cuesta nada: se prefiere una más reciente
    else if (parecida(T[a], E[b]) && L[a][b] === 1 + L[a + 1][b + 1]) { marca[a] = true; ei[a] = b; a++; b++; }
    else a++;
  }
  var ti = ei.map(function (b2) { return b2 >= 0 ? Ei[b2] : 0; }), tf = ei.map(function (b2) { return b2 >= 0 ? Ef[b2] : 0; }), tc = ei.map(function (b2) { return b2 >= 0 && Ec[b2]; });
  return { O: O, T: T, marca: marca, ei: ei, ti: ti, tf: tf, tc: tc };
}
var RELLENO = { a: 1, la: 1, el: 1, lo: 1, los: 1, las: 1, de: 1, del: 1, al: 1, y: 1, e: 1, o: 1, que: 1, en: 1, un: 1, una: 1, eh: 1, em: 1, mm: 1, este: 1, esta: 1,
  por: 1, favor: 1, me: 1, ya: 1, ok: 1, okay: 1, bueno: 1, the: 1, to: 1, uh: 1, um: 1, please: 1 };
var PREVIA = { numero: 1, seccion: 1, punto: 1, item: 1, tema: 1, capitulo: 1, ir: 1, ve: 1, vamos: 1, lee: 1, leeme: 1, quiero: 1, escuchar: 1, pon: 1, abre: 1,
  number: 1, section: 1, go: 1, read: 1, indice: 1, indices: 1, menu: 1, index: 1 };   // 19-11-2026: «Índice» + número o título (Germán)
// 19-11-2026 (Germán: «que me permita interrumpir por voz en cualquier momento si deseo continuar con otra sección del Índice»): verbos para
// cambiar de sección. Solo cuentan junto a una sección (nombre o número); no entran al rescate del filtro de eco.
var NAVEGA = { pasa: 1, pasar: 1, pasate: 1, pasemos: 1, cambia: 1, cambiar: 1, cambiemos: 1, salta: 1, saltar: 1, saltate: 1, sigue: 1, seguir: 1, sigamos: 1,
  continua: 1, continuar: 1, continuemos: 1, llevame: 1, lleva: 1, vamos: 1, vayamos: 1, ve: 1, ir: 1, anda: 1, quiero: 1, ahora: 1, dame: 1, leeme: 1, lee: 1,
  pon: 1, ponme: 1, abre: 1, abreme: 1, escuchar: 1, oir: 1, go: 1, skip: 1, jump: 1, switch: 1, move: 1, continue: 1, take: 1 };
// Lo que dijo la persona ({frase, eco}), o null si todo lo oído era la propia voz. Con parlantes (la voz ya se oyó por el
// micrófono) se filtra con rigor; con audífonos (nunca se ha oído) se confía en la persona aunque repita palabras de la voz.
var SEGURAS = { indice: 1, todo: 1, mas: 1, sig: 1, repite: 1, ayuda: 1, tres: 1, sesenta: 1, no: 1 };
function deLaPersona(frase, t0, provisorio) {
  var r = sinEco(frase, t0), O = r.O, T = r.T, m = r.marca, i, n = 0, nm = 0, mayor = 0, nf = [];
  // tramos de eco: palabras marcadas que también van casi seguidas en lo que dijo la voz (las muletillas no cortan el tramo)
  var largo = [], tramo = [], cnt = 0, ult = -9;
  function cerrar() { for (var z = 0; z < tramo.length; z++) largo[tramo[z]] = cnt; tramo = []; cnt = 0; ult = -9; }
  for (i = 0; i < T.length; i++) {
    if (m[i]) {
      if (tramo.length && !RELLENO[T[i]] && !(r.ei[i] - ult >= 1 && r.ei[i] - ult <= 3)) cerrar();
      tramo.push(i); if (!RELLENO[T[i]]) cnt++; ult = r.ei[i];
    } else if (tramo.length && RELLENO[T[i]]) tramo.push(i);
    else { if (tramo.length) cerrar(); largo[i] = 0; }
  }
  if (tramo.length) cerrar();
  for (i = 0; i < T.length; i++) { if (RELLENO[T[i]]) continue; nf.push(i); n++; if (!m[i]) nm++; if (largo[i] > mayor) mayor = largo[i]; }
  if (!n) return null;
  if (mayor >= 3 && !provisorio) OIDO.eco = Date.now();   // tres palabras seguidas de la voz: el micrófono la está oyendo
  if (!nm && n >= 2 && !provisorio) {   // dos frases enteras de la voz en un minuto (aunque cortas): también es eco
    var ah = Date.now(); OIDO.dobles = OIDO.dobles.filter(function (z) { return ah - z < 60000; }); OIDO.dobles.push(ah);
    if (OIDO.dobles.length >= 2) OIDO.eco = ah;
  }
  var estricto = enEstricto(), eco = (n - nm) / n;
  if (!nm) {   // todo lo oído lo dijo también la voz
    var fuera = null, fiable = true;
    if (t0) {   // el eco empieza a oírse hasta ~1 s después de que la voz dijo esas palabras; quien las repite, habla después de oírlas
      var a1 = Infinity, b1 = 0;
      for (i = 0; i < T.length; i++) if (m[i] && !RELLENO[T[i]]) { if (r.ti[i] < a1) a1 = r.ti[i]; if (r.tf[i] > b1) b1 = r.tf[i]; if (!r.tc[i]) fiable = false; }
      if (a1 < Infinity && fiable) fuera = t0 > Math.max(b1 + 300, a1 + 1000);
    }
    if (fuera === true) return { frase: O.join(' '), eco: 0 };
    if (provisorio) return null;   // un provisorio que solo repite a la voz nunca actúa: decide el texto final
    if (!estricto && (fuera === false || (t0 && !fiable && n >= 2))) return null;   // empezó mientras la voz lo decía (o no se puede saber y son varias palabras suyas): es eco
    if (estricto && n === 2 && PREVIA[T[nf[0]]] && !/^(indices?|menus?|index)$/.test(T[nf[0]]) && r.ei[nf[1]] !== r.ei[nf[0]] + 1) return { frase: O.join(' '), eco: 0 };   // «número cinco»: la voz no lo dijo seguido
    var ctxQ = R.espera ? R.espera.ctx : R.pregunta;   // «índice» dicho justo cuando la voz pregunta «¿Te leo el índice?» es la respuesta, no su eco
    if (estricto && n === 1 && ctxQ) { var oq = orden(norm(O.join(' ')), ctxQ); if (oq && SEGURAS[oq.tipo]) return { frase: O.join(' '), eco: 0 }; }
    if (n >= 3 || estricto) return null;   // con parlantes, hasta una palabra suelta que la voz dijo hace poco es su eco
    return { frase: O.join(' '), eco: 0 };
  }
  var q = [], util = 0, guarda = [], cadena = 0;
  for (i = 0; i < T.length; i++) {
    var deja = !m[i] || (!estricto && largo[i] < 3), rescatada = false;
    if (!deja && estricto && !RELLENO[T[i]] && cadena < 2) {   // hasta dos palabras tras «quiero», «número», «lee»… son de la persona, aunque la voz las haya dicho
      var pr = nf.indexOf(i) - 1;
      if (pr >= 0 && guarda[nf[pr]] && (PREVIA[T[nf[pr]]] || cadena)) { deja = rescatada = true; cadena++; }
    }
    if (!RELLENO[T[i]] && !rescatada) cadena = 0;
    guarda[i] = deja;
    if (deja) { q.push(O[i]); if (!RELLENO[T[i]]) util++; }
  }
  return util ? { frase: q.join(' '), eco: eco } : null;
}
// ---------- oído en la nube (19-11-2026) ----------
// Germán, 18:18: «NO escuchó mi voz (debes repararlo URGENTE!!!!!)... Es de vital importancia que reconozcas el micrófono para ayudar a las
// personas "No videntes"». Microsoft Edge tiene caído su reconocimiento de voz desde abril de 2026 (responde «network» en varios países)
// y Firefox no lo trae. NubeRec imita al reconocedor del navegador (start, stop, abort, onstart, onresult, onerror, onend) para que el
// resto del oído no cambie: escucha el micrófono, detecta por volumen cuándo alguien habla, toma solo esa frase (0,3 a 7 s), la manda a
// /oido en WAV de 16 kHz y Workers AI (Whisper) la transcribe. Ni el sitio ni Cloudflare guardan el audio ni el texto.
var SR_NAVEGADOR = SR, NUBE = { st: null, soltar: 0, pedidos: 0, max: 400, motivo: '' };
function nubePosible() { return !!(W.fetch && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (W.AudioContext || W.webkitAudioContext)) && location.protocol !== 'file:'; }
function nubeSoltarLuego() {   // apaga el micrófono 4 s después de la última escucha (si el oído vuelve a abrirse antes, sigue el mismo)
  clearTimeout(NUBE.soltar);
  NUBE.soltar = setTimeout(function () { var st = NUBE.st; NUBE.st = null; if (st) { try { st.getTracks().forEach(function (x) { x.stop(); }); } catch (e) { /* */ } } }, 4000);
}
function wav16k(pcm, sr) {   // PCM 16 bits, mono, 16 kHz, con su encabezado RIFF
  var paso = sr / 16000, n = Math.floor(pcm.length / paso), out = new Int16Array(n);
  for (var i = 0; i < n; i++) {
    var a = Math.floor(i * paso), b = Math.max(a + 1, Math.floor((i + 1) * paso)), sum = 0;
    for (var k = a; k < b && k < pcm.length; k++) sum += pcm[k];
    var v = sum / (b - a); out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  var buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  function txt(o, t) { for (var j = 0; j < t.length; j++) dv.setUint8(o + j, t.charCodeAt(j)); }
  txt(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE'); txt(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); txt(36, 'data'); dv.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(out);
  return new Blob([buf], { type: 'audio/wav' });
}
function NubeRec() { this.lang = 'es-CL'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this._on = false; this._lista = []; }
NubeRec.prototype.start = function () {
  var self = this;
  if (self._on) throw new Error('InvalidStateError');
  self._on = true; clearTimeout(NUBE.soltar);
  var md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) { setTimeout(function () { self._err('audio-capture'); }, 0); return; }
  var vivo = NUBE.st && NUBE.st.active !== false && NUBE.st.getAudioTracks().some(function (x) { return x.readyState === 'live'; });
  (vivo ? Promise.resolve(NUBE.st) : md.getUserMedia({ audio: MOVIL ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } : { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })).then(function (st) {
    NUBE.st = st;
    if (!self._on) { if (MOVIL) { NUBE.st = null; NUBE.solto = Date.now(); try { st.getTracks().forEach(function (x) { x.stop(); }); } catch (e) { /* */ } return; } return nubeSoltarLuego(); }
    try { self._graf(st); } catch (e) { return self._err('audio-capture'); }
    if (self.onstart) self.onstart({});
    if (self.onaudiostart) self.onaudiostart({});
  }, function (e) { self._err(/NotAllowed|Security|Permission/i.test((e && e.name) || '') ? 'not-allowed' : 'audio-capture'); });
};
NubeRec.prototype._graf = function (st) {   // detector de voz por volumen: piso de ruido que se adapta y umbral más alto mientras la voz lee
  var self = this, AC = W.AudioContext || W.webkitAudioContext, ctx;
  try { ctx = new AC({ sampleRate: 16000 }); } catch (e) { ctx = new AC(); }
  try { if (ctx.resume) ctx.resume(); } catch (e) { /* */ }
  var sr = ctx.sampleRate, tam = sr <= 16000 ? 1024 : sr <= 24000 ? 2048 : 4096, dur = tam / sr;
  var src = ctx.createMediaStreamSource(st), pr = ctx.createScriptProcessor(tam, 1, 1);
  var piso = null, cal = 0, previo = [], seg = null, quieto = 0, arriba = 0, conVoz = 0, ecoN = [], refEco = null, tLee = 0;
  pr.onaudioprocess = function (ev) {
    if (!self._on) return;
    var d = ev.inputBuffer.getChannelData(0), s = 0;
    for (var i = 0; i < d.length; i++) s += d[i] * d[i];
    var db = 10 * Math.log10(s / d.length + 1e-12), copia = new Float32Array(d), lee = !!(SS && SS.speaking), ahora = Date.now();
    if (piso === null) piso = db;
    // 19-11-2026 (Germán: «cuando la voz comienza a leer ya no me permite interrumpirla»): el eco de la voz ya no sube el piso de ruido.
    // Antes el umbral terminaba 20 dB sobre la propia voz y, con parlantes, nadie podía interrumpirla. El eco se mide aparte (el nivel que
    // alcanzan 8 de cada 10 trozos de los últimos 3 s) y basta hablar algo más fuerte que él.
    if (lee) { tLee = ahora; if (!seg) { ecoN.push(db); if (ecoN.length > Math.round(3 / dur)) ecoN.shift(); if (ecoN.length >= 6) refEco = pct(ecoN, 0.8); } }
    else if (ahora - tLee > 2500) { ecoN = []; refEco = null; }
    if (!seg) {
      if (cal < 0.6 / dur) { cal++; piso = Math.min(piso, db); previo.push(copia); if (previo.length > 4) previo.shift(); return; }   // primeros 0,6 s: ruido de fondo
      var umbral = lee ? Math.max(piso + 12, refEco == null ? piso + 20 : refEco + CFG.margenEco, -50) : Math.max(piso + 12, -50);
      if (db < umbral) { if (!lee && ahora - tLee > 400) piso = db < piso ? db : piso + (db - piso) * 0.02; arriba = 0; previo.push(copia); if (previo.length > 4) previo.shift(); return; }
      if (++arriba * dur < (lee ? CFG.inicioLee : 0.12)) { previo.push(copia); if (previo.length > 5) previo.shift(); return; }
      seg = previo.slice(); seg.umbral = umbral; seg.idx = self._prov(); previo = []; quieto = 0; conVoz = arriba; seg.push(copia); return;
    }
    seg.push(copia);
    if (db < seg.umbral - 3) quieto++; else { quieto = 0; conVoz++; }
    if (quieto * dur >= 0.7 || seg.length * dur >= 7) {
      var x = seg, voz = conVoz * dur; seg = null; quieto = 0; arriba = 0; conVoz = 0;
      if (voz >= 0.3) self._enviar(x, sr, x.idx);
    }
  };
  src.connect(pr); pr.connect(ctx.destination);   // sale en silencio: el procesador no escribe nada, pero sin salida no corre
  self._ctx = ctx; self._src = src; self._pr = pr;
};
function pct(a, p) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; }
NubeRec.prototype._prov = function () {   // como el reconocedor del navegador: un provisorio vacío marca cuándo empezó a hablar la persona
  if (!this.continuous || !this.onresult) return null;
  var res = [{ transcript: '', confidence: 0 }]; res.isFinal = false; res.item = function (i) { return this[i]; };
  this._lista.push(res); this._lista.item = function (i) { return this[i]; };
  var i = this._lista.length - 1;
  try { this.onresult({ resultIndex: i, results: this._lista }); } catch (e) { /* */ }
  return i;
};
NubeRec.prototype._enviar = function (frames, sr, idx) {
  var self = this;
  if (NUBE.pedidos >= NUBE.max) return;
  if (self._vuelo) { self._cola = [frames, sr, idx]; return; }   // una a la vez: la frase que llega mientras espera reemplaza a la anterior
  var n = 0; frames.forEach(function (f) { n += f.length; });
  var pcm = new Float32Array(n), o = 0; frames.forEach(function (f) { pcm.set(f, o); o += f.length; });
  self._vuelo = true; NUBE.pedidos++;
  diag('☁ mando ' + (n / sr).toFixed(1) + ' s de voz');
  fetch('/oido?l=' + (/^en/i.test(self.lang) ? 'en' : 'es'), { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav16k(pcm, sr), credentials: 'same-origin' })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, s: r.status, j: j || {} }; }); })
    .then(function (x) {
      self._vuelo = false;
      if (!self._on) return;
      if (!x.ok) self._err(x.s === 403 || x.s === 415 || x.s === 413 ? 'aborted' : 'network', true);
      else if (x.j.t) self._res(String(x.j.t), idx);
      var c = self._cola; self._cola = null; if (c && self._on) self._enviar(c[0], c[1], c[2]);
    }, function () { self._vuelo = false; if (self._on) self._err('network', true); });
};
NubeRec.prototype._res = function (t, idx) {
  var res = [{ transcript: t, confidence: 0.9 }]; res.isFinal = true; res.item = function (i) { return this[i]; };
  if (idx != null && this._lista[idx] && this._lista[idx].isFinal === false) this._lista[idx] = res; else { this._lista.push(res); idx = this._lista.length - 1; }
  this._lista.item = function (i) { return this[i]; };
  diag('☁ entendí: «' + t + '»');
  if (this.onresult) this.onresult({ resultIndex: idx, results: this._lista });
  if (!this.continuous) this.stop();
};
NubeRec.prototype._cerrar = function () {
  var on = this._on; this._on = false;
  try { if (this._pr) { this._pr.onaudioprocess = null; this._pr.disconnect(); } if (this._src) this._src.disconnect(); if (this._ctx && this._ctx.close) this._ctx.close(); } catch (e) { /* */ }
  this._pr = this._src = this._ctx = null;
  if (MOVIL) { clearTimeout(NUBE.soltar); var st = NUBE.st; NUBE.st = null; NUBE.solto = Date.now(); if (st) { try { st.getTracks().forEach(function (x) { x.stop(); }); } catch (e) { /* */ } } }
  else nubeSoltarLuego();
  return on;
};
NubeRec.prototype._err = function (codigo, sigue) {
  if (this.onerror) this.onerror({ error: codigo });
  if (!sigue && this._cerrar() && this.onend) { var self = this; setTimeout(function () { if (self.onend) self.onend({}); }, 0); }
};
NubeRec.prototype.stop = function () { var self = this; if (self._cerrar() && self.onend) setTimeout(function () { if (self.onend) self.onend({}); }, 0); };
NubeRec.prototype.abort = NubeRec.prototype.stop;
function usarNube(motivo) {   // desde aquí el oído usa la nube (también cuando el del navegador falla por su red)
  if (SR === NubeRec || /[?&]voz=nativo\b/.test(location.search) || !nubePosible()) return false;
  SR = NubeRec; NUBE.motivo = motivo; R.sinMic = false; R.fallasOido = 0; diag('☁ oído en la nube (' + motivo + ')');
  return true;
}
// Sin reconocedor en el navegador (Firefox), o en Microsoft Edge (su reconocedor responde «network» desde abril de 2026): la nube desde el comienzo.
if (!/[?&]voz=nativo\b/.test(location.search) && nubePosible() && (/[?&]voz=nube\b/.test(location.search) || !SR || EDGE)) { SR = NubeRec; NUBE.motivo = !SR_NAVEGADOR ? 'sin-reconocedor' : EDGE ? 'edge' : 'forzada'; }

var OIDO = { rec: null, reinicios: [], tPausa: 0, eco: 0, dobles: [], ajenas: 0, redes: [], reposo: 0, avisoRed: false,
  turnos: '', arranco: false, oyo: false, cortas: 0, mudos: 0, denegadas: 0, cap: 0 };
var DIAG = [];
function diag(t) {   // bitácora visible de lo que hace el micrófono (para probar en un aparato real)
  if (!CFG.diag) return;
  var h = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
  DIAG.push(z(h.getMinutes()) + ':' + z(h.getSeconds()) + ' ' + t); if (DIAG.length > 9) DIAG.shift();
  var b = D.getElementById('cnVozDiag');
  if (!b) { b = D.createElement('div'); b.id = 'cnVozDiag'; b.setAttribute('aria-hidden', 'true'); b.setAttribute('data-voz', 'no'); b.setAttribute('data-no-tr', '');
    b.style.cssText = 'position:fixed;right:12px;bottom:96px;z-index:2147483001;max-width:min(440px,calc(100vw - 24px));padding:8px 10px;border-radius:10px;background:rgba(7,18,34,.92);color:#E8F0FF;font:12px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    D.body.appendChild(b); }
  b.textContent = 'Micrófono (diagnóstico)\n' + DIAG.join('\n');
}
function leyenda(t, ms) {   // un texto corto en la barra, unos segundos
  var e = D.getElementById('cnVozEst'); if (!e || !t) return;
  ms = ms || 3500; OIDO.cap = Date.now() + ms; e.textContent = t;
  setTimeout(function () { if (Date.now() >= OIDO.cap) { var e2 = D.getElementById('cnVozEst'); if (e2) e2.textContent = tx(R.est || 'eHabla'); } }, ms + 100);
}
function oiste(f) { if (f) leyenda(tx('oiste', { f: String(f).trim().slice(0, 60) })); }   // «Te escuché: …»
function caerATurnos(motivo) {   // la escucha continua no funciona aquí: se escucha por turnos, como en teléfonos
  if (OIDO.turnos) return;
  OIDO.turnos = motivo || 'falla'; diag('↓ paso a escuchar por turnos (' + OIDO.turnos + ')');
  oidoApagar();
  if (R.espera && R.espera.aTurnos) R.espera.aTurnos();   // la pregunta abierta sigue esperando, ahora por turnos
}
function oidoPrender() {
  if (!continuo() || !puedeOir() || OIDO.rec || !R.on) return;
  if (R.pausado && Date.now() - OIDO.tPausa > CFG.pausaOidoMs) return;   // en una pausa larga el micrófono descansa
  if (OIDO.reposo > Date.now()) return;   // la red falló seguido: se espera un rato (oidoReanudar lo vuelve a abrir)
  var r, inicio = {}, prov = {}, hecho = {}, ses = { ini: Date.now(), res: 0, error: '' };
  try { r = new SR(); } catch (e) { return caerATurnos('sin-reconocedor'); }
  r.lang = en() ? 'en-US' : 'es-CL'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
  r.onstart = function () { OIDO.arranco = true; diag('▶ escuchando'); };
  r.onspeechstart = function () {   // oyó a alguien: si en 6 s no llega ningún texto, el reconocedor no está entregando nada
    var antes = ses.res;
    setTimeout(function () { if (OIDO.rec !== r || ses.res > antes || !R.on) return; diag('… oyó voz pero no llegó texto'); if (++OIDO.mudos >= 2) caerATurnos('sin-texto'); }, 6000);
  };
  r.onresult = function (e) {
    ses.res++; OIDO.oyo = true; OIDO.mudos = 0;
    for (var i = e.resultIndex || 0; i < e.results.length; i++) {
      var x = e.results[i]; if (!x) continue;
      if (x.isFinal === false) {   // provisorio: marca cuándo empezó a oír esta frase y, si queda quieto 700 ms y es una orden clara, se actúa sin esperar el final
        if (!inicio[i]) inicio[i] = Date.now();
        var tp = (x[0] && x[0].transcript) || '';
        if (tp && !hecho[i] && (!prov[i] || prov[i].t !== tp)) {
          if (prov[i]) clearTimeout(prov[i].h);
          prov[i] = { t: tp, h: setTimeout((function (k, tt) { return function () { if (hecho[k] || OIDO.rec !== r) return; var hz = recibir([tt], inicio[k], true); if (hz) hecho[k] = hz; }; })(i, tp), RX_INDICE.test(norm(tp)) && /\s\S/.test(norm(tp)) ? CFG.provIndice : 700) };
        }
        continue;
      }
      if (prov[i]) clearTimeout(prov[i].h);
      var a = []; for (var k = 0; k < x.length; k++) if (x[k] && x[k].transcript) a.push(x[k].transcript);
      var t0 = inicio[i] || 0; delete inicio[i];
      if (hecho[i]) { corregir(a, t0, hecho[i]); continue; }   // ya se actuó con el provisorio: solo se corrige si el texto final pide otra cosa
      if (a.length) recibir(a, t0);
    }
  };
  r.onerror = function (e) {
    var x = (e && e.error) || 'error', t = Date.now(); ses.error = x;
    if (x !== 'no-speech' && x !== 'aborted') diag('✖ error: ' + x);
    if (x === 'service-not-allowed' && SR !== NubeRec && usarNube('servicio-del-navegador')) return;   // 19-11-2026: el servicio del navegador está bloqueado
    if (x === 'not-allowed' || x === 'service-not-allowed' || x === 'audio-capture') {
      if (!OIDO.arranco) { R.sinMic = true; R.aviso = 'sinMic'; oidoUI(); return; }   // nunca llegó a escuchar: no hay permiso o no hay micrófono
      if (++OIDO.denegadas >= 2) caerATurnos(x);   // ya había escuchado: se prueba por turnos
      return;
    }
    if (x === 'language-not-supported' || x === 'bad-grammar') return caerATurnos(x);
    if (x === 'network' && SR !== NubeRec && OIDO.redes.filter(function (z) { return t - z < 60000; }).length >= 1 && usarNube('red-del-navegador')) {   // 19-11-2026
      OIDO.redes = []; return;   // el reconocedor del navegador falló dos veces por su red: desde ahora, la nube (onend vuelve a abrir el oído)
    }
    if (x === 'network') {   // tres fallas de red en un minuto: descansa 30 s y avisa una sola vez
      OIDO.redes = OIDO.redes.filter(function (z) { return t - z < 60000; }); OIDO.redes.push(t);
      if (OIDO.redes.length >= 3) { OIDO.reposo = t + 30000; OIDO.redes = []; if (!OIDO.avisoRed) { OIDO.avisoRed = true; R.aviso = 'sinRed'; } }
    }
  };
  r.onend = function () {
    if (OIDO.rec === r) {
      OIDO.rec = null; oidoUI();
      var dura = Date.now() - ses.ini;
      if (dura < 1500 && !ses.res && ses.error !== 'network') OIDO.cortas++; else OIDO.cortas = 0;
      if (OIDO.cortas >= 3) return caerATurnos('se-corta');   // el navegador corta la escucha continua apenas empieza
    }
    oidoReanudar();
  };
  OIDO.rec = r;
  try { r.start(); } catch (e) { OIDO.rec = null; diag('✖ no pudo empezar: ' + (e && e.name)); }
  oidoUI();
}
function oidoReanudar() {   // Chrome cierra la escucha cada tanto: se vuelve a abrir mientras la voz esté encendida
  if (!R.on || !continuo() || !puedeOir() || MIC.estado === 'denied') return;
  var t = Date.now();
  OIDO.reinicios = OIDO.reinicios.filter(function (x) { return t - x < 20000; }); OIDO.reinicios.push(t);
  setTimeout(oidoPrender, OIDO.reposo > t ? OIDO.reposo - t + 50 : OIDO.reinicios.length > 6 ? 4000 : 250);   // si se cierra muy seguido, respira antes de volver
}
// 19-11-2026 (Germán: «no puede ser que cada un minuto me aparezca en pantalla un pop-up… debe preguntar una única vez al comienzo»):
// el navegador pide el permiso la primera vez que se abre el micrófono, y en un sitio seguro (https) lo recuerda. Aquí se pide UNA vez,
// dentro del mismo toque que enciende la voz, y se vigila el permiso: si queda bloqueado, el oído no vuelve a intentarlo (ni avisos repetidos).
// Abierto como archivo del computador (file://), el navegador no guarda permisos: por eso la demo local preguntaba en cada reinicio.
var MIC = { pedido: false, estado: '' };
function permisoMic() {
  if (!puedeOir()) return;
  function pedir() {   // en computador, un pedido explícito dentro del toque: el navegador pregunta una sola vez y el reconocedor ya no vuelve a preguntar.
    // En teléfonos no: abrir el micrófono baja el volumen de la voz en iPhone, y allí la escucha es por turnos.
    if (MIC.pedido || MOVIL || !continuo() || MIC.estado === 'granted' || MIC.estado === 'denied' || location.protocol === 'file:') return;
    var md = navigator.mediaDevices; if (!md || !md.getUserMedia) return;
    MIC.pedido = true;
    try {
      md.getUserMedia({ audio: true }).then(function (st) { try { st.getTracks().forEach(function (x) { x.stop(); }); } catch (e) { /* */ } MIC.estado = 'granted'; },
        function (e) { if (e && /NotAllowed|Security|Permission/i.test(e.name || '') && R.on) { MIC.estado = 'denied'; R.sinMic = true; R.aviso = 'sinMic'; oidoApagar(); } });
    } catch (e) { /* */ }
  }
  var pq = null;
  try { if (navigator.permissions && navigator.permissions.query) pq = navigator.permissions.query({ name: 'microphone' }); } catch (e) { pq = null; }
  if (!pq || !pq.then) return pedir();   // este navegador no informa el permiso: se pide directo
  pq.then(function (p) {
    function ver() { MIC.estado = p.state; if (p.state === 'denied' && R.on && !R.sinMic) { R.sinMic = true; R.aviso = 'sinMic'; oidoApagar(); } }
    ver();
    if (!MIC.vigila) { MIC.vigila = true; try { p.addEventListener('change', ver); } catch (e) { p.onchange = ver; } }
    if (p.state === 'prompt') pedir();
  }, pedir);
}
function oidoApagar() { var r = OIDO.rec; OIDO.rec = null; if (r) { try { r.abort(); } catch (e) { /* */ } } oidoUI(); }
function oidoUI() { if (barra) barra.classList.toggle('cn-voz-oido', !!OIDO.rec); }
var EN_INTERRUPCION = { sec: 1, indice: 1, sig: 1, ant: 1, repite: 1, pausa: 1, salir: 1, rapido: 1, lento: 1, ayuda: 1, tres: 1, sesenta: 1, signo: 1, yaMismo: 1, voz: 1 };
function corregir(alts, t0, previa) {
  if (!previa || typeof previa !== 'object') return;   // 20-11-2026: el provisorio respondió una pregunta; el texto final no manda una segunda orden
  var p = deLaPersona(alts[0], t0); if (!p || !R.on || R.espera) return;
  var o = orden(norm(p.frase), 'lectura');
  if (!o || !esOrden(o, p.frase) || (previa.tipo === o.tipo && previa.k === o.k && previa.s === o.s)) return;
  if (R.tras && R.tras.o === previa) { R.tras.o = o; diag('↻ corrijo el pedido: «' + alts[0] + '»'); return; }   // seguía terminando la noticia: cambia a dónde va después
  diag('↻ corrijo: «' + alts[0] + '»'); oiste(alts[0]); interrumpir(o, true);
}
function recibir(alts, t0, provisorio) {   // algo que oyó el oído continuo; devuelve lo que hizo (o false)
  if (!R.on || !alts || !alts.length) return false;
  var ps = [];
  for (var i = 0; i < alts.length; i++) { var p = deLaPersona(alts[i], t0, provisorio); if (!p) { if (i === 0) { if (!provisorio) diag('↺ eco: «' + alts[0] + '»'); return false; } continue; } ps.push(p); }
  if (!ps.length) return false;
  if (!provisorio) { OIDO.ajenas++; oiste(alts[0]); diag('✓ oí: «' + alts[0] + '»'); }
  if (R.espera && R.espera.oido) { var hizo = R.espera.oido(ps, provisorio); if (hizo && provisorio) { oiste(alts[0]); diag('✓ oí (provisorio): «' + alts[0] + '»'); } return hizo; }   // hay una pregunta abierta: es la respuesta
  if (R.espera) return false;
  for (var j = 0; j < ps.length; j++) {
    var o = orden(norm(ps[j].frase), 'lectura');
    if (o && esOrden(o, ps[j].frase)) { if (provisorio) { oiste(alts[0]); diag('✓ oí (provisorio): «' + alts[0] + '»'); } diag('→ ' + o.tipo + (o.k != null ? ' ' + R.secs[o.k].n : '')); interrumpir(o); return o; }
  }
  return false;
}
// ¿Es una orden para la voz, o la persona conversa con alguien más en la sala? Mientras la voz lee solo valen frases breves
// («pausa», «más lento», «apaga la voz», «las noticias de deportes») o que piden algo («léeme…», «quiero…», «número…»).
var ACOMPANA = { seccion: 1, voz: 1, mas: 1, noticia: 1, noticias: 1, vez: 1, otra: 1, rapido: 1, lento: 1, lectura: 1, boletin: 1, tema: 1, temas: 1,
  poco: 1, momento: 1, ahora: 1, voice: 1, more: 1, again: 1, news: 1 };
var SALIDA = { apaga: 1, apagar: 1, apagate: 1, salir: 1, sal: 1, termina: 1, terminar: 1, cierra: 1, cerrar: 1, voz: 1, lectura: 1, stop: 1, off: 1, turn: 1,
  exit: 1, quit: 1, voice: 1 };
function esNum(w) { return !!NUM[w] || /^\d+$/.test(w); }
function esOrden(o, frase) {
  var pal = norm(frase).split(' ').filter(function (w) { return w && !RELLENO[w]; });
  if (!pal.length || pal.length > 6) return false;
  var pide = !!PREVIA[pal[0]] || ((o.tipo === 'sec' || o.tipo === 'sig') && !!NAVEGA[pal[0]]), breve = pal.length === 1 || (pal.length === 2 && !!(ACOMPANA[pal[0]] || ACOMPANA[pal[1]]));
  if (o.tipo === 'sigue') return R.pausado && (breve || pide);
  if (o.tipo === 'mas') return R.modo === 'indice' && breve;
  if (!EN_INTERRUPCION[o.tipo]) return false;
  if (o.tipo === 'yaMismo') return pal.length <= 3;
  if (o.tipo === 'salir') return pal.length <= 3 && pal.every(function (w) { return SALIDA[w]; });   // un «chao» o «cierra la puerta» no apagan la voz
  if (o.tipo === 'sec') {
    var kw = /^(indices?|menus?|index|indique|indico|indis|indise|endice|hindi|dice|in)$/;   // 20-11-2026 (revisión): «el índice cayó 2 %» o «el índice de desempleo en Chile», mientras lee, no son órdenes
    if ((pide && !(o.indice && kw.test(pal[0]))) || pal.length === 1) return true;
    var cl = (o.s != null ? (subs()[o.s] || { clave: '' }).clave : R.secs[o.k].clave).split(' ');
    return pal.every(function (w, i) { return kw.test(w) || PREVIA[w] || ACOMPANA[w] || (w.length > 3 && cl.indexOf(w) >= 0) || (esNum(w) && (pal.length <= 2 || PREVIA[pal[i - 1]])); });
  }
  return breve || pide;
}
// 19-11-2026 (Germán, 18:48: «Al menos, que en forma educada me diga "Favor, permíteme terminar de informarte esta noticia y a continuación
// yo continuaré con la sección del Menú que me solicitas"»): a media noticia, la voz se detiene, dice esa frase con el nombre de lo pedido,
// termina la noticia desde la frase que cortó y después cambia. Si la persona insiste (lo pide otra vez, pide otra sección o dice «ahora»),
// cambia de inmediato. «Pausa», «salir», «más rápido» y «repite» siguen siendo instantáneos.
var TRAS_NOTICIA = { sec: 1, sig: 1, ant: 1, indice: 1, tres: 1, sesenta: 1 };
function interrumpir(o, forzar) {   // la persona habló mientras la voz leía
  var t = Date.now(); if (!forzar && t - (R.tInterr || 0) < 1500) return; R.tInterr = t;
  if (o.tipo === 'pausa') return pausar();
  if (o.tipo === 'sigue') return reanudar(nuevaVuelta());
  if (o.tipo === 'yaMismo') { var p = R.tras; R.tras = null; if (p) ejecutar(p.o, nuevaVuelta()); return; }
  if (TRAS_NOTICIA[o.tipo] && !R.tras && enNoticia()) return terminarYSeguir(o);
  ejecutar(o, nuevaVuelta());
}
function enNoticia() { return R.modo === 'seccion' && !R.pausado && R.enItem === gen && R.j < R.items.length; }
function restoNoticia() {   // lo que falta de la noticia, desde la frase que se estaba diciendo
  var f = R.trozos, i = R.trozoI; if (!f || i == null || i >= f.length) return '';
  var e = null; for (var z = ECO.length - 1; z >= 0; z--) if (ECO[z].item && ECO[z].tg === R.trozosG && ECO[z].ti === i) { e = ECO[z]; break; }
  var r = f[i];
  if (e && e.base) {
    var x = e.base.slice(0, Math.max(0, (e.off || 0) + (e.ts ? e.ci || 0 : 0))), c = Math.max(x.lastIndexOf('. '), x.lastIndexOf('? '), x.lastIndexOf('! '), x.lastIndexOf('; '));
    r = e.base.slice(c >= 0 ? c + 2 : 0);
  }
  return [r].concat(f.slice(i + 1)).join(' ').trim();
}
function nombreDestino(o) {
  var x = o.tipo === 'sec' ? (o.s != null ? subs()[o.s] : R.secs[o.k]) : o.tipo === 'sig' ? R.secs[Math.min(R.i + 1, R.secs.length - 1)] : o.tipo === 'ant' ? R.secs[Math.max(R.i - 1, 0)] : null;
  if (x) return x.t;
  return o.tipo === 'tres' ? tx('nomTres') : o.tipo === 'sesenta' ? tx('nomSesenta') : '';
}
function terminarYSeguir(o) {
  var resto = restoNoticia(), g = nuevaVuelta(), j = R.j, nom = nombreDestino(o);
  R.tras = { o: o, j: j }; diag('⏳ termino la noticia y después: ' + o.tipo);
  (async function () {
    estado('eHabla');
    if (!(await decirTodo(tx(o.tipo === 'indice' ? 'trasInd' : o.tipo === 'sesenta' ? 'trasOtro' : nom ? 'trasSec' : 'trasGen', { s: nom }), g))) return;
    if (resto) { R.enItem = g; var ok = await decirTodo(resto, g, { item: true }); if (R.enItem === g) R.enItem = 0; if (!ok) return; }
    if (g !== gen || !R.tras) return;
    var p = R.tras.o; R.tras = null; R.j = j + 1;
    ejecutar(p, g);
  })();
}
function oir(ms) {   // una frase del lector, o null
  return new Promise(function (res) {
    if (!puedeOir()) return res(null);
    var rec, listo = false;
    try { rec = new SR(); } catch (e) { return res(null); }
    rec.lang = en() ? 'en-US' : 'es-CL'; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 4;
    function fin(v) { if (listo) return; listo = true; OIDO.cerro = Date.now(); clearTimeout(t); try { rec.abort(); } catch (e) { /* ya cerrado */ } if (R.rec === rec) R.rec = null; res(v); }
    rec.onstart = function () { diag('▶ escucho (turno)'); };
    rec.onresult = function (e) { R.fallasOido = 0; var r = e.results[e.results.length - 1], a = []; for (var k = 0; k < r.length; k++) a.push(r[k].transcript); diag('✓ oí: «' + (a[0] || '') + '»'); oiste(a[0]); fin(a.join(' | ')); };
    rec.onerror = function (e) {   // sin permiso, o el servicio del navegador falla dos veces seguidas: se deja de intentar y se sigue con barra y teclas
      var x = e && e.error; if (x && x !== 'no-speech' && x !== 'aborted') diag('✖ error (turno): ' + x);
      if ((x === 'service-not-allowed' || (x === 'network' && R.fallasOido + 1 >= 2)) && SR !== NubeRec && usarNube('red-del-navegador')) return fin(null);   // 19-11-2026
      if (x === 'not-allowed' || x === 'service-not-allowed' || x === 'audio-capture' || (x === 'network' && ++R.fallasOido >= 2)) { R.sinMic = true; R.aviso = 'sinMic'; }
      fin(null);
    };
    rec.onend = function () { fin(null); };
    var t = setTimeout(function () { fin(null); }, ms);
    R.rec = rec;
    try { rec.start(); } catch (e) { fin(null); }
  });
}

// ---------- secciones de la edición ----------
var SIN = {   // palabras con que se puede pedir cada sección
  economia: 'economia negocios inversion mercados finanzas bolsa economy business', politica: 'politica actualidad congreso gobierno leyes politics',
  emprendimiento: 'emprendimiento emprender startups pymes fondos entrepreneurship', tecnologia: 'tecnologia tendencias innovacion technology',
  conflictos: 'conflictos guerra guerras belicos ucrania gaza iran sudan conflicts war', efemerides: 'efemerides anniversaries',
  naval: 'naval armada marina navy', onomastico: 'onomastico santo santoral', indicadores: 'indicadores dolar euro cobre indicators',
  clima: 'tiempo clima pronostico lluvia temperatura weather forecast', mar: 'mar mareas marejadas oleaje tides sea',
  sismos: 'sismos sismo temblores temblor terremoto earthquakes', vuelos: 'vuelos aviones aeropuerto flights', feriados: 'feriados feriado holidays',
  inmobiliario: 'inmobiliario vivienda viviendas casas propiedades subsidios housing', industrias: 'industrias industria mineria industries',
  entretenimiento: 'entretenimiento panoramas familia entertainment', biografia: 'chilenos triunfan biografia biography',
  ciencia: 'ciencia biologia science', astronomia: 'astronomia espacio estrellas luna astronomy space', deportes: 'deportes deporte futbol tenis golf sports',
  horoscopo: 'horoscopo signo signos horoscope'
};
function leerSecciones() {
  var L = [], s = D.querySelectorAll('.hoja section.sec[id]');
  for (var i = 0; i < s.length; i++) {
    var h = s[i].querySelector('h2'); if (!h) continue;
    var tt = limpio(h), m = tt.match(/^(\d{1,2})\.\s*(.+)$/);
    L.push({ el: s[i], id: s[i].id, n: m ? +m[1] : L.length + 1, t: (m ? m[2] : tt).replace(/\s*·\s*/g, ', '), clave: norm((SIN[s[i].id] || '') + ' ' + (m ? m[2] : tt)) });
  }
  return L;
}
// 19-11-2026 (Germán, 18:45: «debería tener como estructura decir la palabra "Índice" + Número (o el título de la sección) debido a que
// algunas secciones son submenus y no tienen un número que los anteceda»): los temas de cada sección, tal como los muestra el índice.
var SUBS_FIJOS = [['crecw', 'Crecimiento de Chile: proyección del año'], ['proyw', 'Proyección de crecimiento: próximos 4 años'], ['pjw', 'Perspectivas de Desarrollo para Chile 2050'],
  ['cgw', 'Congreso: votaciones de la semana'], ['gobiernos', 'Avances logrados a igual período'], ['fondos', 'Fondos concursables'], ['tasw', 'Proyección de tasas a 12 meses'],
  ['subsidios', 'Subsidios habitacionales'], ['dep-futbol', 'Fútbol: tabla y proyección'], ['dep-golf', 'Golf'], ['dep-tenis', 'Tenis']];
var SUBSIN = { crecw: 'pib producto', proyw: 'cuatro anos 2027 2028 2029 2030 mediano plazo', pjw: 'largo plazo', cgw: 'votaciones leyes votadas senado diputados',
  gobiernos: 'avances gobiernos presidentes', fondos: 'concursables postular corfo sercotec', tasw: 'tasas hipotecarias hipotecario', subsidios: 'subsidio serviu',
  'dep-futbol': 'futbol tabla campeonato', 'dep-golf': 'golf', 'dep-tenis': 'tenis atp wta' };
function subs() {
  var n = D.querySelectorAll('#cnIdx li.cn-sub').length + '/' + R.secs.length;
  if (R.subs && R.subsN === n) return R.subs;
  R.subsN = n; return (R.subs = leerSubs());
}
function leerSubs() {
  var L = [], vistos = {}, A = [], a = D.querySelectorAll('#cnIdx li.cn-sub a[data-id]');
  for (var i = 0; i < a.length; i++) A.push([a[i].getAttribute('data-id'), limpio(a[i]), a[i]]);
  if (!A.length) A = SUBS_FIJOS;
  for (var j = 0; j < A.length; j++) {
    var id = A[j][0], el = id && D.getElementById(id), t = (A[j][1] || '').replace(/\s*·\s*/g, ', ');
    if (!el || !t || vistos[id]) continue;
    var sec = el.closest ? el.closest('section.sec[id]') : null, padre = -1, k;
    for (k = 0; k < R.secs.length; k++) if (R.secs[k].el === sec) { padre = k; break; }
    if (padre < 0 && A[j][2]) {   // fuera de toda sección: el de la fila principal anterior del índice
      var p = A[j][2].closest('li'); p = p && p.previousElementSibling;
      while (p && p.classList.contains('cn-sub')) p = p.previousElementSibling;
      var pa = p && p.querySelector('a[data-id]'), pid = pa && pa.getAttribute('data-id');
      for (k = 0; k < R.secs.length; k++) if (R.secs[k].id === pid) { padre = k; break; }
    }
    if (padre < 0) continue;
    vistos[id] = 1;
    L.push({ el: el, id: id, t: t, padre: padre, sub: true, n: R.secs[padre].n, clave: norm((SUBSIN[id] || '') + ' ' + t) });
  }
  return L;
}
function temasDe(s) {   // «Incluye: Fondos concursables.», al leer el índice
  var L = subs().filter(function (x) { return R.secs[x.padre] === s; }).map(function (x) { return x.t; });
  if (!L.length) return '';
  var ult = L[L.length - 1], y = !en() && /^h?i(?!e)/i.test(ult) ? 'e' : tx('y');
  return ' ' + tx('incluye', { l: L.length > 1 ? L.slice(0, -1).join('; ') + '; ' + y + ' ' + ult : ult });
}
function ejemplo() {   // un tema corto de hoy para el ejemplo («índice golf»)
  var S = subs(), c = '';
  for (var i = 0; i < S.length && !c; i++) if (S[i].t.split(' ').length <= 2) c = S[i].t;
  if (!c) { for (var k = 0; k < R.secs.length && !c; k++) if (R.secs[k].id === 'deportes') c = R.secs[k].t; }
  return (c || (R.secs[0] || {}).t || '').toLowerCase();
}

// ---------- el guion de cada sección ----------
// Lo que se oye es un resumen hablado, como en la radio: titulares, cifras clave y lo principal de cada bloque.
// Gráficos, botones, mapas, leyendas, instrucciones de uso y enlaces se saltan; lo demás queda en pantalla.
var SALTAR = 'script,style,svg,canvas,button,select,input,textarea,nav,form,img,picture,video,audio,iframe,noscript,template,dialog,[hidden],[aria-hidden="true"],[data-voz="no"],.cn-voz-no,.cr-tab,a.sub,'
  + '.chart,.fuente,.tambien,.bloque-kick,.leer,.botones-amb,.botones,.monedas,.mapa-conf,.leyenda-naves,.boton-vivo,.ca-chips,.ca-hist-ayuda,.ca-dia,.ca-pie,.ca-ic,'
  + '.fz-filtros,.fz-chipsw,.fz-cuenta,.fz-vacio,.fz-pie,.fz-ir,.fz-req,.fz-mas,.ts-ctx,.ts-bs,.ts-tabla,.ts-ayuda,.ts-inm-tit,.ts-ver,.lu-fases,.lu-efectos,.lu-barra,'
  + '.cr-grid,.gob-modos,.pub-banner,.banner-caddie,.caddie,.uvgrid,.semaforo,.pj-pags,.pj-et,.pj-nuevo,.cg-meses,.libro-abrir,.medallon,.apag,.es-fig,.ind-kf,.ind-tira,.ind-graf,.ind-mapa';
var BLOQUE = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DD|DETAILS|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|H[1-6]|HEADER|HR|LI|MAIN|OL|P|PRE|SECTION|SUMMARY|TABLE|TBODY|TD|TFOOT|TH|THEAD|TR|UL)$/;
var EN_LINEA = /^(A|ABBR|B|BR|CITE|CODE|EM|I|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U|WBR|LABEL|DATA)$/;
var INSTRUCCION = /^(toca|toque|haz clic|elige|selecciona|desliza|pasa el|tap|click|choose|select)\b/i;
var LEYENDA = /^(el tamaño del punto|el tamaño de cada|el color (de|indica)|cada punto|cada barra|la línea (es|marca|muestra)|las barras|los puntos|en dorado|punto dorado|the size of|each dot|each bar|the line)\b/i;   // explican un gráfico que no se oye
var HOY = '';   // fecha de la edición, dd-mm-aaaa: una cifra con la fecha de hoy no la repite
function visible(el) {
  try { if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true }); } catch (e) { /* navegador antiguo */ }
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}
function q(el, s) { return el ? el.querySelector(s) : null; }
function bloqueCss(c) { try { var d = getComputedStyle(c).display; return !!d && d !== 'inline' && d !== 'contents' && d !== 'none'; } catch (e) { return false; } }
function esEtiqueta(c) {   // «<b>Inversión</b> US$ 800 millones» se oye «Inversión: 800 millones de dólares»
  if (!(/^(B|STRONG|DT)$/.test(c.tagName) || c.matches('.ch-a,.cr-f')) || /[:.?!]\s*$/.test(c.textContent)) return false;
  var p = c.previousSibling; while (p && p.nodeType === 3 && !p.nodeValue.trim()) p = p.previousSibling;
  if (p && !(p.nodeType === 1 && p.matches('.cr-f,.ch-a'))) return false;
  var n = c.nextSibling; while (n && n.nodeType === 3 && !n.nodeValue.trim()) n = n.nextSibling;
  if (!n) return c.tagName === 'DT';
  var x = (n.nodeType === 3 ? n.nodeValue : n.textContent || '').trim();
  return /^[A-ZÁÉÍÓÚÑ0-9$¿¡]/.test(x) || (n.nodeType === 1 && n.tagName === 'BR');
}
function texto(el) {   // como textContent, pero con pausas donde la página separa en bloques o con <br>
  if (!el) return '';
  var a = [];
  (function r(n) {
    for (var c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { a.push(c.nodeValue); continue; }
      if (c.nodeType !== 1) continue;
      if (c.tagName === 'BR') { a.push('\u0002'); continue; }
      if (c.matches(SALTAR)) continue;
      var b = BLOQUE.test(c.tagName) || bloqueCss(c);
      a.push(b ? '\u0002' : '\u0003'); r(c);
      if (esEtiqueta(c)) a.push(':');
      else if (/^(B|STRONG)$/.test(c.tagName) && c.nextElementSibling && BLOQUE.test(c.nextElementSibling.tagName) && !/[.:?!]\s*$/.test(c.textContent)) a.push('.');   // titular y luego su párrafo
      a.push(b ? '\u0002' : '\u0003');
    }
  })(el);
  var t = a.join('').replace(/[ \t\n\r\f\v ]+/g, ' ');
  t = t.replace(/([^\s\u0002\u0003(¿¡«"“])\u0003+(?=[^\s\u0002\u0003.,;:!?)»”"%])/g, '$1 ').replace(/\u0003/g, '');
  t = t.replace(/\s*\u0002[\s\u0002]*/g, '\u0002').replace(/^\u0002|\u0002$/g, '').replace(/([.,;:!?¿¡(])\u0002/g, '$1 ').replace(/\u0002(?=[.,;:!?)])/g, '').replace(/\u0002/g, ', ');
  return t.trim();
}
function poner(U, t, el, tipo) {
  t = (t || '').replace(/\s+/g, ' ').trim();
  if (!t || t.length < 2 || INSTRUCCION.test(t) || LEYENDA.test(t)) return;
  if (U.length && U[U.length - 1].t === t) return;
  U.push({ t: t, el: el, tipo: tipo || '' });
}
function medio(el) { var a = el.querySelector('.fuente a'); return a ? limpio(a).replace(/\s+(Mundo|portada|Portada|Inglés|English|en inglés|en español|Español)$/, '') : ''; }
function nota(li) {
  var st = li.querySelector(':scope > strong'), m = medio(li), t;
  if (st) { var sp = li.querySelector(':scope > span:not(.tambien)'); t = texto(st).replace(/[.:]?$/, '.') + ' ' + (sp ? texto(sp) : ''); }
  else t = texto(li);
  t = t.trim(); if (t && !/[.!?»]$/.test(t)) t += '.';
  return t + (m ? ' ' + segun(m) : '');
}
function variacion(kd) {
  var t = texto(kd); if (!t) return '';
  var m = t.match(/^([+\-−])\s?([\d.,]+)\s?%$/); if (!m) return t;
  return (en() ? (m[1] === '+' ? 'up ' : 'down ') : (m[1] === '+' ? 'sube ' : 'baja ')) + m[2] + (en() ? ' percent' : ' por ciento');
}
function kpi(el) {
  var n = el.querySelector('.kn'), v = el.querySelector('.kv'), d = el.querySelector('.kd'), f = el.querySelector('.kf');
  var vd = d ? variacion(d) : '', t = (n ? texto(n).replace(/:$/, '') + ': ' : '') + (v ? texto(v) : '') + (vd ? (/^(sube|baja)\b/.test(vd) ? ', y ' : ', ') + vd : '');
  var x = f ? texto(f) : '';
  if (x && HOY && x === HOY) x = '';
  else if (/^01-(\d{2})-(\d{4})$/.test(x)) x = mesAnio(RegExp.$1, RegExp.$2) || x;   // dato mensual: «septiembre de 2026», no «1 de septiembre»
  if (x && !/^(fuente|source)\b/i.test(x)) t += ' (' + x + ')';
  return t + '.';
}
var PAISES = { USA: 'Estados Unidos', GER: 'Alemania', ITA: 'Italia', ESP: 'España', FRA: 'Francia', GBR: 'Gran Bretaña', ENG: 'Inglaterra', SCO: 'Escocia', IRL: 'Irlanda',
  NED: 'Países Bajos', BEL: 'Bélgica', SUI: 'Suiza', AUT: 'Austria', SWE: 'Suecia', NOR: 'Noruega', DEN: 'Dinamarca', FIN: 'Finlandia', POL: 'Polonia', CZE: 'República Checa',
  SVK: 'Eslovaquia', SLO: 'Eslovenia', CRO: 'Croacia', SRB: 'Serbia', BUL: 'Bulgaria', ROU: 'Rumania', HUN: 'Hungría', GRE: 'Grecia', POR: 'Portugal', UKR: 'Ucrania',
  RUS: 'Rusia', BLR: 'Bielorrusia', KAZ: 'Kazajistán', GEO: 'Georgia', ARM: 'Armenia', TUR: 'Turquía', ISR: 'Israel', LAT: 'Letonia', EST: 'Estonia', LTU: 'Lituania',
  CHI: 'Chile', CHL: 'Chile', ARG: 'Argentina', BRA: 'Brasil', URU: 'Uruguay', PAR: 'Paraguay', BOL: 'Bolivia', PER: 'Perú', ECU: 'Ecuador', COL: 'Colombia', VEN: 'Venezuela',
  MEX: 'México', CAN: 'Canadá', PUR: 'Puerto Rico', DOM: 'República Dominicana', CUB: 'Cuba', CRC: 'Costa Rica', PAN: 'Panamá', GUA: 'Guatemala', HON: 'Honduras',
  SLV: 'El Salvador', JAM: 'Jamaica', AUS: 'Australia', NZL: 'Nueva Zelanda', JPN: 'Japón', KOR: 'Corea del Sur', CHN: 'China', TPE: 'Taiwán', HKG: 'Hong Kong',
  THA: 'Tailandia', PHI: 'Filipinas', IND: 'India', RSA: 'Sudáfrica', ZIM: 'Zimbabue', EGY: 'Egipto', MAR: 'Marruecos', TUN: 'Túnez', NGR: 'Nigeria', KEN: 'Kenia',
  ETH: 'Etiopía', QAT: 'Catar', KSA: 'Arabia Saudita', UAE: 'Emiratos Árabes Unidos', IRI: 'Irán' };
var CABECERA = { mag: ['Magnitud', 'Magnitude'], prof: ['Profundidad', 'Depth'], pos: ['Posición', 'Position'], pts: ['Puntos', 'Points'], pj: ['Partidos jugados', 'Played'],
  dif: ['Diferencia de goles', 'Goal difference'], dg: ['Diferencia de goles', 'Goal difference'] };
function celda(td, h) {
  var x = texto(td);
  if (/^[A-Z]{3}$/.test(x) && PAISES[x]) x = en() && x === 'USA' ? 'United States' : PAISES[x];
  else if (/^T(\d{1,3})$/.test(x)) x = RegExp.$1 + (en() ? ', tied' : ', empatado');
  if (h && /^(resultado|result)$/i.test(h)) x = x.replace(/^(.+?) a (\S.*)$/, '$1 ' + (en() ? 'beat' : 'venció a') + ' $2');
  return x;
}
function tabla(tb, U) {
  if (tb.matches('.naves')) return naves(tb, U);
  var filas = tb.tBodies && tb.tBodies[0] ? [].filter.call(tb.tBodies[0].rows, visible) : [];
  if (!filas.length) return;
  var hs = tb.tHead && tb.tHead.rows[0] ? [].map.call(tb.tHead.rows[0].cells, function (c) { var h = texto(c).replace(/\.$/, ''); return CABECERA[norm(h)] ? CABECERA[norm(h)][en() ? 1 : 0] : h; }) : [];
  var conCab = filas.length <= 3 && hs.length > 1 && hs.length <= 6 && hs.filter(Boolean).length >= 2 && !/^(pos|posición|position|#|puesto|lugar|rk|n|número)$/i.test(hs[0]), n = Math.min(5, filas.length);
  for (var i = 0; i < n; i++) {
    var c = [];
    for (var j = 0; j < filas[i].cells.length && j < 6; j++) {
      var x = celda(filas[i].cells[j], hs[j]);
      if (!x || /^(ver|see|más|more|detalle|[—–-])$/i.test(x)) continue;
      c.push(conCab && hs[j] && j > 0 ? hs[j].replace(/:$/, '') + ': ' + x : x);
    }
    if (c.length) poner(U, (conCab ? c[0] + (c.length > 1 ? '. ' + c.slice(1).join('; ') : '') : c.join(', ')) + '.', filas[i]);
  }
  if (filas.length > n) poner(U, quedan(filas.length - n), tb, 'nota');
}
function naves(tb, U) {   // Estrecho: cuántas naves de cada tipo
  var g = tb.tBodies, L = [];
  for (var i = 0; i < g.length; i++) {
    var nom = texto(q(g[i], '.grupo-nave')).replace(/[,\s]*\(?\d+\)?\s*$/, ''), k = [].filter.call(g[i].rows, function (r) { return !r.matches('.grupo-nave,.nv-vacia'); }).length;
    if (nom && k) L.push(nom + ': ' + k);
  }
  poner(U, L.length ? L.join('; ') + '.' : tx('sinNaves'), tb);
}
function lista(ul, U) {
  var li = [].filter.call(ul.children, function (c) { return c.tagName === 'LI' && visible(c); });
  for (var i = 0; i < Math.min(CFG.porLista, li.length); i++) poner(U, nota(li[i]), li[i], 'n');
  if (li.length > CFG.porLista) poner(U, quedan(li.length - CFG.porLista), ul, 'nota');
}
function titulo(h) {
  var t = texto(h), k = norm(t), M = { chile: ['En Chile', 'In Chile'], mundo: ['En el mundo', 'Around the world'], world: ['En el mundo', 'Around the world'], 'mundo hoy': ['En el mundo, hoy', 'Around the world today'] };
  return M[k] ? M[k][en() ? 1 : 0] + '.' : t;
}
function fz(el) {   // fondo concursable o subsidio
  var t = texto(q(el, '.fz-tit')).replace(/[.:]?$/, '. '), inst = q(el, '.fz-inst'), est = q(el, '.fz-est');
  if (inst) t += texto(inst).replace(/[\s·,]+$/, '') + '. ';
  if (est) t += texto(est) + '. ';
  var f = el.querySelectorAll(':scope > .fz-dl > .fz-f');
  for (var i = 0; i < f.length; i++) { var dt = q(f[i], 'dt'), dd = q(f[i], 'dd'); if (dt && dd) t += texto(dt).replace(/:?$/, ': ') + texto(dd).replace(/[.]?$/, '. '); }
  return t;
}
function pj(el) {   // megaproyecto
  var t = texto(q(el, '.pj-tit')).replace(/[.:]?$/, '. ') + texto(q(el, '.pj-sec')).replace(/[.]?$/, '. ');
  var d = el.querySelectorAll('.pj-datos > span');
  for (var i = 0; i < d.length; i++) t += texto(d[i]).replace(/[.]?$/, '. ');
  var p = el.querySelector(':scope > p:not(.pj-sec):not(.pj-imp):not(.fuente)'); if (p) t += texto(p) + ' ';
  var im = q(el, '.pj-imp'); if (im) t += texto(im);
  return t;
}
function pano(el) {   // panorama
  var t = texto(q(el, '.pano-tit')), tipo = q(el, '.chip-tipo'), g = q(el, '.chip-gratis');
  t += (tipo ? ', ' + texto(tipo) : '') + (g ? ', ' + (en() ? 'free' : 'gratis') : '') + '. ';
  var d = el.querySelector(':scope > p:not(.pano-tit):not(.fuente)'); if (d) t += texto(d).replace(/[.]?$/, '. ');
  var li = el.querySelectorAll('.pano-datos li');
  for (var i = 0; i < li.length; i++) {
    var x = texto(li[i]);
    if (/^(contacto|contact|direcci[oó]n|address|web|sitio|tel[eé]fono|phone|correo)\b/i.test(x) || /^fecha:\s*todo el año/i.test(x)) continue;
    t += x.replace(/[.]?$/, '. ');
  }
  return t;
}
function caNota(el) { return texto(q(el, '.ca-tit')).replace(/[.:?]?$/, function (m) { return m === '?' ? '? ' : '. '; }) + texto(q(el, '.ca-tx')); }
var TARJETAS = [['.kpi', kpi, 12], ['.ts-kpi', texto, 4], ['.fz-card', fz, 3], ['.pj', pj, 3], ['.pano', pano, 4], ['.ca-nota', caNota, 5]];
function tarjeta(n) { for (var i = 0; i < TARJETAS.length; i++) if (n.matches(TARJETAS[i][0])) return TARJETAS[i]; return null; }
function siguiente(n) { var s = n.nextElementSibling; while (s && (s.matches(SALTAR) && !s.matches('.chart') || !visible(s) && !s.matches('.chart'))) s = s.nextElementSibling; return s; }
function esTexto(el) { for (var i = 0; i < el.children.length; i++) if (!EN_LINEA.test(el.children[i].tagName)) return false; return true; }
function congreso(el, U) {
  var h = el.querySelector('h3'); if (h) poner(U, texto(h), h, 'tit');
  var act = el.querySelector('.cg-mes.activa .cg-panel.activa') || el.querySelector('.cg-panel');
  if (!act) return;
  var k = act.querySelectorAll(':scope > .kpis .kpi'); for (var i = 0; i < k.length; i++) poner(U, kpi(k[i]), k[i]);
  var leyes = act.querySelectorAll('.ley'), n = 0;
  for (var j = 0; j < leyes.length && n < 3; j++) {
    var tt = leyes[j].querySelector('.ley-tit'), sm = leyes[j].querySelector('.ley-simple');
    if (!tt) continue; n++;
    poner(U, texto(tt).replace(/[.]?$/, '. ') + (sm ? texto(sm).replace(/^(En simple|In plain words|Plain language)[:,\s]*/i, '') : ''), leyes[j]);
  }
  if (leyes.length > n) poner(U, quedan(leyes.length - n), act, 'nota');
}
function gobiernos(el, U) {   // «Avances logrados a igual período»: el título, la idea y las cuatro cifras
  var h = el.querySelector('h3'); if (h) poner(U, texto(h), h, 'tit');
  var p = el.querySelector('.gob-intro'); if (p) poner(U, texto(p), p);
  var k = el.querySelectorAll('.gob-kpis .kpi'); for (var i = 0; i < k.length; i++) poner(U, kpi(k[i]), k[i]);
}
function unNodo(n, U, hermanos, i) {   // un hijo de la sección o de un bloque; devuelve cuántos hermanos consumió de más
  var tag = n.tagName;
  if (tag === 'H2' || n.matches(SALTAR) || !visible(n)) return 0;
  if (n.id === 'cgw') { congreso(n, U); return 0; }
  if (n.id === 'gobiernos') { gobiernos(n, U); return 0; }
  if (/^H[3-6]$/.test(tag)) { poner(U, titulo(n), n, 'tit'); return 0; }
  if (tag === 'UL' || tag === 'OL') { lista(n, U); return 0; }
  if (tag === 'TABLE') { tabla(n, U); return 0; }
  if (tag === 'DETAILS' && !n.open) return 0;
  if (n.matches('p.sub,p.tabtit')) {   // la explicación de un gráfico no se oye; el título de una tabla, sí
    var s = siguiente(n);
    if (s && s.matches('.chart')) { var s2 = siguiente(s) || (n.parentElement.matches('.tabbloque') ? siguiente(n.parentElement) : null); if (!(s2 && s2.matches('.tabla,table'))) return 0; }
    var a = n.previousElementSibling; if (a && a.matches('.tabla') && !q(a, 'table:not(.cr-tab)')) return 0;   // nota de una tabla que no se lee
  }
  if (n.matches('.contador')) { var c = siguiente(n), u = texto(n); if (c && c.matches('p.sub')) { poner(U, u + ' ' + texto(c).replace(/[.]?$/, '.'), n); return 1; } poner(U, u, n); return 0; }
  if (tag === 'P' || esTexto(n)) { poner(U, texto(n), n); return 0; }
  recorrer(n, U);
  return 0;
}
function recorrer(raiz, U) {
  var h = raiz.children, cuenta = {}, sobran = {};
  for (var i = 0; i < h.length; i++) {
    if (U.length >= CFG.maxItems) return;
    var n = h[i], tj = tarjeta(n);
    if (tj) {
      if (n.matches(SALTAR) || !visible(n)) continue;
      cuenta[tj[0]] = (cuenta[tj[0]] || 0) + 1;
      if (cuenta[tj[0]] <= tj[2]) poner(U, tj[1](n), n); else sobran[tj[0]] = (sobran[tj[0]] || 0) + 1;
      continue;
    }
    i += unNodo(n, U, h, i);
  }
  for (var k in sobran) poner(U, quedan(sobran[k]), raiz, 'nota');
}
var ESPECIAL = {
  clima: function (s, U) {
    var uv = {}, c = s.querySelectorAll('.uvgrid .uvc');
    for (var i = 0; i < c.length; i++) uv[norm(limpio(q(c[i], '.mn')))] = { k: limpio(q(c[i], '.uvk')), a: limpio(q(c[i], '.uva')) };
    var p = s.querySelectorAll('.panel-ciudad');
    for (var j = 0; j < p.length; j++) {
      var ct = q(p[j], '.ciudad-tit'), f = q(p[j], 'tbody tr'); if (!ct || !f) continue;
      var x = f.cells, nom = limpio(ct), u = uv[norm(nom)] || {};
      var t = nom + ': ' + limpio(x[1]) + (en() ? ', low ' : ', mínima ') + limpio(x[2]) + (en() ? ', high ' : ', máxima ') + limpio(x[3]);
      var iv = x[6] ? limpio(x[6]).replace(/[≈*]/g, '').trim() : '';
      if (iv) t += (en() ? ', UV index ' : ', índice U V ') + iv + (u.k ? ', ' + u.k.toLowerCase() : '');
      var ai = /aire:\s*([^(·,]+)/i.exec(u.a || '') || /air[^:]*:\s*([^(·,]+)/i.exec(u.a || '');
      if (ai) t += (en() ? '; air quality ' : '; calidad del aire ') + ai[1].trim().toLowerCase();
      poner(U, t + '.', p[j]);
    }
  },
  mar: function (s, U) {
    var h = s.children, fase = 0;
    for (var i = 0; i < h.length; i++) {
      var n = h[i];
      if (/^H3$/.test(n.tagName)) {
        var t = texto(n);
        if (/^(mareas|tides)/i.test(t)) { fase = 1; poner(U, t, n, 'tit'); puertos(s, U); continue; }
        if (/estrecho|strait/i.test(t)) {
          fase = 2; poner(U, t, n, 'tit');
          var e = n.nextElementSibling, hoy = e && /(?:^|\.\s)(Hoy[^.]*\.|Today[^.]*\.)/.exec(texto(e)); if (hoy) poner(U, hoy[1], e);
          continue;
        }
      }
      if (fase === 0) i += unNodo(n, U, h, i);
      else if (fase === 2 && n.querySelector && (n.matches('.tabla') || n.matches('table'))) { var tb = n.matches('table') ? n : q(n, 'table'); if (tb) tabla(tb, U); }
    }
  },
  vuelos: function (s, U) {
    var b = s.querySelectorAll('.vamb'), t = [];
    for (var i = 0; i < b.length; i++) t.push(limpio(b[i]));
    if (t.length) poner(U, t.join(', ') + '.', s);
    var a = s.querySelectorAll('.ciudad-btn');
    for (var j = 0; j < a.length; j++) {
      var nm = a[j].querySelector('.mn'), mf = a[j].querySelector('.mf'); if (!nm) continue;
      poner(U, limpio(nm).replace(/^[A-Z]{3}\s*·\s*/, '') + ': ' + (mf ? limpio(mf).replace(/\s*·\s*/, en() ? ' and ' : ' y ') : '') + '.', a[j]);
    }
  },
  conflictos: function (s, U) {
    var p = s.querySelectorAll('.panel-ciudad.conflicto');
    for (var i = 0; i < p.length; i++) {
      var c = q(p[i], '.ciudad-tit'); if (c) poner(U, texto(c), c, 'tit');
      var r = q(p[i], '.resumen'); if (r) poner(U, texto(r), r);
      var li = p[i].querySelectorAll('ul.notas > li');
      for (var j = 0; j < Math.min(3, li.length); j++) poner(U, nota(li[j]), li[j], 'n');
    }
  },
  industrias: function (s, U) {
    var it = q(s, '.ind-intro'); if (it) poner(U, texto(it), it);
    var k = s.querySelectorAll('.ind-top .kpi'); for (var i = 0; i < k.length; i++) poner(U, kpi(k[i]), k[i]);
    var b = s.querySelectorAll('.ind-tira .ind-btn');
    for (var j = 0; j < b.length; j++) poner(U, texto(q(b[j], '.mn')) + ': ' + texto(q(b[j], '.mv')).replace(/% PIB/g, en() ? '% of GDP' : '% del PIB').replace(/% export\./g, en() ? '% of exports' : '% de las exportaciones') + '.', b[j]);
    var p = s.querySelectorAll('.panel-ciudad');
    for (var m = 0; m < p.length; m++) { var n = q(p[m], '.ind-nota'), ti = q(p[m], '.ciudad-tit'); if (n && ti) poner(U, texto(ti) + '. ' + texto(n), n); }
  },
  feriados: function (s, U) {   // lo de hoy y el próximo; las tablas del mes quedan en pantalla
    var h = s.querySelectorAll('h3, p, .contador');
    for (var i = 0; i < h.length; i++) {
      var n = h[i]; if (n.closest('table,.fuente,.pub-banner') || n.matches(SALTAR)) continue;
      if (n.matches('p.sub') && n.previousElementSibling && n.previousElementSibling.matches('.contador')) continue;
      if (n.matches('.contador')) { var c = siguiente(n); poner(U, texto(n) + (c && c.matches('p.sub') ? ' ' + texto(c).replace(/[.]?$/, '.') : ''), n); continue; }
      if (/^H3$/.test(n.tagName)) poner(U, titulo(n), n, 'tit'); else poner(U, texto(n), n);
    }
  },
  astronomia: function (s, U) {
    var h = s.children, otros = [];
    for (var i = 0; i < h.length; i++) {
      var n = h[i];
      if (n.matches('.ca-bloque') && !q(n, '.lu-hoy') && !q(n, '.cr-tab')) { var t = texto(q(n, '.ca-h3')); if (t) otros.push(t); continue; }
      if (n.matches('.ca-bloque')) { recorrer(n, U); continue; }
      i += unNodo(n, U, h, i);
    }
    if (otros.length) poner(U, tx('tambien', { l: otros.join('; ') }), s, 'nota');
  },
  horoscopo: function (s, U) {   // la lectura real pregunta el signo; aquí van los doce, en corto
    var A = signosDelDia(s);
    for (var i = 0; i < A.length; i++) poner(U, signoTexto(A[i], false), A[i]);
  }
};
function puertos(s, U) {
  var p = s.querySelectorAll('.panel-ciudad');
  for (var i = 0; i < p.length; i++) {
    var c = q(p[i], '.ciudad-tit'), f = p[i].querySelectorAll('tbody tr'); if (!c || !f.length || f.length > 6) continue;
    var r = []; for (var j = 0; j < f.length; j++) if (f[j].cells.length >= 3) r.push(limpio(f[j].cells[1]) + (en() ? ' at ' : ' a las ') + limpio(f[j].cells[0]) + ', ' + limpio(f[j].cells[2]));
    if (r.length) poner(U, limpio(c) + ': ' + r.join('; ') + '.', p[i]);
  }
}
function guion(sec) {
  var U = [];
  if (!HOY) { var m = /(\d{1,2}) de (\w+) de (\d{4})/.exec(limpio(D.querySelector('.franja'))); if (m && MESES.indexOf(m[2]) >= 0) HOY = ('0' + m[1]).slice(-2) + '-' + ('0' + (MESES.indexOf(m[2]) + 1)).slice(-2) + '-' + m[3]; }
  if (ESPECIAL[sec.id]) ESPECIAL[sec.id](sec.el, U);
  if (!U.length) recorrer(sec.el, U);
  if (U.length >= CFG.maxItems) poner(U, tx('mas'), sec.el, 'nota');
  return U;
}

// ---------- auspicios: cada 10 minutos de escucha, 3 o 4 distintos, en rueda ----------
var FRASES = {
  'caddie golf': ['Caddie Golf, la app de golf con inteligencia artificial, diseñada en Chile y gratis', 'Caddie Golf, the AI golf app, designed in Chile and free'],
  'megabots': ['Megabots, soluciones con inteligencia artificial a la medida de tu empresa', 'Megabots, artificial intelligence solutions tailored to your company'],
  'inbestu': ['Inbestu, administración de propiedades: tu propiedad rentando, sin preocupaciones', 'Inbestu, property management: your property earning, worry free'],
  'libro 100 historias de exito tras la adversidad': ['el libro «100 Historias de Éxito tras la Adversidad»', 'the book «100 Stories of Success after Adversity»']
};
function auspiciadores() {
  var vistos = {}, L = [], s = D.querySelectorAll('.pub-slide[aria-label]');
  for (var i = 0; i < s.length; i++) {
    var nom = (s[i].getAttribute('aria-label') || '').replace(/^\d+\s*(?:de|of)\s*\d+:\s*/i, '').trim(), k = norm(nom);
    if (!nom || vistos[k] || /cofrade news/.test(k)) continue;
    vistos[k] = 1;
    var f = FRASES[k];
    if (!f) { var x = limpio(s[i]).replace(nom, '').split(/[.!?]/)[0].trim(); f = [nom + (x && x.length < 140 ? ', ' + x : ''), nom + (x && x.length < 140 ? ', ' + x : '')]; }
    L.push(f[en() ? 1 : 0]);
  }
  return L;
}
async function auspicioSiToca(g) {
  if (R.habla - R.ultAusp < CFG.auspicioMin * 60000) return true;
  R.ultAusp = R.habla;
  var L = auspiciadores(); if (!L.length) return true;
  var n = Math.min(L.length, L.length >= 8 ? 4 : 3), sel = [], k = (+P.a || 0) % L.length;
  for (var i = 0; i < n; i++) sel.push(L[(k + i) % L.length]);
  P.a = (k + n) % L.length; guardar();
  var ult = sel[sel.length - 1], y = !en() && /^h?i(?!e)/i.test(ult) ? 'e' : tx('y');   // «y Megabots», pero «e Inbestu»
  var lista = sel.length > 1 ? sel.slice(0, -1).join('; ') + '; ' + y + ' ' + ult : sel[0];   // punto y coma: cada marca con su pausa
  estado('eAusp');
  if (!(await decirTodo(tx('ausp', { l: lista }), g))) return false;
  if (!R.ctaDicho) { R.ctaDicho = true; if (!(await decirTodo(tx('cta'), g))) return false; }
  if (!(await decirTodo(tx('auspFin'), g))) return false;
  estado('eHabla');
  return true;
}

// ---------- órdenes ----------
var NUM = { uno: 1, un: 1, una: 1, primera: 1, primero: 1, dos: 2, segunda: 2, segundo: 2, tres: 3, tercera: 3, tercero: 3, cuatro: 4, cuarta: 4,
  cinco: 5, quinta: 5, seis: 6, sexta: 6, siete: 7, septima: 7, ocho: 8, octava: 8, nueve: 9, novena: 9, diez: 10, decima: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
var SIGNOS = [['aries'], ['tauro', 'taurus'], ['geminis', 'gemini'], ['cancer'], ['leo'], ['virgo'], ['libra'], ['escorpio', 'escorpion', 'scorpio'],
  ['sagitario', 'sagittarius'], ['capricornio', 'capricorn'], ['acuario', 'aquarius'], ['piscis', 'pisces']];
function numero(t) {
  var m = t.match(/\b(\d{1,2})\b/); if (m) return +m[1];
  var p = t.split(' ');
  for (var i = 0; i < p.length; i++) { if (p[i] === 'veinte' && (p[i + 1] === 'y' || p[i + 1] === 'and') && NUM[p[i + 2]] < 10) return 20 + NUM[p[i + 2]]; if (p[i] === 'twenty' && NUM[p[i + 1]] < 10) return 20 + NUM[p[i + 1]]; }
  for (var j = 0; j < p.length; j++) {
    var x = p[j]; if (!NUM[x] || p[j + 1] === 'mil') continue;   // «dos mil cincuenta» es un año
    if ((x === 'un' || x === 'una') && p.length > 1 && !/^(la|el|numero|seccion|number|section)$/.test(p[j - 1] || '')) continue;   // «un momento», «una noticia»: artículo, no número
    if (/^(primero|primera|segundo|segunda|tercero|tercera|cuarta|quinta|sexta|septima|octava|novena|decima)$/.test(x) && /^(un|una)$/.test(p[j - 1] || '')) continue;   // «un segundo»
    return NUM[x];
  }
  return 0;
}
function entender(frase, ctx) {   // texto del lector → orden
  if (!frase) return null;
  var alts = String(frase).split(' | ');
  for (var a = 0; a < alts.length; a++) { var o = orden(norm(alts[a]), ctx); if (o) return o; }
  return { tipo: 'nada' };
}
function orden(t, ctx) {
  if (!t) return null;
  var w = ' ' + t + ' ';
  if (/ (salir|apaga|apagar|termina|terminar|cierra|cerrar|chao|adios|exit|quit|stop|turn off) /.test(w)) return { tipo: 'salir' };
  if (/ (pausa|pausar|detente|deten|silencio|alto|espera|calla|pause|wait) /.test(w) || t === 'para') return { tipo: 'pausa' };
  var mi = RX_INDICE.exec(t);   // 19-11-2026 (Germán): «Índice» + número o título lleva a esa sección o tema, también mientras la voz lee
  if (mi) {
    var dudoso = !/^(indice|indices|menu|menus|index)$/.test(mi[1]), resto = ' ' + (mi[2] || '') + ' ', antes = '';
    while (antes !== resto) { antes = resto; resto = resto.replace(RELL_INDICE, ' '); }
    resto = resto.replace(/\s+/g, ' ').trim();
    if (!resto || /^(completo|entero|de nuevo|otra vez|todo|todos|again|full|whole|all)$/.test(resto)) return dudoso ? null : { tipo: 'indice' };
    if (ctx === 'indice' && /^(mas|siguiente|siguientes|sigue|more|next)$/.test(resto)) return { tipo: 'mas' };
    var di = destino(resto, ' ' + resto + ' ');
    if (di && di.tipo === 'sec') { di.indice = true; return di; }
    if (dudoso || ctx === 'lectura') return null;   // «el índice de precios», mientras lee, no es una orden
    return { tipo: 'indice' };
  }
  if (R.tras && /^(ahora|ahora mismo|ahora ya|ya ahora|altiro|al tiro|de inmediato|inmediatamente|ya mismo|no esperes|now|right now|immediately)$/.test(t)) return { tipo: 'yaMismo' };
  var nv = / (pasa|pasar|pasate|pasemos|cambia|cambiar|cambiemos|salta|saltar|saltate|sigue|seguir|sigamos|continua|continuar|continuemos|llevame|lleva|vamos|vayamos|ve|ir|anda|go|skip|jump|switch|move|continue|take) /.test(w);
  if (nv) { var dst = destino(t, w); if (dst) return dst; }   // «sigue con deportes», «pasa a la 5»: manda la sección, no «sigue» ni «siguiente»
  if (/ (otra seccion|otro tema|otras secciones|cambia de seccion|cambiar de seccion|cambiemos de seccion|cambia de tema|another section|other section|change section) /.test(w)) return { tipo: 'indice' };
  if (ctx === 'indice' && /^(si|si sigue|sigue|seguir|continua|continuar|dale|si dale|mas|mas secciones|yes|more|go on)$/.test(t)) return { tipo: 'mas' };
  if (/ (sigue|seguir|continua|continuar|reanuda|reanudar|dale|resume|continue|go on) /.test(w)) return { tipo: 'sigue' };
  if (/ (mas rapido|rapido|acelera|faster) /.test(w)) return { tipo: 'rapido' };
  if (/ (mas lento|lento|despacio|slower|slow) /.test(w)) return { tipo: 'lento' };
  if (/ (otra voz|cambia la voz|cambiar la voz|cambia de voz|cambiar de voz|cambia voz|another voice|other voice|change voice|change the voice) /.test(w)) return { tipo: 'voz' };   // 19-11-2026
  if (/ (ayuda|comandos|que puedo decir|opciones|help) /.test(w)) return { tipo: 'ayuda' };
  if (/ (indice|menu|secciones|temas|lista|index|sections) /.test(w)) return { tipo: 'indice' };
  if (/ (repite|repetir|otra vez|de nuevo|repeat|again) /.test(w)) return { tipo: 'repite' };
  if (/ (tres del dia|titulares|portada|top three|headlines) /.test(w)) return { tipo: 'tres' };
  if (/ (resumen|sesenta segundos|60 segundos|sixty seconds|summary) /.test(w)) return { tipo: 'sesenta' };
  if (ctx === 'signo') {
    for (var s = 0; s < SIGNOS.length; s++) for (var x = 0; x < SIGNOS[s].length; x++) if (w.indexOf(' ' + SIGNOS[s][x] + ' ') >= 0) return { tipo: 'signo', n: s };
    if (/ (todos|todas|all|everyone) /.test(w)) return { tipo: 'todos' };
  }
  if (/ (todo|completo|leer todo|lee todo|all|everything|whole) /.test(w)) return { tipo: 'todo' };
  if (/ (siguiente|proxima|proximo|adelante|salta|saltar|next|skip) /.test(w)) return { tipo: 'sig' };
  if (/ (anterior|atras|vuelve|volver|retrocede|previous|back) /.test(w)) return { tipo: 'ant' };
  if (/^(mas|more)$/.test(t)) return { tipo: 'mas' };
  if (ctx === 'inicio' && /^(si|bueno|ya|yes|ok|okay)$/.test(t)) return { tipo: 'indice' };
  if (/^(no|no gracias|no thanks)$/.test(t)) return { tipo: 'no' };
  var dst2 = destino(t, w); if (dst2) return dst2;
  if (ctx === 'signo') for (var s2 = 0; s2 < SIGNOS.length; s2++) if (w.indexOf(SIGNOS[s2][0]) >= 0) return { tipo: 'signo', n: s2 };
  return null;
}
var RX_INDICE = /^(?:(?:ve|ir|vamos|anda|pasa|pasate|quiero|dame|lee|leeme|abre|abreme|pon|ponme|llevame|al|a|el|la|en|y|ok|bueno|ya|ahora|go|to|the|please)\s+)*(indice|indices|menu|menus|index|en dice|y dice|in dice|indique|indico|indis|indise|endice|hindi)(?:\s+(.*))?$/;   // 20-11-2026: variantes que oye el reconocedor
var RELL_INDICE = / (numero|el|la|los|las|lo|de|del|al|a|en|seccion|tema|temas|punto|opcion|item|capitulo|por favor|porfa|favor|number|section|topic|the|of|please) /g;
function parecido(c, w) {   // cuánto calza la frase con una sección o un tema: palabras del nombre, y un poco más si van en el mismo orden
  var cl = c.clave.split(' '), p = 0;
  for (var q = 0; q < cl.length; q++) if (cl[q].length > 3 && w.indexOf(' ' + cl[q] + ' ') >= 0) p++;
  if (!p) return 0;
  var tt = norm(c.t).split(' ').filter(function (x) { return x.length > 3; }), ww = w.trim().split(' ').filter(function (x) { return x.length > 3; });
  if (tt.length && ww.length && tt[0] === ww[0]) p += 0.5;
  for (var i = 0; i + 1 < ww.length; i++) { var a = tt.indexOf(ww[i]); if (a >= 0 && tt[a + 1] === ww[i + 1]) p += 0.3; }
  return c.sub ? p + 0.25 : p;   // el tema es más preciso que la sección que lo contiene
}
function destino(t, w) {   // la sección o el tema que nombra la frase (por nombre o por número), o null
  var n = numero(t), S = subs(), C = R.secs.concat(S), mejor = -1, pm = 0;
  for (var j = 0; j < C.length; j++) { var p = parecido(C[j], w); if (p > pm + 0.001) { pm = p; mejor = j; } }
  var c = null, por = '';
  if (mejor >= 0 && (!n || t.split(' ').length > 2)) { c = C[mejor]; por = 'nombre'; }   // «léeme 5 noticias de deportes»: manda el nombre
  else if (n) { for (var i = 0; i < R.secs.length; i++) if (R.secs[i].n === n) { c = R.secs[i]; por = 'num'; } }
  if (!c && mejor >= 0) { c = C[mejor]; por = 'nombre'; }
  if (!c) return null;
  if (c.sub) return { tipo: 'sec', k: c.padre, s: S.indexOf(c), por: por };
  var k = R.secs.indexOf(c);
  if (k === R.i && R.modo === 'seccion' && / (salta|saltar|saltate|skip) /.test(w)) return { tipo: 'sig' };   // «sáltate deportes» mientras lee Deportes
  return { tipo: 'sec', k: k, por: por };
}
// espera una orden: por voz, por la barra o por teclado; null si no llega a tiempo
function esperarOrden(g, ctx, ms) {
  return new Promise(function (res) {
    var listo = false, esp = { ctx: ctx, fin: fin, oido: null }, t = null;
    function fin(o) { if (listo) return; listo = true; clearTimeout(t); if (R.espera === esp) R.espera = null; if (!continuo() && R.rec) { try { R.rec.abort(); } catch (e) { /* */ } } res(o); }
    R.espera = esp;
    if (!puedeOir()) { estado('eListo'); t = setTimeout(function () { fin(null); }, ms + 500); return; }
    tono(); estado('eOye');
    if (continuo()) {   // el oído ya está abierto: solo se espera la respuesta (o el silencio)
      oidoPrender();
      var intentos = 0;
      t = setTimeout(function () { fin(null); }, ms);
      esp.oido = function (ps, provisorio) {
        for (var i = 0; i < ps.length; i++) { var o = orden(norm(ps[i].frase), ctx); if (o) { callar(); diag('→ ' + o.tipo); fin(o); return true; } }
        if (provisorio || ps[0].eco >= 0.5) return false;   // provisorio sin orden, o casi todo era la propia voz: no se responde
        clearTimeout(t);
        if (++intentos >= 2) { fin(null); return true; }
        decir(tx('noEnt')).then(function () { if (listo || g !== gen) return; tono(); estado('eOye'); t = setTimeout(function () { fin(null); }, ms); });
        return true;
      };
      esp.aTurnos = function () { if (listo) return; clearTimeout(t); esp.oido = null; porTurnos(); };   // el oído continuo falló a media pregunta
      return;
    }
    porTurnos();
    function porTurnos() { (async function () {
      for (var intento = 0; intento < 2 && !listo; intento++) {
        var f = await oir(ms);
        if (listo || g !== gen) return;
        if (f == null) { if (R.sinMic && intento === 0 && R.aviso === 'sinMic') { R.aviso = ''; await decir(tx('sinMic')); } return fin(null); }
        var o = entender(f, ctx);
        if (o && o.tipo !== 'nada') return fin(o);
        if (intento === 0) { await decir(tx('noEnt')); if (listo || g !== gen) return; tono(); estado('eOye'); }
      }
      fin(null);
    })(); }
  });
}
function ordenar(o) {   // orden que llega desde la barra, el teclado o la voz fuera de una espera
  if (!R.on) return;
  if (R.espera) return R.espera.fin(o);
  ejecutar(o, nuevaVuelta());
}
function callar() { if (SS && (SS.speaking || SS.pending)) { ultimoCorte = Date.now(); SS.cancel(); } }
function nuevaVuelta() {
  gen++; R.pregunta = '';
  if (R.espera) { var f = R.espera.fin; R.espera = null; f(null); }
  if (SS) { if (SS.speaking || SS.pending) ultimoCorte = Date.now(); SS.cancel(); }
  if (R.rec) { try { R.rec.abort(); } catch (e) { /* */ } R.rec = null; }
  return gen;
}

// ---------- el programa ----------
function fechaEdicion() {
  var f = D.querySelector('.franja span'), t = f ? limpio(f) : '';
  return t.replace(/^(Reporte del|Report for|Report of)\s+/i, '') || D.title.replace(/^.*·\s*/, '');
}
async function leerTres(g) {
  var li = D.querySelectorAll('.tres li'); if (!li.length) return true;
  if (!(await decirTodo(tx('tres'), g))) return false;
  for (var i = 0; i < li.length && i < 3; i++) { marcar(li[i]); if (!(await decirTodo(tx('ord')[i] + ': ' + limpio(li[i]), g))) return false; }
  return true;
}
async function leer60(g) {
  var c = D.querySelectorAll('.sesenta .chip60'); if (!c.length) return true;
  if (!(await decirTodo(tx('sesenta'), g))) return false;
  for (var i = 0; i < c.length; i++) {
    var a = c[i].querySelector('.t60'), b = c[i].querySelector('.v60'); if (!a) continue;
    marcar(c[i]); if (!(await decirTodo(limpio(a) + ': ' + (b ? limpio(b) : '') + '.', g))) return false;
  }
  return true;
}
async function arrancar(g, deNuevo) {
  leyenda(tx('vozUsada', { v: ((voz && voz.name) || '').split(' - ')[0] || '?' }), 6000);
  if (!(await decirTodo(tx(deNuevo ? 'saludoDe' : 'saludo', { f: fechaEdicion() }), g))) return;
  var h = location.hash.slice(1), k = -1;
  for (var i = 0; i < R.secs.length; i++) if (R.secs[i].id === h) k = i;
  if (k >= 0) return leerSeccion(k, g, false);
  if (!(await leerTres(g))) return;
  return preguntar(g);
}
async function avisoPendiente(g) {   // si el micrófono o la red fallaron, se dice una vez en el próximo momento tranquilo
  if (!R.aviso) return true;
  var k = R.aviso; R.aviso = ''; return decirTodo(tx(k), g);
}
async function preguntar(g) {
  if (!(await avisoPendiente(g))) return;
  var c = continuo() && puedeOir();
  R.pregunta = 'inicio';
  var dicha = await decirTodo(c ? tx(enEstricto() ? 'pregE' : 'pregC') : puedeOir() ? tx('preg') + (MOVIL ? ' ' + tx('tocaMic') : '') : tx('pregSin'), g);
  R.pregunta = ''; if (!dicha) return;
  var o = await esperarOrden(g, 'inicio', puedeOir() ? CFG.espera : CFG.espera + 4000);
  if (g !== gen) return;
  if (!o || o.tipo === 'no') {
    if (!(await avisoPendiente(g))) return;
    if (!(await decirTodo(tx(!puedeOir() ? 'sinRespSin' : continuo() ? (enEstricto() ? 'sinRespE' : 'sinRespC') : 'sinResp'), g))) return;
    return leerSeccion(0, g, true);
  }
  return ejecutar(o, g);
}
async function leerIndice(g, grupo) {
  R.modo = 'indice'; R.grupo = grupo; estado('eHabla');
  var G = CFG.grupo, desde = grupo * G, parte = R.secs.slice(desde, desde + G);
  if (!parte.length) { grupo = 0; desde = 0; parte = R.secs.slice(0, G); R.grupo = 0; }
  if (!(await avisoPendiente(g))) return;
  if (grupo === 0 && !(await decirTodo(tx(!puedeOir() ? 'indIntroSin' : continuo() ? (enEstricto() ? 'indIntroE' : 'indIntroC') : 'indIntro', { n: R.secs.length, g: G, e: ejemplo() }), g))) return;
  for (var i = 0; i < parte.length; i++) if (!(await decirTodo(parte[i].n + ', ' + parte[i].t + '.' + temasDe(parte[i]), g))) return;
  var ultimo = desde + G >= R.secs.length;
  R.pregunta = 'indice'; var dicha = await decirTodo(tx(ultimo ? 'indFin' : 'indMas'), g); R.pregunta = ''; if (!dicha) return;
  var o = await esperarOrden(g, 'indice', CFG.espera);
  if (g !== gen) return;
  if (!o) { if (!ultimo) return leerIndice(g, grupo + 1); if (!(await decirTodo(tx(puedeOir() ? 'sinResp' : 'sinRespSin'), g))) return; return leerSeccion(0, g, true); }
  return ejecutar(o, g);
}
async function leerItems(g) {
  for (; R.j < R.items.length; R.j++) {
    if (g !== gen) return false;
    if (!(await avisoPendiente(g))) return false;
    var it = R.items[R.j]; marcar(it.el); estado('eHabla');
    if (R.j > 0 && !(await respiro(CFG.pausaItem, g))) return false;
    R.enItem = g;
    var ok = await decirTodo(conector(R.items, R.j) + it.t, g, { item: true });
    if (R.enItem === g) R.enItem = 0;
    if (!ok) return false;
    if (R.tras) { var p = R.tras.o; R.tras = null; R.j++; ejecutar(p, g); return false; }   // pidió otra sección a media noticia: terminada, se cambia
    if (!(await auspicioSiToca(g))) return false;
  }
  return g === gen;
}
async function leerSeccion(k, g, continuo) {
  var s = R.secs[k];
  if (!s) { if (!(await decirTodo(tx('noSec'), g))) return; return esperarYSeguir(g, 'fin'); }
  R.i = k; R.sub = -1; R.titulo = s.t; R.modo = 'seccion'; R.continuo = !!continuo; R.items = guion(s); R.j = 0; barraTitulo(s.n + '. ' + s.t);
  marcar(s.el.querySelector('h2') || s.el);
  if (!(await decirTodo(tx('sec', { n: s.n, t: s.t }), g, { tono: CFG.tonoTit, vel: CFG.velTit }))) return;
  if (!(await respiro(CFG.pausaTit, g))) return;
  if (s.id === 'horoscopo') return leerHoroscopo(g, continuo);
  if (!(await leerItems(g))) return;
  return finSeccion(g, continuo);
}
async function leerSub(s, g) {   // un tema de una sección («índice fondos concursables»)
  var x = subs()[s];
  if (!x) { if (!(await decirTodo(tx('noSec'), g))) return; return esperarYSeguir(g, 'fin'); }
  R.i = x.padre; R.sub = s; R.titulo = x.t; R.modo = 'seccion'; R.continuo = false; R.items = guion(x); R.j = 0; barraTitulo(x.t);
  if (R.items.length && R.items[0].t.length <= x.t.length + 20 && norm(R.items[0].t).indexOf(norm(x.t)) === 0) R.items.shift();   // su título ya se dijo
  marcar(x.el.querySelector('h2,h3,h4') || x.el);
  if (!(await decirTodo(tx('tema', { p: R.secs[x.padre].t, t: x.t }), g, { tono: CFG.tonoTit, vel: CFG.velTit }))) return;
  if (!(await respiro(CFG.pausaTit, g))) return;
  if (!R.items.length) { if (!(await decirTodo(tx('mas'), g))) return; }
  else if (!(await leerItems(g))) return;
  return finSeccion(g, false);
}
async function finSeccion(g, continuo) {
  var sig = R.secs[R.i + 1];
  if (!sig) { R.modo = 'fin'; if (!(await decirTodo(tx('finTodo'), g))) return; return esperarYSeguir(g, 'fin'); }
  if (continuo && continuoOido()) return leerSeccion(R.i + 1, g, true);   // se puede interrumpir en cualquier momento: sigue de corrido, sin pitidos
  if (continuo) {   // modo radio: un sonido corto y unos segundos para decir algo; si no, sigue solo
    var o = await esperarOrden(g, 'fin', CFG.entre);
    if (g !== gen) return;
    return o ? ejecutar(o, g) : leerSeccion(R.i + 1, g, true);
  }
  R.pregunta = 'fin'; var dicha = await decirTodo(tx('finSec', { t: R.titulo || R.secs[R.i].t, s: sig.t }), g); R.pregunta = ''; if (!dicha) return;
  var o2 = await esperarOrden(g, 'fin', CFG.espera);
  if (g !== gen) return;
  return o2 ? ejecutar(o2, g) : leerSeccion(R.i + 1, g, false);
}
function continuoOido() { return continuo() && puedeOir(); }
async function esperarYSeguir(g, ctx) {
  var o = await esperarOrden(g, ctx, CFG.espera);
  if (g !== gen) return;
  if (o) return ejecutar(o, g);
  estado('eListo');
}
function perfilSigno() {
  try { var p = JSON.parse(localStorage.getItem('cn-perfil') || '{}'); if (p && p.s >= 0 && p.s < 12) return +p.s; } catch (e) { /* sin perfil */ }
  return -1;
}
function guardarSigno(n) {
  try { var p = JSON.parse(localStorage.getItem('cn-perfil') || '{}') || {}; if (p.d && p.m) return; p.s = n; localStorage.setItem('cn-perfil', JSON.stringify(p)); } catch (e) { /* */ }
}
function signosDelDia(s) { return [].filter.call(s.querySelectorAll('article.signo[id^="signo-"]'), function (a) { return /^signo-\d+$/.test(a.id); }); }
function signoTexto(a, largo) {
  var nom = texto(q(a, 'h3')), sub = q(a, 'header .sub'), d = q(a, '.destacada'), f = q(a, '.foco');
  var t = nom + (largo && sub ? ', ' + texto(sub) : '') + '. ' + (d ? texto(d).replace(/[.]?$/, '. ') : '') + (largo && f ? texto(f).replace(/[.]?$/, '. ') : '');
  var areas = a.querySelectorAll('.h-hoy .area');
  for (var i = 0; i < areas.length; i++) {
    var b = q(areas[i], 'b'), e = q(areas[i], '.estr'), x = areas[i].cloneNode(true), z = x.querySelectorAll('b,.estr');
    for (var j = 0; j < z.length; j++) z[j].remove();
    var est = e ? (e.getAttribute('aria-label') || '').replace(/^(\d) (de|of) 5$/, en() ? '$1 out of 5 stars' : '$1 de 5 estrellas') : '';
    t += (b ? texto(b) : '') + (est ? ', ' + est : '') + (largo ? ': ' + texto(x) : '') + '. ';
  }
  var nu = q(a, '.h-hoy .numero'); if (largo && nu) t += texto(nu).replace(/[.]?$/, '.');
  return t;
}
async function leerHoroscopo(g, continuo) {
  var A = signosDelDia(R.secs[R.i].el);
  var n = perfilSigno(), o = null;
  if (n < 0) {
    if (puedeOir()) { if (!(await decirTodo(tx('signo'), g))) return; o = await esperarOrden(g, 'signo', CFG.espera); if (g !== gen) return; }
    if (o && o.tipo === 'signo') { n = o.n; guardarSigno(n); }
    else if (o && o.tipo !== 'todos') return ejecutar(o, g);
  } else if (!(await decirTodo(tx('tuSigno', { s: limpio(A[n] && A[n].querySelector('h3')) }), g))) return;
  if (n >= 0 && A[n]) { R.items = [{ t: signoTexto(A[n], true), el: A[n] }]; }
  else { if (!(await decirTodo(tx('signoSin'), g))) return; R.items = []; for (var i = 0; i < A.length; i++) R.items.push({ t: signoTexto(A[i], false), el: A[i] }); }
  R.j = 0;
  if (!(await leerItems(g))) return;
  return finSeccion(g, continuo);
}
async function ejecutar(o, g) {
  if (!o || g !== gen) return;
  R.pausado = false; estado('eHabla'); botonPausa(); if (o.tipo !== 'salir') oidoPrender();
  if (TRAS_NOTICIA[o.tipo] || o.tipo === 'salir' || o.tipo === 'todo' || o.tipo === 'signo') R.tras = null;   // una orden nueva reemplaza lo pedido a media noticia
  switch (o.tipo) {
    case 'indice': return leerIndice(g, 0);
    case 'mas':
      if (R.modo === 'indice') return leerIndice(g, R.grupo + 1);
      if (R.modo === 'seccion' && R.j < R.items.length) { if (await leerItems(g)) return finSeccion(g, R.continuo); return; }
      return leerSeccion(R.i + 1, g, R.continuo);
    case 'sec': return o.s != null ? leerSub(o.s, g) : leerSeccion(o.k, g, false);
    case 'sig': return leerSeccion(Math.min(R.i + 1, R.secs.length - 1), g, R.continuo);
    case 'ant': return leerSeccion(Math.max(R.i - 1, 0), g, R.continuo);
    case 'todo': return leerSeccion(R.i >= 0 && R.modo === 'seccion' ? R.i : 0, g, true);
    case 'tres': if (await leerTres(g)) return preguntar(g); return;
    case 'sesenta': if (await leer60(g)) return preguntar(g); return;
    case 'repite':
      if (R.modo === 'indice') return leerIndice(g, R.grupo);
      if (R.modo === 'seccion' && R.j >= R.items.length) return R.sub >= 0 ? leerSub(R.sub, g) : leerSeccion(R.i, g, R.continuo);   // terminada: la sección (o el tema) otra vez
      if (R.modo === 'seccion') { R.j = Math.max(0, R.j); if (await leerItems(g)) return finSeccion(g, R.continuo); return; }   // a medias: lo último que estaba diciendo
      return preguntar(g);
    case 'rapido': case 'lento': {
      var v = Math.round((R.rate + (o.tipo === 'rapido' ? 0.15 : -0.15)) * 100) / 100, tope = v > 1.6 || v < 0.7;
      if (!tope) { R.rate = v; P.r = v; guardar(); velocidadUI(); }
      if (!(await decirTodo(tx(tope ? (o.tipo === 'rapido' ? 'yaRapido' : 'yaLento') : o.tipo), g))) return;
      return reanudar(g);
    }
    case 'voz': {   // 19-11-2026: la siguiente voz del aparato, de la mejor a la peor; queda guardada en este aparato
      var vs = vocesIdioma(), kv = vs.indexOf(voz), nv = vs.length ? vs[(kv + 1) % vs.length] : null;
      if (nv && nv !== voz) { voz = nv; P.v = nv.name; guardar(); VOZ_L = {}; }
      if (!(await decirTodo(tx(vs.length > 1 ? 'otraVoz' : 'unaVoz'), g))) return;
      return reanudar(g);
    }
    case 'ayuda': if (!(await decirTodo(tx('ayuda'), g))) return; return esperarYSeguir(g, R.modo === 'indice' ? 'indice' : 'fin');
    case 'pausa': return pausar();
    case 'sigue': return reanudar(g);
    case 'salir': return apagar(true);
    case 'signo': R.modo = 'seccion'; guardarSigno(o.n); for (var h = 0; h < R.secs.length; h++) if (R.secs[h].id === 'horoscopo') { R.i = h; return leerHoroscopo(g, false); } return;
    case 'todos': return leerSeccion(R.i, g, R.continuo);
    default: return reanudar(g);
  }
}
function reanudar(g) {
  R.pausado = false; botonPausa(); estado('eHabla'); oidoPrender();
  if (R.modo === 'seccion') return leerItems(g).then(function (ok) { if (ok) return finSeccion(g, R.continuo); });
  if (R.modo === 'indice') return leerIndice(g, R.grupo);
  return preguntar(g);
}
function pausar() { nuevaVuelta(); R.pausado = true; OIDO.tPausa = Date.now(); estado('ePausa'); botonPausa(); }

// ---------- en pantalla ----------
var CSS = '.cn-voz-velo{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,18,34,.62);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);cursor:pointer;animation:cnVozEntra .28s ease-out}'
  + '.cn-voz-caja{position:relative;width:min(560px,100%);background:var(--card,#fff);color:var(--tinta,#0B1F3A);border-radius:22px;padding:30px 28px 24px;box-shadow:0 30px 80px rgba(0,0,0,.35);border:1px solid var(--linea,#DDD3BF);font-family:var(--sans,system-ui,sans-serif);text-align:center}'
  + '.cn-voz-caja h2{font-family:var(--serif,Georgia,serif);font-size:clamp(26px,5.4vw,34px);line-height:1.12;margin:14px 0 10px;color:var(--tinta,#0B1F3A)}'
  + '.cn-voz-caja p{margin:0 auto 18px;max-width:42ch;font-size:17px;line-height:1.5;color:var(--tinta2,#23395B)}'
  + '.cn-voz-ico{width:88px;height:88px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:#0B1F3A;color:#fff;box-shadow:0 0 0 6px rgba(184,137,43,.22)}'
  + '.cn-voz-ico svg{width:46px;height:46px}.cn-voz-ico .cn-voz-a1{animation:cnVozOnda 1.6s ease-in-out infinite}.cn-voz-ico .cn-voz-a2{animation:cnVozOnda 1.6s .35s ease-in-out infinite}'
  + '.cn-voz-si{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:64px;border:0;border-radius:16px;background:#0B1F3A;color:#fff;font:700 20px/1.2 var(--sans,system-ui,sans-serif);cursor:pointer;box-shadow:inset 0 0 0 2px #B8892B}'
  + '.cn-voz-si:hover{background:#13325C}.cn-voz-si:focus-visible,.cn-voz-x:focus-visible,.cn-voz-b button:focus-visible,.cn-voz-salto:focus,.cn-voz-m button:focus-visible{outline:3px solid var(--oro,#B8892B);outline-offset:3px}'
  + '.cn-voz-x{position:absolute;top:10px;right:10px;width:48px;height:48px;border-radius:50%;border:1px solid var(--linea,#DDD3BF);background:var(--card,#fff);color:var(--tinta,#0B1F3A);font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}'
  + '.cn-voz-x:hover{background:var(--papel,#FBF8F1)}.cn-voz-nota{font-size:13.5px!important;color:var(--gris,#5B6472)!important;margin:14px auto 0!important}'
  + '.cn-voz-nomas{margin-top:10px;background:none;border:0;color:var(--gris,#5B6472);text-decoration:underline;font:500 14px var(--sans,system-ui,sans-serif);cursor:pointer;padding:8px}'
  + '.cn-voz-salto{position:fixed;left:12px;top:-80px;z-index:2147483001;background:#0B1F3A;color:#fff;padding:12px 18px;border-radius:12px;font:700 16px var(--sans,system-ui,sans-serif);text-decoration:none}.cn-voz-salto:focus{top:12px}'
  + '.cn-voz-m{margin:4px 0 12px}.cn-voz-m button{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid var(--oro,#B8892B);background:var(--papel,#FBF8F1);color:var(--tinta,#0B1F3A);border-radius:14px;padding:10px 14px;cursor:pointer;font:600 16px/1.25 var(--sans,system-ui,sans-serif)}'
  + '.cn-voz-m button span{display:block}.cn-voz-m small{display:block;font-weight:400;font-size:13px;color:var(--gris,#5B6472)}.cn-voz-m svg{flex:0 0 34px;width:34px;height:34px;color:var(--oro-texto,#8A6416)}'
  + '.cn-voz-b{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147482990;width:min(760px,calc(100% - 20px));display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;background:#0B1F3A;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35);border:1px solid rgba(217,174,82,.55);font-family:var(--sans,system-ui,sans-serif)}'
  + '.cn-voz-st{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px}.cn-voz-st b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cn-voz-st small{display:block;font-size:12.5px;color:#D9AE52}'
  + '.cn-voz-eq{flex:0 0 26px;height:22px;display:flex;align-items:flex-end;gap:3px}.cn-voz-eq i{width:4px;height:30%;border-radius:2px;background:#D9AE52}.cn-voz-b[data-e="eHabla"] .cn-voz-eq i,.cn-voz-b[data-e="eAusp"] .cn-voz-eq i{animation:cnVozEq .9s ease-in-out infinite}.cn-voz-eq i:nth-child(2){animation-delay:.15s}.cn-voz-eq i:nth-child(3){animation-delay:.3s}.cn-voz-eq i:nth-child(4){animation-delay:.45s}'
  + '.cn-voz-b[data-e="eOye"] .cn-voz-eq i{background:#7FD1A8;animation:cnVozEq .5s ease-in-out infinite}'
  + '.cn-voz-c{display:flex;gap:6px;flex:0 0 auto}.cn-voz-b button{min-width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:grid;place-items:center;font:700 13px var(--sans,system-ui,sans-serif);padding:0 8px}'
  + '.cn-voz-b button:hover{background:rgba(255,255,255,.16)}.cn-voz-b button svg{width:22px;height:22px}.cn-voz-b .cn-voz-hab{position:relative;background:#B8892B;border-color:#D9AE52;color:#0B1F3A}'
  + '.cn-voz-b.cn-voz-oido .cn-voz-hab::after{content:"";position:absolute;top:5px;right:5px;width:9px;height:9px;border-radius:50%;background:#3FD08A;box-shadow:0 0 0 2px #0B1F3A}'
  + '.cn-voz-lee{outline:3px solid var(--oro,#B8892B)!important;outline-offset:4px;border-radius:8px;background:rgba(184,137,43,.10)!important;scroll-margin:120px}'
  + 'html.cn-voz-on #cnFab,html.cn-voz-on #cnSubir{transform:translateY(-78px)}html.cn-voz-on body{padding-bottom:96px}'
  + '@media (max-width:560px){.cn-voz-b{gap:6px;padding:8px}.cn-voz-b .cn-voz-ocultable{display:none}.cn-voz-b button{min-width:42px;height:42px}.cn-voz-caja{padding:28px 18px 20px}'
  + '.cn-voz-st b{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px;line-height:1.2}.cn-voz-st small{font-size:11.5px}}'
  + '@keyframes cnVozEntra{from{opacity:0}to{opacity:1}}@keyframes cnVozEq{0%,100%{height:25%}50%{height:100%}}@keyframes cnVozOnda{0%,100%{opacity:.35}50%{opacity:1}}'
  + '@media (prefers-reduced-motion:reduce){.cn-voz-velo,.cn-voz-eq i,.cn-voz-ico path{animation:none!important}}'
  + 'html[data-theme="dark"] .cn-voz-si{background:#D9AE52;color:#0B1F3A;box-shadow:inset 0 0 0 2px #F2D48C}html[data-theme="dark"] .cn-voz-si:hover{background:#E6BE68}'
  + 'html[data-theme="dark"] .cn-voz-ico{background:#D9AE52;color:#0B1F3A;box-shadow:0 0 0 6px rgba(217,174,82,.22)}'
  + 'html[data-theme="dark"] .cn-voz-b{background:#152033;border-color:#D9AE52}html[data-theme="dark"] .cn-voz-lee{background:rgba(217,174,82,.14)!important}'
  + '@media print{.cn-voz-velo,.cn-voz-b,.cn-voz-salto,.cn-voz-m{display:none!important}}';
var ICO = {
  voz: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 19h7l9-8v26l-9-8h-7z" fill="currentColor" stroke="none"/><path class="cn-voz-a1" d="M32 18a8 8 0 0 1 0 12"/><path class="cn-voz-a2" d="M36.5 13.5a14.5 14.5 0 0 1 0 21"/></svg>',
  ant: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  sig: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  pau: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  seg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>',
  ind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h11"/></svg>',
  hab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
var velo = null, barra = null, previoFoco = null;
function nodo(html) { var d = D.createElement('div'); d.innerHTML = html; return d.firstChild; }
function estilos() { if (D.getElementById('cnVozCss')) return; var s = D.createElement('style'); s.id = 'cnVozCss'; s.textContent = CSS; (D.head || H).appendChild(s); }
function abrirVentana(deNuevo) {
  if (velo) return;
  estilos(); previoFoco = D.activeElement;
  velo = nodo('<div class="cn-voz-velo" data-no-tr><div class="cn-voz-caja" role="dialog" aria-modal="true" aria-labelledby="cnVozTit" aria-describedby="cnVozTxt">'
    + '<button type="button" class="cn-voz-x" aria-label="' + tx('x') + '" title="' + tx('x') + '">✕</button>'
    + '<div class="cn-voz-ico">' + ICO.voz + '</div>'
    + '<h2 id="cnVozTit">' + tx(deNuevo ? 'titDe' : 'tit') + '</h2><p id="cnVozTxt">' + tx(deNuevo ? 'txtDe' : 'txt') + '</p>'
    + '<button type="button" class="cn-voz-si">' + ICO.voz.replace('aria-hidden="true"', 'aria-hidden="true" width="30" height="30"') + '<span>' + tx('btn') + '</span></button>'
    + (deNuevo ? '<button type="button" class="cn-voz-nomas">' + tx('noMas') + '</button>' : '<p class="cn-voz-nota">' + tx('nota') + (continuo() ? ' ' + tx('notaC') : '') + '</p>')
    + '</div></div>');
  D.body.appendChild(velo);
  var abierta = Date.now();
  velo.addEventListener('click', function (e) {
    e.stopPropagation();
    if (e.target.closest('.cn-voz-x')) return cerrarVentana(true);
    if (e.target.closest('.cn-voz-nomas')) return cerrarVentana(true);
    if (Date.now() - abierta < 400 && !e.target.closest('.cn-voz-si')) return;   // un clic que ya venía en camino no enciende la voz
    encender(deNuevo);
  });
  velo.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); return cerrarVentana(!deNuevo); }
    if (e.key === 'Tab') {   // el foco no sale de la ventana
      var f = velo.querySelectorAll('button'), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  setTimeout(function () { var b = velo && velo.querySelector('.cn-voz-si'); if (b) b.focus(); }, 30);
}
function cerrarVentana(vidente) {
  if (!velo) return;
  velo.remove(); velo = null;
  if (vidente) { P.e = 'no'; P.t = Date.now(); guardar(); }
  try { if (previoFoco && previoFoco.focus) previoFoco.focus(); } catch (e) { /* */ }
}
function armarBarra() {
  if (barra) return;
  estilos();
  barra = nodo('<div class="cn-voz-b" role="region" aria-label="' + tx('barra') + '" data-no-tr data-e="eHabla">'
    + '<div class="cn-voz-st"><span class="cn-voz-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span style="min-width:0"><b id="cnVozSec">Cofrade News</b><small id="cnVozEst">' + tx('eHabla') + '</small></span></div>'
    + '<div class="cn-voz-c">'
    + '<button type="button" data-a="ant" class="cn-voz-ocultable" aria-label="' + tx('ant') + '" title="' + tx('ant') + '">' + ICO.ant + '</button>'
    + '<button type="button" data-a="pausa" aria-label="' + tx('pau') + '" title="' + tx('pau') + '">' + ICO.pau + '</button>'
    + '<button type="button" data-a="sig" aria-label="' + tx('sig') + '" title="' + tx('sig') + '">' + ICO.sig + '</button>'
    + '<button type="button" data-a="indice" aria-label="' + tx('ind') + '" title="' + tx('ind') + '">' + ICO.ind + '</button>'
    + '<button type="button" data-a="hablar" class="cn-voz-hab" aria-label="' + tx('hab') + '" title="' + tx('hab') + '">' + ICO.hab + '</button>'
    + '<button type="button" data-a="vel" class="cn-voz-ocultable" aria-label="' + tx('vel') + '" title="' + tx('vel') + '"><span id="cnVozVel">1×</span></button>'
    + '<button type="button" data-a="salir" aria-label="' + tx('off') + '" title="' + tx('off') + '">' + ICO.off + '</button>'
    + '</div></div>');
  D.body.appendChild(barra);
  barra.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'pausa') return R.pausado ? ordenar({ tipo: 'sigue' }) : ordenar({ tipo: 'pausa' });
    if (a === 'hablar') return escucharAhora();
    if (a === 'vel') { var v = R.rate >= 1.45 ? 0.85 : Math.round((R.rate + 0.15) * 100) / 100; R.rate = v; P.r = v; guardar(); velocidadUI(); return ordenar({ tipo: 'repite' }); }
    ordenar({ tipo: a });
  });
  velocidadUI();
}
function escucharAhora() {   // botón Hablar o tecla H: se calla y escucha una orden
  if (!R.on) return;
  if (R.espera) return;   // ya está escuchando
  var g = nuevaVuelta();
  esperarOrden(g, R.modo === 'indice' ? 'indice' : 'fin', CFG.espera).then(function (o) { if (g !== gen) return; if (o) ejecutar(o, g); else reanudar(g); });
}
function estado(k) { R.est = k; if (!barra) return; barra.setAttribute('data-e', k); var e = D.getElementById('cnVozEst'); if (e && Date.now() >= OIDO.cap) e.textContent = tx(k); }
function barraTitulo(t) { var b = D.getElementById('cnVozSec'); if (b) b.textContent = t; }
function botonPausa() {
  if (!barra) return; var b = barra.querySelector('[data-a="pausa"]'); if (!b) return;
  b.innerHTML = R.pausado ? ICO.seg : ICO.pau; b.setAttribute('aria-label', tx(R.pausado ? 'seg' : 'pau')); b.title = tx(R.pausado ? 'seg' : 'pau');
}
function velocidadUI() { var v = D.getElementById('cnVozVel'); if (v) v.textContent = (Math.round(R.rate * 100) / 100).toString().replace('.', en() ? '.' : ',') + '×'; }
var marcado = null;
function mostrar(el) {   // si lo que se lee está en una pestaña oculta (ciudad, puerto, conflicto, industria), se abre esa pestaña
  var p = el && el.closest ? el.closest('.panel-ciudad') : null;
  if (!p || visible(p)) return;
  var sec = p.closest('section.sec'), tira = sec && sec.querySelector('.tira-ciudades'); if (!tira) return;
  var hs = [].filter.call(p.parentElement.children, function (x) { return x.matches('.panel-ciudad'); });
  var bs = tira.querySelectorAll('.ciudad-btn'), nom = norm(limpio(q(p, '.ciudad-tit'))), b = null;
  for (var k = 0; k < bs.length && !b; k++) { var m = norm(limpio(q(bs[k], '.mn'))); if (nom && m && (nom.indexOf(m) >= 0 || m.indexOf(nom) >= 0)) b = bs[k]; }
  if (!b && bs.length === hs.length) b = bs[hs.indexOf(p)];
  if (b) try { b.click(); } catch (e) { /* */ }
}
function marcar(el) {
  if (marcado && marcado !== el) marcado.classList.remove('cn-voz-lee');
  marcado = el || null; if (!el || !el.classList) return;
  mostrar(el);
  el.classList.add('cn-voz-lee');
  try { var r = el.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* */ }
}
var candado = null;
function despierto(si) {
  try {
    if (si && navigator.wakeLock && !candado && D.visibilityState === 'visible') navigator.wakeLock.request('screen').then(function (l) { candado = l; l.addEventListener('release', function () { if (candado === l) candado = null; }); }, function () { /* sin permiso */ });
    if (!si && candado) { candado.release().catch(function () { /* */ }); candado = null; }
  } catch (e) { /* navegador sin bloqueo de pantalla */ }
}
D.addEventListener('visibilitychange', function () {
  if (D.visibilityState !== 'visible' || !R.on) return;
  despierto(true);
  try { if (SS && SS.paused) SS.resume(); } catch (e) { /* */ }
});
function encender(deNuevo) {
  cerrarVentana(false);
  P.e = 'si'; P.t = Date.now(); guardar();
  if (!SS) { armarBarra(); barraTitulo(tx('sinVoz')); estado('eListo'); return; }
  R.on = true; R.pausado = false; H.classList.add('cn-voz-on'); despierto(true);
  R.secs = leerSecciones(); elegirVoz(); armarBarra(); estado('eHabla'); botonPausa();
  try { var A = W.AudioContext || W.webkitAudioContext; if (A && !R.ctx) R.ctx = new A(); if (R.ctx && R.ctx.resume) R.ctx.resume(); } catch (e) { /* */ }
  var b = barra.querySelector('[data-a="pausa"]'); if (b) b.focus();
  var g = nuevaVuelta();
  R.sinMic = false; R.fallasOido = 0; R.aviso = ''; OIDO.redes = []; OIDO.reposo = 0; OIDO.avisoRed = false;
  OIDO.turnos = ''; OIDO.arranco = false; OIDO.cortas = 0; OIDO.mudos = 0; OIDO.denegadas = 0;
  diag('voz encendida · ' + (continuo() ? 'escucha continua' : puedeOir() ? 'escucha por turnos' : 'sin reconocimiento de voz en este navegador'));
  permisoMic(); oidoPrender();
  if (EDGE && !MOVIL && !vozNatural(voz)) {
    // Edge entrega sus voces naturales (Catalina) recién después de usar la voz una vez: una frase muda las despierta y se espera hasta 1,5 s
    try { var u0 = new SpeechSynthesisUtterance('.'); u0.volume = 0; u0.lang = en() ? 'en-US' : 'es-CL'; SS.speak(u0); } catch (e) { /* */ }
    var t0 = Date.now();
    (function mira() { elegirVoz(); if (g !== gen) return; if (vozNatural(voz) || Date.now() - t0 > 1500) return arrancar(g, deNuevo); setTimeout(mira, 150); })();
    return;
  }
  arrancar(g, deNuevo);   // la primera frase sale dentro del mismo clic (iPhone lo exige)
}
function apagar(avisar) {
  nuevaVuelta(); oidoApagar(); ECO.length = 0;
  R.on = false; R.modo = ''; R.pausado = false; H.classList.remove('cn-voz-on'); marcar(null); despierto(false);
  if (barra) { barra.remove(); barra = null; }
  if (avisar && SS) decir(tx('salir'));
  var m = D.getElementById('cnVozMenu'); if (m) try { m.focus({ preventScroll: true }); } catch (e) { /* */ }
}

// ---------- teclado (solo con la voz encendida) ----------
D.addEventListener('keydown', function (e) {
  if (!R.on || e.ctrlKey || e.metaKey || e.altKey || velo || D.querySelector('#cnMenu:not([hidden])')) return;
  var t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  var k = (e.key || '').toLowerCase(), o = null;
  if (k === 'escape') o = { tipo: 'salir' };
  else if (k === ' ' && !(t && t.closest && t.closest('button,a'))) o = { tipo: R.pausado ? 'sigue' : 'pausa' };
  else if (k === 'i') o = { tipo: 'indice' };
  else if (k === 'n' || k === 'pagedown') o = { tipo: 'sig' };
  else if (k === 'p' || k === 'pageup') o = { tipo: 'ant' };
  else if (k === 'r') o = { tipo: 'repite' };
  else if (k === 'v') o = { tipo: 'voz' };
  else if (k === '+' || k === '=') o = { tipo: 'rapido' };
  else if (k === '-') o = { tipo: 'lento' };
  else if (k === 'h' || k === 'm') { e.preventDefault(); return escucharAhora(); }
  else if (/^[0-9]$/.test(k)) { R.tecla = (R.tecla || '') + k; clearTimeout(R.tTecla); R.tTecla = setTimeout(function () { var n = +R.tecla; R.tecla = ''; var x = orden(String(n), R.modo); if (x) ordenar(x); }, 900); e.preventDefault(); return; }
  if (o) { e.preventDefault(); ordenar(o); }
}, true);

// ---------- entradas: ventana (una vez), acceso para lectores de pantalla e ícono del Índice ----------
function accesos() {
  estilos();
  if (!D.querySelector('.cn-voz-salto')) {
    var a = nodo('<a href="#" class="cn-voz-salto" data-no-tr>' + tx('salto') + '</a>');
    a.addEventListener('click', function (e) { e.preventDefault(); encender(P.e === 'si'); });
    D.body.insertBefore(a, D.body.firstChild);
  }
  var hoja = D.querySelector('#cnMenu .cn-hoja'), cab = hoja && hoja.querySelector('.cn-cab');
  if (cab && !hoja.querySelector('.cn-voz-m')) {
    var m = nodo('<div class="cn-voz-m" data-no-tr><button type="button" id="cnVozMenu">' + ICO.voz + '<span>' + tx('menu') + '<small>' + tx('menuSub') + '</small></span></button></div>');
    m.querySelector('button').addEventListener('click', function () {
      var x = D.querySelector('#cnMenu [data-cerrar]'); if (x) x.click();
      encender(P.e === 'si');
    });
    cab.parentNode.insertBefore(m, cab.nextSibling);
  }
}
function textosIdioma() {   // la ventana y la barra siguen al botón EN/ES
  if (R.on) { R.secs = leerSecciones(); oidoApagar(); oidoPrender(); }
  var s = D.querySelector('.cn-voz-salto'); if (s) s.textContent = tx('salto');
  var m = D.getElementById('cnVozMenu'); if (m) m.querySelector('span').innerHTML = tx('menu') + '<small>' + tx('menuSub') + '</small>';
  if (barra) { var r = R.on; barra.remove(); barra = null; if (r) { armarBarra(); botonPausa(); oidoUI(); } }
  if (velo) { var d = P.e === 'si'; velo.remove(); velo = null; abrirVentana(d); }
  elegirVoz();
}
function inicio() {
  accesos();
  D.addEventListener('cofrade-idioma', textosIdioma);
  var auto = !navigator.webdriver || CFG.forzar;   // los robots (vigía, capturas) no ven la ventana
  if (/[?&]voz=0\b/.test(location.search) || !auto) return;
  if (P.e === 'no' && !/[?&]voz=1\b/.test(location.search)) return;   // 19-11-2026: el botón de la portada lleva ?voz=1
  setTimeout(function () { abrirVentana(P.e === 'si'); }, 450);
}
W.__cnVozAPI = { encender: encender, apagar: apagar, ordenar: ordenar, nube: function () { return { activa: SR === NubeRec, motivo: NUBE.motivo, pedidos: NUBE.pedidos }; },
  idiomas: function (t) { var p = idiomas(hablable(t)); return p && p.map(function (x) { return { t: x.t, l: x.l, v: x.v && x.v.name }; }); },
  subs: function () { return subs().map(function (x) { return { id: x.id, t: x.t, padre: R.secs[x.padre] && R.secs[x.padre].id }; }); },
  estado: function () { return { on: R.on, modo: R.modo, i: R.i, j: R.j, sub: R.sub, tras: R.tras ? R.tras.o.tipo : '', rate: R.rate, voz: voz && voz.name, habla: R.habla, pausado: R.pausado, espera: R.espera && R.espera.ctx, oido: !!OIDO.rec, continuo: continuo(), turnos: OIDO.turnos, eco: OIDO.eco, ajenas: OIDO.ajenas, sps: R.spsBase || 0 }; },
  guion: function (id) { var s = leerSecciones(); for (var i = 0; i < s.length; i++) if (s[i].id === id) return guion(s[i]).map(function (u) { return hablable(u.t); }); return null; },
  secciones: function () { return leerSecciones().map(function (s) { return [s.n, s.id, s.t]; }); }, hablable: hablable, entender: function (t, c) { R.secs = R.secs.length ? R.secs : leerSecciones(); return entender(t, c); },
  auspiciadores: auspiciadores, prefs: function () { return P; } };
if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', inicio); else inicio();
})();
