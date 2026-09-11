import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("expenses.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("Failed to delete expense", 500);
  }
}
