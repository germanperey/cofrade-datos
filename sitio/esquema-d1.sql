-- Esquema de la base D1 «cofrade-socios» del Worker cofrade-news-web (copiado de producción el 14-11-2026).
-- Es el dueño único del esquema: el arnés de pruebas lo lee de aquí. Para recrear la base: pegar cada línea en la consola de D1.
CREATE TABLE IF NOT EXISTS usuarios (email TEXT PRIMARY KEY, nombre TEXT, foto TEXT, creado TEXT, ultimo TEXT, ingresos INTEGER DEFAULT 0, cofradia INTEGER DEFAULT 0, estado TEXT DEFAULT 'registrado', plan TEXT, vence TEXT, mp_id TEXT);
CREATE TABLE IF NOT EXISTS pagos (id TEXT PRIMARY KEY, email TEXT, monto INTEGER, fecha TEXT, estado TEXT, tipo TEXT, ref TEXT);
CREATE TABLE IF NOT EXISTS visitas (fecha TEXT, ruta TEXT, visitante TEXT, pais TEXT, PRIMARY KEY (fecha, ruta, visitante));
CREATE TABLE IF NOT EXISTS lectura (fecha TEXT, ruta TEXT, seccion TEXT, segundos INTEGER DEFAULT 0, vistas INTEGER DEFAULT 0, PRIMARY KEY (fecha, ruta, seccion));
CREATE TABLE IF NOT EXISTS config (clave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS buzon (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT, nombre TEXT, apellido TEXT, email TEXT, gusta TEXT, agregar TEXT, frecuencia TEXT, nps INTEGER, texto TEXT, verificado INTEGER DEFAULT 0, token TEXT, ip TEXT, pais TEXT, estado TEXT DEFAULT 'nuevo');
CREATE INDEX IF NOT EXISTS buzon_ip ON buzon (ip, fecha);
CREATE INDEX IF NOT EXISTS visitas_fecha ON visitas (fecha);
-- 15-11-2026 · contador de visitas: cada apertura suma 1 por día y zona (portada, diario, otras). Los únicos siguen en visitas
CREATE TABLE IF NOT EXISTS vistas (fecha TEXT, zona TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (fecha, zona));
CREATE TABLE IF NOT EXISTS intentos (ip TEXT, fecha TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (ip, fecha));
CREATE INDEX IF NOT EXISTS buzon_token ON buzon (token);
CREATE INDEX IF NOT EXISTS buzon_email ON buzon (email, fecha);
CREATE TABLE IF NOT EXISTS traducciones (es TEXT PRIMARY KEY, en TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS suscripciones (ref TEXT PRIMARY KEY, creado TEXT NOT NULL, nombre TEXT, email TEXT NOT NULL, plan TEXT NOT NULL, monto INTEGER NOT NULL, cofradia INTEGER DEFAULT 0, inicio TEXT NOT NULL, estado TEXT DEFAULT 'creada', mp_id TEXT, enlace TEXT, proximo TEXT, actualizado TEXT, ip TEXT, pausada_por TEXT);
CREATE INDEX IF NOT EXISTS suscripciones_mp ON suscripciones (mp_id);
CREATE INDEX IF NOT EXISTS suscripciones_email ON suscripciones (email, creado);
-- 16-11-2026 · Panel v2 (Germán, 15-11-2026: más KPIs y gráficos, filtros y registro de anunciantes con aviso de renovación)
-- dimensiones: cada apertura suma 1 por día, zona, hora de Chile, origen y dispositivo. referentes: sitios que enviaron la visita
CREATE TABLE IF NOT EXISTS dimensiones (fecha TEXT, zona TEXT, hora INTEGER, origen TEXT, disp TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (fecha, zona, hora, origen, disp));
CREATE TABLE IF NOT EXISTS referentes (fecha TEXT, host TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (fecha, host));
-- Anunciantes que pagan. Las marcas propias de Germán NO van aquí: son permanentes y viven en sitio/marcas.json y en la Skill
CREATE TABLE IF NOT EXISTS anunciantes (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, empresa TEXT NOT NULL, rut TEXT, rubro TEXT, contacto TEXT, email TEXT, telefono TEXT, web TEXT, titulo TEXT, texto TEXT, boton1_texto TEXT, boton1_web TEXT, boton2_texto TEXT, boton2_web TEXT, boton2_email TEXT, banner TEXT DEFAULT 'ambos', orden INTEGER DEFAULT 1, color_fondo TEXT, color_acento TEXT, logo_url TEXT, estado TEXT DEFAULT 'activo', notas TEXT, creado TEXT, actualizado TEXT);
CREATE TABLE IF NOT EXISTS logos_anuncios (anunciante_id INTEGER PRIMARY KEY, tipo TEXT NOT NULL, datos TEXT NOT NULL, version TEXT NOT NULL, creado TEXT);
CREATE TABLE IF NOT EXISTS contratos (id INTEGER PRIMARY KEY AUTOINCREMENT, anunciante_id INTEGER NOT NULL, desde TEXT NOT NULL, hasta TEXT NOT NULL, monto REAL DEFAULT 0, moneda TEXT DEFAULT 'UF', fecha_pago TEXT, medio_pago TEXT, documento TEXT, notas TEXT, aviso_enviado TEXT, creado TEXT);
CREATE INDEX IF NOT EXISTS contratos_anunciante ON contratos (anunciante_id, hasta);
CREATE INDEX IF NOT EXISTS contratos_hasta ON contratos (hasta);
-- clics en los avisos (/ir/…): totales por día y origen, y personas distintas por día (huella anónima del día, como en visitas)
CREATE TABLE IF NOT EXISTS clics (fecha TEXT, slug TEXT, origen TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (fecha, slug, origen));
CREATE TABLE IF NOT EXISTS clics_unicos (fecha TEXT, slug TEXT, visitante TEXT, PRIMARY KEY (fecha, slug, visitante));
CREATE INDEX IF NOT EXISTS clics_slug ON clics (slug, fecha);
CREATE TABLE IF NOT EXISTS correos_anunciantes (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT, anunciante_id INTEGER, contrato_id INTEGER, tipo TEXT, para TEXT, asunto TEXT, estado TEXT);
CREATE INDEX IF NOT EXISTS correos_contrato ON correos_anunciantes (contrato_id, fecha);
-- 16-11-2026: ícono de Cofrade News (acceso directo). Instalaciones y aperturas por día, evento y tipo de aparato, sin datos personales
CREATE TABLE IF NOT EXISTS instalaciones (fecha TEXT NOT NULL, evento TEXT NOT NULL, aparato TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, evento, aparato));
-- 20-11-2026 · difusión (modulos/difusion.js): veces que tocaron Compartir por canal, visitas por enlace compartido por código y día,
-- personas distintas por huella HMAC del día (nunca la IP), menciones en medios (automáticas y manuales) y el concurso «Comparte
-- Cofrade News» (participantes con email confirmado, capturas privadas con su SHA-256, registro de auditoría del sorteo y cupones).
-- El Worker también las crea solo si faltan. Sin punto y coma en estos comentarios: el arnés corta el archivo por punto y coma.
CREATE TABLE IF NOT EXISTS compartidos (fecha TEXT NOT NULL, canal TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, canal));
CREATE TABLE IF NOT EXISTS referidos (fecha TEXT NOT NULL, codigo TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (fecha, codigo));
CREATE TABLE IF NOT EXISTS referidos_unicos (fecha TEXT NOT NULL, codigo TEXT NOT NULL, visitante TEXT NOT NULL, red TEXT, PRIMARY KEY (fecha, codigo, visitante));
CREATE INDEX IF NOT EXISTS referidos_unicos_codigo ON referidos_unicos (codigo, fecha);
CREATE INDEX IF NOT EXISTS referidos_unicos_red ON referidos_unicos (fecha, codigo, red);
CREATE TABLE IF NOT EXISTS menciones (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT, medio TEXT NOT NULL, programa TEXT, persona TEXT, enlace TEXT UNIQUE, alcance INTEGER, origen TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'por confirmar', nota TEXT, titulo TEXT, fuente TEXT, creado TEXT NOT NULL, actualizado TEXT);
CREATE INDEX IF NOT EXISTS menciones_estado ON menciones (estado, fecha);
CREATE TABLE IF NOT EXISTS concurso_participantes (email TEXT PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, creado TEXT NOT NULL, verificado INTEGER NOT NULL DEFAULT 0, confirmado TEXT, token TEXT, enviado TEXT, mayor INTEGER NOT NULL DEFAULT 0, bases INTEGER NOT NULL DEFAULT 0, ip TEXT, estado TEXT NOT NULL DEFAULT 'activo');
CREATE INDEX IF NOT EXISTS concurso_participantes_token ON concurso_participantes (token);
CREATE TABLE IF NOT EXISTS concurso_capturas (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, fecha TEXT NOT NULL, creado TEXT NOT NULL, sha TEXT UNIQUE NOT NULL, bytes INTEGER NOT NULL, ancho INTEGER, alto INTEGER, datos TEXT, estado TEXT NOT NULL DEFAULT 'por revisar', revisado TEXT, ip TEXT);
CREATE INDEX IF NOT EXISTS concurso_capturas_email ON concurso_capturas (email, fecha);
CREATE INDEX IF NOT EXISTS concurso_capturas_fecha ON concurso_capturas (fecha, ip);
CREATE TABLE IF NOT EXISTS concurso_envios (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, ip TEXT, email TEXT NOT NULL, creado TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS concurso_envios_fecha ON concurso_envios (fecha, ip);
CREATE INDEX IF NOT EXISTS concurso_envios_email ON concurso_envios (email);
CREATE TABLE IF NOT EXISTS concurso_sorteos (id INTEGER PRIMARY KEY AUTOINCREMENT, creado TEXT NOT NULL, tipo TEXT NOT NULL, semilla TEXT NOT NULL, huella TEXT NOT NULL, total INTEGER NOT NULL, participantes INTEGER NOT NULL, ganadores TEXT NOT NULL, lista TEXT NOT NULL, avisos INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS concurso_sorteo_oficial ON concurso_sorteos (tipo) WHERE tipo = 'oficial';
CREATE TABLE IF NOT EXISTS cupones (codigo TEXT PRIMARY KEY, email TEXT NOT NULL, origen TEXT NOT NULL, pct INTEGER NOT NULL, plan TEXT NOT NULL, vence TEXT NOT NULL, creado TEXT NOT NULL, usado TEXT, ref TEXT, reclamado TEXT);
-- Migraciones ya aplicadas en producción (no volver a correrlas: SQLite no tiene «ADD COLUMN IF NOT EXISTS» y fallarían)
--   14-11-2026  ALTER TABLE pagos ADD COLUMN ref TEXT
--   14-11-2026  ALTER TABLE suscripciones ADD COLUMN pausada_por TEXT
--   (pausada_por: 'admin' si la pausó el botón del panel, 'seguridad' si Mercado Pago iba a cobrar antes de tiempo, vacío si la pausó el cliente)
