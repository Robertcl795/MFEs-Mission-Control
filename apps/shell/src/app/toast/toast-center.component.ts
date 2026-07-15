import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getBridge, type TaskSnapshot, type ToastPayload, type Unsubscribe } from '@mission/bridge';

interface Toast extends Required<Pick<ToastPayload, 'id' | 'intent' | 'title'>> {
  message?: string;
  route?: string;
}

/**
 * Global notifications — a SHELL concern. Task lifecycle events arrive on
 * the bridge EventBus no matter which remote started the task or which one
 * is on screen. Clicking a toast deep-links to the (already cached) result.
 */
@Component({
  selector: 'mc-toast-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" data-testid="toast-stack">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast toast-{{ toast.intent }}"
          [class.toast-clickable]="!!toast.route"
          (click)="activate(toast)"
          data-testid="toast"
        >
          <strong>{{ toast.title }}</strong>
          @if (toast.message) {
            <span class="toast-message">{{ toast.message }}</span>
          }
          @if (toast.route) {
            <span class="toast-action">Click to view result →</span>
          }
          <button class="toast-close" (click)="dismiss(toast.id, $event)">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastCenterComponent implements OnInit, OnDestroy {
  readonly toasts = signal<Toast[]>([]);
  private readonly subs: Unsubscribe[] = [];
  private seq = 0;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const { bus } = getBridge();
    this.subs.push(
      bus.on('task:completed', (task) => this.pushTask(task, 'success')),
      bus.on('task:failed', (task) => this.pushTask(task, 'error')),
      bus.on('toast:show', (payload) =>
        this.push({
          id: payload.id ?? `toast-${++this.seq}`,
          intent: payload.intent,
          title: payload.title,
          message: payload.message,
          route: payload.route,
        }),
      ),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((off) => off());
  }

  private pushTask(task: TaskSnapshot, intent: 'success' | 'error'): void {
    this.push({
      id: `task-${task.id}-${intent}`,
      intent,
      title: intent === 'success' ? `${task.title} — completed` : `${task.title} — failed`,
      message: intent === 'success' ? task.message : task.error,
      route: intent === 'success' ? task.resultRoute : undefined,
    });
  }

  private push(toast: Toast): void {
    this.toasts.update((list) => [...list.filter((t) => t.id !== toast.id), toast]);
    setTimeout(() => this.dismissById(toast.id), 10_000);
  }

  activate(toast: Toast): void {
    if (toast.route) {
      void this.router.navigateByUrl(toast.route);
      this.dismissById(toast.id);
    }
  }

  dismiss(id: string, event: Event): void {
    event.stopPropagation();
    this.dismissById(id);
  }

  private dismissById(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
