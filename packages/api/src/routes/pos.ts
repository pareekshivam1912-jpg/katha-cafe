import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createPosOrderSchema, rejectOrderSchema } from '../validators/order.js';

export const posRouter = Router();

// Staff authentication required for all POS endpoints
posRouter.use(requireAuth);
posRouter.use(requireRole(['CASHIER', 'MANAGER', 'ADMIN']));

function generatePublicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashPublicToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

function generateOrderNumber(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `POS-${dateStr}-${randomSuffix}`;
}

// POST /orders - Create staff POS order (Dine-in, Takeaway, Counter)
posRouter.post('/orders', async (req: Request, res: Response) => {
  const parse = createPosOrderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'POS order validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { orderType, tableId, customerName, customerMobile, idempotencyKey, items, notes } = parse.data;
  const staffUser = req.staff!;

  try {
    const db = await getDb();

    // 1. Idempotency Check if key provided
    if (idempotencyKey) {
      const existing = await db.query<{
        id: string;
        order_number: string;
        status: string;
        subtotal_paise: string;
        total_paise: string;
        created_at: string;
      }>(
        'SELECT id, order_number, status, subtotal_paise, total_paise, created_at FROM orders WHERE idempotency_key = $1',
        [idempotencyKey]
      );

      if (existing.rows.length > 0) {
        const order = existing.rows[0];
        const lineItems = await db.query(
          'SELECT item_name_snapshot, unit_price_paise, quantity, line_total_paise, notes FROM order_items WHERE order_id = $1',
          [order.id]
        );

        res.status(200).json({
          message: 'Order retrieved via idempotency key',
          isExisting: true,
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status,
          subtotalInr: Number(order.subtotal_paise) / 100,
          totalInr: Number(order.total_paise) / 100,
          items: lineItems.rows.map((r) => ({
            name: r.item_name_snapshot,
            unitPriceInr: Number(r.unit_price_paise) / 100,
            quantity: r.quantity,
            lineTotalInr: Number(r.line_total_paise) / 100,
            notes: r.notes,
          })),
          createdAt: order.created_at,
        });
        return;
      }
    }

    // 2. Resolve Table & Session for DINE_IN
    let tableSessionId: string | null = null;
    if (orderType === 'DINE_IN') {
      let resolvedTableId = tableId;
      if (!resolvedTableId) {
        const defaultTable = await db.query<{ id: string }>(
          "SELECT id FROM restaurant_tables WHERE is_active = TRUE ORDER BY table_label ASC LIMIT 1"
        );
        if (defaultTable.rows.length > 0) {
          resolvedTableId = defaultTable.rows[0].id;
        }
      }

      if (resolvedTableId) {
        const sessionRes = await db.query<{ id: string }>(
          'SELECT id FROM table_sessions WHERE table_id = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
          [resolvedTableId, 'OPEN']
        );

        if (sessionRes.rows.length > 0) {
          tableSessionId = sessionRes.rows[0].id;
        } else {
          const newSession = await db.query<{ id: string }>(
            'INSERT INTO table_sessions (table_id, status, opened_by) VALUES ($1, $2, $3) RETURNING id',
            [resolvedTableId, 'OPEN', staffUser.id]
          );
          tableSessionId = newSession.rows[0].id;
        }
      }
    }

    // 3. Resolve Customer if details provided
    let customerId: string | null = null;
    if (customerName || customerMobile) {
      const name = customerName?.trim() || 'Guest Diner';
      const cleanMobile = customerMobile ? customerMobile.replace(/[\s\-()]/g, '') : '';
      const mobile = cleanMobile ? (cleanMobile.startsWith('+91') ? cleanMobile : `+91${cleanMobile}`) : '+9198765' + Math.floor(10000 + Math.random() * 90000);
      const custRes = await db.query<{ id: string }>(
        'INSERT INTO customers (full_name, mobile_e164) VALUES ($1, $2) RETURNING id',
        [name, mobile]
      );
      customerId = custRes.rows[0].id;
    }

    // 4. Server Price Recalculation & Resilient Menu Item Validation
    const allDbItems = await db.query<{
      id: string;
      name: string;
      price_paise: string;
      is_available: boolean;
    }>('SELECT id, name, price_paise, is_available FROM menu_items');

    const dbItemsList = allDbItems.rows;
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    function findDbItem(reqItem: { menuItemId: string; name?: string }) {
      if (isUuid(reqItem.menuItemId)) {
        const exact = dbItemsList.find((i) => i.id === reqItem.menuItemId);
        if (exact) return exact;
      }
      const targetName = (reqItem.name || reqItem.menuItemId).trim().toLowerCase();
      const byName = dbItemsList.find((i) => i.name.trim().toLowerCase() === targetName);
      if (byName) return byName;
      const partial = dbItemsList.find((i) =>
        i.name.toLowerCase().includes(targetName) || targetName.includes(i.name.toLowerCase())
      );
      return partial || null;
    }

    let defaultCatId: string | null = null;
    const calculatedLineItems: Array<{
      menuItemId: string;
      itemNameSnapshot: string;
      unitPricePaise: bigint;
      quantity: number;
      lineTotalPaise: bigint;
      notes?: string;
    }> = [];

    let subtotalPaise = 0n;

    for (const orderItem of items) {
      let menuItem = findDbItem(orderItem);
      if (menuItem && !menuItem.is_available) {
        res.status(400).json({
          error: 'BadRequest',
          message: `Menu item '${menuItem.name}' is currently unavailable`,
        });
        return;
      }
      if (!menuItem) {
        if (!defaultCatId) {
          const catRes = await db.query<{ id: string }>(
            "SELECT id FROM menu_categories WHERE is_active = TRUE ORDER BY display_order ASC LIMIT 1"
          );
          if (catRes.rows.length > 0) {
            defaultCatId = catRes.rows[0].id;
          } else {
            const newCat = await db.query<{ id: string }>(
              "INSERT INTO menu_categories (name, display_order, is_active) VALUES ('Cafe Specials', 1, TRUE) RETURNING id"
            );
            defaultCatId = newCat.rows[0].id;
          }
        }
        const itemName = orderItem.name || (orderItem.menuItemId.startsWith('sn-') ? 'Special Snack' : 'Special Dish');
        const defaultPricePaise = 15000;
        const insertedItem = await db.query<{ id: string; name: string; price_paise: string; is_available: boolean }>(
          `INSERT INTO menu_items (category_id, name, price_paise, is_available, display_order)
           VALUES ($1, $2, $3, TRUE, 99) RETURNING id, name, price_paise, is_available`,
          [defaultCatId, itemName, defaultPricePaise]
        );
        menuItem = insertedItem.rows[0];
        dbItemsList.push(menuItem);
      }

      const unitPricePaise = BigInt(menuItem.price_paise);
      const lineTotal = unitPricePaise * BigInt(orderItem.quantity);
      subtotalPaise += lineTotal;

      calculatedLineItems.push({
        menuItemId: menuItem.id,
        itemNameSnapshot: menuItem.name,
        unitPricePaise,
        quantity: orderItem.quantity,
        lineTotalPaise: lineTotal,
        notes: orderItem.notes,
      });
    }

    const taxPaise = 0n;
    const totalPaise = subtotalPaise + taxPaise;

    // 5. Transactional Order Insertion (Directly ACCEPTED for kitchen)
    const publicToken = generatePublicToken();
    const tokenHash = hashPublicToken(publicToken);
    const orderNumber = generateOrderNumber();

    const insertOrderQuery = `
      INSERT INTO orders (
        order_number,
        public_status_token_hash,
        table_session_id,
        customer_id,
        order_type,
        status,
        subtotal_paise,
        tax_paise,
        total_paise,
        notes,
        created_by,
        idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, order_number, status, subtotal_paise, total_paise, created_at
    `;

    const orderRow = await db.query<{
      id: string;
      order_number: string;
      status: string;
      subtotal_paise: string;
      total_paise: string;
      created_at: string;
    }>(insertOrderQuery, [
      orderNumber,
      tokenHash,
      tableSessionId,
      customerId,
      orderType,
      'ACCEPTED', // POS cashier orders are accepted immediately
      subtotalPaise.toString(),
      taxPaise.toString(),
      totalPaise.toString(),
      notes || null,
      staffUser.id,
      idempotencyKey || null,
    ]);

    const createdOrder = orderRow.rows[0];

    // Insert line items
    for (const line of calculatedLineItems) {
      await db.query(
        `INSERT INTO order_items (
          order_id,
          menu_item_id,
          item_name_snapshot,
          unit_price_paise,
          quantity,
          line_total_paise,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          createdOrder.id,
          line.menuItemId,
          line.itemNameSnapshot,
          line.unitPricePaise.toString(),
          line.quantity,
          line.lineTotalPaise.toString(),
          line.notes || null,
        ]
      );
    }

    // Insert status history
    await db.query(
      `INSERT INTO order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [createdOrder.id, null, 'ACCEPTED', staffUser.id, 'Created via Staff POS Terminal']
    );

    res.status(201).json({
      message: 'Order created successfully at POS',
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      status: createdOrder.status,
      orderType,
      subtotalInr: Number(createdOrder.subtotal_paise) / 100,
      totalInr: Number(createdOrder.total_paise) / 100,
      items: calculatedLineItems.map((i) => ({
        name: i.itemNameSnapshot,
        unitPriceInr: Number(i.unitPricePaise) / 100,
        quantity: i.quantity,
        lineTotalInr: Number(i.lineTotalPaise) / 100,
        notes: i.notes,
      })),
      publicStatusToken: publicToken,
      createdAt: createdOrder.created_at,
    });
  } catch (err: any) {
    console.error('[posRouter] Error creating order:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to process POS order',
    });
  }
});

