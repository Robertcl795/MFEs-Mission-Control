/**
 * Type contracts for federated remotes. The runtime modules are resolved by
 * Module Federation 2.0 from each remote's mf-manifest.json — these
 * declarations keep the host strictly typed without importing remote code.
 */
declare module 'analytics/mount' {
  export interface MountOptions {
    basename?: string;
  }
  export type UnmountFn = () => void;
  export function mount(element: HTMLElement, options?: MountOptions): UnmountFn;
  export default mount;
}

declare module 'reports/routes' {
  import type { Routes } from '@angular/router';
  export const REPORTS_ROUTES: Routes;
}
