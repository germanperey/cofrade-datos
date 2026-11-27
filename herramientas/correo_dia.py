"""Correos del día de Cofrade News: uno limpio para leer y reenviar (con el audio adjunto) y otro interno, solo para Germán.

27-11-2026 · Germán, con capturas del correo de la mañana: «aparecen varios links que hay que ocultar..... Y además, no viene adjunto
el audio con el resumen de las Noticias!!!». Eligió: quitar TODOS los enlaces del correo, separar el bloque interno (control de calidad,
pendientes, mejoras, notas internas y el texto para redes) en un segundo correo, y adjuntar un resumen en audio de 2 a 3 minutos.

Uso en la tarea de la edición (después de generar Cofrade-News-AAAA-MM-DD-correo.txt):
  python3 correo_dia.py --correo <ruta del -correo.txt> --fecha AAAA-MM-DD [--esperar 600]
Escribe junto al correo.txt: -lector.txt, -lector.html y -interno.txt, y baja el audio del día (rama «audio» del repositorio) al
directorio de trabajo actual. Imprime ADJUNTO sha256:<hex>:<ruta> (para el adjunto de Gmail) o SIN AUDIO <motivo>.
"""
import argparse
import hashlib
import html as H
import os
import re
import shutil
import subprocess
import sys
import time

AUDIO = "https://raw.githubusercontent.com/germanperey/cofrade-datos/audio/Cofrade-News-{f}-resumen.mp3"
ZW = "​"   # espacio de ancho cero: corta direcciones como «armada.cl» para que el correo no las convierta en enlace
NOMBRES = {
    "armada.cl": "Armada de Chile", "phys.org": "Phys org", "sciencedaily.com": "ScienceDaily", "medicalxpress.com": "Medical Xpress",
    "bcentral.cl": "Banco Central de Chile", "sii.cl": "SII", "bcn.cl": "Biblioteca del Congreso Nacional", "camara.cl": "Cámara de Diputados",
    "senado.cl": "Senado de Chile", "latercera.com": "La Tercera", "emol.com": "Emol", "biobiochile.cl": "BioBioChile", "df.cl": "Diario Financiero",
    "cooperativa.cl": "Cooperativa", "adnradio.cl": "ADN Radio", "cnnchile.com": "CNN Chile", "elmostrador.cl": "El Mostrador",
    "wikipedia.org": "Wikipedia", "cofrad.es": "Cofrade News", "caddiegolf.cl": "Caddie Golf", "linkedin.com": "LinkedIn", "github.com": "GitHub",
}
TLD = r"(?:cl|com|org|net|es|io|gov|gob|edu|int|info|news|tv|ar|pe|mx|co|uk|us|de|fr|it|eu|ai|app|dev)"
DOMINIO = re.compile(r"\b(?:www\.)?((?:[a-z0-9-]+\.)+" + TLD + r")\b", re.I)


def nombre_de(url_o_dominio):
    d = re.sub(r"^https?://", "", url_o_dominio.strip(), flags=re.I).split("/")[0].lower()
    d = re.sub(r"^www\.", "", d)
    for k, v in NOMBRES.items():
        if d == k or d.endswith("." + k):
            return v
    return d


def sin_enlaces(t):
    """Quita toda dirección web: «(http://armada.cl)» -> «(Armada de Chile)»; «Texto: https://…» -> «Texto»; dominios sueltos cortados."""
    t = re.sub(r"https?://www\.google\.com/url\?q=(\S+?)&\S*", lambda m: m.group(1), t)   # por si viene ya envuelta
    t = re.sub(r"\((https?://[^\s,)]+)", lambda m: "(" + nombre_de(m.group(1)), t)
    t = re.sub(r":\s*(https?://\S+)", lambda m: ": " + nombre_de(m.group(1)), t)
    t = re.sub(r"https?://\S+", lambda m: nombre_de(m.group(0)), t)
    t = DOMINIO.sub(lambda m: m.group(0).replace(".", "." + ZW), t)
    return t


