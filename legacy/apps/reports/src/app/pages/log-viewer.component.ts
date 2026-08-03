import { ChangeDetectionStrategy, Component, type OnInit, signal } from '@angular/core';
import { getBridge } from '@teradata-pe/bridge';
import { MonacoViewerComponent } from '../shared/monaco-viewer.component';
import { FLEET_CACHE_KEY, isFleetDataCached, loadFleetData } from '../data/fleet';

@Component({
  selector: 'mcr-log-viewer',
  standalone: true,
  imports: [MonacoViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcr-stack">
      <section class="mcr-card">
        <header class="mcr-card-header">
          <h2>Fleet data viewer</h2>
          <button class="mcr-btn" (click)="invalidateAndReload()">Invalidate cache & refetch</button>
        </header>
        @if (loadInfo(); as info) {
          <div class="mcr-badge" [class.mcr-badge-success]="info.fromCache" data-testid="cache-indicator">
            {{
              info.fromCache
                ? '⚡ Served from the shared SharedDataCache in ' + info.ms + 'ms — no duplicate network request'
                : '🛰 Fetched over the (mock) network in ' + info.ms + 'ms — now cached for every remote'
            }}
          </div>
        }
        @if (json()) {
          <mcr-monaco-viewer [value]="json()" language="json" [height]="380" />
        } @else {
          <p class="mcr-muted">Loading fleet data…</p>
        }
      </section>
    </div>
  `,
})
export class LogViewerComponent implements OnInit {
  readonly json = signal('');
  readonly loadInfo = signal<{ ms: number; fromCache: boolean } | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const fromCache = isFleetDataCached();
    const start = performance.now();
    const data = await loadFleetData();
    this.loadInfo.set({ ms: Math.round(performance.now() - start), fromCache });
    this.json.set(JSON.stringify(data, null, 2));
  }

  invalidateAndReload(): void {
    getBridge().cache.invalidate(FLEET_CACHE_KEY);
    this.json.set('');
    void this.load();
  }
}
