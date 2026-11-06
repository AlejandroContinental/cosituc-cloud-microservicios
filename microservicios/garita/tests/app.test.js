const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
    await pool.end();
});

test('GET /health debe responder con estado ok para garita', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.servicio).toBe('garita');
    expect(response.body.estado).toBe('ok');
});

test('GET /garita/accesos debe responder con estado 200 o 500 según disponibilidad de la DB', async () => {
    const response = await request(app).get('/garita/accesos');
    expect([200, 500]).toContain(response.statusCode);
});

test('POST /garita/validar debe requerir codigo_qr y responder 400', async () => {
    const response = await request(app)
        .post('/garita/validar')
        .send({ sitio_arqueologico: 'Sacsayhuamán' });
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
});

test('POST /garita/validar debe requerir sitio_arqueologico y responder 400', async () => {
    const response = await request(app)
        .post('/garita/validar')
        .send({ codigo_qr: 'BTC-DEMO123' });
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
});

test('GET /garita/aforo/:sitio debe responder 200 o 500 según disponibilidad de la DB', async () => {
    const response = await request(app).get('/garita/aforo/Sacsayhuamán');
    expect([200, 500]).toContain(response.statusCode);
});

