import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Description de chaque catégorie, injectée dans le prompt de catégorisation. Les libellés
 * viennent de l'ancien Google Sheet ; ajuster ici pour affiner les propositions de l'IA.
 * `satisfies Record<TransactionCategory, string>` : erreur TS si une catégorie de l'enum manque. */
export const CATEGORY_HINTS = {
  FUEL: "Carburant, stations-service, recharge de véhicule électrique.",
  BANK_INSURANCE:
    "Frais bancaires, cotisations de carte, assurances (auto, habitation, mutuelle…).",
  RESTAURANT: "Restaurants, fast-food, cafés, livraison de repas.",
  GROCERIES: "Courses alimentaires : supermarchés, boulangerie, marché, drive.",
  NIGHTLIFE: "Bars, boîtes de nuit, soirées entre amis.",
  LEISURE: "Sorties, cinéma, jeux vidéo, sport, culture, voyages, achats plaisir.",
  CLOTHING_CARE: "Vêtements, chaussures, coiffeur, cosmétiques.",
  HEALTH: "Médecin, pharmacie, dentiste, optique, analyses.",
  TRANSPORT: "Train, bus, péages, parking, taxi/VTC, abonnements de transport.",
  TAXES: "Impôts, taxes, amendes, prélèvements fiscaux ou sociaux.",
  OTHER_SUBSCRIPTIONS:
    "Abonnements récurrents : streaming, téléphonie, internet, logiciels, salle de sport.",
  OTHER:
    "Tout ce qui ne rentre dans aucune autre catégorie (dont les crédits reçus : salaire, virements entrants, remboursements).",
  LONG_TERM_SAVINGS:
    "Virements vers l'épargne ou l'investissement (livret, PEA, assurance-vie, bourse, crypto).",
} as const satisfies Record<TransactionCategory, string>;
