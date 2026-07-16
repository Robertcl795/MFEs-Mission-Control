/**
 * Starter documents for the design canvas. They lean on @mission/tokens
 * custom properties on purpose: CSS variables pierce the canvas shadow
 * boundary, so the preview re-skins itself when the shell flips the theme.
 */
export const DEFAULT_HTML = `<section class="hero" id="hero">
  <h1>Meridian &mdash; mission brief</h1>
  <p>
    Edit this document and <strong>styles.css</strong> in the Monaco editor.
    Every keystroke is sanitized (DOMPurify + a CSS filter) and re-rendered
    into this canvas. Try adding a &lt;script&gt; tag &mdash; it will be
    stripped and counted below the canvas.
  </p>
  <button class="cta">Request docking</button>
</section>
`;

export const DEFAULT_CSS = `.hero {
  font-family: var(--mc-font-body, sans-serif);
  background: var(--mc-surface-raised);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
  color: var(--mc-text);
  padding: 24px;
}

.hero h1 {
  color: var(--mc-primary);
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.hero p {
  color: var(--mc-text-muted);
  line-height: 1.5;
}

.cta {
  background: var(--mc-primary);
  color: var(--mc-primary-contrast);
  border: 0;
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
}

/* Styling for the "Insert fleet table" demo (shared DataCache) */
.fleet {
  border-collapse: collapse;
  font-family: var(--mc-font-mono, monospace);
  font-size: 0.85rem;
  margin-top: 16px;
  width: 100%;
}

.fleet th,
.fleet td {
  border-bottom: 1px solid var(--mc-border);
  color: var(--mc-text);
  padding: 6px 10px;
  text-align: left;
}

.status-critical { color: #f87171; }
.status-degraded { color: #fbbf24; }
.status-nominal { color: #4ade80; }
`;
