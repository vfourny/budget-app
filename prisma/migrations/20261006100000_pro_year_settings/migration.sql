-- Règles de Stygma par année (Réglages › Pro).

-- CreateEnum
CREATE TYPE "CompanyRegime" AS ENUM ('SAS_IR', 'SAS_IS', 'EURL');

-- CreateTable
CREATE TABLE "ProYearSettings" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "regime" "CompanyRegime" NOT NULL DEFAULT 'SAS_IR',
    "irOptionFirstYear" SMALLINT NOT NULL,
    "grossSalaryCents" INTEGER NOT NULL,
    "employerContributionBp" INTEGER NOT NULL,
    "employeeContributionBp" INTEGER NOT NULL,
    "taxableNetBp" INTEGER NOT NULL,
    "withholdingTaxBp" INTEGER NOT NULL,
    "profitSocialChargesBp" INTEGER NOT NULL,
    "officeAreaDm2" INTEGER NOT NULL,
    "homeAreaDm2" INTEGER NOT NULL,
    "mixedKeyNumerator" SMALLINT NOT NULL,
    "mixedKeyDenominator" SMALLINT NOT NULL,
    "mileageRateMilli" INTEGER NOT NULL,

    CONSTRAINT "ProYearSettings_pkey" PRIMARY KEY ("userId","year")
);

-- AddForeignKey
ALTER TABLE "ProYearSettings" ADD CONSTRAINT "ProYearSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
