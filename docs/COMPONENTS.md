# Biyu — Especificación funcional y técnica de componentes

Versión: 1.0 · Fecha: 8 de noviembre de 2026  
Proyecto: FinanceApp / Biyu  
Documento complementario: [UI_UX.md](UI_UX.md)

## 1. Objetivo y alcance abierto

Construir una aplicación de finanzas personales que permita administrar múltiples cuentas y monedas, registrar operaciones desde la app y WhatsApp, seguir recorridos de dinero y conocer sus costos. Debe funcionar desde una PWA orientada a iOS y seguir siendo utilizable cuando WhatsApp no esté disponible.

**Los componentes de este documento son la base mínima acordada, no los únicos que deben implementarse. El equipo o agente debe identificar e implementar funcionalidades, componentes y mejoras adicionales cuando resulten útiles, manteniendo las reglas financieras, la experiencia y las restricciones del proyecto.**

No omitir una mejora necesaria porque no figure en el inventario. Implementar las ampliaciones compatibles con el alcance autorizado y documentarlas con su necesidad, comportamiento, datos y validación. Evitar duplicaciones, complejidad innecesaria y servicios de pago obligatorios. Cambios sustanciales de alcance, nuevos costos o acciones irreversibles requieren la decisión correspondiente del usuario; las mejoras rutinarias compatibles no deben bloquearse con aprobaciones innecesarias.

Este es un contrato de comportamiento para desarrollo; no una declaración de funcionalidades ya implementadas.

## 2. Contexto y arquitectura de partida

| Capa | Dirección acordada | Condición |
| --- | --- | --- |
| Interfaz | Vue + TypeScript + Ionic/Vite | PWA responsive, prioridad iPhone |
| Aplicación y API | Cloudflare Workers + Static Assets; API TypeScript | Validar límites y configuración antes de desplegar |
| Datos | Cloudflare D1 | Migraciones, restricciones y escrituras atómicas |
| Acceso | Cloudflare Access como opción inicial de acceso privado | Validar compatibilidad con PWA y separar autenticación del conector |
| Persistencia local | Cola de borradores y operaciones pendientes | Sincronización al abrir o recuperar conexión |
| WhatsApp | Adaptador WAHA separado | Viabilidad, capacidades, condiciones de uso y alojamiento pendientes de validar |
| Alojamiento del conector | Oracle Always Free como candidato previamente planteado | No dar disponibilidad ni continuidad por garantizadas |
| Voz | Adaptador de transcripción; Workers AI Whisper como candidato | Validar modelo disponible, cuota gratuita y formato de audio |
| Tasas | Adaptador para referencias BCV USD/VES y EUR/VES | Fuente/API concreta pendiente de validar |

El requisito de producto es cero pagos obligatorios por alojamiento, mensajes o transcripción dentro de la solución validada. No prometer recursos ilimitados ni gratuidad perpetua de terceros. Al agotarse una cuota, degradar la función de forma explícita y mantener registro manual o por texto; nunca activar cobros automáticamente.

Las integraciones deben poder sustituirse sin reescribir el motor financiero. No incorporar dependencias externas solo por conveniencia si añaden costo o mantenimiento injustificado. Leer las instrucciones y estructura existentes del repositorio antes de modificarlo.

## 3. Reglas financieras obligatorias

1. Las transferencias entre cuentas propias no son ingresos ni gastos de consumo. Sus comisiones sí representan un gasto.
2. USD, EUR, VES y USDT son activos distintos. No asumir equivalencia automática entre USD y USDT.
3. Los saldos se derivan de movimientos y ajustes trazables. Un saldo almacenado como caché debe ser reconstruible y reconciliable.
4. Representar importes con enteros en unidades mínimas y escala explícita por activo, o con decimales exactos. No usar coma flotante binaria para cálculos monetarios. Definir límites y transporte serializado sin pérdida de precisión.
5. Conservar importes originales, tasa aplicada, fuente, vigencia y redondeo de cada operación. Las tasas nuevas no reescriben el pasado.
6. No sumar monedas diferentes sin conversión explícita y documentada. Si falta una referencia, indicar qué activos quedan fuera del total.
7. Registrar conjuntamente los efectos de una operación. Un fallo no puede descontar de origen sin registrar el destino o la cuenta de tránsito correspondiente.
8. Usar claves de idempotencia y restricciones de unicidad para impedir duplicados por doble clic, reintentos, sincronización o mensajes repetidos.
9. Diferenciar comisión explícita, comisión inferida pendiente de confirmar y diferencia respecto a una referencia cambiaria. No contar dos veces el mismo costo.
10. Las correcciones de operaciones confirmadas deben preservar historia y recalcular efectos mediante reversión o mecanismo equivalente auditable. Los borradores pueden editarse antes de contabilizarse.
11. Los saldos iniciales y ajustes de conciliación no se incluyen automáticamente en ingresos o gastos ordinarios.
12. El dinero en tránsito forma parte del patrimonio cuando sigue siendo del usuario, pero no del saldo disponible de destino. Evitar contabilizarlo simultáneamente en ambos lugares.
13. Guardar fecha efectiva de la operación separada de fecha de creación y sincronización. Agrupar días y meses según la zona horaria del usuario, inicialmente America/Caracas.
14. Autenticar y autorizar en servidor cada acceso; el identificador enviado por el cliente no basta para probar propiedad.

