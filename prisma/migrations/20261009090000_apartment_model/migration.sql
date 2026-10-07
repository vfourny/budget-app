-- Appartements : type de compte APARTMENT, modèles Apartment / ApartmentYearOpening / ManagementInvoice,
-- rattachement des relevés et des transactions à un appartement, catégories APT_* (voir docs/plan-appartements.md).

-- CreateEnum
CREATE TYPE "ApartmentKind" AS ENUM ('FURNISHED', 'UNFURNISHED', 'SCI');

-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'APARTMENT';

-- AlterEnum
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_RENT_RECEIVED';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_LOAN_REPAYMENT';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_LOAN_INSURANCE';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_HOME_INSURANCE';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_CONDO_FEES';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_PROPERTY_TAX';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_CFE';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_BANK_FEES';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_REGULARIZATION';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_OWNER_CONTRIBUTION';
ALTER TYPE "TransactionCategory" ADD VALUE 'APT_OTHER';
ALTER TYPE "TransactionCategory" ADD VALUE 'APARTMENT_CONTRIBUTION';

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "apartmentId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "apartmentId" TEXT;

-- CreateTable
CREATE TABLE "Apartment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ApartmentKind" NOT NULL,
    "managerName" TEXT,
    "acquiredAt" DATE NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "rentCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "managementFeeBps" INTEGER NOT NULL DEFAULT 0,
    "creditInsuranceCents" INTEGER NOT NULL DEFAULT 0,
    "propertyTaxCents" INTEGER NOT NULL DEFAULT 0,
    "cfeCents" INTEGER NOT NULL DEFAULT 0,
    "loanPrincipalCents" INTEGER,
    "loanRateBps" INTEGER,
    "loanTermMonths" INTEGER,
    "loanFirstDueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApartmentYearOpening" (
    "userId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "openingBalanceCents" INTEGER NOT NULL,

    CONSTRAINT "ApartmentYearOpening_pkey" PRIMARY KEY ("apartmentId","year")
);

-- CreateTable
CREATE TABLE "ManagementInvoice" (
    "userId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "feesCents" INTEGER NOT NULL,
    "extraFeesCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ManagementInvoice_pkey" PRIMARY KEY ("apartmentId","year","month")
);

-- CreateIndex
CREATE INDEX "Apartment_userId_idx" ON "Apartment"("userId");

-- CreateIndex
CREATE INDEX "ApartmentYearOpening_userId_idx" ON "ApartmentYearOpening"("userId");

-- CreateIndex
CREATE INDEX "ManagementInvoice_userId_idx" ON "ManagementInvoice"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_apartmentId_year_month_idx" ON "Transaction"("userId", "apartmentId", "year", "month");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentYearOpening" ADD CONSTRAINT "ApartmentYearOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentYearOpening" ADD CONSTRAINT "ApartmentYearOpening_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementInvoice" ADD CONSTRAINT "ManagementInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementInvoice" ADD CONSTRAINT "ManagementInvoice_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
