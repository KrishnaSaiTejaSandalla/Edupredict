import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter = global.realtimeEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  global.realtimeEmitter = realtimeEmitter;
}

export function broadcastNotification(userId: number, payload: any) {
  realtimeEmitter.emit('notification', {
    userId,
    type: 'notification',
    payload,
  });
}

export function broadcastMessage(conversationId: string, messagePayload: any) {
  realtimeEmitter.emit('message', {
    senderId: messagePayload.senderId,
    receiverId: messagePayload.receiverId,
    conversationId,
    type: 'message',
    payload: messagePayload,
  });
}

export function broadcastEntityChange(
  entity: string,
  action: 'create' | 'update' | 'delete' | 'invalidate',
  payload: any
) {
  realtimeEmitter.emit('entity-change', {
    entity,
    action,
    payload,
  });
}

export function broadcastBusLocation(payload: any) {
  realtimeEmitter.emit('bus-location', {
    type: 'bus-location',
    payload,
  });
}
