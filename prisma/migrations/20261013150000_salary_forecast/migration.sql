-- Le salaire brut se prévoit mois par mois dans l'éditeur du prévisionnel, plus dans Réglages › Pro.

-- CreateTable
CREATE TABLE "SalaryForecast" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "grossSalaryCents" INTEGER NOT NULL,

    CONSTRAINT "SalaryForecast_pkey" PRIMARY KEY ("userId","year","month")
);

-- AddForeignKey
ALTER TABLE "SalaryForecast" ADD CONSTRAINT "SalaryForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des données : le salaire de chaque année configurée devient le prévu de ses 12 mois.
INSERT INTO "SalaryForecast" ("userId", "year", "month", "grossSalaryCents")
SELECT s."userId", s."year", m.month, s."grossSalaryCents"
FROM "ProfessionalYearSettings" s
CROSS JOIN generate_series(1, 12) AS m(month);

-- AlterTable
ALTER TABLE "ProfessionalYearSettings" DROP COLUMN "grossSalaryCents";
