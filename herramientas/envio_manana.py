"""Envío de la mañana de Cofrade News: correo (Kit) y canal de Telegram a las 7:00 con lo que mueve la aguja hoy y el audio.

26-11-2026 · Germán, con una revisión externa: «Un envío automatizado a las 7:00 AM, con los 5 titulares clave y el link directo al
audio, transforma visitas ocasionales en hábito diario y te construye una base propia de lectores». Eligió correo con Kit y Telegram
(los dos gratis) y que el correo salga desde cofrad.es.

Cómo corre: GitHub Actions (.github/workflows/envio-manana.yml) lo lanza apenas la tarea de la edición sube la memoria del diario
(alrededor de las 6:45) y, de respaldo, a las 7:40, 8:40 y 9:40. Si llega antes de las 7:00, espera hasta las 7:00. Envía una sola vez
al día (datos/envio-manana.json) y solo la edición de HOY: nunca la de ayer. Fuera de 07:00 a 12:00 no envía.

Secretos (los crea Germán en GitHub, nunca van en el código): KIT_API_KEY (Kit → Settings → Developer → V4 API key) y
TELEGRAM_BOT_TOKEN (BotFather). Variable: TELEGRAM_CANAL (por ejemplo @CofradeNews). Sin un secreto, ese canal se salta y se dice.
Los lectores llegan a Kit desde la portada (www.cofrad.es → «Recíbelo a las 7:00»), con confirmación por correo, y quedan con la
etiqueta «cofrade-news»: el correo va solo a esa etiqueta.
"""
import datetime as dt
import html as H
import json
import os
import re
import sys
import time
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Santiago")
SITIO = "https://www.cofrad.es"
RAW_ED = "https://raw.githubusercontent.com/germanperey/cofrade-datos/ediciones/Cofrade-News-{}.html"
ETIQUETA = "cofrade-news"
REMITENTE = "hola@cofrad.es"
DESDE, HASTA = 7, 12   # ventana de envío (hora de Chile)
CHIPS_PRIORIDAD = ("Dólar", "IPSA", "Cobre", "Santiago hoy", "Sismo mayor 24 h", "Marejadas")
DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")


def _texto(s):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def extraer(ed):
    """De la edición: las balas de «Lo que mueve la aguja hoy» (o «Las 3 del día» en las ediciones viejas) y las fichas de 60 segundos."""
    m = re.search(r'<section class="tres">(.*?)</section>', ed, re.S)
    balas = [_texto(x) for x in re.findall(r"<li>(.*?)</li>", m.group(1), re.S)] if m else []
    chips = {}
    for t, v in re.findall(r'<span class="t60">(.*?)</span><span class="v60">(.*?)</span>', ed, re.S):
        chips.setdefault(_texto(t), _texto(v))
    return {"balas": [b for b in balas if b][:5], "chips": chips}


def cinco(datos):
    """Siempre 5: las balas de la edición y, si faltan, las cifras clave de «Hoy en 60 segundos» (dólar, IPSA, cobre, tiempo)."""
    out = list(datos["balas"])
    for k in CHIPS_PRIORIDAD:
        if len(out) >= 5:
            break
        if datos["chips"].get(k):
            out.append(f"{k}: {datos['chips'][k]}.")
    return out[:5]


def fecha_larga(d):
    return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]}"


def armar(d, balas):
    """Asunto, texto previo, HTML del correo y texto de Telegram. Solo con lo publicado en la edición."""
    f = d.isoformat()
    ed, voz = f"{SITIO}/edicion/{f}?utm_source=correo", f"{SITIO}/edicion/{f}?voz=1&utm_source=correo"
    asunto = f"Cofrade News · {fecha_larga(d).capitalize()}: lo que mueve la aguja hoy"
    previo = (balas[0][:120] + "…") if balas and len(balas[0]) > 120 else (balas[0] if balas else "La edición de hoy ya está publicada.")
    li = "".join(f'<li style="margin:0 0 12px;line-height:1.5">{H.escape(b)}</li>' for b in balas)
    cuerpo = (f'<p style="margin:0 0 6px;color:#8a7a52;font-size:13px;letter-spacing:.08em;text-transform:uppercase">{H.escape(fecha_larga(d).capitalize())}</p>'
              f'<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#1A1406">Lo que mueve la aguja hoy</h1>'
              f'<ol style="margin:0 0 20px;padding-left:20px;font-size:16px;color:#222">{li}</ol>'
              f'<p style="margin:0 0 12px"><a href="{ed}" style="display:inline-block;background:#C9A14A;color:#1A1406;padding:12px 18px;border-radius:999px;'
              f'text-decoration:none;font-weight:600">Leer la edición completa</a></p>'
              f'<p style="margin:0 0 20px"><a href="{voz}" style="color:#1A1406">🎧 Escuchar la edición (audio)</a></p>'
              f'<p style="margin:0;color:#777;font-size:13px">Cada cifra con su fuente y su fecha, en www.cofrad.es. Recibes este correo porque te '
              f'suscribiste en la portada de Cofrade News.</p>')
    tg = (f"<b>Cofrade News · {H.escape(fecha_larga(d).capitalize())}</b>\nLo que mueve la aguja hoy:\n\n"
          + "\n".join(f"{i}. {H.escape(b)}" for i, b in enumerate(balas, 1))
          + f'\n\n<a href="{SITIO}/edicion/{f}?utm_source=telegram">Leer la edición</a> · <a href="{SITIO}/edicion/{f}?voz=1&amp;utm_source=telegram">🎧 Escuchar</a>')
    return {"asunto": asunto, "previo": previo, "html": cuerpo, "telegram": tg}


