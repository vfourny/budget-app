-- Loyer versé (RENT_PAID) distinct du futur loyer perçu (compte appartement). Renommage seul.

-- AlterEnum
ALTER TYPE "TransactionCategory" RENAME VALUE 'RENT' TO 'RENT_PAID';
