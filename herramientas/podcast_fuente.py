#!/usr/bin/env python3
"""Fuente diaria del podcast de Cofrade News (20-11-2026).

Germán, 20-11-2026 05:39: «quiero que me ayudes a implementar un "Podcast"... utilicemos mi cuenta de "Notebook LM" de Google,
para que diariamente pueda crear un mini Podcast con las noticias del día, basándose en los principales temas del índice del
Newsletter ("Economía, Negocios e Inversión"; "Política y Actualidad"; "Emprendimiento"; "Tecnología, Tendencias e Innovación";
"Conflictos bélicos vigentes"; "Indicadores económicos"; y "Crecimiento inmobiliario en Chile")».

Lee la edición COMPLETA del día (rama «ediciones») y escribe podcast/fuentes/AAAA-MM-DD.md solo con esas 7 secciones, en ese orden,
cada noticia con su medio y su fecha. Es el documento que Germán carga en Gemini Notebook (antes NotebookLM) para el audio.
No inventa nada: copia títulos, resúmenes, cifras y fuentes tal como salieron en la edición.

Uso:
  python3 herramientas/podcast_fuente.py                       # las ediciones de los últimos 3 días en origin/ediciones
  python3 herramientas/podcast_fuente.py --archivo X.html --fecha 2026-11-20 --salida /tmp/podcast
"""
import argparse, html, json, os, re, subprocess, sys
from datetime import date, datetime, timedelta, timezone

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECCIONES = [   # (id en la edición, título de Germán, máximo de noticias)
    ("economia", "Economía, Negocios e Inversión", 6),
    ("politica", "Política y Actualidad", 6),
    ("emprendimiento", "Emprendimiento", 4),
    ("tecnologia", "Tecnología, Tendencias e Innovación", 4),
    ("conflictos", "Conflictos bélicos vigentes", 4),
    ("indicadores", "Indicadores económicos", 12),
    ("inmobiliario", "Crecimiento inmobiliario en Chile", 4),
]
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
RX_MENSUAL = re.compile(r"imacec|\bipc\b|\butm\b|desempleo|desocupaci|inflaci", re.I)   # indicadores que se publican por mes
RX_ED = re.compile(r"^Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$")
TOPE_PALABRAS = 2400   # unos 5 a 8 minutos de audio salen de una fuente de este largo


def fecha_larga(f):
    d = date.fromisoformat(f)
    return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]} de {d.year}"


def texto(h):
    """HTML → texto plano de una línea."""
    h = re.sub(r"<(script|style|svg)\b[^>]*>.*?</\1>", " ", h or "", flags=re.S | re.I)
    h = re.sub(r"<br\s*/?>", " ", h, flags=re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"\s+", " ", t).strip()


def frase(t):
    t = t.strip()
    return t if not t or t[-1] in ".!?…»\")" else t + "."


def seccion(doc, sid):
    """HTML de la sección (desde su id hasta la sección siguiente), sin imágenes incrustadas ni dibujos."""
    m = re.search(r'<section\b[^>]*\bid="%s"' % re.escape(sid), doc)
    if not m:
        return ""
    fin = doc.find("<section", m.end())
    s = doc[m.start(): fin if fin > 0 else len(doc)]
    s = re.sub(r"data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+", "", s)
    return re.sub(r"<svg\b.*?</svg>", "", s, flags=re.S | re.I)


def notas(h):
    """Noticias de una lista «notas»: título, resumen, día y medio."""
    out = []
    for li in re.findall(r"<li\b[^>]*>(.*?)</li>", h, flags=re.S):
        t = re.search(r"<strong[^>]*>(.*?)</strong>", li, flags=re.S)
        if not t:
            continue
        r = re.search(r"</strong>\s*<span[^>]*>(.*?)</span>", li, flags=re.S)
        f = re.search(r'<time[^>]*class="fnota"[^>]*>(.*?)</time>', li, flags=re.S)
        fu = re.search(r'<em[^>]*class="fuente"[^>]*>.*?<a[^>]*>(.*?)</a>', li, flags=re.S)
        out.append({"titulo": texto(t.group(1)), "resumen": texto(r.group(1)) if r else "", "dia": texto(f.group(1)) if f else "",
                    "medio": texto(fu.group(1)) if fu else ""})
    return [x for x in out if x["titulo"]]


def listas_con_titulo(h):
    """Cada <ul class="notas"> con el <h3> o <h4> que la precede (Chile, Mundo…)."""
    res = []
    for m in re.finditer(r'<ul class="notas">(.*?)</ul>', h, flags=re.S):
        antes = h[: m.start()]
        t = list(re.finditer(r"<h[34]\b[^>]*>(.*?)</h[34]>", antes, flags=re.S))
        res.append((texto(t[-1].group(1)) if t else "", notas(m.group(1))))
    return res


