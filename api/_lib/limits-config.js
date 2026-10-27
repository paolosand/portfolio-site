// Single source of truth for pao-gpt abuse limits and Gemini pricing.
const DEFAULT_TRIP_BUDGET_USD = 15;

export function loadLimits(env = process.env) {
  // A typo'd env var must not disable the tiers (NaN/0 would make every spend "over budget").
  const override = Number(env.MONTHLY_TRIP_BUDGET_USD);
  const tripBudgetUsd = Number.isFinite(override) && override > 0 ? override : DEFAULT_TRIP_BUDGET_USD;

  return {
    rates: { inputPerM: 0.30, outputPerM: 2.50 }, // USD per 1M tokens
    history: { lastN: 5, perMessageChars: 4000, totalChars: 12000 },
    ip: { perMinute: 6, perDay: 150 },
    siteDailyUsd: 2,
    tripBudgetUsd,
    // `below` is a fraction of tripBudgetUsd; at or past the last one, the ceiling applies.
    tiers: [
      { below: 0.25, cap: 50 },
      { below: 0.5, cap: 30 },
      { below: 0.75, cap: 20 },
      { below: 1.0, cap: 10 },
    ],
    chatKeyTtlSeconds: 86400,
  };
}

export const LIMITS = loadLimits();
