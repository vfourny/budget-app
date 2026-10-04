import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Description de chaque catégorie, injectée dans le prompt de catégorisation. Les libellés
 * viennent de l'ancien Google Sheet ; ajuster ici pour affiner les propositions de l'IA.
 * `satisfies Record<TransactionCategory, string>` : erreur TS si une catégorie de l'enum manque. */
export const CATEGORY_HINTS = {
  RENT: "Loyer du logement et charges locatives (virement ou prélèvement au propriétaire / à l'agence).",
  FUEL: "Carburant, stations-service, recharge de véhicule électrique.",
  BANK_INSURANCE:
    "Frais bancaires, cotisations de carte, assurances (auto, habitation, mutuelle…).",
  RESTAURANT: "Restaurants, fast-food, cafés, livraison de repas.",
  GROCERIES: "Courses alimentaires : supermarchés, boulangerie, marché, drive.",
  NIGHTLIFE: "Bars, boîtes de nuit, soirées entre amis.",
  LEISURE: "Sorties, cinéma, jeux vidéo, sport, culture, voyages, achats plaisir.",
  TRAINING: "Formations, cours en ligne, livres techniques, certifications, conférences, ateliers.",
  CLOTHING_CARE: "Vêtements, chaussures, coiffeur, cosmétiques.",
  HEALTH: "Médecin, pharmacie, dentiste, optique, analyses.",
  TRANSPORT: "Train, bus, péages, parking, taxi/VTC, abonnements de transport.",
  TAXES: "Impôts, taxes, amendes, prélèvements fiscaux ou sociaux.",
  OTHER_SUBSCRIPTIONS:
    "Abonnements récurrents : streaming, téléphonie, internet, logiciels, salle de sport.",
  OTHER:
    "Tout ce qui ne rentre dans aucune autre catégorie (dont les crédits reçus qui ne sont ni un salaire, ni un versement BNC ou de vacation, ni un remboursement : virements entrants divers).",
  SHORT_TERM_SAVINGS:
    "Virements vers l'épargne de précaution ou disponible : livret A, LDDS, compte épargne, provision pour projets à court terme.",
  LONG_TERM_SAVINGS:
    "Virements vers l'épargne ou l'investissement (livret, PEA, assurance-vie, bourse, crypto).",
  SALARY_PAYMENT:
    "Crédit : salaire versé par un employeur (virement mensuel de paie, libellé SALAIRE / PAIE).",
  BNC_PAYMENT:
    "Crédit : revenus d'activité libérale / freelance (BNC), par ex. virements de sa propre société (STYGMA) qui rémunèrent son activité, ou de clients ; un remboursement de frais par STYGMA est un remboursement pro.",
  VACATION_PAYMENT:
    "Crédit : paiement de vacations d'enseignement (établissement d'enseignement, université, IUT), souvent à la fin d'un semestre.",
  REFUND:
    "Crédit : autre remboursement reçu (achat retourné, mutuelle / Sécurité sociale, avoir, virement d'un proche pour une dépense avancée). Hors remboursement par sa propre société.",
  PROFESSIONAL_REFUND:
    "Crédit : remboursement par sa propre société (STYGMA) des frais mixtes perso/pro avancés sur le compte perso (note de frais, quote-part 5/7).",
} as const satisfies Record<TransactionCategory, string>;
