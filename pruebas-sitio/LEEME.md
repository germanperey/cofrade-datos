# Pruebas del sitio www.cofrad.es (respaldo en GitHub)

Germán, 20-11-2026 05:50: «Retoma todo el trabajo parcial y guárdalo mientras estás avanzando en otras tareas, para que no pierdas
ningún avance logrado hasta ahora». Estas pruebas vivían solo en la máquina de trabajo; aquí quedan respaldadas.

- `voz-v34/`: pruebas nuevas de la voz v34 (de corrido, léxico de pronunciación, puntuación, «índice»), mutantes, léxico
  (`lexico.py`, `respellar.py` con CMUdict, `resp.json`), baterías `reg_v34.sh` y `reg_v34c.sh`, y la primera versión de
  `datos/reglas-redes.json`.
- `voz-pruebas/`: pruebas de voz y oído con el simulador (`prueba_oido.py`, `prueba_voz.py`, `simulador.js`), nube, portada, nombres
  en inglés y el medidor de cambios de voz.
- `arnes/`: el arnés Miniflare (`servidor.mjs`, con `PROY_FOTO_ES_ARCHIVO`) y la prueba de la Proyección a 4 años.
- La rama `compartir-menciones` tiene el trabajo en curso de Compartir, Menciones y Concurso con su propio arnés.

Las rutas dentro de los archivos apuntan a la máquina de trabajo (/tmp/...): para correrlas en otra parte, ajustar esas rutas.
