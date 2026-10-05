-- Rattache les données métier à un utilisateur (EnvelopeShare, ImportBatch, Transaction).
-- Les lignes existantes sont attribuées au compte le plus ancien (l'app était mono-utilisateur).
-- Si des lignes existent mais qu'aucun User n'existe, le SET NOT NULL échoue : lancer le seed avant.

-- DropIndex
DROP INDEX "Transaction_year_month_idx";

-- DropIndex
DROP INDEX "Transaction_accountType_year_month_idx";

-- AlterTable : colonnes nullables le temps du backfill
ALTER TABLE "EnvelopeShare" ADD COLUMN "userId" TEXT;
ALTER TABLE "ImportBatch" ADD COLUMN "userId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;

-- Backfill
UPDATE "EnvelopeShare" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
UPDATE "ImportBatch" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
UPDATE "Transaction" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);

-- AlterTable : NOT NULL
ALTER TABLE "EnvelopeShare" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ImportBatch" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;

-- Nouvelle clé primaire d'EnvelopeShare : (userId, envelope)
ALTER TABLE "EnvelopeShare" DROP CONSTRAINT "EnvelopeShare_pkey";
ALTER TABLE "EnvelopeShare" ADD CONSTRAINT "EnvelopeShare_pkey" PRIMARY KEY ("userId", "envelope");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");
CREATE INDEX "Transaction_userId_year_month_idx" ON "Transaction"("userId", "year", "month");
CREATE INDEX "Transaction_userId_accountType_year_month_idx" ON "Transaction"("userId", "accountType", "year", "month");

-- AddForeignKey
ALTER TABLE "EnvelopeShare" ADD CONSTRAINT "EnvelopeShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
