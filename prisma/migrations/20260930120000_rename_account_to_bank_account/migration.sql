-- Renommage Account -> BankAccount (sans perte de données : uniquement des RENAME).
ALTER TYPE "AccountType" RENAME TO "BankAccountType";

ALTER TABLE "Account" RENAME TO "BankAccount";
ALTER TABLE "BankAccount" RENAME CONSTRAINT "Account_pkey" TO "BankAccount_pkey";
ALTER INDEX "Account_name_key" RENAME TO "BankAccount_name_key";

ALTER TABLE "ImportBatch" RENAME COLUMN "accountId" TO "bankAccountId";
ALTER TABLE "ImportBatch" RENAME CONSTRAINT "ImportBatch_accountId_fkey" TO "ImportBatch_bankAccountId_fkey";
ALTER INDEX "ImportBatch_accountId_idx" RENAME TO "ImportBatch_bankAccountId_idx";

ALTER TABLE "Transaction" RENAME COLUMN "accountId" TO "bankAccountId";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Transaction_accountId_fkey" TO "Transaction_bankAccountId_fkey";
ALTER INDEX "Transaction_accountId_year_month_idx" RENAME TO "Transaction_bankAccountId_year_month_idx";
