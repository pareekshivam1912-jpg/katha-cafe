import { Router, Request, Response } from 'express';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { salesReportQuerySchema } from '../validators/inventory.js';

export const reportsRouter = Router();

// Staff authentication required for all reports (Restricted to Manager and Admin)
reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(['MANAGER', 'ADMIN']));

// GET /reports/sales/daily - Daily Sales Summary (strictly settled CLOSED orders with PAID payments)
reportsRouter.get(['/reports/sales/daily', '/sales/daily'], async (req: Request, res: Response) => {
  const parse = salesReportQuerySchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Invalid date parameters',
      details: parse.error.format(),
    });
    return;
  }

  const { startDate, endDate } = parse.data;

  try {
    const db = await getDb();

    // Base query filters exclusively for CLOSED orders that have a verified PAID payment
    let whereClause = "o.status = 'CLOSED' AND p.status = 'PAID'";
    const params: any[] = [];

    if (startDate) {
      params.push(`${startDate} 00:00:00+00`);
      whereClause += ` AND o.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(`${endDate} 23:59:59+00`);
      whereClause += ` AND o.created_at <= $${params.length}`;
    }

    // 1. Overall Aggregates
    const overallQuery = `
      SELECT 
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(p.amount_paise), 0) AS total_revenue_paise
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE ${whereClause}
    `;
    const overallRes = await db.query<{
      total_orders: string;
      total_revenue_paise: string;
    }>(overallQuery, params);

    const totalOrders = Number(overallRes.rows[0].total_orders);
    const totalRevenuePaise = BigInt(overallRes.rows[0].total_revenue_paise);
    const totalRevenueInr = Number(totalRevenuePaise) / 100;
    const aovInr = totalOrders > 0 ? Number((totalRevenueInr / totalOrders).toFixed(2)) : 0;

    // 2. Breakdown by Payment Method
    const methodQuery = `
      SELECT 
        p.method,
        COUNT(p.id) AS payment_count,
        COALESCE(SUM(p.amount_paise), 0) AS method_revenue_paise
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE ${whereClause}
      GROUP BY p.method
      ORDER BY method_revenue_paise DESC
    `;
    const methodRes = await db.query<{
      method: string;
      payment_count: string;
      method_revenue_paise: string;
    }>(methodQuery, params);

    const byPaymentMethod: Record<string, { count: number; totalInr: number }> = {
      CASH: { count: 0, totalInr: 0 },
      UPI_AT_COUNTER: { count: 0, totalInr: 0 },
      CARD_AT_COUNTER: { count: 0, totalInr: 0 },
    };

    for (const r of methodRes.rows) {
      byPaymentMethod[r.method] = {
        count: Number(r.payment_count),
        totalInr: Number(r.method_revenue_paise) / 100,
      };
    }

    // 3. Breakdown by Order Type (DINE_IN, TAKEAWAY, COUNTER)
    const typeQuery = `
      SELECT 
        o.order_type,
        COUNT(o.id) AS type_count,
        COALESCE(SUM(o.total_paise), 0) AS type_revenue_paise
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE ${whereClause}
      GROUP BY o.order_type
      ORDER BY type_revenue_paise DESC
    `;
    const typeRes = await db.query<{
      order_type: string;
      type_count: string;
      type_revenue_paise: string;
    }>(typeQuery, params);

    const byOrderType: Record<string, { count: number; totalInr: number }> = {
      DINE_IN: { count: 0, totalInr: 0 },
      TAKEAWAY: { count: 0, totalInr: 0 },
      COUNTER: { count: 0, totalInr: 0 },
    };

    for (const r of typeRes.rows) {
      byOrderType[r.order_type] = {
        count: Number(r.type_count),
        totalInr: Number(r.type_revenue_paise) / 100,
      };
    }

    res.status(200).json({
      filter: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalRevenueInr,
        totalSettledOrders: totalOrders,
        averageOrderValueInr: aovInr,
      },
      byPaymentMethod,
      byOrderType,
    });
  } catch (err: any) {
    console.error('[reportsRouter] Error generating daily sales report:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to generate daily sales report',
    });
  }
});

// GET /reports/sales/product-mix - Product mix and top-selling items
reportsRouter.get(['/reports/sales/product-mix', '/sales/product-mix'], async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    const productMixQuery = `
      SELECT 
        oi.item_name_snapshot AS item_name,
        COALESCE(SUM(oi.quantity), 0) AS quantity_sold,
        COALESCE(SUM(oi.line_total_paise), 0) AS total_revenue_paise
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'CLOSED'
      GROUP BY oi.item_name_snapshot
      ORDER BY quantity_sold DESC, total_revenue_paise DESC
    `;

    const result = await db.query<{
      item_name: string;
      quantity_sold: string;
      total_revenue_paise: string;
    }>(productMixQuery);

    const items = result.rows.map((r) => ({
      name: r.item_name,
      quantitySold: Number(r.quantity_sold),
      revenueInr: Number(r.total_revenue_paise) / 100,
    }));

    res.status(200).json({
      count: items.length,
      productMix: items,
    });
  } catch (err: any) {
    console.error('[reportsRouter] Error generating product mix report:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to generate product mix report',
    });
  }
});

// GET /reports/reconciliation - End-of-day Cash & Payment Reconciliation
reportsRouter.get(['/reports/reconciliation', '/reconciliation'], async (_req: Request, res: Response) => {
  try {
    const db = await getDb();

    // 1. Settled Totals by method
    const settledQuery = `
      SELECT 
        p.method,
        COUNT(p.id) AS payment_count,
        COALESCE(SUM(p.amount_paise), 0) AS total_paise
      FROM payments p
      WHERE p.status = 'PAID'
      GROUP BY p.method
    `;
    const settledRes = await db.query<{
      method: string;
      payment_count: string;
      total_paise: string;
    }>(settledQuery);

    let cashPaise = 0n;
    let upiPaise = 0n;
    let cardPaise = 0n;
    let totalSettledPaise = 0n;

    for (const row of settledRes.rows) {
      const paise = BigInt(row.total_paise);
      totalSettledPaise += paise;
      if (row.method === 'CASH') cashPaise = paise;
      else if (row.method === 'UPI_AT_COUNTER') upiPaise = paise;
      else if (row.method === 'CARD_AT_COUNTER') cardPaise = paise;
    }

    // 2. Unsettled Orders Count
    const unsettledQuery = `
      SELECT COUNT(id) AS unsettled_count, COALESCE(SUM(total_paise), 0) AS unsettled_paise
      FROM orders
      WHERE status NOT IN ('CLOSED', 'CANCELLED', 'REJECTED')
    `;
    const unsettledRes = await db.query<{ unsettled_count: string; unsettled_paise: string }>(unsettledQuery);

    res.status(200).json({
      reconciliation: {
        totalSettledRevenueInr: Number(totalSettledPaise) / 100,
        cashDrawerExpectedInr: Number(cashPaise) / 100,
        upiVerifiedInr: Number(upiPaise) / 100,
        cardTerminalInr: Number(cardPaise) / 100,
        unsettledOrdersCount: Number(unsettledRes.rows[0].unsettled_count),
        unsettledExposureInr: Number(unsettledRes.rows[0].unsettled_paise) / 100,
      },
    });
  } catch (err: any) {
    console.error('[reportsRouter] Error generating reconciliation report:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to generate reconciliation report',
    });
  }
});

// GET /reports/orders/live (and /orders/live) - Live and recent orders across all statuses for Admin panel
reportsRouter.get(['/reports/orders/live', '/orders/live'], async (_req: Request, res: Response) => {
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
      updated_at: string;
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
        o.updated_at,
        t.table_label AS table_label,
        c.full_name AS customer_name,
        c.mobile_e164 AS customer_mobile
      FROM orders o
      LEFT JOIN table_sessions ts ON o.table_session_id = ts.id
      LEFT JOIN restaurant_tables t ON ts.table_id = t.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 100`
    );

    const ordersWithItems = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await db.query<{
        item_name_snapshot: string;
        quantity: number;
        unit_price_paise: string;
        line_total_paise: string;
        notes: string | null;
      }>(
        `SELECT item_name_snapshot, quantity, unit_price_paise, line_total_paise, notes
         FROM order_items
         WHERE order_id = $1`,
        [order.id]
      );

      ordersWithItems.push({
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        status: order.status,
        tableLabel: order.table_label || (order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Counter'),
        customerName: order.customer_name || 'Guest',
        customerMobile: order.customer_mobile || null,
        subtotalInr: Number(order.subtotal_paise) / 100,
        totalInr: Number(order.total_paise) / 100,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemsRes.rows.map((i) => ({
          name: i.item_name_snapshot,
          quantity: i.quantity,
          unitPriceInr: Number(i.unit_price_paise) / 100,
          lineTotalInr: Number(i.line_total_paise) / 100,
          notes: i.notes,
        })),
      });
    }

    res.status(200).json({
      count: ordersWithItems.length,
      orders: ordersWithItems,
    });
  } catch (err: any) {
    console.error('[reportsRouter] Error fetching live orders:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch live orders',
    });
  }
});
