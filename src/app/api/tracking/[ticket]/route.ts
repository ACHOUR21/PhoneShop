import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns only non-sensitive repair info
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticket: string }> }) {
  const { ticket } = await params;
  const repair = await prisma.repair.findUnique({
    where: { ticketNumber: decodeURIComponent(ticket) },
    select: {
      ticketNumber: true,
      deviceType: true,
      brand: true,
      model: true,
      status: true,
      priority: true,
      createdAt: true,
      dueDate: true,
      estimatedCost: true,
      finalCost: true,
      deposit: true,
      history: { select: { id: true, toStatus: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!repair) return fail("Not found", 404);
  return ok({ repair });
}
