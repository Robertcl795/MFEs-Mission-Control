import type { SessionFacade } from './session';
import type { Permission } from './types';

/**
 * Framework-agnostic route protection.
 *
 * Validators are pure functions over the session facade. Each app owns a
 * thin adapter: Angular wraps them in a `CanActivateFn`, React in a
 * `<Protected>` component — but the RULES live here, once.
 */
export interface RouteContext {
  session: SessionFacade;
  /** The path being activated, for logging / audit. */
  path: string;
}

export interface RouteDecision {
  allowed: boolean;
  /** Where the router should send the user when blocked. */
  redirectTo?: string;
  reason?: string;
}

export type RouteValidator = (ctx: RouteContext) => RouteDecision;

export const ALLOW: RouteDecision = Object.freeze({ allowed: true });

export function requireAuth(redirectTo = '/forbidden'): RouteValidator {
  return ({ session, path }) =>
    session.isAuthenticated()
      ? ALLOW
      : { allowed: false, redirectTo, reason: `"${path}" requires an authenticated session` };
}

export function requirePermission(permission: Permission, redirectTo = '/forbidden'): RouteValidator {
  return ({ session, path }) =>
    session.can(permission)
      ? ALLOW
      : { allowed: false, redirectTo, reason: `"${path}" requires permission "${permission}"` };
}

/** All validators must pass; the first failure wins. */
export function composeValidators(...validators: RouteValidator[]): RouteValidator {
  return (ctx) => {
    for (const validator of validators) {
      const decision = validator(ctx);
      if (!decision.allowed) return decision;
    }
    return ALLOW;
  };
}

/** Convenience for adapters. */
export function evaluateRoute(validator: RouteValidator, session: SessionFacade, path: string): RouteDecision {
  const decision = validator({ session, path });
  if (!decision.allowed) {
    console.warn(`[bridge:routing] blocked "${path}": ${decision.reason ?? 'no reason given'}`);
  }
  return decision;
}
