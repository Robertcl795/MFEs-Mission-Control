import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getBridge } from '@mission/bridge';

interface MfManifestSummary {
  name: string;
  exposes: string[];
  shared: string[];
}

/** Dev origin of this remote — where its own mf-manifest.json is served. */
const REPORTS_DEV_ORIGIN = 'http://localhost:4203';

@Component({
  selector: 'mcr-reports-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcr-stack">
      <section class="mcr-card">
        <h2>Report operations</h2>
        <div class="mcr-grid">
          <a routerLink="viewer" class="mcr-tile">
            <h3>Data viewer</h3>
            <p>Inspect the shared <code>fleet-data</code> set in a Monaco JSON viewer.</p>
          </a>
          <a routerLink="generate" class="mcr-tile">
            <h3>Generate report</h3>
            <p>Long-running job that survives navigation — host-owned polling.</p>
          </a>
          <a routerLink="admin" class="mcr-tile mcr-tile-locked">
            <h3>Admin 🔒</h3>
            <p>Guarded by the shared <code>requirePermission('admin')</code> validator.</p>
          </a>
        </div>
      </section>

      <section class="mcr-card">
        <h2>Federation self-inspection</h2>
        <p class="mcr-muted">
          Fetched from this remote's own <code>mf-manifest.json</code> through Angular's HttpClient — enriched by
          the bridge auth interceptor (check the request headers in devtools).
        </p>
        @if (manifest(); as m) {
          <ul class="mcr-manifest" data-testid="manifest-summary">
            <li><strong>remote</strong> {{ m.name }}</li>
            <li><strong>exposes</strong> {{ m.exposes.join(', ') || '—' }}</li>
            <li><strong>shared</strong> {{ m.shared.join(', ') || '—' }}</li>
          </ul>
        } @else if (manifestError()) {
          <p class="mcr-muted">Manifest not reachable ({{ manifestError() }}) — fine when running a production build without the dev server.</p>
        } @else {
          <p class="mcr-muted">Loading manifest…</p>
        }
      </section>
    </div>
  `,
})
export class ReportsHomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly manifest = signal<MfManifestSummary | null>(null);
  readonly manifestError = signal<string | null>(null);

  ngOnInit(): void {
    interface RawManifest {
      name?: string;
      exposes?: Array<{ path?: string }>;
      shared?: Array<{ name?: string }>;
    }
    this.http.get<RawManifest>(`${REPORTS_DEV_ORIGIN}/mf-manifest.json`).subscribe({
      next: (raw) => {
        this.manifest.set({
          name: raw.name ?? 'reports',
          exposes: (raw.exposes ?? []).map((e) => e.path ?? '?'),
          shared: [...new Set((raw.shared ?? []).map((s) => s.name ?? '?'))],
        });
        getBridge().bus.emit('toast:show', {
          intent: 'info',
          title: 'Reports remote online',
          message: `mf-manifest.json exposes ${this.manifest()!.exposes.length} module(s)`,
          durationMs: 4000,
        });
      },
      error: (err: unknown) => this.manifestError.set(err instanceof Error ? err.message : 'request failed'),
    });
  }
}
