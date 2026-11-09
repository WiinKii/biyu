# Dominio financiero y reglas de dinero

Este documento gobierna todos los canales. Ejemplos con tasas ficticias: no son tasas vigentes.

## 1. Conceptos
- Cuenta: contenedor reconocible, por ejemplo Efectivo, Kontigo, Binance o Banco.
- Bolsillo: saldo de un único activo dentro de una cuenta.
- Activo: USD, EUR, VES, USDT. La marca de una cuenta no determina su activo.
- Operación: intención económica confirmada; puede generar varios asientos.
- Asiento: variación firmada en una cuenta contable y un activo.
- Tramo: transferencia entre dos bolsillos, con sus propias comisiones y conversión.
- Recorrido: agrupación de tramos relacionados; no representa dinero adicional.
- Comisión: costo explícito o inferido y luego confirmado.
- Tasa ejecutada: relación entre principal entregado a conversión y monto bruto recibido.
- Tasa de referencia: cotización usada para comparar o presentar equivalencias.

## 2. Representación y redondeo
Money = asset_code + amount_minor entero. Escalas iniciales propuestas: USD/EUR/VES=2; USDT=6. Escala inmutable una vez usado el activo; un cambio requiere migración o nuevo código.

Dominio usa BigInt. API usa cadenas enteras, por ejemplo USD 100.00 = "10000". Nunca Number, parseFloat o REAL para operaciones de dinero. Tasas se representan como fracción de enteros positivos numerador/denominador, con unidad explícita destino por origen; se pueden presentar como decimal.

Fórmula exacta: destino_minor = redondear(origen_minor × rate_num × 10^escala_destino / (rate_den × 10^escala_origen)). Redondeo propuesto: mitad alejándose de cero. Redondear solo al materializar un importe, conservar tasa y residual como metadata. Los importes realmente entregados/recibidos prevalecen sobre la estimación; discrepancias requieren aclaración.

Límite por línea: valor absoluto ≤ 10^12 unidades mínimas. Para cada espacio/activo mantener acumulador de suma absoluta de líneas publicadas ≤ 9×10^15; evita desbordar los enteros seguros del binding. La comprobación debe ser atómica. Las exportaciones usan strings. Si se alcanza un límite, bloquear con MONEY_LIMIT y migrar representación antes de continuar.

## 3. Contabilidad mínima balanceada
Usar ledger balanceado por activo. En cada operación publicada, suma(amount_minor) = 0 para cada activo. Los bolsillos de usuario son cuentas de tipo asset; cuentas de contrapartida son income, expense, equity y fx_bridge. No se muestran como dinero disponible.

Ejemplos en unidades monetarias legibles:
| Operación | Asientos |
| --- | --- |
| Saldo inicial USD 100 | Efectivo +100; equity:opening −100 |
| Ingreso USD 20 | Efectivo +20; income −20 |
| Gasto USD 10 | Efectivo −10; expense +10 |
| Transferencia USD 100, llegan 97 | Origen −100; destino +97; expense:fee +3 |
| USD 100 → VES 4.000, sin fee | USD origen −100; USD fx_bridge +100; VES fx_bridge −4.000; VES destino +4.000 |

Los gastos del producto se leen de contrapartidas expense; ingresos de income con signo invertido. Los puentes FX no son ingreso, gasto ni saldo disponible. No se calcula resultado fiscal ni ganancia realizada de inversiones en el MVP.

## 4. Transferencia y comisiones
Campos canónicos:
- source_principal: importe destinado al traslado o cambio antes de la comisión descontada.
- fee_mode: deducted_source, added_source, deducted_destination o separate.
- fee_amount y fee_asset, con bolsillo pagador si separate.
- source_total_debit: débito real total de origen.
- converted_source: principal efectivamente cambiado.
- destination_gross y destination_net_credit.
- executed_rate, fecha, estado y evidencia.

Para misma moneda sin conversión: “salieron 100 y llegaron 97” permite proponer fee=3, pero confirmar que no hubo retención ni crédito parcial. Nunca asumir una comisión negativa cuando llega más; aclarar bono, devolución o error.

Ejemplos:
| Caso | Débito origen | Principal cambiado/transferido | Neto destino | Fee |
| --- | ---: | ---: | ---: | ---: |
| 100 USD, 3 USD descontados en origen | 100 USD | 97 USD | 97 USD | 3 USD |
| Enviar 100 USD y pagar 3 USD adicionales | 103 USD | 100 USD | 100 USD | 3 USD |
| Enviar 100 USD, 2% descontado sobre 100 | 100 USD | 98 USD | 98 USD | 2 USD |
| Cambiar 100 USD a 40 VES/USD, fee destino 40 VES | 100 USD | 100 USD | 3.960 VES | 40 VES |

