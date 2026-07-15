import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { evaluateRoute, getBridge, type RouteValidator } from '@mission/bridge';

/**
 * React adapter over the framework-agnostic bridge route validators.
 * The RULES (auth, permissions) live in @mission/bridge — this component
 * only translates a RouteDecision into React rendering.
 */
export function Protected({ validator, children }: { validator: RouteValidator; children: ReactNode }) {
  const location = useLocation();
  const { session } = getBridge();
  const decision = evaluateRoute(validator, session, location.pathname);

  if (decision.allowed) return <>{children}</>;

  return (
    <section className="mc-card mc-denied" data-testid="access-denied">
      <h2>Access denied</h2>
      <p>{decision.reason ?? 'You do not have permission to view this page.'}</p>
      <p className="mc-muted">
        Decision made by <code>@mission/bridge</code> route validators — the same rules protect the Angular
        `reports` remote.
      </p>
    </section>
  );
}
