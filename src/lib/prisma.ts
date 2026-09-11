// ============================================================
// PhoneShop Pro - data layer (node:sqlite backed, Prisma-like API)
// Drop-in replacement for @prisma/client where the Prisma engine
// binaries are unreachable. Supports the query surface used by the
// app: findUnique/findFirst/findMany/count/create/update/updateMany/
// upsert/delete/aggregate/groupBy + select/include/nested creates.
// Dates are stored as ISO strings, booleans as 0/1.
// ============================================================

import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { mkdirSync } from "fs";
import { dirname, isAbsolute, join } from "path";

// ---------- connection ----------

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const p = url.startsWith("file:") ? url.slice(5) : url;
  return isAbsolute(p) ? p : join(process.cwd(), p);
}

const globalForDb = globalThis as unknown as { __phoneshopDb?: DatabaseSync };

// Production bootstrap: if BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD are
// set and the database has no users yet, create the initial admin account.
// Idempotent — a no-op once any user exists (or when the vars are unset).
function maybeBootstrapAdmin(db: DatabaseSync) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;
  try {
    const row = db.prepare("SELECT COUNT(*) AS n FROM User").get() as { n: number };
    if (row.n > 0) return;
    const id = "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO User (id, name, email, password, role, active, language, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'ADMIN', 1, 'ar', ?, ?)`
    ).run(id, "Admin", email, bcrypt.hashSync(password, 10), now, now);
    console.log(`[bootstrap] admin user created: ${email}`);
  } catch (e) {
    console.error("[bootstrap] failed:", e);
  }
}

