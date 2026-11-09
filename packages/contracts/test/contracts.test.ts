import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  amountMinorSchema,
  errorEnvelopeSchema,
  moneySchema,
  rateSchema,
} from '../src/index.ts';

describe('money transport (API.md §1)', () => {
  it('accepts integer strings, including values beyond Number.MAX_SAFE_INTEGER', () => {
    for (const value of ['0', '10000', '-10000', '9007199254740993']) {
      expect(amountMinorSchema.safeParse(value).success).toBe(true);
    }
  });

  it('rejects numbers, decimals, exponents, padding and -0', () => {
    for (const value of [10000, '100.00', '1e4', '010', ' 10', '-0', '', '+5']) {
      expect(amountMinorSchema.safeParse(value).success).toBe(false);
    }
  });

  it('requires a known asset and rejects unknown fields', () => {
    expect(moneySchema.safeParse({ asset: 'USD', amount_minor: '10000' }).success).toBe(true);
    expect(moneySchema.safeParse({ asset: 'BTC', amount_minor: '1' }).success).toBe(false);
    expect(moneySchema.safeParse({ asset: 'USD', amount_minor: '1', amount: 0.01 }).success).toBe(
      false,
    );
  });

  it('represents rates as positive integer fractions', () => {
    expect(
      rateSchema.safeParse({ base: 'USD', quote: 'VES', num: '4000', den: '100' }).success,
    ).toBe(true);
    expect(rateSchema.safeParse({ base: 'USD', quote: 'VES', num: '0', den: '1' }).success).toBe(
      false,
    );
    expect(rateSchema.safeParse({ base: 'USD', quote: 'VES', num: '40.5', den: '1' }).success).toBe(
      false,
    );
  });
});

describe('error envelope (API.md §2)', () => {
  it('maps every documented code to its HTTP status', () => {
    expect(ERROR_CODES).toHaveLength(16);
    expect(ERROR_HTTP_STATUS.NEEDS_CLARIFICATION).toBe(422);
    expect(ERROR_HTTP_STATUS.IDEMPOTENCY_MISMATCH).toBe(409);
    expect(ERROR_HTTP_STATUS.INTEGRATION_DISABLED).toBe(503);
  });

  it('validates the documented shape and rejects unknown codes', () => {
    const valid = {
      error: {
        code: 'NEEDS_CLARIFICATION',
        message: 'Falta indicar si la comisión fue descontada o adicional.',
        details: { field: 'fee.mode' },
        request_id: 'req-1',
      },
    };
    expect(errorEnvelopeSchema.safeParse(valid).success).toBe(true);
    expect(errorEnvelopeSchema.safeParse({ error: { ...valid.error, code: 'OOPS' } }).success).toBe(
      false,
    );
  });
});
