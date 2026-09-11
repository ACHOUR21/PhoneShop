import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  ROLE_PERMISSIONS,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  permissionForRoute,
  requirePermission,
} from "@/lib/rbac";

describe("RBAC", () => {
  it("defines exactly 5 roles", () => {
    expect(Object.keys(ROLE_PERMISSIONS)).toEqual(
      expect.arrayContaining(["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER", "VIEWER"])
    );
    expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(5);
  });

  it("ADMIN has every permission", () => {
    expect(hasPermission("ADMIN", "users.manage")).toBe(true);
    expect(hasPermission("ADMIN", "repairs.delete")).toBe(true);
    expect(hasPermission("ADMIN", "settings.manage")).toBe(true);
  });

  it("MANAGER cannot manage users or settings", () => {
    expect(hasPermission("MANAGER", "users.manage")).toBe(false);
    expect(hasPermission("MANAGER", "settings.manage")).toBe(false);
    expect(hasPermission("MANAGER", "repairs.delete")).toBe(true);
  });

  it("TECHNICIAN is repair-focused", () => {
    expect(hasPermission("TECHNICIAN", "repairs.status")).toBe(true);
    expect(hasPermission("TECHNICIAN", "sales.create")).toBe(false);
    expect(hasPermission("TECHNICIAN", "reports.export")).toBe(false);
  });

  it("CASHIER is sales-focused", () => {
    expect(hasPermission("CASHIER", "sales.create")).toBe(true);
    expect(hasPermission("CASHIER", "repairs.status")).toBe(false);
    expect(hasPermission("CASHIER", "purchasing.manage")).toBe(false);
  });

  it("VIEWER is read-only", () => {
    expect(hasPermission("VIEWER", "dashboard.view")).toBe(true);
    expect(hasPermission("VIEWER", "repairs.create")).toBe(false);
    expect(hasPermission("VIEWER", "sales.create")).toBe(false);
  });

  it("unknown / missing roles get nothing", () => {
    expect(hasPermission("NOPE", "dashboard.view")).toBe(false);
    expect(hasPermission(null, "dashboard.view")).toBe(false);
    expect(hasPermission(undefined, "dashboard.view")).toBe(false);
  });

  it("hasAnyPermission / hasAllPermissions", () => {
    expect(hasAnyPermission("CASHIER", ["sales.create", "users.manage"])).toBe(true);
    expect(hasAllPermissions("CASHIER", ["sales.create", "users.manage"])).toBe(false);
    expect(hasAllPermissions("ADMIN", ["sales.create", "users.manage"])).toBe(true);
  });

  it("maps routes to permissions", () => {
    expect(permissionForRoute("/repairs")).toBe("repairs.view");
    expect(permissionForRoute("/repairs/123")).toBe("repairs.view");
    expect(permissionForRoute("/purchase-orders")).toBe("purchasing.view");
    expect(permissionForRoute("/unknown-page")).toBeNull();
  });

  it("requirePermission throws ForbiddenError", () => {
    expect(() => requirePermission("VIEWER", "users.manage")).toThrow(ForbiddenError);
    expect(() => requirePermission("ADMIN", "users.manage")).not.toThrow();
  });
});
