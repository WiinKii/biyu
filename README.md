# Biyu · Documentación para iniciar el desarrollo
Versión documental: 1.0 · Fecha: 8 de noviembre de 2026 · Proyecto: FinanceApp.

Biyu es una app privada de finanzas personales, pensada para el uso cotidiano en Venezuela, móvil y escritorio. Permite registrar dinero y entender sus recorridos, conversiones y comisiones, también mediante WhatsApp.

Este paquete es una especificación inicial ejecutable por fases. **Estado actual: fase 0 (esqueleto técnico y validaciones).** La aplicación todavía no registra operaciones ni tiene integraciones configuradas; ver [docs/entregas/FASE-0.md](docs/entregas/FASE-0.md) y los comandos en [AGENTS.md §5](AGENTS.md#5-comandos). Las decisiones técnicas que aquí se proponen sirven de base de trabajo; no se presentan como aprobaciones previas del usuario.

## Lectura recomendada
| Archivo | Propósito |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Instrucciones para desarrolladores y agentes de código |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Requisitos, límites y entregas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura, módulos, dependencias y flujos |
| [docs/DOMAIN.md](docs/DOMAIN.md) | Reglas financieras y ejemplos verificables |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de datos, integridad y persistencia |
| [docs/API.md](docs/API.md) | Contratos HTTP y errores |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | WhatsApp, audio y tasas |
| [docs/OFFLINE_SYNC.md](docs/OFFLINE_SYNC.md) | Borradores locales y sincronización |
| [docs/SECURITY_OPERATIONS.md](docs/SECURITY_OPERATIONS.md) | Acceso, privacidad, respaldo y operación |
| [docs/UI_UX.md](docs/UI_UX.md) | Guía visual y de experiencia |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Componentes iniciales y criterios de extensión |
| [docs/TESTING.md](docs/TESTING.md) | Casos financieros, integración y QA visual |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fases y condiciones de cierre |
| [adr/0001-BASE-TECNICA.md](adr/0001-BASE-TECNICA.md) | Decisiones propuestas, consecuencias y pendientes |
| [docs/SOURCES.md](docs/SOURCES.md) | Fuentes técnicas y límites de verificación |

## Base técnica
Vue + TypeScript + Ionic + Vite para una PWA; API TypeScript en Cloudflare Workers; D1 para persistencia; Cloudflare Access para acceso privado. Un solo motor financiero compartido por app y WhatsApp. WAHA se contempla como adaptador opcional alojado fuera del Worker. El costo cero es una restricción de producto; su viabilidad completa todavía debe comprobarse.

## Primera entrega
Crear el esqueleto, contratos, migraciones y motor financiero con pruebas; después construir cuentas y registros manuales de extremo a extremo. No comenzar por el bot ni por gráficos sin reglas de dinero comprobadas.

## Autoridad documental
Los requisitos explícitos del usuario prevalecen. DOMAIN gobierna cálculos; DATABASE, integridad; API, contratos; ARCHITECTURE, límites entre módulos. Registrar cualquier cambio incompatible en un ADR y actualizar todos los documentos afectados. Las propuestas visuales pueden evolucionar sin debilitar accesibilidad ni precisión financiera.

## Supuestos de arranque
- Un propietario y un espacio personal; modelo preparado para aislar futuros propietarios, sin colaboración familiar en la primera versión.
- USD, EUR, VES y USDT; USD y USDT siempre separados.
- Español; zona horaria inicial America/Caracas, configurable.
- Moneda de presentación inicial USD, configurable; los importes originales se conservan.
- Uso privado, sin conexión bancaria automática y sin ejecutar transferencias reales.
- Offline para consulta limitada y borradores; el servidor confirma la contabilización.

## Documentos reemplazados
Los borradores anteriores quedaron integrados en este paquete y no deben usarse como referencia:

| Anterior | Integrado en |
| --- | --- |
| PRODUCTO.md | docs/PRODUCT.md |
| DOMINIO.md | docs/DOMAIN.md + docs/DATABASE.md (el modelo de comisión como gasto aparte y la edición directa quedan descartados) |
| WHATSAPP.md, TASAS.md | docs/INTEGRATIONS.md |
| DISENO.md | docs/UI_UX.md (anexo A) |
| BIYU_VISUAL_UI_UX.md | docs/UI_UX.md |
| BIYU_COMPONENTES.md | docs/COMPONENTS.md |
| ROADMAP.md (v0.1) | docs/ROADMAP.md |