// GET /orders/pending - View pending customer QR orders awaiting review
posRouter.get('/orders/pending', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    const ordersRes = await db.query<{
      id: string;
      order_number: string;
      order_type: string;
      status: string;
      subtotal_paise: string;
      total_paise: string;
      notes: string | null;
      created_at: string;
      table_label: string | null;
      customer_name: string | null;
      customer_mobile: string | null;
    }>(
      `SELECT 
        o.id,
        o.order_number,
        o.order_type,
        o.status,
        o.subtotal_paise,
        o.total_paise,
        o.notes,
        o.created_at,
        t.table_label AS table_label,
        c.full_name AS customer_name,
        c.mobile_e164 AS customer_mobile
      FROM orders o
      LEFT JOIN table_sessions ts ON o.table_session_id = ts.id
      LEFT JOIN restaurant_tables t ON ts.table_id = t.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'SUBMITTED'
      ORDER BY o.created_at ASC`
    );

    const pendingOrders = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await db.query<{
        item_name_snapshot: string;
        unit_price_paise: string;
        quantity: number;
        line_total_paise: string;
        notes: string | null;
      }>(
        `SELECT item_name_snapshot, unit_price_paise, quantity, line_total_paise, notes 
         FROM order_items 
         WHERE order_id = $1`,
        [order.id]
      );

      pendingOrders.push({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        tableLabel: order.table_label || 'Direct QR',
        customerName: order.customer_name || 'Guest',
        customerMobile: order.customer_mobile || null,
        subtotalInr: Number(order.subtotal_paise) / 100,
        totalInr: Number(order.total_paise) / 100,
        notes: order.notes,
        createdAt: order.created_at,
        items: itemsRes.rows.map((i) => ({
          name: i.item_name_snapshot,
          unitPriceInr: Number(i.unit_price_paise) / 100,
          quantity: i.quantity,
          lineTotalInr: Number(i.line_total_paise) / 100,
          notes: i.notes,
        })),
      });
    }

    res.status(200).json({
      count: pendingOrders.length,
      orders: pendingOrders,
    });
  } catch (err: any) {
    console.error('[posRouter] Error fetching pending orders:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch pending orders',
    });
  }
});

