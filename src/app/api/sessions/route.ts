import { NextRequest } from "next/server";
import { isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;
  const sessions = await prisma.session.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return ok({ sessions });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const session = await prisma.session.create({
      data: {
        userId: auth.userId,
        userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 255) : null,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });
    return ok({ session }, 201);
  } catch {
    return ok({ session: null });
  }
}
