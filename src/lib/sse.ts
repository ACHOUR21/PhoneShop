// ============================================================
// PhoneShop Pro - In-process SSE pub/sub manager
// (no external Socket.IO server needed)
// ============================================================

export type SSEEventType =
  | "notification"
  | "repair.updated"
  | "repair.created"
  | "sale.created"
  | "stock.low"
  | "ping";

export interface SSEPayload {
  type: SSEEventType;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  userId?: string | null; // null/undefined = broadcast to all
  link?: string;
  timestamp: string;
}

interface SSEClient {
  id: string;
  userId?: string | null;
  send: (chunk: string) => void;
  connectedAt: number;
}

// Module-level registry (per Node process)
const clients = new Map<string, SSEClient>();

let counter = 0;
export function generateClientId(): string {
  counter += 1;
  return `sse-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function registerClient(send: (chunk: string) => void, userId?: string | null): string {
  const id = generateClientId();
  clients.set(id, { id, userId: userId ?? null, send, connectedAt: Date.now() });
  return id;
}

export function removeClient(id: string): boolean {
  return clients.delete(id);
}

export function clientCount(): number {
  return clients.size;
}

export function getClients(): SSEClient[] {
  return Array.from(clients.values());
}

export function clearClients(): void {
  clients.clear();
}

export function formatSSE(payload: SSEPayload): string {
  return `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/** Broadcast an event. If payload.userId is set, only that user's clients receive it. */
export function broadcast(input: Omit<SSEPayload, "timestamp"> & { timestamp?: string }): number {
  const payload: SSEPayload = {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  const chunk = formatSSE(payload);
  let delivered = 0;
  for (const client of clients.values()) {
    // Targeted event: only matching user (clients without userId still get global events)
    if (payload.userId && client.userId && client.userId !== payload.userId) continue;
    try {
      client.send(chunk);
      delivered += 1;
    } catch {
      clients.delete(client.id);
    }
  }
  return delivered;
}

/** Keep-alive ping to prune dead connections */
export function pingAll(): number {
  return broadcast({ type: "ping" });
}
