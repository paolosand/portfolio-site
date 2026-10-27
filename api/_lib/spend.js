import { LIMITS } from './limits-config.js';

// Gemini bills thinking tokens as output, so they count toward the output rate.
export function costUsd(usage) {
  const { rates } = LIMITS;
  const input = usage?.promptTokenCount ?? 0;
  const output = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
  return (input * rates.inputPerM + output * rates.outputPerM) / 1e6;
}

export function tierForSpend(monthSpendUsd, limits = LIMITS) {
  if (!(limits.tripBudgetUsd > 0)) return { ceiling: true, chatCap: null };
  const fraction = monthSpendUsd / limits.tripBudgetUsd;
  const tier = limits.tiers.find((t) => fraction < t.below);
  return tier ? { ceiling: false, chatCap: tier.cap } : { ceiling: true, chatCap: null };
}
