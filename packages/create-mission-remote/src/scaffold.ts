import path from 'node:path';
import fs from 'fs-extra';
import { buildFileMap } from './templates/index';
import type { RemoteSpec } from './types';

export interface ScaffoldResult {
  targetDir: string;
  files: string[];
}

/**
 * Write the remote to `<cwd>/<name>` (or `<dir>/<name>`). Refuses to touch a
 * non-empty directory unless `force` is set — scaffolding is additive, never
 * destructive.
 */
export async function scaffoldRemote(
  spec: RemoteSpec,
  baseDir: string,
  force = false,
): Promise<ScaffoldResult> {
  const targetDir = path.resolve(baseDir, spec.name);

  if (await fs.pathExists(targetDir)) {
    const existing = await fs.readdir(targetDir);
    if (existing.length > 0 && !force) {
      throw new Error(
        `Directory ${targetDir} already exists and is not empty. ` +
          'Pick another name or re-run with --force to write into it.',
      );
    }
  }

  const files = buildFileMap(spec);
  for (const [relPath, contents] of Object.entries(files)) {
    await fs.outputFile(path.join(targetDir, relPath), contents, 'utf8');
  }

  return { targetDir, files: Object.keys(files) };
}
