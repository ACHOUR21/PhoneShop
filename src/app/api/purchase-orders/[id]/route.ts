import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("purchasing.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) return fail("Order not found", 404);

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: body.status ?? order.status,
        receivedDate: body.status === "RECEIVED" ? new Date() : order.receivedDate,
        notes: body.notes ?? order.notes,
      },
      include: { items: true },
    });

    // Optionally add received quantities to stock
    if (body.status === "RECEIVED" && body.addToStock && order.status !== "RECEIVED") {
      for (const item of order.items) {
        if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
    }

    return ok({ order: updated });
  } catch (e) {
    console.error("update PO error", e);
    return fail("Failed to update order", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("purchasing.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.purchaseOrder.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("Failed to delete order", 500);
  }
}