## 4. Componentes de producto

### C01. Estructura, preferencias y configuración inicial

**Objetivo:** ofrecer navegación consistente y una configuración breve que permita registrar el primer movimiento.

Implementar Inicio, Movimientos, Planificación y Cuentas, botón `+`, configuración de idioma, zona horaria, moneda de visualización, tema y ocultación de saldos. El primer uso debe permitir crear una cuenta y registrar un saldo inicial; distinguir apertura de ingreso.

Persistir preferencias sin depender únicamente del dispositivo. Los secretos y credenciales no pertenecen a preferencias públicas. Componentes sugeridos: `AppShell`, `BottomNav`, `SideNav`, `PrivacyToggle` y `ThemeSelector`.

**Aceptación:** el primer saldo se crea sin inflar ingresos; las preferencias se conservan; volver desde un detalle mantiene el contexto de navegación.

### C02. Resumen financiero

**Objetivo:** responder cuánto hay, cuánto está disponible y qué necesita atención.

Mostrar patrimonio estimado, disponible, dinero en tránsito, ingresos, gastos, resultado del período, costos de mover dinero, cuentas favoritas, pendientes y actividad reciente. Cada indicador debe abrir el detalle que lo sustenta con los mismos filtros.

Implementar consultas de resumen desde el motor compartido. Separar flujos reales de variaciones de valoración por tipo de cambio. La disponibilidad debe aclarar si descuenta reservas para metas. Evitar que los ajustes de saldo parezcan ingresos ordinarios.

**Aceptación:** transferir entre cuentas propias no altera ingresos/gastos salvo comisiones; los totales coinciden con su detalle; faltantes de tasas quedan visibles.

### C03. Cuentas y billeteras

**Objetivo:** representar dónde está el dinero.

Datos mínimos: identificador, propietario, nombre, tipo, institución opcional, activo/moneda, precisión, estado, icono/color, favorito y fecha de apertura. Una institución puede agrupar varios saldos por moneda. No atribuir automáticamente a Kontigo o a otra plataforma una moneda no confirmada por el usuario.

Permitir crear, editar metadatos, archivar, consultar historial y conciliar. Impedir cambios de moneda que reinterpreten movimientos existentes. Archivar no elimina historia; definir el tratamiento de cuentas archivadas con saldo y pendientes.

Conciliar significa comparar saldo calculado con saldo real a una fecha de corte y proponer un ajuste con motivo. Antes de ajustar, mostrar operaciones pendientes que podrían explicar la diferencia.

**Aceptación:** una cuenta archivada conserva sus movimientos; el saldo es reconstruible; los ajustes no se confunden con consumo o salario.

### C04. Registro rápido de operaciones

**Objetivo:** registrar gasto, ingreso, transferencia y ajuste con el menor número de pasos razonable.

Datos comunes: ID, tipo, fecha efectiva, origen del registro, cuenta, importe, activo, categoría cuando aplique, nota, etiquetas y estado. Categoría y fecha pueden tener valores sugeridos; nunca inventar una cuenta o importe faltante.

Compartir esquemas de validación entre interfaz y API, repitiendo en servidor las validaciones autoritativas. El formulario conserva valores ante un error y muestra un estado local pendiente cuando no hay confirmación del servidor.

**Aceptación:** doble pulsación y reintento generan una sola operación; el usuario distingue borrador local y operación contabilizada; los importes se almacenan sin pérdida de precisión.

### C05. Transferencias, conversiones y recorridos

**Objetivo:** seguir operaciones como Efectivo USD → Kontigo → Binance USDT → Banco VES, sin duplicar ingresos ni ocultar costos.

