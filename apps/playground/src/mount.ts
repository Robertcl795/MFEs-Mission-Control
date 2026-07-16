import { mount as svelteMount, unmount as svelteUnmount } from 'svelte';
import App from './App.svelte';
import '@mission/tokens/tokens.css';
import './styles.css';

export interface MountOptions {
  /** Path prefix the shell mounted this remote under (reserved for sub-routes). */
  basename?: string;
}

export type UnmountFn = () => void;

/**
 * Federated entry (`playground/mount`): the same framework-agnostic contract
 * the React remote uses. The Angular shell never touches Svelte APIs — it
 * gets a mount function and an unmount handle, nothing more.
 */
export function mount(element: HTMLElement, _options: MountOptions = {}): UnmountFn {
  const app = svelteMount(App, { target: element });
  return () => {
    void svelteUnmount(app);
  };
}

export default mount;
