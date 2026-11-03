import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DocumentExport } from "./DocumentExport";

afterEach(cleanup);

describe("saved document language", () => {
  it("keeps a French report original when the GX interface switches to English", () => {
    render(<DocumentExport title="Rapport" content="Culture de maïs" english sourceLanguage="fr" />);
    expect(screen.getByText(/Saved in French/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Export original" })).toBeVisible();
  });

  it("does not infer a language for old reports", () => {
    render(<DocumentExport title="Rapport" content="Original" english />);
    expect(screen.getByText(/language of this saved text was not recorded/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Export original" })).toBeVisible();
  });

  it("keeps imported source text in its original wording", () => {
    render(<DocumentExport title="Source" content="Original" imported excerpt />);
    expect(screen.getByText(/Texte source importé/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Exporter l’original" })).toBeVisible();
  });

  it("shows an ordinary download for a report created in the active language", () => {
    render(<DocumentExport title="Report" content="English report" english sourceLanguage="en" />);
    expect(screen.getByRole("button", { name: "Download" })).toBeVisible();
    expect(screen.queryByText(/Changing the GX interface language/)).not.toBeInTheDocument();
  });
});
