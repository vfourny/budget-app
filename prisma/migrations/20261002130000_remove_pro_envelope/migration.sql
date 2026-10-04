-- Retire la valeur PRO de l'enum Envelope (jamais utilisée : le pro se distingue par AccountType).
-- Postgres ne sait pas supprimer une valeur d'enum : on recrée le type.
DELETE FROM "EnvelopeShare" WHERE "envelope" = 'PRO';

-- AlterEnum
BEGIN;
CREATE TYPE "Envelope_new" AS ENUM ('DEPENSES_COURANTES', 'LOISIRS', 'FORMATION', 'EPARGNE_SECURITE', 'EPARGNE_LONG_TERME');
ALTER TABLE "EnvelopeShare" ALTER COLUMN "envelope" TYPE "Envelope_new" USING ("envelope"::text::"Envelope_new");
ALTER TYPE "Envelope" RENAME TO "Envelope_old";
ALTER TYPE "Envelope_new" RENAME TO "Envelope";
DROP TYPE "Envelope_old";
COMMIT;
