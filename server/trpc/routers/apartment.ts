import { z } from "zod";

import { ApartmentKind } from "@server/generated/prisma/enums";
import { appError } from "@server/lib/app-error";
import { createTRPCRouter, protectedProcedure } from "@server/trpc/init";

const cents = z.number().int().min(0).max(2_000_000_000);

/** Prêt à taux fixe : les quatre champs ensemble, ou pas de prêt (`null`). */
const loanSchema = z.object({
  principalCents: z.number().int().min(1).max(2_000_000_000),
  /** Points de base : 3,00 % = 300. */
  rateBps: z.number().int().min(0).max(10_000),
  termMonths: z.number().int().min(1).max(600),
  firstDueDate: z.date(),
});

const saveSchema = z.object({
  /** Absent = création. */
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(ApartmentKind),
  /** Vide = location en direct (pas de facture de gérance). */
  managerName: z.string().trim().max(80),
  acquiredAt: z.date(),
  priceCents: cents,
  rentCents: cents,
  depositCents: cents,
  managementFeeBps: z.number().int().min(0).max(10_000),
  creditInsuranceCents: cents,
  propertyTaxCents: cents,
  cfeCents: cents,
  loan: loanSchema.nullable(),
  /** Solde réel du compte appartement au 1er janvier de `openingYear` (R5). */
  openingYear: z.number().int().min(2000).max(2100),
  openingBalanceCents: z.number().int().min(-2_000_000_000).max(2_000_000_000),
});

/** Jour civil en UTC (minuit), comme `@db.Date`. */
function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const apartmentRouter = createTRPCRouter({
  /** Appartements de l'utilisateur, avec le solde de début d'année de `year` (0 si non saisi). */
  list: protectedProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await ctx.db.apartment.findMany({
        where: { userId },
        orderBy: [{ acquiredAt: "asc" }, { name: "asc" }],
        include: { yearOpenings: { where: { year: input.year } } },
      });
      return rows.map(({ yearOpenings, ...apartment }) => ({
        id: apartment.id,
        name: apartment.name,
        kind: apartment.kind,
        managerName: apartment.managerName ?? "",
        acquiredAt: apartment.acquiredAt,
        priceCents: apartment.priceCents,
        rentCents: apartment.rentCents,
        depositCents: apartment.depositCents,
        managementFeeBps: apartment.managementFeeBps,
        creditInsuranceCents: apartment.creditInsuranceCents,
        propertyTaxCents: apartment.propertyTaxCents,
        cfeCents: apartment.cfeCents,
        loan:
          apartment.loanPrincipalCents !== null &&
          apartment.loanRateBps !== null &&
          apartment.loanTermMonths !== null &&
          apartment.loanFirstDueDate !== null
            ? {
                principalCents: apartment.loanPrincipalCents,
                rateBps: apartment.loanRateBps,
                termMonths: apartment.loanTermMonths,
                firstDueDate: apartment.loanFirstDueDate,
              }
            : null,
        openingBalanceCents: yearOpenings[0]?.openingBalanceCents ?? 0,
      }));
    }),

  /** Crée ou met à jour un appartement et son solde de début d'année, en une transaction SQL. */
  save: protectedProcedure.input(saveSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { id, loan, openingYear, openingBalanceCents, managerName, acquiredAt, ...fields } =
      input;
    const data = {
      ...fields,
      managerName: managerName === "" ? null : managerName,
      // 1er du mois d'acquisition : l'appartement est actif à partir de ce mois (R1).
      acquiredAt: new Date(Date.UTC(acquiredAt.getUTCFullYear(), acquiredAt.getUTCMonth(), 1)),
      loanPrincipalCents: loan?.principalCents ?? null,
      loanRateBps: loan?.rateBps ?? null,
      loanTermMonths: loan?.termMonths ?? null,
      loanFirstDueDate: loan ? utcDay(loan.firstDueDate) : null,
    };

    return ctx.db.$transaction(async (tx) => {
      let apartmentId = id;
      if (apartmentId) {
        const { count } = await tx.apartment.updateMany({
          where: { id: apartmentId, userId },
          data,
        });
        if (count === 0) throw appError("NOT_FOUND", "APARTMENT_NOT_FOUND");
      } else {
        apartmentId = (
          await tx.apartment.create({ data: { ...data, userId }, select: { id: true } })
        ).id;
      }
      await tx.apartmentYearOpening.upsert({
        where: { apartmentId_year: { apartmentId, year: openingYear } },
        create: { userId, apartmentId, year: openingYear, openingBalanceCents },
        update: { openingBalanceCents },
      });
      return { id: apartmentId };
    });
  }),

  /** Refusé tant que l'appartement porte des transactions ou des relevés (R11) : les détacher d'abord. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const apartment = await ctx.db.apartment.findFirst({
        where: { id: input.id, userId },
        select: { id: true },
      });
      if (!apartment) throw appError("NOT_FOUND", "APARTMENT_NOT_FOUND");
      const [transactions, imports] = await Promise.all([
        ctx.db.transaction.count({ where: { userId, apartmentId: input.id } }),
        ctx.db.importBatch.count({ where: { userId, apartmentId: input.id } }),
      ]);
      if (transactions > 0 || imports > 0) throw appError("CONFLICT", "APARTMENT_HAS_TRANSACTIONS");
      await ctx.db.apartment.delete({ where: { id: input.id } });
      return input;
    }),
});
