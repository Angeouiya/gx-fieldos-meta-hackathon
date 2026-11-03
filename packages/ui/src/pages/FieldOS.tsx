import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { imageData } from "../image-data";
import { fieldDirectionsUrl } from "../field-directions";
import { downloadFieldExport } from "../field-download";
import { getFieldPosition } from "../field-position";
import { FieldOSPlan, type FieldOSPlanContent } from "./FieldOSPlan";
import { FieldOSFarm } from "./FieldOSFarm";
import { FieldOSParcelMap } from "./FieldOSParcelMap";
import { boundaryPoints, distanceMeters, geoJsonPoints, parcelArea, type ParcelPoint } from "../parcel-geometry";
import { fieldosFrench } from "./fieldos-fr";
import { scanFolderTitle } from "./fieldos-scan-title";
import { fieldosExpertSummary, fieldosFieldCheckText } from "./fieldos-expert-summary";

type Project = {
  id: string; title: string; description: string; country: string; domain: string;
  role: "owner" | "contributor" | "viewer"; archivedAt: string | null; pinnedAt: string | null;
  areaSqMeters: number | null; areaMethod: string | null; areaAccuracyMeters?: number | null; boundary?: unknown;
  counts?: { missions: number; measurements: number; plans: number };
};
type Mission = {
  id: string; title: string; note: string; scanAspect: string | null; status: string; version: number;
  latitude: number | null; longitude: number | null; locationAccuracyMeters: number | null;
  evidence: { id: string; viewIndex: number }[]; plan: unknown; createdAt?: string;
};
type Plan = { id: string; version: number; status: string; approvedAt?: string | null; content: FieldOSPlanContent & {
  language?: "fr" | "en";
  summary?: string; findings?: string[]; uncertainties?: string[]; nextActions?: string[];
  recommendations?: { title: string; rationale: string; sourceUrls: string[]; sourceStatus: string; checks: string[] }[];
} };
type Detail = {
  project: Project; missions: Mission[]; measurements: { id: string; kind: string; value: { text?: string; number?: number | null; unit?: string }; source: string }[];
  projectTasks: { id: string; title: string; status: string }[]; plans: Plan[];
  members: { userId: string; role: string; user: { name: string; email: string | null } }[];
  artifacts: { id: string; kind: string; title: string; content: { text?: string } | null }[];
};
type Tab = "overview" | "scans" | "decisions" | "tasks" | "campaign";
const signInRequired = "Sign in to AGRIX to continue.";
const signInUrl = `https://agrix.africa/login?next=${encodeURIComponent("https://gx.agrix.africa/#projects")}`;
class FieldServiceError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}

