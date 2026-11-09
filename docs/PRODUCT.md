# Biyu — Producto

Versión: 1.1 · Fecha: 8 de noviembre de 2026 · Proyecto: FinanceApp / Biyu
Estado: requisitos para iniciar el desarrollo. No describe funciones ya implementadas.

> Autoridad: los requisitos explícitos del usuario prevalecen. Este documento define **qué** debe hacer Biyu y **por qué**. Los cálculos los gobierna [DOMAIN.md](DOMAIN.md), la integridad [DATABASE.md](DATABASE.md), los contratos [API.md](API.md) y los límites entre módulos [ARCHITECTURE.md](ARCHITECTURE.md). Si este documento contradice a DOMAIN en un cálculo, prevalece DOMAIN y se corrige este.

---

## 1. Visión

**Registrar tu dinero debe ser fácil y entenderlo debe ser inmediato.**

Biyu es una app **privada** de finanzas personales, para el uso diario en Venezuela, en móvil y escritorio. Maneja varias monedas a la vez, sigue el dinero que pasa por varias plataformas (efectivo, Kontigo, Binance, bancos en Bs.) e identifica cuánto cuesta cada movimiento. Se usa desde una PWA y desde WhatsApp.

### Preguntas que Biyu responde

1. ¿Cuánto dinero tengo y dónde está?
2. ¿Cuánto tengo disponible para gastar?
3. ¿En qué estoy gastando?
4. ¿Qué tengo pendiente por pagar, cobrar o confirmar?
5. ¿Cómo van mis ahorros?
6. **¿Cuánto me cuesta mover mi dinero?**

### Canales

| Canal | Rol |
| --- | --- |
| PWA (móvil prioridad iPhone, también escritorio) | Canal principal y completo. Funciona aunque WhatsApp no esté disponible. |
| WhatsApp (texto) | Otra entrada al mismo motor: registrar, consultar y corregir. |
| WhatsApp (voz) | Etapa posterior; mismo flujo tras transcribir. |

Todo lo registrado por cualquier canal aparece en un único historial.

---

## 2. Usuario y contexto

**Primera versión: un propietario, un espacio personal.** El modelo de datos queda preparado para aislar futuros propietarios, pero no hay colaboración familiar ni cuentas compartidas en el MVP.

Situación típica del usuario:
- Cobra en dólares en efectivo y gasta en bolívares.
- Mueve dinero: efectivo → Kontigo → Binance (USDT) → banco en Bs.
- Paga comisiones, recargos o diferencias de cambio en cada paso y quiere saber cuánto suman.
- Usa la tasa BCV como referencia diaria.
- Quiere registrar rápido, a menudo desde WhatsApp.

### Recorrido de referencia

```
Sueldo en efectivo USD → Kontigo → Binance USDT → Banco VES
      INGRESO            TRAMO        TRAMO          TRAMO
                       + comisión   + comisión    + comisión / cambio
```

- El cobro del sueldo es un **ingreso, una sola vez**.
- Cada paso posterior es un **tramo de transferencia**: no es ingreso ni gasto.
- Cada **comisión** es un **gasto** de *Costos financieros*.
- El **recorrido** agrupa los tramos; no representa dinero adicional.
- La marca de una cuenta no determina su activo: Biyu no asume qué moneda maneja Kontigo u otra plataforma sin que el usuario lo indique.

---

## 3. Restricciones de producto

| Restricción | Detalle |
| --- | --- |
| Costo cero | Ningún pago obligatorio por alojamiento, mensajes, IA o transcripción en la solución validada. Si se agota una cuota, la función se degrada de forma explícita; nunca se activan cobros automáticamente. Su viabilidad completa aún debe comprobarse ([adr/0001](../adr/0001-BASE-TECNICA.md)). |
| Privacidad | Acceso privado; sin exponer datos financieros en registros, notificaciones o logs. Opción para ocultar saldos. |
| Solo registro | Biyu **registra**; no ejecuta pagos ni transferencias reales ni se conecta a bancos. |
| Idioma y zona | Español (`es-VE`); zona horaria inicial `America/Caracas`, configurable. |
| Moneda de presentación | USD por defecto, configurable. Los importes originales se conservan siempre. |
| Activos iniciales | USD, EUR, VES, USDT. USD y USDT siempre separados. |
| Offline | Consulta limitada y borradores locales; el servidor confirma la contabilización ([OFFLINE_SYNC.md](OFFLINE_SYNC.md)). |

---

## 4. Reglas de producto (no negociables)

Expresión en lenguaje de producto de las reglas de [DOMAIN.md](DOMAIN.md) y [COMPONENTS.md §3](COMPONENTS.md).

