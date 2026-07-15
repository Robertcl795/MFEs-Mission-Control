import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { createMissionBridge, hasBridge, installBridge } from '@mission/bridge';
import { REPORTS_ROUTES } from './app/remote-entry/routes';

/**
 * Standalone-dev bootstrap (port 4203, never used when federated — the
 * shell consumes `reports/routes` directly). Installs a local dev bridge
 * so the remote honours the same contracts without a host.
 */
if (!hasBridge()) {
  const { bridge } = createMissionBridge({
    initialTheme: 'dark',
    initialUser: {
      user: {
        id: 'dev-reports',
        name: 'Reports Dev',
        email: 'dev@mission.local',
        roles: ['developer'],
        permissions: ['reports:view', 'reports:generate'],
      },
      token: 'dev-token-reports',
    },
  });
  installBridge(bridge);
  console.info('[reports] standalone mode — local dev bridge installed');
}

@Component({
  selector: 'mcr-standalone-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mcr-standalone">
      <p class="mcr-muted">reports · standalone dev harness (no shell)</p>
      <router-outlet />
    </main>
  `,
})
class StandaloneRootComponent {}

@Component({
  selector: 'mcr-standalone-forbidden',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>403 — blocked by a @mission/bridge validator (standalone harness).</p>`,
})
class StandaloneForbiddenComponent {}

bootstrapApplication(StandaloneRootComponent, {
  providers: [
    provideRouter([
      { path: 'forbidden', component: StandaloneForbiddenComponent },
      { path: '', children: REPORTS_ROUTES },
    ]),
  ],
}).catch((err) => console.error('[reports] standalone bootstrap failed', err));
