import type { Routes, UrlSegment } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { RemoteMountOutletComponent } from './remotes/remote-mount-outlet.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ForbiddenComponent } from './pages/forbidden.component';
import { RemoteUnavailableComponent } from './pages/remote-unavailable.component';
import { isRemoteEnabled } from './remote-registry';

/**
 * Fallback child routes shown when a federated-routes remote cannot load
 * (server down, bad manifest) or is disabled in the registry. The navigation
 * succeeds and renders a tile — a broken remote never costs more than its
 * own surface (A4, closes G7 for loadChildren remotes).
 */
const unavailableRoutes = (label: string, reason: 'disabled' | 'error', hint: string): Routes => [
  { path: '**', component: RemoteUnavailableComponent, data: { label, reason, hint } },
];

/**
 * Host routing. The shell knows remotes ONLY by their federated entry
 * points ('analytics/mount', 'playground/mount', 'reports/routes') — never
 * by their internals.
 */
const consumeAll = (prefix: string) => (segments: UrlSegment[]) =>
  segments[0]?.path === prefix ? { consumed: segments } : null;

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: DashboardComponent },
  {
    // Consume /analytics and everything below it: the React remote owns
    // its own sub-router (react-router with basename '/analytics').
    matcher: consumeAll('analytics'),
    component: RemoteMountOutletComponent,
    data: { remote: 'analytics/mount', basename: '/analytics', label: 'Analytics', port: 4201 },
  },
  {
    // Svelte remote — same framework-agnostic mount contract.
    matcher: consumeAll('playground'),
    component: RemoteMountOutletComponent,
    data: { remote: 'playground/mount', basename: '/playground', label: 'Playground', port: 4204 },
  },
  {
    // Angular remote: federated Routes are lazy-loaded straight into the
    // host router. Guards inside come from @teradata-pe/bridge validators.
    path: 'reports',
    loadChildren: () => {
      if (!isRemoteEnabled('reports')) {
        return unavailableRoutes('Reports', 'disabled', '');
      }
      return loadRemote<typeof import('reports/routes')>('reports/routes')
        .then((m) => {
          if (!m) throw new Error('loadRemote returned null');
          return m.REPORTS_ROUTES;
        })
        .catch((err: unknown) => {
          console.error('[shell] reports remote failed to load', err);
          return unavailableRoutes('Reports', 'error', 'Is the reports dev server running on port 4203?');
        });
    },
  },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: '**', redirectTo: '' },
];
