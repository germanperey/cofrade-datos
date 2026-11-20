#!/usr/bin/env python3
# © 2026 Cofrade News. Software propietario: todos los derechos reservados (Ley 17.336, Chile). Prohibida su copia, adaptación o recreación, total o parcial, con o sin IA, sin autorización escrita del titular (Germán, dueño de Cofrade News, y quienes él autorice pueden modificarlo). Ver LICENSE.md.
"""Cómo votan las bancadas (ajuste 32, 28-10-2026).

Germán pidió sumar al Congreso lo mejor de las plataformas de seguimiento legislativo (Voto Visible, Cómo Votan, Monitor del
CEP, Faro UDD…): unidad de cada bancada, quiénes votan distinto a su partido y participación en las votaciones. Esas
plataformas no tienen API y su contenido es suyo: aquí NO se copia nada de ellas. Se calcula con los datos OFICIALES que el
diario ya tiene (el voto de cada parlamentario que publican la Cámara y el Senado y el padrón verificado), con métodos públicos:

  · Unidad de la bancada: en cada votación, qué parte de los integrantes del partido votó igual que la mayoría de su partido
    (100 % = todos votaron igual). Se promedia en las votaciones del período con al menos 3 integrantes votando.
  · Votos distintos a su bancada: cuántas veces un parlamentario votó distinto a la mayoría de su partido.
  · Participación: en qué parte de las votaciones con registro nominal del período figura votando (sí, no, abstención o pareo).
    No figurar puede ser ausencia, permiso, comisión o no votar: el diario no lo distingue y lo dice.
"""
import datetime as dt
import html
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
try:
    import parlamentarios as PL
except Exception:   # noqa: BLE001
    PL = None

MIN_VOTACIONES = 3          # menos que esto no alcanza para un análisis (se omite el bloque)
MIN_INTEGRANTES = 3         # integrantes del partido votando en una votación para medir su unidad
SIN = ("Sin partido informado", "", None)


def e(x):
    return html.escape(str(x if x is not None else ""), quote=True)


def _independiente(partido):
    import re
    return bool(re.match(r"^\s*(independientes?|ind\.?)\s*$", str(partido or ""), re.I))   # «Unión Demócrata Independiente» es un partido


def _clave_persona(nombre, camara):
    """Identidad estable del parlamentario: su fila del padrón; si no está, su nombre."""
    try:
        f = PL.buscar(nombre, "senado" if camara == "s" else "camara") if PL else None
    except Exception:   # noqa: BLE001
        f = None
    if f:
        return ("p", f.get("apellidos"), f.get("nombres")), f"{f.get('nombres')} {f.get('apellidos')}"
    return ("n", nombre), nombre


def padron(camara):
    """[(clave, nombre visible, partido)] de los integrantes vigentes de una cámara según el padrón verificado."""
    if not PL:
        return []
    try:
        datos = PL.cargar()
    except Exception:   # noqa: BLE001
        return []
    out = []
    for f in datos.get("senado" if camara == "s" else "camara") or []:
        if isinstance(f, dict) and f.get("nombres") and f.get("apellidos"):
            cod = f.get("partido")
            nom = (PL.nombre_partido(cod) if PL else None) or cod or SIN[0]
            out.append((("p", f.get("apellidos"), f.get("nombres")), f"{f['nombres']} {f['apellidos']}", nom))
    return out


