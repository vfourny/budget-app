-- CreateEnum
CREATE TYPE "ApartmentForecastLine" AS ENUM ('grossRent', 'electricity', 'homeInsurance', 'internetBox', 'condoFees', 'propertyTax', 'cfe', 'bankFees', 'regularization', 'other');

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

-- CreateIndex
CREATE INDEX "ApartmentForecast_userId_idx" ON "ApartmentForecast"("userId");

-- AddForeignKey
ALTER TABLE "ApartmentForecast" ADD CONSTRAINT "ApartmentForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentForecast" ADD CONSTRAINT "ApartmentForecast_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move the settings amounts into the forecast, valid until the next entry: rent from the
-- acquisition month, property tax in October and CFE in December of the acquisition year.
INSERT INTO "ApartmentForecast" ("userId", "apartmentId", "year", "month", "line", "amountCents")
SELECT "userId", "id", EXTRACT(YEAR FROM "acquiredAt")::SMALLINT, EXTRACT(MONTH FROM "acquiredAt")::SMALLINT, 'grossRent', "rentCents"
FROM "Apartment" WHERE "rentCents" > 0;

INSERT INTO "ApartmentForecast" ("userId", "apartmentId", "year", "month", "line", "amountCents")
SELECT "userId", "id", EXTRACT(YEAR FROM "acquiredAt")::SMALLINT, 10, 'propertyTax', "propertyTaxCents"
FROM "Apartment" WHERE "propertyTaxCents" > 0;

INSERT INTO "ApartmentForecast" ("userId", "apartmentId", "year", "month", "line", "amountCents")
SELECT "userId", "id", EXTRACT(YEAR FROM "acquiredAt")::SMALLINT, 12, 'cfe', "cfeCents"
FROM "Apartment" WHERE "cfeCents" > 0;

-- AlterTable
ALTER TABLE "Apartment" DROP COLUMN "cfeCents",
DROP COLUMN "propertyTaxCents",
DROP COLUMN "rentCents";
