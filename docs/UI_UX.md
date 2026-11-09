# Biyu — Guía rectora de diseño visual y UI/UX

Versión: 1.0 · Fecha: 8 de noviembre de 2026  
Proyecto: FinanceApp / Biyu  
Documento complementario: [COMPONENTS.md](COMPONENTS.md)

## 1. Propósito y aplicación

Esta guía rige el diseño, las interacciones y la experiencia de Biyu. Está dirigida a desarrolladores, diseñadores y agentes de IA que construyan o modifiquen la aplicación. Leerla completa junto con la especificación de componentes y las instrucciones vigentes del repositorio antes de implementar.

Biyu es una aplicación de finanzas personales adaptada al uso de varias cuentas y monedas, al movimiento de dinero entre efectivo y plataformas y al registro desde la app o WhatsApp. Debe permitir entender rápidamente cuánto dinero hay, dónde está, cómo se utiliza y cuánto cuesta moverlo.

Este documento establece criterios de implementación; no acredita que las funciones ya estén desarrolladas. Los valores visuales concretos propuestos aquí son una base inicial que debe mantenerse centralizada y puede refinarse coherentemente durante el desarrollo.

## 2. Alcance abierto y obligación de mejorar

**Los componentes, pantallas e interacciones descritos NO constituyen una lista exhaustiva ni un límite de implementación.**

El equipo o agente de desarrollo debe identificar e implementar componentes, funciones y mejoras adicionales cuando aporten utilidad real, reduzcan errores, faciliten decisiones o eliminen fricción. No debe limitarse a reproducir literalmente este inventario ni dejar una mejora necesaria sin implementar por no aparecer aquí.

Toda ampliación debe:

- Resolver una necesidad identificable del usuario y tener una ubicación clara en la navegación.
- Reutilizar el sistema visual y los comportamientos existentes.
- Mantener la claridad, accesibilidad y rapidez de las tareas principales.
- Respetar la integridad financiera, privacidad y requisito de operar sin pagos obligatorios.
- Incluir estados, validaciones y comprobaciones proporcionales a su impacto.
- Documentarse en ambos archivos cuando afecte a diseño y comportamiento.

Implementar autónomamente las mejoras compatibles con el alcance autorizado. Consultar únicamente decisiones que introduzcan costos, servicios externos nuevos con consecuencias relevantes, cambios sustanciales de producto o acciones irreversibles. Las mejoras rutinarias de interfaz no requieren una nueva aprobación.

La ampliación debe ser útil y gradual; no convertir cada idea en una pestaña ni añadir indicadores decorativos.

## 3. Principios de experiencia

1. **Comprensión inmediata:** importe, moneda, cuenta y estado deben distinguirse sin abrir varias pantallas.
2. **Captura rápida:** pedir lo indispensable y revelar opciones adicionales cuando hagan falta.
3. **Exactitud comprensible:** explicar conversiones, comisiones y estimaciones con lenguaje cotidiano.
4. **Consistencia:** una misma acción debe comportarse igual en toda la aplicación.
5. **Control:** permitir revisar, corregir y rastrear cambios sin perder historia.
6. **Continuidad:** diferenciar claramente lo guardado, lo pendiente y lo que requiere atención.
7. **Privacidad:** ocultar saldos y evitar exponer información innecesaria.
8. **Accesibilidad:** las acciones deben poder entenderse y ejecutarse con teclado y tecnologías de asistencia.

## 4. Dirección visual

### 4.1 Identidad

Estética minimalista, moderna y cercana. Usar superficies limpias, espacios generosos, jerarquía tipográfica y degradados discretos. Cian y violeta se proponen como acentos iniciales, coherentes con la dirección explorada para la identidad; no se presupone un isotipo definitivo.

- Mantener proporciones, área de seguridad y legibilidad del logo que se adopte.
- No deformar el isotipo ni convertirlo en decoración repetitiva.
- Evitar degradados detrás de importes pequeños o texto extenso.
- El contenido financiero tiene prioridad sobre efectos, ilustraciones y animaciones.

### 4.2 Tokens de color iniciales

Implementar variables semánticas compartidas; no dispersar colores literales por los componentes.

