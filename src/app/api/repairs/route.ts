import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { generateTicketNumber } from "@/lib/utils";
import { repairSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await requirePermissionApi("repairs.view");
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search } },
      { brand: { contains: search } },
      { model: { contains: search } },
      { serial: { contains: search } },
      { issue: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const [total, repairs] = await Promise.all([
    prisma.repair.count({ where: where as never }),
    prisma.repair.findMany({
      where: where as never,
      include: { customer: { select: { name: true, phone: true } }, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ data: repairs, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("repairs.create");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = repairSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const data = parsed.data;
    const repair = await prisma.repair.create({
      data: {
        ticketNumber: generateTicketNumber("R"),
        customerId: data.customerId,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        serial: data.serial || null,
        issue: data.issue,
        diagnosis: data.diagnosis || null,
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedToId || null,
        estimatedCost: data.estimatedCost,
        finalCost: data.finalCost,
        deposit: data.deposit,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        history: { create: { toStatus: data.status, changedById: auth.userId, note: "Repair created" } },
      },
      include: { customer: { select: { name: true } } },
    });

    // Persist + realtime broadcast
    await prisma.notification.create({
      data: {
        title: `New repair ${repair.ticketNumber}`,
        message: `${repair.customer.name} — ${repair.brand} ${repair.model}`,
        type: "repair",
        link: `/repairs/${repair.id}`,
      },
    });
    broadcast({
      type: "repair.created",
      title: `New repair ${repair.ticketNumber}`,
      message: `${repair.customer.name} — ${repair.brand} ${repair.model}`,
      link: `/repairs/${repair.id}`,
      data: { kind: "repair", id: repair.id },
    });

    return ok({ repair }, 201);
  } catch (e) {
    console.error("create repair error", e);
    return fail("Failed to create repair", 500);
  }
}
