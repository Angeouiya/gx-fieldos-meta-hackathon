import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { FieldOS } from "./FieldOS";

vi.mock("./FieldOSParcelMap", () => ({ FieldOSParcelMap: () => <div data-testid="parcel-map" /> }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("a project with recorded scans never displays the empty-project prompt", async () => {
  const project = { id: "project-1", title: "Abidjan field", description: "Add your first field findings to build the follow-up plan.", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  vi.stubGlobal("fetch", vi.fn(async (path: string) => ({ ok: true,
    json: async () => path === "/api/field/projects"
      ? { projects: [{ ...project, counts: { missions: 5, measurements: 0, plans: 0 } }] }
      : { project, missions: [], measurements: [], projectTasks: [], plans: [], members: [], artifacts: [] },
  })));
  render(<FieldOS />);
  expect(await screen.findByText("5 scans recorded · Create a plan from these scans.")).toBeVisible();
  expect(screen.queryByText("Add your first field findings to build the follow-up plan.")).not.toBeInTheDocument();
});

test("saved scans lead with per-view evidence and show field checks without an uncertainty panel", async () => {
  const project = { id: "project-1", title: "Field dossier", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const mission = { id: "scan-1", title: "North plants", note: "", scanAspect: "plant", status: "ready", version: 1,
    latitude: null, longitude: null, locationAccuracyMeters: null, evidence: [],
    plan: { summary: "The photos may not show the same subject clearly. Only separate visible findings can be used until the views are checked.",
      viewFindings: [{ viewIndex: 1, observations: ["Yellow leaf margins"], uncertainty: "Uncertainty: Check the leaf underside" }],
      missingEvidence: ["Inspect the underside"], actions: [], sources: [] } };
  vi.stubGlobal("fetch", vi.fn(async (path: string) => ({ ok: true,
    json: async () => path === "/api/field/projects" ? { projects: [project] }
      : { project, missions: [mission], measurements: [], projectTasks: [], plans: [], members: [], artifacts: [] },
  })));
  const user = userEvent.setup();
  const { rerender } = render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: /Scans/ }));
  expect(await screen.findByText(/View 1: Yellow leaf margins/)).toBeVisible();
  expect(screen.getByText(/Field checks: Inspect the underside/)).toBeVisible();
  expect(screen.getByText("Field check: Check the leaf underside")).toBeVisible();
  expect(screen.queryByText(/Field check: Uncertainty:/)).not.toBeInTheDocument();
  expect(screen.queryByText(/The photos may not show/)).not.toBeInTheDocument();
  rerender(<FieldOS english={false} />);
  expect(screen.getByText("Contrôle terrain : Check the leaf underside")).toBeVisible();
});

test("GX-FIELD-MULTISCAN-002: adding a scan updates both the dossier and project list", async () => {
  const project = { id: "project-1", title: "Parcelle test", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const missions = [{ id: "scan-1", title: "Zone nord", note: "", scanAspect: "plant", status: "ready", version: 1, latitude: null, longitude: null, locationAccuracyMeters: null, evidence: [{ id: "view-1", viewIndex: 1 }], plan: null }];
  const json = (value: unknown) => ({ ok: true, json: async () => value });
  let languageSent = "";
  vi.stubGlobal("fetch", vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/field/projects" && (!options || options.method === "GET")) return json({ projects: [{ ...project, counts: { missions: missions.length, measurements: 0, plans: 0 } }] });
    if (path === "/api/field/projects/project-1" && (!options || options.method === "GET")) return json({ project, missions: [...missions], measurements: [], projectTasks: [], plans: [], members: [], artifacts: [] });
    if (path === "/api/field/projects/project-1/scans" && options?.method === "POST") {
      const input = JSON.parse(String(options.body));
      languageSent = input.language;
      const mission = { id: `scan-${missions.length + 1}`, title: input.title, note: input.note, scanAspect: input.aspect, status: "draft", version: 1, latitude: null, longitude: null, locationAccuracyMeters: null, evidence: [], plan: null };
      missions.unshift(mission);
      return json({ mission });
    }
    throw new Error(`Unexpected request: ${path}`);
  }));
  const user = userEvent.setup();
  const { rerender } = render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: /Scans/ }, { timeout: 10_000 }));
  await user.type(screen.getByRole("textbox", { name: "Scan name" }), "Southern — area");
  await user.click(screen.getByRole("button", { name: "Save this scan" }));
  expect(await screen.findByRole("heading", { name: "Scan folder · 2" })).toBeVisible();
  expect(await screen.findByRole("button", { name: /Parcelle test.*2 scan\(s\)/ })).toBeVisible();
  expect(screen.getByText("2 scans recorded · Create a plan from these scans.")).toBeVisible();
  expect(screen.getByText(/2 scan\(s\) · 1 view\(s\) · 1 analyzed/)).toBeVisible();
  expect(languageSent).toBe("en");
  expect(missions.at(0)?.title).toBe("Southern - area");
  expect(screen.queryByRole("combobox", { name: "Analysis language" })).not.toBeInTheDocument();
  rerender(<FieldOS english={false} />);
  await user.type(screen.getByRole("textbox", { name: "Nom du scan" }), "Zone ouest");
  await user.click(screen.getByRole("button", { name: "Enregistrer ce scan" }));
  expect(languageSent).toBe("fr");
});

