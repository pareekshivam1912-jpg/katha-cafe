import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Health and Base Routes', () => {
  const app = createApp();

  it('GET /api/health should return 200 OK with healthy status payload', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'katha-cafe-api');
    expect(res.body).toHaveProperty('version', '0.1.0');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('GET /api/health should return security headers and omit x-powered-by', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('GET /api/nonexistent should return 404 Not Found', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not Found');
  });
});
