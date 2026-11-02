const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
    await pool.end();
});

test('GET /health debe responder correctamente', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.servicio).toBe('usuarios');
});

test('GET /usuarios debe responder con estado 200 o 500 según conexión DB', async () => {
    const response = await request(app).get('/usuarios');
    expect([200, 500]).toContain(response.statusCode);
});

