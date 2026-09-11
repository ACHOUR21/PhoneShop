// ============================================================
// PhoneShop Pro - NextAuth configuration (credentials + 2FA)
// ============================================================

import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyTOTP } from "./totp";

// Host-provided public URL fallback (Render sets RENDER_EXTERNAL_URL;
// Fly users should set NEXTAUTH_URL as a secret).
if (!process.env.NEXTAUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.NEXTAUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        if (user.twoFactorEnabled) {
          if (!user.twoFactorSecret) return null;
          if (!credentials.totpCode || !verifyTOTP(credentials.totpCode, user.twoFactorSecret)) {
            throw new Error("INVALID_2FA");
          }
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          language: user.language,
        } as { id: string; name: string; email: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.language = (user as { language?: string }).language ?? "ar";
      }
      if (trigger === "update" && session) {
        if ((session as { language?: string }).language) token.language = (session as { language: string }).language;
        if ((session as { name?: string }).name) token.name = (session as { name: string }).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "VIEWER";
        (session.user as { language?: string }).language = (token.language as string) ?? "ar";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
