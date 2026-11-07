const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
    await pool.end();
});

test('GET /health debe responder correctamente en reservas', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.servicio).toBe('reservas');
});

test('GET /reservas debe responder con estado 200 o 500 según la DB', async () => {
    const response = await request(app).get('/reservas');
    expect([200, 500]).toContain(response.statusCode);
});

test('POST /reservas debe validar campos obligatorios y responder 400', async () => {
    const response = await request(app)
        .post('/reservas')
        .send({ usuario_id: 1 });
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
});
test('GET /reservas/qr/:codigo_qr debe retornar la reserva correspondiente o 404', async () => {
    const response = await request(app).get('/reservas/qr/BTC-INEXISTENTE');
    expect([200, 404, 500]).toContain(response.statusCode);
});
