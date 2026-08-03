#!/usr/bin/env node
/**
 * Polyrepo orchestrator. Reads `workspace.repos.json` and nothing else.
 *
 * The design constraint that produced this file: a developer must be able to
 * clone ONE remote and work on it with no knowledge that this workspace
 * exists. That rules out submodules (the member would carry a parent SHA it
 * has no business knowing) and subtrees (the member's history stops being its
 * own). A manifest keeps the dependency pointing one way — the umbrella knows
 * the members, the members never know the umbrella.
 *
 * Usage:
 *   node scripts/ws.mjs clone [name...]   clone members (all, or the named)
 *   node scripts/ws.mjs adopt <dir>       symlink members already on disk
 *   node scripts/ws.mjs status            branch + dirty count per member
 *   node scripts/ws.mjs run <cmd...>      run a command in every member
 *   node scripts/ws.mjs doctor            what is present, missing, unlinked
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(ROOT, 'workspace.repos.json'), 'utf8'),
);
const CHECKOUT = join(ROOT, manifest.checkoutDir);

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const pathOf = (repo) => join(CHECKOUT, repo.name);
const present = (repo) => existsSync(join(pathOf(repo), '.git'));

function urlOf(repo) {
  if (repo.url) return repo.url;
  if (repo.local) return null;
  return `${manifest.defaultOrg}/${repo.name}.git`;
}

function select(names) {
  if (names.length === 0) return manifest.repos;
  const byName = new Map(manifest.repos.map((r) => [r.name, r]));
  return names.map((n) => {
    const r = byName.get(n);
    if (!r) {
      console.error(C.red(`unknown repo: ${n}`));
      console.error(`known: ${manifest.repos.map((x) => x.name).join(', ')}`);
      process.exit(1);
    }
    return r;
  });
}

function cmdClone(names) {
  let cloned = 0;
  let skipped = 0;
  for (const repo of select(names)) {
    const dest = pathOf(repo);
    if (present(repo)) {
      console.log(`  ${C.dim('present')}  ${repo.name}`);
      skipped += 1;
      continue;
    }
    const url = urlOf(repo);
    if (!url) {
      // A local-only member is not an error: the demo fixtures are generated
      // by the scaffolder and have never been published anywhere.
      console.log(
        `  ${C.yellow('local')}    ${repo.name}  ${C.dim(repo.reason ?? '')}`,
      );
      skipped += 1;
      continue;
    }
    console.log(`  ${C.green('clone')}    ${repo.name}  ${C.dim(url)}`);
    const res = spawnSync('git', ['clone', url, dest], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error(C.red(`  failed: ${repo.name}`));
      process.exitCode = 1;
      continue;
    }
    cloned += 1;
  }
  console.log(`\n${cloned} cloned, ${skipped} skipped`);
}

function cmdAdopt(args) {
  const [source] = args;
  if (!source) {
    console.error('usage: ws.mjs adopt <dir-containing-the-repos>');
    process.exit(1);
  }
  const from = resolve(process.cwd(), source);
  mkdirSync(CHECKOUT, { recursive: true });
  let linked = 0;
  for (const repo of manifest.repos) {
    const target = join(from, repo.name);
    if (present(repo)) {
      console.log(`  ${C.dim('present')}  ${repo.name}`);
      continue;
    }
    if (!existsSync(join(target, '.git'))) {
      console.log(`  ${C.dim('not found')} ${repo.name}`);
      continue;
    }
    symlinkSync(target, pathOf(repo), 'dir');
    console.log(`  ${C.green('linked')}   ${repo.name} -> ${C.dim(target)}`);
    linked += 1;
  }
  console.log(`\n${linked} linked`);
}

function cmdStatus() {
  for (const repo of manifest.repos) {
    if (!present(repo)) {
      console.log(`  ${C.dim('absent')}   ${repo.name}`);
      continue;
    }
    const at = pathOf(repo);
    const branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: at,
      encoding: 'utf8',
    }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], {
      cwd: at,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean).length;
    const mark = dirty ? C.yellow(`${dirty} dirty`) : C.green('clean');
    console.log(`  ${repo.name.padEnd(24)} ${branch.padEnd(12)} ${mark}`);
  }
}

function cmdRun(argv) {
  if (argv.length === 0) {
    console.error('usage: ws.mjs run <command...>');
    process.exit(1);
  }
  let failed = 0;
  for (const repo of manifest.repos) {
    if (!present(repo)) continue;
    console.log(C.bold(`\n== ${repo.name}`));
    const res = spawnSync(argv[0], argv.slice(1), {
      cwd: pathOf(repo),
      stdio: 'inherit',
      shell: false,
    });
    if (res.status !== 0) failed += 1;
  }
  if (failed) {
    console.error(C.red(`\n${failed} repo(s) failed`));
    process.exitCode = 1;
  }
}

function cmdDoctor() {
  const missing = manifest.repos.filter((r) => !present(r));
  const local = manifest.repos.filter((r) => r.local);
  console.log(`\nmembers   ${manifest.repos.length}`);
  console.log(`present   ${manifest.repos.length - missing.length}`);
  console.log(`absent    ${missing.length}`);
  if (missing.length) {
    console.log(C.dim(`          ${missing.map((r) => r.name).join(', ')}`));
  }
  console.log(
    `local-only ${local.length} ${C.dim('(no remote — cannot be cloned)')}`,
  );
  for (const r of local) {
    console.log(C.dim(`          ${r.name}: ${r.reason ?? 'no reason given'}`));
  }
  if (local.length) {
    console.log(
      C.yellow(
        '\nlocal-only members are the reason this is a manifest and not a\n' +
          'submodule tree: a submodule needs a URL, and these have none.',
      ),
    );
  }
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'clone':
    cmdClone(rest);
    break;
  case 'adopt':
    cmdAdopt(rest);
    break;
  case 'status':
    cmdStatus();
    break;
  case 'run':
    cmdRun(rest);
    break;
  case 'doctor':
    cmdDoctor();
    break;
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n')
      .slice(1, 20)
      .map((l) => l.replace(/^ \* ?/, '').replace(/^\/\*\*?/, ''))
      .join('\n'));
    process.exit(cmd ? 1 : 0);
}