def analizar(votaciones, camara="c", asistencia=None):
    """votaciones: [{nominal: [{nombre, partido, voto}]}] (ya limpias, con el partido del padrón). asistencia: resumen oficial de la
    Cámara (Paso 1b) o None. → dict o None."""
    vs = [v for v in votaciones or [] if isinstance(v, dict) and v.get("nominal") and v.get("nominal_completa", True)]
    if len(vs) < MIN_VOTACIONES:
        return None
    unidad, personas, opciones, posiciones = {}, {}, {}, {}
    for iv, v in enumerate(vs):
        por = {}
        for x in v["nominal"]:
            if x.get("partido") in SIN or _independiente(x.get("partido")):   # los independientes no son una bancada: no se mide su «unidad»
                continue
            por.setdefault(x["partido"], []).append(x)
        for x in v["nominal"]:
            k, vis = _clave_persona(x["nombre"], camara)
            p = personas.setdefault(k, {"nombre": vis, "partido": x.get("partido"), "votadas": 0, "distintas": 0, "medibles": 0})
            p["votadas"] += 1
            p["abst"] = p.get("abst", 0) + (1 if x.get("voto") == "Abstención" else 0)
            if x.get("partido") not in SIN:
                p["partido"] = x["partido"]
                o = opciones.setdefault(x["partido"], {"Sí": 0, "No": 0, "Abstención": 0})
                if x.get("voto") in o:
                    o[x["voto"]] += 1
        for partido, xs in por.items():
            votos = [x["voto"] for x in xs if x["voto"] in ("Sí", "No", "Abstención")]
            if len(votos) < MIN_INTEGRANTES:
                continue
            cuenta = {o: votos.count(o) for o in set(votos)}
            mayor = max(cuenta.values())
            if list(cuenta.values()).count(mayor) > 1:   # empate: no hay una «posición de la bancada»
                continue
            mayoria = max(cuenta, key=cuenta.get)
            unidad.setdefault(partido, []).append(mayor / len(votos))
            posiciones.setdefault(partido, {})[iv] = mayoria
            for x in xs:
                if x["voto"] not in ("Sí", "No", "Abstención"):
                    continue
                k, _ = _clave_persona(x["nombre"], camara)
                personas[k]["medibles"] += 1
                if x["voto"] != mayoria:
                    personas[k]["distintas"] += 1
    n = len(vs)
    pad = padron(camara)
    total_partido = {}
    for k, vis, part in pad:
        total_partido.setdefault(part, []).append(personas.get(k, {}).get("votadas", 0) / n)
        personas.setdefault(k, {"nombre": vis, "partido": part, "votadas": 0, "distintas": 0, "medibles": 0})
    partidos = sorted(({"partido": pt, "unidad": round(100 * sum(u) / len(u), 1), "votaciones": len(u)}
                       for pt, u in unidad.items() if len(u) >= 2), key=lambda x: (-x["unidad"], x["partido"]))
    discolos = sorted(({"nombre": p["nombre"], "partido": p["partido"], "distintas": p["distintas"], "de": p["medibles"]}
                       for p in personas.values() if p["distintas"] > 0), key=lambda x: (-x["distintas"], -x["de"], x["nombre"]))[:8]
    part_partidos = sorted(({"partido": pt, "pct": round(100 * sum(v) / len(v), 1), "integrantes": len(v)}
                            for pt, v in total_partido.items() if pt not in SIN), key=lambda x: (-x["pct"], x["partido"]))
    en_padron = [personas[k] for k, _, _ in pad]
    baja = sorted(({"nombre": p["nombre"], "partido": p["partido"], "votadas": p["votadas"], "de": n,
                    "pct": round(100 * p["votadas"] / n)} for p in en_padron), key=lambda x: (x["pct"], x["nombre"]))[:8]
    prom = round(100 * sum(p["votadas"] for p in en_padron) / (n * len(en_padron)), 1) if en_padron else None
    # 29-10-2026 (Germán: «agrega más gráficos y métricas»)
    escanos, miembros = {}, {}
    for k, vis, part in pad:
        escanos[part] = escanos.get(part, 0) + 1
        miembros.setdefault(part, []).append((str(k[1] if isinstance(k, tuple) and len(k) > 1 else vis), vis))
    # 30-10-2026 (Germán): al tocar un color de la barra, la lista de parlamentarios de ese partido (ordenada por apellido)
    composicion = sorted(({"partido": pt, "escanos": c, "miembros": [v for _, v in sorted(miembros[pt])]} for pt, c in escanos.items()),
                         key=lambda x: (-x["escanos"], x["partido"]))
    como_vota = []
    for pt, o in opciones.items():
        t = sum(o.values())
        if t >= 5 and not _independiente(pt):
            como_vota.append({"partido": pt, "si": round(100 * o["Sí"] / t, 1), "no": round(100 * o["No"] / t, 1),
                              "abst": round(100 * o["Abstención"] / t, 1), "votos": t})
    como_vota.sort(key=lambda x: (-x["si"], x["partido"]))
    mayores = [c["partido"] for c in composicion if c["partido"] in posiciones and not _independiente(c["partido"])][:8]
    afinidad = []
    for pa in mayores:
        fila = []
        for pb in mayores:
            comunes = [i for i in posiciones[pa] if i in posiciones[pb]]
            fila.append(round(100 * sum(posiciones[pa][i] == posiciones[pb][i] for i in comunes) / len(comunes)) if len(comunes) >= 3 else None)
        afinidad.append(fila)
    abstienen = sorted(({"nombre": p["nombre"], "partido": p["partido"], "abst": p.get("abst", 0), "de": p["votadas"]}
                        for p in personas.values() if p.get("abst")), key=lambda x: (-x["abst"], x["nombre"]))[:6]
    asis = _asistencia(asistencia, camara, pad) if asistencia else None
    return {"votaciones": n, "partidos": partidos, "discolos": discolos, "participacion": part_partidos,
            "baja_participacion": [b for b in baja if b["pct"] < 100], "participacion_promedio": prom, "integrantes": len(en_padron),
            "composicion": composicion, "como_vota": como_vota, "afinidad": {"partidos": mayores, "matriz": afinidad},
            "abstenciones": abstienen, "asistencia": asis}


