const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

const RESERVAS_URL = process.env.RESERVAS_SERVICE_URL || process.env.RESERVAS_API_URL || 'http://localhost:3003';

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'garita' });
});

// GET - Listar todos los accesos registrados en garitas
app.get('/garita/accesos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM accesos_garita ORDER BY fecha_ingreso DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar historial de accesos' });
    }
});

// GET - Consultar aforo en tiempo real por sitio arqueológico
app.get('/garita/aforo/:sitio', async (req, res) => {
    const { sitio } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_validaciones,
                COALESCE(SUM(cantidad_personas), 0) as total_visitantes_hoy
             FROM accesos_garita 
             WHERE LOWER(sitio_arqueologico) = LOWER($1) 
               AND estado_acceso = 'PERMITIDO'
               AND DATE(fecha_ingreso) = CURRENT_DATE`,
            [sitio]
        );
        res.json({
            sitio_arqueologico: sitio,
            fecha: new Date().toISOString().split('T')[0],
            total_validaciones: parseInt(result.rows[0].total_validaciones, 10),
            total_visitantes_hoy: parseInt(result.rows[0].total_visitantes_hoy, 10)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar aforo del sitio' });
    }
});

// POST - Validar código QR y registrar ingreso en garita
app.post('/garita/validar', async (req, res) => {
    const { codigo_qr, sitio_arqueologico, controlador_id } = req.body;

    if (!codigo_qr || !sitio_arqueologico) {
        return res.status(400).json({ error: 'codigo_qr y sitio_arqueologico son obligatorios' });
    }

    try {
        // 1. Comunicación inter-servicio: Verificar validez con el microservicio de Reservas
        let reservaData = null;
        try {
            // Intentamos buscar por endpoint QR o por ID
            let reservaRes = await fetch(`${RESERVAS_URL}/reservas/qr/${encodeURIComponent(codigo_qr)}`);
            if (reservaRes.status === 404) {
                reservaRes = await fetch(`${RESERVAS_URL}/reservas/${encodeURIComponent(codigo_qr)}`);
            }

            if (reservaRes.ok) {
                reservaData = await reservaRes.json();
            } else if (reservaRes.status === 404) {
                return res.status(404).json({ 
                    error: 'Boleto o código QR no encontrado en el sistema de reservas',
                    codigo_qr 
                });
            } else {
                return res.status(reservaRes.status).json({ error: 'Error al consultar servicio de reservas' });
            }
        } catch (fetchErr) {
            // Modo de resiliencia de garita: Si reservas no responde, reportamos 503
            return res.status(503).json({ error: 'Servicio de reservas no disponible temporalmente para validación' });
        }

        // 2. Validar que la reserva no esté CANCELADA
        if (reservaData && reservaData.estado === 'CANCELADA') {
            return res.status(403).json({ 
                error: 'Acceso denegado: El boleto turístico fue CANCELADO',
                codigo_qr 
            });
        }

        const reservaId = reservaData ? reservaData.id : null;
        const cantidadPersonas = reservaData && reservaData.cantidad ? Number(reservaData.cantidad) : 1;

        // 3. Control anti-fraude: Validar que el boleto no haya sido ya utilizado en este mismo sitio
        const duplicateCheck = await pool.query(
            `SELECT * FROM accesos_garita 
             WHERE UPPER(codigo_qr) = UPPER($1) 
               AND LOWER(sitio_arqueologico) = LOWER($2) 
               AND estado_acceso = 'PERMITIDO'`,
            [codigo_qr, sitio_arqueologico]
        );

        if (duplicateCheck.rowCount > 0) {
            // Registrar intento denegado
            await pool.query(
                `INSERT INTO accesos_garita (codigo_qr, reserva_id, sitio_arqueologico, controlador_id, cantidad_personas, estado_acceso, observacion)
                 VALUES ($1, $2, $3, $4, $5, 'DENEGADO_DUPLICADO', 'Intento de reingreso no permitido en el mismo atractivo')`,
                [codigo_qr, reservaId, sitio_arqueologico, controlador_id || 1, cantidadPersonas]
            );

            return res.status(409).json({ 
                error: `Acceso denegado: Este boleto ya fue utilizado en el sitio arqueológico ${sitio_arqueologico}`,
                codigo_qr,
                primer_ingreso: duplicateCheck.rows[0].fecha_ingreso
            });
        }

        // 4. Registrar acceso PERMITIDO
        const insertResult = await pool.query(
            `INSERT INTO accesos_garita (codigo_qr, reserva_id, sitio_arqueologico, controlador_id, cantidad_personas, estado_acceso, observacion)
             VALUES ($1, $2, $3, $4, $5, 'PERMITIDO', 'Ingreso validado satisfactoriamente')
             RETURNING *`,
            [codigo_qr, reservaId, sitio_arqueologico, controlador_id || 1, cantidadPersonas]
        );

        res.status(201).json({
            mensaje: `Acceso permitido. Bienvenido a ${sitio_arqueologico}`,
            valido: true,
            acceso: insertResult.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar validación de garita' });
    }
});

module.exports = app;

