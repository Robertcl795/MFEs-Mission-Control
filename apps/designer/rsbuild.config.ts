import { defineConfig } from '@rsbuild/core';
import { pluginSvelte } from '@rsbuild/plugin-svelte';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * designer — Svelte 5 remote (port 4202).
 *
 * A "SvelteKit-style" app federated the MFE way: SvelteKit itself is
 * Vite/SSR-bound and cannot join an Rspack federation, so this remote is
 * Svelte 5 on Rsbuild exposing the same framework-agnostic `mount`
 * contract as the React remote. Sections: Monaco editor (CSS/HTML syntax
 * switching) + sanitized live canvas.
 */
export default defineConfig({
  plugins: [
    pluginSvelte(),
    pluginModuleFederation({
      name: 'designer',
      // POC: remote types are hand-declared (remotes.d.ts); generated
      // @mf-types churn re-triggers the dev watcher and causes HMR loops.
      dts: false,
      exposes: {
        './mount': './src/mount.ts',
      },
      shared: {
        svelte: { singleton: true, requiredVersion: '^5.0.0' },
        '@mission/bridge': { singleton: true, requiredVersion: false },
        // ONE Monaco for the whole federation — required by the architecture.
        'monaco-editor': { singleton: true, requiredVersion: '^0.52.0' },
      },
    }),
  ],
  source: {
    // Standalone-dev entry (async boundary → ./bootstrap). When federated,
    // the shell ignores this and loads the exposed './mount' module.
    entry: { index: './src/main.ts' },
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
    port: 4202,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  dev: {
    assetPrefix: 'http://localhost:4202/',
  },
  output: {
    assetPrefix: 'http://localhost:4202/',
  },
  html: {
    title: 'Designer — standalone dev',
  },
});
