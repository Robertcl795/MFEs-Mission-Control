import {
  createMissionBridge,
  installBridge,
  type MissionBridge,
  type SessionController,
} from '@mission/bridge';

/**
 * Host-side bridge composition. The SHELL owns:
 *  - authentication (the token lives in the session controller's closure);
 *  - the theme side-effect (html[data-theme]);
 *  - the DataCache and TaskManager singletons.
 *
 * `sessionController` is deliberately NOT installed on the bridge: remotes
 * get the read-only SessionFacade, only the shell can login/grant/revoke.
 */
let controller: SessionController | undefined;
let bridge: MissionBridge | undefined;

export function initHostBridge(): MissionBridge {
  if (bridge) return bridge;

  const kit = createMissionBridge({ initialTheme: 'dark' });
  controller = kit.sessionController;
  bridge = installBridge(kit.bridge);

  // POC: authenticate a mock operator. Note: no `admin` permission — use
  // the header toggle to grant it and watch guarded routes unlock live.
  controller.login(
    {
      id: 'op-01',
      name: 'Nova Ryder',
      email: 'nova.ryder@mission.local',
      roles: ['operator'],
      permissions: ['analytics:view', 'analytics:query', 'reports:view', 'reports:generate', 'designer:edit'],
    },
    'poc-jwt-x9f2-not-a-real-token',
  );

  return bridge;
}

/** Shell-internal only. Throws if a remote somehow imports this module. */
export function getSessionController(): SessionController {
  if (!controller) throw new Error('[shell] host bridge not initialised');
  return controller;
}