def _asistencia(asis, camara, pad):
    """Asistencia OFICIAL a las sesiones de Sala (Cámara, datos abiertos): por partido y los de menor asistencia."""
    if camara != "c" or not isinstance(asis, dict) or not asis.get("diputados"):
        return None
    partido = {k: part for k, _, part in pad}
    nombre = {k: vis for k, vis, _ in pad}
    por, filas = {}, []
    for d in asis["diputados"]:
        if not isinstance(d, dict):
            continue
        k, vis = _clave_persona(d.get("nombre"), camara)
        tot = (d.get("asiste") or 0) + (d.get("justificada") or 0) + (d.get("no_justificada") or 0)
        if not tot:
            continue
        pt = partido.get(k, SIN[0])
        r = {"nombre": nombre.get(k, vis), "partido": pt, "asiste": d.get("asiste") or 0, "justificada": d.get("justificada") or 0,
             "no_justificada": d.get("no_justificada") or 0, "de": tot, "pct": round(100 * (d.get("asiste") or 0) / tot)}
        filas.append(r)
        if pt not in SIN and not _independiente(pt):   # los independientes no son bancada (misma regla que la unidad)
            por.setdefault(pt, []).append(r["asiste"] / tot)
    if not filas:
        return None
    partidos = sorted(({"partido": pt, "pct": round(100 * sum(v) / len(v), 1)} for pt, v in por.items()), key=lambda x: (-x["pct"], x["partido"]))
    return {"sesiones": asis.get("sesiones"), "desde": asis.get("desde"), "hasta": asis.get("hasta"), "partidos": partidos,
            "menor": sorted(filas, key=lambda x: (x["pct"], -x["no_justificada"], x["nombre"]))[:6],
            "promedio": round(sum(r["pct"] for r in filas) / len(filas), 1)}


def _barra(etq, valor, maximo=100, sufijo="%", titulo="", extra=""):
    ancho = max(0.0, min(100.0, 100.0 * float(valor) / float(maximo or 1)))
    return (f'<div class="cga-fila" title="{e(titulo or etq)}"><span class="cga-etq">{e(etq)}</span>'
            f'<span class="cga-pista"><span class="cga-barra" style="width:{ancho:.1f}%"></span></span>'
            f'<span class="cga-val">{e(f"{valor:g}".replace(".", ","))}{e(sufijo)}{extra}</span></div>')


