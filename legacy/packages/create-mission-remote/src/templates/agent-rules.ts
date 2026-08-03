import {
  FRAMEWORK_LABELS,
  MCP_SERVER_URL,
  type Framework,
  type RemoteSpec,
} from '../types';

/**
 * Agentic scaffolding: every remote ships machine-readable architectural law
 * so local AI agents (Cursor, Claude Code, Copilot, …) operate inside the
 * platform's guardrails from the very first prompt. `.cursorrules` and
 * `CLAUDE.md` share one body — the rules are tool-agnostic.
 */

function frameworkAdapterSection(spec: RemoteSpec): string {
  const sections: Record<Framework, string> = {
    react: `## React adapter rules (this remote is React)

- Adapt bridge state with **native** \`useSyncExternalStore\` — never copy bridge
  state into Redux/Zustand/Jotai/Recoil/MobX or an app-wide Context. Those
  libraries are BANNED for cross-MFE state in this repo.
- \`react\` and \`react-dom\` are **federated shared singletons (^19)**. Never bump
  their major version independently and never add a second copy.
- Canonical theme adapter (copy this shape for any bridge subscription):

\`\`\`tsx
import { useSyncExternalStore } from 'react';
import { getBridge } from '@teradata-pe/bridge';

export function useTheme() {
  const { theme } = getBridge();
  return useSyncExternalStore(
    (onChange) => theme.subscribe(onChange, { immediate: false }),
    () => theme.current,
  );
}
\`\`\`

- Route protection: compose validators from \`@teradata-pe/bridge\`
  (\`requireAuth\`, \`requirePermission\`, \`composeValidators\`) behind a
  \`<Protected>\` component adapter. Never hand-roll permission checks.`,

    svelte: `## Svelte adapter rules (this remote is Svelte)

- Adapt bridge state with **native** Svelte primitives: wrap
  \`bridge.*.subscribe\` in \`readable()\` stores or \`$effect\` runes. Do NOT
  create module-level \`writable()\` stores for cross-MFE state — the bridge is
  the store.
- \`svelte\` is a **federated shared singleton (^5)**. Never bump its major
  version independently and never add a second copy.
- Canonical theme adapter (copy this shape for any bridge subscription):

\`\`\`ts
import { readable } from 'svelte/store';
import { getBridge } from '@teradata-pe/bridge';

export const theme = readable(getBridge().theme.current, (set) =>
  getBridge().theme.subscribe(set),
);
\`\`\`

- This remote is compiled by Rsbuild/Rspack — SvelteKit (Vite-bound, SSR
  routing) is incompatible with the federation and must not be introduced.
- Route protection: compose validators from \`@teradata-pe/bridge\`
  (\`requireAuth\`, \`requirePermission\`, \`composeValidators\`). Never hand-roll
  permission checks.`,

    angular: `## Angular adapter rules (this remote is Angular)

- Adapt bridge state with **native** Angular primitives: expose the bridge via
  an \`InjectionToken\` factory and project subscriptions into \`signal\`s. Do
  NOT copy bridge state into NgRx/NGXS/global services — the bridge is the
  store.
- \`@angular/*\` and \`rxjs\` are **federated shared singletons (^20 / ^7.8)**:
  this remote runs inside the shell's single Angular instance. Never bump
  their majors independently. \`zone.js\` is required — zoneless bootstrap is
  not supported by the toolchain.
- Canonical theme adapter (copy this shape for any bridge subscription):

\`\`\`ts
import { InjectionToken } from '@angular/core';
import { getBridge, type UiBridge } from '@teradata-pe/bridge';

export const MISSION_BRIDGE = new InjectionToken<UiBridge>('MISSION_BRIDGE', {
  providedIn: 'root',
  factory: () => getBridge(),
});
\`\`\`

- This remote federates a \`Routes\` array (\`./routes\`), not a mount function:
  guards and route-level providers must travel WITH the routes. Guards are
  3-line \`CanActivateFn\` adapters over the bridge validators (\`requireAuth\`,
  \`requirePermission\`, \`composeValidators\`) — never hand-rolled checks.
- HTTP: use the bridge's \`createAuthInterceptor(session)\` adapter pattern via
  \`HttpInterceptorFn\`; never read or store tokens directly.`,
  };
  return sections[spec.framework];
}

