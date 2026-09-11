import { NextRequest } from "next/server";
import { fail, isAuthResponse, requirePermissionApi } from "@/lib/api-helpers";
import { csvFilename, EXPORT_MODULES, toCSV, type ExportModule } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

async function fetchModule(module: ExportModule): Promise<Record<string, unknown>[]> {
  switch (module) {
    case "repairs": {
      const rows = await prisma.repair.findMany({
        include: { customer: { select: { name: true, phone: true } }, assignedTo: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      return rows.map((r) => ({
        ticket: r.ticketNumber,
        customer: r.customer.name,
        phone: r.customer.phone,
        device: r.deviceType,
        brand: r.brand,
        model: r.model,
        serial: r.serial ?? "",
        issue: r.issue,
        status: r.status,
        priority: r.priority,
        technician: r.assignedTo?.name ?? "",
        estimatedCost: r.estimatedCost,
        finalCost: r.finalCost,
        deposit: r.deposit,
        createdAt: r.createdAt.toISOString(),
      }));
    }
    case "customers": {
      const rows = await prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
      return rows.map((c) => ({
        name: c.name, phone: c.phone, email: c.email ?? "", city: c.city ?? "",
        address: c.address ?? "", createdAt: c.createdAt.toISOString(),
      }));
    }
    case "sales": {
      const rows = await prisma.sale.findMany({
        include: { customer: { select: { name: true } }, cashier: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      return rows.map((s) => ({
        invoice: s.invoiceNumber, customer: s.customer?.name ?? "", cashier: s.cashier?.name ?? "",
        subtotal: s.subtotal, discount: s.discount, tax: s.tax, total: s.total,
        paymentMethod: s.paymentMethod, amountPaid: s.amountPaid, status: s.status,
        createdAt: s.createdAt.toISOString(),
      }));
    }
    case "products": {
      const rows = await prisma.product.findMany({ orderBy: { name: "asc" }, take: 5000 });
      return rows.map((p) => ({
        sku: p.sku, name: p.name, category: p.category, brand: p.brand ?? "",
        costPrice: p.costPrice, sellPrice: p.sellPrice, quantity: p.quantity, minQuantity: p.minQuantity,
      }));
    }
    case "expenses": {
      const rows = await prisma.expense.findMany({ orderBy: { date: "desc" }, take: 5000 });
      return rows.map((e) => ({
        title: e.title, category: e.category, amount: e.amount,
        date: e.date.toISOString().slice(0, 10), paidBy: e.paidBy ?? "",
      }));
    }
    case "purchase-orders": {
      const rows = await prisma.purchaseOrder.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      return rows.map((o) => ({
        poNumber: o.poNumber, supplier: o.supplier, status: o.status, subtotal: o.subtotal,
        items: o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
        createdAt: o.createdAt.toISOString(),
      }));
    }
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const auth = await requirePermissionApi("reports.export");
  if (isAuthResponse(auth)) return auth;

  const { module } = await params;
  if (!(EXPORT_MODULES as string[]).includes(module)) return fail("Unknown module", 404);

  const rows = await fetchModule(module as ExportModule);
  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(module as ExportModule)}"`,
    },
  });
}
