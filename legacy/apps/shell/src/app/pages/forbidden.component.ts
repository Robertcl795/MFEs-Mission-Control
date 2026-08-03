import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mc-forbidden',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel forbidden" data-testid="forbidden">
      <h1>403 — Not on the manifest</h1>
      <p>
        A <code>@teradata-pe/bridge</code> route validator blocked this navigation. Grant yourself
        <code>admin</code> from the header toggle and try again.
      </p>
      <a routerLink="/">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}
