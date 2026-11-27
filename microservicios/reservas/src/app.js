const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pool = require('./db');

const app = express();
app.use(express.json());

// Cliente AWS S3 para respaldo de comprobantes digitales de boletos
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Soporte unificado para URLs de microservicios
const USUARIOS_URL = process.env.USUARIOS_SERVICE_URL || process.env.USUARIOS_API_URL || 'http://localhost:3001';
const BOLETOS_URL = process.env.BOLETOS_SERVICE_URL || process.env.BOLETOS_API_URL || 'http://localhost:3002';

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'reservas', s3_backup: 'activo' });
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

// POST - Crear reserva y respaldar comprobante en Amazon S3
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

        // 3. Registrar reserva en PostgreSQL
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

        const reservaCreada = result.rows[0];

        // 4. Integración Amazon S3: Respaldo inmutable de comprobante digital
        const bucketName = process.env.S3_BUCKET_NAME;
        if (bucketName) {
            const fechaActual = new Date();
            const year = fechaActual.getFullYear();
            const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const s3Key = `reservas/año=${year}/mes=${month}/reserva-${reservaId}.json`;

            const s3Payload = {
                reserva_id: reservaId,
                codigo_qr: codigoQr,
                usuario_id,
                boleto_id,
                nombre_circuito: boletoData.nombre || 'Boleto Turistico Cusco',
                fecha_visita,
                cantidad,
                total_pagado: totalPagado,
                emitido_en: fechaActual.toISOString(),
                origen: 'cosituc-cloud-reservas'
            };

            s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
                Body: JSON.stringify(s3Payload, null, 2),
                ContentType: 'application/json'
            })).catch(s3Err => {
                console.error('Advertencia S3: No se pudo respaldar el comprobante en Amazon S3:', s3Err.message);
            });
        }

        res.status(201).json(reservaCreada);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar la reserva', detalle: error.message });
    }
});

module.exports = app;
