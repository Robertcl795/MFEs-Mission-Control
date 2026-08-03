import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initHostBridge } from './app/host-bridge';
import { initRemoteRegistry } from './app/remote-registry';

// The bridge MUST exist before Angular bootstraps and before any remote
// loads — remotes resolve it synchronously via getBridge().
initHostBridge();

// Remotes are resolved from the environment registry (ADR-003) — never from
// the build. Must complete before the router can trigger a loadRemote().
initRemoteRegistry()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error('[shell] bootstrap failed', err));
