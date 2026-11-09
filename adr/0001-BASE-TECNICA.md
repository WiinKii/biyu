# ADR 0001 — Base técnica de Biyu

Estado: **Propuesta** · Fecha: 2026-11-08
Las decisiones de este registro son base de trabajo. Se marcan como **Aceptadas** cuando el usuario las aprueba o la validación de la fase 0 las confirma.

---

## 1. Contexto

Biyu es una app privada de finanzas personales para un propietario, con varias monedas, recorridos entre plataformas, comisiones, tasa BCV y entrada por WhatsApp. Requisitos que condicionan la técnica:

- Exactitud financiera y trazabilidad por encima de velocidad de desarrollo.
- Costo cero obligatorio en la solución validada.
- PWA con prioridad iPhone; también escritorio.
- Integraciones (WhatsApp, voz, tasas) reemplazables y desactivables sin afectar el registro manual.

---

## 2. Decisiones propuestas

| ID | Decisión | Motivo |
| --- | --- | --- |
| T-01 | **PWA con Vue 3 + TypeScript + Ionic + Vite** | Una base para iOS y escritorio sin tiendas de apps ni costo de distribución. |
| T-02 | **API TypeScript en Cloudflare Workers**, router ligero (Hono como opción) y Static Assets para la PWA | Plan gratuito, sin servidor propio, mismo lenguaje en cliente y servidor. |
| T-03 | **Cloudflare D1** (SQLite) con SQL parametrizado y migraciones numeradas | Integrado con Workers; suficiente para un propietario. |
| T-04 | **Cloudflare Access** como puerta de acceso privado; mapeo a usuario interno | Acceso privado sin construir autenticación propia. |
| T-05 | **Monolito modular** con paquetes `domain` y `contracts` compartidos | Separación lógica comprobable sin costo operativo de microservicios. |
| T-06 | **Ledger balanceado por activo** con cuentas contables `asset`, `income`, `expense`, `equity`, `fx_bridge` | Los saldos se derivan y concilian; las conversiones no mezclan monedas. |
| T-07 | **Dinero en enteros de unidad mínima** (`BigInt` en dominio, strings en API, `INTEGER` en D1). Escalas USD/EUR/VES = 2, USDT = 6 | Sin errores de coma flotante; transporte sin pérdida. |
| T-08 | **Tasas como fracción** numerador/denominador con dirección explícita | Conversión reproducible. |
| T-09 | **Operaciones inmutables**: corrección = reverso + nueva operación | Historia completa y reportes coherentes. |
| T-10 | **Borradores → confirmación → publicación atómica** con idempotencia | Un solo camino de escritura para app y WhatsApp; sin duplicados. |
| T-11 | **Online-authoritative** con borradores offline en IndexedDB | Evita doble contabilidad en el dispositivo; iOS no garantiza sincronización en segundo plano. |
| T-12 | **Inbox/outbox en D1** + procesador programado (Cron Triggers) | Entrega durable sin colas de pago. |
| T-13 | **WhatsApp por adaptador WAHA** alojado fuera del Worker (candidato Oracle Always Free) | WAHA necesita un proceso con Docker; Workers no ejecuta Docker. |
| T-14 | **Interpretación de mensajes**: parser determinista + IA opcional detrás de un puerto, con salida en esquema cerrado | Funciona sin cuota de IA; la IA nunca escribe asientos. |
| T-15 | **Transcripción** detrás de un puerto; Workers AI Whisper como candidato | Reemplazable; desactivable al agotar cuota. |
| T-16 | **Pruebas**: Vitest (dominio e integración) y Playwright (flujos y QA visual) | Herramientas estándar del ecosistema elegido. |

---

## 3. Consecuencias

**Positivas**
- Un único motor financiero para todos los canales.
- Saldos reconstruibles y auditables.
- Integraciones sustituibles; la app sigue funcionando sin ellas.
- Costo de infraestructura cero si se respetan cuotas.

**Negativas o riesgos**
- D1 no ofrece transacciones interactivas: la atomicidad depende de `batch` y triggers de guardia, que deben probarse (V-01).
- Doble partida y reversos añaden complejidad al dominio y a las pruebas.
- WAHA usa una sesión de WhatsApp Web, que **no es la API oficial de WhatsApp Business**: existe riesgo de bloqueo del número o de cambios que rompan el conector. Debe usarse un número aceptando ese riesgo y la app no puede depender de él (V-03).
- Los planes gratuitos pueden cambiar; ninguna gratuidad de terceros se considera permanente.
- Una PWA en iOS tiene límites de almacenamiento y de tareas en segundo plano.

---

## 4. Validaciones y decisiones pendientes

### Validaciones técnicas (fase 0)

| ID | Qué validar | Criterio de salida |
| --- | --- | --- |
| V-01 | Atomicidad de `batch` en D1 con guardia de publicación (DATABASE §Publicación atómica) | Prueba que fuerza fallo en cada paso y demuestra rollback completo en D1 local y remoto de pruebas; prueba de concurrencia sobre la misma clave de idempotencia. |
| V-02 | Cloudflare Access con PWA instalada en iPhone (renovación de sesión, modo standalone) | Flujo de login y renovación funciona en dispositivo real o se elige alternativa. |
| V-03 | WAHA: condiciones de uso, estabilidad, consumo de memoria y alojamiento gratuito | Sesión estable una semana en el host elegido; procedimiento de reconexión documentado; riesgo aceptado por el usuario. |
| V-04 | Proveedor BCV (candidato BCV Today, intermediario no oficial) | Datos coinciden con la fuente oficial durante varios días; términos y límites conocidos; respaldo definido. |
| V-05 | Cuotas gratuitas de Workers, D1, Cron, Workers AI | Cuotas internas por debajo de los límites, con degradación probada. |
| V-06 | Versiones y licencias de dependencias | Lockfile, versiones fijadas y compatibilidad del Worker documentadas. |

### Decisiones de producto/modelo

| ID | Pregunta | Propuesta |
| --- | --- | --- |
| D-01 | Moneda de presentación por defecto | USD, configurable. |
| D-02 | Política de redondeo | Mitad alejándose de cero al materializar importes (DOMAIN §2). |
| D-03 | Escala de USDT | 6 decimales (DOMAIN §2). Inmutable una vez usada. |
| D-04 | **Dinero en tránsito** cuando ya salió dinero real | DOMAIN permite borrador sin impacto como primera versión, pero eso muestra un saldo de origen mayor al real. Propuesta: bolsillo de sistema **"En tránsito"** por activo desde la fase 2, con dos operaciones conciliables (origen → tránsito, tránsito → destino). Requiere aprobación. |
| D-05 | **Diferencia por aclarar** | MVP: el borrador queda en `needs_clarification` y no se publica. Alternativa: publicar contra una cuenta contable `equity:unexplained` visible en pendientes. Decidir antes de la fase 2. |
| D-06 | Deudas y tarjetas de crédito | Requieren un tipo de cuenta contable `liability`. Fuera del MVP; diseñar sin bloquear su incorporación. |
| D-07 | IA para interpretar WhatsApp | Empezar con parser determinista + alias; evaluar un modelo gratuito detrás del puerto en la fase 6. |
| D-08 | Retención de audios y transcripciones | Borrar el audio tras transcribir; conservar solo el texto confirmado. |
| D-09 | Respaldo | Exportación completa manual cifrada por el usuario; evaluar copia programada dentro del costo cero. |

---

## 5. Revisión

Revisar este ADR al cerrar la fase 0. Cada cambio incompatible se registra en un ADR nuevo (`adr/0002-…`) y se actualizan los documentos afectados.
