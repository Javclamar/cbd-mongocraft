const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/i;

const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export const parseDurationToMs = (value: string, fallbackMs: number): number => {
  const trimmed = value.trim();
  const match = DURATION_REGEX.exec(trimmed);

  if (!match) {
    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0 || !UNIT_TO_MS[unit]) {
    return fallbackMs;
  }

  return amount * UNIT_TO_MS[unit];
};
