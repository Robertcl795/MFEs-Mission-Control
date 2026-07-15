import type { DataCache } from './data-cache';
import type { EventBus } from './event-bus';
import type { SessionFacade } from './session';
import type { TaskManager } from './task-manager';
import type { ThemeChannel } from './theme';

/**
 * The single object the host installs and every remote consumes.
 * If a capability is not on this interface, remotes must not use it.
 */
export interface MissionBridge {
  readonly version: string;
  readonly bus: EventBus;
  readonly session: SessionFacade;
  readonly theme: ThemeChannel;
  readonly cache: DataCache;
  readonly tasks: TaskManager;
}

/**
 * `@mission/bridge` is federated as a shared singleton, but we do not bet
 * correctness on module identity: the instance is registered under a
 * `Symbol.for` key on `globalThis`, so even a duplicated copy of this
 * module resolves the SAME bridge.
 */
const GLOBAL_KEY = Symbol.for('mission-control.bridge.v1');

type BridgeHolder = { [GLOBAL_KEY]?: MissionBridge };

export function installBridge(bridge: MissionBridge): MissionBridge {
  const holder = globalThis as BridgeHolder;
  if (holder[GLOBAL_KEY]) {
    console.warn('[bridge] installBridge called twice — keeping the existing instance');
    return holder[GLOBAL_KEY];
  }
  holder[GLOBAL_KEY] = bridge;
  return bridge;
}

export function hasBridge(): boolean {
  return (globalThis as BridgeHolder)[GLOBAL_KEY] !== undefined;
}

export function getBridge(): MissionBridge {
  const bridge = (globalThis as BridgeHolder)[GLOBAL_KEY];
  if (!bridge) {
    throw new Error(
      '[bridge] No MissionBridge installed. The host must call installBridge() before any remote loads ' +
        '(standalone remotes should install a dev bridge in their bootstrap).',
    );
  }
  return bridge;
}
