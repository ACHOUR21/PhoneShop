import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { generateTicketNumber } from "@/lib/utils";
import { calculateSaleTotals, saleSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await requirePermissionApi("sales.view");
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const [total, sales] = await Promise.all([
    prisma.sale.count(),
    prisma.sale.findMany({
      include: {
        customer: { select: { name: true } },
        cashier: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ data: sales, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("sales.create");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { customerId, items, discount, tax, paymentMethod, amountPaid, status, notes } = parsed.data;
    const { subtotal, total } = calculateSaleTotals(items, discount, tax);

    // Verify stock for linked products
    for (const item of items) {
      if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) return fail(`Product not found: ${item.name}`, 422);
        if (product.quantity < item.quantity) {
          return fail(`Insufficient stock for ${product.name} (have ${product.quantity})`, 422);
        }
      }
    }

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber: generateTicketNumber("INV"),
        customerId: customerId || null,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod,
        amountPaid: amountPaid || total,
        status,
        cashierId: auth.userId,
        notes: notes || null,
        items: {
          create: items.map((i) => ({
            productId: i.productId || null,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    // Deduct stock + low-stock alerts
    for (const item of items) {
      if (!item.productId) continue;
      const updated = await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      if (updated.quantity <= updated.minQuantity) {
        await prisma.notification.create({
          data: {
            title: `Low stock: ${updated.name}`,
            message: `Only ${updated.quantity} left (min ${updated.minQuantity})`,
            type: "stock",
            link: "/inventory",
          },
        });
        broadcast({
          type: "stock.low",
          title: `Low stock: ${updated.name}`,
          message: `Only ${updated.quantity} left`,
          link: "/inventory",
          data: { kind: "stock", id: updated.id },
        });
      }
    }

    await prisma.notification.create({
      data: {
        title: `New sale ${sale.invoiceNumber}`,
        message: `Total ${total} — ${paymentMethod}`,
        type: "sale",
        link: "/sales",
      },
    });
    broadcast({
      type: "sale.created",
      title: `New sale ${sale.invoiceNumber}`,
      message: `Total ${total}`,
      link: "/sales",
      data: { kind: "sale", id: sale.id },
    });

    return ok({ sale }, 201);
  } catch (e) {
    console.error("create sale error", e);
    return fail("Failed to create sale", 500);
  }
}