test("an analyzed scan folder can be renamed without dropping its saved views and result", async () => {
  const project = { id: "project-1", title: "Field dossier", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const mission = { id: "scan-1", title: "01 — Site overview | four perspectives", note: "Saved context", scanAspect: "parcel", status: "ready", version: 3,
    latitude: null, longitude: null, locationAccuracyMeters: null, evidence: [{ id: "view-1", viewIndex: 1 }],
    plan: { summary: "Saved analysis", viewFindings: [], missingEvidence: [], actions: [], sources: [] } };
  let submitted: unknown;
  vi.stubGlobal("fetch", vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/field/projects") return { ok: true, json: async () => ({ projects: [project] }) };
    if (path === "/api/field/projects/project-1") return { ok: true, json: async () => ({ project, missions: [mission], measurements: [], projectTasks: [], plans: [], members: [], artifacts: [] }) };
    if (path === "/api/field/field-missions/scan-1" && options?.method === "PATCH") {
      submitted = JSON.parse(String(options.body));
      mission.title = (submitted as { title: string }).title;
      mission.version++;
      return { ok: true, json: async () => ({ mission }) };
    }
    throw new Error(`Unexpected request: ${path}`);
  }));
  const user = userEvent.setup();
  render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: "2 · Scans" }));
  await user.click(screen.getByRole("button", { name: "Rename folder" }));
  expect(screen.getByRole("textbox", { name: "Scan folder name" })).toHaveValue("01 — Site overview | four perspectives");
  await user.click(screen.getByRole("button", { name: "Save name" }));
  expect(await screen.findByRole("heading", { name: "01 - Site overview | four perspectives" })).toBeVisible();
  expect(submitted).toEqual({ title: "01 - Site overview | four perspectives", expectedVersion: 3 });
  expect(mission.evidence).toHaveLength(1);
  expect(mission.plan.summary).toBe("Saved analysis");
});

test("GX exports use the interface language and flag a saved plan in another language", async () => {
  const project = { id: "project-1", title: "Parcelle test", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const plan = { id: "plan-1", version: 1, status: "approved", content: { language: "fr", summary: "Synthèse en français" } };
  vi.stubGlobal("fetch", vi.fn(async (path: string) => ({
    ok: true,
    json: async () => path === "/api/field/projects" ? { projects: [project] }
      : { project, missions: [], measurements: [], projectTasks: [], plans: [plan], members: [], artifacts: [] },
  })));
  const user = userEvent.setup();
  const { rerender } = render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: "3 · Decisions" }));
  expect(screen.getByText(/This plan was saved in French or without a recorded language/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Download technical PDF" })).not.toBeInTheDocument();
  rerender(<FieldOS english={false} />);
  expect(screen.getByRole("button", { name: "Télécharger le guide PDF" })).toBeEnabled();
  const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
  expect(headings.filter((heading) => heading === "Guide technique de mise en œuvre")).toHaveLength(1);
  expect(headings.indexOf("Guide technique de mise en œuvre")).toBeLessThan(headings.indexOf("Plan de décision"));
});

