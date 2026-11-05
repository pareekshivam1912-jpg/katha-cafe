import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('Counter Payment Recording and Reconciliation API', () => {
  const app = createApp();
  let cashierToken: string;
  let kitchenToken: string;
  let activeMenuItemId: string;
  let sampleOrderId: string;
  let sampleOrderTotalInr: number;

  beforeAll(async () => {
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

    // 3. Fetch sample menu item
    const menuRes = await db.query<{ id: string; price_paise: string }>(
      'SELECT id, price_paise FROM menu_items WHERE is_available = TRUE LIMIT 1'
    );
    activeMenuItemId = menuRes.rows[0].id;

    // 4. Create sample POS order for payment testing
    const orderRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        orderType: 'COUNTER',
        items: [{ menuItemId: activeMenuItemId, quantity: 2 }],
      });
    expect(orderRes.status).toBe(201);
    sampleOrderId = orderRes.body.orderId;
    sampleOrderTotalInr = orderRes.body.totalInr;
  });

  describe('Counter Payment Settlement (POST /api/pos/orders/:id/payments)', () => {
    it('records a successful CASH payment and sets status to CLOSED', async () => {
      const idempotencyKey = 'pay-cash-test-10001';

      const res = await request(app)
        .post(`/api/pos/orders/${sampleOrderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: sampleOrderTotalInr,
          method: 'CASH',
          idempotencyKey,
          notes: 'Customer paid in cash at counter',
        });

      expect(res.status).toBe(201);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.status).toBe('PAID');
      expect(res.body.method).toBe('CASH');
      expect(res.body.amountInr).toBe(sampleOrderTotalInr);
      expect(res.body.verifiedBy).toBe('[MOCK] Counter Cashier');

      // Verify order is now CLOSED
      const db = await getDb();
      const order = (await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [sampleOrderId])).rows[0];
      expect(order.status).toBe('CLOSED');

      // Verify audit history
      const history = await db.query(
        "SELECT to_status, reason FROM order_status_history WHERE order_id = $1 AND to_status = 'CLOSED'",
        [sampleOrderId]
      );
      expect(history.rows.length).toBeGreaterThan(0);
      expect(history.rows[0].reason).toContain('Settled via CASH');
    });

    it('returns existing payment when retried with identical idempotency key (idempotency recovery)', async () => {
      const idempotencyKey = 'pay-cash-test-10001';

      const retryRes = await request(app)
        .post(`/api/pos/orders/${sampleOrderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: sampleOrderTotalInr,
          method: 'CASH',
          idempotencyKey,
        });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.isExisting).toBe(true);
      expect(retryRes.body.status).toBe('PAID');
      expect(retryRes.body.method).toBe('CASH');
    });

    it('rejects a second payment on an already settled order with 409 Conflict', async () => {
      const secondKey = 'pay-cash-second-attempt-20002';

      const secondRes = await request(app)
        .post(`/api/pos/orders/${sampleOrderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: sampleOrderTotalInr,
          method: 'CASH',
          idempotencyKey: secondKey,
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error).toBe('OrderAlreadyPaid');
      expect(secondRes.body.message).toContain('already been settled');
    });

    it('rejects underpayment with 400 Bad Request', async () => {
      // Create new order
      const newOrder = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId, quantity: 2 }],
        });

      const orderId = newOrder.body.orderId;
      const totalInr = newOrder.body.totalInr;

      const underpayRes = await request(app)
        .post(`/api/pos/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: totalInr - 10, // Underpaying by ₹10
          method: 'CASH',
          idempotencyKey: 'pay-underpay-test-30003',
        });

      expect(underpayRes.status).toBe(400);
      expect(underpayRes.body.error).toBe('Underpayment');
    });

    it('records UPI_AT_COUNTER payment with bank reference number', async () => {
      // Create new order
      const newOrder = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'TAKEAWAY',
          items: [{ menuItemId: activeMenuItemId, quantity: 1 }],
        });

      const orderId = newOrder.body.orderId;
      const totalInr = newOrder.body.totalInr;

      const upiRes = await request(app)
        .post(`/api/pos/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: totalInr,
          method: 'UPI_AT_COUNTER',
          bankReference: 'UPI-REF-9876543210',
          idempotencyKey: 'pay-upi-test-40004',
        });

      expect(upiRes.status).toBe(201);
      expect(upiRes.body.method).toBe('UPI_AT_COUNTER');
      expect(upiRes.body.bankReference).toBe('UPI-REF-9876543210');
      expect(upiRes.body.status).toBe('PAID');
    });
  });

  describe('Race Condition and Database Partial Unique Constraint Enforcement', () => {
    it('prevents two concurrent tabs from paying the same order (at most ONE succeeds, second gets 409)', async () => {
      // Create new order
      const newOrder = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId, quantity: 1 }],
        });

      const orderId = newOrder.body.orderId;
      const totalInr = newOrder.body.totalInr;

      // Two concurrent payment attempts with different idempotency keys simulating two staff tabs
      const [attempt1, attempt2] = await Promise.all([
        request(app)
          .post(`/api/pos/orders/${orderId}/payments`)
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({
            amountInr: totalInr,
            method: 'CASH',
            idempotencyKey: 'tab-1-key-race-condition-1',
          }),
        request(app)
          .post(`/api/pos/orders/${orderId}/payments`)
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({
            amountInr: totalInr,
            method: 'CASH',
            idempotencyKey: 'tab-2-key-race-condition-2',
          }),
      ]);

      const statuses = [attempt1.status, attempt2.status].sort();
      // Exactly ONE succeeds (201), the other is rejected (409)
      expect(statuses).toEqual([201, 409]);

      // Verify database contains exactly ONE payment for this order
      const db = await getDb();
      const payments = await db.query('SELECT id, status FROM payments WHERE order_id = $1', [orderId]);
      expect(payments.rows.length).toBe(1);
      expect(payments.rows[0].status).toBe('PAID');
    });
  });

  describe('Payment Querying and RBAC Authorization', () => {
    it('retrieves payment history for an order in GET /api/pos/orders/:id/payments', async () => {
      const res = await request(app)
        .get(`/api/pos/orders/${sampleOrderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orderId).toBe(sampleOrderId);
      expect(res.body.payments.length).toBeGreaterThan(0);
      expect(res.body.payments[0].method).toBe('CASH');
      expect(res.body.payments[0].status).toBe('PAID');
    });

    it('cashier lists settled payments in GET /api/pos/payments with total calculation', async () => {
      const res = await request(app)
        .get('/api/pos/payments')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.totalSettledInr).toBeGreaterThan(0);
      expect(res.body.payments[0].orderNumber).toBeDefined();
    });

    it('kitchen role cannot record payments (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/pos/orders/${sampleOrderId}/payments`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({
          amountInr: 100,
          method: 'CASH',
          idempotencyKey: 'kitchen-forbidden-key-1',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('unauthenticated request to record payments is rejected (401 Unauthorized)', async () => {
      const res = await request(app)
        .post(`/api/pos/orders/${sampleOrderId}/payments`)
        .send({
          amountInr: 100,
          method: 'CASH',
          idempotencyKey: 'unauth-key-1',
        });

      expect(res.status).toBe(401);
    });
  });
});
