import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, runMigrations, seedMockData, hashPassword, verifyPassword } from '../src/index.js';

describe('Database Migrations and Schema Constraints', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    await runMigrations(db);
    await seedMockData(db);
  });

  it('should have applied migrations and created staff_users table', async () => {
    const res = await db.query('SELECT username, role, full_name, is_active FROM staff_users ORDER BY username');
    expect(res.rows.length).toBeGreaterThanOrEqual(4);
    
    const admin = res.rows.find((r) => r.username === 'admin_mock');
    expect(admin).toBeDefined();
    expect(admin.role).toBe('ADMIN');
    expect(admin.full_name).toContain('[MOCK]');
  });

  it('should enforce unique username constraint on staff_users', async () => {
    const pwd = await hashPassword('Test1234!');
    await expect(
      db.query(
        'INSERT INTO staff_users (full_name, username, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Duplicate Admin', 'admin_mock', pwd, 'ADMIN']
      )
    ).rejects.toThrow();
  });

  it('should enforce role CHECK constraint on staff_users', async () => {
    const pwd = await hashPassword('Test1234!');
    await expect(
      db.query(
        'INSERT INTO staff_users (full_name, username, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Invalid Role User', 'invalid_role_mock', pwd, 'SUPERUSER']
      )
    ).rejects.toThrow();
  });

  it('should verify password hashing and verification using crypto.scrypt', async () => {
    const rawPassword = 'SecureStaffPassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    
    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should enforce partial unique index: at most one PAID payment per order', async () => {
    // Create an order first
    const orderRes = await db.query<{ id: string }>(`
      INSERT INTO orders (order_number, order_type, status, subtotal_paise, total_paise)
      VALUES ('ORD-TEST-001', 'DINE_IN', 'ACCEPTED', 10000, 10000)
      RETURNING id;
    `);
    const orderId = orderRes.rows[0].id;

    // First payment marked PAID
    await db.query(`
      INSERT INTO payments (order_id, idempotency_key, amount_paise, method, status)
      VALUES ($1, 'idemp-key-1', 10000, 'CASH', 'PAID');
    `, [orderId]);

    // Second payment for same order marked PAID must fail due to partial unique index
    await expect(
      db.query(`
        INSERT INTO payments (order_id, idempotency_key, amount_paise, method, status)
        VALUES ($1, 'idemp-key-2', 10000, 'CASH', 'PAID');
      `, [orderId])
    ).rejects.toThrow();

    // A FAILED or VOIDED payment for the same order should be allowed (different idempotency key)
    const failedRes = await db.query(`
      INSERT INTO payments (order_id, idempotency_key, amount_paise, method, status)
      VALUES ($1, 'idemp-key-3', 10000, 'CASH', 'FAILED')
      RETURNING id;
    `, [orderId]);
    expect(failedRes.rows.length).toBe(1);
  });
});
