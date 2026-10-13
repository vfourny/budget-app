-- AlterTable: the security deposit is no longer tracked.
ALTER TABLE "Apartment" DROP COLUMN "depositCents";
