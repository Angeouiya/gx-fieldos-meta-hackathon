import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { workspaces } from "../workspace-data";
import { ModuleWorkbench } from "./ModuleWorkbench";

const storageKey = "gx.ai.work.records.v1";
const folderModule = workspaces.office.modules.find((module) => module.id === "folder")!;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("workbench deliverable language", () => {
  it("marks a saved French report and generates a separate English version", async () => {
    window.localStorage.setItem(storageKey, JSON.stringify([{
      id: "folder-1", moduleId: "folder", title: "Dossier", values: {}, steps: [], collaborators: [], createdAt: "2026-10-31T08:00:00.000Z",
      reports: [{ id: "report-fr", action: "Inventorier le dossier", body: "Rapport français", language: "fr", createdAt: "2026-10-31T08:00:00.000Z" }],
    }]));
    const user = userEvent.setup();
    const onRunTask = vi.fn().mockResolvedValue("English version");
    render(<ModuleWorkbench english module={folderModule} onClose={vi.fn()} onStartPlan={vi.fn()} onRunTask={onRunTask} />);

    await user.click(screen.getByText(/Français ·/));
    expect(screen.getByText("Rapport français")).toBeVisible();
    expect(screen.getByText(/Saved in French/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Regenerate in English" }));
    await waitFor(() => {
      const records = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      expect(records[0].reports[0]).toMatchObject({ body: "English version", language: "en" });
      expect(records[0].reports[1]).toMatchObject({ body: "Rapport français", language: "fr" });
    });
    expect(onRunTask.mock.calls[0]?.[0]).toContain("Write the entire deliverable in English.");
  });

  it("labels a legacy report without claiming that it was translated", async () => {
    window.localStorage.setItem(storageKey, JSON.stringify([{
      id: "folder-1", moduleId: "folder", title: "Dossier", values: {}, steps: [], collaborators: [], createdAt: "2026-10-31T08:00:00.000Z",
      reports: [{ id: "report-old", action: "Inventorier le dossier", body: "Texte ancien", createdAt: "2026-10-31T08:00:00.000Z" }],
    }]));
    const user = userEvent.setup();
    render(<ModuleWorkbench english module={folderModule} onClose={vi.fn()} onStartPlan={vi.fn()} onRunTask={vi.fn()} />);
    await user.click(screen.getByText(/Language unknown ·/));
    expect(screen.getByText(/language of this saved text was not recorded/i)).toBeVisible();
  });
});
