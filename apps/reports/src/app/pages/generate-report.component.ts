import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getBridge, type TaskSnapshot, type Unsubscribe } from '@mission/bridge';
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
          The job runs in the <strong>host's</strong> TaskManager. Navigate to Analytics mid-run — polling keeps
          going, and the shell raises a clickable toast when the report lands in the shared cache.
        </p>
      </section>

      <section class="mcr-card">
        <h3>Task log</h3>
        @if (tasks().length === 0) {
          <p class="mcr-muted">No report jobs yet this session.</p>
        }
        @for (task of tasks(); track task.id) {
          <div class="mcr-task" data-testid="task-row">
            <div class="mcr-task-head">
              <span class="mcr-task-title">{{ task.title }} <code>{{ task.id }}</code></span>
              <span class="mcr-task-status mcr-task-{{ task.status }}">{{ task.status }}</span>
            </div>
            <div class="mcr-progress">
              <div class="mcr-progress-bar" [style.width.%]="task.progress"></div>
            </div>
            <div class="mcr-task-foot">
              <span class="mcr-muted">{{ task.message ?? task.error ?? '' }}</span>
              @if (task.status === 'completed' && task.resultRoute) {
                <a [routerLink]="resultLink(task)">Open result →</a>
              }
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class GenerateReportComponent implements OnInit, OnDestroy {
  readonly tasks = signal<TaskSnapshot[]>([]);
  private off?: Unsubscribe;

  ngOnInit(): void {
    const { tasks } = getBridge();
    this.refresh();
    this.off = tasks.subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    // Only the SUBSCRIPTION dies with this component — the tasks don't.
    this.off?.();
  }

  generate(): void {
    startReportGeneration();
  }

  resultLink(task: TaskSnapshot): string[] {
    return ['..', 'results', task.id];
  }

  private refresh(): void {
    const list = getBridge()
      .tasks.list()
      .filter((task) => task.kind === 'report:generate')
      .sort((a, b) => b.startedAt - a.startedAt);
    this.tasks.set(list);
  }
}
