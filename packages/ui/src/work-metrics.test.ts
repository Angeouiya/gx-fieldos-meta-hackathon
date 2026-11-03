import { describe, expect, it } from "vitest";

import { dossierMetric } from "./work-metrics";

describe("dossier measurements", () => {
  it("accepts measured decimal mass in a French input", () => {
    const metric = dossierMetric("processing", { inputMassKg: "100", outputMassKg: "12,5" });
    expect(metric?.ok && metric.result.value).toBe(12.5);
  });

  it("asks for both measurements and rejects affected counts above the sample", () => {
    expect(dossierMetric("processing", { inputMassKg: "100" })?.ok).toBe(false);
    expect(dossierMetric("crops", { observedPlants: "10", affectedPlants: "11" })?.ok).toBe(false);
    expect(dossierMetric("livestock", { observedAnimals: "10", affectedAnimals: "0" })?.ok).toBe(true);
  });

  it("does not fabricate a calculation for a dossier without measurements", () => {
    expect(dossierMetric("recipes", { ingredients: "Mil, mangue" })).toBeNull();
    expect(dossierMetric("project-plan", { title: "Ferme" })).toBeNull();
  });

  it("scales only ingredient quantities explicitly entered with units", () => {
    const metric = dossierMetric("recipes", { portions: "10", targetPortions: "25", ingredients: "Mangue 300 g, lait 1,5 L; miel 20 g" });
    expect(metric?.ok).toBe(true);
    if (metric?.ok) {
      expect(metric.result.scaledIngredients).toEqual([
        { name: "Mangue", baseQuantity: 300, targetQuantity: 750, unit: "g" },
        { name: "lait", baseQuantity: 1.5, targetQuantity: 3.75, unit: "L" },
        { name: "miel", baseQuantity: 20, targetQuantity: 50, unit: "g" },
      ]);
    }
    expect(dossierMetric("recipes", { portions: "10", targetPortions: "25", ingredients: "Mangue fraîche" })?.ok).toBe(false);
  });
});
