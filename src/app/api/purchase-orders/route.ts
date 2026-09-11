import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/utils";
import { purchaseOrderSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requirePermissionApi("purchasing.view");
  if (isAuthResponse(auth)) return auth;

  const orders = await prisma.purchaseOrder.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ data: orders });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("purchasing.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { supplier, status, expectedDate, notes, items } = parsed.data;
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber: generateTicketNumber("PO"),
        supplier,
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        notes: notes || null,
        items: {
          create: items.map((i) => ({
            productId: i.productId || null,
            name: i.name,
            quantity: i.quantity,
            unitCost: i.unitCost,
            total: i.quantity * i.unitCost,
          })),
        },
      },
      include: { items: true },
    });
    return ok({ order }, 201);
  } catch (e) {
    console.error("create PO error", e);
    return fail("Failed to create purchase order", 500);
  }
}
