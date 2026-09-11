import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatSSE, registerClient, removeClient } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const encoder = new TextEncoder();
  let clientId = "";
  let keepalive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* client gone */
        }
      };
      clientId = registerClient(send, userId);
      // Initial hello so the client knows the stream is open
      send(formatSSE({ type: "ping", timestamp: new Date().toISOString() }));
      keepalive = setInterval(() => {
        send(`: keepalive ${Date.now()}\n\n`);
      }, 25000);
    },
    cancel() {
      if (keepalive) clearInterval(keepalive);
      if (clientId) removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
