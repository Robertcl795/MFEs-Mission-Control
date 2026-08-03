import type { RemoteSpec } from '../types';
import { claudeMd, cursorRules } from './agent-rules';
import { frameworkFiles, type FileMap } from './boilerplate';
import { ciFile } from './ci';
import { packageJson } from './package-json';
import { gitignore, remoteReadme, tsconfig } from './meta';
import { rsbuildConfig } from './rsbuild-config';

/** Assemble every file of the new remote, keyed by path relative to its root. */
export function buildFileMap(spec: RemoteSpec): FileMap {
  const ci = ciFile(spec);

  return {
    'package.json': packageJson(spec),
    'rsbuild.config.ts': rsbuildConfig(spec),
    'tsconfig.json': tsconfig(spec),
    // Agentic scaffolding: architectural law for local AI agents.
    '.cursorrules': cursorRules(spec),
    'CLAUDE.md': claudeMd(spec),
    [ci.path]: ci.contents,
    ...frameworkFiles(spec),
    '.gitignore': gitignore(),
    'README.md': remoteReadme(spec),
  };
}

export type { FileMap };
