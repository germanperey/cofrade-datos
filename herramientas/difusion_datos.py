#!/usr/bin/env python3
"""Cofrade News · difusión automática (23-11-2026).

Germán, 19:37: «Deja una semilla en múltiples páginas webs y redes sociales para que republiquen nuestro newsletter y capten nuevos
lectores». 19:42: «aplica todo lo propuesto, y todo lo que puedas automatizar y validar de mi parte de forma automática y permanente».

Corre dentro del flujo «Índice de ediciones» (GitHub Actions) y hace tres cosas, todas gratis y permitidas:
1. datos/resumenes.json: «Las 3 del día» y el título de cada edición. Lo usan el canal RSS (/rss.xml), el recuadro para republicar
   (/widget) y las fichas que se ven al compartir un enlace en WhatsApp, LinkedIn o Facebook.
2. IndexNow: avisa a Bing, Yandex, Seznam y Naver apenas se publica una edición nueva (protocolo abierto, sin cuenta).
3. WebSub: avisa al centro público de Google (pubsubhubbub.appspot.com) que el RSS cambió, así Feedly, Inoreader y los sitios que
   republican por RSS reciben la edición en minutos y no en horas.
Lo que ya se avisó queda en datos/difusion-estado.json, para no repetir avisos. Si algo falla, el índice sigue igual.
"""
import argparse, html, json, os, re, subprocess, sys, urllib.parse, urllib.request

DOMINIO = "www.cofrad.es"
INDEXNOW_KEY = "d14dc1b3928cadd21d5ac21eed6d825a"   # clave pública (va en https://www.cofrad.es/<clave>.txt); no es un secreto
UA = "CofradeNews-Difusion/1.0 (+https://www.cofrad.es)"
MAX_RESUMENES = 120


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True, check=False).stdout


def tres_de(h):
    """«Las 3 del día» y el título de una edición (HTML) → (titulo, [3 textos])."""
    t = re.search(r"<title>(.*?)</title>", h[:20000], re.S)
    titulo = html.unescape(re.sub(r"\s+", " ", t.group(1))).strip() if t else ""
    s = re.search(r'<section class="tres">(.*?)</section>', h, re.S)
    items = []
    if s:
        for li in re.findall(r"<li>(.*?)</li>", s.group(1), re.S):
            x = html.unescape(re.sub(r"<[^>]+>", " ", li))
            x = re.sub(r"\s+", " ", x).strip()
            if 20 <= len(x) <= 600:
                items.append(x)
    return titulo, items[:3]


def leer_json(ruta, defecto):
    try:
        with open(ruta, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return defecto


def avisar(url, datos=None, cabeceras=None, metodo="POST"):
    req = urllib.request.Request(url, data=datos, method=metodo, headers={"User-Agent": UA, **(cabeceras or {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return f"error {type(e).__name__}"


def main(argv=None):
    a = argparse.ArgumentParser()
    a.add_argument("--ref", default="origin/ediciones")
    a.add_argument("--salida", default="datos")
    a.add_argument("--sin-avisos", action="store_true", help="solo arma resumenes.json (pruebas)")
    o = a.parse_args(argv)
    ruta_r, ruta_e = os.path.join(o.salida, "resumenes.json"), os.path.join(o.salida, "difusion-estado.json")
    previos = {x["f"]: x for x in leer_json(ruta_r, {}).get("ediciones", []) if isinstance(x, dict) and x.get("f")}
    nombres = [n for n in git("ls-tree", "--name-only", o.ref).split() if re.fullmatch(r"Cofrade-News-\d{4}-\d{2}-\d{2}\.html", n)]
    nuevos = 0
    for n in nombres:
        f = n[13:23]
        h = git("show", f"{o.ref}:{n}")
        if not h:
            continue
        titulo, tres = tres_de(h)
        if len(tres) < 3:
            continue
        x = {"f": f, "titulo": titulo or f"Cofrade News · {f}", "tres": tres}
        if previos.get(f) != x:
            nuevos += 1
        previos[f] = x
    lista = sorted(previos.values(), key=lambda x: x["f"], reverse=True)[:MAX_RESUMENES]
    os.makedirs(o.salida, exist_ok=True)
    with open(ruta_r, "w", encoding="utf-8") as fh:
        json.dump({"fuente": "ediciones de Cofrade News (sección «Las 3 del día»)", "ediciones": lista}, fh, ensure_ascii=False, indent=1)
    print(f"resumenes.json: {len(lista)} ediciones ({nuevos} nuevas o cambiadas)")
    if o.sin_avisos or not lista:
        return 0
    est = leer_json(ruta_e, {})
    hechas = set(est.get("indexnow", []))
    por_avisar = [x["f"] for x in lista[:10] if x["f"] not in hechas]
    if por_avisar:
        urls = [f"https://{DOMINIO}/edicion/{f}" for f in por_avisar] + [f"https://{DOMINIO}/", f"https://{DOMINIO}/rss.xml"]
        cuerpo = json.dumps({"host": DOMINIO, "key": INDEXNOW_KEY, "keyLocation": f"https://{DOMINIO}/{INDEXNOW_KEY}.txt", "urlList": urls}).encode()
        r1 = avisar("https://api.indexnow.org/indexnow", cuerpo, {"Content-Type": "application/json; charset=utf-8"})
        r2 = avisar("https://pubsubhubbub.appspot.com/", urllib.parse.urlencode({"hub.mode": "publish", "hub.url": f"https://{DOMINIO}/rss.xml"}).encode(),
                    {"Content-Type": "application/x-www-form-urlencoded"})
        print(f"IndexNow {r1} · WebSub {r2} · {', '.join(por_avisar)}")
        if r1 in (200, 202):
            hechas.update(por_avisar)
        est["ultimo_aviso"] = {"fechas": por_avisar, "indexnow": r1, "websub": r2}
    est["indexnow"] = sorted(hechas, reverse=True)[:60]
    with open(ruta_e, "w", encoding="utf-8") as fh:
        json.dump(est, fh, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
