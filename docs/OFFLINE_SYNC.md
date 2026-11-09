# Biyu — Borradores locales y sincronización

Modelo: **online-authoritative con borradores offline**. El servidor es la única fuente de saldos confirmados. El dispositivo guarda intenciones y una copia limitada para consulta.

No se promete: contabilidad final offline, sincronización en segundo plano permanente en iOS, ni WhatsApp sin servidor.

---

## 1. Qué funciona sin conexión

| Función | Offline |
| --- | --- |
| Ver saldos y movimientos recientes | Sí, desde caché, marcado "Última actualización {hora}" |
| Crear gasto, ingreso, transferencia o ajuste | Sí, como **borrador local pendiente** |
| Editar o cancelar un borrador local | Sí |
| Corregir o reversar una operación publicada | Se encola como comando; no se aplica hasta el servidor |
| Consultar tasa | Último dato en caché con su vigencia |
| Reportes completos, conciliación, respaldo, restauración | No |

---

## 2. Almacenamiento local (IndexedDB)

Base por usuario: `biyu-{user_id}`. Al cambiar de sesión se abre otra base; nunca se mezclan datos.

| Store | Contenido |
| --- | --- |
| `meta` | `user_id`, `workspace_id`, `last_seq`, versión de esquema local |
| `snapshot_accounts` | Cuentas y bolsillos con saldos confirmados y `as_of_seq` |
| `snapshot_operations` | Operaciones recientes (ventana limitada, p. ej. 90 días o N registros) |
| `catalogs` | Activos, categorías, etiquetas, reglas |
| `rates` | Últimas tasas |
| `commands` | Cola de comandos pendientes |

Límite de caché definido para no agotar el almacenamiento de iOS. Si el navegador borra los datos, los comandos no enviados se pierden: se informa en la ayuda y se ofrece exportar pendientes.

---

## 3. Comandos

```ts
interface PendingCommand {
  command_id: string;        // UUID local, también Idempotency-Key
  type: "create_operation" | "update_draft" | "cancel_draft"
      | "reverse_operation" | "correct_operation" | "create_account"
      | "create_category";
  entity_id: string;         // UUID generado en el dispositivo
  payload: unknown;          // cuerpo según packages/contracts
  depends_on: string[];      // command_id previos (p. ej. crear cuenta antes de usarla)
  base_version?: number;     // para actualizaciones
  created_at: string;
  attempts: number;
  status: "pending" | "sending" | "accepted" | "rejected" | "conflict";
  last_error?: { code: string; message: string };
}
```

- IDs generados antes de enviar y reutilizados en cada reintento.
- Se envían en orden respetando `depends_on`.
- El servidor valida todo de nuevo y recalcula importes.

---

## 4. Disparadores de sincronización

1. Al abrir la app.
2. Al recuperar conexión (`online`).
3. Al volver a primer plano (`visibilitychange`).
4. Acción manual "Sincronizar".

No se depende de Background Sync ni de tareas de fondo en iOS.

Secuencia:
1. `POST /sync/commands` con el lote pendiente.
2. Aplicar resultados por comando.
3. `GET /sync/changes?since_seq={last_seq}` hasta agotar.
4. Actualizar snapshot y `last_seq`.

---

## 5. Resultados y conflictos

| Resultado | Acción en la app |
| --- | --- |
| `accepted` | Marcar como confirmado; reemplazar estimación local por datos del servidor |
| Repetido (misma clave) | Mismo resultado que la primera vez; no duplica |
| `NEEDS_CLARIFICATION` | Pasa a la bandeja de pendientes con la pregunta |
| `VERSION_CONFLICT` | Mostrar ambas versiones y pedir decisión; nunca sobrescribir en silencio |
| `CONFIRMATION_EXPIRED` | Volver a previsualizar |
| Rechazo de validación | Mantener datos, mostrar error junto al campo |
| Error de red | Reintento con espera exponencial; sigue pendiente |

Los conflictos sobre operaciones publicadas no existen como edición: toda corrección es reverso + nueva operación, así que solo pueden fallar si la operación ya fue reversada (`ALREADY_REVERSED`).

---

## 6. Presentación

- Saldos confirmados y efectos pendientes **separados**: "Saldo confirmado 120,00 USD · pendiente −12,00 USD".
- Etiqueta en cada borrador local: "Guardado en este dispositivo. Pendiente de sincronizar".
- `SyncStatus` visible con: sin conexión, sincronizando, pendientes (N), error, al día.
- Nunca mostrar "Registrado" para un comando no aceptado (R15).

---

## 7. Pruebas mínimas

- Crear 3 gastos offline, reconectar: 3 operaciones, sin duplicados aunque el envío se repita.
- Comando que depende de una cuenta creada offline se envía después de ella.
- Cierre de la app durante el envío: al reabrir, el reintento devuelve el mismo resultado.
- Cambio de usuario: la base local anterior no es visible.
- Conflicto de versión en un borrador: se muestra y no se pierde ninguna versión.
