import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await requirePermissionApi("inventory.view");
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const lowStock = searchParams.get("lowStock") === "1";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { brand: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const all = await prisma.product.findMany({
    where: where as never,
    orderBy: { updatedAt: "desc" },
  });
  const filtered = lowStock ? all.filter((p) => p.quantity <= p.minQuantity) : all;
  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return ok({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("inventory.edit");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
    if (existing) return fail("A product with this SKU already exists", 409);

    const product = await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        category: parsed.data.category,
        brand: parsed.data.brand || null,
        description: parsed.data.description || null,
        costPrice: parsed.data.costPrice,
        sellPrice: parsed.data.sellPrice,
        quantity: parsed.data.quantity,
        minQuantity: parsed.data.minQuantity,
      },
    });
    return ok({ product }, 201);
  } catch (e) {
    console.error("create product error", e);
    return fail("Failed to create product", 500);
  }
}
