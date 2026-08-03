import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Uniform failure tile for FEDERATED-ROUTES remotes (backlog A4). Mount-type
 * remotes already degrade to an inline panel; this closes the gap for
 * loadChildren remotes, which used to throw and kill the navigation (G7).
 * Route `data` supplies { label, reason, hint }.
 */
@Component({
  selector: 'mc-remote-unavailable',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="remote-error">
      <h2>{{ label }} {{ reason === 'disabled' ? 'is switched off' : 'remote unavailable' }}</h2>
      @if (reason === 'disabled') {
        <p>Disabled by platform (registry kill-switch).</p>
        <p class="remote-error-hint">Re-enable it in remotes.dev.json — no shell deploy involved.</p>
      } @else {
        <p>The federated routes could not be loaded.</p>
        <p class="remote-error-hint">{{ hint }}</p>
      }
    </div>
  `,
})
export class RemoteUnavailableComponent {
  private readonly route = inject(ActivatedRoute);
  readonly label = (this.route.snapshot.data['label'] as string) ?? 'Remote';
  readonly reason = (this.route.snapshot.data['reason'] as string) ?? 'error';
  readonly hint = (this.route.snapshot.data['hint'] as string) ?? 'Is the remote dev server running?';
}
