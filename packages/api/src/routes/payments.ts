import { Router, Request, Response } from 'express';
import { getDb } from '@katha-cafe/db';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recordPaymentSchema } from '../validators/payment.js';

export const paymentsRouter = Router();

// Staff authentication required for all payment endpoints
paymentsRouter.use(requireAuth);
paymentsRouter.use(requireRole(['CASHIER', 'MANAGER', 'ADMIN']));

// POST /orders/:id/payments - Record counter payment and settle order
paymentsRouter.post('/orders/:id/payments', async (req: Request, res: Response) => {
  const { id: orderId } = req.params;
  const parse = recordPaymentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Payment validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { amountPaise: inputPaise, amountInr, method, idempotencyKey, bankReference } = parse.data;
  const staffUser = req.staff!;

  const targetAmountPaise = inputPaise !== undefined ? BigInt(inputPaise) : BigInt(Math.round(amountInr! * 100));

  try {
    const db = await getDb();

    // 1. Idempotency Check: Return existing payment if key was already processed
    const existingPayment = await db.query<{
      id: string;
      order_id: string;
      amount_paise: string;
      method: string;
      status: string;
      bank_reference: string | null;
      verified_at: string | null;
      created_at: string;
    }>(
      `SELECT p.id, p.order_id, p.amount_paise, p.method, p.status, p.bank_reference, p.verified_at, p.created_at, o.order_number
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.idempotency_key = $1`,
      [idempotencyKey]
    );

    if (existingPayment.rows.length > 0) {
      const p = existingPayment.rows[0] as any;
      res.status(200).json({
        message: 'Payment record retrieved via idempotency key',
        isExisting: true,
        paymentId: p.id,
        orderId: p.order_id,
        orderNumber: p.order_number,
        amountInr: Number(p.amount_paise) / 100,
        method: p.method,
        status: p.status,
        bankReference: p.bank_reference,
        verifiedAt: p.verified_at,
        createdAt: p.created_at,
      });
      return;
    }

    // 2. Fetch Order and check state
    const orderRes = await db.query<{
      id: string;
      order_number: string;
      status: string;
      total_paise: string;
    }>('SELECT id, order_number, status, total_paise FROM orders WHERE id = $1', [orderId]);

    if (orderRes.rows.length === 0) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Order not found',
      });
      return;
    }

    const order = orderRes.rows[0];

    // Cannot pay cancelled or rejected orders
    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
      res.status(400).json({
        error: 'InvalidOrderState',
        message: `Cannot accept payment for an order in '${order.status}' status.`,
      });
      return;
    }

    // Check if order already has a successful PAID payment
    const paidCheck = await db.query<{ id: string }>(
      "SELECT id FROM payments WHERE order_id = $1 AND status = 'PAID'",
      [orderId]
    );

    if (paidCheck.rows.length > 0 || order.status === 'CLOSED') {
      res.status(409).json({
        error: 'OrderAlreadyPaid',
        message: 'This order has already been settled and paid in full.',
      });
      return;
    }

    // 3. Amount Validation (Full payment required)
    const requiredTotalPaise = BigInt(order.total_paise);
    if (targetAmountPaise < requiredTotalPaise) {
      res.status(400).json({
        error: 'Underpayment',
        message: `Payment amount ₹${Number(targetAmountPaise) / 100} is less than required order total ₹${
          Number(requiredTotalPaise) / 100
        }`,
      });
      return;
    }

    // 4. Transactional Payment Record & Order Settlement
    let paymentRecord: any;
    try {
      const paymentInsert = await db.query<{
        id: string;
        order_id: string;
        amount_paise: string;
        method: string;
        status: string;
        bank_reference: string | null;
        verified_at: string;
        created_at: string;
      }>(
        `INSERT INTO payments (
          order_id,
          idempotency_key,
          amount_paise,
          method,
          status,
          bank_reference,
          verified_by,
          verified_at
        ) VALUES ($1, $2, $3, $4, 'PAID', $5, $6, NOW())
        RETURNING id, order_id, amount_paise, method, status, bank_reference, verified_at, created_at`,
        [
          orderId,
          idempotencyKey,
          targetAmountPaise.toString(),
          method,
          bankReference || null,
          staffUser.id,
        ]
      );
      paymentRecord = paymentInsert.rows[0];
    } catch (insertErr: any) {
      // Catch PostgreSQL partial unique index violation (concurrent race condition)
      if (insertErr.code === '23505') {
        res.status(409).json({
          error: 'PaymentConflict',
          message: 'A concurrent payment was already processed for this order or duplicate key was detected.',
        });
        return;
      }
      throw insertErr;
    }

    // Update order status to CLOSED
    await db.query(
      "UPDATE orders SET status = 'CLOSED', updated_at = NOW() WHERE id = $1",
      [orderId]
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
        orderId,
        order.status,
        'CLOSED',
        staffUser.id,
        `Settled via ${method}${bankReference ? ` (Ref: ${bankReference})` : ''}`,
      ]
    );

    res.status(201).json({
      message: 'Payment recorded and order settled successfully',
      paymentId: paymentRecord.id,
      orderId: order.id,
      orderNumber: order.order_number,
      amountInr: Number(paymentRecord.amount_paise) / 100,
      method: paymentRecord.method,
      status: paymentRecord.status,
      bankReference: paymentRecord.bank_reference,
      verifiedBy: staffUser.fullName,
      verifiedAt: paymentRecord.verified_at,
      createdAt: paymentRecord.created_at,
    });
  } catch (err: any) {
    console.error('[paymentsRouter] Error recording payment:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to record payment',
    });
  }
});

