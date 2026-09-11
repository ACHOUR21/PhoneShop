import { NextRequest } from "next/server";
import { ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// Demo implementation: acknowledges the request without leaking account existence.
// Wire an email provider (e.g. nodemailer/Resend) here for production.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email === "string" && email.includes("@")) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (user) {
        console.log(`[forgot-password] reset requested for ${user.email} (demo: no email sent)`);
      }
    }
  } catch {
    /* ignore */
  }
  return ok({ sent: true });
}
