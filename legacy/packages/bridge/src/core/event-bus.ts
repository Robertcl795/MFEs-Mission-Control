import type { BridgeEventMap, Unsubscribe } from '../schema/types';

export type EventHandler<T> = (payload: T) => void;

/**
 * Typed publish/subscribe bus shared by the host and every remote.
 * The host owns the single instance; remotes obtain it via `getBridge().bus`.
 */
export interface EventBus<TMap extends object = BridgeEventMap> {
  on<K extends keyof TMap & string>(event: K, handler: EventHandler<TMap[K]>): Unsubscribe;
  once<K extends keyof TMap & string>(event: K, handler: EventHandler<TMap[K]>): Unsubscribe;
  emit<K extends keyof TMap & string>(event: K, payload: TMap[K]): void;
  /** Subscribe to every event; useful for devtools / agent introspection. */
  onAny(handler: (event: string, payload: unknown) => void): Unsubscribe;
}

export function createEventBus<TMap extends object = BridgeEventMap>(): EventBus<TMap> {
  const handlers = new Map<string, Set<EventHandler<unknown>>>();
  const anyHandlers = new Set<(event: string, payload: unknown) => void>();

  const on = (event: string, handler: EventHandler<never>): Unsubscribe => {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => set.delete(handler as EventHandler<unknown>);
  };

  return {
    on,
    once(event, handler) {
      const off = on(event, ((payload: never) => {
        off();
        handler(payload);
      }) as EventHandler<never>);
      return off;
    },
    emit(event, payload) {
      handlers.get(event)?.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          // One bad subscriber must never break the others.
          console.error(`[bridge:bus] handler for "${event}" threw`, err);
        }
      });
      anyHandlers.forEach((handler) => {
        try {
          handler(event, payload);
        } catch (err) {
          console.error('[bridge:bus] onAny handler threw', err);
        }
      });
    },
    onAny(handler) {
      anyHandlers.add(handler);
      return () => anyHandlers.delete(handler);
    },
  };
}
