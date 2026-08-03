/**
 * Core shared types for the UI bridge contract.
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

export interface UserIdentity {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
}

export type OperationStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** Immutable snapshot of an asynchronous operation, safe to hand to any remote. */
export interface OperationSnapshot {
  id: string;
  /** Namespaced kind, e.g. `report:generate`. */
  kind: string;
  /** Human-readable title, shown in the host's toasts / operation tray. */
  title: string;
  status: OperationStatus;
  /** 0..100 */
  progress: number;
  message?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  /** SharedDataCache key where the result is stored on completion. */
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
 * The globally shared, strongly-typed event map for the bridge event bus.
 * Add new cross-remote events HERE first — if it is not in this map, it is
 * not part of the contract.
 */
export interface BridgeEventMap {
  'theme:changed': { theme: ThemeName };
  'session:changed': { user: Readonly<UserIdentity> | null };
  'cache:updated': { key: string };
  'cache:invalidated': { key: string };
  'operation:started': OperationSnapshot;
  'operation:progress': OperationSnapshot;
  'operation:completed': OperationSnapshot;
  'operation:failed': OperationSnapshot;
  'toast:show': ToastPayload;
  /** Remotes may ask the shell to navigate (deep links, toast actions...). */
  'navigation:request': { url: string };
}