Separar tres entidades: operación financiera, tramo de transferencia y recorrido que relaciona varios tramos. Un recorrido puede quedar parcialmente ejecutado. Permitir vincular tramos creados por separado y registrar importes parciales sin afirmar que consumen todo el saldo de la cuenta intermedia.

Datos mínimos por tramo:

- Cuenta de origen y destino; activos y cantidades originales.
- Importe enviado, total descontado e importe recibido.
- Una o varias comisiones: importe, activo, cuenta de cobro y modalidad.
- Modalidad de comisión: descontada del envío, adicional o cobrada en otra cuenta/activo.
- Tasa aplicada, dirección de cotización, referencia comparativa opcional y fechas.
- Estado, referencias externas, vínculo al recorrido y motivo de cancelación/reversión.

Estados orientativos: borrador → pendiente → en tránsito → completada. Cancelar un borrador no produce asientos. Si ya salió dinero, cerrar/cancelar debe reflejar su devolución, reversión o situación real; nunca borrar el descuento sin evidencia. Registrar rechazos y fallos recuperables por separado del estado financiero.

**Ejemplo A, misma moneda:** salen 100 USD y llegan 97 USD. Proponer 3 USD de comisión descontada, confirmar que no hay pago parcial ni otra explicación. La operación reduce origen en 100, incrementa destino en 97 y registra un gasto de 3 asociado al mismo traslado, sin descontarlo otra vez.

**Ejemplo B, comisión adicional:** se transfieren 100 USD y se cobra 2 % sobre el importe enviado. Salen 102 USD, llegan 100 USD y el gasto es 2 USD, si esa base y modalidad están confirmadas.

**Ejemplo C, conversión:** salen 100 USD y llegan 5.000 VES. Son cifras ilustrativas, no una tasa vigente. La relación neta es 50 VES/USD. Esa relación por sí sola no identifica comisión ni margen cambiario; pedir o conservar por separado los datos necesarios.

El costo del recorrido debe mostrar comisiones por activo y, cuando existan tasas suficientes, su equivalencia en la moneda elegida. Distinguir tasa efectiva neta de tasa aplicada antes de cargos. Una comparación con BCV debe explicitar fórmula, dirección, fecha y conceptos incluidos para no sumar de nuevo una comisión ya contenida en la tasa neta.

**Aceptación:** probar comisión descontada, adicional y en tercera moneda; transferencia parcial y en tránsito; recorrido multimoneda; reversión; reintentos y redondeos. En cada caso, el patrimonio y los costos deben reconciliarse con los movimientos.

### C06. Historial, búsqueda, detalle y correcciones

**Objetivo:** encontrar y entender cualquier operación.

Lista agrupada por fecha con búsqueda, paginación y filtros de cuenta, activo, categoría, tipo, período, estado y origen app/WhatsApp. El detalle muestra importes originales, tasa, costos, notas, recorrido y auditoría.

Usar índices adecuados y consultas paginadas; no descargar todo el historial para filtrar en el dispositivo. Tratar correcciones concurrentes con versión de registro y conflictos explícitos. Ofrecer anulación trazable y control de cambios.

**Aceptación:** filtros y resumen coinciden; la corrección actualiza saldos y reportes; el historial permite reconstruir qué cambió.

### C07. Categorías, etiquetas y reglas

**Objetivo:** adaptar la clasificación al usuario.

Categorías y subcategorías opcionales con nombre, tipo de uso, icono, color y orden. Etiquetas independientes para contextos como Casa, Viaje o Trabajo. Archivar categorías usadas o permitir una reasignación explícita preservando trazabilidad.

Reglas por texto, comercio, cuenta u otros campos disponibles, con prioridad y modo sugerir/aplicar. Evitar ciclos en jerarquías y reglas contradictorias silenciosas. Una plataforma financiera es una cuenta/institución, no una categoría de gasto por defecto.

**Aceptación:** las categorías personalizadas están disponibles en app y WhatsApp; cambiar su nombre no rompe relaciones; las reglas se pueden explicar y desactivar.

### C08. Tasas y conversor

**Objetivo:** consultar referencias y preservar la valoración histórica.

Crear un adaptador sustituible para USD/VES y EUR/VES de referencia BCV. Registrar origen real del dato y distinguir un proveedor intermediario de una API oficial. Validar fuente y condiciones antes de integrar; no inventar endpoints.

Guardar par y dirección de cotización, valor decimal exacto, vigencia, consulta, proveedor y estado de validación. Consultar desde servidor y compartir caché entre usuarios cuando corresponda. Conservar el último dato válido ante fallos, con aviso de antigüedad y sin sobrescribirlo con respuestas inválidas.

