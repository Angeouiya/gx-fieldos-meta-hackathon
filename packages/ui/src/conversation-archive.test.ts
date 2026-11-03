import { describe, expect, it } from "vitest";
import { archivePayload, localMessages } from "./conversation-archive";

describe("AGRIX conversation archive", () => {
  it("persists text and image names without copying image bytes into the conversation archive", () => {
    const at = "2026-10-31T08:00:00.000Z";
    const payload = archivePayload("owner-123", "local-12345678", [{
      id: "local-12345678-photo", role: "user", body: "Analyser la photo", createdAt: at,
      imageDataUrl: "data:image/png;base64,private", imageName: "plante.png",
    }]);
    expect(payload.ownerUserId).toBe("owner-123");
    expect(payload.createdAt).toBe(Date.parse(at));
    expect(payload.messages[0]).toMatchObject({ content: "Analyser la photo", attachments: [{ name: "plante.png" }] });
    expect(JSON.stringify(payload)).not.toContain("private");
  });

  it("restores dated conversation messages for the same account", () => {
    const restored = localMessages({
      id: "local-12345678", title: "Essai", createdAt: 0,
      messages: [{ id: "message-12345678", role: "assistant", content: "Bonjour", createdAt: 1_782_890_000_000 }],
    });
    expect(restored[0]).toMatchObject({ id: "message-12345678", body: "Bonjour", role: "assistant" });
    expect(restored[0]?.createdAt).toContain("2026");
  });

  it("round trips a generated reply's known language without assigning one to legacy text", () => {
    const at = "2026-11-02T08:00:00.000Z";
    const payload = archivePayload("owner-123", "local-12345678", [
      { id: "message-12345678", role: "assistant", body: "English report", language: "en", createdAt: at },
      { id: "message-87654321", role: "assistant", body: "Ancien rapport", createdAt: at },
    ]);
    expect(payload.messages[0]).toMatchObject({ language: "en" });
    expect(payload.messages[1]).not.toHaveProperty("language");
    const restored = localMessages({ id: "local-12345678", title: "Reports", createdAt: Date.parse(at), messages: payload.messages });
    expect(restored[0]?.language).toBe("en");
    expect(restored[1]?.language).toBeUndefined();
  });
});
