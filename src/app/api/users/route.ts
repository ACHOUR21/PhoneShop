import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { fail, isAuthResponse, ok, requireAuth, requirePermissionApi } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// GET ?basic=1 → any authenticated user gets id/name/role (for assignment dropdowns)
// GET (full) / POST → users.manage only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("basic") === "1") {
    const auth = await requireAuth();
    if (isAuthResponse(auth)) return auth;
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    return ok({ users });
  }

  const auth = await requirePermissionApi("users.manage");
  if (isAuthResponse(auth)) return auth;
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, twoFactorEnabled: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return ok({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermissionApi("users.manage");
  if (isAuthResponse(auth)) return auth;

  try {
    const body = await req.json();
    const { name, email, password, role } = body;
    if (!name || !email || !password) return fail("Name, email and password are required", 422);
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) return fail("Email already in use", 409);

    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: String(email).toLowerCase(),
        password: await bcrypt.hash(String(password), 10),
        role: ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER", "VIEWER"].includes(role) ? role : "CASHIER",
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return ok({ user }, 201);
  } catch (e) {
    console.error("create user error", e);
    return fail("Failed to create user", 500);
  }
}
