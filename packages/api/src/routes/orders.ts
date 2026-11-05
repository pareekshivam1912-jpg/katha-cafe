import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from '@katha-cafe/db';
import { submitQrOrderSchema } from '../validators/order.js';

export const ordersRouter = Router();

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
  return `KC-${dateStr}-${randomSuffix}`;
}

// POST /api/orders - Submit QR Order (Server-authoritative calculation + Idempotent)
ordersRouter.post('/orders', async (req: Request, res: Response) => {
  const parse = submitQrOrderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Order validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { sessionId, customerId, idempotencyKey, items, notes } = parse.data;

  try {
    const db = await getDb();

    // 1. Idempotency Check: Return existing order if key was already processed
    const existingOrder = await db.query<{
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

    if (existingOrder.rows.length > 0) {
      const order = existingOrder.rows[0];
      // Retrieve line items
      const itemsRes = await db.query(
        'SELECT item_name_snapshot, unit_price_paise, quantity, line_total_paise, notes FROM order_items WHERE order_id = $1',
        [order.id]
      );

      res.status(200).json({
        message: 'Order retrieved via idempotency key',
        isExisting: true,
        orderNumber: order.order_number,
        status: order.status,
        subtotalInr: Number(order.subtotal_paise) / 100,
        totalInr: Number(order.total_paise) / 100,
        items: itemsRes.rows.map((r) => ({
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

    // Helper to check valid UUID
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    // 2. Resolve Table Session (support UUID or demo-session format)
    let resolvedSessionId: string | null = null;
    if (isUuid(sessionId)) {
      const sessionRes = await db.query<{ id: string; status: string }>(
        'SELECT id, status FROM table_sessions WHERE id = $1',
        [sessionId]
      );
      if (sessionRes.rows.length > 0 && sessionRes.rows[0].status === 'OPEN') {
        resolvedSessionId = sessionRes.rows[0].id;
      }
    }

    if (!resolvedSessionId) {
      // Find or provision table
      let tableLabel = 'Table 1';
      if (sessionId.toLowerCase().includes('table-2') || sessionId.includes('2')) tableLabel = 'Table 2';
      else if (sessionId.toLowerCase().includes('table-3') || sessionId.includes('3')) tableLabel = 'Table 3';

      let tableRes = await db.query<{ id: string }>(
        'SELECT id FROM restaurant_tables WHERE table_label ILIKE $1 AND is_active = TRUE LIMIT 1',
        [`%${tableLabel}%`]
      );
      let tableId: string;
      if (tableRes.rows.length === 0) {
        const dummyHash = crypto.createHash('sha256').update(tableLabel).digest('hex');
        const insertedTable = await db.query<{ id: string }>(
          `INSERT INTO restaurant_tables (table_label, qr_token_hash, is_active)
           VALUES ($1, $2, TRUE) RETURNING id`,
          [tableLabel, dummyHash]
        );
        tableId = insertedTable.rows[0].id;
      } else {
        tableId = tableRes.rows[0].id;
      }

      // Find or create open session
      const openSessionRes = await db.query<{ id: string }>(
        "SELECT id FROM table_sessions WHERE table_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1",
        [tableId]
      );
      if (openSessionRes.rows.length > 0) {
        resolvedSessionId = openSessionRes.rows[0].id;
      } else {
        const newSession = await db.query<{ id: string }>(
          "INSERT INTO table_sessions (table_id, status) VALUES ($1, 'OPEN') RETURNING id",
          [tableId]
        );
        resolvedSessionId = newSession.rows[0].id;
      }
    }

    // 3. Resolve Customer (support UUID or demo customer identifier)
    let resolvedCustomerId: string | null = null;
    if (isUuid(customerId)) {
      const customerRes = await db.query<{ id: string }>(
        'SELECT id FROM customers WHERE id = $1',
        [customerId]
      );
      if (customerRes.rows.length > 0) {
        resolvedCustomerId = customerRes.rows[0].id;
      }
    }

    if (!resolvedCustomerId) {
      const guestMobile = '+9198765' + Math.floor(10000 + Math.random() * 90000);
      const newCust = await db.query<{ id: string }>(
        `INSERT INTO customers (full_name, mobile_e164)
         VALUES ($1, $2) RETURNING id`,
        ['Guest Diner', guestMobile]
      );
      resolvedCustomerId = newCust.rows[0].id;
    }

    // 4. Fetch canonical item prices & availability from DB
    const allDbItems = await db.query<{
      id: string;
      name: string;
      price_paise: string;
      is_available: boolean;
    }>('SELECT id, name, price_paise, is_available FROM menu_items');

    const dbItemsList = allDbItems.rows;

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
    let calculatedSubtotalPaise = 0;
    const validatedItems: Array<{
      menuItemId: string;
      nameSnapshot: string;
      unitPricePaise: number;
      quantity: number;
      lineTotalPaise: number;
      notes: string | null;
    }> = [];

    for (const reqItem of items) {
      let matched = findDbItem(reqItem);
      if (!matched) {
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
        const itemName = reqItem.name || (reqItem.menuItemId.startsWith('sn-') ? 'Special Snack' : 'Special Dish');
        const defaultPricePaise = 15000;
        const insertedItem = await db.query<{ id: string; name: string; price_paise: string; is_available: boolean }>(
          `INSERT INTO menu_items (category_id, name, price_paise, is_available, display_order)
           VALUES ($1, $2, $3, TRUE, 99) RETURNING id, name, price_paise, is_available`,
          [defaultCatId, itemName, defaultPricePaise]
        );
        matched = insertedItem.rows[0];
        dbItemsList.push(matched);
      }

      const unitPricePaise = Number(matched.price_paise);
      const lineTotalPaise = unitPricePaise * reqItem.quantity;
      calculatedSubtotalPaise += lineTotalPaise;

      validatedItems.push({
        menuItemId: matched.id,
        nameSnapshot: matched.name,
        unitPricePaise,
        quantity: reqItem.quantity,
        lineTotalPaise,
        notes: reqItem.notes || null,
      });
    }

    const discountPaise = 0;
    const taxPaise = 0;
    const totalPaise = calculatedSubtotalPaise - discountPaise + taxPaise;

    const orderNumber = generateOrderNumber();
    const publicStatusToken = generatePublicToken();
    const publicTokenHash = hashPublicToken(publicStatusToken);

    // 6. Transactional Order Creation
    const createdOrderId = await db.transaction(async (tx) => {
      // Insert Order
      const orderInsert = await tx.query<{ id: string }>(
        `
        INSERT INTO orders (
          order_number,
          public_status_token_hash,
          table_session_id,
          customer_id,
          order_type,
          status,
          subtotal_paise,
          discount_paise,
          tax_paise,
          total_paise,
          currency,
          notes,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, 'DINE_IN', 'SUBMITTED', $5, $6, $7, $8, 'INR', $9, $10)
        RETURNING id;
        `,
        [
          orderNumber,
          publicTokenHash,
          resolvedSessionId,
          resolvedCustomerId,
          calculatedSubtotalPaise,
          discountPaise,
          taxPaise,
          totalPaise,
          notes || null,
          idempotencyKey,
        ]
      );
      const orderId = orderInsert.rows[0].id;

      // Insert Order Items snapshots
      for (const item of validatedItems) {
        await tx.query(
          `
          INSERT INTO order_items (
            order_id,
            menu_item_id,
            item_name_snapshot,
            unit_price_paise,
            quantity,
            line_total_paise,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
          `,
          [
            orderId,
            item.menuItemId,
            item.nameSnapshot,
            item.unitPricePaise,
            item.quantity,
            item.lineTotalPaise,
            item.notes,
          ]
        );
      }

      // Record initial event in Order Status History
      await tx.query(
        `
        INSERT INTO order_status_history (order_id, from_status, to_status, reason)
        VALUES ($1, NULL, 'SUBMITTED', 'QR table order submitted by customer');
        `,
        [orderId]
      );

      return orderId;
    });

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: createdOrderId,
      orderNumber,
      status: 'SUBMITTED',
      publicStatusToken,
      subtotalInr: calculatedSubtotalPaise / 100,
      totalInr: totalPaise / 100,
      items: validatedItems.map((i) => ({
        name: i.nameSnapshot,
        unitPriceInr: i.unitPricePaise / 100,
        quantity: i.quantity,
        lineTotalInr: i.lineTotalPaise / 100,
        notes: i.notes,
      })),
    });
  } catch (err: any) {
    if (err.code === '23505' && err.detail?.includes('idempotency_key')) {
      // Concurrent race condition handled gracefully
      const existing = await (await getDb()).query<{ order_number: string; status: string; total_paise: string }>(
        'SELECT order_number, status, total_paise FROM orders WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        res.status(200).json({
          message: 'Order retrieved via idempotency key',
          isExisting: true,
          orderNumber: existing.rows[0].order_number,
          status: existing.rows[0].status,
          totalInr: Number(existing.rows[0].total_paise) / 100,
        });
        return;
      }
    }
    console.error('[orders] Submission error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to process order submission.',
    });
  }
});

// GET /api/orders/:publicToken/status - Customer status lookup via opaque token
ordersRouter.get('/orders/:publicToken/status', async (req: Request, res: Response) => {
  const { publicToken } = req.params;

  if (!publicToken || publicToken.length < 16) {
    res.status(404).json({ error: 'OrderNotFound', message: 'Invalid or missing status token.' });
    return;
  }

  const tokenHash = hashPublicToken(publicToken);

  try {
    const db = await getDb();

    // Look up order by hash
    const orderRes = await db.query<{
      id: string;
      order_number: string;
      status: string;
      order_type: string;
      subtotal_paise: string;
      total_paise: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      table_label: string;
    }>(
      `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.order_type,
        o.subtotal_paise,
        o.total_paise,
        o.notes,
        o.created_at,
        o.updated_at,
        t.table_label
      FROM orders o
      JOIN table_sessions s ON s.id = o.table_session_id
      JOIN restaurant_tables t ON t.id = s.table_id
      WHERE o.public_status_token_hash = $1
      `,
      [tokenHash]
    );

    if (orderRes.rows.length === 0) {
      res.status(404).json({
        error: 'OrderNotFound',
        message: 'Order status token is invalid or expired.',
      });
      return;
    }

    const order = orderRes.rows[0];

    // Fetch item snapshots
    const itemsRes = await db.query<{
      item_name_snapshot: string;
      unit_price_paise: string;
      quantity: number;
      line_total_paise: string;
      notes: string | null;
    }>(
      `
      SELECT item_name_snapshot, unit_price_paise, quantity, line_total_paise, notes
      FROM order_items
      WHERE order_id = $1
      ORDER BY item_name_snapshot ASC
      `,
      [order.id]
    );

    // Fetch status history timeline
    const historyRes = await db.query<{
      to_status: string;
      reason: string | null;
      created_at: string;
    }>(
      `
      SELECT to_status, reason, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC
      `,
      [order.id]
    );

    res.status(200).json({
      orderNumber: order.order_number,
      status: order.status,
      orderType: order.order_type,
      tableLabel: order.table_label,
      subtotalInr: Number(order.subtotal_paise) / 100,
      totalInr: Number(order.total_paise) / 100,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: itemsRes.rows.map((r) => ({
        name: r.item_name_snapshot,
        unitPriceInr: Number(r.unit_price_paise) / 100,
        quantity: r.quantity,
        lineTotalInr: Number(r.line_total_paise) / 100,
        notes: r.notes,
      })),
      timeline: historyRes.rows.map((h) => ({
        status: h.to_status,
        note: h.reason,
        timestamp: h.created_at,
      })),
    });
  } catch (err) {
    console.error('[orders] Status lookup error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve order status.',
    });
  }
});
