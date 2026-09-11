import { isAuthResponse, ok, requireAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  const auth = await requireAuth();
  if (isAuthResponse(auth)) return auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = startOfDay(now);

  const [
    salesMonth,
    salesToday,
    expensesMonth,
    activeRepairs,
    pendingPickup,
    totalCustomers,
    products,
    repairsByStatusRaw,
    recentRepairs,
    recentSales,
    salesWeek,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart }, status: "COMPLETED" } }),
    prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, status: "COMPLETED" } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
    prisma.repair.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.repair.count({ where: { status: "READY" } }),
    prisma.customer.count(),
    prisma.product.findMany({ select: { quantity: true, minQuantity: true } }),
    prisma.repair.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.repair.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, ticketNumber: true, brand: true, model: true, status: true },
    }),
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, invoiceNumber: true, total: true, createdAt: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 6 * 24 * 3600 * 1000) }, status: "COMPLETED" },
      select: { total: true, createdAt: true },
    }),
  ]);

  const revenueMonth = salesMonth._sum.total ?? 0;
  const expenses = expensesMonth._sum.amount ?? 0;

  // Build 7-day revenue series
  const days: { day: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    const total = salesWeek
      .filter((s) => s.createdAt.toISOString().slice(0, 10) === key)
      .reduce((sum, s) => sum + s.total, 0);
    days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), total });
  }

  return ok({
    revenueMonth,
    todaySales: salesToday._sum.total ?? 0,
    expensesMonth: expenses,
    profit: revenueMonth - expenses,
    activeRepairs,
    pendingPickup,
    totalCustomers,
    lowStockCount: products.filter((p) => p.quantity <= p.minQuantity).length,
    revenueByDay: days,
    repairsByStatus: repairsByStatusRaw.map((r) => ({ status: r.status, count: r._count.status })),
    recentRepairs,
    recentSales,
  });
}
