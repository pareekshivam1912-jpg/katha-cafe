import { z } from 'zod';

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item identifier is required'),
  name: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 items per line'),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
});

export const submitQrOrderSchema = z.object({
  sessionId: z.string().min(1, 'Session identifier is required'),
  customerId: z.string().min(1, 'Customer identifier is required'),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'Idempotency key must be at least 8 characters')
    .max(128, 'Idempotency key too long'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  notes: z.string().max(500, 'Order notes cannot exceed 500 characters').optional(),
});

export const createPosOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'COUNTER']),
  tableId: z.string().uuid('Invalid table ID').optional(),
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(100).optional(),
  customerMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Mobile must be a 10-digit Indian number starting with 6-9')
    .optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'Idempotency key must be at least 8 characters')
    .max(128)
    .optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  notes: z.string().max(500, 'Order notes cannot exceed 500 characters').optional(),
});

export const rejectOrderSchema = z.object({
  reason: z.string().trim().min(2, 'Rejection reason is required').max(300),
});

export const updateKdsStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'SERVED']),
  notes: z.string().max(300).optional(),
});

