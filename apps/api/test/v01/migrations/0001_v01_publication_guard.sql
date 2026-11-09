-- V-01 (ADR 0001): esquema mínimo para validar la publicación atómica en D1.
-- NO es el esquema de producción: las migraciones reales se crean en la fase 1 (DATABASE.md),
-- reutilizando los mecanismos que esta prueba demuestre.

PRAGMA foreign_keys = ON;

CREATE TABLE drafts (
  id TEXT NOT NULL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'needs_clarification', 'ready', 'posted', 'cancelled', 'expired')),
  version INTEGER NOT NULL CHECK (typeof(version) = 'integer' AND version >= 1)
);

CREATE TABLE operations (
  id TEXT NOT NULL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('building', 'posted')),
  reverses_operation_id TEXT REFERENCES operations (id)
);

CREATE UNIQUE INDEX operations_single_reversal
  ON operations (reverses_operation_id) WHERE reverses_operation_id IS NOT NULL;

CREATE TABLE entries (
  id TEXT NOT NULL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  operation_id TEXT NOT NULL REFERENCES operations (id),
  ledger_account_id TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (
    typeof(amount_minor) = 'integer'
    AND amount_minor <> 0
    AND amount_minor BETWEEN -1000000000000 AND 1000000000000
  )
);

CREATE TABLE asset_usage (
  workspace_id TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  absolute_minor_total INTEGER NOT NULL CHECK (
    typeof(absolute_minor_total) = 'integer'
    AND absolute_minor_total BETWEEN 0 AND 9000000000000000
  ),
  PRIMARY KEY (workspace_id, asset_code)
);

CREATE TABLE idempotency_keys (
  workspace_id TEXT NOT NULL,
  command_scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  operation_id TEXT,
  response_json TEXT,
  PRIMARY KEY (workspace_id, command_scope, key)
);

CREATE TABLE outbox (
  id TEXT NOT NULL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE
);

CREATE TABLE audit_events (
  id TEXT NOT NULL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL
);

-- Guardia sin estado: insertar en esta vista no guarda filas; el trigger INSTEAD OF aborta el
-- batch completo cuando la condición no es exactamente 1. Se usa para convertir "UPDATE con
-- cero filas" (que no es un error SQL) en un fallo que revierte todo.
CREATE VIEW publication_guard AS SELECT NULL AS ok, NULL AS label;

CREATE TRIGGER publication_guard_assert
INSTEAD OF INSERT ON publication_guard
WHEN NEW.ok IS NOT 1
BEGIN
  SELECT RAISE(ABORT, 'GUARD_FAILED');
END;

-- Publicación: building -> posted solo con >= 2 líneas y balance por activo.
CREATE TRIGGER operations_validate_posting
BEFORE UPDATE OF status ON operations
WHEN OLD.status = 'building' AND NEW.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'UNBALANCED_OPERATION')
  WHERE (SELECT COUNT(*) FROM entries WHERE operation_id = NEW.id) < 2
     OR EXISTS (
       SELECT 1 FROM entries
       WHERE operation_id = NEW.id
       GROUP BY asset_code
       HAVING SUM(amount_minor) <> 0
     );
END;

-- Una operación publicada no vuelve atrás ni se borra.
CREATE TRIGGER operations_posted_immutable
BEFORE UPDATE ON operations
WHEN OLD.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'POSTED_IMMUTABLE');
END;

CREATE TRIGGER operations_posted_no_delete
BEFORE DELETE ON operations
WHEN OLD.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'POSTED_IMMUTABLE');
END;

-- Las líneas de una operación publicada no se insertan, editan ni borran.
CREATE TRIGGER entries_no_insert_when_posted
BEFORE INSERT ON entries
WHEN (SELECT status FROM operations WHERE id = NEW.operation_id) = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'POSTED_IMMUTABLE');
END;

CREATE TRIGGER entries_no_update_when_posted
BEFORE UPDATE ON entries
WHEN (SELECT status FROM operations WHERE id = OLD.operation_id) = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'POSTED_IMMUTABLE');
END;

CREATE TRIGGER entries_no_delete_when_posted
BEFORE DELETE ON entries
WHEN (SELECT status FROM operations WHERE id = OLD.operation_id) = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'POSTED_IMMUTABLE');
END;
