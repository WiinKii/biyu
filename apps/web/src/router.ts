import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import SystemStatusPage from './pages/SystemStatusPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'system-status', component: SystemStatusPage },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
