import { Router, Request, Response } from 'express';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createInventoryItemSchema, adjustStockSchema } from '../validators/inventory.js';

export const inventoryRouter = Router();

// Staff authentication required for all inventory endpoints
inventoryRouter.use(requireAuth);

// GET /inventory - List all inventory items with low-stock alerts (Accessible by Cashier, Manager, Admin)
inventoryRouter.get('/inventory', requireRole(['CASHIER', 'MANAGER', 'ADMIN']), async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = await db.query<{
      id: string;
      name: string;
      unit: string;
      quantity: string;
      reorder_level: string | null;
      is_active: boolean;
    }>(
      `SELECT id, name, unit, quantity, reorder_level, is_active 
       FROM inventory_items 
       WHERE is_active = TRUE 
       ORDER BY name ASC`
    );

    const items = result.rows.map((row) => {
      const quantity = Number(row.quantity);
      const reorderLevel = row.reorder_level !== null ? Number(row.reorder_level) : null;
      const isLowStock = reorderLevel !== null && quantity <= reorderLevel;

      return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        quantity,
        reorderLevel,
        isLowStock,
        isActive: row.is_active,
      };
    });

    const lowStockCount = items.filter((i) => i.isLowStock).length;

    res.status(200).json({
      count: items.length,
      lowStockCount,
      items,
    });
  } catch (err: any) {
    console.error('[inventoryRouter] Error fetching inventory:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch inventory items',
    });
  }
});

// POST /inventory - Create a new inventory item (Restricted to Manager and Admin)
inventoryRouter.post('/inventory', requireRole(['MANAGER', 'ADMIN']), async (req: Request, res: Response) => {
  const parse = createInventoryItemSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Inventory validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { name, unit, reorderLevel, initialQuantity } = parse.data;
  const staffUser = req.staff!;

  try {
    const db = await getDb();

    // Check duplicate name
    const existing = await db.query('SELECT id FROM inventory_items WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        error: 'Conflict',
        message: `Inventory item '${name}' already exists`,
      });
      return;
    }

    const initQty = initialQuantity || 0;
    const reorder = reorderLevel !== undefined ? reorderLevel : null;

    const insertRes = await db.query<{
      id: string;
      name: string;
      unit: string;
      quantity: string;
      reorder_level: string | null;
      is_active: boolean;
    }>(
      `INSERT INTO inventory_items (name, unit, quantity, reorder_level, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name, unit, quantity, reorder_level, is_active`,
      [name, unit, initQty, reorder]
    );

    const item = insertRes.rows[0];

    // If initial quantity provided, log movement
    if (initQty > 0) {
      await db.query(
        `INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity_delta,
          reason,
          created_by
        ) VALUES ($1, 'PURCHASE', $2, 'Initial stock entry', $3)`,
        [item.id, initQty, staffUser.id]
      );
    }

    res.status(201).json({
      message: 'Inventory item created successfully',
      item: {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: Number(item.quantity),
        reorderLevel: item.reorder_level !== null ? Number(item.reorder_level) : null,
        isLowStock: reorder !== null && initQty <= reorder,
      },
    });
  } catch (err: any) {
    console.error('[inventoryRouter] Error creating inventory item:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create inventory item',
    });
  }
});

// POST /inventory/:id/adjust - Record manual stock adjustment with required reason
inventoryRouter.post('/inventory/:id/adjust', requireRole(['MANAGER', 'ADMIN']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parse = adjustStockSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Stock adjustment validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { movementType, quantityDelta, reason } = parse.data;
  const staffUser = req.staff!;

  try {
    const db = await getDb();

    // Fetch existing item
    const itemRes = await db.query<{
      id: string;
      name: string;
      unit: string;
      quantity: string;
      reorder_level: string | null;
    }>('SELECT id, name, unit, quantity, reorder_level FROM inventory_items WHERE id = $1', [id]);

    if (itemRes.rows.length === 0) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Inventory item not found',
      });
      return;
    }

    const item = itemRes.rows[0];
    const currentQty = Number(item.quantity);
    const newQty = currentQty + quantityDelta;

    // Disallow negative stock
    if (newQty < 0) {
      res.status(400).json({
        error: 'NegativeStockError',
        message: `Adjustment of ${quantityDelta} ${item.unit} would cause negative stock (current: ${currentQty} ${item.unit})`,
      });
      return;
    }

    // Atomically update stock
    await db.query('UPDATE inventory_items SET quantity = $1 WHERE id = $2', [newQty, id]);

    // Record audit movement
    const movementRes = await db.query<{
      id: string;
      movement_type: string;
      quantity_delta: string;
      reason: string;
      created_at: string;
    }>(
      `INSERT INTO inventory_movements (
        inventory_item_id,
        movement_type,
        quantity_delta,
        reason,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, movement_type, quantity_delta, reason, created_at`,
      [id, movementType, quantityDelta, reason, staffUser.id]
    );

    const movement = movementRes.rows[0];
    const reorderLevel = item.reorder_level !== null ? Number(item.reorder_level) : null;

    res.status(200).json({
      message: 'Stock adjustment recorded successfully',
      item: {
        id: item.id,
        name: item.name,
        unit: item.unit,
        previousQuantity: currentQty,
        quantity: newQty,
        reorderLevel,
        isLowStock: reorderLevel !== null && newQty <= reorderLevel,
      },
      movement: {
        id: movement.id,
        movementType: movement.movement_type,
        quantityDelta: Number(movement.quantity_delta),
        reason: movement.reason,
        recordedBy: staffUser.fullName,
        createdAt: movement.created_at,
      },
    });
  } catch (err: any) {
    console.error('[inventoryRouter] Error adjusting stock:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to adjust stock',
    });
  }
});

// GET /inventory/:id/movements - Audit trail of stock movements for an item
inventoryRouter.get('/inventory/:id/movements', requireRole(['MANAGER', 'ADMIN']), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = await getDb();

    const movementsRes = await db.query<{
      id: string;
      movement_type: string;
      quantity_delta: string;
      reason: string;
      actor_name: string | null;
      created_at: string;
    }>(
      `SELECT 
        m.id,
        m.movement_type,
        m.quantity_delta,
        m.reason,
        s.full_name AS actor_name,
        m.created_at
      FROM inventory_movements m
      LEFT JOIN staff_users s ON m.created_by = s.id
      WHERE m.inventory_item_id = $1
      ORDER BY m.created_at DESC`,
      [id]
    );

    res.status(200).json({
      itemId: id,
      count: movementsRes.rows.length,
      movements: movementsRes.rows.map((m) => ({
        id: m.id,
        movementType: m.movement_type,
        quantityDelta: Number(m.quantity_delta),
        reason: m.reason,
        recordedBy: m.actor_name || 'System',
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[inventoryRouter] Error fetching stock movements:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch inventory movements',
    });
  }
});
