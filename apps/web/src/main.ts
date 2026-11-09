import { IonicVue } from '@ionic/vue';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

import './theme/tokens.css';
import './theme/ionic.css';

const app = createApp(App).use(IonicVue, { mode: 'ios' }).use(router);

void router.isReady().then(() => {
  app.mount('#app');
});
