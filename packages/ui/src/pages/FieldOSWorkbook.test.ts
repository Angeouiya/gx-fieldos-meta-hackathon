import { expect, test } from "vitest";
import ExcelJS from "exceljs";
import { createFieldOSWorkbook } from "./FieldOSWorkbook";
import type { FarmData } from "./FieldOSFarm";

test("English campaign workbook keeps editable formulas and flags unknown field evidence", async () => {
  const data = {
    project: { title: "Illustrative Abidjan plot", domain: "agriculture", country: "Côte d’Ivoire", areaSqMeters: null },
    budget: { crop: "Leafy greens", market: "Local market", cycleStart: "2026-10-31", cycleEnd: "2027-01-31", targetYieldKg: 600, expectedPriceXofPerKg: 500, assumptions: "Illustrative only" },
    records: [{ id: "r1", title: "Soil testing", phase: "assessment", kind: "work", status: "planned", date: "2026-11-01", plannedCostXof: 15000, actualCostXof: null, plannedRevenueXof: null, actualRevenueXof: null, plannedQuantityKg: null, actualQuantityKg: null, note: "Confirm locally", evidenceUrl: null }],
    scanCount: 5,
    approvedPlan: null,
    report: { plannedCostXof: 15000, actualCostXof: null, plannedRevenueXof: 300000, actualRevenueXof: null, plannedMarginXof: 285000, actualMarginXof: null, harvestedKg: null, soldKg: null, inventoryKg: null, breakEvenKg: 30, gaps: ["Area is not measured"], missingPhases: ["sale"], note: "Do not treat estimates as facts.", scenarios: [{ name: "central", revenueXof: 300000, costXof: 15000, marginXof: 285000 }] },
  } as FarmData;
  const blob = await createFieldOSWorkbook(data);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Overview", "Field log", "Scenarios", "Checks"]);
  expect(workbook.getWorksheet("Overview")?.getCell("B6").value).toBe(5);
  expect(workbook.getWorksheet("Overview")?.getCell("B26").value).toMatchObject({ formula: expect.stringContaining("SUM('Field log'!F2:F2)") });
  expect(workbook.getWorksheet("Overview")?.getCell("B30").value).toMatchObject({ formula: expect.stringContaining('"equipment"') });
  expect(workbook.getWorksheet("Checks")?.getCell("B6").value).toBe("Area is not measured");
});
