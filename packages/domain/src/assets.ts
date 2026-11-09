/**
 * Asset catalogue (DOMAIN §2, ADR 0001 D-03).
 *
 * Scales are immutable once an asset has been used: changing one would reinterpret every
 * stored `amount_minor`. A different scale requires a migration or a new asset code.
 * USD and USDT are distinct assets and are never converted implicitly (R9).
 */
export const ASSET_CODES = ['USD', 'EUR', 'VES', 'USDT'] as const;

export type AssetCode = (typeof ASSET_CODES)[number];

export type AssetKind = 'fiat' | 'stablecoin';

export interface AssetDefinition {
  readonly code: AssetCode;
  readonly kind: AssetKind;
  /** Number of decimal places represented by one minor unit. */
  readonly scale: number;
}

export const ASSETS: Readonly<Record<AssetCode, AssetDefinition>> = Object.freeze({
  USD: { code: 'USD', kind: 'fiat', scale: 2 },
  EUR: { code: 'EUR', kind: 'fiat', scale: 2 },
  VES: { code: 'VES', kind: 'fiat', scale: 2 },
  USDT: { code: 'USDT', kind: 'stablecoin', scale: 6 },
});

export function isAssetCode(value: string): value is AssetCode {
  return (ASSET_CODES as readonly string[]).includes(value);
}
