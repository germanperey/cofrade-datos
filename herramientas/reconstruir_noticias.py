# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile).
"""Archivo de noticias de los días anteriores al 13-11-2026 (14-11-2026, Germán: «la reparación de los huecos en los respaldos»).

El archivo permanente (archivo/noticias/AAAA/AAAA-MM-DD.json) empezó a llenarse el 13-11. Las ediciones anteriores sí están
publicadas (completas en la rama «ediciones» o livianas en ediciones/): este programa lee cada edición publicada y deja sus
noticias en el mismo formato, marcadas como reconstruidas. Nunca pisa un día que ya esté en el archivo.

Uso:  python3 herramientas/reconstruir_noticias.py [--ref origin/ediciones] [--hasta 2026-11-12]"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from html import unescape
from html.parser import HTMLParser

RX = re.compile(r"Cofrade-News-(\d{4}-\d{2}-\d{2})\.html$")
CONFLICTOS = [("rusia", "rusia-ucrania"), ("ucrania", "rusia-ucrania"), ("gaza", "israel-gaza"), ("israel", "israel-gaza"),
              ("irán", "iran-regional"), ("iran", "iran-regional"), ("sudán", "sudan"), ("sudan", "sudan")]
DEPORTES = {"golf": "golf", "equitación": "equitacion", "equitacion": "equitacion", "tenis": "tenis", "fútbol": "futbol", "futbol": "futbol"}


def _limpio(t):
    return re.sub(r"\s+", " ", unescape(t or "")).strip()


class Notas(HTMLParser):
    """Lee las listas <ul class="notas"> de una edición: título (<strong>), texto (<span>), fuente y fecha (<em class="fuente">)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sec, self.h3, self.h4 = None, "", ""
        self.en, self.buf = None, []
        self.ul = 0
        self.li = None
        self.notas = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get("class") or "").split()
        if tag == "section" and "sec" in cls and a.get("id"):
            self.sec, self.h3, self.h4 = a["id"], "", ""
        elif tag in ("h3", "h4") and self.li is None:
            self.en, self.buf = tag, []
        elif tag == "ul" and "notas" in cls:
            self.ul += 1
        elif tag == "li" and self.ul:
            self.li = {"titulo": "", "texto": "", "fuente": "", "url": "", "dm": "", "_parte": None, "_span": 0}
        elif self.li is not None:
            if tag == "strong" and not self.li["titulo"]:
                self.li["_parte"] = "titulo"
            elif tag == "span" and "tambien" in cls:
                self.li["_parte"] = "_fuera"
            elif tag == "span" and not self.li["texto"] and self.li["_parte"] is None:
                self.li["_parte"] = "texto"
            elif tag == "em" and "fuente" in cls:
                self.li["_parte"] = "_em"
            elif tag == "time" and self.li["_parte"] == "_em":
                self.li["_parte"] = "dm"
            elif tag == "a" and self.li["_parte"] == "_em" and not self.li["url"]:
                self.li["url"] = a.get("href") or ""
                self.li["_parte"] = "fuente"

    def handle_endtag(self, tag):
        if tag in ("h3", "h4") and self.en == tag:
            t = _limpio("".join(self.buf))
            if tag == "h3":
                self.h3, self.h4 = t, ""
            else:
                self.h4 = t
            self.en = None
        elif tag == "ul" and self.ul:
            self.ul -= 1
        elif tag == "li" and self.li is not None:
            n = {k: _limpio(v) for k, v in self.li.items() if not k.startswith("_")}
            if n["titulo"]:
                self.notas.append((self.sec, self.h3, self.h4, n))
            self.li = None
        elif self.li is not None:
            p = self.li["_parte"]
            if (tag == "strong" and p == "titulo") or (tag == "span" and p in ("texto", "_fuera")):
                self.li["_parte"] = None
            elif tag == "time" and p == "dm":
                self.li["_parte"] = "_em"
            elif tag == "a" and p == "fuente":
                self.li["_parte"] = "_em"
            elif tag == "em" and p in ("_em", "dm", "fuente"):
                self.li["_parte"] = None

    def handle_data(self, d):
        if self.en:
            self.buf.append(d)
        elif self.li is not None and self.li["_parte"] in ("titulo", "texto", "fuente", "dm"):
            self.li[self.li["_parte"]] += d


