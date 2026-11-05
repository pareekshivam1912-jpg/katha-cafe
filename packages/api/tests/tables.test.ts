import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('Table QR Resolution, Sessions, and Customer Identification', () => {
  const app = createApp();
  let adminToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    const db = await getDb();
    await runMigrations(db);
    await seedMockData(db);

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_mock', password: 'Admin@Katha2026!' });
    adminToken = adminLogin.body.token;

    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier_mock', password: 'Cashier@Katha2026!' });
    cashierToken = cashierLogin.body.token;
  });

  it('Admin can create a table with opaque QR token and QR data URL', async () => {
    const res = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Garden Table 7' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.token.length).toBe(64); // 32-byte hex string
    expect(res.body).toHaveProperty('qrDataUrl');
    expect(res.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.table.table_label).toBe('Garden Table 7');
  });

  it('Customer resolves valid opaque QR token (T-01 negative check & positive resolution)', async () => {
    // 1. Create table
    const createRes = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Balcony 3' });
    const opaqueToken = createRes.body.token;

    // 2. Resolve token
    const resolveRes = await request(app).get(`/api/tables/resolve/${opaqueToken}`);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body).toHaveProperty('valid', true);
    expect(resolveRes.body).toHaveProperty('tableLabel', 'Balcony 3');
    expect(resolveRes.body).toHaveProperty('sessionId');
    // Security check: ensure raw DB id and token hash are not exposed
    expect(resolveRes.body).not.toHaveProperty('qr_token_hash');
    expect(resolveRes.body).not.toHaveProperty('table_id');
  });

  it('T-01: Rejects invalid or tampered QR token with 404', async () => {
    const res = await request(app).get('/api/tables/resolve/random_tampered_nonexistent_token_9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('TableUnavailable');
    expect(res.body.message).toContain('unavailable');
  });

  it('Customer identification requires valid name and 10-digit Indian mobile (T-02)', async () => {
    // Resolve session
    const createRes = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Corner 1' });
    const resolveRes = await request(app).get(`/api/tables/resolve/${createRes.body.token}`);
    const sessionId = resolveRes.body.sessionId;

    // Test T-02: Invalid mobile (e.g. 12345 or non-Indian prefix)
    const invalidMobileRes = await request(app)
      .post('/api/table-sessions/identify-customer')
      .send({
        sessionId,
        fullName: 'Rahul Verma',
        mobile: '1234567890', // Does not start with 6,7,8,9
      });
    expect(invalidMobileRes.status).toBe(400);
    expect(invalidMobileRes.body.error).toBe('BadRequest');

    // Test: Missing name
    const missingNameRes = await request(app)
      .post('/api/table-sessions/identify-customer')
      .send({
        sessionId,
        fullName: ' ',
        mobile: '9876543210',
      });
    expect(missingNameRes.status).toBe(400);

    // Test: Valid Indian mobile number
    const validRes = await request(app)
      .post('/api/table-sessions/identify-customer')
      .send({
        sessionId,
        fullName: 'Rahul Verma',
        mobile: '9876543210',
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.customer.fullName).toBe('Rahul Verma');
    expect(validRes.body.customer.mobileE164).toBe('+919876543210');
  });

  it('Rejects customer identification if table session is CLOSED', async () => {
    // Create table and get session
    const createRes = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Booth 4' });
    const tableId = createRes.body.table.id;
    const token = createRes.body.token;

    const resolveRes = await request(app).get(`/api/tables/resolve/${token}`);
    const sessionId = resolveRes.body.sessionId;

    // Cashier closes session
    const closeRes = await request(app)
      .post(`/api/admin/tables/${tableId}/close-session`)
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.session.status).toBe('CLOSED');

    // Attempting customer identification on closed session must fail
    const identRes = await request(app)
      .post('/api/table-sessions/identify-customer')
      .send({
        sessionId,
        fullName: 'Sneha Patel',
        mobile: '9829012345',
      });
    expect(identRes.status).toBe(400);
    expect(identRes.body.error).toBe('SessionClosed');
  });
});
