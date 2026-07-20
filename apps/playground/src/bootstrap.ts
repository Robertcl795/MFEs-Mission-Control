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
        id: 'dev-playground',
        name: 'Playground Dev',
        email: 'dev@mission.local',
        roles: ['developer'],
        permissions: ['playground:edit'],
      },
      token: 'dev-token-playground',
    },
  });
  installBridge(bridge);
  console.info('[playground] standalone mode — local dev bridge installed');
}

mount(document.getElementById('root')!);
