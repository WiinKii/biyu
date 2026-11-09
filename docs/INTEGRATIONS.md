# Biyu — Integraciones: WhatsApp, voz y tasas

Las integraciones son **adaptadores** detrás de puertos ([ARCHITECTURE.md §3](ARCHITECTURE.md)). Ninguna escribe asientos: producen datos que el motor valida y contabiliza. Todas pueden desactivarse sin afectar el registro manual en la PWA.

| Integración | Puerto | Candidato | Estado |
| --- | --- | --- | --- |
| WhatsApp | `Messenger` | WAHA alojado fuera del Worker | Pendiente de validar (V-03) |
| Interpretación | `MessageInterpreter` | Parser determinista + IA opcional | Parser primero (D-07) |
| Voz | `Transcriber` | Workers AI Whisper | Etapa posterior (V-05) |
| Tasas | `RateProvider` | BCV Today (intermediario) + manual | Pendiente de validar (V-04) |

---

## 1. WhatsApp

### 1.1 Flujo

```
WAHA ──webhook──▶ /webhooks/whatsapp ──▶ inbox (persistir y responder 200)
                                           │
                       job programado ◀────┘
                           │
   1. Verificar remitente vinculado (channel_links)
   2. Deduplicar (provider, session_id, external_event_id)
   3. Interpretar → esquema cerrado
   4. Resolver cuentas, categorías y alias del usuario
   5. Validar con el dominio
   6. ¿Falta algo? → pregunta (una a la vez) y borrador needs_clarification
   7. Resumen + confirmación ligada a borrador/versión/expiración
   8. "Sí" → publicar con el motor compartido (idempotente)
   9. Responder con referencia corta, vía outbox
```

- El webhook solo autentica al adaptador, guarda y responde. El trabajo durable no depende de tareas posteriores a la respuesta HTTP.
- El estado de la conversación vive en servidor (borradores), no en memoria de un proceso.
- Cambiar importe, cuenta o tasa invalida la confirmación previa.

### 1.2 Vinculación
1. En la app: "Vincular WhatsApp" genera un código de un solo uso con vencimiento.
2. El usuario envía el código desde su número.
3. Se registra `channel_links` con `verified_at`.
- Un remitente no vinculado no recibe datos ni crea borradores.
- Revocable desde la app.

### 1.3 Intenciones del MVP

| Intención | Ejemplo |
| --- | --- |
| Gasto | "Gasté 12 dólares en comida del efectivo" |
| Ingreso | "Me pagaron 600 en efectivo" |
| Transferencia | "Pasé 200 de Kontigo a Binance" |
| Transferencia con comisión | "Pasé 100 y llegaron 97" · "Me cobraron 2 %" |
| Completar tránsito | "Ya llegaron los bolívares, fueron 8.400" |
| Consultar saldo | "¿Cuánto tengo en Binance?" |
| Consultar disponible | "¿Cuánto puedo gastar?" |
| Consultar tasa | "¿A cuánto está el BCV?" |
| Consultar costos | "¿Cuánto gasté en comisiones este mes?" |
| Corregir | "No, eran 15" · "Cámbialo a transporte" |
| Deshacer | "Borra lo último" → reverso de la última operación del canal, previa confirmación |
| Confirmar recurrente | "Ya pagué el alquiler" |
| Ver pendientes | "¿Qué tengo pendiente?" |

### 1.4 Comisiones

Sinónimos de comisión: *comisión, interés, recargo, cargo, fee, me quitaron, me descontaron, me cobraron*.

| Mensaje (misma moneda) | Interpretación | Acción |
| --- | --- | --- |
| "Deposité 100 y me llegaron 97" | Diferencia 3 | Pregunta si fue comisión o hubo pago parcial/retención |
| "Me descontaron el 3 % de los 100" | `deducted_source`, base 100, 3 % | Resumen y confirmación |
| "Envié 100 y pagué 3 adicionales" | `added_source`, 3 | Resumen y confirmación |
| "Me cobraron 2 dólares" | Fijo 2 | Vincula al borrador o tramo inequívoco; si hay varios, pregunta cuál |
| "2 % más 1 dólar" | % + fijo | Pregunta base si no es clara |
| "Pasé 100 al 3 %" | Ambiguo | Pregunta: descontado o adicional |
| Llega **más** de lo enviado | No es comisión negativa | Pregunta: bono, devolución o error |

Entre monedas distintas:
- No deducir comisión de la diferencia (R10).
- Pedir lo que falte: importe recibido, tasa acordada o comisión informada.
- Sin comisión conocida, se guarda la tasa neta observada; la diferencia frente al BCV se etiqueta "Diferencia frente a referencia".
- USD ↔ USDT: preguntar la relación; si es 1:1 se registra solo en esa operación.

### 1.5 Contrato del intérprete

Salida en esquema cerrado validado con `packages/contracts`. Campos desconocidos → rechazo.

```json
{
  "intent": "register_transfer",
  "confidence": 0.9,
  "entities": {
    "source_hint": "efectivo",
    "destination_hint": "kontigo",
    "source_principal": { "asset": "USD", "amount": "100" },
    "destination_net": { "asset": "USD", "amount": "97" },
    "fee": { "mode": null, "calc": "difference", "amount": null, "percent": null },
    "occurred_at": "today",
    "category_hint": null
  },
  "missing": [],
  "ambiguities": ["fee_confirmation"]
}
```