def html_analisis(a, nombre_camara, corto=None):
    """Bloque «Cómo votan las bancadas»: tres tarjetas con barras (HTML y CSS, se imprime igual en el PDF)."""
    if not a:
        return ""
    corto = corto or (lambda x: x)
    n = a["votaciones"]
    t1 = "".join(_barra(corto(p["partido"]), p["unidad"], titulo=f"{p['partido']}: {str(p['unidad']).replace('.', ',')} % de unidad promedio en {p['votaciones']} votaciones")
                 for p in a["partidos"][:12])
    t2 = "".join(_barra(f"{d['nombre']} · {corto(d['partido'])}", d["distintas"], maximo=max(x["distintas"] for x in a["discolos"]), sufijo="",
                        titulo=f"{d['nombre']} ({d['partido']}): votó distinto a la mayoría de su bancada en {d['distintas']} de {d['de']} votaciones",
                        extra=f' <small>de {d["de"]}</small>') for d in a["discolos"])
    t3 = "".join(_barra(corto(p["partido"]), p["pct"], titulo=f"{p['partido']}: figura votando en el {str(p['pct']).replace('.', ',')} % de las votaciones ({p['integrantes']} integrantes)")
                 for p in a["participacion"][:12])
    baja = "".join(f'<li>{e(b["nombre"])} <span>({e(corto(b["partido"]))})</span>: {b["votadas"]} de {b["de"]}</li>' for b in a["baja_participacion"][:6])
    prom = f'{str(a["participacion_promedio"]).replace(".", ",")} %' if a.get("participacion_promedio") is not None else ""
    return (f'<div class="cga"><h4 class="cga-tit">Cómo votan las bancadas · {e(nombre_camara)}</h4>'
            f'<p class="sub">Calculado por Cofrade News con el voto de cada parlamentario en las {n} votaciones del período que tienen registro '
            'nominal oficial. Toca o pasa el cursor sobre una barra para ver el detalle.</p><div class="cga-grid">'
            + (f'<div class="cga-card"><p class="cga-sub"><b>Unidad de cada bancada</b></p><p class="cga-ayuda">Qué parte de sus integrantes votó igual '
               f'que la mayoría de su partido (100 % = todos igual), en promedio.</p>{t1}</div>' if t1 else "")
            + (f'<div class="cga-card cga-nombres"><p class="cga-sub"><b>Votan distinto a su bancada</b></p><p class="cga-ayuda">Veces que votó distinto a la mayoría '
               f'de su partido en el período.</p>{t2}</div>' if t2 else "")
            + (f'<div class="cga-card"><p class="cga-sub"><b>Participación en las votaciones</b>{" · promedio " + prom if prom else ""}</p>'
               '<p class="cga-ayuda">Parte de las votaciones en que sus integrantes figuran votando (sí, no, abstención o pareo).</p>'
               f'{t3}' + (f'<p class="cga-ayuda"><b>Menor participación:</b></p><ul class="cga-lista">{baja}</ul>' if baja else "")
               + '<p class="cga-nota">No figurar en una votación puede deberse a ausencia, permiso, trabajo en comisión o a no votar: el registro '
               'oficial no lo distingue.</p></div>' if t3 else "")
            + '</div>' + _mas_metricas(a, corto) + '</div>')


PALETA = ("#0B1F3A", "#B8892B", "#1E7B4F", "#B3261E", "#2F6EA5", "#8E5B9F", "#C0552B", "#4A8C7A", "#D9AE52", "#6B7F99", "#A8A29E")
TOPE_COMPOSICION = len(PALETA)   # el último color (gris) es «Otros»


def _pct(x):
    return f"{x:g}".replace(".", ",") + " %"


def _fecha_corta(x):
    try:
        d = dt.date.fromisoformat(str(x)[:10])
    except (TypeError, ValueError):
        return ""
    return f"{d.day}-{d.month:02d}"


def _rango(asis):
    d, h = _fecha_corta(asis.get("desde")), _fecha_corta(asis.get("hasta"))
    return f" (del {d} al {h})" if d and h else ""


