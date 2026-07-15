import type { Routes, UrlSegment } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { AnalyticsOutletComponent } from './remotes/analytics-outlet.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ForbiddenComponent } from './pages/forbidden.component';

/**
 * Host routing. The shell knows remotes ONLY by their federated entry
 * points ('analytics/mount', 'reports/routes') — never by their internals.
 */
export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: DashboardComponent },
  {
    // Consume /analytics AND everything below it: the React remote owns its
    // own sub-router (react-router with basename '/analytics').
    matcher: (segments: UrlSegment[]) => (segments[0]?.path === 'analytics' ? { consumed: segments } : null),
    component: AnalyticsOutletComponent,
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
