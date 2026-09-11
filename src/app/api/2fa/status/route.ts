import { isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { twoFactorEnabled: true },
  });
  return ok({ enabled: user?.twoFactorEnabled ?? false });
}
