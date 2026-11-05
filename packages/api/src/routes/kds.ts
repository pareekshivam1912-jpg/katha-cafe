import { Router, Request, Response } from 'express';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { updateKdsStatusSchema } from '../validators/order.js';

export const kdsRouter = Router();

// Staff authentication required for all KDS endpoints
kdsRouter.use(requireAuth);
kdsRouter.use(requireRole(['KITCHEN', 'CASHIER', 'MANAGER', 'ADMIN']));

// GET /orders - Kitchen order ticket queue
kdsRouter.get('/orders', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    const ordersRes = await db.query<{
      id: string;
      order_number: string;
      order_type: string;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      table_label: string | null;
    }>(
      `SELECT 
        o.id,
        o.order_number,
        o.order_type,
        o.status,
        o.notes,
        o.created_at,
        o.updated_at,
        t.table_label AS table_label
      FROM orders o
      LEFT JOIN table_sessions ts ON o.table_session_id = ts.id
      LEFT JOIN restaurant_tables t ON ts.table_id = t.id
      WHERE o.status IN ('SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY')
      ORDER BY o.created_at ASC`
    );

    const now = Date.now();
    const tickets = [];

    for (const order of ordersRes.rows) {
      const itemsRes = await db.query<{
        item_name_snapshot: string;
        quantity: number;
        notes: string | null;
      }>(
        `SELECT item_name_snapshot, quantity, notes 
         FROM order_items 
         WHERE order_id = $1`,
        [order.id]
      );

      const elapsedMinutes = Math.max(
        0,
        Math.floor((now - new Date(order.created_at).getTime()) / 60000)
      );

      tickets.push({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        tableLabel: order.table_label || (order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Counter'),
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        elapsedMinutes,
        items: itemsRes.rows.map((i) => ({
          name: i.item_name_snapshot,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });
    }

    res.status(200).json({
      count: tickets.length,
      orders: tickets,
    });
  } catch (err: any) {
    console.error('[kdsRouter] Error fetching kitchen tickets:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch kitchen orders',
    });
  }
});

// PATCH /orders/:id/status - Progress kitchen order status
kdsRouter.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parse = updateKdsStatusSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Invalid status update',
      details: parse.error.format(),
    });
    return;
  }

  const { status: targetStatus, notes } = parse.data;
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
    const currentStatus = order.status;

    // Strict state-machine validation
    const validTransitions: Record<string, string[]> = {
      SUBMITTED: ['ACCEPTED', 'PREPARING'],
      ACCEPTED: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['SERVED'],
    };

    const allowedNextList = validTransitions[currentStatus];

    if (!allowedNextList || !allowedNextList.includes(targetStatus)) {
      res.status(400).json({
        error: 'InvalidTransition',
        message: `Cannot transition order from '${currentStatus}' to '${targetStatus}'. ${
          allowedNextList ? `Valid next status is one of [${allowedNextList.join(', ')}].` : 'Order is no longer in active kitchen flow.'
        }`,
      });
      return;
    }

    // Update status
    await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [targetStatus, id]
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
      [
        id,
        currentStatus,
        targetStatus,
        staffUser.id,
        notes || `Status advanced to ${targetStatus} by ${staffUser.username}`,
      ]
    );

    res.status(200).json({
      message: `Order status advanced to ${targetStatus}`,
      orderId: id,
      orderNumber: order.order_number,
      previousStatus: currentStatus,
      status: targetStatus,
    });
  } catch (err: any) {
    console.error('[kdsRouter] Error updating order status:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update order status',
    });
  }
});
