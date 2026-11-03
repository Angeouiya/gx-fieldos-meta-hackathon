import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { createGXDocumentBlob } from "./gx-document-export";
import { extractGXOfficeText } from "./gx-office-extract";
import { extractGXDocument } from "./gx-document-extract";

describe("documents GX", () => {
  it("reads bounded text from modern Office files", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document><w:body><w:p><w:t>Récolte 125 kg</w:t></w:p></w:body></w:document>");
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    const excerpt = await extractGXOfficeText(bytes, "docx");
    expect(excerpt?.excerpt).toContain("Récolte 125 kg");
    const oversized = new File(["A".repeat(512 * 1024 + 1)], "notes.txt");
    await expect(extractGXDocument(oversized)).rejects.toMatchObject({ code: "size" });
  });

  it("generates readable Word, PowerPoint and Excel exports", async () => {
    for (const format of ["docx", "pptx", "xlsx"] as const) {
      const blob = await createGXDocumentBlob("Rapport récolte", "Récolte : 125 kg", format);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const excerpt = await extractGXOfficeText(bytes, format);
      expect(excerpt?.excerpt).toContain("125 kg");
    }
  });

  it("generates PDF and plain text without changing the report", async () => {
    const pdf = await createGXDocumentBlob("Rapport récolte", "Récolte : 125 kg", "pdf");
    expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
    const text = await createGXDocumentBlob("Rapport récolte", "Récolte : 125 kg", "txt");
    expect(await text.text()).toContain("125 kg");
  });
});
