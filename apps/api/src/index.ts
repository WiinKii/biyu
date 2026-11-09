import { createApp } from './http/app.ts';

const app = createApp();

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