def _mas_metricas(a, corto):
    """29-10-2026 (Germán: «agrega más gráficos y métricas de los Diputados y Senadores»): composición, cómo vota cada bancada,
    afinidad entre bancadas, asistencia oficial a la Sala y quiénes más se abstienen."""
    out = []
    comp = list(a.get("composicion") or [])
    total = sum(c["escanos"] for c in comp)
    if len(comp) > TOPE_COMPOSICION:   # 29-10: colores que no se repiten; los partidos chicos van juntos en «Otros»
        resto = comp[TOPE_COMPOSICION - 1:]
        comp = comp[:TOPE_COMPOSICION - 1] + [{"partido": "Otros", "escanos": sum(c["escanos"] for c in resto),
                                               "detalle": ", ".join(f'{c["partido"]} {c["escanos"]}' for c in resto),
                                               "grupos": [[c["partido"], c.get("miembros") or []] for c in resto]}]
    if total:
        grupos = [{"t": c["partido"], "n": c["escanos"], "c": PALETA[i % len(PALETA)],
                   "g": c.get("grupos") or [[c["partido"], c.get("miembros") or []]]} for i, c in enumerate(comp)]
        segs = "".join(f'<button type="button" class="cgm-seg" data-k="{i}" style="width:{100 * c["escanos"] / total:.2f}%;background:{PALETA[i % len(PALETA)]}" '
                       f'aria-label="{e(c["partido"])}: {c["escanos"]} de {total}. Ver sus integrantes" '
                       f'title="{e(c["partido"])}: {c["escanos"]} de {total}{(" · " + e(c["detalle"])) if c.get("detalle") else ""}"></button>' for i, c in enumerate(comp))
        ley = "".join(f'<li><button type="button" class="cgm-lb" data-k="{i}" title="Ver los integrantes de {e(c["partido"])}"><i style="background:{PALETA[i % len(PALETA)]}"></i>'
                      f'{e(corto(c["partido"]))} <b>{c["escanos"]}</b></button></li>' for i, c in enumerate(comp))
        datos = e(json.dumps(grupos, ensure_ascii=False, separators=(",", ":")))
        out.append(f'<div class="cga-card cgm-ancha cgm-comp" data-miembros="{datos}"><p class="cga-sub"><b>Composición</b> · {total} integrantes</p>'
                   '<p class="cga-ayuda">Escaños de cada partido según el padrón oficial vigente. Toca un color para ver sus integrantes.</p>'
                   f'<div class="cgm-barra" role="group" aria-label="Composición por partido">{segs}</div><ul class="cgm-ley">{ley}</ul>'
                   + "".join(f'<p class="cga-nota">Otros: {e(c["detalle"])}.</p>' for c in comp if c.get("detalle")) + '</div>')
    cv = a.get("como_vota") or []
    if cv:
        filas = "".join(
            f'<div class="cga-fila cgm-fila" title="{e(x["partido"])}: Sí {_pct(x["si"])} · No {_pct(x["no"])} · Abstención {_pct(x["abst"])} ({x["votos"]} votos)">'
            f'<span class="cga-etq">{e(corto(x["partido"]))}</span><span class="cgm-pila">'
            f'<span class="cgm-si" style="width:{x["si"]}%"></span><span class="cgm-no" style="width:{x["no"]}%"></span><span class="cgm-ab" style="width:{x["abst"]}%"></span>'
            f'</span><span class="cga-val">{_pct(x["si"])}</span></div>' for x in cv[:12])
        out.append('<div class="cga-card"><p class="cga-sub"><b>Cómo vota cada bancada</b></p>'
                   '<p class="cga-ayuda">De todos los votos de sus integrantes en el período: <span class="cgm-k si">Sí</span> '
                   '<span class="cgm-k no">No</span> <span class="cgm-k ab">Abstención</span>. La cifra es el % de votos a favor.</p>' + filas + '</div>')
    af = a.get("afinidad") or {}
    P, M = af.get("partidos") or [], af.get("matriz") or []
    # 29-10: fuera las bancadas sin votaciones en común con ninguna otra (en el Senado quedaban filas enteras de «·»)
    vivos = [i for i in range(len(P)) if any(j != i and v is not None for j, v in enumerate(M[i] if i < len(M) else []))]
    P, M = [P[i] for i in vivos], [[M[i][j] for j in vivos] for i in vivos]
    if len(P) >= 3:
        cab = "".join(f'<th title="{e(p)}"><span>{e(corto(p))}</span></th>' for p in P)
        cuerpo = ""
        for p, fila in zip(P, M):
            celdas = "".join((f'<td style="background:rgba(184,137,43,{0.08 + 0.72 * v / 100:.2f})" title="{e(p)} y {e(q)} votaron igual en el {v} % de las votaciones">{v}</td>'
                              if v is not None else '<td class="cgm-nd" title="Pocas votaciones en común">·</td>') for q, v in zip(P, fila))
            cuerpo += f'<tr><th title="{e(p)}">{e(corto(p))}</th>{celdas}</tr>'
        out.append('<div class="cga-card cgm-ancha"><p class="cga-sub"><b>Afinidad entre bancadas</b></p>'
                   '<p class="cga-ayuda">% de las votaciones en que la mayoría de un partido votó igual que la mayoría del otro. Más dorado = más afinidad.<span class="cgm-desliza"> Desliza la tabla hacia el lado para ver todas las bancadas.</span></p>'
                   f'<div class="tabla cgm-tabla"><table><thead><tr><th></th>{cab}</tr></thead><tbody>{cuerpo}</tbody></table></div></div>')
    asis = a.get("asistencia")
    if asis:
        barras = "".join(_barra(corto(p["partido"]), p["pct"], titulo=f"{p['partido']}: asistió en promedio al {_pct(p['pct'])} de las sesiones")
                         for p in asis["partidos"][:12])
        menor = "".join(f'<li>{e(r["nombre"])} <span>({e(corto(r["partido"]))})</span>: {r["asiste"]} de {r["de"]}'
                        + (f' · {r["justificada"]} justificada{"s" if r["justificada"] != 1 else ""}' if r["justificada"] else "") + '</li>' for r in asis["menor"])
        out.append(f'<div class="cga-card"><p class="cga-sub"><b>Asistencia a la Sala</b> · promedio {_pct(asis["promedio"])}</p>'
                   f'<p class="cga-ayuda">Registro oficial de asistencia a {asis["sesiones"]} sesiones de Sala{_rango(asis)}.</p>'
                   f'{barras}' + (f'<p class="cga-ayuda"><b>Menor asistencia:</b></p><ul class="cga-lista">{menor}</ul>' if menor else '') +
                   '<p class="cga-nota">Una inasistencia justificada incluye permisos, licencias y comisiones oficiales.</p></div>')
    ab = a.get("abstenciones") or []
    if ab:
        out.append('<div class="cga-card"><p class="cga-sub"><b>Quiénes más se abstienen</b></p><p class="cga-ayuda">Abstenciones en las votaciones del período.</p>'
                   '<ul class="cga-lista">' + "".join(f'<li>{e(x["nombre"])} <span>({e(corto(x["partido"]))})</span>: {x["abst"]} de {x["de"]}</li>' for x in ab)
                   + '</ul></div>')
    out.sort(key=lambda h: 'cgm-ancha' not in h)   # las anchas arriba: en pantalla grande las angostas quedan lado a lado
    return f'<div class="cga-grid cgm">{"".join(out)}</div>' if out else ""


