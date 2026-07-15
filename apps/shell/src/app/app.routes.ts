import type { Routes, UrlSegment } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { RemoteMountOutletComponent } from './remotes/remote-mount-outlet.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ForbiddenComponent } from './pages/forbidden.component';

/**
 * Host routing. The shell knows remotes ONLY by their federated entry
 * points ('analytics/mount', 'designer/mount', 'reports/routes') — never
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
    matcher: consumeAll('designer'),
    component: RemoteMountOutletComponent,
    data: { remote: 'designer/mount', basename: '/designer', label: 'Designer', port: 4202 },
  },
  {
    // Angular remote: federated Routes are lazy-loaded straight into the
    // host router. Guards inside come from @mission/bridge validators.
    path: 'reports',
    loadChildren: () =>
      loadRemote<typeof import('reports/routes')>('reports/routes').then((m) => {
        if (!m) throw new Error('[shell] reports remote unavailable');
        return m.REPORTS_ROUTES;
      }),
  },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: '**', redirectTo: '' },
];
