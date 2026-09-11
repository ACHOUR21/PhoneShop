import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    const session = await prisma.session.findFirst({ where: { id, userId: auth.userId } });
    if (!session) return fail("Session not found", 404);
    await prisma.session.update({ where: { id }, data: { revoked: true } });
    return ok({ revoked: true });
  } catch {
    return fail("Failed to revoke session", 500);
  }
}
