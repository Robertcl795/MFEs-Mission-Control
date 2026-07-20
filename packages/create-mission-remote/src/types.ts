/** Frameworks the platform ships an Rsbuild preset for. */
export type Framework = 'angular' | 'react' | 'svelte';

/** CI providers the platform ships a reusable pipeline template for. */
export type CiProvider = 'github' | 'gitlab';

/** Everything the generators need to emit a remote. Fully resolved — no optionals. */
export interface RemoteSpec {
  /** kebab-case folder / package name, e.g. "billing". */
  name: string;
  /**
   * Module Federation container name. MF 2.0 assigns the container to a
   * global, so it must be a valid JS identifier — dashes become underscores.
   */
  mfName: string;
  framework: Framework;
  /** Local dev-server port, e.g. 4205. */
  port: number;
  ci: CiProvider;
}

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  angular: 'Angular',
  react: 'React',
  svelte: 'Svelte',
};

/**
 * Platform packages are consumed as published artifacts in the polyrepo model.
 * Teams working inside the platform monorepo flip this to `workspace:*`.
 */
export const PLATFORM_DEP_VERSION = 'latest';

/** Central MCP server every generated agent-context file points at. */
export const MCP_SERVER_URL = 'ws://mcp.mission.local';

/** The one reusable CI workflow all remotes extend. */
export const GITHUB_CI_TEMPLATE =
  'mission-control-org/platform-tooling/.github/workflows/mission-ci-template.yml@main';