def linea_nota(n):
    cita = ", ".join(x for x in (n["medio"], n["dia"]) if x)
    return f"- {frase(n['titulo'])} {frase(n['resumen'])}".rstrip() + (f" ({cita})" if cita else "")


def bloque_noticias(h, tope):
    """Chile primero y después el mundo; si la sección no separa, en el orden de la edición."""
    listas = [(t, ns) for t, ns in listas_con_titulo(h) if ns and not re.search(r"congreso|avances|leyes", t, re.I)]
    if not listas:
        return []
    if len(listas) == 1 or not any(t for t, _ in listas):
        return [linea_nota(n) for n in [n for _, ns in listas for n in ns][:tope]]
    listas.sort(key=lambda x: 0 if re.search(r"chile", x[0], re.I) else 1)   # Chile antes que el mundo (orden estable)
    cupo_chile = max(1, round(tope * 2 / 3))
    out = []
    for t, ns in listas:
        k = cupo_chile if re.search(r"chile", t, re.I) else tope - cupo_chile
        if k <= 0:
            continue
        out.append(f"### {t}")
        out += [linea_nota(n) for n in ns[:k]]
    return out


def bloque_conflictos(h, tope):
    out = []
    for m in re.finditer(r'<div class="panel-ciudad conflicto[^"]*"[^>]*>(.*?)(?=<div class="panel-ciudad conflicto|$)', h, flags=re.S):
        p = m.group(1)
        nombre = re.search(r'<h3[^>]*class="ciudad-tit"[^>]*>(.*?)</h3>', p, flags=re.S)
        if not nombre:
            continue
        sub = re.search(r'<p class="sub">(.*?)</p>', p, flags=re.S)
        res = re.search(r'<p class="resumen">(.*?)</p>', p, flags=re.S)
        ns = notas((re.search(r'<ul class="notas">(.*?)</ul>', p, flags=re.S) or re.match(r"()", "")).group(1))
        linea = f"- {texto(nombre.group(1))}"
        if sub:
            linea += f" ({texto(sub.group(1))})"
        linea += ". " + frase(texto(res.group(1))) if res else "."
        if ns:
            n = ns[0]
            cita = ", ".join(x for x in (n["medio"], n["dia"]) if x)
            linea += f" Última noticia: {frase(n['titulo'])}" + (f" ({cita})" if cita else "")
        out.append(re.sub(r"\.\.", ".", linea))
        if len(out) >= tope:
            break
    return out


def bloque_indicadores(h, tope):
    out = []
    for k in re.findall(r'<div class="kpi">(.*?)</div>', h, flags=re.S):
        n = re.search(r'<span class="kn">(.*?)</span>', k, flags=re.S)
        v = re.search(r'<span class="kv">(.*?)</span>', k, flags=re.S)
        if not (n and v):
            continue
        d = re.search(r'<span class="kd[^"]*">(.*?)</span>', k, flags=re.S)
        kf = [texto(x) for x in re.findall(r'<span class="kf">(.*?)</span>', k, flags=re.S)]
        fecha = next((x for x in kf if re.fullmatch(r"\d{2}-\d{2}-\d{4}", x)), "")
        fuente = next((x[len("Fuente:"):].strip() for x in kf if x.startswith("Fuente:")), "")
        linea = f"- {texto(n.group(1))}: {texto(v.group(1))}"
        if d and texto(d.group(1)):
            linea += f" (variación: {texto(d.group(1))})"   # tal como sale en la edición, sin agregarle a qué se compara
        if fecha and fecha.startswith("01-") and RX_MENSUAL.search(texto(n.group(1))):
            linea += f", dato de {MESES[int(fecha[3:5]) - 1]} de {fecha[6:]}"   # los datos mensuales no se leen «al 1 de septiembre»
        elif fecha:
            linea += f", al {fecha}"
        linea += "." + (f" Fuente: {frase(fuente)}" if fuente else "")
        out.append(linea)
        if len(out) >= tope:
            break
    return out