def clave(sec, h3, h4):
    s, t = (sec or "").lower(), (h3 or "").lower()
    if s in ("economia", "politica"):
        return f"{s}/{'mundo' if 'mundo' in t else 'chile'}"
    if s == "conflictos":
        return "conflictos/" + next((v for k, v in CONFLICTOS if k in t), re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "otros")
    if s == "deportes":
        if "otros" in t and h4:
            return f"deportes/{h4}"
        return "deportes/" + DEPORTES.get(t, re.sub(r"[^a-z0-9áéíóúñ]+", "-", t).strip("-") or "otros")
    return s


def tres_del_dia(html):
    m = re.search(r'<section class="tres"[^>]*>.*?<ol>(.*?)</ol>', html, re.S)
    return [{"titulo": _limpio(re.sub(r"<[^>]+>", " ", x))} for x in re.findall(r"<li>(.*?)</li>", m.group(1), re.S)] if m else []


def noticias(html, fecha):
    p = Notas()
    p.feed(html)
    secciones = {}
    tres = tres_del_dia(html)
    if tres:
        secciones["tres_del_dia"] = tres
    for sec, h3, h4, n in p.notas:
        dm = re.match(r"(\d{2})-(\d{2})", n.pop("dm") or "")
        n["fecha"] = f"{fecha[:4]}-{dm.group(2)}-{dm.group(1)}" if dm else ""
        if n["fecha"] > fecha:   # una nota de diciembre leída en una edición de enero
            n["fecha"] = f"{int(fecha[:4]) - 1}{n['fecha'][4:]}"
        secciones.setdefault(clave(sec, h3, h4), []).append(n)
    return secciones


LIVIANA_SECCIONES = [("1. economía", "economia"), ("2. política", "politica"), ("3. emprendimiento", "emprendimiento"),
                     ("4. tecnología", "tecnologia"), ("15. crecimiento inmobiliario", "inmobiliario"), ("21. deportes", "deportes")]


