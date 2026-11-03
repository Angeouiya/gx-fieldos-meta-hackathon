import type { FarmData } from "./FieldOSFarm";
import type { Worksheet } from "exceljs";
import { fieldosDomainProfile } from "./fieldos-domains";

const safe = (value: string) => (/^[=+@-]/.test(value) ? `'${value}` : value);
const money = '#,##0 "XOF";[Red](#,##0) "XOF"';
const checkCopy: Record<string, string> = {
  "Aucun scan analysé ou enregistré dans le dossier.": "No analyzed or recorded scan in the project.",
  "Aucun plan de culture validé par le propriétaire.": "No crop plan approved by the owner.",
  "Aucun plan de projet validé par le propriétaire.": "No project plan approved by the owner.",
  "Surface de parcelle non mesurée ou déclarée.": "Parcel area has not been measured or declared.",
  "Hypothèses de campagne et de marché absentes.": "Campaign and market assumptions are missing.",
  "Aucune dépense planifiée du défrichage à la vente.": "No planned expense from clearing through sale.",
  "Aucune dépense planifiée de la préparation à la vente.": "No planned expense from preparation through sale.",
  "Des dépenses planifiées n’ont pas de montant.": "Some planned expenses have no amount.",
  "Rendement, prix ou recettes de vente prévus manquants.": "Planned yield, price or sales revenue is missing.",
  "Recettes de vente prévues manquantes : saisir des ventes datées ou une quantité et un prix par kg si applicable.": "Planned sales are missing: enter dated sales or quantity and price per kg if applicable.",
  "Sources datées du rendement et du prix à renseigner et vérifier.": "Dated yield and price sources must be entered and checked.",
  "Sources datées de la quantité et du prix à renseigner et vérifier.": "Dated quantity and price sources must be entered and checked.",
  "Aucune vente datée : le calendrier d’encaissement reste inconnu.": "No dated sale: the payment timeline is unknown.",
  "Cultures associées : planifiez les ventes et suivez le stock séparément par produit ; une moyenne prix/kg et un stock global seraient trompeurs.": "Intercropping: plan sales and track inventory by product; an average price and combined inventory would mislead.",
  "Produits ou activités associés : planifiez les ventes et suivez le stock séparément ; une moyenne prix/kg et un stock global seraient trompeurs.": "Mixed products or activities: plan sales and track inventory separately; a blended price per kg and combined stock would mislead.",
  "Vente enregistrée sans quantité récoltée vérifiable.": "Sale recorded without a verifiable harvested quantity.",
  "Les quantités vendues dépassent les récoltes enregistrées ; vérifier le stock initial ou les unités.": "Sold quantities exceed recorded harvests; check opening stock and units.",
  "Prévision issue des hypothèses saisies. Les marges excluent impôts, financement, amortissement, pertes et coûts non enregistrés ; elles ne sont pas un bénéfice net.": "Projection based on entered assumptions. Margins exclude taxes, financing, depreciation, losses and unrecorded costs; they are not net profit.",
};
const englishCheck = (value: string) => checkCopy[value]
  ?? value.replace(/^(\d+) opération\(s\) hors de la campagne actuelle, exclue\(s\) des calculs et conservée\(s\) dans l’historique\.$/, "$1 operation(s) outside the current campaign, excluded from calculations and kept in history.");

