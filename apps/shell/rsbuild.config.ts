import { createConfig } from '@nx/angular-rsbuild';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

/**
 * shell — Angular 20 HOST (port 4200).
 *
 * Consumes remotes via their MF 2.0 manifests. Everything the federation
 * shares (Angular, rxjs, the bridge, Monaco) is declared here once; the
 * mf-manifest.json this build emits is the machine-readable source of
 * truth for what this host provides and consumes.
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
      port: 4200,
    },
    skipTypeChecking: false,
  },
  rsbuildConfigOverrides: {
    plugins: [
      pluginModuleFederation({
        name: 'shell',
        // POC: remote types are hand-declared (remotes.d.ts); generated
        // @mf-types churn re-triggers the dev watcher and causes HMR loops.
        dts: false,
        remotes: {
          analytics: 'analytics@http://localhost:4201/mf-manifest.json',
          reports: 'reports@http://localhost:4203/mf-manifest.json',
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
    server: {
      port: 4200,
    },
  },
});
