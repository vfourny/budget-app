-- Jours facturés stockés tels quels (multiples de 0,5) au lieu de demi-journées entières.
ALTER TABLE "BillingLine" ADD COLUMN "days" DOUBLE PRECISION;
UPDATE "BillingLine" SET "days" = "halfDays" / 2.0;
ALTER TABLE "BillingLine" ALTER COLUMN "days" SET NOT NULL;
ALTER TABLE "BillingLine" DROP COLUMN "halfDays";
