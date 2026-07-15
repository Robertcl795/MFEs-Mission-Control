/**
 * @mission/bridge — the ONLY sanctioned channel between Mission Control
 * micro-frontends. Remotes never import from other remotes; the host never
 * reaches into remote internals. If a contract is not exported here, it
 * does not exist.
 */
export * from './types';
export * from './event-bus';
export * from './session';
export * from './theme';
export * from './data-cache';
export * from './task-manager';
export * from './routing';
export * from './http';
export * from './global';
export * from './create-bridge';
