import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    await prisma.user.update({
      where: { id: auth.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return ok({ enabled: false });
  } catch {
    return fail("Failed to disable 2FA", 500);
  }
}
