// ============================================================
// PhoneShop Pro - seed data (demo shop)
// Run: npm run seed  (tsx prisma/seed.ts)
// ============================================================

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding PhoneShop Pro demo data...");

  // ---- Users ----
  const password = async (p: string) => bcrypt.hash(p, 10);
  const users = [
    { name: "Amine Achour", email: "admin@phoneshop.dz", password: "admin123", role: "ADMIN", phone: "0550000001" },
    { name: "Sara Manager", email: "manager@phoneshop.dz", password: "manager123", role: "MANAGER", phone: "0550000002" },
    { name: "Yacine Tech", email: "tech@phoneshop.dz", password: "tech123", role: "TECHNICIAN", phone: "0550000003" },
    { name: "Lina Cashier", email: "cashier@phoneshop.dz", password: "cashier123", role: "CASHIER", phone: "0550000004" },
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: await password(u.password), role: u.role, phone: u.phone },
    });
    userIds[u.role] = user.id;
  }
  console.log(`  users: ${users.length}`);

  // ---- Customers ----
  const customersData = [
    { name: "Mohamed Benali", phone: "0551111111", city: "Alger", address: "Rue Didouche Mourad 12" },
    { name: "Fatima Zohra", phone: "0552222222", city: "Oran", address: "Front de mer" },
    { name: "Karim Haddad", phone: "0553333333", city: "Constantine", address: "Coudiat 45" },
    { name: "Amina Boumediene", phone: "0554444444", city: "Annaba", address: "Cours de la révolution" },
    { name: "Rachid Belkacem", phone: "0555555555", city: "Blida", address: "Boulevard des frères" },
    { name: "Nadia Cherif", phone: "0556666666", city: "Sétif", address: "Avenue du 8 mai" },
  ];
  const customerIds: string[] = [];
  for (const c of customersData) {
    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
    customerIds.push(customer.id);
  }
  console.log(`  customers: ${customersData.length}`);

  // ---- Products ----
  const productsData = [
    { sku: "PH-IP15-128", name: "iPhone 15 128GB", category: "phones", brand: "Apple", costPrice: 165000, sellPrice: 189000, quantity: 8, minQuantity: 2 },
    { sku: "PH-SA55", name: "Galaxy A55 5G", category: "phones", brand: "Samsung", costPrice: 72000, sellPrice: 85000, quantity: 12, minQuantity: 3 },
    { sku: "PH-RN13", name: "Redmi Note 13", category: "phones", brand: "Xiaomi", costPrice: 38000, sellPrice: 45500, quantity: 15, minQuantity: 4 },
    { sku: "ACC-CASE-IP", name: "Silicone Case iPhone", category: "accessories", brand: "Generic", costPrice: 300, sellPrice: 800, quantity: 120, minQuantity: 20 },
    { sku: "ACC-GLASS", name: "Tempered Glass 9H", category: "accessories", brand: "Generic", costPrice: 150, sellPrice: 500, quantity: 200, minQuantity: 30 },
    { sku: "ACC-CHG-25W", name: "Fast Charger 25W", category: "accessories", brand: "Samsung", costPrice: 1200, sellPrice: 2500, quantity: 40, minQuantity: 10 },
    { sku: "ACC-CABLE-C", name: "USB-C Cable 1m", category: "accessories", brand: "Anker", costPrice: 600, sellPrice: 1500, quantity: 60, minQuantity: 15 },
    { sku: "AUD-BUDS2", name: "Galaxy Buds 2", category: "audio", brand: "Samsung", costPrice: 14000, sellPrice: 18500, quantity: 10, minQuantity: 3 },
    { sku: "AUD-AIRP", name: "AirPods Pro 2", category: "audio", brand: "Apple", costPrice: 32000, sellPrice: 39000, quantity: 6, minQuantity: 2 },
    { sku: "PRT-SCR-A55", name: "Screen A55 Original", category: "parts", brand: "Samsung", costPrice: 8500, sellPrice: 12000, quantity: 4, minQuantity: 5 },
    { sku: "PRT-BAT-IP13", name: "Battery iPhone 13", category: "parts", brand: "Apple", costPrice: 3200, sellPrice: 5500, quantity: 3, minQuantity: 5 },
    { sku: "WEAR-W6", name: "Galaxy Watch 6", category: "wearables", brand: "Samsung", costPrice: 42000, sellPrice: 52000, quantity: 5, minQuantity: 2 },
  ];
  const productMap: Record<string, { id: string; sellPrice: number }> = {};
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    productMap[p.sku] = { id: product.id, sellPrice: product.sellPrice };
  }
  console.log(`  products: ${productsData.length}`);

  // ---- Repairs ----
  const repairsData = [
    { ticketNumber: "R-20260102-1001", customerIdx: 0, deviceType: "phone", brand: "Samsung", model: "Galaxy A55", issue: "شاشة مكسورة — écran cassé", status: "READY", priority: "HIGH", estimatedCost: 12000, finalCost: 12000, deposit: 5000, daysAgo: 3 },
    { ticketNumber: "R-20260103-1002", customerIdx: 1, deviceType: "phone", brand: "Apple", model: "iPhone 13", issue: "البطارية تفرغ بسرعة", status: "IN_REPAIR", priority: "MEDIUM", estimatedCost: 5500, finalCost: 0, deposit: 2000, daysAgo: 2 },
    { ticketNumber: "R-20260104-1003", customerIdx: 2, deviceType: "laptop", brand: "HP", model: "Pavilion 15", issue: "لا يشتغل — ne démarre plus", status: "DIAGNOSED", priority: "URGENT", estimatedCost: 8000, finalCost: 0, deposit: 0, daysAgo: 1 },
    { ticketNumber: "R-20260105-1004", customerIdx: 3, deviceType: "phone", brand: "Xiaomi", model: "Redmi Note 13", issue: "مشكلة في الشحن", status: "RECEIVED", priority: "LOW", estimatedCost: 3000, finalCost: 0, deposit: 0, daysAgo: 0 },
    { ticketNumber: "R-20260106-1005", customerIdx: 4, deviceType: "watch", brand: "Samsung", model: "Watch 6", issue: "الزجاج مخدوش", status: "WAITING_PARTS", priority: "MEDIUM", estimatedCost: 4500, finalCost: 0, deposit: 1500, daysAgo: 4 },
    { ticketNumber: "R-20260101-1006", customerIdx: 5, deviceType: "tablet", brand: "Apple", model: "iPad 10", issue: "زر الهوم لا يعمل", status: "DELIVERED", priority: "MEDIUM", estimatedCost: 6000, finalCost: 6000, deposit: 6000, daysAgo: 8 },
  ];
  for (const r of repairsData) {
    const createdAt = new Date(Date.now() - r.daysAgo * 24 * 3600 * 1000);
    await prisma.repair.upsert({
      where: { ticketNumber: r.ticketNumber },
      update: {},
      create: {
        ticketNumber: r.ticketNumber,
        customerId: customerIds[r.customerIdx],
        deviceType: r.deviceType,
        brand: r.brand,
        model: r.model,
        issue: r.issue,
        status: r.status,
        priority: r.priority,
        assignedToId: userIds["TECHNICIAN"],
        estimatedCost: r.estimatedCost,
        finalCost: r.finalCost,
        deposit: r.deposit,
        createdAt,
        history: { create: [{ toStatus: "RECEIVED", note: "Repair created" }, { fromStatus: "RECEIVED", toStatus: r.status, note: "Status update" }] },
      },
    });
  }
  console.log(`  repairs: ${repairsData.length}`);

  // ---- Sales ----
  const salesData = [
    { invoiceNumber: "INV-20260106-2001", customerIdx: 0, sku: "ACC-GLASS", qty: 2, daysAgo: 0, method: "cash" },
    { invoiceNumber: "INV-20260105-2002", customerIdx: 1, sku: "PH-SA55", qty: 1, daysAgo: 1, method: "card" },
    { invoiceNumber: "INV-20260104-2003", customerIdx: 2, sku: "AUD-BUDS2", qty: 1, daysAgo: 2, method: "cash" },
    { invoiceNumber: "INV-20260103-2004", customerIdx: null, sku: "ACC-CHG-25W", qty: 3, daysAgo: 3, method: "cash" },
    { invoiceNumber: "INV-20260102-2005", customerIdx: 3, sku: "PH-RN13", qty: 1, daysAgo: 4, method: "transfer" },
    { invoiceNumber: "INV-20260101-2006", customerIdx: 4, sku: "ACC-CASE-IP", qty: 5, daysAgo: 5, method: "cash" },
  ];
  for (const s of salesData) {
    const product = productMap[s.sku];
    const total = product.sellPrice * s.qty;
    await prisma.sale.upsert({
      where: { invoiceNumber: s.invoiceNumber },
      update: {},
      create: {
        invoiceNumber: s.invoiceNumber,
        customerId: s.customerIdx !== null ? customerIds[s.customerIdx] : null,
        subtotal: total,
        total,
        paymentMethod: s.method,
        amountPaid: total,
        status: "COMPLETED",
        cashierId: userIds["CASHIER"],
        createdAt: new Date(Date.now() - s.daysAgo * 24 * 3600 * 1000),
        items: { create: [{ productId: product.id, name: s.sku, quantity: s.qty, unitPrice: product.sellPrice, total }] },
      },
    });
  }
  console.log(`  sales: ${salesData.length}`);

  // ---- Expenses ----
  const expensesData = [
    { title: "كراء المحل — Loyer", category: "rent", amount: 80000, daysAgo: 5 },
    { title: "فاتورة الكهرباء", category: "utilities", amount: 6500, daysAgo: 3 },
    { title: "راتب الفني", category: "salary", amount: 60000, daysAgo: 6 },
    { title: "لوازم التنظيف", category: "supplies", amount: 3200, daysAgo: 2 },
  ];
  for (const e of expensesData) {
    await prisma.expense.create({
      data: { title: e.title, category: e.category, amount: e.amount, date: new Date(Date.now() - e.daysAgo * 24 * 3600 * 1000), createdById: userIds["ADMIN"] },
    });
  }
  console.log(`  expenses: ${expensesData.length}`);

  // ---- Purchase order ----
  await prisma.purchaseOrder.upsert({
    where: { poNumber: "PO-20260105-3001" },
    update: {},
    create: {
      poNumber: "PO-20260105-3001",
      supplier: "Ets El Amel Distribution",
      status: "ORDERED",
      subtotal: 45000,
      expectedDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      items: {
        create: [
          { name: "Tempered Glass 9H", quantity: 100, unitCost: 150, total: 15000 },
          { name: "Silicone Case iPhone", quantity: 100, unitCost: 300, total: 30000 },
        ],
      },
    },
  });
  console.log("  purchase orders: 1");

  // ---- Welcome notification ----
  await prisma.notification.create({
    data: {
      title: "Welcome to PhoneShop Pro — مرحباً بك",
      message: "Demo data loaded. Explore repairs, POS, inventory and reports.",
      type: "info",
      link: "/dashboard",
    },
  });

  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