- Importes como texto; el dominio los convierte a unidades mínimas.
- La capa de aplicación resuelve cuentas y decide si preguntar o resumir.
- **Seguridad**: el texto del usuario es dato, no instrucción. Nunca se ejecuta SQL, código ni herramientas a partir del mensaje. Si se usa IA, el mensaje va como contenido delimitado y la respuesta se valida; cualquier intento de cambiar reglas se ignora.
- Si la IA no está disponible o se agotó su cuota, el parser determinista y la app siguen funcionando.

### 1.6 Resolución de cuentas
- Por nombre, alias del usuario o activo ("mi cuenta en dólares").
- Una candidata → usarla y mostrarla en el resumen.
- Varias → opciones numeradas.
- Ninguna → ofrecer crearla desde la app; no se inventa.

### 1.7 Respuestas

```
Revisa antes de guardar:
Efectivo USD → Kontigo USD
Salió: 100,00 USD
Llegó: 97,00 USD
Comisión: 3,00 USD (3 %)

Responde "sí" para registrar o dime qué corregir.
```

```
✅ Registrado · ref. B7K2
100,00 USD de Efectivo a Kontigo · comisión 3,00 USD
```

```
¿El 3 % te lo descontaron de los 100 o lo pagaste aparte?
1. Descontado (llegaron 97)
2. Aparte (salieron 103)
```

Respuestas breves, con moneda siempre, sin datos financieros que no se pidieron. "✅ Registrado" solo tras publicación confirmada.

### 1.8 Duplicados
- Técnico: `inbox` único por `(provider, session_id, external_event_id)` e idempotencia en la publicación.
- De contenido: mensaje casi idéntico (importe, activo, cuenta, tipo) dentro de una ventana corta o comprobante con el mismo hash → advertir y pedir confirmación.

### 1.9 Disponibilidad
- Si WAHA cae, la app muestra el estado de la conexión y la bandeja de pendientes sigue disponible.
- Reconexión: los mensajes recibidos se procesan una vez; los borradores pendientes se recuperan.
- No anunciar WhatsApp como disponible hasta completar V-03.

---

## 2. Notas de voz (etapa posterior)

- Límite inicial: 1 minuto por nota, sujeto a validación.
- Validar formato y tamaño → transcribir con `Transcriber` → mismo flujo de texto.
- El resumen siempre muestra el texto entendido; importes, monedas o cuentas dudosos → pregunta.
- Retención: borrar el audio tras transcribir; conservar solo el texto necesario (D-08).
- Cuota agotada o error → responder que se envíe texto; nunca cobro automático.

---

## 3. Tasas

### 3.1 Requisitos
- BCV USD/VES y EUR/VES.
- Fuente real del dato identificada; un intermediario no se presenta como API oficial.
- Guardar par, dirección, valor exacto (fracción), vigencia, hora de consulta, proveedor, URL de origen y calidad.
- Consulta desde servidor con caché compartida; los clientes no llaman al proveedor.
- Conservar el último dato válido ante fallos; no sobrescribirlo con respuestas inválidas.
- Tasa manual privada e identificada; tasa real por operación.
- Ninguna actualización modifica operaciones pasadas.
- No asumir que cada día se publica una tasa nueva.

### 3.2 Puerto

```ts
interface RateProvider {
  id: string;
  fetchLatest(pairs: Pair[]): Promise<RateQuote[]>;
  fetchHistorical?(pair: Pair, date: string): Promise<RateQuote | null>;
}

interface RateQuote {
  base: "USD" | "EUR";
  quote: "VES";
  num: string;          // entero como texto
  den: string;          // entero como texto
  effective_at: string; // vigencia publicada por la fuente
  fetched_at: string;   // hora de consulta
  provider: string;
  source_url: string;
  quality: "validated" | "unvalidated";
}
```

Validación de respuesta: valor positivo, dentro de un rango de variación razonable respecto al último dato, vigencia no futura más allá de la publicación anticipada habitual. Si falla, se descarta y se registra el error.

### 3.3 Proveedor candidato
**BCV Today**: según su documentación, API gratuita sin clave con USD, EUR, histórico, vigencia y hora de captura. Es un **intermediario independiente**, no la API oficial del BCV. Antes de adoptarlo, completar V-04 y definir un respaldo (otra fuente o tasa manual). No inventar endpoints: tomarlos de su documentación vigente al implementar.

### 3.4 Programación
- Cron Trigger varias veces al día en días hábiles (frecuencia exacta al conocer el horario de publicación).
- Reintento con espera si falla.
- Umbral de "desactualizado" configurable.

### 3.5 Estados visibles

| Estado | Texto |
| --- | --- |
| Vigente | "Vigente desde {fecha} · consultado {hora}" |
| Último dato disponible | "Último dato disponible: vigencia {fecha}" |
| Actualización fallida | "No pudimos actualizar la tasa. Mostramos el último dato disponible." |
| Manual | "Tasa manual · {fecha}" |

### 3.6 Uso

| Situación | Tasa |
| --- | --- |
| Conversión en un tramo | Tasa ejecutada real (de importes o indicada). Se guarda la referencia BCV vigente para comparar. |
| Presupuesto con gasto en otra moneda | Política estable visible: tasa de la operación o referencia de su fecha. |
| Totales de Inicio | Referencia más reciente, con moneda, fuente y fecha. |
| Diferencia frente a referencia | Tasa ejecutada vs. referencia de la misma fecha, sobre importe bruto si hay comisión de destino conocida (DOMAIN §5). |
| Reportes históricos | Importes originales; conversión opcional y explícita. |
| USDT | Requiere referencia propia o relación explícita; no hereda USD. |
