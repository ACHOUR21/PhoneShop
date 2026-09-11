import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return fail("Invalid passwords", 422);
    }
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return fail("User not found", 404);
    const valid = await bcrypt.compare(String(currentPassword), user.password);
    if (!valid) return fail("Current password is incorrect", 403);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: await bcrypt.hash(String(newPassword), 10) },
    });
    return ok({ changed: true });
  } catch {
    return fail("Failed to change password", 500);
  }
}
