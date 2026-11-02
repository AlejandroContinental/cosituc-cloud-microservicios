const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
    await pool.end();
});

test('GET /health debe responder correctamente en boletos', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.servicio).toBe('boletos');
});

test('GET /boletos debe responder con estado 200 o 500 según la DB', async () => {
    const response = await request(app).get('/boletos');
    expect([200, 500]).toContain(response.statusCode);
});
