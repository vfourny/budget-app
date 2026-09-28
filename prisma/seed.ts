import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";

import { AccountType, Envelope, PrismaClient } from "../server/generated/prisma/client";

// Le seed tourne via la CLI (hors Next) : il crée son propre client plutôt que d'importer
// src/server/db.ts (protégé par "server-only").
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL requis pour le seed");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const accounts = [
  { name: "Compte courant perso", type: AccountType.PERSO, bank: "BoursoBank" },
  { name: "Compte pro Stygma", type: AccountType.PRO, bank: "Banque Populaire" },
];

// Catégories perso, dans l'ordre des colonnes du Google Sheet (= sortOrder).
// L'enveloppe de rattachement est une hypothèse, modifiable ensuite en base.
const categories: { slug: string; name: string; envelope: Envelope }[] = [
  { slug: "essence", name: "Essence", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "assurance", name: "Assurance", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "restaurant", name: "Restaurant", envelope: Envelope.LOISIRS },
  { slug: "alimentaire", name: "Alimentaire", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "soiree", name: "Soirée", envelope: Envelope.LOISIRS },
  { slug: "loisirs", name: "Loisirs", envelope: Envelope.LOISIRS },
  { slug: "vetements-soins", name: "Vêtements & Soins", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "sante", name: "Santé", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "transport", name: "Transport", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "impots-taxes", name: "Impôt et Taxes", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "autres-abonnements", name: "Autres abonnements", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "autres", name: "Autres", envelope: Envelope.DEPENSES_COURANTES },
  { slug: "epargne-long-terme", name: "Épargne long terme", envelope: Envelope.EPARGNE_LONG_TERME },
];

async function main() {
  for (const account of accounts) {
    await prisma.account.upsert({ where: { name: account.name }, update: {}, create: account });
  }

  // Upsert par slug : relancer le seed est sans danger et ne duplique rien.
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, envelope: category.envelope, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
  }

  console.log(`Seed OK : ${accounts.length} comptes, ${categories.length} catégories`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
