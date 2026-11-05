import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  getDb,
  runMigrations,
  seedMockData,
  createIsolatedDb,
  exportBackupToFile,
  restoreBackupFromFile,
  DatabaseBackup,
} from '../src/index.js';

describe('Database Backup and Restore Verification (T-12)', () => {
  let sourceDb: Awaited<ReturnType<typeof getDb>>;
  let tempBackupPath: string;

  beforeAll(async () => {
    tempBackupPath = path.join(os.tmpdir(), `katha-test-backup-${Date.now()}.json`);
    sourceDb = await getDb();
    await runMigrations(sourceDb);
    await seedMockData(sourceDb);
  });

  afterAll(async () => {
    try {
      await fs.unlink(tempBackupPath);
    } catch {}
  });

  it('should export database to a structured JSON file with metadata', async () => {
    // 1. Insert rich test records to verify foreign key hierarchies and complex types
    // Add customer
    const custRes = await sourceDb.query<{ id: string }>(`
      INSERT INTO customers (full_name, mobile_e164)
      VALUES ('Aarav Sharma', '+919876543210')
      RETURNING id;
    `);
    const customerId = custRes.rows[0].id;

    // Add table and session
    const tableRes = await sourceDb.query<{ id: string }>(`
      SELECT id FROM restaurant_tables LIMIT 1;
    `);
    const tableId = tableRes.rows[0].id;

    const sessionRes = await sourceDb.query<{ id: string }>(`
      INSERT INTO table_sessions (table_id, status)
      VALUES ($1, 'OPEN')
      RETURNING id;
    `, [tableId]);
    const sessionId = sessionRes.rows[0].id;

    // Add order
    const orderRes = await sourceDb.query<{ id: string }>(`
      INSERT INTO orders (
        order_number,
        table_session_id,
        customer_id,
        order_type,
        status,
        subtotal_paise,
        total_paise,
        idempotency_key
      )
      VALUES ('ORD-BACKUP-01', $1, $2, 'DINE_IN', 'CLOSED', 18000, 18000, 'idemp-backup-order')
      RETURNING id;
    `, [sessionId, customerId]);
    const orderId = orderRes.rows[0].id;

    // Add payment
    await sourceDb.query(`
      INSERT INTO payments (
        order_id,
        idempotency_key,
        amount_paise,
        method,
        status
      )
      VALUES ($1, 'idemp-backup-pay', 18000, 'CASH', 'PAID');
    `, [orderId]);

    // Add inventory item and movement
    const invRes = await sourceDb.query<{ id: string }>(`
      INSERT INTO inventory_items (name, unit, quantity, reorder_level)
      VALUES ('Backup Verification Tea', 'kg', 15.5, 2.0)
      RETURNING id;
    `);
    const invId = invRes.rows[0].id;

    await sourceDb.query(`
      INSERT INTO inventory_movements (
        inventory_item_id,
        movement_type,
        quantity_delta,
        reason
      )
      VALUES ($1, 'PURCHASE', 15.5, 'Initial verification stock');
    `, [invId]);

    // Add audit log with JSONB
    await sourceDb.query(`
      INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ('TEST_AUDIT', 'orders', $1, $2);
    `, [orderId, JSON.stringify({ note: 'Automated backup verification test', code: 200 })]);

    // 2. Export backup
    const exported = await exportBackupToFile(sourceDb, tempBackupPath);

    expect(exported).toBeDefined();
    expect(exported.metadata.cafe).toBe('Katha Cafe');
    expect(exported.metadata.totalRows).toBeGreaterThan(100);
    expect(exported.metadata.tables['orders']).toBeGreaterThanOrEqual(1);
    expect(exported.metadata.tables['payments']).toBeGreaterThanOrEqual(1);
    expect(exported.metadata.tables['inventory_items']).toBeGreaterThanOrEqual(1);

    // Verify file actually exists on filesystem
    const fileContent = await fs.readFile(tempBackupPath, 'utf-8');
    const parsed = JSON.parse(fileContent) as DatabaseBackup;
    expect(parsed.metadata.totalRows).toBe(exported.metadata.totalRows);
  });

  it('should restore backup into a fresh, isolated database and verify total row counts and data fidelity', async () => {
    // 1. Create a pristine, isolated test database
    const targetDb = await createIsolatedDb();

    // 2. Restore backup into target database
    const result = await restoreBackupFromFile(targetDb, tempBackupPath);

    expect(result.totalRows).toBeGreaterThan(100);
    expect(result.restoredTables['staff_users']).toBeGreaterThanOrEqual(4);
    expect(result.restoredTables['orders']).toBeGreaterThanOrEqual(1);
    expect(result.restoredTables['payments']).toBeGreaterThanOrEqual(1);

    // 3. Verify specific records in target database
    // Verify staff user
    const adminCheck = await targetDb.query(`
      SELECT username, role, full_name FROM staff_users WHERE username = 'admin_mock';
    `);
    expect(adminCheck.rows.length).toBe(1);
    expect(adminCheck.rows[0].role).toBe('ADMIN');

    // Verify customer
    const custCheck = await targetDb.query(`
      SELECT full_name, mobile_e164 FROM customers WHERE mobile_e164 = '+919876543210';
    `);
    expect(custCheck.rows.length).toBe(1);
    expect(custCheck.rows[0].full_name).toBe('Aarav Sharma');

    // Verify order
    const orderCheck = await targetDb.query(`
      SELECT order_number, status, total_paise FROM orders WHERE order_number = 'ORD-BACKUP-01';
    `);
    expect(orderCheck.rows.length).toBe(1);
    expect(orderCheck.rows[0].status).toBe('CLOSED');
    expect(String(orderCheck.rows[0].total_paise)).toBe('18000');

    // Verify payment
    const paymentCheck = await targetDb.query(`
      SELECT amount_paise, method, status FROM payments WHERE idempotency_key = 'idemp-backup-pay';
    `);
    expect(paymentCheck.rows.length).toBe(1);
    expect(paymentCheck.rows[0].status).toBe('PAID');
    expect(paymentCheck.rows[0].method).toBe('CASH');

    // Verify inventory item
    const invCheck = await targetDb.query(`
      SELECT name, unit, quantity FROM inventory_items WHERE name = 'Backup Verification Tea';
    `);
    expect(invCheck.rows.length).toBe(1);
    expect(Number(invCheck.rows[0].quantity)).toBe(15.5);

    // Verify audit log with JSONB
    const auditCheck = await targetDb.query(`
      SELECT action, details FROM audit_logs WHERE action = 'TEST_AUDIT';
    `);
    expect(auditCheck.rows.length).toBe(1);
    const details = typeof auditCheck.rows[0].details === 'string'
      ? JSON.parse(auditCheck.rows[0].details)
      : auditCheck.rows[0].details;
    expect(details.note).toBe('Automated backup verification test');

    await targetDb.close();
  });
});