def separar(correo):
    """Devuelve (lector, interno). Interno: notas internas, copia de respaldo y el texto para redes."""
    interno = []
    lineas = correo.splitlines()
    k = next((i for i, l in enumerate(lineas) if l.startswith("TEXTO PARA COMPARTIR EN REDES")), None)
    if k is not None:
        interno.append("\n".join(lineas[k:]).strip())
        lineas = lineas[:k]
    lector = []
    for l in lineas:
        if l.startswith("[Nota interna"):
            interno.insert(0, l.strip())
        elif l.startswith("Boletín completo:") and "respaldo" in l:
            interno.insert(0, l.strip())
            lector.append("Boletín completo, con gráficos y todas las fuentes: www.cofrad.es")
        elif l.startswith("Tecnología desarrollada por"):
            lector.append("Tecnología desarrollada por Germán Perey.")
        else:
            lector.append(l)
    texto = re.sub(r"\n{3,}", "\n\n", "\n".join(lector)).strip() + "\n"
    return sin_enlaces(texto), sin_enlaces("\n\n".join(interno).strip() + "\n") if interno else ""


ES_TITULO = re.compile(r"^(?:\d{1,2}\. .+|Las 3 del día|Lo que mueve la aguja hoy|Cofrade News|Conflictos bélicos vigentes|Historia Naval de Chile|"
                       r"Mar y mareas.*|Sismos.*|Vuelos Comerciales.*|Estrecho de Magallanes.*|Horóscopo.*|Publicidad|⚠ .+)$")


def a_html(texto, f):
    out = []
    for l in texto.splitlines():
        e = H.escape(l)
        if not l.strip():
            out.append('<div style="height:10px"></div>')
        elif ES_TITULO.match(l.strip()):
            out.append(f'<div style="margin:14px 0 6px;font-weight:700;font-size:17px;color:#1A1406">{e}</div>')
        elif l.strip() == "(más en el boletín completo)":
            out.append(f'<div style="color:#8a7a52;font-size:13px;margin:2px 0 6px">{e.strip()}</div>')
        else:
            out.append(f'<div style="margin:0 0 4px">{e}</div>')
    return ('<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:15px;line-height:1.55;color:#222;max-width:720px">'
            + "".join(out) + "</div>")


def bajar_audio(f, esperar, destino):
    url = AUDIO.format(f=f)
    fin = time.time() + esperar
    motivo = ""
    while True:
        r = subprocess.run(["curl", "-sfL", "-m", "60", "-o", destino + ".tmp", url], capture_output=True)
        if r.returncode == 0 and os.path.getsize(destino + ".tmp") > 20000:
            with open(destino + ".tmp", "rb") as fh:
                cab = fh.read(3)
            if cab[:3] == b"ID3" or cab[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
                shutil.move(destino + ".tmp", destino)
                return True, ""
            motivo = "el archivo bajado no es un MP3"
        else:
            motivo = f"la rama «audio» no trae el MP3 de {f} (curl {r.returncode})"
        if time.time() >= fin:
            if os.path.exists(destino + ".tmp"):
                os.remove(destino + ".tmp")
            return False, motivo
        time.sleep(30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--correo", required=True)
    ap.add_argument("--fecha", required=True)
    ap.add_argument("--esperar", type=int, default=600, help="segundos máximos esperando el audio (por defecto 10 minutos)")
    a = ap.parse_args()
    base = a.correo[: -len("-correo.txt")] if a.correo.endswith("-correo.txt") else os.path.splitext(a.correo)[0]
    lector, interno = separar(open(a.correo, encoding="utf-8").read())
    open(base + "-lector.txt", "w", encoding="utf-8").write(lector)
    open(base + "-lector.html", "w", encoding="utf-8").write(a_html(lector, a.fecha))
    open(base + "-interno.txt", "w", encoding="utf-8").write(interno)
    quedan = re.findall(r"https?://", lector) + DOMINIO.findall(lector)
    print(f"LECTOR {base}-lector.txt y {base}-lector.html · {len(lector):,} letras · direcciones a la vista: {len(quedan)}")
    print(f"INTERNO {base}-interno.txt · {len(interno):,} letras")
    destino = os.path.join(os.getcwd(), f"Cofrade-News-{a.fecha}-resumen.mp3")
    ok, motivo = bajar_audio(a.fecha, a.esperar, destino)
    if ok:
        h = hashlib.sha256(open(destino, "rb").read()).hexdigest()
        print(f"ADJUNTO sha256:{h}:{destino}")
        print(f"AUDIO {os.path.getsize(destino):,} bytes")
    else:
        print(f"SIN AUDIO {motivo}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
