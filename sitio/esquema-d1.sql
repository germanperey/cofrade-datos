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
CREATE TABLE IF NOT EXISTS intentos (ip TEXT, fecha TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (ip, fecha));
CREATE INDEX IF NOT EXISTS buzon_token ON buzon (token);
CREATE INDEX IF NOT EXISTS buzon_email ON buzon (email, fecha);
CREATE TABLE IF NOT EXISTS traducciones (es TEXT PRIMARY KEY, en TEXT NOT NULL, creado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS suscripciones (ref TEXT PRIMARY KEY, creado TEXT NOT NULL, nombre TEXT, email TEXT NOT NULL, plan TEXT NOT NULL, monto INTEGER NOT NULL, cofradia INTEGER DEFAULT 0, inicio TEXT NOT NULL, estado TEXT DEFAULT 'creada', mp_id TEXT, enlace TEXT, proximo TEXT, actualizado TEXT, ip TEXT);
CREATE INDEX IF NOT EXISTS suscripciones_mp ON suscripciones (mp_id);
CREATE INDEX IF NOT EXISTS suscripciones_email ON suscripciones (email, creado);
