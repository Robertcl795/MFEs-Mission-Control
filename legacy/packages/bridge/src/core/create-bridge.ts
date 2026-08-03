import { createSharedDataCache } from '../features/data-cache';
import { createEventBus } from './event-bus';
import { createAsyncOperationManager } from '../features/operations';
import { createAuthSessionController, type AuthSessionController } from '../features/session';
import { createThemeChannel } from '../features/theme';
import type { UiBridge } from './global';
import type { ThemeName, UserIdentity } from '../schema/types';

export const BRIDGE_VERSION = '0.1.0';

export interface CreateBridgeOptions {
  initialTheme?: ThemeName;
  /** Auto-login for POC / standalone-dev bootstraps. */
  initialUser?: { user: UserIdentity; token: string };
}

export interface BridgeKit {
  bridge: UiBridge;
  /**
   * Host-only capabilities (login/logout/grant/revoke). The shell keeps
  * this object private; it is deliberately NOT part of UiBridge.
   */
  authSessionController: AuthSessionController;
}

/**
 * Wires up a complete bridge. Called exactly once by the host — and by a
 * remote's standalone-dev bootstrap when no host is present.
 */
export function createBridge(options: CreateBridgeOptions = {}): BridgeKit {
  const bus = createEventBus();
  const authSessionController = createAuthSessionController(bus);
  const theme = createThemeChannel({ bus, initial: options.initialTheme ?? 'dark' });
  const cache = createSharedDataCache(bus);
  const operations = createAsyncOperationManager(bus, cache);

  if (options.initialUser) {
    authSessionController.login(options.initialUser.user, options.initialUser.token);
  }

  return {
    bridge: {
      version: BRIDGE_VERSION,
      bus,
      session: authSessionController.facade,
      theme,
      cache,
      operations,
    },
    authSessionController,
  };
}
