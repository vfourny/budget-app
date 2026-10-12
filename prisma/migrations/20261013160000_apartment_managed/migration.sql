-- AlterTable: the manager's name is replaced by a managed / direct flag.
ALTER TABLE "Apartment" ADD COLUMN "managed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Apartment" SET "managed" = true WHERE "managerName" IS NOT NULL;

ALTER TABLE "Apartment" DROP COLUMN "managerName";
