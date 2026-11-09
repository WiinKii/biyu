import type { D1Migration } from '@cloudflare/vitest-plugin';

// Test-only bindings injected by vitest.config.ts (never present in deployed Workers).
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
      V01_MIGRATIONS: D1Migration[];
    }
  }
}
