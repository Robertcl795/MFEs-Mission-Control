import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { getBridge, type UserIdentity, type ThemeName, type Unsubscribe } from '@teradata-pe/bridge';
import { getAuthSessionController } from './host-bridge';
import { ToastCenterComponent } from './toast/toast-center.component';

@Component({
  selector: 'mc-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastCenterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="shell-header">
        <div class="brand">
          <span class="brand-mark">◈</span>
          <span class="brand-name">Mission Control</span>
          <span class="brand-tag">MF 2.0 · Rsbuild</span>
        </div>
        <nav class="shell-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/analytics" routerLinkActive="active">Analytics</a>
          <a routerLink="/playground" routerLinkActive="active">Playground</a>
          <a routerLink="/reports" routerLinkActive="active">Reports</a>
        </nav>
        <div class="shell-controls">
          <label class="admin-toggle" title="Grant/revoke the 'admin' permission (live route guard demo)">
            <input type="checkbox" [checked]="isAdmin()" (change)="toggleAdmin()" />
            <span>admin</span>
          </label>
          <button class="theme-btn" (click)="toggleTheme()" data-testid="theme-toggle">
            {{ theme() === 'dark' ? '☀ light' : '☾ dark' }}
          </button>
          <div class="user-chip" [title]="permissionsTitle()">
            <span class="user-dot"></span>
            {{ user()?.name ?? 'anonymous' }}
          </div>
        </div>
      </header>

      <main class="shell-main">
        <router-outlet />
      </main>

      <footer class="shell-footer">
        <span>bridge v{{ bridgeVersion }}</span>
        <span>cache · {{ cacheKeys().length }} keys</span>
        <span>operations · {{ runningOperations() }} running</span>
        <span class="footer-note">host: shell (Angular 20) · remotes: analytics (React 19), playground (Svelte 5), reports (Angular 20)</span>
      </footer>

      <mc-toast-center />
    </div>
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly bridge = getBridge();
  private readonly subs: Unsubscribe[] = [];

  readonly bridgeVersion = this.bridge.version;
  readonly theme = signal<ThemeName>(this.bridge.theme.current);
  readonly user = signal<Readonly<UserIdentity> | null>(this.bridge.session.user);
  readonly isAdmin = signal(this.bridge.session.can('admin'));
  readonly cacheKeys = signal<string[]>(this.bridge.cache.keys());
  readonly runningOperations = signal(0);

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const { bus, theme, session, cache, operations } = this.bridge;
    this.subs.push(
      theme.subscribe((next) => this.theme.set(next)),
      session.subscribe((user) => {
        this.user.set(user);
        this.isAdmin.set(session.can('admin'));
      }),
      bus.on('cache:updated', () => this.cacheKeys.set(cache.keys())),
      bus.on('cache:invalidated', () => this.cacheKeys.set(cache.keys())),
      operations.subscribe(() => this.runningOperations.set(operations.list().filter((operation) => operation.status === 'running').length)),
      // Remotes may request host-level navigation (e.g. blocked routes).
      bus.on('navigation:request', ({ url }) => void this.router.navigateByUrl(url)),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((off) => off());
  }

  toggleTheme(): void {
    this.bridge.theme.toggle();
  }

  toggleAdmin(): void {
    const controller = getAuthSessionController();
    if (this.bridge.session.can('admin')) {
      controller.revoke('admin');
    } else {
      controller.grant('admin');
    }
  }

  permissionsTitle(): string {
    return `permissions: ${this.user()?.permissions.join(', ') ?? 'none'}`;
  }
}
