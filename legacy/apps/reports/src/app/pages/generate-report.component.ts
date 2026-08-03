import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getBridge, type OperationSnapshot, type Unsubscribe } from '@teradata-pe/bridge';
import { startReportGeneration } from '../data/report-generator';

@Component({
  selector: 'mcr-generate-report',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcr-stack">
      <section class="mcr-card">
        <header class="mcr-card-header">
          <h2>Generate fleet readiness report</h2>
          <button class="mcr-btn mcr-btn-primary" (click)="generate()" data-testid="generate-report">
            Start generation
          </button>
        </header>
        <p class="mcr-muted">
          The job runs in the <strong>host's</strong> AsyncOperationManager. Navigate to Analytics mid-run — polling keeps
          going, and the shell raises a clickable toast when the report lands in the shared cache.
        </p>
      </section>

      <section class="mcr-card">
        <h3>Operation log</h3>
        @if (operations().length === 0) {
          <p class="mcr-muted">No report jobs yet this session.</p>
        }
        @for (operation of operations(); track operation.id) {
          <div class="mcr-task" data-testid="task-row">
            <div class="mcr-task-head">
              <span class="mcr-task-title">{{ operation.title }} <code>{{ operation.id }}</code></span>
              <span class="mcr-task-status mcr-task-{{ operation.status }}">{{ operation.status }}</span>
            </div>
            <div class="mcr-progress">
              <div class="mcr-progress-bar" [style.width.%]="operation.progress"></div>
            </div>
            <div class="mcr-task-foot">
              <span class="mcr-muted">{{ operation.message ?? operation.error ?? '' }}</span>
              @if (operation.status === 'completed' && operation.resultRoute) {
                  <a [routerLink]="resultLink(operation)">Open result →</a>
              }
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class GenerateReportComponent implements OnInit, OnDestroy {
  readonly operations = signal<OperationSnapshot[]>([]);
  private off?: Unsubscribe;

  ngOnInit(): void {
    const { operations } = getBridge();
    this.refresh();
    this.off = operations.subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    // Only the subscription dies with this component; operations do not.
    this.off?.();
  }

  generate(): void {
    startReportGeneration();
  }

  resultLink(operation: OperationSnapshot): string[] {
    return ['..', 'results', operation.id];
  }

  private refresh(): void {
    const list = getBridge()
      .operations.list()
      .filter((operation) => operation.kind === 'report:generate')
      .sort((a, b) => b.startedAt - a.startedAt);
    this.operations.set(list);
  }
}
