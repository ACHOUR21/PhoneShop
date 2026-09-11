import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await requirePermissionApi("expenses.view");
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));

  const expenses = await prisma.expense.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });
  return ok({ data: expenses });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("expenses.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const expense = await prisma.expense.create({
      data: {
        title: parsed.data.title,
        category: parsed.data.category,
        amount: parsed.data.amount,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        paidBy: parsed.data.paidBy || null,
        notes: parsed.data.notes || null,
        createdById: auth.userId,
      },
    });
    return ok({ expense }, 201);
  } catch (e) {
    console.error("create expense error", e);
    return fail("Failed to create expense", 500);
  }
}
