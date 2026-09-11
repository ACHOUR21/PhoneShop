import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { verifyTOTP } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  const { code } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.twoFactorSecret) return fail("2FA not initialized", 400);
  if (!verifyTOTP(String(code ?? ""), user.twoFactorSecret)) {
    return fail("Invalid code", 422);
  }
  await prisma.user.update({ where: { id: auth.userId }, data: { twoFactorEnabled: true } });
  return ok({ enabled: true });
}
