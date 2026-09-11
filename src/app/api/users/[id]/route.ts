import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissionApi("users.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const { id } = await params;
    if (id === auth.userId && req.headers.get("x-self") !== "1") {
      // Allow self role change guard: prevent locking yourself out
      const body0 = await req.clone().json().catch(() => ({}));
      if (body0.role && body0.role !== "ADMIN") {
        return fail("You cannot demote your own account", 403);
      }
    }
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.active === "boolean") {
      if (id === auth.userId && body.active === false) return fail("You cannot deactivate your own account", 403);
      data.active = body.active;
    }
    if (body.role && ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER", "VIEWER"].includes(body.role)) {
      data.role = body.role;
    }
    if (body.name) data.name = String(body.name);
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return ok({ user });
  } catch {
    return fail("Failed to update user", 500);
  }
}
