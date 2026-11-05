import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';
import crypto from 'node:crypto';

describe('POS Terminal and Kitchen Display System (KDS) API', () => {
  const app = createApp();
  let cashierToken: string;
  let kitchenToken: string;
  let adminToken: string;
  let testTableId: string;
  let testTableToken: string;
  let activeMenuItemId1: string;
  let activeMenuItemId2: string;
  let unavailableMenuItemId: string;

  beforeAll(async () => {
    // Run database migrations and seed data
    await runMigrations();
    await seedMockData();

    const db = await getDb();

    // 1. Authenticate Cashier
    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier_mock', password: 'Cashier@Katha2026!' });
    expect(cashierLogin.status).toBe(200);
    cashierToken = cashierLogin.body.token;

    // 2. Authenticate Kitchen
    const kitchenLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'kitchen_mock', password: 'Kitchen@Katha2026!' });
    expect(kitchenLogin.status).toBe(200);
    kitchenToken = kitchenLogin.body.token;

    // 3. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_mock', password: 'Admin@Katha2026!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    // 4. Setup a test table with QR token
    const tableRes = await db.query<{ id: string }>('SELECT id FROM restaurant_tables LIMIT 1');
    testTableId = tableRes.rows[0].id;
    testTableToken = crypto.randomBytes(32).toString('hex');
    const tableTokenHash = crypto.createHash('sha256').update(testTableToken).digest('hex');
    await db.query('UPDATE restaurant_tables SET qr_token_hash = $1, is_active = TRUE WHERE id = $2', [
      tableTokenHash,
      testTableId,
    ]);

    // 5. Fetch menu items for testing
    const menuRes = await db.query<{ id: string; name: string; price_paise: string }>(
      'SELECT id, name, price_paise FROM menu_items WHERE is_available = TRUE LIMIT 2'
    );
    activeMenuItemId1 = menuRes.rows[0].id;
    activeMenuItemId2 = menuRes.rows[1].id;

    // Create an unavailable item
    const unavailRes = await db.query<{ id: string }>(
      "INSERT INTO menu_items (category_id, name, price_paise, is_available) VALUES ((SELECT id FROM menu_categories LIMIT 1), 'Sold Out Pasta', 15000, FALSE) RETURNING id"
    );
    unavailableMenuItemId = unavailRes.rows[0].id;
  });

  describe('Staff POS Order Creation (POST /api/pos/orders)', () => {
    it('creates a COUNTER order with server recalculation and starts as ACCEPTED', async () => {
      const db = await getDb();
      const item1 = (await db.query<{ price_paise: string }>('SELECT price_paise FROM menu_items WHERE id = $1', [activeMenuItemId1])).rows[0];
      const item2 = (await db.query<{ price_paise: string }>('SELECT price_paise FROM menu_items WHERE id = $1', [activeMenuItemId2])).rows[0];

      const expectedSubtotalPaise = BigInt(item1.price_paise) * 2n + BigInt(item2.price_paise) * 1n;
      const expectedTotalInr = Number(expectedSubtotalPaise) / 100;

      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          customerName: 'Anil Gupta',
          customerMobile: '9829012345',
          items: [
            { menuItemId: activeMenuItemId1, quantity: 2, notes: 'Less sugar' },
            { menuItemId: activeMenuItemId2, quantity: 1 },
          ],
          notes: 'Customer paying at counter',
        });

      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toMatch(/^POS-\d{8}-\d{4}$/);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.orderType).toBe('COUNTER');
      expect(res.body.totalInr).toBe(expectedTotalInr);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.publicStatusToken).toBeDefined();

      // Verify status history
      const history = await db.query(
        'SELECT to_status, reason FROM order_status_history WHERE order_id = $1',
        [res.body.orderId]
      );
      expect(history.rows.length).toBeGreaterThan(0);
      expect(history.rows[0].to_status).toBe('ACCEPTED');
    });

    it('creates a DINE_IN order and links/creates a table session', async () => {
      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'DINE_IN',
          tableId: testTableId,
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.orderType).toBe('DINE_IN');

      const db = await getDb();
      const orderDb = (await db.query<{ table_session_id: string }>(
        'SELECT table_session_id FROM orders WHERE id = $1',
        [res.body.orderId]
      )).rows[0];
      expect(orderDb.table_session_id).toBeDefined();
    });

    it('rejects order with unavailable menu items', async () => {
      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'TAKEAWAY',
          items: [{ menuItemId: unavailableMenuItemId, quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BadRequest');
      expect(res.body.message).toContain('currently unavailable');
    });

    it('recovers existing order when same idempotency key is submitted', async () => {
      const idempotencyKey = 'pos-idem-test-12345';

      const first = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          idempotencyKey,
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });
      expect(first.status).toBe(201);

      const retry = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          idempotencyKey,
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });

      expect(retry.status).toBe(200);
      expect(retry.body.isExisting).toBe(true);
      expect(retry.body.orderNumber).toBe(first.body.orderNumber);
    });
  });

  describe('Cashier QR Order Queue Review (GET / POST accept / POST reject)', () => {
    let pendingOrderId: string;

    beforeAll(async () => {
      // 1. Resolve table session
      const resolveRes = await request(app).get(`/api/tables/resolve/${testTableToken}`);
      const sessionId = resolveRes.body.sessionId;

      // 2. Customer identifies
      const idRes = await request(app)
        .post('/api/table-sessions/identify-customer')
        .send({
          sessionId,
          fullName: 'Priya Sharma',
          mobile: '9829098765',
        });
      expect(idRes.status).toBe(200);
      const customerId = idRes.body.customer.id;

      // 3. Customer submits QR order
      const orderRes = await request(app)
        .post('/api/orders')
        .send({
          sessionId,
          customerId,
          idempotencyKey: 'qr-pending-review-test-1',
          items: [{ menuItemId: activeMenuItemId1, quantity: 2, notes: 'Spicy' }],
          notes: 'Customer QR table order',
        });
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.status).toBe('SUBMITTED');

      const db = await getDb();
      const dbRow = (await db.query<{ id: string }>('SELECT id FROM orders WHERE order_number = $1', [orderRes.body.orderNumber])).rows[0];
      pendingOrderId = dbRow.id;
    });

    it('cashier lists pending QR orders in GET /api/pos/orders/pending', async () => {
      const res = await request(app)
        .get('/api/pos/orders/pending')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      const target = res.body.orders.find((o: any) => o.id === pendingOrderId);
      expect(target).toBeDefined();
      expect(target.status).toBe('SUBMITTED');
      expect(target.customerName).toBe('Priya Sharma');
      expect(target.items[0].notes).toBe('Spicy');
    });

    it('cashier accepts pending QR order into kitchen queue', async () => {
      const res = await request(app)
        .post(`/api/pos/orders/${pendingOrderId}/accept`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');

      // Verify it is no longer in pending list
      const pendingList = await request(app)
        .get('/api/pos/orders/pending')
        .set('Authorization', `Bearer ${cashierToken}`);
      const stillPending = pendingList.body.orders.find((o: any) => o.id === pendingOrderId);
      expect(stillPending).toBeUndefined();

      // Verify audit history
      const db = await getDb();
      const history = await db.query(
        "SELECT from_status, to_status, reason FROM order_status_history WHERE order_id = $1 AND to_status = 'ACCEPTED'",
        [pendingOrderId]
      );
      expect(history.rows.length).toBeGreaterThan(0);
      expect(history.rows[0].from_status).toBe('SUBMITTED');
    });

    it('cashier rejects a pending QR order with mandatory reason', async () => {
      const db = await getDb();
      // Create another submitted order
      const sessionRes = (await db.query<{ id: string }>('SELECT id FROM table_sessions LIMIT 1')).rows[0];
      const custRes = (await db.query<{ id: string }>('SELECT id FROM customers LIMIT 1')).rows[0];

      const newOrder = await request(app)
        .post('/api/orders')
        .send({
          sessionId: sessionRes.id,
          customerId: custRes.id,
          idempotencyKey: 'qr-to-reject-12345',
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });

      const orderId = (await db.query<{ id: string }>('SELECT id FROM orders WHERE order_number = $1', [newOrder.body.orderNumber])).rows[0].id;

      // Reject without reason fails
      const noReason = await request(app)
        .post(`/api/pos/orders/${orderId}/reject`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({});
      expect(noReason.status).toBe(400);

      // Reject with reason succeeds
      const res = await request(app)
        .post(`/api/pos/orders/${orderId}/reject`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ reason: 'Kitchen closed for shift change' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
      expect(res.body.reason).toBe('Kitchen closed for shift change');

      // Verify audit history
      const hist = (await db.query<{ from_status: string; to_status: string; reason: string }>(
        'SELECT from_status, to_status, reason FROM order_status_history WHERE order_id = $1 AND to_status = $2',
        [orderId, 'REJECTED']
      )).rows[0];
      expect(hist.from_status).toBe('SUBMITTED');
      expect(hist.reason).toBe('Kitchen closed for shift change');
    });
  });

  describe('Kitchen Display System Queue and Progression (GET / PATCH status)', () => {
    let kdsOrderId: string;

    beforeAll(async () => {
      // Create an order directly accepted via POS
      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId1, quantity: 2, notes: 'Extra crispy' }],
        });
      kdsOrderId = res.body.orderId;
    });

    it('kitchen role retrieves active tickets in GET /api/kds/orders (prices excluded)', async () => {
      const res = await request(app)
        .get('/api/kds/orders')
        .set('Authorization', `Bearer ${kitchenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);

      const ticket = res.body.orders.find((t: any) => t.id === kdsOrderId);
      expect(ticket).toBeDefined();
      expect(ticket.status).toBe('ACCEPTED');
      expect(ticket.items[0].name).toBeDefined();
      expect(ticket.items[0].quantity).toBe(2);
      expect(ticket.items[0].notes).toBe('Extra crispy');
      // Verify no financial unit price or total leaked in kitchen payload
      expect((ticket.items[0] as any).unitPriceInr).toBeUndefined();
      expect((ticket as any).totalInr).toBeUndefined();
      expect(ticket.elapsedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('kitchen transitions order through lifecycle: ACCEPTED -> PREPARING -> READY -> SERVED', async () => {
      // 1. ACCEPTED -> PREPARING
      const step1 = await request(app)
        .patch(`/api/kds/orders/${kdsOrderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'PREPARING' });
      expect(step1.status).toBe(200);
      expect(step1.body.status).toBe('PREPARING');

      // 2. PREPARING -> READY
      const step2 = await request(app)
        .patch(`/api/kds/orders/${kdsOrderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'READY' });
      expect(step2.status).toBe(200);
      expect(step2.body.status).toBe('READY');

      // 3. READY -> SERVED
      const step3 = await request(app)
        .patch(`/api/kds/orders/${kdsOrderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'SERVED' });
      expect(step3.status).toBe(200);
      expect(step3.body.status).toBe('SERVED');

      // 4. SERVED orders are removed from active KDS queue
      const activeQueue = await request(app)
        .get('/api/kds/orders')
        .set('Authorization', `Bearer ${kitchenToken}`);
      const servedTicket = activeQueue.body.orders.find((t: any) => t.id === kdsOrderId);
      expect(servedTicket).toBeUndefined();
    });

    it('rejects invalid state jumps (e.g. ACCEPTED directly to SERVED)', async () => {
      // Create new accepted order
      const newOrder = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'TAKEAWAY',
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });

      const orderId = newOrder.body.orderId;

      // Attempt invalid jump
      const badJump = await request(app)
        .patch(`/api/kds/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'SERVED' });

      expect(badJump.status).toBe(400);
      expect(badJump.body.error).toBe('InvalidTransition');
      expect(badJump.body.message).toContain("Cannot transition order from 'ACCEPTED' to 'SERVED'");
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('kitchen role cannot create POS orders (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId1, quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('kitchen role cannot view pending review queue (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/pos/orders/pending')
        .set('Authorization', `Bearer ${kitchenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('unauthenticated request to POS or KDS is rejected (401 Unauthorized)', async () => {
      const posRes = await request(app).get('/api/pos/orders/pending');
      expect(posRes.status).toBe(401);

      const kdsRes = await request(app).get('/api/kds/orders');
      expect(kdsRes.status).toBe(401);
    });

    it('admin has access to both POS and KDS', async () => {
      const posRes = await request(app)
        .get('/api/pos/orders/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(posRes.status).toBe(200);

      const kdsRes = await request(app)
        .get('/api/kds/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(kdsRes.status).toBe(200);
    });
  });
});
