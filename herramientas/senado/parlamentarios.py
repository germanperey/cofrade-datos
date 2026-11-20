# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile). Prohibida su copia, adaptación o recreación, total o parcial, con o sin IA, sin autorización escrita del titular (Germán, dueño de Cofrade News, y quienes él autorice pueden modificarlo). Ver LICENSE.md.
"""Cofrade News · padrón de parlamentarios 2026-2030 (Cámara y Senado) y cruce «nombre → partido».

La lista nominal de votación de camara.cl trae solo nombres, sin partido, y en dos formatos:
«Alessandri Vergara, Jorge» y «Achurra Díaz Ignacio» (sin coma). Este módulo los busca en
assets/parlamentarios.json (verificado en camara.cl y senado.cl) y devuelve el partido.

    partido_de("Achurra Díaz, Ignacio")        → ("FA", "Frente Amplio")
    partido_de("Achurra Díaz Ignacio")         → ("FA", "Frente Amplio")
    partido_de("Ignacio Achurra")              → ("FA", "Frente Amplio")      # formato del directorio
    partido_de("Carter Fernández", "Senado")   → ("IND", "Independientes")
    partido_de("Carter Fernández")             → (None, None)   # dos hermanos, uno en cada cámara
    nombre_partido("PREP")                     → "Partido Republicano"

Regla de oro: si el nombre calza con dos o más parlamentarios, NO se asigna partido: (None, None).
Nada aquí lanza excepciones: una entrada rara (None, número, lista…) devuelve (None, None).
"""
import json
import os
import re
import unicodedata

RUTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parlamentarios.json")   # copia del padrón de la Skill (20-11-2026)
_CACHE = {}   # ruta → (datos, personas indexadas)

_PARTICULAS = frozenset("de del la las los y van von der da das do dos di du".split())   # «Lerdo de Tejada», «Peña y Lillo», «Del Real»
_TITULOS = frozenset("sr sra srta dip diputado diputada sen senador senadora honorable hd hs".split())
_MAX_LARGO, _MAX_PALABRAS = 200, 12


# ------------------------------------------------------------------ lectura del padrón
def cargar(ruta=None):
    """Padrón completo (dict). Se lee una sola vez y queda en memoria; si falta o está dañado devuelve {}."""
    try:
        ruta = RUTA if ruta is None else ruta
        if not isinstance(ruta, (str, os.PathLike)):
            return {}
        if ruta not in _CACHE:
            try:
                with open(ruta, encoding="utf-8") as fh:
                    datos = json.load(fh)
            except Exception:   # noqa: BLE001 — archivo ausente, ilegible o JSON roto
                datos = {}
            if not isinstance(datos, dict):
                datos = {}
            _CACHE[ruta] = (datos, _indexar(datos))
        return _CACHE[ruta][0]
    except Exception:   # noqa: BLE001
        return {}


def _personas():
    cargar()
    return _CACHE.get(RUTA, ({}, []))[1]


def _indexar(datos):
    """[{camara, G (nombres de pila), S (apellidos), partido, fila}] solo con filas completas y bien formadas."""
    personas = []
    for camara in ("camara", "senado"):
        filas = datos.get(camara)
        if not isinstance(filas, list):
            continue
        for f in filas:
            if not isinstance(f, dict):
                continue
            nombres, apellidos, cod = f.get("nombres"), f.get("apellidos"), f.get("partido")
            if not (isinstance(nombres, str) and isinstance(apellidos, str) and isinstance(cod, str) and cod.strip()):
                continue
            G, S = tuple(_tokens(nombres)), tuple(_tokens(apellidos))
            if G and S:
                personas.append({"camara": camara, "G": G, "S": S, "partido": cod.strip(), "fila": f})
    return personas


# ------------------------------------------------------------------ normalización
def _plano(texto):
    """Minúsculas, sin tildes ni signos: «Clèment-Lund» → «clement lund», «Ñanco» → «nanco»."""
    s = unicodedata.normalize("NFKD", texto)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[’'`´]", "", s)
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())


