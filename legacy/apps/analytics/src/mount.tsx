import { createRoot } from 'react-dom/client';
import { App } from './App';

export interface MountOptions {
  /** Path prefix the shell mounted this remote under. */
  basename?: string;
}

export type UnmountFn = () => void;

/**
 * Federated entry (`analytics/mount`): the framework-agnostic contract the
 * Angular shell consumes. The host never imports React — it gets a mount
 * function and an unmount handle, nothing more.
 */
export function mount(element: HTMLElement, options: MountOptions = {}): UnmountFn {
  const root = createRoot(element);
  root.render(<App basename={options.basename ?? '/analytics'} />);
  return () => root.unmount();
}

export default mount;
