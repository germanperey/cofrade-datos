"""Resumen en audio de Cofrade News (2 a 3 minutos), para adjuntarlo al correo del día y compartirlo en Kit y Telegram.

27-11-2026 · Germán, con capturas del correo de la mañana: «no viene adjunto el audio con el resumen de las Noticias!!!». Eligió
un resumen de 2 a 3 minutos: las balas de «Lo que mueve la aguja hoy» y un titular de cada sección principal.

Cómo corre (GitHub Actions, .github/workflows/audio-dia.yml), apenas la tarea de la edición sube ediciones/Cofrade-News-AAAA-MM-DD.html:
  1) guion: arma el texto desde la edición publicada (solo lo que la edición dice), lo deja listo para leer en voz alta (cifras en
     palabras, siglas explicadas) y lo parte en trozos cortos -> datos/audio-guion/AAAA-MM-DD.json
  2) voz: pide a www.cofrad.es/audio/generar/AAAA-MM-DD/N?sha=<commit> la voz de cada trozo (Workers AI, MeloTTS en español),
     une las partes con ffmpeg en un MP3 liviano (mono, 64 kbps) y lo guarda en /tmp
  3) el flujo lo sube a la rama «audio» (solo los últimos 7 días, sin historial) como Cofrade-News-AAAA-MM-DD-resumen.mp3
La tarea de la edición lo baja de raw.githubusercontent.com y lo adjunta al correo (herramientas/correo_dia.py).
"""
import argparse
import datetime as dt
import hashlib
import html as H
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Santiago")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITIO = "https://www.cofrad.es"
DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
SECCIONES = (("economia", "En economía"), ("politica", "En política"), ("emprendimiento", "En emprendimiento"),
             ("tecnologia", "En tecnología"), ("inmobiliario", "En vivienda"), ("deportes", "Y en deportes"))
MAX_PARTE = 260

# ---------- cifras en palabras (español de Chile) ----------
_U = ("cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
      "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
      "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve")
