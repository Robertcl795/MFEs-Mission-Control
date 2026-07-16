/**
 * Core shared types for the Mission Control bridge.
 *
 * Everything in this package is framework-agnostic: no Angular, no React,
 * no bundler-specific APIs. Remotes and the host communicate exclusively
 * through these contracts.
 */

export type Unsubscribe = () => void;

export type ThemeName = 'light' | 'dark';

/** Well-known permissions. Free-form strings are allowed too. */
export type Permission =
  | 'analytics:view'
  | 'analytics:query'
  | 'reports:view'
  | 'reports:generate'
  | 'playground:edit'
  | 'admin'
  | (string & {});

export interface MissionUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
}

export type TaskStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** Immutable snapshot of a task, safe to hand to any remote. */
export interface TaskSnapshot {
  id: string;
  /** Namespaced kind, e.g. `report:generate`. */
  kind: string;
  /** Human-readable title, shown in the shell's toasts / task tray. */
  title: string;
  status: TaskStatus;
  /** 0..100 */
  progress: number;
  message?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  /** DataCache key where the result is stored on completion. */
  cacheKey?: string;
  /** Shell route to navigate to when the user clicks the completion toast. */
  resultRoute?: string;
}

export interface ToastPayload {
  id?: string;
  intent: 'info' | 'success' | 'error';
  title: string;
  message?: string;
  /** Optional route the shell should navigate to when the toast is clicked. */
  route?: string;
  /** Auto-dismiss delay in ms; 0 keeps the toast until dismissed. */
  durationMs?: number;
}

/**
 * The global, strongly-typed event map for the Mission Control event bus.
 * Add new cross-MFE events HERE first — if it is not in this map, it is
 * not part of the contract.
 */
export interface MissionEventMap {
  'theme:changed': { theme: ThemeName };
  'session:changed': { user: Readonly<MissionUser> | null };
  'cache:updated': { key: string };
  'cache:invalidated': { key: string };
  'task:started': TaskSnapshot;
  'task:progress': TaskSnapshot;
  'task:completed': TaskSnapshot;
  'task:failed': TaskSnapshot;
  'toast:show': ToastPayload;
  /** Remotes may ask the shell to navigate (deep links, toast actions...). */
  'shell:navigate': { url: string };
}
