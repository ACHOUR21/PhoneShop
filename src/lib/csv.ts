// ============================================================
// PhoneShop Pro - CSV export helpers (6 modules)
// ============================================================

export type ExportModule =
  | "repairs"
  | "customers"
  | "sales"
  | "products"
  | "expenses"
  | "purchase-orders";

export const EXPORT_MODULES: ExportModule[] = [
  "repairs",
  "customers",
  "sales",
  "products",
  "expenses",
  "purchase-orders",
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  // BOM so Excel opens UTF-8 (Arabic) correctly
  return "\uFEFF" + lines.join("\r\n");
}

export function csvFilename(module: ExportModule): string {
  const date = new Date().toISOString().slice(0, 10);
  return `phoneshop-${module}-${date}.csv`;
}
