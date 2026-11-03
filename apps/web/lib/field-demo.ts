/** Local-only FieldOS demo harness. Never enabled in a production build. */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { replayPlanResult, replayScanResult } from "./field-demo-replay.ts";
import { buildLocalTechnicalGuide } from "./field-demo-guide.ts";
import { parcelArea, type ParcelPoint } from "../../../packages/ui/src/parcel-geometry.ts";
import { createGXDocumentBlob } from "../../../packages/ui/src/documents/gx-document-export.ts";

type Project = { id: string; title: string; description: string; country: string; domain: string; role: "owner"; archivedAt: string | null; pinnedAt: string | null; areaSqMeters: number | null; areaMethod: string | null; areaAccuracyMeters: number | null; boundary: { type: "Polygon"; coordinates: ParcelPoint[][] } | null; counts: { missions: number; measurements: number; plans: number } };
type Evidence = { id: string; viewIndex: number };
type Mission = { id: string; title: string; note: string; scanAspect: string; status: string; version: number; latitude: number | null; longitude: number | null; locationAccuracyMeters: number | null; evidence: Evidence[]; plan: unknown; createdAt: string };
type Plan = { id: string; version: number; status: string; content: Record<string, unknown> };
type FarmRecord = { id: string; title: string; phase: string; kind: string; status: string; date: string; plannedQuantityKg: number | null; actualQuantityKg: number | null; plannedCostXof: number | null; actualCostXof: number | null; plannedRevenueXof: number | null; actualRevenueXof: number | null; note: string; evidenceUrl: string | null };
type FarmBudget = { crop: string; market: string; cycleStart: string; cycleEnd: string; openingCashXof: number | null; targetYieldKg: number | null; expectedPriceXofPerKg: number | null; yieldSourceUrl: string | null; priceSourceUrl: string | null; sourceCheckedAt: string | null; assumptions: string };
type Detail = { project: Project; missions: Mission[]; measurements: { id: string; kind: string; value: { text: string; number?: number | null; unit?: string }; source: string }[]; projectTasks: { id: string; title: string; status: string }[]; plans: Plan[]; members: { userId: string; role: string; user: { name: string; email: string | null } }[]; artifacts: { id: string; kind: string; title: string; content: { text: string } }[] };
type DemoState = { projects: Project[]; details: Record<string, Detail>; farms: Record<string, { budget: FarmBudget | null; records: FarmRecord[] }>; uploads: Record<string, { missionId: string; viewIndex: number; ready: boolean }> };
const empty = (): DemoState => ({ projects: [], details: {}, farms: {}, uploads: {} });
const demoDir = () => process.env.GX_FIELD_DEMO_DIR || join(process.cwd(), ".gx-field-demo");
const statePath = () => join(demoDir(), "state.json");
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const error = (message: string, status = 400) => json({ error: message }, status);
const parse = async (request: Request): Promise<Record<string, unknown>> => {
  const body: unknown = await request.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
};
const str = (value: unknown) => typeof value === "string" ? value : "";
const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const sum = (items: Array<number | null>) => items.reduce<number>((total, item) => total + (item ?? 0), 0);