test("legacy plans without a recorded language require regeneration before document export", async () => {
  const project = { id: "project-1", title: "Legacy parcel", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const plan = { id: "plan-1", version: 1, status: "approved", content: { summary: "Ancienne synthèse" } };
  vi.stubGlobal("fetch", vi.fn(async (path: string) => ({ ok: true,
    json: async () => path === "/api/field/projects" ? { projects: [project] }
      : { project, missions: [], measurements: [], projectTasks: [], plans: [plan], members: [], artifacts: [] },
  })));
  const user = userEvent.setup();
  render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: "3 · Decisions" }));
  expect(screen.getByText(/without a recorded language/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Download technical PDF" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Download business plan" })).not.toBeInTheDocument();
});

test.each([
  { status: "review_needed", approvedAt: "2026-11-02T10:00:00.000Z", enabled: true },
  { status: "review_needed", approvedAt: null, enabled: false },
  { status: "draft", approvedAt: "2026-11-02T10:00:00.000Z", enabled: false },
])("business export respects earlier owner approval when a plan is $status (approvedAt: $approvedAt)", async ({ status, approvedAt, enabled }) => {
  const project = { id: "project-1", title: "Field dossier", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const plan = { id: "plan-1", version: 1, status, approvedAt, content: { language: "en", summary: "Field plan" } };
  vi.stubGlobal("fetch", vi.fn(async (path: string) => ({ ok: true,
    json: async () => path === "/api/field/projects" ? { projects: [project] }
      : { project, missions: [], measurements: [], projectTasks: [], plans: [plan], members: [], artifacts: [] },
  })));
  const user = userEvent.setup();
  render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: "3 · Decisions" }));
  const exportButton = screen.getByRole("button", { name: "Download business plan" });
  if (enabled) expect(exportButton).toBeEnabled();
  else expect(exportButton).toBeDisabled();
});

test("GX-AUTH-RETURN-001: sign-in links back to the GX scan workspace in both languages", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: false, status: 401, json: async () => ({ error: "Connectez-vous à AGRIX." }),
  })));
  const { rerender } = render(<FieldOS />);
  const englishLink = await screen.findByRole("link", { name: "Open AGRIX sign-in" });
  expect(new URL(englishLink.getAttribute("href")!).searchParams.get("next"))
    .toBe("https://gx.agrix.africa/#projects");
  rerender(<FieldOS english={false} />);
  expect(await screen.findByRole("link", { name: "Ouvrir la connexion AGRIX" })).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Connectez-vous à AGRIX pour continuer.");
});

