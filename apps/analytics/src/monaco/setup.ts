/**
 * Native Rspack worker wiring for Monaco — no custom webpack plugins.
 * `new Worker(new URL(..., import.meta.url))` is statically analysed by
 * Rspack and emitted as a first-class worker chunk on THIS remote's origin,
 * while the `monaco-editor` module itself stays a federated singleton.
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
