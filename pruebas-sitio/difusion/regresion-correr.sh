#!/bin/bash
# Uso: correr.sh BUNDLE ETIQUETA — arnés limpio en 8896 y las 6 regresiones en orden
BUN=$1; ET=$2; L=/tmp/mf/prueba_wt2/reg/$ET; mkdir -p $L
fuser -k 8896/tcp >/dev/null 2>&1; sleep 0.5
cd /tmp/mf/prueba_wt2 && PUERTO=8896 nohup node servidor.mjs $BUN > $L/srv.log 2>&1 &
for i in $(seq 1 80); do curl -s -o /dev/null http://127.0.0.1:8896/__despachos && break; sleep 0.5; done
cd /tmp/mf/prueba_wt2/reg
for t in pruebas.py pruebas2.py prueba_archivo.py prueba_botones.py sin_traducir.py prueba_portada_voz.py; do
  if [ $t = sin_traducir.py ]; then timeout 600 python3 $t http://127.0.0.1:8896/ > $L/$t.log 2>&1; else timeout 900 python3 $t http://localhost:8896 > $L/$t.log 2>&1; fi
  echo "$t: OK=$(grep -c '^OK' $L/$t.log) FALLA=$(grep -c '^FALLA' $L/$t.log) · $(tail -1 $L/$t.log | cut -c1-110)"
done
fuser -k 8896/tcp >/dev/null 2>&1; echo FIN
