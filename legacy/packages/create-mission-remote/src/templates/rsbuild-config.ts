import type { RemoteSpec } from '../types';

/**
 * The generated config deliberately contains almost nothing: federation
 * policy (shared singleton map, mf-manifest emission, CORS headers, absolute
 * assetPrefix, async-boundary enforcement) is owned by the platform preset.
 * A remote only declares what is unique to it — name, port, exposes.
 */
export function rsbuildConfig(spec: RemoteSpec): string {
  const { name, mfName, port, framework } = spec;

  if (framework === 'angular') {
    return `import { createMissionRemote } from '@mission/rsbuild-angular';

/**
 * ${name} — Angular remote (port ${port}).
 *
 * Federation policy (shared singletons, mf-manifest, CORS, assetPrefix) is
 * owned by @mission/rsbuild-angular. Do NOT inline a custom \`shared\` map —
 * the whole federation must negotiate one identical map.
 *
 * NOTE: the Angular toolchain resolves its compiler config asynchronously, so
 * createMissionRemote() returns a Promise. Rsbuild rejects a top-level
 * Promise — the config MUST stay exported as a function.
 */
export default () =>
  createMissionRemote({
    name: '${mfName}',
    port: ${port},
    exposes: {
      // Angular remotes federate a Routes array; the shell lazy-loads it
      // via loadChildren so guards + providers travel with the routes.
      './routes': './src/app/routes.ts',
    },
  });
`;
  }

  const preset = framework === 'react' ? '@mission/rsbuild-react' : '@mission/rsbuild-svelte';
  const mountFile = framework === 'react' ? './src/mount.tsx' : './src/mount.ts';
  const label = framework === 'react' ? 'React' : 'Svelte';

  return `import { createMissionRemote } from '${preset}';

/**
 * ${name} — ${label} remote (port ${port}).
 *
 * Federation policy (shared singletons, mf-manifest, CORS, assetPrefix) is
 * owned by ${preset}. Do NOT inline a custom \`shared\` map —
 * the whole federation must negotiate one identical map.
 */
export default createMissionRemote({
  name: '${mfName}',
  port: ${port},
  exposes: {
    // Framework-agnostic contract: mount(el, options) => unmount.
    // The shell never touches ${label} APIs.
    './mount': '${mountFile}',
  },
});
`;
}
