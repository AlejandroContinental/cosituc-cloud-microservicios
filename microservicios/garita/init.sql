CREATE TABLE IF NOT EXISTS accesos_garita (
    id SERIAL PRIMARY KEY,
    codigo_qr VARCHAR(64) NOT NULL,
    reserva_id VARCHAR(64),
    sitio_arqueologico VARCHAR(100) NOT NULL,
    controlador_id INT DEFAULT 1,
    cantidad_personas INT DEFAULT 1,
    estado_acceso VARCHAR(30) DEFAULT 'PERMITIDO',
    observacion VARCHAR(255),
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accesos_garita (codigo_qr, reserva_id, sitio_arqueologico, controlador_id, cantidad_personas, estado_acceso, observacion) VALUES
('BTC-B19A2B84', 'b19a2b84-4c8d-4a1e-8e81-7d12f3e82190', 'Sacsayhuamán', 101, 2, 'PERMITIDO', 'Ingreso verificado correctamente'),
('BTC-TESTDEMO', 'demo-uuid-1234-5678', 'Ollantaytambo', 102, 1, 'PERMITIDO', 'Ingreso verificado correctamente');

