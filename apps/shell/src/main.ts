/**
 * Async boundary — REQUIRED by Module Federation 2.0.
 *
 * Shared singletons (@angular/*, rxjs, @teradata-pe/bridge, monaco-editor) are
 * negotiated at runtime; a dynamic import gives the federation runtime a
 * chance to resolve the share scope before any shared module executes.
 */
void import('./bootstrap');
