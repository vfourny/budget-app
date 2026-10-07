import { auth } from "./auth";
import { common } from "./common";
import {
  accountTypes,
  apartmentKinds,
  categories,
  companyRegimes,
  envelopes,
  importStatus,
  revenueLines,
} from "./enums";
import { csvErrors, errors } from "./errors";
import { importForm, imports } from "./imports";
import { nav } from "./nav";
import { period } from "./period";
import { personal } from "./personal";
import { review } from "./review";
import { professional } from "./professional";
import { settings } from "./settings";
import { transactions } from "./transactions";

/** Locale des formats (`Intl`) : dates, montants. */
export const LOCALE = "fr-FR";

/** Noms des mois (index 0 = janvier). */
const months = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Noms courts des mois (colonnes, axes). */
const monthsShort = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

/**
 * Tous les textes affichés de l'app (UI en français). Un texte vient d'ici, jamais écrit en dur
 * dans un composant. Un dictionnaire par domaine ; ceux qui dépendent d'un enum Prisma sont
 * vérifiés par `satisfies Record<Enum, string>` (voir `enums.ts`).
 */
export const fr = {
  auth,
  common,
  nav,
  imports,
  importForm,
  review,
  period,
  personal,
  settings,
  professional,
  transactions,
  accountTypes,
  apartmentKinds,
  companyRegimes,
  importStatus,
  envelopes,
  categories,
  revenueLines,
  errors,
  csvErrors,
  months,
  monthsShort,
} as const;
