#!/bin/bash
# Uso: arrancar.sh PUERTO BUNDLE [VAR=valor ...]  — mata lo que haya en ese puerto y arranca el arnés con una base nueva
P=$1; BUN=$2; shift 2
pkill -f "PUERTO=$P " 2>/dev/null; fuser -k $P/tcp 2>/dev/null; sleep 0.5
cd /tmp/mf/prueba_wt3 && env "$@" PUERTO=$P ED_EXTRA=/tmp/titulos/proy/ed nohup node servidor.mjs $BUN > srv$P.log 2>&1 &
for i in $(seq 1 80); do curl -s -o /dev/null http://127.0.0.1:$P/__despachos && exit 0; sleep 0.5; done
echo "NO ARRANCÓ"; tail -5 /tmp/mf/prueba_wt3/srv$P.log; exit 1
