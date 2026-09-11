import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const { name, email, password, phone } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return fail("Email already registered", 409);

    // First user ever becomes ADMIN, everyone else CASHIER by default
    const userCount = await prisma.user.count();
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashed,
        phone,
        role: userCount === 0 ? "ADMIN" : "CASHIER",
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return ok({ user }, 201);
  } catch (e) {
    console.error("register error", e);
    return fail("Registration failed", 500);
  }
}
