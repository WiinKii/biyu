# Biyu — Seguridad, privacidad y operación

---

## 1. Acceso e identidad

- **Cloudflare Access** protege la PWA y la API (validación pendiente en iPhone, V-02).
- El Worker valida el JWT de Access en cada solicitud (firma, audiencia, emisor y expiración); no confía solo en la presencia de cabeceras.
- `identity_subject` se mapea a un `users.id` interno; de ahí se obtiene `workspace_id`.
- El webhook de WhatsApp no usa Access: se autentica con secreto compartido o firma HMAC del adaptador, con rotación documentada.
- Sesión cerrada o expirada: la PWA bloquea datos y pide volver a entrar.

## 2. Autorización

- Cada consulta y escritura filtra por `workspace_id` obtenido de la identidad.
- Claves foráneas compuestas `(workspace_id, id)` impiden referenciar entidades de otro espacio (DATABASE §Integridad).
- Pruebas obligatorias: un usuario o remitente ajeno no lee ni modifica datos.

## 3. Secretos

| Secreto | Dónde |
| --- | --- |
| Credenciales WAHA y secreto del webhook | Secrets del Worker y del host del adaptador |
| Claves de proveedores (si las hay) | Secrets del Worker |
| Audiencia/equipo de Access | Variables del Worker |

- Nunca en el frontend, el repositorio, las preferencias ni los logs.
- `.env` locales fuera del control de versiones; plantilla `.env.example` sin valores.
- Credenciales distintas por entorno.
- La credencial del conector de WhatsApp no da acceso humano a la app.

## 4. Privacidad

- Ocultar saldos desde la app (`PrivacyToggle`), incluidos gráficos y vistas secundarias.
- Notificaciones y respuestas de WhatsApp sin información que no se pidió.
- Mensajes y audios: datos del usuario. Audio borrado tras transcribir (D-08).
- Sin analítica de terceros ni rastreadores.

## 5. Registros y observabilidad

- Logs estructurados con `request_id`, ruta, código de resultado y duración.
- **Prohibido en logs**: importes completos asociados a cuentas, textos de mensajes, audios, tokens, JWT, secretos, payloads completos.
- `audit_events` con metadatos redactados: quién, qué acción, qué entidad, cuándo, canal.
- Métricas útiles: comandos de sync pendientes, duplicados bloqueados, fallos de tasas, desconexiones de WhatsApp, cuotas consumidas.

## 6. Límites y entradas

- Límite de solicitudes por usuario y por remitente de WhatsApp.
- Tamaño máximo de cuerpo JSON, texto de mensaje, audio (1 min) y adjuntos.
- Validación de esquema en toda entrada; rechazar campos desconocidos.
- SQL siempre parametrizado.
- Cabeceras de seguridad en la PWA: CSP estricta, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.

## 7. Costo cero y cuotas

- Cuotas internas por debajo de los límites gratuitos de cada servicio (V-05).
- Al alcanzar una cuota: desactivar la función opcional (`INTEGRATION_DISABLED`) y avisar; registro manual siempre disponible.
- No activar planes de pago sin decisión explícita del usuario.
- Revisión mensual del consumo.

## 8. Entornos y despliegue

| Entorno | Datos | Uso |
| --- | --- | --- |
| Local | Ficticios (`packages/test-fixtures`) | Desarrollo y pruebas |
| Prueba | Ficticios | Validar migraciones, D1 remoto, Access, integraciones |
| Producción | Reales | Uso personal |

- Bases D1 separadas por entorno.
- Migraciones numeradas, inmutables una vez desplegadas y compatibles hacia adelante.
- Antes de una migración en producción: exportar respaldo completo y verificarlo.
- Funciones nuevas detrás de flags.
- CI: lint, tipos, pruebas de dominio e integración antes de desplegar.

## 9. Respaldo y restauración

- **Exportación CSV**: movimientos legibles; no es respaldo.
- **Respaldo completo**: JSON versionado con espacio, activos, cuentas, bolsillos, categorías, etiquetas, reglas, operaciones, asientos, comisiones, recorridos, tasas usadas, planificación y preferencias. Excluye secretos y vínculos de canal.
- Incluye `schema_version` y suma de verificación.
- Restaurar: validar esquema e integridad → vista previa → política (reemplazar o fusionar) → copia previa → ejecución atómica o recuperable.
- Probar una restauración real con datos de prueba antes de dar la función por terminada, y luego periódicamente.

## 10. Incidentes

| Situación | Respuesta |
| --- | --- |
| Proveedor de tasas caído | Último dato + aviso; tasa manual |
| WAHA desconectado | Estado visible en la app; reconectar según procedimiento; mensajes del inbox se procesan una vez |
| Error de migración | Detener despliegue, restaurar desde respaldo verificado |
| Sospecha de acceso indebido | Revocar sesiones en Access, revocar vínculos de canal, rotar secretos, revisar `audit_events` |
| Cuota agotada | Función opcional desactivada hasta el siguiente período |
