# Pruebas de Compartir, Menciones y Concurso (trabajo en curso, 20-11-2026)

Respaldo del arnés y las pruebas del módulo `sitio/modulos/difusion.js` (botón Compartir, visitas por enlace compartido,
menciones en medios y concurso «Comparte Cofrade News»), guardado a pedido de Germán (20-11-2026, 05:50: «Retoma todo el
trabajo parcial y guárdalo mientras estás avanzando en otras tareas, para que no pierdas ningún avance logrado hasta ahora»).

- `servidor.mjs`: arnés Miniflare (copia del de `/tmp/mf/prueba` con las fuentes de menciones simuladas en `fx/`).
- `prueba_difusion.py`: pruebas con navegador. Últimos resultados (05:27 a 05:31): principal 135/135, sorteo 16/16,
  concurso cerrado 4/4, antes de empezar 3/3 (ver los `.log`).
- `arrancar.sh PUERTO BUNDLE [VAR=valor]`: arranca el arnés con una base nueva.
- Pendiente: revisión completa, regresiones del sitio, mutantes, canje del cupón en el pago de Mercado Pago (antes del sorteo del
  26-12-2026) y publicación.
