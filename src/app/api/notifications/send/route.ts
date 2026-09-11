import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

// HTTP bridge: persist + broadcast a notification to SSE clients
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const { title, message, type = "info", userId = null, link = null } = body;
    if (!title || !message) return fail("title and message are required", 422);

    const notification = await prisma.notification.create({
      data: { title: String(title), message: String(message), type: String(type), userId, link },
    });

    const delivered = broadcast({
      type: "notification",
      title: notification.title,
      message: notification.message,
      link: notification.link ?? undefined,
      userId,
      data: { kind: notification.type, id: notification.id },
    });

    return ok({ notification, delivered });
  } catch (e) {
    console.error("send notification error", e);
    return fail("Failed to send notification", 500);
  }
}
