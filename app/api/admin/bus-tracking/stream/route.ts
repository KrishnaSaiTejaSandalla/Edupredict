import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { realtimeEmitter } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req, 'admin');
  if (!user) return new Response('Unauthorized', { status: 401 });

  const schoolId = user.school?.id ?? null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The browser may have closed the connection.
        }
      };

      send('connected', { schoolId });

      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      const onBusLocation = (event: { payload: { schoolId?: number | null } }) => {
        if (!schoolId || event.payload.schoolId === schoolId) {
          send('bus-location', event.payload);
        }
      };

      realtimeEmitter.on('bus-location', onBusLocation);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        realtimeEmitter.off('bus-location', onBusLocation);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
