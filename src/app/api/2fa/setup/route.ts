import QRCode from "qrcode";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { buildOtpAuthUrl, generateSecret } from "@/lib/totp";

export async function POST() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  const secret = generateSecret();
  // Store secret but keep 2FA disabled until the code is verified
  await prisma.user.update({
    where: { id: auth.userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const url = buildOtpAuthUrl(secret, auth.email);
  const qr = await QRCode.toDataURL(url, { width: 256, margin: 1 });
  return ok({ qr });
}
