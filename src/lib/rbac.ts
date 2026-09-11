// ============================================================
// PhoneShop Pro - RBAC (5 roles, permission based)
// ============================================================

import type { Role } from "./constants";

export const PERMISSIONS = [
  "dashboard.view",
  "repairs.view",
  "repairs.create",
  "repairs.edit",
  "repairs.status",
  "repairs.delete",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "sales.view",
  "sales.create",
  "sales.refund",
  "inventory.view",
  "inventory.edit",
  "purchasing.view",
  "purchasing.manage",
  "expenses.view",
  "expenses.manage",
  "reports.view",
  "reports.export",
  "users.manage",
  "settings.manage",
  "notifications.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL,
  MANAGER: ALL.filter((p) => p !== "users.manage" && p !== "settings.manage"),
  TECHNICIAN: [
    "dashboard.view",
    "repairs.view",
    "repairs.create",
    "repairs.edit",
    "repairs.status",
    "customers.view",
    "customers.create",
    "customers.edit",
    "inventory.view",
    "notifications.view",
  ],
  CASHIER: [
    "dashboard.view",
    "repairs.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "sales.view",
    "sales.create",
    "inventory.view",
    "expenses.view",
    "notifications.view",
  ],
  VIEWER: ["dashboard.view", "repairs.view", "customers.view", "sales.view", "inventory.view", "notifications.view"],
};

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function hasAnyPermission(role: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: string | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// Route -> required permission mapping (used by layout guards)
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/dashboard": "dashboard.view",
  "/repairs": "repairs.view",
  "/customers": "customers.view",
  "/sales": "sales.view",
  "/inventory": "inventory.view",
  "/purchase-orders": "purchasing.view",
  "/expenses": "expenses.view",
  "/reports": "reports.view",
  "/settings": "settings.manage",
  "/users": "users.manage",
  "/notifications": "notifications.view",
};

export function permissionForRoute(pathname: string): Permission | null {
  const match = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(route + "/"));
  return match ? ROUTE_PERMISSIONS[match] : null;
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden: insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requirePermission(role: string | undefined | null, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError();
  }
}
