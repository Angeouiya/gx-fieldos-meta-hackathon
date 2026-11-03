import type { IconName } from "./components/Icon";

export type WorkspaceId = "office" | "company" | "projects" | "field";

export interface WorkspaceModule {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  category: string;
  action: "agrix" | "assistant";
  href?: string;
  cta?: string;
  prompt?: string;
}

export interface WorkspaceDefinition {
  id: WorkspaceId;
  title: string;
  description: string;
  highlight: string;
  categories: ReadonlyArray<{ id: string; label: string }>;
  modules: readonly WorkspaceModule[];
}

const agrixGX = "https://agrix.africa/market?tab=gx";

export const workspaces: Record<WorkspaceId, WorkspaceDefinition> = {
  office: {
    id: "office",
    title: "Les moyens de travail de GX, au même endroit.",
    description: "Préparez ordinateurs, applications, comptes, fichiers et canaux. Une configuration ne donne jamais accès à une ressource toute seule.",
    highlight: "Les connexions réelles restent à activer séparément.",
    categories: [
      { id: "all", label: "Tout" },
      { id: "devices", label: "Ordinateurs" },
      { id: "access", label: "Accès" },
      { id: "files", label: "Fichiers" },
    ],
    modules: [
      { id: "computer", title: "Ordinateurs", description: "Préparer un poste local ou cloud pour GX.", icon: "grid", category: "devices", action: "assistant", prompt: "Définis les besoins d'un ordinateur GX. Distingue le PC local du cloud et ne prétends pas avoir provisionné de machine." },
      { id: "applications", title: "Applications & outils", description: "Décrire les logiciels utiles et les droits nécessaires.", icon: "briefcase", category: "access", action: "assistant", prompt: "Prépare un inventaire des applications nécessaires, avec les droits à valider séparément." },
      { id: "accounts", title: "Comptes & WhatsApp", description: "Préparer email, calendrier et canaux professionnels.", icon: "message", category: "access", action: "assistant", prompt: "Prépare les connexions professionnelles demandées. N'affirme jamais qu'un canal est connecté sans confirmation technique." },
      { id: "folder", title: "Dossiers & stockage", description: "Créer un dossier, lire des PDF et documents Office, exporter les livrables et choisir son emplacement.", icon: "clipboard", category: "files", action: "assistant", prompt: "Organise ce dossier de travail, ses sources et ses autorisations. Le stockage cloud nécessite une connexion réelle." },
    ],
  },
  company: {
    id: "company",
    title: "Pour qui GX travaille et jusqu’où il peut agir.",
    description: "Organisations, employés GX, responsabilités et règles de validation se configurent ici.",
    highlight: "Un employé configuré reste un brouillon local tant que son activation réelle n’existe pas.",
    categories: [
      { id: "all", label: "Tout" },
      { id: "structure", label: "Organisation" },
      { id: "people", label: "Employés GX" },
      { id: "rules", label: "Règles" },
      { id: "learning", label: "Formations" },
    ],
    modules: [
      { id: "organization", title: "Organisation", description: "Nom, activité, pays, équipe et directives.", icon: "building", category: "structure", action: "assistant", prompt: "Aide-moi à structurer une organisation et ses directives sans inventer de données." },
      { id: "employee", title: "Créer un employé GX", description: "Poste, manager, responsabilités et ressources.", icon: "users", category: "people", action: "assistant", prompt: "Prépare un employé GX avec rôle, responsabilités, manager et ressources. Ne l'active pas sans validation." },
      { id: "authority", title: "Autorisations & validations", description: "Ce que GX peut faire seul, doit faire valider ou ne peut pas faire.", icon: "shield", category: "rules", action: "assistant", prompt: "Définis des autorisations précises pour un employé GX. La règle la plus restrictive s'applique." },
      { id: "communications", title: "Communication professionnelle", description: "WhatsApp, email, rapports et escalade humaine.", icon: "message", category: "rules", action: "assistant", prompt: "Prépare les règles de communication d'un employé GX. Aucun message externe ne part sans connexion et autorisation effectives." },
      { id: "course", title: "Créer une formation", description: "Préparer un programme avec GX, le vérifier puis enregistrer un brouillon dans Agrix.", icon: "clipboard", category: "learning", action: "agrix", href: `${agrixGX}&space=entreprise&module=gx-course`, cta: "Créer avec GX dans Agrix", prompt: "Prépare un programme de formation agricole à partir des sources fournies." },
    ],
  },
  projects: {
    id: "projects",
    title: "Du projet agricole à son exécution.",
    description: "Créez un contexte durable avec objectifs, budget, échéance, équipe, étapes et documents.",
    highlight: "Les projets sont enregistrés sur cet appareil pour le moment.",
    categories: [{ id: "all", label: "Tout" }, { id: "planning", label: "Planifier" }, { id: "operations", label: "Suivre" }, { id: "value", label: "Chaîne de valeur" }],
    modules: [
      { id: "project-plan", title: "Créer un projet", description: "Objectifs, filière, lieu, budget, étapes et résultats attendus.", icon: "clipboard", category: "planning", action: "assistant", prompt: "Construis un plan de projet agricole à partir du dossier. Signale les informations manquantes et les validations requises. N'invente aucun chiffre." },
      { id: "project-review", title: "Revue de projets", description: "Blocages, décisions et prochaines étapes.", icon: "grid", category: "operations", action: "assistant", prompt: "Prépare une revue des projets avec priorités, blocages et responsables." },
      { id: "time", title: "Planning & temps", description: "Échéances, disponibilités et répartition des tâches.", icon: "clock", category: "operations", action: "assistant", prompt: "Prépare un planning agricole et relève les conflits." },
      { id: "processing", title: "Transformation", description: "Procédés, équipements et contrôle qualité.", icon: "factory", category: "value", action: "assistant", prompt: "Prépare un projet de transformation agroalimentaire à partir du dossier." },
      { id: "quality", title: "Qualité & traçabilité", description: "Lots, contrôles, risques et actions correctives.", icon: "shield", category: "value", action: "assistant", prompt: "Prépare une fiche qualité et traçabilité pour ce produit ou lot." },
      { id: "supply", title: "Approvisionnement", description: "Matières, fournisseurs et critères d’achat.", icon: "package", category: "value", action: "assistant", prompt: "Prépare un plan d'approvisionnement agricole." },
      { id: "recipes", title: "Gastronomie", description: "Offres culinaires et fiches de production.", icon: "utensils", category: "value", action: "assistant", prompt: "Prépare une offre gastronomique à partir de produits agricoles locaux." },
      { id: "product-analysis", title: "Produits & images", description: "Décrire un produit, analyser ses photos et imaginer des déclinaisons.", icon: "package", category: "value", action: "assistant", prompt: "Analyse ce produit agricole ou transformé à partir de son dossier et de ses images." },
      { id: "tasks", title: "Tâches Agrix", description: "Configurer la mission, puis préparer et créer une tâche opérationnelle dans Agrix avec GX.ai.", icon: "checklist", category: "operations", action: "agrix", href: `${agrixGX}&space=bureau&module=gx-task`, cta: "Créer avec GX dans Agrix", prompt: "Prépare le dossier d'une tâche opérationnelle agricole." },
    ],
  },
  field: {
    id: "field",
    title: "La réalité du terrain, au centre de chaque action.",
    description: "Suivez les exploitations, les cultures et les interventions. Préparez aussi les décisions pour l’élevage, les intrants et les récoltes.",
    highlight: "Les fermes, cultures et tâches utilisent les données réelles de votre compte Agrix.",
    categories: [
      { id: "all", label: "Vue d’ensemble" },
      { id: "plant", label: "Production végétale" },
      { id: "animal", label: "Production animale" },
      { id: "operations", label: "Opérations" },
    ],
    modules: [
      { id: "farms", title: "Fermes & parcelles", description: "Préparer avec GX le dossier de ferme, le vérifier puis créer l’exploitation dans Agrix.", icon: "map", category: "plant", action: "agrix", href: `${agrixGX}&space=terrain&module=gx-farm`, cta: "Créer avec GX dans Agrix", prompt: "Organise le dossier d'une ferme ou parcelle agricole." },
      { id: "crops", title: "Cultures & récoltes", description: "Préparer avec GX la culture liée à un champ, puis la créer dans Agrix après vérification.", icon: "sprout", category: "plant", action: "agrix", href: `${agrixGX}&space=terrain&module=gx-crop`, cta: "Créer avec GX dans Agrix", prompt: "Prépare un dossier de culture complet à partir des données saisies." },
      { id: "livestock", title: "Élevage & santé animale", description: "Préparer les registres de cheptel, alimentation, suivi sanitaire et reproduction.", icon: "animal", category: "animal", action: "assistant", prompt: "Aide-moi à structurer le suivi d'un élevage. Demande l'espèce, l'effectif, le lieu, l'alimentation, les objectifs et les événements sanitaires connus. Propose un registre de suivi, un calendrier d'observation et les alertes à faire valider par un vétérinaire." },
      { id: "feed", title: "Alimentation & intrants", description: "Planifier les besoins en semences, aliments, eau, engrais et autres ressources.", icon: "package", category: "operations", action: "assistant", prompt: "Aide-moi à planifier les intrants d'une exploitation agricole. Demande les productions, superficies ou effectifs, stocks actuels, période et contraintes. Prépare un tableau des besoins, des points de contrôle et des achats à confirmer sans inventer de quantités." },
      { id: "field-tasks", title: "Interventions terrain", description: "Configurer une intervention datée, puis la préparer et la créer dans Agrix avec GX.ai.", icon: "checklist", category: "operations", action: "agrix", href: `${agrixGX}&space=terrain&module=gx-task`, cta: "Créer avec GX dans Agrix", prompt: "Prépare le dossier d'une intervention sur le terrain." },
      { id: "weather", title: "Météo & observations", description: "Organiser un relevé local et relier les observations aux décisions de production.", icon: "sun", category: "operations", action: "assistant", prompt: "Aide-moi à préparer un carnet d'observations terrain. Demande la localité, la culture ou l'élevage, la date, les symptômes ou observations et la météo connue. Propose une fiche de suivi et distingue clairement les faits des hypothèses. N'invente pas de prévisions météo." },
    ],
  },
};
