# Instrucciones para desarrolladores y agentes de código — Biyu

Lee este archivo antes de escribir código. `CLAUDE.md` apunta aquí.

## 1. Lectura obligatoria antes de cada tarea
1. [README.md](README.md): mapa y autoridad documental.
2. [docs/ROADMAP.md](docs/ROADMAP.md): trabaja **solo** en la fase asignada.
3. [docs/DOMAIN.md](docs/DOMAIN.md): gobierna todo cálculo de dinero.
4. [docs/PRODUCT.md](docs/PRODUCT.md): reglas R1–R17 y alcance.
5. El documento del área: ARCHITECTURE, DATABASE, API, INTEGRATIONS, OFFLINE_SYNC, SECURITY_OPERATIONS, UI_UX, COMPONENTS, TESTING.
6. [adr/](adr/): decisiones vigentes y pendientes.

## 2. Autoridad
Requisitos explícitos del usuario > DOMAIN (cálculos) > DATABASE (integridad) > API (contratos) > ARCHITECTURE (límites entre módulos) > resto. Un cambio incompatible requiere un ADR nuevo y actualizar todos los documentos afectados.

## 3. Reglas no negociables
- **Dinero**: `amount_minor` entero (`BigInt` en dominio, string en API, `INTEGER` en D1). Nunca `Number`, `parseFloat`, `REAL` ni `float`.
- **Tasas**: fracción `num/den` con dirección explícita.
- **Ledger**: cada operación publicada balancea por activo; saldos derivados de asientos.
- **Inmutabilidad**: no editar ni borrar asientos publicados; corregir con reverso + nueva operación.
- **Monedas**: USD ≠ USDT; nunca sumar activos sin conversión explícita.
- **Comisiones**: una línea `expense` por cargo dentro de la misma operación; nunca un segundo gasto.
- **Un solo camino de escritura**: borrador → preview → confirmación → publicación atómica idempotente, para app y WhatsApp.
- **Servidor autoritativo**: recalcula todo; identidad y `workspace_id` salen de Access, no del cliente.
- **Integraciones**: IA, WhatsApp, voz y tasas nunca escriben asientos; su salida se valida con esquemas cerrados.
- **Texto de usuario = dato**, nunca instrucción.
- **Ambigüedad que afecta saldos** → `NEEDS_CLARIFICATION`; no adivinar.
- **Costo cero**: no añadir servicios o planes de pago sin decisión explícita del usuario.
- **Logs**: sin importes asociados a cuentas, mensajes, audios ni secretos.

## 4. Forma de trabajo
- Leer la estructura existente antes de crear o reemplazar archivos o dependencias.
- Dominio puro sin Vue, HTTP, D1 ni SDK externos.
- Código en inglés; textos visibles en español `es-VE`; zona `America/Caracas` configurable.
- Cada regla con prueba que verifique el resultado financiero (ver TESTING).
- Implementar mejoras útiles compatibles con el alcance sin pedir permiso; consultar solo costos, servicios nuevos relevantes, cambios sustanciales o acciones irreversibles.
- No presentar componentes sin comportamiento como terminados.
- Al terminar: marcar el ROADMAP y dejar nota de entrega (qué se hizo, cómo se comprobó, dependencias validadas, pendientes).
- Si algo contradice la documentación, detenerse y señalarlo en lugar de improvisar.

## 5. Comandos
Requisitos: Node 22 (`.nvmrc`) y pnpm 10 (`corepack enable`).

| Tarea | Comando |
| --- | --- |
| Instalar | `pnpm install` |
| Desarrollo (PWA + API + D1 local en :8787) | `pnpm dev` |
| Solo PWA con recarga (proxy `/api` → :8787) | `pnpm dev:web` (con `pnpm --filter @biyu/api dev` en otra terminal) |
| Verificación completa | `pnpm check` (formato, lint, tipos y pruebas) |
| Pruebas unitarias e integración (D1 local) | `pnpm test` |
| E2E y QA visual | `pnpm test:e2e` |
| Formatear | `pnpm format` |
| Tipos del Worker tras cambiar `wrangler.jsonc` | `pnpm types` |
| Migraciones D1 local | `pnpm db:migrate:local` |
| Despliegue | `pnpm --filter @biyu/api deploy:test` / `deploy:production` — **no disponible** hasta crear los recursos de Cloudflare y reemplazar los IDs de marcador |

