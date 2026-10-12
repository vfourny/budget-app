-- La clé des autres frais mixtes est fixe (5/7, MIXED_COSTS_KEY dans shared/professional-rules.ts).
-- AlterTable
ALTER TABLE "ProfessionalYearSettings" DROP COLUMN "mixedKeyDenominator",
DROP COLUMN "mixedKeyNumerator";

