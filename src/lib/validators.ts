// ============================================================
// PhoneShop Pro - Zod validators + domain helpers
// ============================================================

import { z } from "zod";
import {
  DEVICE_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PO_STATUSES,
  PRODUCT_CATEGORIES,
  REPAIR_PRIORITIES,
  REPAIR_STATUSES,
  ROLE_LIST,
  SALE_STATUSES,
  canTransition,
  normalizeStatus,
} from "./constants";

export { canTransition, normalizeStatus };

export const emailSchema = z.string().email("Invalid email address");
export const phoneSchema = z
  .string()
  .min(6, "Phone too short")
  .max(20, "Phone too long")
  .regex(/^[+\d][\d\s-]*$/, "Invalid phone number");

export const registerSchema = z.object({
  name: z.string().min(2, "Name too short").max(100),
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required"),
  totpCode: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const repairSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  deviceType: z.enum(DEVICE_TYPES as unknown as [string, ...string[]]).default("phone"),
  brand: z.string().max(100).default(""),
  model: z.string().max(100).default(""),
  serial: z.string().max(100).optional(),
  issue: z.string().min(3, "Describe the issue").max(2000),
  diagnosis: z.string().max(2000).optional(),
  status: z.enum(REPAIR_STATUSES as unknown as [string, ...string[]]).default("RECEIVED"),
  priority: z.enum(REPAIR_PRIORITIES as unknown as [string, ...string[]]).default("MEDIUM"),
  assignedToId: z.string().optional().nullable(),
  estimatedCost: z.coerce.number().min(0).default(0),
  finalCost: z.coerce.number().min(0).default(0),
  deposit: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export const repairStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export function validateStatusTransition(from: string, to: string): { ok: boolean; error?: string } {
  const normalized = normalizeStatus(to);
  if (!canTransition(from, normalized)) {
    return { ok: false, error: `Cannot transition from ${from} to ${normalized}` };
  }
  return { ok: true };
}

export const productSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(2).max(200),
  category: z.enum(PRODUCT_CATEGORIES as unknown as [string, ...string[]]).default("general"),
  brand: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(5),
});

export const saleItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const saleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one item required"),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]).default("cash"),
  amountPaid: z.coerce.number().min(0).default(0),
  status: z.enum(SALE_STATUSES as unknown as [string, ...string[]]).default("COMPLETED"),
  notes: z.string().max(1000).optional(),
});

export function calculateSaleTotals(items: { quantity: number; unitPrice: number }[], discount = 0, tax = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount + tax);
  return { subtotal, total };
}

export const purchaseOrderSchema = z.object({
  supplier: z.string().min(2).max(200),
  status: z.enum(PO_STATUSES as unknown as [string, ...string[]]).default("DRAFT"),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        name: z.string().min(1),
        quantity: z.coerce.number().int().min(1),
        unitCost: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item required"),
});

export const expenseSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.enum(EXPENSE_CATEGORIES as unknown as [string, ...string[]]).default("general"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().optional(),
  paidBy: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const userRoleSchema = z.object({
  role: z.enum(ROLE_LIST as unknown as [string, ...string[]]),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

// Tenant/shop helpers
export function getTenantCurrency(): string {
  return process.env.NEXT_PUBLIC_CURRENCY || "DZD";
}

export function isValidRole(role: string): boolean {
  return (ROLE_LIST as readonly string[]).includes(role);
}

export function isValidRepairStatus(status: string): boolean {
  return (REPAIR_STATUSES as readonly string[]).includes(normalizeStatus(status));
}
