/**
 * Safe money limits (DOMAIN §2).
 *
 * D1 returns INTEGER columns to the Worker as JavaScript numbers, so every stored value and
 * every SQL aggregate must stay below Number.MAX_SAFE_INTEGER (2^53 − 1).
 */

/** Maximum absolute value of a single ledger line, in minor units. */
export const MAX_LINE_ABS_MINOR = 10n ** 12n;

/** Maximum cumulative absolute total of posted lines per workspace and asset. */
export const MAX_CUMULATIVE_ABS_MINOR = 9n * 10n ** 15n;

/** 2^53 − 1, the largest integer a binding can transport without loss. */
export const SAFE_INTEGER_MAX = 2n ** 53n - 1n;