CSS = """
.cga{margin:16px 0 8px}.cga-tit{font:700 19px var(--serif);margin:6px 0 2px}
.cga-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:8px}
.cga-card{background:var(--card);border:1px solid var(--linea);border-top:3px solid var(--oro);border-radius:8px;padding:12px 14px;break-inside:avoid;page-break-inside:avoid}
.cga-sub{margin:0 0 2px;font-size:15px}.cga-ayuda{margin:0 0 8px;font-size:13px;color:var(--gris);line-height:1.4}
.cga-fila{display:grid;grid-template-columns:minmax(0,46%) 1fr auto;align-items:center;gap:8px;padding:3px 4px;border-radius:6px;font-size:13.5px;transition:background-color .2s ease}
.cga-fila:hover{background:rgba(184,137,43,.14)}.cga-fila:hover .cga-barra{background:var(--oro)}
.cga-etq{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cga-pista{height:10px;background:var(--linea);border-radius:5px;overflow:hidden}
.cga-barra{display:block;height:100%;background:var(--tinta);border-radius:5px;transition:background-color .2s ease}
.cga-val{font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}.cga-val small{font-weight:400;color:var(--gris)}
.cga-nombres .cga-fila{grid-template-columns:minmax(0,62%) 1fr auto}.cga-nombres .cga-etq{white-space:normal;line-height:1.25}
.cga-lista{margin:0 0 6px;padding-left:18px;font-size:13.5px}.cga-lista span{color:var(--gris)}.cga-nota{font-size:12px;color:var(--gris);margin:8px 0 0}
.cgm{margin-top:12px}.cgm-ancha{grid-column:1/-1}
.cgm-barra{display:flex;height:22px;border-radius:6px;overflow:hidden;margin:6px 0 10px}.cgm-seg{display:block;height:100%;transition:filter .2s ease}
.cgm-seg{all:unset;box-sizing:border-box;cursor:pointer}.cgm-barra .cgm-seg{display:block;height:100%}
.cgm-seg:hover,.cgm-seg:focus-visible,.cgm-seg[aria-expanded=true]{filter:brightness(1.25) saturate(1.2);outline:2px solid var(--oro);outline-offset:-2px}
.cgm-lb{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:2px 6px;border-radius:6px}
.cgm-lb:hover,.cgm-lb:focus-visible{background:rgba(184,137,43,.14);outline:none}.cgm-lb i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:1px}
.cgm-pop{position:fixed;z-index:2147483000;width:min(340px,calc(100vw - 24px));max-height:min(70vh,520px);display:flex;flex-direction:column;background:var(--card,#fff);
 color:var(--tinta);border:1.5px solid var(--oro);border-radius:12px;box-shadow:0 14px 40px rgba(11,31,58,.28)}
.cgm-pop[hidden]{display:none}.cgm-pop-cab{display:flex;align-items:center;gap:10px;padding:12px 12px 8px 14px;border-bottom:1px solid var(--linea)}
.cgm-pop-cab i{flex:0 0 14px;height:14px;border-radius:3px}.cgm-pop-cab b{flex:1;font-size:15px;line-height:1.25}
.cgm-pop-x{all:unset;box-sizing:border-box;cursor:pointer;width:40px;height:40px;display:grid;place-items:center;border-radius:50%;font:700 20px/1 var(--sans)}
.cgm-pop-x:hover,.cgm-pop-x:focus-visible{background:rgba(184,137,43,.18)}
.cgm-pop-cu{overflow:auto;padding:6px 14px 12px;overscroll-behavior:contain}.cgm-pop-cu p{margin:10px 0 2px;font-size:12.5px;color:var(--gris);font-weight:700}
.cgm-pop-cu ol{margin:4px 0;padding-left:22px;font-size:14px;line-height:1.45}
@media (max-width:600px){.cgm-pop{left:12px!important;right:12px;top:auto!important;bottom:12px;width:auto}}
@media print{.cgm-pop{display:none!important}}
.cgm-ley{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px}.cgm-ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.cgm-pila{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--linea)}.cgm-si{background:#1E7B4F}.cgm-no{background:#B3261E}.cgm-ab{background:#A8A29E}
.cgm-fila:hover .cgm-pila{box-shadow:0 0 0 2px var(--oro)}
.cgm-k{display:inline-block;padding:0 6px;border-radius:4px;color:#fff;font-size:12px;font-weight:700}.cgm-k.si{background:#1E7B4F}.cgm-k.no{background:#B3261E}.cgm-k.ab{background:#8A8580}
.cgm-tabla table{border-collapse:collapse;font-size:12.5px;width:100%}.cgm-tabla th,.cgm-tabla td{padding:5px 6px;text-align:center;border:1px solid var(--linea)}
.cgm-tabla tbody th{text-align:left;white-space:nowrap}.cgm-tabla thead th span{display:inline-block;max-width:9ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
.cgm-tabla td{font-variant-numeric:tabular-nums;font-weight:700}.cgm-tabla td:hover{outline:2px solid var(--oro);outline-offset:-2px}.cgm-nd{color:var(--gris);font-weight:400}
@media print{body *{font-variant-numeric:normal!important;font-feature-settings:normal!important}}
.cgm-desliza{display:none}@media (max-width:640px){.cgm-desliza{display:inline}}@media print{.cgm-desliza{display:none}}
.cg-tog{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 10px;width:100%;margin:16px 0 6px;
 padding:12px 18px;min-height:48px;border:1.5px solid var(--oro);border-radius:999px;background:rgba(184,137,43,.08);font:700 15.5px var(--sans);color:var(--tinta);
 transition:background-color .2s ease,box-shadow .2s ease}
.cg-tog:hover{background:rgba(184,137,43,.18);box-shadow:0 2px 10px rgba(11,31,58,.12)}.cg-tog:focus-visible{outline:2px solid var(--oro);outline-offset:3px}
.cg-tog .lt-ico{width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .25s ease}
.cg-tog[aria-expanded=true] .lt-ico{transform:rotate(45deg)}.cg-tog .lt-res{font-weight:500;font-size:13.5px;color:var(--gris)}
@media screen{.cg-det{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows .35s ease,opacity .3s ease,visibility 0s}
 .cg-det-in{min-height:0;overflow:hidden}
 .cg-det.cerrada{grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows .35s ease,opacity .25s ease,visibility 0s linear .35s}}
@media (prefers-reduced-motion:reduce){.cg-det,.cg-tog,.cg-tog .lt-ico,.cga-fila,.cga-barra{transition:none}}
@media print{.cg-tog{display:none!important}.cg-det,.cg-det-in{display:block!important;overflow:visible!important}}
"""