async function fieldJson<T>(path: string, method: "GET" | "POST" | "PATCH" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/field/${path}`, {
    method, cache: "no-store", credentials: "same-origin",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error(signInRequired);
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error : `Field service unavailable (${response.status}).`;
    const code = result && typeof result === "object" && "code" in result && typeof result.code === "string"
      ? result.code : undefined;
    throw new FieldServiceError(message, code);
  }
  return result as T;
}

function list<T>(value: T[] | undefined): T[] { return Array.isArray(value) ? value : []; }
function date(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : ""; }
function projectSubtitle(detail: Detail, translate: (label: string) => string, listedScanCount = 0): string {
  const description = detail.project.description?.trim();
  const scanCount = Math.max(detail.missions.length, detail.project.counts?.missions ?? 0, listedScanCount);
  const oldEmptyPrompt = description === "Add your first field findings to build the follow-up plan."
    || description === "Ajoutez vos premières observations pour construire le plan de suivi.";
  if (description && !(scanCount > 0 && oldEmptyPrompt)) return description;

  const scans = scanCount ? `${scanCount} ${translate(scanCount === 1 ? "scan recorded" : "scans recorded")}` : "";
  const latestPlan = detail.plans[0];
  if (latestPlan) return [scans, `${translate("Plan v")}${latestPlan.version} ${translate(latestPlan.status)}`].filter(Boolean).join(" · ");
  if (scans) return `${scans} · ${translate("Create a plan from these scans.")}`;
  return translate("Add your first field findings to build the follow-up plan.");
}
function scanSummary(value: unknown, english: boolean): { summary: string; viewFindings: { viewIndex: number; observations: string[]; uncertainty: string }[]; actions: { title: string; rationale: string }[]; missingEvidence: string[]; sources: { title: string; url: string }[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("summary" in value) || typeof value.summary !== "string") return null;
  const data = value as Record<string, unknown>;
  const viewFindings = Array.isArray(data.viewFindings) ? data.viewFindings as { viewIndex: number; observations: string[]; uncertainty: string }[] : [];
  const missingEvidence = Array.isArray(data.missingEvidence) ? data.missingEvidence as string[] : [];
  return {
    summary: fieldosExpertSummary(String(data.summary), viewFindings, english, missingEvidence),
    viewFindings,
    actions: Array.isArray(data.actions) ? data.actions as { title: string; rationale: string }[] : [],
    missingEvidence,
    sources: Array.isArray(data.sources) ? data.sources as { title: string; url: string }[] : [],
  };
}
function safeUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; } }

export function FieldOS({ localReplay = false, english = true }: { localReplay?: boolean; english?: boolean }) {
  const t = (en: string) => english ? en : fieldosFrench[en] ?? en;
  const showSavedResult = localReplay || (typeof window !== "undefined" && window.location.hostname === "127.0.0.1");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("Côte d’Ivoire");
  const [domain, setDomain] = useState("agriculture");
  const [scanTitle, setScanTitle] = useState("");
  const [renamingMissionId, setRenamingMissionId] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [scanAspect, setScanAspect] = useState("plant");
  const scanLanguage = english ? "en" : "fr";
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [scanActivity, setScanActivity] = useState<{ missionId: string; phase: "uploading" | "analyzing" } | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [mapScanPoint, setMapScanPoint] = useState<ParcelPoint | null>(null);
  const [pickingScanPoint, setPickingScanPoint] = useState(false);
  const [locating, setLocating] = useState(false);
  const [areaMode, setAreaMode] = useState<"manual" | "map" | "gps" | "import">("manual");
  const [manualHectares, setManualHectares] = useState("");
  const [manualPerimeter, setManualPerimeter] = useState("");
  const [draftPoints, setDraftPoints] = useState<ParcelPoint[]>([]);
  const [parcelPosition, setParcelPosition] = useState<{ longitude: number; latitude: number; accuracy: number } | null>(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [gpsMessage, setGpsMessage] = useState("");
  const [importName, setImportName] = useState("");
  const gpsWatch = useRef<number | null>(null);
  const [measureKind, setMeasureKind] = useState("crop_history");
  const [measureText, setMeasureText] = useState("");
  const [measureSource, setMeasureSource] = useState("entered");
  const [taskTitle, setTaskTitle] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "contributor">("viewer");

  const loadProjects = useCallback(async (preferId?: string) => {
    const data = await fieldJson<{ projects: Project[] }>("projects");
    setProjects(data.projects);
    setSelectedId((current) => {
      const next = preferId || current;
      return data.projects.some((item) => item.id === next) ? next : data.projects[0]?.id ?? "";
    });
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    const data = await fieldJson<Detail>(`projects/${encodeURIComponent(id)}`);
    setDetail(data);
  }, []);

  useEffect(() => { void loadProjects().catch((cause) => setError(cause instanceof Error ? cause.message : "Project unavailable.")); }, [loadProjects]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let alive = true;
    void fieldJson<Detail>(`projects/${encodeURIComponent(selectedId)}`)
      .then((data) => { if (alive) setDetail(data); })
      .catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "Project unavailable."); });
    return () => { alive = false; };
  }, [selectedId]);
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  const run = async (label: string, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(label); setError(""); setNotice("");
    try { await action(); }
    catch (cause) { setError(cause instanceof FieldServiceError && cause.code === "P402"
      ? t("Meta analysis is temporarily blocked by a provider billing issue. Your scan and photos are saved; retry after service access is restored.")
      : cause instanceof Error ? cause.message : "Action failed. Existing data has been preserved."); }
    finally { setBusy(""); }
  };
  const downloadDocument = (action: "technical-guide" | "farm/export", format: "pdf" | "docx" | "xlsx", name: string) => void run("Preparing download", async () => {
    await downloadFieldExport(`/api/field/projects/${encodeURIComponent(selectedId)}/${action}?format=${format}&lang=${english ? "en" : "fr"}`,
      `gx-${name}-${selectedId}.${format}`, english);
    setNotice(t("Download started. Open the file to review it."));
  });
  const refresh = async () => { await loadProjects(); if (selectedId) await loadDetail(selectedId); };
  const active = detail?.project.id === selectedId ? detail : null;
  const canWrite = active?.project.role === "owner" || active?.project.role === "contributor";
  const canOwn = active?.project.role === "owner";
  const mission = active?.missions.find((item) => item.id === selectedMissionId) ?? active?.missions[0] ?? null;
  const activeScanPhase = scanActivity && mission?.id === scanActivity.missionId ? scanActivity.phase : null;
  const latestPlan = active?.plans[0] ?? null;
  const planLanguageMismatch = Boolean(latestPlan && latestPlan.content?.language !== scanLanguage);
  const approvedPlan = active?.plans.find((item) => item.status === "approved"
    || (item.status === "review_needed" && Boolean(item.approvedAt)));
  const businessPlanLanguageMismatch = Boolean(approvedPlan && approvedPlan.content?.language !== scanLanguage);
  const scanViews = active?.missions.reduce((sum, item) => sum + item.evidence.length, 0) ?? 0;
  const analyzedScans = active?.missions.filter((item) => ["ready", "approved", "executed", "closed"].includes(item.status)).length ?? 0;
  const activeProjects = useMemo(() => projects.filter((item) => !item.archivedAt).sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt))), [projects]);
  const outline = useMemo(() => parcelArea(draftPoints), [draftPoints]);
  const savedOutline = useMemo(() => parcelArea(boundaryPoints(active?.project.boundary)), [active?.project.boundary]);
  const parcelBoundaryPoint = useMemo(() => boundaryPoints(active?.project.boundary)[0] ?? null, [active?.project.boundary]);
  const parcelDirections = fieldDirectionsUrl(parcelBoundaryPoint?.[1] ?? null, parcelBoundaryPoint?.[0] ?? null);
  const recordedPerimeter = active?.measurements.find((item) => item.kind === "note" && item.value?.text?.startsWith("Declared parcel perimeter:"));
  const walkGap = draftPoints.length >= 2 ? distanceMeters(draftPoints[0]!, draftPoints.at(-1)!) : 0;

  useEffect(() => {
    if (gpsWatch.current !== null) navigator.geolocation?.clearWatch(gpsWatch.current);
    gpsWatch.current = null; setGpsTracking(false); setDraftPoints([]); setMapScanPoint(null); setPickingScanPoint(false); setPosition(null);
  }, [selectedId]);
  useEffect(() => () => { if (gpsWatch.current !== null) navigator.geolocation?.clearWatch(gpsWatch.current); }, []);

  const createProject = (event: FormEvent) => {
    event.preventDefault();
    void run("Creating project", async () => {
      const created = await fieldJson<{ project: Project }>("projects", "POST", { title: title.trim(), country: country.trim(), domain });
      await loadProjects(created.project.id);
      await loadDetail(created.project.id);
      setTitle(""); setShowCreate(false); setNotice(showSavedResult ? "Project saved." : "Project saved on AGRIX.");
    });
  };
  const saveProject = (change: Record<string, unknown>, success: string) => void run("Updating project", async () => {
    await fieldJson(`projects/${selectedId}`, "PATCH", change); await refresh(); setNotice(success);
  });
  const saveArea = (area: Record<string, unknown>) => void run("Saving parcel boundary", async () => {
    await fieldJson(`projects/${selectedId}`, "PATCH", { area });
    setDraftPoints([]); setImportName(""); await refresh();
    setNotice("Parcel area saved with its measurement method. Check the boundary on site.");
  });
  const saveManualPerimeter = () => void run("Saving declared perimeter", async () => {
    const meters = Number(manualPerimeter);
    if (!Number.isFinite(meters) || meters <= 0 || meters > 1_000_000) throw new Error("Enter a valid perimeter in metres.");
    await fieldJson(`projects/${selectedId}/measurements`, "POST", {
      kind: "note", text: `Declared parcel perimeter: ${meters} m`, number: meters, unit: "m",
      source: "entered", observedAt: new Date().toISOString(),
    });
    await loadDetail(selectedId);
    setNotice(active?.project.areaSqMeters
      ? "Declared perimeter saved separately from the measured boundary. Your parcel area is already recorded."
      : "Declared perimeter saved. Draw, walk, import or enter an area to establish the surface.");
  });
  const stopWalk = () => {
    if (gpsWatch.current !== null) navigator.geolocation?.clearWatch(gpsWatch.current);
    gpsWatch.current = null; setGpsTracking(false);
    setGpsMessage("Walk finished. Check the outline and return to the starting point before saving.");
  };
  const startWalk = () => {
    if (!navigator.geolocation || gpsWatch.current !== null) { if (!navigator.geolocation) setError("GPS unavailable on this device."); return; }
    setError(""); setDraftPoints([]); setGpsAccuracy(0); setGpsTracking(true);
    setGpsMessage("Stand at a boundary corner. Waiting for an accurate GPS fix…");
    gpsWatch.current = navigator.geolocation.watchPosition((result) => {
      const { longitude, latitude, accuracy } = result.coords;
      setParcelPosition({ longitude, latitude, accuracy });
      if (accuracy > 50) { setGpsMessage(`GPS accuracy ${Math.round(accuracy)} m is too low. Wait in an open area.`); return; }
      setGpsAccuracy((current) => Math.max(current, accuracy));
      setDraftPoints((current) => {
        const next: ParcelPoint = [longitude, latitude];
        const last = current.at(-1);
        if (last && distanceMeters(last, next) < Math.max(5, accuracy / 2)) return current;
        return [...current, next].slice(0, 1000);
      });
      setGpsMessage(`Recording boundary · reported accuracy ${Math.round(accuracy)} m`);
    }, (failure) => { stopWalk(); setError(failure.message || "GPS boundary recording stopped."); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 });
  };
  const locateParcel = () => {
    setLocating(true); setError("");
    void getFieldPosition(navigator.geolocation).then(({ position: result }) => {
      setParcelPosition({ longitude: result.longitude, latitude: result.latitude, accuracy: result.accuracy });
      setNotice(`Position shown on map · reported accuracy ${Math.round(result.accuracy)} m.`);
    }).catch((failure) => setError(failure instanceof Error ? failure.message : "Location unavailable."))
      .finally(() => setLocating(false));
  };
  const importOutline = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 100_000) { setError("GeoJSON file exceeds 100 KB."); return; }
    try {
      const parsed = geoJsonPoints(JSON.parse(await file.text()));
      if (!parsed.length) throw new Error("Import one valid Polygon or LineString without crossing edges.");
      setDraftPoints(parsed); setImportName(file.name); setError("");
      setNotice("Outline loaded. Check its location and size on the map before saving.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid GeoJSON file."); }
  };
  const createScan = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    void run("Creating scan", async () => {
      let scanPosition = position;
      if (!mapScanPoint) {
        try {
          const fresh = await getFieldPosition(navigator.geolocation);
          scanPosition = fresh.position;
          setPosition(fresh.position);
          setParcelPosition({ longitude: fresh.position.longitude, latitude: fresh.position.latitude, accuracy: fresh.position.accuracy });
        } catch { scanPosition = null; }
      }
      const data = await fieldJson<{ mission: Mission }>(`projects/${selectedId}/scans`, "POST", {
        title: scanFolderTitle(scanTitle), note: scanNote.trim(), aspect: scanAspect, language: scanLanguage,
        latitude: mapScanPoint?.[1] ?? scanPosition?.latitude ?? null,
        longitude: mapScanPoint?.[0] ?? scanPosition?.longitude ?? null,
        locationAccuracyMeters: mapScanPoint ? null : scanPosition?.accuracy ?? null,
        clientRequestId: crypto.randomUUID(),
      });
      setSelectedMissionId(data.mission.id); setScanTitle(""); setScanNote(""); setMapScanPoint(null);
      await Promise.all([loadDetail(selectedId), loadProjects()]);
      setNotice(data.mission.latitude === null
        ? "Scan saved without location. Add up to four views; enable GPS or place the next point on the map."
        : "Scan point saved on the map. Add up to four views, analyze, then move to another area.");
    });
  };
  const renameScan = (event: FormEvent) => {
    event.preventDefault();
    const current = active?.missions.find((item) => item.id === renamingMissionId);
    if (!current || !selectedId) return;
    const nextTitle = scanFolderTitle(renameTitle);
    if (nextTitle.length < 3) return;
    void run(t("Renaming scan folder"), async () => {
      await fieldJson(`field-missions/${encodeURIComponent(current.id)}`, "PATCH", {
        title: nextTitle, expectedVersion: current.version,
      });
      await loadDetail(selectedId);
      setRenamingMissionId(""); setRenameTitle("");
      setNotice(t("Scan folder renamed."));
    });
  };
  const locate = () => {
    if (locating) return;
    setError(""); setNotice(""); setPosition(null);
    setLocating(true);
    void getFieldPosition(navigator.geolocation)
      .then(({ position: result, approximate }) => {
        setPosition(result);
        setParcelPosition({ longitude: result.longitude, latitude: result.latitude, accuracy: result.accuracy });
        setNotice(approximate ? "Approximate position ready for the next scan. Check the displayed accuracy." : "GPS position ready for the next scan.");
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Location unavailable."))
      .finally(() => setLocating(false));
  };
  const uploadPhotos = (files: FileList | null) => {
    if (!files?.length || !mission || !selectedId || busy) return;
    const chosen = Array.from(files);
    if (mission.evidence.length + chosen.length > 4) { setError("A scan accepts at most four views."); return; }
    const missionId = mission.id;
    setScanActivity({ missionId, phase: "uploading" });
    void run("Uploading views", async () => {
      let current = mission;
      for (const file of chosen) {
        const dataUrl = await imageData(file);
        const blob = await (await fetch(dataUrl)).blob();
        const viewIndex = current.evidence.length + 1;
        const base = `field-missions/${current.id}`;
        const reservation = await fieldJson<{ uploadId: string; uploadUrl: string }>(`${base}/evidence-upload`, "POST", {
          viewIndex, sizeBytes: blob.size, mimeType: "image/jpeg", expectedVersion: current.version,
        });
        const uploaded = await fetch(reservation.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
        if (!uploaded.ok) throw new Error(`La vue ${viewIndex} could not be uploaded. Try again.`);
        const result = await fieldJson<{ mission: Mission }>(`${base}/evidence`, "POST", { uploadId: reservation.uploadId, expectedVersion: current.version });
        current = result.mission;
      }
      await loadDetail(selectedId);
      setNotice(`${chosen.length} view${chosen.length > 1 ? "s" : ""} saved.`);
    }).finally(() => setScanActivity(null));
  };
  const analyze = () => {
    if (!mission || !selectedId || busy) return;
    const missionId = mission.id;
    setScanActivity({ missionId, phase: "analyzing" });
    void run(showSavedResult ? "Loading saved Meta analysis" : "Analyzing views with Meta", async () => {
      await fieldJson(`field-missions/${mission.id}/analyze`, "POST", { expectedVersion: mission.version });
      await loadDetail(selectedId); setNotice(showSavedResult ? "Saved Meta result loaded into the project." : "Meta analysis saved in the project.");
    }).finally(() => setScanActivity(null));
  };
  const addMeasurement = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    void run("Saving observation", async () => {
      await fieldJson(`projects/${selectedId}/measurements`, "POST", {
        kind: measureKind, text: measureText.trim(), source: measureSource, observedAt: new Date().toISOString(),
      });
      setMeasureText(""); await loadDetail(selectedId); setNotice("Observation saved in the project.");
    });
  };
  const makePlan = () => void run("Project plan", async () => {
    await fieldJson(`projects/${selectedId}/plans`, "POST", { language: scanLanguage }); await loadDetail(selectedId);
    setNotice("New proposal created. The owner can approve it.");
  });
  const approvePlan = (planId: string) => void run("Approving plan", async () => {
    await fieldJson(`projects/${selectedId}/plans`, "PATCH", { planId }); await loadDetail(selectedId); setNotice("Plan approved.");
  });
  const addTask = (event: FormEvent) => {
    event.preventDefault();
    void run("Creating task", async () => {
      await fieldJson(`projects/${selectedId}/tasks`, "POST", { title: taskTitle.trim() });
      setTaskTitle(""); await loadDetail(selectedId); setNotice("Task created.");
    });
  };
  const updateTask = (taskId: string, status: string) => void run("Updating task", async () => {
    await fieldJson(`projects/${selectedId}/tasks`, "PATCH", { taskId, status }); await loadDetail(selectedId);
    setNotice("Task updated.");
  });
  const addDocument = (event: FormEvent) => {
    event.preventDefault();
    void run("Saving document", async () => {
      await fieldJson(`projects/${selectedId}/documents`, "POST", { title: documentTitle.trim(), text: documentText.trim() });
      setDocumentTitle(""); setDocumentText(""); await loadDetail(selectedId); setNotice("Document saved.");
    });
  };
  const inviteCollaborator = (event: FormEvent) => {
    event.preventDefault();
    void run("Inviting collaborator", async () => {
      await fieldJson(`projects/${selectedId}/members`, "POST", { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      await loadDetail(selectedId);
      setNotice(t("Invitation accepted by the mail service. The collaborator can access the project."));
    });
  };

  return <section className="gx-fieldos" aria-label={t("GX FieldOS")} data-testid="gx-fieldos">
    <header className="gx-fieldos-header">
      <div><span className="gx-fieldos-kicker">{t("GX FIELDOS · META MODEL API")}</span><h1>{t("From field evidence to decisions.")}</h1><p>{t("Multiview scans, observations, reviewable plans and follow-up in one shared project folder.")}</p></div>
      <div className="gx-fieldos-header-actions"><button type="button" className="gx-fieldos-button secondary" onClick={() => void run("Actualisation", refresh)} disabled={Boolean(busy)}>{t("Refresh")}</button><button type="button" className="gx-fieldos-button" onClick={() => setShowCreate((value) => !value)}>{t("New project")}</button></div>
    </header>
    {busy && <div className="gx-fieldos-progress" role="status"><span className="gx-fieldos-pulse" />{t(busy)} · {elapsed} {t("s")}</div>}
    {error && <div className="gx-fieldos-alert" role="alert">{t(error)}{error === signInRequired && <a href={signInUrl}> {t("Open AGRIX sign-in")}</a>}</div>}
    {notice && <div className="gx-fieldos-notice" role="status">{t(notice)}</div>}
    {showCreate && <form className="gx-fieldos-create" onSubmit={createProject}>
      <label>{t("Project name")}<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("E.g. Northern parcel follow-up")} /></label>
      <label>{t("Country")}<input required maxLength={100} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
      <label>{t("Domain")}<select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="agriculture">{t("Agriculture")}</option><option value="aquaculture">{t("Aquaculture")}</option><option value="livestock">{t("Livestock")}</option><option value="gastronomy">{t("Gastronomy")}</option><option value="food_processing">{t("Food processing")}</option><option value="other">{t("Other")}</option></select></label>
      <button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Create project")}</button>
    </form>}
    <div className="gx-fieldos-layout">
      <aside className="gx-fieldos-projects" aria-label={t("Field projects")}>
        <div className="gx-fieldos-panel-heading"><h2>{t("Projects")}</h2><span>{activeProjects.length}</span></div>
        {activeProjects.length ? activeProjects.map((project) => <button type="button" key={project.id} className={`gx-fieldos-project ${selectedId === project.id ? "active" : ""}`} onClick={() => { setSelectedId(project.id); setTab("overview"); setSelectedMissionId(""); }}>
          <strong>{project.pinnedAt ? "◆ " : ""}{project.title}</strong><small>{project.country} · {project.counts?.missions ?? 0} {t("scan(s)")}</small>
        </button>) : <p className="gx-fieldos-empty">{t("Create a project to bring your observations together.")}</p>}
        {projects.some((item) => item.archivedAt) && <details className="gx-fieldos-archived"><summary>{t("Archived projects (")}{projects.filter((item) => item.archivedAt).length})</summary>{projects.filter((item) => item.archivedAt).map((project) => <button type="button" key={project.id} onClick={() => setSelectedId(project.id)}>{project.title}</button>)}</details>}
      </aside>
      <div className="gx-fieldos-main">
        {!active ? <div className="gx-fieldos-welcome"><h2>{selectedId ? t("Loading project…") : t("Your first field project")}</h2><p>{t("Create a project, add one to four photos per inspection, then request a Meta analysis and follow-up plan.")}</p></div> : <>
          <div className="gx-fieldos-project-head"><div><span className="gx-fieldos-kicker">{t(active.project.domain)} · {active.project.country}</span><h2>{active.project.title}</h2><p>{projectSubtitle(active, t, projects.find((item) => item.id === active.project.id)?.counts?.missions)}</p></div><div className="gx-fieldos-project-actions">{!showSavedResult && <a href={`https://agrix.africa/gx/projects?id=${encodeURIComponent(selectedId)}&lang=${english ? "en" : "fr"}`} target="_blank" rel="noopener noreferrer" className="gx-fieldos-button secondary">{t("Map and full project workspace ↗")}</a>}{canOwn && <button type="button" className="gx-fieldos-button ghost" onClick={() => saveProject({ pinned: !active.project.pinnedAt }, active.project.pinnedAt ? t("Project unpinned.") : t("Project pinned."))}>{active.project.pinnedAt ? t("Unpin") : t("Pin")}</button>}{canOwn && <button type="button" className="gx-fieldos-button ghost" onClick={() => saveProject({ archived: !active.project.archivedAt }, active.project.archivedAt ? t("Project restored.") : t("Project archived."))}>{active.project.archivedAt ? t("Restore") : t("Archive")}</button>}</div></div>
          <nav className="gx-fieldos-tabs" aria-label={t("Project sections")}>{(["overview", "scans", "decisions", "tasks", "campaign"] as const).map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ overview: t("1 · Parcel"), scans: t("2 · Scans"), decisions: t("3 · Decisions"), tasks: t("4 · Follow-up"), campaign: t("5 · Budget and files") } as const)[item]}</button>)}</nav>
          {tab === "overview" && <div className="gx-fieldos-stack">
            <div className="gx-fieldos-card gx-fieldos-parcel"><div className="gx-fieldos-panel-heading"><div><h3>{t("Locate and outline your parcel")}</h3><p>{t("Start here. Enter a known measurement, draw the boundary or walk around it with GPS. The map also shows every scan location.")}</p></div><button type="button" className="gx-fieldos-button secondary" onClick={() => setTab("scans")}>{t("Next: scans →")}</button></div>
              <div className="gx-fieldos-parcel-summary"><strong>{active.project.areaSqMeters ? `${(active.project.areaSqMeters / 10_000).toFixed(3)} ha` : t("Area unknown")}</strong><span>{savedOutline ? `≈ ${Math.round(savedOutline.perimeterMeters)} m ${t("perimeter")} · ${t(active.project.areaMethod ?? "")}` : recordedPerimeter ? `${recordedPerimeter.value.text} ${t("· entered")}` : t("Draw, walk or import a boundary to calculate perimeter and area.")}</span>{savedOutline && recordedPerimeter ? <small>{recordedPerimeter.value.text} {t("· entered separately")}</small> : null}{active.project.areaAccuracyMeters ? <small>{t("Reported GPS accuracy:")} {Math.round(active.project.areaAccuracyMeters)} {t("m")}</small> : null}</div>
              {parcelDirections && <p className="gx-fieldos-parcel-route"><a href={parcelDirections} target="_blank" rel="noopener noreferrer">{t("Directions to recorded boundary point ↗")}</a><small>{t("Confirm the actual entrance and right of access on site.")}</small></p>}
              <div className="gx-fieldos-area-modes" role="group" aria-label={t("How to outline the parcel")}>{(["manual", "map", "gps", "import"] as const).map((mode) => <button type="button" key={mode} aria-pressed={areaMode === mode} onClick={() => { stopWalk(); setAreaMode(mode); setDraftPoints([]); setImportName(""); setGpsMessage(""); }}>{({ manual: t("Enter measurements"), map: t("Draw on map"), gps: t("Walk with GPS"), import: t("Import GeoJSON") } as const)[mode]}</button>)}</div>
              {areaMode === "manual" && <div className="gx-fieldos-manual-area"><label>{t("Known area, hectares")}<input type="number" min="0.0001" max="100000" step="any" inputMode="decimal" value={manualHectares} onChange={(event) => setManualHectares(event.target.value)} placeholder={t("E.g. 2.5")} /></label><button type="button" className="gx-fieldos-button" disabled={!canWrite || Boolean(busy) || !(Number(manualHectares) >= .0001 && Number(manualHectares) <= 100000)} onClick={() => saveArea({ method: "manual", areaSqMeters: Number(manualHectares) * 10_000 })}>{t("Save area")}</button><label>{t("Known perimeter, metres")}<input type="number" min="1" max="1000000" step="any" inputMode="decimal" value={manualPerimeter} onChange={(event) => setManualPerimeter(event.target.value)} placeholder={t("E.g. 640")} /></label><button type="button" className="gx-fieldos-button secondary" disabled={!canWrite || Boolean(busy) || !(Number(manualPerimeter) > 0 && Number(manualPerimeter) <= 1000000)} onClick={saveManualPerimeter}>{t("Save perimeter")}</button><p>{t("A perimeter length alone cannot establish an area. Manually entered values are marked as declared, not GPS measured.")}</p></div>}
              {areaMode === "map" && <div className="gx-fieldos-area-controls"><p>{t("Zoom to your parcel, tap each corner in order, then check the automatically closed outline.")}</p><span>{draftPoints.length} {t("points")}{outline ? ` · ≈ ${(outline.areaSqMeters / 10_000).toFixed(3)} ha · ≈ ${Math.round(outline.perimeterMeters)} m ${t("perimeter")}` : ""}</span><button type="button" className="gx-fieldos-button secondary" disabled={!draftPoints.length} onClick={() => setDraftPoints((current) => current.slice(0, -1))}>{t("Undo point")}</button><button type="button" className="gx-fieldos-button secondary" disabled={!draftPoints.length} onClick={() => setDraftPoints([])}>{t("Clear")}</button><button type="button" className="gx-fieldos-button" disabled={!canWrite || !outline || Boolean(busy)} onClick={() => saveArea({ method: "map", coordinates: draftPoints })}>{t("Save boundary")}</button></div>}
              {areaMode === "gps" && <div className="gx-fieldos-area-controls"><p>{t("Stand at the first corner, start recording, walk the entire boundary, and finish near the starting point. Check the outline before saving.")}</p><button type="button" className="gx-fieldos-button secondary" disabled={!canWrite || gpsTracking} onClick={startWalk}>{t("Start at this point")}</button><button type="button" className="gx-fieldos-button secondary" disabled={!gpsTracking} onClick={stopWalk}>{t("Finish walking")}</button><span>{draftPoints.length} {t("GPS points")}{outline ? ` · ≈ ${(outline.areaSqMeters / 10_000).toFixed(3)} ha · ≈ ${Math.round(outline.perimeterMeters)} m ${t("perimeter")}` : ""}{draftPoints.length >= 3 ? ` · start/end gap ${Math.round(walkGap)} m` : ""}</span>{gpsMessage && <small role="status">{gpsMessage}</small>}{draftPoints.length >= 3 && walkGap > Math.max(50, gpsAccuracy * 2) && <small role="alert">{t("Return closer to the starting point before saving.")}</small>}<button type="button" className="gx-fieldos-button" disabled={!canWrite || gpsTracking || !outline || gpsAccuracy <= 0 || walkGap > Math.max(50, gpsAccuracy * 2) || Boolean(busy)} onClick={() => saveArea({ method: "gps", coordinates: draftPoints, accuracyMeters: gpsAccuracy })}>{t("Save GPS boundary")}</button></div>}
              {areaMode === "import" && <div className="gx-fieldos-area-controls"><p>{t("Import one Polygon or LineString GeoJSON file (100 KB maximum), then check its location on the map.")}</p><input type="file" accept=".geojson,.json,application/geo+json,application/json" aria-label={t("Import a GeoJSON boundary")} onChange={(event) => { void importOutline(event.target.files?.[0]); event.target.value = ""; }} /><span>{importName || t("No file selected")}{outline ? ` · ≈ ${(outline.areaSqMeters / 10_000).toFixed(3)} ha · ≈ ${Math.round(outline.perimeterMeters)} m ${t("perimeter")}` : ""}</span><button type="button" className="gx-fieldos-button" disabled={!canWrite || !outline || Boolean(busy)} onClick={() => saveArea({ method: "import", coordinates: draftPoints })}>{t("Save imported boundary")}</button></div>}
              {draftPoints.length >= 3 && !outline && <p role="alert" className="gx-fieldos-uncertainty">{t("Invalid outline: check crossing edges and point order.")}</p>}
              <button type="button" className="gx-fieldos-button secondary" onClick={locateParcel} disabled={locating}>{locating ? t("Locating…") : t("Show my location")}</button>
              <FieldOSParcelMap english={english} projectId={selectedId} boundary={active.project.boundary} draftPoints={draftPoints} drawing={areaMode === "map" && Boolean(canWrite)} pickingScan={false} position={parcelPosition} inspections={active.missions} onAddPoint={(point) => setDraftPoints((current) => [...current, point].slice(0, 1000))} onPickScan={() => undefined} onSelectInspection={(id) => { setSelectedMissionId(id); setTab("scans"); }} />
              <p className="gx-fieldos-parcel-footnote">{t("Map and GPS measurements are estimates. Confirm legal boundaries and critical decisions on site. Image content alone does not measure area.")}</p>
            </div>
            <details className="gx-fieldos-more"><summary>{t("More project details: observations and documents")}</summary>
            <div className="gx-fieldos-metrics"><div><strong>{active.missions.length}</strong><span>{t("inspections")}</span></div><div><strong>{active.measurements.length}</strong><span>{t("observations")}</span></div><div><strong>{active.projectTasks.length}</strong><span>{t("tasks")}</span></div><div><strong>{active.project.areaSqMeters ? `${(active.project.areaSqMeters / 10000).toFixed(2)} ha` : "—"}</strong><span>{t("area")} {active.project.areaMethod ? `· ${active.project.areaMethod}` : "not measured"}</span></div></div>
            <div className="gx-fieldos-card"><h3>{t("Field observations")}</h3><p>{t("Keep crop history, water, soil and field findings together. Mark whether each item was measured or entered.")}</p>{canWrite && <form className="gx-fieldos-inline-form" onSubmit={addMeasurement}><select aria-label={t("Observation type")} value={measureKind} onChange={(event) => setMeasureKind(event.target.value)}><option value="crop_history">{t("Previous crop")}</option><option value="crop">{t("Current crop")}</option><option value="soil">{t("Soil")}</option><option value="water">{t("Water")}</option><option value="weather">{t("Weather")}</option><option value="animal">{t("Livestock")}</option><option value="yield">{t("Yield")}</option><option value="note">{t("Other")}</option></select><input required maxLength={3000} aria-label={t("Observation")} value={measureText} onChange={(event) => setMeasureText(event.target.value)} placeholder={t("E.g. Maize grown in 2025; limited irrigation")} /><select aria-label={t("Source")} value={measureSource} onChange={(event) => setMeasureSource(event.target.value)}><option value="entered">{t("Entered")}</option><option value="measured">{t("Measured")}</option><option value="inferred">{t("Assumed")}</option></select><button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Add")}</button></form>}{active.measurements.length ? <ul className="gx-fieldos-list">{active.measurements.map((item) => <li key={item.id}><strong>{t(item.kind)}</strong><span>{item.value?.text ?? ""}</span><small>{t(item.source)}</small></li>)}</ul> : <p className="gx-fieldos-empty">{t("No observations yet.")}</p>}</div>
            <div className="gx-fieldos-card"><h3>{t("Project documents")}</h3>{canWrite && <form className="gx-fieldos-document-form" onSubmit={addDocument}><input required maxLength={160} aria-label={t("Document title")} value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder={t("Document title")} /><textarea required maxLength={12000} aria-label={t("Document content")} value={documentText} onChange={(event) => setDocumentText(event.target.value)} placeholder={t("Findings, decisions or field report…")} /><button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Save document")}</button></form>}{active.artifacts.filter((item) => item.kind === "document").length ? <ul className="gx-fieldos-list">{active.artifacts.filter((item) => item.kind === "document").map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.content?.text?.slice(0, 160) ?? ""}</span></li>)}</ul> : null}<a className="gx-fieldos-text-link" href={`/api/field/projects/${encodeURIComponent(selectedId)}/export`}>{t("Export project")}</a></div>
            </details>
          </div>}
          {tab === "scans" && <div className="gx-fieldos-stack gx-fieldos-scan-step"><div className="gx-fieldos-card"><div className="gx-fieldos-panel-heading"><div><h3>{t("Scan locations")}</h3><p>{t("Move between zones. GX requests a fresh GPS position when each scan is saved; its numbered point then appears here.")}</p></div><button type="button" className="gx-fieldos-button secondary" onClick={() => setTab("overview")}>{t("Parcel setup")}</button></div><button type="button" className="gx-fieldos-button secondary" aria-pressed={pickingScanPoint} onClick={() => setPickingScanPoint((value) => !value)}>{pickingScanPoint ? t("Cancel map point") : t("Place a point manually")}</button>{pickingScanPoint && <p className="gx-fieldos-gps">{t("Tap the scan location on the map. This is a manually placed point, not a GPS measurement.")}</p>}{mapScanPoint && <p className="gx-fieldos-gps">{t("Manual point selected:")} {mapScanPoint[1].toFixed(5)}, {mapScanPoint[0].toFixed(5)}</p>}<FieldOSParcelMap english={english} compact projectId={selectedId} boundary={active.project.boundary} draftPoints={[]} drawing={false} pickingScan={pickingScanPoint} position={parcelPosition} inspections={active.missions} onAddPoint={() => undefined} onPickScan={(point) => { setMapScanPoint(point); setPickingScanPoint(false); }} onSelectInspection={(id) => setSelectedMissionId(id)} /></div><div className="gx-fieldos-card" id="gx-fieldos-new-scan"><h3>{t("Add a scan to the project")}</h3><p>{t("Repeat scans across the parcel as needed. Each scan holds up to four views of one subject: soil, plant, water or crop. Save and analyze it, then move to another area.")}</p><p className="gx-fieldos-scan-progress">{active.missions.length} {t("scan(s) ·")} {scanViews} {t("view(s) ·")} {analyzedScans} {t("analyzed")}</p>{canWrite && <form className="gx-fieldos-scan-form" onSubmit={createScan}><input required maxLength={160} aria-label={t("Scan name")} value={scanTitle} onChange={(event) => setScanTitle(event.target.value)} placeholder={t("E.g. Northern beds · leaf inspection")} /><select aria-label={t("Scan subject")} value={scanAspect} onChange={(event) => setScanAspect(event.target.value)}><option value="plant">{t("Plants")}</option><option value="soil">{t("Soil")}</option><option value="crop">{t("Crop")}</option><option value="water">{t("Water")}</option><option value="parcel">{t("Parcel")}</option><option value="animal">{t("Animal")}</option><option value="food">{t("Food")}</option><option value="other">{t("Other")}</option></select><textarea maxLength={12000} aria-label={t("Scan context")} value={scanNote} onChange={(event) => setScanNote(event.target.value)} placeholder={t("History, visible symptoms, question to investigate…")} /><div className="gx-fieldos-form-actions"><button type="button" className="gx-fieldos-button secondary" onClick={locate} disabled={locating}>{locating ? t("Locating…") : t("Check GPS now")}</button>{position && <span className="gx-fieldos-gps">{t("Last fix · accuracy")} {Math.round(position.accuracy)} {t("m. GX will request a fresh position on save.")}</span>}<button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Save this scan")}</button></div></form>}</div>
            <div className="gx-fieldos-scan-layout"><div className="gx-fieldos-card"><h3>{t("Scan folder ·")} {active.missions.length}</h3>{active.missions.length ? <div className="gx-fieldos-mission-list">{active.missions.map((item) => { const directions = fieldDirectionsUrl(item.latitude, item.longitude); return <div className="gx-fieldos-mission-entry" key={item.id}><button type="button" className={mission?.id === item.id ? "active" : ""} onClick={() => setSelectedMissionId(item.id)}><strong>{item.title}</strong><small>{t(item.scanAspect ?? "Scan")} · {item.evidence.length} {t("view(s) ·")} {t(item.status)} {date(item.createdAt)}</small></button>{directions && <div className="gx-fieldos-mission-directions"><span>{item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)} · {item.locationAccuracyMeters === null ? t("accuracy unknown or manually placed") : `± ${Math.round(item.locationAccuracyMeters)} m`}</span><a href={directions} target="_blank" rel="noopener noreferrer" aria-label={`${t("Directions to")} ${item.title}`}>{t("Start directions ↗")}</a></div>}</div>; })}</div> : <p className="gx-fieldos-empty">{t("No scans yet. Save a first subject to start the project.")}</p>}</div>
              {mission && <div className="gx-fieldos-card"><div className="gx-fieldos-panel-heading"><h3>{mission.title}</h3>{canWrite && mission.status !== "analyzing" && <button type="button" className="gx-fieldos-button ghost" disabled={Boolean(busy)} onClick={() => { setRenamingMissionId(mission.id); setRenameTitle(mission.title); }}>{t("Rename folder")}</button>}<span>{t(mission.status)}</span></div>{renamingMissionId === mission.id && <form className="gx-fieldos-rename-form" onSubmit={renameScan}><input required minLength={3} maxLength={160} aria-label={t("Scan folder name")} value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} /><button className="gx-fieldos-button" disabled={Boolean(busy) || scanFolderTitle(renameTitle).length < 3}>{t("Save name")}</button><button type="button" className="gx-fieldos-button secondary" onClick={() => { setRenamingMissionId(""); setRenameTitle(""); }}>{t("Cancel")}</button></form>}<p>{mission.note || t("No additional context.")}</p><div className="gx-fieldos-views">{[1, 2, 3, 4].map((index) => { const evidence = mission.evidence.find((item) => item.viewIndex === index); return <div className={`gx-fieldos-view${activeScanPhase === "analyzing" ? " is-analyzing" : activeScanPhase === "uploading" ? " is-uploading" : ""}`} key={index}>{evidence ? <img src={`/api/field/field-missions/${mission.id}/evidence/${evidence.id}`} alt={`View ${index} of scan ${mission.title}`} /> : <span>{t("View")} {index}<br />{t("to add")}</span>}</div>; })}</div>{activeScanPhase && <p className="gx-fieldos-scan-activity" role="status" aria-live="polite"><span className="gx-fieldos-scan-activity-icon" aria-hidden="true" />{activeScanPhase === "analyzing" ? t("GX is examining the views with Meta") : t("Saving the selected views")} · {elapsed} {t("s")}</p>}{canWrite && ["draft", "analysis_failed"].includes(mission.status) && <div className="gx-fieldos-upload"><label className="gx-fieldos-file-label" htmlFor="gx-fieldos-upload-views">{t("Add views (up to four)")}</label><input id="gx-fieldos-upload-views" type="file" accept="image/jpeg,image/png,image/webp" multiple className="gx-fieldos-file-input" onChange={(event) => { uploadPhotos(event.target.files); event.target.value = ""; }} /><button type="button" className="gx-fieldos-button" disabled={Boolean(busy) || !mission.evidence.length} onClick={analyze}>{showSavedResult ? t("Load saved Meta result") : t("Analyze with Meta")}</button></div>}{mission.latitude !== null && <p className="gx-fieldos-gps">{t("GPS point saved · accuracy")} {mission.locationAccuracyMeters !== null ? `${Math.round(mission.locationAccuracyMeters)} m` : t("unknown")}</p>}{scanSummary(mission.plan, english) && <div className="gx-fieldos-scan-result"><h4>{t("Meta analysis")}</h4><p>{scanSummary(mission.plan, english)?.summary}</p><h4>{t("Findings by view")}</h4>{scanSummary(mission.plan, english)?.viewFindings.map((view) => <div key={view.viewIndex}><strong>{t("View")} {view.viewIndex}</strong><ul>{list(view.observations).map((finding, index) => <li key={index}>{finding}</li>)}</ul>{view.uncertainty && fieldosFieldCheckText(view.uncertainty) && <small>{t("Field check:")} {fieldosFieldCheckText(view.uncertainty)}</small>}</div>)}{Boolean(scanSummary(mission.plan, english)?.missingEvidence.length) && <p>{t("Field checks:")} {scanSummary(mission.plan, english)?.missingEvidence.join(" ; ")}</p>}{Boolean(scanSummary(mission.plan, english)?.actions.length) && <><h4>{t("Proposed actions")}</h4><ul>{scanSummary(mission.plan, english)?.actions.map((action, index) => <li key={index}><strong>{action.title}</strong> — {action.rationale}</li>)}</ul></>}{Boolean(scanSummary(mission.plan, english)?.sources.length) && <><h4>{t("Sources")}</h4><ul>{scanSummary(mission.plan, english)?.sources.map((source, index) => { const href = safeUrl(source.url); return href ? <li key={index}><a href={href} target="_blank" rel="noopener noreferrer">{source.title || href}</a></li> : null; })}</ul></>}</div>}</div>}
            </div></div>}
          {tab === "decisions" && <div className="gx-fieldos-card gx-fieldos-guide-card">
            <h3>{t("Technical implementation guide")}</h3>
            <p>{t("GX assembles the latest AI analysis, scan coordinates, field observations, technical stages, tasks and missing checks. The owner must approve the plan and verify local conditions before execution.")}</p>
            {latestPlan?.status === "draft" && <p className="gx-fieldos-plan-status">{t("Version")} {latestPlan.version} · {t("draft")}</p>}
            {latestPlan && planLanguageMismatch && <p className="gx-fieldos-uncertainty" role="status">{english ? "This plan was saved in French or without a recorded language. Create a new plan in English before exporting its technical guide." : "Ce plan a été enregistré en anglais ou sans langue connue. Créez une nouvelle synthèse en français avant d’exporter son guide technique."}</p>}
            {businessPlanLanguageMismatch && <p className="gx-fieldos-uncertainty" role="status">{english ? "Approve a plan in English before exporting its business plan." : "Validez un plan en français avant d’exporter son business plan."}</p>}
            {latestPlan ? planLanguageMismatch ? null : <div className="gx-fieldos-deliverables">
              <button className="gx-fieldos-button secondary" type="button" disabled={Boolean(busy)} onClick={() => downloadDocument("technical-guide", "pdf", "technical-guide")}>{t("Download technical PDF")}</button>
              <button className="gx-fieldos-button secondary" type="button" disabled={Boolean(busy)} onClick={() => downloadDocument("technical-guide", "docx", "technical-guide")}>{t("Download technical DOCX")}</button>
              {!showSavedResult && <>
                <button className="gx-fieldos-button secondary" type="button" disabled={Boolean(busy) || !approvedPlan || businessPlanLanguageMismatch} onClick={() => downloadDocument("farm/export", "docx", "business-plan")}>{t("Download business plan")}</button>
                <button className="gx-fieldos-button secondary" type="button" disabled={Boolean(busy)} onClick={() => downloadDocument("farm/export", "xlsx", "tracking-workbook")}>{t("Download tracking workbook")}</button>
              </>}
            </div> : <p className="gx-fieldos-empty">{t("Generate a project plan first to prepare the technical guide.")}</p>}
          </div>}
          {tab === "decisions" && <div className="gx-fieldos-stack"><div className="gx-fieldos-card"><div className="gx-fieldos-panel-heading"><div><h3>{t("Decision plan")}</h3><p>{t("GX combines scans and observations. New evidence calls for a fresh review.")}</p></div>{canWrite && <button type="button" className="gx-fieldos-button" disabled={Boolean(busy)} onClick={makePlan}>{t("Create a plan")}</button>}</div>{latestPlan ? <><div className="gx-fieldos-plan-status">{t("Version")} {latestPlan.version} · {t(latestPlan.status)}</div><p className="gx-fieldos-plan-summary">{latestPlan.content?.summary}</p><div className="gx-fieldos-two-columns"><div><h4>{t("Findings")}</h4><ul>{list(latestPlan.content?.findings).map((item, index) => <li key={index}>{item}</li>)}</ul></div><details><summary>{t("Field checks")}</summary><ul>{list(latestPlan.content?.uncertainties).map((item, index) => <li key={index}>{item}</li>)}</ul></details></div><h4>{t("Recommendations")}</h4>{list(latestPlan.content?.recommendations).map((item, index) => <div className="gx-fieldos-recommendation" key={index}><strong>{item.title}</strong><p>{item.rationale}</p><small>{item.sourceStatus === "not_locally_verified" ? t("Local source unverified") : t("Cited source · field check required")}</small>{item.checks?.length ? <p>{t("Check:")} {item.checks.join(" ; ")}</p> : null}</div>)}<h4>{t("Next actions")}</h4><ol>{list(latestPlan.content?.nextActions).map((item, index) => <li key={index}>{item}</li>)}</ol><FieldOSPlan content={latestPlan.content ?? {}} scans={active.missions} english={english} />{canOwn && latestPlan.status === "draft" && <button type="button" className="gx-fieldos-button" disabled={Boolean(busy)} onClick={() => approvePlan(latestPlan.id)}>{t("Approve this version")}</button>}</> : <p className="gx-fieldos-empty">{t("Add field evidence, then create a plan.")}</p>}</div>{active.plans.length > 1 && <div className="gx-fieldos-card"><h3>{t("History")}</h3><ul className="gx-fieldos-list">{active.plans.slice(1).map((item) => <li key={item.id}>{t("Version")} {item.version} · {t(item.status)}</li>)}</ul></div>}</div>}
{tab === "tasks" && <div className="gx-fieldos-stack"><div className="gx-fieldos-card"><h3>{t("Follow-up tasks")}</h3>{canWrite && <form className="gx-fieldos-inline-form" onSubmit={addTask}><input required maxLength={160} aria-label={t("New task")} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("E.g. Check soil moisture in seven days")} /><button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Add task")}</button></form>}{active.projectTasks.length ? <ul className="gx-fieldos-tasks">{active.projectTasks.map((item) => <li key={item.id}><span><strong>{item.title}</strong><small>{item.status === "done" ? t("Done") : item.status === "in_progress" ? t("In progress") : t("To do")}</small></span>{canWrite && <select aria-label={`Status of ${item.title}`} value={item.status} onChange={(event) => updateTask(item.id, event.target.value)} disabled={Boolean(busy)}><option value="pending">{t("To do")}</option><option value="in_progress">{t("In progress")}</option><option value="done">{t("Done")}</option></select>}</li>)}</ul> : <p className="gx-fieldos-empty">{t("No tasks yet.")}</p>}</div><div className="gx-fieldos-card"><h3>{t("Collaborators")}</h3><p>{t("Viewers can inspect the parcel, scan points and technical guide. Contributors can also add evidence and tasks.")}</p>{canOwn && !showSavedResult && <form className="gx-fieldos-inline-form" onSubmit={inviteCollaborator}><input required type="email" maxLength={254} aria-label={t("Collaborator email")} placeholder={t("Collaborator AGRIX email")} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /><select aria-label={t("Collaborator role")} value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "viewer" | "contributor")}><option value="viewer">{t("View only")}</option><option value="contributor">{t("Contribute")}</option></select><button className="gx-fieldos-button" disabled={Boolean(busy)}>{t("Add collaborator")}</button></form>}<p className="gx-fieldos-help">{t("Invite an active AGRIX account by email. The mail service accepts the notice, but inbox delivery cannot be guaranteed.")}</p><ul className="gx-fieldos-list">{active.members.map((member) => <li key={member.userId}><strong>{member.user.name}</strong><small>{member.user.email} · {t(member.role)}</small></li>)}</ul><a className="gx-fieldos-text-link" href={`https://agrix.africa/gx/projects?id=${encodeURIComponent(selectedId)}&lang=${english ? "en" : "fr"}`} target="_blank" rel="noopener noreferrer">{t("Manage access ↗")}</a></div></div>}
          {tab === "campaign" && <FieldOSFarm key={selectedId} projectId={selectedId} role={active.project.role} english={english} localReplay={localReplay} onReviewPlan={() => setTab("decisions")} />}
        </>}
      </div>
    </div>
  </section>;
}
