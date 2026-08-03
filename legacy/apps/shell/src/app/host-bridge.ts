import {
  createBridge,
  installBridge,
  type UiBridge,
  type AuthSessionController,
} from '@teradata-pe/bridge';

/**
 * Host-side bridge composition. The SHELL owns:
 *  - authentication (the token lives in the session controller's closure);
 *  - the theme side-effect (html[data-theme]);
 *  - the SharedDataCache and AsyncOperationManager singletons.
 *
 * `authSessionController` is deliberately NOT installed on the bridge: remotes
 * get the read-only AuthSession, only the shell can login/grant/revoke.
 */
let controller: AuthSessionController | undefined;
let bridge: UiBridge | undefined;

export function initHostBridge(): UiBridge {
  if (bridge) return bridge;

  const kit = createBridge({ initialTheme: 'dark' });
  controller = kit.authSessionController;
  bridge = installBridge(kit.bridge);

  // POC: authenticate a mock operator. Note: no `admin` permission — use
  // the header toggle to grant it and watch guarded routes unlock live.
  controller.login(
    {
      id: 'op-01',
      name: 'Nova Ryder',
      email: 'nova.ryder@mission.local',
      roles: ['operator'],
      permissions: ['analytics:view', 'analytics:query', 'reports:view', 'reports:generate', 'playground:edit'],
    },
    'poc-jwt-x9f2-not-a-real-token',
  );

  return bridge;
}

/** Shell-internal only. Throws if a remote somehow imports this module. */
export function getAuthSessionController(): AuthSessionController {
  if (!controller) throw new Error('[shell] host bridge not initialised');
  return controller;
}
