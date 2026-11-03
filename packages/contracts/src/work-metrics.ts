export type WorkMetricInput =
  | { kind: "processing_yield"; inputMassKg: number; outputMassKg: number }
  | { kind: "recipe_scale"; basePortions: number; targetPortions: number; ingredients?: Array<{ name: string; quantity: number; unit: "g" | "kg" | "ml" | "L" | "pièce" }> }
  | { kind: "plant_incidence"; observedPlants: number; affectedPlants: number }
  | { kind: "animal_incidence"; observedAnimals: number; affectedAnimals: number };

export interface WorkMetricResult {
  input: WorkMetricInput;
  value: number;
  unit: "%" | "×";
  explanation: string;
  limitation: string;
  scaledIngredients?: Array<{ name: string; baseQuantity: number; targetQuantity: number; unit: string }>;
}

export type WorkMetricEvaluation =
  | { ok: true; result: WorkMetricResult }
  | { ok: false; error: string };

const finite = (value: unknown, min: number, max: number, integer = false): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    && (!integer || Number.isSafeInteger(value));

const rounded = (value: number) => Number(value.toFixed(value !== 0 && Math.abs(value) < 0.001 ? 10 : 3));
const number = (value: number, language: "fr" | "en") => new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 10 }).format(value);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function calculateWorkMetric(value: unknown, language: "fr" | "en" = "fr"): WorkMetricEvaluation {
  const t = (fr: string, en: string) => language === "en" ? en : fr;
  const n = (value: number) => number(value, language);
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: t("Mesures invalides.", "Invalid measurements.") };
  const raw = value as Record<string, unknown>;
  if (raw.kind === "processing_yield") {
    if (!exactKeys(raw, ["kind", "inputMassKg", "outputMassKg"])
      || !finite(raw.inputMassKg, 0.001, 10_000_000) || !finite(raw.outputMassKg, 0, 10_000_000)) {
      return { ok: false, error: t("Indiquez les masses mesurées en kg : entrée supérieure à zéro et sortie positive ou nulle.", "Enter measured masses in kg: input above zero and output at least zero.") };
    }
    const value = rounded(raw.outputMassKg / raw.inputMassKg * 100);
    if (value > 10_000) return { ok: false, error: t("Vérifiez les masses et leurs unités avant de calculer le rendement.", "Check the masses and units before calculating yield.") };
    return { ok: true, result: {
      input: { kind: "processing_yield", inputMassKg: raw.inputMassKg, outputMassKg: raw.outputMassKg },
      value, unit: "%",
      explanation: t(`Rendement massique apparent : ${n(raw.outputMassKg)} kg ÷ ${n(raw.inputMassKg)} kg × 100 = ${n(value)} %.`, `Apparent mass yield: ${n(raw.outputMassKg)} kg ÷ ${n(raw.inputMassKg)} kg × 100 = ${n(value)}%.`),
      limitation: t("Calcul sur les masses déclarées. Ajoutez tous les ingrédients entrants pour établir un bilan matière complet ; ce résultat ne valide ni la qualité ni la sécurité du lot.", "Calculated from declared masses. Include every input for a complete mass balance. This result does not validate batch quality or safety."),
    } };
  }
  if (raw.kind === "recipe_scale") {
    const hasIngredients = Object.hasOwn(raw, "ingredients");
    if (!exactKeys(raw, hasIngredients ? ["kind", "basePortions", "targetPortions", "ingredients"] : ["kind", "basePortions", "targetPortions"])
      || !finite(raw.basePortions, 1, 100_000, true) || !finite(raw.targetPortions, 1, 100_000, true)
      || (hasIngredients && (!Array.isArray(raw.ingredients) || raw.ingredients.length > 12))) {
      return { ok: false, error: t("Indiquez deux nombres entiers de portions supérieurs à zéro et au plus douze ingrédients mesurés.", "Enter two positive whole-number portion counts and up to twelve measured ingredients.") };
    }
    const basePortions = raw.basePortions as number;
    const targetPortions = raw.targetPortions as number;
    const ingredients: NonNullable<Extract<WorkMetricInput, { kind: "recipe_scale" }>["ingredients"]> = [];
    for (const entry of hasIngredients ? raw.ingredients as unknown[] : []) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return { ok: false, error: t("Vérifiez chaque ingrédient mesuré.", "Check each measured ingredient.") };
      const ingredient = entry as Record<string, unknown>;
      if (!exactKeys(ingredient, ["name", "quantity", "unit"])
        || typeof ingredient.name !== "string" || !ingredient.name.trim() || ingredient.name.trim().length > 60
        || !finite(ingredient.quantity, 0.001, 100_000)
        || !["g", "kg", "ml", "L", "pièce"].includes(String(ingredient.unit))) {
        return { ok: false, error: t("Chaque ingrédient exige un nom, une quantité positive mesurée et une unité reconnue.", "Each ingredient needs a name, a positive measured amount and a recognized unit.") };
      }
      ingredients.push({ name: ingredient.name.trim(), quantity: ingredient.quantity, unit: ingredient.unit as "g" | "kg" | "ml" | "L" | "pièce" });
    }
    if (new Set(ingredients.map((item) => item.name.toLocaleLowerCase("fr-FR"))).size !== ingredients.length) {
      return { ok: false, error: t("Regroupez les lignes qui portent le même nom d'ingrédient.", "Merge rows that use the same ingredient name.") };
    }
    const value = rounded(targetPortions / basePortions);
    const scaledIngredients = ingredients.map((ingredient) => ({
      name: ingredient.name, baseQuantity: ingredient.quantity,
      targetQuantity: rounded(ingredient.quantity * targetPortions / basePortions), unit: ingredient.unit,
    }));
    return { ok: true, result: {
      input: { kind: "recipe_scale", basePortions, targetPortions, ...(hasIngredients ? { ingredients } : {}) },
      value, unit: "×",
      explanation: `${t("Facteur de portions", "Portion factor")} : ${n(targetPortions)} ÷ ${n(basePortions)} ≈ ${n(value)} ×.${scaledIngredients.length ? `\n${t("Ingrédients calculés sur les quantités déclarées", "Ingredients scaled from declared quantities")} :\n${scaledIngredients.map((item) => `${item.name} : ${n(item.baseQuantity)} ${item.unit} × ${n(value)} ≈ ${n(item.targetQuantity)} ${item.unit}.`).join("\n")}` : ""}`,
      limitation: t("Facteur calculé sur les portions déclarées. Les quantités, temps, équipements et contrôles d'hygiène doivent être vérifiés lors d'un essai ; ils ne se redimensionnent pas tous linéairement.", "Factor calculated from declared portions. Verify amounts, time, equipment and hygiene during a trial; they do not all scale linearly."),
      scaledIngredients,
    } };
  }
  if (raw.kind === "plant_incidence" || raw.kind === "animal_incidence") {
    const plant = raw.kind === "plant_incidence";
    const observedKey = plant ? "observedPlants" : "observedAnimals";
    const affectedKey = plant ? "affectedPlants" : "affectedAnimals";
    if (!exactKeys(raw, ["kind", observedKey, affectedKey])
      || !finite(raw[observedKey], 1, 10_000_000, true)
      || !finite(raw[affectedKey], 0, 10_000_000, true)
      || raw[affectedKey] > raw[observedKey]) {
      return { ok: false, error: t("Indiquez les effectifs examinés et atteints ; le second ne peut pas dépasser le premier.", "Enter the numbers examined and affected; affected cannot exceed examined.") };
    }
    const observed = raw[observedKey] as number;
    const affected = raw[affectedKey] as number;
    const value = rounded(affected / observed * 100);
    const input = plant
      ? { kind: "plant_incidence" as const, observedPlants: observed, affectedPlants: affected }
      : { kind: "animal_incidence" as const, observedAnimals: observed, affectedAnimals: affected };
    return { ok: true, result: {
      input, value, unit: "%",
      explanation: t(`Proportion observée : ${n(affected)} ${plant ? "plants" : "animaux"} présentant le signe ÷ ${n(observed)} examinés × 100 = ${n(value)} %.`, `Observed proportion: ${n(affected)} ${plant ? "plants" : "animals"} showing the sign ÷ ${n(observed)} examined × 100 = ${n(value)}%.`),
      limitation: t(`Calcul limité à l'échantillon déclaré, sans extrapolation à ${plant ? "la parcelle" : "tout l'élevage"} ni diagnostic ${plant ? "agronomique" : "vétérinaire"}.`, `Calculation is limited to the declared sample. Do not extrapolate to ${plant ? "the whole parcel" : "the entire herd"} or treat it as a ${plant ? "plant health" : "veterinary"} diagnosis.`),
    } };
  }
  return { ok: false, error: t("Type de calcul inconnu.", "Unknown calculation type.") };
}