def _tokens(texto):
    return [t for t in _plano(texto).split() if t not in _PARTICULAS]


def _sin_titulos(t):
    i = 0
    while i < len(t) and t[i] in _TITULOS:
        i += 1
    return t[i:]


def _que_camara(camara):
    if not isinstance(camara, str):
        return None
    s = _plano(camara)
    if "senad" in s or "alta" in s.split():
        return "senado"
    if "diput" in s or "camara" in s:
        return "camara"
    return None


# ------------------------------------------------------------------ cruce
def _lecturas(nombre):
    """Formas posibles de leer el texto: [(apellidos, nombres, forma)].
    «A1 A2, N» es inequívoco; sin coma se prueban todos los cortes «A1 A2 N…» y «N… A1 A2»."""
    texto = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", nombre)
    if "," in texto:
        ap, no = texto.split(",", 1)
        A, N = _sin_titulos(_tokens(ap)), _sin_titulos(_tokens(no))
        return [(tuple(A), tuple(N), "coma")] if A and len(A) + len(N) <= _MAX_PALABRAS else []
    T = _sin_titulos(_tokens(texto))
    if not T or len(T) > _MAX_PALABRAS:
        return []
    out = []
    for i in range(1, len(T) + 1):
        out.append((tuple(T[:i]), tuple(T[i:]), "apellidos_primero"))
        if i < len(T):
            out.append((tuple(T[i:]), tuple(T[:i]), "nombre_primero"))
    return out


def _igual(x, y):
    """Palabra escrita x contra palabra del padrón y: igual, o x es la inicial de y («J.» ~ «José»)."""
    return x == y or (len(x) == 1 and y.startswith(x))


def _subsecuencia(a, b):
    it = iter(b)
    return all(any(_igual(x, y) for y in it) for x in a)


def _calza_apellidos(A, S):
    """Lo escrito empieza como los apellidos del padrón: «Achurra», «Achurra Díaz» o «Araya G.» (materno en inicial)."""
    n = len(A)
    if not n or n > len(S):
        return False
    return A == S[:n] or (n >= 2 and len(A[-1]) == 1 and A[:-1] == S[:n - 1] and S[n - 1].startswith(A[-1]))


def _calza_nombres(N, G, holgura):
    """Nombres de pila escritos (N) contra los del padrón (G): «Juan Carlos», «Juan», «J. Carlos»…
    Con holgura, además acepta que lo escrito traiga UN nombre más que el padrón («María Loreto» vs «Loreto»)."""
    return _subsecuencia(N, G) or (holgura and len(N) == len(G) + 1 and _subsecuencia(G, N))


def _calza(A, N, forma, p):
    """Nivel 1 (exacto): apellidos del padrón + nombres de pila que están en el padrón."""
    if not _calza_apellidos(A, p["S"]):
        return False
    if not N:   # sin nombre de pila se exigen los dos apellidos completos; un apellido suelto nunca basta
        return A == p["S"] and len(p["S"]) >= 2
    return _calza_nombres(N, p["G"], holgura=False)


def _calza_con_nombre_extra(A, N, forma, p):
    """Nivel 2: lo escrito trae un nombre de pila más que el padrón («María Loreto» vs «Loreto»).
    Sin coma y con apellidos incompletos no se permite: esa palabra extra podría ser el apellido materno."""
    if not N or not _calza_apellidos(A, p["S"]) or (forma == "apellidos_primero" and A != p["S"]):
        return False
    return _calza_nombres(N, p["G"], holgura=True)


def _una_letra(a, b):
    """True si a y b difieren en exactamente una letra (cambio, sobra o falta): «Irarrázabal» ~ «Irarrázaval»."""
    if a == b or abs(len(a) - len(b)) > 1:
        return False
    if len(a) > len(b):
        a, b = b, a
    i = 0
    while i < len(a) and a[i] == b[i]:
        i += 1
    return a[i + (len(a) == len(b)):] == b[i + 1:]


