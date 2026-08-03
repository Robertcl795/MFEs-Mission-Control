import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getBridge } from '@teradata-pe/bridge';
import { MonacoViewerComponent } from '../shared/monaco-viewer.component';
import { reportCacheKey, type FleetReport } from '../data/report-generator';

@Component({
  selector: 'mcr-report-result',
  standalone: true,
  imports: [MonacoViewerComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcr-stack">
      @if (report(); as r) {
        <section class="mcr-card">
          <h2>{{ r.title }}</h2>
          <div class="mcr-badge mcr-badge-success" data-testid="result-cache-note">
            ⚡ Loaded instantly from the shared SharedDataCache (key <code>{{ cacheKey() }}</code>)
          </div>
          <p>{{ r.summary }}</p>
          <p class="mcr-muted">Generated {{ r.generatedAt }} · requested by {{ r.requestedBy }}</p>
          <mcr-monaco-viewer [value]="json()" language="json" [height]="420" />
        </section>
      } @else {
        <section class="mcr-card">
          <h2>Result not in cache</h2>
          <p class="mcr-muted">
            This report isn't in the SharedDataCache — it may have expired or the page was hard-reloaded (the POC cache
            is in-memory). Generate a new one.
          </p>
          <a routerLink="../../generate">← Back to generation</a>
        </section>
      }
    </div>
  `,
})
export class ReportResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly report = signal<FleetReport | null>(null);
  readonly json = signal('');
  readonly cacheKey = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.cacheKey.set(reportCacheKey(id));
    const cached = getBridge().cache.peek<FleetReport>(reportCacheKey(id));
    if (cached) {
      this.report.set(cached);
      this.json.set(JSON.stringify(cached, null, 2));
    }
  }
}
