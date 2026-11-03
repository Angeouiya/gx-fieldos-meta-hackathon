export interface WorkflowField {
  id: string;
  label: string;
  kind?: "text" | "email" | "tel" | "number" | "date" | "textarea";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: readonly string[];
}

export interface ModuleWorkflow {
  fields: readonly WorkflowField[];
  steps: readonly string[];
  actions?: readonly WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  label: string;
  instruction: string;
  description?: string;
  inputs?: readonly WorkflowField[];
}

const title = (label: string): WorkflowField => ({ id: "title", label, required: true });
const location: WorkflowField = { id: "location", label: "Lieu / zone", placeholder: "Ville, région ou exploitation" };
const date = (id: string, label: string): WorkflowField => ({ id, label, kind: "date" });
const notes = (label: string): WorkflowField => ({ id: "notes", label, kind: "textarea", placeholder: "Contraintes, ressources et contexte à prendre en compte" });

export const moduleWorkflows: Record<string, ModuleWorkflow> = {
  computer: {
    fields: [title("Nom du poste"), { id: "device", label: "Type de poste (local ou cloud)", required: true, options: ["Ordinateur local", "Poste cloud", "À déterminer"], help: "Choisissez où GX devra travailler ; cela ne crée pas le poste." }, { id: "owner", label: "Employé GX concerné", placeholder: "Ex. Conseiller cultures" }, { id: "apps", label: "Applications nécessaires", kind: "textarea", placeholder: "Ex. Tableur, stockage de dossiers, navigateur Agrix" }, notes("Accès et contraintes")],
    steps: ["Vérifier la disponibilité réelle du poste", "Valider les accès nécessaires", "Attribuer le poste à un employé", "Tester les actions autorisées"],
    actions: [{ id: "requirements", label: "Cadrer le poste", instruction: "Rédige un cahier des besoins du poste, applications, accès et prérequis à confirmer.", inputs: [{ id: "workload", label: "Travaux prévus", kind: "textarea", placeholder: "Ex. Analyser des dossiers de culture et préparer des rapports" }] }, { id: "security", label: "Préparer les accès", instruction: "Établis une matrice des accès et validations nécessaires, avec tests à effectuer avant utilisation." }],
  },
  applications: {
    fields: [title("Application"), { id: "purpose", label: "Usage prévu", required: true }, { id: "employee", label: "Employé concerné" }, { id: "rights", label: "Droits souhaités" }, notes("Restrictions")],
    steps: ["Vérifier que l’application est disponible", "Valider les droits", "Tester un accès limité"],
    actions: [{ id: "inventory", label: "Auditer les applications", instruction: "Classe les outils par usage, données traitées, droits minimaux et responsable de validation." }, { id: "test", label: "Planifier les essais", instruction: "Prépare des scénarios de test d'accès limité, sans prétendre qu'une application est connectée." }],
  },
  accounts: {
    fields: [title("Compte ou canal"), { id: "channel", label: "Service (email, WhatsApp…)", required: true, options: ["WhatsApp", "Email", "Autre canal"], help: "Le canal reste à connecter officiellement avant tout échange." }, { id: "email", label: "Adresse email professionnelle", kind: "email", placeholder: "Ex. contact@entreprise.africa" }, { id: "whatsapp", label: "Numéro WhatsApp avec indicatif", kind: "tel", placeholder: "Ex. +2250700000000" }, { id: "employee", label: "Employé concerné" }, { id: "purpose", label: "Usage professionnel" }, { id: "inbound", label: "Messages entrants et personne à prévenir", kind: "textarea" }, notes("Règles de communication")],
    steps: ["Vérifier une connexion officielle du service", "Autoriser les messages entrants et sortants", "Définir les destinataires autorisés", "Valider les pièces jointes et les messages externes", "Tester l’envoi, la réception et la réponse"],
    actions: [{ id: "connection", label: "Préparer la connexion", instruction: "Liste les prérequis officiels du canal, identités, consentements, permissions et tests de réception/réponse." }, { id: "response", label: "Définir les réponses", instruction: "Prépare les règles de traitement des messages entrants, brouillons, validations et pièces jointes sans prétendre à un envoi." }],
  },
  folder: {
    fields: [title("Nom du dossier"), { id: "project", label: "Projet associé" }, { id: "storage", label: "Emplacement (ordinateur ou cloud)", required: true, options: ["Cet ordinateur", "Cloud à connecter", "À déterminer"], help: "Le dossier GX reste local ici ; le choix du cloud est un besoin à préparer." }, { id: "access", label: "Personnes et accès" }, notes("Contenu et finalité")],
    steps: ["Définir les documents à réunir", "Importer les fichiers disponibles", "Vérifier les autorisations", "Préparer les actions à partir du dossier"],
    actions: [{ id: "inventory", label: "Inventorier le dossier", instruction: "Classe les pièces disponibles, les documents manquants, les personnes responsables et les décisions à prendre." }, { id: "filing", label: "Plan de classement", instruction: "Propose une arborescence de dossiers, les règles de nommage, les accès et une procédure d'archivage vérifiable." }],
  },
  organization: {
    fields: [title("Nom de l’organisation"), { id: "activity", label: "Activité principale", required: true }, { id: "country", label: "Pays" }, { id: "manager", label: "Responsable" }, notes("Directives et limites")],
    steps: ["Valider l’identité de l’organisation", "Définir les équipes", "Renseigner les règles internes", "Préparer les ressources Bureau"],
    actions: [{ id: "structure", label: "Organiser l’entreprise", instruction: "Propose une organisation adaptée aux activités, rôles, responsabilités, processus et indicateurs à suivre." }, { id: "directives", label: "Rédiger les directives", instruction: "Prépare un projet de directives internes, limites d'action de GX et points à faire valider par le responsable." }, { id: "value-chain", label: "Cartographier la chaîne de valeur", instruction: "Relie approvisionnement, production, transformation, qualité, distribution et clientèle. Identifie les responsables, dépendances et données manquantes." }],
  },
  employee: {
    fields: [title("Nom du poste GX"), { id: "mission", label: "Rôle et raison d’être", kind: "textarea", required: true }, { id: "organization", label: "Organisation", required: true }, { id: "manager", label: "Manager humain ou GX" }, { id: "responsibilities", label: "Responsabilités permanentes", kind: "textarea" }, { id: "scope", label: "Périmètre et limites", kind: "textarea" }, { id: "resources", label: "Outils et canaux requis", kind: "textarea" }, { id: "email", label: "Adresse email de contact", kind: "email" }, { id: "whatsapp", label: "Numéro WhatsApp avec indicatif", kind: "tel" }, { id: "incoming", label: "Traitement des messages reçus", kind: "textarea" }, { id: "outgoing", label: "Règles de réponse et pièces jointes", kind: "textarea" }],
    steps: ["Valider le rôle et les responsabilités", "Vérifier le manager et le périmètre", "Définir les autorisations", "Connecter séparément email et WhatsApp", "Tester les échanges entrants, sortants et les pièces jointes", "Soumettre l’activation à validation"],
    actions: [{ id: "mission", label: "Définir la mission", instruction: "Rédige une fiche de mission, les responsabilités, les limites et les validations nécessaires." }, { id: "communication", label: "Préparer les échanges", instruction: "Conçois le protocole de réception, réponse et escalade par email et WhatsApp. Sépare ce qui est configuré de ce qui est réellement connecté." }, { id: "operating-plan", label: "Plan de travail de l’employé", instruction: "Définis les tâches récurrentes, déclencheurs, livrables, contrôles, escalades et critères de réussite de cet employé GX." }],
  },
  authority: {
    fields: [title("Nom de la règle"), { id: "employee", label: "Employé GX", required: true }, { id: "domain", label: "Domaine d’action", required: true }, { id: "decision", label: "Peut agir seul / Doit demander / Bloqué", required: true, options: ["Peut agir seul", "Doit demander une validation", "Bloqué"], help: "Cette règle décrit l'autorisation prévue ; elle n'active aucun accès." }, notes("Seuils et exceptions")],
    steps: ["Vérifier les règles globales", "Préciser les seuils et destinataires", "Valider avec le responsable", "Tester un cas autorisé et un cas bloqué"],
    actions: [{ id: "matrix", label: "Établir les autorisations", instruction: "Produis une matrice action, canal, seuil, décision et approbateur. La règle la plus restrictive prévaut." }, { id: "cases", label: "Tester les exceptions", instruction: "Crée des cas autorisés, soumis à validation et bloqués, avec résultat attendu pour chaque cas." }],
  },
  communications: {
    fields: [title("Canal professionnel"), { id: "employee", label: "Employé GX", required: true }, { id: "channel", label: "WhatsApp, email ou autre", required: true, options: ["WhatsApp", "Email", "Autre canal"] }, { id: "email", label: "Adresse email", kind: "email", placeholder: "Ex. suivi@entreprise.africa" }, { id: "whatsapp", label: "Numéro WhatsApp avec indicatif", kind: "tel", placeholder: "Ex. +2250700000000" }, { id: "audience", label: "Destinataires permis" }, { id: "incoming", label: "Réception et règles de réponse", kind: "textarea" }, { id: "attachments", label: "Documents, fichiers et images autorisés", kind: "textarea" }, notes("Validation et escalade")],
    steps: ["Vérifier la connexion dans Bureau", "Définir les destinataires", "Définir les validations", "Tester la réception", "Tester une réponse et les pièces jointes après connexion"],
    actions: [{ id: "protocol", label: "Établir le protocole", instruction: "Prépare un protocole opérationnel pour recevoir, répondre et envoyer des pièces jointes; indique les prérequis techniques et les validations." }],
  },
  course: {
    fields: [title("Titre de la formation"), { id: "audience", label: "Public visé", required: true, placeholder: "Ex. Producteurs de cacao débutants" }, { id: "outcome", label: "Compétence à acquérir", required: true, placeholder: "Ex. Identifier trois signes de fermentation insuffisante" }, { id: "duration", label: "Durée prévue", placeholder: "Ex. 2 heures, 4 modules" }, { id: "sources", label: "Documents et sources disponibles", kind: "textarea", placeholder: "Ex. Guide interne, photos de terrain, fiche technique datée" }, { id: "assessment", label: "Évaluation souhaitée", placeholder: "Ex. Quiz et exercice pratique" }, notes("Contraintes pédagogiques")],
    steps: ["Vérifier les sources", "Définir les objectifs d'apprentissage", "Structurer les séances", "Préparer l'évaluation", "Valider le contenu avant publication dans Agrix"],
    actions: [{ id: "outline", label: "Construire le programme", instruction: "Prépare les modules, objectifs mesurables, durée et prérequis d'une formation agricole." }, { id: "lesson", label: "Rédiger une leçon", instruction: "Prépare une leçon testable avec exemples, exercice et sources à vérifier; ne publie rien." }, { id: "assessment", label: "Créer l'évaluation", instruction: "Prépare des questions, réponses attendues et critères de correction correspondant aux objectifs." }],
  },
  "project-plan": {
    fields: [title("Nom du projet"), { id: "sector", label: "Filière agricole", required: true, placeholder: "Ex. Maraîchage, élevage avicole, séchage de mangues" }, { id: "objective", label: "Objectif mesurable", required: true, placeholder: "Ex. Produire 2 tonnes de tomates avant juin 2027" }, location, { id: "scale", label: "Surface / capacité", placeholder: "Ex. 2 hectares ou 500 kg par semaine" }, { id: "budget", label: "Budget estimé", kind: "number", placeholder: "Ex. 5000000" }, { id: "currency", label: "Devise", options: ["FCFA", "USD", "EUR", "Autre"] }, date("deadline", "Échéance cible"), { id: "owner", label: "Responsable du projet" }, { id: "risks", label: "Risques et hypothèses", kind: "textarea", placeholder: "Ex. Eau irrégulière, prix des intrants à confirmer" }, notes("Objectif et contexte")],
    steps: ["Valider le périmètre et les objectifs", "Établir le budget et les ressources", "Planifier les étapes et responsables", "Définir les indicateurs de suivi"],
    actions: [{ id: "plan", label: "Construire le plan", instruction: "Produis un plan avec livrables, étapes, responsables, budget connu, risques et indicateurs. N'invente pas de chiffres." }, { id: "risks", label: "Analyser les risques", instruction: "Dresse un registre des risques, hypothèses à vérifier et décisions à faire valider." }, { id: "schedule", label: "Créer le calendrier", instruction: "Prépare un calendrier de jalons, dépendances, responsables et points de contrôle à partir des dates connues." }, { id: "budget", label: "Structurer le budget", instruction: "Construis un tableau de postes de dépenses et recettes, en séparant chiffres fournis, hypothèses et données à obtenir." }],
  },
  "project-review": {
    fields: [title("Nom de la revue"), { id: "projects", label: "Projets concernés", kind: "textarea", required: true }, { id: "blockers", label: "Blocages / décisions", kind: "textarea" }, date("reviewDate", "Date de revue")],
    steps: ["Rassembler les états des projets", "Identifier les décisions en attente", "Attribuer les prochaines actions"],
    actions: [{ id: "review", label: "Préparer la revue", instruction: "Synthétise l'avancement, les écarts, blocages, décisions et responsables à partir des données fournies." }, { id: "next", label: "Prioriser les actions", instruction: "Classe les prochaines actions par dépendance, urgence et impact, avec échéances à confirmer." }],
  },
  tasks: {
    fields: [title("Nom de la tâche"), { id: "project", label: "Projet associé" }, { id: "farm", label: "Ferme ou parcelle" }, { id: "owner", label: "Responsable" }, date("due", "Échéance"), { id: "priority", label: "Priorité", options: ["Normale", "Haute", "Urgente"] }, { id: "deliverable", label: "Résultat attendu", required: true, placeholder: "Ex. Relevé de 20 plants avec photos datées" }, notes("Consignes et moyens nécessaires")],
    steps: ["Vérifier le contexte et le responsable", "Préciser le résultat et l’échéance", "Créer la tâche dans Agrix après validation", "Suivre la réalisation"],
    actions: [{ id: "task-brief", label: "Préparer la mission", instruction: "Rédige une fiche de mission courte avec résultat attendu, responsable, échéance, moyens et critères d'achèvement." }],
  },
  "field-tasks": {
    fields: [title("Intervention terrain"), { id: "farm", label: "Ferme ou parcelle", required: true }, { id: "crop", label: "Culture ou atelier animal" }, { id: "owner", label: "Intervenant" }, date("due", "Date d’intervention"), { id: "equipment", label: "Matériel et intrants" }, { id: "objective", label: "Objectif de l’intervention", required: true }, notes("Conditions et précautions")],
    steps: ["Vérifier la parcelle et la production", "Préparer les moyens et les personnes", "Créer l’intervention dans Agrix après validation", "Consigner le résultat terrain"],
    actions: [{ id: "field-brief", label: "Préparer l’intervention", instruction: "Produis une fiche d'intervention terrain : objectif, séquence, matériel, observations à relever et critères de fin." }],
  },
  team: {
    fields: [title("Poste / rôle"), { id: "mission", label: "Mission principale", kind: "textarea", required: true }, { id: "skills", label: "Compétences attendues" }, location, { id: "manager", label: "Responsable" }, date("startDate", "Date de début")],
    steps: ["Valider la fiche de poste", "Préciser contrat et rémunération hors de GX.ai", "Préparer l’accueil et les accès", "Attribuer les premières tâches"],
    actions: [{ id: "role", label: "Rédiger la fiche de poste", instruction: "Prépare une fiche de poste avec mission, compétences, responsabilités et critères de réussite." }, { id: "onboard", label: "Préparer l'accueil", instruction: "Planifie les premiers jours, outils, formations et validations du responsable." }],
  },
  time: {
    fields: [title("Nom du planning"), { id: "team", label: "Équipe concernée", required: true }, date("startDate", "Début"), date("endDate", "Fin"), notes("Horaires et contraintes")],
    steps: ["Recenser les disponibilités", "Répartir les tâches", "Vérifier les conflits et repos", "Valider le planning avec l’équipe"],
    actions: [{ id: "schedule", label: "Construire le planning", instruction: "Prépare un planning par personne, tâche et date à partir des disponibilités connues; signale les trous." }, { id: "conflicts", label: "Détecter les conflits", instruction: "Repère les chevauchements, surcharges et dépendances à arbitrer par un responsable." }],
  },
  processing: {
    fields: [title("Produit transformé"), { id: "raw", label: "Matière première", required: true, placeholder: "Ex. Mangues fraîches variété Kent" }, { id: "capacity", label: "Capacité visée", placeholder: "Ex. 100 kg de fruits par jour" }, { id: "yield", label: "Rendement antérieur connu", placeholder: "Ex. 15 kg de produit fini pour 100 kg de fruits, si mesuré" }, { id: "inputMassKg", label: "Masse entrante mesurée (kg)", kind: "number", placeholder: "Ex. 100", help: "Masse réellement pesée pour ce lot. Renseignez aussi la masse sortante pour calculer le rendement apparent." }, { id: "outputMassKg", label: "Masse sortante mesurée (kg)", kind: "number", placeholder: "Ex. 15", help: "Produit fini réellement pesé pour le même lot. N'utilisez pas une quantité prévue." }, { id: "equipment", label: "Équipements disponibles", placeholder: "Ex. Séchoir solaire, balance, scelleuse" }, { id: "packaging", label: "Conditionnement", placeholder: "Ex. Sachet de 100 g" }, { id: "storage", label: "Conservation / stockage" }, { id: "market", label: "Marché cible" }, { id: "quality", label: "Exigences de qualité et traçabilité", kind: "textarea", placeholder: "Ex. Numéro de lot, humidité mesurée, contrôles locaux" }, notes("Procédé et contraintes")],
    steps: ["Décrire le flux de transformation", "Dimensionner les équipements", "Prévoir les contrôles qualité", "Évaluer coûts et débouchés"],
    actions: [{ id: "process", label: "Définir le procédé", instruction: "Décris les opérations de transformation, intrants, équipements, contrôles et pertes à mesurer." }, { id: "quality", label: "Plan qualité", instruction: "Propose les points de contrôle, la traçabilité des lots, le conditionnement et les validations sanitaires à vérifier localement." }, { id: "market", label: "Étudier les débouchés", instruction: "Propose les segments de clientèle, formats et informations manquantes pour une étude de marché." }, { id: "batch", label: "Fiche de lot pilote", instruction: "Prépare une fiche de lot pilote avec matières, quantités connues, étapes, contrôles, rendement à mesurer et décision de libération." }, { id: "costs", label: "Analyser les coûts", instruction: "Structure le coût matière, emballage, énergie, main-d'œuvre, pertes et prix cible. Signale les valeurs absentes." }],
  },
  quality: {
    fields: [title("Produit / lot"), { id: "country", label: "Pays / exigences applicables" }, { id: "process", label: "Procédé", kind: "textarea" }, notes("Risques et contrôles connus")],
    steps: ["Lister les points de contrôle", "Définir les enregistrements de lots", "Préparer les actions correctives", "Faire valider les exigences locales"],
    actions: [{ id: "quality-sheet", label: "Créer la fiche qualité", instruction: "Prépare une fiche de contrôle qualité de lot avec critères à renseigner, traçabilité et actions en cas de non-conformité. Les exigences réglementaires doivent être vérifiées localement." }],
  },
  supply: {
    fields: [title("Plan d’approvisionnement"), { id: "materials", label: "Matières / intrants", kind: "textarea", required: true }, { id: "quantities", label: "Quantités prévues" }, { id: "supplier", label: "Fournisseur envisagé" }, date("neededBy", "Date de besoin"), notes("Critères de qualité")],
    steps: ["Confirmer les besoins", "Comparer les fournisseurs", "Valider prix et qualité", "Planifier livraison et contrôle"],
    actions: [{ id: "supply-plan", label: "Plan d’approvisionnement", instruction: "Prépare la liste des intrants, dates, quantités connues, critères fournisseur et contrôles de réception sans inventer de prix." }],
  },
  recipes: {
    fields: [title("Nom de l’offre culinaire"), { id: "ingredients", label: "Ingrédients locaux", kind: "textarea", required: true, placeholder: "Ex. Mangue fraîche 2 kg ; farine de mil 1 kg ; miel 200 g", help: "Pour recalculer les quantités, séparez les ingrédients par point-virgule ou ligne et indiquez nom, nombre et unité (g, kg, ml, L ou pièce). Exemple : Mangue 2 kg ; lait 1,5 L." }, { id: "audience", label: "Public cible", placeholder: "Ex. Familles, restaurant scolaire, touristes" }, { id: "portions", label: "Portions de la recette de base", kind: "number", placeholder: "Ex. 20", help: "Nombre de portions déjà testé ou prévu pour les quantités d'ingrédients indiquées." }, { id: "targetPortions", label: "Portions souhaitées pour le nouveau lot", kind: "number", placeholder: "Ex. 30", help: "GX calcule le facteur et les quantités des ingrédients mesurés ci-dessus. Vérifiez la recette, les temps et l’hygiène lors d’un essai." }, { id: "capacity", label: "Capacité de production", placeholder: "Ex. 50 portions par service" }, { id: "format", label: "Format et présentation", placeholder: "Ex. Dessert individuel en verrine" }, { id: "price", label: "Prix cible", placeholder: "Ex. 2500 FCFA par portion" }, { id: "allergens", label: "Allergènes connus", placeholder: "Ex. Arachide, lait ; à confirmer" }, { id: "equipment", label: "Matériel disponible", placeholder: "Ex. Four, mixeur, froid positif" }, notes("Contraintes nutritionnelles et hygiène")],
    steps: ["Formaliser la recette", "Renseigner les coûts", "Tester le procédé", "Valider hygiène et présentation"],
    actions: [{ id: "recipe", label: "Créer la fiche recette", instruction: "Établis une fiche recette testable : ingrédients, étapes, portions, matériel, conservation et points à valider. N'invente pas les quantités manquantes." }, { id: "sweets", label: "Imaginer des sucreries", instruction: "Propose des sucreries et produits complémentaires cohérents avec les ingrédients locaux, la clientèle et les contraintes. Mentionne les allergènes à vérifier." }, { id: "dish", label: "Décrire et analyser un plat", instruction: "Décris le plat ou la photo jointe, ses ingrédients observables, les hypothèses, la présentation et les améliorations possibles. Ne prétends pas mesurer la nutrition sur une image." }, { id: "menu", label: "Composer un menu", instruction: "Propose un menu cohérent avec la clientèle, les ingrédients, la saison, le service et le budget connus. Distingue les contraintes alimentaires à confirmer." }, { id: "production", label: "Organiser la production", instruction: "Prépare une feuille de production avec portions, séquence, préparation, équipe, matériel, stockage et contrôles d'hygiène à vérifier." }],
  },
  "product-analysis": {
    fields: [title("Nom du produit"), { id: "origin", label: "Origine végétale, animale ou transformée", required: true }, { id: "ingredients", label: "Composition connue", kind: "textarea" }, { id: "process", label: "Transformation / préparation" }, { id: "format", label: "Format de vente ou de service" }, { id: "audience", label: "Clients visés" }, { id: "shelfLife", label: "Conservation connue" }, notes("Observations et questions")],
    steps: ["Décrire le produit à partir des données et images", "Vérifier composition et traçabilité", "Étudier les déclinaisons possibles", "Faire valider qualité, étiquetage et sécurité"],
    actions: [{ id: "describe", label: "Décrire le produit", instruction: "Décris les caractéristiques observables du produit et des photos, l'usage, la présentation et les informations manquantes. Sépare observation et hypothèse." }, { id: "variants", label: "Proposer des déclinaisons", instruction: "Propose des produits transformés, desserts ou sucreries pertinents à partir du produit et des ingrédients connus, avec essais à réaliser et risques à vérifier." }, { id: "quality", label: "Préparer la fiche qualité", instruction: "Prépare une fiche qualité provisoire : composition connue, lot, conservation à confirmer, étiquetage et contrôles à vérifier." }],
  },
  livestock: {
    fields: [title("Atelier d’élevage"), { id: "species", label: "Espèce", required: true, placeholder: "Ex. Poulet de chair, bovin, caprin" }, { id: "herd", label: "Effectif total", kind: "number", placeholder: "Ex. 120" }, { id: "observedAnimals", label: "Animaux examinés", kind: "number", placeholder: "Ex. 40", help: "Comptez les animaux effectivement observés lors d'une même tournée." }, { id: "affectedAnimals", label: "Animaux présentant le signe", kind: "number", placeholder: "Ex. 5", help: "Sous-ensemble des animaux examinés qui présentent le signe décrit ; cela ne constitue pas un diagnostic." }, { id: "age", label: "Âge ou stade des animaux", placeholder: "Ex. Poussins de 21 jours" }, location, { id: "housing", label: "Logement et surface", placeholder: "Ex. Bâtiment ventilé de 80 m²" }, { id: "feed", label: "Alimentation prévue", placeholder: "Ex. Aliment croissance, quantité réellement mesurée" }, { id: "water", label: "Accès à l'eau", placeholder: "Ex. 2 abreuvoirs vérifiés chaque matin" }, { id: "health", label: "Observations sanitaires", kind: "textarea", placeholder: "Ex. Appétit, mortalité, signes visibles et dates" }, { id: "veterinarian", label: "Vétérinaire référent", placeholder: "Ex. Nom et contact du praticien" }, notes("Objectif et suivi sanitaire")],
    steps: ["Créer le registre du cheptel", "Planifier l’alimentation", "Organiser les observations sanitaires", "Faire valider les soins par un vétérinaire"],
    actions: [{ id: "register", label: "Créer le registre", instruction: "Prépare un registre de cheptel, alimentation, reproduction, observations et événements sanitaires." }, { id: "health", label: "Analyser les observations", instruction: "Sépare symptômes observés, hypothèses et signes nécessitant un vétérinaire. Ne pose pas de diagnostic définitif." }],
  },
  feed: {
    fields: [title("Plan d’intrants"), { id: "production", label: "Production concernée", required: true }, { id: "inventory", label: "Stocks actuels", kind: "textarea" }, date("neededBy", "Période cible"), notes("Besoins et contraintes")],
    steps: ["Inventorier les stocks", "Estimer les besoins", "Comparer les achats", "Suivre les consommations"],
    actions: [{ id: "needs", label: "Calculer les besoins à vérifier", instruction: "Structure les besoins par production, période, stock et quantité mesurée. Ne fournis pas de dose non justifiée." }, { id: "purchase", label: "Préparer les achats", instruction: "Classe les intrants par urgence, contrôle qualité, disponibilité et fournisseur à confirmer." }],
  },
  weather: {
    fields: [title("Carnet d’observation"), location, date("observedAt", "Date d’observation"), { id: "observations", label: "Observations", kind: "textarea", required: true }, notes("Décision à préparer")],
    steps: ["Consigner les faits observés", "Séparer faits et hypothèses", "Vérifier la météo locale", "Décider de la prochaine observation"],
    actions: [{ id: "log", label: "Structurer le relevé", instruction: "Prépare un carnet daté d'observations et mesures locales, avec sources et lacunes." }, { id: "decision", label: "Préparer la décision", instruction: "Distingue faits, hypothèses, risques et prochaine vérification terrain, sans inventer de prévision." }],
  },
  crops: {
    fields: [title("Nom de la culture"), { id: "species", label: "Espèce / variété", required: true, placeholder: "Ex. Tomate Roma VF" }, { id: "farm", label: "Ferme / parcelle", required: true, placeholder: "Ex. Ferme Nord, parcelle B2" }, location, { id: "area", label: "Surface et unité", placeholder: "Ex. 0,5 hectare" }, date("sowing", "Date de semis ou plantation"), date("harvest", "Récolte visée"), { id: "soil", label: "Sol et irrigation", placeholder: "Ex. Sol sableux, goutte-à-goutte" }, { id: "previous", label: "Culture précédente", placeholder: "Ex. Niébé la saison dernière" }, { id: "water", label: "Eau disponible", placeholder: "Ex. Forage, fréquence et débit mesurés" }, { id: "inputs", label: "Intrants disponibles", kind: "textarea", placeholder: "Ex. Semences, compost, engrais et quantités en stock" }, { id: "observations", label: "Observations de la plante", kind: "textarea", placeholder: "Ex. Feuilles jaunies sur 10 plants depuis 3 jours" }, { id: "observedPlants", label: "Plants examinés", kind: "number", placeholder: "Ex. 120", help: "Nombre de plants réellement observés dans cette tournée ou cet échantillon." }, { id: "affectedPlants", label: "Plants présentant le signe", kind: "number", placeholder: "Ex. 5", help: "Sous-ensemble des plants examinés qui présentent le signe décrit." }, { id: "objective", label: "Objectif de production", placeholder: "Ex. Récolter 4 tonnes ; estimation à vérifier" }, notes("Observations et contraintes")],
    steps: ["Vérifier la parcelle et la variété", "Planifier semis et intrants", "Organiser les observations de croissance", "Préparer la récolte et la traçabilité"],
    actions: [{ id: "calendar", label: "Planifier la culture", instruction: "Construis un calendrier cultural adapté aux informations connues; indique les données agronomiques et climatiques à vérifier." }, { id: "plant", label: "Analyser la plante", instruction: "Décris la plante ou les images jointes, les signes visibles et les hypothèses. Liste les observations à faire sur le terrain sans diagnostic certain." }, { id: "field-log", label: "Créer le carnet de culture", instruction: "Prépare un carnet de culture avec interventions, dates, intrants, observations, rendement et traçabilité à compléter." }],
  },
  farms: {
    fields: [title("Nom de la ferme"), location, { id: "coordinates", label: "Coordonnées GPS connues", placeholder: "Ex. 5.3456, -4.0123" }, { id: "area", label: "Surface totale et unité", placeholder: "Ex. 12 hectares" }, { id: "parcels", label: "Parcelles", kind: "textarea", placeholder: "Ex. A1 : 2 ha tomates ; B1 : 3 ha maïs" }, { id: "soil", label: "Types de sol", placeholder: "Ex. Argileux sur A1, sableux sur B1" }, { id: "water", label: "Eau et irrigation", placeholder: "Ex. Forage, réserve 10 m³, goutte-à-goutte" }, { id: "owner", label: "Responsable" }, { id: "labor", label: "Équipe terrain", placeholder: "Ex. 4 permanents, 6 saisonniers" }, notes("Activités et contraintes")],
    steps: ["Délimiter les parcelles", "Renseigner eau et infrastructures", "Associer les productions", "Définir le suivi terrain"],
    actions: [{ id: "farm-plan", label: "Organiser la ferme", instruction: "Prépare un plan de ferme avec parcelles, ressources, productions, tâches et données à confirmer." }],
  },
};

