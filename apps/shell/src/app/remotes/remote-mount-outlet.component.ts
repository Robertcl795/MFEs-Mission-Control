import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';

interface MountModule {
  mount(element: HTMLElement, options?: { basename?: string }): () => void;
}

/**
 * Framework boundary for mount-contract remotes (React `analytics`, Svelte
 * `playground`, ...). The shell only knows `mount(el) → unmount()` — which
 * framework renders inside is the remote's business. Route `data` supplies:
 *   { remote: 'analytics/mount', basename: '/analytics', label: 'Analytics', port: 4201 }
 */
@Component({
  selector: 'mc-remote-mount-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="remote-error">
        <h2>{{ label }} remote unavailable</h2>
        <p>{{ error() }}</p>
        <p class="remote-error-hint">Is the {{ label.toLowerCase() }} dev server running on port {{ port }}?</p>
      </div>
    } @else if (loading()) {
      <p class="remote-loading">Loading {{ label.toLowerCase() }} remote…</p>
    }
    <div #outlet class="remote-outlet"></div>
  `,
})
export class RemoteMountOutletComponent implements OnInit, OnDestroy {
  @ViewChild('outlet', { static: true }) outlet!: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  label = 'Remote';
  port: number | undefined;
  private unmount?: () => void;
  private destroyed = false;

  async ngOnInit(): Promise<void> {
    const { remote, basename, label, port } = this.route.snapshot.data as {
      remote: string;
      basename: string;
      label?: string;
      port?: number;
    };
    this.label = label ?? remote;
    this.port = port;
    try {
      const module = await loadRemote<MountModule>(remote);
      if (!module) throw new Error('loadRemote returned null');
      if (this.destroyed) return;
      this.unmount = module.mount(this.outlet.nativeElement, { basename });
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
