import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("inventory.edit");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = ["sku", "name", "category", "brand", "description", "costPrice", "sellPrice", "quantity", "minQuantity"] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const product = await prisma.product.update({ where: { id }, data });
    return ok({ product });
  } catch {
    return fail("Failed to update product", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("inventory.edit");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("Failed to delete product (it may be used in sales)", 400);
  }
}