// Each action has its own brief. These inputs are kept inside the local dossier and
// passed to the OpenAI work route only when the user starts the action.
export const actionBriefs: Record<string, Record<string, readonly WorkflowField[]>> = {
  folder: {
    inventory: [{ id: "sourceTypes", label: "Types de pièces à inventorier" }, { id: "missing", label: "Pièces déjà connues comme manquantes", kind: "textarea" }],
    filing: [{ id: "structure", label: "Structure de classement souhaitée" }, { id: "retention", label: "Durée de conservation connue" }, { id: "access", label: "Règles d'accès", kind: "textarea" }],
  },
  organization: {
    structure: [{ id: "units", label: "Équipes ou unités existantes" }, { id: "decisions", label: "Décisions à organiser", kind: "textarea" }],
    directives: [{ id: "audience", label: "Destinataires des directives" }, { id: "approval", label: "Responsable de validation" }],
    "value-chain": [{ id: "products", label: "Produits et filières" }, { id: "partners", label: "Partenaires et fournisseurs connus" }],
  },
  employee: {
    mission: [{ id: "deliverables", label: "Livrables attendus", kind: "textarea" }, { id: "cadence", label: "Fréquence de travail" }],
    communication: [{ id: "audience", label: "Destinataires autorisés" }, { id: "approval", label: "Messages exigeant validation", kind: "textarea" }, { id: "attachments", label: "Pièces jointes autorisées" }],
    "operating-plan": [{ id: "triggers", label: "Déclencheurs des tâches", kind: "textarea" }, { id: "cadence", label: "Fréquence" }, { id: "escalation", label: "Personne à prévenir et seuils" }],
  },
  communications: {
    protocol: [{ id: "inbound", label: "Types de messages reçus" }, { id: "outbound", label: "Types de réponses permises" }, { id: "handoff", label: "Escalade humaine", kind: "textarea" }],
  },
  "project-plan": {
    plan: [{ id: "deliverables", label: "Livrables prioritaires", kind: "textarea" }, { id: "constraints", label: "Contraintes de calendrier" }],
    risks: [{ id: "scenario", label: "Scénario à évaluer" }, { id: "threshold", label: "Seuils d'alerte connus" }],
    schedule: [{ id: "start", label: "Date de départ", kind: "date" }, { id: "milestones", label: "Jalons connus", kind: "textarea" }],
    budget: [{ id: "costs", label: "Coûts connus", kind: "textarea" }, { id: "revenue", label: "Recettes prévues", kind: "textarea" }],
  },
  processing: {
    process: [{ id: "operations", label: "Opérations envisagées", kind: "textarea" }, { id: "bottleneck", label: "Contrainte de capacité" }],
    quality: [{ id: "hazards", label: "Risques qualité connus", kind: "textarea" }, { id: "records", label: "Enregistrements disponibles" }],
    market: [{ id: "buyers", label: "Acheteurs visés" }, { id: "formats", label: "Formats envisagés" }],
    batch: [{ id: "lot", label: "Identifiant du lot pilote" }, { id: "quantities", label: "Quantités connues", kind: "textarea" }, { id: "observations", label: "Résultats de l'essai", kind: "textarea" }],
    costs: [{ id: "materials", label: "Coût matières connu" }, { id: "packaging", label: "Coût emballage connu" }, { id: "energy", label: "Énergie et pertes connues" }],
  },
  recipes: {
    recipe: [{ id: "quantities", label: "Quantités connues", kind: "textarea" }, { id: "method", label: "Méthode de préparation" }],
    sweets: [{ id: "base", label: "Ingrédient ou produit de départ" }, { id: "texture", label: "Texture et format souhaités" }, { id: "audience", label: "Clientèle visée" }],
    dish: [{ id: "questions", label: "Points à observer sur le plat", kind: "textarea" }, { id: "service", label: "Contexte de service" }],
    menu: [{ id: "occasion", label: "Occasion ou service" }, { id: "courses", label: "Nombre de plats" }, { id: "restrictions", label: "Restrictions alimentaires connues" }],
    production: [{ id: "date", label: "Date de production", kind: "date" }, { id: "quantity", label: "Nombre de portions", kind: "number" }, { id: "team", label: "Équipe disponible" }],
  },
  crops: {
    calendar: [{ id: "season", label: "Saison et conditions connues" }, { id: "irrigation", label: "Irrigation disponible" }],
    plant: [{ id: "symptoms", label: "Signes observés", kind: "textarea" }, { id: "history", label: "Historique récent de la parcelle" }],
    "field-log": [{ id: "period", label: "Période du carnet" }, { id: "measurements", label: "Mesures à consigner", kind: "textarea" }],
  },
  "product-analysis": {
    describe: [{ id: "attributes", label: "Caractéristiques à décrire" }, { id: "origin", label: "Origine à vérifier" }],
    variants: [{ id: "ingredients", label: "Ingrédients disponibles" }, { id: "format", label: "Format souhaité" }, { id: "buyer", label: "Clientèle cible" }],
    quality: [{ id: "lot", label: "Lot concerné" }, { id: "controls", label: "Contrôles connus", kind: "textarea" }],
  },
  livestock: {
    register: [{ id: "period", label: "Période du registre" }, { id: "events", label: "Événements à suivre", kind: "textarea" }],
    health: [{ id: "signs", label: "Signes observés", kind: "textarea" }, { id: "duration", label: "Depuis quand ?" }, { id: "veterinarian", label: "Vétérinaire référent" }],
  },
  farms: {
    "farm-plan": [{ id: "parcels", label: "Parcelles prioritaires" }, { id: "resources", label: "Ressources à répartir", kind: "textarea" }],
  },
  quality: {
    "quality-sheet": [{ id: "lot", label: "Lot ou référence" }, { id: "checks", label: "Contrôles à prévoir", kind: "textarea" }, { id: "approver", label: "Responsable de validation" }],
  },
  supply: {
    "supply-plan": [{ id: "critical", label: "Intrants prioritaires" }, { id: "leadTime", label: "Délais fournisseurs connus" }, { id: "checks", label: "Contrôles à réception" }],
  },
  tasks: {
    "task-brief": [{ id: "criteria", label: "Critères de fin", kind: "textarea" }, { id: "dependencies", label: "Dépendances" }],
  },
  "field-tasks": {
    "field-brief": [{ id: "conditions", label: "Conditions terrain observées" }, { id: "checklist", label: "Points à contrôler", kind: "textarea" }],
  },
};
