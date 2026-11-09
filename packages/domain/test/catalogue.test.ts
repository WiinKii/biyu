import { describe, expect, it } from 'vitest';
import {
  ASSETS,
  ASSET_CODES,
  MAX_CUMULATIVE_ABS_MINOR,
  MAX_LINE_ABS_MINOR,
  SAFE_INTEGER_MAX,
  isAssetCode,
} from '../src/index.ts';

describe('asset catalogue (D-03)', () => {
  it('fixes the initial scales: USD/EUR/VES = 2, USDT = 6', () => {
    expect(ASSET_CODES.map((code) => [code, ASSETS[code].scale])).toEqual([
      ['USD', 2],
      ['EUR', 2],
      ['VES', 2],
      ['USDT', 6],
    ]);
  });

  it('keeps USD and USDT as different assets (R9)', () => {
    expect(ASSETS.USD).not.toBe(ASSETS.USDT);
    expect(ASSETS.USD.kind).toBe('fiat');
    expect(ASSETS.USDT.kind).toBe('stablecoin');
  });

  it('is frozen so a scale cannot be changed at runtime', () => {
    expect(Object.isFrozen(ASSETS)).toBe(true);
  });

  it('recognises only catalogue codes', () => {
    expect(isAssetCode('USDT')).toBe(true);
    expect(isAssetCode('usd')).toBe(false);
    expect(isAssetCode('BTC')).toBe(false);
  });
});

describe('money limits (DOMAIN §2)', () => {
  it('keeps the cumulative limit inside the safe integer range of the D1 binding', () => {
    expect(MAX_CUMULATIVE_ABS_MINOR <= SAFE_INTEGER_MAX).toBe(true);
    expect(MAX_LINE_ABS_MINOR < MAX_CUMULATIVE_ABS_MINOR).toBe(true);
  });

  it('allows adding one maximal line to a total at the limit without leaving the safe range', () => {
    // A guard checks "total + line <= limit" before writing; the sum itself must be exact.
    expect(MAX_CUMULATIVE_ABS_MINOR + MAX_LINE_ABS_MINOR <= SAFE_INTEGER_MAX).toBe(true);
  });
});
