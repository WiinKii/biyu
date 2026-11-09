<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  cloudOfflineOutline,
  refreshOutline,
  warningOutline,
} from 'ionicons/icons';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { fetchHealth, type HealthState } from '../services/health';

const TIME_ZONE = 'America/Caracas';

const state = ref<HealthState>({ kind: 'loading' });

async function check(): Promise<void> {
  state.value = { kind: 'loading' };
  state.value = await fetchHealth();
}

function onConnectivityChange(): void {
  void check();
}

onMounted(() => {
  void check();
  window.addEventListener('online', onConnectivityChange);
  window.addEventListener('offline', onConnectivityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', onConnectivityChange);
  window.removeEventListener('offline', onConnectivityChange);
});

interface Row {
  label: string;
  text: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  icon: string;
}

const apiRow = computed<Row>(() => {
  switch (state.value.kind) {
    case 'loading':
      return {
        label: 'Servicio de Biyu',
        text: 'Comprobando…',
        tone: 'neutral',
        icon: refreshOutline,
      };
    case 'ok':
    case 'degraded':
      return {
        label: 'Servicio de Biyu',
        text: 'Disponible',
        tone: 'success',
        icon: checkmarkCircleOutline,
      };
    case 'offline':
      return {
        label: 'Servicio de Biyu',
        text: 'Sin conexión',
        tone: 'warning',
        icon: cloudOfflineOutline,
      };
    case 'error':
      return {
        label: 'Servicio de Biyu',
        text: 'No pudimos comprobarlo',
        tone: 'danger',
        icon: alertCircleOutline,
      };
  }
});

const databaseRow = computed<Row>(() => {
  const current = state.value;
  if (current.kind === 'ok') {
    return {
      label: 'Base de datos',
      text: 'Disponible',
      tone: 'success',
      icon: checkmarkCircleOutline,
    };
  }
  if (current.kind === 'degraded') {
    return { label: 'Base de datos', text: 'No responde', tone: 'danger', icon: warningOutline };
  }
  return {
    label: 'Base de datos',
    text: current.kind === 'loading' ? 'Comprobando…' : 'Sin datos',
    tone: 'neutral',
    icon: current.kind === 'loading' ? refreshOutline : alertCircleOutline,
  };
});

const checkedAtText = computed(() => {
  if (state.value.kind === 'loading') return '';
  const time = new Intl.DateTimeFormat('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIME_ZONE,
  }).format(state.value.checkedAt);
  return `Última comprobación: ${time} (hora de Caracas)`;
});

const isLoading = computed(() => state.value.kind === 'loading');
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="screen">
        <header class="hero">
          <div class="brand">
            <img class="isotipo" src="/biyu-isotipo.svg" alt="" width="56" height="56" />
            <h1 class="wordmark">Biyu</h1>
          </div>
          <p class="tagline">Registrar tu dinero debe ser fácil y entenderlo debe ser inmediato.</p>
        </header>

        <main class="content">
          <section class="card glass" aria-labelledby="status-title">
            <div class="card-header">
              <h2 id="status-title">Estado del sistema</h2>
              <ion-button
                fill="clear"
                class="retry"
                :disabled="isLoading"
                data-testid="retry"
                @click="check"
              >
                <ion-spinner v-if="isLoading" slot="start" name="crescent" aria-hidden="true" />
                <ion-icon v-else slot="start" :icon="refreshOutline" aria-hidden="true" />
                Volver a comprobar
              </ion-button>
            </div>

            <ul class="rows" aria-live="polite" data-testid="status-rows">
              <li v-for="row in [apiRow, databaseRow]" :key="row.label" class="row">
                <span class="row-label">{{ row.label }}</span>
                <span class="status" :class="`tone-${row.tone}`">
                  <ion-icon :icon="row.icon" aria-hidden="true" />
                  <span>{{ row.text }}</span>
                </span>
              </li>
            </ul>

            <p v-if="checkedAtText" class="meta" data-testid="checked-at">{{ checkedAtText }}</p>
          </section>

          <section class="card notice" aria-labelledby="phase-title">
            <span class="badge">Fase 0</span>
            <h2 id="phase-title">Esqueleto técnico</h2>
            <p>
              Biyu todavía no registra operaciones. Esta pantalla solo comprueba que la aplicación y
              el servicio responden. Las cuentas y los registros llegan en la fase 1.
            </p>
          </section>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.screen {
  min-height: 100%;
  background:
    radial-gradient(120% 60% at 50% -10%, var(--biyu-hero-glow-1), transparent 70%),
    radial-gradient(60% 40% at 90% 0%, var(--biyu-hero-glow-2), transparent 70%),
    var(--biyu-background);
}

.hero {
  padding: calc(env(safe-area-inset-top) + var(--biyu-space-7)) var(--biyu-space-4)
    var(--biyu-space-6);
  max-width: 720px;
  margin: 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--biyu-space-3);
}

.isotipo {
  width: 56px;
  height: 56px;
}

.wordmark {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--biyu-text-primary);
}

.tagline {
  margin: var(--biyu-space-4) 0 0;
  font-size: 1.125rem;
  line-height: 1.5;
  color: var(--biyu-text-secondary);
  max-width: 36ch;
}

.content {
  display: grid;
  gap: var(--biyu-space-4);
  padding: 0 var(--biyu-space-4) calc(env(safe-area-inset-bottom) + var(--biyu-space-6));
  max-width: 720px;
  margin: 0 auto;
}

@media (min-width: 1200px) {
  .content {
    grid-template-columns: 3fr 2fr;
    align-items: start;
    max-width: 1040px;
  }

  .hero {
    max-width: 1040px;
  }
}

.card {
  border-radius: var(--biyu-radius-card);
  padding: var(--biyu-space-5);
  background: var(--biyu-surface);
  border: 1px solid var(--biyu-border);
  box-shadow: var(--biyu-shadow);
}

.glass {
  background: var(--biyu-surface-glass);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass {
    background: var(--biyu-surface);
  }
}

.card h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 650;
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--biyu-space-2);
}

.retry {
  --color: var(--biyu-primary);
  min-height: 44px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.rows {
  list-style: none;
  margin: var(--biyu-space-4) 0 0;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--biyu-space-3);
  min-height: 48px;
  border-top: 1px solid var(--biyu-border);
}

.row-label {
  font-size: 1rem;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--biyu-space-2);
  font-weight: 600;
}

.status ion-icon {
  font-size: 1.25rem;
}

.tone-success {
  color: var(--biyu-success);
}

.tone-warning {
  color: var(--biyu-warning);
}

.tone-danger {
  color: var(--biyu-danger);
}

.tone-neutral {
  color: var(--biyu-text-secondary);
}

.meta {
  margin: var(--biyu-space-3) 0 0;
  font-size: 0.875rem;
  color: var(--biyu-text-secondary);
}

.notice p {
  margin: var(--biyu-space-2) 0 0;
  line-height: 1.5;
  color: var(--biyu-text-secondary);
}

.badge {
  display: inline-block;
  margin-bottom: var(--biyu-space-3);
  padding: var(--biyu-space-1) var(--biyu-space-3);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--biyu-accent-violet);
  background: var(--biyu-surface-muted);
}
</style>
