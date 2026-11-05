import { z } from 'zod';

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  unit: z.string().trim().min(1, 'Unit is required (e.g. kg, litres, packets, pcs)').max(20),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative').optional(),
  initialQuantity: z.number().min(0, 'Initial quantity cannot be negative').optional(),
});

export const adjustStockSchema = z.object({
  movementType: z.enum(['PURCHASE', 'ADJUSTMENT', 'WASTE', 'CONSUMPTION', 'RETURN'], {
    errorMap: () => ({
      message: "Movement type must be 'PURCHASE', 'ADJUSTMENT', 'WASTE', 'CONSUMPTION', or 'RETURN'",
    }),
  }),
  quantityDelta: z
    .number({ required_error: 'Quantity delta is required' })
    .refine((val) => val !== 0, {
      message: 'Quantity delta cannot be zero',
    }),
  reason: z
    .string()
    .trim()
    .min(3, 'A clear reason for the stock adjustment is required (min 3 characters)')
    .max(300),
});

export const salesReportQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
});
