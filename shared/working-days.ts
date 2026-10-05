/**
 * Jours ouvrés d'un mois (lundi → vendredi, hors jours fériés français de métropole).
 * Les dates sont manipulées en UTC pour ne pas dépendre du fuseau de la machine.
 */

/** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher, calendrier grégorien). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const addDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Les 11 jours fériés de métropole (hors Alsace-Moselle), au format `AAAA-MM-JJ`. */
export function frenchHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
  return new Set([
    ...fixed.map((monthDay) => `${year}-${monthDay}`),
    dayKey(addDays(easter, 1)), // lundi de Pâques
    dayKey(addDays(easter, 39)), // Ascension
    dayKey(addDays(easter, 50)), // lundi de Pentecôte
  ]);
}

/** Nombre de jours ouvrés du mois (`month` de 1 à 12). */
export function workingDays(year: number, month: number): number {
  const holidays = frenchHolidays(year);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekDay = date.getUTCDay();
    if (weekDay !== 0 && weekDay !== 6 && !holidays.has(dayKey(date))) count++;
  }
  return count;
}
