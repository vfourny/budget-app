import type { db as Db } from "@server/lib/db";
import {
  DEFAULT_PROFESSIONAL_YEAR_SETTINGS,
  type ProfessionalYearSettingsValues,
} from "@shared/professional-rules";

/** Règles d'une année + leur origine : saisies pour l'année, reprises d'une année antérieure, ou défaut. */
export interface ResolvedProfessionalYearSettings {
  values: ProfessionalYearSettingsValues;
  source: "own" | "inherited" | "default";
  /** Année d'où viennent les valeurs (`null` = valeurs par défaut). */
  fromYear: number | null;
}

/**
 * Règles applicables à `year` : celles de l'année si elle est configurée, sinon celles de la
 * dernière année configurée avant elle, sinon `DEFAULT_PROFESSIONAL_YEAR_SETTINGS`.
 */
export async function resolveProfessionalYearSettings(
  db: typeof Db,
  userId: string,
  year: number,
): Promise<ResolvedProfessionalYearSettings> {
  const row = await db.professionalYearSettings.findFirst({
    where: { userId, year: { lte: year } },
    orderBy: { year: "desc" },
  });
  if (!row)
    return { values: { ...DEFAULT_PROFESSIONAL_YEAR_SETTINGS }, source: "default", fromYear: null };
  const { userId: _userId, year: fromYear, ...values } = row;
  return { values, source: fromYear === year ? "own" : "inherited", fromYear };
}
