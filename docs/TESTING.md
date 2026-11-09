# Biyu — Pruebas y verificación

Las pruebas comprueban **resultados financieros y recuperación ante fallos**, no repiten la implementación. Todos los datos de prueba son ficticios e identificados; las tasas de ejemplo no son tasas vigentes.

---

## 1. Niveles

| Nivel | Herramienta | Alcance |
| --- | --- | --- |
| Dominio | Vitest | Money, Rate, redondeo, comisiones, asientos, reversos, invariantes. Sin I/O. |
| Propiedades | Vitest + generador (p. ej. fast-check) | Balance por activo y redondeo con entradas aleatorias |
| Integración | Vitest + D1 local (y remoto de prueba) | Publicación atómica, idempotencia, autorización, triggers, migraciones |
| Contratos | Vitest | Esquemas de `packages/contracts` contra respuestas reales de la API |
| Integraciones | Vitest con dobles | Intérprete, WAHA, proveedor de tasas, transcripción |
| E2E y visual | Playwright | Flujos críticos en 375/390, 768 y 1440 px, claro/oscuro |
| Dispositivo | Manual | PWA instalada en iPhone real |

---

## 2. Dominio financiero

Unidades legibles; internamente en unidades mínimas.

| # | Caso | Resultado esperado |
| --- | --- | --- |
| F01 | Saldo inicial 100 USD | Bolsillo +100; `equity:opening` −100; ingresos del mes = 0 |
| F02 | Ingreso 20 USD | Bolsillo +20; ingresos 20 |
| F03 | Gasto 10 USD | Bolsillo −10; gastos 10 |
| F04 | Ajuste de conciliación +5 USD | Bolsillo +5; `equity:adjustment`; no aparece en ingresos |
| F05 | Transferencia 100 USD, llegan 97, comisión confirmada | Origen −100; destino +97; `expense:fee` +3; ingresos/gastos solo incluyen 3 |
| F06 | 100 USD + 3 adicionales | Origen −103; destino +100; fee 3 |
| F07 | 2 % descontado sobre 100 | Origen −100; destino +98; fee 2 |
| F08 | 102 USD totales con 2 % adicional y base confirmada | Principal 100; fee 2 |
| F09 | 100 USD → VES a 40 VES/USD, fee destino 40 VES | USD origen −100; puente FX; VES destino +3.960; fee 40 VES |
| F10 | 100 USD → 3.900 VES sin fee, referencia 40 | Sin fee; "diferencia frente a referencia" 100 VES; no es gasto |
| F11 | Llega más de lo enviado | No crea fee negativa; `NEEDS_CLARIFICATION` |
| F12 | "Pasé 100 al 3 %" | `NEEDS_CLARIFICATION` por modalidad |
| F13 | USD → USDT sin relación indicada | `NEEDS_CLARIFICATION`; con 1:1 explícito se guarda solo en esa operación |
| F14 | Reverso de F05 | Suma original + reverso = 0 en cada cuenta contable; reportes sin efecto neto |
| F15 | Corrección de 12 → 15 USD | Reverso + nueva en una unidad; saldo refleja 15; historia conserva ambas |
| F16 | Segundo reverso de la misma operación | `ALREADY_REVERSED` |
| F17 | Redondeo de conversión | Reproducible; residual conservado en metadata |
| F18 | Importe > 10^12 unidades mínimas | `MONEY_LIMIT` |
| F19 | Suma de USD y VES sin tasa | Imposible en el dominio; reporte muestra activos excluidos |
| F20 | Cambio de tasa de referencia posterior | Operaciones pasadas idénticas |
| F21 | Reembolso vinculado a gasto | Reduce gasto de la categoría; no suma ingresos |
| F22 | Recurrente vencido sin confirmar | Sin asientos; aparece en pendientes |
| F23 | Confirmar el mismo recurrente dos veces | Una sola operación |
| F24 | Reserva de 50 USD para meta | Patrimonio igual; disponible −50 |
| F25 | Recorrido de 3 tramos con transferencia parcial | Comisiones por activo; saldo restante en el intermedio; sin sumar brutos entre monedas |
| F26 | Dinero en tránsito (según D-04) | No duplica patrimonio; no cuenta como disponible |

