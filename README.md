# MFEs Platform POC — polyrepo workspace

This repo holds **no application source**. It is an umbrella: a manifest of
independently owned repositories, plus enough tooling to check them out and
operate on them as a set.

The original Mission Control POC that used to live here — four apps and a
bridge package in one pnpm monorepo — is preserved under [`legacy/`](legacy/).
Its bridge is the direct ancestor of `up-ui-bridge`, and it is still the only
place where cross-remote task tracking, global state and cross-remote routing
were ever implemented. See [`NEXT_STEPS.md`](../up-platform-poc/NEXT_STEPS.md).

## The one rule

**A member repo never knows this workspace exists.** You can clone
`up-ui-shell` on its own, run its tests, and ship it, with no awareness of the
umbrella. The dependency points one way only: the manifest knows the members;
the members know nothing.

That rule is what rules out the obvious alternatives. Submodules would push a
parent SHA down into every member. Subtrees would end each member's history at
the vendoring commit. Both invert the arrow.

## Layout

Members are checked out into their group directory, at the root:

```
platform/    the contract, the tooling, the templates — what other teams consume
demo/        the host shell and the remotes it composes — what gets demonstrated
legacy/      the original Mission Control monorepo, preserved
```

There is no `repos/` level above the groups. It would be a directory that
separates nothing from nothing; the grouping already carries the information.
Both group directories are gitignored — the umbrella tracks the manifest,
never the members.

`up-ui-shell` sits under `demo/` despite its `up-ui-` prefix. It is the
application being demonstrated, not something another team installs.

## Quick start

```bash
# everything
node scripts/ws.mjs clone
node scripts/ws.mjs status

# already have the repos on disk? link them instead of re-cloning
node scripts/ws.mjs adopt ../up-platform-poc

# one repo, standalone — no workspace involved at all
git clone https://github.com/Teradata-PE/up-ui-shell.git
cd up-ui-shell && pnpm install && pnpm test
```

Open [`up-platform-poc.code-workspace`](up-platform-poc.code-workspace)
for the multi-root editor view. VS Code shows **one source-control panel per
member**, which is deliberate: there is no such thing as committing "to the
workspace".

## Commands

| Command | What it does |
| --- | --- |
| `ws.mjs clone [name...]` | Clone members. Local-only members are reported, not failed |
| `ws.mjs adopt <dir>` | Symlink members that already exist on disk |
| `ws.mjs status` | Branch and dirty count per member |
| `ws.mjs run <cmd...>` | Run one command in every present member |
| `ws.mjs doctor` | Present / absent / local-only, with reasons |

## Members

Defined in [`workspace.repos.json`](workspace.repos.json). Roles:

| Group | Role | Repos | Note |
| --- | --- | --- | --- |
| platform | contract | `up-ui-bridge` | Depends on nothing. Everything depends on it |
| platform | tooling | `up-ui-seal-cli` | Scaffolder, standards engine, drift report |
| platform | template | `up-ui-{react,angular,svelte}-template` | Scaffolder inputs |
| demo | host | `up-ui-shell` | The Angular zoneless shell — the app in the demo |
| demo | remote | `demo-remote-*` | Generated fixtures, ports 4201–4207 |

**Six of the eleven members have no remote.** Five are scaffolder-generated
demo fixtures that were never meant to be published; one is `up-ui-bridge`,
which is blocked on INC-016 (target org unresolved). `ws.mjs doctor` prints
this rather than hiding it, because it is the concrete reason this is a
manifest and not a submodule tree — a submodule needs a URL and these have
none.

## The remote still says Mission Control

`origin` is `github.com/Robertcl795/MFEs-Mission-Control.git`. The local
directory was renamed; the GitHub repository was not, because renaming a shared
remote breaks `origin` for every existing clone. Rename it deliberately, or
clone into an explicit directory:

```bash
git clone git@github.com:Robertcl795/MFEs-Mission-Control.git MFEs-Platform-POC
```

## Running the demo

The demo stack is driven from `platform-poc`, not from here:

```bash
pnpm demo        # make -C ../platform-poc run
pnpm demo:down
```
