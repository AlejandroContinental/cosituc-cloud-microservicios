const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const app = express();
app.use(express.json());

const USUARIOS_URL = process.env.USUARIOS_SERVICE_URL || 'http://localhost:3001';
const BOLETOS_URL = process.env.BOLETOS_SERVICE_URL || 'http://localhost:3002';

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'reservas' });
});

// GET - Listar todas las reservas
app.get('/reservas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas ORDER BY creado_en DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar reservas' });
    }
});

// GET - Obtener reserva por ID
app.get('/reservas/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservas WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar reserva' });
    }
});

// POST - Crear nueva reserva con validación inter-servicio
app.post('/reservas', async (req, res) => {
    const { usuario_id, boleto_id, fecha_visita, cantidad } = req.body;

    if (!usuario_id || !boleto_id || !fecha_visita || !cantidad) {
        return res.status(400).json({ error: 'usuario_id, boleto_id, fecha_visita y cantidad son obligatorios' });
    }

    try {
        // 1. Validación inter-servicio: Verificar existencia de Usuario
        let userRes;
        try {
            userRes = await fetch(`${USUARIOS_URL}/usuarios/${usuario_id}`);
        } catch (err) {
            return res.status(503).json({ error: 'Servicio de usuarios no disponible' });
        }

        if (!userRes.ok) {
            return res.status(404).json({ error: 'El usuario especificado no existe' });
        }

        // 2. Validación inter-servicio: Verificar existencia de Boleto y Stock
        let boletoRes;
        try {
            boletoRes = await fetch(`${BOLETOS_URL}/boletos/${boleto_id}`);
        } catch (err) {
            return res.status(503).json({ error: 'Servicio de boletos no disponible' });
        }

        if (!boletoRes.ok) {
            return res.status(404).json({ error: 'El boleto especificado no existe' });
        }

        const boletoData = await boletoRes.json();
        const stockDisponible = boletoData.stock !== undefined ? boletoData.stock : 100;

        if (stockDisponible < cantidad) {
            return res.status(409).json({ error: 'Aforo o stock insuficiente para la cantidad solicitada' });
        }

        // 3. Emitir y registrar la reserva
        const reservaId = uuidv4();
        const precioUnitario = Number(boletoData.precio) || 130.00;
        const totalPagado = precioUnitario * cantidad;
        const codigoQr = `BTC-${reservaId.slice(0, 8).toUpperCase()}`;

        const query = `
            INSERT INTO reservas (id, usuario_id, boleto_id, fecha_visita, cantidad, total_pagado, codigo_qr, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMADA')
            RETURNING *;
        `;
        const values = [reservaId, usuario_id, boleto_id, fecha_visita, cantidad, totalPagado, codigoQr];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar la reserva' });
    }
});

// DELETE - Cancelar reserva
app.delete('/reservas/:id', async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE reservas SET estado = 'CANCELADA' WHERE id = $1 RETURNING *",
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        res.json({ mensaje: 'Reserva cancelada exitosamente', reserva: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cancelar la reserva' });
    }
});

module.exports = app;