/** Editable English workbook; server figures and recalculated log totals remain distinct. */
export async function createFieldOSWorkbook(data: FarmData): Promise<Blob> {
  const profile = fieldosDomainProfile(data.project.domain);
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "GX FieldOS";
  book.created = new Date();
  book.calcProperties.fullCalcOnLoad = true;
  const overview = book.addWorksheet("Overview");
  const log = book.addWorksheet("Field log");
  const scenarios = book.addWorksheet("Scenarios");
  const checks = book.addWorksheet("Checks");
  const heading = (sheet: Worksheet, labels: string[]) => {
    sheet.addRow(labels);
    const row = sheet.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17613D" } };
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 32;
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: labels.length } };
  };
  overview.columns = [{ width: 34 }, { width: 30 }, { width: 74 }];
  heading(overview, ["Metric", "GX value", "Provenance or interpretation"]);
  const metric = (name: string, value: string | number | null, note = "") => overview.addRow([name, typeof value === "string" ? safe(value) : value, note]);
  metric("Project", data.project.title, "Owner's project folder");
  metric("Project domain", data.project.domain || "Other");
  metric("Country", data.project.country || "Not provided");
  metric("Area (ha)", data.project.areaSqMeters == null ? null : data.project.areaSqMeters / 10_000, "Blank means the boundary was not measured.");
  metric("Analyzed scans", data.scanCount);
  metric("Owner-approved plan", data.approvedPlan ? `Version ${data.approvedPlan.version}` : "No", "A draft is not an approved field decision.");
  metric(profile.activity.en, data.budget?.crop || "Not selected");
  metric("Market or buyer", data.budget?.market || "Not provided");
  metric("Campaign start", data.budget?.cycleStart || "Not provided");
  metric("Campaign end", data.budget?.cycleEnd || "Not provided");
  metric("Target quantity (kg, if applicable)", data.budget?.targetYieldKg ?? null, "Owner-entered estimate; verify locally. Use dated sales for portions or services.");
  metric("Expected price (XOF/kg, if applicable)", data.budget?.expectedPriceXofPerKg ?? null, "Owner-entered estimate; verify locally.");
  metric("Planned costs (XOF)", data.report.plannedCostXof, "GX report, current campaign only.");
  metric("Planned sales (XOF)", data.report.plannedRevenueXof, "GX report, may use yield × price if no dated sale.");
  metric("Planned gross margin (XOF)", data.report.plannedMarginXof, "Before taxes, finance, depreciation and unrecorded costs.");
  metric("Actual costs (XOF)", data.report.actualCostXof, "Blank is unknown, not zero.");
  metric("Actual sales (XOF)", data.report.actualRevenueXof, "Blank is unknown, not zero.");
  metric("Actual gross margin (XOF)", data.report.actualMarginXof);
  metric("Indicative break-even (kg, if applicable)", data.report.breakEvenKg);
  metric("Recorded production (kg, if applicable)", data.report.harvestedKg);
  metric("Recorded sales (kg)", data.report.soldKg);
  metric("Indicative inventory (kg)", data.report.inventoryKg);

  log.columns = [
    { width: 16 }, { width: 22 }, { width: 15 }, { width: 16 }, { width: 48 },
    { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 18 },
    { width: 18 }, { width: 68 }, { width: 46 },
  ];
  heading(log, ["Date", "Phase", "Type", "Status", "Action or product", "Planned cost", "Actual cost", "Planned sale", "Actual sale", "Planned kg", "Actual kg", "Field note", "Evidence URL"]);
  const current = data.records.filter((item) => item.status !== "cancelled" && (!data.budget || (item.date >= data.budget.cycleStart && item.date <= data.budget.cycleEnd)));
  for (const item of current) log.addRow([
    item.date, safe(profile.stages[item.phase as keyof typeof profile.stages]?.en ?? item.phase), safe(item.kind), safe(item.status), safe(item.title),
    item.plannedCostXof, item.actualCostXof, item.plannedRevenueXof, item.actualRevenueXof,
    item.plannedQuantityKg, item.actualQuantityKg, safe(item.note || ""), safe(item.evidenceUrl || ""),
  ]);
  for (let row = 2; row <= log.rowCount; row++) {
    for (const column of [6, 7, 8, 9]) log.getRow(row).getCell(column).numFmt = money;
    log.getRow(row).alignment = { vertical: "top", wrapText: true };
    log.getRow(row).height = 42;
  }
  const last = Math.max(2, log.rowCount);
  const formula = (column: string) => ({ formula: `IF(COUNT('Field log'!${column}2:${column}${last})=0,"",SUM('Field log'!${column}2:${column}${last}))` });
  overview.addRow([]);
  metric("Editable log totals", "", "These formulas update after you edit the Field log. Compare them with the GX report above before deciding.");
  overview.addRow(["Planned costs from log (XOF)", formula("F")]);
  overview.addRow(["Actual costs from log (XOF)", formula("G")]);
  overview.addRow(["Planned dated sales from log (XOF)", formula("H")]);
  overview.addRow(["Actual dated sales from log (XOF)", formula("I")]);
  const categoryFormula = (kind: string, column: "F" | "G", done = false) => {
    const condition = done ? `COUNTIFS('Field log'!C2:C${last},"${kind}",'Field log'!D2:D${last},"done")` : `COUNTIF('Field log'!C2:C${last},"${kind}")`;
    const known = done ? `COUNTIFS('Field log'!C2:C${last},"${kind}",'Field log'!D2:D${last},"done",'Field log'!${column}2:${column}${last},">=0")` : `COUNTIFS('Field log'!C2:C${last},"${kind}",'Field log'!${column}2:${column}${last},">=0")`;
    const sum = done ? `SUMIFS('Field log'!${column}2:${column}${last},'Field log'!C2:C${last},"${kind}",'Field log'!D2:D${last},"done")` : `SUMIFS('Field log'!${column}2:${column}${last},'Field log'!C2:C${last},"${kind}")`;
    return { formula: `IF(${condition}=0,"",IF(${known}<${condition},"",${sum}))` };
  };
  for (const [kind, label] of [["equipment", "Equipment"], ["input", "Materials and inputs"], ["service", "External services"]] as const) {
    overview.addRow([`${label} planned (XOF)`, categoryFormula(kind, "F")]);
    overview.addRow([`${label} actual (XOF)`, categoryFormula(kind, "G", true)]);
  }
  for (const row of [14, 15, 16, 17, 18, 19, 26, 27, 28, 29]) overview.getRow(row).getCell(2).numFmt = money;

  scenarios.columns = [{ width: 28 }, { width: 24 }, { width: 24 }, { width: 24 }];
  heading(scenarios, ["Scenario", "Projected sales (XOF)", "Projected costs (XOF)", "Gross margin (XOF)"]);
  for (const item of data.report.scenarios) scenarios.addRow([
    ({ prudent: "Cautious", central: "Central", favorable: "Favourable" } as Record<string, string>)[item.name] || safe(item.name),
    item.revenueXof, item.costXof, item.marginXof,
  ]);
  scenarios.getColumn(2).numFmt = money;
  scenarios.getColumn(3).numFmt = money;
  scenarios.getColumn(4).numFmt = money;

  checks.columns = [{ width: 32 }, { width: 105 }];
  heading(checks, ["Check", "Evidence, owner input or limitation"]);
  checks.addRow(["Yield source", safe(data.budget?.yieldSourceUrl || "Missing")]);
  checks.addRow(["Price source", safe(data.budget?.priceSourceUrl || "Missing")]);
  checks.addRow(["Sources checked on", data.budget?.sourceCheckedAt || "Not provided"]);
  checks.addRow(["Owner assumptions", safe(data.budget?.assumptions || "Not provided")]);
  for (const gap of data.report.gaps) checks.addRow(["Open check", safe(englishCheck(gap))]);
  for (const phase of data.report.missingPhases) checks.addRow(["Missing campaign phase", safe(profile.stages[phase as keyof typeof profile.stages]?.en ?? phase)]);
  for (const check of profile.checks.en) checks.addRow(["Domain check", safe(check)]);
  const approved = data.approvedPlan?.content;
  const journey = approved && typeof approved === "object" && !Array.isArray(approved) && "journey" in approved ? approved.journey : null;
  if (Array.isArray(journey)) for (const item of journey) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const phase = "phase" in item && typeof item.phase === "string" ? item.phase : "";
    const materials = "materials" in item && Array.isArray(item.materials) ? item.materials.filter((value: unknown): value is string => typeof value === "string").slice(0, 8) : [];
    if (materials.length) checks.addRow([`Equipment · ${profile.stages[phase as keyof typeof profile.stages]?.en || phase}`, safe(`${materials.join("; ")}. Specify quantities, quotes and owner.`)]);
  }
  checks.addRow(["Report limit", safe(englishCheck(data.report.note))]);
  checks.addRow(["Decision limit", "Illustrative inputs and unverified values are not a field diagnosis or an investment guarantee."]);
  for (let row = 2; row <= checks.rowCount; row++) {
    checks.getRow(row).alignment = { vertical: "top", wrapText: true };
    checks.getRow(row).height = Math.min(90, Math.max(28, Math.ceil(String(checks.getRow(row).getCell(2).value || "").length / 95) * 18 + 8));
  }
  return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
