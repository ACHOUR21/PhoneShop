"use client";

import { Badge } from "./badge";
import { useTranslation } from "@/hooks/use-translation";
import { normalizeStatus } from "@/lib/constants";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
  RECEIVED: "info",
  DIAGNOSED: "purple",
  IN_REPAIR: "warning",
  WAITING_PARTS: "secondary",
  READY: "success",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

export function RepairStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const normalized = normalizeStatus(status);
  return <Badge variant={STATUS_VARIANT[normalized] ?? "outline"}>{t(`status.${normalized}`)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  return <Badge variant={PRIORITY_VARIANT[priority] ?? "outline"}>{t(`priority.${priority}`)}</Badge>;
}

export function SaleStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant = status === "COMPLETED" ? "success" : status === "PENDING" ? "warning" : "destructive";
  return <Badge variant={variant}>{t(`sale.${status}`)}</Badge>;
}

export function POStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant =
    status === "RECEIVED" ? "success" : status === "ORDERED" || status === "PARTIAL" ? "info" : status === "CANCELLED" ? "destructive" : "secondary";
  return <Badge variant={variant}>{t(`poStatus.${status}`)}</Badge>;
}

export function StockBadge({ quantity, min }: { quantity: number; min: number }) {
  const { t } = useTranslation();
  if (quantity <= 0) return <Badge variant="destructive">{t("inventory.outOfStock")}</Badge>;
  if (quantity <= min) return <Badge variant="warning">{t("inventory.lowStock")}</Badge>;
  return <Badge variant="success">{t("inventory.inStock")}</Badge>;
}
