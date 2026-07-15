import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { loadRemote } from '@module-federation/enhanced/runtime';

/**
 * Framework boundary for the React remote. The shell only knows the
 * `analytics/mount` contract — mount(el) → unmount(). React never leaks
 * into the host bundle; MF 2.0 fetches it from port 4201 on demand.
 */
@Component({
  selector: 'mc-analytics-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="remote-error">
        <h2>Analytics remote unavailable</h2>
        <p>{{ error() }}</p>
        <p class="remote-error-hint">Is the analytics dev server running on port 4201?</p>
      </div>
    } @else if (loading()) {
      <p class="remote-loading">Loading analytics remote…</p>
    }
    <div #outlet class="remote-outlet"></div>
  `,
})
export class AnalyticsOutletComponent implements OnInit, OnDestroy {
  @ViewChild('outlet', { static: true }) outlet!: ElementRef<HTMLDivElement>;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private unmount?: () => void;
  private destroyed = false;

  async ngOnInit(): Promise<void> {
    try {
      const remote = await loadRemote<typeof import('analytics/mount')>('analytics/mount');
      if (!remote) throw new Error('loadRemote returned null');
      if (this.destroyed) return;
      this.unmount = remote.mount(this.outlet.nativeElement, { basename: '/analytics' });
      this.loading.set(false);
    } catch (err) {
      this.loading.set(false);
      this.error.set(err instanceof Error ? err.message : String(err));
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.unmount?.();
  }
}