test("GX-FIELD-META-402: failed provider billing preserves the scan and explains the block in both languages", async () => {
  const project = { id: "project-1", title: "Cocoa parcel", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: null, areaMethod: null };
  const mission = { id: "scan-1", title: "North soil", note: "", scanAspect: "soil", status: "draft", version: 2, latitude: null, longitude: null, locationAccuracyMeters: null, evidence: [{ id: "view-1", viewIndex: 1 }], plan: null };
  const json = (value: unknown) => ({ ok: true, json: async () => value });
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/field/projects" && (!options || options.method === "GET")) return json({ projects: [project] });
    if (path === "/api/field/projects/project-1" && (!options || options.method === "GET")) return json({ project, missions: [mission], measurements: [], projectTasks: [], plans: [], members: [], artifacts: [] });
    if (path === "/api/field/field-missions/scan-1/analyze" && options?.method === "POST") return { ok: false, status: 502,
      json: async () => ({ code: "P402", error: "Un problème de facturation du compte fournisseur bloque temporairement l’analyse Meta." }) };
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const { rerender } = render(<FieldOS />);
  await user.click(await screen.findByRole("button", { name: /Scans/ }));
  await user.click(screen.getByRole("button", { name: "Analyze with Meta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("provider billing issue");
  expect(screen.getByRole("alert")).toHaveTextContent("scan and photos are saved");
  rerender(<FieldOS english={false} />);
  await user.click(screen.getByRole("button", { name: "Analyser avec Meta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("facturation du compte fournisseur");
  expect(screen.getByRole("alert")).toHaveTextContent("scan et vos photos sont conservés");
  expect(fetchMock).toHaveBeenCalledWith("/api/field/field-missions/scan-1/analyze", expect.objectContaining({ method: "POST" }));
});

test("GX-FIELD-COLLAB-001: owner can invite a collaborator and reach the parcel, scan point and deliverables", async () => {
  const project = { id: "project-1", title: "Cocoa parcel", description: "", country: "Côte d’Ivoire", domain: "agriculture", role: "owner", archivedAt: null, pinnedAt: null, areaSqMeters: 12000, areaMethod: "gps", boundary: { type: "Polygon", coordinates: [[[-4.123456, 5.123456], [-4.122456, 5.123456], [-4.122456, 5.124456], [-4.123456, 5.123456]]] } };
  const mission = { id: "scan-1", title: "North soil", note: "", scanAspect: "soil", status: "ready", version: 1, latitude: 5.123456, longitude: -4.123456, locationAccuracyMeters: 8, evidence: [], plan: null };
  const plan = { id: "plan-1", version: 1, status: "draft", content: { language: "en", summary: "Review soil and water", findings: [], uncertainties: [], recommendations: [], nextActions: [] } };
  const members: Array<{ userId: string; role: string; user: { name: string; email: string } }> = [];
  let inviteAttempts = 0;
  const json = (value: unknown) => ({ ok: true, json: async () => value });
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === "/api/field/projects" && (!options || options.method === "GET")) return json({ projects: [{ ...project, counts: { missions: 1, measurements: 0, plans: 1 } }] });
    if (path === "/api/field/projects/project-1" && (!options || options.method === "GET")) return json({ project, missions: [mission], measurements: [], projectTasks: [], plans: [plan], members: [...members], artifacts: [] });
    if (path === "/api/field/projects/project-1/members" && options?.method === "POST") {
      inviteAttempts += 1;
      if (inviteAttempts === 1) return { ok: false, status: 503, json: async () => ({ error: "Invitation non envoyée. Aucun accès n’a été accordé ; réessayez plus tard." }) };
      const input = JSON.parse(String(options.body));
      members.push({ userId: "member-1", role: input.role, user: { name: "Field agent", email: input.email } });
      return json({ emailAccepted: true });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const { rerender } = render(<FieldOS />);
  const parcelDirections = await screen.findByRole("link", { name: "Directions to recorded boundary point ↗" });
  expect(screen.getByText("1 scan recorded · Plan v1 draft")).toBeVisible();
  expect(new URL(parcelDirections.getAttribute("href")!).searchParams.get("destination")).toBe("5.123456,-4.123456");
  await user.click(await screen.findByRole("button", { name: /Scans/ }, { timeout: 10_000 }));
  const directions = screen.getByRole("link", { name: "Directions to North soil" });
  expect(new URL(directions.getAttribute("href")!).searchParams.get("destination")).toBe("5.123456,-4.123456");
  await user.click(screen.getByRole("button", { name: /Follow-up/ }));
  expect(screen.getByText(/Invite an active AGRIX account by email/)).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Collaborator email" }), "agent@example.org");
  await user.selectOptions(screen.getByRole("combobox", { name: "Collaborator role" }), "contributor");
  await user.click(screen.getByRole("button", { name: "Add collaborator" }));
  expect(await screen.findByText(/Invitation non envoyée/)).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Collaborator email" })).toHaveValue("agent@example.org");
  expect(screen.queryByText(/agent@example.org/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Add collaborator" }));
  expect(await screen.findByText(/Invitation accepted by the mail service/)).toBeVisible();
  expect(screen.getByText(/agent@example.org/)).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith("/api/field/projects/project-1/members", expect.objectContaining({ method: "POST" }));
  await user.click(screen.getByRole("button", { name: /Decisions/ }));
  expect(screen.getByRole("button", { name: "Download technical PDF" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Download business plan" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download tracking workbook" })).toBeEnabled();
  rerender(<FieldOS english={false} />);
  expect(screen.getByText("1 scan enregistré · Plan v1 brouillon")).toBeVisible();
});
