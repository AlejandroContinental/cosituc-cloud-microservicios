CREATE TABLE IF NOT EXISTS boletos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Integral',
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 100
);

INSERT INTO boletos (nombre, tipo, precio, stock) VALUES
('Boleto Turístico Integral Cusco (BTC)', 'Integral', 130.00, 500),
('Boleto Turístico Parcial Circuito 1 (Sacsayhuamán)', 'Parcial', 70.00, 300),
('Boleto Turístico Parcial Circuito 2 (Qorikancha/Valle Sur)', 'Parcial', 70.00, 300);