Valores vigentes (v1.1, anexo C). La fuente única en código es `apps/web/src/theme/tokens.css`; esta tabla la resume.

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` | `#F4F7FD` | `#070B17` | Fondo de aplicación |
| `surface` | `#FFFFFF` | `#111933` | Tarjetas y formularios |
| `surface-muted` | `#E9EEF8` | `#1A2444` | Agrupaciones secundarias |
| `surface-glass` | blanco 72 % | `#111933` 72 % | Navegación, barras y tarjetas flotantes con desenfoque |
| `text-primary` | `#0E1730` | `#F3F6FD` | Texto principal |
| `text-secondary` | `#4A5878` | `#A9B6D3` | Metadatos y ayuda |
| `border` | `#D3DCEC` | `#2A3658` | Separadores y contornos |
| `primary` | `#1F4FE0` | `#7AA2FF` | Acción principal, enlaces y foco |
| `primary-contrast` | `#FFFFFF` | `#070B17` | Texto sobre botón principal |
| `accent-cyan` | `#067385` | `#5FE3E8` | Acento secundario |
| `accent-violet` | `#5B35E6` | `#B59CFF` | Acento de marca e insignias |
| `success` | `#167044` | `#6CDEA4` | Resultado satisfactorio |
| `warning` | `#875400` | `#F5CD75` | Atención o pendiente |
| `danger` | `#B4233B` | `#FF9CAE` | Error o acción destructiva |

El degradado de marca (`brand-gradient`: `#00DED8` → `#00AEF5` → `#064AFF` → `#6540FF` → `#A020FF`, tomado del isotipo) se usa en el isotipo, detalles o una tarjeta destacada. El contraste de cada par texto/fondo de esta tabla se comprueba automáticamente (`apps/web/src/theme/tokens.test.ts`); combinaciones nuevas deben añadirse a esa prueba. Definir también estados hover, pressed, focus y disabled, y colores de contenido sobre botones.

Ingresos, gastos y transferencias deben distinguirse mediante texto, icono y signo cuando corresponda, además del color. Una transferencia puede usar el acento principal; no marcarla automáticamente como pérdida.

### 4.3 Tipografía y números

- Base inicial: pila de sistema compatible con iOS y escritorio, sin dependencia obligatoria de fuentes remotas.
- Texto de formularios: 16 px como base; etiquetas y ayuda suficientemente legibles.
- Importes principales: 32–40 px según ancho disponible, sin cortes.
- Encabezados: 20–28 px; texto secundario: 13–14 px.
- Usar cifras tabulares para alinear columnas y reducir saltos visuales.
- Mostrar siempre la moneda cuando exista riesgo de ambigüedad: USD, EUR, VES y USDT.
- Usar formato localizado; aceptar entradas decimales habituales sin interpretar silenciosamente un separador ambiguo.
- No depender solo de `$` para identificar un saldo.
- En vistas compactas se pueden abreviar cantidades, manteniendo el importe exacto accesible.

### 4.4 Espaciado, forma e iconografía

- Escala de espaciado: 4, 8, 12, 16, 24, 32 y 48 px.
- Márgenes de pantalla: 16 px en móvil, ampliables en pantallas mayores.
- Radios iniciales: 12 px en controles, 20 px en tarjetas y 24 px en paneles inferiores.
- Iconos de una sola familia visual, con tamaños y grosor consistentes.
- Usar iconos como apoyo, no como sustituto de etiquetas necesarias.
- Sombras suaves para expresar elevación, no para delimitar todos los elementos.

### 4.5 Glassmorfismo y movimiento

Reservar transparencia y desenfoque para navegación, barra superior o elementos flotantes. Proporcionar fondo opaco alternativo y comprobar el resultado sobre contenido variable. Las tablas, formularios y cifras deben mantener contraste estable.

Transiciones cortas, generalmente de 150–250 ms, orientadas a indicar apertura, cierre o cambio de estado. Respetar reducción de movimiento. Evitar animaciones continuas, rebotes excesivos y conteos de saldo que retrasen la lectura del valor real.

## 5. Arquitectura de información y adaptación

### 5.1 Navegación principal

| Destino | Propósito |
| --- | --- |
| Inicio | Resumen, disponibilidad, pendientes y actividad reciente |
| Movimientos | Búsqueda, filtros e historial completo |
| Planificación | Presupuestos, recurrentes y metas |
| Cuentas | Saldos, detalles, transferencias y conciliación |

El botón `+` abre el registro de gasto, ingreso, transferencia y ajuste. Preferencias, categorías, tasas, respaldos e integración de WhatsApp deben tener accesos secundarios claros. Los informes pueden abrirse desde los indicadores correspondientes antes de justificar una sección principal adicional.

Conservar la posición de lectura, filtros y contexto al regresar desde un detalle. Dar acceso directo al movimiento creado por una notificación o confirmación.

### 5.2 Móvil, tablet y escritorio

