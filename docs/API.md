# Biyu — Contratos de API

Estado: contrato inicial propuesto. Las rutas finales pueden ajustarse al repositorio, pero las reglas de este documento (tipos, idempotencia, versiones y errores) son obligatorias.
Los esquemas viven en `packages/contracts` y se comparten entre PWA y API; el servidor siempre valida de nuevo.

---

## 1. Convenciones

| Tema | Regla |
| --- | --- |
| Base | `/api/v1` |
| Formato | JSON UTF-8. Campos en `snake_case`. |
| Identidad | Se obtiene de Cloudflare Access en servidor. El cliente **nunca** envía `owner_id` ni `workspace_id` como prueba de propiedad. |
| IDs | UUID generados por el cliente para entidades creadas (permite reintentos offline). El servidor valida unicidad y pertenencia. |
| Dinero | `{ "asset": "USD", "amount_minor": "10000" }`. `amount_minor` es **string de entero** (USD 100.00 = `"10000"`). Nunca número ni decimal. |
| Tasas | `{ "base": "USD", "quote": "VES", "num": "4000", "den": "100" }` = destino por unidad de origen. |
| Fechas | ISO 8601 en UTC (`occurred_at`). Los períodos (`month=2026-11`) se interpretan en la zona del espacio. |
| Paginación | Cursor estable: `?cursor=<opaco>&limit=50`. Sin `offset`. Respuesta incluye `next_cursor`. |
| Idempotencia | Toda mutación exige cabecera `Idempotency-Key` (UUID). Repetir la misma clave con el mismo cuerpo devuelve la misma respuesta; con otro cuerpo devuelve `IDEMPOTENCY_MISMATCH`. |
| Concurrencia | Recursos versionados devuelven `version`. Las actualizaciones envían `If-Match: <version>`; si cambió → `VERSION_CONFLICT`. |
| Correlación | Cada respuesta incluye `X-Request-Id`. |

---

## 2. Formato de error

```json
{
  "error": {
    "code": "NEEDS_CLARIFICATION",
    "message": "Falta indicar si la comisión fue descontada o adicional.",
    "details": { "field": "fee.mode", "options": ["deducted_source", "added_source"] },
    "request_id": "…"
  }
}
```

| Código | HTTP | Cuándo |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | Sin identidad válida |
| `FORBIDDEN` | 403 | Recurso de otro espacio o canal no vinculado |
| `NOT_FOUND` | 404 | No existe en este espacio |
| `VALIDATION_ERROR` | 400 | Esquema inválido |
| `NEEDS_CLARIFICATION` | 422 | Falta un dato o hay ambigüedad que afecta saldos |
| `ASSET_MISMATCH` | 422 | Activo incompatible con el bolsillo |
| `UNBALANCED_OPERATION` | 422 | Asientos no balancean por activo |
| `RATE_REQUIRED` | 422 | Conversión sin tasa ni importes de ambos lados |
| `MONEY_LIMIT` | 422 | Importe o acumulado supera el límite seguro (DOMAIN §2) |
| `CONFIRMATION_EXPIRED` | 409 | Confirmación vencida o borrador cambiado |
| `ALREADY_REVERSED` | 409 | La operación ya tiene reverso |
| `VERSION_CONFLICT` | 409 | `If-Match` no coincide |
| `IDEMPOTENCY_MISMATCH` | 409 | Clave reutilizada con otro cuerpo |
| `RATE_LIMITED` | 429 | Límite de solicitudes |
| `INTEGRATION_DISABLED` | 503 | Integración apagada o cuota interna agotada |
| `INTERNAL` | 500 | Error no previsto (sin detalles sensibles) |

Los mensajes son en español y comprensibles; nunca incluyen SQL, trazas ni datos de otros usuarios.

---

## 3. Recursos

