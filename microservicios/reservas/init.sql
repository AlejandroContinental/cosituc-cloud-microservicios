CREATE TABLE IF NOT EXISTS reservas (
    id VARCHAR(64) PRIMARY KEY,
    usuario_id INT NOT NULL,
    boleto_id INT NOT NULL,
    fecha_visita DATE NOT NULL,
    cantidad INT NOT NULL,
    total_pagado DECIMAL(10, 2) NOT NULL,
    codigo_qr VARCHAR(255) NOT NULL,
    estado VARCHAR(20) DEFAULT 'CONFIRMADA',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO reservas (id, usuario_id, boleto_id, fecha_visita, cantidad, total_pagado, codigo_qr, estado) VALUES
('b19a2b84-4c8d-4a1e-8e81-7d12f3e82190', 1, 1, '2026-12-15', 2, 260.00, 'BTC-B19A2B84', 'CONFIRMADA');
