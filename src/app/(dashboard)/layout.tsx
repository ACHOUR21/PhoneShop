import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Note: primary route protection is enforced in middleware.ts, since a
  // server redirect() inside nested layouts is unreliable in this Next version.
  // This is defense-in-depth for direct renders.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <DashboardShell>{children}</DashboardShell>;
}