function getDb(): DatabaseSync {
  if (!globalForDb.__phoneshopDb) {
    const file = resolveDbPath();
    mkdirSync(dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
    maybeBootstrapAdmin(db);
    globalForDb.__phoneshopDb = db;
  }
  return globalForDb.__phoneshopDb;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'CASHIER',
      phone TEXT, avatar TEXT, active INTEGER NOT NULL DEFAULT 1,
      twoFactorEnabled INTEGER NOT NULL DEFAULT 0, twoFactorSecret TEXT,
      language TEXT NOT NULL DEFAULT 'ar',
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      userAgent TEXT, ip TEXT, createdAt TEXT NOT NULL,
      lastActive TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Customer (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
      email TEXT, address TEXT, city TEXT, notes TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Repair (
      id TEXT PRIMARY KEY, ticketNumber TEXT UNIQUE NOT NULL, customerId TEXT NOT NULL REFERENCES Customer(id) ON DELETE CASCADE,
      deviceType TEXT NOT NULL DEFAULT 'phone', brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
      serial TEXT, issue TEXT NOT NULL, diagnosis TEXT,
      status TEXT NOT NULL DEFAULT 'RECEIVED', priority TEXT NOT NULL DEFAULT 'MEDIUM',
      assignedToId TEXT REFERENCES User(id),
      estimatedCost REAL NOT NULL DEFAULT 0, finalCost REAL NOT NULL DEFAULT 0, deposit REAL NOT NULL DEFAULT 0,
      dueDate TEXT, returnedAt TEXT, notes TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS RepairStatusHistory (
      id TEXT PRIMARY KEY, repairId TEXT NOT NULL REFERENCES Repair(id) ON DELETE CASCADE,
      fromStatus TEXT, toStatus TEXT NOT NULL, changedById TEXT REFERENCES User(id),
      note TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Product (
      id TEXT PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general', brand TEXT, description TEXT,
      costPrice REAL NOT NULL DEFAULT 0, sellPrice REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0, minQuantity INTEGER NOT NULL DEFAULT 5,
      image TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Sale (
      id TEXT PRIMARY KEY, invoiceNumber TEXT UNIQUE NOT NULL, customerId TEXT REFERENCES Customer(id),
      subtotal REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0, paymentMethod TEXT NOT NULL DEFAULT 'cash',
      amountPaid REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'COMPLETED',
      cashierId TEXT REFERENCES User(id), notes TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS SaleItem (
      id TEXT PRIMARY KEY, saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
      productId TEXT REFERENCES Product(id),
      name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
      unitPrice REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS PurchaseOrder (
      id TEXT PRIMARY KEY, poNumber TEXT UNIQUE NOT NULL, supplier TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT', expectedDate TEXT, receivedDate TEXT,
      subtotal REAL NOT NULL DEFAULT 0, notes TEXT,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS PurchaseItem (
      id TEXT PRIMARY KEY, poId TEXT NOT NULL REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
      productId TEXT REFERENCES Product(id),
      name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
      unitCost REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, received INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'general',
      amount REAL NOT NULL DEFAULT 0, date TEXT NOT NULL,
      paidBy TEXT, notes TEXT, createdById TEXT REFERENCES User(id), createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY, userId TEXT REFERENCES User(id) ON DELETE CASCADE,
      title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info',
      read INTEGER NOT NULL DEFAULT 0, link TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Setting (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_repair_customer ON Repair(customerId);
    CREATE INDEX IF NOT EXISTS idx_repair_status ON Repair(status);
    CREATE INDEX IF NOT EXISTS idx_sale_created ON Sale(createdAt);
    CREATE INDEX IF NOT EXISTS idx_notif_created ON Notification(createdAt);
  `);
}

// ---------- model metadata ----------

interface RelationDef {
  model: string;
  fk: string; // FK column holding the link
  many: boolean; // true = FK lives on the related table
}

interface ModelDef {
  table: string;
  dates: string[];
  bools: string[];
  relations: Record<string, RelationDef>;
}

const MODELS: Record<string, ModelDef> = {
  user: {
    table: "User",
    dates: ["createdAt", "updatedAt"],
    bools: ["active", "twoFactorEnabled"],
    relations: {},
  },
  session: {
    table: "Session",
    dates: ["createdAt", "lastActive"],
    bools: ["revoked"],
    relations: { user: { model: "user", fk: "userId", many: false } },
  },
  customer: {
    table: "Customer",
    dates: ["createdAt", "updatedAt"],
    bools: [],
    relations: {
      repairs: { model: "repair", fk: "customerId", many: true },
      sales: { model: "sale", fk: "customerId", many: true },
    },
  },
  repair: {
    table: "Repair",
    dates: ["dueDate", "returnedAt", "createdAt", "updatedAt"],
    bools: [],
    relations: {
      customer: { model: "customer", fk: "customerId", many: false },
      assignedTo: { model: "user", fk: "assignedToId", many: false },
      history: { model: "repairStatusHistory", fk: "repairId", many: true },
    },
  },
  repairStatusHistory: {
    table: "RepairStatusHistory",
    dates: ["createdAt"],
    bools: [],
    relations: {
      repair: { model: "repair", fk: "repairId", many: false },
      changedBy: { model: "user", fk: "changedById", many: false },
    },
  },
  product: {
    table: "Product",
    dates: ["createdAt", "updatedAt"],
    bools: [],
    relations: {},
  },
  sale: {
    table: "Sale",
    dates: ["createdAt"],
    bools: [],
    relations: {
      customer: { model: "customer", fk: "customerId", many: false },
      cashier: { model: "user", fk: "cashierId", many: false },
      items: { model: "saleItem", fk: "saleId", many: true },
    },
  },
  saleItem: {
    table: "SaleItem",
    dates: [],
    bools: [],
    relations: { product: { model: "product", fk: "productId", many: false } },
  },
  purchaseOrder: {
    table: "PurchaseOrder",
    dates: ["expectedDate", "receivedDate", "createdAt", "updatedAt"],
    bools: [],
    relations: { items: { model: "purchaseItem", fk: "poId", many: true } },
  },
  purchaseItem: {
    table: "PurchaseItem",
    dates: [],
    bools: [],
    relations: {},
  },
  expense: {
    table: "Expense",
    dates: ["date", "createdAt"],
    bools: [],
    relations: { createdBy: { model: "user", fk: "createdById", many: false } },
  },
  notification: {
    table: "Notification",
    dates: ["createdAt"],
    bools: ["read"],
    relations: { user: { model: "user", fk: "userId", many: false } },
  },
  setting: { table: "Setting", dates: [], bools: [], relations: {} },
};

function uid(): string {
  return "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toStored(model: string, key: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const def = MODELS[model];
  if (def.bools.includes(key)) return value ? 1 : 0;
  if (def.dates.includes(key)) {
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
  return value;
}

function fromStored(model: string, row: Record<string, unknown>): Record<string, unknown> {
  const def = MODELS[model];
  const out: Record<string, unknown> = { ...row };
  for (const k of def.bools) {
    if (out[k] !== null && out[k] !== undefined) out[k] = Number(out[k]) === 1;
  }
  for (const k of def.dates) {
    if (out[k] !== null && out[k] !== undefined) out[k] = new Date(String(out[k]));
  }
  return out;
}

// ---------- where builder ----------

type Where = Record<string, unknown>;

function buildWhere(model: string, where: Where | undefined, params: unknown[]): string {
  if (!where || Object.keys(where).length === 0) return "";
  const clauses: string[] = [];

  for (const [key, raw] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(raw)) {
      const parts = raw.map((sub) => {
        const sql = buildWhere(model, sub as Where, params);
        return sql ? `(${sql})` : null;
      }).filter(Boolean) as string[];
      if (parts.length > 0) clauses.push(`(${parts.join(" OR ")})`);
      continue;
    }
    if (key === "AND" && Array.isArray(raw)) {
      const parts = raw.map((sub) => {
        const sql = buildWhere(model, sub as Where, params);
        return sql ? `(${sql})` : null;
      }).filter(Boolean) as string[];
      if (parts.length > 0) clauses.push(`(${parts.join(" AND ")})`);
      continue;
    }
    const value = raw as Record<string, unknown> | unknown;
    if (value !== null && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      if ("contains" in value) {
        clauses.push(`"${key}" LIKE ?`);
        params.push(`%${String(value.contains)}%`);
      } else if ("gte" in value) {
        clauses.push(`"${key}" >= ?`);
        params.push(toStored(model, key, value.gte));
      } else if ("lte" in value) {
        clauses.push(`"${key}" <= ?`);
        params.push(toStored(model, key, value.lte));
      } else if ("notIn" in value) {
        const list = (value.notIn as unknown[]).map((v) => toStored(model, key, v));
        if (list.length === 0) clauses.push("1=1");
        else {
          clauses.push(`"${key}" NOT IN (${list.map(() => "?").join(",")})`);
          params.push(...list);
        }
      } else if ("in" in value) {
        const list = (value.in as unknown[]).map((v) => toStored(model, key, v));
        if (list.length === 0) clauses.push("1=0");
        else {
          clauses.push(`"${key}" IN (${list.map(() => "?").join(",")})`);
          params.push(...list);
        }
      } else if ("not" in value) {
        clauses.push(`"${key}" != ?`);
        params.push(toStored(model, key, value.not));
      }
    } else if (value === null) {
      clauses.push(`"${key}" IS NULL`);
    } else {
      clauses.push(`"${key}" = ?`);
      params.push(toStored(model, key, value));
    }
  }
  return clauses.join(" AND ");
}

function buildOrderBy(orderBy: Record<string, string> | undefined): string {
  if (!orderBy) return "";
  const parts = Object.entries(orderBy).map(
    ([k, v]) => `"${k}" ${String(v).toUpperCase() === "DESC" ? "DESC" : "ASC"}`
  );
  return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : "";
}

// ---------- row shaping (select/include) ----------

interface QueryArgs {
  where?: Where;
  orderBy?: Record<string, string>;
  skip?: number;
  take?: number;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
}

function applySelect(model: string, row: Record<string, unknown>, select?: Record<string, unknown>): Record<string, unknown> {
  if (!select) return row;
  const def = MODELS[model];
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(select)) {
    if (v && key in row) out[key] = row[key];
    // relation entries inside select are attached later via attachRelations
  }
  // Always retain id + FK columns so relation joins keep working
  if ("id" in row) out.id = row.id;
  for (const rel of Object.values(def.relations)) {
    if (rel.fk in row) out[rel.fk] = row[rel.fk];
  }
  return out;
}

function attachRelations(
  model: string,
  row: Record<string, unknown>,
  select: Record<string, unknown> | undefined,
  include: Record<string, unknown> | undefined
): Record<string, unknown> {
  const def = MODELS[model];
  const wanted: Record<string, unknown> = { ...(include ?? {}) };
  // relations can also be requested inside select: { history: { select: ... } }
  if (select) {
    for (const [key, v] of Object.entries(select)) {
      if (v && typeof v === "object" && def.relations[key]) wanted[key] = v;
    }
  }
  // _count special case
  if (include && "_count" in include) {
    const spec = include._count as { select?: Record<string, boolean> };
    const counts: Record<string, number> = {};
    const rels = spec?.select ? Object.keys(spec.select) : Object.keys(def.relations).filter((r) => def.relations[r].many);
    for (const rel of rels) {
      const r = def.relations[rel];
      if (r?.many) {
        counts[rel] = countRows(r.model, { [r.fk]: row.id } as Where);
      }
    }
    row._count = counts;
  }

  for (const [relName, spec] of Object.entries(wanted)) {
    if (relName === "_count") continue;
    const rel = def.relations[relName];
    if (!rel) continue;
    const args = (spec && typeof spec === "object" ? (spec as QueryArgs) : {}) as QueryArgs;
    if (rel.many) {
      row[relName] = findManyRows(rel.model, {
        ...args,
        where: { ...(args.where ?? {}), [rel.fk]: row.id },
      });
    } else {
      const fkVal = row[rel.fk];
      row[relName] = fkVal == null ? null : findOneRow(rel.model, { where: { id: fkVal } as Where, select: args.select as Record<string, unknown> | undefined, include: args.include as Record<string, unknown> | undefined });
    }
  }
  return row;
}

// ---------- core operations ----------

function findManyRows(model: string, args: QueryArgs = {}): Record<string, unknown>[] {
  const db = getDb();
  const def = MODELS[model];
  const params: unknown[] = [];
  const whereSql = buildWhere(model, args.where, params);
  const orderSql = buildOrderBy(args.orderBy);
  let sql = `SELECT * FROM "${def.table}"`;
  if (whereSql) sql += ` WHERE ${whereSql}`;
  if (orderSql) sql += ` ${orderSql}`;
  if (args.take !== undefined) sql += ` LIMIT ${Number(args.take)}`;
  if (args.skip) sql += ` OFFSET ${Number(args.skip)}`;
  const rows = db.prepare(sql).all(...(params as [])) as Record<string, unknown>[];
  return rows.map((r) => {
    const shaped = fromStored(model, r);
    const selected = applySelect(model, shaped, args.select);
    return attachRelations(model, selected, args.select, args.include);
  });
}

function findOneRow(model: string, args: QueryArgs = {}): Record<string, unknown> | null {
  const rows = findManyRows(model, { ...args, take: 1 });
  return rows[0] ?? null;
}

function countRows(model: string, where?: Where): number {
  const db = getDb();
  const def = MODELS[model];
  const params: unknown[] = [];
  const whereSql = buildWhere(model, where, params);
  let sql = `SELECT COUNT(*) as n FROM "${def.table}"`;
  if (whereSql) sql += ` WHERE ${whereSql}`;
  const row = db.prepare(sql).get(...(params as [])) as { n: number };
  return row.n;
}

function insertRow(model: string, data: Record<string, unknown>): Record<string, unknown> {
  const db = getDb();
  const def = MODELS[model];
  const now = new Date().toISOString();
  const row: Record<string, unknown> = { ...data };
  if (!row.id) row.id = uid();
  if ("createdAt" in row === false && hasColumn(def.table, "createdAt")) {
    // set timestamps for tables that have them
  }
  // Apply timestamps generically
  const cols = getColumns(def.table);
  if (cols.includes("createdAt") && row.createdAt === undefined) row.createdAt = now;
  if (cols.includes("updatedAt") && row.updatedAt === undefined) row.updatedAt = now;
  if (cols.includes("lastActive") && row.lastActive === undefined) row.lastActive = now;
  if (cols.includes("date") && row.date === undefined) row.date = now;

  const keys = Object.keys(row).filter((k) => !MODELS[model].relations[k] && row[k] !== undefined);
  const stored = keys.map((k) => toStored(model, k, row[k]));
  const sql = `INSERT INTO "${def.table}" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
  db.prepare(sql).run(...(stored as []));

  // nested one-to-many creates: { items: { create: [...] } }
  for (const [relName, rel] of Object.entries(def.relations)) {
    const nested = row[relName] as { create?: Record<string, unknown> | Record<string, unknown>[] } | undefined;
    if (nested && rel.many && nested.create) {
      const list = Array.isArray(nested.create) ? nested.create : [nested.create];
      for (const item of list) {
        insertRow(rel.model, { ...item, [rel.fk]: row.id });
      }
    }
  }
  return findOneRow(model, { where: { id: row.id } as Where })!;
}

// PRAGMA table_info cache
const columnsCache: Record<string, string[]> = {};
function getColumns(table: string): string[] {
  if (!columnsCache[table]) {
    const db = getDb();
    const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    columnsCache[table] = info.map((c) => c.name);
  }
  return columnsCache[table];
}
function hasColumn(table: string, col: string): boolean {
  return getColumns(table).includes(col);
}

function updateRows(model: string, where: Where, data: Record<string, unknown>): number {
  const db = getDb();
  const def = MODELS[model];
  const matched = findManyRows(model, { where });
  const cols = getColumns(def.table);

  for (const existing of matched) {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, raw] of Object.entries(data)) {
      if (def.relations[key]) continue; // nested handled below
      if (raw !== null && typeof raw === "object" && !(raw instanceof Date)) {
        const op = raw as Record<string, number>;
        if ("increment" in op) {
          sets.push(`"${key}" = "${key}" + ?`);
          params.push(op.increment);
          continue;
        }
        if ("decrement" in op) {
          sets.push(`"${key}" = "${key}" - ?`);
          params.push(op.decrement);
          continue;
        }
      }
      sets.push(`"${key}" = ?`);
      params.push(toStored(model, key, raw));
    }
    if (cols.includes("updatedAt")) {
      sets.push(`"updatedAt" = ?`);
      params.push(new Date().toISOString());
    }
    if (sets.length > 0) {
      params.push(existing.id);
      db.prepare(`UPDATE "${def.table}" SET ${sets.join(", ")} WHERE "id" = ?`).run(...(params as []));
    }
    // nested creates on update: { history: { create: {...} } }
    for (const [relName, rel] of Object.entries(def.relations)) {
      const nested = data[relName] as { create?: Record<string, unknown> | Record<string, unknown>[] } | undefined;
      if (nested && rel.many && nested.create) {
        const list = Array.isArray(nested.create) ? nested.create : [nested.create];
        for (const item of list) {
          insertRow(rel.model, { ...item, [rel.fk]: existing.id });
        }
      }
    }
  }
  return matched.length;
}

// ---------- model delegate factory ----------

function delegate(model: string) {
  return {
    findUnique: async (args: QueryArgs) => findOneRow(model, args),
    findFirst: async (args: QueryArgs) => findOneRow(model, args),
    findMany: async (args: QueryArgs = {}) => findManyRows(model, args),
    count: async (args: { where?: Where } = {}) => countRows(model, args.where),
    create: async (args: { data: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      const created = insertRow(model, args.data);
      const selected = applySelect(model, created, args.select);
      return attachRelations(model, selected, args.select, args.include);
    },
    update: async (args: { where: Where; data: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      updateRows(model, args.where, args.data);
      const row = findOneRow(model, { where: args.where });
      if (!row) throw new Error(`${model} not found`);
      const selected = applySelect(model, row, args.select);
      return attachRelations(model, selected, args.select, args.include);
    },
    updateMany: async (args: { where?: Where; data: Record<string, unknown> }) => {
      const count = updateRows(model, args.where ?? {}, args.data);
      return { count };
    },
    upsert: async (args: { where: Where; update: Record<string, unknown>; create: Record<string, unknown>; select?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      const existing = findOneRow(model, { where: args.where });
      if (existing) {
        if (Object.keys(args.update).length > 0) {
          updateRows(model, { id: existing.id } as Where, args.update);
          const row = findOneRow(model, { where: { id: existing.id } as Where })!;
          const selected = applySelect(model, row, args.select);
          return attachRelations(model, selected, args.select, args.include);
        }
        const selected = applySelect(model, existing, args.select);
        return attachRelations(model, selected, args.select, args.include);
      }
      const created = insertRow(model, args.create);
      const selected = applySelect(model, created, args.select);
      return attachRelations(model, selected, args.select, args.include);
    },
    delete: async (args: { where: Where }) => {
      const db = getDb();
      const def = MODELS[model];
      const existing = findOneRow(model, { where: args.where });
      if (!existing) throw new Error(`${model} not found`);
      const params: unknown[] = [];
      const whereSql = buildWhere(model, args.where, params);
      db.prepare(`DELETE FROM "${def.table}" WHERE ${whereSql}`).run(...(params as []));
      return existing;
    },
    deleteMany: async (args: { where?: Where } = {}) => {
      const db = getDb();
      const def = MODELS[model];
      const params: unknown[] = [];
      const whereSql = buildWhere(model, args.where, params);
      const sql = whereSql ? `DELETE FROM "${def.table}" WHERE ${whereSql}` : `DELETE FROM "${def.table}"`;
      const info = db.prepare(sql).run(...(params as []));
      return { count: Number(info.changes) };
    },
    aggregate: async (args: { where?: Where; _sum?: Record<string, boolean> }) => {
      const db = getDb();
      const def = MODELS[model];
      const params: unknown[] = [];
      const whereSql = buildWhere(model, args.where, params);
      const out: Record<string, unknown> = {};
      if (args._sum) {
        const sums: Record<string, number> = {};
        for (const field of Object.keys(args._sum)) {
          let sql = `SELECT COALESCE(SUM("${field}"), 0) as v FROM "${def.table}"`;
          if (whereSql) sql += ` WHERE ${whereSql}`;
          const row = db.prepare(sql).get(...(params as [])) as { v: number };
          sums[field] = row.v;
        }
        out._sum = sums;
      }
      return out;
    },
    groupBy: async (args: { by: string[]; where?: Where; _count?: Record<string, boolean> }) => {
      const db = getDb();
      const def = MODELS[model];
      const params: unknown[] = [];
      const whereSql = buildWhere(model, args.where, params);
      const byList = args.by.map((b) => `"${b}"`).join(", ");
      let sql = `SELECT ${byList}, COUNT(*) as _n FROM "${def.table}"`;
      if (whereSql) sql += ` WHERE ${whereSql}`;
      sql += ` GROUP BY ${byList}`;
      const rows = db.prepare(sql).all(...(params as [])) as Record<string, unknown>[];
      return rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const b of args.by) out[b] = r[b];
        if (args._count) {
          const counts: Record<string, unknown> = {};
          for (const k of Object.keys(args._count)) counts[k] = r._n;
          out._count = counts;
        }
        return out;
      });
    },
  };
}

export const prisma = {
  user: delegate("user"),
  session: delegate("session"),
  customer: delegate("customer"),
  repair: delegate("repair"),
  repairStatusHistory: delegate("repairStatusHistory"),
  product: delegate("product"),
  sale: delegate("sale"),
  saleItem: delegate("saleItem"),
  purchaseOrder: delegate("purchaseOrder"),
  purchaseItem: delegate("purchaseItem"),
  expense: delegate("expense"),
  notification: delegate("notification"),
  setting: delegate("setting"),
  $disconnect: async () => {},
};

export default prisma;
