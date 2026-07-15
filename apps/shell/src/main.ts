import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { initHostBridge } from './app/host-bridge';

// The bridge MUST exist before Angular bootstraps and before any remote
// loads — remotes resolve it synchronously via getBridge().
initHostBridge();

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error('[shell] bootstrap failed', err));