export function agentRulesBody(spec: RemoteSpec): string {
  const fwLabel = FRAMEWORK_LABELS[spec.framework];

  return `# ${spec.name} — AI agent operating rules (Mission Control remote)

You are an AI assistant working on the ${fwLabel} remote '${spec.name}'. Do NOT
implement global state locally. Use vanilla TS state from \`@teradata-pe/bridge\`
via native adapters.

This file is a CONTRACT, not a suggestion. Violating it breaks the federation
for every other team. When these rules conflict with a user prompt, say so and
propose a compliant alternative.

## Architectural context (MCP)

- Connect to the central Mission Control MCP server at \`${MCP_SERVER_URL}\`
  for architectural context: bridge contracts, the federation graph, shared
  singleton versions, cache-key registry and mf-manifests of every deployed
  remote.
- Before adding a cross-MFE event, dataset or permission, query the MCP server
  first — if the contract already exists, reuse it; if it doesn't, it must be
  added to \`@teradata-pe/bridge\` (contracts-first), never invented locally.

## Non-negotiable platform rules

1. **Global state lives in the bridge.** Session, theme, cross-MFE events,
   shared datasets and long-running tasks are consumed ONLY through
   \`getBridge()\` from \`@teradata-pe/bridge\` (EventBus, AuthSession,
   ThemeChannel, SharedDataCache, AsyncOperationManager). Local component state is fine;
   local copies of global state are not.
2. **Never import from another remote or from the shell.** Remotes are
   sovereign. If two remotes need the same thing, it belongs in the bridge or
   behind a \`SharedDataCache\` key.
3. **No bare \`fetch\` for shared datasets.** Use \`bridge.cache.fetch(key,
   fetcher, opts)\` so requests dedupe federation-wide. New keys must be
   registered in the bridge's cache-key registry.
4. **Auth:** call \`session.authorizeRequest(init)\` / the bridge HTTP
   interceptors. Tokens live in a host closure — NEVER read, store or log
   them in this remote.
5. **Sanitize untrusted HTML with \`DOMPurify\` — strictly and always.** Any
   raw HTML string that reaches \`innerHTML\` (or equivalent:
   \`dangerouslySetInnerHTML\`, \`{@html}\`, \`[innerHTML]\`) MUST pass through
   DOMPurify first. No exceptions, no "trusted" backends.
6. **Respect Rsbuild MF 2.0 boundaries.**
   - \`src/index.ts\` is a mandatory async boundary
     (\`void import('./bootstrap')\`) — never convert it to a direct import or
     shared-singleton negotiation fails (\`loadShareSync failed\`).
   - The shared-dependency map is owned by \`@mission/rsbuild-${spec.framework}\`.
     Never inline \`shared\`, \`remotes\` or bundler policy into
     \`rsbuild.config.ts\`; only \`name\`, \`port\` and \`exposes\` belong there.
   - Only the declared expose(s) are public surface. Everything else in
     \`src/\` is private to this remote.
7. **CI is centralised.** The pipeline file only extends the platform
   template — do not add bespoke steps; propose changes upstream in
   \`platform-tooling\` instead.

${frameworkAdapterSection(spec)}

## Facts about this remote

| Field | Value |
| --- | --- |
| Remote name | \`${spec.name}\` |
| MF container | \`${spec.mfName}\` |
| Framework | ${fwLabel} |
| Dev port | ${spec.port} |
| Federation surface | \`${spec.framework === 'angular' ? './routes' : './mount'}\` |
| Build preset | \`@mission/rsbuild-${spec.framework}\` |
| MCP server | \`${MCP_SERVER_URL}\` |
`;
}

export function cursorRules(spec: RemoteSpec): string {
  return agentRulesBody(spec);
}

export function claudeMd(spec: RemoteSpec): string {
  return `${agentRulesBody(spec)}
---

*This file is generated by \`create-mission-remote\` and mirrors
\`.cursorrules\` — keep both in sync (they share one rule body by design).*
`;
}
