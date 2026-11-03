import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createGXDocumentBlob } from "../documents/gx-document-export";
import { downloadFieldExport } from "../field-download";
import { createFieldOSWorkbook } from "./FieldOSWorkbook";
import { fieldosFarmFrench } from "./fieldos-farm-fr";
import { fieldosDomainProfile, fieldosPhaseKeys } from "./fieldos-domains";

type FarmBudget = {
  crop: string;
  market: string;
  cycleStart: string;
  cycleEnd: string;
  openingCashXof: number | null;
  targetYieldKg: number | null;
  expectedPriceXofPerKg: number | null;
  yieldSourceUrl: string | null;
  priceSourceUrl: string | null;
  sourceCheckedAt: string | null;
  assumptions: string;
};
type FarmRecord = {
  id: string;
  title: string;
  phase: string;
  kind: string;
  status: string;
  date: string;
  plannedQuantityKg: number | null;
  actualQuantityKg: number | null;
  plannedCostXof: number | null;
  actualCostXof: number | null;
  plannedRevenueXof: number | null;
  actualRevenueXof: number | null;
  note: string;
  evidenceUrl: string | null;
};
export type FarmData = {
  project: { title: string; domain?: string; country?: string; areaSqMeters?: number | null };
  budget: FarmBudget | null;
  records: FarmRecord[];
  scanCount: number;
  approvedPlan: { version: number; status?: string; content?: unknown } | null;
  report: {
    plannedCostXof: number | null;
    actualCostXof: number | null;
    plannedRevenueXof: number | null;
    actualRevenueXof: number | null;
    plannedMarginXof: number | null;
    actualMarginXof: number | null;
    harvestedKg: number | null;
    soldKg: number | null;
    inventoryKg: number | null;
    breakEvenKg: number | null;
    gaps: string[];
    missingPhases: string[];
    note: string;
    scenarios: {
      name: string;
      revenueXof: number;
      costXof: number;
      marginXof: number;
    }[];
  };
};
const today = () => new Date().toISOString().slice(0, 10);
const blankBudget = () => ({
  crop: "",
  market: "",
  cycleStart: today(),
  cycleEnd: today(),
  openingCashXof: "",
  targetYieldKg: "",
  expectedPriceXofPerKg: "",
  yieldSourceUrl: "",
  priceSourceUrl: "",
  sourceCheckedAt: "",
  assumptions: "",
});
const blankRecord = () => ({
  title: "",
  phase: "assessment",
  kind: "work",
  status: "planned",
  date: today(),
  plannedQuantityKg: "",
  actualQuantityKg: "",
  plannedCostXof: "",
  actualCostXof: "",
  plannedRevenueXof: "",
  actualRevenueXof: "",
  note: "",
  evidenceUrl: "",
});
const num = (value: string) => (value.trim() === "" ? null : Number(value));
const xof = (value: number | null) =>
  value === null ? "Not provided" : `${value.toLocaleString("en-US")} XOF`;
const kg = (value: number | null) =>
  value === null
    ? "—"
    : `${value.toLocaleString("en-US", { maximumFractionDigits: 3 })} kg`;

