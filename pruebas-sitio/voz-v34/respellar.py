# Convierte palabras inglesas a una ortografía castellana que una voz en español lea con pronunciación inglesa aproximada
# (como la diría un chileno bilingüe), usando el diccionario de pronunciación CMU (licencia BSD).
import cmudict, re, json, unicodedata
D = cmudict.dict()
VOC = {'AA': 'a', 'AE': 'a', 'AH': 'a', 'AO': 'o', 'AW': 'au', 'AY': 'ai', 'EH': 'e', 'ER': 'er', 'EY': 'ei', 'IH': 'i', 'IY': 'i', 'OW': 'ou', 'OY': 'oi', 'UH': 'u', 'UW': 'u'}
CON = {'B': 'b', 'CH': 'ch', 'D': 'd', 'DH': 'd', 'F': 'f', 'G': 'g', 'HH': 'j', 'JH': 'y', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ng', 'P': 'p', 'R': 'r', 'S': 's', 'SH': 'sh', 'T': 't', 'TH': 't', 'V': 'v', 'W': 'u', 'Y': 'y', 'Z': 's', 'ZH': 'y'}
TIL = {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú'}
def schwa(letras):   # la vocal escrita más probable para una vocal átona (AH0): la de la ortografía original
    return letras
def palabra(w):
    k = re.sub(r"[^a-z']", '', w.lower())
    pr = D.get(k)
    if not pr: return None
    ph = pr[0]
    # vocales de la palabra escrita, en orden, para resolver la vocal átona (schwa) por la ortografía
    vescritas = re.findall(r'[aeiou]+', k)
    out = []; nvoc = 0; acento = None; nsil = sum(1 for p in ph if p[:2] in VOC or p[:-1] in VOC)
    for i, p in enumerate(ph):
        m = re.match(r'([A-Z]+)(\d)?', p); base, st = m.group(1), m.group(2)
        sig = ph[i + 1] if i + 1 < len(ph) else ''
        if base in VOC:
            v = VOC[base]
            ve0 = vescritas[nvoc][0] if nvoc < len(vescritas) else ''
            if base == 'AA' and ve0 == 'o': v = 'o'   # Fox, Scott, John: la «o» escrita se dice «o»
            if base == 'OW' and sig and re.sub(r'\d', '', sig) not in VOC: v = 'o'   # Gold, Rolling: «o» en sílaba cerrada
            if base == 'AH' and st == '0':
                ve = vescritas[nvoc] if nvoc < len(vescritas) else 'e'
                v = ve[0] if ve[0] in 'aeiou' else 'e'
            if base == 'ER' and st == '0': v = 'er'
            if base == 'IH' and st == '0' and nvoc < len(vescritas) and vescritas[nvoc][0] == 'e': v = 'e'
            if st == '1': acento = len(out)
            out.append(v); nvoc += 1
        else:
            c = CON[base]
            if base == 'JH' and i == len(ph) - 1: c = 'ch'   # George, Cambridge: «ch» al final
            # «g» suave antes de e/i se escribe «gu»; «u» inicial de W antes de vocal queda «u»
            out.append(c)
    # g + e/i → gu
    s = ''
    for i, x in enumerate(out):
        if x == 'g' and i + 1 < len(out) and out[i + 1][:1] in 'ei': x = 'gu'
        s += x if i != acento else (TIL[x[0]] + x[1:] if x[0] in TIL else x)
    # simplificaciones: «uu» → «u», dobles iguales fuera
    s = re.sub(r'(.)\1+', r'\1', s)
    # monosílabos: sin tilde
    if nsil <= 1: s = s.translate(str.maketrans('áéíóú', 'aeiou'))
    return s
def frase(t):
    res = []
    for w in t.split():
        m = re.match(r"^([^A-Za-z]*)([A-Za-z][A-Za-z'.&-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$", w)
        if not m: res.append((w, False)); continue
        a, core, b = m.groups()
        r = palabra(core)
        if r is None: res.append((w, False)); continue
        if core[0].isupper(): r = r[0].upper() + r[1:]
        res.append((a + r + b, True))
    return ' '.join(x for x, _ in res), all(ok for _, ok in res)
if __name__ == '__main__':
    import sys
    for t in sys.argv[1:]: print(t, '→', frase(t))
