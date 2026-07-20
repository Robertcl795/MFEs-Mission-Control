<script>
  import { evaluateRoute, getBridge, requirePermission } from '@mission/bridge';
  import Editor from './lib/Editor.svelte';
  import Canvas from './lib/Canvas.svelte';
  import { DEFAULT_CSS, DEFAULT_HTML } from './lib/defaults';
  import { fleetTableHtml, isFleetDataCached, loadFleetData } from './lib/fleet';

  /**
   * Playground remote root (Svelte 5). House rules apply:
   *  - session/theme/cache come from the bridge, never local state;
   *  - gating uses the SAME shared validators as the Angular and React remotes;
   *  - document state persists in the shared DataCache, so it survives
   *    navigating away to another remote and back.
   */
  const bridge = getBridge();
  const FILES_KEY = 'playground:files';
  const VALIDATOR = requirePermission('playground:edit');

  const persisted = bridge.cache.peek(FILES_KEY);
  let files = $state({
    html: persisted?.html ?? DEFAULT_HTML,
    css: persisted?.css ?? DEFAULT_CSS,
  });
  let active = $state('html');
  let user = $state(bridge.session.user);
  let decision = $state(evaluateRoute(VALIDATOR, bridge.session, '/playground'));
  let inserting = $state(false);

  $effect(() => {
    return bridge.session.subscribe((next) => {
      user = next;
      decision = evaluateRoute(VALIDATOR, bridge.session, '/playground');
    });
  });

  let persistTimer;
  function onFileChange(name, value) {
    files = { ...files, [name]: value };
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => bridge.cache.set(FILES_KEY, { ...files }), 400);
  }

  async function insertFleetTable() {
    inserting = true;
    try {
      const fromCache = isFleetDataCached();
      const rows = await loadFleetData();
      files = { ...files, html: `${files.html}\n${fleetTableHtml(rows)}\n` };
      bridge.cache.set(FILES_KEY, { ...files });
      bridge.bus.emit('toast:show', {
        intent: 'info',
        title: 'Fleet table inserted into the canvas',
        message: fromCache
          ? 'Dataset served from the shared DataCache — no network request'
          : 'Dataset fetched once — now cached for every remote',
        durationMs: 5000,
      });
    } finally {
      inserting = false;
    }
  }

  function resetFiles() {
    files = { html: DEFAULT_HTML, css: DEFAULT_CSS };
    bridge.cache.set(FILES_KEY, { ...files });
  }
</script>

<!-- BEM SHOWCASE — every class below follows `block__element--modifier`
     with a `pg-` namespace: in a federation all remotes share one document,
     so the block prefix is what makes collisions impossible by convention.
     The matching sheet is src/styles.scss (SCSS flavour); the canvas's
     default documents (lib/defaults.ts) show the same grammar in vanilla
     CSS, editable live in Monaco. -->
<div class="pg-playground" data-testid="playground-root">
  <header class="pg-playground__header">
    <div>
      <!-- ELEMENTS, not descendant selectors: `__title`/`__subtitle` opt in
           by name, so no future h1/p nested in here inherits styles by
           accident. -->
      <h1 class="pg-playground__title">Playground</h1>
      <p class="pg-playground__subtitle">Svelte 5 remote · signed in as {user?.name ?? 'anonymous'}</p>
    </div>
    <div class="pg-playground__actions">
      <button class="pg-btn" onclick={resetFiles}>Reset files</button>
      <!-- MODIFIERS are additive: base block + `--primary` variant, plus the
           `--busy` STATE modifier bound to component state — the DOM reads
           "a pg-btn, primary variant, currently busy". -->
      <button
        class="pg-btn pg-btn--primary"
        class:pg-btn--busy={inserting}
        onclick={insertFleetTable}
        disabled={inserting}
        data-testid="insert-fleet"
      >
        {inserting ? 'Loading…' : 'Insert fleet table (shared cache)'}
      </button>
    </div>
  </header>

  {#if decision.allowed}
    <div class="pg-playground__sections">
      <!-- BEM MIX: one node, two blocks' classes. `pg-card` brings the
           reusable skin; `pg-playground__section` brings the grid-child
           behaviour. Neither block knows the other exists — that's what
           keeps pg-card portable. -->
      <section class="pg-card pg-playground__section">
        <div class="pg-card__head">
          <h2 class="pg-card__title">Editor</h2>
          <nav class="pg-file-tabs" aria-label="Files">
            <!-- ELEMENT MODIFIER: `pg-file-tabs__tab--active` — component,
                 part and state, all in the class name. -->
            <button
              class="pg-file-tabs__tab"
              class:pg-file-tabs__tab--active={active === 'html'}
              onclick={() => (active = 'html')}
              data-testid="file-tab-html"
            >
              index.html
            </button>
            <button
              class="pg-file-tabs__tab"
              class:pg-file-tabs__tab--active={active === 'css'}
              onclick={() => (active = 'css')}
              data-testid="file-tab-css"
            >
              styles.css
            </button>
          </nav>
          <!-- Data-driven modifier: `--html` / `--css` interpolated straight
               from state — modifiers as a closed vocabulary of variants. -->
          <span class="pg-lang-badge pg-lang-badge--{active}" data-testid="editor-lang">{active === 'html' ? 'HTML' : 'CSS'}</span>
        </div>
        <Editor html={files.html} css={files.css} {active} onchange={onFileChange} />
      </section>

      <section class="pg-card pg-playground__section">
        <div class="pg-card__head">
          <h2 class="pg-card__title">Canvas</h2>
          <span class="pg-card__hint">sanitized live preview · shadow DOM</span>
        </div>
        <Canvas html={files.html} css={files.css} />
      </section>
    </div>
  {:else}
    <!-- BLOCK MODIFIER: the denied state keeps the base class and layers
         `--denied` on top — the sheet stores only the delta, and the SCSS
         `$b: &` trick lets the modifier restyle `pg-card__title` without
         breaking the flat-specificity rule anywhere else. -->
    <section class="pg-card pg-card--denied" data-testid="access-denied">
      <h2 class="pg-card__title">Access denied</h2>
      <p>{decision.reason ?? 'You do not have permission to use the playground.'}</p>
      <p class="pg-card__hint">
        Decision made by the same <code>@mission/bridge</code> validators that guard the Angular and React remotes.
      </p>
    </section>
  {/if}
</div>
