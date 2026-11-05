import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('Inventory Tracking and Sales Reporting API', () => {
  const app = createApp();
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;
  let kitchenToken: string;
  let activeMenuItemId: string;
  let createdInventoryItemId: string;

  beforeAll(async () => {
    await runMigrations();
    await seedMockData();

    const db = await getDb();

    // 1. Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_mock', password: 'Admin@Katha2026!' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    // 2. Authenticate Manager
    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'manager_mock', password: 'Manager@Katha2026!' });
    expect(managerLogin.status).toBe(200);
    managerToken = managerLogin.body.token;

    // 3. Authenticate Cashier
    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier_mock', password: 'Cashier@Katha2026!' });
    expect(cashierLogin.status).toBe(200);
    cashierToken = cashierLogin.body.token;

    // 4. Authenticate Kitchen
    const kitchenLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'kitchen_mock', password: 'Kitchen@Katha2026!' });
    expect(kitchenLogin.status).toBe(200);
    kitchenToken = kitchenLogin.body.token;

    // 5. Fetch sample menu item
    const menuRes = await db.query<{ id: string }>('SELECT id FROM menu_items WHERE is_available = TRUE LIMIT 1');
    activeMenuItemId = menuRes.rows[0].id;
  });

  describe('Inventory Items Management (/api/admin/inventory)', () => {
    it('admin creates a new inventory item with initial stock and reorder level', async () => {
      const res = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Amul Gold Milk',
          unit: 'litres',
          initialQuantity: 25,
          reorderLevel: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.item.name).toBe('Amul Gold Milk');
      expect(res.body.item.quantity).toBe(25);
      expect(res.body.item.reorderLevel).toBe(10);
      expect(res.body.item.isLowStock).toBe(false);
      createdInventoryItemId = res.body.item.id;

      // Verify movement recorded
      const db = await getDb();
      const movRes = await db.query(
        'SELECT movement_type, quantity_delta, reason FROM inventory_movements WHERE inventory_item_id = $1',
        [createdInventoryItemId]
      );
      expect(movRes.rows.length).toBe(1);
      expect(movRes.rows[0].movement_type).toBe('PURCHASE');
      expect(Number(movRes.rows[0].quantity_delta)).toBe(25);
    });

    it('rejects duplicate inventory item name with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Amul Gold Milk',
          unit: 'litres',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });

    it('manager records manual stock adjustment (WASTE) and audits reason', async () => {
      const res = await request(app)
        .post(`/api/admin/inventory/${createdInventoryItemId}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          movementType: 'WASTE',
          quantityDelta: -5,
          reason: 'Spilled during morning prep',
        });

      expect(res.status).toBe(200);
      expect(res.body.item.previousQuantity).toBe(25);
      expect(res.body.item.quantity).toBe(20);
      expect(res.body.movement.movementType).toBe('WASTE');
      expect(res.body.movement.quantityDelta).toBe(-5);
      expect(res.body.movement.reason).toBe('Spilled during morning prep');
    });

    it('flags low-stock alert when quantity drops to or below reorder level', async () => {
      // Reorder level is 10, reduce by 11 to reach 9
      const res = await request(app)
        .post(`/api/admin/inventory/${createdInventoryItemId}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          movementType: 'ADJUSTMENT',
          quantityDelta: -11,
          reason: 'Transferred stock to sister branch',
        });

      expect(res.status).toBe(200);
      expect(res.body.item.quantity).toBe(9);
      expect(res.body.item.isLowStock).toBe(true);

      // Verify listing returns lowStockCount
      const listRes = await request(app)
        .get('/api/admin/inventory')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.lowStockCount).toBeGreaterThanOrEqual(1);
    });

    it('rejects stock adjustment that causes negative inventory', async () => {
      const res = await request(app)
        .post(`/api/admin/inventory/${createdInventoryItemId}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          movementType: 'ADJUSTMENT',
          quantityDelta: -50, // Current is 9
          reason: 'Error deduction',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('NegativeStockError');
      expect(res.body.message).toContain('negative stock');
    });

    it('retrieves movement audit history for an inventory item', async () => {
      const res = await request(app)
        .get(`/api/admin/inventory/${createdInventoryItemId}/movements`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(3); // Initial PURCHASE, WASTE, and ADJUSTMENT
      expect(res.body.movements[0].recordedBy).toBeDefined();
    });
  });

  describe('Sales Reports and Reconciliation (/api/admin/reports)', () => {
    let order1TotalInr: number;
    let order2TotalInr: number;

    beforeAll(async () => {
      // 1. Create and settle Order 1 with CASH
      const o1 = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId, quantity: 2 }],
        });
      order1TotalInr = o1.body.totalInr;

      await request(app)
        .post(`/api/pos/orders/${o1.body.orderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: order1TotalInr,
          method: 'CASH',
          idempotencyKey: 'reports-test-cash-pay-1',
        });

      // 2. Create and settle Order 2 with UPI
      const o2 = await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'TAKEAWAY',
          items: [{ menuItemId: activeMenuItemId, quantity: 1 }],
        });
      order2TotalInr = o2.body.totalInr;

      await request(app)
        .post(`/api/pos/orders/${o2.body.orderId}/payments`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          amountInr: order2TotalInr,
          method: 'UPI_AT_COUNTER',
          bankReference: 'UPI-REPORTS-REF-1',
          idempotencyKey: 'reports-test-upi-pay-2',
        });

      // 3. Create Order 3 that remains UNSETTLED (SUBMITTED / ACCEPTED)
      await request(app)
        .post('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          orderType: 'COUNTER',
          items: [{ menuItemId: activeMenuItemId, quantity: 5 }],
        });
    });

    it('generates daily sales summary strictly for settled CLOSED orders with verified payments', async () => {
      const res = await request(app)
        .get('/api/admin/reports/sales/daily')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalSettledOrders).toBeGreaterThanOrEqual(2);
      expect(res.body.summary.totalRevenueInr).toBeGreaterThanOrEqual(order1TotalInr + order2TotalInr);
      expect(res.body.summary.averageOrderValueInr).toBeGreaterThan(0);

      // Verify payment methods breakdown
      expect(res.body.byPaymentMethod.CASH.count).toBeGreaterThanOrEqual(1);
      expect(res.body.byPaymentMethod.CASH.totalInr).toBeGreaterThanOrEqual(order1TotalInr);
      expect(res.body.byPaymentMethod.UPI_AT_COUNTER.count).toBeGreaterThanOrEqual(1);
      expect(res.body.byPaymentMethod.UPI_AT_COUNTER.totalInr).toBeGreaterThanOrEqual(order2TotalInr);

      // Verify order types breakdown
      expect(res.body.byOrderType.COUNTER.count).toBeGreaterThanOrEqual(1);
      expect(res.body.byOrderType.TAKEAWAY.count).toBeGreaterThanOrEqual(1);
    });

    it('generates product mix report with top-selling items', async () => {
      const res = await request(app)
        .get('/api/admin/reports/sales/product-mix')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.productMix[0].name).toBeDefined();
      expect(res.body.productMix[0].quantitySold).toBeGreaterThanOrEqual(1);
      expect(res.body.productMix[0].revenueInr).toBeGreaterThan(0);
    });

    it('generates end-of-day reconciliation report isolating cash vs UPI and unsettled exposure', async () => {
      const res = await request(app)
        .get('/api/admin/reports/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const rec = res.body.reconciliation;
      expect(rec.totalSettledRevenueInr).toBeGreaterThan(0);
      expect(rec.cashDrawerExpectedInr).toBeGreaterThanOrEqual(order1TotalInr);
      expect(rec.upiVerifiedInr).toBeGreaterThanOrEqual(order2TotalInr);
      expect(rec.unsettledOrdersCount).toBeGreaterThanOrEqual(1);
      expect(rec.unsettledExposureInr).toBeGreaterThan(0);
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('cashier cannot create inventory items (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'Coffee Beans', unit: 'kg' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('cashier cannot view executive sales reports (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/reports/sales/daily')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('kitchen role cannot adjust inventory stock (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/admin/inventory/${createdInventoryItemId}/adjust`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ movementType: 'ADJUSTMENT', quantityDelta: 5, reason: 'Kitchen add' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('unauthenticated requests to inventory and reports are rejected (401 Unauthorized)', async () => {
      const invRes = await request(app).get('/api/admin/inventory');
      expect(invRes.status).toBe(401);

      const repRes = await request(app).get('/api/admin/reports/sales/daily');
      expect(repRes.status).toBe(401);
    });
  });
});
