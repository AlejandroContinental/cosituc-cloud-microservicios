const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'boletos' });
});

// GET - Listar todos los boletos
app.get('/boletos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM boletos');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar boletos' });
    }
});

// GET - Obtener boleto por ID
app.get('/boletos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM boletos WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Boleto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar boleto' });
    }
});

// POST - Crear nuevo boleto
app.post('/boletos', async (req, res) => {
    const { nombre, tipo, precio, stock } = req.body;
    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO boletos (nombre, tipo, precio, stock) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, tipo || 'Integral', precio, stock || 100]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear boleto' });
    }
});

// PUT - Actualizar boleto
app.put('/boletos/:id', async (req, res) => {
    const { nombre, tipo, precio, stock } = req.body;
    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    try {
        const result = await pool.query(
            'UPDATE boletos SET nombre = $1, tipo = $2, precio = $3, stock = $4 WHERE id = $5 RETURNING *',
            [nombre, tipo || 'Integral', precio, stock || 100, req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Boleto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar boleto' });
    }
});

// DELETE - Eliminar boleto
app.delete('/boletos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM boletos WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Boleto no encontrado' });
        }
        res.json({ mensaje: 'Boleto eliminado', boleto: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar boleto' });
    }
});

module.exports = app;
