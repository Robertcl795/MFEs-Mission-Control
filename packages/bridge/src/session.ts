import type { EventBus } from './event-bus';
import type { MissionUser, Permission, Unsubscribe } from './types';

/**
 * Read-only view of the authenticated session, handed to remotes.
 *
 * SECURITY CONTRACT:
 *  - The shell (host) performs authentication and OWNS the token.
 *  - Remotes never see or store tokens. When a remote needs an
 *    authenticated request it calls `authorizeRequest`, which enriches the
 *    request from a closure held inside the host.
 */
export interface SessionFacade {
  /** Current user, or null when signed out. Frozen — remotes cannot mutate it. */
  readonly user: Readonly<MissionUser> | null;
  isAuthenticated(): boolean;
  /** Permission check used by remotes to show/hide UI and guard routes. */
  can(permission: Permission): boolean;
  /** Enrich an outgoing request with auth headers. The token never leaves the host closure as state. */
  authorizeRequest(init?: RequestInit): Promise<RequestInit>;
  /** Notifies on login/logout/permission changes. */
  subscribe(listener: (user: Readonly<MissionUser> | null) => void): Unsubscribe;
}

/** Host-only handle: the shell keeps this and never exposes it on the bridge. */
export interface SessionController {
  facade: SessionFacade;
  login(user: MissionUser, token: string): void;
  logout(): void;
  grant(permission: Permission): void;
  revoke(permission: Permission): void;
}

export function createSessionController(bus: EventBus): SessionController {
  let user: Readonly<MissionUser> | null = null;
  // The token lives ONLY in this closure. It is intentionally unreachable
  // from the SessionFacade surface that remotes receive.
  let token: string | null = null;
  const listeners = new Set<(user: Readonly<MissionUser> | null) => void>();

  const notify = () => {
    listeners.forEach((listener) => listener(user));
    bus.emit('session:changed', { user });
  };

  const facade: SessionFacade = {
    get user() {
      return user;
    },
    isAuthenticated: () => user !== null,
    can: (permission) => user?.permissions.includes(permission) ?? false,
    async authorizeRequest(init = {}) {
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (user) {
        headers.set('X-Mission-User', user.id);
      }
      return { ...init, headers };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    facade,
    login(nextUser, nextToken) {
      user = Object.freeze({ ...nextUser, roles: [...nextUser.roles], permissions: [...nextUser.permissions] });
      token = nextToken;
      notify();
    },
    logout() {
      user = null;
      token = null;
      notify();
    },
    grant(permission) {
      if (!user || user.permissions.includes(permission)) return;
      user = Object.freeze({ ...user, permissions: [...user.permissions, permission] });
      notify();
    },
    revoke(permission) {
      if (!user || !user.permissions.includes(permission)) return;
      user = Object.freeze({ ...user, permissions: user.permissions.filter((p) => p !== permission) });
      notify();
    },
  };
}
