-- Renommage "Pro" -> "Professional" : table des règles annuelles et valeurs pro de TransactionCategory.
-- Renommages seuls : aucune donnée n'est modifiée.

-- AlterEnum
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_OTHER_CREDIT' TO 'PROFESSIONAL_OTHER_CREDIT';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_INSURANCE' TO 'PROFESSIONAL_INSURANCE';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_ACCOUNTANT' TO 'PROFESSIONAL_ACCOUNTANT';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_BANK_FEES' TO 'PROFESSIONAL_BANK_FEES';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_EQUIPMENT' TO 'PROFESSIONAL_EQUIPMENT';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_SOFTWARE' TO 'PROFESSIONAL_SOFTWARE';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_MEALS' TO 'PROFESSIONAL_MEALS';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_TRAVEL' TO 'PROFESSIONAL_TRAVEL';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_TAXES' TO 'PROFESSIONAL_TAXES';
ALTER TYPE "TransactionCategory" RENAME VALUE 'PRO_OTHER' TO 'PROFESSIONAL_OTHER';

-- RenameTable
ALTER TABLE "ProYearSettings" RENAME TO "ProfessionalYearSettings";
ALTER TABLE "ProfessionalYearSettings" RENAME CONSTRAINT "ProYearSettings_pkey" TO "ProfessionalYearSettings_pkey";
ALTER TABLE "ProfessionalYearSettings" RENAME CONSTRAINT "ProYearSettings_userId_fkey" TO "ProfessionalYearSettings_userId_fkey";