| # | Regla |
| --- | --- |
| R1 | Una transferencia entre cuentas propias **no es ingreso ni gasto**. Su comisión **sí es un gasto** y se cuenta una sola vez. |
| R2 | El **saldo inicial** y los **ajustes de conciliación** no son ingresos ni gastos ordinarios. |
| R3 | Un **pago programado** o recurrente no cambia saldos hasta que se confirma como pagado. |
| R4 | **Reservar dinero para una meta no es gastarlo.** Reduce el disponible, no el patrimonio. |
| R5 | Las operaciones confirmadas **no se editan ni se borran**: se corrigen con un **reverso** y una operación nueva, conservando la historia. Saldos y reportes reflejan la corrección. |
| R6 | **Disponible para gastar ≠ patrimonio.** Se explica qué descuenta. |
| R7 | Cada operación conserva **importes, activos, tasa, fuente, vigencia y redondeo originales**. |
| R8 | Una tasa nueva **no reescribe el pasado**. La valoración actual es una vista aparte. |
| R9 | **USD ≠ USDT.** Una relación 1:1 se registra por operación, nunca se asume. |
| R10 | Entre monedas distintas, **la diferencia numérica no demuestra una comisión**. |
| R11 | Una diferencia sin explicar en la misma moneda **se aclara antes de contabilizarse**; nunca se convierte en comisión sin confirmación. |
| R12 | **Fecha de vigencia** y **hora de consulta** de una tasa son datos distintos. |
| R13 | No se suman monedas distintas sin **conversión explícita**. Si falta una tasa, se dice qué queda fuera del total; la ausencia no es cero. |
| R14 | Cada importe se muestra con su moneda. Los estados usan texto e icono, no solo color. |
| R15 | Un **borrador** nunca se presenta como "registrado". Solo lo confirmado por el servidor es definitivo. |
| R16 | Reintentos, doble toque, mensajes repetidos o sincronización **no duplican** operaciones. |
| R17 | Si un dato que afecta saldos falta o es ambiguo, **se pregunta**; no se adivina. |

---

## 5. Funciones del MVP

Cada función remite a su componente en [COMPONENTS.md](COMPONENTS.md), que define datos mínimos y criterios de aceptación.

### 5.1 Configuración inicial y estructura · C01
- Navegación: Inicio · Movimientos · Planificación · Cuentas, con botón `+` siempre accesible.
- Primer uso: crear una cuenta y su saldo inicial (apertura, no ingreso) y registrar el primer movimiento.
- Preferencias: idioma, zona horaria, moneda de presentación, tema claro/oscuro, ocultar saldos.

### 5.2 Cuentas y bolsillos · C03
- **Cuenta**: contenedor reconocible (Efectivo, Kontigo, Binance, Banco X), con tipo, institución opcional, color, icono, favorito.
- **Bolsillo**: saldo de un único activo dentro de una cuenta. Binance puede tener bolsillos USDT y USD.
- Crear, editar metadatos, archivar sin perder historia. No se cambia el activo de un bolsillo con movimientos.
- Saldo original siempre visible; equivalencia opcional con tasa y fecha.
- **Conciliar**: comparar saldo calculado con saldo real a una fecha, mostrar pendientes que puedan explicar la diferencia y proponer un ajuste con motivo.

### 5.3 Registro rápido · C04
- Tipos: gasto, ingreso, transferencia, ajuste.
- Orden: tipo → importe → cuenta → categoría → fecha. Notas, etiquetas y opciones avanzadas se revelan progresivamente.
- La moneda viene del bolsillo y siempre se ve.
- Un gasto inequívoco no requiere segunda confirmación; transferencias complejas o datos inferidos sí muestran resumen.
- Variantes: **pago dividido** entre varios bolsillos y **división en varias categorías**.

### 5.4 Transferencias, comisiones y recorridos · C05

Cada tramo guarda: origen, destino, activos de cada lado, principal enviado, débito total de origen, recibido bruto y neto, comisiones (importe, activo, bolsillo pagador, modalidad), tasa ejecutada, referencia comparativa opcional, fecha, estado, evidencia y recorrido.

**Modalidades de comisión** (DOMAIN §4): descontada en origen, adicional en origen, descontada en destino, cobrada aparte desde otro bolsillo o activo.

**Formas de cálculo:** por diferencia (solo misma moneda y confirmada), porcentaje, monto fijo, porcentaje + fijo. Se conservan base, porcentaje y redondeo.

| Lo que dice el usuario | Débito origen | Neto destino | Comisión |
| --- | ---: | ---: | ---: |
| "Deposité 100 y llegaron 97" (confirmado) | 100 USD | 97 USD | 3 USD |
| "Me descontaron el 3 % de los 100" | 100 USD | 97 USD | 3 USD |
| "Envié 100 y pagué 3 adicionales" | 103 USD | 100 USD | 3 USD |
| "Pasé 100 al 3 %" | — | — | **Ambiguo: se pregunta** |

