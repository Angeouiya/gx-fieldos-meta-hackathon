import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { FieldOSFarm, pdfBusinessPlan, type FarmData } from "./FieldOSFarm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("FieldOS saves owner assumptions and dated field work through the authenticated project route", async () => {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const base = "/api/field/projects/project-1/farm";
  const data = {
    project: { title: "Parcelle", domain: "agriculture", areaSqMeters: 10_000 },
    budget: null,
    records: [],
    scanCount: 2,
    approvedPlan: null,
    report: {
      plannedCostXof: null,
      actualCostXof: null,
      plannedRevenueXof: null,
      actualRevenueXof: null,
      plannedMarginXof: null,
      actualMarginXof: null,
      harvestedKg: null,
      soldKg: null,
      inventoryKg: null,
      breakEvenKg: null,
      gaps: ["Prix manquant"],
      missingPhases: ["clearing"],
      scenarios: [],
      note: "Prévision à vérifier.",
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options?: RequestInit) => {
      if (path !== base) throw new Error(`Unexpected request ${path}`);
      if (options?.method === "POST") {
        requests.push({ path, body: JSON.parse(String(options.body)) });
        return { ok: true, json: async () => ({ id: "created" }) };
      }
      return { ok: true, json: async () => data };
    }),
  );
  const user = userEvent.setup();
  const { rerender } = render(<FieldOSFarm projectId="project-1" role="owner" />);
  await screen.findByText("Prix manquant");
  expect(screen.getByText("Field checks before committing costs · 2")).toBeVisible();
  expect(screen.getByText("Prix manquant").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("option", { name: "Equipment" })).toBeInTheDocument();
  await user.type(
    screen.getByRole("textbox", { name: "Selected crop" }),
    "Maïs",
  );
  await user.click(
    screen.getByRole("button", { name: "Save assumptions" }),
  );
  expect(requests[0]?.body.type).toBe("budget");
  expect((requests[0]?.body.data as { crop: string }).crop).toBe("Maïs");
  await user.type(
    screen.getByRole("textbox", { name: "Action or product" }),
    "Défrichage zone nord",
  );
  await user.click(screen.getByRole("button", { name: "Add operation" }));
  expect(requests[1]?.body.type).toBe("record");
  expect((requests[1]?.body.data as { title: string }).title).toBe(
    "Défrichage zone nord",
  );
  expect(screen.getByRole("button", { name: "Excel tracker" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Business plan PDF" })).toBeDisabled();
  rerender(<FieldOSFarm projectId="project-1" role="owner" english={false} />);
  expect(screen.getByRole("button", { name: "Suivi Excel" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Plan d'affaires PDF" })).toBeDisabled();
});

test("legacy plan export explains the required review and opens decisions", async () => {
  const onReviewPlan = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      project: { title: "Legacy parcel", domain: "agriculture" },
      budget: null,
      records: [],
      scanCount: 1,
      approvedPlan: { version: 2, content: { summary: "Older plan without language" } },
      report: { plannedCostXof: null, actualCostXof: null, plannedRevenueXof: null, actualRevenueXof: null,
        plannedMarginXof: null, actualMarginXof: null, harvestedKg: null, soldKg: null,
        inventoryKg: null, breakEvenKg: null, gaps: [], missingPhases: [], note: "", scenarios: [] },
    }),
  })));
  const user = userEvent.setup();
  render(<FieldOSFarm projectId="legacy" role="owner" onReviewPlan={onReviewPlan} />);
  const review = await screen.findByRole("button", { name: "Open project decisions" });
  expect(screen.getByText("Approve a new project plan in English before exporting the business plan.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Business plan PDF" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Excel tracker" })).toBeEnabled();
  await user.click(review);
  expect(onReviewPlan).toHaveBeenCalledOnce();
});

test("a previously approved plan needing review remains exportable and is labelled honestly", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      project: { title: "Field dossier", domain: "agriculture" },
      budget: null,
      records: [],
      scanCount: 5,
      approvedPlan: { version: 1, status: "review_needed", content: { language: "en", summary: "Earlier decision" } },
      report: { plannedCostXof: null, actualCostXof: null, plannedRevenueXof: null, actualRevenueXof: null,
        plannedMarginXof: null, actualMarginXof: null, harvestedKg: null, soldKg: null,
        inventoryKg: null, breakEvenKg: null, gaps: [], missingPhases: [], note: "", scenarios: [] },
    }),
  })));
  render(<FieldOSFarm projectId="project-1" role="owner" />);
  expect(await screen.findByText(/plan GX review needed v1/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Business plan PDF" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Business plan Word" })).toBeEnabled();
});

test("local business plan states a repeated operation note once and keeps distinct notes", () => {
  const record = (title: string, note: string) => ({
    id: title, title, note, phase: "assessment", kind: "work", status: "planned", date: "2026-11-02",
    plannedQuantityKg: null, actualQuantityKg: null, plannedCostXof: null, actualCostXof: null,
    plannedRevenueXof: null, actualRevenueXof: null, evidenceUrl: null,
  });
  const data: FarmData = {
    project: { title: "Sample field", domain: "agriculture", country: "Côte d’Ivoire", areaSqMeters: null },
    budget: null,
    records: [
      record("North beds", "Illustrative planning estimate."),
      record("South beds", "Illustrative planning estimate"),
      record("Water check", "Inspect the inlet"),
    ],
    scanCount: 3,
    approvedPlan: null,
    report: {
      plannedCostXof: null, actualCostXof: null, plannedRevenueXof: null, actualRevenueXof: null,
      plannedMarginXof: null, actualMarginXof: null, harvestedKg: null, soldKg: null,
      inventoryKg: null, breakEvenKg: null, gaps: [], missingPhases: [], note: "Estimates need field validation.", scenarios: [],
    },
  };
  const text = pdfBusinessPlan(data);
  expect(text.split("Illustrative planning estimate")).toHaveLength(2);
  expect(text).toContain("Note 1 (2 operations): Illustrative planning estimate.");
  expect(text.split("Note 1.")).toHaveLength(3);
  expect(text).toContain("Note: Inspect the inlet.");
});
