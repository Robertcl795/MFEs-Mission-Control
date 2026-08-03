/**
 * Async boundary — REQUIRED by Module Federation 2.0 so shared singletons
 * (react, @teradata-pe/bridge, monaco-editor) resolve before app code runs.
 */
void import('./bootstrap');