Permitir tasa manual identificada y tasa real por operación. La actualización global no modifica movimientos históricos. La conversión de USDT requiere una referencia o relación explícita, no heredar automáticamente USD.

**Aceptación:** una caída de proveedor no impide registrar con tasa manual; el usuario ve fuente y fechas; las operaciones pasadas permanecen iguales tras actualizar referencias.

### C09. Presupuestos

**Objetivo:** controlar gasto por categoría y período.

Definir importe, moneda, período, categorías incluidas y tratamiento de comisiones. Mostrar consumido y restante. Las transferencias propias y ajustes quedan fuera del consumo ordinario. Definir tratamiento de reembolsos parciales para evitar inflar ingresos y gasto simultáneamente.

Para gastos en otras monedas, fijar una política estable de conversión y conservar su base; no recalcular el consumo histórico con cada tasa nueva sin que el usuario haya elegido ese criterio.

**Aceptación:** gasto, comisión incluida/excluida y reembolso afectan el presupuesto según reglas visibles; los límites nunca suman monedas directamente.

### C10. Pagos recurrentes

**Objetivo:** anticipar obligaciones sin registrar pagos inexistentes.

Definir frecuencia, zona horaria, próximo vencimiento, importe conocido o estimado, cuenta y categoría sugeridas. Generar ocurrencias pendientes con identificador único; soportar confirmar pago, omitir, reprogramar o pausar. Definir fin de mes para fechas como el día 31.

Una confirmación de pago crea o vincula una operación; repetir la acción no crea otra. Los recordatorios externos solo se activan si el usuario los configura y la integración lo permite dentro de las restricciones.

**Aceptación:** el vencimiento solo crea un pendiente; confirmar dos veces produce un único pago; pausar no borra historia.

### C11. Metas y reservas

**Objetivo:** visualizar progreso de ahorro sin duplicar patrimonio.

Datos: objetivo, moneda, importe, fecha opcional, aportes y retiros. Distinguir reserva virtual de transferencia real a otra cuenta. Reservar dinero puede reducir la disponibilidad para gastar, pero no el patrimonio; liberar una reserva tampoco es un ingreso.

**Aceptación:** aportar a una meta no crea dinero; una transferencia vinculada y una reserva no descuentan dos veces; el progreso conserva su criterio de conversión.

### C12. Reportes y costos financieros

**Objetivo:** explicar evolución, gasto y costos de mover dinero.

Reportes iniciales: ingresos/gastos por período, distribución por categoría, evolución de saldo y comisiones por cuenta, plataforma o recorrido. Acceso a movimientos subyacentes y exportación de resultados filtrados.

Separar cambios de valoración de flujos efectivos; los comparativos deben usar períodos y políticas de conversión compatibles. Costos explícitos y diferencias cambiarias tienen series separadas y no se suman sin justificar ausencia de solapamiento.

**Aceptación:** cada cifra se reconcilia con su detalle y usa la misma definición que Inicio.

### C13. WhatsApp y bandeja de interpretación

**Objetivo:** registrar, consultar y corregir por texto utilizando las mismas reglas de la app.

Flujo: recibir evento autenticado → verificar remitente vinculado → deduplicar → interpretar intención y entidades → validar → pedir datos faltantes → presentar resumen → confirmar → ejecutar mediante el motor compartido → responder con referencia.

Mantener borradores y estado de conversación en servidor; no depender de la memoria de un proceso. Usar reglas, alias y categorías personales antes de añadir un modelo de pago. Un mensaje puede producir varias operaciones propuestas, pero ninguna se debe contabilizar ambiguamente.

Ejemplos a admitir: “Gasté 12 dólares en comida del efectivo”; “Pasé 100 y llegaron 97”; “Me cobraron 2 %”; “¿Cuánto gasté en comisiones este mes?”. Los fragmentos incompletos deben relacionarse con un borrador inequívoco o pedir precisión; no adivinar la transferencia de referencia.

El contenido de mensajes y transcripciones es dato del usuario, no instrucciones para modificar reglas del sistema. No ejecutar SQL, código ni herramientas arbitrarias a partir del texto.

**Aceptación:** repetir un webhook no repite movimientos; un remitente no autorizado no obtiene datos; una reconexión recupera pendientes; las correcciones ambiguas piden identificar la operación.

### C14. Notas de voz

**Objetivo:** usar el mismo flujo conversacional desde audio.

