import type { Environment } from 'monaco-editor';

/**
 * Native Rspack worker wiring for Monaco (no custom webpack plugins).
 * This remote edits CSS and HTML, so it ships their language workers in
 * addition to the base editor worker — all emitted on THIS remote's origin,
 * while `monaco-editor` itself stays the federation-wide singleton.
 */
let installed = false;

export function setupMonacoWorkers(): void {
  if (installed) return;
  installed = true;
  const environment: Environment = {
    getWorker(_workerId: string, label: string): Worker {
      switch (label) {
        case 'css':
        case 'scss':
        case 'less':
          return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url));
        case 'html':
        case 'handlebars':
        case 'razor':
          return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url));
        case 'json':
          return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url));
        default:
          return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url));
      }
    },
  };
  self.MonacoEnvironment = environment;
}