def _calza_con_error(A, N, forma, p):
    """Nivel 3: un apellido con UNA letra distinta (palabras de 4+ letras: «Irarrázaval» ~ «Irarrázabal»)
    y nombres de pila exactos."""
    S = p["S"]
    if not N or not A or len(A) > len(S):
        return False
    difs = [(A[i], S[i]) for i in range(len(A)) if A[i] != S[i]]   # len(A) <= len(S), comprobado arriba
    if len(difs) != 1 or min(len(difs[0][0]), len(difs[0][1])) < 4 or not _una_letra(*difs[0]):
        return False
    return _calza_nombres(N, p["G"], holgura=False)


_NIVELES = (_calza, _calza_con_nombre_extra, _calza_con_error)


def _candidatos(nombre, camara):
    """Personas que calzan en el primer nivel (de más a menos estricto) donde alguien calza.
    Si en ese nivel calzan dos o más, el resultado es ambiguo y quien llama no asigna nada."""
    if not isinstance(nombre, str) or not nombre.strip() or len(nombre) > _MAX_LARGO:
        return []
    cam = _que_camara(camara)
    grupo = [p for p in _personas() if cam is None or p["camara"] == cam]
    lect = _lecturas(nombre)
    for regla in _NIVELES:
        hallados = {id(p): p for A, N, forma in lect for p in grupo if regla(A, N, forma, p)}
        if hallados:
            return list(hallados.values())
    return []


def buscar(nombre, camara=None):
    """Ficha del padrón (copia, con la clave «camara») si el nombre calza con UNA sola persona; si no, None.
    `camara`: «Cámara de Diputados», «Senado»… (otro valor o None = busca en ambas)."""
    try:
        c = _candidatos(nombre, camara)
        if len(c) != 1:
            return None
        f = dict(c[0]["fila"])
        f["camara"] = "Senado" if c[0]["camara"] == "senado" else "Cámara de Diputadas y Diputados"
        return f
    except Exception:   # noqa: BLE001
        return None


def partido_de(nombre, camara=None):
    """(sigla, nombre completo) del partido del parlamentario, o (None, None) si no está o el cruce es ambiguo."""
    try:
        f = buscar(nombre, camara)
        if not f or not isinstance(f.get("partido"), str):
            return (None, None)
        cod = f["partido"]
        return (cod, nombre_partido(cod) or cod)   # sigla sin nombre verificado: se deja la sigla
    except Exception:   # noqa: BLE001
        return (None, None)


def nombre_partido(codigo):
    """Nombre completo de una sigla del padrón («PREP» → «Partido Republicano»). Acepta minúsculas y puntos
    («u.d.i.») y las etiquetas del Senado («P.D.C.», «Evópoli», «Republicano»). Si no la conoce: None."""
    try:
        if not isinstance(codigo, str) or not codigo.strip():
            return None
        datos = cargar()
        partidos = datos.get("partidos") if isinstance(datos.get("partidos"), dict) else {}
        partidos = {k: v for k, v in partidos.items() if isinstance(k, str) and isinstance(v, str)}
        c = codigo.strip()
        if c in partidos:
            return partidos[c]
        junto = _plano(c).replace(" ", "")
        if not junto:
            return None
        for k, v in partidos.items():
            if _plano(k).replace(" ", "") == junto:
                return v
        etiquetas = datos.get("etiquetas_senado") if isinstance(datos.get("etiquetas_senado"), dict) else {}
        for k, v in etiquetas.items():
            if isinstance(k, str) and _plano(k).replace(" ", "") == junto and v in partidos:
                return partidos[v]
        for v in partidos.values():
            if _plano(v) == _plano(c):
                return v
        return None
    except Exception:   # noqa: BLE001
        return None
