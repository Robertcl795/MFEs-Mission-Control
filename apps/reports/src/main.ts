/**
 * Async boundary — REQUIRED by Module Federation 2.0 so shared singletons
 * (@angular/*, rxjs, @teradata-pe/bridge, monaco-editor) resolve before app
 * code runs. Only used for standalone dev; the shell consumes './routes'.
 */
void import('./bootstrap');