### 3.1 Sesión y preferencias
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/me` | Usuario, espacio, preferencias |
| PATCH | `/me/preferences` | Zona horaria, moneda de presentación, tema, ocultar saldos (`If-Match`) |

### 3.2 Catálogos
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/assets` | Activos con escala y símbolo |
| GET/POST | `/categories` | Listar / crear |
| PATCH | `/categories/{id}` | Renombrar, color, icono, orden, archivar |
| GET/POST | `/tags` | Etiquetas |
| GET/POST | `/rules` · PATCH `/rules/{id}` | Reglas de categorización (sugerir/aplicar, activa) |

### 3.3 Cuentas y bolsillos
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/accounts` | Cuentas con bolsillos y saldos confirmados |
| POST | `/accounts` | Crear cuenta con bolsillos; el saldo inicial crea una operación `opening` |
| PATCH | `/accounts/{id}` | Metadatos; archivar |
| POST | `/accounts/{id}/pockets` | Añadir bolsillo de otro activo |
| GET | `/pockets/{id}/entries` | Movimientos del bolsillo (paginado) |
| POST | `/pockets/{id}/reconciliations/preview` | Saldo calculado vs. real, pendientes relacionados, ajuste propuesto |
| POST | `/pockets/{id}/reconciliations` | Publicar ajuste con motivo |

### 3.4 Borradores, vista previa y confirmación
Todo registro (app o WhatsApp) pasa por aquí.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/drafts` | Crear borrador (`kind`: `expense`, `income`, `transfer`, `adjustment`) |
| GET | `/drafts?status=` | Bandeja de pendientes |
| PATCH | `/drafts/{id}` | Editar (`If-Match`); invalida confirmaciones previas |
| POST | `/drafts/{id}/preview` | Calcula asientos, comisiones y resumen; devuelve `confirmation_token` vinculado a versión y hash |
| POST | `/drafts/{id}/post` | Publica con `confirmation_token` + `Idempotency-Key` |
| POST | `/drafts/{id}/cancel` | Cancela sin asientos |

Atajo para registros inequívocos desde la app: `POST /operations` con el mismo cuerpo de borrador crea, valida y publica en una sola unidad de trabajo; si hay ambigüedad responde `NEEDS_CLARIFICATION` y crea el borrador.

**Ejemplo: borrador de transferencia**
```json
POST /api/v1/drafts
Idempotency-Key: 8f3c…
{
  "id": "0b8e…",
  "kind": "transfer",
  "occurred_at": "2026-11-08T14:00:00Z",
  "source_pocket_id": "…efectivo-usd",
  "destination_pocket_id": "…kontigo-usd",
  "source_principal": { "asset": "USD", "amount_minor": "10000" },
  "destination_net":  { "asset": "USD", "amount_minor": "9700" },
  "fees": [
    { "mode": "deducted_source", "calc": "difference", "confirmed": true,
      "category_id": "…comision-transferencia" }
  ],
  "journey_id": null,
  "note": "Depósito sueldo"
}
```

**Respuesta de preview**
```json
{
  "draft_id": "0b8e…",
  "draft_version": 2,
  "status": "ready",
  "summary": {
    "source_total_debit": { "asset": "USD", "amount_minor": "10000" },
    "destination_net_credit": { "asset": "USD", "amount_minor": "9700" },
    "fees": [{ "asset": "USD", "amount_minor": "300", "mode": "deducted_source", "percent_of_principal": "3.00" }],
    "executed_rate": null,
    "reference_rate": null
  },
  "entries": [
    { "ledger": "pocket:efectivo-usd", "asset": "USD", "amount_minor": "-10000" },
    { "ledger": "pocket:kontigo-usd", "asset": "USD", "amount_minor": "9700" },
    { "ledger": "expense:comision-transferencia", "asset": "USD", "amount_minor": "300" }
  ],
  "warnings": [],
  "confirmation_token": "…",
  "expires_at": "2026-11-08T14:15:00Z"
}
```

