import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mcr-reports-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mcr-card" data-testid="reports-admin">
      <h2>Reports administration</h2>
      <p>
        Visible only with the <code>admin</code> permission — enforced by the SAME
        <code>requirePermission('admin')</code> validator from <code>@teradata-pe/bridge</code> that guards the React
        analytics admin tab. Revoke admin in the shell header and you'll be redirected to <code>/forbidden</code>.
      </p>
    </section>
  `,
})
export class ReportsAdminComponent {}
