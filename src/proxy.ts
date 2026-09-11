// ============================================================
// PhoneShop Pro - request-time route protection (Next.js 16 proxy)
// Unauthenticated users are sent to /login; logged-in users
// visiting /login or /register are sent to /dashboard.
// API routes enforce auth + permissions individually (JSON 401/403).
// ============================================================

import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (!token) {
    if (AUTH_PAGES.includes(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" || pathname === "/register") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/repairs",
    "/repairs/:path*",
    "/customers",
    "/customers/:path*",
    "/sales",
    "/sales/:path*",
    "/inventory",
    "/inventory/:path*",
    "/purchase-orders",
    "/purchase-orders/:path*",
    "/expenses",
    "/expenses/:path*",
    "/reports",
    "/reports/:path*",
    "/settings",
    "/settings/:path*",
    "/users",
    "/users/:path*",
    "/notifications",
    "/notifications/:path*",
    "/login",
    "/register",
  ],
};