const reportCopy: Record<string, string> = {
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
const englishReport = (value: string) => reportCopy[value]
  ?? value.replace(/^(\d+) opération\(s\) hors de la campagne actuelle, exclue\(s\) des calculs et conservée\(s\) dans l’historique\.$/, "$1 operation(s) outside the current campaign, excluded from calculations and kept in history.");
const frenchReport = (value: string) => Object.entries(reportCopy).find(([, translated]) => translated === value)?.[0]
  ?? (value === "Projection based on entered assumptions. Figures are not verified field results or net profit."
    ? "Prévision fondée sur les hypothèses saisies. Les chiffres ne sont ni des résultats terrain vérifiés ni un bénéfice net."
    : value);
const scenarioLabel = (value: string) => ({ prudent: "Cautious", central: "Central", favorable: "Favourable" }[value] ?? value);
const statusLabel = (value: string) => ({ planned: "Planned", in_progress: "In progress", done: "Done", cancelled: "Cancelled" }[value] ?? value);

export function pdfBusinessPlan(data: FarmData) {
  const { project, budget, report } = data;
  const profile = fieldosDomainProfile(project.domain);
  const normalizedNote = (note: string) => note.trim().replace(/[.\s]+$/, "");
  const noteCounts = new Map<string, number>();
  for (const item of data.records.filter((record) => record.status !== "cancelled")) {
    const note = normalizedNote(item.note);
    if (note) noteCounts.set(note, (noteCounts.get(note) ?? 0) + 1);
  }
  const sharedNotes = [...noteCounts].filter(([, count]) => count > 1);
  const noteReference = new Map(sharedNotes.map(([note], index) => [note, index + 1]));
  const operationNote = (note: string) => {
    const normalized = normalizedNote(note);
    if (!normalized) return "";
    const reference = noteReference.get(normalized);
    return reference ? ` Note ${reference}.` : ` Note: ${normalized}.`;
  };
  const costByKind = (kind: string, field: "plannedCostXof" | "actualCostXof") => {
    const records = data.records.filter((item) => item.kind === kind && item.status !== "cancelled" && (!budget || item.date >= budget.cycleStart && item.date <= budget.cycleEnd) && (field === "plannedCostXof" || item.status === "done"));
    return records.length && records.every((item) => item[field] !== null) ? records.reduce((sum, item) => sum + (item[field] ?? 0), 0) : null;
  };
  const lines = [
    `FARM CAMPAIGN BUSINESS PLAN - ${project.title}`,
    `Country: ${project.country || "Not provided"}. Area: ${project.areaSqMeters == null ? "Not measured" : `${(project.areaSqMeters / 10_000).toLocaleString("en-US")} ha`}.`,
    `Last GX plan approved by owner: ${data.approvedPlan ? `version ${data.approvedPlan.version}${data.approvedPlan.status === "review_needed" ? " (review needed after new data)" : ""}` : "No"}. Analyzed scans: ${data.scanCount}.`,
    "1. ACTIVITY AND MARKET ASSUMPTIONS",
    `${profile.activity.en}: ${budget?.crop || "Not selected"}. Market or buyer: ${budget?.market || "Not provided"}.`,
    `Campaign: ${budget?.cycleStart || "Not provided"} to ${budget?.cycleEnd || "Not provided"}. Target quantity if sold by kg: ${kg(budget?.targetYieldKg ?? null)}. Expected price per kg if applicable: ${xof(budget?.expectedPriceXofPerKg ?? null)}. Enter dated sales for portions or services.`,
    `Yield source: ${budget?.yieldSourceUrl || "Missing"}. Price source: ${budget?.priceSourceUrl || "Missing"}. Sources checked: ${budget?.sourceCheckedAt || "Not provided"}.`,
    `Owner assumptions and limits: ${budget?.assumptions?.replace(/[.\s]+$/, "") || "None entered"}.`,
    "2. OPERATIONS - ASSESSMENT TO SALE",
  ];
  for (const phase of fieldosPhaseKeys) {
    const operations = data.records.filter((item) => item.phase === phase && item.status !== "cancelled");
    lines.push(`${profile.stages[phase].en}: ${operations.length ? "" : "No dated operation recorded."}`);
    for (const item of operations) lines.push(
      `${item.date} - ${item.title} (${statusLabel(item.status)}). Planned cost: ${xof(item.plannedCostXof)}; actual cost: ${xof(item.actualCostXof)}; planned sales: ${xof(item.plannedRevenueXof)}; actual sales: ${xof(item.actualRevenueXof)}.${operationNote(item.note)}${item.evidenceUrl ? ` Evidence: ${item.evidenceUrl}.` : ""}`,
    );
  }
  for (const [index, [note, count]] of sharedNotes.entries()) lines.push(`Note ${index + 1} (${count} operations): ${note}.`);
  lines.push(
    "3. BUDGET AND TRACKING",
    `Planned costs: ${xof(report.plannedCostXof)}. Planned sales: ${xof(report.plannedRevenueXof)}. Planned gross margin: ${xof(report.plannedMarginXof)}. Indicative break-even: ${kg(report.breakEvenKg)}.`,
    `Actual costs: ${xof(report.actualCostXof)}. Actual sales: ${xof(report.actualRevenueXof)}. Actual gross margin: ${xof(report.actualMarginXof)}.`,
    `Equipment: planned ${xof(costByKind("equipment", "plannedCostXof"))}, actual ${xof(costByKind("equipment", "actualCostXof"))}. Materials and inputs: planned ${xof(costByKind("input", "plannedCostXof"))}, actual ${xof(costByKind("input", "actualCostXof"))}. External services: planned ${xof(costByKind("service", "plannedCostXof"))}, actual ${xof(costByKind("service", "actualCostXof"))}.`,
    "Equipment purchases are counted in full in this campaign. Depreciation and future-cycle costs require separate review.",
    `Recorded production if measured in kg: ${kg(report.harvestedKg)}. Recorded sales: ${kg(report.soldKg)}. Indicative inventory: ${kg(report.inventoryKg)}.`,
    "4. SCENARIOS AND CHECKS",
  );
  for (const scenario of report.scenarios) lines.push(
    `${scenarioLabel(scenario.name)} - sales ${xof(scenario.revenueXof)}, costs ${xof(scenario.costXof)}, gross margin ${xof(scenario.marginXof)}.`,
  );
  for (const gap of report.gaps) lines.push(`Check: ${englishReport(gap)}`);
  for (const phase of report.missingPhases) lines.push(`Missing phase: ${profile.stages[phase as keyof typeof profile.stages]?.en || phase}.`);
  lines.push("5. EQUIPMENT, PROCEDURES AND VALIDATION");
  for (const check of profile.checks.en) lines.push(`Check: ${check}. Record quantities, specifications, supplier quote, owner and verification date.`);
  const approved = data.approvedPlan?.content;
  const journey = approved && typeof approved === "object" && !Array.isArray(approved) && "journey" in approved ? approved.journey : null;
  if (Array.isArray(journey)) for (const item of journey) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const phase = "phase" in item && typeof item.phase === "string" ? item.phase : "";
    const materials = "materials" in item && Array.isArray(item.materials) ? item.materials.filter((value: unknown): value is string => typeof value === "string").slice(0, 8) : [];
    if (materials.length) lines.push(`${profile.stages[phase as keyof typeof profile.stages]?.en || phase}: ${materials.join("; ")}. Add quantities and quotations to the field log.`);
  }
  lines.push("The separate technical guide describes each proposed solution, its implementation, controls, risks and unknowns. This business plan tracks declared costs and sales; it is not a supplier quote or verified field result.");
  lines.push(englishReport(report.note), "Figures are based on entered assumptions. GX does not certify agronomic suitability, profitability or market access; verify missing field measurements and local sources before decisions.");
  return lines.join("\n\n");
}

