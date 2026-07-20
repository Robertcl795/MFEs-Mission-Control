import type { RemoteSpec } from '../types';

/** Files keyed by path relative to the remote's root. */
export type FileMap = Record<string, string>;

/**
 * `src/index.ts` — identical across frameworks. The async boundary is the
 * single most load-bearing line in an MF 2.0 remote, hence the loud comment.
 */
export function entryFile(spec: RemoteSpec): string {
  return `// MF 2.0 async boundary — MANDATORY. Do not "simplify" this into a direct
// import: shared singletons (@mission/bridge, framework runtimes) must be
// negotiated before the first shared module executes, otherwise the remote
// dies with \`loadShareSync failed\`.
void import('./bootstrap');
`;
}

/**
 * Standalone-dev bridge install, shared by every bootstrap. When the remote
 * runs federated the host has already installed the real bridge and this
 * block is skipped — same contracts either way.
 */
function devBridgeBlock(spec: RemoteSpec): string {
  return `if (!hasBridge()) {
  // Standalone dev only — when federated, the shell installs the real bridge
  // before this remote loads and this block never runs.
  const { bridge } = createMissionBridge({
    initialTheme: 'dark',
    initialUser: {
      user: {
        id: 'dev-${spec.name}',
        name: 'Local Dev',
        email: 'dev@mission.local',
        roles: ['developer'],
        permissions: ['${spec.name}:view'],
      },
      token: 'dev-token-${spec.name}',
    },
  });
  installBridge(bridge);
  console.info('[${spec.name}] standalone mode — local dev bridge installed');
}`;
}

/* ------------------------------------------------------------------ React */

function reactFiles(spec: RemoteSpec): FileMap {
  return {
    'src/index.ts': entryFile(spec),

    'src/bootstrap.tsx': `import { createMissionBridge, hasBridge, installBridge } from '@mission/bridge';
import { mount } from './mount';

${devBridgeBlock(spec)}

mount(document.getElementById('root')!, { basename: '/' });
`,

    'src/mount.tsx': `import { createRoot } from 'react-dom/client';
import { App } from './App';

export interface MountOptions {
  basename?: string;
}

/**
 * Framework-agnostic federation contract. The shell calls
 * \`loadRemote('${spec.mfName}/mount')\` and never touches React APIs.
 */
export function mount(el: HTMLElement, _options: MountOptions = {}): () => void {
  const root = createRoot(el);
  root.render(<App />);
  return () => root.unmount();
}

export default mount;
`,

    'src/App.tsx': `import { useSyncExternalStore } from 'react';
import { getBridge } from '@mission/bridge';

/**
 * Native adapter over the bridge ThemeChannel — the sanctioned pattern for
 * consuming ANY global state in this remote (no Redux/Zustand/Context copies).
 */
function useTheme() {
  const { theme } = getBridge();
  return useSyncExternalStore(
    (onChange) => theme.subscribe(onChange, { immediate: false }),
    () => theme.current,
  );
}

export function App() {
  const theme = useTheme();

  return (
    <section data-theme={theme} style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>${spec.name}</h1>
      <p>React remote · MF 2.0 · global state via @mission/bridge</p>
      <p>
        Current theme: <strong>{theme}</strong>{' '}
        <button type="button" onClick={() => getBridge().theme.toggle()}>
          Toggle theme
        </button>
      </p>
    </section>
  );
}
`,
  };
}

/* ----------------------------------------------------------------- Svelte */

function svelteFiles(spec: RemoteSpec): FileMap {
  return {
    'src/index.ts': entryFile(spec),

    'src/bootstrap.ts': `import { createMissionBridge, hasBridge, installBridge } from '@mission/bridge';
import { mount } from './mount';

${devBridgeBlock(spec)}

mount(document.getElementById('root')!, { basename: '/' });
`,

    'src/mount.ts': `import { mount as mountComponent, unmount } from 'svelte';
import App from './App.svelte';

export interface MountOptions {
  basename?: string;
}

/**
 * Framework-agnostic federation contract. The shell calls
 * \`loadRemote('${spec.mfName}/mount')\` and never touches Svelte APIs.
 */
export function mount(el: HTMLElement, _options: MountOptions = {}): () => void {
  const app = mountComponent(App, { target: el });
  return () => {
    void unmount(app);
  };
}

export default mount;
`,

    'src/App.svelte': `<script lang="ts">
  import { getBridge, type ThemeName } from '@mission/bridge';

  // Native adapter over the bridge ThemeChannel — the sanctioned pattern for
  // consuming ANY global state in this remote (no local writable() copies).
  const { theme } = getBridge();
  let current: ThemeName = $state(theme.current);

  $effect(() => theme.subscribe((next) => (current = next)));
</script>

<section data-theme={current} style="padding: 2rem; font-family: system-ui;">
  <h1>${spec.name}</h1>
  <p>Svelte remote · MF 2.0 · global state via @mission/bridge</p>
  <p>
    Current theme: <strong>{current}</strong>
    <button type="button" onclick={() => theme.toggle()}>Toggle theme</button>
  </p>
</section>
`,

    'src/svelte-shim.d.ts': `declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}
`,
  };
}

/* ---------------------------------------------------------------- Angular */

function angularFiles(spec: RemoteSpec): FileMap {
  return {
    'src/index.ts': entryFile(spec),

    'src/bootstrap.ts': `import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { createMissionBridge, hasBridge, installBridge } from '@mission/bridge';
import { AppComponent } from './app/app.component';

${devBridgeBlock(spec)}

void bootstrapApplication(AppComponent).catch((err) => console.error(err));
`,

    'src/app/app.component.ts': `import { ChangeDetectionStrategy, Component, type OnDestroy, signal } from '@angular/core';
import { getBridge, type ThemeName } from '@mission/bridge';

/**
 * Native adapter over the bridge ThemeChannel — the sanctioned pattern for
 * consuming ANY global state in this remote (no NgRx / global-service copies).
 */
@Component({
  selector: '${spec.name}-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <section [attr.data-theme]="theme()" style="padding: 2rem; font-family: system-ui;">
      <h1>${spec.name}</h1>
      <p>Angular remote · MF 2.0 · global state via &#64;mission/bridge</p>
      <p>
        Current theme: <strong>{{ theme() }}</strong>
        <button type="button" (click)="toggle()">Toggle theme</button>
      </p>
    </section>
  \`,
})
export class AppComponent implements OnDestroy {
  private readonly bridge = getBridge();

  protected readonly theme = signal<ThemeName>(this.bridge.theme.current);

  private readonly unsubscribe = this.bridge.theme.subscribe((next) => this.theme.set(next));

  protected toggle(): void {
    this.bridge.theme.toggle();
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
`,

    'src/app/routes.ts': `import type { Routes } from '@angular/router';
import { AppComponent } from './app.component';

/**
 * Federation surface: the shell lazy-loads this array via
 * \`loadChildren: () => loadRemote('${spec.mfName}/routes')\`, so guards and
 * route-level providers travel with the routes. Guards must compose
 * validators from @mission/bridge — never hand-rolled permission checks.
 */
export const routes: Routes = [{ path: '', component: AppComponent }];

export default routes;
`,
  };
}

export function frameworkFiles(spec: RemoteSpec): FileMap {
  switch (spec.framework) {
    case 'react':
      return reactFiles(spec);
    case 'svelte':
      return svelteFiles(spec);
    case 'angular':
      return angularFiles(spec);
  }
}
