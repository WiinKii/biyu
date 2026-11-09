# Nota de entrega — Fase 0 · Esqueleto y validaciones

Fecha: 2026-11-09 · Rama: `fase-0/esqueleto` · Referencias: [ROADMAP](../ROADMAP.md), [ADR 0001](../../adr/0001-BASE-TECNICA.md), [TESTING](../TESTING.md).

## 1. Qué se hizo

| Ítem del ROADMAP | Estado | Detalle |
| --- | --- | --- |
| Monorepo | Hecho | pnpm workspaces: `apps/web`, `apps/api`, `packages/domain`, `packages/contracts`, `packages/test-fixtures`, `migrations`, `tests/e2e`. |
| TS estricto, lint, formato, Vitest, Playwright, CI | Hecho | `tsconfig.base.json` estricto (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); ESLint con reglas tipadas y prohibición de `parseFloat` (y de `Number()` en el dominio); Prettier; Vitest por paquete; Playwright; GitHub Actions (`.github/workflows/ci.yml`). |
| Worker + Static Assets + D1 local y de prueba | Hecho en local; prueba remota pendiente | `apps/api/wrangler.jsonc` sirve la PWA como Static Assets (`run_worker_first: /api/*`, SPA) y la API Hono con binding D1. Entornos `test` y `production` declarados con IDs de marcador: **no hay recursos de Cloudflare creados**. |
| Versiones fijadas y lockfile (V-06) | Hecho | Versiones exactas (`save-exact`), `pnpm-lock.yaml`, `packageManager` y `.nvmrc`. Ver §3.4. |
| Validar atomicidad D1 (V-01) | Hecho en D1 local; remoto pendiente | Ver §3.1. |
| Validar Access con PWA en iPhone (V-02) | Pendiente | Requiere cuenta Cloudflare y un iPhone real. Ver §3.2. |
| Revisar cuotas gratuitas (V-05) | Hecho (documental) | Ver §3.3. Las cuotas internas y la degradación se implementan con cada integración. |
| Decidir D-01, D-02, D-03 | Adoptadas provisionalmente | USD por defecto; mitad alejándose de cero; USDT con 6 decimales. Codificadas en `packages/domain`. Pendiente de confirmación explícita del usuario (ADR 0001 §4). |

