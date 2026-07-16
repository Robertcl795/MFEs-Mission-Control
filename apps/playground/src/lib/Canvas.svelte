<script>
  import { sanitizeCss, sanitizeHtml } from './sanitize';

  /**
   * The render surface. Untrusted editor content is sanitized and injected
   * into a shadow root: DOMPurify guards the markup, the CSS filter guards
   * the stylesheet, and the shadow boundary keeps canvas styles from
   * leaking into the shell. @mission/tokens custom properties DO pierce the
   * boundary — by design — so the preview follows the global theme.
   */
  let { html = '', css = '' } = $props();

  let host;
  let shadow = null;
  let stripped = $state(0);

  $effect(() => {
    if (!host) return;
    shadow ??= host.attachShadow({ mode: 'open' });
    const safeHtml = sanitizeHtml(html);
    const safeCss = sanitizeCss(css);
    stripped = safeHtml.removed + safeCss.removed;
    // Markup first, then a real style element (textContent, never string
    // splicing) so the sanitized CSS cannot re-open markup context.
    shadow.innerHTML = safeHtml.safe;
    const styleEl = document.createElement('style');
    styleEl.textContent = safeCss.safe;
    shadow.prepend(styleEl);
  });
</script>

<div class="pg-canvas" bind:this={host} data-testid="playground-canvas"></div>
<p class="pg-canvas-note" data-testid="sanitize-note">
  sanitizer: <strong>{stripped}</strong> unsafe pattern(s) stripped from the current documents
</p>

<style>
  .pg-canvas {
    background: var(--mc-bg);
    border: 1px dashed var(--mc-border);
    border-radius: var(--mc-radius-md);
    min-height: 420px;
    padding: var(--mc-space-4);
  }

  .pg-canvas-note {
    color: var(--mc-text-muted);
    font-size: 0.8rem;
    margin: var(--mc-space-2) 0 0;
  }
</style>
