import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

describe('Menu Public API and Administration', () => {
  const app = createApp();
  let adminToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    const db = await getDb();
    await runMigrations(db);
    await seedMockData(db);

    // Login admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_mock', password: 'Admin@Katha2026!' });
    adminToken = adminLogin.body.token;

    // Login cashier
    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'cashier_mock', password: 'Cashier@Katha2026!' });
    cashierToken = cashierLogin.body.token;
  });

  it('GET /api/menu should return all 23 active categories with canonical prices', async () => {
    const res = await request(app).get('/api/menu');

    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBe(23);
    expect(res.body.totalItems).toBeGreaterThan(60);

    // Find Cheese Garlic Bread and check canonical price (₹90 = 9000 paise)
    const garlicBreadCat = res.body.categories.find((c: any) => c.name === 'Garlic Bread');
    expect(garlicBreadCat).toBeDefined();

    const cheeseGarlicBread = garlicBreadCat.items.find((i: any) => i.name === 'Cheese Garlic Bread');
    expect(cheeseGarlicBread).toBeDefined();
    expect(cheeseGarlicBread.pricePaise).toBe(9000);
    expect(cheeseGarlicBread.priceInr).toBe(90);

    // Check Bun Maska
    const breadsCat = res.body.categories.find((c: any) => c.name === 'Breads');
    const bunMaska = breadsCat.items.find((i: any) => i.name === 'Bun Maska');
    expect(bunMaska.pricePaise).toBe(3500);
    expect(bunMaska.priceInr).toBe(35);
  });

  it('GET /api/menu/categories should list active categories in display order', async () => {
    const res = await request(app).get('/api/menu/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories[0].name).toBe('Snacks');
  });

  it('Allows Admin/Manager to toggle item availability, excluding it from public menu', async () => {
    // Get Bun Maska ID
    const menuRes = await request(app).get('/api/menu');
    const breadsCat = menuRes.body.categories.find((c: any) => c.name === 'Breads');
    const bunMaska = breadsCat.items.find((i: any) => i.name === 'Bun Maska');

    // Toggle to unavailable
    const patchRes = await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.item.is_available).toBe(false);

    // Verify public menu now excludes Bun Maska
    const publicMenuAfter = await request(app).get('/api/menu');
    const breadsAfter = publicMenuAfter.body.categories.find((c: any) => c.name === 'Breads');
    const bunMaskaInPublic = breadsAfter.items.find((i: any) => i.name === 'Bun Maska');
    expect(bunMaskaInPublic).toBeUndefined();

    // Toggle back to available
    await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: true });
  });

  it('Allows Admin to update menu item price and records audit log', async () => {
    const db = await getDb();
    // Get Bun Maska ID
    const menuRes = await request(app).get('/api/menu');
    const breadsCat = menuRes.body.categories.find((c: any) => c.name === 'Breads');
    const bunMaska = breadsCat.items.find((i: any) => i.name === 'Bun Maska');

    // Update price from 3500 to 4000
    const priceRes = await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/price`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pricePaise: 4000,
        reason: 'Price revision approved by owner',
      });

    expect(priceRes.status).toBe(200);
    expect(priceRes.body.newPriceInr).toBe(40);

    // Verify audit log entry was created
    const auditRes = await db.query(
      `SELECT * FROM audit_logs WHERE action = 'MENU_PRICE_CHANGE' AND entity_id = $1`,
      [bunMaska.id]
    );
    expect(auditRes.rows.length).toBeGreaterThan(0);
    const details = auditRes.rows[0].details;
    expect(details.newPricePaise).toBe(4000);
    expect(details.reason).toBe('Price revision approved by owner');

    // Revert price back to 3500
    await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/price`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pricePaise: 3500,
        reason: 'Reset to canonical price',
      });
  });

  it('Enforces RBAC: Cashier cannot modify menu items (403 Forbidden)', async () => {
    const menuRes = await request(app).get('/api/menu');
    const bunMaska = menuRes.body.categories[0].items[0];

    const res = await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/availability`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('Enforces RBAC: Unauthenticated requests cannot modify menu items (401 Unauthorized)', async () => {
    const menuRes = await request(app).get('/api/menu');
    const bunMaska = menuRes.body.categories[0].items[0];

    const res = await request(app)
      .patch(`/api/admin/menu/items/${bunMaska.id}/availability`)
      .send({ isAvailable: false });

    expect(res.status).toBe(401);
  });
});
