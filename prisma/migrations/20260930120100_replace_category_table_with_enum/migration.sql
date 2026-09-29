-- La table Category devient un enum Postgres (liste figée). Aucune transaction n'existe encore
-- (import non implémenté) : seules les lignes de seed de Category sont supprimées.
CREATE TYPE "TransactionCategory" AS ENUM ('ESSENCE', 'ASSURANCE', 'RESTAURANT', 'ALIMENTAIRE', 'SOIREE', 'LOISIRS', 'VETEMENTS_SOINS', 'SANTE', 'TRANSPORT', 'IMPOTS_TAXES', 'AUTRES_ABONNEMENTS', 'AUTRES', 'EPARGNE_LONG_TERME');

-- Supprime aussi l'index et la clé étrangère liés à la colonne.
ALTER TABLE "Transaction" DROP COLUMN "categoryId";
ALTER TABLE "Transaction" ADD COLUMN "category" "TransactionCategory";

DROP TABLE "Category";

CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");