class Liviana(HTMLParser):
    """Edición liviana (la de Drive, sin listas «notas»): <h2> sección, <h3>/<h4> apartado y <li><b>Título</b> — comienzo del
    resumen…</li>. Solo las noticias; las listas de datos (fondos, subsidios, Congreso, pronóstico) no tienen ese formato."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sec, self.h3, self.h4, self.en, self.buf = None, "", "", None, []
        self.li, self.b = None, None
        self.notas = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h2", "h3", "h4"):
            self.en, self.buf = tag, []
        elif tag == "li":
            self.li, self.b = [], None
        elif tag == "b" and self.li is not None and self.b is None and not "".join(self.li).strip():
            self.b = []

    def handle_endtag(self, tag):
        if tag in ("h2", "h3", "h4") and self.en == tag:
            t = _limpio("".join(self.buf))
            if tag == "h2":
                self.sec = next((k for pre, k in LIVIANA_SECCIONES if t.lower().startswith(pre)), None)
                self.h3 = self.h4 = ""
            elif tag == "h3":
                self.h3, self.h4 = t, ""
            else:
                self.h4 = t
            self.en = None
        elif tag == "b" and self.b is not None and self.li is not None:
            self.li.append("\x00")
        elif tag == "li" and self.li is not None:
            txt = "".join(self.li)
            if self.sec and "\x00" in txt:
                tit, _, resto = txt.partition("\x00")
                resto = _limpio(resto)
                if resto.startswith("— "):
                    self.notas.append((self.sec, self.h3, self.h4, {"titulo": _limpio("".join(self.b or [])),
                                                                   "texto": resto[2:].strip()}))
            self.li, self.b = None, None

    def handle_data(self, d):
        if self.en:
            self.buf.append(d)
        elif self.li is not None:
            if self.b is not None and "\x00" not in "".join(self.li):
                self.b.append(d)
            else:
                self.li.append(d)


def noticias_livianas(html, fecha):
    """{sección: [notas]} desde una edición liviana: título y comienzo del resumen (sin enlace ni fuente, que no trae)."""
    p = Liviana()
    p.feed(html)
    secciones = {}
    m = re.search(r"<h2>Las \d+ del día</h2>(.*?)<h2", html, re.S)
    tres = [_limpio(re.sub(r"<[^>]+>", " ", x)) for x in re.findall(r"<p>\s*\d\.\s*(.*?)</p>", m.group(1), re.S)] if m else []
    if tres:
        secciones["tres_del_dia"] = [{"titulo": t} for t in tres]
    for sec, h3, h4, n in p.notas:
        t3 = h3.lower()
        if sec in ("economia", "politica"):
            if t3 not in ("chile", "mundo"):
                continue
            k = f"{sec}/{t3}"
        elif sec == "deportes":
            k = clave("deportes", h3, h4)
        elif h3:   # en Emprendimiento e Inmobiliario, después de las noticias vienen fondos y subsidios
            continue
        else:
            k = sec
        secciones.setdefault(k, []).append(n)   # sin «fecha» por nota: la liviana no la trae (el período abarca dos días)
    return secciones


def _git(args, binario=False):
    r = subprocess.run(["git"] + args, capture_output=True, text=not binario)
    return r.stdout if r.returncode == 0 else None


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="origin/ediciones")
    ap.add_argument("--hasta", default="2026-11-12", help="último día a reconstruir (desde el 13-11 el archivo es directo)")
    ap.add_argument("--manifiesto", default="archivo/manifiesto/2026-11.json")
    a = ap.parse_args(argv)
    completas = {RX.search(n).group(1): n for n in (_git(["ls-tree", "--name-only", a.ref]) or "").split() if RX.search(n)}
    livianas = {RX.search(n).group(1): n for n in os.listdir("ediciones") if RX.search(n)} if os.path.isdir("ediciones") else {}
    man = json.load(open(a.manifiesto, encoding="utf-8"))
    hechos = []
    for f in sorted(set(completas) | set(livianas)):
        if f > a.hasta:
            continue
        destino = os.path.join("archivo", "noticias", f[:4], f"{f}.json")
        if os.path.exists(destino):
            continue
        if f in completas:
            b, origen = _git(["show", f"{a.ref}:{completas[f]}"], binario=True), "edición completa publicada (rama «ediciones»)"
        else:
            b, origen = open(os.path.join("ediciones", livianas[f]), "rb").read(), "edición liviana publicada (ediciones/)"
        if not b:
            continue
        sec = noticias(b.decode("utf-8", "replace"), f)
        if f not in completas and sum(len(v) for v in sec.values()) < 5:   # la liviana no trae listas «notas»
            sec = noticias_livianas(b.decode("utf-8", "replace"), f)
            origen = ("edición liviana (ediciones/), porque la completa no se guardó ese día: las primeras noticias de cada "
                      "sección, con el título y el comienzo del resumen, sin enlace ni fuente")
        if sum(len(v) for v in sec.values()) < 5:
            print(f"AVISO {f}: la edición trae menos de 5 noticias reconocibles; no se reconstruye")
            continue
        dia = {"fecha": f, "secciones": dict(sorted(sec.items())), "reconstruido": f"14-11-2026, desde la {origen}; solo las noticias "
               "(sin biografía, efemérides ni historia naval, que esos días no se guardaron por separado)"}
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        texto = json.dumps(dia, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
        open(destino, "w", encoding="utf-8").write(texto)
        man["archivos"][destino.replace(os.sep, "/")] = {"h": hashlib.sha256(texto.encode()).hexdigest()[:16], "b": len(texto.encode())}
        hechos.append((f, sum(len(v) for v in sec.values()), len(sec)))
    if hechos:
        man["archivos"] = dict(sorted(man["archivos"].items()))
        open(a.manifiesto, "w", encoding="utf-8").write(json.dumps(man, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    for f, n, s in hechos:
        print(f"{f}: {n} noticias en {s} secciones")
    print(f"Días reconstruidos: {len(hechos)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
