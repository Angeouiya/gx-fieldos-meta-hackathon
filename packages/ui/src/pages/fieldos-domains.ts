type Language = "en" | "fr";
const phaseKeys = ["assessment", "clearing", "soil_preparation", "planting", "maintenance", "harvest", "postharvest", "sale"] as const;
export type FieldOSPhase = typeof phaseKeys[number];
type Profile = { activity: Record<Language, string>; stages: Record<FieldOSPhase, Record<Language, string>>; checks: Record<Language, string[]> };
const profile = (activity: [string, string], stages: [string, string][], checks: [string, string][]): Profile => ({
  activity: { en: activity[0], fr: activity[1] },
  stages: Object.fromEntries(phaseKeys.map((key, index) => [key, { en: stages[index]![0], fr: stages[index]![1] }])) as Profile["stages"],
  checks: { en: checks.map(([en]) => en), fr: checks.map(([, fr]) => fr) },
});
const profiles: Record<string, Profile> = {
  agriculture: profile(["Selected crop", "Culture retenue"], [
    ["Assessment and crop choice", "Diagnostic et choix de culture"], ["Clearing and access", "Défrichage et accès"], ["Soil and water preparation", "Préparation du sol et de l’eau"], ["Sowing or planting", "Semis ou plantation"], ["Maintenance and checks", "Entretien et contrôles"], ["Harvest", "Récolte"], ["Sorting, storage and processing", "Tri, stockage et transformation"], ["Sale and review", "Vente et bilan"],
  ], [["Soil test and water access", "Analyse du sol et accès à l’eau"], ["Seeds, permitted inputs and locally approved rates", "Semences, intrants autorisés et doses locales"], ["Tools, labor, storage and buyers", "Outils, personnel, stockage et acheteurs"]]),
  aquaculture: profile(["Selected species or system", "Espèce ou système retenu"], [
    ["Site and species assessment", "Étude du site et de l’espèce"], ["Pond access and layout", "Accès et implantation des bassins"], ["Water and facility preparation", "Préparation de l’eau et des installations"], ["Stocking fingerlings", "Alevinage"], ["Feeding, water quality and health", "Alimentation, qualité de l’eau et santé"], ["Harvest and weighing", "Pêche et pesée"], ["Cold storage and transport", "Conservation et transport"], ["Sale and cycle review", "Vente et bilan du cycle"],
  ], [["Water tests, renewal and discharge", "Analyses de l’eau, renouvellement et rejet"], ["Ponds, pumps, aeration and power", "Bassins, pompes, aération et énergie"], ["Fingerlings, feed, density and animal health", "Alevins, alimentation, densité et santé animale"], ["Cold chain, permits and buyers", "Chaîne du froid, autorisations et acheteurs"]]),
  livestock: profile(["Selected livestock activity", "Élevage retenu"], [
    ["Site and species assessment", "Étude du site et de l’espèce"], ["Access and layout", "Accès et implantation"], ["Housing and water", "Bâtiments et eau"], ["Animal intake", "Introduction des animaux"], ["Feeding, care and checks", "Alimentation, soins et contrôles"], ["Weighing or product collection", "Pesée ou collecte des produits"], ["Packing and transport", "Conditionnement et transport"], ["Sale and cycle review", "Vente et bilan du cycle"],
  ], [["Housing, water, feed and waste", "Logement, eau, alimentation et déchets"], ["Sourcing, quarantine and veterinary oversight", "Origine, quarantaine et suivi vétérinaire"], ["Mortality, permits, transport and buyers", "Mortalité, autorisations, transport et acheteurs"]]),
  gastronomy: profile(["Selected offering", "Offre retenue"], [
    ["Market and offering", "Marché et offre"], ["Premises and layout", "Local et aménagement"], ["Equipment and hygiene", "Équipements et hygiène"], ["Sourcing and recipe trials", "Approvisionnement et essais de recettes"], ["Production and service", "Production et service"], ["Portion checks", "Contrôles des portions"], ["Storage and delivery", "Conservation et livraison"], ["Sale and feedback", "Vente et retours clients"],
  ], [["Premises, water, power and equipment", "Local, eau, énergie et équipements"], ["Recipes, portions, allergens and traceability", "Recettes, portions, allergènes et traçabilité"], ["Hygiene, cold chain and permits", "Hygiène, chaîne du froid et autorisations"], ["Cost per portion and customers", "Coût par portion et clientèle"]]),
  food_processing: profile(["Selected processed product", "Produit transformé retenu"], [
    ["Product and market", "Produit et marché"], ["Workshop access and layout", "Accès et atelier"], ["Equipment and hygiene", "Équipements et hygiène"], ["Sourcing and process trials", "Approvisionnement et essais"], ["Production and checks", "Production et contrôles"], ["Yield and loss measurement", "Rendement et pertes"], ["Packing, storage and transport", "Conditionnement, stockage et transport"], ["Sale and process review", "Vente et bilan"],
  ], [["Raw materials, suppliers and losses", "Matières premières, fournisseurs et pertes"], ["Process, equipment, water and cleaning", "Procédé, équipements, eau et nettoyage"], ["Hygiene, traceability, packaging and permits", "Hygiène, traçabilité, emballage et autorisations"], ["Capacity, unit costs and buyers", "Capacité, coûts unitaires et acheteurs"]]),
};
profiles.other = profile(["Selected activity", "Activité retenue"], [
  ["Assessment", "Diagnostic"], ["Access and layout", "Accès et implantation"], ["Resource preparation", "Préparation des ressources"], ["Setup and trials", "Démarrage et essais"], ["Execution and checks", "Exécution et contrôles"], ["Production or delivery", "Production ou livraison"], ["Packing and transfer", "Conditionnement et transfert"], ["Sale and review", "Vente et bilan"],
], [["Objectives, resources and constraints", "Objectifs, ressources et contraintes"], ["Equipment, procedures and checks", "Équipements, procédures et contrôles"], ["Permits, costs and customers", "Autorisations, coûts et clients"]]);

export const fieldosPhaseKeys = phaseKeys;
export const fieldosDomainProfile = (domain?: string): Profile => profiles[domain ?? ""] ?? profiles.other!;
