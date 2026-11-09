# Modelo de datos y persistencia

Base propuesta: D1/SQLite. Este es el contrato del esquema; las migraciones SQL se crearán y probarán en fase 1.

## Entidades
Todas las entidades privadas incluyen workspace_id. IDs UUID generados antes de persistir; fechas UTC ISO 8601 normalizadas, más zona del usuario para períodos.

| Tabla | Campos esenciales y restricciones |
| --- | --- |
| users | id, identity_subject UNIQUE, email, created_at |
| workspaces | id, owner_user_id, reporting_asset, timezone, version |
| assets | code PK, kind, scale; no alterar escala usada |
| accounts | id, workspace_id, name, type, archived_at, version |
| pockets | id, workspace_id, account_id, asset_code; UNIQUE(account_id,asset_code) |
| ledger_accounts | id, workspace_id, asset_code, kind, pocket_id nullable; un asset ledger por pocket |
| categories | id, workspace_id, name, kind, parent_id nullable, archived_at |
| drafts | id, workspace_id, payload_json, status, version, source, expires_at |
| confirmations | id, workspace_id, draft_id, draft_version, payload_hash, token_hash, expires_at, consumed_at |
| operations | id, workspace_id, kind, status building/posted, occurred_at, created_at, source, reverses_operation_id nullable, correction_group_id |
| entries | id, workspace_id, operation_id, ledger_account_id, asset_code, amount_minor INTEGER, category_id nullable |
| transfer_details | operation_id UNIQUE, source_pocket_id, destination_pocket_id, source_principal_minor, source_total_minor, destination_gross_minor, destination_net_minor, executed_rate_num/den |
| fees | id, workspace_id, operation_id, entry_id UNIQUE, asset_code, amount_minor, mode, basis_minor, percent_num/den, origin explicit/inferred_confirmed |
| journeys | id, workspace_id, title, status, version |
| journey_steps | workspace_id, journey_id, operation_id UNIQUE, sequence; UNIQUE(journey_id,sequence) |
| rates | id, base_asset, quote_asset, numerator TEXT, denominator TEXT, provider, rate_kind, effective_at, fetched_at, source_url, quality |
| valuations | id, workspace_id, operation_id, entry_id, target_asset, amount_minor, rate_snapshot_json, valuation_kind |
| budgets | id, workspace_id, category_id, period, asset_code, limit_minor, version |
| goals | id, workspace_id, name, target_minor, asset_code, due_date, version |
| goal_allocations | id, workspace_id, goal_id, amount_minor, linked_operation_id nullable |
| recurrence_rules | id, workspace_id, template_json, cadence, next_local_date, timezone, active |
| recurrence_occurrences | rule_id, local_date, draft_id; UNIQUE(rule_id,local_date) |
| channel_links | id, workspace_id, provider, session_id, sender_id, verified_at, revoked_at |
| inbox | id, provider, session_id, external_event_id, payload_hash, workspace_id nullable, status, attempts, lease_token, lease_until |
| outbox | id, workspace_id, event_type, aggregate_id, dedupe_key UNIQUE, payload_json, status, attempts, lease_token, lease_until, next_attempt_at |
| idempotency_keys | workspace_id, command_scope, key, request_hash, operation_id, response_json, created_at; PK compuesta |
| change_log | seq INTEGER PK, workspace_id, entity_type, entity_id, version, change_kind |
| audit_events | id, workspace_id, actor_id, action, entity_id, occurred_at, redacted_metadata |
| asset_usage | workspace_id, asset_code, absolute_minor_total; PK compuesta, límite seguro |

rates es catálogo común de lectura; tasas manuales privadas se almacenan separadas o con owner_scope comprobado. No exponer cotizaciones manuales entre usuarios.

## Integridad entre propietarios
Crear UNIQUE(workspace_id,id) en padres y claves foráneas compuestas en hijos. Para entries, verificar también activo contra ledger_account mediante clave compuesta o trigger. En categorías jerárquicas impedir ciclos desde aplicación y validar pertenencia. Nunca confiar solo en filtros de interfaz.

## Dinero en D1
amount_minor INTEGER con typeof(amount_minor)='integer' y abs ≤ 10^12 por línea. El dominio convierte BigInt a Number solo después de validar rango. Tasas fraccionales como TEXT decimal entero y cálculo en dominio. Sumas SQL solo dentro de límite seguro global comprobado; no usar REAL para conversiones ni AVG de importes.

## Publicación atómica
Dentro de un único batch del binding:
1. INSERT de clave de idempotencia; conflicto impide una segunda publicación.
2. Reclamar borrador con versión esperada y guardia SQL que aborte si no existe o cambió. Una posible implementación es una tabla de guardas con CHECK sobre el número de filas afectadas; validarla en el runtime D1.
3. INSERT operations(status=building), entries y detalles.
4. UPDATE status=posted. Un trigger BEFORE UPDATE debe abortar si no hay al menos dos entradas, hay activo desbalanceado, referencias inválidas o límites excedidos.
5. Actualizar asset_usage, confirmación, borrador, audit_events, change_log y outbox.
6. Persistir resultado idempotente en la misma transacción.

Los triggers deben impedir INSERT/UPDATE/DELETE de entries de una operación publicada, así como cambios de importes/detalles financieros publicados. Descripciones y categorías solo pueden cambiar mediante un mecanismo explícito auditado; por simplicidad inicial, usar corrección completa.

La publicación valida todas las líneas como conjunto, no con un CHECK por línea incapaz de verificar SUM. Nunca dejar operaciones building confirmadas fuera de la transacción. Pruebas obligatorias de falla en cada paso y de concurrencia antes de adoptar esta implementación.

## Índices mínimos
- operations(workspace_id, occurred_at, id).
- entries(workspace_id, ledger_account_id, operation_id).
- entries(workspace_id, category_id, operation_id).
- inbox(provider,session_id,external_event_id) UNIQUE.
- channel_links(provider,session_id,sender_id) UNIQUE para vínculos activos.
- outbox(status,next_attempt_at).
- rates(base_asset,quote_asset,effective_at).
- change_log(workspace_id,seq).
- Índice único parcial para reverses_operation_id no nulo.
- FK de cada fee.entry_id a una línea expense; monto/activo deben coincidir.

## Lecturas y evolución
Saldo = SUM de líneas de bolsillo en operaciones posted, incluyendo reversos.
Los reportes respetan occurred_at y zona horaria; created_at permite auditoría. Paginación estable por (occurred_at,id) o seq, sin offset para sync.
No activar réplicas en inicio; si se activan, usar consistencia de sesión.
Migraciones numeradas e inmutables una vez desplegadas. Semillas de activos/cuentas sistema idempotentes. Probar migración sobre copia representativa, exportar antes y documentar recuperación.