_D = ("", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa")
_C = ("", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos")


def _menor_mil(n):
    if n == 0:
        return ""
    if n == 100:
        return "cien"
    c, r = divmod(n, 100)
    out = [_C[c]] if c else []
    if r:
        out.append(_U[r] if r < 30 else _D[r // 10] + (" y " + _U[r % 10] if r % 10 else ""))
    return " ".join(out)


def _apocope(t):
    """«veintiuno» -> «veintiún» y «uno» -> «un» delante de mil, millones o un sustantivo."""
    return re.sub(r"veintiuno$", "veintiún", re.sub(r"(?<!veinti)uno$", "un", t))


def en_letras(n):
    """Entero a palabras: 1037 -> «mil treinta y siete»; 2026 -> «dos mil veintiséis»; 51000000000 -> «cincuenta y un mil millones»."""
    if n < 0:
        return "menos " + en_letras(-n)
    if n < 30:
        return _U[n]
    partes = []
    millones, resto = divmod(n, 1_000_000)
    if millones:
        if millones == 1:
            partes.append("un millón")
        else:
            partes.append(_apocope(en_letras(millones)) + " millones")
    miles, unidades = divmod(resto, 1000)
    if miles:
        partes.append("mil" if miles == 1 else _apocope(_menor_mil(miles)) + " mil")
    if unidades:
        partes.append(_menor_mil(unidades))
    return " ".join(partes).replace("mil millones millones", "mil millones")


def _numero(s):
    """«1.037,91» -> «mil treinta y siete coma noventa y uno»; «4,6» -> «cuatro coma seis»; «0,05» -> «cero coma cero cinco»."""
    ent, _, dec = s.partition(",")
    txt = en_letras(int(ent.replace(".", "")))
    if dec:
        ceros = len(dec) - len(dec.lstrip("0"))
        txt += " coma " + " ".join(["cero"] * ceros + ([en_letras(int(dec))] if dec.strip("0") else []))
    return txt


def _plata(cifra, escala, moneda):
    """«1.037,91» pesos -> «1.037 pesos con 91 centavos»; «80» millones de dólares -> «80 millones de dólares»."""
    ent, _, dec = cifra.partition(",")
    if escala:
        return f"{cifra} {escala}{' de' if escala != 'mil' else ''} {moneda}"
    if dec and dec.strip("0"):
        return f"{ent} {moneda} con {int(dec[:2].ljust(2, '0'))} centavos"
    return f"{ent} {moneda}"


SIGLAS = (
    (r"\bTDLC\b", "Tribunal de Defensa de la Libre Competencia"), (r"\bFNE\b", "Fiscalía Nacional Económica"),
    (r"\bIPSA\b", "Ipsa"), (r"\bIMACEC\b", "Imacec"), (r"\bIPC\b", "i pe ce"), (r"\bUF\b", "u efe"), (r"\bUTM\b", "u te eme"),
    (r"\bTPM\b", "tasa de política monetaria"), (r"\bPIB\b", "pib"), (r"\bEE\. ?UU\.", "Estados Unidos"), (r"\bIA\b", "inteligencia artificial"),
    (r"\bCorfo\b", "Corfo"), (r"\bMinvu\b", "Minvu"), (r"\bkm\b", "kilómetros"), (r"\bvs\.?\b", "contra"), (r"\bN\.º\s*", "número "),
    (r"\bSr\.", "señor"), (r"\bSra\.", "señora"), (r"\bDr\.", "doctor"),
)


def hablar(t):
    """Texto de la edición -> texto para leer en voz alta (sin símbolos, cifras en palabras)."""
    t = H.unescape(t)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[«»“”\"]", "", t).replace("…", ".").replace("·", ",")
    t = re.sub(r"\s*[—–]\s*", ", ", t)
    for a, b in SIGLAS:
        t = re.sub(a, b, t)
    t = re.sub(r"US\$\s?(\d[\d.]*(?:,\d+)?)\s*(mil millones|millones|millón|mil)?", lambda m: _plata(m.group(1), m.group(2), "dólares"), t)
    t = re.sub(r"\$\s?(\d[\d.]*(?:,\d+)?)(?:\s*(mil millones|millones|millón|mil))?(?:\s+(?:de\s+)?pesos)?", lambda m: _plata(m.group(1), m.group(2), "pesos"), t)
    t = re.sub(r"(\d)\s?%", r"\1 por ciento", t)
    t = re.sub(r"(?<![\w,.])([+\-−])(?=\d)", lambda m: "más " if m.group(1) == "+" else "menos ", t)
    t = re.sub(r"\b(\d{1,2})-(\d{1,2})\b(?!\d)", lambda m: f"{en_letras(int(m.group(1)))} a {en_letras(int(m.group(2)))}", t)   # marcadores 1-2
    t = re.sub(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?", lambda m: _numero(m.group(0)), t)
    t = re.sub(r"\b(veinti)uno(?= mil\b| [a-záéíóúñ]+s\b)", r"\1ún", t)
    t = re.sub(r"\buno(?= mil\b| (?!por\b|coma\b)[a-záéíóúñ]+s\b)", "un", t)
    t = re.sub(r"\s+([,.;:])", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    return t if re.search(r"[.!?]$", t) else t + "."


# ---------- guion desde la edición ----------
def _texto(s):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def _clave(s):
    return re.sub(r"[\W_]+", "", s.lower())[:28]


def leer_edicion(ed):
    m = re.search(r'<section class="tres">(.*?)</section>', ed, re.S)
    balas = [b for b in (_texto(x) for x in re.findall(r"<li>(.*?)</li>", m.group(1), re.S)) if b][:5] if m else []
    titulares = []
    vistos = {_clave(b) for b in balas}
    for sid, intro in SECCIONES:
        s = re.search(r'<section[^>]*\bid="' + sid + r'"[^>]*>(.*?)</section>', ed, re.S)
        li = re.search(r"<li[^>]*>\s*<strong>(.*?)</strong>", s.group(1), re.S) if s else None
        if not li:
            continue
        t = _texto(li.group(1))
        if t and not any(_clave(t)[:20] in v or v[:20] in _clave(t) for v in vistos):
            titulares.append((intro, t))
            vistos.add(_clave(t))
    return balas, titulares


def fecha_larga(f):
    d = dt.date.fromisoformat(f)
    return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]}"


def armar_guion(ed, f):
    balas, titulares = leer_edicion(ed)
    if not balas and not titulares:
        raise SystemExit("La edición no trae «Lo que mueve la aguja hoy» ni titulares: no hay guion.")
    frases = [f"Buenos días. Este es el resumen en audio de Cofrade News, del {fecha_larga(f)}."]
    if balas:
        frases.append("Lo que mueve la aguja hoy.")
        frases += [hablar(b) for b in balas]
    if titulares:
        frases.append("Además, en las secciones de hoy.")
        frases += [hablar(f"{intro}: {t}") for intro, t in titulares]
    frases.append("La edición completa, con gráficos y todas sus fuentes, está en cofrad punto es. Que tengas un muy buen día.")
    texto = " ".join(frases)
    return {"fecha": f, "texto": texto, "palabras": len(texto.split()), "partes": partir(frases)}


def partir(frases, tope=MAX_PARTE):
    """Trozos cortos para la voz: frases enteras de hasta `tope` letras; una frase más larga se corta en sus comas."""
    piezas = []
    for fr in frases:
        if len(fr) <= tope:
            piezas.append(fr)
            continue
        actual = ""
        for trozo in re.split(r"(?<=,)\s+", fr):
            if actual and len(actual) + 1 + len(trozo) > tope:
                piezas.append(actual)
                actual = trozo
            else:
                actual = (actual + " " + trozo).strip()
        if actual:
            piezas.append(actual)
    out, actual = [], ""
    for p in piezas:
        if actual and len(actual) + 1 + len(p) > tope:
            out.append(actual)
            actual = p
        else:
            actual = (actual + " " + p).strip()
    if actual:
        out.append(actual)
    return [p[:400] for p in out]


def huella(guion):
    return hashlib.sha256(json.dumps(guion["partes"], ensure_ascii=False).encode()).hexdigest()[:16]


# ---------- voz ----------
def generar_voz(f, sha, salida, intentos=2):
    """Pide al sitio la voz de cada trozo del guion (un MP3 por trozo) y los une en un solo MP3 liviano."""
    guion = json.load(open(os.path.join(RAIZ, "datos", "audio-guion", f"{f}.json"), encoding="utf-8"))
    with tempfile.TemporaryDirectory() as tmp:
        lista = os.path.join(tmp, "lista.txt")
        with open(lista, "w") as L:
            for k in range(len(guion["partes"])):
                url, datos, ultimo = f"{SITIO}/audio/generar/{f}/{k}?sha={sha}", b"", ""
                for _ in range(intentos):
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": "cofrade-datos-audio/1.0"})
                        with urllib.request.urlopen(req, timeout=180) as r:
                            datos = r.read() if r.headers.get("Content-Type", "").startswith("audio/") else b""
                        if len(datos) > 2000:
                            break
                        ultimo = "respuesta sin audio"
                    except Exception as ex:   # noqa: BLE001
                        cuerpo = ex.read().decode("utf-8", "replace")[:200] if hasattr(ex, "read") else ""
                        ultimo = f"{type(ex).__name__}: {ex} {cuerpo}"
                else:
                    raise SystemExit(f"La voz no respondió en el trozo {k + 1}: {ultimo}")
                p = os.path.join(tmp, f"p{k:02d}.mp3")
                open(p, "wb").write(datos)
                L.write(f"file '{p}'\n")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-ac", "1", "-ar", "24000", "-b:a", "64k",
                        "-metadata", f"title=Cofrade News · resumen del {fecha_larga(f)}", "-metadata", "artist=Cofrade News",
                        "-metadata", "album=Cofrade News", salida], check=True)
    seg = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", salida],
                               capture_output=True, text=True, check=True).stdout.strip() or 0)
    print(f"AUDIO LISTO {salida} · {os.path.getsize(salida):,} bytes · {seg:.0f} segundos · {len(guion['partes'])} partes")
    return seg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("accion", choices=("guion", "voz"))
    ap.add_argument("--fecha", default=dt.datetime.now(TZ).date().isoformat())
    ap.add_argument("--ed", help="edición HTML (por defecto ediciones/Cofrade-News-<fecha>.html)")
    ap.add_argument("--sha", help="commit donde quedó el guion (para voz)")
    ap.add_argument("--salida", default="/tmp/resumen.mp3")
    a = ap.parse_args()
    if a.accion == "guion":
        ruta = a.ed or os.path.join(RAIZ, "ediciones", f"Cofrade-News-{a.fecha}.html")
        g = armar_guion(open(ruta, encoding="utf-8", errors="replace").read(), a.fecha)
        g["huella"] = huella(g)
        dest = os.path.join(RAIZ, "datos", "audio-guion", f"{a.fecha}.json")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        json.dump(g, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"GUION {a.fecha}: {g['palabras']} palabras (unos {g['palabras'] / 150:.1f} minutos), {len(g['partes'])} partes, huella {g['huella']}")
    else:
        if not a.sha or not re.fullmatch(r"[0-9a-f]{40}", a.sha):
            sys.exit("Falta --sha con el commit del guion")
        seg = generar_voz(a.fecha, a.sha, a.salida)
        if not 45 <= seg <= 300:
            sys.exit(f"Duración fuera de rango ({seg:.0f} s): no se publica")


if __name__ == "__main__":
    main()
