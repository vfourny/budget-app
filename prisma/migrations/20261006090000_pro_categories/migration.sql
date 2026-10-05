-- Catégories du compte pro (Stygma).

-- AlterEnum
ALTER TYPE "TransactionCategory" ADD VALUE 'CLIENT_PAYMENT';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_OTHER_CREDIT';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_INSURANCE';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_ACCOUNTANT';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_BANK_FEES';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_EQUIPMENT';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_SOFTWARE';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_MEALS';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_TRAVEL';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_TAXES';
ALTER TYPE "TransactionCategory" ADD VALUE 'PRO_OTHER';
ALTER TYPE "TransactionCategory" ADD VALUE 'NET_SALARY_TRANSFER';
ALTER TYPE "TransactionCategory" ADD VALUE 'BNC_WITHDRAWAL';
ALTER TYPE "TransactionCategory" ADD VALUE 'MIXED_COSTS_REFUND';
ALTER TYPE "TransactionCategory" ADD VALUE 'URSSAF';
ALTER TYPE "TransactionCategory" ADD VALUE 'SUPPLEMENTARY_PENSION';
ALTER TYPE "TransactionCategory" ADD VALUE 'HEALTH_COVER';
ALTER TYPE "TransactionCategory" ADD VALUE 'DISABILITY_COVER';
ALTER TYPE "TransactionCategory" ADD VALUE 'WITHHOLDING_TAX';
ALTER TYPE "TransactionCategory" ADD VALUE 'VAT_PAYMENT';
