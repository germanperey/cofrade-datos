"""Avance del gobierno en curso (sección «Avances logrados a igual período» de Cofrade News), revisado dos veces por semana.

27-11-2026 · Germán: «revisa también, que toda la sección "2. Política y Actualidad" se esté actualizando diariamente, los avances del
gobierno, los gráficos, las votaciones Parlamentarias, etc.». Las 8 promesas del gobierno venían de un archivo fijo de la Skill (estados al
15-10-2026) y no cambiaban. Respondió «sí al agente de gobierno»: la tarea «Agente de gobierno» (lunes y jueves) revisa cada promesa y el
impacto en la ciudadanía con fuentes oficiales, y lo guarda aquí; el sitio lo pone sobre la edición (sitio/modulos/gobierno_actual.js).

Uso:
  python3 herramientas/gobierno_actual.py ver
  python3 herramientas/gobierno_actual.py guardar /tmp/gobierno-nuevo.json --fecha AAAA-MM-DD
  python3 herramientas/gobierno_actual.py subir --fecha AAAA-MM-DD
El archivo nuevo trae {"promesas": [8 promesas], "impacto": {"es", "en", "fuentes"}, "cambios": ["qué cambió y por qué"]}.
"""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVO = os.path.join(RAIZ, "datos", "gobierno-actual.json")
ESTADOS = ("cumplida", "parcial", "no")
TIPOS = ("ley", "decreto", "administrativa", None)
CAMPOS_TEXTO = ("eje", "texto", "instrumento", "nota", "eje_en", "texto_en", "instrumento_en", "nota_en")
MAX_VERSIONES = 120


def cargar():
    return json.load(open(ARCHIVO, encoding="utf-8"))


def puntaje(promesas, solo_leyes=False):
    """Lo que muestra la edición: cumplida = 1, parcial = 0,5; «solo leyes» cuenta solo lo hecho por ley publicada."""
    v = {"cumplida": 1.0, "parcial": 0.5}
    return sum(v.get(p["estado"], 0) for p in promesas if not solo_leyes or p.get("tipo") == "ley")