Además:
- **Contratos compartidos** (`packages/contracts`, zod): códigos de error con su estado HTTP, sobre de error, `Money` (`amount_minor` como texto entero), `Rate` (fracción entera positiva) y respuesta de salud. La PWA valida la respuesta de la API con el mismo esquema.
- **API**: `GET /api/v1/health` (comprueba D1), `X-Request-Id` generado en servidor (se ignora el del cliente), cabeceras de seguridad, límite de cuerpo de 64 KB, errores con el formato de API.md §2 y log estructurado con campos permitidos solamente.
- **PWA**: pantalla real de **Estado del sistema** (consulta la API, estados cargando/disponible/sin conexión/error, reintento, hora de Caracas). Declara explícitamente que todavía no registra operaciones. Manifest, isotipo y CSP estricta en `public/_headers`.
- **Sistema visual**: tokens en `apps/web/src/theme/tokens.css` con la dirección de las referencias visuales del usuario (ver [UI_UX anexo C](../UI_UX.md#anexo-c--referencias-visuales-y-tokens-v11)). El contraste de cada par se comprueba en pruebas automáticas; detectó y corrigió el cian inicial (`#087F92`, 4,39:1 sobre el fondo claro).

## 2. Cómo se comprobó

| Comando | Resultado |
| --- | --- |
| `pnpm format:check` | Sin diferencias |
| `pnpm lint` | 0 errores, 0 avisos |
| `pnpm typecheck` | Sin errores en los 5 paquetes |
| `pnpm test` | domain 6 · contracts 6 · web 58 · api 26 — todas pasan |
| `pnpm test:e2e` | 28 pasan: 7 pruebas × 4 proyectos (390 claro, 375 oscuro, 768 oscuro, 1440 claro) contra `wrangler dev` real |

Las E2E verifican: PWA servida como Static Assets → API → D1 local; sin errores de consola ni violaciones de CSP; cabeceras de seguridad en HTML; fallback SPA; formato de error en rutas API desconocidas; estado sin conexión y recuperación; sin desplazamiento horizontal; objetivo táctil ≥ 44 px; foco por teclado. Capturas de QA en [`docs/qa/fase-0/`](../qa/fase-0/).

Limitación: las E2E usan Chromium con viewport móvil. **No sustituyen la prueba en iPhone real** (UI_UX §9), pendiente con V-02.

## 3. Validaciones

### 3.1 V-01 · Atomicidad de `batch` en D1 con guardia de publicación

Prueba: `apps/api/test/v01/` (esquema mínimo + prototipo de publicación + 20 pruebas), ejecutada en workerd con D1 local mediante `@cloudflare/vitest-plugin`.

Documentación consultada (2026-11-09): *“Batched statements are SQL transactions. If a statement in the sequence fails, then an error is returned for that specific statement, and it aborts or rolls back the entire sequence.”* — [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/) (actualizada 2026-06-22).

Mecanismos validados:
1. **Guardia de filas afectadas**: `INSERT INTO publication_guard (ok, label) SELECT changes() = 1, '…'` justo después de cada `UPDATE` condicional. `publication_guard` es una **vista** con trigger `INSTEAD OF INSERT` que hace `RAISE(ABORT)` si `ok` no es 1: no guarda filas y convierte “UPDATE con 0 filas” en un fallo que revierte todo el batch.
2. **Trigger de publicación** `building → posted`: aborta con menos de 2 líneas o con cualquier activo cuya suma ≠ 0 (USD y VES nunca se compensan).
3. **Inmutabilidad**: triggers impiden `INSERT/UPDATE/DELETE` de líneas de operaciones publicadas y cambiar o borrar una operación publicada.
4. **Límites**: `CHECK (typeof(amount_minor) = 'integer' AND |amount| ≤ 10^12)` por línea y acumulador `asset_usage ≤ 9×10^15` actualizado con `UPSERT` dentro del mismo batch.
5. **Idempotencia**: la clave se inserta como primer paso del batch, junto con la respuesta; un conflicto de PK revierte el batch y la aplicación devuelve la respuesta guardada o `IDEMPOTENCY_MISMATCH`.
6. **Reverso único**: índice único parcial sobre `reverses_operation_id`.

Resultados (todas pasan):

| Caso | Resultado |
| --- | --- |
| I01: fallo forzado **después de cada uno de los 12 pasos** | Estado idéntico al inicial en todas las tablas; después el batch íntegro publica |
| I04: versión de borrador obsoleta / borrador inexistente | Guardia aborta; la clave de idempotencia **no** queda consumida |
| I06: desbalanceado, balance entre activos distintos, una sola línea | Trigger aborta; sin efectos |
| Línea > 10^12, acumulado > 9×10^15, `outbox` duplicado (último paso) | `CHECK`/`UNIQUE` abortan; sin efectos |
| I05: modificar líneas u operación publicadas | `POSTED_IMMUTABLE` |
| I02: 2 y 10 publicaciones simultáneas con la misma clave | 1 operación; el resto recibe la misma respuesta |
| I03: misma clave, otro cuerpo | `IDEMPOTENCY_MISMATCH`, sin cambios |
| Claves distintas sobre la misma versión del borrador | Solo una publica; la otra falla la guardia |
| Segundo reverso | Rechazado por el índice único parcial |

Hallazgos que pasan a la fase 1:
- **Afinidad de SQLite**: un texto como `'100'` enlazado a una columna `INTEGER` se guarda como entero exacto antes del `CHECK` (no hay pérdida, pero `'100.50'` sí se rechaza). Los adaptadores deben enlazar solo números producidos por `toBindingInteger()`, que rechaza valores fuera de ±(2^53 − 1).
- En D1 las claves foráneas están activas siempre; los reinicios de esquema en pruebas usan `PRAGMA defer_foreign_keys`.
- El almacenamiento de D1 en las pruebas **no** se aísla entre pruebas en esta versión del plugin; las pruebas reconstruyen el esquema en cada caso.

**Pendiente para cerrar V-01 por completo**: repetir la suite en un D1 remoto de prueba (requiere cuenta Cloudflare y token; se pedirá mediante el formulario seguro). Local y remoto comparten el motor SQLite, pero la concurrencia real en remoto debe comprobarse.

### 3.2 V-02 · Cloudflare Access con la PWA instalada en iPhone

No ejecutable en este entorno. Documentación consultada (2026-11-09, [validación de JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)): Access envía el token en la cabecera `Cf-Access-Jwt-Assertion` (recomendada frente a la cookie `CF_Authorization`), firmado con claves publicadas en `https://<equipo>.cloudflareaccess.com/cdn-cgi/access/certs`, que contienen la clave actual y la anterior; se debe elegir la clave por `kid` y validar `aud` e `iss`.

Decisión documentada para la fase 1:
- El Worker valida firma, `aud`, `iss` y expiración del JWT en cada solicitud; nunca confía en la sola presencia de cabeceras (SECURITY_OPERATIONS §1).
- Plan de prueba en dispositivo: instalar la PWA en iPhone (Safari → Compartir → Añadir a inicio), abrir en modo standalone, completar login de Access, cerrar la app > duración de sesión, reabrir y comprobar renovación sin perder el contexto; registrar si Safari abre la pantalla de login fuera de la PWA.
- Alternativa si falla en standalone: mantener Access como puerta y servir la PWA en el mismo dominio con duración de sesión ampliada, o evaluar un ADR para autenticación propia. No se decide sin la prueba.
- El número de usuarios gratuitos de Zero Trust **no se pudo confirmar** en la página pública consultada; queda por verificar en el panel al crear la cuenta.

### 3.3 V-05 · Cuotas gratuitas (consultadas el 2026-11-09)

| Servicio | Límite del plan gratuito | Fuente (actualización) |
| --- | --- | --- |
| Workers | 100.000 solicitudes/día (reinicio 00:00 UTC; al exceder, error 1027); 10 ms de CPU por solicitud y por Cron; 128 MB de memoria; 50 subsolicitudes; 64 MiB de Worker | [Limits](https://developers.cloudflare.com/workers/platform/limits/) (2026-10-29) |
| Static Assets | Solicitudes a assets gratuitas e ilimitadas; 20.000 archivos por versión; 25 MiB por archivo | [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) (2026-10-02), Limits |
| Cron Triggers | 5 por cuenta | Limits |
| D1 | 10 bases; 500 MB por base; 5 GB por cuenta; 5 M filas leídas/día; 100.000 filas escritas/día; 50 consultas por invocación (**un `batch` cuenta como una**); 100 parámetros por consulta; 100 KB por sentencia; Time Travel 7 días. Al exceder: las consultas fallan hasta el reinicio diario | [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) (2026-10-30) |
| Workers AI | 10.000 neuronas/día; Whisper ≈ 41,14 neuronas por minuto de audio (≈ 240 min/día teóricos) | [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) (2026-10-20) |
| Workers Logs | 200.000 eventos/día, 3 días | Pricing |

Implicaciones de diseño:
- **10 ms de CPU** es el límite más exigente: la publicación hace el cálculo en el dominio y una sola llamada `batch`; la validación de JWT (fase 1) debe cachear las claves de Access y medirse.
- **100.000 filas escritas/día** de D1: cada publicación escribe ~12 filas más índices; holgado para un propietario, pero el procesador del outbox y los Cron deben evitar escrituras vacías.
- **5 Cron Triggers**: un solo Cron que despache tasas, outbox e inbox.
- Cuotas internas propuestas (por debajo del límite, se implementan con cada integración): Whisper ≤ 60 min/día; tasas ≤ 24 consultas/día; alerta interna al 70 % de filas escritas.

### 3.4 V-06 · Versiones y licencias

Node 22 (`.nvmrc`), pnpm 10.28.0. Directas principales: Vue 3.5.45, @ionic/vue 9.0.10, vue-router 5.4.0 (requerido por @ionic/vue-router 9), Vite 8.3.6, Hono 4.13.17, zod 4.6.7, wrangler 4.158.0 (workerd 1.20261104.1, `compatibility_date` 2026-11-01), @cloudflare/vitest-plugin 1.6.0, Vitest 4.1.12, Playwright 1.63.0, TypeScript 6.0.3, ESLint 10.14.0.

Decisiones de compatibilidad:
- TypeScript 6.0.3 y no 7.x: `typescript-eslint` 8.72 admite `<6.1.0`.
- Vitest 4.1.12: `@cloudflare/vitest-plugin` admite `^4.1 || ^5`; se mantiene 4.x estable.
- `@cloudflare/vitest-pool-workers` está **obsoleto** (renombrado a `@cloudflare/vitest-plugin`); se usa el nuevo.
- Playwright 1.63.0 coincide con el Chromium preinstalado en el entorno; CI instala el suyo.

Licencias de dependencias de producción: MIT (76), MPL-2.0 (3: `lightningcss`, herramienta de compilación, no se distribuye en el bundle), Apache-2.0 (2), BSD-2/BSD-3/ISC/0BSD (1 cada una). Todas compatibles con uso privado.

## 4. Pendientes y riesgos

- **V-01 remoto** y **V-02** requieren cuenta Cloudflare (y iPhone para V-02). Los IDs de D1 en `wrangler.jsonc` son marcadores; no hay despliegue.
- **D-01, D-02, D-03** adoptadas provisionalmente; esperan confirmación explícita.
- **Bundle de la PWA**: 1,24 MB minificado (276 KB gzip) porque Ionic termina incluyendo todos sus componentes. Optimizar en la fase 1 (objetivo de carga < 3 s, ARCHITECTURE §13).
- Las capturas de `docs/qa/fase-0` son de emulación Chromium.
- El entorno de esta sesión necesitó permitir `developers.cloudflare.com` y `www.cloudflare.com` para consultar la documentación (entorno personal `biyu`).

## 5. Siguiente paso propuesto

Fase 1: `Money`/`Rate`/redondeo con BigInt y pruebas de propiedades; migraciones reales a partir del prototipo V-01; borradores, preview, confirmación y publicación; reverso y corrección; identidad Access → usuario → espacio; cuentas, bolsillos y apertura; gasto/ingreso/ajuste de extremo a extremo; AppShell y navegación.
