# Mission Control

A micro-frontend proof of concept built for the agentic era: **Module Federation 2.0** on **Rsbuild/Rspack**, a polyglot host/remote topology (Angular ⇄ React), and a single framework-agnostic contract package that makes the whole system legible — to humans and to AI agents.

| App | Framework | Port | Role |
| --- | --- | --- | --- |
| `shell` | Angular 20 | 4200 | **Host.** Owns the bridge (session, theme, cache, tasks, events), layout, routing, global toasts. No feature logic. |
| `analytics` | React 19 | 4201 | **Remote.** Monaco-powered SQL query workbench. Exposes `./mount`. |
| `reports` | Angular 20 | 4203 | **Remote.** Monaco JSON/log viewer + long-running report generation. Exposes `./routes`. |
| `playground` | Svelte 5 | 4204 | **Remote.** Monaco CSS/HTML editor + sanitized live canvas (DOMPurify + CSS filter, shadow DOM). Exposes `./mount`. |

| Package | Purpose |
| --- | --- |
| `@mission/bridge` | Framework-agnostic contracts: EventBus, SessionFacade, ThemeChannel, SWR DataCache, TaskManager, route validators, HTTP interceptors. |
| `@mission/tokens` | CSS custom properties (`--mc-*`) driven by `html[data-theme]`. |

## Quick start

```bash
pnpm install
pnpm dev               # compiles @mission/bridge, then starts shell (4200), analytics (4201), reports (4203), playground (4204)
```

Open **http://localhost:4200**. Each remote also runs standalone (`http://localhost:4201`, `4203`, `4204`) with a local dev bridge, honouring the exact same contracts. When starting a single app on its own (`pnpm --filter <app> dev`), run `pnpm build:contracts` once first — apps consume the bridge's compiled `dist`.

`pnpm build` produces production bundles for every app (`apps/*/dist`), including each remote's `mf-manifest.json`.

## The five demos

1. **Cross-remote cache (SWR).** Reports → *Data viewer* fetches `fleet-data` (~1.2s mock network). Then Analytics → *Run query*: served from the shared `DataCache` in single-digit ms — one network request for the whole federation, in-flight requests deduped.
2. **Persistent tasks.** Reports → *Generate* starts a report job in the **host-owned** `TaskManager`, then navigate to Analytics mid-run. Polling keeps going; the shell raises a clickable toast on completion that deep-links to the result — served instantly from the cache.
3. **Global theme.** The header toggle flips `data-theme` on `<html>`; both remotes subscribe to the bridge `ThemeChannel` and every Monaco editor (React *and* Angular) switches `vs` ⇄ `vs-dark` — they share one federated `monaco-editor` singleton (`^0.52.0`).
4. **Shared route protection.** `requirePermission('admin')` from `@mission/bridge` guards `/reports/admin` (Angular `CanActivateFn` adapter) *and* `/analytics/admin` (React component adapter). Toggle `admin` in the header and watch both react live.
5. **Sanitized design canvas.** Playground (Svelte 5) edits two documents — `index.html` and `styles.css` — in ONE Monaco instance that swaps models (and syntax highlighting) per file. Every keystroke passes through DOMPurify + a CSS filter before rendering into a shadow-DOM canvas; try typing a `<script>` tag and watch the sanitizer counter. "Insert fleet table" reuses the same `fleet-data` cache entry as the other remotes — still one network request federation-wide.
6. **BEM, two flavours.** The playground remote doubles as a commented BEM showcase: its own chrome is SCSS BEM ([`apps/playground/src/styles.scss`](./apps/playground/src/styles.scss) — `&__element` / `&--modifier` nesting that compiles to flat single-class selectors), and the canvas's default documents demo the same grammar in **vanilla CSS**, live-editable in Monaco. In an MFE the convention earns its keep twice: the `pg-` block namespace makes cross-remote class collisions impossible, and flat (0,1,0) specificity means no remote ever needs `!important` to win. Type a `<script>` tag and watch the `pg-canvas__note--alert` state modifier flip on.

## Architectural rules

1. **Remotes never import from other remotes.** All cross-communication goes through `@mission/bridge`.
2. **Contracts first.** If a rule isn't in `@mission/bridge` or an `mf-manifest.json`, it doesn't exist.
3. **The host is a shell.** Contracts, layout, global state, notifications — no heavy features.
4. **No duplicated shared concerns.** Auth, theming, caching and task orchestration live once, in the host, behind bridge interfaces.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for contract-level detail, the federation graph, and the design decisions (async boundaries, Monaco workers, cross-framework routing).

## Verification

The POC was verified end-to-end with a Playwright smoke suite (28 checks: remote mounting across three frameworks, cache dedupe, Monaco theme propagation, CSS/HTML model switching, live script-injection stripping, guard allow/deny, task persistence + toast deep-link). All checks pass against the dev servers.

> **Why Svelte and not SvelteKit?** SvelteKit is bound to Vite and SSR-oriented routing, so it cannot join an Rspack/Rsbuild Module Federation build. The `playground` remote follows this repo's architecture instead: Svelte 5 compiled by Rsbuild, federated with the same `mount` contract as the React remote.