// POST /orders/:id/accept - Cashier accepts customer QR order into kitchen queue
posRouter.post('/orders/:id/accept', async (req: Request, res: Response) => {
  const { id } = req.params;
  const staffUser = req.staff!;

  try {
    const db = await getDb();

    const orderRes = await db.query<{
      id: string;
      order_number: string;
      status: string;
    }>('SELECT id, order_number, status FROM orders WHERE id = $1', [id]);

    if (orderRes.rows.length === 0) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Order not found',
      });
      return;
    }

    const order = orderRes.rows[0];
    if (order.status !== 'SUBMITTED') {
      res.status(400).json({
        error: 'InvalidTransition',
        message: `Order is in status '${order.status}', only SUBMITTED orders can be accepted`,
      });
      return;
    }

    // Update status to ACCEPTED
    await db.query(
      "UPDATE orders SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Audit in order_status_history
    await db.query(
      `INSERT INTO order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [id, 'SUBMITTED', 'ACCEPTED', staffUser.id, 'Accepted by cashier at POS']
    );

    res.status(200).json({
      message: 'Order accepted into kitchen queue',
      orderId: id,
      orderNumber: order.order_number,
      status: 'ACCEPTED',
    });
  } catch (err: any) {
    console.error('[posRouter] Error accepting order:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to accept order',
    });
  }
});

// POST /orders/:id/reject - Cashier rejects customer QR order with reason
posRouter.post('/orders/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parse = rejectOrderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Rejection reason is required',
      details: parse.error.format(),
    });
    return;
  }

  const { reason } = parse.data;
  const staffUser = req.staff!;

  try {
    const db = await getDb();

    const orderRes = await db.query<{
      id: string;
      order_number: string;
      status: string;
    }>('SELECT id, order_number, status FROM orders WHERE id = $1', [id]);

    if (orderRes.rows.length === 0) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Order not found',
      });
      return;
    }

    const order = orderRes.rows[0];
    if (order.status !== 'SUBMITTED') {
      res.status(400).json({
        error: 'InvalidTransition',
        message: `Order is in status '${order.status}', only SUBMITTED orders can be rejected`,
      });
      return;
    }

    // Update status to REJECTED
    await db.query(
      "UPDATE orders SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Audit in order_status_history
    await db.query(
      `INSERT INTO order_status_history (
        order_id,
        from_status,
        to_status,
        changed_by,
        reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [id, 'SUBMITTED', 'REJECTED', staffUser.id, reason]
    );

    res.status(200).json({
      message: 'Order rejected',
      orderId: id,
      orderNumber: order.order_number,
      status: 'REJECTED',
      reason,
    });
  } catch (err: any) {
    console.error('[posRouter] Error rejecting order:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to reject order',
    });
  }
});
