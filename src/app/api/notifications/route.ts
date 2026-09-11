import { NextRequest } from "next/server";
import { isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where = { OR: [{ userId: null }, { userId: auth.userId }] };
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return ok({ notifications, unread });
}

export async function PATCH() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  await prisma.notification.updateMany({
    where: { OR: [{ userId: null }, { userId: auth.userId }] },
    data: { read: true },
  });
  return ok({ marked: true });
}
