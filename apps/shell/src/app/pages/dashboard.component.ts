import { ChangeDetectionStrategy, Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getBridge, type Unsubscribe } from '@mission/bridge';

interface BusLogEntry {
  at: string;
  event: string;
  detail: string;
}

@Component({
  selector: 'mc-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <section class="hero">
        <h1>Welcome back, {{ userName() }}.</h1>
        <p>
          This shell is a <em>host, not a feature app</em>: it owns the bridge (session, theme, cache, tasks,
          events), the layout and global toasts. Everything else lives in federated remotes.
        </p>
        <div class="hero-links">
          <a routerLink="/analytics" class="hero-card">
            <h3>Analytics</h3>
            <p>React 19 · Monaco query workbench · port 4201</p>
          </a>
          <a routerLink="/reports" class="hero-card">
            <h3>Reports</h3>
            <p>Angular 20 · Monaco JSON viewer · persistent report generation · port 4203</p>
          </a>
        </div>
      </section>

      <section class="panel">
        <h2>Try the cross-remote demos</h2>
        <ol class="demo-list">
          <li><strong>Shared cache:</strong> open Reports → “Data viewer” (fetches <code>fleet-data</code>), then Analytics → “Run query”. The second load is instant — one network request for the whole federation.</li>
          <li><strong>Persistent tasks:</strong> start a report in Reports → “Generate”, immediately navigate to Analytics. Polling continues in the host; a toast appears here when it finishes — click it to open the cached result.</li>
          <li><strong>Global theme:</strong> hit the theme button above. Both remotes — and every Monaco editor (React and Angular) — flip between <code>vs</code> and <code>vs-dark</code>.</li>
          <li><strong>Route guards:</strong> toggle <code>admin</code> in the header, then visit Reports → “Admin”. The same <code>@mission/bridge</code> validator guards the React admin tab.</li>
        </ol>
      </section>

      <section class="panel">
        <h2>Bridge event bus <span class="live-dot"></span></h2>
        <p class="muted">Live feed of cross-MFE traffic (contract: <code>MissionEventMap</code>)</p>
        @if (log().length === 0) {
          <p class="muted">No events yet — interact with a remote.</p>
        }
        <ul class="bus-log" data-testid="bus-log">
          @for (entry of log(); track $index) {
            <li>
              <span class="bus-time">{{ entry.at }}</span>
              <code class="bus-event">{{ entry.event }}</code>
              <span class="bus-detail">{{ entry.detail }}</span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly log = signal<BusLogEntry[]>([]);
  readonly userName = signal('operator');
  private off?: Unsubscribe;

  ngOnInit(): void {
    const bridge = getBridge();
    this.userName.set(bridge.session.user?.name ?? 'operator');
    this.off = bridge.bus.onAny((event, payload) => {
      const detail = summarise(payload);
      this.log.update((entries) =>
        [{ at: new Date().toLocaleTimeString(), event, detail }, ...entries].slice(0, 8),
      );
    });
  }

  ngOnDestroy(): void {
    this.off?.();
  }
}

function summarise(payload: unknown): string {
  if (payload === null || payload === undefined) return '';
  try {
    const text = JSON.stringify(payload);
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  } catch {
    return String(payload);
  }
}
