# Mission Control

A micro-frontend proof of concept built for the agentic era: **Module Federation 2.0** on **Rsbuild/Rspack**, a polyglot host/remote topology (Angular ⇄ React), and a single framework-agnostic contract package that makes the whole system legible — to humans and to AI agents.

| App | Framework | Port | Role |
| --- | --- | --- | --- |
| `shell` | Angular 20 | 4200 | **Host.** Owns the bridge (session, theme, cache, tasks, events), layout, routing, global toasts. No feature logic. |
| `analytics` | React 19 | 4201 | **Remote.** Monaco-powered SQL query workbench. Exposes `./mount`. |
| `reports` | Angular 20 | 4203 | **Remote.** Monaco JSON/log viewer + long-running report generation. Exposes `./routes`. |

| Package | Purpose |
| --- | --- |
| `@mission/bridge` | Framework-agnostic contracts: EventBus, SessionFacade, ThemeChannel, SWR DataCache, TaskManager, route validators, HTTP interceptors. |
| `@mission/tokens` | CSS custom properties (`--mc-*`) driven by `html[data-theme]`. |

## Quick start

```bash
pnpm install
pnpm build:contracts   # compile @mission/bridge (apps consume its dist)
pnpm dev               # starts shell (4200), analytics (4201), reports (4203)
```

Open **http://localhost:4200**. Each remote also runs standalone (`http://localhost:4201`, `http://localhost:4203`) with a local dev bridge, honouring the exact same contracts.

`pnpm build` produces production bundles for every app (`apps/*/dist`), including each remote's `mf-manifest.json`.

## The four demos

1. **Cross-remote cache (SWR).** Reports → *Data viewer* fetches `fleet-data` (~1.2s mock network). Then Analytics → *Run query*: served from the shared `DataCache` in single-digit ms — one network request for the whole federation, in-flight requests deduped.
2. **Persistent tasks.** Reports → *Generate* starts a report job in the **host-owned** `TaskManager`, then navigate to Analytics mid-run. Polling keeps going; the shell raises a clickable toast on completion that deep-links to the result — served instantly from the cache.
3. **Global theme.** The header toggle flips `data-theme` on `<html>`; both remotes subscribe to the bridge `ThemeChannel` and every Monaco editor (React *and* Angular) switches `vs` ⇄ `vs-dark` — they share one federated `monaco-editor` singleton (`^0.52.0`).
4. **Shared route protection.** `requirePermission('admin')` from `@mission/bridge` guards `/reports/admin` (Angular `CanActivateFn` adapter) *and* `/analytics/admin` (React component adapter). Toggle `admin` in the header and watch both react live.

## Architectural rules

1. **Remotes never import from other remotes.** All cross-communication goes through `@mission/bridge`.
2. **Contracts first.** If a rule isn't in `@mission/bridge` or an `mf-manifest.json`, it doesn't exist.
3. **The host is a shell.** Contracts, layout, global state, notifications — no heavy features.
4. **No duplicated shared concerns.** Auth, theming, caching and task orchestration live once, in the host, behind bridge interfaces.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for contract-level detail, the federation graph, and the design decisions (async boundaries, Monaco workers, cross-framework routing).

## Verification

The POC was verified end-to-end with a Playwright smoke suite (19 checks: remote mounting, cache dedupe, Monaco theme propagation, guard allow/deny, task persistence + toast deep-link). All checks pass against the dev servers.
