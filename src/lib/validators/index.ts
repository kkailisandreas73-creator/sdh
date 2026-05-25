import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().min(2),
  taxId: z.string().optional(),
});

export const cartAddSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0),
});

export const checkoutSchema = z.object({
  shippingAddressId: z.string(),
  poNumber: z.string().optional(),
});

export const quoteSubmitSchema = z.object({
  buyerNotes: z.string().optional(),
  lineIds: z.array(z.string()).optional(),
});

export const quotePriceSchema = z.object({
  lines: z.array(
    z.object({
      lineId: z.string(),
      quotedUnitPrice: z.number().positive(),
    })
  ),
  adminNotes: z.string().optional(),
});

export const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  categoryId: z.string(),
  brand: z.string().optional(),
  moq: z.number().int().positive().default(1),
  allowInstantCheckout: z.boolean().default(true),
  quoteOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