async function load(): Promise<DemoState> {
  await mkdir(demoDir(), { recursive: true });
  try { return JSON.parse(await readFile(statePath(), "utf8")) as DemoState; }
  catch { return empty(); }
}
async function save(state: DemoState) {
  const temp = `${statePath()}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state), "utf8");
  await rename(temp, statePath());
}
function syncProject(state: DemoState, id: string) {
  const detail = state.details[id];
  if (!detail) throw new Error("Local project not found.");
  detail.project.counts = { missions: detail.missions.length, measurements: detail.measurements.length, plans: detail.plans.length };
  state.projects = state.projects.map((project) => project.id === id ? detail.project : project);
}
function missionFor(state: DemoState, id: string) {
  return Object.values(state.details).flatMap((detail) => detail.missions).find((item) => item.id === id);
}
function textFromMeta(body: unknown): Record<string, unknown> {
  const raw = object(body);
  const output = array<Record<string, unknown>>(raw.output);
  const text = output.flatMap((entry) => array<Record<string, unknown>>(entry.content))
    .map((entry) => str(entry.text)).find(Boolean) || str(raw.output_text);
  if (!text) throw new Error("Meta returned no text.");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Meta returned invalid JSON.");
  return parsed as Record<string, unknown>;
}
async function metaJson(instructions: string, content: Record<string, unknown>[], maxTokens: number) {
  const key = process.env.MODEL_API_KEY;
  if (!key) throw new Error("Local Meta test key unavailable.");
  const response = await fetch("https://api.meta.ai/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.GX_META_MODEL || "muse-spark-1.3", store: false,
      max_output_tokens: maxTokens, instructions,
      input: [{ role: "user", content }], text: { format: { type: "json_object" } } }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`Meta API returned ${response.status}.`);
  return textFromMeta(await response.json());
}
async function analyze(mission: Mission) {
  const content: Record<string, unknown>[] = [{ type: "input_text", text:
    `This is a local software demonstration using generated sample images, not a real field diagnosis. Scan: ${mission.title}. Context: ${mission.note}. Inspect each numbered image separately. Return JSON with summary, viewFindings (one per image: viewIndex, observations array, uncertainty), actions (title, rationale), missingEvidence array, sources array. Do not invent GPS, area, crop identity, soil chemistry, yields or verified prices.` }];
  for (const evidence of mission.evidence) {
    const bytes = await readFile(join(demoDir(), `${evidence.id}.jpg`));
    content.push({ type: "input_text", text: `View ${evidence.viewIndex}` });
    content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${bytes.toString("base64")}`, detail: "high" });
  }
  const raw = await metaJson("You are GX FieldOS. Reply only as valid English JSON. Separate visible facts from hypotheses and label uncertainty. Never claim a diagnosis from images alone. The images are generated illustrations.", content, 3500);
  const findings = array<Record<string, unknown>>(raw.viewFindings);
  if (!str(raw.summary) || findings.length !== mission.evidence.length) throw new Error("Meta scan response did not cover each view.");
  return { summary: str(raw.summary), viewFindings: findings.map((item, index) => ({ viewIndex: index + 1,
    observations: array<string>(item.observations).map(str), uncertainty: str(item.uncertainty) })),
    actions: array<Record<string, unknown>>(raw.actions).map((item) => ({ title: str(item.title), rationale: str(item.rationale) })),
    missingEvidence: array<string>(raw.missingEvidence).map(str), sources: [] };
}
async function makePlan(detail: Detail): Promise<Record<string, unknown>> {
  const ready = detail.missions.filter((mission) => mission.status === "ready");
  if (!ready.length) throw new Error("Analyze at least one scan first.");
  const summaries = ready.map((mission) => ({ id: mission.id, title: mission.title, aspect: mission.scanAspect, analysis: mission.plan }));
  const content = await metaJson("You are GX FieldOS. Return only valid English JSON. This is an illustrative local software demonstration using generated images. Compare scan observations without inventing measurements or prices. Produce summary string, findings string array, uncertainties string array, recommendations array of {title,rationale,sourceUrls:[],sourceStatus:'not_locally_verified',checks:string[]}, nextActions string array, comparisons array of {finding,scanIds:string[],uncertainty}, cropCandidates array of {name,rationale,evidenceIds:string[],sourceUrls:[],missingChecks:string[],sourceStatus:'not_locally_verified'}, and journey array for assessment, clearing, soil preparation, planting, maintenance, harvest, postharvest and sale with {phase,label,actions:string[],checks:string[],status:'needs_input'}. Do not cite invented sources.",
    [{ type: "input_text", text: JSON.stringify({ project: detail.project.title, scans: summaries, observations: detail.measurements }) }], 7000);
  return { ...content,
    summary: str(content.summary), findings: array<string>(content.findings).map(str), uncertainties: array<string>(content.uncertainties).map(str),
    scanCoverage: { totalScans: detail.missions.length, analyzedScans: ready.length, includedScans: ready.length,
      pendingScans: detail.missions.length - ready.length, omittedScans: 0 },
    comparisons: array<Record<string, unknown>>(content.comparisons).map((item) => ({ finding: str(item.finding),
      scanIds: array<string>(item.scanIds).filter((id) => ready.some((scan) => scan.id === id)), uncertainty: str(item.uncertainty) })),
    cropCandidates: array<Record<string, unknown>>(content.cropCandidates).map((item) => ({ name: str(item.name), rationale: str(item.rationale),
      evidenceIds: array<string>(item.evidenceIds).filter((id) => ready.some((scan) => scan.id === id)), sourceUrls: [],
      missingChecks: array<string>(item.missingChecks).map(str), sourceStatus: "not_locally_verified" })),
    recommendations: array<Record<string, unknown>>(content.recommendations).map((item) => ({ title: str(item.title), rationale: str(item.rationale),
      sourceUrls: [], sourceStatus: "not_locally_verified", checks: array<string>(item.checks).map(str) })),
    nextActions: array<string>(content.nextActions).map(str),
    journey: array<Record<string, unknown>>(content.journey).map((item) => ({ phase: str(item.phase), label: str(item.label),
      actions: array<string>(item.actions).map(str), checks: array<string>(item.checks).map(str), status: "needs_input" })),
  };
}
function farmReport(detail: Detail, budget: FarmBudget | null, records: FarmRecord[]) {
  const completeSum = (values: (number | null)[]) => values.length && values.every((value) => value !== null)
    ? sum(values) : null;
  const costRecords = records.filter((item) => item.kind === "work" || item.kind === "input" || item.kind === "harvest");
  const saleRecords = records.filter((item) => item.kind === "sale");
  const plannedCostXof = completeSum(costRecords.map((item) => item.plannedCostXof));
  const actualCostXof = completeSum(costRecords.filter((item) => item.status === "done").map((item) => item.actualCostXof));
  const plannedRevenueXof = completeSum(saleRecords.map((item) => item.plannedRevenueXof))
    ?? (budget?.targetYieldKg && budget.expectedPriceXofPerKg ? budget.targetYieldKg * budget.expectedPriceXofPerKg : null);
  const actualRevenueXof = completeSum(saleRecords.filter((item) => item.status === "done").map((item) => item.actualRevenueXof));
  const gaps = [
    ...(!detail.plans.some((plan) => plan.status === "approved") ? ["Aucun plan de culture validé par le propriétaire."] : []),
    ...(detail.project.areaSqMeters === null ? ["Surface de parcelle non mesurée ou déclarée."] : []),
    ...(!budget?.yieldSourceUrl || !budget?.priceSourceUrl ? ["Dated yield and price sources must be entered and checked."] : []),
    ...(!costRecords.length ? ["No planned costs have been entered."] : []),
    ...(!records.some((item) => item.kind === "sale" && item.status === "done") ? ["No dated sale: the payment timeline is unknown."] : []),
  ];
  const phases = ["assessment", "clearing", "soil_preparation", "planting", "maintenance", "harvest", "postharvest", "sale"];
  const missingPhases = phases.filter((phase) => !records.some((item) => item.phase === phase));
  return { plannedCostXof, actualCostXof, plannedRevenueXof, actualRevenueXof,
    plannedMarginXof: plannedRevenueXof === null || plannedCostXof === null ? null : plannedRevenueXof - plannedCostXof,
    actualMarginXof: actualRevenueXof === null || actualCostXof === null ? null : actualRevenueXof - actualCostXof,
    harvestedKg: null, soldKg: null, inventoryKg: null,
    breakEvenKg: plannedCostXof !== null && budget?.expectedPriceXofPerKg ? Math.ceil(plannedCostXof / budget.expectedPriceXofPerKg) : null,
    gaps, missingPhases, note: "Projection based on entered assumptions. Figures are not verified field results or net profit.",
    scenarios: plannedRevenueXof === null || plannedCostXof === null ? [] : [
      { name: "Cautious", revenueXof: Math.round(plannedRevenueXof * .595), costXof: Math.round(plannedCostXof * 1.2), marginXof: Math.round(plannedRevenueXof * .595) - Math.round(plannedCostXof * 1.2) },
      { name: "Central", revenueXof: plannedRevenueXof, costXof: plannedCostXof, marginXof: plannedRevenueXof - plannedCostXof },
      { name: "Favourable", revenueXof: Math.round(plannedRevenueXof * 1.32), costXof: Math.round(plannedCostXof * .95), marginXof: Math.round(plannedRevenueXof * 1.32) - Math.round(plannedCostXof * .95) },
    ] };
}

