/**
 * Fictitious, clearly identified test data (TESTING.md, SECURITY_OPERATIONS §8).
 * Never real people, accounts or current exchange rates.
 */
export const FIXTURE_MARKER = 'biyu-fixture' as const;

export const fixtureIdentity = {
  subject: `${FIXTURE_MARKER}:owner-a`,
  email: 'owner-a@example.test',
} as const;

export const foreignIdentity = {
  subject: `${FIXTURE_MARKER}:owner-b`,
  email: 'owner-b@example.test',
} as const;

/** Illustrative rate from DOMAIN.md examples: 40 VES per USD. Not a current rate. */
export const illustrativeRateUsdVes = { base: 'USD', quote: 'VES', num: '40', den: '1' } as const;
