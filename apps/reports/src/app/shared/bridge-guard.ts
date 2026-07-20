import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { evaluateRoute, getBridge, type RouteValidator } from '@mission/bridge';

/**
 * Angular adapter over the framework-agnostic bridge route validators.
 * The RULES live in @mission/bridge (shared with the React remote); this
 * only translates a RouteDecision into Angular router semantics.
 */
export function bridgeGuard(validator: RouteValidator): CanActivateFn {
  return (_route, state) => {
    const router = inject(Router);
    const decision = evaluateRoute(validator, getBridge().session, state.url);
    return decision.allowed ? true : router.parseUrl(decision.redirectTo ?? '/forbidden');
  };
}
