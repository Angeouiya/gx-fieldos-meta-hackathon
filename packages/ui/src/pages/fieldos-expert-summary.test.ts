import { expect, test } from "vitest";
import { fieldosExpertSummary, fieldosFieldCheckText } from "./fieldos-expert-summary";

const views = [
  { viewIndex: 1, observations: ["Yellow leaf margins"] },
  { viewIndex: 2, observations: ["Dark spots on the lower leaf"] },
];

test("legacy generic summaries become concrete, view-specific findings", () => {
  const summary = fieldosExpertSummary(
    "The photos may not show the same subject clearly. Only separate visible findings can be used until the views are checked.",
    views,
    true,
    ["Inspect the leaf underside"],
  );
  expect(summary).toContain("View 1: Yellow leaf margins");
  expect(summary).toContain("View 2: Dark spots on the lower leaf");
  expect(summary).not.toContain("The photos may not show");
  expect(summary).toContain("Next field check: Inspect the leaf underside");
  expect(fieldosExpertSummary("Observed leaf margins and spots", views, true)).toBe("Observed leaf margins and spots");
});

test("French legacy summaries retain the language of their saved evidence", () => {
  const summary = fieldosExpertSummary(
    "Les photos ne confirment pas clairement le même sujet. Seuls les constats visibles par vue peuvent être utilisés avant vérification.",
    [{ viewIndex: 1, observations: ["Bords de feuille jaunes"] }],
    true,
  );
  expect(summary).toContain("Vue 1: Bords de feuille jaunes");
  expect(summary).not.toContain("Les photos ne confirment pas");
});

test("legacy per-view headings are removed without losing the field evidence", () => {
  expect(fieldosFieldCheckText("Uncertainty: crop species cannot be confirmed from this view; inspect the underside.")).toBe("crop species cannot be confirmed from this view; inspect the underside.");
  expect(fieldosFieldCheckText("Incertitude : l'espèce reste à confirmer par examen des feuilles.")).toBe("l'espèce reste à confirmer par examen des feuilles.");
  expect(fieldosFieldCheckText("Check soil pH in the field.")).toBe("Check soil pH in the field.");
  expect(fieldosFieldCheckText("Uncertainty:")).toBe("");
});
