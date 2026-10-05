-- Le client d'une ligne de facturation devient un simple nom (texte libre) : suppression de la
-- table Client (et de son mot-clé bancaire, les encaissements ne sont plus rapprochés par client).

-- AlterTable : nom du client recopié depuis la table Client
ALTER TABLE "BillingLine" ADD COLUMN "clientName" TEXT;
UPDATE "BillingLine" AS b SET "clientName" = c."name" FROM "Client" AS c WHERE c."id" = b."clientId";
ALTER TABLE "BillingLine" ALTER COLUMN "clientName" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "BillingLine" DROP CONSTRAINT "BillingLine_clientId_fkey";

-- DropIndex
DROP INDEX "BillingLine_clientId_idx";

-- AlterTable
ALTER TABLE "BillingLine" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "Client";
