import type { TransactionCategory } from "@server/generated/prisma/enums";

/** Description de chaque catégorie, injectée dans le prompt de catégorisation. Les libellés
 * viennent de l'ancien Google Sheet ; ajuster ici pour affiner les propositions de l'IA.
 * `satisfies Record<TransactionCategory, string>` : erreur TS si une catégorie de l'enum manque. */
export const CATEGORY_HINTS = {
  RENT_PAID:
    "Loyer versé pour le logement et charges locatives (virement ou prélèvement au propriétaire / à l'agence).",
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
    "Abonnements récurrents autres que énergie, télécom et internet : streaming, logiciels, salle de sport.",
  ENERGY:
    "Fournisseur d'électricité ou de gaz (EDF, Engie, TotalEnergies électricité/gaz, Ekwateur…). Hors carburant.",
  TELECOM: "Forfait téléphone mobile (Orange, SFR, Bouygues, Free Mobile, Sosh, B&You…).",
  INTERNET: "Abonnement internet / box fixe (fibre, ADSL).",
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
  // ── Compte pro (Stygma SAS) ──
  CLIENT_PAYMENT:
    "Crédit : paiement d'une facture par un client de la société (virement d'une entreprise cliente, ex. VIR DAVIDSON).",
  PROFESSIONAL_OTHER_CREDIT:
    "Crédit pro qui n'est pas un paiement client : remboursement de frais, avoir, régularisation bancaire.",
  PROFESSIONAL_INSURANCE: "Assurance de la société : RC Pro, multirisque (AIG, Hiscox…).",
  PROFESSIONAL_ACCOUNTANT: "Honoraires de l'expert-comptable (IDEOZ…).",
  PROFESSIONAL_BANK_FEES:
    "Frais bancaires du compte pro : cotisation de l'offre (Atout Pro), commissions, frais sur achat à l'étranger.",
  PROFESSIONAL_EQUIPMENT: "Petit matériel informatique ou de bureau (clavier, écran, câbles…).",
  PROFESSIONAL_SOFTWARE:
    "Logiciels, SaaS et abonnements professionnels (Claude, Anthropic, Figma, GitKraken, hébergement, nom de domaine…).",
  PROFESSIONAL_MEALS:
    "Repas professionnels : restaurants, cafés, bars avec des clients ou en déplacement.",
  PROFESSIONAL_TRAVEL:
    "Déplacements professionnels : train (SNCF), métro / bus (Ilévia), parking, péage, taxi, hôtel.",
  PROFESSIONAL_TAXES:
    "Impôts et taxes de la société hors TVA et hors prélèvement à la source : CFE, pénalités, frais de retard (ex. « Absence de bilan »).",
  PROFESSIONAL_OTHER: "Autre dépense pro qui ne rentre dans aucune autre catégorie.",
  NET_SALARY_TRANSFER:
    "Débit : salaire net viré au président (virement vers Valentin Fourny avec la mention salaire / paie).",
  BNC_WITHDRAWAL:
    "Débit : virement de la société vers Valentin Fourny au titre des BNC / complément bnc (prélèvement sur le bénéfice).",
  MIXED_COSTS_REFUND:
    "Débit : remboursement à Valentin Fourny des frais mixtes payés en perso (loyer, internet, téléphone, électricité), mention remboursement / frais.",
  URSSAF: "Prélèvement URSSAF (cotisations sociales).",
  SUPPLEMENTARY_PENSION: "Prélèvement de la caisse de retraite complémentaire (Malakoff Humanis…).",
  HEALTH_COVER: "Complémentaire santé / mutuelle collective (SwissLife santé…).",
  DISABILITY_COVER: "Prévoyance (SwissLife prévoyance…).",
  WITHHOLDING_TAX:
    "Prélèvement à la source de l'impôt sur le revenu sur salaire : DGFIP avec mention PAS / DSN.",
  VAT_PAYMENT:
    "Paiement de la TVA à l'État : DGFIP ou SIE (service des impôts des entreprises) avec mention TVA.",
} as const satisfies Record<TransactionCategory, string>;
