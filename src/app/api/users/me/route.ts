import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, language: true, twoFactorEnabled: true },
  });
  return ok({ user });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name) data.name = String(body.name).slice(0, 100);
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null;
    if (body.language && ["ar", "en", "fr"].includes(body.language)) data.language = body.language;
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: { id: true, name: true, email: true, phone: true, language: true },
    });
    return ok({ user });
  } catch {
    return fail("Failed to update profile", 500);
  }
}
