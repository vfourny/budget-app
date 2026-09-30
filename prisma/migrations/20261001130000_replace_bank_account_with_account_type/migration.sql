-- BankAccount -> simple type PERSO/PRO porté par ImportBatch et Transaction.
-- Les données existantes sont conservées : le type est recopié depuis le compte avant sa suppression.
ALTER TYPE "BankAccountType" RENAME TO "AccountType";

ALTER TABLE "ImportBatch" ADD COLUMN "accountType" "AccountType";
UPDATE "ImportBatch" AS i SET "accountType" = a."type" FROM "BankAccount" AS a WHERE a."id" = i."bankAccountId";
ALTER TABLE "ImportBatch" ALTER COLUMN "accountType" SET NOT NULL;

ALTER TABLE "Transaction" ADD COLUMN "accountType" "AccountType";
UPDATE "Transaction" AS t SET "accountType" = a."type" FROM "BankAccount" AS a WHERE a."id" = t."bankAccountId";
ALTER TABLE "Transaction" ALTER COLUMN "accountType" SET NOT NULL;

DROP INDEX "ImportBatch_bankAccountId_idx";
DROP INDEX "Transaction_bankAccountId_year_month_idx";
ALTER TABLE "ImportBatch" DROP CONSTRAINT "ImportBatch_bankAccountId_fkey", DROP COLUMN "bankAccountId";
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_bankAccountId_fkey", DROP COLUMN "bankAccountId";

DROP TABLE "BankAccount";

CREATE INDEX "Transaction_accountType_year_month_idx" ON "Transaction"("accountType", "year", "month");
