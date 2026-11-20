#!/bin/bash
# batería v34 (20-11-2026): de a 2 navegadores por vez (la máquina tiene 2 núcleos)
B=/tmp/esb/voz-v34.min.js; L=/tmp/titulos/v34/log; mkdir -p $L; rm -f $L/*.log; export ED_EXTRA=/tmp/titulos/proy/ed
cd /tmp/titulos/v34 && timeout 600 python3 prueba_fluido.py $B 8891 > $L/fluido.log 2>&1 &
cd /tmp/titulos/voz/prueba && SOLO=fluido,revision,bilingue,cortesia timeout 2400 python3 prueba_oido.py $B 8892 > $L/oido1.log 2>&1
wait
echo "fluido: $(tail -1 $L/fluido.log)" >> $L/resumen.log
echo "oído (fluido, revisión, bilingüe, cortesía): $(tail -1 $L/oido1.log | cut -c1-300)" >> $L/resumen.log
cd /tmp/titulos/vozp && timeout 500 python3 prueba_ingles_nombres.py $B 8893 > $L/nombres.log 2>&1 &
cd /tmp/titulos/voz/prueba && BILINGUE=1 timeout 3000 python3 prueba_voz.py $B 8894 > $L/voz.log 2>&1
wait
echo "nombres (modo voces): $(tail -1 $L/nombres.log)" >> $L/resumen.log
echo "voz completa con bilingüe: $(tail -1 $L/voz.log | cut -c1-300)" >> $L/resumen.log
cd /tmp/titulos/vozp && timeout 900 python3 prueba_nube.py $B 8895 > $L/nube.log 2>&1 &
cd /tmp/titulos/voz/prueba && SOLO=apagar,calida,conversa,eco,edge,estricto,fallas,frases,hablable,idioma,indefinidas,indice2,movil,navega,nombre,nota,numero,otravoz,pausa,permiso,reinicio,tramos timeout 3000 python3 prueba_oido.py $B 8896 > $L/oido2.log 2>&1
wait
echo "oído en la nube: $(tail -1 $L/nube.log)" >> $L/resumen.log
echo "oído completo: $(tail -1 $L/oido2.log | cut -c1-300)" >> $L/resumen.log
cd /tmp/mf/prueba && PUERTO=8787 node servidor.mjs $B > /dev/null 2>&1 & SRV=$!
for i in $(seq 1 120); do curl -sf -m 2 -o /dev/null http://127.0.0.1:8787/__despachos && break; sleep 1; done
cd /tmp/titulos/vozp && timeout 600 python3 prueba_portada_voz.py > $L/portada.log 2>&1; kill $SRV
echo "portada: $(tail -1 $L/portada.log)" >> $L/resumen.log
echo FIN >> $L/resumen.log