- Móvil: navegación inferior, una columna y acciones principales alcanzables con el pulgar.
- Tablet: distribución en dos columnas cuando mejore la lectura; no ampliar una columna móvil sin criterio.
- Escritorio: navegación lateral y paneles de lista/detalle cuando sean útiles.
- Puntos de adaptación iniciales: menos de 768 px, 768–1199 px y desde 1200 px, ajustables por contenido.
- Sin desplazamiento horizontal de la página. Las tablas anchas pueden desplazarse dentro de un contenedor identificado.
- Respetar zonas seguras de iOS y evitar que el teclado o la navegación tapen controles.
- Diseñar objetivos táctiles de al menos 44 × 44 px; no amontonar acciones de icono.
- Los paneles inferiores móviles deben tener equivalente accesible en escritorio, gestión de foco y cierre explícito.

## 6. Reglas por experiencia

### 6.1 Inicio

Mostrar primero patrimonio estimado y dinero disponible, explicando cómo se diferencian. Separar dinero en tránsito y reservas cuando apliquen. Después: ingresos/gastos del período, costos de mover dinero, cuentas favoritas, pendientes y actividad reciente.

Los totales convertidos deben indicar moneda de visualización, referencia y fecha. Si faltan tasas, mostrar subtotal conocido y activos excluidos; no tratar la ausencia de datos como cero.

### 6.2 Cuentas

Tarjetas con nombre, moneda, saldo y tipo. Usar los colores personalizados como acento. El detalle presenta historial y acciones, conservando el saldo original incluso cuando se muestre una equivalencia.

Explicar que conciliar compara el saldo calculado con el real. Presentar un ajuste separado, con motivo, antes de aplicarlo.

### 6.3 Registro

Orden inicial: tipo, importe, cuenta, categoría y fecha. Mostrar notas, etiquetas y opciones avanzadas de manera progresiva. La moneda procede de la cuenta, pero debe verse.

Un gasto sencillo no debe requerir una segunda pantalla de confirmación si el formulario ya es inequívoco. Transferencias complejas, datos inferidos y cambios de saldo sí requieren un resumen comprensible.

Conservar datos ante errores. Deshabilitar el envío mientras se procesa sin perder la posibilidad de recuperación. Mostrar éxito solamente cuando exista confirmación de persistencia; si queda localmente pendiente, decirlo.

### 6.4 Transferencias y recorridos

Mostrar origen y destino, total descontado, importe recibido, comisión y monedas. Diferenciar comisión descontada del envío, comisión adicional y comisión cobrada desde otra cuenta.

Presentar un recorrido mediante pasos verticales en móvil, con estado, fecha y cantidades por tramo. Permitir expandir cada tramo. Un recorrido puede estar parcialmente completado.

La comisión explícita y la diferencia frente a una tasa de referencia deben tener etiquetas distintas. No denominar automáticamente “pérdida” a toda diferencia ni duplicar un costo dentro de dos indicadores.

### 6.5 Movimientos, filtros y reportes

Filas con concepto, importe, moneda, cuenta y estado. Agrupar por fecha. Mostrar filtros activos como controles removibles y ofrecer “Limpiar filtros”. Distinguir “Sin movimientos” de “Sin resultados con estos filtros”.

Los gráficos deben responder una pregunta concreta: evolución del saldo, distribución del gasto o costo por plataforma. Acompañar con cifras y alternativa textual/tabular. Evitar gráficos 3D, exceso de categorías y comparaciones entre monedas sin conversión explícita.

### 6.6 Planificación

Presupuestos con consumido, restante, moneda y período. Metas con objetivo y aportes reales. Recurrentes con vencimiento y estado. No presentar un vencimiento como un pago realizado.

Las alertas deben ser útiles, explicables y configurables; evitar mensajes culpabilizantes sobre gasto o ahorro.

### 6.7 Tasas

Mostrar fuente, par de monedas, vigencia y última consulta. Diferenciar “dato vigente”, “último dato disponible” y “actualización fallida” sin asumir que cada día debe publicarse una tasa nueva. Una consulta exitosa no cambia por sí sola la fecha de vigencia.

### 6.8 WhatsApp y voz

Usar resúmenes cortos con importe, cuenta, categoría o destino y costo cuando corresponda. Las preguntas deben limitarse a datos que impidan una interpretación segura.

Mostrar la transcripción editable o corregible antes de registrar datos dudosos. En la app, ofrecer una bandeja de borradores y confirmaciones pendientes accesible aunque WhatsApp falle.

## 7. Biblioteca de componentes reutilizables

Nombres orientativos; adaptar a las convenciones del repositorio sin duplicar equivalentes.