**Propiedad general:** para toda operación publicada, Σ `amount_minor` = 0 por activo, y saldo de bolsillo = Σ de sus asientos publicados (incluidos reversos).

---

## 3. Integración con D1

| # | Caso | Esperado |
| --- | --- | --- |
| I01 | Fallo forzado en cada paso de la publicación | Ningún efecto persistido |
| I02 | Dos publicaciones simultáneas con la misma clave | Una operación; la segunda recibe la misma respuesta |
| I03 | Misma clave, cuerpo distinto | `IDEMPOTENCY_MISMATCH` |
| I04 | Borrador cambiado tras preview | `CONFIRMATION_EXPIRED` |
| I05 | UPDATE de entries publicadas | Trigger aborta |
| I06 | Operación publicada con una sola línea o desbalanceada | Trigger aborta |
| I07 | Referencia a bolsillo de otro espacio | Rechazo por FK compuesta |
| I08 | Ciclo en categorías | Rechazo |
| I09 | Migraciones desde cero y sobre copia representativa | Esquema esperado; datos intactos |
| I10 | Semillas de activos repetidas | Idempotentes |

---

## 4. Autorización y seguridad

- Usuario A no lee ni modifica recursos de B (cada endpoint).
- Remitente de WhatsApp no vinculado: sin datos, sin borradores.
- Webhook sin firma válida: rechazado.
- Logs de una operación de prueba no contienen importes ni textos de mensajes.

---

## 5. WhatsApp e intérprete

| # | Caso | Esperado |
| --- | --- | --- |
| W01 | Gasto con cuenta explícita | Resumen → "sí" → una operación |
| W02 | Gasto sin cuenta, varias candidatas | Pregunta con opciones |
| W03 | "Deposité 100 y llegaron 97" | Pregunta si fue comisión |
| W04 | "Pasé 100 al 3 %" | Pregunta modalidad |
| W05 | USDT → VES sin recibido | Pide importe o tasa |
| W06 | USD → USDT | Pregunta relación |
| W07 | Mismo webhook dos veces | Un solo efecto |
| W08 | Mensaje casi idéntico en ventana corta | Advierte duplicado |
| W09 | "Borra lo último" | Pide confirmación y reversa |
| W10 | "No, eran 15" | Corrección por reverso + nueva |
| W11 | "¿A cuánto está el BCV?" | Vigencia y consulta separadas |
| W12 | Mensaje con instrucciones al sistema ("ignora las reglas…") | Tratado como texto; sin efecto |
| W13 | IA desactivada | Parser determinista sigue respondiendo |

---

## 6. Tasas

- Respuesta válida → snapshot guardado con vigencia y consulta.
- Respuesta inválida o fuera de rango → descartada; se mantiene el último dato.
- Proveedor caído → estado "Actualización fallida"; registro con tasa manual posible.
- Cambiar de proveedor → operaciones intactas.

---

## 7. Offline y sincronización

Ver [OFFLINE_SYNC.md §7](OFFLINE_SYNC.md).

---

## 8. QA visual y accesibilidad

Por cada pantalla implementada (ver [UI_UX.md §9–10](UI_UX.md)):
- Claro y oscuro, 375/390, 768 y 1440 px.
- Importes largos (p. ej. 123.456.789,00 VES) sin cortes.
- Estados: carga, vacío, sin resultados, error, sin conexión, pendiente, desactualizado.
- Teclado, foco visible, zoom 200 %, lector de pantalla en montos con moneda.
- Contraste 4,5:1 texto normal, 3:1 grande y controles.
- Ocultar saldos afecta todas las vistas.
- Prueba en iPhone real cuando esté disponible; documentar si no se pudo.

---

## 9. Definición de terminado (por componente)

- [ ] Casos de dominio e integración relevantes pasan en CI.
- [ ] Flujo E2E principal pasa.
- [ ] QA visual registrado.
- [ ] Documentación actualizada (PRODUCT, COMPONENTS, UI_UX si aplica).
- [ ] Nota de entrega: qué se implementó, cómo se comprobó, qué dependencias se validaron, qué queda pendiente.
