// src/notifications/notificationEvents.ts
export type NotificationEvent = {
  type: 'message';
};

type Listener = (event: NotificationEvent) => void;

const listeners = new Set<Listener>();

export const subscribeNotificationEvents = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitNotificationEvent = (event: NotificationEvent) => {
  listeners.forEach((listener) => listener(event));
};
