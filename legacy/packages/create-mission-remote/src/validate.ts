import type { CiProvider, Framework } from './types';

const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Ports below 1024 are privileged; 4200 is reserved for the shell host. */
const MIN_PORT = 1024;
const MAX_PORT = 65535;
const SHELL_PORT = 4200;

/** Returns an error message, or undefined when the name is valid. */
export function validateRemoteName(raw: string): string | undefined {
  const name = raw.trim();
  if (name.length === 0) return 'A remote name is required.';
  if (name.length > 40) return 'Keep it under 40 characters.';
  if (!NAME_RE.test(name)) {
    return 'Use kebab-case: lowercase letters, digits and single dashes (e.g. "billing", "fleet-ops").';
  }
  return undefined;
}

/** Returns an error message, or undefined when the port is valid. */
export function validatePort(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return 'The port must be a number (e.g. 4205).';
  const port = Number(trimmed);
  if (port < MIN_PORT || port > MAX_PORT) {
    return `Pick a port between ${MIN_PORT} and ${MAX_PORT}.`;
  }
  if (port === SHELL_PORT) {
    return `Port ${SHELL_PORT} is reserved for the Mission Control shell (host).`;
  }
  return undefined;
}

/** MF 2.0 container names land on `globalThis`, so they must be identifiers. */
export function toMfName(name: string): string {
  return name.replace(/-/g, '_');
}

export function isFramework(value: string): value is Framework {
  return value === 'angular' || value === 'react' || value === 'svelte';
}

export function isCiProvider(value: string): value is CiProvider {
  return value === 'github' || value === 'gitlab';
}
