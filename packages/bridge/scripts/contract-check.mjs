#!/usr/bin/env node
/**
 * contract-check — API-diff of the bridge's public surface (backlog A2, G3).
 *
 * The public contract is the set of .d.ts declaration lines the package
 * ships. This script normalizes them into one sorted "surface" document and
 * compares it against the committed baseline (etc/api-baseline.txt):
 *
 *   - lines REMOVED from the baseline  → BREAKING → exit 1
 *   - lines added                      → additive → reported, exit 0
 *
 * Renames (e.g. an event key in BridgeEventMap) show up as removal+addition,
 * so they fail the check — exactly the E2 class of silent break.
 *
 *   node scripts/contract-check.mjs            # check against baseline
 *   node scripts/contract-check.mjs --update   # (re)write the baseline
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(pkgRoot, 'dist');
const baselineFile = join(pkgRoot, 'etc', 'api-baseline.txt');

// Always diff against a fresh compilation of src/
execSync('npx tsc -p tsconfig.json', { cwd: pkgRoot, stdio: 'inherit' });

function collectDts(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...collectDts(p));
    else if (name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** One normalized line per declaration statement, prefixed with its module. */
function surface() {
  const lines = [];
  for (const file of collectDts(distDir).sort()) {
    const mod = relative(distDir, file).replace(/\.d\.ts$/, '');
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*\*[\s\S]*?\*\//g, '') // strip doc comments
      .replace(/\/\/.*$/gm, '');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (line) lines.push(`${mod} :: ${line}`);
    }
  }
  return lines.sort();
}

const current = surface();

if (process.argv.includes('--update')) {
  mkdirSync(dirname(baselineFile), { recursive: true });
  writeFileSync(baselineFile, `${current.join('\n')}\n`);
  console.log(`baseline written: ${relative(pkgRoot, baselineFile)} (${current.length} declarations)`);
  process.exit(0);
}

if (!existsSync(baselineFile)) {
  console.error('No baseline found. Run: node scripts/contract-check.mjs --update');
  process.exit(2);
}

const baseline = readFileSync(baselineFile, 'utf8').split('\n').filter(Boolean);
const baseSet = new Set(baseline);
const currSet = new Set(current);
const removed = baseline.filter((l) => !currSet.has(l));
const added = current.filter((l) => !baseSet.has(l));

for (const l of removed) console.log(`BREAKING  - ${l}`);
for (const l of added) console.log(`additive  + ${l}`);

if (removed.length > 0) {
  console.error(`\ncontract-check: ${removed.length} BREAKING change(s) vs baseline — bump MAJOR + update baseline, or revert.`);
  process.exit(1);
}
console.log(`contract-check: OK (${added.length} additive, 0 breaking, ${current.length} declarations)`);
