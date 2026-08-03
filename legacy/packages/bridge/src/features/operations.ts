import type { EventBus } from '../core/event-bus';
import type { OperationSnapshot, OperationStatus, Unsubscribe } from '../schema/types';
import type { SharedDataCache } from './data-cache';

export interface OperationPollResult<TResult = unknown> {
  status: Extract<OperationStatus, 'running' | 'completed' | 'failed'>;
  /** 0..100 */
  progress?: number;
  message?: string;
  /** Required when status === 'completed'. Stored in the SharedDataCache under `cacheKey`. */
  result?: TResult;
  error?: string;
}

export interface OperationDescriptor<TResult = unknown> {
  /** Stable id; generated when omitted. */
  id?: string;
  /** Namespaced kind, e.g. `report:generate`. */
  kind: string;
  title: string;
  /** Poll cadence in ms. Default 1000. */
  intervalMs?: number;
  /** Where the result lands in the shared SharedDataCache on completion. */
  cacheKey?: string;
  /** Host route for the "view result" toast action. */
  resultRoute?: string;
  /**
   * Called on every tick FROM THE HOST context. The closure is created by
  * the remote that starts the operation, but its lifecycle belongs to the host —
   * it keeps running when the remote unmounts or the user navigates away.
   */
  poll: (tick: number, snapshot: OperationSnapshot) => Promise<OperationPollResult<TResult>>;
}

/**
 * Host-owned long-running operation orchestrator.
 *
 * CONTRACT: remotes *start* operations but never own their timers. Progress and
 * terminal states are broadcast on the EventBus (`operation:*` events), results
 * are written to the SharedDataCache, and the host renders global toasts — so a
 * report started in `reports` finishes even while the user is
 * browsing `analytics`.
 */
export interface AsyncOperationManager {
  start<TResult>(descriptor: OperationDescriptor<TResult>): OperationSnapshot;
  get(id: string): OperationSnapshot | undefined;
  list(): OperationSnapshot[];
  cancel(id: string): void;
  /** Fires on any operation state change (start, progress, terminal). */
  subscribe(listener: (snapshot: OperationSnapshot) => void): Unsubscribe;
}

export function createAsyncOperationManager(bus: EventBus, cache: SharedDataCache): AsyncOperationManager {
  interface InternalOperation {
    snapshot: OperationSnapshot;
    timer: ReturnType<typeof setInterval> | null;
  }

  const operations = new Map<string, InternalOperation>();
  const listeners = new Set<(snapshot: OperationSnapshot) => void>();
  let seq = 0;

  const publish = (
    snapshot: OperationSnapshot,
    event: 'operation:started' | 'operation:progress' | 'operation:completed' | 'operation:failed',
  ) => {
    listeners.forEach((listener) => listener(snapshot));
    bus.emit(event, snapshot);
  };

  const finish = (operation: InternalOperation, patch: Partial<OperationSnapshot>) => {
    if (operation.timer) clearInterval(operation.timer);
    operation.timer = null;
    operation.snapshot = { ...operation.snapshot, ...patch, finishedAt: Date.now() };
  };

  return {
    start(descriptor) {
      const id = descriptor.id ?? `operation-${Date.now()}-${++seq}`;
      const existing = operations.get(id);
      // Idempotent: restarting a live operation returns it instead of forking timers.
      if (existing && existing.snapshot.status === 'running') return existing.snapshot;

      const snapshot: OperationSnapshot = {
        id,
        kind: descriptor.kind,
        title: descriptor.title,
        status: 'running',
        progress: 0,
        startedAt: Date.now(),
        cacheKey: descriptor.cacheKey,
        resultRoute: descriptor.resultRoute,
      };
      const operation: InternalOperation = { snapshot, timer: null };
      operations.set(id, operation);
      publish(snapshot, 'operation:started');

      let tick = 0;
      let polling = false;
      operation.timer = setInterval(async () => {
        if (polling || operation.snapshot.status !== 'running') return;
        polling = true;
        try {
          const result = await descriptor.poll(++tick, operation.snapshot);
          if (operation.snapshot.status !== 'running') return; // cancelled mid-poll
          if (result.status === 'completed') {
            if (descriptor.cacheKey !== undefined && result.result !== undefined) {
              cache.set(descriptor.cacheKey, result.result);
            }
            finish(operation, { status: 'completed', progress: 100, message: result.message });
            publish(operation.snapshot, 'operation:completed');
          } else if (result.status === 'failed') {
            finish(operation, { status: 'failed', error: result.error ?? 'Operation failed' });
            publish(operation.snapshot, 'operation:failed');
          } else {
            operation.snapshot = {
              ...operation.snapshot,
              progress: Math.min(99, Math.round(result.progress ?? operation.snapshot.progress)),
              message: result.message,
            };
            publish(operation.snapshot, 'operation:progress');
          }
        } catch (err) {
          finish(operation, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
          publish(operation.snapshot, 'operation:failed');
        } finally {
          polling = false;
        }
      }, descriptor.intervalMs ?? 1000);

      return snapshot;
    },
    get: (id) => operations.get(id)?.snapshot,
    list: () => [...operations.values()].map((operation) => operation.snapshot),
    cancel(id) {
      const operation = operations.get(id);
      if (!operation || operation.snapshot.status !== 'running') return;
      finish(operation, { status: 'cancelled' });
      listeners.forEach((listener) => listener(operation.snapshot));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
