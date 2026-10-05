import { describe, expect, it } from "vitest";

import { averageDailyRate, billingAmount, roundToDayStep } from "@shared/billing-days";

describe("billing days", () => {
  it("rounds an input to the nearest half day", () => {
    expect(roundToDayStep(1.3)).toBe(1.5);
    expect(roundToDayStep(1.2)).toBe(1);
    expect(roundToDayStep(15.5)).toBe(15.5);
  });

  it("keeps half-day sums exact", () => {
    const days = Array.from({ length: 31 }, () => 0.5).reduce((total, day) => total + day, 0);
    expect(days).toBe(15.5);
  });

  it("computes the amount and the average daily rate", () => {
    expect(billingAmount({ days: 15.5, dailyRateCents: 45_000 })).toBe(697_500);
    expect(averageDailyRate(697_500, 15.5)).toBe(45_000);
    expect(averageDailyRate(0, 0)).toBe(0);
  });
});
