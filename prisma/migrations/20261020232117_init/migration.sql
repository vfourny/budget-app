-- CreateEnum
CREATE TYPE "ApartmentKind" AS ENUM ('FURNISHED');

-- CreateEnum
CREATE TYPE "ApartmentForecastLine" AS ENUM ('grossRent', 'electricity', 'homeInsurance', 'internetBox', 'condoFees', 'propertyTax', 'cfe', 'bankFees', 'regularization', 'other');

-- CreateEnum
CREATE TYPE "Envelope" AS ENUM ('CURRENT_EXPENSES', 'LEISURE', 'TRAINING', 'SAFETY_SAVINGS', 'LONG_TERM_SAVINGS');

-- CreateEnum
CREATE TYPE "CompanyRegime" AS ENUM ('SAS_IR', 'SAS_IS', 'EURL');

-- CreateEnum
CREATE TYPE "BillingKind" AS ENUM ('FORECAST', 'ACTUAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'PROFESSIONAL', 'APARTMENT');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('RENT_PAID', 'FUEL', 'BANK_INSURANCE', 'RESTAURANT', 'GROCERIES', 'NIGHTLIFE', 'LEISURE', 'CLOTHING_CARE', 'HEALTH', 'TRANSPORT', 'TAXES', 'OTHER_SUBSCRIPTIONS', 'ENERGY', 'TELECOM', 'INTERNET', 'OTHER', 'LONG_TERM_SAVINGS', 'SALARY_PAYMENT', 'BNC_PAYMENT', 'VACATION_PAYMENT', 'REFUND', 'PROFESSIONAL_REFUND', 'TRAINING', 'SHORT_TERM_SAVINGS', 'CLIENT_PAYMENT', 'PROFESSIONAL_OTHER_CREDIT', 'PROFESSIONAL_INSURANCE', 'PROFESSIONAL_ACCOUNTANT', 'PROFESSIONAL_BANK_FEES', 'PROFESSIONAL_EQUIPMENT', 'PROFESSIONAL_SOFTWARE', 'PROFESSIONAL_MEALS', 'PROFESSIONAL_TRAVEL', 'PROFESSIONAL_TAXES', 'PROFESSIONAL_OTHER', 'NET_SALARY_TRANSFER', 'BNC_WITHDRAWAL', 'MIXED_COSTS_REFUND', 'URSSAF', 'SUPPLEMENTARY_PENSION', 'HEALTH_COVER', 'DISABILITY_COVER', 'WITHHOLDING_TAX', 'VAT_PAYMENT', 'APT_RENT_RECEIVED', 'APT_LOAN_REPAYMENT', 'APT_LOAN_INSURANCE', 'APT_HOME_INSURANCE', 'APT_CONDO_FEES', 'APT_PROPERTY_TAX', 'APT_CFE', 'APT_BANK_FEES', 'APT_REGULARIZATION', 'APT_OWNER_CONTRIBUTION', 'APT_OTHER', 'APARTMENT_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING_REVIEW', 'VALIDATED');

-- CreateTable
CREATE TABLE "Apartment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ApartmentKind" NOT NULL,
    "managed" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" DATE NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "managementFeeBps" INTEGER NOT NULL DEFAULT 0,
    "creditInsuranceCents" INTEGER NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "ApartmentForecast" (
    "userId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "line" "ApartmentForecastLine" NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "ApartmentForecast_pkey" PRIMARY KEY ("apartmentId","year","month","line")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvelopeShare" (
    "userId" TEXT NOT NULL,
    "envelope" "Envelope" NOT NULL,
    "percent" INTEGER NOT NULL,

    CONSTRAINT "EnvelopeShare_pkey" PRIMARY KEY ("userId","envelope")
);

-- CreateTable
CREATE TABLE "ProfessionalYearSettings" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "regime" "CompanyRegime" NOT NULL DEFAULT 'SAS_IR',
    "employerContributionBp" INTEGER NOT NULL,
    "employeeContributionBp" INTEGER NOT NULL,
    "taxableNetBp" INTEGER NOT NULL,
    "withholdingTaxBp" INTEGER NOT NULL,
    "profitSocialChargesBp" INTEGER NOT NULL,
    "officeAreaDm2" INTEGER NOT NULL,
    "homeAreaDm2" INTEGER NOT NULL,
    "mileageRateMilli" INTEGER NOT NULL,

    CONSTRAINT "ProfessionalYearSettings_pkey" PRIMARY KEY ("userId","year")
);

-- CreateTable
CREATE TABLE "BillingLine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "kind" "BillingKind" NOT NULL,
    "dailyRateCents" INTEGER NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BillingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyForecast" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "amountCents" INTEGER NOT NULL,

    CONSTRAINT "MonthlyForecast_pkey" PRIMARY KEY ("userId","year","month","category")
);

-- CreateTable
CREATE TABLE "MileageForecast" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "km" INTEGER NOT NULL,

    CONSTRAINT "MileageForecast_pkey" PRIMARY KEY ("userId","year","month")
);

-- CreateTable
CREATE TABLE "SalaryForecast" (
    "userId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "grossSalaryCents" INTEGER NOT NULL,

    CONSTRAINT "SalaryForecast_pkey" PRIMARY KEY ("userId","year","month")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "route" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "km" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "apartmentId" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvFormat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "category" "TransactionCategory",
    "categoryConfidence" DOUBLE PRECISION,
    "importBatchId" TEXT,
    "apartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Apartment_userId_idx" ON "Apartment"("userId");

-- CreateIndex
CREATE INDEX "ApartmentYearOpening_userId_idx" ON "ApartmentYearOpening"("userId");

-- CreateIndex
CREATE INDEX "ManagementInvoice_userId_idx" ON "ManagementInvoice"("userId");

-- CreateIndex
CREATE INDEX "ApartmentForecast_userId_idx" ON "ApartmentForecast"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "BillingLine_userId_year_month_idx" ON "BillingLine"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "Trip_userId_year_month_idx" ON "Trip"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CsvFormat_userId_fingerprint_key" ON "CsvFormat"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "Transaction_userId_year_month_idx" ON "Transaction"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "Transaction_userId_accountType_year_month_idx" ON "Transaction"("userId", "accountType", "year", "month");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "Transaction"("importBatchId");

-- CreateIndex
CREATE INDEX "Transaction_userId_apartmentId_year_month_idx" ON "Transaction"("userId", "apartmentId", "year", "month");

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

-- AddForeignKey
ALTER TABLE "ApartmentForecast" ADD CONSTRAINT "ApartmentForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentForecast" ADD CONSTRAINT "ApartmentForecast_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeShare" ADD CONSTRAINT "EnvelopeShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalYearSettings" ADD CONSTRAINT "ProfessionalYearSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLine" ADD CONSTRAINT "BillingLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyForecast" ADD CONSTRAINT "MonthlyForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageForecast" ADD CONSTRAINT "MileageForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryForecast" ADD CONSTRAINT "SalaryForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvFormat" ADD CONSTRAINT "CsvFormat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
