import { DbClient, getDb } from './client.js';
import { hashPassword } from './crypto.js';

export async function seedMockData(db?: DbClient): Promise<void> {
  const client = db || (await getDb());

  console.log('[db] Seeding clearly labelled MOCK data...');

  const mockUsers = [
    {
      full_name: '[MOCK] Cafe Administrator',
      username: 'admin_mock',
      password: 'Admin@Katha2026!',
      role: 'ADMIN',
    },
    {
      full_name: '[MOCK] Floor Manager',
      username: 'manager_mock',
      password: 'Manager@Katha2026!',
      role: 'MANAGER',
    },
    {
      full_name: '[MOCK] Counter Cashier',
      username: 'cashier_mock',
      password: 'Cashier@Katha2026!',
      role: 'CASHIER',
    },
    {
      full_name: '[MOCK] Kitchen Master',
      username: 'kitchen_mock',
      password: 'Kitchen@Katha2026!',
      role: 'KITCHEN',
    },
  ];

  for (const user of mockUsers) {
    const passwordHash = await hashPassword(user.password);
    await client.query(
      `
      INSERT INTO staff_users (full_name, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (username) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          updated_at = NOW();
      `,
      [user.full_name, user.username, passwordHash, user.role]
    );
  }

  // Seed sample tables for table management tests
  const mockTables = [
    { label: '[MOCK] Table 1', tokenHash: 'mock_token_hash_table_1' },
    { label: '[MOCK] Table 2', tokenHash: 'mock_token_hash_table_2' },
  ];

  for (const table of mockTables) {
    await client.query(
      `
      INSERT INTO restaurant_tables (table_label, qr_token_hash, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (table_label) DO NOTHING;
      `,
      [table.label, table.tokenHash]
    );
  }

  console.log('[db] MOCK seed data loaded successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedMockData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db] Seed error:', err);
      process.exit(1);
    });
}