| Componente | Responsabilidad |
| --- | --- |
| `AppShell`, `BottomNav`, `SideNav` | Estructura y navegación adaptativa |
| `MoneyAmount`, `MoneyInput` | Presentación y captura consistente de importes |
| `CurrencyBadge`, `RateReference` | Moneda, fuente y fecha de conversión |
| `BalanceCard`, `AccountCard` | Saldos y resumen de cuentas |
| `TransactionRow`, `TransactionDetail` | Historial y detalle de operación |
| `TransactionForm`, `TransferForm` | Captura con validaciones comunes |
| `FeeBreakdown`, `TransferTimeline` | Costos, pasos y estado de un recorrido |
| `CategoryPicker`, `AccountPicker` | Selección buscable y accesible |
| `FilterBar`, `DateRangePicker` | Consulta y contexto de período |
| `BudgetProgress`, `GoalCard`, `UpcomingPayment` | Planificación |
| `SyncStatus`, `ConnectionStatus` | Estado real de sincronización e integración |
| `EmptyState`, `ErrorState`, `LoadingState` | Estados de contenido consistentes |
| `BottomSheet`, `Dialog`, `Toast` | Interacciones, avisos y confirmaciones |
| `PrivacyToggle`, `ConfirmationSummary` | Privacidad y revisión de operaciones |

Estos componentes son una base abierta. Añadir otros cuando una función útil o una repetición real lo justifique. Las piezas visuales no deben contener reglas financieras independientes del motor compartido.

## 8. Estados, mensajes y accesibilidad

Todo componente que consulte o guarde datos debe contemplar, según aplique: carga, vacío, éxito, error, desconexión, pendiente de sincronizar, conflicto, dato desactualizado y permisos insuficientes.

- Usar esqueletos de carga con dimensiones estables y evitar saltos de diseño.
- Mostrar errores junto al campo y un resumen accesible cuando sea necesario.
- Explicar qué ocurrió y qué puede hacer el usuario; ocultar códigos técnicos del flujo normal.
- No usar un aviso temporal como único registro de un error financiero.
- Foco visible, etiquetas asociadas a campos, navegación por teclado y anuncios accesibles de cambios relevantes.
- Gestionar el foco al abrir/cerrar diálogos; no permitir que quede detrás de un modal.
- Comprobar contraste objetivo de 4,5:1 para texto normal y 3:1 para texto grande y controles relevantes.
- Permitir zoom y ampliación de texto; no truncar información financiera esencial.
- Botones ambiguos deben tener texto o nombre accesible específico.

Ejemplos de microcopy: “Guardado en este dispositivo. Pendiente de sincronizar”; “La transferencia sigue en tránsito”; “Falta indicar desde qué cuenta pagaste”; “No pudimos actualizar la tasa. Mostramos el último dato disponible”.

## 9. Desarrollo y validación visual

Usar Vue + TypeScript + Ionic como base de interfaz acordada, con estilos propios centralizados. Verificar el proyecto existente antes de instalar herramientas o reemplazar componentes. La aplicación es una PWA orientada a iOS, con comportamiento responsive.

Comprobar los flujos realmente implementados en modo claro y oscuro, con teclado, zoom, datos vacíos y cantidades largas. Usar como tamaños de revisión iniciales 375/390 px, 768 px y 1440 px, además de la prueba real en iPhone cuando esté disponible. Una emulación no sustituye la validación en el dispositivo; documentar esa limitación si aplica.

Revisar apertura de formularios con teclado móvil, cambios de orientación, navegación hacia atrás, filtros persistentes, foco, scroll y mensajes de sincronización. Usar datos de demostración identificados; no presentar cifras de muestra como datos del usuario.

## 10. Criterios de entrega

- [ ] La jerarquía permite identificar saldo, moneda, cuenta y estado rápidamente.
- [ ] No hay importes cortados, superposiciones ni acciones ocultas por teclado o navegación.
- [ ] Claro y oscuro mantienen la misma calidad y contraste comprobado.
- [ ] Los estados vacío, error, carga y desconexión funcionan donde corresponden.
- [ ] Las acciones principales son accesibles por teclado y tacto.
- [ ] Transferencias, comisiones y conversiones se explican sin inducir a error.
- [ ] No se muestra “registrado” para un borrador pendiente.
- [ ] La privacidad oculta importes también en gráficos y vistas secundarias visibles.
- [ ] Se verificaron las pantallas con datos reales o de prueba representativos.
- [ ] Las mejoras adicionales implementadas quedaron documentadas y son coherentes con esta guía.

## 11. Evolución

