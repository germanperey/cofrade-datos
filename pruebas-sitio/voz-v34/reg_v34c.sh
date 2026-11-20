#!/bin/bash
B=/tmp/esb/voz-v34c.min.js; L=/tmp/titulos/v34/logc; mkdir -p $L; rm -f $L/*.log; export ED_EXTRA=/tmp/titulos/proy/ed
cd /tmp/titulos/voz/prueba && SOLO=fluido,bilingue,revision,cortesia,tramos,frases,hablable timeout 2400 python3 prueba_oido.py $B 8960 > $L/oido.log 2>&1 &
cd /tmp/titulos/voz/prueba && BILINGUE=1 SOLO=guion,indice,ingles,auspicios,radio,ordenes timeout 2400 python3 prueba_voz.py $B 8961 > $L/voz.log 2>&1
wait
cd /tmp/titulos/v34 && timeout 600 python3 prueba_fluido.py $B 8962 > $L/fluido.log 2>&1
echo "oído (fluido, bilingüe, revisión, cortesía, tramos, frases, hablable): $(tail -1 $L/oido.log | cut -c1-300)" >> $L/resumen.log
echo "voz con bilingüe (guion, índice, inglés, auspicios, radio, órdenes): $(tail -1 $L/voz.log | cut -c1-300)" >> $L/resumen.log
echo "de corrido: $(tail -1 $L/fluido.log)" >> $L/resumen.log
echo FIN >> $L/resumen.log