JS = r"""
// 30-10-2026 (Germán) · «Composición»: al tocar un color de la barra (o de la leyenda) se abre una ventana con los integrantes del partido
(function(){const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 let pop=null,origen=null;
 const cerrar=()=>{if(!pop||pop.hidden)return;pop.hidden=true;if(origen){origen.setAttribute('aria-expanded','false');try{origen.focus({preventScroll:true})}catch(e){}}origen=null};
 const abrir=(btn)=>{const card=btn.closest('.cgm-comp');if(!card)return;let G;try{G=JSON.parse(card.dataset.miembros||'[]')}catch(e){return}
  const g=G[+btn.dataset.k];if(!g)return;
  if(!pop){pop=document.createElement('div');pop.className='cgm-pop';pop.setAttribute('role','dialog');pop.hidden=true;document.body.appendChild(pop);
   pop.addEventListener('click',ev=>{if(ev.target.closest('.cgm-pop-x'))cerrar()});}
  if(origen)origen.setAttribute('aria-expanded','false');origen=btn;btn.setAttribute('aria-expanded','true');
  const varios=g.g.length>1;
  pop.setAttribute('aria-label',g.t+': '+g.n+' integrantes');
  pop.innerHTML='<div class="cgm-pop-cab"><i style="background:'+esc(g.c)+'"></i><b>'+esc(g.t)+' · '+g.n+(g.n===1?' integrante':' integrantes')+'</b>'+
   '<button type="button" class="cgm-pop-x" aria-label="Cerrar">×</button></div><div class="cgm-pop-cu">'+
   g.g.map(x=>(varios?'<p>'+esc(x[0])+' · '+x[1].length+'</p>':'')+'<ol>'+x[1].map(n=>'<li>'+esc(n)+'</li>').join('')+'</ol>').join('')+'</div>';
  pop.hidden=false;const r=btn.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
  let x=Math.min(Math.max(12,r.left+r.width/2-w/2),innerWidth-w-12),y=r.bottom+8;if(y+h>innerHeight-12)y=Math.max(12,r.top-h-8);
  pop.style.left=x+'px';pop.style.top=y+'px';const bx=pop.querySelector('.cgm-pop-x');if(bx)bx.focus({preventScroll:true});};
 document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('.cgm-seg,.cgm-lb');
  if(b){ev.preventDefault();if(origen===b&&pop&&!pop.hidden){cerrar();return}abrir(b);return}
  if(pop&&!pop.hidden&&!ev.target.closest('.cgm-pop'))cerrar()},true);   // en captura: ningún otro botón de la página lo impide
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape')cerrar()});
 addEventListener('scroll',()=>{if(pop&&!pop.hidden&&innerWidth>600)cerrar()},{passive:true});
 window.__cgmPop={abrir,cerrar,abierto:()=>!!(pop&&!pop.hidden)};})();
// 28-10-2026 (Germán) · Congreso: botón para mostrar u ocultar TODAS las votaciones (fichas por proyecto y la tabla del mes).
// Nace cerrado en pantalla; en el PDF sale todo. Al abrir se ajustan los gráficos que quedaron dentro.
(function(){document.querySelectorAll('#cgw .cg-tog').forEach(b=>{const d=document.getElementById(b.getAttribute('aria-controls'));if(!d)return;
 const poner=abrir=>{d.classList.toggle('cerrada',!abrir);b.setAttribute('aria-expanded',String(abrir));
  const t=b.querySelector('.lt-tx');if(t)t.textContent=abrir?b.dataset.ocultar:b.dataset.ver;
  if(abrir&&window.echarts)d.querySelectorAll('.chart').forEach(c=>{const g=echarts.getInstanceByDom(c);if(g)g.resize()})};
 b.hidden=false;poner(false);b.addEventListener('click',()=>poner(d.classList.contains('cerrada')));
 window.abrirVotacionesCongreso=window.abrirVotacionesCongreso||(el=>{const x=el&&el.closest?el.closest('.cg-det.cerrada'):null;if(x){const bb=document.querySelector('[aria-controls="'+x.id+'"]');if(bb)bb.click()}});});})();
"""
