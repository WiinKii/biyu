import { z } from 'zod';

/**
 * Money on the wire (API.md §1): `amount_minor` is always a string holding a base-10 integer,
 * never a JSON number or a decimal. USD 100.00 = "10000".
 */
export const amountMinorSchema = z
  .string()
  .regex(/^-?(0|[1-9][0-9]*)$/, 'amount_minor debe ser un entero en texto')
  .refine((value) => value !== '-0', 'amount_minor no admite -0');

export const assetCodeSchema = z.enum(['USD', 'EUR', 'VES', 'USDT']);

export const moneySchema = z.strictObject({
  asset: assetCodeSchema,
  amount_minor: amountMinorSchema,
});

export type MoneyDto = z.infer<typeof moneySchema>;

/** Positive integer as text, used for rate numerators/denominators. */
const positiveIntegerTextSchema = z.string().regex(/^[1-9][0-9]*$/, 'Debe ser un entero positivo');

/** Rate: `num/den` units of `quote` per unit of `base` (API.md §1, DOMAIN §2). */
export const rateSchema = z.strictObject({
  base: assetCodeSchema,
  quote: assetCodeSchema,
  num: positiveIntegerTextSchema,
  den: positiveIntegerTextSchema,
});

export type RateDto = z.infer<typeof rateSchema>;
