import { db } from "@server/lib/db";

/**
 * Deux appartements fictifs (données de dev local) : Toulouse, loué meublé et géré par une agence,
 * et Lyon, loué en direct. Montants en centimes, taux en points de base (3,00 % = 300). Les chiffres
 * du prêt de Toulouse (mensualité ≈ 1 148,83 €) servent à vérifier `loanSchedule` (PR suivante).
 */
const APARTMENTS_SEED = [
  {
    name: "Toulouse",
    kind: "FURNISHED",
    managerName: "Agence Exemple",
    acquiredAt: new Date(Date.UTC(2025, 5, 1)),
    priceCents: 18_500_000,
    rentCents: 78_000,
    depositCents: 78_000,
    managementFeeBps: 700,
    creditInsuranceCents: 2_900,
    propertyTaxCents: 95_000,
    cfeCents: 21_000,
    loanPrincipalCents: 16_635_700,
    loanRateBps: 300,
    loanTermMonths: 180,
    loanFirstDueDate: new Date(Date.UTC(2025, 6, 5)),
    openingBalanceCents: 53_743,
  },
  {
    name: "Lyon",
    kind: "FURNISHED",
    managerName: null,
    acquiredAt: new Date(Date.UTC(2026, 0, 1)),
    priceCents: 14_200_000,
    rentCents: 62_000,
    depositCents: 62_000,
    managementFeeBps: 0,
    creditInsuranceCents: 1_800,
    propertyTaxCents: 70_000,
    cfeCents: 18_000,
    loanPrincipalCents: 12_000_000,
    loanRateBps: 350,
    loanTermMonths: 240,
    loanFirstDueDate: new Date(Date.UTC(2026, 1, 5)),
    openingBalanceCents: 0,
  },
] as const;

/** Un appartement déjà présent (même nom) n'est jamais touché : les saisies faites dans l'app restent. */
export async function seedApartments(userId: string) {
  const year = new Date().getUTCFullYear();
  let created = 0;
  for (const { openingBalanceCents, ...apartment } of APARTMENTS_SEED) {
    const existing = await db.apartment.findFirst({
      where: { userId, name: apartment.name },
      select: { id: true },
    });
    if (existing) continue;
    await db.apartment.create({
      data: {
        ...apartment,
        userId,
        yearOpenings: { create: { userId, year, openingBalanceCents } },
      },
    });
    created++;
  }
  process.stdout.write(`Appartements : ${created} créé(s)` + "\n");
}
