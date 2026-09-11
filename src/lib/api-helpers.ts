// Server-side API helpers: session + RBAC enforcement

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { hasPermission, type Permission } from "./rbac";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string; role?: string; name?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    userId: user.id,
    email: user.email ?? "",
    role: user.role ?? "VIEWER",
    name: user.name ?? "",
  };
}

export async function requirePermissionApi(permission: Permission): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (!hasPermission(auth.role, permission)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }
  return auth;
}

export function isAuthResponse(value: AuthContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
