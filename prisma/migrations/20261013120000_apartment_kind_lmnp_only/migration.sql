-- Seul le LMNP reste : un bien éventuellement saisi en « nue » ou « SCI » repasse en LMNP
-- (sinon la conversion vers le nouvel enum échouerait).
UPDATE "Apartment" SET "kind" = 'FURNISHED' WHERE "kind" <> 'FURNISHED';

-- AlterEnum
BEGIN;
CREATE TYPE "ApartmentKind_new" AS ENUM ('FURNISHED');
ALTER TABLE "Apartment" ALTER COLUMN "kind" TYPE "ApartmentKind_new" USING ("kind"::text::"ApartmentKind_new");
ALTER TYPE "ApartmentKind" RENAME TO "ApartmentKind_old";
ALTER TYPE "ApartmentKind_new" RENAME TO "ApartmentKind";
DROP TYPE "ApartmentKind_old";
COMMIT;
