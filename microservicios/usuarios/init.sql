CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(50) DEFAULT 'Turista'
);

INSERT INTO usuarios (nombre, email, rol) VALUES
('Ana Torres', 'ana@correo.com', 'Turista'),
('Luis Pérez', 'luis@correo.com', 'Agencia'),
('Carlos Mendoza', 'carlos@correo.com', 'Admin');