Actualizar versión y registrar cambios cuando se alteren reglas compartidas. Mantener una sola fuente de tokens y patrones. Resolver nuevas pantallas reutilizando lo existente, creando componentes nuevos cuando aporten una responsabilidad clara.

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0 | 2026-11-08 | Guía inicial de identidad, navegación, interacciones, accesibilidad y ampliación funcional. |
| 1.1 | 2026-11-09 | Dirección visual según referencias del usuario (anexo C): base azul marino, azul como color principal, violeta y cian del isotipo como acentos; tokens con contraste verificado por pruebas. |

## Anexo A — Bocetos de referencia

Bocetos de baja fidelidad heredados de la planificación inicial (DISENO.md). Orientan la jerarquía; no fijan diseño final. Cifras ilustrativas.

### A.1 Detalle de tramo de transferencia
```
┌──────────────────────────────────┐
│ Salió          100,00 USD        │
│ Llegó           97,00 USD        │
│ Comisión         3,00 USD · 3 %  │
│ Descontada en origen             │
└──────────────────────────────────┘
Efectivo USD → Kontigo USD · 8 nov · Registrada

▸ Tasa ejecutada y referencia
▸ Recorrido
▸ Evidencia
▸ Historial y reversos
```

### A.2 Recorrido (pasos verticales en móvil)
```
● Sueldo en efectivo            +600,00 USD        Ingreso
│
● Efectivo → Kontigo            −500,00 USD → +485,00 USD
│   Comisión 15,00 USD · quedó en Efectivo 100,00 USD
│
● Kontigo → Binance             −485,00 USD → +480,00 USDT
│   Comisión 5,00 USD · relación USD/USDT 1:1 indicada
│
● Binance → Banco               −200,00 USDT → +8.400,00 VES
    Diferencia frente a referencia: ver detalle · quedó en Binance 280,00 USDT

Comisiones: 20,00 USD · 0,00 USDT · 0,00 VES
```
Las comisiones se muestran por activo; el total convertido solo aparece con tasas compatibles y su fuente.

### A.3 Registro de transferencia
```
Origen  [Efectivo · USD ▾]     Destino [Kontigo · USD ▾]
Salió   [ 100,00 ] USD
Llegó   [  97,00 ] USD
Comisión  ( Diferencia | % | Fijo | % + fijo )
          ( Descontada en origen | Adicional | En destino | Desde otra cuenta )
──────────────────────────────────
Resumen: salen 100,00 USD · llegan 97,00 USD · comisión 3,00 USD
                                        [ Revisar y registrar ]
```

## Anexo C — Referencias visuales y tokens (v1.1)

El usuario aportó referencias visuales (2026-11-09): un concepto de app bancaria de un diseñador externo. Se usan como **dirección de estilo**, no como diseño a copiar: no se reproducen su marca, nombre, logotipo, tarjetas ni pantallas.

| Rasgo de la referencia | Traducción en Biyu |
| --- | --- |
| Base azul marino profunda, casi negra, con brillo azul eléctrico en la parte superior | Tema oscuro `background #070B17` y `hero-glow` radial azul detrás del encabezado; en claro, el mismo brillo atenuado sobre `#F4F7FD`. |
| Azul como color de acción | `primary` pasa de violeta a azul (`#1F4FE0` / `#7AA2FF`), coherente con el azul central del isotipo. El violeta queda como acento de marca. |
| Tarjetas translúcidas con desenfoque y bordes suaves | `surface-glass` con `backdrop-filter`, solo en navegación, encabezados y tarjetas flotantes, con fondo opaco alternativo (§4.5). |
| Saldo grande y legible, decimales atenuados | Patrón para `MoneyAmount` (fase 1), **siempre con código de moneda** (R14); nunca solo `$`. |
| Acciones rápidas en iconos circulares | Aplicable a accesos del botón `+` y de cuentas, con etiqueta visible y objetivo de 44 × 44 px. |
| Navegación inferior de cinco destinos | Biyu mantiene sus **cuatro destinos** y el botón `+` (§5.1). |
| Barras de progreso con porcentaje | Base visual para `BudgetProgress` y metas, con texto y no solo color. |

Cambio frente a v1.0: el cian `#087F92` no alcanzaba 4,5:1 sobre el nuevo fondo claro (4,39:1); se oscureció a `#067385` (5,15:1). La prueba de contraste lo detectó.

## Anexo B — Historial de cambios
| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0.1 | 2026-11-08 | Renombrado a UI_UX.md; anexo de bocetos incorporado desde DISENO.md con navegación de cuatro destinos. |
