import type { TransactionCategory } from "@server/generated/prisma/enums";
import { validatedTransactions } from "@server/lib/dashboard/scope";
import type { db as Db } from "@server/lib/db";
import { htFromTtc } from "@server/lib/professional/amounts";
import {
  FORECAST_GROUPS,
  PROFESSIONAL_CHARGE_VAT_BP,
  type ForecastGroup,
} from "@shared/professional-rules";

export interface ForecastValue {
  category: TransactionCategory;
  /** Montant saisi pour le mois, `null` = valeur par défaut. */
  overrideCents: number | null;
  /** Valeur par défaut : réel du même mois l'année précédente. */
  lastYearCents: number;
  /** Réel du mois précédent (repère dans l'éditeur). */
  previousMonthCents: number;
}

/** Débits validés d'un mois par catégorie (positifs ; HT pour les charges pro). */
async function debits(
  db: typeof Db,
  userId: string,
  group: ForecastGroup,
  year: number,
  month: number,
): Promise<Map<TransactionCategory, number>> {
  const { accountType, categories } = FORECAST_GROUPS[group];
  const rows = await db.transaction.groupBy({
    by: ["category"],
    where: {
      ...validatedTransactions(userId, accountType),
      year,
      month,
      amountCents: { lt: 0 },
      category: { in: [...categories] },
    },
    _sum: { amountCents: true },
  });
  return new Map(
    rows.flatMap((row) => {
      if (!row.category) return [];
      const ttc = -(row._sum.amountCents ?? 0);
      const vatBp = (PROFESSIONAL_CHARGE_VAT_BP as Partial<Record<TransactionCategory, number>>)[
        row.category
      ];
      return [[row.category, vatBp === undefined ? ttc : htFromTtc(ttc, vatBp)] as const];
    }),
  );
}

/** Valeurs d'un groupe de l'éditeur pour un mois : saisie, défaut (N-1) et réel du mois précédent. */
export async function forecastValues(
  db: typeof Db,
  userId: string,
  group: ForecastGroup,
  year: number,
  month: number,
): Promise<ForecastValue[]> {
  const categories = FORECAST_GROUPS[group].categories;
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const [overrides, lastYear, previousMonth] = await Promise.all([
    db.monthlyForecast.findMany({
      where: { userId, year, month, category: { in: [...categories] } },
    }),
    debits(db, userId, group, year - 1, month),
    debits(db, userId, group, previous.year, previous.month),
  ]);
  return categories.map((category) => ({
    category,
    overrideCents: overrides.find((row) => row.category === category)?.amountCents ?? null,
    lastYearCents: lastYear.get(category) ?? 0,
    previousMonthCents: previousMonth.get(category) ?? 0,
  }));
}
