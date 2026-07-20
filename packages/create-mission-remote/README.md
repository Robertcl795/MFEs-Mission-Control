# create-mission-remote

Scaffolding CLI for Mission Control micro-frontend remotes. One command turns
the platform's "Governance by Contract, Freedom by Implementation" model into
a running repo:

- **Rsbuild + Module Federation 2.0** via the platform preset
  (`@mission/rsbuild-angular` / `-react` / `-svelte`) — the remote's config
  declares only `name`, `port` and `exposes`; the shared singleton map, CORS,
  assetPrefix and `mf-manifest.json` emission are platform-owned.
- **`@mission/bridge` wiring** — boilerplate that consumes the ThemeChannel
  through the framework's *native* adapter (`useSyncExternalStore`, Svelte
  runes, Angular signals) and installs a local dev bridge for standalone dev.
- **Agentic scaffolding** — `.cursorrules` + `CLAUDE.md` telling local AI
  agents the architectural law (bridge-only global state, DOMPurify for raw
  HTML, MF 2.0 boundaries) and pointing them at the central MCP server
  (`ws://mcp.mission.local`).
- **Centralised CI** — a `deploy.yml` (or `.gitlab-ci.yml`) that only extends
  `mission-control-org/platform-tooling`'s reusable pipeline.

## Usage

```bash
# interactive
pnpm create mission-remote

# non-interactive (CI-friendly)
create-mission-remote billing --framework react --port 4205 --ci github --yes
```

| Flag | Meaning |
| --- | --- |
| `[name]` | Remote name, kebab-case (`billing`, `fleet-ops`) |
| `-f, --framework` | `angular` \| `react` \| `svelte` |
| `-p, --port` | Dev-server port (1024–65535; 4200 is reserved for the shell) |
| `--ci` | `github` (default) \| `gitlab` |
| `-d, --dir` | Parent directory (default: cwd) |
| `-y, --yes` | Skip confirmation |
| `--force` | Write into an existing non-empty directory |

## What gets generated

```
<name>/
├── package.json              # @mission/bridge + framework deps + platform preset
├── rsbuild.config.ts         # createMissionRemote({ name, port, exposes })
├── tsconfig.json
├── .cursorrules              # AI agent contract (framework-specific)
├── CLAUDE.md                 # same body — Claude Code entry point
├── .github/workflows/deploy.yml  (or .gitlab-ci.yml)
├── README.md
├── .gitignore
└── src/
    ├── index.ts              # MF 2.0 async boundary (mandatory)
    ├── bootstrap.*           # standalone dev bridge + mount
    ├── mount.* / app/routes.ts   # the federation surface
    └── App.* / app/app.component.ts  # theme demo via @mission/bridge
```

Dashes in the remote name are preserved for the folder/package but converted
to underscores for the MF container name (`fleet-ops` → `fleet_ops`) — MF 2.0
containers land on `globalThis` and must be valid identifiers.

## Development

```bash
pnpm --filter create-mission-remote build      # tsup → dist/index.js
pnpm --filter create-mission-remote typecheck
node packages/create-mission-remote/dist/index.js demo -f svelte -p 4207 -y -d /tmp
```
