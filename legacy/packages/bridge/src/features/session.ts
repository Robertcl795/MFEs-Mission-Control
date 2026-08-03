import type { EventBus } from '../core/event-bus';
import type { Permission, Unsubscribe, UserIdentity } from '../schema/types';

/**
 * Read-only view of the authenticated session, handed to remotes.
 *
 * SECURITY CONTRACT:
 *  - The shell (host) performs authentication and OWNS the token.
 *  - Remotes never see or store tokens. When a remote needs an
 *    authenticated request it calls `authorizeRequest`, which enriches the
 *    request from a closure held inside the host.
 */
export interface AuthSession {
  /** Current user, or null when signed out. Frozen — remotes cannot mutate it. */
  readonly user: Readonly<UserIdentity> | null;
  isAuthenticated(): boolean;
  /** Permission check used by remotes to show/hide UI and guard routes. */
  can(permission: Permission): boolean;
  /** Enrich an outgoing request with auth headers. The token never leaves the host closure as state. */
  authorizeRequest(init?: RequestInit): Promise<RequestInit>;
  /** Notifies on login/logout/permission changes. */
  subscribe(listener: (user: Readonly<UserIdentity> | null) => void): Unsubscribe;
}

/** Host-only handle: the shell keeps this and never exposes it on the bridge. */
export interface AuthSessionController {
  facade: AuthSession;
  login(user: UserIdentity, token: string): void;
  logout(): void;
  grant(permission: Permission): void;
  revoke(permission: Permission): void;
}

export function createAuthSessionController(bus: EventBus): AuthSessionController {
  let user: Readonly<UserIdentity> | null = null;
  // The token lives ONLY in this closure. It is intentionally unreachable
  // from the AuthSession surface that remotes receive.
  let token: string | null = null;
  const listeners = new Set<(user: Readonly<UserIdentity> | null) => void>();

  const notify = () => {
    listeners.forEach((listener) => listener(user));
    bus.emit('session:changed', { user });
  };

  const facade: AuthSession = {
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
        headers.set('X-User-Id', user.id);
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
