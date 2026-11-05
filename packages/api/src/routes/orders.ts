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

    // 2. Verify Session is active and OPEN
    const sessionRes = await db.query<{ id: string; status: string; table_label: string }>(
      `
      SELECT s.id, s.status, t.table_label
      FROM table_sessions s
      JOIN restaurant_tables t ON t.id = s.table_id
      WHERE s.id = $1
      `,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      res.status(404).json({ error: 'NotFound', message: 'Table session not found.' });
      return;
    }

    if (sessionRes.rows[0].status === 'CLOSED') {
      res.status(400).json({
        error: 'SessionClosed',
        message: 'This table session has ended. Please ask staff for assistance.',
      });
      return;
    }

    // 3. Verify Customer exists
    const customerRes = await db.query<{ id: string; full_name: string; mobile_e164: string }>(
      'SELECT id, full_name, mobile_e164 FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerRes.rows.length === 0) {
      res.status(404).json({ error: 'NotFound', message: 'Customer record not found. Please identify first.' });
      return;
    }

    // 4. Fetch canonical item prices & availability from DB
    const itemIds = items.map((i) => i.menuItemId);
    const dbItemsRes = await db.query<{
      id: string;
      name: string;
      price_paise: string;
      is_available: boolean;
    }>(
      `SELECT id, name, price_paise, is_available FROM menu_items WHERE id = ANY($1::uuid[])`,
      [itemIds]
    );

    const dbItemsMap = new Map<string, { id: string; name: string; pricePaise: number; isAvailable: boolean }>();
    for (const row of dbItemsRes.rows) {
      dbItemsMap.set(row.id, {
        id: row.id,
        name: row.name,
        pricePaise: Number(row.price_paise),
        isAvailable: row.is_available,
      });
    }

    // Check for unavailable items (T-03 server protection)
    for (const reqItem of items) {
      const dbItem = dbItemsMap.get(reqItem.menuItemId);
      if (!dbItem) {
        res.status(400).json({
          error: 'ItemNotFound',
          message: `Requested menu item '${reqItem.menuItemId}' does not exist.`,
        });
        return;
      }
      if (!dbItem.isAvailable) {
        res.status(400).json({
          error: 'ItemUnavailable',
          message: `'${dbItem.name}' is currently unavailable. Please review your cart.`,
          unavailableItemId: dbItem.id,
        });
        return;
      }
    }

    // 5. Server-authoritative price & totals calculation
    let calculatedSubtotalPaise = 0;
    const validatedItems = items.map((reqItem) => {
      const dbItem = dbItemsMap.get(reqItem.menuItemId)!;
      const unitPricePaise = dbItem.pricePaise;
      const lineTotalPaise = unitPricePaise * reqItem.quantity;
      calculatedSubtotalPaise += lineTotalPaise;

      return {
        menuItemId: dbItem.id,
        nameSnapshot: dbItem.name,
        unitPricePaise,
        quantity: reqItem.quantity,
        lineTotalPaise,
        notes: reqItem.notes || null,
      };
    });

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
          sessionId,
          customerId,
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
