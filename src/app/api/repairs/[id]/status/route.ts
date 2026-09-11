import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { normalizeStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { repairStatusSchema, validateStatusTransition } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("repairs.status");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = repairStatusSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid status", 422);

    const repair = await prisma.repair.findUnique({ where: { id }, include: { customer: true } });
    if (!repair) return fail("Repair not found", 404);

    const toStatus = normalizeStatus(parsed.data.status);
    const check = validateStatusTransition(repair.status, toStatus);
    if (!check.ok) return fail(check.error ?? "Invalid transition", 422);

    const updated = await prisma.repair.update({
      where: { id },
      data: {
        status: toStatus,
        returnedAt: toStatus === "DELIVERED" ? new Date() : repair.returnedAt,
        history: {
          create: { fromStatus: repair.status, toStatus, changedById: auth.userId, note: parsed.data.note || null },
        },
      },
    });

    await prisma.notification.create({
      data: {
        title: `Repair ${repair.ticketNumber} → ${toStatus}`,
        message: `${repair.customer.name} — ${repair.brand} ${repair.model}`,
        type: "repair",
        link: `/repairs/${repair.id}`,
      },
    });
    broadcast({
      type: "repair.updated",
      title: `Repair ${repair.ticketNumber} updated`,
      message: `Status changed to ${toStatus}`,
      link: `/repairs/${repair.id}`,
      data: { kind: "repair", id: repair.id, status: toStatus },
    });

    return ok({ repair: updated });
  } catch (e) {
    console.error("status change error", e);
    return fail("Failed to change status", 500);
  }
}
