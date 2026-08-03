#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffoldRemote } from './scaffold';
import {
  FRAMEWORK_LABELS,
  MCP_SERVER_URL,
  type CiProvider,
  type Framework,
  type RemoteSpec,
} from './types';
import {
  isCiProvider,
  isFramework,
  toMfName,
  validatePort,
  validateRemoteName,
} from './validate';

const HELP = `
${pc.bold('create-mission-remote')} — scaffold a Mission Control micro-frontend remote

${pc.bold('Usage')}
  create-mission-remote [name] [options]

${pc.bold('Options')}
  -f, --framework <angular|react|svelte>   Framework preset
  -p, --port <number>                      Local dev-server port (e.g. 4205)
      --ci <github|gitlab>                 CI provider (default: github)
  -d, --dir <path>                         Parent directory (default: cwd)
  -y, --yes                                Skip the confirmation prompt
      --force                              Write into an existing directory
  -h, --help                               Show this help

Flags that are omitted are collected interactively. With every flag provided
plus --yes, the CLI runs fully non-interactively (CI-friendly).
`;

function bail(message: string): never {
  p.log.error(message);
  p.outro(pc.red('Aborted.'));
  process.exit(1);
}

/** Unwraps a clack prompt result, exiting cleanly on Ctrl-C. */
function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Scaffold cancelled — nothing was written.');
    process.exit(0);
  }
  return value as T;
}

async function main(): Promise<void> {
  const { values: flags, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      framework: { type: 'string', short: 'f' },
      port: { type: 'string', short: 'p' },
      ci: { type: 'string' },
      dir: { type: 'string', short: 'd' },
      yes: { type: 'boolean', short: 'y', default: false },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (flags.help) {
    console.log(HELP);
    return;
  }

  p.intro(pc.bgCyan(pc.black(' create-mission-remote ')));
  p.log.message(
    `Governance by contract, freedom by implementation.\n` +
      `Rsbuild + MF 2.0 · state via ${pc.cyan('@teradata-pe/bridge')} · agent context wired to ${pc.cyan(MCP_SERVER_URL)}`,
  );

  // ---- remoteName ---------------------------------------------------------
  let name = positionals[0]?.trim();
  if (name !== undefined) {
    const err = validateRemoteName(name);
    if (err) bail(`Invalid remote name ${pc.bold(name)}: ${err}`);
  } else {
    name = unwrap(
      await p.text({
        message: 'What is the name of the remote?',
        placeholder: 'billing',
        validate: validateRemoteName,
      }),
    ).trim();
  }

  // ---- framework ----------------------------------------------------------
  let framework: Framework;
  if (flags.framework !== undefined) {
    const raw = flags.framework.toLowerCase();
    if (!isFramework(raw)) {
      bail(`Unknown framework ${pc.bold(flags.framework)}. Use angular, react or svelte.`);
    }
    framework = raw;
  } else {
    framework = unwrap(
      await p.select<Framework>({
        message: 'Which framework will this remote use?',
        options: [
          { value: 'react', label: 'React', hint: 'exposes ./mount · @mission/rsbuild-react' },
          { value: 'angular', label: 'Angular', hint: 'exposes ./routes · @mission/rsbuild-angular' },
          { value: 'svelte', label: 'Svelte', hint: 'exposes ./mount · @mission/rsbuild-svelte' },
        ],
      }),
    );
  }

  // ---- port ---------------------------------------------------------------
  let portRaw = flags.port;
  if (portRaw !== undefined) {
    const err = validatePort(portRaw);
    if (err) bail(`Invalid port ${pc.bold(portRaw)}: ${err}`);
  } else {
    portRaw = unwrap(
      await p.text({
        message: 'Which local dev port should it run on?',
        placeholder: '4205',
        validate: validatePort,
      }),
    );
  }
  const port = Number(portRaw.trim());

  // ---- CI provider --------------------------------------------------------
  let ci: CiProvider;
  if (flags.ci !== undefined) {
    const raw = flags.ci.toLowerCase();
    if (!isCiProvider(raw)) {
      bail(`Unknown CI provider ${pc.bold(flags.ci)}. Use github or gitlab.`);
    }
    ci = raw;
  } else if (flags.yes) {
    ci = 'github';
  } else {
    ci = unwrap(
      await p.select<CiProvider>({
        message: 'Where does CI run?',
        options: [
          { value: 'github', label: 'GitHub Actions', hint: '.github/workflows/deploy.yml → central reusable workflow' },
          { value: 'gitlab', label: 'GitLab CI', hint: '.gitlab-ci.yml → central template include' },
        ],
        initialValue: 'github',
      }),
    );
  }

  const spec: RemoteSpec = { name, mfName: toMfName(name), framework, port, ci };
  const baseDir = path.resolve(flags.dir ?? process.cwd());

  // ---- confirm ------------------------------------------------------------
  p.note(
    [
      `${pc.dim('remote')}      ${spec.name}  ${spec.mfName !== spec.name ? pc.dim(`(MF container: ${spec.mfName})`) : ''}`,
      `${pc.dim('framework')}   ${FRAMEWORK_LABELS[spec.framework]}`,
      `${pc.dim('dev port')}    ${spec.port}`,
      `${pc.dim('ci')}          ${spec.ci === 'github' ? 'GitHub Actions' : 'GitLab CI'}`,
      `${pc.dim('target')}      ${path.join(baseDir, spec.name)}`,
    ].join('\n'),
    'New remote',
  );

  if (!flags.yes) {
    const ok = unwrap(await p.confirm({ message: 'Scaffold it?' }));
    if (!ok) {
      p.cancel('Scaffold cancelled — nothing was written.');
      return;
    }
  }

  // ---- scaffold -----------------------------------------------------------
  const spinner = p.spinner();
  spinner.start('Generating remote…');
  let result;
  try {
    result = await scaffoldRemote(spec, baseDir, flags.force);
  } catch (err) {
    spinner.stop(pc.red('Scaffolding failed.'));
    bail(err instanceof Error ? err.message : String(err));
  }
  spinner.stop(`Generated ${pc.bold(String(result.files.length))} files.`);

  p.note(result.files.map((f) => pc.dim(f)).join('\n'), path.relative(process.cwd(), result.targetDir) || '.');

  p.outro(
    [
      pc.green('Remote is ready.'),
      '',
      pc.bold('Next steps'),
      `  cd ${path.relative(process.cwd(), result.targetDir) || '.'}`,
      '  pnpm install',
      `  pnpm dev            ${pc.dim(`# http://localhost:${spec.port} (standalone, local dev bridge)`)}`,
      '',
      `${pc.dim('Register it in the shell:')} remotes → '${spec.mfName}@http://localhost:${spec.port}/mf-manifest.json'`,
      `${pc.dim('AI agents:')} CLAUDE.md / .cursorrules are wired to ${MCP_SERVER_URL}`,
    ].join('\n'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