export function FieldOSFarm({
  projectId,
  role,
  english = true,
  localReplay = false,
  onReviewPlan,
}: {
  projectId: string;
  role: "owner" | "contributor" | "viewer";
  english?: boolean;
  localReplay?: boolean;
  onReviewPlan?: () => void;
}) {
  const t = (en: string) => english ? en : fieldosFarmFrench[en] ?? en;
  const message = (value: string) => {
    if (english) return value;
    const match = value.match(/^(PDF|DOCX) business plan downloaded\. Review the assumptions and open checks before acting\.$/);
    return match
      ? `Plan d'affaires ${match[1]} téléchargé. Vérifiez les hypothèses et les points à contrôler avant d'agir.`
      : t(value);
  };
  const uiXof = (value: number | null) => t(xof(value));
  const [data, setData] = useState<FarmData | null>(null);
  const storedPlanContent = data?.approvedPlan?.content;
  const storedPlanLanguage = storedPlanContent && typeof storedPlanContent === "object" && !Array.isArray(storedPlanContent)
    ? (storedPlanContent as { language?: unknown }).language : null;
  const planLanguageMismatch = Boolean(data?.approvedPlan && storedPlanLanguage !== (english ? "en" : "fr"));
  const profile = fieldosDomainProfile(data?.project.domain);
  const phaseLabel = (phase: string) => profile.stages[phase as keyof typeof profile.stages]?.[english ? "en" : "fr"] ?? phase;
  const [budget, setBudget] = useState(blankBudget);
  const [record, setRecord] = useState(blankRecord);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const base = `projects/${encodeURIComponent(projectId)}/farm`;
  const canWrite = role !== "viewer";
  const load = useCallback(async () => {
    const response = await fetch(`/api/field/${base}`, { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Campaign unavailable.");
    setData(value as FarmData);
    return value as FarmData;
  }, [base]);
  useEffect(() => {
    let active = true;
    void load()
      .then((value) => {
        if (active)
          setBudget(
            value.budget
              ? (Object.fromEntries(
                  Object.entries(value.budget).map(([key, item]) => [
                    key,
                    item === null ? "" : String(item),
                  ]),
                ) as ReturnType<typeof blankBudget>)
              : blankBudget(),
          );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Campaign unavailable.",
          );
      });
    return () => {
      active = false;
    };
  }, [load]);
  const send = async (method: "POST" | "PATCH" | "DELETE", input: unknown) => {
    const response = await fetch(`/api/field/${base}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const value = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(value.error || "Unable to save.");
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await send("POST", {
        type: "budget",
        requestId: crypto.randomUUID(),
        data: {
          ...budget,
          openingCashXof: num(budget.openingCashXof),
          targetYieldKg: num(budget.targetYieldKg),
          expectedPriceXofPerKg: num(budget.expectedPriceXofPerKg),
          yieldSourceUrl: budget.yieldSourceUrl || null,
          priceSourceUrl: budget.priceSourceUrl || null,
          sourceCheckedAt: budget.sourceCheckedAt || null,
        },
      });
      await load();
      setNotice("Assumptions saved.");
    });
  };
  const saveRecord = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const item = {
        ...record,
        evidenceUrl: record.evidenceUrl || null,
        plannedQuantityKg: ["harvest", "sale"].includes(record.kind)
          ? num(record.plannedQuantityKg)
          : null,
        actualQuantityKg:
          record.status === "done" && ["harvest", "sale"].includes(record.kind)
            ? num(record.actualQuantityKg)
            : null,
        plannedCostXof:
          record.kind === "sale" ? null : num(record.plannedCostXof),
        actualCostXof:
          record.kind === "sale" || record.status !== "done"
            ? null
            : num(record.actualCostXof),
        plannedRevenueXof:
          record.kind === "sale" ? num(record.plannedRevenueXof) : null,
        actualRevenueXof:
          record.kind === "sale" && record.status === "done"
            ? num(record.actualRevenueXof)
            : null,
      };
      await send(
        editingId ? "PATCH" : "POST",
        editingId
          ? { id: editingId, data: item }
          : { type: "record", requestId: crypto.randomUUID(), data: item },
      );
      setRecord(blankRecord());
      setEditingId("");
      await load();
      setNotice("Operation saved.");
    });
  };
  const downloadPlan = (format: "pdf" | "docx") => void run(async () => {
    if (!data) throw new Error("Campaign unavailable.");
    const blob = await createGXDocumentBlob(`Farm business plan - ${data.project.title}`, pdfBusinessPlan(data), format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gx-business-plan-${projectId}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNotice(`${format.toUpperCase()} business plan downloaded. Review the assumptions and open checks before acting.`);
  });
  const downloadWorkbook = () => void run(async () => {
    if (!data) throw new Error("Campaign unavailable.");
    const blob = await createFieldOSWorkbook(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gx-campaign-${projectId}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNotice("English Excel tracker downloaded. Review the open checks and edit the Field log as real figures arrive.");
  });
  const downloadHosted = (format: "pdf" | "docx" | "xlsx") => void run(async () => {
    await downloadFieldExport(`/api/field/projects/${encodeURIComponent(projectId)}/farm/export?format=${format}&lang=${english ? "en" : "fr"}`,
      `gx-${format === "xlsx" ? "tracking-workbook" : "business-plan"}-${projectId}.${format}`, english);
    setNotice(english ? "Download started. Open the file to review it." : "Téléchargement lancé. Ouvrez le fichier pour le vérifier.");
  });
  const budgetInput = (
    key: keyof ReturnType<typeof blankBudget>,
    label: string,
    type = "text",
  ) => (
    <label className="gx-fieldos-farm-field" key={key}>
      <span>{t(label)}</span>
      <input
        type={type === "date" ? "text" : type}
        inputMode={type === "date" ? "numeric" : undefined}
        placeholder={type === "date" ? "YYYY-MM-DD" : undefined}
        pattern={type === "date" ? "[0-9]{4}-[0-9]{2}-[0-9]{2}" : undefined}
        value={budget[key]}
        disabled={role !== "owner"}
        onChange={(event) =>
          setBudget((current) => ({ ...current, [key]: event.target.value }))
        }
      />
    </label>
  );
  const recordInput = (
    key: keyof ReturnType<typeof blankRecord>,
    label: string,
    type = "text",
  ) => (
    <label className="gx-fieldos-farm-field" key={key}>
      <span>{t(label)}</span>
      <input
        type={type === "date" ? "text" : type}
        inputMode={type === "date" ? "numeric" : undefined}
        placeholder={type === "date" ? "YYYY-MM-DD" : undefined}
        pattern={type === "date" ? "[0-9]{4}-[0-9]{2}-[0-9]{2}" : undefined}
        value={record[key]}
        onChange={(event) =>
          setRecord((current) => ({ ...current, [key]: event.target.value }))
        }
      />
    </label>
  );
  return (
    <div className="gx-fieldos-stack gx-fieldos-farm">
      <div className="gx-fieldos-card">
        <div className="gx-fieldos-panel-heading">
          <div>
            <h3>{t("Complete project campaign")}</h3>
            <p>
              {t("From assessment to sale: planned figures, observed facts, sources, inventory and gaps.")}
            </p>
          </div>
          <div className="gx-fieldos-farm-actions">
            {localReplay ? <>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data || busy || !english || planLanguageMismatch} onClick={() => downloadPlan("docx")}>
                  {t("Business plan Word")}
                </button>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data || busy || !english || planLanguageMismatch} onClick={() => downloadPlan("pdf")}>
                  {t("Business plan PDF")}
                </button>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data || busy || !english} onClick={downloadWorkbook}>
                  {t("Excel tracker")}
                </button>
            </> : <>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data?.approvedPlan || busy || planLanguageMismatch} onClick={() => downloadHosted("docx")}>{t("Business plan Word")}</button>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data?.approvedPlan || busy || planLanguageMismatch} onClick={() => downloadHosted("pdf")}>{t("Business plan PDF")}</button>
                <button className="gx-fieldos-button secondary" type="button" disabled={!data || busy} onClick={() => downloadHosted("xlsx")}>{t("Excel tracker")}</button>
            </>}
          </div>
        </div>
        {planLanguageMismatch && <div className="gx-fieldos-farm-notice" role="status">
          {english ? "Approve a new project plan in English before exporting the business plan." : "Validez un nouveau plan de projet en français avant d’exporter le business plan."}
          {" "}
          {onReviewPlan && <button className="gx-fieldos-button secondary" type="button" onClick={onReviewPlan}>
            {english ? "Open project decisions" : "Ouvrir les décisions du projet"}
          </button>}
        </div>}
        {localReplay && !english && <p className="gx-fieldos-farm-notice" role="status">Le mode local d’illustration ne génère pas d’exports en français. Connectez le service AGRIX pour télécharger les documents français.</p>}
        {error && (
          <p role="alert" className="gx-fieldos-farm-error">
            {message(error)}
          </p>
        )}
        {notice && (
          <p role="status" className="gx-fieldos-farm-notice">
            {message(notice)}
          </p>
        )}
        {data && (
          <>
            <p>
              {data.scanCount} {t("scan(s) analyzed · plan GX")}{" "}
              {data.approvedPlan
                ? `${data.approvedPlan.status === "review_needed" ? (english ? "review needed" : "à revoir") : t("approved")} v${data.approvedPlan.version}`
                : t("not approved")}{" "}
              · {data.records.length} {t("operation(s).")}
            </p>
            <div className="gx-fieldos-farm-metrics">
              {[
                ["Planned costs", uiXof(data.report.plannedCostXof)],
                ["Planned sales", uiXof(data.report.plannedRevenueXof)],
                ["Planned gross margin", uiXof(data.report.plannedMarginXof)],
                ["Indicative break-even", kg(data.report.breakEvenKg)],
                ["Actual costs", uiXof(data.report.actualCostXof)],
                ["Actual sales", uiXof(data.report.actualRevenueXof)],
                ["Actual gross margin", uiXof(data.report.actualMarginXof)],
                ["Indicative inventory", kg(data.report.inventoryKg)],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{t(label ?? "")}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {!!data.report.scenarios.length && (
              <div className="gx-fieldos-farm-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Scenario")}</th>
                      <th>{t("Sales")}</th>
                      <th>{t("Costs")}</th>
                      <th>{t("Gross margin")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.report.scenarios.map((item) => (
                      <tr key={item.name}>
                        <th>{t(scenarioLabel(item.name))}</th>
                        <td>{uiXof(item.revenueXof)}</td>
                        <td>{uiXof(item.costXof)}</td>
                        <td>{uiXof(item.marginXof)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(data.report.gaps.length > 0 ||
              data.report.missingPhases.length > 0) && (
              <details className="gx-fieldos-farm-checks">
                <summary>{t("Field checks before committing costs")} · {data.report.gaps.length + data.report.missingPhases.length}</summary>
                <ul>
                  {data.report.gaps.map((gap) => (
                    <li key={gap}>{english ? englishReport(gap) : frenchReport(gap)}</li>
                  ))}
                  {data.report.missingPhases.map((phase) => (
                    <li key={phase}>
                      {t("Phase without an operation:")}{" "}
                      {phaseLabel(phase)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p>{english ? englishReport(data.report.note) : frenchReport(data.report.note)}</p>
          </>
        )}
      </div>
      <div className="gx-fieldos-card">
        <h3>{t("Activity and market assumptions")}</h3>
        <p>
          {t("The owner supplies sources and prices; verify them locally.")}
        </p>
        <form onSubmit={saveBudget}>
          <div className="gx-fieldos-farm-grid">
            {budgetInput("crop", profile.activity[english ? "en" : "fr"])}
            {budgetInput("market", "Market or buyer")}
            {budgetInput("cycleStart", "Campaign start", "date")}
            {budgetInput("cycleEnd", "Campaign end", "date")}
            {budgetInput(
              "targetYieldKg",
              "Target quantity (kg, if applicable)",
              "number",
            )}
            {budgetInput(
              "expectedPriceXofPerKg",
              "Expected price (XOF/kg, if applicable)",
              "number",
            )}
            {budgetInput(
              "openingCashXof",
              "Opening cash (XOF)",
              "number",
            )}
            {budgetInput("yieldSourceUrl", "Yield source (HTTPS)", "url")}
            {budgetInput("priceSourceUrl", "Price source (HTTPS)", "url")}
            {budgetInput("sourceCheckedAt", "Sources checked on", "date")}
          </div>
          <label className="gx-fieldos-farm-field">
            <span>{t("Assumptions and limits")}</span>
            <textarea
              value={budget.assumptions}
              disabled={role !== "owner"}
              onChange={(event) =>
                setBudget((current) => ({
                  ...current,
                  assumptions: event.target.value,
                }))
              }
            />
          </label>
          {role === "owner" && (
            <button
              className="gx-fieldos-button"
              disabled={
                busy || !budget.crop || !budget.cycleStart || !budget.cycleEnd
              }
            >
              {t("Save assumptions")}
            </button>
          )}
        </form>
      </div>
      <div className="gx-fieldos-card" id="gx-fieldos-farm-form">
        <h3>{t("Field log")}</h3>
        <p>
          {t("Record work, inputs, harvests and sales. A blank field is not zero.")}
        </p>
        {canWrite && (
          <form onSubmit={saveRecord}>
            <div className="gx-fieldos-farm-grid">
              <label className="gx-fieldos-farm-field">
                <span>{t("Phase")}</span>
                <select
                  value={record.phase}
                  onChange={(event) =>
                    setRecord((current) => ({
                      ...current,
                      phase: event.target.value,
                    }))
                  }
                >
                  {fieldosPhaseKeys.map((key) => (
                    <option key={key} value={key}>
                      {phaseLabel(key)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gx-fieldos-farm-field">
                <span>{t("Type")}</span>
                <select
                  value={record.kind}
                  onChange={(event) =>
                    setRecord((current) => ({
                      ...current,
                      kind: event.target.value,
                      phase:
                        event.target.value === "harvest"
                          ? "harvest"
                          : event.target.value === "sale"
                            ? "sale"
                            : current.phase,
                    }))
                  }
                >
                  <option value="work">{t("Work")}</option>
                  <option value="input">{t("Input")}</option>
                  <option value="equipment">{t("Equipment")}</option>
                  <option value="service">{t("External service")}</option>
                  <option value="harvest">{t("Harvest")}</option>
                  <option value="sale">{t("Sale")}</option>
                </select>
              </label>
              <label className="gx-fieldos-farm-field">
                <span>{t("Status")}</span>
                <select
                  value={record.status}
                  onChange={(event) =>
                    setRecord((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="planned">{t("Planned")}</option>
                  <option value="in_progress">{t("In progress")}</option>
                  <option value="done">{t("Done")}</option>
                  <option value="cancelled">{t("Cancelled")}</option>
                </select>
              </label>
              {recordInput("date", "Date", "date")}
              {recordInput("title", "Action or product")}
              {record.kind !== "sale" &&
                recordInput("plannedCostXof", "Planned cost (XOF)", "number")}
              {record.kind !== "sale" &&
                record.status === "done" &&
                recordInput("actualCostXof", "Actual cost (XOF)", "number")}
              {record.kind === "sale" &&
                recordInput("plannedRevenueXof", "Planned sale (XOF)", "number")}
              {record.kind === "sale" &&
                record.status === "done" &&
                recordInput("actualRevenueXof", "Actual sale (XOF)", "number")}
              {["harvest", "sale"].includes(record.kind) &&
                recordInput(
                  "plannedQuantityKg",
                  "Planned quantity (kg)",
                  "number",
                )}
              {["harvest", "sale"].includes(record.kind) &&
                record.status === "done" &&
                recordInput("actualQuantityKg", "Actual quantity (kg)", "number")}
              {recordInput("evidenceUrl", "Evidence URL (HTTPS)", "url")}
            </div>
            <label className="gx-fieldos-farm-field">
              <span>{t("Field note")}</span>
              <textarea
                value={record.note}
                onChange={(event) =>
                  setRecord((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </label>
            <div className="gx-fieldos-farm-actions">
              <button
                className="gx-fieldos-button"
                disabled={busy || !record.title}
              >
                {editingId
                  ? t("Save changes")
                  : t("Add operation")}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="gx-fieldos-button secondary"
                  onClick={() => {
                    setEditingId("");
                    setRecord(blankRecord());
                  }}
                >
                  {t("Cancel")}
                </button>
              )}
            </div>
          </form>
        )}
        <div className="gx-fieldos-farm-records">
          {data?.records.length ? (
            data.records.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {phaseLabel(item.phase)} ·{" "}
                    {item.date} · {t(statusLabel(item.status))}
                  </small>
                  <small>
                    {t("Planned")} {uiXof(item.plannedCostXof ?? item.plannedRevenueXof)} · {t("Actual")} {uiXof(item.actualCostXof ?? item.actualRevenueXof)} ·{" "}
                    {kg(item.actualQuantityKg)}
                  </small>
                </div>
                {canWrite && (
                  <div className="gx-fieldos-farm-actions">
                    <button
                      type="button"
                      className="gx-fieldos-button secondary"
                      onClick={() => {
                        setEditingId(item.id);
                        setRecord(
                          Object.fromEntries(
                            Object.entries(item)
                              .filter(([key]) => key !== "id")
                              .map(([key, value]) => [
                                key,
                                value === null ? "" : String(value),
                              ]),
                          ) as ReturnType<typeof blankRecord>,
                        );
                        document
                          .getElementById("gx-fieldos-farm-form")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {t("Edit")}
                    </button>
                    <button
                      type="button"
                      className="gx-fieldos-button ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await send("DELETE", { id: item.id });
                          await load();
                          setNotice("Operation cancelled; audit trail retained.");
                        })
                      }
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>{t("No operations yet.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
