import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: true,
  minify: false,
  sourcemap: false,
  // The shebang lives in src/index.ts; tsup preserves it and chmods the output.
});
