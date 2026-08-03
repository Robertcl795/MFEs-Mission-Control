/**
 * Async boundary — REQUIRED by Module Federation 2.0 so shared singletons
 * (svelte, @teradata-pe/bridge, monaco-editor) resolve before app code runs.
 * Only used for standalone dev; the shell consumes './mount'.
 */
void import('./bootstrap');
