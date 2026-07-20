import type { DataCache } from './data-cache';
import type { EventBus } from './event-bus';
import type { TaskSnapshot, TaskStatus, Unsubscribe } from './types';

export interface TaskPollResult<TResult = unknown> {
  status: Extract<TaskStatus, 'running' | 'completed' | 'failed'>;
  /** 0..100 */
  progress?: number;
  message?: string;
  /** Required when status === 'completed'. Stored in the DataCache under `cacheKey`. */
  result?: TResult;
  error?: string;
}

export interface TaskDescriptor<TResult = unknown> {
  /** Stable id; generated when omitted. */
  id?: string;
  /** Namespaced kind, e.g. `report:generate`. */
  kind: string;
  title: string;
  /** Poll cadence in ms. Default 1000. */
  intervalMs?: number;
  /** Where the result lands in the shared DataCache on completion. */
  cacheKey?: string;
  /** Shell route for the "view result" toast action. */
  resultRoute?: string;
  /**
   * Called on every tick FROM THE HOST context. The closure is created by
   * the remote that starts the task, but its lifecycle belongs to the host —
   * it keeps running when the remote unmounts or the user navigates away.
   */
  poll: (tick: number, snapshot: TaskSnapshot) => Promise<TaskPollResult<TResult>>;
}

/**
 * Host-owned long-running task orchestrator.
 *
 * CONTRACT: remotes *start* tasks but never own their timers. Progress and
 * terminal states are broadcast on the EventBus (`task:*` events), results
 * are written to the DataCache, and the shell renders global toasts — so a
 * report started in `reports` finishes loudly even while the user is
 * browsing `analytics`.
 */
export interface TaskManager {
  start<TResult>(descriptor: TaskDescriptor<TResult>): TaskSnapshot;
  get(id: string): TaskSnapshot | undefined;
  list(): TaskSnapshot[];
  cancel(id: string): void;
  /** Fires on any task state change (start, progress, terminal). */
  subscribe(listener: (snapshot: TaskSnapshot) => void): Unsubscribe;
}

export function createTaskManager(bus: EventBus, cache: DataCache): TaskManager {
  interface InternalTask {
    snapshot: TaskSnapshot;
    timer: ReturnType<typeof setInterval> | null;
  }

  const tasks = new Map<string, InternalTask>();
  const listeners = new Set<(snapshot: TaskSnapshot) => void>();
  let seq = 0;

  const publish = (snapshot: TaskSnapshot, event: 'task:started' | 'task:progress' | 'task:completed' | 'task:failed') => {
    listeners.forEach((listener) => listener(snapshot));
    bus.emit(event, snapshot);
  };

  const finish = (task: InternalTask, patch: Partial<TaskSnapshot>) => {
    if (task.timer) clearInterval(task.timer);
    task.timer = null;
    task.snapshot = { ...task.snapshot, ...patch, finishedAt: Date.now() };
  };

  return {
    start(descriptor) {
      const id = descriptor.id ?? `task-${Date.now()}-${++seq}`;
      const existing = tasks.get(id);
      // Idempotent: re-starting a live task returns it instead of forking timers.
      if (existing && existing.snapshot.status === 'running') return existing.snapshot;

      const snapshot: TaskSnapshot = {
        id,
        kind: descriptor.kind,
        title: descriptor.title,
        status: 'running',
        progress: 0,
        startedAt: Date.now(),
        cacheKey: descriptor.cacheKey,
        resultRoute: descriptor.resultRoute,
      };
      const task: InternalTask = { snapshot, timer: null };
      tasks.set(id, task);
      publish(snapshot, 'task:started');

      let tick = 0;
      let polling = false;
      task.timer = setInterval(async () => {
        if (polling || task.snapshot.status !== 'running') return;
        polling = true;
        try {
          const result = await descriptor.poll(++tick, task.snapshot);
          if (task.snapshot.status !== 'running') return; // cancelled mid-poll
          if (result.status === 'completed') {
            if (descriptor.cacheKey !== undefined && result.result !== undefined) {
              cache.set(descriptor.cacheKey, result.result);
            }
            finish(task, { status: 'completed', progress: 100, message: result.message });
            publish(task.snapshot, 'task:completed');
          } else if (result.status === 'failed') {
            finish(task, { status: 'failed', error: result.error ?? 'Task failed' });
            publish(task.snapshot, 'task:failed');
          } else {
            task.snapshot = {
              ...task.snapshot,
              progress: Math.min(99, Math.round(result.progress ?? task.snapshot.progress)),
              message: result.message,
            };
            publish(task.snapshot, 'task:progress');
          }
        } catch (err) {
          finish(task, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
          publish(task.snapshot, 'task:failed');
        } finally {
          polling = false;
        }
      }, descriptor.intervalMs ?? 1000);

      return snapshot;
    },
    get: (id) => tasks.get(id)?.snapshot,
    list: () => [...tasks.values()].map((task) => task.snapshot),
    cancel(id) {
      const task = tasks.get(id);
      if (!task || task.snapshot.status !== 'running') return;
      finish(task, { status: 'cancelled' });
      listeners.forEach((listener) => listener(task.snapshot));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
