import { PLATFORM_DEP_VERSION, type Framework, type RemoteSpec } from '../types';

interface FrameworkDeps {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  typecheck: string;
}

const FRAMEWORK_DEPS: Record<Framework, FrameworkDeps> = {
  react: {
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@mission/rsbuild-react': PLATFORM_DEP_VERSION,
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
    },
    typecheck: 'tsc --noEmit',
  },
  svelte: {
    dependencies: {
      svelte: '^5.0.0',
    },
    devDependencies: {
      '@mission/rsbuild-svelte': PLATFORM_DEP_VERSION,
      'svelte-check': '^4.1.0',
    },
    typecheck: 'svelte-check --tsconfig ./tsconfig.json',
  },
  angular: {
    dependencies: {
      '@angular/common': '^20.0.0',
      '@angular/core': '^20.0.0',
      '@angular/platform-browser': '^20.0.0',
      '@angular/router': '^20.0.0',
      rxjs: '^7.8.0',
      // Required: the Angular-Rsbuild toolchain appends zone.js to the
      // polyfills unconditionally — zoneless bootstrap is not supported.
      'zone.js': '~0.15.0',
    },
    devDependencies: {
      '@mission/rsbuild-angular': PLATFORM_DEP_VERSION,
    },
    typecheck: 'tsc --noEmit',
  },
};

function sorted(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

export function packageJson(spec: RemoteSpec): string {
  const fw = FRAMEWORK_DEPS[spec.framework];
  const manifest = {
    name: spec.name,
    version: '0.1.0',
    private: true,
    description: `Mission Control remote: ${spec.name} (${spec.framework}, port ${spec.port}).`,
    scripts: {
      dev: 'rsbuild dev',
      build: 'rsbuild build',
      preview: 'rsbuild preview',
      typecheck: fw.typecheck,
    },
    dependencies: sorted({
      // The ONLY sanctioned global-communication channel between MFEs.
      '@mission/bridge': PLATFORM_DEP_VERSION,
      ...fw.dependencies,
    }),
    devDependencies: sorted({
      ...fw.devDependencies,
      typescript: '~5.7.2',
    }),
    engines: {
      node: '>=20',
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
