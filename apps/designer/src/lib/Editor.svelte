<script>
  import { onDestroy, onMount } from 'svelte';
  import * as monaco from 'monaco-editor';
  import { getBridge } from '@mission/bridge';
  import { setupMonacoWorkers } from '../monaco-setup';

  /**
   * ONE Monaco instance, TWO models (html + css). Switching the active file
   * swaps the model, which is what flips syntax highlighting, validation
   * worker and undo stack in a single call. `monaco-editor` itself is the
   * federation-wide singleton, themed globally via the bridge ThemeChannel.
   */
  let { html = '', css = '', active = 'html', onchange } = $props();

  let host;
  let editor = null;
  const models = {};
  let offTheme;

  onMount(() => {
    setupMonacoWorkers();
    const { theme } = getBridge();

    models.html = monaco.editor.createModel(html, 'html');
    models.css = monaco.editor.createModel(css, 'css');
    for (const [name, model] of Object.entries(models)) {
      model.onDidChangeContent(() => onchange?.(name, model.getValue()));
    }

    editor = monaco.editor.create(host, {
      model: models[active] ?? models.html,
      theme: theme.current === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 13,
      scrollBeyondLastLine: false,
      padding: { top: 8 },
    });

    offTheme = theme.subscribe((next) => {
      monaco.editor.setTheme(next === 'dark' ? 'vs-dark' : 'vs');
    });
  });

  onDestroy(() => {
    offTheme?.();
    editor?.dispose();
    Object.values(models).forEach((model) => model.dispose());
  });

  // Active file changed → swap models (syntax highlighting follows).
  $effect(() => {
    const model = models[active];
    if (editor && model && editor.getModel() !== model) {
      editor.setModel(model);
    }
  });

  // External content updates (fleet insert, reset). The equality guard
  // breaks the loop with the onDidChangeContent → onchange round-trip.
  $effect(() => {
    if (models.html && models.html.getValue() !== html) models.html.setValue(html);
  });
  $effect(() => {
    if (models.css && models.css.getValue() !== css) models.css.setValue(css);
  });
</script>

<div class="dsg-monaco" bind:this={host} data-testid="designer-editor"></div>

<style>
  .dsg-monaco {
    border: 1px solid var(--mc-border);
    border-radius: var(--mc-radius-sm);
    height: 420px;
    overflow: hidden;
  }
</style>
