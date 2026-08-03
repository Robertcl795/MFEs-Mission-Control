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
import { getRemoteEntry, isRemoteEnabled } from '../remote-registry';

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
    @if (disabled()) {
      <div class="remote-error">
        <h2>{{ label }} is switched off</h2>
        <p>Disabled by platform (registry kill-switch).</p>
        <p class="remote-error-hint">Re-enable it in remotes.dev.json — no shell deploy involved.</p>
      </div>
    } @else if (error()) {
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
  readonly disabled = signal(false);

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

    // Kill-switch (ADR-003): a disabled remote never reaches loadRemote —
    // the registry did not even register it with the federation runtime.
    const containerName = remote.split('/')[0];
    if (!isRemoteEnabled(containerName)) {
      this.loading.set(false);
      this.disabled.set(true);
      console.warn(`[shell] remote "${containerName}" is disabled in the registry`, getRemoteEntry(containerName));
      return;
    }

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
