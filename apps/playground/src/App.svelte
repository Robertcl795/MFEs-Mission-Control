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

<div class="pg-root" data-testid="playground-root">
  <header class="pg-header">
    <div>
      <h1>Playground</h1>
      <p class="pg-muted">Svelte 5 remote · signed in as {user?.name ?? 'anonymous'}</p>
    </div>
    <div class="pg-actions">
      <button class="pg-btn" onclick={resetFiles}>Reset files</button>
      <button class="pg-btn pg-btn-primary" onclick={insertFleetTable} disabled={inserting} data-testid="insert-fleet">
        {inserting ? 'Loading…' : 'Insert fleet table (shared cache)'}
      </button>
    </div>
  </header>

  {#if decision.allowed}
    <div class="pg-sections">
      <section class="pg-card">
        <div class="pg-card-head">
          <h2>Editor</h2>
          <nav class="pg-tabs" aria-label="Files">
            <button
              class="pg-tab"
              class:pg-tab-active={active === 'html'}
              onclick={() => (active = 'html')}
              data-testid="file-tab-html"
            >
              index.html
            </button>
            <button
              class="pg-tab"
              class:pg-tab-active={active === 'css'}
              onclick={() => (active = 'css')}
              data-testid="file-tab-css"
            >
              styles.css
            </button>
          </nav>
          <span class="pg-lang" data-testid="editor-lang">{active === 'html' ? 'HTML' : 'CSS'}</span>
        </div>
        <Editor html={files.html} css={files.css} {active} onchange={onFileChange} />
      </section>

      <section class="pg-card">
        <div class="pg-card-head">
          <h2>Canvas</h2>
          <span class="pg-muted">sanitized live preview · shadow DOM</span>
        </div>
        <Canvas html={files.html} css={files.css} />
      </section>
    </div>
  {:else}
    <section class="pg-card pg-denied" data-testid="access-denied">
      <h2>Access denied</h2>
      <p>{decision.reason ?? 'You do not have permission to use the playground.'}</p>
      <p class="pg-muted">
        Decision made by the same <code>@mission/bridge</code> validators that guard the Angular and React remotes.
      </p>
    </section>
  {/if}
</div>
