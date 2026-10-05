import type { db as Db } from "@server/lib/db";
import { DEFAULT_PRO_YEAR_SETTINGS, type ProYearSettingsValues } from "@shared/pro-rules";

/** Règles d'une année + leur origine : saisies pour l'année, reprises d'une année antérieure, ou défaut. */
export interface ResolvedProYearSettings {
  values: ProYearSettingsValues;
  source: "own" | "inherited" | "default";
  /** Année d'où viennent les valeurs (`null` = valeurs par défaut). */
  fromYear: number | null;
}

/**
 * Règles applicables à `year` : celles de l'année si elle est configurée, sinon celles de la
 * dernière année configurée avant elle, sinon `DEFAULT_PRO_YEAR_SETTINGS`.
 */
export async function resolveProYearSettings(
  db: typeof Db,
  userId: string,
  year: number,
): Promise<ResolvedProYearSettings> {
  const row = await db.proYearSettings.findFirst({
    where: { userId, year: { lte: year } },
    orderBy: { year: "desc" },
  });
  if (!row) return { values: { ...DEFAULT_PRO_YEAR_SETTINGS }, source: "default", fromYear: null };
  const { userId: _userId, year: fromYear, ...values } = row;
  return { values, source: fromYear === year ? "own" : "inherited", fromYear };
}
