import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { FieldOSPlan } from "./FieldOSPlan";

afterEach(cleanup);

test("GX-FIELD-MULTISCAN-001: the plan identifies compared scans and a complete draft journey", () => {
  render(<FieldOSPlan scans={[{ id: "soil", title: "Sol nord" }, { id: "water", title: "Eau sud" }]} content={{
    scanCoverage: { totalScans: 3, analyzedScans: 2, includedScans: 2, pendingScans: 1, omittedScans: 0 },
    comparisons: [{ scanIds: ["soil", "water"], finding: "Les deux zones diffèrent.", uncertainty: "Incertitude : Mesure d'humidité manquante." }],
    cropCandidates: [{ name: "Culture à tester", rationale: "Hypothèse fondée sur les observations.", evidenceIds: ["soil"], sourceUrls: [], missingChecks: ["Analyse de sol"], sourceStatus: "not_locally_verified" }],
    journey: [{ phase: "clearing", label: "Défrichage", actions: ["Vérifier les contraintes"], checks: [], status: "draft" }, { phase: "sale", label: "Vente", actions: [], checks: ["Débouchés"], status: "needs_input" }],
  }} />);
  expect(screen.getByText(/2 scans compared out of 3/)).toBeVisible();
  expect(screen.getByText("Sol nord · Eau sud")).toBeVisible();
  expect(screen.getByText("Field check: Mesure d'humidité manquante.")).toBeVisible();
  expect(screen.queryByText(/Field check: Incertitude/)).not.toBeInTheDocument();
  expect(screen.getByText("Local source unverified")).toBeVisible();
  expect(screen.getByText("Défrichage")).toBeVisible();
  expect(screen.getByText("Vente")).toBeVisible();
  expect(screen.getByText("Field check before execution")).toBeVisible();
});
