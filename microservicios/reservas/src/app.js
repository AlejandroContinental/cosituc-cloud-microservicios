const express = require('express');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
app.use(express.json());

// Soporte unificado para nombres de variables de entorno (Docker Compose y Local)
const USUARIOS_URL = process.env.USUARIOS_SERVICE_URL || process.env.USUARIOS_API_URL || 'http://localhost:3001';
const BOLETOS_URL = process.env.BOLETOS_SERVICE_URL || process.env.BOLETOS_API_URL || 'http://localhost:3002';

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

// GET - Consultar reserva por Código QR (Para control de acceso / garita)
app.get('/reservas/qr/:codigo_qr', async (req, res) => {
    try {
        const { codigo_qr } = req.params;
        const result = await pool.query('SELECT * FROM reservas WHERE codigo_qr = $1', [codigo_qr]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Boleto o reserva no encontrada con el código QR provisto' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al validar código QR' });
    }
});

// GET - Consultar reserva por ID interno
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

// POST - Crear reserva
app.post('/reservas', async (req, res) => {
    const { usuario_id, boleto_id, fecha_visita, cantidad } = req.body;

    if (!usuario_id || !boleto_id || !fecha_visita || !cantidad) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios: usuario_id, boleto_id, fecha_visita, cantidad' });
    }

    try {
        // 1. Validar usuario
        const userRes = await fetch(`${USUARIOS_URL}/usuarios/${usuario_id}`);
        if (!userRes.ok) {
            return res.status(404).json({ error: 'El usuario especificado no existe' });
        }

        // 2. Validar boleto y aforo/stock
        const boletoRes = await fetch(`${BOLETOS_URL}/boletos/${boleto_id}`);
        if (!boletoRes.ok) {
            return res.status(404).json({ error: 'El boleto especificado no existe' });
        }
        const boletoData = await boletoRes.json();

        const stockDisponible = boletoData.stock !== undefined ? boletoData.stock : 0;
        if (stockDisponible < cantidad) {
            return res.status(409).json({ error: `Aforo insuficiente. Cupos disponibles: ${stockDisponible}` });
        }

        // 3. Registrar reserva
        const reservaId = crypto.randomUUID();
        const totalPagado = Number(boletoData.precio) * cantidad;
        const codigoQr = `BTC-${reservaId.slice(0, 8).toUpperCase()}`;

        const insertQuery = `
            INSERT INTO reservas (id, usuario_id, boleto_id, fecha_visita, cantidad, total_pagado, codigo_qr)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const result = await pool.query(insertQuery, [
            reservaId, usuario_id, boleto_id, fecha_visita, cantidad, totalPagado, codigoQr
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar la reserva', detalle: error.message });
    }
});

module.exports = app;
