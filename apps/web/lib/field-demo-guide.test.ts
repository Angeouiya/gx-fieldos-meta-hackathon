import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildLocalTechnicalGuide } from "./field-demo-guide.ts";
import { handleLocalFieldDemo } from "./field-demo.ts";

const detail = {
  project: { title: "North beds", domain: "agriculture", country: "Côte d'Ivoire", areaSqMeters: 25000,
    areaMethod: "manual", areaAccuracyMeters: null },
  missions: [{ title: "Soil zone", scanAspect: "soil", status: "ready", evidence: [{}, {}, {}, {}] }],
  measurements: [{ kind: "pH", value: { text: "6.5" }, source: "laboratory report" }],
  plans: [{ version: 2, status: "draft", content: { language: "en", journey: [
    { phase: "soil_preparation", label: "Soil preparation", actions: ["Mark sampled beds before any amendment."], checks: ["Check the dated laboratory report."] },
  ] } }],
  projectTasks: [{ title: "Confirm water flow", status: "pending" }],
};
const farm = { budget: { crop: "leafy vegetables", market: "local buyers", yieldSourceUrl: "", priceSourceUrl: "" },
  records: [{ kind: "input", title: "Drip line", plannedQuantityKg: 12, plannedCostXof: 45000 }] };

test("guide uses saved evidence and preserves draft status without inventing a verified result", () => {
  const guide = buildLocalTechnicalGuide(detail, farm, "en");
  assert.match(guide.title, /Technical implementation guide - North beds/);
  assert.match(guide.content, /25,000 m² \(2\.5 ha\)/);
  assert.match(guide.content, /1 scan folder\(s\); 4 saved view\(s\)/);
  assert.match(guide.content, /version 2, draft/);
  assert.match(guide.content, /Mark sampled beds before any amendment/);
  assert.match(guide.content, /Drip line/);
  assert.match(guide.content, /No return on investment is guaranteed/);
  assert.doesNotMatch(guide.content, /approved plan|verified soil quality/i);
});

test("French guide translates generated instructions and does not paste an English plan action", () => {
  const guide = buildLocalTechnicalGuide(detail, farm, "fr");
  assert.match(guide.title, /^Guide technique - North beds/);
  assert.match(guide.content, /Préparation du sol et de l'eau/);
  assert.match(guide.content, /version 2, brouillon/);
  assert.match(guide.content, /25\s?000 m² \(2,5 ha\)/);
  assert.match(guide.content, /méthode : saisie/);
  assert.match(guide.content, /sujet : sol/);
  assert.match(guide.content, /statut : en attente/);
  assert.doesNotMatch(guide.content, /Mark sampled beds|Plan action:|Phase control:/);
});

test("local FieldOS guide endpoint returns real PDF and DOCX downloads with the selected language", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gx-field-guide-"));
  const previous = process.env.GX_FIELD_DEMO_DIR;
  process.env.GX_FIELD_DEMO_DIR = directory;
  try {
    const created = await handleLocalFieldDemo(new Request("http://127.0.0.1/api/field/projects", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Guide route test" }),
    }), ["projects"]);
    assert.equal(created.status, 201);
    const project = (await created.json()).project as { id: string };

    const pdf = await handleLocalFieldDemo(new Request(`http://127.0.0.1/api/field/projects/${project.id}/technical-guide?format=pdf&lang=en`),
      ["projects", project.id, "technical-guide"]);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
    assert.equal(pdf.headers.get("Content-Language"), "en");
    assert.match(pdf.headers.get("Content-Disposition") ?? "", /attachment; filename="gx-technical-guide-/);
    assert.equal(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 4)), "%PDF");

    const docx = await handleLocalFieldDemo(new Request(`http://127.0.0.1/api/field/projects/${project.id}/technical-guide?format=docx&lang=fr`),
      ["projects", project.id, "technical-guide"]);
    assert.equal(docx.status, 200);
    assert.equal(docx.headers.get("Content-Language"), "fr");
    assert.match(docx.headers.get("Content-Type") ?? "", /wordprocessingml/);
    assert.equal(new TextDecoder().decode((await docx.arrayBuffer()).slice(0, 2)), "PK");

    const unsupported = await handleLocalFieldDemo(new Request(`http://127.0.0.1/api/field/projects/${project.id}/technical-guide?format=xlsx`),
      ["projects", project.id, "technical-guide"]);
    assert.equal(unsupported.status, 400);
  } finally {
    if (previous === undefined) delete process.env.GX_FIELD_DEMO_DIR;
    else process.env.GX_FIELD_DEMO_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
