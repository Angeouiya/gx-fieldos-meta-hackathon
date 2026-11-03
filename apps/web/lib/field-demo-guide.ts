/** Evidence-led guide for the local FieldOS demo. No agronomic diagnosis is inferred here. */
type RecordLike = Record<string, unknown>;
type Language = "en" | "fr";

const record = (value: unknown): RecordLike => value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : {};
const rows = (value: unknown): RecordLike[] => Array.isArray(value) ? value.map(record) : [];
const short = (value: unknown, max = 180): string => typeof value === "string"
  ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const number = (value: number, language: Language) => new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 }).format(value);
const labels: Record<string, { en: string; fr: string }> = {
  manual: { en: "entered", fr: "saisie" }, map: { en: "map boundary", fr: "contour sur carte" },
  gps: { en: "GPS boundary", fr: "contour GPS" }, import: { en: "imported boundary", fr: "contour importé" },
  agriculture: { en: "agriculture", fr: "agriculture" }, aquaculture: { en: "aquaculture", fr: "pisciculture" },
  livestock: { en: "livestock", fr: "élevage" }, gastronomy: { en: "gastronomy", fr: "gastronomie" },
  food_processing: { en: "food processing", fr: "transformation alimentaire" },
  plant: { en: "plant", fr: "plante" }, soil: { en: "soil", fr: "sol" }, crop: { en: "crop", fr: "culture" },
  water: { en: "water", fr: "eau" }, parcel: { en: "parcel", fr: "parcelle" },
  animal: { en: "animal", fr: "animal" }, food: { en: "food", fr: "alimentation" },
  pending: { en: "pending", fr: "en attente" }, done: { en: "done", fr: "terminée" },
  in_progress: { en: "in progress", fr: "en cours" },
};
const label = (value: unknown, language: Language) => labels[short(value)]?.[language] || short(value);

const phases: Record<string, { en: string; fr: string; enCheck: string; frCheck: string }> = {
  assessment: { en: "Assessment and project choice", fr: "Évaluation et choix du projet", enCheck: "Confirm the site, boundaries, access and relevant measurements before choosing the activity.", frCheck: "Confirmer le site, les limites, l'accès et les mesures utiles avant de choisir l'activité." },
  clearing: { en: "Site clearing and constraints", fr: "Défrichage et contraintes", enCheck: "Mark protected areas, drainage and safe access; record the work actually completed.", frCheck: "Marquer les zones protégées, le drainage et les accès sûrs ; consigner les travaux réalisés." },
  soil_preparation: { en: "Soil and water preparation", fr: "Préparation du sol et de l'eau", enCheck: "Use measured soil and water results before selecting amendments or an irrigation design.", frCheck: "Utiliser les résultats mesurés du sol et de l'eau avant de choisir les amendements ou l'irrigation." },
  planting: { en: "Planting or implementation", fr: "Mise en place ou plantation", enCheck: "Confirm the selected activity, inputs, quantities and schedule with applicable local sources.", frCheck: "Confirmer l'activité, les intrants, les quantités et le calendrier avec des sources locales applicables." },
  maintenance: { en: "Maintenance and inspection", fr: "Entretien et inspections", enCheck: "Log dated observations, interventions, responsible people, costs and new evidence.", frCheck: "Consigner les observations datées, interventions, responsables, coûts et nouvelles preuves." },
  harvest: { en: "Harvest or output collection", fr: "Récolte ou collecte des produits", enCheck: "Record actual weights or quantities, quality and losses by lot and date.", frCheck: "Consigner les poids ou quantités réels, la qualité et les pertes par lot et par date." },
  postharvest: { en: "Post-harvest and storage", fr: "Après-récolte et stockage", enCheck: "Trace handling, storage conditions, quality and losses without assuming a shelf life.", frCheck: "Tracer la manutention, le stockage, la qualité et les pertes sans présumer une durée de conservation." },
  sale: { en: "Sale and review", fr: "Vente et bilan", enCheck: "Compare receipts and actual costs with the planned scenario, then revise the next cycle.", frCheck: "Comparer les reçus et coûts réels au scénario prévu, puis réviser le cycle suivant." },
};

