import { createMissionBridge, hasBridge, installBridge } from '@mission/bridge';
import { mount } from './mount';

/**
 * Standalone-dev bootstrap (never runs when federated into the shell — the
 * shell loads `./mount` directly). Installs a local dev bridge so the
 * remote honours the exact same contracts without a host.
 */
if (!hasBridge()) {
  const { bridge } = createMissionBridge({
    initialTheme: 'dark',
    initialUser: {
      user: {
        id: 'dev-designer',
        name: 'Designer Dev',
        email: 'dev@mission.local',
        roles: ['developer'],
        permissions: ['designer:edit'],
      },
      token: 'dev-token-designer',
    },
  });
  installBridge(bridge);
  console.info('[designer] standalone mode — local dev bridge installed');
}

mount(document.getElementById('root')!);