### 3.5 Operaciones
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/operations` | Historial. Filtros: `from`, `to`, `pocket_id`, `account_id`, `asset`, `category_id`, `tag`, `kind`, `source`, `q`, `status` |
| GET | `/operations/{id}` | Detalle: asientos, comisiones, tasas, recorrido, reverso, auditoría |
| POST | `/operations/{id}/reverse` | Reverso con `reason` |
| POST | `/operations/{id}/correct` | Reverso + nueva operación en una unidad de trabajo, con `reason` y cuerpo de reemplazo |

### 3.6 Recorridos
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST | `/journeys` | Listar / crear |
| GET | `/journeys/{id}` | Tramos en orden, comisiones por activo, saldos que quedaron, costo convertible y no convertible |
| POST | `/journeys/{id}/steps` | Vincular una operación de transferencia en una posición |
| DELETE | `/journeys/{id}/steps/{operation_id}` | Desvincular (no altera asientos) |
| GET | `/journeys/suggestions` | Sugerencias de vínculo para confirmar |

### 3.7 Tasas
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/rates/latest?pairs=USD-VES,EUR-VES` | Último dato con vigencia, consulta, proveedor, estado |
| GET | `/rates/history?pair=USD-VES&from=&to=` | Histórico |
| POST | `/rates/manual` | Tasa manual privada |
| POST | `/convert` | Conversión con tasa indicada o referencia; devuelve importe, tasa y redondeo |

### 3.8 Planificación
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST/PATCH | `/budgets` | Presupuestos por categoría, mes y activo |
| GET | `/budgets/{id}/progress?month=` | Consumido, restante, pendientes de valorar |
| GET/POST/PATCH | `/goals` | Metas |
| POST | `/goals/{id}/allocations` | Reserva o liberación virtual |
| GET/POST/PATCH | `/recurrences` | Reglas recurrentes; pausar |
| GET | `/recurrences/occurrences?status=pending` | Vencimientos |
| POST | `/recurrences/occurrences/{id}/confirm` | Genera borrador con datos reales o publica (idempotente por regla+fecha) |
| POST | `/recurrences/occurrences/{id}/skip` | Omitir |

### 3.9 Reportes
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/reports/summary?period=` | Patrimonio, disponible, tránsito, reservas, ingresos, gastos, resultado, costos |
| GET | `/reports/spending-by-category` | Por activo; convertido opcional con política explícita |
| GET | `/reports/balance-history` | Evolución por bolsillo o consolidado |
| GET | `/reports/movement-costs` | Comisiones, diferencia frente a referencia y variación de valor **en series separadas**, por cuenta, plataforma y recorrido |

Toda cifra convertida incluye `valuation: { target_asset, rate, provider, effective_at }` y `excluded_assets` cuando falte tasa.

### 3.10 Sincronización
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/sync/changes?since_seq=` | Cambios desde `change_log.seq` |
| POST | `/sync/commands` | Lote de comandos pendientes del dispositivo, cada uno con su `Idempotency-Key`; respuesta por comando |

Ver [OFFLINE_SYNC.md](OFFLINE_SYNC.md).

### 3.11 Exportación y respaldo
| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/export/operations.csv?filters` | CSV legible; importes como texto |
| POST | `/backups` | Genera respaldo completo versionado (JSON) |
| POST | `/restore/preview` | Valida esquema e integridad; muestra conflictos |
| POST | `/restore` | Restaura según política elegida, de forma atómica o recuperable |

### 3.12 Canales
| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/channels/whatsapp/link` | Inicia vínculo; devuelve código para enviar desde el número |
| GET | `/channels` | Vínculos activos |
| DELETE | `/channels/{id}` | Revocar |
| POST | `/webhooks/whatsapp` | Entrada del adaptador. Autenticado con secreto/HMAC del adaptador; solo guarda en inbox y responde. No usa Access. |

---

## 4. Reglas de servidor para todas las mutaciones

1. Resolver `workspace_id` desde la identidad, nunca desde el cuerpo.
2. Validar esquema y pertenencia de todos los IDs referenciados.
3. Recalcular importes, comisiones y asientos con el dominio; ignorar cualquier saldo o total calculado por el cliente.
4. Ejecutar la escritura en una sola unidad de trabajo (DATABASE §Publicación atómica).
5. Registrar auditoría, `change_log` y outbox en la misma unidad.
6. Guardar la respuesta idempotente.
