import { DbClient, getDb } from './client.js';
import { hashPassword } from './crypto.js';
import { CANONICAL_MENU_DATA } from './data/menuData.js';

export async function seedMenuData(db?: DbClient): Promise<{ categoriesCount: number; itemsCount: number }> {
  const client = db || (await getDb());
  console.log('[db] Importing canonical menu categories and items from menu.md...');

  let categoriesCount = 0;
  let itemsCount = 0;

  for (const cat of CANONICAL_MENU_DATA) {
    const catResult = await client.query<{ id: string }>(
      `
      INSERT INTO menu_categories (name, display_order, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (name) DO UPDATE
      SET display_order = EXCLUDED.display_order, is_active = TRUE
      RETURNING id;
      `,
      [cat.name, cat.displayOrder]
    );

    const categoryId = catResult.rows[0].id;
    categoriesCount++;

    let itemOrder = 1;
    for (const item of cat.items) {
      await client.query(
        `
        INSERT INTO menu_items (category_id, name, description, price_paise, is_available, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;
        `,
        [
          categoryId,
          item.name,
          item.description || null,
          item.pricePaise,
          item.isAvailable !== false,
          itemOrder++,
        ]
      );
      itemsCount++;
    }
  }

  console.log(`[db] Canonical menu imported: ${categoriesCount} categories, ${itemsCount} items.`);
  return { categoriesCount, itemsCount };
}

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

  // Seed sample tables for table management and QR ordering tests
  const mockTables = [
    { label: 'Table 1', tokenHash: '11e4846af84b2aef5b68499c76af006d291e3496ec463d13b563d2ac9301f118' }, // token: katha-table-1-token-secret-2026
    { label: 'Table 2', tokenHash: 'ca9e28c478623c593f80b155991a74f9252598998be1f1be2ffffd85b2f07e32' }, // token: katha-table-2-token-secret-2026
    { label: 'Table 3', tokenHash: 'd23ef7d7f0264f3b55decf681df2d7698dacc140234b59656b5499a454f955d4' }, // token: katha-table-3-token-secret-2026
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

  // Also import canonical menu items
  await seedMenuData(client);

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
