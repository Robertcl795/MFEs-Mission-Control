/**
 * Native Rspack worker wiring for Monaco (no custom webpack plugins).
 * The JSON worker powers validation/folding in the report viewers; the
 * base editor worker covers everything else. Workers are emitted on THIS
 * remote's origin while `monaco-editor` itself stays a federated singleton
 * shared with the React `analytics` remote.
 */
import type { Environment } from 'monaco-editor';

let installed = false;

export function setupMonacoWorkers(): void {
  if (installed) return;
  installed = true;
  const environment: Environment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === 'json') {
        return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url));
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url));
    },
  };
  self.MonacoEnvironment = environment;
}