Porcentaje: conservar base, tasa porcentual y política de redondeo. Si solo se conoce débito total 102 USD con comisión adicional de 2%, calcular principal=102/1,02=100 solo cuando esa base está confirmada. Si el mensaje es ambiguo, solicitar base; no adivinar.

El fee tiene una única línea contable expense por cargo. Su tabla descriptiva referencia esa línea y no genera un gasto adicional. Varias comisiones se modelan como filas distintas con monedas/pagadores explícitos.

## 5. Conversión y costo frente a referencia
No restar USD a USDT ni VES a USD. Si se conocen ambas cantidades pero no comisión, calcular tasa neta observada; no deducir cuánto fue fee y cuánto fue spread.

Ejemplo ficticio: 100 USD cambian a 3.900 VES sin fee conocido; referencia 40 VES/USD. Diferencia estimada = 4.000−3.900=100 VES. Etiqueta: “Diferencia frente a referencia”; no “comisión cobrada”.

Si hay fee de destino conocido, comparar la tasa de referencia con destination_gross para aislar el efecto cambiario; mostrar la comisión por separado. Nunca sumar fee a una diferencia neta que ya lo contiene.

Comparación de costo total en un tramo, solo con cotizaciones compatibles:
valor de todos los débitos reales en moneda de comparación − valor del crédito neto recibido.
Separar comisión explícita y diferencia residual estimada. Una diferencia negativa es favorable, no una pérdida. Si falta cotización, mostrar costo conocido y parte no valorada.

## 6. Recorridos
Tramos enlazados en orden mediante journey_id y sequence. Un recorrido puede quedar incompleto. No deducir el siguiente tramo únicamente por coincidencia temporal o importe.

Ejemplo: Efectivo USD → Kontigo USD → Binance USDT → Banco VES.
Cada tramo conserva sus activos reales. Agrupar comisiones convertidas con snapshots compatibles; mostrar las no convertibles aparte. No sumar brutos entre monedas.

En MVP, cada tramo pertenece como máximo a un recorrido. Transferencias parciales se identifican con monto asignado; no afirmar trazabilidad de cada unidad al mezclar fondos. Ramificaciones/fusiones automáticas y atribución de lotes quedan fuera del MVP.

## 7. Estados
Borrador: draft → needs_clarification → ready → posted; también cancelled o expired antes de publicar.
Operación financiera: posted; un reverso es otra operación publicada con reverses_operation_id. La original conserva estado posted y puede exponer is_reversed derivado.

Transferencias en tránsito: primera versión las conserva como borradores sin impacto de saldo, con advertencia visible. Si se necesita reflejar un débito real antes de la llegada, implementar primero un bolsillo “En tránsito” y dos operaciones conciliables; no descontar solo una mitad de una operación supuestamente atómica.

## 8. Corrección y conciliación
Reversar significa copiar todas las líneas con signo opuesto, referenciar el original y publicar una sola vez. Los reportes suman original+reverso; no excluyen la original dejando el reverso aislado.
Corregir: reverso y nueva operación en la misma unidad de trabajo, con motivo.
Conciliar: registrar diferencia como adjustment con contrapartida equity:adjustment, nunca ingreso/gasto silencioso.
Permitir saldo negativo con advertencia en el MVP, porque es un registro personal y puede faltar historial. No se usa como autorización para gastar dinero real.

## 9. Presupuestos, metas y recurrentes
Presupuesto por categoría, mes local y activo o moneda de presentación con snapshots. Gastos sin tasa se muestran como pendientes de valorar. Transferencias no consumen presupuesto; comisiones consumen su categoría una vez. Reembolsos enlazados reducen gasto de categoría, no crean ingreso ordinario.
Metas: aportes virtuales no modifican saldo; una transferencia real hacia una cuenta-meta sí pasa por Ledger.
Recurrentes: generan borradores mediante clave regla+fecha local; no implican que se haya cobrado. Confirmación registra el gasto real.

## 10. Invariantes
Un propietario por operación; bolsillos del mismo espacio; activos compatibles; comisión no negativa; origen y destino distintos; al menos dos líneas por operación; balance por activo; confirmación vigente; idempotencia; reverso único; redondeo reproducible; fechas y tasas conservadas; categorías archivables sin destruir historial.

