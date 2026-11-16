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
-- Migraciones ya aplicadas en producción (no volver a correrlas: SQLite no tiene «ADD COLUMN IF NOT EXISTS» y fallarían)
--   14-11-2026  ALTER TABLE pagos ADD COLUMN ref TEXT
--   14-11-2026  ALTER TABLE suscripciones ADD COLUMN pausada_por TEXT
--   (pausada_por: 'admin' si la pausó el botón del panel, 'seguridad' si Mercado Pago iba a cobrar antes de tiempo, vacío si la pausó el cliente)
