import { afterEach, expect, test, vi } from "vitest";
import { downloadFieldExport } from "./field-download";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("downloads a real binary response without navigating away from the project", async () => {
  const fetchMock = vi.fn(async () => new Response(new Blob(["%PDF-1.7"], { type: "application/pdf" }), {
    headers: { "content-type": "application/pdf" },
  }));
  const createObjectURL = vi.fn(() => "blob:gx-guide");
  const revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe("gx-technical-guide-p1.pdf");
    expect(this.href).toBe("blob:gx-guide");
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

  await downloadFieldExport("/api/field/projects/p1/technical-guide?format=pdf&lang=en", "gx-technical-guide-p1.pdf", true);

  expect(fetchMock).toHaveBeenCalledWith("/api/field/projects/p1/technical-guide?format=pdf&lang=en", {
    cache: "no-store", credentials: "same-origin",
  });
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector('a[download="gx-technical-guide-p1.pdf"]')).toBeNull();
});

test("does not download an authentication or HTML error as a document", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Sign in</html>", {
    headers: { "content-type": "text/html" },
  })));
  await expect(downloadFieldExport("/api/field/projects/p1/technical-guide?format=pdf&lang=en", "guide.pdf", true))
    .rejects.toThrow("document response is invalid");
  expect(click).not.toHaveBeenCalled();

  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Plan approval required." }, { status: 409 })));
  await expect(downloadFieldExport("/api/field/projects/p1/farm/export?format=docx&lang=en", "plan.docx", true))
    .rejects.toThrow("Plan approval required.");
  expect(click).not.toHaveBeenCalled();
});