def validar(nuevo, anterior, fecha):
    errores = []
    P = nuevo.get("promesas")
    if not isinstance(P, list) or len(P) != 8:
        return ["deben ser exactamente 8 promesas"]
    ids_ant = [p["id"] for p in anterior["promesas"]]
    if sorted(p.get("id") for p in P) != sorted(ids_ant):
        errores.append(f"las promesas deben ser las mismas 8 ({', '.join(ids_ant)}): no se cambian las promesas, solo su estado")
    ant = {p["id"]: p for p in anterior["promesas"]}
    for p in P:
        i = p.get("id", "?")
        if p.get("estado") not in ESTADOS:
            errores.append(f"{i}: estado debe ser cumplida, parcial o no")
        if p.get("tipo") not in TIPOS:
            errores.append(f"{i}: tipo debe ser ley, decreto, administrativa o null")
        for c in CAMPOS_TEXTO:
            if not isinstance(p.get(c), str) or not p[c].strip():
                errores.append(f"{i}: falta {c}")
            elif len(p[c]) > 420:
                errores.append(f"{i}: {c} tiene más de 420 letras")
        if not re.match(r"^https://", str(p.get("fuente") or "")):
            errores.append(f"{i}: la fuente debe ser una dirección https")
        if p.get("estado") in ("cumplida", "parcial") and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(p.get("fecha") or "")):
            errores.append(f"{i}: una promesa cumplida o parcial necesita la fecha del instrumento (AAAA-MM-DD)")
        if p.get("fecha") and str(p["fecha"]) > fecha:
            errores.append(f"{i}: la fecha {p['fecha']} es posterior a hoy")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(p.get("verificado") or "")) or str(p["verificado"]) > fecha:
            errores.append(f"{i}: verificado debe ser la fecha en que revisaste la fuente (AAAA-MM-DD, hoy o antes)")
        a = ant.get(i)
        if a and a.get("estado") != p.get("estado") and str(p.get("verificado")) != fecha:
            errores.append(f"{i}: cambió el estado ({a.get('estado')} → {p.get('estado')}) pero no se verificó hoy")
        if a and a.get("estado") == "cumplida" and p.get("estado") != "cumplida":
            errores.append(f"{i}: una promesa cumplida no vuelve atrás (si una ley se derogó, explícalo en la nota y deja cumplida)")
        if re.search(r"https?://", " ".join(str(p.get(c) or "") for c in CAMPOS_TEXTO)):
            errores.append(f"{i}: sin direcciones web dentro de los textos (van en «fuente»)")
    imp = nuevo.get("impacto") or {}
    for c in ("es", "en"):
        if not isinstance(imp.get(c), str) or not 40 <= len(imp[c]) <= 900:
            errores.append(f"impacto.{c}: entre 40 y 900 letras")
    if not isinstance(imp.get("fuentes"), list) or not all(re.match(r"^https://", str(u)) for u in imp.get("fuentes") or []):
        errores.append("impacto.fuentes: lista de direcciones https (puede ir vacía)")
    if not isinstance(nuevo.get("cambios"), list):
        errores.append("cambios: lista de lo que cambió y por qué (vacía si nada cambió)")
    return errores


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("accion", choices=("ver", "guardar", "subir"))
    ap.add_argument("archivo", nargs="?")
    ap.add_argument("--fecha", default=dt.date.today().isoformat())
    a = ap.parse_args()
    d = cargar()
    ult = d["versiones"][-1]
    if a.accion == "ver":
        print(f"Gobierno: {d['presidente']} (desde {d['inicio']}) · última versión {ult['fecha']} · origen: {ult.get('origen', '')}")
        print(f"A igual período: {puntaje(ult['promesas']):g} de 8 · solo leyes: {puntaje(ult['promesas'], True):g} de 8")
        for p in sorted(ult["promesas"], key=lambda x: x.get("verificado") or ""):
            print(f"- {p['id']} [{p['estado']}] {p['eje']}: {p['texto']} | {p.get('fecha') or 'sin fecha'} · {p['instrumento']} | verificado {p.get('verificado')} | {p['nota']} | {p['fuente']}")
        print("IMPACTO:", ult["impacto"]["es"])
        return 0
    if a.accion == "guardar":
        nuevo = json.load(open(a.archivo, encoding="utf-8"))
        err = validar(nuevo, ult, a.fecha)
        if err:
            print("NO GUARDÉ NADA. Corrige:\n- " + "\n- ".join(err))
            return 1
        v = {"fecha": a.fecha, "origen": "Agente de gobierno", "promesas": nuevo["promesas"], "impacto": nuevo["impacto"], "cambios": nuevo["cambios"]}
        d["versiones"] = [x for x in d["versiones"] if x["fecha"] != a.fecha] + [v]
        d["versiones"] = sorted(d["versiones"], key=lambda x: x["fecha"])[-MAX_VERSIONES:]
        json.dump(d, open(ARCHIVO, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"GUARDADO {a.fecha}: a igual período {puntaje(v['promesas']):g} de 8 (antes {puntaje(ult['promesas']):g}) · solo leyes "
              f"{puntaje(v['promesas'], True):g} · cambios: {'; '.join(v['cambios']) or 'ninguno'}")
        return 0
    os.chdir(RAIZ)
    subprocess.run(["git", "add", "datos/gobierno-actual.json"], check=True)
    if subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
        print("Nada que subir.")
        return 0
    subprocess.run(["git", "-c", "user.name=Agente de gobierno", "-c", "user.email=gobierno@cofrad.es", "commit", "-q", "-m", f"Avance del gobierno al {a.fecha}"], check=True)
    for _ in range(3):
        if subprocess.run(["git", "push", "-q", "origin", "HEAD:main"]).returncode == 0:
            print("SUBIDO a GitHub.")
            return 0
        subprocess.run(["git", "pull", "-q", "--rebase", "origin", "main"])
    print("NO PUDE SUBIR a GitHub.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
