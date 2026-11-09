import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // In development the API runs under `wrangler dev` (apps/api).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  build: {
    target: 'es2022',
    // Source maps would be deployed as public Static Assets; keep them out of production builds.
    sourcemap: false,
  },
});
