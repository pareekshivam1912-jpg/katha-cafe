import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('Staff Authentication and Role Authorization API', () => {
  const app = createApp();

  beforeAll(async () => {
    const db = await getDb();
    await runMigrations(db);
    await seedMockData(db);

    // Create an inactive staff user for test
    await db.query(`
      INSERT INTO staff_users (full_name, username, password_hash, role, is_active)
      VALUES ('[MOCK] Inactive Cashier', 'inactive_mock', 'scrypt$dummy$dummy', 'CASHIER', FALSE)
      ON CONFLICT (username) DO NOTHING;
    `);
  });

  it('POST /api/auth/login should authenticate admin_mock with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin_mock',
        password: 'Admin@Katha2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: 'admin_mock',
      role: 'ADMIN',
      fullName: '[MOCK] Cafe Administrator',
    });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('katha_session=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('POST /api/auth/login should reject incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin_mock',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  it('POST /api/auth/login should reject non-existent user with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent_user',
        password: 'SomePassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  it('POST /api/auth/login should reject deactivated user with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'inactive_mock',
        password: 'AnyPassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('deactivated');
  });

  it('GET /api/auth/me should return 401 when no session is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('GET /api/auth/me should return authenticated staff profile with Bearer token', async () => {
    // Login as manager
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'manager_mock',
        password: 'Manager@Katha2026!',
      });
    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toMatchObject({
      username: 'manager_mock',
      role: 'MANAGER',
      fullName: '[MOCK] Floor Manager',
    });
  });

  it('Enforces RBAC: Cashier cannot access Admin routes (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'cashier_mock',
        password: 'Cashier@Katha2026!',
      });
    const cashierToken = loginRes.body.token;

    const adminRouteRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(adminRouteRes.status).toBe(403);
    expect(adminRouteRes.body.error).toBe('Forbidden');
  });

  it('Enforces RBAC: Cashier can access POS routes (200 OK)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'cashier_mock',
        password: 'Cashier@Katha2026!',
      });
    const cashierToken = loginRes.body.token;

    const posRouteRes = await request(app)
      .get('/api/pos/orders')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(posRouteRes.status).toBe(200);
    expect(posRouteRes.body.access).toBe('granted');
  });

  it('Enforces RBAC: Kitchen staff cannot access POS billing routes (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'kitchen_mock',
        password: 'Kitchen@Katha2026!',
      });
    const kitchenToken = loginRes.body.token;

    const posRouteRes = await request(app)
      .get('/api/pos/orders')
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(posRouteRes.status).toBe(403);
    expect(posRouteRes.body.error).toBe('Forbidden');
  });

  it('Enforces RBAC: Kitchen staff can access Kitchen ticket routes (200 OK)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'kitchen_mock',
        password: 'Kitchen@Katha2026!',
      });
    const kitchenToken = loginRes.body.token;

    const kitchenRouteRes = await request(app)
      .get('/api/kitchen/tickets')
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(kitchenRouteRes.status).toBe(200);
    expect(kitchenRouteRes.body.access).toBe('granted');
  });

  it('POST /api/auth/logout should clear session cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Logged out successfully');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('katha_session=;');
  });
});
