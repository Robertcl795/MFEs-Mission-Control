import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { getBridge, type MissionUser, type Unsubscribe } from '@mission/bridge';

@Component({
  selector: 'mcr-reports-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcr-root" data-testid="reports-root">
      <header class="mcr-header">
        <div>
          <h1>Reports</h1>
          <p class="mcr-muted">Angular 20 remote · signed in as {{ user()?.name ?? 'anonymous' }}</p>
        </div>
        <nav class="mcr-tabs">
          <a routerLink="." [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="mcr-tab-active" class="mcr-tab">Overview</a>
          <a routerLink="viewer" routerLinkActive="mcr-tab-active" class="mcr-tab">Data viewer</a>
          @if (canGenerate()) {
            <a routerLink="generate" routerLinkActive="mcr-tab-active" class="mcr-tab">Generate</a>
          }
          @if (isAdmin()) {
            <a routerLink="admin" routerLinkActive="mcr-tab-active" class="mcr-tab">Admin</a>
          }
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
})
export class ReportsShellComponent implements OnInit, OnDestroy {
  readonly user = signal<Readonly<MissionUser> | null>(null);
  readonly canGenerate = signal(false);
  readonly isAdmin = signal(false);
  private off?: Unsubscribe;

  ngOnInit(): void {
    const { session } = getBridge();
    const refresh = (user: Readonly<MissionUser> | null) => {
      this.user.set(user);
      // UI gating through the session facade — the routes themselves stay
      // guarded by the same bridge validators regardless.
      this.canGenerate.set(session.can('reports:generate'));
      this.isAdmin.set(session.can('admin'));
    };
    refresh(session.user);
    this.off = session.subscribe(refresh);
  }

  ngOnDestroy(): void {
    this.off?.();
  }
}