export function buildLocalTechnicalGuide(detailValue: unknown, farmValue: unknown, language: Language) {
  const detail = record(detailValue);
  const project = record(detail.project);
  const farm = record(farmValue);
  const budget = record(farm.budget);
  const allMissions = rows(detail.missions);
  const missions = allMissions.slice(0, 20);
  const plans = rows(detail.plans);
  const plan = plans.find((item) => item.status === "approved") ?? plans[0];
  const planContent = record(plan?.content);
  const planLanguage = short(planContent.language);
  const matchingPlanText = language === "en" ? !planLanguage || planLanguage === "en" : planLanguage === "fr";
  const allTasks = rows(detail.projectTasks);
  const taskRows = allTasks.slice(0, 20);
  const allMeasurements = rows(detail.measurements);
  const measurements = allMeasurements.slice(0, 20);
  const allOperations = rows(farm.records);
  const operations = allOperations.slice(0, 40);
  const projectTitle = short(project.title, 160) || (language === "fr" ? "Projet GX" : "GX project");
  const title = language === "fr" ? `Guide technique - ${projectTitle}` : `Technical implementation guide - ${projectTitle}`;
  const lines: string[] = [];
  const section = (name: string, body: string[]) => { lines.push("", name, ...body); };
  const area = finite(project.areaSqMeters);
  const areaMethod = label(project.areaMethod, language) || (language === "fr" ? "non indiquée" : "not stated");
  const accuracy = finite(project.areaAccuracyMeters);
  const areaLine = area === null
    ? (language === "fr" ? "Surface : aucune valeur enregistrée." : "Area: no value recorded.")
    : language === "fr"
      ? `Surface : ${number(area, language)} m² (${number(area / 10000, language)} ha) ; méthode : ${areaMethod}${accuracy === null ? "" : ` ; précision GPS déclarée : ± ${number(accuracy, language)} m`}.`
      : `Area: ${number(area, language)} m² (${number(area / 10000, language)} ha); method: ${areaMethod}${accuracy === null ? "" : `; recorded GPS accuracy: ± ${number(accuracy, language)} m`}.`;

  lines.push(language === "fr"
    ? "DÉMONSTRATION LOCALE - Les images d'exemple et les montants illustratifs ne prouvent ni la qualité du sol, ni la surface, ni le rendement. Ce guide organise les faits enregistrés et les contrôles à effectuer."
    : "LOCAL DEMONSTRATION - Example images and illustrative figures do not prove soil quality, parcel area or yield. This guide organizes saved evidence and the checks required before action.");
  section(language === "fr" ? "1. Périmètre et validation" : "1. Scope and approval", [
    language === "fr" ? `Projet : ${projectTitle}. Domaine : ${label(project.domain, language) || "non indiqué"}. Pays déclaré : ${short(project.country) || "non indiqué"}.`
      : `Project: ${projectTitle}. Domain: ${label(project.domain, language) || "not stated"}. Declared country: ${short(project.country) || "not stated"}.`,
    areaLine,
    language === "fr" ? `Plan : ${plan ? `version ${finite(plan.version) ?? "?"}, ${plan.status === "approved" ? "approuvée" : "brouillon"}` : "aucun plan généré"}. Le propriétaire vérifie les conditions locales avant exécution.`
      : `Plan: ${plan ? `version ${finite(plan.version) ?? "?"}, ${plan.status === "approved" ? "approved" : "draft"}` : "no plan generated"}. The owner checks local conditions before execution.`,
  ]);

  section(language === "fr" ? "2. Registre des scans et mesures" : "2. Scan and measurement register", [
    language === "fr" ? `${allMissions.length} dossier(s) de scan ; ${allMissions.reduce((sum, mission) => sum + (Array.isArray(mission.evidence) ? mission.evidence.length : 0), 0)} vue(s) enregistrée(s). ${allMissions.length > missions.length ? `Les ${missions.length} premiers dossiers sont détaillés ci-dessous.` : ""}`
      : `${allMissions.length} scan folder(s); ${allMissions.reduce((sum, mission) => sum + (Array.isArray(mission.evidence) ? mission.evidence.length : 0), 0)} saved view(s). ${allMissions.length > missions.length ? `The first ${missions.length} folders are detailed below.` : ""}`,
    ...missions.map((mission, index) => language === "fr"
      ? `${index + 1}. ${short(mission.title) || "Scan sans titre"} ; sujet : ${label(mission.scanAspect, language) || "autre"} ; ${Array.isArray(mission.evidence) ? mission.evidence.length : 0} vue(s) ; analyse : ${mission.status === "ready" ? "enregistrée" : "en attente"}.`
      : `${index + 1}. ${short(mission.title) || "Untitled scan"}; aspect: ${label(mission.scanAspect, language) || "other"}; ${Array.isArray(mission.evidence) ? mission.evidence.length : 0} view(s); analysis: ${mission.status === "ready" ? "saved" : "pending"}.`),
    language === "fr" ? `${allMeasurements.length} mesure(s) déclarée(s). Vérifier la méthode, l'unité, la date et le point de prélèvement de chacune. ${allMeasurements.length > measurements.length ? `Les ${measurements.length} premières sont détaillées ci-dessous.` : ""}`
      : `${allMeasurements.length} declared measurement(s). Verify method, unit, date and sampling point for each. ${allMeasurements.length > measurements.length ? `The first ${measurements.length} are detailed below.` : ""}`,
    ...measurements.map((item) => language === "fr"
      ? `Mesure : ${short(item.kind) || "non nommée"} ; valeur : ${short(record(item.value).text) || "à confirmer"} ; source : ${short(item.source) || "non indiquée"}.`
      : `Measurement: ${short(item.kind) || "unnamed"}; value: ${short(record(item.value).text) || "to confirm"}; source: ${short(item.source) || "not stated"}.`),
  ]);

  const materialInputs = operations.filter((item) => item.kind === "input");
  section(language === "fr" ? "3. Matériel, matériaux et approvisionnement" : "3. Equipment, materials and procurement", [
    language === "fr" ? "Préparer les quantités à partir du plan et des mesures du site, puis les finaliser après validation du propriétaire ; demander les fiches techniques, la disponibilité et les prix datés avant achat."
      : "Draft quantities from the plan and site measurements, then finalize after owner approval; obtain specifications, availability and dated prices before purchase.",
    ...(materialInputs.length ? materialInputs.map((item) => language === "fr"
      ? `Intrant enregistré : ${short(item.title) || "sans nom"} ; quantité prévue : ${finite(item.plannedQuantityKg) === null ? "non indiquée" : `${number(finite(item.plannedQuantityKg)!, language)} kg`} ; coût prévu : ${finite(item.plannedCostXof) === null ? "non indiqué" : `${number(finite(item.plannedCostXof)!, language)} XOF`}.`
      : `Recorded input: ${short(item.title) || "unnamed"}; planned quantity: ${finite(item.plannedQuantityKg) === null ? "not stated" : `${number(finite(item.plannedQuantityKg)!, language)} kg`}; planned cost: ${finite(item.plannedCostXof) === null ? "not stated" : `${number(finite(item.plannedCostXof)!, language)} XOF`}.`)
      : [language === "fr" ? "Aucun intrant chiffré n'est enregistré : créer une liste de matériel et de matériaux avant les travaux."
        : "No quantified input is saved: create an equipment and materials list before work."]),
  ]);

  const journey = rows(planContent.journey);
  const chosenPhases = journey.length ? journey.slice(0, 8) : Object.entries(phases).map(([phase, item]) => ({ phase, label: item[language], actions: [], checks: [] }));
  section(language === "fr" ? "4. Procédure de mise en œuvre" : "4. Implementation procedure", [
    language === "fr" ? "Pour chaque phase : confirmer le responsable, la date, la zone, le matériel, le coût et la preuve d'exécution. Adapter la procédure au domaine du projet et aux prescriptions locales vérifiées."
      : "For every phase, confirm the responsible person, date, zone, equipment, cost and evidence of completion. Adapt the procedure to the project domain and verified local guidance.",
    ...(journey.length > chosenPhases.length ? [language === "fr" ? `Les ${chosenPhases.length} premières phases sur ${journey.length} sont détaillées.` : `The first ${chosenPhases.length} of ${journey.length} phases are detailed.`] : []),
    ...chosenPhases.flatMap((item, index) => {
      const phase = short(item.phase);
      const template = phases[phase];
      const label = template?.[language] || (matchingPlanText ? short(item.label) : "") || (language === "fr" ? `Phase ${index + 1}` : `Phase ${index + 1}`);
      const planActions = matchingPlanText && Array.isArray(item.actions) ? item.actions.map((value) => short(value, 180)).filter(Boolean).slice(0, 2) : [];
      const planChecks = matchingPlanText && Array.isArray(item.checks) ? item.checks.map((value) => short(value, 140)).filter(Boolean).slice(0, 2) : [];
      return [
        `${index + 1}. ${label}.`,
        language === "fr" ? `Contrôle de phase : ${template?.frCheck || "Définir les contrôles applicables avec un spécialiste local."}`
          : `Phase control: ${template?.enCheck || "Define applicable checks with a local specialist."}`,
        ...planActions.map((action) => language === "fr" ? `Action du plan : ${action}` : `Plan action: ${action}`),
        ...planChecks.map((check) => language === "fr" ? `Vérification du plan : ${check}` : `Plan check: ${check}`),
      ];
    }),
  ]);

  section(language === "fr" ? "5. Suivi, écarts et révision" : "5. Monitoring, deviations and revision", [
    language === "fr" ? "Enregistrer les observations, interventions, quantités, coûts et résultats avec une date et une preuve. Comparer prévu et réel à la fin de chaque phase. Si une nouvelle preuve contredit le plan, proposer une version révisée à faire approuver."
      : "Record dated observations, interventions, quantities, costs and outcomes with evidence. Compare plan and actuals after each phase. If new evidence weakens the plan, submit a revision for owner approval.",
    language === "fr" ? `${allTasks.length} tâche(s) enregistrée(s) ; ${allOperations.length} opération(s) de campagne enregistrée(s). ${allTasks.length > taskRows.length ? `Les ${taskRows.length} premières tâches sont détaillées.` : ""}`
      : `${allTasks.length} saved task(s); ${allOperations.length} saved campaign operation(s). ${allTasks.length > taskRows.length ? `The first ${taskRows.length} tasks are detailed.` : ""}`,
    ...taskRows.map((task) => language === "fr" ? `Tâche : ${short(task.title) || "sans titre"} ; statut : ${label(task.status, language) || "à vérifier"}.`
      : `Task: ${short(task.title) || "untitled"}; status: ${label(task.status, language) || "to check"}.`),
  ]);

  section(language === "fr" ? "6. Hypothèses financières et sources" : "6. Financial assumptions and sources", [
    language === "fr" ? "Les montants sont des hypothèses jusqu'à réception de devis, factures, pesées et reçus datés. Aucun retour sur investissement n'est garanti."
      : "Figures are assumptions until supported by dated quotations, invoices, weights and receipts. No return on investment is guaranteed.",
    language === "fr" ? `Activité prévue : ${short(budget.crop) || "non indiquée"}. Marché prévu : ${short(budget.market) || "non indiqué"}.`
      : `Planned activity: ${short(budget.crop) || "not stated"}. Intended market: ${short(budget.market) || "not stated"}.`,
    language === "fr" ? `Source de rendement : ${short(budget.yieldSourceUrl) || "non indiquée"}. Source de prix : ${short(budget.priceSourceUrl) || "non indiquée"}.`
      : `Yield source: ${short(budget.yieldSourceUrl) || "not stated"}. Price source: ${short(budget.priceSourceUrl) || "not stated"}.`,
    language === "fr" ? "Vérifier l'applicabilité locale et la date de chaque source avant toute décision."
      : "Verify local applicability and the date of every source before a decision.",
  ]);

  return { title, content: lines.join("\n").trim() };
}
