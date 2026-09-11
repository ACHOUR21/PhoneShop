import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await requirePermissionApi("customers.view");
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where = search
    ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { _count: { select: { repairs: true, sales: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ data: customers, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("customers.create");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const existing = await prisma.customer.findUnique({ where: { phone: parsed.data.phone } });
    if (existing) return fail("A customer with this phone already exists", 409);

    const customer = await prisma.customer.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        notes: parsed.data.notes || null,
      },
    });
    return ok({ customer }, 201);
  } catch (e) {
    console.error("create customer error", e);
    return fail("Failed to create customer", 500);
  }
}
