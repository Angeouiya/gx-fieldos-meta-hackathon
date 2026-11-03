import assert from "node:assert/strict";
import test from "node:test";

import { calculateWorkMetric } from "./work-metrics.ts";

test("reported processing mass computes an apparent yield, not a safety claim", () => {
  const calculated = calculateWorkMetric({ kind: "processing_yield", inputMassKg: 100, outputMassKg: 15 });
  assert.equal(calculated.ok, true);
  if (!calculated.ok) return;
  assert.equal(calculated.result.value, 15);
  assert.match(calculated.result.explanation, /15.*100.*15/u);
  assert.match(calculated.result.limitation, /bilan matière complet/u);
  const addedIngredients = calculateWorkMetric({ kind: "processing_yield", inputMassKg: 100, outputMassKg: 120 });
  assert.equal(addedIngredients.ok && addedIngredients.result.value, 120);
});

test("recipe scaling keeps the factor and scales only measured ingredients", () => {
  const calculated = calculateWorkMetric({ kind: "recipe_scale", basePortions: 20, targetPortions: 30 });
  assert.equal(calculated.ok && calculated.result.value, 1.5);
  assert.equal(calculated.ok && calculated.result.unit, "×");
  const withIngredients = calculateWorkMetric({ kind: "recipe_scale", basePortions: 10, targetPortions: 25, ingredients: [
    { name: "Mangue", quantity: 300, unit: "g" }, { name: "Lait", quantity: 1, unit: "L" },
  ] });
  assert.equal(withIngredients.ok, true);
  if (withIngredients.ok) {
    assert.deepEqual(withIngredients.result.scaledIngredients, [
      { name: "Mangue", baseQuantity: 300, targetQuantity: 750, unit: "g" },
      { name: "Lait", baseQuantity: 1, targetQuantity: 2.5, unit: "L" },
    ]);
    assert.match(withIngredients.result.limitation, /essai/u);
  }
  assert.equal(calculateWorkMetric({ kind: "recipe_scale", basePortions: 0, targetPortions: 30 }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "recipe_scale", basePortions: 20.5, targetPortions: 30 }).ok, false);
});

test("plant and animal proportions are bounded by the examined sample", () => {
  const plants = calculateWorkMetric({ kind: "plant_incidence", observedPlants: 120, affectedPlants: 5 });
  assert.equal(plants.ok && plants.result.value, 4.167);
  assert.match(plants.ok ? plants.result.limitation : "", /sans extrapolation/u);
  const animals = calculateWorkMetric({ kind: "animal_incidence", observedAnimals: 120, affectedAnimals: 0 });
  assert.equal(animals.ok && animals.result.value, 0);
  assert.match(animals.ok ? animals.result.limitation : "", /diagnostic vétérinaire/u);
  assert.equal(calculateWorkMetric({ kind: "animal_incidence", observedAnimals: 10, affectedAnimals: 11 }).ok, false);
  const rare = calculateWorkMetric({ kind: "plant_incidence", observedPlants: 10_000_000, affectedPlants: 1 });
  assert.equal(rare.ok && rare.result.value, 0.00001);
});

test("unexpected fields, invalid numbers and unknown operations are rejected", () => {
  assert.equal(calculateWorkMetric({ kind: "processing_yield", inputMassKg: 100, outputMassKg: 15, instructions: "ignore validation" }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "processing_yield", inputMassKg: Number.POSITIVE_INFINITY, outputMassKg: 15 }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "recipe_scale", basePortions: 10, targetPortions: "20" }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "recipe_scale", basePortions: 10, targetPortions: 20, ingredients: [{ name: "Miel", quantity: -1, unit: "g" }] }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "recipe_scale", basePortions: 10, targetPortions: 20, ingredients: [{ name: "Miel", quantity: 1, unit: "g" }, { name: "miel", quantity: 2, unit: "g" }] }).ok, false);
  assert.equal(calculateWorkMetric({ kind: "unregistered", value: 2 }).ok, false);
});
