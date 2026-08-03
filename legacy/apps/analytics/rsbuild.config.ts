import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * analytics — React 19 remote (port 4201).
 *
 * Exposes a framework-agnostic `mount(el, options)` so the Angular shell
 * never touches React APIs. All cross-app state flows through the shared
 * `@teradata-pe/bridge` singleton.
 */
export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'analytics',
        // POC: remote types are hand-declared (remotes.d.ts); generated
        // @mf-types churn re-triggers the dev watcher and causes HMR loops.
        dts: false,
      exposes: {
        './mount': './src/mount.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        // The bridge is version-agnostic within the workspace; identity is
        // additionally pinned via a globalThis symbol (see @teradata-pe/bridge).
        '@teradata-pe/bridge': { singleton: true, requiredVersion: false },
        // ONE Monaco for the whole federation — required by the architecture.
        'monaco-editor': { singleton: true, requiredVersion: '^0.52.0' },
      },
    }),
  ],
  source: {
    // Standalone-dev entry (async boundary → ./bootstrap). When federated,
    // the shell ignores this and loads the exposed './mount' module.
    entry: { index: './src/main.tsx' },
  },
  tools: {
    rspack: {
      ignoreWarnings: [
        // monaco-editor's ESM build ships a dead AMD fallback in
        // editorSimpleWorker.js (`if (!isESM) require([moduleId], ...)`).
        // isESM is always true in this build, so the branch never executes —
        // the "Critical dependency" warning is noise. Monaco modules only.
        {
          message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
          module: /monaco-editor/,
        },
      ],
    },
  },
  server: {
    port: 4201,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  dev: {
    // Absolute URLs so federated chunks/workers resolve from the remote's
    // own origin when loaded inside the shell (port 4200).
    assetPrefix: 'http://localhost:4201/',
  },
  output: {
    assetPrefix: 'http://localhost:4201/',
  },
  html: {
    title: 'Analytics — standalone dev',
  },
});