**Recorridos:** tramos enlazados en orden, mostrados como línea de tiempo. Pueden quedar incompletos. Admiten importes parciales sin afirmar trazabilidad unidad por unidad cuando una cuenta mezcla fondos. Biyu puede **sugerir** vincular tramos; el usuario confirma. Nunca se vincula en silencio.

**Dinero en tránsito:** el dinero que salió y aún no llegó se muestra aparte, no cuenta como disponible y no se cuenta dos veces. Su modelado está en decisión ([adr/0001 D-04](../adr/0001-BASE-TECNICA.md)).

### 5.5 Historial, detalle y correcciones · C06
- Lista agrupada por fecha, paginada, con búsqueda y filtros: cuenta, activo, categoría, etiqueta, tipo, período, estado y origen (app/WhatsApp).
- Una transferencia se ve como **un tramo** (origen → destino) con su comisión, no como movimientos sueltos.
- El detalle muestra importes originales, tasa, costos, notas, recorrido y auditoría.
- **Corregir** = reverso + operación nueva con motivo. **Anular** = reverso.

### 5.6 Categorías, etiquetas y reglas · C07
- Categorías y subcategorías personalizables (nombre, tipo, icono, color, orden), archivables.
- Categoría de sistema **Costos financieros**: Comisión de depósito, de retiro, de transferencia, de cambio, cargo de red, otros cargos.
- Etiquetas libres (Casa, Viaje, Trabajo, Reembolsable).
- Reglas por texto, comercio o cuenta, en modo sugerir o aplicar, explicables y desactivables.
- Una plataforma financiera es una cuenta, no una categoría.

Categorías iniciales sugeridas:
- Gasto: Alimentación, Transporte, Vivienda, Servicios, Salud, Educación, Ocio, Compras, Suscripciones, Costos financieros, Otros.
- Ingreso: Sueldo, Trabajo independiente, Ventas, Otros ingresos.

### 5.7 Tasas BCV y conversor · C08
- Referencia BCV **USD/VES** y **EUR/VES** desde un proveedor sustituible, con origen real del dato (un intermediario no es la API oficial).
- Se muestran: fuente, par, vigencia, última consulta y estado (vigente / último dato disponible / actualización fallida / manual).
- Tasa manual identificada y tasa real por operación.
- Una caída del proveedor no impide registrar.
- USDT requiere su propia referencia o relación explícita.
- Conversor simple entre activos con la tasa indicada.

Detalle en [INTEGRATIONS.md §3](INTEGRATIONS.md).

### 5.8 Inicio · C02
Orden:
1. **Patrimonio estimado** y **disponible para gastar**, con explicación de la diferencia.
2. Dinero en tránsito y reservas, si existen.
3. Ingresos, gastos y resultado del período.
4. **Costo de mover dinero** del período.
5. Cuentas favoritas.
6. Pendientes (borradores, aclaraciones, pagos por confirmar).
7. Actividad reciente y tasa BCV compacta.

Cada indicador abre el detalle que lo sustenta con los mismos filtros. Los totales convertidos indican moneda, referencia y fecha; si faltan tasas se muestra subtotal conocido y activos excluidos.

### 5.9 Presupuestos · C09
- Por categoría, mes local y moneda.
- Consumido, restante y porcentaje.
- Transferencias y ajustes no consumen presupuesto; comisiones consumen su categoría una vez; reembolsos vinculados reducen el gasto.
- Gastos en otra moneda usan una política de conversión estable y visible; los que no tienen tasa aparecen como "pendientes de valorar".

### 5.10 Recurrentes · C10
- Frecuencia, zona horaria, próximo vencimiento, importe conocido o estimado, cuenta y categoría sugeridas.
- El vencimiento genera un **pendiente**, no un pago. Confirmar registra el pago real (importe y cuenta reales). Confirmar dos veces produce un solo pago.
- Omitir, reprogramar, pausar. Regla definida para días 29–31.

### 5.11 Metas y reservas · C11
- Meta con objetivo, moneda, fecha opcional, aportes y retiros.
- Reserva virtual (no mueve saldo, reduce disponible) distinta de transferencia real a una cuenta-meta.
- Liberar una reserva no es un ingreso.

### 5.12 Reportes y "¿Cuánto me cuesta mover mi dinero?" · C12

Reportes iniciales: ingresos/gastos por período, gasto por categoría, evolución de saldo, comisiones por cuenta/plataforma/recorrido. Se abren desde los indicadores de Inicio y desde una sección de reportes; cada cifra lleva a sus movimientos y se puede exportar.

