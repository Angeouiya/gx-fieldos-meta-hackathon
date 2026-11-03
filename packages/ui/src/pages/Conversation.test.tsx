import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Conversation } from "./Conversation";

afterEach(cleanup);

describe("conversation reply language", () => {
  it("does not present an archived reply with no language metadata as translated", () => {
    render(<Conversation english title="Archive" messages={[{ id: "old-1", role: "assistant", body: "Bonjour", createdAt: "2026-10-31T08:00:00.000Z" }]} onSubmit={vi.fn()} isLoading={false} onStop={vi.fn()} error={null} />);
    expect(screen.getAllByText(/language of this saved text was not recorded/i)[0]).toBeVisible();
    expect(screen.getByText(/Ask GX again for a reply in English/)).toBeVisible();
  });

  it("shows that a French reply stays French after switching GX to English", () => {
    render(<Conversation english title="Archive" messages={[{ id: "fr-1", role: "assistant", language: "fr", body: "Bonjour", createdAt: "2026-10-31T08:00:00.000Z" }]} onSubmit={vi.fn()} isLoading={false} onStop={vi.fn()} error={null} />);
    expect(screen.getAllByText(/Saved in French/)[0]).toBeVisible();
    expect(screen.getByText("Bonjour")).toBeVisible();
  });
});
