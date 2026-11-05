import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('QR Ordering and Order Lifecycle API', () => {
  const app = createApp();
  let adminToken: string;
  let sessionId: string;
  let customerId: string;
  let bunMaskaId: string;
  let garlicBreadId: string;

  beforeAll(async () => {
    const db = await getDb();
    await runMigrations(db);
    await seedMockData(db);

    // Login admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_mock', password: 'Admin@Katha2026!' });
    adminToken = adminLogin.body.token;

    // Create table and resolve session
    const tableRes = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Main Dining 1' });
    const token = tableRes.body.token;

    const resolveRes = await request(app).get(`/api/tables/resolve/${token}`);
    sessionId = resolveRes.body.sessionId;

    // Identify customer
    const identRes = await request(app)
      .post('/api/table-sessions/identify-customer')
      .send({
        sessionId,
        fullName: 'Vikram Meena',
        mobile: '9828012345',
      });
    customerId = identRes.body.customer.id;

    // Find menu item IDs
    const menuRes = await request(app).get('/api/menu');
    const breadsCat = menuRes.body.categories.find((c: any) => c.name === 'Breads');
    bunMaskaId = breadsCat.items.find((i: any) => i.name === 'Bun Maska').id;

    const garlicCat = menuRes.body.categories.find((c: any) => c.name === 'Garlic Bread');
    garlicBreadId = garlicCat.items.find((i: any) => i.name === 'Cheese Garlic Bread').id;
  });

  it('Server recalculates prices and creates order transactionally', async () => {
    const idempotencyKey = 'test-idemp-key-order-1';

    const res = await request(app)
      .post('/api/orders')
      .send({
        sessionId,
        customerId,
        idempotencyKey,
        items: [
          { menuItemId: bunMaskaId, quantity: 2, notes: 'Extra butter' }, // 2 * 35 = 70
          { menuItemId: garlicBreadId, quantity: 1 }, // 1 * 90 = 90
        ],
        notes: 'Less spicy please',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('orderNumber');
    expect(res.body.orderNumber).toMatch(/^KC-\d{8}-\d{4}$/);
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.totalInr).toBe(160); // 70 + 90 = 160
    expect(res.body.subtotalInr).toBe(160);
    expect(res.body).toHaveProperty('publicStatusToken');
    expect(res.body.items.length).toBe(2);
  });

  it('T-04: Double submit with same idempotency key returns existing order without duplication', async () => {
    const idempotencyKey = 'test-idemp-double-submit-key';

    // First submit
    const res1 = await request(app)
      .post('/api/orders')
      .send({
        sessionId,
        customerId,
        idempotencyKey,
        items: [{ menuItemId: bunMaskaId, quantity: 1 }],
      });
    expect(res1.status).toBe(201);
    const orderNumber1 = res1.body.orderNumber;

    // Second submit (same key)
    const res2 = await request(app)
      .post('/api/orders')
      .send({
        sessionId,
        customerId,
        idempotencyKey,
        items: [{ menuItemId: bunMaskaId, quantity: 1 }],
      });

    expect(res2.status).toBe(200);
    expect(res2.body.isExisting).toBe(true);
    expect(res2.body.orderNumber).toBe(orderNumber1);

    // Verify only ONE order exists in database with this key
    const db = await getDb();
    const countRes = await db.query(
      'SELECT COUNT(*) AS count FROM orders WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    expect(Number(countRes.rows[0].count)).toBe(1);
  });

  it('T-03: Server rejects order submission if an item is marked unavailable', async () => {
    // Admin marks Cheese Garlic Bread unavailable
    await request(app)
      .patch(`/api/admin/menu/items/${garlicBreadId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false });

    // Customer attempts to order unavailable item
    const res = await request(app)
      .post('/api/orders')
      .send({
        sessionId,
        customerId,
        idempotencyKey: 'test-unavailable-item-key',
        items: [{ menuItemId: garlicBreadId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ItemUnavailable');
    expect(res.body.message).toContain('unavailable');

    // Restore item availability
    await request(app)
      .patch(`/api/admin/menu/items/${garlicBreadId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: true });
  });

  it('T-05: Status lookup recovers order details and timeline using public token', async () => {
    const submitRes = await request(app)
      .post('/api/orders')
      .send({
        sessionId,
        customerId,
        idempotencyKey: 'test-status-lookup-key',
        items: [{ menuItemId: bunMaskaId, quantity: 1 }],
      });
    const publicToken = submitRes.body.publicStatusToken;
    const orderNumber = submitRes.body.orderNumber;

    // Lookup status
    const statusRes = await request(app).get(`/api/orders/${publicToken}/status`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.orderNumber).toBe(orderNumber);
    expect(statusRes.body.status).toBe('SUBMITTED');
    expect(statusRes.body.tableLabel).toBe('Main Dining 1');
    expect(statusRes.body.items[0].name).toBe('Bun Maska');
    expect(statusRes.body.timeline.length).toBeGreaterThanOrEqual(1);
    expect(statusRes.body.timeline[0].status).toBe('SUBMITTED');
  });

  it('Status lookup rejects invalid public status token with 404', async () => {
    const res = await request(app).get('/api/orders/invalid_nonexistent_token_12345/status');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('OrderNotFound');
  });

  it('Rejects order submission if session is closed', async () => {
    // Create new table and close its session
    const tableRes = await request(app)
      .post('/api/admin/tables')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableLabel: 'Closing Table' });
    const tableId = tableRes.body.table.id;
    const token = tableRes.body.token;

    const resolveRes = await request(app).get(`/api/tables/resolve/${token}`);
    const closedSessionId = resolveRes.body.sessionId;

    await request(app)
      .post(`/api/admin/tables/${tableId}/close-session`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Attempt order submit
    const res = await request(app)
      .post('/api/orders')
      .send({
        sessionId: closedSessionId,
        customerId,
        idempotencyKey: 'test-closed-session-order',
        items: [{ menuItemId: bunMaskaId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SessionClosed');
  });
});
