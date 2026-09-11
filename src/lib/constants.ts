// ============================================================
// PhoneShop Pro - shared constants
// ============================================================

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  TECHNICIAN: "TECHNICIAN",
  CASHIER: "CASHIER",
  VIEWER: "VIEWER",
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_LIST: Role[] = ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER", "VIEWER"];

// Canonical repair statuses
export const REPAIR_STATUSES = [
  "RECEIVED",
  "DIAGNOSED",
  "IN_REPAIR",
  "WAITING_PARTS",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

// Legacy status keys mapped to canonical ones (Phase 1 fix)
export const LEGACY_STATUS_MAP: Record<string, RepairStatus> = {
  PENDING: "RECEIVED",
  NEW: "RECEIVED",
  ACCEPTED: "RECEIVED",
  CHECKING: "DIAGNOSED",
  IN_PROGRESS: "IN_REPAIR",
  REPAIRING: "IN_REPAIR",
  WAITING: "WAITING_PARTS",
  DONE: "READY",
  COMPLETED: "READY",
  FINISHED: "READY",
  PICKED_UP: "DELIVERED",
  RETURNED: "DELIVERED",
  CANCELED: "CANCELLED",
};

export function normalizeStatus(status: string): RepairStatus {
  if ((REPAIR_STATUSES as readonly string[]).includes(status)) {
    return status as RepairStatus;
  }
  return LEGACY_STATUS_MAP[status] ?? "RECEIVED";
}

// Allowed status transitions (state machine)
export const STATUS_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ["DIAGNOSED", "CANCELLED"],
  DIAGNOSED: ["IN_REPAIR", "WAITING_PARTS", "CANCELLED"],
  IN_REPAIR: ["WAITING_PARTS", "READY", "CANCELLED"],
  WAITING_PARTS: ["IN_REPAIR", "READY", "CANCELLED"],
  READY: ["DELIVERED", "IN_REPAIR", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: ["RECEIVED"],
};

export function canTransition(from: string, to: string): boolean {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (f === t) return true;
  return STATUS_TRANSITIONS[f]?.includes(t) ?? false;
}

export const REPAIR_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const DEVICE_TYPES = ["phone", "tablet", "laptop", "watch", "accessory", "other"] as const;

export const SALE_STATUSES = ["COMPLETED", "PENDING", "CANCELLED", "REFUNDED"] as const;

export const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;

export const PO_STATUSES = ["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"] as const;

export const EXPENSE_CATEGORIES = [
  "rent",
  "salary",
  "utilities",
  "supplies",
  "marketing",
  "maintenance",
  "general",
] as const;

export const PRODUCT_CATEGORIES = [
  "phones",
  "accessories",
  "parts",
  "audio",
  "wearables",
  "general",
] as const;

export const LANGUAGES = [
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "en", name: "English", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
] as const;

export const ITEMS_PER_PAGE = 10;
