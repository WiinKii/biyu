/**
 * Structured logger (SECURITY_OPERATIONS §5).
 *
 * Only allow-listed, non-sensitive fields can be logged: no amounts tied to accounts, message
 * texts, audio, tokens, JWTs, secrets or full payloads. The type makes free-form data hard to
 * pass by accident; anything else must be added here deliberately.
 */
export interface LogFields {
  request_id?: string;
  method?: string;
  route?: string;
  status?: number;
  duration_ms?: number;
  error_code?: string;
  error_name?: string;
}

type Level = 'info' | 'warn' | 'error';

function write(level: Level, event: string, fields: LogFields): void {
  const line = JSON.stringify({ level, event, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields: LogFields = {}) => {
    write('info', event, fields);
  },
  warn: (event: string, fields: LogFields = {}) => {
    write('warn', event, fields);
  },
  error: (event: string, fields: LogFields = {}) => {
    write('error', event, fields);
  },
};
