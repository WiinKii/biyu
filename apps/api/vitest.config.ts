import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const root = import.meta.dirname;
      const [migrations, v01Migrations] = await Promise.all([
        readD1Migrations(path.join(root, '../../migrations')),
        readD1Migrations(path.join(root, 'test/v01/migrations')),
      ]);
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations, V01_MIGRATIONS: v01Migrations },
        },
      };
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
