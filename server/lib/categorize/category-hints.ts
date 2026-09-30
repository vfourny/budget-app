import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Description de chaque catégorie, injectée dans le prompt de catégorisation. Les libellés
 * viennent de l'ancien Google Sheet ; ajuster ici pour affiner les propositions de l'IA.
 * `satisfies Record<TransactionCategory, string>` : erreur TS si une catégorie de l'enum manque. */
export const CATEGORY_HINTS = {
  ESSENCE: "Carburant, stations-service, recharge de véhicule électrique.",
  ASSURANCE: "Frais bancaires, cotisations de carte, assurances (auto, habitation, mutuelle…).",
  RESTAURANT: "Restaurants, fast-food, cafés, livraison de repas.",
  ALIMENTAIRE: "Courses alimentaires : supermarchés, boulangerie, marché, drive.",
  SOIREE: "Bars, boîtes de nuit, soirées entre amis.",
  LOISIRS: "Sorties, cinéma, jeux vidéo, sport, culture, voyages, achats plaisir.",
  VETEMENTS_SOINS: "Vêtements, chaussures, coiffeur, cosmétiques.",
  SANTE: "Médecin, pharmacie, dentiste, optique, analyses.",
  TRANSPORT: "Train, bus, péages, parking, taxi/VTC, abonnements de transport.",
  IMPOTS_TAXES: "Impôts, taxes, amendes, prélèvements fiscaux ou sociaux.",
  AUTRES_ABONNEMENTS:
    "Abonnements récurrents : streaming, téléphonie, internet, logiciels, salle de sport.",
  AUTRES:
    "Tout ce qui ne rentre dans aucune autre catégorie (dont les crédits reçus : salaire, virements entrants, remboursements).",
  EPARGNE_LONG_TERME:
    "Virements vers l'épargne ou l'investissement (livret, PEA, assurance-vie, bourse, crypto).",
} as const satisfies Record<TransactionCategory, string>;
