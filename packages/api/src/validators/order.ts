import { z } from 'zod';

export const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 items per line'),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
});

export const submitQrOrderSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  customerId: z.string().uuid('Invalid customer ID'),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'Idempotency key must be at least 8 characters')
    .max(128, 'Idempotency key too long'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  notes: z.string().max(500, 'Order notes cannot exceed 500 characters').optional(),
});
