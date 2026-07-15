import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { Routes } from '@angular/router';
import { requirePermission } from '@mission/bridge';
import { bridgeGuard } from '../shared/bridge-guard';
import { missionAuthInterceptor } from '../shared/mission-auth.interceptor';
import { ReportsShellComponent } from '../pages/reports-shell.component';
import { ReportsHomeComponent } from '../pages/reports-home.component';
import { LogViewerComponent } from '../pages/log-viewer.component';
import { GenerateReportComponent } from '../pages/generate-report.component';
import { ReportResultComponent } from '../pages/report-result.component';
import { ReportsAdminComponent } from '../pages/reports-admin.component';

/**
 * FEDERATED ENTRY — `reports/routes`.
 *
 * The shell lazy-loads this Routes array straight into its router. Every
 * guard below is a thin Angular adapter over the framework-agnostic
 * validators exported by @mission/bridge, and the HTTP interceptor is the
 * bridge auth enrichment wrapped as an HttpInterceptorFn.
 */
export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    component: ReportsShellComponent,
    providers: [provideHttpClient(withInterceptors([missionAuthInterceptor]))],
    canActivate: [bridgeGuard(requirePermission('reports:view'))],
    children: [
      { path: '', pathMatch: 'full', component: ReportsHomeComponent },
      { path: 'viewer', component: LogViewerComponent },
      {
        path: 'generate',
        component: GenerateReportComponent,
        canActivate: [bridgeGuard(requirePermission('reports:generate'))],
      },
      { path: 'results/:id', component: ReportResultComponent },
      {
        path: 'admin',
        component: ReportsAdminComponent,
        canActivate: [bridgeGuard(requirePermission('admin'))],
      },
    ],
  },
];

export default REPORTS_ROUTES;
