/**
 * Rounding policy (ADR 0001 D-02, DOMAIN §2).
 *
 * Amounts are rounded only when an amount is materialised, using "half away from zero".
 * The arithmetic that applies this policy is part of Money (phase 1); this module fixes the
 * decision so every layer refers to the same identifier.
 */
export const ROUNDING_MODE = 'half_away_from_zero' as const;

export type RoundingMode = typeof ROUNDING_MODE;
