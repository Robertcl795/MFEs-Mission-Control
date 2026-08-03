import { registerRemotes } from '@module-federation/enhanced/runtime';

/**
 * Runtime remote resolution (ADR-003, backlog A1).
 *
 * The shell no longer bakes its remotes into the build: at boot it fetches the
 * environment's registry document and registers every enabled remote with the
 * MF 2.0 runtime. Editing the JSON (new remote, version bump, kill-switch) is
 * enough — the shell is never rebuilt.
 *
 * M6 fallback: with USE_REGISTRY=false, or when the registry is unreachable
 * and nothing is cached, the shell falls back to DEFAULT_REMOTES — the exact
 * list that used to live in rsbuild.config.ts.
 */
export const USE_REGISTRY = true;
export const REGISTRY_URL = 'http://localhost:4400/remotes.dev.json';
const FETCH_TIMEOUT_MS = 3000;
const CACHE_KEY = 'shell.remote-registry.last';

export interface RemoteEntry {
  name: string;
  version: string;
  manifestUrl: string;
  requiredBridge: string;
  flags: { enabled: boolean; canaryPercent?: number };
}

interface RegistryDocument {
  environment: string;
  updatedAt?: string;
  remotes: RemoteEntry[];
}

/** The pre-registry hardcode, kept verbatim as the fallback (M6). */
const DEFAULT_REMOTES: RemoteEntry[] = [
  { name: 'analytics', version: 'dev', manifestUrl: 'http://localhost:4201/mf-manifest.json', requiredBridge: '*', flags: { enabled: true } },
  { name: 'playground', version: 'dev', manifestUrl: 'http://localhost:4204/mf-manifest.json', requiredBridge: '*', flags: { enabled: true } },
  { name: 'reports', version: 'dev', manifestUrl: 'http://localhost:4203/mf-manifest.json', requiredBridge: '*', flags: { enabled: true } },
];

const state = new Map<string, RemoteEntry>();
let source: 'registry' | 'cache' | 'fallback' = 'fallback';

async function fetchRegistry(): Promise<RegistryDocument> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REGISTRY_URL, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`registry responded ${res.status}`);
    return (await res.json()) as RegistryDocument;
  } finally {
    clearTimeout(timer);
  }
}

function resolveEntries(): Promise<RemoteEntry[]> {
  if (!USE_REGISTRY) {
    source = 'fallback';
    return Promise.resolve(DEFAULT_REMOTES);
  }
  return fetchRegistry()
    .then((doc) => {
      source = 'registry';
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(doc));
      return doc.remotes;
    })
    .catch((err) => {
      console.warn('[shell] registry unreachable, using last cached copy / fallback', err);
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        source = 'cache';
        return (JSON.parse(cached) as RegistryDocument).remotes;
      }
      source = 'fallback';
      return DEFAULT_REMOTES;
    });
}

/**
 * Resolve the registry and register every ENABLED remote with the federation
 * runtime. Must run before Angular bootstraps (routes load remotes eagerly on
 * navigation). Disabled remotes stay known (for the kill-switch UI) but are
 * never registered — the runtime cannot even try to load them.
 */
export async function initRemoteRegistry(): Promise<void> {
  const entries = await resolveEntries();
  for (const entry of entries) state.set(entry.name, entry);

  const enabled = entries.filter((e) => e.flags.enabled);
  registerRemotes(enabled.map((e) => ({ name: e.name, entry: e.manifestUrl })));

  console.info(
    `[shell] remotes resolved from ${source}:`,
    entries.map((e) => `${e.name}@${e.version}${e.flags.enabled ? '' : ' (DISABLED)'}`).join(', '),
  );
}

/** Kill-switch lookup for outlets/guards. Unknown remotes count as disabled. */
export function isRemoteEnabled(name: string): boolean {
  return state.get(name)?.flags.enabled ?? false;
}

export function getRemoteEntry(name: string): RemoteEntry | undefined {
  return state.get(name);
}

/** Where the current remote map came from — shown in the demo. */
export function registrySource(): string {
  return source;
}