def armar(doc, fecha):
    """Markdown de la fuente del podcast para la edición de esa fecha. Devuelve (texto, secciones con contenido)."""
    partes = [f"# Cofrade News · Noticias del {fecha_larga(fecha)}", "",
              f"Fuente: edición de Cofrade News del {fecha_larga(fecha)} (www.cofrad.es/edicion/{fecha}). "
              "Cada noticia indica su medio y su fecha (día-mes). Son las 7 secciones principales del índice, en este orden.", ""]
    llenas = 0
    for i, (sid, titulo, tope) in enumerate(SECCIONES, 1):
        h = seccion(doc, sid)
        if sid == "conflictos":
            lineas = bloque_conflictos(h, tope)
        elif sid == "indicadores":
            lineas = bloque_indicadores(h, tope)
        else:
            lineas = bloque_noticias(h, tope)
        partes.append(f"## {i}. {titulo}")
        partes.append("")
        if lineas:
            llenas += 1
            partes += lineas
        else:
            partes.append("- Sin noticias de esta sección en la fuente de hoy.")   # cierto aunque el lector no haya entendido la sección
        partes.append("")
    md = "\n".join(partes).rstrip() + "\n"
    palabras = len(md.split())
    if palabras > TOPE_PALABRAS:   # se recorta por el final de cada sección, sin cortar una noticia
        lineas = md.split("\n")
        while len("\n".join(lineas).split()) > TOPE_PALABRAS:
            largos = [(len(l.split()), j) for j, l in enumerate(lineas) if l.startswith("- ") and j + 1 < len(lineas) and lineas[j + 1].startswith("- ")]
            if not largos:
                break
            lineas.pop(max(largos)[1])
        md = "\n".join(lineas)
    return md, llenas


def _git(*a):
    return subprocess.run(["git", *a], cwd=RAIZ, capture_output=True, text=True)


def ediciones_de(ref):
    r = _git("ls-tree", "--name-only", ref)
    if r.returncode != 0:
        return {}
    return {m.group(1): f for f in r.stdout.split() if (m := RX_ED.match(f))}


def actualizar_indice(salida, indice):
    fuentes = []
    for f in sorted(os.listdir(salida)) if os.path.isdir(salida) else []:
        m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})\.md", f)
        if m:
            t = open(os.path.join(salida, f), encoding="utf-8").read()
            fuentes.append({"fecha": m.group(1), "palabras": len(t.split()), "secciones": len(re.findall(r"^## ", t, flags=re.M))})
    fuentes.sort(key=lambda x: x["fecha"], reverse=True)
    os.makedirs(os.path.dirname(indice), exist_ok=True)
    try:   # sin cambios en las fuentes no se reescribe (si no, cada corrida dejaría un commit nuevo solo por la hora)
        if json.load(open(indice, encoding="utf-8")).get("fuentes") == fuentes[:120]:
            return False
    except (OSError, ValueError):
        pass
    json.dump({"actualizado": datetime.now(timezone(timedelta(hours=-3))).strftime("%Y-%m-%dT%H:%M-03:00"), "fuentes": fuentes[:120]},
              open(indice, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return True


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="origin/ediciones")
    ap.add_argument("--archivo")
    ap.add_argument("--fecha")
    ap.add_argument("--salida", default=os.path.join(RAIZ, "podcast", "fuentes"))
    ap.add_argument("--indice", default=os.path.join(RAIZ, "datos", "podcast.json"))
    ap.add_argument("--dias", type=int, default=3)
    a = ap.parse_args(argv)
    os.makedirs(a.salida, exist_ok=True)
    trabajos = []
    if a.archivo:
        f = a.fecha or (RX_ED.match(os.path.basename(a.archivo)) or re.match(r"()", "")).group(1)
        if not f:
            sys.exit("Falta --fecha AAAA-MM-DD")
        trabajos.append((f, open(a.archivo, encoding="utf-8").read()))
    else:
        eds = ediciones_de(a.ref)
        for f in sorted(eds, reverse=True)[: a.dias]:
            r = _git("show", f"{a.ref}:{eds[f]}")
            if r.returncode == 0:
                trabajos.append((f, r.stdout))
    escritas = 0
    for f, doc in trabajos:
        md, llenas = armar(doc, f)
        if llenas < 4:   # una edición rota o liviana no deja una fuente pobre: mejor nada (la tarea lo avisa)
            print(f"{f}: solo {llenas} de 7 secciones con contenido; no se escribe")
            continue
        destino = os.path.join(a.salida, f + ".md")
        if os.path.exists(destino) and open(destino, encoding="utf-8").read() == md:
            print(f"{f}: sin cambios")
            continue
        open(destino, "w", encoding="utf-8").write(md)
        escritas += 1
        print(f"{f}: {len(md.split())} palabras, {llenas} de 7 secciones → {os.path.relpath(destino, RAIZ)}")
    actualizar_indice(a.salida, a.indice)
    return escritas


if __name__ == "__main__":
    main()
