import { createConfig } from '@nx/angular-rsbuild';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * monaco-editor's ESM build ships a dead AMD fallback in
 * editorSimpleWorker.js (`if (!isESM) require([moduleId], ...)`) that
 * Rspack cannot statically analyse. `isESM` is always true in this build,
 * so the branch never executes — the "Critical dependency" warning is
 * noise. Suppress it for monaco modules only.
 */
const monacoDeadAmdRequireWarning = (warning: Error & { module?: { resource?: string } }): boolean =>
  /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/.test(
    warning.message,
  ) && /monaco-editor/.test(warning.module?.resource ?? '');

/**
 * reports — Angular 20 remote (port 4203).
 *
 * Exposes './routes' (an Angular Routes array) that the shell lazy-loads
 * into its router. Angular itself is a shared singleton, so the remote's
 * components run inside the host's Angular instance.
 */
export default () =>
  createConfig({
  options: {
    browser: './src/main.ts',
    tsConfig: './tsconfig.json',
    index: './src/index.html',
    styles: ['./src/styles.css'],
    assets: [],
    polyfills: [],
    aot: true,
    devServer: {
      port: 4203,
    },
    skipTypeChecking: false,
  },
  rsbuildConfigOverrides: {
    plugins: [
      pluginModuleFederation({
        name: 'reports',
        // POC: remote types are hand-declared (remotes.d.ts); generated
        // @mf-types churn re-triggers the dev watcher and causes HMR loops.
        dts: false,
        exposes: {
          './routes': './src/app/remote-entry/routes.ts',
        },
        shared: {
          '@angular/core': { singleton: true, requiredVersion: '^20.0.0' },
          '@angular/common': { singleton: true, requiredVersion: '^20.0.0' },
          '@angular/common/http': { singleton: true, requiredVersion: '^20.0.0' },
          '@angular/router': { singleton: true, requiredVersion: '^20.0.0' },
          '@angular/platform-browser': { singleton: true, requiredVersion: '^20.0.0' },
          rxjs: { singleton: true, requiredVersion: '^7.8.0' },
          '@mission/bridge': { singleton: true, requiredVersion: false },
          'monaco-editor': { singleton: true, requiredVersion: '^0.52.0' },
        },
      },
      // The Angular Rsbuild toolchain names its environment 'browser';
      // without this the MF plugin waits for the default 'web' env forever.
      { environment: 'browser' }),
    ],
    tools: {
      rspack: {
        ignoreWarnings: [monacoDeadAmdRequireWarning],
      },
    },
    server: {
      port: 4203,
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    dev: {
      assetPrefix: 'http://localhost:4203/',
    },
    output: {
      assetPrefix: 'http://localhost:4203/',
    },
  },
});
