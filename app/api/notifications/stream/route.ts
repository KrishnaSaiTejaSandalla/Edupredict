import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { realtimeEmitter } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roleQuery = searchParams.get("role");
  const user = await getCurrentUser(req, roleQuery || undefined);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // ignore stream write errors
        }
      };

      // Initial keep-alive message
      sendUpdate("connected", { userId });

      // Keep connection alive with periodic comments
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch (e) {
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      const onNotification = (notif: { userId: number; type: string; payload: any }) => {
        if (notif.userId === userId) {
          sendUpdate("notification", notif.payload);
        }
      };

      const onMessage = (msg: { senderId: number; receiverId: number; conversationId: string; type: string; payload: any }) => {
        if (msg.receiverId === userId || msg.senderId === userId) {
          sendUpdate("message", msg.payload);
        }
      };

      const onEntityChange = (change: { entity: string; action: string; payload: any }) => {
        sendUpdate("entity-change", change);
      };

      realtimeEmitter.on("notification", onNotification);
      realtimeEmitter.on("message", onMessage);
      realtimeEmitter.on("entity-change", onEntityChange);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        realtimeEmitter.off("notification", onNotification);
        realtimeEmitter.off("message", onMessage);
        realtimeEmitter.off("entity-change", onEntityChange);
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
