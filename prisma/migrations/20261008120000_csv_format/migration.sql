-- Formats d'export CSV connus par utilisateur (empreinte de l'en-tête → mapping des colonnes).

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

-- CreateIndex
CREATE UNIQUE INDEX "CsvFormat_userId_fingerprint_key" ON "CsvFormat"("userId", "fingerprint");

-- AddForeignKey
ALTER TABLE "CsvFormat" ADD CONSTRAINT "CsvFormat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
