-- =============================================================================
-- QOSQOPASS & TOURS (COSITUC) - AMAZON ATHENA ANALYTICS
-- =============================================================================
-- Permite consultar datos serverless sobre los archivos JSON almacenados en Amazon S3.
-- Reemplazar 'cosituc-tickets-reservas' por el nombre de tu bucket de S3 si difiere.
-- =============================================================================

-- 1. Crear la base de datos analítica en Athena
CREATE DATABASE IF NOT EXISTS cosituc_analitica_db;

-- 2. Crear tabla externa que lee automáticamente los JSONs de reservas en S3
CREATE EXTERNAL TABLE IF NOT EXISTS cosituc_analitica_db.reservas_s3 (
    reserva_id string,
    codigo_qr string,
    usuario_id int,
    boleto_id int,
    nombre_circuito string,
    fecha_visita string,
    cantidad int,
    total_pagado double,
    emitido_en string,
    origen string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES (
    'ignore.malformed.json' = 'true'
)
LOCATION 's3://cosituc-tickets-reservas/reservas/';

-- =============================================================================
-- CONSULTAS ANALÍTICAS PARA DEMOSTRACIÓN EN CLASE (EVIDENCIA)
-- =============================================================================

-- Consulta 1: Vista general de reservas emitidas y respaldadas en S3
SELECT 
    reserva_id,
    codigo_qr,
    nombre_circuito,
    cantidad as boletos_adquiridos,
    total_pagado as monto_soles,
    emitido_en
FROM cosituc_analitica_db.reservas_s3
ORDER BY emitido_en DESC
LIMIT 10;

-- Consulta 2: Resumen financiero y aforo total por circuito turístico
SELECT 
    nombre_circuito,
    COUNT(*) as total_transacciones,
    SUM(cantidad) as total_turistas_programados,
    SUM(total_pagado) as recaudacion_total_soles,
    ROUND(AVG(total_pagado), 2) as ticket_promedio_soles
FROM cosituc_analitica_db.reservas_s3
GROUP BY nombre_circuito
ORDER BY recaudacion_total_soles DESC;

-- Consulta 3: Proyección de aforo por fecha de visita (Control de Capacidad de Carga)
SELECT 
    fecha_visita,
    SUM(cantidad) as visitantes_proyectados
FROM cosituc_analitica_db.reservas_s3
GROUP BY fecha_visita
ORDER BY fecha_visita ASC;
