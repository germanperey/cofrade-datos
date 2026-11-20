#!/bin/bash
# Uso: correr_modos.sh BUNDLE ETIQUETA — los 7 modos de prueba_difusion.py, uno tras otro, en el puerto 8894
BUN=$1; ET=$2; L=/tmp/mf/prueba_wt2/modos/$ET; mkdir -p $L; A=/tmp/mf/prueba_wt2/arrancar.sh; P=8894
cd /tmp/mf/prueba_wt2
corre() { local M=$1 T=$2; shift 2; $A $P $BUN "$@" > /dev/null && timeout $T python3 prueba_difusion.py $P $M > $L/$M.log 2>&1; echo "$M: $(tail -1 $L/$M.log)"; }
corre principal 1800 CON_RESEND=1 ROBOTS_TALKWALKER=bloquear PASO_SEG=0
corre sorteo 900 CON_RESEND=1 HOY_CONCURSO=2026-12-26 HORA_CONCURSO=10
corre auto 600 CON_RESEND=1 HOY_CONCURSO=2026-12-26 HORA_CONCURSO=19 MANT_SEG=0
corre vencido 600 HOY_CONCURSO=2027-02-02 MANT_SEG=0
corre cerrado 600 HOY_CONCURSO=2026-12-25 ROBOTS_GOOGLE=propio
corre antes 600 HOY_CONCURSO=2026-11-19
corre youtube 600 CON_YOUTUBE=1 ROBOTS_GOOGLE=bloquear
fuser -k $P/tcp >/dev/null 2>&1; echo FIN
