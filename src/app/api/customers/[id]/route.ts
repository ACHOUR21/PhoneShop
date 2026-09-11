import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("customers.view");
  if (isAuthResponse(auth)) return auth;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      repairs: { orderBy: { createdAt: "desc" }, take: 50 },
      sales: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) return fail("Customer not found", 404);

  const spent = customer.sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.total, 0);

  return ok({ customer, stats: { repairs: customer.repairs.length, sales: customer.sales.length, spent } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("customers.edit");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = ["name", "phone", "email", "address", "city", "notes"] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key] === "" ? null : body[key];
    }
    const customer = await prisma.customer.update({ where: { id }, data });
    return ok({ customer });
  } catch {
    return fail("Failed to update customer", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("customers.delete");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("Failed to delete customer", 500);
  }
}
