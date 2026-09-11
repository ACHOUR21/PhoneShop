import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  broadcast,
  clearClients,
  clientCount,
  formatSSE,
  generateClientId,
  pingAll,
  registerClient,
  removeClient,
} from "@/lib/sse";

describe("SSE manager", () => {
  beforeEach(() => clearClients());

  it("registers a client and returns an id", () => {
    const id = registerClient(() => {});
    expect(id).toMatch(/^sse-/);
    expect(clientCount()).toBe(1);
  });

  it("generates unique client ids", () => {
    const ids = new Set([generateClientId(), generateClientId(), generateClientId()]);
    expect(ids.size).toBe(3);
  });

  it("removes a client", () => {
    const id = registerClient(() => {});
    expect(removeClient(id)).toBe(true);
    expect(clientCount()).toBe(0);
  });

  it("returns false when removing unknown client", () => {
    expect(removeClient("nope")).toBe(false);
  });

  it("broadcasts to all clients", () => {
    const a = vi.fn();
    const b = vi.fn();
    registerClient(a);
    registerClient(b);
    const delivered = broadcast({ type: "notification", title: "Hi", message: "there" });
    expect(delivered).toBe(2);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("formats SSE payload with event + data frames", () => {
    const chunk = formatSSE({ type: "ping", timestamp: "2026-01-01T00:00:00.000Z" });
    expect(chunk.startsWith("event: ping\n")).toBe(true);
    expect(chunk).toContain('"type":"ping"');
    expect(chunk.endsWith("\n\n")).toBe(true);
  });

  it("targets a single user when userId is set", () => {
    const mine = vi.fn();
    const other = vi.fn();
    registerClient(mine, "user-1");
    registerClient(other, "user-2");
    broadcast({ type: "notification", title: "t", message: "m", userId: "user-1" });
    expect(mine).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });

  it("anonymous clients still receive global broadcasts", () => {
    const anon = vi.fn();
    registerClient(anon);
    broadcast({ type: "notification", title: "t", message: "m" });
    expect(anon).toHaveBeenCalledTimes(1);
  });

  it("prunes clients whose send throws", () => {
    registerClient(() => {
      throw new Error("dead");
    });
    const delivered = broadcast({ type: "ping" });
    expect(delivered).toBe(0);
    expect(clientCount()).toBe(0);
  });

  it("pingAll broadcasts a ping event", () => {
    const fn = vi.fn();
    registerClient(fn);
    pingAll();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toContain("event: ping");
  });
});
