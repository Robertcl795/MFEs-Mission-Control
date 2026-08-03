import type { EventBus } from '../core/event-bus';
import type { ThemeName, Unsubscribe } from '../schema/types';

/**
 * Reactive theme channel.
 *
 * The shell owns the DOM side-effect (a `data-theme` attribute on `<html>`)
 * and persistence. Remotes subscribe to keep their local UI — including
 * Monaco editors (`vs` / `vs-dark`) — in sync.
 */
export interface ThemeChannel {
  readonly current: ThemeName;
  set(theme: ThemeName): void;
  toggle(): void;
  /**
   * Subscribe to theme changes. With `immediate: true` (default) the
   * listener fires synchronously with the current theme so components can
   * initialise without racing the first change event.
   */
  subscribe(listener: (theme: ThemeName) => void, options?: { immediate?: boolean }): Unsubscribe;
}

export interface ThemeControllerOptions {
  bus: EventBus;
  initial?: ThemeName;
  storageKey?: string;
  /** Defaults to `document.documentElement` in the browser; no-op elsewhere. */
  target?: { setAttribute(name: string, value: string): void } | null;
}

export function createThemeChannel(options: ThemeControllerOptions): ThemeChannel {
  const { bus, storageKey = 'up-ui:theme' } = options;
  const target =
    options.target !== undefined
      ? options.target
      : typeof document !== 'undefined'
        ? document.documentElement
        : null;

  const persisted =
    typeof localStorage !== 'undefined' ? (localStorage.getItem(storageKey) as ThemeName | null) : null;
  let current: ThemeName = persisted === 'light' || persisted === 'dark' ? persisted : (options.initial ?? 'dark');
  const listeners = new Set<(theme: ThemeName) => void>();

  const apply = (theme: ThemeName) => {
    target?.setAttribute('data-theme', theme);
    try {
      localStorage?.setItem(storageKey, theme);
    } catch {
      /* private mode etc. — persistence is best-effort */
    }
  };

  apply(current);

  const set = (theme: ThemeName) => {
    if (theme === current) return;
    current = theme;
    apply(theme);
    listeners.forEach((listener) => listener(theme));
    bus.emit('theme:changed', { theme });
  };

  return {
    get current() {
      return current;
    },
    set,
    toggle: () => set(current === 'dark' ? 'light' : 'dark'),
    subscribe(listener, { immediate = true } = {}) {
      listeners.add(listener);
      if (immediate) listener(current);
      return () => listeners.delete(listener);
    },
  };
}
