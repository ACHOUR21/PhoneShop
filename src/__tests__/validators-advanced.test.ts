import { describe, expect, it } from "vitest";
import {
  REPAIR_STATUSES,
  STATUS_TRANSITIONS,
  canTransition,
  normalizeStatus,
} from "@/lib/constants";
import {
  calculateSaleTotals,
  customerSchema,
  emailSchema,
  expenseSchema,
  getTenantCurrency,
  isValidRepairStatus,
  isValidRole,
  paginate,
  paginationSchema,
  phoneSchema,
  productSchema,
  purchaseOrderSchema,
  repairSchema,
  saleSchema,
  validateStatusTransition,
} from "@/lib/validators";

describe("status normalization (legacy keys)", () => {
  const cases: [string, string][] = [
    ["PENDING", "RECEIVED"],
    ["NEW", "RECEIVED"],
    ["IN_PROGRESS", "IN_REPAIR"],
    ["REPAIRING", "IN_REPAIR"],
    ["DONE", "READY"],
    ["COMPLETED", "READY"],
    ["PICKED_UP", "DELIVERED"],
    ["CANCELED", "CANCELLED"],
    ["CHECKING", "DIAGNOSED"],
    ["WAITING", "WAITING_PARTS"],
  ];
  for (const [legacy, canonical] of cases) {
    it(`maps ${legacy} -> ${canonical}`, () => {
      expect(normalizeStatus(legacy)).toBe(canonical);
    });
  }

  it("keeps canonical statuses untouched", () => {
    for (const s of REPAIR_STATUSES) expect(normalizeStatus(s)).toBe(s);
  });

  it("falls back to RECEIVED for unknown keys", () => {
    expect(normalizeStatus("SOMETHING_ELSE")).toBe("RECEIVED");
  });
});

describe("status transitions", () => {
  it("allows RECEIVED -> DIAGNOSED", () => {
    expect(canTransition("RECEIVED", "DIAGNOSED")).toBe(true);
  });

  it("blocks RECEIVED -> DELIVERED (skipping steps)", () => {
    expect(canTransition("RECEIVED", "DELIVERED")).toBe(false);
  });

  it("allows full happy path", () => {
    const path = ["RECEIVED", "DIAGNOSED", "IN_REPAIR", "READY", "DELIVERED"];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("DELIVERED is terminal", () => {
    for (const s of REPAIR_STATUSES) {
      if (s === "DELIVERED") continue;
      expect(canTransition("DELIVERED", s)).toBe(false);
    }
  });

  it("CANCELLED can be reopened to RECEIVED", () => {
    expect(canTransition("CANCELLED", "RECEIVED")).toBe(true);
  });

  it("allows same-status (no-op)", () => {
    expect(canTransition("READY", "READY")).toBe(true);
  });

  it("validateStatusTransition returns ok for valid", () => {
    expect(validateStatusTransition("READY", "DELIVERED")).toEqual({ ok: true });
  });

  it("validateStatusTransition returns error for invalid", () => {
    const r = validateStatusTransition("RECEIVED", "DELIVERED");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Cannot transition");
  });

  it("transition map covers every status", () => {
    for (const s of REPAIR_STATUSES) {
      expect(STATUS_TRANSITIONS[s]).toBeDefined();
    }
  });
});

describe("field validators", () => {
  it("accepts valid emails", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
  });
  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
  it("accepts phone numbers", () => {
    expect(phoneSchema.safeParse("0550123456").success).toBe(true);
    expect(phoneSchema.safeParse("+213550123456").success).toBe(true);
  });
  it("rejects short phones", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("schema validators", () => {
  it("customerSchema requires name + phone", () => {
    expect(customerSchema.safeParse({ name: "A", phone: "055" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "Amine", phone: "0550123456" }).success).toBe(true);
  });

  it("repairSchema requires customer + issue", () => {
    expect(repairSchema.safeParse({ customerId: "x" }).success).toBe(false);
    expect(
      repairSchema.safeParse({ customerId: "x", issue: "broken screen" }).success
    ).toBe(true);
  });

  it("repairSchema applies defaults", () => {
    const r = repairSchema.parse({ customerId: "x", issue: "broken screen" });
    expect(r.status).toBe("RECEIVED");
    expect(r.priority).toBe("MEDIUM");
    expect(r.deviceType).toBe("phone");
  });

  it("saleSchema requires items", () => {
    expect(saleSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      saleSchema.safeParse({ items: [{ name: "Glass", quantity: 1, unitPrice: 500 }] }).success
    ).toBe(true);
  });

  it("productSchema requires sku + name", () => {
    expect(productSchema.safeParse({ sku: "A" }).success).toBe(false);
    expect(productSchema.safeParse({ sku: "A", name: "Item" }).success).toBe(true);
  });

  it("expenseSchema requires positive amount", () => {
    expect(expenseSchema.safeParse({ title: "Rent", amount: 0 }).success).toBe(false);
    expect(expenseSchema.safeParse({ title: "Rent", amount: 100 }).success).toBe(true);
  });

  it("purchaseOrderSchema requires supplier + items", () => {
    expect(purchaseOrderSchema.safeParse({ supplier: "X", items: [] }).success).toBe(false);
    expect(
      purchaseOrderSchema.safeParse({
        supplier: "Supplier X",
        items: [{ name: "Glass", quantity: 10, unitCost: 150 }],
      }).success
    ).toBe(true);
  });
});

describe("sale totals", () => {
  it("sums items", () => {
    expect(calculateSaleTotals([{ quantity: 2, unitPrice: 500 }])).toEqual({ subtotal: 1000, total: 1000 });
  });
  it("applies discount and tax", () => {
    expect(
      calculateSaleTotals([{ quantity: 1, unitPrice: 1000 }], 100, 90)
    ).toEqual({ subtotal: 1000, total: 990 });
  });
  it("never goes below zero", () => {
    expect(calculateSaleTotals([{ quantity: 1, unitPrice: 100 }], 500, 0).total).toBe(0);
  });
});

describe("pagination helpers", () => {
  it("parses defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 10, search: "" });
  });
  it("paginates arrays", () => {
    const r = paginate([1, 2, 3, 4, 5], 2, 2);
    expect(r.data).toEqual([3, 4]);
    expect(r.total).toBe(5);
    expect(r.totalPages).toBe(3);
  });
  it("clamps out-of-range pages", () => {
    const r = paginate([1, 2], 99, 10);
    expect(r.page).toBe(1);
    expect(r.data).toEqual([1, 2]);
  });
});

describe("tenant utils", () => {
  it("returns default currency", () => {
    expect(getTenantCurrency()).toBe("DZD");
  });
  it("validates roles", () => {
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("NOPE")).toBe(false);
  });
  it("validates repair statuses incl. legacy", () => {
    expect(isValidRepairStatus("READY")).toBe(true);
    expect(isValidRepairStatus("IN_PROGRESS")).toBe(true);
  });
});