El costo de mover dinero se presenta en **series separadas** que no se suman sin justificar que no se solapan:

| Concepto | Qué es | Etiqueta |
| --- | --- | --- |
| Comisiones | Cargos explícitos o inferidos y confirmados | "Comisiones pagadas" |
| Diferencia frente a referencia | Tasa ejecutada vs. tasa de referencia en la misma fecha | "Diferencia frente a referencia" (no "comisión", no "pérdida") |
| Variación de valoración | Cambio del equivalente de un saldo mantenido | "Variación de valor" |

Se muestran por activo; la suma convertida solo con cotizaciones compatibles, indicando moneda, tasa y fecha. Una diferencia negativa es favorable. Si falta cotización, se muestra el costo conocido y la parte no valorada.

### 5.13 WhatsApp (texto) · C13
- Vínculo verificado entre número y propietario.
- Flujo: recibir → verificar remitente → deduplicar → interpretar → validar → pedir datos faltantes → resumen → **confirmar** → contabilizar con el motor compartido → responder con referencia.
- Comprende sinónimos de comisión ("interés", "recargo", "me quitaron").
- Correcciones y "deshacer" mediante reverso.
- El texto del usuario es dato, nunca instrucción para el sistema.
- La app incluye una bandeja de borradores y confirmaciones pendientes accesible aunque WhatsApp falle.

Detalle en [INTEGRATIONS.md §1](INTEGRATIONS.md).

### 5.14 Seguridad, exportación y respaldo
- Acceso privado y autorización en servidor ([SECURITY_OPERATIONS.md](SECURITY_OPERATIONS.md)).
- Exportación CSV de movimientos filtrados.
- Respaldo completo versionado y restauración validada. Un CSV no es un respaldo.

---

## 6. Disponible para gastar

```
Disponible =  saldos confirmados de bolsillos marcados como disponibles
            − reservas para metas
            − compromisos próximos no pagados que el usuario decida descontar
```

- Se muestra junto al patrimonio, con la explicación de qué descuenta.
- Por activo o consolidado en la moneda de presentación, con tasas indicadas.
- El dinero en tránsito no está disponible en origen ni en destino; aparece aparte.
- Borradores locales no se incluyen; se muestran como pendientes.

---

## 7. Alcance

### Incluido en el MVP
C01–C13 en lo descrito arriba; exportación, respaldo y restauración.

### Ampliaciones a evaluar durante el desarrollo (COMPONENTS §6)
Reembolsos vinculados, división de gastos, conciliación asistida, importación CSV, favoritos y plantillas, centro de pendientes, adjuntos de comprobantes. Se implementan cuando resuelven una necesidad observada y respetan las reglas y el costo cero.

### Etapa posterior
- Notas de voz (C14).
- Deudas por pagar/cobrar y tarjetas de crédito (requieren pasivos en el ledger, [adr/0001 D-06](../adr/0001-BASE-TECNICA.md)).
- Tasas adicionales de referencia (p. ej. P2P USDT/VES).
- Informes comparativos avanzados.
- Lectura de recibos.

### Fuera de alcance
Ejecutar pagos reales, conexiones bancarias automáticas, asesoría de inversión, cálculo fiscal o de ganancias realizadas, colaboración multiusuario.

---

## 8. Indicadores de éxito (uso personal)

- Registrar un gasto simple en menos de 10 segundos en la app o en un mensaje más una confirmación en WhatsApp.
- Al cierre de mes, los saldos concilian con las cuentas reales o la diferencia queda explicada.
- Porcentaje de tramos con comisión identificada frente a diferencias pendientes de aclarar.
- Cero operaciones duplicadas por reintentos o mensajes repetidos.
- Costo mensual de infraestructura: 0.

---

## 9. Decisiones pendientes

Listadas y razonadas en [adr/0001-BASE-TECNICA.md §4](../adr/0001-BASE-TECNICA.md): atomicidad de D1, compatibilidad de Access con la PWA, alojamiento y riesgo de WAHA, proveedor BCV, modelado del dinero en tránsito, diferencias por aclarar, pasivos, IA para interpretar mensajes y transcripción.

---

## 10. Historial

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 0.1 | 2026-11-08 | Primera versión (PRODUCTO.md). |
| 1.1 | 2026-11-08 | Consolidado con DOMAIN, ARCHITECTURE, COMPONENTS y UI_UX: reverso en lugar de edición, comisión como línea de la misma operación, bolsillos, confirmación en WhatsApp, cuatro destinos de navegación, uso privado de un propietario y costo cero. Reemplaza PRODUCTO.md. |
