import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";

import { BankAccountType, PrismaClient } from "../server/generated/prisma/client";
// Import de type uniquement (effacé à l'exécution) : le seed ne charge pas les alias `@server/`.
import type { SupportedBank } from "../server/lib/csv/banks";

// Le seed tourne via la CLI (hors Next) : il crée son propre client plutôt que d'importer
// src/server/db.ts (protégé par "server-only").
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL requis pour le seed");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

// `bank` doit correspondre à une clé de `BANK_CSV_CONFIGS` : `satisfies` le vérifie à la compilation.
const bankAccounts = [
  { name: "Compte courant perso", type: BankAccountType.PERSO, bank: "BoursoBank" },
  { name: "Compte pro Stygma", type: BankAccountType.PRO, bank: "Banque Populaire" },
] as const satisfies readonly { name: string; type: BankAccountType; bank: SupportedBank }[];

async function main() {
  for (const bankAccount of bankAccounts) {
    await prisma.bankAccount.upsert({
      where: { name: bankAccount.name },
      update: {},
      create: bankAccount,
    });
  }

  console.log(`Seed OK : ${bankAccounts.length} comptes`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