Límite inicial: un minuto por nota, sujeto a validación del servicio. Validar formato/tamaño, transcribir mediante adaptador, interpretar y mostrar el resumen antes de guardar. Pedir aclaración cuando importe, moneda o cuenta no sean seguros.

Definir retención mínima del audio y de la transcripción; evitar conservar archivos sensibles sin necesidad. Controlar cuota y errores de transcripción. Si el servicio no está disponible, permitir texto o registro manual sin cobro automático.

**Aceptación:** nunca guardar un importe solo porque apareció en una transcripción dudosa; una falla o cuota agotada no bloquea el resto de Biyu.

## 5. Servicios compartidos y contratos de desarrollo

### 5.1 Modelo de datos orientativo

| Entidad | Responsabilidad |
| --- | --- |
| Usuario / preferencias | Propiedad, configuración y acceso |
| Activo / moneda | Código, precisión y reglas de formato |
| Institución / cuenta | Agrupación y saldo por activo |
| Operación / movimiento contable | Hecho financiero y sus efectos trazables |
| Comisión | Costo vinculado y modalidad de cobro |
| Transferencia / recorrido | Tramos, estados y relaciones |
| Categoría / etiqueta / regla | Clasificación personal |
| Tasa | Referencia, dirección, vigencia y procedencia |
| Presupuesto / meta / aporte | Planificación y reservas |
| Regla recurrente / ocurrencia | Calendario y pagos pendientes |
| Mensaje / borrador / confirmación | Entrada por WhatsApp y voz |
| Registro de sincronización | Idempotencia, versiones y reintentos |
| Auditoría | Autor, origen, fecha y cambio aplicado |

Implementar claves foráneas, unicidad, índices y migraciones. El esquema exacto puede evolucionar; no fusionar entidades cuando ello impida explicar importes o estados. Si se adopta doble partida, definir el balance por activo y el tratamiento explícito de conversión; no equilibrar asientos sumando USD y VES.

### 5.2 Motor financiero y API

Separar presentación, casos de uso, reglas financieras y adaptadores externos. App y WhatsApp ejecutan los mismos casos de uso: crear operación, completar transferencia, revertir, conciliar, consultar saldo y generar resumen.

La API debe ofrecer recursos para cuentas, operaciones, recorridos, categorías, tasas, presupuestos, recurrentes, metas, reportes, sincronización y exportación. Nombres/rutas finales se adaptan al repositorio. Usar contratos tipados, validación de entrada, errores estables y autorización por propietario.

Las mutaciones reciben clave de idempotencia; las actualizaciones sensibles incluyen versión esperada. Proteger las escrituras compuestas mediante transacciones o lotes atómicos soportados por D1, restricciones y comprobaciones de negocio. Un UPDATE que afecte cero filas debe tratarse según el contrato, no asumirse exitoso por no producir error SQL.

### 5.3 Funcionamiento sin conexión y sincronización

Guardar borradores y cola local en almacenamiento apropiado como IndexedDB, con identificación por usuario. Mostrar saldos confirmados separados de efectos pendientes estimados. Generar IDs persistentes antes de enviar y reutilizarlos en reintentos.

Sincronizar al abrir, recuperar conexión o por acción explícita; no depender de tareas de fondo de iOS. Procesar dependencias: una operación no se envía antes de crear su cuenta. Gestionar conflictos con versión y revisión, sin sobrescribir movimientos financieros silenciosamente. Identificar cambios de sesión para no mezclar datos locales de usuarios.

El servidor valida nuevamente todo. Los datos pendientes pueden perderse si se borra el almacenamiento del dispositivo; informar esa condición en la ayuda y ofrecer recuperación/exportación cuando sea razonable.

### 5.4 Seguridad, auditoría y observabilidad

Autenticación real, autorización en servidor, secretos fuera del frontend, validación de webhooks, mínimos privilegios y separación entre acceso humano y credenciales del conector. Limitar intentos y tamaño de entradas; evitar secretos, audios e información financiera completa en logs.

Registrar fallos con identificadores de correlación y métricas útiles: sincronizaciones pendientes, duplicados bloqueados, errores de tasas y desconexiones. El usuario ve mensajes comprensibles, no detalles internos sensibles.

### 5.5 Exportación, respaldo y restauración

Ofrecer exportación legible de movimientos y respaldo completo versionado con relaciones, activos, tasas históricas, reglas, preferencias y operaciones. Excluir secretos. Exportación CSV no equivale a respaldo completo.

