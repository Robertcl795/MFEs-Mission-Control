import { createBridge, hasBridge, installBridge } from '@teradata-pe/bridge';
import { mount } from './mount';

/**
 * Standalone-dev bootstrap (never runs when federated into the shell — the
 * shell loads `./mount` directly). Installs a local dev bridge so the
 * remote honours the exact same contracts without a host.
 */
if (!hasBridge()) {
  const { bridge } = createBridge({
    initialTheme: 'dark',
    initialUser: {
      user: {
        id: 'dev-analytics',
        name: 'Analytics Dev',
        email: 'dev@mission.local',
        roles: ['developer'],
        permissions: ['analytics:view', 'analytics:query'],
      },
      token: 'dev-token-analytics',
    },
  });
  installBridge(bridge);
  console.info('[analytics] standalone mode — local dev bridge installed');
}

mount(document.getElementById('root')!, { basename: '/' });
