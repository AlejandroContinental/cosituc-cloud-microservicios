const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'usuarios' });
});

// GET - Consultar todos los usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar usuarios' });
    }
});

// GET - Consultar usuario por ID
app.get('/usuarios/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar usuario' });
    }
});

// POST - Crear nuevo usuario
app.post('/usuarios', async (req, res) => {
    const { nombre, email, rol } = req.body;
    if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, rol) VALUES ($1, $2, $3) RETURNING *',
            [nombre, email, rol || 'Turista']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// PUT - Actualizar usuario
app.put('/usuarios/:id', async (req, res) => {
    const { nombre, email, rol } = req.body;
    if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    try {
        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, email = $2, rol = $3 WHERE id = $4 RETURNING *',
            [nombre, email, rol || 'Turista', req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// DELETE - Eliminar usuario
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: 'Usuario eliminado', usuario: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = app;

