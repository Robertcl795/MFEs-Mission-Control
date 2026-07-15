import DOMPurify from 'dompurify';

/**
 * Sanitization boundary for the design canvas. Everything typed into the
 * editor is UNTRUSTED — it must pass through here before touching the DOM.
 *
 * - HTML: DOMPurify strips scripts, event handlers, dangerous URLs and the
 *   tags below. `<style>` is forbidden in the HTML document because styles
 *   belong to the CSS file (which gets its own pass).
 * - CSS: conservative POC-grade filter — kills comment-obfuscation,
 *   @import (exfiltration/injection vector), IE expressions/behaviors and
 *   javascript: URLs. A production system would run a real CSS parser.
 */
export interface SanitizeResult {
  safe: string;
  /** Number of nodes/attributes/patterns stripped. */
  removed: number;
}

export function sanitizeHtml(html: string): SanitizeResult {
  const safe = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true },
    FORBID_TAGS: ['style', 'link', 'iframe', 'object', 'embed', 'form', 'base', 'meta'],
    FORBID_ATTR: ['srcset'],
  });
  return { safe, removed: DOMPurify.removed.length };
}

const CSS_BLOCKLIST: RegExp[] = [
  /@import[^;]*;?/gi,
  /expression\s*\(/gi,
  /behavior\s*:/gi,
  /-moz-binding\s*:/gi,
  /url\(\s*['"]?\s*javascript:[^)]*\)/gi,
  /<\/?style[^>]*>/gi,
];

export function sanitizeCss(css: string): SanitizeResult {
  let removed = 0;
  // Strip comments first so `@im/**/port` tricks don't slip through.
  let safe = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const pattern of CSS_BLOCKLIST) {
    safe = safe.replace(pattern, () => {
      removed += 1;
      return '';
    });
  }
  return { safe, removed };
}
