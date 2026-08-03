/**
 * Starter documents for the design canvas — written as a BEM showcase in
 * VANILLA CSS (the remote's own chrome shows the SCSS flavour in
 * styles.scss). The CSS comments below are visible in Monaco, where the
 * learning happens, and cost nothing at render time: sanitizeCss strips
 * comments before injection without touching the "unsafe pattern" counter.
 * The HTML document deliberately has no comments — DOMPurify removes HTML
 * comments and each removal would inflate that same counter.
 *
 * The documents lean on @mission/tokens custom properties on purpose: CSS
 * variables pierce the canvas shadow boundary, so the preview re-skins
 * itself when the shell flips the theme.
 */
export const DEFAULT_HTML = `<section class="brief brief--featured" id="brief">
  <h1 class="brief__title">Meridian &mdash; mission brief</h1>
  <p class="brief__body">
    This document is written in BEM &mdash; every class is
    <strong>block__element--modifier</strong>. Edit it and
    <strong>styles.css</strong> in the Monaco editor: every keystroke is
    sanitized (DOMPurify + a CSS filter) and re-rendered here. Try removing
    <strong>brief--featured</strong> from the section tag, or adding a
    &lt;script&gt; tag &mdash; it will be stripped and counted below.
  </p>
  <div class="brief__actions">
    <button class="brief__cta">Request docking</button>
    <button class="brief__cta brief__cta--ghost">Hold position</button>
  </div>
</section>
`;

export const DEFAULT_CSS = `/* BEM in vanilla CSS — no preprocessor required.
   Anatomy:  .block   .block__element   .block--modifier

   Every selector here is a single class, so specificity is a flat
   (0,1,0) for the whole sheet: no !important, no specificity wars,
   source order decides ties. */

/* BLOCK: a standalone, reusable component. */
.brief {
  font-family: var(--mc-font-body, sans-serif);
  background: var(--mc-surface-raised);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
  color: var(--mc-text);
  padding: 24px;
}

/* BLOCK MODIFIER: additive variant. The markup keeps BOTH classes
   ("brief brief--featured"), so this rule stores only the delta.
   Delete the modifier from the HTML and watch the accent vanish. */
.brief--featured {
  border-color: var(--mc-primary);
  box-shadow: 0 0 0 3px var(--mc-primary-soft, transparent);
}

/* ELEMENTS: parts that only make sense inside .brief. Note there are
   no descendant selectors like ".brief h1" — the double underscore
   already encodes ownership, without coupling styles to tag nesting. */
.brief__title {
  color: var(--mc-primary);
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.brief__body {
  color: var(--mc-text-muted);
  line-height: 1.5;
}

.brief__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.brief__cta {
  background: var(--mc-primary);
  color: var(--mc-primary-contrast);
  border: 0;
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
}

/* ELEMENT MODIFIER: a variant of one element
   ("brief__cta brief__cta--ghost" in the markup). */
.brief__cta--ghost {
  background: transparent;
  border: 1px solid var(--mc-primary);
  color: var(--mc-primary);
}

/* Second block — styles for the "Insert fleet table" demo (shared
   SharedDataCache). Same grammar; blocks never reference each other. */
.fleet-table {
  border-collapse: collapse;
  font-family: var(--mc-font-mono, monospace);
  font-size: 0.85rem;
  margin-top: 16px;
  width: 100%;
}

.fleet-table__cell {
  border-bottom: 1px solid var(--mc-border);
  color: var(--mc-text);
  padding: 6px 10px;
  text-align: left;
}

/* ELEMENT MODIFIERS carry the row status — compare with the pre-BEM
   version's orphan ".status-critical" classes, which nothing tied back
   to the table they styled. */
.fleet-table__cell--head {
  color: var(--mc-text-muted);
}

.fleet-table__cell--critical { color: #f87171; }
.fleet-table__cell--degraded { color: #fbbf24; }
.fleet-table__cell--nominal { color: #4ade80; }
`;