Validar esquema e integridad antes de restaurar. Presentar vista previa, política explícita de reemplazo/fusión, detección de IDs duplicados y copia previa cuando corresponda. Mantener la operación atómica o recuperable. Probar una restauración real con datos de prueba antes de dar la función por terminada.

## 6. Ampliaciones útiles que deben evaluarse durante el desarrollo

Este inventario también es abierto. Implementar las que resuelvan necesidades observadas y encajen en el alcance; documentar el motivo de posponer las que requieran decisiones o dependencias adicionales.

| Mejora | Utilidad y criterio |
| --- | --- |
| Reembolsos parciales o totales vinculados | Corregir gasto neto y presupuestos sin fingir ingresos nuevos |
| División de un gasto entre categorías | Representar compras mixtas conservando el total original |
| Conciliación asistida | Localizar faltantes antes de crear un ajuste |
| Importación CSV con vista previa | Incorporar historia con mapeo de columnas y detección de duplicados |
| Favoritos y plantillas | Reducir pasos de operaciones frecuentes sin ejecutarlas automáticamente |
| Deudas por pagar/cobrar | Registrar obligaciones y pagos sin confundir principal e intereses; ampliar patrimonio explícitamente |
| Adjuntos de comprobantes | Aportar evidencia si existe almacenamiento viable dentro del costo permitido |
| Centro de pendientes | Reunir sincronización, borradores, transferencias y pagos que requieren acción |

Las extensiones no pueden alterar silenciosamente las definiciones de saldo, gasto o comisión. Si agregan obligaciones o activos nuevos, actualizar también los totales, reportes, respaldo y documentación.

## 7. Secuencia de implementación

1. Leer instrucciones, revisar proyecto y establecer modelo financiero, identidad y tokens.
2. Implementar acceso, cuentas, activos, aperturas y registro básico.
3. Completar transferencias, comisiones, tránsito, recorridos, historial y correcciones.
4. Construir Inicio, tasas y reportes sobre el motor validado.
5. Incorporar presupuestos, recurrentes, metas, respaldo y restauración.
6. Completar cola offline, sincronización y conflictos; diseñarlos desde las etapas iniciales para no rehacer IDs y contratos.
7. Integrar WhatsApp por texto; validar conector y alojamiento antes de anunciar disponibilidad.
8. Incorporar voz, controles de cuota y mejoras adicionales útiles.

Trabajar por entregas funcionales. No presentar botones sin comportamiento como componentes terminados. Cada etapa debe dejar claros los pendientes y limitaciones reales.

## 8. Verificación y definición de terminado

Pruebas unitarias para reglas financieras, integración para atomicidad/idempotencia/autorización y pruebas de usuario para flujos críticos. Evitar pruebas que solo copien la implementación; comprobar resultados financieros y recuperación ante fallos.

Casos mínimos:

- Apertura + ingreso + gasto + ajuste producen saldos e indicadores esperados.
- Transferencias de la misma moneda y entre monedas conservan los efectos correctos.
- Comisiones descontadas, adicionales y desde otra cuenta no se descuentan dos veces.
- Salida en tránsito y recepción posterior no duplican patrimonio.
- Fallo de una escritura compuesta no deja saldos parciales.
- Repetición de solicitud, webhook o sincronización no duplica operaciones.
- Corrección/reversión preserva historia y actualiza reportes.
- Cambiar la tasa de referencia no reescribe el pasado.
- Falta de tasa excluye explícitamente el importe del total convertido.
- Vencimientos no generan pagos hasta su confirmación.
- Reservas y metas no crean ni destruyen patrimonio.
- Usuario o remitente ajeno no consulta ni modifica datos.
- Restaurar un respaldo de prueba reconstruye relaciones y saldos.
- Interfaz usable en móvil y escritorio, claro/oscuro, con estados offline y errores.

Para cada componente entregado documentar qué se implementó, cómo se comprobó, qué dependencias se validaron y qué queda pendiente. Mantener sincronizada esta especificación con la guía visual y registrar las ampliaciones.

## 9. Referencias técnicas de partida

Estas referencias documentan las tecnologías planteadas; no reemplazan la validación de condiciones, cuotas y capacidades al implementar.

- Ionic Vue: https://ionicframework.com/docs/vue/overview
- D1 Database API: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Workers AI, condiciones de uso y precios: https://developers.cloudflare.com/workers-ai/platform/pricing/

## 10. Historial de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0 | 2026-11-08 | Especificación inicial, reglas financieras, componentes ampliables, servicios compartidos y criterios de validación. |