def _kit(metodo, ruta, clave, **kw):
    import requests
    r = requests.request(metodo, "https://api.kit.com/v4" + ruta, headers={"X-Kit-Api-Key": clave, "Accept": "application/json"}, timeout=40, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"Kit {metodo} {ruta}: HTTP {r.status_code} {r.text[:200]}")
    return r.json() if r.text else {}


def enviar_kit(clave, m, ahora):
    tags = _kit("GET", "/tags?per_page=1000", clave).get("tags") or []
    t = next((x for x in tags if x.get("name") == ETIQUETA), None)
    if not t:
        return "sin lectores todavía (no existe la etiqueta cofrade-news)"
    envio = (ahora + dt.timedelta(minutes=2)).astimezone(dt.timezone.utc).isoformat(timespec="seconds")
    cuerpo = {"subject": m["asunto"], "preview_text": m["previo"], "description": "Envío de la mañana " + ahora.date().isoformat(),
              "content": m["html"], "public": False, "published_at": envio, "send_at": envio, "email_address": REMITENTE,
              "subscriber_filter": [{"all": [{"type": "tag", "ids": [t["id"]]}], "any": None, "none": None}]}
    try:
        b, nota = _kit("POST", "/broadcasts", clave, json=cuerpo).get("broadcast") or {}, ""
    except RuntimeError as ex:   # hola@cofrad.es aún no confirmado en Kit: sale con el remitente de la cuenta y se avisa
        if "422" not in str(ex):
            raise
        cuerpo.pop("email_address")
        b, nota = _kit("POST", "/broadcasts", clave, json=cuerpo).get("broadcast") or {}, " · sin remitente cofrad.es: confirma hola@cofrad.es en Kit"
    return f"programado (Kit {b.get('id')}, {b.get('status') or 'ok'}){nota}"


def enviar_telegram(token, canal, texto):
    import requests
    r = requests.post(f"https://api.telegram.org/bot{token}/sendMessage", timeout=40,
                      json={"chat_id": canal, "text": texto, "parse_mode": "HTML", "disable_web_page_preview": False})
    j = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if not j.get("ok"):
        raise RuntimeError(f"Telegram HTTP {r.status_code} {str(j.get('description') or r.text)[:160]}")
    return "publicado"


def main(argv=None):
    import requests
    estado_f = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datos", "envio-manana.json")
    ahora = dt.datetime.now(TZ)
    if ahora.hour < DESDE:   # llegó temprano: espera hasta las 7:00 (máximo 80 minutos)
        espera = (ahora.replace(hour=DESDE, minute=0, second=0, microsecond=0) - ahora).total_seconds()
        if espera > 4800:
            print("Muy temprano: no espero tanto. Lo envía la corrida de respaldo.")
            return 0
        print(f"Espero {int(espera)} s hasta las 7:00."); time.sleep(max(0, espera))
        ahora = dt.datetime.now(TZ)
    if not (DESDE <= ahora.hour < HASTA):
        print("Fuera de la ventana de 07:00 a 12:00: no envío."); return 0
    hoy = ahora.date().isoformat()
    try:
        estado = json.load(open(estado_f, encoding="utf-8"))
    except (OSError, ValueError):
        estado = {}
    hecho = estado.get(hoy) or {}
    r = requests.get(RAW_ED.format(hoy), timeout=120)
    if r.status_code != 200:
        print(f"La edición de hoy ({hoy}) todavía no está en GitHub (HTTP {r.status_code}): no envío la de ayer."); return 0
    balas = cinco(extraer(r.text))
    if len(balas) < 3:
        print("La edición no trae «Lo que mueve la aguja hoy» ni cifras: no envío un correo vacío."); return 1
    m = armar(ahora.date(), balas)
    canales = {"correo": (os.environ.get("KIT_API_KEY"), lambda: enviar_kit(os.environ["KIT_API_KEY"], m, ahora)),
               "telegram": (os.environ.get("TELEGRAM_BOT_TOKEN") and os.environ.get("TELEGRAM_CANAL"),
                            lambda: enviar_telegram(os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CANAL"], m["telegram"]))}
    for k, (listo, fn) in canales.items():
        if str(hecho.get(k, "")).startswith(("programado", "publicado")):
            print(f"{k}: ya enviado hoy ({hecho[k]})"); continue
        if not listo:
            hecho[k] = "sin configurar"; print(f"{k}: sin configurar (falta el secreto en GitHub)"); continue
        try:
            hecho[k] = fn(); print(f"{k}: {hecho[k]}")
        except Exception as ex:   # noqa: BLE001 — un canal caído no detiene al otro
            hecho[k] = f"falla: {str(ex)[:180]}"; print(f"{k}: {hecho[k]}")
    hecho["hora"] = ahora.strftime("%H:%M"); hecho["balas"] = len(balas)
    estado[hoy] = hecho
    estado = dict(sorted(estado.items())[-40:])
    json.dump(estado, open(estado_f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
