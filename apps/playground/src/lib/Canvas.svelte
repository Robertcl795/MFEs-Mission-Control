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

<!-- BEM block `pg-canvas`: `__frame` hosts the shadow root, `__note` is the
     sanitizer counter. The `--alert` ELEMENT MODIFIER is bound to component
     state — when the sanitizer strips something, the state change reads as
     vocabulary (`pg-canvas__note--alert`) instead of an inline style.
     Styles live in styles.scss; BEM's namespacing replaces scoped <style>. -->
<div class="pg-canvas">
  <div class="pg-canvas__frame" bind:this={host} data-testid="playground-canvas"></div>
  <p class="pg-canvas__note" class:pg-canvas__note--alert={stripped > 0} data-testid="sanitize-note">
    sanitizer: <strong>{stripped}</strong> unsafe pattern(s) stripped from the current documents
  </p>
</div>
