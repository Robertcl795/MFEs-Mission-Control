import { createDataCache } from './data-cache';
import { createEventBus } from './event-bus';
import { createSessionController, type SessionController } from './session';
import { createTaskManager } from './task-manager';
import { createThemeChannel } from './theme';
import type { MissionBridge } from './global';
import type { MissionUser, ThemeName } from './types';

export const BRIDGE_VERSION = '0.1.0';

export interface CreateBridgeOptions {
  initialTheme?: ThemeName;
  /** Auto-login for POC / standalone-dev bootstraps. */
  initialUser?: { user: MissionUser; token: string };
}

export interface BridgeKit {
  bridge: MissionBridge;
  /**
   * Host-only capabilities (login/logout/grant/revoke). The shell keeps
   * this object private; it is deliberately NOT part of MissionBridge.
   */
  sessionController: SessionController;
}

/**
 * Wires up a complete bridge. Called exactly once by the host — and by a
 * remote's standalone-dev bootstrap when no host is present.
 */
export function createMissionBridge(options: CreateBridgeOptions = {}): BridgeKit {
  const bus = createEventBus();
  const sessionController = createSessionController(bus);
  const theme = createThemeChannel({ bus, initial: options.initialTheme ?? 'dark' });
  const cache = createDataCache(bus);
  const tasks = createTaskManager(bus, cache);

  if (options.initialUser) {
    sessionController.login(options.initialUser.user, options.initialUser.token);
  }

  return {
    bridge: {
      version: BRIDGE_VERSION,
      bus,
      session: sessionController.facade,
      theme,
      cache,
      tasks,
    },
    sessionController,
  };
}
