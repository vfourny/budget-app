-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Envelope" AS ENUM ('CURRENT_EXPENSES', 'LEISURE', 'TRAINING', 'SAFETY_SAVINGS', 'LONG_TERM_SAVINGS');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('FUEL', 'BANK_INSURANCE', 'RESTAURANT', 'GROCERIES', 'NIGHTLIFE', 'LEISURE', 'CLOTHING_CARE', 'HEALTH', 'TRANSPORT', 'TAXES', 'OTHER_SUBSCRIPTIONS', 'OTHER', 'LONG_TERM_SAVINGS');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING_REVIEW', 'VALIDATED');

-- CreateTable
CREATE TABLE "EnvelopeShare" (
    "envelope" "Envelope" NOT NULL,
    "percent" INTEGER NOT NULL,

    CONSTRAINT "EnvelopeShare_pkey" PRIMARY KEY ("envelope")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "category" "TransactionCategory",
    "categoryConfidence" DOUBLE PRECISION,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_year_month_idx" ON "Transaction"("year", "month");

-- CreateIndex
CREATE INDEX "Transaction_accountType_year_month_idx" ON "Transaction"("accountType", "year", "month");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "Transaction"("importBatchId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
