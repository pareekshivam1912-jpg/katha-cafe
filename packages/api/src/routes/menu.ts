import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const menuRouter = Router();

// GET /api/menu - Public menu endpoint with categories and items
menuRouter.get('/menu', async (req: Request, res: Response) => {
  const includeUnavailable = req.query.includeUnavailable === 'true';

  try {
    const db = await getDb();

    // Fetch categories
    const catQuery = 'SELECT id, name, display_order, is_active FROM menu_categories WHERE is_active = TRUE ORDER BY display_order ASC';
    const catResult = await db.query<{ id: string; name: string; display_order: number; is_active: boolean }>(catQuery);

    // Fetch items (either active only, or all if requested)
    let itemQuery = `
      SELECT id, category_id, name, description, price_paise, is_available, display_order
      FROM menu_items
    `;
    if (!includeUnavailable) {
      itemQuery += ' WHERE is_available = TRUE';
    }
    itemQuery += ' ORDER BY display_order ASC, name ASC';

    const itemResult = await db.query<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      price_paise: string | number;
      is_available: boolean;
      display_order: number;
    }>(itemQuery);

    // Group items by category
    const itemsByCat = new Map<string, any[]>();
    for (const item of itemResult.rows) {
      const pricePaise = Number(item.price_paise);
      const formattedItem = {
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        pricePaise,
        priceInr: pricePaise / 100,
        isAvailable: item.is_available,
        displayOrder: item.display_order,
      };

      if (!itemsByCat.has(item.category_id)) {
        itemsByCat.set(item.category_id, []);
      }
      itemsByCat.get(item.category_id)!.push(formattedItem);
    }

    const response = catResult.rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.display_order,
      items: itemsByCat.get(cat.id) || [],
    }));

    res.status(200).json({
      categories: response,
      totalCategories: response.length,
      totalItems: itemResult.rows.length,
    });
  } catch (err) {
    console.error('[menu] Error fetching menu:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve menu items.',
    });
  }
});

// GET /api/menu/categories - Public list of categories
menuRouter.get('/menu/categories', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT id, name, display_order FROM menu_categories WHERE is_active = TRUE ORDER BY display_order ASC'
    );
    res.status(200).json({ categories: result.rows });
  } catch (err) {
    console.error('[menu] Error fetching categories:', err);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve categories.' });
  }
});

// GET /api/menu/items/:id - Public item detail
menuRouter.get('/menu/items/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const result = await db.query(
      'SELECT id, category_id, name, description, price_paise, is_available, display_order FROM menu_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'NotFound', message: 'Menu item not found.' });
      return;
    }

    const item = result.rows[0];
    const pricePaise = Number(item.price_paise);
    res.status(200).json({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      pricePaise,
      priceInr: pricePaise / 100,
      isAvailable: item.is_available,
    });
  } catch (err) {
    console.error('[menu] Error fetching item:', err);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve item.' });
  }
});

// -------------------------------------------------------------
// Admin / Manager Mutating Routes
// -------------------------------------------------------------

const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1, 'Item name is required'),
  pricePaise: z.number().int().min(0, 'Price must be non-negative integer paise'),
  description: z.string().optional(),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

// POST /api/admin/menu/items
menuRouter.post(
  '/admin/menu/items',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const parse = createItemSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'BadRequest', details: parse.error.format() });
      return;
    }

    const { categoryId, name, pricePaise, description, isAvailable, displayOrder } = parse.data;

    try {
      const db = await getDb();
      const result = await db.query(
        `
        INSERT INTO menu_items (category_id, name, description, price_paise, is_available, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, category_id, name, description, price_paise, is_available, display_order;
        `,
        [categoryId, name, description || null, pricePaise, isAvailable, displayOrder]
      );

      const created = result.rows[0];
      res.status(201).json({
        item: {
          id: created.id,
          categoryId: created.category_id,
          name: created.name,
          description: created.description,
          pricePaise: Number(created.price_paise),
          priceInr: Number(created.price_paise) / 100,
          isAvailable: created.is_available,
        },
      });
    } catch (err) {
      console.error('[menu admin] Error creating item:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to create menu item.' });
    }
  }
);

// PATCH /api/admin/menu/items/:id/availability - Toggle item availability
const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

menuRouter.patch(
  '/admin/menu/items/:id/availability',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const parse = toggleAvailabilitySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'BadRequest', details: parse.error.format() });
      return;
    }

    try {
      const db = await getDb();
      const result = await db.query(
        `
        UPDATE menu_items
        SET is_available = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, is_available;
        `,
        [parse.data.isAvailable, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'NotFound', message: 'Menu item not found.' });
        return;
      }

      res.status(200).json({
        message: 'Availability updated',
        item: result.rows[0],
      });
    } catch (err) {
      console.error('[menu admin] Error toggling availability:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to update availability.' });
    }
  }
);

// PATCH /api/admin/menu/items/:id/price - Update price with audit logging
const updatePriceSchema = z.object({
  pricePaise: z.number().int().min(0, 'Price must be non-negative integer paise'),
  reason: z.string().min(1, 'Reason for price change is required for audit history'),
});

menuRouter.patch(
  '/admin/menu/items/:id/price',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const parse = updatePriceSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'BadRequest', details: parse.error.format() });
      return;
    }

    const { pricePaise, reason } = parse.data;

    try {
      const db = await getDb();
      // Fetch existing price
      const existing = await db.query<{ price_paise: string; name: string }>(
        'SELECT price_paise, name FROM menu_items WHERE id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'NotFound', message: 'Menu item not found.' });
        return;
      }

      const oldPrice = Number(existing.rows[0].price_paise);

      await db.transaction(async (tx) => {
        // Update item price
        await tx.query(
          'UPDATE menu_items SET price_paise = $1, updated_at = NOW() WHERE id = $2',
          [pricePaise, id]
        );

        // Audit the price change
        await tx.query(
          `
          INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
          VALUES ($1, 'MENU_PRICE_CHANGE', 'menu_items', $2, $3);
          `,
          [
            req.staff!.id,
            id,
            JSON.stringify({
              itemName: existing.rows[0].name,
              oldPricePaise: oldPrice,
              newPricePaise: pricePaise,
              reason,
              changedBy: req.staff!.username,
            }),
          ]
        );
      });

      res.status(200).json({
        message: 'Menu item price updated and audited',
        id,
        oldPriceInr: oldPrice / 100,
        newPriceInr: pricePaise / 100,
      });
    } catch (err) {
      console.error('[menu admin] Error updating price:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to update price.' });
    }
  }
);
