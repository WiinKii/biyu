# Biyu — Roadmap

Fases de entrega funcional. Cada fase cierra cuando cumple sus condiciones; no se presentan botones sin comportamiento como terminados. Secuencia basada en [COMPONENTS.md §7](COMPONENTS.md). IDs de casos en [TESTING.md](TESTING.md).

> Regla de arranque: no comenzar por el bot ni por gráficos sin reglas de dinero comprobadas.

---

## Fase 0 — Esqueleto y validaciones
- [ ] Monorepo: `apps/web`, `apps/api`, `packages/domain`, `packages/contracts`, `packages/test-fixtures`, `migrations`, `tests/e2e`.
- [ ] TypeScript estricto, lint, formato, Vitest, Playwright, CI.
- [ ] Worker + Static Assets + D1 local y de prueba.
- [ ] Versiones fijadas y lockfile (V-06).
- [ ] Validar atomicidad D1 con guardia de publicación (V-01).
- [ ] Validar Access con PWA en iPhone (V-02).
- [ ] Revisar cuotas gratuitas (V-05).
- [ ] Decidir D-01, D-02, D-03.

**Cierre:** CI verde; V-01 demostrada con pruebas de fallo y concurrencia; decisión sobre Access documentada; ADR 0001 actualizado.

---

## Fase 1 — Motor financiero, acceso, cuentas y registro básico (C01, C03, C04)
- [ ] `Money`, `Asset`, `Rate`, redondeo, límites (BigInt).
- [ ] Ledger balanceado: operaciones, asientos, cuentas contables de sistema.
- [ ] Migraciones y triggers de DATABASE; semillas de activos y categorías.
- [ ] Borradores, preview, confirmación, publicación atómica, idempotencia.
- [ ] Reverso y corrección.
- [ ] Identidad: mapeo Access → usuario → espacio.
- [ ] Cuentas y bolsillos; saldo inicial como apertura.
- [ ] Gasto, ingreso, ajuste de extremo a extremo en la PWA.
- [ ] AppShell, navegación, preferencias, tokens visuales.

**Cierre:** F01–F04, F14–F19, I01–I10 pasan; registrar un gasto en la PWA en < 10 s; doble toque no duplica.

---

## Fase 2 — Transferencias, comisiones, tránsito, recorridos e historial (C05, C06, C07)
- [ ] Decidir D-04 (tránsito) y D-05 (diferencias por aclarar).
- [ ] Tramos misma moneda y con conversión (puente FX).
- [ ] Comisiones: todas las modalidades y formas; varias por tramo.
- [ ] Dinero en tránsito según D-04.
- [ ] Recorridos: crear, vincular, línea de tiempo, parciales, sugerencias.
- [ ] Historial con filtros, búsqueda, paginación por cursor; detalle con auditoría.
- [ ] Categorías, etiquetas y reglas.

**Cierre:** F05–F13, F25, F26 pasan; recorrido Efectivo USD → Kontigo → Binance USDT → Banco VES registrado y reconciliado.

---

## Fase 3 — Inicio, tasas y reportes (C02, C08, C12)
- [ ] Validar proveedor BCV (V-04) y definir respaldo.
- [ ] `RateProvider`, Cron, caché, histórico, tasa manual, estados.
- [ ] Referencia guardada en cada tramo con conversión.
- [ ] Inicio: patrimonio, disponible, tránsito, período, costos, favoritas, pendientes, actividad, BCV.
- [ ] Reportes: categorías, evolución, costo de mover dinero en series separadas.
- [ ] Exportación CSV.

**Cierre:** F10, F19, F20 pasan; cada cifra de Inicio coincide con su detalle; caída del proveedor no impide registrar.

---

## Fase 4 — Planificación y respaldo (C09, C10, C11, §5.5)
- [ ] Presupuestos con política de conversión visible.
- [ ] Recurrentes: ocurrencias, confirmar, omitir, reprogramar, pausar, fin de mes.
- [ ] Metas y reservas; disponible actualizado.
- [ ] Respaldo completo y restauración con vista previa.

**Cierre:** F21–F24 pasan; restauración real de prueba reconstruye saldos.

---

## Fase 5 — Offline y sincronización
- [ ] IndexedDB por usuario, snapshot y cola de comandos.
- [ ] `/sync/commands` y `/sync/changes`.
- [ ] Conflictos y estados visibles.

**Cierre:** pruebas de OFFLINE_SYNC §7 pasan. (Los IDs de cliente y la idempotencia ya existen desde la fase 1 para no rehacer contratos.)

---

## Fase 6 — WhatsApp por texto (C13)
- [ ] Validar WAHA, alojamiento y riesgo (V-03); aceptación explícita del usuario.
- [ ] Webhook, inbox, job, outbox.
- [ ] Vinculación de número.
- [ ] Parser determinista, alias y contrato del intérprete; IA opcional (D-07).
- [ ] Bandeja de pendientes en la app.

**Cierre:** W01–W13 pasan; repetir un webhook no repite movimientos; caída de WAHA no afecta la app.

---

## Fase 7 — Voz y mejoras (C14, COMPONENTS §6)
- [ ] Transcripción con cuota y degradación (D-08).
- [ ] Ampliaciones con necesidad observada: reembolsos, división de gastos, conciliación asistida, importación CSV, plantillas, centro de pendientes, comprobantes.

**Cierre:** una cuota agotada no bloquea Biyu; cada ampliación documentada con su necesidad y validación.

---

## Después del MVP
- Pasivos: deudas y tarjetas de crédito (D-06).
- Tasas adicionales de referencia (P2P USDT/VES).
- Informes comparativos avanzados.
- Lectura de recibos.
