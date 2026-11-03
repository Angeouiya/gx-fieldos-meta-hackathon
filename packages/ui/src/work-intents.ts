export interface WorkIntent {
  purpose: string;
  outcomes: readonly string[];
  useExample: string;
  successExample: string;
  checks: readonly string[];
}

const common = {
  useExample: "Ex. Présenter ce document au responsable pour décider des prochaines actions.",
  successExample: "Ex. Le responsable peut valider les données, les tâches et les échéances.",
};

export const workIntents: Record<string, WorkIntent> = {
  computer: { ...common, purpose: "Définir un poste utilisable par GX avec des accès explicitement autorisés.", outcomes: ["Cahier des besoins du poste", "Liste des accès à valider", "Plan de mise en service"], checks: ["Matériel", "Applications", "Sécurité", "Responsable"] },
  applications: { ...common, purpose: "Préciser pourquoi un logiciel est nécessaire et les droits réellement requis.", outcomes: ["Inventaire des applications", "Matrice des droits", "Plan de vérification des accès"], checks: ["Usage", "Droits", "Données traitées", "Validation humaine"] },
  accounts: { ...common, purpose: "Préparer les canaux et les règles de communication sans supposer une connexion active.", outcomes: ["Plan de connexion des comptes", "Protocole de réponse", "Liste des autorisations"], checks: ["Réception", "Réponse", "Pièces jointes", "Escalade"] },
  folder: { ...common, purpose: "Rassembler les sources d'un travail et rendre leur usage vérifiable.", outcomes: ["Inventaire des pièces", "Plan de classement", "Dossier prêt pour analyse"], checks: ["Documents présents", "Documents manquants", "Accès", "Archivage"] },
  organization: { ...common, purpose: "Décrire l'organisation, ses activités et les décisions que GX doit soutenir.", outcomes: ["Schéma d'organisation", "Directives de travail", "Carte de chaîne de valeur"], checks: ["Rôles", "Processus", "Indicateurs", "Décisions à valider"] },
  employee: { ...common, purpose: "Définir une mission d'employé GX, ses limites et ses livrables mesurables.", outcomes: ["Fiche de mission", "Plan de travail", "Protocole de communication"], checks: ["Déclencheurs", "Livrables", "Contrôles", "Escalade humaine"] },
  authority: { ...common, purpose: "Déterminer précisément quelles actions demandent une validation.", outcomes: ["Matrice d'autorisation", "Règles de validation", "Cas de test des permissions"], checks: ["Actions permises", "Actions bloquées", "Seuils", "Responsable"] },
  communications: { ...common, purpose: "Définir le fonctionnement des échanges professionnels et les limites des canaux.", outcomes: ["Protocole email et WhatsApp", "Brouillons de réponse", "Plan d'escalade"], checks: ["Destinataires", "Réception", "Envoi", "Documents"] },
  course: { ...common, purpose: "Transformer une expertise agricole en formation vérifiable.", outcomes: ["Programme de formation", "Plan de cours", "Brouillon de publication"], checks: ["Public", "Objectifs pédagogiques", "Sources", "Évaluation"] },
  "project-plan": { ...common, purpose: "Passer d'une idée agricole à un projet chiffrable et suivi.", outcomes: ["Plan de projet", "Calendrier de jalons", "Budget prévisionnel"], checks: ["Livrables", "Budget", "Risques", "Indicateurs"] },
  "project-review": { ...common, purpose: "Identifier les blocages et les décisions qui feront avancer les projets.", outcomes: ["Revue de projet", "Registre des décisions", "Plan d'actions"], checks: ["Avancement", "Blocages", "Responsables", "Échéances"] },
  time: { ...common, purpose: "Organiser le temps et les responsabilités d'une équipe.", outcomes: ["Planning de travail", "Répartition des tâches", "Points de contrôle"], checks: ["Disponibilités", "Conflits", "Repos", "Priorités"] },
  processing: { ...common, purpose: "Définir un procédé de transformation viable, contrôlable et adapté au marché.", outcomes: ["Fiche de procédé", "Plan qualité", "Étude de lot pilote"], checks: ["Matières", "Équipements", "Pertes", "Traçabilité"] },
  quality: { ...common, purpose: "Rendre les contrôles de qualité et la traçabilité explicites.", outcomes: ["Fiche qualité", "Plan de contrôle", "Registre de lot"], checks: ["Critères", "Prélèvements", "Non-conformités", "Validation locale"] },
  supply: { ...common, purpose: "Prévoir les intrants nécessaires sans inventer prix ni quantités.", outcomes: ["Plan d'approvisionnement", "Comparatif de fournisseurs", "Contrôles de réception"], checks: ["Stocks", "Quantités", "Délais", "Qualité"] },
  recipes: { ...common, purpose: "Créer une offre gastronomique testable à partir des produits disponibles.", outcomes: ["Fiche recette", "Menu", "Feuille de production"], checks: ["Ingrédients", "Portions", "Allergènes", "Conservation"] },
  "product-analysis": { ...common, purpose: "Décrire un produit observé puis étudier des déclinaisons utiles.", outcomes: ["Fiche produit", "Idées de transformation", "Fiche qualité provisoire"], checks: ["Observations", "Composition", "Clients", "Essais à réaliser"] },
  tasks: { ...common, purpose: "Transformer une demande en mission attribuable et vérifiable.", outcomes: ["Fiche de mission", "Checklist d'exécution", "Critères de clôture"], checks: ["Responsable", "Délai", "Moyens", "Résultat"] },
  farms: { ...common, purpose: "Structurer les parcelles, ressources et contraintes d'une exploitation.", outcomes: ["Plan de ferme", "Registre des parcelles", "Liste d'actions terrain"], checks: ["Surfaces", "Eau", "Cultures", "Responsables"] },
  crops: { ...common, purpose: "Suivre une culture de la plantation à la récolte avec des observations vérifiables.", outcomes: ["Calendrier cultural", "Carnet de culture", "Plan de suivi"], checks: ["Variété", "Sol", "Intrants", "Récolte"] },
  livestock: { ...common, purpose: "Organiser le cheptel et les observations, avec validation vétérinaire pour les soins.", outcomes: ["Registre d'élevage", "Plan d'alimentation", "Carnet d'observation"], checks: ["Effectifs", "Alimentation", "Événements sanitaires", "Vétérinaire"] },
  feed: { ...common, purpose: "Confronter les besoins de production aux stocks et aux achats nécessaires.", outcomes: ["Tableau des besoins", "Plan d'intrants", "Liste de contrôles"], checks: ["Stocks", "Besoins", "Période", "Achats à confirmer"] },
  "field-tasks": { ...common, purpose: "Préparer une intervention précise avec les moyens et les critères de fin.", outcomes: ["Fiche d'intervention", "Checklist terrain", "Rapport d'observation"], checks: ["Lieu", "Équipe", "Matériel", "Résultat"] },
  weather: { ...common, purpose: "Relier les observations locales aux décisions de production sans inventer la météo.", outcomes: ["Carnet d'observation", "Plan de suivi", "Questions à vérifier"], checks: ["Date", "Lieu", "Mesures", "Décisions"] },
  team: { ...common, purpose: "Définir un rôle humain et son intégration dans l'équipe.", outcomes: ["Fiche de poste", "Plan d'accueil", "Missions initiales"], checks: ["Compétences", "Responsable", "Date", "Moyens"] },
};