export async function handleLocalFieldDemo(request: Request, parts: string[]): Promise<Response> {
  const state = await load();
  const method = request.method;
  const [root, id, action, child] = parts;
  if (root === "demo-upload" && id && method === "PUT") {
    const upload = state.uploads[id];
    if (!upload) return error("Upload not found.", 404);
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length || bytes.length > 10_000_000) return error("Image exceeds local demo limit.", 413);
    await writeFile(join(demoDir(), `${id}.jpg`), bytes);
    upload.ready = true; await save(state);
    return json({ ok: true });
  }
  if (root === "projects" && !id && method === "GET") return json({ projects: state.projects });
  if (root === "projects" && !id && method === "POST") {
    const body = await parse(request);
    if (!str(body.title).trim()) return error("Project name required.");
    const project: Project = { id: randomUUID(), title: str(body.title).trim(), description: "", country: str(body.country) || "Côte d’Ivoire",
      domain: str(body.domain) || "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null, areaAccuracyMeters: null, boundary: null,
      counts: { missions: 0, measurements: 0, plans: 0 } };
    state.projects.push(project);
    state.details[project.id] = { project, missions: [], measurements: [], projectTasks: [], plans: [],
      members: [{ userId: "local-demo-owner", role: "owner", user: { name: "Local demo", email: null } }], artifacts: [] };
    state.farms[project.id] = { budget: null, records: [] };
    await save(state); return json({ project }, 201);
  }
  const detail = state.details[id ?? ""] as Detail;
  if (root === "projects" && id && !detail) return error("Project not found.", 404);
  if (root === "projects" && !id) return error("Project not found.", 404);
  if (root === "projects" && id && !action && method === "GET") return json(detail);
  if (root === "projects" && id && !action && method === "PATCH") {
    const body = await parse(request);
    if ("area" in body) {
      const area = object(body.area);
      if (area.method === "manual") {
        const squareMeters = num(area.areaSqMeters);
        if (squareMeters === null || squareMeters < 1 || squareMeters > 1_000_000_000) return error("Invalid declared area.");
        detail.project.areaSqMeters = squareMeters; detail.project.areaMethod = "manual";
        detail.project.areaAccuracyMeters = null; detail.project.boundary = null;
      } else if (["map", "gps", "import"].includes(str(area.method))) {
        if (!Array.isArray(area.coordinates)) return error("Invalid boundary.");
        const points = area.coordinates as ParcelPoint[];
        const measured = parcelArea(points);
        if (!measured) return error("Invalid boundary.");
        const accuracy = num(area.accuracyMeters);
        if (area.method === "gps" && (accuracy === null || accuracy <= 0 || accuracy > 1000)) return error("Invalid GPS accuracy.");
        detail.project.areaSqMeters = measured.areaSqMeters; detail.project.areaMethod = str(area.method);
        detail.project.areaAccuracyMeters = area.method === "gps" ? accuracy : null;
        detail.project.boundary = { type: "Polygon", coordinates: [[...points, points[0]!]] };
      } else return error("Invalid area method.");
    }
    if (typeof body.pinned === "boolean") detail.project.pinnedAt = body.pinned ? new Date().toISOString() : null;
    if (typeof body.archived === "boolean") detail.project.archivedAt = body.archived ? new Date().toISOString() : null;
    syncProject(state, id); await save(state); return json({ project: detail.project });
  }
  if (root === "projects" && id && action === "scans" && method === "POST") {
    const body = await parse(request);
    const mission: Mission = { id: randomUUID(), title: str(body.title), note: str(body.note), scanAspect: str(body.aspect),
      status: "draft", version: 1, latitude: num(body.latitude), longitude: num(body.longitude),
      locationAccuracyMeters: num(body.locationAccuracyMeters), evidence: [], plan: null, createdAt: new Date().toISOString() };
    if (!mission.title) return error("Scan name required.");
    detail.missions.unshift(mission); syncProject(state, id); await save(state); return json({ mission }, 201);
  }
  if (root === "field-missions" && id) {
    const mission = missionFor(state, id);
    if (!mission) return error("Scan not found.", 404);
    if (!action && method === "PATCH") {
      const body = await parse(request);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (body.expectedVersion !== mission.version) return error("Scan changed. Refresh it before renaming.", 409);
      if (title.length < 3 || title.length > 160) return error("Scan name must contain 3 to 160 characters.", 400);
      mission.title = title; mission.version++;
      await save(state);
      return json({ mission });
    }
    if (action === "evidence-upload" && method === "POST") {
      const body = await parse(request);
      if (mission.version !== body.expectedVersion || mission.evidence.length >= 4) return error("Scan changed or full.", 409);
      const uploadId = randomUUID();
      state.uploads[uploadId] = { missionId: id, viewIndex: mission.evidence.length + 1, ready: false };
      await save(state);
      return json({ uploadId, uploadUrl: `/api/field/demo-upload/${uploadId}` });
    }
    if (action === "evidence" && child && method === "GET") {
      if (!mission.evidence.some((item) => item.id === child)) return error("View not found.", 404);
      return new Response(await readFile(join(demoDir(), `${child}.jpg`)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
    }
    if (action === "evidence" && method === "POST") {
      const body = await parse(request); const upload = state.uploads[str(body.uploadId)];
      if (!upload?.ready || upload.missionId !== id || body.expectedVersion !== mission.version) return error("Upload not ready.", 409);
      mission.evidence.push({ id: str(body.uploadId), viewIndex: upload.viewIndex }); mission.version++;
      delete state.uploads[str(body.uploadId)]; await save(state); return json({ mission });
    }
    if (action === "analyze" && method === "POST") {
      const body = await parse(request);
      if (body.expectedVersion !== mission.version || !mission.evidence.length) return error("Scan changed or has no views.", 409);
      try { mission.plan = process.env.GX_FIELD_DEMO_REPLAY === "true" ? replayScanResult(mission.title) : await analyze(mission);
        mission.status = "ready"; mission.version++; await save(state); return json({ mission }); }
      catch (cause) { return error(cause instanceof Error ? cause.message : "Analysis failed.", 502); }
    }
  }
  if (root === "projects" && id && action === "plans" && method === "POST") {
    if (process.env.GX_FIELD_DEMO_REPLAY === "true" &&
      (detail.missions.length !== 5 || detail.missions.some((item) => item.status !== "ready"))) {
      return error("The saved five-scan result requires five analyzed scans.", 409);
    }
    try { const content = process.env.GX_FIELD_DEMO_REPLAY === "true"
      ? { ...replayPlanResult(detail.missions.map(({ id: scanId, title }) => ({ id: scanId, title }))),
          scanCoverage: { totalScans: detail.missions.length, analyzedScans: detail.missions.filter((item) => item.status === "ready").length,
            includedScans: detail.missions.filter((item) => item.status === "ready").length,
            pendingScans: detail.missions.filter((item) => item.status !== "ready").length, omittedScans: 0 } }
      : await makePlan(detail);
      const plan: Plan = { id: randomUUID(), version: detail.plans.length + 1, status: "draft", content };
      detail.plans.unshift(plan); syncProject(state, id); await save(state); return json({ plan }, 201); }
    catch (cause) { return error(cause instanceof Error ? cause.message : "Plan failed.", 502); }
  }
  if (root === "projects" && id && action === "plans" && method === "PATCH") {
    const body = await parse(request); const plan = detail.plans.find((item) => item.id === body.planId);
    if (!plan) return error("Plan not found.", 404); plan.status = "approved"; await save(state); return json({ plan });
  }
  if (root === "projects" && id && action === "tasks" && method === "POST") {
    const body = await parse(request); detail.projectTasks.push({ id: randomUUID(), title: str(body.title), status: "pending" });
    await save(state); return json({ ok: true }, 201);
  }
  if (root === "projects" && id && action === "tasks" && method === "PATCH") {
    const body = await parse(request); const task = detail.projectTasks.find((item) => item.id === body.taskId);
    if (!task) return error("Task not found.", 404); task.status = str(body.status); await save(state); return json({ task });
  }
  if (root === "projects" && id && action === "measurements" && method === "POST") {
    const body = await parse(request); detail.measurements.push({ id: randomUUID(), kind: str(body.kind),
      value: { text: str(body.text) }, source: str(body.source) }); syncProject(state, id); await save(state); return json({ ok: true }, 201);
  }
  if (root === "projects" && id && action === "documents" && method === "POST") {
    const body = await parse(request); detail.artifacts.push({ id: randomUUID(), kind: "document", title: str(body.title),
      content: { text: str(body.text) } }); await save(state); return json({ ok: true }, 201);
  }
  if (root === "projects" && id && action === "farm") {
    const farm = state.farms[id] ?? { budget: null, records: [] };
    if (method === "GET") return json({ project: detail.project, budget: farm.budget, records: farm.records,
      scanCount: detail.missions.filter((item) => item.status === "ready").length,
      approvedPlan: detail.plans.find((item) => item.status === "approved") ?? null,
      report: farmReport(detail, farm.budget, farm.records) });
    const body = await parse(request);
    if (method === "POST" && body.type === "budget") farm.budget = body.data as FarmBudget;
    else if (method === "POST" && body.type === "record") farm.records.push({ ...(body.data as FarmRecord), id: randomUUID() });
    else if (method === "PATCH") {
      const index = farm.records.findIndex((item) => item.id === body.id);
      if (index < 0) return error("Operation not found.", 404);
      farm.records[index] = { ...(body.data as FarmRecord), id: str(body.id) };
    } else return error("Unsupported farm operation.");
    state.farms[id] = farm; await save(state); return json({ ok: true });
  }
  if (root === "projects" && id && action === "technical-guide" && method === "GET") {
    const query = new URL(request.url).searchParams;
    const format = query.get("format");
    const language = query.get("lang") ?? "en";
    if (format !== "pdf" && format !== "docx") return error("Technical guide format must be pdf or docx.", 400);
    if (language !== "en" && language !== "fr") return error("Technical guide language must be en or fr.", 400);
    const guide = buildLocalTechnicalGuide(detail, state.farms[id], language);
    const blob = await createGXDocumentBlob(guide.title, guide.content, format);
    return new Response(blob, { headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gx-technical-guide-${id}.${format}"`,
      "Content-Language": language,
      "Cache-Control": "no-store",
    } });
  }
  if (root === "projects" && id && action === "export" && method === "GET") return json(detail);
  return error("Local demo route unavailable.", 404);
}