// GET /orders/:id/payments - View payment records for a given order
paymentsRouter.get('/orders/:id/payments', async (req: Request, res: Response) => {
  const { id: orderId } = req.params;

  try {
    const db = await getDb();
    const paymentsRes = await db.query<{
      id: string;
      order_id: string;
      amount_paise: string;
      method: string;
      status: string;
      bank_reference: string | null;
      verified_by_name: string | null;
      verified_at: string | null;
      created_at: string;
    }>(
      `SELECT 
        p.id,
        p.order_id,
        p.amount_paise,
        p.method,
        p.status,
        p.bank_reference,
        s.full_name AS verified_by_name,
        p.verified_at,
        p.created_at
      FROM payments p
      LEFT JOIN staff_users s ON p.verified_by = s.id
      WHERE p.order_id = $1
      ORDER BY p.created_at DESC`,
      [orderId]
    );

    res.status(200).json({
      orderId,
      payments: paymentsRes.rows.map((p) => ({
        id: p.id,
        amountInr: Number(p.amount_paise) / 100,
        method: p.method,
        status: p.status,
        bankReference: p.bank_reference,
        verifiedBy: p.verified_by_name,
        verifiedAt: p.verified_at,
        createdAt: p.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[paymentsRouter] Error fetching order payments:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch payment details',
    });
  }
});

// GET /payments - Cashier payments list & daily total
paymentsRouter.get('/payments', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const paymentsRes = await db.query<{
      id: string;
      order_id: string;
      order_number: string;
      amount_paise: string;
      method: string;
      status: string;
      bank_reference: string | null;
      verified_by_name: string | null;
      verified_at: string | null;
      created_at: string;
    }>(
      `SELECT 
        p.id,
        p.order_id,
        o.order_number,
        p.amount_paise,
        p.method,
        p.status,
        p.bank_reference,
        s.full_name AS verified_by_name,
        p.verified_at,
        p.created_at
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      LEFT JOIN staff_users s ON p.verified_by = s.id
      ORDER BY p.created_at DESC
      LIMIT 100`
    );

    let totalSettledPaise = 0n;
    const formatted = paymentsRes.rows.map((p) => {
      if (p.status === 'PAID') {
        totalSettledPaise += BigInt(p.amount_paise);
      }
      return {
        id: p.id,
        orderId: p.order_id,
        orderNumber: p.order_number,
        amountInr: Number(p.amount_paise) / 100,
        method: p.method,
        status: p.status,
        bankReference: p.bank_reference,
        verifiedBy: p.verified_by_name,
        verifiedAt: p.verified_at,
        createdAt: p.created_at,
      };
    });

    res.status(200).json({
      count: formatted.length,
      totalSettledInr: Number(totalSettledPaise) / 100,
      payments: formatted,
    });
  } catch (err: any) {
    console.error('[paymentsRouter] Error fetching payments list:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch payments',
    });
  }
});
