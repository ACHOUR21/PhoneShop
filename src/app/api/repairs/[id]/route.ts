import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("repairs.view");
  if (isAuthResponse(auth)) return auth;

  const { id } = await params;
  const repair = await prisma.repair.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedTo: { select: { id: true, name: true } },
      history: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!repair) return fail("Repair not found", 404);
  return ok({ repair });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("repairs.edit");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = [
      "deviceType", "brand", "model", "serial", "issue", "diagnosis", "priority",
      "assignedToId", "estimatedCost", "finalCost", "deposit", "dueDate", "notes",
    ] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key] === "" ? null : body[key];
    }
    if (data.dueDate && typeof data.dueDate === "string") data.dueDate = new Date(data.dueDate);
    const repair = await prisma.repair.update({ where: { id }, data });
    return ok({ repair });
  } catch {
    return fail("Failed to update repair", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("repairs.delete");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.repair.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("Failed to delete repair", 500);
  }
}
