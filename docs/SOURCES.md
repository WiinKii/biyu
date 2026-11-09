# Biyu — Fuentes técnicas y límites de verificación

Estas referencias apuntan a la documentación oficial de las tecnologías propuestas. **No sustituyen la validación**: cuotas, precios, límites y capacidades cambian, y deben comprobarse en la fase 0 y antes de cada integración. Las páginas no fueron revisadas en detalle al redactar este paquete; la columna "Estado" se actualiza al validar.

| Tema | Referencia | Qué validar | Estado |
| --- | --- | --- | --- |
| Ionic Vue | https://ionicframework.com/docs/vue/overview | Versión, soporte PWA, comportamiento en iOS standalone | Pendiente |
| Vue | https://vuejs.org | Versión estable | Pendiente |
| Vite | https://vite.dev | Plugin PWA, compatibilidad | Pendiente |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ | Límites del plan gratuito, CPU, tamaño, Static Assets, compatibilidad | Pendiente |
| Cloudflare D1 | https://developers.cloudflare.com/d1/ | Límites gratuitos, tamaño de base | Pendiente |
| D1 Worker API | https://developers.cloudflare.com/d1/worker-api/d1-database/ | Semántica transaccional de `batch`, triggers, enteros (V-01) | Pendiente |
| Cron Triggers | https://developers.cloudflare.com/workers/configuration/cron-triggers/ | Frecuencia y límites gratuitos | Pendiente |
| Cloudflare Access | https://developers.cloudflare.com/cloudflare-one/ | Plan gratuito, validación de JWT, sesiones en PWA (V-02) | Pendiente |
| Workers AI · precios y condiciones | https://developers.cloudflare.com/workers-ai/platform/pricing/ | Cuota gratuita, modelo Whisper disponible, formatos de audio | Pendiente |
| Hono | https://hono.dev | Soporte en Workers | Pendiente |
| WAHA | https://waha.devlike.pro | Edición gratuita, requisitos de memoria, condiciones, estabilidad (V-03) | Pendiente |
| WhatsApp (condiciones) | https://www.whatsapp.com/legal | Riesgo de usar clientes no oficiales | Pendiente |
| Oracle Cloud Always Free | https://www.oracle.com/cloud/free/ | Recursos, continuidad, región | Pendiente |
| BCV (fuente oficial) | https://www.bcv.org.ve | Horario y forma de publicación de tasas (V-04) | Pendiente |
| BCV Today | URL de su documentación, a registrar al validar | Endpoints, vigencia, captura, límites, términos | Pendiente |
| Vitest | https://vitest.dev | Integración con Workers/D1 local | Pendiente |
| Playwright | https://playwright.dev | Emulación iOS, capturas | Pendiente |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | Criterios de contraste y foco | Referencia |

## Reglas
- No inventar endpoints ni límites: copiarlos de la documentación vigente al implementar y anotar la fecha de consulta.
- Si una fuente cambia condiciones que afectan el costo cero, registrar un ADR.
- Las metas de rendimiento y el diseño modular son decisiones del proyecto, no garantías de los proveedores.
