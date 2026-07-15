import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * analytics — React 19 remote (port 4201).
 *
 * Exposes a framework-agnostic `mount(el, options)` so the Angular shell
 * never touches React APIs. All cross-app state flows through the shared
 * `@mission/bridge` singleton.
 */
export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'analytics',
      exposes: {
        './mount': './src/mount.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        // The bridge is version-agnostic within the workspace; identity is
        // additionally pinned via a globalThis symbol (see @mission/bridge).
        '@mission/bridge': { singleton: true, requiredVersion: false },
        // ONE Monaco for the whole federation — required by the architecture.
        'monaco-editor': { singleton: true, requiredVersion: '^0.52.0' },
      },
    }),
  ],
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
