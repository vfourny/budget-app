import { describe, expect, it } from "vitest";

import { easterSunday, frenchHolidays, workingDays } from "@shared/working-days";

describe("workingDays", () => {
  it("finds Easter Sunday", () => {
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });

  it("lists the moving holidays", () => {
    const holidays = frenchHolidays(2026);
    expect(holidays.size).toBe(11);
    expect(holidays).toContain("2026-04-06"); // lundi de Pâques
    expect(holidays).toContain("2026-05-14"); // Ascension
    expect(holidays).toContain("2026-05-25"); // lundi de Pentecôte
  });

  it("counts weekdays minus holidays", () => {
    // 2026 : 261 jours de semaine, 9 fériés tombent en semaine (15/08 samedi, 01/11 dimanche).
    const months = Array.from({ length: 12 }, (_, index) => workingDays(2026, index + 1));
    expect(months).toEqual([21, 20, 22, 21, 17, 22, 22, 21, 22, 22, 20, 22]);
    expect(months.reduce((total, days) => total + days, 0)).toBe(252);
  });
});
