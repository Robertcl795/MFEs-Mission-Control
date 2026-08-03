import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getBridge, type OperationSnapshot, type ToastPayload, type Unsubscribe } from '@teradata-pe/bridge';

interface Toast extends Required<Pick<ToastPayload, 'id' | 'intent' | 'title'>> {
  message?: string;
  route?: string;
}

/**
 * Global notifications — a SHELL concern. Operation lifecycle events arrive on
 * the bridge EventBus no matter which remote started the operation or which one
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
      bus.on('operation:completed', (operation) => this.pushOperation(operation, 'success')),
      bus.on('operation:failed', (operation) => this.pushOperation(operation, 'error')),
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

  private pushOperation(operation: OperationSnapshot, intent: 'success' | 'error'): void {
    this.push({
      id: `operation-${operation.id}-${intent}`,
      intent,
      title: intent === 'success' ? `${operation.title} — completed` : `${operation.title} — failed`,
      message: intent === 'success' ? operation.message : operation.error,
      route: intent === 'success' ? operation.resultRoute : undefined,
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
