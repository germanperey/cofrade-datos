# Mutantes de la v34: cada uno rompe una pieza nueva y la prueba debe fallar (MUERE). Al final restaura voz.js y worker.js.
import hashlib, os, shutil, subprocess, sys
WT = '/tmp/titulos/wt'; VOZ = WT + '/sitio/modulos/voz.js'; WK = WT + '/sitio/worker.js'
bueno = open(VOZ, encoding='utf-8').read(); wk_bueno = open(WK, encoding='utf-8').read()
h0 = hashlib.sha256(bueno.encode()).hexdigest()
M = [
 ('sin modo de corrido', "cambioMin: 6,", "cambioMin: 0,", 'fluido'),
 ('sin léxico de pronunciación', "var RP = base === 'es' ? prepRESP() : null;", "var RP = null;", 'fluido'),
 ('largo sin cortar en las comas', "seguidas = z > i && /[,;:]/.test(texto.slice(T[z - 1].e, T[z].s)) ? 1 : seguidas + 1;", "seguidas = seguidas + 1;", 'fluido'),
 ('de corrido solo en castellano', "  if (CFG.cambioMin) {   // 20-11-2026", "  if (CFG.cambioMin && base === 'es') {   // 20-11-2026", 'ingles'),
 ('abreviaturas sin leer', "function (x, a) { return ABREV_ES[a]; })", "function (x, a) { return x; })", 'fluido'),
 ('sin tildes restituidas', ".replace(RX_TILDES, function (m, pre, x) {", ".replace(/(?!)(x)(y)/g, function (m, pre, x) {", 'fluido'),
 ('títulos en mayúsculas deletreados', "if (MAY_PALABRA[x] && ", "if (false && MAY_PALABRA[x] && ", 'fluido'),
 ('sin variantes de «índice»', "|in dice|indique|indico|indis|indise|endice|hindi)(?:\\s+(.*))?$/;", ")(?:\\s+(.*))?$/;", 'fluido'),
 ('variantes débiles sin destino', "var dudoso = !/^(indice|indices|menu|menus|index)$/.test(mi[1]), resto", "var dudoso = false, resto", 'fluido'),
]
res = []
SOLO_M = os.environ.get('SOLO_M')
try:
    for n, (nombre, a, b, prueba) in enumerate(M):
        if SOLO_M and prueba != SOLO_M and not (SOLO_M == 'indice' and 'ndice' in nombre or SOLO_M == 'indice' and 'débiles' in nombre):
            continue
        if SOLO_M == 'indice' and not ('ndice' in nombre or 'débiles' in nombre):
            continue
        if bueno.count(a) != 1:
            res.append(f"{nombre}: NO APLICA ({bueno.count(a)} coincidencias)"); continue
        open(VOZ, 'w', encoding='utf-8').write(bueno.replace(a, b))
        subprocess.run(['python3', 'sitio/construir.py'], cwd=WT, capture_output=True, timeout=300)
        bun = f'/tmp/esb/mut{n}.min.js'
        with open(bun, 'w') as f:
            subprocess.run(['/tmp/esb/node_modules/.bin/esbuild', 'sitio/worker.js', '--minify'], cwd=WT, stdout=f, timeout=300)
        if prueba in ('fluido', 'ingles'):
            r = subprocess.run(['python3', 'prueba_fluido.py', bun, str(8910 + n)], cwd='/tmp/titulos/v34', capture_output=True, text=True, timeout=900)
        else:
            env = dict(os.environ, SOLO='fluido', ED_EXTRA='/tmp/titulos/proy/ed')
            r = subprocess.run(['python3', 'prueba_oido.py', bun, str(8910 + n)], cwd='/tmp/titulos/voz/prueba', capture_output=True, text=True, timeout=1500, env=env)
        ult = (r.stdout.strip().splitlines() or ['?'])[-1]
        malas = [l for l in r.stdout.splitlines() if l.startswith('FALLA')]
        res.append(f"{nombre}: {'MUERE' if malas else 'VIVE'} · {ult[:80]}" + (f" · ej.: {malas[0][:90]}" if malas else ''))
        print(res[-1], flush=True)
finally:
    open(VOZ, 'w', encoding='utf-8').write(bueno); open(WK, 'w', encoding='utf-8').write(wk_bueno)
    assert hashlib.sha256(open(VOZ, encoding='utf-8').read().encode()).hexdigest() == h0
    print('RESTAURADO voz.js y worker.js')
print('\n'.join(res))
